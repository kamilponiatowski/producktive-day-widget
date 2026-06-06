import { useEffect, useMemo, useState } from 'react'
import type { Locale, Priority, TimeBlock, TimeBlockTemplate } from '../../domain/types'
import { formatTimeWithDayOffset, MAX_DAY_END_MINUTES } from '../../domain/time'
import type { Messages } from '../../i18n/messages'
import { brandColorOptions, timeBlockPresets } from '../../domain/timeBlockPresets'
import {
  createTemplateCategory,
  normalizeTemplateTitle,
} from '../../domain/timeBlockTemplates'
import { MIN_BLOCK_DURATION_MINUTES } from '../../domain/dayPlan'
import { TimeStepper } from '../primitives/TimeStepper'

type EditorState =
  | {
      mode: 'create'
      startMinutes: number
      endMinutes: number
      prefill?: {
        title?: string
        priority?: Priority
        category?: string
        colorToken?: string
        note?: string
      }
    }
  | {
      mode: 'edit'
      block: TimeBlock
    }

export type BlockEditorSubmit = {
  title: string
  startMinutes: number
  endMinutes: number
  priority: Priority
  category: string
  colorToken: string
  note: string
}

type BlockEditorProps = {
  editor: EditorState
  locale: Locale
  messages: Messages
  stepMinutes: number
  templates: TimeBlockTemplate[]
  hiddenTagKeys: string[]
  onRemoveTag: (title: string) => void
  onSubmit: (payload: BlockEditorSubmit) => void
  onCancel: () => void
  onDelete?: () => void
}

type BlockChoice = {
  key: string
  title: string
  priority: Priority
  category: string
  colorToken: string
  note: string
  durationMinutes?: number
}

const defaultPreset = timeBlockPresets[1]

const getColorInputValue = (value: string) =>
  /^#[0-9a-f]{6}$/i.test(value) ? value : defaultPreset.colorToken

const buildBlockChoices = (locale: Locale, templates: TimeBlockTemplate[], hiddenTagKeys: string[]) => {
  const choices: BlockChoice[] = []
  const seenTitles = new Set<string>()
  const hidden = new Set(hiddenTagKeys)
  const pushChoice = (choice: BlockChoice) => {
    const normalizedTitle = normalizeTemplateTitle(choice.title)
    if (!normalizedTitle || seenTitles.has(normalizedTitle) || hidden.has(normalizedTitle)) return

    seenTitles.add(normalizedTitle)
    choices.push(choice)
  }

  timeBlockPresets.forEach((preset) => {
    pushChoice({
      key: `preset:${preset.key}`,
      title: preset.label[locale],
      priority: preset.priority,
      category: preset.category,
      colorToken: preset.colorToken,
      note: '',
    })
  })

  templates.forEach((template) => {
    pushChoice({
      key: `template:${template.key}`,
      title: template.title,
      priority: template.priority,
      category: template.category,
      colorToken: template.colorToken,
      note: template.note,
      durationMinutes: template.durationMinutes,
    })
  })

  return choices
}

const findChoiceKey = (
  choices: BlockChoice[],
  block: { title: string; category: string },
) =>
  choices.find((choice) => choice.category === block.category)?.key
  ?? choices.find((choice) => normalizeTemplateTitle(choice.title) === normalizeTemplateTitle(block.title))?.key
  ?? null

export function BlockEditor(props: BlockEditorProps) {
  const blockChoices = useMemo(
    () => buildBlockChoices(props.locale, props.templates, props.hiddenTagKeys),
    [props.hiddenTagKeys, props.locale, props.templates],
  )
  const initial = useMemo(() => {
    if (props.editor.mode === 'edit') {
      return props.editor.block
    }

    const prefill = props.editor.prefill
    return {
      title: prefill?.title ?? '',
      startMinutes: props.editor.startMinutes,
      endMinutes: props.editor.endMinutes,
      priority: prefill?.priority ?? defaultPreset.priority,
      category: prefill?.category ?? createTemplateCategory(defaultPreset.label.en),
      colorToken: prefill?.colorToken ?? defaultPreset.colorToken,
      note: prefill?.note ?? '',
    }
  }, [props.editor])

  const [title, setTitle] = useState(initial.title)
  const [startMinutes, setStartMinutes] = useState(initial.startMinutes)
  const [endMinutes, setEndMinutes] = useState(initial.endMinutes)
  const [priority, setPriority] = useState<Priority>(initial.priority)
  const [category, setCategory] = useState(initial.category)
  const [colorToken, setColorToken] = useState(initial.colorToken)
  const [note, setNote] = useState(initial.note)
  const [selectedChoiceKey, setSelectedChoiceKey] = useState<string | null>(() => {
    if (props.editor.mode === 'edit') return findChoiceKey(blockChoices, initial)
    if (props.editor.mode === 'create' && props.editor.prefill) {
      return findChoiceKey(blockChoices, {
        title: props.editor.prefill.title ?? '',
        category: props.editor.prefill.category ?? '',
      })
    }
    return null
  })
  const [isEditingTags, setEditingTags] = useState(false)
  const labels = props.messages.editor
  const selectedChoice = blockChoices.find((choice) => choice.key === selectedChoiceKey) ?? null

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [])

  const applyChoice = (choice: BlockChoice) => {
    const isActive = selectedChoiceKey === choice.key
    setSelectedChoiceKey(isActive ? null : choice.key)

    if (isActive) return

    setTitle(choice.title)
    setPriority(choice.priority)
    setCategory(choice.category)
    setColorToken(choice.colorToken)

    if (!note.trim() && choice.note) {
      setNote(choice.note)
    }

    if (props.editor.mode === 'create' && choice.durationMinutes) {
      setEndMinutes(Math.min(MAX_DAY_END_MINUTES, startMinutes + choice.durationMinutes))
    }
  }

  const changeTitle = (value: string) => {
    setTitle(value)

    if (
      selectedChoice
      && normalizeTemplateTitle(value) !== normalizeTemplateTitle(selectedChoice.title)
    ) {
      setSelectedChoiceKey(null)
    }
  }

  const removeChoice = (choice: BlockChoice) => {
    props.onRemoveTag(choice.title)

    if (selectedChoiceKey === choice.key) {
      setSelectedChoiceKey(null)
      setCategory(createTemplateCategory(title || choice.title))
    }
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedTitle = title.trim()

    if (!trimmedTitle || endMinutes <= startMinutes) return

    props.onSubmit({
      title: trimmedTitle,
      startMinutes,
      endMinutes,
      priority,
      category: selectedChoiceKey ? category : createTemplateCategory(trimmedTitle),
      colorToken,
      note,
    })
  }

  return (
    <div className="pd-modal-layer" role="presentation">
      <form className="pd-editor-bubble" aria-labelledby="pd-editor-title" onSubmit={submit}>
        <div className="pd-editor-header">
          <div>
            <h2 id="pd-editor-title">
              <span className="pd-badge">{props.editor.mode === 'edit' ? labels.editTitle : labels.createTitle}</span>
            </h2>
          </div>
          <button type="button" className="pd-icon-button" onClick={props.onCancel} aria-label={labels.cancel}>
            x
          </button>
        </div>

        <div className="pd-field-grid">
          <TimeStepper
            label={labels.start}
            valueMinutes={startMinutes}
            buttonStepMinutes={props.stepMinutes}
            increaseLabel={labels.increase}
            decreaseLabel={labels.decrease}
            locale={props.locale}
            maxMinutes={endMinutes - MIN_BLOCK_DURATION_MINUTES}
            onChangeMinutes={setStartMinutes}
          />
          <TimeStepper
            label={labels.end}
            valueMinutes={endMinutes}
            buttonStepMinutes={props.stepMinutes}
            increaseLabel={labels.increase}
            decreaseLabel={labels.decrease}
            locale={props.locale}
            minMinutes={startMinutes + MIN_BLOCK_DURATION_MINUTES}
            onChangeMinutes={setEndMinutes}
          />
        </div>

        <div className="pd-token-field pd-token-field-full" role="group" aria-labelledby="pd-tags-label">
          <div className="pd-token-field-header">
            <span id="pd-tags-label" className="pd-token-field-label">{labels.timeBlock}</span>
            <button
              type="button"
              className={isEditingTags ? 'pd-icon-button pd-token-edit pd-token-edit-active' : 'pd-icon-button pd-token-edit'}
              aria-label={isEditingTags ? labels.finishEditingTags : labels.editTags}
              aria-pressed={isEditingTags}
              onClick={() => setEditingTags((value) => !value)}
            >
              <svg className="pd-button-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </div>
          <div className={isEditingTags ? 'pd-chip-row pd-block-tag-row pd-block-tag-row-editing' : 'pd-chip-row pd-block-tag-row'}>
            {blockChoices.map((choice) => (
              <button
                key={choice.key}
                type="button"
                className={[
                  'pd-chip',
                  'pd-block-tag',
                  selectedChoiceKey === choice.key && !isEditingTags ? 'pd-chip-active' : '',
                  isEditingTags ? 'pd-chip-removable' : '',
                ].join(' ')}
                aria-label={isEditingTags ? labels.removeTag(choice.title) : choice.title}
                aria-pressed={!isEditingTags && selectedChoiceKey === choice.key}
                onClick={() => (isEditingTags ? removeChoice(choice) : applyChoice(choice))}
              >
                <span>{choice.title}</span>
                {isEditingTags && <span className="pd-chip-remove-mark" aria-hidden="true">x</span>}
              </button>
            ))}
          </div>
        </div>

        <label className="pd-field">
          <span>{labels.title}</span>
          <input
            value={title}
            placeholder={labels.titlePlaceholder}
            maxLength={80}
            autoFocus
            onChange={(event) => changeTitle(event.target.value)}
          />
        </label>

        <fieldset className="pd-token-field pd-priority-field">
          <legend>{labels.priority}</legend>
          <div className="pd-chip-row pd-priority-row">
            {(['low', 'medium', 'high'] as Priority[]).map((item) => (
              <button
                key={item}
                type="button"
                className={[
                  'pd-chip',
                  'pd-priority-chip',
                  `pd-priority-chip-${item}`,
                  priority === item ? 'pd-chip-active' : '',
                ].join(' ')}
                aria-pressed={priority === item}
                onClick={() => setPriority(item)}
              >
                {props.messages.priority[item]}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="pd-color-field">
          <legend>{labels.color}</legend>
          <div className="pd-color-grid">
            {brandColorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={option.value === colorToken ? 'pd-color-swatch pd-color-swatch-active' : 'pd-color-swatch'}
                style={{ '--pd-swatch-color': option.value } as React.CSSProperties}
                aria-label={`${labels.color}: ${option.label[props.locale]}`}
                aria-pressed={option.value === colorToken}
                onClick={() => setColorToken(option.value)}
              />
            ))}

            <label className="pd-custom-color">
              <input
                type="color"
                value={getColorInputValue(colorToken)}
                aria-label={labels.customColor}
                onChange={(event) => setColorToken(event.target.value)}
              />
              <span>{labels.customColor}</span>
            </label>
          </div>
        </fieldset>

        <label className="pd-field">
          <span>{labels.note}</span>
          <textarea
            value={note}
            placeholder={labels.notePlaceholder}
            maxLength={240}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="pd-editor-preview" style={{ '--pd-block-color': colorToken } as React.CSSProperties}>
          <span>{title || labels.titlePlaceholder}</span>
          <small>
            {formatTimeWithDayOffset(startMinutes, props.locale)} - {formatTimeWithDayOffset(endMinutes, props.locale)}
          </small>
        </div>

        <div className="pd-editor-actions">
          {props.onDelete && (
            <button type="button" className="pd-button pd-button-danger" onClick={props.onDelete}>
              {labels.delete}
            </button>
          )}
          <button type="button" className="pd-button pd-button-ghost" onClick={props.onCancel}>
            {labels.cancel}
          </button>
          <button type="submit" className="pd-button pd-button-primary">
            {props.editor.mode === 'edit' ? labels.save : labels.create}
          </button>
        </div>
      </form>
    </div>
  )
}
