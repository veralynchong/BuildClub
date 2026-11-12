import { useCallback, useEffect, useRef, useState } from 'react'
import type { Shot } from '../../types'
import { framePrompt, type GridCell } from '../../lib/shotGrid'
import { ANGLES, FRAMINGS, GEARS, LENSES, MOVEMENTS, angleLabel, framingLabel, gearLabel, movementLabel } from '../../lib/shots'
import { t } from '../../lib/i18n'

type Patch = Partial<Pick<Shot, 'framing' | 'angle' | 'movement' | 'lens' | 'gear' | 'time'>>

interface Props {
  cell: GridCell
  anchor: DOMRect
  readOnly: boolean
  price: string // empty when no image model can make the frame
  modelNote: string
  onPrompt: (prompt: string | null) => void
  onFields: (patch: Patch) => void
  busy: boolean // a regenerate for this frame is already on its way
  onRegenerate: (prompt: string, own: boolean) => void
  onClose: (returnFocus?: boolean) => void
}

const SAVE_DELAY_MS = 800

function Select<T extends string>({ label, value, options, name, onChange, disabled }: {
  label: string; value: T | undefined; options: readonly T[]; name: (v: T) => string; onChange: (v: T | undefined) => void; disabled: boolean
}) {
  return (
    <label>{label}
      <select value={value ?? ''} disabled={disabled} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}>
        <option value="">{t('grid.f.none')}</option>
        {options.map((o) => <option key={o} value={o}>{name(o)}</option>)}
      </select>
    </label>
  )
}

export function RefinePopover({ cell, anchor, readOnly, price, modelNote, busy, onPrompt, onFields, onRegenerate, onClose }: Props) {
  const { shot } = cell
  const [draft, setDraft] = useState<string | null>(null) // null: untouched, the card's prompt is shown
  const [time, setTime] = useState(shot.time)
  const box = useRef<HTMLDivElement>(null)
  const text = draft ?? cell.prompt
  const effective = text.trim() ? text : framePrompt(shot)
  const own = draft !== null ? !!draft.trim() : !cell.auto

  // The typed text is saved ~800 ms after the last keystroke, when the popover closes and when the page is left.
  // `sent` is the text last handed to onPrompt (or the card's own prompt), so already saved text is never saved again.
  const latest = useRef<string | null>(null)
  const sent = useRef(cell.prompt)
  const save = useRef(onPrompt)
  save.current = onPrompt
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const d = latest.current
    if (d === null || d === sent.current) return
    sent.current = d
    save.current(d.trim() ? d : null)
  }, [])

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(true) }
    const away = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) onClose(false) }
    document.addEventListener('keydown', key)
    document.addEventListener('mousedown', away)
    window.addEventListener('pagehide', flush)
    box.current?.querySelector('textarea')?.focus()
    return () => {
      document.removeEventListener('keydown', key)
      document.removeEventListener('mousedown', away)
      window.removeEventListener('pagehide', flush)
    }
  }, [onClose, flush])
  useEffect(() => flush, [flush])

  const type = (v: string) => {
    setDraft(v)
    latest.current = v
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  const left = Math.max(16, Math.min(window.innerWidth - 336, anchor.right + 12 > window.innerWidth - 336 ? anchor.left - 332 : anchor.right + 12))
  const top = Math.max(16, Math.min(window.innerHeight - 460, anchor.top))
  const commitTime = () => {
    const v = time.trim()
    if (!v) setTime(shot.time)
    else if (v !== shot.time) onFields({ time: v })
  }

  return (
    <div className="sg-pop" ref={box} role="dialog" aria-label={t('grid.refine.title', { n: cell.index + 1 })} style={{ left, top }}>
      <div className="sg-pop-head">
        <b>{t('grid.refine.title', { n: cell.index + 1 })}</b>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onClose(true)}>{t('grid.close')}</button>
      </div>
      <label>{t('grid.prompt')}
        <textarea
          rows={4}
          className={own ? '' : 'sg-auto'}
          value={text}
          readOnly={readOnly}
          onChange={(e) => type(e.target.value)}
          onBlur={flush}
        />
      </label>
      {own
        ? <button type="button" className="sg-link" disabled={readOnly} onClick={() => { clearTimeout(timer.current); latest.current = null; sent.current = ''; setDraft(null); onPrompt(null) }}>{t('grid.promptReset')}</button>
        : <span className="sg-muted">{t('grid.promptAuto')}</span>}
      <div className="sg-pop-grid">
        <Select label={t('grid.f.size')} value={shot.framing} options={FRAMINGS} name={framingLabel} disabled={readOnly} onChange={(v) => onFields({ framing: v })} />
        <Select label={t('grid.f.angle')} value={shot.angle} options={ANGLES} name={angleLabel} disabled={readOnly} onChange={(v) => onFields({ angle: v })} />
        <Select label={t('grid.f.movement')} value={shot.movement} options={MOVEMENTS} name={movementLabel} disabled={readOnly} onChange={(v) => onFields({ movement: v })} />
        <Select label={t('grid.f.lens')} value={shot.lens} options={LENSES} name={(v) => v} disabled={readOnly} onChange={(v) => onFields({ lens: v })} />
        <Select label={t('grid.f.gear')} value={shot.gear} options={GEARS} name={gearLabel} disabled={readOnly} onChange={(v) => onFields({ gear: v })} />
        <label>{t('grid.f.length')}
          <input value={time} disabled={readOnly} onChange={(e) => setTime(e.target.value)} onBlur={commitTime} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        </label>
      </div>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={readOnly || !cell.nodeId || !!cell.pending || busy || !price}
        title={price ? undefined : t('grid.noModel')}
        onClick={() => { flush(); onRegenerate(effective, own) }}
      >{price ? t('grid.regenerateFrame', { price }) : t('grid.regenerateOff')}</button>
      {modelNote && <span className="sg-muted">{modelNote}</span>}
      <span className="sg-muted">{t('grid.noAuto')}</span>
    </div>
  )
}
