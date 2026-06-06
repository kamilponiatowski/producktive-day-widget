import type { AgentBlockProposal, ApplyMode, DayPlan, Priority, TimeBlock } from './types'
import { clampMinutes, getLocalDate, getTimezone, MAX_DAY_END_MINUTES } from './time'
import { getPresetByCategory } from './timeBlockPresets'

export const MIN_BLOCK_DURATION_MINUTES = 15

const categoryColors: Record<string, string> = {
  wakeUp: '#FFD166',
  focus: '#00E5FF',
  deepFocus: '#00E5FF',
  growth: '#D4AF37',
  creative: '#FF8BD1',
  admin: '#8B8BA7',
  communication: '#7DD3FC',
  recovery: '#4ADE80',
  relationship: '#C084FC',
  movement: '#2DD4BF',
  learning: '#38BDF8',
  buffer: '#FFD700',
  shutdown: '#A78BFA',
  default: '#00E5FF',
}

const nowIso = () => new Date().toISOString()

export function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  return `block-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function createEmptyDayPlan(localDate = getLocalDate(), timezone = getTimezone()): DayPlan {
  return {
    schemaVersion: 1,
    localDate,
    timezone,
    blocks: [],
  }
}

export function resolveColorToken(category: string) {
  const preset = getPresetByCategory(category)
  if (preset) return preset.colorToken

  const normalized = category.trim().toLowerCase().replace(/\s+/g, '')
  return categoryColors[normalized] ?? categoryColors[category] ?? categoryColors.default
}

export function createTimeBlock(input: {
  title: string
  startMinutes: number
  endMinutes: number
  priority: Priority
  category: string
  note?: string
  source?: 'manual' | 'agent'
  colorToken?: string
}): TimeBlock {
  const createdAt = nowIso()

  return normalizeBlock({
    id: createId(),
    title: input.title,
    startMinutes: input.startMinutes,
    endMinutes: input.endMinutes,
    priority: input.priority,
    category: input.category,
    colorToken: input.colorToken || resolveColorToken(input.category),
    note: input.note || '',
    source: input.source || 'manual',
    createdAt,
    updatedAt: createdAt,
  })
}

export function normalizeBlock(block: TimeBlock): TimeBlock {
  const startMinutes = clampMinutes(
    block.startMinutes,
    0,
    MAX_DAY_END_MINUTES - MIN_BLOCK_DURATION_MINUTES,
  )
  const safeEnd = Math.max(startMinutes + MIN_BLOCK_DURATION_MINUTES, Math.round(block.endMinutes))

  return {
    ...block,
    title: block.title.trim().slice(0, 80) || 'Untitled',
    category: block.category.trim().slice(0, 40) || 'default',
    note: (block.note || '').trim().slice(0, 240),
    startMinutes,
    endMinutes: clampMinutes(safeEnd, MIN_BLOCK_DURATION_MINUTES, MAX_DAY_END_MINUTES),
    colorToken: block.colorToken || resolveColorToken(block.category),
  }
}

export function normalizeDayPlan(plan: DayPlan, _stepMinutes = 15): DayPlan {
  return {
    schemaVersion: 1,
    localDate: plan.localDate || getLocalDate(),
    timezone: plan.timezone || getTimezone(),
    blocks: [...(plan.blocks || [])]
      .map((block) => normalizeBlock(block))
      .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes),
  }
}

export function updateBlock(plan: DayPlan, blockId: string, nextBlock: TimeBlock, stepMinutes: number) {
  return normalizeDayPlan(
    {
      ...plan,
      blocks: plan.blocks.map((block) =>
        block.id === blockId
          ? normalizeBlock({ ...nextBlock, id: blockId, updatedAt: nowIso() })
          : block,
      ),
    },
    stepMinutes,
  )
}

export function updateBlocks(plan: DayPlan, nextBlocks: TimeBlock[], stepMinutes: number) {
  const updates = new Map(nextBlocks.map((block) => [block.id, block]))

  return normalizeDayPlan(
    {
      ...plan,
      blocks: plan.blocks.map((block) => {
        const nextBlock = updates.get(block.id)

        return nextBlock
          ? normalizeBlock({ ...nextBlock, id: block.id, updatedAt: nowIso() })
          : block
      }),
    },
    stepMinutes,
  )
}

export function removeBlock(plan: DayPlan, blockId: string) {
  return {
    ...plan,
    blocks: plan.blocks.filter((block) => block.id !== blockId),
  }
}

export function detectConflictIds(blocks: TimeBlock[]) {
  const conflictIds = new Set<string>()

  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      const first = blocks[i]
      const second = blocks[j]
      const overlaps = first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes

      if (overlaps) {
        conflictIds.add(first.id)
        conflictIds.add(second.id)
      }
    }
  }

  return conflictIds
}

export function applyAgentBlocks(
  plan: DayPlan,
  blocks: AgentBlockProposal[],
  mode: ApplyMode,
  stepMinutes: number,
) {
  const incoming = blocks.map((block) =>
    createTimeBlock({
      ...block,
      source: 'agent',
      colorToken: resolveColorToken(block.category),
    }),
  )

  if (mode === 'merge') {
    const keptBlocks = plan.blocks.filter((existing) =>
      incoming.every(
        (next) => existing.endMinutes <= next.startMinutes || existing.startMinutes >= next.endMinutes,
      ),
    )

    return normalizeDayPlan({ ...plan, blocks: [...keptBlocks, ...incoming] }, stepMinutes)
  }

  return normalizeDayPlan({ ...plan, blocks: [...plan.blocks, ...incoming] }, stepMinutes)
}
