import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { t } from '../../lib/i18n'
import { ErrorText } from '../ErrorText'
import { flatItems, itemAt, type TGroup, type TItem } from '../../lib/editor/transcript'
import { stamp } from '../../lib/editor/aiEdit'

interface Props {
  groups: TGroup[]
  notice: string | null // why some or all of the words are missing (analysis running or failed, no speech)
  nameOf: (clipId: string) => string
  seconds: number // the playhead
  playing: boolean
  readOnly: boolean
  onSeek: (sec: number) => void
  onDelete: (a: number, b: number) => Promise<string | null> // flat item indices; an error to show, or null
  onFix: (key: string, text: string, original: string) => void
}

const sec1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1)

// The left panel's Transcript tab: the words of the clips on the timeline, grouped per clip. A click seeks, Shift-click or a
// drag selects a run, Delete cuts it (the same cut the AI clean-up makes), a double-click corrects a word.
export function Transcript({ groups, notice, nameOf, seconds, playing, readOnly, onSeek, onDelete, onFix }: Props) {
  const box = useRef<HTMLDivElement>(null)
  // The selection belongs to the timeline it was made on; any change to the clips drops it.
  const sig = groups.map((g) => `${g.clipId}:${g.in}:${g.out}:${g.items.length}`).join('|')
  const [sel, setSel] = useState<{ sig: string; a: number; b: number } | null>(null)
  const range = sel && sel.sig === sig ? { lo: Math.min(sel.a, sel.b), hi: Math.max(sel.a, sel.b) } : null
  const [editing, setEditing] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const drag = useRef(false) // the button is down on a word
  const moved = useRef(false) // ... and the pointer went on to another one, so the click that ends it does not seek
  const cur = itemAt(groups, seconds)

  useEffect(() => {
    const up = () => { drag.current = false }
    document.addEventListener('pointerup', up)
    return () => document.removeEventListener('pointerup', up)
  }, [])
  // While playing, the word being said stays in view.
  useEffect(() => {
    if (!playing || !cur) return
    box.current?.querySelector(`[data-key="${CSS.escape(cur)}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [cur, playing])

  const flat = flatItems(groups)
  const indexOf = new Map(flat.map((f, k) => [f.item.key, k]))
  const count = range ? range.hi - range.lo + 1 : 0

  const remove = async () => {
    if (!range || busy || readOnly) return
    setBusy(true)
    setError('')
    const err = await onDelete(range.lo, range.hi)
    setBusy(false)
    if (err) setError(err)
    else setSel(null)
  }
  const down = (k: number, e: PointerEvent) => {
    if (e.button !== 0 || editing) return
    box.current?.focus({ preventScroll: true })
    setError('')
    if (e.shiftKey && range) setSel({ sig, a: sel?.a ?? k, b: k })
    else setSel({ sig, a: k, b: k })
    drag.current = true
    moved.current = false
  }
  const enter = (k: number) => {
    if (!drag.current || !sel) return
    moved.current = true
    setSel({ ...sel, sig, b: k })
  }
  const click = (x: TItem, e: { shiftKey: boolean }) => {
    if (e.shiftKey || moved.current) return
    onSeek(x.from)
  }
  const onKey = (e: KeyboardEvent) => {
    if (editing) return
    if ((e.key === 'Delete' || e.key === 'Backspace') && range) {
      e.preventDefault()
      void remove()
    } else if (e.key === 'Escape' && range) {
      e.preventDefault()
      setSel(null)
    }
  }

  return (
    <div className="cv-tr">
      <p className="cv-tr-hint">{t('editor.tr.hint')}</p>
      {notice && <p className="cv-tr-notice" role="status">{notice}</p>}
      {range && (
        <div className="cv-tr-bar" role="toolbar">
          <span>{t('editor.tr.selected', { n: count })}</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSel(null)}>{t('editor.tr.clear')}</button>
          <button type="button" className="btn btn-primary btn-sm" disabled={readOnly || busy} onClick={() => void remove()}>
            {busy ? t('editor.tr.cutting') : t('editor.tr.delete')}
          </button>
        </div>
      )}
      {error && <ErrorText text={error} />}
      <div className="cv-tr-list" ref={box} tabIndex={0} aria-label={t('editor.tr.list')} onKeyDown={onKey}>
        {groups.map((g) => (
          <section key={g.clipId} className="cv-tr-group">
            <header className="cv-tr-head">
              <b>{nameOf(g.clipId)}</b>
              <span>{stamp(g.from)}</span>
            </header>
            {g.state !== 'ok' ? (
              <p className="cv-tr-none">{t(g.state === 'generation' ? 'editor.tr.clipGen' : g.state === 'pending' ? 'editor.tr.clipLoading' : g.state === 'unavailable' ? 'editor.tr.unavailable' : 'editor.tr.clipNone')}</p>
            ) : (
              <p className="cv-tr-words">
                {g.items.map((x) => {
                  const k = indexOf.get(x.key) ?? -1
                  const common = {
                    'data-key': x.key,
                    'data-cur': x.key === cur || undefined,
                    'data-sel': (range && k >= range.lo && k <= range.hi) || undefined,
                    onPointerDown: (e: PointerEvent) => down(k, e),
                    onPointerEnter: () => enter(k),
                    onClick: (e: { shiftKey: boolean }) => click(x, e),
                  }
                  if (x.kind === 'gap') {
                    return (
                      <span key={x.key} className="cv-tr-gap" {...common} aria-label={t('editor.tr.gap', { sec: sec1(x.seconds) })}>
                        {t('editor.tr.pill', { sec: sec1(x.seconds) })}
                      </span>
                    )
                  }
                  if (editing === x.key) return <WordInput key={x.key} item={x} onDone={(text) => { setEditing(null); if (text !== null && text !== x.text) onFix(x.key, text, x.original) }} />
                  return (
                    <span
                      key={x.key}
                      className="cv-tr-w"
                      data-filler={x.filler || undefined}
                      data-fixed={x.text !== x.original || undefined}
                      title={x.text !== x.original ? t('editor.tr.fixed', { original: x.original }) : undefined}
                      {...common}
                      onDoubleClick={() => !readOnly && setEditing(x.key)}
                    >
                      {x.text}
                    </span>
                  )
                })}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}

// A word being corrected: Enter or leaving keeps the text, Escape keeps the word as it was.
function WordInput({ item, onDone }: { item: Extract<TItem, { kind: 'word' }>; onDone: (text: string | null) => void }) {
  const [value, setValue] = useState(item.text)
  const done = useRef(false)
  const finish = (text: string | null) => {
    if (done.current) return
    done.current = true
    onDone(text)
  }
  return (
    <input
      className="cv-tr-input"
      aria-label={t('editor.tr.fix')}
      autoFocus
      value={value}
      maxLength={120}
      size={Math.max(2, value.length + 1)}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') finish(value)
        else if (e.key === 'Escape') finish(null)
      }}
    />
  )
}
