import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import type { Generation } from '../../lib/canvas/types'

interface Props {
  versions: Generation[]
  selectedId: string | null
  disabled: boolean
  onSelect: (genId: string) => void
}

// v1 v2 v3… under a generated node: the chosen one is pressed, a failed one shows a warning, a running one a spinner.
// Only done versions are numbered (the card's "v2 / 3" and "Regenerate (v4)" count the same way): a running one shows
// the number it will get, a failed attempt only its warning.
export function VersionStrip({ versions, selectedId, disabled, onSelect }: Props) {
  if (versions.length === 0) return null
  const chosen = versions.find((g) => g.id === selectedId)
  let done = 0
  return (
    <div className="cv-versions nodrag" role="group" aria-label={t('canvas.gen.versions')}>
      {versions.map((g) => {
        const n = g.status === 'done' ? ++done : done + 1
        const open = g.status === 'queued' || g.status === 'waiting' || g.status === 'running'
        const failed = g.status === 'failed' || g.status === 'unknown'
        const why = g.status === 'unknown' ? t('canvas.gen.unknown') : t('canvas.gen.failed', { error: serverText(g.error) })
        return (
          <button
            key={g.id}
            type="button"
            className={`cv-version${failed ? ' is-failed' : ''}`}
            aria-pressed={g.id === selectedId}
            disabled={disabled || open || failed}
            aria-label={failed ? why : undefined}
            title={failed ? why : open ? t('canvas.gen.versionRunning', { n }) : g.model === 'imported' ? `${t('canvas.gen.version', { n })} · ${t('canvas.gen.imported')}` : t('canvas.gen.version', { n })}
            onClick={() => onSelect(g.id)}
          >
            {open && <span className="cv-spin" aria-hidden="true" />}
            {failed ? <span aria-hidden="true">⚠</span> : `v${n}`}
          </button>
        )
      })}
      {chosen?.model === 'imported' && <span className="cv-version-note small muted">{t('canvas.gen.imported')}</span>}
    </div>
  )
}
