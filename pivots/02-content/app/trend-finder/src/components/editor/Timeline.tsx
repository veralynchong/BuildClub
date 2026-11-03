import { useRef, useState } from 'react'
import { DndContext, PointerSensor, useDraggable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import type { Shot } from '../../types'
import { t } from '../../lib/i18n'
import { clipName } from './clipName'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { CLIP_MIME, clipLength, clipStarts, dropIndex, FPS, moveClip, newClipId, removeClip, setClipAudio, sourceKey, splitAt, totalLength, trimClip } from '../../lib/editor/timeline'
import type { Clip, ClipSource, EditProject, SourceInfo } from '../../lib/editor/types'

const MIN_PX = 20
const MAX_PX = 120
const DEFAULT_PX = 40

interface Props {
  project: EditProject
  sources: Record<string, SourceInfo>
  shots: Shot[]
  frame: number // playhead
  readOnly: boolean
  timeline: TimelineActions
  onProject: (p: EditProject) => void
  onSeek: (frame: number) => void
}

const fmt = (sec: number) => (Math.round(sec * 10) / 10).toString()

export function Timeline({ project, sources, shots, frame, readOnly, timeline, onProject, onSeek }: Props) {
  const [pxPerSec, setPx] = useState(DEFAULT_PX)
  const [selected, setSelected] = useState<string | null>(null)
  const track = useRef<HTMLDivElement>(null)
  const [dropAt, setDropAt] = useState<number | null>(null) // where a dragged canvas clip would land
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const total = totalLength(project)
  const starts = clipStarts(project)
  const selIndex = project.clips.findIndex((c) => c.id === selected)
  const playhead = frame / FPS

  const onDragEnd = (e: DragEndEvent) => {
    const from = project.clips.findIndex((c) => c.id === e.active.id)
    if (from < 0) return
    const centre = (starts[from] + clipLength(project.clips[from]) / 2) * pxPerSec + e.delta.x
    const to = dropIndex(removeClip(project, project.clips[from].id), centre, pxPerSec)
    onProject(moveClip(project, from, to))
  }

  const split = () => onProject(splitAt(project, playhead, newClipId(project)))
  const remove = () => {
    if (selIndex < 0) return
    onProject(removeClip(project, project.clips[selIndex].id))
    setSelected(null)
  }
  const shift = (dir: -1 | 1) => selIndex >= 0 && onProject(moveClip(project, selIndex, selIndex + dir))

  const onKeyDown = (e: React.KeyboardEvent) => {
    const el = e.target as HTMLElement
    if (readOnly || e.metaKey || e.ctrlKey) return
    if (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) return
    if (!e.altKey && (e.key === 's' || e.key === 'S')) split()
    else if (!e.altKey && (e.key === 'Delete' || e.key === 'Backspace') && selIndex >= 0) remove()
    else if (e.altKey && e.key === 'ArrowLeft') shift(-1)
    else if (e.altKey && e.key === 'ArrowRight') shift(1)
    else return
    e.preventDefault()
    e.stopPropagation()
  }

  const seekFromRuler = (e: React.MouseEvent<HTMLDivElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left
    onSeek(Math.round(Math.min(Math.max(x / pxPerSec, 0), total) * FPS))
  }

  // A video or take dragged in from a canvas node (native drag and drop; the clips themselves use dnd-kit).
  const carries = (e: React.DragEvent) => !readOnly && e.dataTransfer.types.includes(CLIP_MIME)
  const indexAt = (e: React.DragEvent) => dropIndex(project, e.clientX - (track.current?.getBoundingClientRect().left ?? 0), pxPerSec)
  const onDragOver = (e: React.DragEvent) => {
    if (!carries(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropAt(indexAt(e))
  }
  const onDrop = (e: React.DragEvent) => {
    if (!carries(e)) return
    e.preventDefault()
    setDropAt(null)
    let src: ClipSource
    try {
      src = JSON.parse(e.dataTransfer.getData(CLIP_MIME)) as ClipSource
    } catch {
      return
    }
    if (src && (src.kind === 'generation' || src.kind === 'take') && typeof src.id === 'string') void timeline.useForShot(src) // one clip per shot: its place follows the shot order
  }

  const statuses = project.clips.map((c) => ({ clip: c, status: timeline.statusOf(c) }))
  const alerts = statuses.filter((x) => x.status.state !== 'ok')
  const stateOf = new Map(statuses.map((x) => [x.clip.id, x.status.state]))

  const ticks = Array.from({ length: Math.floor(total) + 1 }, (_, i) => i)

  return (
    <section className="cv-ed-timeline" aria-label={t('editor.timeline')}>
      <div className="cv-ed-bar">
        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || project.clips.length === 0} onClick={split}>
          {t('editor.split')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || selIndex < 0} onClick={remove}>
          {t('editor.delete')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || selIndex <= 0} onClick={() => shift(-1)}>
          {t('editor.moveLeft')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || selIndex < 0 || selIndex >= project.clips.length - 1} onClick={() => shift(1)}>
          {t('editor.moveRight')}
        </button>
        <span className="cv-ed-total">{t('editor.total', { sec: fmt(total) })}</span>
        <label className="cv-ed-zoom">
          {t('editor.zoom')}
          <input type="range" min={MIN_PX} max={MAX_PX} value={pxPerSec} onChange={(e) => setPx(Number(e.target.value))} />
        </label>
      </div>
      <div
        className="cv-ed-scroll"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onDragOver={onDragOver}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDropAt(null)}
        onDrop={onDrop}
      >
        <div className="cv-ed-lane" style={{ width: Math.max(total * pxPerSec, 1) + 24 }}>
          <div className="cv-ed-ruler" role="slider" aria-label={t('editor.ruler')} aria-valuemin={0} aria-valuemax={Math.round(total * 10) / 10} aria-valuenow={Math.round(playhead * 10) / 10} onClick={seekFromRuler}>
            {ticks.map((s) => (
              <span key={s} className="cv-ed-tick" style={{ left: s * pxPerSec }} data-major={s % 5 === 0 ? '' : undefined}>
                {s % 5 === 0 ? s : ''}
              </span>
            ))}
          </div>
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="cv-ed-track" ref={track}>
              {dropAt !== null && <div className="cv-ed-dropline" style={{ left: (dropAt < starts.length ? starts[dropAt] : total) * pxPerSec }} aria-hidden="true" />}
              {project.clips.map((c, i) => (
                <ClipBlock
                  key={c.id}
                  clip={c}
                  left={starts[i] * pxPerSec}
                  width={clipLength(c) * pxPerSec}
                  name={clipName(c.source, shots)}
                  selected={c.id === selected}
                  state={stateOf.get(c.id) ?? 'ok'}
                  disabled={readOnly}
                  pxPerSec={pxPerSec}
                  sourceDuration={sources[sourceKey(c.source)]?.duration ?? c.out}
                  project={project}
                  onSelect={() => setSelected(c.id)}
                  onProject={onProject}
                />
              ))}
            </div>
          </DndContext>
          <div className="cv-ed-playhead" style={{ left: playhead * pxPerSec }} aria-hidden="true" />
        </div>
      </div>
      {alerts.length > 0 && (
        <ul className="cv-ed-alerts">
          {alerts.map(({ clip, status }) => (
            <li key={clip.id} className="cv-ed-alert" data-state={status.state}>
              <span className="cv-ed-alert-name">{clipName(clip.source, shots)}</span>
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
      <p className="cv-ed-hint muted">{t('editor.keys')}</p>
      {project.clips.length > 0 && (
        <div className="cv-ed-audio">
          <h3>{t('editor.audio.title')}</h3>
          {project.clips.map((c) => {
            const silent = sources[sourceKey(c.source)]?.hasAudio === false
            const name = clipName(c.source, shots)
            return (
              <div key={c.id} className="cv-ed-audio-row" data-selected={c.id === selected ? '' : undefined}>
                <span className="cv-ed-audio-name">{name}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-pressed={c.muted}
                  disabled={readOnly || silent}
                  onClick={() => onProject(setClipAudio(project, c.id, { muted: !c.muted }))}
                >
                  {c.muted ? t('editor.audio.unmute') : t('editor.audio.mute')}
                </button>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={Math.round(c.volume * 100)}
                  aria-label={t('editor.audio.volume', { name })}
                  disabled={readOnly || silent || c.muted}
                  onChange={(e) => onProject(setClipAudio(project, c.id, { volume: Number(e.target.value) / 100 }))}
                />
                <span className="cv-ed-audio-pct">{silent ? t('editor.audio.silent') : `${Math.round(c.volume * 100)}%`}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

interface BlockProps {
  clip: Clip
  left: number
  width: number
  name: string
  selected: boolean
  state: 'ok' | 'newer' | 'missing'
  disabled: boolean
  pxPerSec: number
  sourceDuration: number
  project: EditProject
  onSelect: () => void
  onProject: (p: EditProject) => void
}

function ClipBlock({ clip, left, width, name, selected, state, disabled, pxPerSec, sourceDuration, project, onSelect, onProject }: BlockProps) {
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
      onProject(trimClip(g.start, clip.id, g.edge, g.value + (e.clientX - g.x) / pxPerSec, sourceDuration))
    },
    onPointerUp: () => {
      grab.current = null
    },
    onPointerCancel: () => {
      grab.current = null
    },
  })

  return (
    <div
      ref={setNodeRef}
      className="cv-ed-clip"
      data-selected={selected ? '' : undefined}
      data-state={state === 'ok' ? undefined : state}
      data-dragging={isDragging ? '' : undefined}
      style={{ left, width, transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined }}
      onPointerDownCapture={onSelect}
      {...attributes}
      {...listeners}
      role="button"
      aria-label={`${name}, ${t('editor.clip.seconds', { sec: fmt(clipLength(clip)) })}`}
      aria-pressed={selected}
    >
      <span className="cv-ed-edge cv-ed-edge-in" role="separator" aria-label={t('editor.clip.trimIn')} {...edge('in')} />
      <span className="cv-ed-clip-name">{name}</span>
      <span className="cv-ed-clip-len">{t('editor.clip.seconds', { sec: fmt(clipLength(clip)) })}</span>
      <span className="cv-ed-edge cv-ed-edge-out" role="separator" aria-label={t('editor.clip.trimOut')} {...edge('out')} />
    </div>
  )
}
