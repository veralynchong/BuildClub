import type { Shot } from '../../types'
import type { Generation } from '../../lib/canvas/types'
import type { Take } from '../../lib/takes'
import { t } from '../../lib/i18n'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import type { EditProject, SourceInfo } from '../../lib/editor/types'
import { ErrorText } from '../ErrorText'
import { clipLabel } from './clipName'

interface Props {
  shots: Shot[] // the plan's shots, with ids
  project: EditProject
  sources: SourceInfo[] | null
  error: string | null
  gens: Generation[]
  takes: Take[]
  full: boolean // the reel is at its longest
  locked: boolean
  timeline: TimelineActions
  selected: string | null // the selected timeline clip
  onSelect: (clipId: string) => void
}

// The left column: each shot with its finished footage ("Shot 1 · v3", "Shot 2 · Take 1"). Putting one in the timeline
// replaces the shot's one clip; the one already there shows so and selects its clip.
export function ShotClips({ shots, project, sources, error, gens, takes, full, locked, timeline, selected, onSelect }: Props) {
  const planned = shots.filter((s): s is Shot & { id: string } => !!s.id)
  return (
    <section className="cv-ed-shots" aria-label={t('editor.shots.title')}>
      <h3>{t('editor.shots.title')}</h3>
      {error && <ErrorText text={error} />}
      {sources && sources.length === 0 && <p className="muted small">{t('editor.sources.empty')}</p>}
      {full && <p className="muted small">{t('editor.sources.full')}</p>}
      <ol className="cv-ed-shot-list">
        {planned.map((shot, i) => {
          const mine = (sources ?? []).filter((s) => s.shotId === shot.id)
          return (
            <li key={shot.id} className="cv-ed-shot">
              <div className="cv-ed-shot-head">
                <b>{t('editor.clip.shot', { n: i + 1 })}</b>
                {shot.shot && <span className="cv-ed-shot-desc muted">{shot.shot}</span>}
              </div>
              {mine.length === 0 ? (
                <p className="muted small">{t('editor.shots.none')}</p>
              ) : (
                <ul className="cv-ed-source-list">
                  {mine.map((s) => {
                    const clip = project.clips.find((c) => c.source.kind === s.kind && c.source.id === s.id)
                    return (
                      <li key={s.key} data-on={clip ? '' : undefined} data-selected={clip && clip.id === selected ? '' : undefined}>
                        <span className="cv-ed-source-name">
                          {clipLabel(s, shots, gens, takes)} · {t('editor.clip.seconds', { sec: Math.round(s.duration * 10) / 10 })}
                        </span>
                        {clip ? (
                          <button type="button" className="cv-badge small cv-ed-on" onClick={() => onSelect(clip.id)}>
                            {t('canvas.clip.on')}
                          </button>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-sm" disabled={locked} onClick={() => void timeline.useForShot({ kind: s.kind, id: s.id, nodeId: s.nodeId, shotId: s.shotId })}>
                            {t('canvas.clip.put')}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
