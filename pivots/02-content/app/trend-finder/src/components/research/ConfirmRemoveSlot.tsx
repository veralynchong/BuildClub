import { useEffect, useRef } from 'react'
import { t } from '../../lib/i18n'

interface Props {
  n: number
  topic: string
  onConfirm: () => void
  onCancel: () => void
}

// The pop-up the bin (or ✕) on a video opens: nothing is removed until "Delete" is clicked.
// A native <dialog> opened as a modal: focus stays inside, Esc and a click outside cancel.
export function ConfirmRemoveSlot({ n, topic, onConfirm, onCancel }: Props) {
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
      aria-labelledby="rs-remove-slot-title"
      aria-describedby="rs-remove-slot-text"
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="rs-modal-box">
        <h2 id="rs-remove-slot-title">{t('research.slot.deleteTitle', { n })}</h2>
        <p id="rs-remove-slot-text">{t('research.slot.deleteText', { topic: topic || t('research.slot.videoNo', { n }) })}</p>
        <div className="rs-modal-actions">
          <button type="button" className="btn btn-ghost" autoFocus onClick={onCancel}>
            {t('research.slot.deleteCancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t('research.slot.deleteConfirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}
