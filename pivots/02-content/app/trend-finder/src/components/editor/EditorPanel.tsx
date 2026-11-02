import { useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { Shot } from '../../types'
import { useApp } from '../../lib/appContext'
import { getCut } from '../../lib/cut'
import { t } from '../../lib/i18n'
import type { SourcesHook } from '../../lib/editor/useSources'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import type { EditHook } from '../../lib/editor/useEditProject'
import { reelDurationInFrames, totalLength, MAX_TOTAL } from '../../lib/editor/timeline'
import type { ReelInput } from '../../lib/editor/types'
import { Reel } from '../../remotion/Reel'
import { ToolTabs, type Tool } from './ToolTabs'
import { TextTool } from './tools/TextTool'
import { MusicTool, type MusicFile } from './tools/MusicTool'
import { BrandTool } from './tools/BrandTool'
import { Timeline } from './Timeline'
import { clipName } from './clipName'
import { ErrorText } from '../ErrorText'
import { ExportBar } from './ExportBar'

interface Props {
  ideaId: string
  clientId: string
  shots: Shot[]
  edit: EditHook
  sources: SourcesHook // the plan's footage with lengths, kept above the drawer
  timeline: TimelineActions
  readOnly: boolean
}

const FONT_URL = '/fonts/NotoSansTC-VF.ttf'

export function EditorPanel({ ideaId, clientId, shots, edit, sources: footage, timeline, readOnly }: Props) {
  const { project, loadError, save, stale, update, flush, reload } = edit
  const { sources, error: sourceError } = footage
  const [skipped, setSkipped] = useState<string[]>([])
  const [frame, setFrame] = useState(0)
  const [tool, setTool] = useState<Tool>('clips')
  const [musicFile, setMusicFile] = useState<MusicFile | undefined>(undefined)
  const { clients } = useApp()
  const client = clients.find((c) => c.id === clientId)
  const kit = client?.brand
  const player = useRef<PlayerRef>(null)

  const byKey = useMemo(() => Object.fromEntries((sources ?? []).map((s) => [s.key, s])), [sources])
  const urls = useMemo(() => Object.fromEntries((sources ?? []).map((s) => [s.key, s.url])), [sources])
  // The plan's music track is looked up once; MusicTool keeps it current after an upload or removal.
  useEffect(() => {
    let cancelled = false
    getCut(ideaId).then(
      (c) => !cancelled && setMusicFile(c.music),
      () => !cancelled && setMusicFile(null),
    )
    return () => {
      cancelled = true
    }
  }, [ideaId])

  const logo = kit?.logo
  const brand = useMemo(
    () => ({
      font: kit?.font ?? 'Noto Sans TC',
      color: kit?.color ?? null,
      logoUrl: logo ? `/api/clients/${encodeURIComponent(clientId)}/brand/logo?v=${encodeURIComponent(logo)}` : null,
    }),
    [kit?.font, kit?.color, logo, clientId],
  )
  const musicUrl = musicFile ? `/api/ideas/${encodeURIComponent(ideaId)}/cut/music/file?v=${encodeURIComponent(`${musicFile.name}-${musicFile.size}`)}` : null
  const inputProps = useMemo<ReelInput | null>(
    () => (project ? { project, urls, lines: {}, musicUrl, voice: [], brand, fontUrl: FONT_URL } : null),
    [project, urls, musicUrl, brand],
  )

  // The player reports its frame as it plays or seeks; the playhead on the timeline follows.
  const ready = project !== null // the player only exists once the project has loaded
  useEffect(() => {
    const p = player.current
    if (!p) return
    const on = (e: { detail: { frame: number } }) => setFrame(e.detail.frame)
    p.addEventListener('frameupdate', on)
    p.addEventListener('seeked', on)
    return () => {
      p.removeEventListener('frameupdate', on)
      p.removeEventListener('seeked', on)
    }
  }, [ready])

  if (loadError) return <ErrorText text={loadError} />
  if (!project || !inputProps) return <p className="muted">{t('editor.loading')}</p>

  const seek = (f: number) => {
    player.current?.seekTo(f)
    setFrame(f)
  }
  const total = totalLength(project)
  const full = total > MAX_TOTAL - 0.2
  const locked = readOnly || stale
  const fill = async () => setSkipped(await timeline.fill())

  return (
    <div className="cv-ed nokey">
      <div className="cv-ed-status" role="status">
        {stale ? (
          <span className="cv-ed-stale">
            {t('editor.stale')}{' '}
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload}>{t('editor.reload')}</button>
          </span>
        ) : save === 'failed' ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void flush()}>{t('editor.save.failed')}</button>
        ) : save === 'saving' ? (
          <span className="muted">{t('editor.save.saving')}</span>
        ) : save === 'saved' ? (
          <span className="muted">{t('editor.save.saved')}</span>
        ) : null}
        {readOnly && <span className="muted">{t('editor.readOnly')}</span>}
      </div>
      <div className="cv-ed-player">
        <Player
          ref={player}
          component={Reel}
          inputProps={inputProps}
          durationInFrames={reelDurationInFrames(project)}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          controls
          style={{ width: '100%', aspectRatio: '9 / 16', maxHeight: '55vh' }}
        />
      </div>
      <ToolTabs tool={tool} onTool={setTool} />
      <div className="cv-ed-panel" role="tabpanel" id={`cv-ed-panel-${tool}`} aria-labelledby={`cv-ed-tab-${tool}`}>
        {tool === 'clips' && (
          <>
          {project.clips.length === 0 && (
            <div className="cv-ed-empty">
              <p className="muted">{t('editor.empty')}</p>
              <button type="button" className="btn btn-primary btn-sm" disabled={locked} onClick={() => void fill()}>
                {t('editor.fill')}
              </button>
            </div>
          )}
          {skipped.length > 0 && (
            <ul className="cv-ed-skipped small muted" role="status">
              {skipped
                .map((id) => ({ id, n: shots.findIndex((s) => s.id === id) + 1 }))
                .filter((x) => x.n > 0)
                .map(({ id, n }) => (
                  <li key={id}>{t('editor.fill.skipped', { n })}</li>
                ))}
            </ul>
          )}
          <Timeline project={project} sources={byKey} shots={shots} frame={frame} readOnly={locked} timeline={timeline} onProject={update} onSeek={seek} />
          </>
        )}
        {tool === 'text' && <TextTool project={project} seconds={frame / 30} readOnly={locked} onProject={update} />}
        {tool === 'music' && <MusicTool ideaId={ideaId} project={project} file={musicFile} onFile={setMusicFile} readOnly={locked} onProject={update} />}
        {tool === 'brand' && <BrandTool client={client} project={project} readOnly={locked} onProject={update} />}
      </div>
      <ExportBar ideaId={ideaId} edit={edit} timeline={timeline} readOnly={locked} />
      <section className="cv-ed-sources" aria-label={t('editor.sources.title')}>
        <h3>{t('editor.sources.title')}</h3>
        {sourceError && <ErrorText text={sourceError} />}
        {sources && sources.length === 0 && <p className="muted">{t('editor.sources.empty')}</p>}
        {full && <p className="muted">{t('editor.sources.full')}</p>}
        <ul className="cv-ed-source-list">
          {(sources ?? []).map((s) => (
            <li key={s.key}>
              <span className="cv-ed-source-name">
                {clipName(s, shots)} · {s.kind === 'take' ? t('editor.sources.take') : t('editor.sources.generation')} · {t('editor.clip.seconds', { sec: Math.round(s.duration * 10) / 10 })}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={locked || full} onClick={() => void timeline.addClip({ kind: s.kind, id: s.id, nodeId: s.nodeId, shotId: s.shotId })}>
                {t('editor.sources.add')}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
