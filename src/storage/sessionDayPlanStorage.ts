import { createEmptyDayPlan, normalizeDayPlan } from '../domain/dayPlan'
import type { DayPlan } from '../domain/types'

export function buildStorageKey(baseKey: string, locale: string, localDate: string) {
  return `${baseKey}:${locale}:${localDate}`
}

export function loadDayPlan(params: {
  storageKey: string
  locale: string
  localDate: string
  timezone: string
  stepMinutes: number
}) {
  const key = buildStorageKey(params.storageKey, params.locale, params.localDate)

  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return createEmptyDayPlan(params.localDate, params.timezone)
    }

    const parsed = JSON.parse(raw) as DayPlan
    return normalizeDayPlan(parsed, params.stepMinutes)
  } catch {
    return createEmptyDayPlan(params.localDate, params.timezone)
  }
}

export function saveDayPlan(params: {
  storageKey: string
  locale: string
  plan: DayPlan
}) {
  const key = buildStorageKey(params.storageKey, params.locale, params.plan.localDate)
  localStorage.setItem(key, JSON.stringify(params.plan))
}

export function clearDayPlan(params: {
  storageKey: string
  locale: string
  plan: DayPlan
}) {
  const key = buildStorageKey(params.storageKey, params.locale, params.plan.localDate)
  localStorage.removeItem(key)
}

export function subscribeToDayPlanStorage(params: {
  storageKey: string
  locale: string
  localDate: string
  timezone: string
  stepMinutes: number
  onChange: (plan: DayPlan) => void
}) {
  const key = buildStorageKey(params.storageKey, params.locale, params.localDate)
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== key) return

    if (!event.newValue) {
      params.onChange(createEmptyDayPlan(params.localDate, params.timezone))
      return
    }

    try {
      params.onChange(normalizeDayPlan(JSON.parse(event.newValue) as DayPlan, params.stepMinutes))
    } catch {
      params.onChange(createEmptyDayPlan(params.localDate, params.timezone))
    }
  }

  window.addEventListener('storage', handleStorage)

  return () => window.removeEventListener('storage', handleStorage)
}
