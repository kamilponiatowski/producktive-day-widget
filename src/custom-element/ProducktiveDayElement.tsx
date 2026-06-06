import { createRoot, type Root } from 'react-dom/client'
import widgetStyles from '../styles/widget.css?inline'
import {
  ProducktiveDayApp,
  type ProducktiveDayHandle,
  type ProducktiveDayProps,
} from '../ui/ProducktiveDayApp'
import type { AgentBlockProposal, DayPlan } from '../domain/types'
import { MAX_DAY_END_MINUTES } from '../domain/time'

type AttributeName =
  | 'locale'
  | 'api-base'
  | 'storage-key'
  | 'start-hour'
  | 'end-hour'
  | 'step-minutes'
  | 'theme'

const numericAttribute = (element: HTMLElement, name: AttributeName, fallback: number) => {
  const value = Number(element.getAttribute(name))
  return Number.isFinite(value) ? value : fallback
}

const endHourAttribute = (element: HTMLElement, startHour: number, fallback: number) => {
  const value = numericAttribute(element, 'end-hour', fallback)
  const maxHour = MAX_DAY_END_MINUTES / 60

  if (value >= 0 && value <= 6) {
    return value + 24
  }

  return Math.min(Math.max(value, startHour + 1), maxHour)
}

export class ProducktiveDayElement extends HTMLElement {
  static observedAttributes: AttributeName[] = [
    'locale',
    'api-base',
    'storage-key',
    'start-hour',
    'end-hour',
    'step-minutes',
    'theme',
  ]

  private root: Root | null = null
  private mountPoint: HTMLDivElement | null = null
  private handle: ProducktiveDayHandle | null = null

  connectedCallback() {
    this.ensureShadowDom()
    this.renderApp()
  }

  disconnectedCallback() {
    this.root?.unmount()
    this.root = null
    this.handle = null
  }

  attributeChangedCallback() {
    if (this.isConnected) {
      this.renderApp()
    }
  }

  getPlan(): DayPlan | null {
    return this.handle?.getPlan() ?? null
  }

  setPlan(plan: DayPlan) {
    this.handle?.setPlan(plan)
  }

  addBlocks(blocks: AgentBlockProposal[]) {
    this.handle?.addBlocks(blocks)
  }

  clearPlan() {
    this.handle?.clearPlan()
  }

  private ensureShadowDom() {
    if (!this.shadowRoot) {
      const shadowRoot = this.attachShadow({ mode: 'open' })
      const style = document.createElement('style')
      style.textContent = widgetStyles
      shadowRoot.append(style)

      this.mountPoint = document.createElement('div')
      shadowRoot.append(this.mountPoint)
      return
    }

    this.mountPoint = this.shadowRoot.querySelector('div')
  }

  private getProps(): ProducktiveDayProps {
    const locale = this.getAttribute('locale') === 'en' ? 'en' : 'pl'
    const startHour = numericAttribute(this, 'start-hour', 5)

    return {
      locale,
      apiBase: this.getAttribute('api-base') || '/api/day-agent',
      storageKey: this.getAttribute('storage-key') || 'producktive.day.v1',
      startHour,
      endHour: endHourAttribute(this, startHour, 23),
      stepMinutes: numericAttribute(this, 'step-minutes', 15),
      theme: this.getAttribute('theme') || 'producktive',
      onReady: (handle) => {
        this.handle = handle
        this.dispatchWidgetEvent('ready', { version: '0.1.0' })
      },
      onChange: (plan) => this.dispatchWidgetEvent('change', { plan }),
      onError: (message) => this.dispatchWidgetEvent('error', { message }),
    }
  }

  private renderApp() {
    if (!this.mountPoint) return

    this.root ??= createRoot(this.mountPoint)
    this.root.render(<ProducktiveDayApp {...this.getProps()} />)
  }

  private dispatchWidgetEvent(name: 'ready' | 'change' | 'error', detail: unknown) {
    this.dispatchEvent(
      new CustomEvent(`producktive-day:${name}`, {
        bubbles: true,
        composed: true,
        detail,
      }),
    )
  }
}
