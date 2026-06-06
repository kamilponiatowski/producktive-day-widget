import { useState } from 'react'
import type { AgentChatMessage, AgentProposal, DayPlan, Locale } from '../../domain/types'
import { formatTimeWithDayOffset } from '../../domain/time'
import type { Messages } from '../../i18n/messages'

type AgentChatProps = {
  isOpen: boolean
  locale: Locale
  apiBase: string
  plan: DayPlan
  messages: Messages
  onOpenChange: (isOpen: boolean) => void
  onApply: (proposal: AgentProposal) => void
  onError: (message: string) => void
}

export function AgentChat(props: AgentChatProps) {
  const [message, setMessage] = useState('')
  const [proposal, setProposal] = useState<AgentProposal | null>(null)
  const [history, setHistory] = useState<AgentChatMessage[]>([])
  const [error, setError] = useState('')
  const [isLoading, setLoading] = useState(false)
  const labels = props.messages.agent

  const remainingKey = `pd.agentRemaining.${props.plan.localDate}`
  const DAILY_LIMIT = 10

  const [remaining, setRemaining] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(remainingKey)
      return stored !== null ? parseInt(stored, 10) : null
    } catch {
      return null
    }
  })

  const updateRemaining = (value: number) => {
    setRemaining(value)
    try { localStorage.setItem(remainingKey, String(value)) } catch { /* noop */ }
  }

  const requestProposal = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(props.apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: props.locale,
          message: trimmedMessage,
          history,
          plan: props.plan,
        }),
      })

      if (response.ok) {
        const remainingHeader = response.headers.get('x-producktive-agent-remaining')
        if (remainingHeader !== null) {
          updateRemaining(parseInt(remainingHeader, 10))
        }
      } else if (response.status === 429) {
        updateRemaining(0)
      }

      if (!response.ok) {
        let message = `Agent request failed: ${response.status}`

        try {
          const payload = await response.json() as { message?: string; statusMessage?: string }
          message = payload.statusMessage || payload.message || message
        } catch {
          // Keep the status-based fallback when the server returns non-JSON.
        }

        throw new Error(message)
      }

      const data = (await response.json()) as AgentProposal
      setProposal(data)
      setHistory((current) => [
        ...current.slice(-6),
        { role: 'user', content: trimmedMessage },
        { role: 'assistant', content: data.reply },
      ])
      setMessage('')
    } catch (caughtError) {
      const nextError = caughtError instanceof Error ? caughtError.message : labels.error
      setError(nextError)
      props.onError(nextError)
    } finally {
      setLoading(false)
    }
  }

  const apply = () => {
    if (!proposal) return

    props.onApply({ ...proposal, mode: proposal.mode === 'merge' ? 'merge' : 'append' })
    setProposal(null)
    setMessage('')
  }

  return (
    <>
      <button
        type="button"
        className="pd-agent-fab"
        aria-label={labels.closedLabel}
        aria-expanded={props.isOpen}
        onClick={() => props.onOpenChange(true)}
      >
        AI
      </button>

      {props.isOpen && (
        <aside className="pd-agent-panel" aria-labelledby="pd-agent-title">
          <div className="pd-agent-header">
            <div>
              <span className="pd-badge">AI</span>
              <h2 id="pd-agent-title">{labels.title}</h2>
              <p>{labels.subtitle}</p>
            </div>
            <button type="button" className="pd-icon-button" onClick={() => props.onOpenChange(false)}>
              x
            </button>
          </div>

          <p className={remaining === 0 ? 'pd-agent-limit pd-agent-limit-exhausted' : 'pd-agent-limit'}>
            {remaining === 0
              ? labels.limitExhausted
              : remaining !== null
                ? labels.limitRemaining(remaining, DAILY_LIMIT)
                : labels.limitInfo}
          </p>

          <form className="pd-agent-form" onSubmit={requestProposal}>
            <label className="pd-field">
              <span className="pd-sr-only">{labels.title}</span>
              <textarea
                value={message}
                rows={5}
                maxLength={1200}
                placeholder={labels.placeholder}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            <button type="submit" className="pd-button pd-button-primary" disabled={isLoading || remaining === 0}>
              {isLoading ? labels.loading : labels.send}
            </button>
          </form>

          {error && <p className="pd-agent-error">{error}</p>}

          {history.length > 0 && (
            <div className="pd-agent-history" aria-label={labels.history}>
              {history.slice(-4).map((item, index) => (
                <p key={`${item.role}-${index}`} className={`pd-agent-history-${item.role}`}>
                  <strong>{item.role === 'user' ? labels.you : labels.assistant}</strong>
                  <span>{item.content}</span>
                </p>
              ))}
            </div>
          )}

          {!proposal && <p className="pd-agent-empty">{labels.empty}</p>}

          {proposal && (
            <div className="pd-agent-preview">
              {proposal.isMock && <span className="pd-badge pd-badge-gold">{labels.mock}</span>}
              <div className="pd-agent-proposal-summary">
                <strong>{labels.proposalTitle(proposal.blocks.length)}</strong>
                <span>{labels.proposalHint}</span>
              </div>
              <p>{proposal.reply}</p>

              {proposal.assumptions.length > 0 && (
                <div className="pd-agent-assumptions">
                  <strong>{labels.assumptions}</strong>
                  <ul>
                    {proposal.assumptions.map((assumption) => (
                      <li key={assumption}>{assumption}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pd-agent-blocks">
                {proposal.blocks.map((block) => (
                  <article key={`${block.title}-${block.startMinutes}`} className="pd-agent-block">
                    <strong>{block.title}</strong>
                    <span>
                      {formatTimeWithDayOffset(block.startMinutes, props.locale)} - {formatTimeWithDayOffset(block.endMinutes, props.locale)}
                    </span>
                  </article>
                ))}
              </div>

              <div className="pd-agent-actions">
                <button type="button" className="pd-button pd-button-ghost" onClick={() => setProposal(null)}>
                  {props.messages.editor.cancel}
                </button>
                <button type="button" className="pd-button pd-button-primary pd-agent-accept-blocks" onClick={apply}>
                  {labels.acceptBlocks(proposal.blocks.length)}
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="pd-button pd-button-ghost pd-agent-clear"
            onClick={() => {
              setMessage('')
              setProposal(null)
              setError('')
              setHistory([])
            }}
          >
            {labels.clear}
          </button>
        </aside>
      )}
    </>
  )
}
