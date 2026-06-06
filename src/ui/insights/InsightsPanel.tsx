import { useMemo, useState } from 'react'
import type { Locale } from '../../domain/types'
import type { Messages } from '../../i18n/messages'
import { categoryLabels, insights, type Insight, type InsightCategory } from './insights'

type InsightsPanelProps = {
  isOpen: boolean
  locale: Locale
  messages: Messages
  onOpenChange: (isOpen: boolean) => void
  onAddInsight: (insight: Insight) => void
}

export function InsightsPanel(props: InsightsPanelProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<InsightCategory | 'all'>('all')
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const labels = props.messages.insightsPanel

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return insights.filter((insightItem) => {
      const matchesCategory = category === 'all' || insightItem.category === category
      const text = [
        insightItem.title[props.locale],
        insightItem.summary[props.locale],
        insightItem.what[props.locale],
        insightItem.howItWorks[props.locale],
        insightItem.useToday[props.locale],
      ].join(' ').toLowerCase()

      return matchesCategory && (!normalizedQuery || text.includes(normalizedQuery))
    })
  }, [category, props.locale, query])

  if (!props.isOpen) return null

  return (
    <>
      <aside className="pd-insights-panel" aria-labelledby="pd-insights-title">
        <div className="pd-agent-header">
          <div>
            <span className="pd-badge pd-badge-gold">{props.messages.insights}</span>
            <h2 id="pd-insights-title">{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button type="button" className="pd-icon-button" aria-label={labels.close} onClick={() => props.onOpenChange(false)}>
            x
          </button>
        </div>

        <label className="pd-field">
          <span>{labels.search}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>

        <div className="pd-chip-row" role="tablist" aria-label={props.messages.insights}>
          <button
            type="button"
            className={category === 'all' ? 'pd-chip pd-chip-active' : 'pd-chip'}
            onClick={() => setCategory('all')}
          >
            {labels.all}
          </button>
          {(Object.keys(categoryLabels) as InsightCategory[]).map((item) => (
            <button
              key={item}
              type="button"
              className={category === item ? 'pd-chip pd-chip-active' : 'pd-chip'}
              onClick={() => setCategory(item)}
            >
              {categoryLabels[item][props.locale]}
            </button>
          ))}
        </div>

        <div className="pd-insights-list">
          {filtered.map((insightItem) => (
            <button
              key={insightItem.id}
              type="button"
              className="pd-insight-card"
              onClick={() => setSelectedInsight(insightItem)}
            >
              <span className="pd-insight-id">{String(insightItem.id).padStart(2, '0')}</span>
              <span className="pd-insight-content">
                <strong>{insightItem.title[props.locale]}</strong>
                <span>{insightItem.summary[props.locale]}</span>
                <small>
                  {labels.useToday}: {insightItem.useToday[props.locale]}
                </small>
              </span>
            </button>
          ))}
        </div>
      </aside>

      {selectedInsight && (
        <div
          className="pd-modal-layer pd-modal-layer-soft"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedInsight(null)
            }
          }}
        >
          <article
            className="pd-insight-dialog"
            aria-labelledby="pd-insight-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pd-editor-header">
              <div>
                <span className="pd-badge pd-badge-gold">
                  {categoryLabels[selectedInsight.category][props.locale]}
                </span>
                <h2 id="pd-insight-dialog-title">{selectedInsight.title[props.locale]}</h2>
              </div>
              <button
                type="button"
                className="pd-icon-button"
                aria-label={labels.close}
                onClick={() => setSelectedInsight(null)}
              >
                x
              </button>
            </div>

            <div className="pd-insight-detail-grid">
              <section>
                <h3>{labels.what}</h3>
                <p>{selectedInsight.what[props.locale]}</p>
              </section>
              <section>
                <h3>{labels.howItWorks}</h3>
                <p>{selectedInsight.howItWorks[props.locale]}</p>
              </section>
              <section>
                <h3>{labels.useToday}</h3>
                <p>{selectedInsight.useToday[props.locale]}</p>
              </section>
            </div>

            {selectedInsight.sourceUrl && (
              <a
                className="pd-source-link"
                href={selectedInsight.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            )}

            <div className="pd-editor-actions">
              <button type="button" className="pd-button pd-button-ghost" onClick={() => setSelectedInsight(null)}>
                {labels.close}
              </button>
              <button
                type="button"
                className="pd-button pd-button-primary"
                onClick={() => {
                  const insightToAdd = selectedInsight
                  props.onAddInsight(insightToAdd)
                  setSelectedInsight(null)
                }}
              >
                {labels.addToDay}
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  )
}
