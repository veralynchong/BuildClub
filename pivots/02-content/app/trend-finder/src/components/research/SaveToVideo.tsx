import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import type { ResearchSlot } from '../../lib/research'
import { t } from '../../lib/i18n'

interface Props {
  // The video being saved, for the title ("Save @account to…").
  account: string
  // This client's videos (slots), in number order.
  slots: ResearchSlot[]
  // A slot id, or null for "Not sure yet" (Unsorted).
  onPick: (slotId: string | null) => void
  onCancel: () => void
}

// "Save to Research" asks which of the client's videos the reference is for, so the row lands in that video
// already filled in. Opens over Find ideas, the Dashboard or the video breakdown.
export function SaveToVideo(p: Props) {
  const id = useId()
  const box = useRef<HTMLDivElement>(null)
  const back = useRef<Element | null>(null)

  useEffect(() => {
    back.current = document.activeElement
    box.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      const el = back.current
      if (el instanceof HTMLElement && el.isConnected) el.focus()
    }
  }, [])

  // Escape closes only this (not the breakdown underneath); Tab stays inside.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      p.onCancel()
      return
    }
    if (e.key !== 'Tab' || !box.current) return
    const items = [...box.current.querySelectorAll<HTMLButtonElement>('button')]
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="stv-wrap" onClick={p.onCancel}>
      <div
        ref={box}
        className="stv"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onKeyDown={onKeyDown}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="stv-head">
          <h2 id={`${id}-title`}>{t('research.saveTo.title')}</h2>
          <p className="small muted">{t('research.saveTo.intro', { account: p.account })}</p>
        </div>
        <ul className="stv-list">
          {p.slots.map((s) => (
            <li key={s.id}>
              <button type="button" className="stv-option" onClick={() => p.onPick(s.id)}>
                <span className="rs-group-num">{t('research.slot.videoNo', { n: s.number })}</span>
                <span className="stv-topic">{s.topic || '—'}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" className="stv-option stv-unsure" onClick={() => p.onPick(null)}>
              {t('research.saveTo.unsure')}
              <span className="small muted">{t('research.saveTo.unsureHelp')}</span>
            </button>
          </li>
        </ul>
        <button type="button" className="btn btn-ghost stv-cancel" onClick={p.onCancel}>
          {t('research.link.cancel')}
        </button>
      </div>
    </div>
  )
}
