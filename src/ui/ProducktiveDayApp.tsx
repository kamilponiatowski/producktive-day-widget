import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  applyAgentBlocks,
  createEmptyDayPlan,
  createTimeBlock,
  detectConflictIds,
  MIN_BLOCK_DURATION_MINUTES,
  normalizeDayPlan,
  removeBlock,
  resolveColorToken,
  updateBlock,
  updateBlocks,
} from '../domain/dayPlan'
import {
  formatDayLabel,
  formatTimeWithDayOffset,
  getIsoWeekNumber,
  getLocalDate,
  getTimezone,
  MAX_DAY_END_MINUTES,
  roundToStep,
} from '../domain/time'
import { buildTimeBlockTemplates, normalizeTemplateTitle } from '../domain/timeBlockTemplates'
import type { AgentBlockProposal, AgentProposal, DayPlan, Locale, Priority, TimeBlock, TimeBlockTemplate } from '../domain/types'
import { clearDayPlan, loadDayPlan, saveDayPlan, subscribeToDayPlanStorage } from '../storage/sessionDayPlanStorage'
import {
  clearViewRange,
  loadViewRange,
  normalizeViewRange,
  saveViewRange,
  subscribeToViewRangeStorage,
  type ViewRange,
} from '../storage/viewRangeStorage'
import { getMessages } from '../i18n/messages'
import { AgentChat } from './agent-chat/AgentChat'
import { BlockEditor, type BlockEditorSubmit } from './block-editor/BlockEditor'
import { InsightsPanel } from './insights/InsightsPanel'
import type { Insight } from './insights/insights'
import { TimeStepper } from './primitives/TimeStepper'
import { DayTimeline } from './timeline/DayTimeline'
import { TimeBlockLibrary } from './time-block-library/TimeBlockLibrary'

export type ProducktiveDayHandle = {
  getPlan: () => DayPlan
  setPlan: (plan: DayPlan) => void
  addBlocks: (blocks: AgentBlockProposal[]) => void
  clearPlan: () => void
}

export type ProducktiveDayProps = {
  locale: Locale
  apiBase: string
  storageKey: string
  startHour: number
  endHour: number
  stepMinutes: number
  theme: string
  onReady: (handle: ProducktiveDayHandle) => void
  onChange: (plan: DayPlan) => void
  onError: (message: string) => void
}

type EditorState =
  | {
      mode: 'create'
      startMinutes: number
      endMinutes: number
      prefill?: {
        title?: string
        priority?: Priority
        category?: string
        colorToken?: string
        note?: string
      }
    }
  | {
      mode: 'edit'
      block: TimeBlock
    }
  | null

const insightCategoryToBlockCategory: Record<Insight['category'], string> = {
  focus: 'deepFocus',
  priorities: 'growth',
  stress: 'recovery',
  relationships: 'relationship',
  energy: 'movement',
  systems: 'admin',
}

const normalizeTemplateDuration = (durationMinutes: number, stepMinutes: number) =>
  Math.max(MIN_BLOCK_DURATION_MINUTES, Math.min(MAX_DAY_END_MINUTES, Math.round(durationMinutes || stepMinutes)))

const MIN_TIMELINE_SCALE = 1.35
const MAX_TIMELINE_SCALE = 4.4
const DEFAULT_TIMELINE_SCALE = 3.05
const TIMELINE_SCALE_STEP = 0.35

function LightbulbIcon() {
  return (
    <svg className="pd-button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.2 14.8A6.5 6.5 0 1 1 15.8 14.8c-.7.5-.9 1.2-.9 2.2H9.1c0-1-.2-1.7-.9-2.2Z" />
      <path d="M12 2v2" />
      <path d="M4.9 4.9l1.4 1.4" />
      <path d="M19.1 4.9l-1.4 1.4" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg className="pd-button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04A1.8 1.8 0 0 0 14.8 19.6a1.8 1.8 0 0 0-1.1 1.65V21.4a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.18-1.67 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.7 15a1.8 1.8 0 0 0-1.65-1.1H2a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.73 8.5a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 1 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 8.3 3.9a1.8 1.8 0 0 0 1.1-1.65V2.1a2.1 2.1 0 0 1 4.2 0v.06A1.8 1.8 0 0 0 14.8 3.84a1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 1 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8.5a1.8 1.8 0 0 0 1.65 1.1h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  )
}

function findNextFreeSlot(plan: DayPlan, startMinutes: number, durationMinutes: number, stepMinutes: number) {
  let candidate = roundToStep(startMinutes, stepMinutes)

  while (candidate + durationMinutes <= MAX_DAY_END_MINUTES) {
    const overlaps = plan.blocks.some(
      (block) => candidate < block.endMinutes && candidate + durationMinutes > block.startMinutes,
    )

    if (!overlaps) return candidate
    candidate += stepMinutes
  }

  return roundToStep(startMinutes, stepMinutes)
}

export function ProducktiveDayApp(props: ProducktiveDayProps) {
  const toolbarRef = useRef<HTMLElement | null>(null)
  const localDate = useMemo(() => getLocalDate(), [])
  const timezone = useMemo(() => getTimezone(), [])
  const messages = useMemo(() => getMessages(props.locale), [props.locale])
  const initialViewRange = useMemo(
    () => ({
      startMinutes: props.startHour * 60,
      endMinutes: props.endHour * 60,
    }),
    [props.endHour, props.startHour],
  )
  const [editor, setEditor] = useState<EditorState>(null)
  const [isAgentOpen, setAgentOpen] = useState(false)
  const [isInsightsOpen, setInsightsOpen] = useState(false)
  const [showInsightsShortcut, setShowInsightsShortcut] = useState(false)
  const [isSettingsOpen, setSettingsOpen] = useState(false)
  const conceptExpandedKey = `${props.storageKey}.conceptExpanded`
  const [isConceptExpanded, setConceptExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(conceptExpandedKey)
      return stored === null ? true : stored !== 'false'
    } catch {
      return true
    }
  })

  const toggleConcept = () => {
    setConceptExpanded((prev) => {
      const next = !prev
      try { localStorage.setItem(conceptExpandedKey, String(next)) } catch { /* noop */ }
      return next
    })
  }
  const [timelineScale, setTimelineScale] = useState(DEFAULT_TIMELINE_SCALE)
  const [statusMessage, setStatusMessage] = useState('')
  const [hiddenTagKeys, setHiddenTagKeys] = useState<string[]>([])
  const [plan, setPlan] = useState(() =>
    loadDayPlan({
      storageKey: props.storageKey,
      locale: props.locale,
      localDate,
      timezone,
      stepMinutes: props.stepMinutes,
    }),
  )
  const [viewRange, setViewRange] = useState<ViewRange>(() =>
    loadViewRange(props.storageKey, initialViewRange),
  )

  const conflictIds = useMemo(() => detectConflictIds(plan.blocks), [plan.blocks])
  const blockTemplates = useMemo(
    () => buildTimeBlockTemplates(plan.blocks, props.stepMinutes),
    [plan.blocks, props.stepMinutes],
  )
  const editorBlockTemplates = useMemo(
    () => {
      const hidden = new Set(hiddenTagKeys)
      return blockTemplates.filter((template) => !hidden.has(normalizeTemplateTitle(template.title)))
    },
    [blockTemplates, hiddenTagKeys],
  )

  const removeTag = useCallback((title: string) => {
    const tagKey = normalizeTemplateTitle(title)
    if (!tagKey) return

    setHiddenTagKeys((current) => (current.includes(tagKey) ? current : [...current, tagKey]))
  }, [])

  const commitPlan = useCallback(
    (nextPlan: DayPlan) => {
      const normalized = normalizeDayPlan(nextPlan, props.stepMinutes)
      setPlan(normalized)
      saveDayPlan({ storageKey: props.storageKey, locale: props.locale, plan: normalized })
      props.onChange(normalized)
      return normalized
    },
    [props],
  )

  const clearPlan = useCallback(() => {
    const nextPlan = createEmptyDayPlan(localDate, timezone)
    const nextViewRange = normalizeViewRange(initialViewRange)
    clearDayPlan({ storageKey: props.storageKey, locale: props.locale, plan })
    clearViewRange(props.storageKey)
    setPlan(nextPlan)
    setViewRange(nextViewRange)
    props.onChange(nextPlan)
  }, [initialViewRange, localDate, plan, props, timezone])

  const commitViewRange = useCallback(
    (range: ViewRange) => {
      const normalized = normalizeViewRange(range)
      setViewRange(normalized)
      saveViewRange(props.storageKey, normalized)
      return normalized
    },
    [props.storageKey],
  )

  const ensureVisibleRange = useCallback(
    (startMinutes: number, endMinutes: number) => {
      setViewRange((currentRange) => {
        const nextStartMinutes = Math.min(currentRange.startMinutes, startMinutes)
        const nextEndMinutes = Math.max(currentRange.endMinutes, endMinutes)

        if (nextStartMinutes === currentRange.startMinutes && nextEndMinutes === currentRange.endMinutes) {
          return currentRange
        }

        const normalized = normalizeViewRange({ startMinutes: nextStartMinutes, endMinutes: nextEndMinutes })
        saveViewRange(props.storageKey, normalized)
        return normalized
      })
    },
    [props.storageKey],
  )

  useEffect(() => {
    const handle: ProducktiveDayHandle = {
      getPlan: () => plan,
      setPlan: (nextPlan) => commitPlan(nextPlan),
      addBlocks: (blocks) => commitPlan(applyAgentBlocks(plan, blocks, 'append', props.stepMinutes)),
      clearPlan,
    }

    props.onReady(handle)
  }, [clearPlan, commitPlan, plan, props])

  useEffect(
    () => subscribeToDayPlanStorage({
      storageKey: props.storageKey,
      locale: props.locale,
      localDate,
      timezone,
      stepMinutes: props.stepMinutes,
      onChange: (nextPlan) => {
        setPlan(nextPlan)
        props.onChange(nextPlan)
      },
    }),
    [localDate, props, timezone],
  )

  useEffect(
    () => subscribeToViewRangeStorage({
      storageKey: props.storageKey,
      fallback: initialViewRange,
      onChange: setViewRange,
    }),
    [initialViewRange, props.storageKey],
  )

  useEffect(() => {
    const updateShortcutVisibility = () => {
      const toolbar = toolbarRef.current
      if (!toolbar) return

      setShowInsightsShortcut(toolbar.getBoundingClientRect().bottom < 0)
    }

    updateShortcutVisibility()
    window.addEventListener('scroll', updateShortcutVisibility, { passive: true })
    window.addEventListener('resize', updateShortcutVisibility)

    return () => {
      window.removeEventListener('scroll', updateShortcutVisibility)
      window.removeEventListener('resize', updateShortcutVisibility)
    }
  }, [])

  const openCreateEditor = useCallback(
    (startMinutes: number) => {
      const endMinutes = Math.min(MAX_DAY_END_MINUTES, startMinutes + props.stepMinutes * 4)

      setEditor({
        mode: 'create',
        startMinutes: Math.min(startMinutes, endMinutes - MIN_BLOCK_DURATION_MINUTES),
        endMinutes,
      })
    },
    [props.stepMinutes],
  )

  const submitEditor = (payload: BlockEditorSubmit) => {
    ensureVisibleRange(payload.startMinutes, payload.endMinutes)

    if (editor?.mode === 'edit') {
      commitPlan(
        updateBlock(
          plan,
          editor.block.id,
          {
            ...editor.block,
            ...payload,
            colorToken: payload.colorToken,
          },
          props.stepMinutes,
        ),
      )
    }

    if (editor?.mode === 'create') {
      commitPlan({
        ...plan,
        blocks: [
          ...plan.blocks,
          createTimeBlock({
            ...payload,
            source: 'manual',
          }),
        ],
      })
    }

    setEditor(null)
  }

  const createRangeBlock = useCallback(
    (startMinutes: number, endMinutes: number) => {
      ensureVisibleRange(startMinutes, endMinutes)
      setEditor({
        mode: 'create',
        startMinutes,
        endMinutes,
      })
    },
    [ensureVisibleRange],
  )

  const applyProposal = (proposal: AgentProposal) => {
    proposal.blocks.forEach((block) => ensureVisibleRange(block.startMinutes, block.endMinutes))

    const nextPlan = commitPlan(
      applyAgentBlocks(plan, proposal.blocks, proposal.mode, props.stepMinutes),
    )
    setAgentOpen(false)
    setStatusMessage(
      props.locale === 'pl'
        ? `Dodano ${proposal.blocks.length} bloków do dnia.`
        : `Added ${proposal.blocks.length} blocks to the day.`,
    )
    return nextPlan
  }

  const addInsightToDay = (insight: Insight) => {
    const durationMinutes = props.stepMinutes * 4
    const now = new Date()
    const preferredStart = Math.max(
      viewRange.startMinutes,
      roundToStep(now.getHours() * 60 + now.getMinutes(), props.stepMinutes),
    )
    const startMinutes = findNextFreeSlot(plan, preferredStart, durationMinutes, props.stepMinutes)
    const endMinutes = Math.min(MAX_DAY_END_MINUTES, startMinutes + durationMinutes)
    const category = insightCategoryToBlockCategory[insight.category]

    setInsightsOpen(false)
    setEditor({
      mode: 'create',
      startMinutes,
      endMinutes,
      prefill: {
        title: insight.title[props.locale],
        priority: insight.category === 'priorities' || insight.category === 'focus' ? 'medium' : 'low',
        category,
        colorToken: resolveColorToken(category),
        note: insight.useToday[props.locale],
      },
    })
  }

  const addTemplateToDay = useCallback(
    (template: TimeBlockTemplate, requestedStartMinutes: number) => {
      const durationMinutes = normalizeTemplateDuration(template.durationMinutes, props.stepMinutes)
      const maxStartMinutes = MAX_DAY_END_MINUTES - durationMinutes
      const startMinutes = Math.min(
        maxStartMinutes,
        Math.max(0, roundToStep(requestedStartMinutes, props.stepMinutes)),
      )
      const block = createTimeBlock({
        title: template.title,
        startMinutes,
        endMinutes: startMinutes + durationMinutes,
        priority: template.priority,
        category: template.category,
        colorToken: template.colorToken,
        note: template.note,
        source: 'manual',
      })

      ensureVisibleRange(block.startMinutes, block.endMinutes)
      commitPlan({ ...plan, blocks: [...plan.blocks, block] })
      setStatusMessage(messages.blockLibrary.dropped(template.title, formatTimeWithDayOffset(block.startMinutes, props.locale)))
    },
    [commitPlan, ensureVisibleRange, messages.blockLibrary, plan, props.locale, props.stepMinutes],
  )

  const addTemplateToNextFreeSlot = useCallback(
    (template: TimeBlockTemplate) => {
      const durationMinutes = normalizeTemplateDuration(template.durationMinutes, props.stepMinutes)
      const now = new Date()
      const preferredStart = Math.max(
        viewRange.startMinutes,
        roundToStep(now.getHours() * 60 + now.getMinutes(), props.stepMinutes),
      )

      addTemplateToDay(
        template,
        findNextFreeSlot(plan, preferredStart, durationMinutes, props.stepMinutes),
      )
    },
    [addTemplateToDay, plan, props.stepMinutes, viewRange.startMinutes],
  )

  const dayLabel = formatDayLabel(props.locale, plan.localDate)
  const weekNumber = getIsoWeekNumber(plan.localDate)

  return (
    <main className="pd-root" data-theme={props.theme}>
      <div className="pd-floating-controls">
        <button
          className="pd-icon-button pd-zoom-toggle"
          type="button"
          onClick={() => setTimelineScale((value) => Math.max(MIN_TIMELINE_SCALE, value - TIMELINE_SCALE_STEP))}
          aria-label={messages.viewSettings.zoomOut}
        >
          -
        </button>
        <button
          className="pd-icon-button pd-zoom-toggle"
          type="button"
          onClick={() => setTimelineScale((value) => Math.min(MAX_TIMELINE_SCALE, value + TIMELINE_SCALE_STEP))}
          aria-label={messages.viewSettings.zoomIn}
        >
          +
        </button>
        <button
          className="pd-icon-button pd-settings-toggle"
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          aria-label={messages.settings}
          aria-expanded={isSettingsOpen}
        >
          <SettingsIcon />
        </button>
      </div>

      {isSettingsOpen && (
        <section className="pd-settings-panel" aria-labelledby="pd-settings-title">
          <div>
            <h2 id="pd-settings-title">{messages.viewSettings.title}</h2>
          </div>
          <TimeStepper
            label={messages.viewSettings.start}
            valueMinutes={viewRange.startMinutes}
            buttonStepMinutes={60}
            increaseLabel={messages.editor.increase}
            decreaseLabel={messages.editor.decrease}
            locale={props.locale}
            maxMinutes={viewRange.endMinutes - 60}
            onChangeMinutes={(value) =>
              commitViewRange({ ...viewRange, startMinutes: Math.min(viewRange.endMinutes - 60, value) })
            }
          />
          <TimeStepper
            label={messages.viewSettings.end}
            valueMinutes={viewRange.endMinutes}
            buttonStepMinutes={60}
            increaseLabel={messages.editor.increase}
            decreaseLabel={messages.editor.decrease}
            locale={props.locale}
            minMinutes={viewRange.startMinutes + 60}
            maxMinutes={MAX_DAY_END_MINUTES}
            onChangeMinutes={(value) =>
              commitViewRange({ ...viewRange, endMinutes: Math.max(viewRange.startMinutes + 60, value) })
            }
          />
          <button className="pd-button pd-button-secondary" type="button" onClick={() => setSettingsOpen(false)}>
            {messages.viewSettings.close}
          </button>
        </section>
      )}

      <section className="pd-shell" aria-labelledby="pd-heading">
        <header ref={toolbarRef} className="pd-toolbar">
          <div>
            <span className="pd-badge">{messages.today}</span>
            <h1 id="pd-heading">{dayLabel}</h1>
            <p className="pd-subtitle">
              {messages.blocksCount(plan.blocks.length)} · {messages.weekNumber(weekNumber)}
            </p>
          </div>

          <div className="pd-toolbar-actions">
            <button className="pd-button pd-button-ghost pd-insights-cta" type="button" onClick={() => setInsightsOpen(true)}>
              <LightbulbIcon />
              {messages.insights}
            </button>
            <button className="pd-button pd-button-secondary" type="button" onClick={() => setAgentOpen(true)}>
              <span aria-hidden="true">AI</span>
              {messages.askAgent}
            </button>
            <button
              className="pd-button pd-button-primary"
              type="button"
              onClick={() => openCreateEditor(viewRange.startMinutes)}
            >
              <span aria-hidden="true">+</span>
              {messages.addBlock}
            </button>
          </div>
        </header>

        <section
          className={isConceptExpanded ? 'pd-principles-panel' : 'pd-principles-panel pd-principles-panel-collapsed'}
          aria-labelledby="pd-principles-title"
        >
          <div>
            <span className="pd-badge pd-badge-gold">{messages.concept.badge}</span>
            <h2 id="pd-principles-title">
              {isConceptExpanded ? messages.concept.title : messages.concept.collapsedTitle}
            </h2>
            {isConceptExpanded && <p>{messages.concept.minimum}</p>}
          </div>
          {isConceptExpanded && (
            <div className="pd-principles-grid">
              {messages.concept.rules.map((rule) => (
                <article key={rule.title}>
                  <strong>{rule.title}</strong>
                  <p>{rule.description}</p>
                </article>
              ))}
            </div>
          )}
          <button
            type="button"
            className="pd-icon-button pd-principles-toggle"
            aria-label={isConceptExpanded ? messages.concept.collapse : messages.concept.expand}
            aria-expanded={isConceptExpanded}
            onClick={toggleConcept}
          >
            {isConceptExpanded ? '-' : '+'}
          </button>
        </section>

        <div className="pd-planner-layout">
          <DayTimeline
            plan={plan}
            locale={props.locale}
            messages={messages}
            startMinutes={viewRange.startMinutes}
            endMinutes={viewRange.endMinutes}
            stepMinutes={props.stepMinutes}
            timelineScale={timelineScale}
            conflictIds={conflictIds}
            onCreate={openCreateEditor}
            onCreateRange={createRangeBlock}
            onEdit={(block) => setEditor({ mode: 'edit', block })}
            onDelete={(blockId) => commitPlan(removeBlock(plan, blockId))}
            onUpdate={(block) => commitPlan(updateBlock(plan, block.id, block, props.stepMinutes))}
            onUpdateMany={(blocks) => commitPlan(updateBlocks(plan, blocks, props.stepMinutes))}
            onTemplateDrop={addTemplateToDay}
          />

          {blockTemplates.length > 0 && (
            <TimeBlockLibrary
              templates={blockTemplates}
              locale={props.locale}
              messages={messages}
              onQuickAdd={addTemplateToNextFreeSlot}
            />
          )}
        </div>
      </section>

      {editor && (
        <BlockEditor
          editor={editor}
          locale={props.locale}
          messages={messages}
          stepMinutes={props.stepMinutes}
          templates={editorBlockTemplates}
          hiddenTagKeys={hiddenTagKeys}
          onRemoveTag={removeTag}
          onSubmit={submitEditor}
          onCancel={() => setEditor(null)}
          onDelete={
            editor.mode === 'edit'
              ? () => {
                  commitPlan(removeBlock(plan, editor.block.id))
                  setEditor(null)
                }
              : undefined
          }
        />
      )}

      <AgentChat
        isOpen={isAgentOpen}
        locale={props.locale}
        apiBase={props.apiBase}
        plan={plan}
        messages={messages}
        onOpenChange={setAgentOpen}
        onApply={applyProposal}
        onError={props.onError}
      />

      <InsightsPanel
        isOpen={isInsightsOpen}
        locale={props.locale}
        messages={messages}
        onOpenChange={setInsightsOpen}
        onAddInsight={addInsightToDay}
      />

      <button
        type="button"
        className={showInsightsShortcut ? 'pd-insights-shortcut pd-insights-shortcut-visible' : 'pd-insights-shortcut'}
        aria-label={messages.insights}
        onClick={() => setInsightsOpen(true)}
      >
        <LightbulbIcon />
      </button>

      <div className="pd-live-region" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>

      {plan.blocks.length > 0 && (
        <button className="pd-clear-button" type="button" onClick={clearPlan}>
          {messages.clearDay}
        </button>
      )}
    </main>
  )
}
