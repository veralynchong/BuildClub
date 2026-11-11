import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { t } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { clipLength, clipStarts, dropIndex, FPS, MIN_CLIP, moveClip, removeClip, sourceKey, totalLength, trimClip } from '../../lib/editor/timeline'
import { LANES, setBarTime, snapMove, snapTargets, snapThreshold, snapTime, tickStep, timecode, type Bar, type LaneId } from '../../lib/editor/lanes'
import type { Clip, EditProject, SourceInfo } from '../../lib/editor/types'
import { Icon } from './icons'
import { filmTiles, peaksSpan, waveformPath, type Mark, type Peaks, type Pin } from '../../lib/editor/marks'
import type { TakeLook } from '../../lib/editor/useTimelineMedia'
import { itemLabel, reasonOf, stamp } from '../../lib/editor/aiEdit'

export const HEAD_PX = 168 // the track headers column
const PAD_PX = 16 // room after the last bar

const LANE_NAME: Record<LaneId, Key> = { text: 'editor.lane.text', captions: 'editor.lane.captions', video: 'editor.lane.video', voice: 'editor.lane.voice', music: 'editor.lane.music' }
const LANE_ICON = { text: 'text', captions: 'captions', video: 'film', voice: 'mic', music: 'music' } as const
// Which lanes can be hidden in the preview (they draw something) and which muted (they make sound).
const CAN_HIDE: Record<LaneId, boolean> = { text: true, captions: true, video: true, voice: false, music: false }
const CAN_MUTE: Record<LaneId, boolean> = { text: false, captions: false, video: true, voice: true, music: true }

export type Selection = { lane: LaneId; id: string } | null

interface Props {
  project: EditProject
  lanes: Record<LaneId, Bar[]>
  sources: Record<string, SourceInfo>
  frame: number // playhead
  readOnly: boolean
  timeline: TimelineActions
  selection: Selection
  onSelect: (sel: Selection) => void
  nameOf: (clip: Clip) => string // "Shot 1 · v3"
  nodeOf: (clip: Clip) => string | null // the clip's node on the canvas, null when it is gone
  onJump: (nodeId: string) => void // back to the canvas, on that node
  onProject: (p: EditProject) => void
  onSeek: (frame: number) => void
  pxPerSec: number
  snap: boolean
  hidden: ReadonlySet<LaneId>
  muted: ReadonlySet<LaneId>
  onHide: (lane: LaneId) => void
  onMute: (lane: LaneId) => void
  duck: [number, number][] | null // music ducking ranges, when the music goes down under speech
  scrollRef: RefObject<HTMLDivElement | null>
  looks: Record<string, TakeLook> // per take: filmstrip and waveform data
  thumbSrc: (takeId: string, n: number, version: string) => string
  marks: Record<string, Mark[]> // per clip: the AI clean-up suggestions showing on it (none while markers are hidden)
  pins: Pin[] // why the last first cut did what it did
  onKeepMark: (mark: Mark) => void
  onRemoveMark: (clipId: string, mark: Mark) => Promise<string | null> // an error to show, or null once removed
  musicPeaks: Peaks | null
}

const WAVE_PX = 2 // one waveform column per this many pixels
const MAX_COLS = 2000
const FILM_ROW_PX = 26 // the filmstrip row's height
const columnsFor = (widthPx: number) => Math.min(MAX_COLS, Math.max(1, Math.round(widthPx / WAVE_PX)))

// The multi-track timeline: a time code and ruler on top, then one lane per kind of thing (text, captions, video,
// voiceover, music) with its header on the left. Bars are selected by a click; texts and speech captions are dragged and
// trimmed, clips are reordered and trimmed. Drags snap to edges and the playhead while snapping is on.
export function Timeline(props: Props) {
  const { project, lanes, sources, frame, readOnly, timeline, selection, onSelect, nameOf, nodeOf, onJump, onProject, onSeek, pxPerSec, snap, hidden, muted, onHide, onMute, duck, scrollRef, looks, thumbSrc, marks, pins, onKeepMark, onRemoveMark, musicPeaks } = props
  const [menu, setMenu] = useState<{ clipId: string; x: number; y: number } | null>(null) // a clip's right-click menu
  const [pop, setPop] = useState<{ clipId: string; mark: Mark; x: number; y: number } | null>(null) // an AI marker's popover
  const [popBusy, setPopBusy] = useState(false)
  const [popErr, setPopErr] = useState('')
  const [tip, setTip] = useState<{ pin: Pin; x: number; y: number } | null>(null) // a first-cut pin's tooltip
  const box = useRef<HTMLElement>(null)
  // The menu and the marker popover close on Escape and on a press outside them.
  useEffect(() => {
    if (!menu && !pop) return
    const close = () => {
      setMenu(null)
      setPop(null)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => !(e.target as Element | null)?.closest('.cv-ed-menu, .cv-ed-markpop, .cv-ed-mark') && close()
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown)
    }
  }, [menu, pop])
  const at = (e: { clientX: number; clientY: number }) => {
    const r = box.current?.getBoundingClientRect()
    return { x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) }
  }
  const openMark = (clipId: string, mark: Mark, e: React.MouseEvent) => {
    setMenu(null)
    setPopErr('')
    setPop({ clipId, mark, ...at(e) })
  }
  // A marker the popover shows may be gone (its clip was cut or undone); the popover goes with it.
  const popLive = pop && (marks[pop.clipId] ?? []).some((m) => m.key === pop.mark.key) ? pop : null
  const removeMark = async () => {
    if (!popLive || popBusy) return
    setPopBusy(true)
    setPopErr('')
    const err = await onRemoveMark(popLive.clipId, popLive.mark)
    setPopBusy(false)
    if (err) setPopErr(err)
    else setPop(null)
  }
  const openMenu = (clipId: string, e: React.MouseEvent) => {
    e.preventDefault()
    onSelect({ lane: 'video', id: clipId })
    const r = box.current?.getBoundingClientRect()
    setMenu({ clipId, x: e.clientX - (r?.left ?? 0), y: e.clientY - (r?.top ?? 0) })
  }
  const menuClip = menu ? project.clips.find((c) => c.id === menu.clipId) : undefined
  const menuNode = menuClip ? nodeOf(menuClip) : null
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const total = totalLength(project)
  const starts = clipStarts(project)
  const musicVol = project.music ? project.music.volume : null
  const musicWave = useMemo(() => {
    if (!musicPeaks || musicVol === null || total <= 0) return null
    const cols = peaksSpan(musicPeaks, 0, total, columnsFor(total * pxPerSec))
    return { d: waveformPath(cols, Math.min(2, musicVol * 1.6)), cols: cols.length }
  }, [musicPeaks, musicVol, total, pxPerSec])
  const playhead = frame / FPS
  const width = Math.max(total * pxPerSec, 1) + PAD_PX
  const targetsFor = (skip: string | null) => (snap ? snapTargets(lanes, playhead, total, skip) : [])
  const threshold = snapThreshold(pxPerSec)

  const onDragEnd = (e: DragEndEvent) => {
    const from = project.clips.findIndex((c) => c.id === e.active.id)
    if (from < 0) return
    const centre = (starts[from] + clipLength(project.clips[from]) / 2) * pxPerSec + e.delta.x
    const to = dropIndex(removeClip(project, project.clips[from].id), centre, pxPerSec)
    onProject(moveClip(project, from, to))
  }

  // Scrubbing: a press on the ruler (or the playhead's handle) moves the playhead and keeps following the pointer.
  const scrub = useRef(false)
  const seekAt = (clientX: number, el: HTMLElement) => {
    const x = clientX - el.getBoundingClientRect().left
    const last = Math.max(0, Math.round(total * FPS) - 1)
    onSeek(Math.min(Math.max(Math.round((x / pxPerSec) * FPS), 0), last))
  }
  const rulerEl = useRef<HTMLDivElement>(null)
  const scrubHandlers = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || !rulerEl.current) return
      scrub.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
      seekAt(e.clientX, rulerEl.current)
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (scrub.current && rulerEl.current) seekAt(e.clientX, rulerEl.current)
    },
    onPointerUp: () => {
      scrub.current = false
    },
    onPointerCancel: () => {
      scrub.current = false
    },
  }

  const statuses = project.clips.map((c) => ({ clip: c, status: timeline.statusOf(c) }))
  const alerts = statuses.filter((x) => x.status.state !== 'ok')
  const stateOf = new Map(statuses.map((x) => [x.clip.id, x.status.state]))

  const { major, minor } = tickStep(pxPerSec)
  const ticks: { s: number; major: boolean }[] = []
  for (let i = 0; i * minor <= total + 1e-9 || ticks.length === 0; i++) {
    const s = Math.round(i * minor * 1000) / 1000
    ticks.push({ s, major: Math.abs(s / major - Math.round(s / major)) < 1e-6 })
    if (i > 5000) break
  }
  const captionLocked = lanes.captions.length > 0 && !lanes.captions[0].movable

  return (
    <section className="cv-ed-timeline" aria-label={t('editor.timeline')} ref={box}>
      {alerts.length > 0 && (
        <ul className="cv-ed-alerts">
          {alerts.map(({ clip, status }) => (
            <li key={clip.id} className="cv-ed-alert" data-state={status.state}>
              <Icon name="alert" />
              <span className="cv-ed-alert-name">{nameOf(clip)}</span>
              {status.state === 'newer' ? (
                <>
                  <span className="cv-ed-alert-text">{t('editor.newer')}</span>
                  <button type="button" className="btn btn-primary btn-sm" disabled={readOnly} onClick={() => void timeline.applyNewer(clip.id, status.source)}>
                    {t('editor.newer.apply')}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => timeline.ignore(clip, status.source)}>
                    {t('editor.newer.ignore')}
                  </button>
                </>
              ) : (
                <>
                  <span className="cv-ed-alert-text" role="alert">{t('editor.missing')}</span>
                  <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly} onClick={() => onProject(removeClip(project, clip.id))}>
                    {t('editor.missing.remove')}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="cv-ed-tl-scroll" ref={scrollRef}>
        <div className="cv-ed-tl-inner" style={{ width: HEAD_PX + width }}>
          <div className="cv-ed-tl-row cv-ed-tl-rulerrow">
            <div className="cv-ed-tl-corner">
              <span className="cv-ed-tc">{timecode(frame)}</span>
              <span className="cv-ed-tc-frame">{frame}</span>
            </div>
            <div
              ref={rulerEl}
              className="cv-ed-ruler"
              role="slider"
              tabIndex={-1}
              aria-label={t('editor.ruler')}
              aria-valuemin={0}
              aria-valuemax={Math.round(total * 10) / 10}
              aria-valuenow={Math.round(playhead * 10) / 10}
              style={{ width }}
              {...scrubHandlers}
            >
              {ticks.map(({ s, major: big }) => (
                <span key={s} className="cv-ed-tick" style={{ left: s * pxPerSec }} data-major={big ? '' : undefined}>
                  {big ? <span className="cv-ed-tick-label">{timecode(s * FPS)}</span> : null}
                </span>
              ))}
              {pins.map((pin) => (
                <button
                  key={pin.at}
                  type="button"
                  className="cv-ed-pin"
                  data-cut={pin.cut ? '' : undefined}
                  style={{ left: pin.at * pxPerSec }}
                  aria-label={`${t('editor.pin.title')}: ${pin.lines.join(' ')}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerEnter={(e) => setTip({ pin, ...at(e) })}
                  onPointerLeave={() => setTip(null)}
                  onFocus={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ pin, ...at({ clientX: r.left, clientY: r.bottom }) }) }}
                  onBlur={() => setTip(null)}
                  onClick={() => onSeek(Math.round(pin.at * FPS))}
                />
              ))}
            </div>
          </div>
          {LANES.map((lane) => {
            const name = t(LANE_NAME[lane])
            const off = hidden.has(lane) || muted.has(lane)
            return (
              <div key={lane} className="cv-ed-tl-row" data-lane={lane} data-off={off ? '' : undefined}>
                <div className="cv-ed-lanehead">
                  {CAN_HIDE[lane] ? (
                    <button type="button" className="cv-ed-ib cv-ed-ib-sm" aria-pressed={hidden.has(lane)} aria-label={t(hidden.has(lane) ? 'editor.lane.show' : 'editor.lane.hide', { name })} title={`${t(hidden.has(lane) ? 'editor.lane.show' : 'editor.lane.hide', { name })}. ${t('editor.lane.viewOnly')}`} onClick={() => onHide(lane)}>
                      <Icon name={hidden.has(lane) ? 'eyeOff' : 'eye'} />
                    </button>
                  ) : <span className="cv-ed-ib-sm" aria-hidden="true" />}
                  {CAN_MUTE[lane] ? (
                    <button type="button" className="cv-ed-ib cv-ed-ib-sm" aria-pressed={muted.has(lane)} aria-label={t(muted.has(lane) ? 'editor.lane.unmute' : 'editor.lane.mute', { name })} title={`${t(muted.has(lane) ? 'editor.lane.unmute' : 'editor.lane.mute', { name })}. ${t('editor.lane.viewOnly')}`} onClick={() => onMute(lane)}>
                      <Icon name={muted.has(lane) ? 'volumeOff' : 'volume'} />
                    </button>
                  ) : <span className="cv-ed-ib-sm" aria-hidden="true" />}
                  <Icon name={LANE_ICON[lane]} className="cv-ed-lane-icon" />
                  <span className="cv-ed-lane-name">{name}</span>
                </div>
                <div className="cv-ed-lanebody" style={{ width }} onPointerDown={(e) => e.target === e.currentTarget && onSelect(null)}>
                  {lane === 'video' ? (
                    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
                      {project.clips.map((c, i) => (
                        <ClipBar
                          key={c.id}
                          clip={c}
                          left={starts[i] * pxPerSec}
                          width={clipLength(c) * pxPerSec}
                          start={starts[i]}
                          name={nameOf(c)}
                          selected={selection?.lane === 'video' && selection.id === c.id}
                          state={stateOf.get(c.id) ?? 'ok'}
                          disabled={readOnly}
                          pxPerSec={pxPerSec}
                          sourceDuration={sources[sourceKey(c.source)]?.duration ?? c.out}
                          project={project}
                          look={c.source.kind === 'take' ? looks[c.source.id] : undefined}
                          thumbSrc={thumbSrc}
                          marks={marks[c.id] ?? []}
                          openMark={pop?.clipId === c.id ? pop.mark.key : null}
                          onMark={(m, e) => openMark(c.id, m, e)}
                          snapTo={(sec) => snapTime(sec, targetsFor(c.id), threshold)}
                          onSelect={() => onSelect({ lane: 'video', id: c.id })}
                          onMenu={(e) => openMenu(c.id, e)}
                          onProject={onProject}
                        />
                      ))}
                    </DndContext>
                  ) : (
                    lanes[lane].map((b) => (
                      <LaneBar
                        key={b.id}
                        lane={lane}
                        bar={b}
                        pxPerSec={pxPerSec}
                        selected={selection?.lane === lane && selection.id === b.id}
                        disabled={readOnly}
                        project={project}
                        title={lane === 'captions' && captionLocked ? `${b.label}\n${t('editor.lane.capLocked')}` : undefined}
                        targets={() => targetsFor(b.id)}
                        threshold={threshold}
                        duck={lane === 'music' ? duck : null}
                        wave={lane === 'music' ? musicWave : null}
                        onSelect={() => onSelect({ lane, id: b.id })}
                        onProject={onProject}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
          <div className="cv-ed-playhead" style={{ left: HEAD_PX + playhead * pxPerSec }}>
            <span className="cv-ed-playhead-handle" role="presentation" title={t('editor.playhead')} {...scrubHandlers} />
          </div>
        </div>
      </div>
      {popLive && (
        <div className="cv-ed-markpop" role="dialog" aria-label={itemLabel(popLive.mark.item)} data-type={popLive.mark.item.type} style={{ left: popLive.x, top: popLive.y }}>
          <b className="cv-ed-markpop-title">{itemLabel(popLive.mark.item)}</b>
          <p className="cv-ed-markpop-why">{reasonOf(popLive.mark.item)}</p>
          <p className="cv-ed-markpop-at">{t('editor.mark.at', { from: stamp(popLive.mark.item.start), to: stamp(popLive.mark.item.end) })}</p>
          {popErr && <p className="cv-ed-markpop-err" role="alert">{popErr}</p>}
          <div className="cv-ed-markpop-row">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { onKeepMark(popLive.mark); setPop(null) }}>{t('editor.mark.keep')}</button>
            <button type="button" className="btn btn-primary btn-sm" autoFocus disabled={readOnly || popBusy} onClick={() => void removeMark()}>{t('editor.mark.remove')}</button>
          </div>
        </div>
      )}
      {tip && (
        <div className="cv-ed-pintip" role="tooltip" style={{ left: tip.x, top: tip.y + 14 }}>
          <b>{t('editor.pin.title')}</b>
          {tip.pin.lines.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
      {menu && menuClip && (
        <div className="cv-ed-menu" role="menu" aria-label={t('editor.clip.menu')} style={{ left: menu.x, top: menu.y }}>
          <button
            type="button"
            role="menuitem"
            autoFocus
            disabled={!menuNode}
            title={menuNode ? undefined : t('editor.clipSet.noNode')}
            onClick={() => {
              setMenu(null)
              if (menuNode) onJump(menuNode)
            }}
          >
            {t('editor.clipSet.show')}
          </button>
        </div>
      )}
    </section>
  )
}

const fmt = (sec: number) => (Math.round(sec * 10) / 10).toString()

interface ClipProps {
  clip: Clip
  left: number
  width: number
  start: number // where it starts on the timeline (seconds)
  name: string
  selected: boolean
  state: 'ok' | 'newer' | 'missing'
  disabled: boolean
  pxPerSec: number
  sourceDuration: number
  project: EditProject
  snapTo: (sec: number) => number // a timeline time, snapped when snapping is on
  onSelect: () => void
  onMenu: (e: React.MouseEvent) => void // right-click: "Show on canvas"
  onProject: (p: EditProject) => void
  look: TakeLook | undefined // the take's filmstrip and waveform, once fetched
  thumbSrc: (takeId: string, n: number, version: string) => string
  marks: Mark[]
  openMark: string | null // the key of the marker whose popover is open
  onMark: (mark: Mark, e: React.MouseEvent) => void
}

// A clip on the video lane: drag to reorder, drag an edge to trim. Under its name a filmstrip and a waveform of the part of
// the take it shows; AI clean-up suggestions lie over it as hatched marks that open a Keep / Remove popover.
function ClipBar({ clip, left, width, start, name, selected, state, disabled, pxPerSec, sourceDuration, project, snapTo, onSelect, onMenu, onProject, look, thumbSrc, marks, openMark, onMark }: ClipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: clip.id, disabled })
  // Trimming works from the project as it was when the edge was grabbed, so the drag is one smooth gesture.
  const grab = useRef<{ edge: 'in' | 'out'; x: number; start: EditProject; value: number } | null>(null)

  const edge = (which: 'in' | 'out') => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (disabled) return
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      onSelect()
      grab.current = { edge: which, x: e.clientX, start: project, value: which === 'in' ? clip.in : clip.out }
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = grab.current
      if (!g) return
      let value = g.value + (e.clientX - g.x) / pxPerSec
      // The end edge snaps on the timeline: its timeline time is the clip's start plus its new length.
      if (g.edge === 'out') value = clip.in + snapTo(start + (value - clip.in)) - start
      onProject(trimClip(g.start, clip.id, g.edge, value, sourceDuration))
    },
    onPointerUp: () => {
      grab.current = null
    },
    onPointerCancel: () => {
      grab.current = null
    },
  })

  // Drawn from the take's analysis; recomputed only when the trim, the zoom or the volume changes, not on every frame.
  const peaks = look?.peaks ?? null
  const cols = useMemo(() => (peaks ? peaksSpan(peaks, clip.in, clip.out, columnsFor(width)) : null), [peaks, clip.in, clip.out, width])
  const wave = useMemo(() => (cols ? waveformPath(cols, clip.muted ? 0 : clip.volume) : ''), [cols, clip.muted, clip.volume])
  const film = look?.filmstrip ?? null
  const aspect = look?.width && look.height ? look.width / look.height : 9 / 16
  const tiles = useMemo(() => (film ? filmTiles(film.times, clip.in, clip.out, width, Math.max(18, FILM_ROW_PX * aspect)) : []), [film, clip.in, clip.out, width, aspect])
  const takeId = clip.source.id

  return (
    <div
      ref={setNodeRef}
      className="cv-ed-bar cv-ed-clip"
      data-selected={selected ? '' : undefined}
      data-state={state === 'ok' ? undefined : state}
      data-dragging={isDragging ? '' : undefined}
      style={{ left, width, transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined }}
      onPointerDownCapture={(e) => { if (!(e.target as Element).closest('.cv-ed-mark')) onSelect() }}
      onContextMenu={onMenu}
      data-media={look ? '' : undefined}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`${name}, ${t('editor.clip.seconds', { sec: fmt(clipLength(clip)) })}`}
      aria-pressed={selected}
    >
      <span className="cv-ed-edge cv-ed-edge-in" role="separator" aria-label={t('editor.clip.trimIn')} {...edge('in')} />
      <span className="cv-ed-bar-label">
        <Icon name="film" size={12} />
        <span className="cv-ed-clip-name">{name}</span>
        <span className="cv-ed-clip-len">{t('editor.clip.seconds', { sec: fmt(clipLength(clip)) })}</span>
        {clip.muted && <Icon name="volumeOff" size={12} />}
      </span>
      <span className="cv-ed-bar-media" aria-hidden="true">
        {tiles.length > 0 && look && (
          <span className="cv-ed-film">
            {tiles.map((x) => <img key={x.left} src={thumbSrc(takeId, x.n, look.version)} alt="" draggable={false} style={{ left: x.left, width: x.width }} />)}
          </span>
        )}
        {wave && (
          <svg className="cv-ed-wave" viewBox={`0 0 ${cols?.length ?? 1} 100`} preserveAspectRatio="none" data-muted={clip.muted ? '' : undefined}>
            <path d={wave} />
          </svg>
        )}
      </span>
      {marks.map((m) => (
        <button
          key={m.key}
          type="button"
          className="cv-ed-mark"
          data-type={m.item.type}
          data-open={openMark === m.key ? '' : undefined}
          style={{ left: (m.from - start) * pxPerSec, width: Math.max((m.to - m.from) * pxPerSec, 3) }}
          aria-label={`${t('editor.mark.open')}: ${itemLabel(m.item)}`}
          title={itemLabel(m.item)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onMark(m, e) }}
        />
      ))}
      <span className="cv-ed-edge cv-ed-edge-out" role="separator" aria-label={t('editor.clip.trimOut')} {...edge('out')} />
    </div>
  )
}

interface BarProps {
  lane: LaneId
  bar: Bar
  pxPerSec: number
  selected: boolean
  disabled: boolean
  project: EditProject
  title?: string
  targets: () => number[]
  threshold: number
  duck: [number, number][] | null
  wave: { d: string; cols: number } | null // the music's waveform, spread over the bar
  onSelect: () => void
  onProject: (p: EditProject) => void
}

const MOVE_PX = 3 // a press that moves less than this is a click

// A bar on the text, captions, voiceover or music lane. Movable bars follow the pointer; trimmable ones have edges.
function LaneBar({ lane, bar, pxPerSec, selected, disabled, project, title, targets, threshold, duck, wave, onSelect, onProject }: BarProps) {
  // The drag works from the bar and project as they were when it was grabbed, so the gesture never adds up on itself.
  const grab = useRef<{ mode: 'move' | 'in' | 'out'; x: number; start: EditProject; from: number; to: number; moved: boolean; targets: number[] } | null>(null)
  const begin = (mode: 'move' | 'in' | 'out') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    onSelect()
    if (disabled || (mode === 'move' ? !bar.movable : !bar.trimmable)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    grab.current = { mode, x: e.clientX, start: project, from: bar.start, to: bar.end, moved: false, targets: targets() }
  }
  const move = (e: React.PointerEvent) => {
    const g = grab.current
    if (!g) return
    const dx = e.clientX - g.x
    if (!g.moved && Math.abs(dx) < MOVE_PX) return
    g.moved = true
    const d = dx / pxPerSec
    const len = g.to - g.from
    if (g.mode === 'move') {
      const s = snapMove(Math.max(0, g.from + d), len, g.targets, threshold)
      onProject(setBarTime(g.start, lane, bar.id, s, s + len))
    } else if (g.mode === 'in') {
      const s = Math.min(snapTime(Math.max(0, g.from + d), g.targets, threshold), g.to - MIN_CLIP)
      onProject(setBarTime(g.start, lane, bar.id, s, g.to))
    } else {
      const e2 = Math.max(snapTime(g.to + d, g.targets, threshold), g.from + MIN_CLIP)
      onProject(setBarTime(g.start, lane, bar.id, g.from, e2))
    }
  }
  const end = () => {
    grab.current = null
  }
  const width = Math.max((bar.end - bar.start) * pxPerSec, 2)
  return (
    <div
      className="cv-ed-bar"
      data-lane={lane}
      data-selected={selected ? '' : undefined}
      data-fixed={bar.movable ? undefined : ''}
      style={{ left: bar.start * pxPerSec, width }}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={bar.label}
      title={title ?? bar.label}
      onPointerDown={begin('move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onKeyDown={(e) => (e.key === 'Enter' ? onSelect() : undefined)}
    >
      {bar.trimmable && !disabled && <span className="cv-ed-edge cv-ed-edge-in" role="separator" aria-label={t('editor.clip.trimIn')} onPointerDown={begin('in')} />}
      {wave && (
        <svg className="cv-ed-wave cv-ed-wave-music" viewBox={`0 0 ${wave.cols} 100`} preserveAspectRatio="none" aria-hidden="true">
          <path d={wave.d} />
        </svg>
      )}
      {duck?.map(([a, b], i) => (
        <span key={i} className="cv-ed-duck" style={{ left: (a - bar.start) * pxPerSec, width: Math.max((b - a) * pxPerSec, 1) }} aria-hidden="true" />
      ))}
      <span className="cv-ed-bar-label">
        <span className="cv-ed-bar-text">{bar.label}</span>
        {lane === 'music' && duck && duck.length > 0 && <span className="cv-ed-bar-note">· {t('editor.lane.duck')}</span>}
      </span>
      {bar.trimmable && !disabled && <span className="cv-ed-edge cv-ed-edge-out" role="separator" aria-label={t('editor.clip.trimOut')} onPointerDown={begin('out')} />}
    </div>
  )
}
