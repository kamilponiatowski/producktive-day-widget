export const MINUTES_PER_DAY = 1440
export const MAX_DAY_END_MINUTES = MINUTES_PER_DAY + 6 * 60

const pad = (value: number) => String(value).padStart(2, '0')

export function getLocalDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
}

const normalizeClockMinutes = (minutes: number) => {
  const rounded = Math.round(minutes)
  return ((rounded % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY
}

export function minutesToTime(minutes: number) {
  const clockMinutes = normalizeClockMinutes(clampMinutes(minutes, 0, MAX_DAY_END_MINUTES))
  const hours = Math.floor(clockMinutes / 60)
  const mins = clockMinutes % 60
  return `${pad(hours)}:${pad(mins)}`
}

export function timeToMinutes(value: string) {
  const [hours = '0', minutes = '0'] = value.split(':')
  const parsedHours = Number(hours)
  const parsedMinutes = Number(minutes)

  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) {
    return 0
  }

  return clampMinutes(parsedHours * 60 + parsedMinutes, 0, MINUTES_PER_DAY)
}

export function resolveTimeInputMinutes(
  value: string,
  options: {
    minMinutes?: number
    maxMinutes?: number
    referenceMinutes?: number
  } = {},
) {
  const minMinutes = options.minMinutes ?? 0
  const maxMinutes = options.maxMinutes ?? MAX_DAY_END_MINUTES
  const referenceMinutes = options.referenceMinutes ?? minMinutes
  const baseMinutes = timeToMinutes(value)
  const candidates = [baseMinutes, baseMinutes + MINUTES_PER_DAY]
    .filter((minutes) => minutes >= minMinutes && minutes <= maxMinutes)

  if (candidates.length === 0) {
    return clampMinutes(baseMinutes, minMinutes, maxMinutes)
  }

  return candidates.reduce((closest, candidate) => {
    const closestDistance = Math.abs(closest - referenceMinutes)
    const candidateDistance = Math.abs(candidate - referenceMinutes)
    return candidateDistance < closestDistance ? candidate : closest
  })
}

export function clampMinutes(value: number, min = 0, max = MAX_DAY_END_MINUTES) {
  return Math.min(Math.max(Math.round(value), min), max)
}

export function roundToStep(value: number, stepMinutes: number, min = 0, max = MAX_DAY_END_MINUTES) {
  const safeStep = Math.max(1, stepMinutes)
  return clampMinutes(Math.round(value / safeStep) * safeStep, min, max)
}

export function isNextDayMinutes(minutes: number) {
  return minutes >= MINUTES_PER_DAY
}

export function formatDayOffsetLabel(locale: 'pl' | 'en', minutes: number) {
  if (isNextDayMinutes(minutes)) {
    return locale === 'pl' ? 'Jutro' : 'Tomorrow'
  }

  return locale === 'pl' ? 'Dzisiaj' : 'Today'
}

export function formatTimeWithDayOffset(minutes: number, locale: 'pl' | 'en') {
  const time = minutesToTime(minutes)

  if (!isNextDayMinutes(minutes)) {
    return time
  }

  return locale === 'pl' ? `${time} jutro` : `${time} tomorrow`
}

export function getIsoWeekNumber(localDate: string) {
  const date = new Date(`${localDate}T12:00:00`)
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = utcDate.getUTCDay() || 7

  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)

  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  return Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export function formatDayLabel(locale: 'pl' | 'en', localDate: string) {
  const language = locale === 'pl' ? 'pl-PL' : 'en-US'
  const date = new Date(`${localDate}T12:00:00`)

  return new Intl.DateTimeFormat(language, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function formatDuration(startMinutes: number, endMinutes: number, locale: 'pl' | 'en') {
  const duration = Math.max(0, endMinutes - startMinutes)
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  if (hours === 0) {
    return locale === 'pl' ? `${minutes} min` : `${minutes} min`
  }

  if (minutes === 0) {
    return locale === 'pl' ? `${hours} godz.` : `${hours}h`
  }

  return locale === 'pl' ? `${hours} godz. ${minutes} min` : `${hours}h ${minutes}m`
}
