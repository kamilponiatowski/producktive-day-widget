import {
  clampMinutes,
  formatDayOffsetLabel,
  MAX_DAY_END_MINUTES,
  minutesToTime,
  resolveTimeInputMinutes,
} from '../../domain/time'
import type { Locale } from '../../domain/types'

type TimeStepperProps = {
  label: string
  valueMinutes: number
  buttonStepMinutes: number
  increaseLabel: string
  decreaseLabel: string
  locale?: Locale
  minMinutes?: number
  maxMinutes?: number
  onChangeMinutes: (value: number) => void
}

export function TimeStepper(props: TimeStepperProps) {
  const minMinutes = props.minMinutes ?? 0
  const maxMinutes = props.maxMinutes ?? MAX_DAY_END_MINUTES
  const valueMinutes = clampMinutes(props.valueMinutes, minMinutes, maxMinutes)

  const commitMinutes = (value: number) => {
    props.onChangeMinutes(clampMinutes(value, minMinutes, maxMinutes))
  }

  const commitClockValue = (value: string) => {
    commitMinutes(
      resolveTimeInputMinutes(value, {
        minMinutes,
        maxMinutes,
        referenceMinutes: valueMinutes,
      }),
    )
  }

  const shift = (direction: 1 | -1) => {
    commitMinutes(valueMinutes + direction * props.buttonStepMinutes)
  }

  return (
    <label className="pd-field">
      <span>{props.label}</span>
      <div className="pd-time-stepper">
        <input
          type="time"
          step={60}
          value={minutesToTime(valueMinutes)}
          onBlur={(event) => commitClockValue(event.target.value)}
          onChange={(event) => commitClockValue(event.target.value)}
        />
        <div className="pd-stepper-buttons" aria-hidden="false">
          <button
            type="button"
            aria-label={`${props.increaseLabel}: ${props.label}`}
            onClick={() => shift(1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 10l4-4 4 4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={`${props.decreaseLabel}: ${props.label}`}
            onClick={() => shift(-1)}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        </div>
      </div>
      {props.locale && (
        <small className="pd-time-day-label">
          {formatDayOffsetLabel(props.locale, valueMinutes)}
        </small>
      )}
    </label>
  )
}
