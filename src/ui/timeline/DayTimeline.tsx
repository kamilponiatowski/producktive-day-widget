import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Messages } from '../../i18n/messages'
import type { DayPlan, Locale, TimeBlock, TimeBlockTemplate } from '../../domain/types'
import {
  formatDayOffsetLabel,
  formatDuration,
  formatTimeWithDayOffset,
  isNextDayMinutes,
  minutesToTime,
  roundToStep,
} from '../../domain/time'
import { MIN_BLOCK_DURATION_MINUTES } from '../../domain/dayPlan'
import { parseTimeBlockTemplate, TIME_BLOCK_TEMPLATE_MIME } from '../../domain/timeBlockTemplates'
import {
  clampTimelineGroupDelta,
  getTimelineInteractionBlocks,
  type TimelineInteractionType,
} from './timelineInteractions'

type Interaction = {
  type: TimelineInteractionType
  originY: number
  block: TimeBlock
  blocks: TimeBlock[]
  lastBlocks: TimeBlock[]
  lastDeltaMinutes: number
  pointerId: number
  pointerTarget: EventTarget & {
    releasePointerCapture?: (pointerId: number) => void
  }
}

type RangeDraft = {
  startMinutes: number
  endMinutes: number
}

type BlockDensity = 'nano' | 'micro' | 'compact' | 'cozy' | 'full'

type DayTimelineProps = {
  plan: DayPlan
  locale: Locale
  messages: Messages
  startMinutes: number
  endMinutes: number
  stepMinutes: number
  timelineScale: number
  conflictIds: Set<string>
  onCreate: (startMinutes: number) => void
  onCreateRange: (startMinutes: number, endMinutes: number) => void
  onEdit: (block: TimeBlock) => void
  onDelete: (blockId: string) => void
  onUpdate: (block: TimeBlock) => void
  onUpdateMany: (blocks: TimeBlock[]) => void
  onTemplateDrop: (template: TimeBlockTemplate, startMinutes: number) => void
}

type TimelineRuntime = {
  endMinutes: number
  onUpdate: DayTimelineProps['onUpdate']
  onUpdateMany: DayTimelineProps['onUpdateMany']
  startMinutes: number
  stepMinutes: number
  totalMinutes: number
}

const getBlockDensity = (durationMinutes: number): BlockDensity => {
  if (durationMinutes <= 10) return 'nano'
  if (durationMinutes <= 30) return 'micro'
  if (durationMinutes <= 60) return 'compact'
  if (durationMinutes <= 90) return 'cozy'
  return 'full'
}

const MIN_BLOCK_HEIGHT_PX = 46

type ColumnLayout = { col: number; totalCols: number }

function computeColumnLayouts(
  blocks: TimeBlock[],
  startMinutes: number,
  totalMinutes: number,
  gridHeight: number,
): Map<string, ColumnLayout> {
  if (blocks.length === 0) return new Map()

  const bounds = blocks.map((block) => {
    const visStart = Math.max(block.startMinutes, startMinutes)
    const visEnd = Math.min(block.endMinutes, startMinutes + totalMinutes)
    const topPx = ((visStart - startMinutes) / totalMinutes) * gridHeight
    const heightPx = Math.max(MIN_BLOCK_HEIGHT_PX, ((visEnd - visStart) / totalMinutes) * gridHeight)
    return { id: block.id, topPx, bottomPx: topPx + heightPx }
  })

  // Sort by topPx for sweep line
  const sorted = [...bounds].sort((a, b) => a.topPx - b.topPx)

  // Sweep line: assign columns
  const colEnds: number[] = []
  const colOf = new Map<string, number>()

  for (const b of sorted) {
    let col = colEnds.findIndex((end) => end <= b.topPx + 1)
    if (col === -1) {
      col = colEnds.length
      colEnds.push(0)
    }
    colEnds[col] = b.bottomPx
    colOf.set(b.id, col)
  }

  // totalCols per block: max col among all blocks that visually overlap with it
  const result = new Map<string, ColumnLayout>()
  for (const b of bounds) {
    const col = colOf.get(b.id)!
    let maxCol = col
    for (const other of bounds) {
      if (other.id === b.id) continue
      if (b.topPx < other.bottomPx - 1 && b.bottomPx > other.topPx + 1) {
        maxCol = Math.max(maxCol, colOf.get(other.id)!)
      }
    }
    result.set(b.id, { col, totalCols: maxCol + 1 })
  }

  return result
}

const createBlockAriaLabel = (
  block: TimeBlock,
  locale: Locale,
  messages: Messages,
  isConflict: boolean,
) => [
  block.title,
  `${formatTimeWithDayOffset(block.startMinutes, locale)}-${formatTimeWithDayOffset(block.endMinutes, locale)}`,
  messages.priority[block.priority],
  messages.source[block.source],
  isConflict ? messages.timeline.conflict : '',
].filter(Boolean).join(', ')

export function DayTimeline(props: DayTimelineProps) {
  const gridRef = useRef<HTMLDivElement | null>(null)
  const interactionRef = useRef<Interaction | null>(null)
  const rangeDraftRef = useRef<RangeDraft | null>(null)
  const runtimeRef = useRef<TimelineRuntime | null>(null)
  const suppressCreateClickRef = useRef(false)
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null)
  const [interactionPreviewBlocks, setInteractionPreviewBlocks] = useState<TimeBlock[] | null>(null)
  const [rangeDraft, setRangeDraft] = useState<RangeDraft | null>(null)
  const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [isTemplateDragOver, setTemplateDragOver] = useState(false)
  const startMinutes = props.startMinutes
  const endMinutes = props.endMinutes
  const totalMinutes = endMinutes - startMinutes

  runtimeRef.current = {
    endMinutes,
    onUpdate: props.onUpdate,
    onUpdateMany: props.onUpdateMany,
    startMinutes,
    stepMinutes: props.stepMinutes,
    totalMinutes,
  }

  const hourMarkers = useMemo(
    () => {
      const firstMarker = Math.ceil(startMinutes / 60) * 60
      const markerCount = Math.max(0, Math.floor((endMinutes - firstMarker) / 60) + 1)
      return Array.from({ length: markerCount }, (_, index) => firstMarker + index * 60)
        .filter((minutes) => minutes >= startMinutes && minutes <= endMinutes)
    },
    [endMinutes, startMinutes],
  )
  const axisLabels = useMemo(
    () => {
      const labels = [startMinutes, ...hourMarkers.filter((minutes) => minutes > startMinutes && minutes < endMinutes)]

      if (!labels.includes(endMinutes)) {
        labels.push(endMinutes)
      }

      return labels
    },
    [endMinutes, hourMarkers, startMinutes],
  )
  const previewBlockById = useMemo(
    () => new Map((interactionPreviewBlocks || []).map((block) => [block.id, block])),
    [interactionPreviewBlocks],
  )
  const timelineBlocks = useMemo(
    () => props.plan.blocks.map((block) => previewBlockById.get(block.id) ?? block),
    [previewBlockById, props.plan.blocks],
  )
  const visibleBlocks = useMemo(
    () => timelineBlocks.filter((block) => block.endMinutes > startMinutes && block.startMinutes < endMinutes),
    [endMinutes, startMinutes, timelineBlocks],
  )
  const selectedBlockIdSet = useMemo(() => new Set(selectedBlockIds), [selectedBlockIds])
  const sortedBlocks = useMemo(
    () => [...timelineBlocks].sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes),
    [timelineBlocks],
  )
  const selectedBlocks = useMemo(
    () => sortedBlocks.filter((block) => selectedBlockIdSet.has(block.id)),
    [selectedBlockIdSet, sortedBlocks],
  )

  const gridHeight = Math.max(720, totalMinutes * props.timelineScale)

  const columnLayouts = useMemo(
    () => computeColumnLayouts(visibleBlocks, startMinutes, totalMinutes, gridHeight),
    [visibleBlocks, startMinutes, totalMinutes, gridHeight],
  )

  const getMinutesFromPointer = useCallback((clientY: number, options: { allowEnd?: boolean } = {}) => {
    const grid = gridRef.current
    if (!grid) return startMinutes

    const rect = grid.getBoundingClientRect()
    const ratio = (clientY - rect.top) / rect.height
    const rawMinutes = startMinutes + totalMinutes * ratio
    const maxMinutes = options.allowEnd ? endMinutes : endMinutes - props.stepMinutes
    return Math.min(maxMinutes, Math.max(startMinutes, roundToStep(rawMinutes, props.stepMinutes)))
  }, [endMinutes, props.stepMinutes, startMinutes, totalMinutes])

  const getDeltaMinutes = useCallback((clientY: number, originY: number, runtime: TimelineRuntime) => {
    const grid = gridRef.current
    if (!grid) return 0

    const rect = grid.getBoundingClientRect()
    const pixelsPerMinute = rect.height / runtime.totalMinutes
    const rawDelta = (clientY - originY) / pixelsPerMinute
    return Math.round(rawDelta / runtime.stepMinutes) * runtime.stepMinutes
  }, [])

  const selectBlockRange = useCallback((block: TimeBlock, useRange: boolean) => {
    if (!useRange || !selectionAnchorId) {
      setSelectionAnchorId(block.id)
      setSelectedBlockIds([block.id])
      return [block.id]
    }

    const anchorIndex = sortedBlocks.findIndex((item) => item.id === selectionAnchorId)
    const blockIndex = sortedBlocks.findIndex((item) => item.id === block.id)

    if (anchorIndex === -1 || blockIndex === -1) {
      setSelectionAnchorId(block.id)
      setSelectedBlockIds([block.id])
      return [block.id]
    }

    const [from, to] = anchorIndex < blockIndex ? [anchorIndex, blockIndex] : [blockIndex, anchorIndex]
    const nextIds = sortedBlocks.slice(from, to + 1).map((item) => item.id)
    setSelectedBlockIds(nextIds)
    return nextIds
  }, [selectionAnchorId, sortedBlocks])

  const shiftBlocks = useCallback((blocks: TimeBlock[], deltaMinutes: number) => {
    if (blocks.length === 0) return

    const runtime = runtimeRef.current
    if (!runtime) return

    const safeDelta = clampTimelineGroupDelta(blocks, deltaMinutes, runtime)
    if (safeDelta === 0) return

    const shifted = blocks.map((block) => ({
      ...block,
      startMinutes: block.startMinutes + safeDelta,
      endMinutes: block.endMinutes + safeDelta,
    }))

    runtime.onUpdateMany(shifted)
  }, [])

  const handleGridClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (suppressCreateClickRef.current) {
      suppressCreateClickRef.current = false
      return
    }

    if (event.target !== event.currentTarget) return
    props.onCreate(getMinutesFromPointer(event.clientY))
  }, [getMinutesFromPointer, props.onCreate])

  const handleRangePointerMove = useCallback((event: PointerEvent) => {
    const draft = rangeDraftRef.current
    if (!draft) return

    const pointerMinutes = getMinutesFromPointer(event.clientY, { allowEnd: true })
    const nextDraft = {
      startMinutes: Math.min(draft.startMinutes, pointerMinutes),
      endMinutes: Math.max(draft.startMinutes, pointerMinutes),
    }

    setRangeDraft(nextDraft)
  }, [getMinutesFromPointer])

  const stopRangeDraft = useCallback((event: PointerEvent) => {
    const draft = rangeDraftRef.current
    rangeDraftRef.current = null
    setRangeDraft(null)
    window.removeEventListener('pointermove', handleRangePointerMove)

    if (!draft) return

    const pointerMinutes = getMinutesFromPointer(event.clientY, { allowEnd: true })
    const start = Math.min(draft.startMinutes, pointerMinutes)
    const end = Math.max(draft.startMinutes, pointerMinutes)

    if (end - start >= props.stepMinutes) {
      props.onCreateRange(start, end)
    } else {
      props.onCreate(draft.startMinutes)
    }

    window.setTimeout(() => {
      suppressCreateClickRef.current = false
    }, 0)
  }, [getMinutesFromPointer, handleRangePointerMove, props])

  const startRangeDraft = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return

    event.preventDefault()
    suppressCreateClickRef.current = true
    const start = getMinutesFromPointer(event.clientY)
    const draft = { startMinutes: start, endMinutes: start }

    rangeDraftRef.current = draft
    setRangeDraft(draft)
    window.addEventListener('pointermove', handleRangePointerMove)
    window.addEventListener('pointerup', stopRangeDraft, { once: true })
  }, [getMinutesFromPointer, handleRangePointerMove, stopRangeDraft])

  const hasTemplatePayload = (dataTransfer: DataTransfer) =>
    Array.from(dataTransfer.types).includes(TIME_BLOCK_TEMPLATE_MIME)

  const handleGridDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!hasTemplatePayload(event.dataTransfer)) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setTemplateDragOver(true)
  }, [])

  const handleGridDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return

    setTemplateDragOver(false)
  }, [])

  const handleGridDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    const template = parseTimeBlockTemplate(event.dataTransfer.getData(TIME_BLOCK_TEMPLATE_MIME))
    if (!template) return

    event.preventDefault()
    props.onTemplateDrop(template, getMinutesFromPointer(event.clientY))
    setTemplateDragOver(false)
  }, [getMinutesFromPointer, props.onTemplateDrop])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const interaction = interactionRef.current
    const runtime = runtimeRef.current
    if (!interaction || !runtime) return

    event.preventDefault()
    const delta = getDeltaMinutes(event.clientY, interaction.originY, runtime)
    if (delta === interaction.lastDeltaMinutes) return

    const nextBlocks = getTimelineInteractionBlocks(interaction, delta, {
      endMinutes: runtime.endMinutes,
      minDurationMinutes: MIN_BLOCK_DURATION_MINUTES,
      startMinutes: runtime.startMinutes,
    })

    interaction.lastBlocks = nextBlocks
    interaction.lastDeltaMinutes = delta
    setInteractionPreviewBlocks(nextBlocks)
  }, [getDeltaMinutes])

  const stopInteraction = useCallback(() => {
    const interaction = interactionRef.current
    const runtime = runtimeRef.current

    interactionRef.current = null
    setActiveBlockId(null)
    setInteractionPreviewBlocks(null)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopInteraction)
    window.removeEventListener('pointercancel', stopInteraction)

    if (interaction) {
      try {
        interaction.pointerTarget.releasePointerCapture?.(interaction.pointerId)
      } catch {
        // Pointer capture can already be gone when the browser ends the gesture.
      }
    }

    if (interaction && runtime && interaction.lastDeltaMinutes !== 0) {
      if (interaction.lastBlocks.length > 1) {
        runtime.onUpdateMany(interaction.lastBlocks)
      } else {
        runtime.onUpdate(interaction.lastBlocks[0])
      }
    }

    window.setTimeout(() => {
      suppressCreateClickRef.current = false
    }, 0)
  }, [handlePointerMove])

  const startInteraction = useCallback((
    event: React.PointerEvent,
    type: Interaction['type'],
    block: TimeBlock,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    suppressCreateClickRef.current = true

    if (event.shiftKey && type === 'move') {
      selectBlockRange(block, true)
      window.setTimeout(() => {
        suppressCreateClickRef.current = false
      }, 0)
      return
    }

    try {
      event.currentTarget.setPointerCapture?.(event.pointerId)
    } catch {
      // Some browsers can reject capture when the pointer has already changed target.
    }

    const nextSelectedIds = type === 'move' && selectedBlockIdSet.has(block.id) && selectedBlockIds.length > 1
      ? selectedBlockIds
      : selectBlockRange(block, false)
    const movingBlocks = type === 'move'
      ? sortedBlocks.filter((item) => nextSelectedIds.includes(item.id))
      : [block]

    interactionRef.current = {
      type,
      originY: event.clientY,
      block,
      blocks: movingBlocks,
      lastBlocks: movingBlocks,
      lastDeltaMinutes: 0,
      pointerId: event.pointerId,
      pointerTarget: event.currentTarget,
    }
    setActiveBlockId(block.id)
    setInteractionPreviewBlocks(null)

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopInteraction, { once: true })
    window.addEventListener('pointercancel', stopInteraction, { once: true })
  }, [
    handlePointerMove,
    selectBlockRange,
    selectedBlockIdSet,
    selectedBlockIds,
    sortedBlocks,
    stopInteraction,
  ])

  useEffect(() => () => {
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', stopInteraction)
    window.removeEventListener('pointercancel', stopInteraction)
    window.removeEventListener('pointermove', handleRangePointerMove)
    window.removeEventListener('pointerup', stopRangeDraft)
  }, [handlePointerMove, handleRangePointerMove, stopInteraction, stopRangeDraft])

  useEffect(() => {
    const existingIds = new Set(props.plan.blocks.map((block) => block.id))
    setSelectedBlockIds((current) => current.filter((id) => existingIds.has(id)))
    setSelectionAnchorId((current) => (current && existingIds.has(current) ? current : null))
  }, [props.plan.blocks])

  return (
    <div
      className="pd-timeline-shell"
      style={{
        '--pd-grid-height': `${Math.max(720, totalMinutes * props.timelineScale)}px`,
      } as React.CSSProperties}
    >
      <div className="pd-time-axis" aria-hidden="true">
        {axisLabels.map((minutes, index) => {
          const position = totalMinutes <= 0 ? 0 : ((minutes - startMinutes) / totalMinutes) * 100

          return (
            <span
              key={minutes}
              className={[
                index === 0 ? 'pd-time-axis-label-start' : '',
                index === axisLabels.length - 1 ? 'pd-time-axis-label-end' : '',
              ].join(' ')}
              style={{ '--pd-axis-position': `${position}%` } as React.CSSProperties}
            >
              <span>{minutesToTime(minutes)}</span>
              {isNextDayMinutes(minutes) && (
                <small>{formatDayOffsetLabel(props.locale, minutes)}</small>
              )}
            </span>
          )
        })}
      </div>

      <div
        ref={gridRef}
        className={isTemplateDragOver ? 'pd-grid pd-grid-template-over' : 'pd-grid'}
        role="region"
        aria-label={props.locale === 'pl' ? 'Plan dnia' : 'Day plan'}
        onClick={handleGridClick}
        onDragLeave={handleGridDragLeave}
        onDragOver={handleGridDragOver}
        onDrop={handleGridDrop}
        onPointerDown={startRangeDraft}
      >
        {hourMarkers.map((minutes) => {
          const position = totalMinutes <= 0 ? 0 : ((minutes - startMinutes) / totalMinutes) * 100

          return (
            <div
              key={minutes}
              className="pd-hour-line"
              style={{ '--pd-hour-position': `${position}%` } as React.CSSProperties}
              aria-hidden="true"
            />
          )
        })}

        {visibleBlocks.length === 0 && (
          <div className="pd-empty-state">
            <strong>{props.messages.timeline.emptyTitle}</strong>
            <span>{props.messages.timeline.emptyDescription}</span>
          </div>
        )}

        {rangeDraft && rangeDraft.endMinutes > rangeDraft.startMinutes && (
          <div
            className="pd-range-draft"
            style={{
              top: `${((rangeDraft.startMinutes - startMinutes) / totalMinutes) * 100}%`,
              height: `${((rangeDraft.endMinutes - rangeDraft.startMinutes) / totalMinutes) * 100}%`,
            } as React.CSSProperties}
            aria-hidden="true"
          >
            <span>
              {formatTimeWithDayOffset(rangeDraft.startMinutes, props.locale)} - {formatTimeWithDayOffset(rangeDraft.endMinutes, props.locale)}
            </span>
          </div>
        )}

        {visibleBlocks.map((block) => {
          const visibleStart = Math.max(block.startMinutes, startMinutes)
          const visibleEnd = Math.min(block.endMinutes, endMinutes)
          const top = ((visibleStart - startMinutes) / totalMinutes) * 100
          const height = ((visibleEnd - visibleStart) / totalMinutes) * 100
          const duration = block.endMinutes - block.startMinutes
          const isConflict = props.conflictIds.has(block.id)
          const density = getBlockDensity(duration)
          const blockActionsLabel = props.locale === 'pl' ? 'Akcje bloku' : 'Block actions'
          const moveEarlierLabel = props.locale === 'pl'
            ? `Przesun ${block.title} 15 minut wczesniej`
            : `Move ${block.title} 15 minutes earlier`
          const moveLaterLabel = props.locale === 'pl'
            ? `Przesun ${block.title} 15 minut pozniej`
            : `Move ${block.title} 15 minutes later`
          const editLabel = props.locale === 'pl' ? `Edytuj ${block.title}` : `Edit ${block.title}`
          const deleteLabel = props.locale === 'pl' ? `Usun ${block.title}` : `Delete ${block.title}`
          const isSelected = selectedBlockIdSet.has(block.id)
          const actionBlocks = isSelected && selectedBlocks.length > 1 ? selectedBlocks : [block]
          const colLayout = columnLayouts.get(block.id) ?? { col: 0, totalCols: 1 }
          const isMultiColumn = colLayout.totalCols > 1

          return (
            <article
              key={block.id}
              className={[
                'pd-time-block',
                `pd-time-block-${density}`,
                `pd-time-block-priority-${block.priority}`,
                isConflict ? 'pd-time-block-conflict' : '',
                isSelected ? 'pd-time-block-selected' : '',
                activeBlockId === block.id ? 'pd-time-block-active' : '',
                isMultiColumn ? 'pd-time-block-multicolumn' : '',
              ].join(' ')}
              style={{
                top: `${top}%`,
                height: `${height}%`,
                '--pd-block-color': block.colorToken,
                ...(isMultiColumn && {
                  '--pd-block-col': String(colLayout.col),
                  '--pd-block-cols': String(colLayout.totalCols),
                }),
              } as React.CSSProperties}
              tabIndex={0}
              aria-label={createBlockAriaLabel(block, props.locale, props.messages, isConflict)}
            >
              <button
                className="pd-resize-handle pd-resize-handle-top"
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onPointerDown={(event) => startInteraction(event, 'resize-start', block)}
              />

              <button
                className="pd-block-body"
                type="button"
                onPointerDown={(event) => startInteraction(event, 'move', block)}
                onDoubleClick={() => props.onEdit(block)}
              >
                <span className="pd-block-title-row">
                  <span className="pd-block-title">{block.title}</span>
                  {block.note && density !== 'nano' && (
                    <span
                      className="pd-block-note-indicator"
                      data-note={block.note}
                      aria-label={props.locale === 'pl' ? `Notatka: ${block.note}` : `Note: ${block.note}`}
                      role="img"
                    >
                      <svg className="pd-block-note-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M14 1H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3l3 4 3-4h3a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1Z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 5h6M5 8h4" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  )}
                </span>
                <span className="pd-block-details">
                  <span className="pd-block-time">
                    {formatTimeWithDayOffset(block.startMinutes, props.locale)} - {formatTimeWithDayOffset(block.endMinutes, props.locale)}
                  </span>
                  <span className="pd-block-duration">
                    {formatDuration(block.startMinutes, block.endMinutes, props.locale)}
                  </span>
                  <span className={`pd-block-priority pd-block-priority-${block.priority}`}>
                    {props.messages.priority[block.priority]}
                  </span>
                  <span className="pd-block-source">
                    {props.messages.source[block.source]}
                  </span>
                  {isConflict && (
                    <span className="pd-block-conflict-label">
                      {props.messages.timeline.conflict}
                    </span>
                  )}
                </span>
              </button>

              <div className="pd-block-actions" role="group" aria-label={blockActionsLabel}>
                <button
                  type="button"
                  aria-label={moveEarlierLabel}
                  onClick={() => shiftBlocks(actionBlocks, -props.stepMinutes)}
                >
                  -15
                </button>
                <button
                  type="button"
                  aria-label={moveLaterLabel}
                  onClick={() => shiftBlocks(actionBlocks, props.stepMinutes)}
                >
                  +15
                </button>
                <button type="button" aria-label={editLabel} onClick={() => props.onEdit(block)}>
                  {props.messages.timeline.edit}
                </button>
                <button type="button" aria-label={deleteLabel} onClick={() => props.onDelete(block.id)}>
                  {props.messages.timeline.delete}
                </button>
              </div>

              <button
                className="pd-resize-handle pd-resize-handle-bottom"
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                onPointerDown={(event) => startInteraction(event, 'resize-end', block)}
              />
            </article>
          )
        })}
      </div>
    </div>
  )
}
