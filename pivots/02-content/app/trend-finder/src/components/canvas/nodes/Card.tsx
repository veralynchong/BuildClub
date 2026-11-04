import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../../lib/i18n'
import type { NodeStatus } from '../../../lib/canvas/status'

// The card's header row: the node's type on the left and, on the right, its one status (spec §6.1).
export function CardHead({ title, status }: { title: string; status?: NodeStatus | null }) {
  return (
    <div className="cv-card-head">
      <span className="cv-node-title">{title}</span>
      {status && (
        <span className={`cv-card-status is-${status.tone}`} role="status">
          {t(status.key, status.vars)}
        </span>
      )}
    </div>
  )
}

// The card's result area: the image or a playable video (click the image, or the corner button, for a larger view), a
// striped area while a job runs, a soft placeholder otherwise. `children` replaces the placeholder's empty look.
export function CardMedia({ kind, url, running, label, children }: { kind: 'image' | 'video'; url?: string | null; running?: boolean; label: string; children?: ReactNode }) {
  const [big, setBig] = useState(false)
  const closeBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!big) return
    closeBtn.current?.focus() // the larger view takes the focus, so Enter closes it
    // While it is open no key reaches the board behind it (Backspace would delete the node); Esc closes it. Capture
    // phase, so this runs before the board's own listeners; keys still do their default (Tab, the video's controls).
    const onKey = (e: KeyboardEvent) => {
      e.stopPropagation()
      if (e.key === 'Escape') setBig(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [big])
  if (running) return <div className="cv-card-media is-running" aria-hidden="true" />
  if (!url) return <div className={`cv-card-media is-empty${children ? ' has-note' : ''}`}>{children}</div>
  return (
    <div className="cv-card-media">
      {kind === 'video' ? (
        <video className="nodrag" src={url} muted playsInline controls preload="metadata" aria-label={label} />
      ) : (
        <img src={url} alt={label} draggable={false} className="nodrag" onClick={() => setBig(true)} />
      )}
      <button type="button" className="cv-card-enlarge nodrag" aria-label={t('canvas.card.enlarge')} title={t('canvas.card.enlarge')} onClick={() => setBig(true)}>
        ⤢
      </button>
      {big &&
        createPortal(
          // A portal still bubbles React events to the node: stop them here so a click in the larger view never selects
          // or moves the node behind it.
          <div
            className="cv-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => {
              e.stopPropagation()
              setBig(false)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            {kind === 'video' ? (
              <video src={url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
            ) : (
              <img src={url} alt={label} onClick={(e) => e.stopPropagation()} />
            )}
            <button ref={closeBtn} type="button" className="btn btn-ghost btn-sm cv-lightbox-close" onClick={() => setBig(false)}>
              {t('canvas.card.close')}
            </button>
          </div>,
          document.body,
        )}
    </div>
  )
}

// The card's footer: the model's short name and the price of one run.
export function CardFoot({ model, price, title }: { model: string; price: string; title?: string }) {
  return (
    <div className="cv-card-foot small muted">
      <span className="cv-card-model" title={model}>
        {model}
      </span>
      <span className="cv-card-price" title={title}>
        {price}
      </span>
    </div>
  )
}
