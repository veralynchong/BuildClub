import { t } from '../lib/i18n'

interface Props {
  busy: boolean
  onFile: (file: File) => void
}

// The "Add take" file picker for one shot.
export function TakeAddButton({ busy, onFile }: Props) {
  return (
    <label className={`btn btn-ghost btn-sm take-add${busy ? ' is-busy' : ''}`} aria-disabled={busy}>
      {busy ? t('plan.takes.uploading') : t('plan.takes.add')}
      <input
        type="file"
        hidden
        accept="video/mp4,video/quicktime,.mp4,.mov"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) onFile(file)
        }}
      />
    </label>
  )
}
