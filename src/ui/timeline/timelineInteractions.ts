import type { TimeBlock } from '../../domain/types'

export type TimelineInteractionType = 'move' | 'resize-start' | 'resize-end'

export type TimelineInteractionBounds = {
  endMinutes: number
  minDurationMinutes: number
  startMinutes: number
}

export type TimelineInteractionSnapshot = {
  block: TimeBlock
  blocks: TimeBlock[]
  type: TimelineInteractionType
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function clampTimelineGroupDelta(
  blocks: TimeBlock[],
  deltaMinutes: number,
  bounds: Pick<TimelineInteractionBounds, 'endMinutes' | 'startMinutes'>,
) {
  if (blocks.length === 0) return 0

  const minStart = Math.min(...blocks.map((block) => block.startMinutes))
  const maxEnd = Math.max(...blocks.map((block) => block.endMinutes))

  return clamp(deltaMinutes, bounds.startMinutes - minStart, bounds.endMinutes - maxEnd)
}

export function moveTimelineBlocks(
  blocks: TimeBlock[],
  deltaMinutes: number,
  bounds: Pick<TimelineInteractionBounds, 'endMinutes' | 'startMinutes'>,
) {
  const safeDelta = clampTimelineGroupDelta(blocks, deltaMinutes, bounds)

  return blocks.map((block) => ({
    ...block,
    startMinutes: block.startMinutes + safeDelta,
    endMinutes: block.endMinutes + safeDelta,
  }))
}

export function resizeTimelineBlockStart(
  block: TimeBlock,
  deltaMinutes: number,
  bounds: TimelineInteractionBounds,
) {
  return {
    ...block,
    startMinutes: clamp(
      block.startMinutes + deltaMinutes,
      bounds.startMinutes,
      block.endMinutes - bounds.minDurationMinutes,
    ),
  }
}

export function resizeTimelineBlockEnd(
  block: TimeBlock,
  deltaMinutes: number,
  bounds: TimelineInteractionBounds,
) {
  return {
    ...block,
    endMinutes: clamp(
      block.endMinutes + deltaMinutes,
      block.startMinutes + bounds.minDurationMinutes,
      bounds.endMinutes,
    ),
  }
}

export function getTimelineInteractionBlocks(
  interaction: TimelineInteractionSnapshot,
  deltaMinutes: number,
  bounds: TimelineInteractionBounds,
) {
  if (interaction.type === 'move') {
    return moveTimelineBlocks(interaction.blocks, deltaMinutes, bounds)
  }

  if (interaction.type === 'resize-start') {
    return [resizeTimelineBlockStart(interaction.block, deltaMinutes, bounds)]
  }

  return [resizeTimelineBlockEnd(interaction.block, deltaMinutes, bounds)]
}
