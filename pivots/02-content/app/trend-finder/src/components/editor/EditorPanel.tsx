import { apiBase, type ResourceInput } from '../../lib/canvas/resource.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Player, type PlayerRef } from '@remotion/player'
import type { Shot } from '../../types'
import { useApp } from '../../lib/appContext'
import { getCut, type CutState } from '../../lib/cut'
import { ff } from '../../lib/strings/freeform'
import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import type { SourcesHook } from '../../lib/editor/useSources'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import type { EditHook } from '../../lib/editor/useEditProject'
import { pollGen } from '../../lib/canvas/api'
import { getPendingVoices, getVoices, importTts, startTts, type PendingVoice, type VoiceInfo } from '../../lib/editor/api'
import { useTakeAnalysis } from '../../lib/editor/useTakeAnalysis'
import { fillShotIds } from '../../lib/storyboard'
import { addVoice, clipLength, clipStarts, clipStatus, FPS, moveClip, newClipId, reelDurationInFrames, removeClip, sourceKey, sourcesWithShots, splitAt, totalLength, MAX_TOTAL } from '../../lib/editor/timeline'
import type { EditProject, ReelInput, VoiceSeg } from '../../lib/editor/types'
import { reelBrand, reelInput, shotLines } from '../../lib/editor/preview'
import { Reel } from '../../remotion/Reel'
import { stepsDone, tabsDone } from '../../lib/editor/steps'
import type { CanvasDoc, Generation } from '../../lib/canvas/types'
import { clipNode } from '../../lib/canvas/timelineNode'
import type { Take } from '../../lib/takes'
import { ToolTabs, type Tool } from './ToolTabs'
import { ShotClips } from './ShotClips'
import { useShotUpload } from '../../lib/editor/useShotUpload'
import { ClipSettings } from './ClipSettings'
import { TextTool } from './tools/TextTool'
import { CaptionTool } from './tools/CaptionTool'
import { AiTool } from './AiTool'
import { ExportOptions } from './ExportOptions'
import { SafeZoneOverlay } from './SafeZoneOverlay'
import { PLATFORMS, exportSettings, safeZoneWarnings } from '../../lib/editor/presets'
import { captionMode, projectPages } from '../../lib/editor/captions'
import { MAX_PX, MIN_PX, fitZoom, followScroll, laneBars, previewOf, removeBar, type LaneId } from '../../lib/editor/lanes'
import { emptyHistory, lastAi, record, redo as redoStep, undo as undoStep, type History } from '../../lib/editor/history'
import { useDuckRanges } from '../../lib/editor/useDuckRanges'
import { getKeeps, thumbUrl, type FirstCutEntry } from '../../lib/editor/aiApi'
import { firstCutLine, itemLabel, nextClipId, PAD_DEFAULT, replaceWithRanges, takeName } from '../../lib/editor/aiEdit'
import { clipMarks, groupPins, type Mark } from '../../lib/editor/marks'
import { useMusicPeaks, useTimelineMedia } from '../../lib/editor/useTimelineMedia'
import { VoiceTool } from './tools/VoiceTool'
import { MusicTool, type MusicFile } from './tools/MusicTool'
import { BrandTool } from './tools/BrandTool'
import { HEAD_PX, Timeline, type Selection } from './Timeline'
import { Transport } from './Transport'
import { Icon } from './icons'
import { clipLabel } from './clipName'
import { ErrorText } from '../ErrorText'
import { ExportBar } from './ExportBar'
import { Transcript } from './Transcript'
import { selectionCuts, selectionLabel, setWordFix, transcriptGroups, type TakeSpeech } from '../../lib/editor/transcript'

interface Props {
  ideaId: ResourceInput
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

export function EditorPanel({ ideaId, clientId, shots, edit, sources: footage, timeline: baseTimeline, doc, gens, takes, readOnly, onBack, onJumpToNode, focus = null }: Props) {
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
  const [selection, setSelection] = useState<Selection>(null) // the bar picked on the timeline; the inspector follows it
  const selected = selection?.lane === 'video' ? selection.id : null // the timeline clip the Clips tab shows
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
  // What the AI did this session; undoing it goes through the undo history below.
  const [aiLog, setAiLog] = useState<string[]>([])
  const [firstCut, setFirstCut] = useState<{ log: FirstCutEntry[]; label: string } | null>(null) // why the last auto first cut did what it did
  const [safe, setSafe] = useState(false) // the safe-zone overlay on the preview
  const playerBox = useRef<HTMLDivElement>(null)
  const [voices, setVoices] = useState<Record<string, VoiceInfo>>({})
  const { clients } = useApp()
  const client = clients.find((c) => c.id === clientId)
  const kit = client?.brand
  const player = useRef<PlayerRef>(null)
  // Playback, the timeline's view (zoom, snapping) and the tracks hidden or muted in the preview only.
  const [playing, setPlaying] = useState(false)
  const [rate, setRate] = useState(1)
  const [loop, setLoop] = useState(false)
  const [pmuted, setPmuted] = useState(false)
  const [snap, setSnap] = useState(true)
  const [pxPerSec, setPx] = useState(40)
  const [hidden, setHidden] = useState<ReadonlySet<LaneId>>(() => new Set())
  const [mutedLanes, setMutedLanes] = useState<ReadonlySet<LaneId>>(() => new Set())
  const flip = (set: ReadonlySet<LaneId>, lane: LaneId) => {
    const next = new Set(set)
    if (!next.delete(lane)) next.add(lane)
    return next
  }
  const tlScroll = useRef<HTMLDivElement>(null)
  const [showMarks, setShowMarks] = useState(true) // AI markers on the video lane
  const [kept, setKept] = useState<ReadonlySet<string>>(() => new Set()) // markers dismissed with Keep (this session only)
  const [leftTab, setLeftTab] = useState<'shots' | 'transcript'>('shots')

  // Undo and redo: every change to the project is recorded, whichever tool made it. An AI change carries its name, so
  // the AI tab can offer "Undo last AI change" while it is still the last step.
  const hist = useRef<History>(emptyHistory())
  const [, setHistTick] = useState(0)
  const prevProject = useRef<EditProject | null>(null)
  const skipRecord = useRef<EditProject | null>(null)
  const nextLabel = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevProject.current
    prevProject.current = project
    if (!project) {
      hist.current = emptyHistory()
      return
    }
    if (!prev || prev === project) return
    if (skipRecord.current === project) {
      skipRecord.current = null
      return
    }
    hist.current = record(hist.current, prev, nextLabel.current, Date.now())
    nextLabel.current = null
    setHistTick((n) => n + 1)
  }, [project])

  const byKey = useMemo(() => Object.fromEntries((sources ?? []).map((s) => [s.key, s])), [sources])
  const shotSources = useMemo(() => (sources ? sourcesWithShots(sources, doc) : null), [sources, doc])
  // Footage sent from the shot list: the plan's takes are read again so the new take is named right away.
  const [freshTakes, setFreshTakes] = useState<Take[] | null>(null)
  const planId = typeof ideaId === 'string' ? ideaId : ideaId.kind === 'legacy-plan' ? ideaId.id : null // workspaces take no footage
  const uploads = useShotUpload(planId, footage.refresh, setFreshTakes)
  const allTakes = freshTakes ?? takes
  useTakeAnalysis(planId, allTakes, setFreshTakes)
  // The canvas keeps its own list of takes; a take sent from here is not in it, so it would show as "Footage deleted".
  const timeline = useMemo<TimelineActions>(() => ({
    ...baseTimeline,
    statusOf: (c) => {
      const s = baseTimeline.statusOf(c)
      return s.state === 'missing' && c.source.kind === 'take' && allTakes.some((x) => x.id === c.source.id) ? clipStatus(c, doc, gens, allTakes) : s
    },
  }), [baseTimeline, allTakes, doc, gens])
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
    if (typeof ideaId !== 'string' && ideaId.kind === 'workspace') return
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
  const musicUrl = musicFile ? `${apiBase(ideaId)}/cut/music/file?v=${encodeURIComponent(`${musicFile.name}-${musicFile.size}`)}` : null
  const takesKey = allTakes.map((x) => `${x.id}:${x.analysis?.status ?? ''}`).join(',')
  // Filmstrips, waveforms and clean-up suggestions of the takes on the timeline, fetched once per take and analysis run.
  const tl = useTimelineMedia(planId, allTakes, (project?.clips ?? []).flatMap((c) => (c.source.kind === 'take' ? [c.source.id] : [])))
  const musicPeaks = useMusicPeaks(musicUrl)
  const duck = useDuckRanges(planId, project, !!musicUrl && project?.music != null && project.music.duck !== false, takesKey)
  const inputProps = useMemo<ReelInput | null>(
    () => (project ? { ...reelInput({ project: previewOf(project, hidden, mutedLanes), urls, shots: filled, musicUrl, voice: voiceInput, brand, duck }), hideVideo: hidden.has('video') } : null),
    [project, urls, filled, musicUrl, voiceInput, brand, duck, hidden, mutedLanes],
  )

  // The player reports its frame as it plays or seeks; the playhead on the timeline follows.
  const ready = project !== null // the player only exists once the project has loaded
  useEffect(() => {
    const p = player.current
    if (!p) return
    const on = (e: { detail: { frame: number } }) => setFrame(e.detail.frame)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onMute = (e: { detail: { isMuted: boolean } }) => setPmuted(e.detail.isMuted)
    p.addEventListener('frameupdate', on)
    p.addEventListener('seeked', on)
    p.addEventListener('play', onPlay)
    p.addEventListener('pause', onPause)
    p.addEventListener('ended', onPause)
    p.addEventListener('mutechange', onMute)
    return () => {
      p.removeEventListener('frameupdate', on)
      p.removeEventListener('seeked', on)
      p.removeEventListener('play', onPlay)
      p.removeEventListener('pause', onPause)
      p.removeEventListener('ended', onPause)
      p.removeEventListener('mutechange', onMute)
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

  const locked = readOnly || stale || !!edit.writing
  // Keyboard: Space plays, S splits, Delete removes the selected bar, arrows step frames (Shift: a second), Alt+arrows
  // move the selected clip, Shift+M toggles snapping, Cmd/Ctrl+Z undoes and Shift+Cmd/Ctrl+Z (or Ctrl+Y) redoes. Typing
  // in a field, and the export panel, keep their keys.
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented) return
    const el = e.target as HTMLElement | null
    if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.closest('#cv-ed-export, .cv-ed-menu'))) return
    const p = current()
    if (!p) return
    const mod = e.metaKey || e.ctrlKey
    const key = e.key
    const last = Math.max(0, reelDurationInFrames(p) - 1)
    const go = (f: number) => seek(Math.min(Math.max(0, f), last))
    if (mod && !e.altKey && (key === 'z' || key === 'Z')) { if (e.shiftKey) redo(); else undo() }
    else if (mod && !e.altKey && (key === 'y' || key === 'Y')) redo()
    else if (mod) return
    else if (key === ' ') player.current?.toggle()
    else if (e.altKey && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      const i = selection?.lane === 'video' ? p.clips.findIndex((c) => c.id === selection.id) : -1
      if (i < 0 || locked) return
      update(moveClip(p, i, i + (key === 'ArrowLeft' ? -1 : 1)))
    } else if (key === 'ArrowLeft' || key === 'ArrowRight') go(frameRef.current + (key === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? FPS : 1))
    else if (key === 'Home') go(0)
    else if (key === 'End') go(last)
    else if (e.shiftKey && (key === 'm' || key === 'M')) setSnap((v) => !v)
    else if (!e.shiftKey && !e.altKey && (key === 's' || key === 'S')) {
      if (locked) return
      update(splitAt(p, frameRef.current / FPS, newClipId(p)))
    } else if (key === 'Delete' || key === 'Backspace') {
      if (!selection || locked) return
      const next = removeBar(p, selection.lane, selection.id)
      if (next === p) return
      update(next)
      setSelection(null)
    } else return
    e.preventDefault()
  }
  const keyRef = useRef(onKey)
  useEffect(() => {
    keyRef.current = onKey
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => keyRef.current(e)
    document.addEventListener('keydown', on)
    return () => document.removeEventListener('keydown', on)
  }, [])
  // While playing, the timeline scrolls on so the playhead stays in view.
  useEffect(() => {
    const el = tlScroll.current
    if (!playing || !el) return
    const to = followScroll((frame / FPS) * pxPerSec, el.scrollLeft, el.clientWidth - HEAD_PX)
    if (to !== null) el.scrollLeft = to
  }, [frame, playing, pxPerSec])
  const seek = (f: number) => {
    player.current?.seekTo(f)
    setFrame(f)
  }
  const step = (dir: 'undo' | 'redo') => {
    const cur = current()
    if (!cur || locked) return
    const r = (dir === 'undo' ? undoStep : redoStep)(hist.current, cur)
    if (!r) return
    skipRecord.current = r.project
    update(r.project)
    if (current() !== r.project) {
      skipRecord.current = null
      return
    }
    hist.current = r.history
    setHistTick((n) => n + 1)
    if (r.label) {
      const label = r.label
      if (dir === 'undo') setFirstCut((f) => (f?.label === label ? null : f))
      setAiLog((l) => [t(dir === 'undo' ? 'editor.ai.undone' : 'editor.redone', { label }), ...l].slice(0, 8))
    }
  }
  const undo = () => step('undo')
  const redo = () => step('redo')

  // Open zoomed to fit, so a short video uses the timeline's whole width and its caption bars have room. Once only:
  // after that the zoom is the user's.
  const fitted = useRef(false)
  const openLength = project ? totalLength(project) : 0
  useEffect(() => {
    const el = tlScroll.current
    if (fitted.current || openLength <= 0 || !el || el.clientWidth <= HEAD_PX) return
    fitted.current = true
    setPx(fitZoom(openLength, el.clientWidth - HEAD_PX - 24, MIN_PX, MAX_PX))
  }, [openLength])
  if (loadError) return <ErrorText text={loadError} />
  if (!project || !inputProps) return <p className="muted">{t('editor.loading')}</p>

  const applyAi = (next: EditProject, label: string) => {
    const before = current()
    if (!before || next === before) return
    nextLabel.current = label
    update(next)
    if (current() !== next) {
      nextLabel.current = null
      return
    }
    setAiLog((l) => [label, ...l].slice(0, 8))
  }
  const aiUndo = lastAi(hist.current)
  const undoAi = () => {
    if (aiUndo) undo()
  }
  const preview = (f: number) => {
    seek(f)
    player.current?.play()
  }
  const total = totalLength(project)
  const full = total > MAX_TOTAL - 0.2
  const settings = exportSettings(project)
  const platform = PLATFORMS[settings.preset]
  const pages = projectPages(project, lines, words)
  const pageLines = pages.map((pg) => ({ start: pg.startMs / 1000, end: (pg.startMs + pg.durationMs) / 1000, text: pg.text }))
  const zoneWarnings = safeZoneWarnings(project, pages, settings.preset)
  const fill = async () => setSkipped(await timeline.fill())

  const steps = stepsDone({ project, clientHasLogo: !!kit?.logo, cut })
  const done = tabsDone(
    { project, clientHasLogo: !!kit?.logo, cut, texts: project.texts.length, voices: project.voiceover.length, music: !!musicFile && project.music !== null },
    visited,
  )
  const nameOf = (c: (typeof project.clips)[number]) => clipLabel(c.source, filled, gens, allTakes)
  const nodeOf = (c: (typeof project.clips)[number]) => clipNode(doc, c.source)
  const selClip = project.clips.find((c) => c.id === selected) ?? null
  // Picking a bar on the timeline opens the inspector tab that edits it.
  const select = (sel: Selection) => {
    setSelection(sel)
    if (sel) openTool(LANE_TOOL[sel.lane])
  }
  const pick = (clipId: string) => select({ lane: 'video', id: clipId })
  const lanes = laneBars(project, {
    captionMode: captionMode(project, words),
    pages,
    voiceSeconds: Object.fromEntries(Object.values(voices).map((v) => [v.id, v.duration])),
    voiceLabel: (i) => t('editor.lane.voiceBar', { n: i + 1 }),
    musicLabel: musicFile && project.music ? musicFile.name : null,
  })
  const frames = reelDurationInFrames(project)
  const canDelete = !!selection && removeBar(project, selection.lane, selection.id) !== project
  const split = () => update(splitAt(project, frame / FPS, newClipId(project)))
  const removeSelected = () => {
    if (!selection) return
    update(removeBar(project, selection.lane, selection.id))
    setSelection(null)
  }
  const fit = () => {
    const el = tlScroll.current
    if (el) setPx(fitZoom(total, el.clientWidth - HEAD_PX - 24, MIN_PX, MAX_PX))
  }
  // AI clean-up markers: each take's suggestions, cut down to what each clip shows.
  const clipStartsAt = clipStarts(project)
  const allMarks: Record<string, Mark[]> = Object.fromEntries(project.clips.map((c, i) => [c.id, c.source.kind === 'take' ? clipMarks(c, clipStartsAt[i], tl.items[c.source.id] ?? [], kept) : []]))
  const markCount = Object.values(allMarks).reduce((n, list) => n + list.length, 0)
  const pins = firstCut ? groupPins(firstCut.log.map((e) => ({ at: e.at, kind: e.kind, text: firstCutLine(e, takeName(allTakes, e.takeId, e.name)) }))) : []
  // Remove one marker: the same cut the AI tab makes (keeps from the server, the clip split around them), as one undo step.
  const removeMark = async (clipId: string, mark: Mark): Promise<string | null> => {
    const clip = current()?.clips.find((c) => c.id === clipId)
    if (!planId || !clip || locked) return t('editor.ai.err')
    try {
      const ask = (pad: number) => getKeeps(planId, clip.in, clip.out, [[mark.item.start, mark.item.end]], pad)
      const same = (k: number[][]) => k.length === 1 && Math.abs(k[0][0] - clip.in) < 1e-3 && Math.abs(k[0][1] - clip.out) < 1e-3
      // A short filler can be closed up by the usual air around a cut; then it is cut with one frame of air instead.
      let keeps = await ask(PAD_DEFAULT)
      if (same(keeps)) keeps = await ask(1)
      const base = current()
      const now = base?.clips.find((c) => c.id === clipId)
      if (!base || !now || now.in !== clip.in || now.out !== clip.out) return t('editor.ai.err')
      if (same(keeps)) return t('editor.mark.tooShort')
      const next = replaceWithRanges(base, clipId, keeps, nextClipId)
      if (next === base) return t('editor.mark.cant')
      applyAi(next, t('editor.mark.removed', { label: itemLabel(mark.item), name: nameOf(clip) }))
      return current() === next ? null : t('editor.ai.err')
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }
  // The transcript: each take's words (fetched with its filmstrip), shown per clip through its trim.
  const speech: Record<string, TakeSpeech> = Object.fromEntries(Object.entries(tl.looks).map(([id, look]) => [id, look.speech]))
  const groups = transcriptGroups(project, speech, project.transcriptFixes)
  const takeIdsOnTl = [...new Set(project.clips.flatMap((c) => (c.source.kind === 'take' ? [c.source.id] : [])))]
  const takeNameOf = (id: string) => nameOf(project.clips.find((c) => c.source.id === id) as (typeof project.clips)[number])
  const waitingFor = takeIdsOnTl.filter((id) => { const s = allTakes.find((x) => x.id === id)?.analysis?.status; return !speech[id] && s !== 'done' && s !== 'failed' })
  const failedFor = takeIdsOnTl.filter((id) => allTakes.find((x) => x.id === id)?.analysis?.status === 'failed')
  const trNotice = project.clips.length === 0 ? t('editor.tr.empty')
    : waitingFor.length > 0 ? t('editor.tr.waiting', { names: waitingFor.map(takeNameOf).join(', ') })
    : failedFor.length > 0 ? t('editor.tr.failed', { names: failedFor.map(takeNameOf).join(', ') })
    : groups.some((g) => g.state === 'ok' || g.state === 'pending') ? null
    : groups.some((g) => g.state === 'unavailable') ? t('editor.tr.unavailable') : t('editor.tr.noSpeech')
  // Delete words or pauses: per clip, the same cut the AI clean-up makes (keeps from the server, the clip split around
  // them); a clip whose every word goes is removed. All of it is one undo step.
  const cutWords = async (a: number, b: number): Promise<string | null> => {
    const start = current()
    if (!planId || !start || locked) return t('editor.ai.err')
    const cuts = selectionCuts(groups, a, b)
    const label = selectionLabel(groups, a, b)
    try {
      const plans = await Promise.all(cuts.map(async (cut) => {
        const clip = start.clips.find((c) => c.id === cut.clipId)
        if (!clip) throw new Error(t('editor.tr.changed'))
        if (cut.whole || clip.out - clip.in - (cut.to - cut.from) < 0.2) return { clip, keeps: [] as number[][] }
        const same = (k: number[][]) => k.length === 1 && Math.abs(k[0][0] - clip.in) < 1e-3 && Math.abs(k[0][1] - clip.out) < 1e-3
        let keeps = await getKeeps(planId, clip.in, clip.out, [[cut.from, cut.to]], PAD_DEFAULT)
        if (same(keeps)) keeps = await getKeeps(planId, clip.in, clip.out, [[cut.from, cut.to]], 1)
        return { clip, keeps: same(keeps) ? null : keeps }
      }))
      const base = current()
      if (!base || plans.some((x) => { const now = base.clips.find((c) => c.id === x.clip.id); return !now || now.in !== x.clip.in || now.out !== x.clip.out })) return t('editor.tr.changed')
      let next = base
      for (const x of plans) {
        if (x.keeps === null) continue
        next = x.keeps.length === 0 ? removeClip(next, x.clip.id) : replaceWithRanges(next, x.clip.id, x.keeps, nextClipId)
      }
      if (next === base) return t(plans.every((x) => x.keeps === null) ? 'editor.mark.tooShort' : 'editor.mark.cant')
      nextLabel.current = label.gap !== null ? t('editor.tr.deletedGap', { sec: (Math.round(label.gap * 10) / 10).toFixed(1) }) : t('editor.tr.deleted', { text: label.text })
      update(next)
      if (current() !== next) {
        nextLabel.current = null
        return t('editor.ai.err')
      }
      return null
    } catch (e) {
      return e instanceof Error ? e.message : String(e)
    }
  }
  const fixWord = (key: string, text: string, original: string) => {
    const base = current()
    if (base && !locked) update(setWordFix(base, key, text, original))
  }
  const canUndo = hist.current.past.length > 0
  const canRedo = hist.current.future.length > 0

  return (
    <div className="cv-ed cv-ed-full cv-ed-pro nokey">
      <header className="cv-ed-top">
        <button type="button" className="cv-ed-ib" aria-label={t('editor.back')} title={t('editor.back')} onClick={onBack}>
          <Icon name="back" />
        </button>
        <nav className="cv-ed-crumb" aria-label={t('editor.crumb')}>
          {client?.name && <span className="cv-ed-crumb-dim">{client.name}</span>}
          {client?.name && <span className="cv-ed-crumb-dim" aria-hidden="true">/</span>}
          <b>{t('editor.crumb')}</b>
          {selClip && <span className="cv-ed-crumb-dim">· {nameOf(selClip)}</span>}
        </nav>
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
              <span className="cv-ed-save">{t('editor.save.saving')}</span>
            ) : save === 'saved' ? (
              <span className="cv-ed-save"><Icon name="check" size={12} />{t('editor.save.saved')}</span>
            ) : null}
            {readOnly && <span className="cv-ed-save">{t('editor.readOnly')}</span>}
          </div>
          <button type="button" className="cv-ed-ib" aria-label={t('editor.tp.undo')} title={t('editor.tp.undo')} disabled={locked || !canUndo} onClick={undo}>
            <Icon name="undo" />
          </button>
          <button type="button" className="cv-ed-ib" aria-label={t('editor.tp.redo')} title={t('editor.tp.redo')} disabled={locked || !canRedo} onClick={redo}>
            <Icon name="redo" />
          </button>
          <button type="button" className="cv-ed-export-btn" aria-expanded={exportOpen} aria-controls="cv-ed-export" data-done={steps.export || undefined} onClick={() => setExportOpen((o) => !o)}>
            <Icon name={steps.export ? 'check' : 'export'} />
            {t('editor.exportMenu')}
            {steps.export && <span className="sr-only"> ({t('editor.step.done')})</span>}
            <Icon name="chevronDown" size={12} />
          </button>
        </div>
      </header>
      <div className="cv-ed-main">
        <aside className="cv-ed-left">
          <div className="cv-ed-ptabs" role="tablist" aria-label={t('editor.left.tabs')}>
            <button type="button" role="tab" className="cv-ed-ptab" aria-selected={leftTab === 'shots'} id="cv-ed-ltab-shots" aria-controls="cv-ed-lpanel-shots" onClick={() => setLeftTab('shots')}>{t('editor.shots.title')}</button>
            <button type="button" role="tab" className="cv-ed-ptab" aria-selected={leftTab === 'transcript'} id="cv-ed-ltab-transcript" aria-controls="cv-ed-lpanel-transcript" onClick={() => setLeftTab('transcript')}>{t('editor.tr.title')}</button>
          </div>
          {leftTab === 'shots' ? (
            <div className="cv-ed-left-body" role="tabpanel" id="cv-ed-lpanel-shots" aria-labelledby="cv-ed-ltab-shots">
              <ShotClips uploads={uploads} shots={filled} project={project} sources={shotSources} error={sourceError} gens={gens} takes={allTakes} planId={planId} onTakes={setFreshTakes} full={full} locked={locked} timeline={timeline} selected={selected} onSelect={pick} />
            </div>
          ) : (
            <div className="cv-ed-left-body" role="tabpanel" id="cv-ed-lpanel-transcript" aria-labelledby="cv-ed-ltab-transcript">
              <Transcript
                groups={groups}
                notice={trNotice}
                nameOf={(id) => { const c = project.clips.find((x) => x.id === id); return c ? nameOf(c) : '' }}
                seconds={frame / FPS}
                playing={playing}
                readOnly={locked}
                onSeek={(sec) => seek(Math.min(frames - 1, Math.ceil(sec * FPS - 1e-6)))}
                onDelete={cutWords}
                onFix={fixWord}
              />
            </div>
          )}
        </aside>
        <div className="cv-ed-centre">
          <div className="cv-ed-player" ref={playerBox}>
            <Player
              ref={player}
              component={Reel}
              inputProps={inputProps}
              durationInFrames={frames}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={30}
              controls={false}
              clickToPlay
              loop={loop}
              playbackRate={rate}
              spaceKeyToPlayOrPause={false}
              style={{ height: '100%', aspectRatio: '9 / 16', maxWidth: '100%' }}
            />
            {safe && <SafeZoneOverlay player={player} host={playerBox} platform={platform} />}
          </div>
          {/* over the player, never over the tabs; always mounted, so a running export keeps being followed while closed */}
          <div id="cv-ed-export" className="cv-ed-export-pop" hidden={!exportOpen} onKeyDown={(e) => e.key === 'Escape' && setExportOpen(false)}>
            <ExportOptions
              project={project}
              planId={planId}
              seconds={total}
              warnings={zoneWarnings}
              safe={safe}
              readOnly={locked}
              hasMusic={!!musicFile}
              onSafe={setSafe}
              onProject={update}
              onShow={(sec) => seek(Math.round(sec * 30))}
              flush={flush}
            />
            <ExportBar ideaId={ideaId} clientId={clientId} focus={focus} edit={edit} timeline={timeline} readOnly={locked} brandKey={`${kit?.logo ?? ''}|${kit?.color ?? ''}|${kit?.font ?? ''}`} musicKey={musicKey} linesKey={JSON.stringify(lines)} onCut={setCut} />
          </div>
        </div>
        <div className="cv-ed-side" aria-label={t('editor.inspector')}>
          <ToolTabs tool={tool} onTool={openTool} done={done} />
          <div className="cv-ed-panel" role="tabpanel" id={`cv-ed-panel-${tool}`} aria-labelledby={`cv-ed-tab-${tool}`}>
            {tool === 'clips' && (
              <ClipSettings
                project={project}
                clip={selClip}
                name={selClip ? nameOf(selClip) : ''}
                sourceDuration={selClip ? (byKey[sourceKey(selClip.source)]?.duration ?? clipLength(selClip) + selClip.in) : 0}
                silent={selClip ? byKey[sourceKey(selClip.source)]?.hasAudio === false : false}
                nodeId={selClip ? nodeOf(selClip) : null}
                readOnly={locked}
                onProject={update}
                onJump={onJumpToNode}
              />
            )}
            {tool === 'ai' && (
              <AiTool
                planId={planId}
                project={project}
                clip={selClip}
                shots={filled}
                gens={gens}
                takes={allTakes}
                durations={Object.fromEntries((sources ?? []).map((s) => [s.key, s.duration]))}
                readOnly={locked}
                undo={aiUndo}
                log={aiLog}
                captionLines={pageLines}
                firstCut={firstCut}
                onFirstCut={(log, label) => setFirstCut({ log, label })}
                onSeek={seek}
                onApply={applyAi}
                onUndo={undoAi}
                onPreview={preview}
              />
            )}
            {tool === 'text' && <TextTool project={project} seconds={frame / 30} readOnly={locked} onProject={update} picked={selection?.lane === 'text' ? selection.id : null} onPick={(id) => setSelection({ lane: 'text', id })} />}
            {tool === 'captions' && <CaptionTool project={project} lines={lines} shotIds={filled.flatMap((s) => (s.id ? [s.id] : []))} words={words} readOnly={locked} onProject={update} planId={planId} onAi={applyAi} undo={aiUndo} onUndo={undoAi} selected={selection?.lane === 'captions' ? selection.id : null} />}
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
                selected={selection?.lane === 'voice' ? selection.id : null}
              />
            )}
            {tool === 'music' && <MusicTool ideaId={ideaId} project={project} file={musicFile} onFile={(f) => { setMusicFile(f); setMusicKey((n) => n + 1) }} readOnly={locked} onProject={update} />}
            {tool === 'brand' && <BrandTool client={client} project={project} readOnly={locked} onProject={update} />}
          </div>
        </div>
      </div>
      <Transport
        playing={playing}
        frame={frame}
        frames={frames}
        rate={rate}
        loop={loop}
        muted={pmuted}
        snap={snap}
        safe={safe}
        pxPerSec={pxPerSec}
        canSplit={project.clips.length > 0}
        canDelete={canDelete}
        readOnly={locked}
        onToggle={() => player.current?.toggle()}
        onSeek={seek}
        onRate={setRate}
        onLoop={() => setLoop((v) => !v)}
        onMute={() => (player.current?.isMuted() ? player.current?.unmute() : player.current?.mute())}
        onSnap={() => setSnap((v) => !v)}
        onSafe={() => setSafe((v) => !v)}
        onFullscreen={() => player.current?.requestFullscreen()}
        onFit={fit}
        onZoom={setPx}
        onSplit={split}
        onDelete={removeSelected}
        marks={showMarks}
        markCount={markCount}
        onMarks={() => setShowMarks((v) => !v)}
      />
      <div className="cv-ed-bottom">
        {project.clips.length === 0 && (
          <div className="cv-ed-empty">
            <p>{filled.length ? t('editor.empty') : ff('composeHint')}</p>
            {filled.length > 0 && <button type="button" className="btn btn-primary btn-sm" disabled={locked || filled.length === 0} onClick={() => void fill()}>
              {t('editor.fill')}
            </button>}
          </div>
        )}
        {skipped.length > 0 && (
          <ul className="cv-ed-skipped" role="status">
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
          lanes={lanes}
          sources={byKey}
          frame={frame}
          readOnly={locked}
          timeline={timeline}
          selection={selection}
          onSelect={select}
          nameOf={nameOf}
          nodeOf={nodeOf}
          onJump={onJumpToNode}
          onProject={update}
          onSeek={seek}
          pxPerSec={pxPerSec}
          snap={snap}
          hidden={hidden}
          muted={mutedLanes}
          onHide={(lane) => setHidden((h) => flip(h, lane))}
          onMute={(lane) => setMutedLanes((m) => flip(m, lane))}
          duck={project.music && project.music.duck !== false && duck.length ? duck : null}
          scrollRef={tlScroll}
          looks={tl.looks}
          thumbSrc={(takeId, n, version) => (planId ? thumbUrl(planId, takeId, n, version) : '')}
          marks={showMarks ? allMarks : {}}
          pins={showMarks ? pins : []}
          onKeepMark={(m) => setKept((cur) => new Set(cur).add(m.key))}
          onRemoveMark={removeMark}
          musicPeaks={musicPeaks}
        />
        <p className="cv-ed-hint">{t('editor.keys2')}</p>
      </div>
    </div>
  )
}

const LANE_TOOL: Record<LaneId, Tool> = { video: 'clips', text: 'text', captions: 'captions', voice: 'voice', music: 'music' }
