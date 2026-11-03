import { useEffect } from 'react'
import type { SavedRow } from '../../lib/findDesk'
import { savedPreview } from '../../lib/findDesk'
import { t } from '../../lib/i18n'

// Results: the strip at the bottom that counts what is saved under each Research video, so a video still at 0
// stays in view while searching. Shows the upcoming videos, any video that has something saved, and Unsorted.
export function SavedStrip({ rows, justSaved, onOpenResearch }: { rows: SavedRow[]; justSaved?: string | null; onOpenResearch: () => void }) {
  const upcoming = new Set(savedPreview(rows).map((r) => r.slot?.id ?? 'unsorted'))
  const shown = rows.filter((r) => upcoming.has(r.slot?.id ?? 'unsorted') || r.refs.length > 0)
  if (shown.length === 0) return null
  return (
    <section className="fd-strip" aria-label={t('find.strip.aria')}>
      <span className="fd-tab fd-strip-tab" aria-hidden="true">
        {t('find.strip.title')}
      </span>
      <div className="fd-strip-in">
        <ul className="fd-strip-list">
          {shown.map((r) => {
            const key = r.slot?.id ?? 'unsorted'
            const label = r.slot
              ? r.slot.topic
                ? `${t('find.desk.saved.vNo', { n: r.slot.number })} · ${r.slot.topic}`
                : t('find.desk.saved.vNo', { n: r.slot.number })
              : t('research.unsorted')
            return (
              <li
                key={key}
                className={`fd-tchip ${justSaved === key ? 'is-on' : ''} ${r.slot && r.refs.length === 0 ? 'is-empty' : ''}`}
                aria-label={t('find.strip.itemAria', { label, n: r.refs.length })}
              >
                <span className="fd-tchip-label">{label}</span>
                <b>{r.refs.length}</b>
              </li>
            )
          })}
        </ul>
        <button type="button" className="link-btn fd-strip-open" onClick={onOpenResearch}>
          {t('find.res.openResearch')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  )
}

// Shown after a save on Find ideas: where the video went, with Change (pick another video) and Undo.
export const SAVED_TOAST_MS = 10_000

export function SavedToast({
  where,
  onChange,
  onUndo,
  onDismiss,
}: {
  where: string
  // Missing when the client has no videos to move it to.
  onChange?: () => void
  onUndo: () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const id = setTimeout(onDismiss, SAVED_TOAST_MS)
    return () => clearTimeout(id)
  }, [where, onDismiss])
  return (
    <div className="toast fd-toast" role="status">
      <span className="fd-toast-ok" aria-hidden="true">
        ✓
      </span>
      <span className="toast-msg">{t('find.saved.toast', { where })}</span>
      {onChange && (
        <button type="button" className="link-btn fd-toast-link" onClick={onChange}>
          {t('find.saved.change')}
        </button>
      )}
      <button type="button" className="link-btn fd-toast-link" onClick={onUndo}>
        {t('find.saved.undo')}
      </button>
      <button type="button" className="toast-x" onClick={onDismiss} aria-label={t('find.bg.dismiss')}>
        ✕
      </button>
    </div>
  )
}
