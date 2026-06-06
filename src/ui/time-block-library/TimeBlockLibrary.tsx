import type { Locale, TimeBlockTemplate } from '../../domain/types'
import { formatDuration } from '../../domain/time'
import {
  serializeTimeBlockTemplate,
  TIME_BLOCK_TEMPLATE_MIME,
} from '../../domain/timeBlockTemplates'
import type { Messages } from '../../i18n/messages'

type TimeBlockLibraryProps = {
  templates: TimeBlockTemplate[]
  locale: Locale
  messages: Messages
  onQuickAdd: (template: TimeBlockTemplate) => void
}

export function TimeBlockLibrary(props: TimeBlockLibraryProps) {
  const labels = props.messages.blockLibrary

  return (
    <aside className="pd-block-library" aria-labelledby="pd-block-library-title">
      <div className="pd-block-library-header">
        <h2 id="pd-block-library-title">{labels.title}</h2>
        <p>{labels.subtitle}</p>
      </div>

      {props.templates.length === 0 ? (
        <p className="pd-block-library-empty">{labels.empty}</p>
      ) : (
        <div className="pd-template-list">
          {props.templates.map((template) => {
            const duration = formatDuration(0, template.durationMinutes, props.locale)

            return (
              <button
                key={template.key}
                type="button"
                className="pd-template-card"
                draggable
                style={{ '--pd-template-color': template.colorToken } as React.CSSProperties}
                aria-label={labels.dragLabel(template.title, duration)}
                title={labels.quickAdd(template.title)}
                onClick={() => props.onQuickAdd(template)}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'copy'
                  event.dataTransfer.setData(TIME_BLOCK_TEMPLATE_MIME, serializeTimeBlockTemplate(template))
                  event.dataTransfer.setData('text/plain', template.title)
                }}
              >
                <span className="pd-template-glow" aria-hidden="true" />
                <span className="pd-template-title">{template.title}</span>
                <span className="pd-template-duration">{duration}</span>
              </button>
            )
          })}
        </div>
      )}
    </aside>
  )
}
