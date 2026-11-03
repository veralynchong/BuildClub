import { t } from '../../lib/i18n'
import type { Generation } from '../../lib/canvas/types'

interface Props {
  versions: Generation[]
  selectedId: string | null
  disabled: boolean
  onSelect: (genId: string) => void
}

// v1 v2 v3… under a generated node: the chosen one is pressed, a failed one shows a warning, a running one a spinner.
export function VersionStrip({ versions, selectedId, disabled, onSelect }: Props) {
  if (versions.length === 0) return null
  const chosen = versions.find((g) => g.id === selectedId)
  return (
    <div className="cv-versions nodrag" role="group" aria-label={t('canvas.gen.versions')}>
      {versions.map((g, i) => {
        const n = i + 1
        const open = g.status === 'queued' || g.status === 'waiting' || g.status === 'running'
        const failed = g.status === 'failed' || g.status === 'unknown'
        return (
          <button
            key={g.id}
            type="button"
            className={`cv-version${failed ? ' is-failed' : ''}`}
            aria-pressed={g.id === selectedId}
            disabled={disabled || open || failed}
            title={failed ? t('canvas.gen.versionFailed', { n, error: g.status === 'unknown' ? t('canvas.gen.unknown') : (g.error ?? '') }) : open ? t('canvas.gen.versionRunning', { n }) : g.model === 'imported' ? `${t('canvas.gen.version', { n })} · ${t('canvas.gen.imported')}` : t('canvas.gen.version', { n })}
            onClick={() => onSelect(g.id)}
          >
            {open && <span className="cv-spin" aria-hidden="true" />}
            {failed && <span aria-hidden="true">⚠ </span>}v{n}
          </button>
        )
      })}
      {chosen?.model === 'imported' && <span className="cv-version-note small muted">{t('canvas.gen.imported')}</span>}
    </div>
  )
}
