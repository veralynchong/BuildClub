import { useEffect } from 'react'
import { t } from '../lib/i18n'

// What a finished background search leaves behind: results waiting to be opened, or why it failed.
export type SearchNotice = { kind: 'ready'; q: string; onView: () => void } | { kind: 'error'; message: string }

// Errors fade on their own; "ready" waits for the person, since they may have been away.
export const ERROR_TOAST_MS = 15_000

export function SearchToast({ notice, onDismiss }: { notice: SearchNotice; onDismiss: () => void }) {
  const isError = notice.kind === 'error'
  useEffect(() => {
    if (!isError) return
    const id = setTimeout(onDismiss, ERROR_TOAST_MS)
    return () => clearTimeout(id)
  }, [isError, notice, onDismiss])

  return (
    <div className={`toast ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>
      {notice.kind === 'ready' ? (
        <>
          <span className="toast-ok" aria-hidden="true">✓</span>
          <span className="toast-msg">{t('find.bg.ready', { query: notice.q })}</span>
          <button className="btn btn-primary btn-sm" onClick={notice.onView}>{t('find.bg.view')}</button>
        </>
      ) : (
        <span className="toast-msg">{notice.message}</span>
      )}
      <button className="toast-x" onClick={onDismiss} aria-label={t('find.bg.dismiss')}>✕</button>
    </div>
  )
}
