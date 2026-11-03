import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import type { GenModel, Generation } from '../../lib/canvas/types'

interface Props {
  versions: Generation[]
  selectedId: string | null
  disabled: boolean
  onSelect: (genId: string) => void
  models?: GenModel[] // to name the model in a version's title
}

// Who made the version: the model's name, an upload, or the plan's own frame.
const madeBy = (g: Generation, models: GenModel[]): string =>
  g.model === 'imported' ? t('canvas.gen.imported') : g.model === 'upload' ? t('canvas.node.upload') : (models.find((m) => m.id === g.model)?.label ?? g.model)

// A row of version thumbnails: click one to show it, the chosen one has a frame, hover shows when it was made and by
// which model (spec §6.3). A failed attempt shows a warning, a running one a spinner. Only done versions are numbered
// (the card's "v2 / 3" and "Regenerate (v4)" count the same way): a running one shows the number it will get.
export function VersionStrip({ versions, selectedId, disabled, onSelect, models = [] }: Props) {
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
        const made = t('canvas.gen.versionTitle', { n, time: new Date(g.createdAt).toLocaleString(), model: madeBy(g, models) })
        return (
          <button
            key={g.id}
            type="button"
            className={`cv-version${failed ? ' is-failed' : ''}`}
            aria-pressed={g.id === selectedId}
            disabled={disabled || open || failed}
            aria-label={failed ? why : t('canvas.gen.version', { n })}
            title={failed ? why : open ? t('canvas.gen.versionRunning', { n }) : made}
            onClick={() => onSelect(g.id)}
          >
            {g.url && !failed && !open ? (
              g.kind === 'video' ? (
                <video src={g.url} muted playsInline preload="metadata" aria-hidden="true" />
              ) : (
                <img src={g.url} alt="" draggable={false} />
              )
            ) : (
              <span className="cv-version-empty" aria-hidden="true">
                {open ? <span className="cv-spin" /> : failed ? '⚠' : null}
              </span>
            )}
            {!failed && <span className="cv-version-n">{`v${n}`}</span>}
          </button>
        )
      })}
      {chosen?.model === 'imported' && <span className="cv-version-note small muted">{t('canvas.gen.imported')}</span>}
    </div>
  )
}
