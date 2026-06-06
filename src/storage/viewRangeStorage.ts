import { MAX_DAY_END_MINUTES } from '../domain/time'

export type ViewRange = {
  startMinutes: number
  endMinutes: number
}

type StoredViewRange = Partial<ViewRange> & {
  startHour?: number
  endHour?: number
}

const MIN_VIEW_DURATION_MINUTES = 60

const clampStartMinutes = (minutes: number) =>
  Math.min(MAX_DAY_END_MINUTES - MIN_VIEW_DURATION_MINUTES, Math.max(0, Math.round(minutes)))

const clampEndMinutes = (minutes: number) =>
  Math.min(MAX_DAY_END_MINUTES, Math.max(MIN_VIEW_DURATION_MINUTES, Math.round(minutes)))

const readMinutes = (value: unknown, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

const legacyEndHourToMinutes = (endHour: number) => {
  if (endHour >= 0 && endHour <= 6) {
    return (endHour + 24) * 60
  }

  return endHour * 60
}

export function normalizeViewRange(range: StoredViewRange): ViewRange {
  const legacyStart = readMinutes(range.startHour, 5) * 60
  const legacyEnd = legacyEndHourToMinutes(readMinutes(range.endHour, 23))
  const startMinutes = clampStartMinutes(readMinutes(range.startMinutes, legacyStart))
  const endMinutes = clampEndMinutes(readMinutes(range.endMinutes, legacyEnd))

  if (endMinutes - startMinutes < MIN_VIEW_DURATION_MINUTES) {
    return {
      startMinutes,
      endMinutes: Math.min(MAX_DAY_END_MINUTES, startMinutes + MIN_VIEW_DURATION_MINUTES),
    }
  }

  return {
    startMinutes,
    endMinutes,
  }
}

export function loadViewRange(storageKey: string, fallback: StoredViewRange): ViewRange {
  try {
    const raw = localStorage.getItem(`${storageKey}:view-range`)
    if (!raw) return normalizeViewRange(fallback)

    return normalizeViewRange(JSON.parse(raw) as StoredViewRange)
  } catch {
    return normalizeViewRange(fallback)
  }
}

export function saveViewRange(storageKey: string, range: ViewRange) {
  localStorage.setItem(`${storageKey}:view-range`, JSON.stringify(normalizeViewRange(range)))
}

export function clearViewRange(storageKey: string) {
  localStorage.removeItem(`${storageKey}:view-range`)
}

export function subscribeToViewRangeStorage(params: {
  storageKey: string
  fallback: StoredViewRange
  onChange: (range: ViewRange) => void
}) {
  const key = `${params.storageKey}:view-range`
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== key) return

    if (!event.newValue) {
      params.onChange(normalizeViewRange(params.fallback))
      return
    }

    try {
      params.onChange(normalizeViewRange(JSON.parse(event.newValue) as StoredViewRange))
    } catch {
      params.onChange(normalizeViewRange(params.fallback))
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => window.removeEventListener('storage', handleStorage)
}
