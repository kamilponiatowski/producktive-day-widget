import { ProducktiveDayElement } from './ProducktiveDayElement'

export const PRODUCKTIVE_DAY_TAG = 'producktive-day'

export function defineProducktiveDay() {
  if (!customElements.get(PRODUCKTIVE_DAY_TAG)) {
    customElements.define(PRODUCKTIVE_DAY_TAG, ProducktiveDayElement)
  }
}
