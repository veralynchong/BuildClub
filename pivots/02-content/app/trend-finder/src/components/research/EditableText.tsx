import { useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { t } from '../../lib/i18n'

interface Props {
  value: string
  // The field's name, e.g. "Hook".
  field: string
  // Labels the input, e.g. "Hook for @tofu.daily".
  label: string
  // Shown when the value is empty, e.g. "Add a hook".
  empty: string
  multiline?: boolean
  // Shown under the input while editing.
  hint?: string
  // What the cell shows when not editing (defaults to the text).
  children?: ReactNode
  // Called only when the text changed.
  onSave: (next: string) => void
}

// A cell you click to edit. Saves on Enter or when you click away; Escape cancels. In the multi-line version,
// Shift+Enter adds a line break.
export function EditableText(p: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  // Set by Enter / Escape so focus goes back to the cell; a click elsewhere leaves focus where it went.
  const refocus = useRef(false)
  // Escape: the blur that follows must not save.
  const skipBlur = useRef(false)

  const close = (save: boolean, back: boolean) => {
    if (draft === null) return
    if (save && draft.trim() !== p.value.trim()) p.onSave(draft.trim())
    refocus.current = back
    setDraft(null)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Typing Chinese: Enter picks a character, it doesn't save.
    if (e.nativeEvent.isComposing) return
    if (e.key === 'Escape') {
      e.preventDefault()
      skipBlur.current = true
      close(false, true)
    } else if (e.key === 'Enter' && !(p.multiline && e.shiftKey)) {
      e.preventDefault()
      skipBlur.current = true
      close(true, true)
    }
  }
  const onBlur = () => {
    if (skipBlur.current) {
      skipBlur.current = false
      return
    }
    close(true, false)
  }

  if (draft !== null) {
    const common = {
      className: 'rs-edit-input',
      value: draft,
      'aria-label': p.label,
      autoFocus: true,
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      onKeyDown,
      onBlur,
      onFocus: (e: { target: HTMLInputElement | HTMLTextAreaElement }) => e.target.select(),
    }
    return (
      <div className="rs-edit">
        {p.multiline ? <textarea rows={3} {...common} /> : <input type="text" {...common} />}
        {p.hint && <span className="rs-edit-hint">{p.hint}</span>}
      </div>
    )
  }

  const empty = !p.value.trim()
  return (
    <button
      type="button"
      className={`rs-edit-view${empty ? ' is-empty' : ''}`}
      ref={(el) => {
        if (el && refocus.current) {
          refocus.current = false
          el.focus()
        }
      }}
      onClick={() => {
        skipBlur.current = false
        setDraft(p.value)
      }}
    >
      {empty ? <span className="rs-edit-empty">{p.empty}</span> : (p.children ?? <span className="rs-edit-text">{p.value}</span>)}
      {!empty && <span className="sr-only">{` · ${t('research.edit.hint', { field: p.field })}`}</span>}
    </button>
  )
}
