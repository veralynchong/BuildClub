import { useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { Shot } from '../../types'
import { useApp } from '../../lib/appContext'
import { getCut, type CutState } from '../../lib/cut'
import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import type { SourcesHook } from '../../lib/editor/useSources'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import type { EditHook } from '../../lib/editor/useEditProject'
import { pollGen } from '../../lib/canvas/api'
import { getPendingVoices, getVoices, importTts, startTts, type PendingVoice, type VoiceInfo } from '../../lib/editor/api'
import { fillShotIds } from '../../lib/storyboard'
import { addVoice, clipLength, reelDurationInFrames, sourceKey, totalLength, MAX_TOTAL } from '../../lib/editor/timeline'
import type { ReelInput, VoiceSeg } from '../../lib/editor/types'
import { reelBrand, reelInput, shotLines } from '../../lib/editor/preview'
import { Reel } from '../../remotion/Reel'
import { stepsDone, tabsDone } from '../../lib/editor/steps'
import type { CanvasDoc, Generation } from '../../lib/canvas/types'
import { clipNode } from '../../lib/canvas/timelineNode'
import type { Take } from '../../lib/takes'
import { ToolTabs, type Tool } from './ToolTabs'
import { ShotClips } from './ShotClips'
import { ClipSettings } from './ClipSettings'
import { TextTool } from './tools/TextTool'
import { CaptionTool } from './tools/CaptionTool'
import { VoiceTool } from './tools/VoiceTool'
import { MusicTool, type MusicFile } from './tools/MusicTool'
import { BrandTool } from './tools/BrandTool'
import { Timeline } from './Timeline'
import { clipLabel } from './clipName'
import { ErrorText } from '../ErrorText'
import { ExportBar } from './ExportBar'

interface Props {
  ideaId: string
  clientId: string
  shots: Shot[]
  edit: EditHook
  sources: SourcesHook // the plan's footage with lengths, kept above the drawer
  timeline: TimelineActions
  doc: CanvasDoc // the board, to find a clip's node
  gens: Generation[]
  takes: Take[]
  readOnly: boolean
  onBack: () => void // back to the canvas
  onJumpToNode: (nodeId: string) => void // back to the canvas, with that node selected and centred
  focus?: 'export' | 'send' | null // open with the export panel showing and that control focused (the Timeline node's Export)
}

export function EditorPanel({ ideaId, clientId, shots, edit, sources: footage, timeline, doc, gens, takes, readOnly, onBack, onJumpToNode, focus = null }: Props) {
  const { project, loadError, save, stale, update, flush, current, reload } = edit
  const { sources, error: sourceError } = footage
  const [skipped, setSkipped] = useState<string[]>([])
  const [frame, setFrame] = useState(0)
  const [tool, setTool] = useState<Tool>('clips')
  const [visited, setVisited] = useState<ReadonlySet<Tool>>(() => new Set<Tool>(['clips'])) // tabs opened this session
  const openTool = (next: Tool) => {
    setTool(next)
    setVisited((v) => (v.has(next) ? v : new Set(v).add(next)))
  }
  const [selected, setSelected] = useState<string | null>(null) // the timeline clip the Clips tab shows
  const [cut, setCut] = useState<CutState | null>(null) // the export's state, reported by ExportBar for the export button
  const [exportOpen, setExportOpen] = useState(!!focus)
  // The export popover closes on Escape anywhere and on a press outside it (its own toggle button excepted).
  useEffect(() => {
    if (!exportOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setExportOpen(false)
    const onDown = (e: PointerEvent) => {
      const el = e.target as Element | null
      if (!el?.closest('#cv-ed-export, [aria-controls="cv-ed-export"]')) setExportOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [exportOpen])
  const [musicFile, setMusicFile] = useState<MusicFile | undefined>(undefined)
  const [pending, setPending] = useState<PendingVoice[]>([])
  const [musicKey, setMusicKey] = useState(0) // counts music uploads and replacements, so a finished video is looked at again
  const [ttsBusy, setTtsBusy] = useState(false)
  const [ttsError, setTtsError] = useState<string | null>(null)
  const ttsGoing = useRef(false) // a second click can never start (and charge) a second job
  const ttsAbort = useRef<AbortController | null>(null)
  const frameRef = useRef(0)
  const [voices, setVoices] = useState<Record<string, VoiceInfo>>({})
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

  // Finished AI voices that were never imported are offered again; a running job is aborted with the drawer, and
  // its result then waits here as a pending one.
  useEffect(() => {
    let cancelled = false
    getPendingVoices(ideaId).then(
      (list) => {
        if (cancelled) return
        setPending(list)
        const going = list.find((g) => g.status !== 'done')
        if (going) followRef.current(going.id) // a job still going: wait for it, then add it
      },
      () => {},
    )
    return () => {
      cancelled = true
      ttsAbort.current?.abort()
    }
  }, [ideaId])

  // Voiceover files (with their word times) are looked up once; VoiceTool keeps the list current.
  useEffect(() => {
    let cancelled = false
    getVoices(ideaId).then(
      (list) => !cancelled && setVoices((cur) => ({ ...Object.fromEntries(list.map((v) => [v.id, v])), ...cur })),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [ideaId])
  useEffect(() => {
    frameRef.current = frame
  })
  const adoptVoice = (info: VoiceInfo, source: VoiceSeg['source']) => {
    setVoices((cur) => ({ ...cur, [info.id]: info }))
    const base = current()
    if (base) update(addVoice(base, { id: info.id, source, start: Math.round((frameRef.current / 30) * 100) / 100, volume: 1, edits: {} }))
  }
  // Starts or resumes one AI voice job: wait for it, then add it. Only one runs at a time, so nobody pays twice.
  const followTts = (begin: () => Promise<string>) => {
    if (ttsGoing.current) return
    ttsGoing.current = true
    setTtsBusy(true)
    setTtsError(null)
    const ac = new AbortController()
    ttsAbort.current = ac
    void (async () => {
      let genId = ''
      let finished = false
      try {
        genId = await begin()
        const end = await pollGen(ideaId, genId, () => {}, { signal: ac.signal })
        if (!end) return
        finished = true
        if (end.status !== 'done') throw new Error(serverText(end.error) || t('editor.tts.failed'))
        setPending((cur) => cur.map((g) => (g.id === genId ? { ...g, status: 'done' } : g)))
        adoptVoice(await importTts(ideaId, genId), 'tts')
        setPending((cur) => cur.filter((g) => g.id !== genId))
      } catch (e) {
        setTtsError(e instanceof Error ? e.message : String(e))
      } finally {
        if (finished && genId) setPending((cur) => cur.filter((g) => g.id !== genId || g.status === 'done'))
        ttsGoing.current = false
        ttsAbort.current = null
        setTtsBusy(false)
      }
    })()
  }
  const runTts = (text: string, model: string) => followTts(async () => (await startTts(ideaId, text, model)).id)
  const followRef = useRef<(genId: string) => void>(() => {})
  useEffect(() => {
    followRef.current = (genId) => followTts(async () => genId)
  })
  const importPending = (genId: string) => {
    if (ttsGoing.current) return
    ttsGoing.current = true
    setTtsBusy(true)
    setTtsError(null)
    void (async () => {
      try {
        adoptVoice(await importTts(ideaId, genId), 'tts')
        setPending((cur) => cur.filter((g) => g.id !== genId))
      } catch (e) {
        setTtsError(e instanceof Error ? e.message : String(e))
      } finally {
        ttsGoing.current = false
        setTtsBusy(false)
      }
    })()
  }
  const filled = useMemo(() => fillShotIds(shots), [shots])
  const lines = useMemo(() => shotLines(filled), [filled])
  const words = useMemo(() => Object.fromEntries(Object.values(voices).flatMap((v) => (v.words ? [[v.id, v.words]] : []))), [voices])
  const voiceInput = useMemo(
    () => (project?.voiceover ?? []).flatMap((seg) => (voices[seg.id] ? [{ id: seg.id, url: voices[seg.id].url, words: voices[seg.id].words }] : [])),
    [project?.voiceover, voices],
  )

  const brand = useMemo(() => reelBrand(kit, clientId), [kit, clientId])
  const musicUrl = musicFile ? `/api/ideas/${encodeURIComponent(ideaId)}/cut/music/file?v=${encodeURIComponent(`${musicFile.name}-${musicFile.size}`)}` : null
  const inputProps = useMemo<ReelInput | null>(
    () => (project ? reelInput({ project, urls, shots: filled, musicUrl, voice: voiceInput, brand }) : null),
    [project, urls, filled, musicUrl, voiceInput, brand],
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

  // Opened for Export or Send: once the controls exist, focus the one asked for (else the first that can be used).
  const focused = useRef(false)
  useEffect(() => {
    if (!focus || !ready || focused.current) return
    focused.current = true
    const raf = requestAnimationFrame(() => {
      const box = document.getElementById('cv-ed-export')
      const target = box?.querySelector<HTMLElement>(`[data-step="${focus}"]:not(:disabled)`) ?? box?.querySelector<HTMLElement>('button:not(:disabled)')
      target?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [focus, ready])

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

  const steps = stepsDone({ project, clientHasLogo: !!kit?.logo, cut })
  const done = tabsDone(
    { project, clientHasLogo: !!kit?.logo, cut, texts: project.texts.length, voices: project.voiceover.length, music: !!musicFile && project.music !== null },
    visited,
  )
  const nameOf = (c: (typeof project.clips)[number]) => clipLabel(c.source, filled, gens, takes)
  const nodeOf = (c: (typeof project.clips)[number]) => clipNode(doc, c.source)
  const selClip = project.clips.find((c) => c.id === selected) ?? null
  const pick = (clipId: string) => {
    setSelected(clipId)
    openTool('clips')
  }

  return (
    <div className="cv-ed cv-ed-full nokey">
      <header className="cv-ed-top">
        <button type="button" className="link-btn" onClick={onBack}>{t('editor.back')}</button>
        <div className="cv-ed-top-end">
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
          <button type="button" className="btn btn-primary btn-sm" aria-expanded={exportOpen} aria-controls="cv-ed-export" data-done={steps.export || undefined} onClick={() => setExportOpen((o) => !o)}>
            {steps.export && <span aria-hidden="true">✓ </span>}
            {t('editor.exportMenu')}
            {steps.export && <span className="sr-only"> ({t('editor.step.done')})</span>}
          </button>
        </div>
      </header>
      <div className="cv-ed-main">
        <aside className="cv-ed-left">
          <ShotClips shots={filled} project={project} sources={sources} error={sourceError} gens={gens} takes={takes} full={full} locked={locked} timeline={timeline} selected={selected} onSelect={pick} />
        </aside>
        <div className="cv-ed-centre">
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
              style={{ width: '100%', aspectRatio: '9 / 16', maxHeight: '100%' }}
            />
          </div>
          {/* over the player, never over the tabs; always mounted, so a running export keeps being followed while closed */}
          <div id="cv-ed-export" className="cv-ed-export-pop" hidden={!exportOpen} onKeyDown={(e) => e.key === 'Escape' && setExportOpen(false)}>
            <ExportBar ideaId={ideaId} edit={edit} timeline={timeline} readOnly={locked} brandKey={`${kit?.logo ?? ''}|${kit?.color ?? ''}|${kit?.font ?? ''}`} musicKey={musicKey} linesKey={JSON.stringify(lines)} onCut={setCut} />
          </div>
        </div>
        <div className="cv-ed-side">
          <ToolTabs tool={tool} onTool={openTool} done={done} />
          <div className="cv-ed-panel" role="tabpanel" id={`cv-ed-panel-${tool}`} aria-labelledby={`cv-ed-tab-${tool}`}>
            {tool === 'clips' && (
              <ClipSettings
                project={project}
                clip={selClip}
                name={selClip ? nameOf(selClip) : ''}
                sourceDuration={selClip ? (byKey[sourceKey(selClip.source)]?.duration ?? clipLength(selClip) + selClip.in) : 0}
                nodeId={selClip ? nodeOf(selClip) : null}
                readOnly={locked}
                onProject={update}
                onJump={onJumpToNode}
              />
            )}
            {tool === 'text' && <TextTool project={project} seconds={frame / 30} readOnly={locked} onProject={update} />}
            {tool === 'captions' && <CaptionTool project={project} lines={lines} shotIds={filled.flatMap((s) => (s.id ? [s.id] : []))} words={words} readOnly={locked} onProject={update} />}
            {tool === 'voice' && (
              <VoiceTool
                ideaId={ideaId}
                project={project}
                current={current}
                flush={flush}
                voices={voices}
                adopt={adoptVoice}
                tts={{ busy: ttsBusy, error: ttsError, run: runTts }}
                pending={pending}
                onImport={importPending}
                onVoiceGone={(id) => setVoices((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== id)))}
                lineTexts={filled.map((s) => s.line ?? '')}
                readOnly={locked}
                onProject={update}
              />
            )}
            {tool === 'music' && <MusicTool ideaId={ideaId} project={project} file={musicFile} onFile={(f) => { setMusicFile(f); setMusicKey((n) => n + 1) }} readOnly={locked} onProject={update} />}
            {tool === 'brand' && <BrandTool client={client} project={project} readOnly={locked} onProject={update} />}
          </div>
        </div>
      </div>
      <div className="cv-ed-bottom">
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
        <Timeline
          project={project}
          sources={byKey}
          frame={frame}
          readOnly={locked}
          timeline={timeline}
          selected={selected}
          onSelect={setSelected}
          nameOf={nameOf}
          nodeOf={nodeOf}
          onJump={onJumpToNode}
          onProject={update}
          onSeek={seek}
        />
      </div>
    </div>
  )
}
