import { useEffect, useRef } from 'react'
import { t } from '../../lib/i18n'

interface Props {
  account: string
  onConfirm: () => void
  onCancel: () => void
}

// The pop-up the ✕ on a reference video opens: nothing is removed until "Remove" is clicked.
// Same native <dialog> as ConfirmRemoveSlot: focus stays inside, Esc and a click outside cancel.
export function ConfirmRemoveRow({ account, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal()
    return () => d?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="rs-modal"
      aria-labelledby="rs-remove-row-title"
      aria-describedby="rs-remove-row-text"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="rs-modal-box">
        <h2 id="rs-remove-row-title">{t('research.row.deleteTitle')}</h2>
        <p id="rs-remove-row-text">{t('research.row.deleteText', { account })}</p>
        <div className="rs-modal-actions">
          <button type="button" className="btn btn-ghost" autoFocus onClick={onCancel}>
            {t('research.removeKeep')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t('research.remove')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
