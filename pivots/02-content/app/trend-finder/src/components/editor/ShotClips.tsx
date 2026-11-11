import { useState } from 'react'
import type { Shot } from '../../types'
import type { Generation } from '../../lib/canvas/types'
import { listTakes, retryAnalysis, type Take } from '../../lib/takes'
import { t } from '../../lib/i18n'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { sourceKey } from '../../lib/editor/timeline'
import type { EditProject, SourceInfo } from '../../lib/editor/types'
import { serverText } from '../../lib/serverText'
import { ErrorText } from '../ErrorText'
import type { ShotUpload } from '../../lib/editor/useShotUpload'
import { clipLabel } from './clipName'
import { Icon } from './icons'

interface Props {
  shots: Shot[] // the plan's shots, with ids
  project: EditProject
  sources: SourceInfo[] | null
  error: string | null
  gens: Generation[]
  takes: Take[]
  planId: string | null // the plan whose takes these are; null for a workspace
  onTakes: (takes: Take[]) => void // the takes read again after a retry
  full: boolean // the reel is at its longest
  locked: boolean
  timeline: TimelineActions
  selected: string | null // the selected timeline clip
  onSelect: (clipId: string) => void
  uploads: ShotUpload | null // sending footage from here; null when this plan can't take footage
}

// The left column: each shot with its finished footage ("Shot 1 · v3", "Shot 2 · Take 1"). Putting one in the timeline
// replaces the shot's one clip; the one already there shows so and selects its clip.
export function ShotClips({ shots, project, sources, error, gens, takes, planId, onTakes, full, locked, timeline, selected, onSelect, uploads }: Props) {
  const planned = shots.filter((s): s is Shot & { id: string } => !!s.id)
  const [dropOn, setDropOn] = useState<number | null>(null) // the shot a file is being dragged over
  const canUpload = !!uploads && !locked
  const take = (i: number, files: FileList | null) => {
    if (files && files.length) uploads?.upload(i, Array.from(files))
  }
  const retry = (takeId: string) => {
    if (!planId) return
    void retryAnalysis(planId, takeId).then(() => listTakes(planId)).then(onTakes).catch(() => undefined)
  }
  return (
    <section className="cv-ed-shots" aria-label={t('editor.shots.title')}>
      {error && <ErrorText text={error} />}
      {sources && sources.length === 0 && <p className="cv-ed-note">{t('editor.sources.empty')}</p>}
      {full && <p className="cv-ed-note">{t('editor.sources.full')}</p>}
      {shots.length === 0 && <ul className="cv-ed-source-list">
        {(sources ?? []).map((s) => <li key={s.key}>
          <Thumb url={s.url} />
          <span className="cv-ed-source-body">
            <span className="cv-ed-source-name">{clipLabel(s, shots, gens, takes)}</span>
            <span className="cv-ed-source-meta">{t('editor.clip.seconds', { sec: Math.round(s.duration * 10) / 10 })}</span>
          </span>
          <button type="button" className="cv-ed-chip" disabled={locked || timeline.isInTimeline(s)} onClick={() => void timeline.useForShot(s)}>{t(timeline.isInTimeline(s) ? 'canvas.clip.on' : 'canvas.clip.put')}</button>
        </li>)}
      </ul>}
      <ol className="cv-ed-shot-list">
        {planned.map((shot, i) => {
          const mine = (sources ?? []).filter((s) => s.shotId === shot.id)
          return (
            <li
              key={shot.id}
              className="cv-ed-shot"
              data-drop={dropOn === i ? '' : undefined}
              onDragOver={(e) => { if (canUpload && e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDropOn(i) } }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropOn((d) => (d === i ? null : d)) }}
              onDrop={(e) => { if (!canUpload) return; e.preventDefault(); setDropOn(null); take(i, e.dataTransfer.files) }}
            >
              <div className="cv-ed-shot-head">
                <Icon name="film" size={12} />
                <b>{t('editor.clip.shot', { n: i + 1 })}</b>
                {shot.shot && <span className="cv-ed-shot-desc">{shot.shot}</span>}
                {canUpload && (
                  <label className="cv-ed-ib cv-ed-ib-sm cv-ed-upload" title={t(mine.length === 0 ? 'editor.shots.upload' : 'editor.shots.uploadMore')}>
                    <Icon name="upload" />
                    <span className="sr-only">{t(mine.length === 0 ? 'editor.shots.upload' : 'editor.shots.uploadMore')}</span>
                    <input type="file" multiple accept="video/mp4,video/quicktime,video/x-m4v,video/webm,.mp4,.mov,.m4v,.webm" onChange={(e) => { take(i, e.target.files); e.target.value = '' }} />
                  </label>
                )}
              </div>
              {mine.length === 0 ? (
                <p className="cv-ed-shot-empty">{t('editor.shots.none')}{canUpload && <> {t('editor.shots.drop')}</>}</p>
              ) : (
                <ul className="cv-ed-source-list">
                  {mine.map((s) => {
                    const on = timeline.isInTimeline(s)
                    const clip = on ? project.clips.find((c) => sourceKey(c.source) === s.key) : undefined
                    return (
                      <li key={s.key} data-on={on ? '' : undefined} data-selected={clip && clip.id === selected ? '' : undefined} onClick={(e) => { if (clip && !(e.target as Element).closest('button')) onSelect(clip.id) }}>
                        <Thumb url={s.url} />
                        <span className="cv-ed-source-body">
                          <span className="cv-ed-source-name">{clipLabel(s, shots, gens, takes)}</span>
                          <span className="cv-ed-source-meta">
                            {t('editor.clip.seconds', { sec: Math.round(s.duration * 10) / 10 })}
                            <AnalysisChip take={s.kind === 'take' ? takes.find((x) => x.id === s.id) : undefined} onRetry={retry} locked={locked} />
                          </span>
                        </span>
                        {on ? (
                          <button type="button" className="cv-ed-chip cv-ed-on" onClick={() => clip && onSelect(clip.id)}>
                            {t('canvas.clip.on')}
                          </button>
                        ) : (
                          <button type="button" className="cv-ed-chip" disabled={locked} onClick={() => void timeline.useForShot({ kind: s.kind, id: s.id, nodeId: s.nodeId, shotId: s.shotId })}>
                            {t('canvas.clip.put')}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {uploads && (uploads.items[i] ?? []).length > 0 && (
                <ul className="cv-ed-uploads">
                  {(uploads.items[i] ?? []).map((u) => (
                    <li key={u.id} data-status={u.status} role={u.status === 'failed' ? 'alert' : 'status'}>
                      {u.status === 'failed' ? (
                        <>
                          <span className="error small">{t('editor.shots.uploadFailed', { name: u.name, reason: u.error ?? '' })}</span>
                          <button type="button" className="cv-ed-chip" onClick={() => uploads.dismiss(i, u.id)}>{t('canvas.note.dismiss')}</button>
                        </>
                      ) : (
                        <>
                          <span className="cv-ed-note">{u.status === 'uploading' ? t('editor.shots.uploading', { name: u.name }) : u.name}</span>
                          {u.status === 'uploading' && <progress aria-label={u.name} />}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

// A still of the footage's first frames, small and 9:16. `loop` (never played) marks it as a still for speed-control
// extensions, which otherwise put a "1.00" badge over it that spills onto the take's name and length.
function Thumb({ url }: { url: string }) {
  return (
    <span className="cv-ed-thumb" aria-hidden="true">
      {url ? <video src={`${url}#t=0.1`} preload="metadata" muted loop playsInline tabIndex={-1} /> : null}
    </span>
  )
}

// "Analysing…" / "Ready" / "Couldn't analyse" for a take; the numbers it found show as a tooltip.
function AnalysisChip({ take, onRetry, locked }: { take: Take | undefined; onRetry: (takeId: string) => void; locked: boolean }) {
  const a = take?.analysis
  if (!take || !a) return null
  if (a.status === 'failed') {
    return (
      <span className="cv-ed-analysis" data-status="failed" title={a.error ? serverText(a.error) : undefined}>
        <span className="cv-ed-dot" aria-hidden="true" />
        <span role="status">{t('editor.analysis.failed')}</span>
        <button type="button" className="cv-ed-linkish" disabled={locked} onClick={() => onRetry(take.id)}>{t('editor.analysis.retry')}</button>
      </span>
    )
  }
  if (a.status !== 'done') return <span className="cv-ed-analysis" data-status="running" role="status"><span className="cv-ed-dot" aria-hidden="true" />{t('editor.analysis.running')}</span>
  const m = a.summary
  const line = m ? t(m.speech === 'ok' ? 'editor.analysis.summary' : 'editor.analysis.summaryNoSpeech', { words: m.words, silences: m.silences, cuts: m.cuts }) : ''
  return <span className="cv-ed-analysis" data-status="done" title={line} role="status"><span className="cv-ed-dot" aria-hidden="true" />{t('editor.analysis.ready')}{line && <span className="sr-only"> {line}</span>}</span>
}
