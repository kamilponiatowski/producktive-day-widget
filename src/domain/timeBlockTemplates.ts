import type { Priority, TimeBlock, TimeBlockTemplate } from './types'
import { MAX_DAY_END_MINUTES } from './time'

export const TIME_BLOCK_TEMPLATE_MIME = 'application/x-producktive-time-block'

const MIN_TEMPLATE_DURATION_MINUTES = 5
const priorities: Priority[] = ['low', 'medium', 'high']

const isPriority = (value: unknown): value is Priority =>
  typeof value === 'string' && priorities.includes(value as Priority)

export const normalizeTemplateTitle = (title: string) =>
  title.trim().toLowerCase()

export const createTemplateCategory = (title: string) => {
  const normalized = title
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[łŁ]/g, 'l')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 34)

  return normalized ? `custom-${normalized}` : 'custom-block'
}

const getTemplateKey = (block: TimeBlock) =>
  `title:${normalizeTemplateTitle(block.title)}`

export function buildTimeBlockTemplates(
  blocks: TimeBlock[],
  _stepMinutes: number,
  limit = 12,
): TimeBlockTemplate[] {
  const templates = new Map<string, TimeBlockTemplate>()

  blocks.forEach((block) => {
    const durationMinutes = Math.max(MIN_TEMPLATE_DURATION_MINUTES, block.endMinutes - block.startMinutes)
    const key = getTemplateKey(block)

    if (templates.has(key)) return

    templates.set(key, {
      key,
      title: block.title,
      durationMinutes,
      priority: block.priority,
      category: block.category,
      colorToken: block.colorToken,
      note: block.note,
    })
  })

  return [...templates.values()].slice(0, limit)
}

export function serializeTimeBlockTemplate(template: TimeBlockTemplate) {
  return JSON.stringify(template)
}

export function parseTimeBlockTemplate(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<TimeBlockTemplate>

    if (
      typeof parsed.key !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.durationMinutes !== 'number' ||
      typeof parsed.category !== 'string' ||
      typeof parsed.colorToken !== 'string' ||
      !isPriority(parsed.priority)
    ) {
      return null
    }

    return {
      key: parsed.key.slice(0, 180),
      title: parsed.title.trim().slice(0, 80),
      durationMinutes: Math.max(
        MIN_TEMPLATE_DURATION_MINUTES,
        Math.min(MAX_DAY_END_MINUTES, Math.round(parsed.durationMinutes)),
      ),
      priority: parsed.priority,
      category: parsed.category.trim().slice(0, 40),
      colorToken: parsed.colorToken,
      note: typeof parsed.note === 'string' ? parsed.note.trim().slice(0, 240) : '',
    } satisfies TimeBlockTemplate
  } catch {
    return null
  }
}
