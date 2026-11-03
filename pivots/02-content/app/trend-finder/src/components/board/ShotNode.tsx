import { useState, type FormEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { Shot } from '../../types'
import { t } from '../../lib/i18n'
import { purposeFor, purposeLabel } from '../../lib/storyboard'
import { cameraLabels } from '../../lib/shots'
import { CameraSelects } from '../CameraSelects'
import { footageSrc } from '../../lib/boardMedia'
import { useBoardActions, type ShotFlowNode } from './boardContext'

// The picture on a card: the team's own file first, else the storyboard frame.
function Preview({ shot, n }: { shot: Shot; n: number | null }) {
  const f = shot.footage
  if (f) {
    const src = footageSrc(f)
    if (!src) return <p className="board-node-gone">{t('board.upload.gone')}</p>
    return f.kind === 'video' ? (
      <video className="board-node-media" src={src} muted playsInline preload="metadata" aria-label={f.name} />
    ) : (
      <img className="board-node-media" src={src} alt={f.name} />
    )
  }
  if (shot.frameImage) {
    return <img className="board-node-media" src={shot.frameImage} alt={t('board.node.frameAlt', { n: n ?? 0 })} />
  }
  return null
}

function EditForm({ shot, n, onDone }: { shot: Shot; n: number; onDone: (patch: Partial<Shot> | null) => void }) {
  const [time, setTime] = useState(shot.time)
  const [what, setWhat] = useState(shot.shot)
  const [line, setLine] = useState(shot.line ?? '')
  const [text, setText] = useState(shot.text ?? '')
  // Framing, angle, movement and the filming tip are picked here on the board, not on the plan page.
  const [camera, setCamera] = useState<Pick<Shot, 'framing' | 'angle' | 'movement' | 'tip'>>({
    framing: shot.framing,
    angle: shot.angle,
    movement: shot.movement,
    tip: shot.tip,
  })
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const patch: Partial<Shot> = { time: time.trim(), shot: what.trim(), text: text.trim() || undefined, ...camera }
    // Typing a line is the user's own choice, so a script rewrite asks before replacing it (lib/storyboard.ts).
    if (line.trim() !== (shot.line ?? '')) Object.assign(patch, { line: line.trim() || undefined, edited: true })
    onDone(patch)
  }
  const id = (f: string) => `board-${f}-${n}`
  return (
    <form
      className="board-node-form nodrag nowheel"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(null)
      }}
    >
      <label htmlFor={id('time')}>{t('board.field.time')}</label>
      <input id={id('time')} value={time} onChange={(e) => setTime(e.target.value)} placeholder="0-3s" />
      <label htmlFor={id('shot')}>{t('board.field.shot')}</label>
      <textarea id={id('shot')} rows={2} value={what} onChange={(e) => setWhat(e.target.value)} autoFocus />
      <label htmlFor={id('line')}>{t('board.field.line')}</label>
      <textarea id={id('line')} rows={2} value={line} onChange={(e) => setLine(e.target.value)} />
      <label htmlFor={id('text')}>{t('board.field.text')}</label>
      <input id={id('text')} value={text} onChange={(e) => setText(e.target.value)} />
      <CameraSelects shot={{ ...shot, ...camera }} n={n} onChange={(patch) => setCamera((c) => ({ ...c, ...patch }))} />
      <div className="board-node-actions">
        <button type="submit" className="btn btn-primary btn-sm">
          {t('board.node.save')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onDone(null)}>
          {t('board.node.cancel')}
        </button>
      </div>
    </form>
  )
}

// One shot on the board. Shows its number, what it is for, the time, what we film, the line or text,
// the camera words, and the frame or the team's own file.
export function ShotNode({ data, selected }: NodeProps<ShotFlowNode>) {
  const { node, index, total } = data
  const { editable, saveShot, remove, move, place } = useBoardActions()
  const [editing, setEditing] = useState(false)
  const [where, setWhere] = useState<number | null>(null)
  const shot = node.shot
  const loose = index === null
  const n = loose ? null : index + 1
  const purpose = loose ? null : (shot.purpose ?? purposeFor(index, total))
  const camera = cameraLabels(shot)
  const after = where ?? total - 1

  return (
    <article
      className={`board-node${loose ? ' is-loose' : ''}${selected ? ' is-selected' : ''}`}
      aria-label={n ? t('board.node.label', { n }) : t('board.loose.title')}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} className="board-handle" />
      <header className="board-node-head">
        {n ? <span className="sb-no">{n}</span> : <span className="board-loose-tag">{t('board.loose.title')}</span>}
        {purpose && <span className={`sb-purpose is-${purpose}`}>{purposeLabel(purpose)}</span>}
        {!loose && <span className="sb-time">{shot.time || t('board.node.noTime')}</span>}
      </header>

      <Preview shot={shot} n={n} />
      {shot.footage && (
        <p className="board-node-footage">
          <span className="board-footage-badge">{t('board.upload.badge')}</span>
          {shot.footage.deviceOnly && <span className="small muted">{t('board.upload.deviceOnly')}</span>}
        </p>
      )}

      {editing && n ? (
        <EditForm
          shot={shot}
          n={n}
          onDone={(patch) => {
            setEditing(false)
            if (patch) saveShot(node.id, patch)
          }}
        />
      ) : (
        <div className="board-node-body">
          <p className="board-node-shot">{shot.shot}</p>
          {shot.line && <p className="board-node-line">{t('board.node.says', { text: shot.line })}</p>}
          {shot.text && <p className="board-node-line">{t('board.node.onScreen', { text: shot.text })}</p>}
          {camera.length > 0 && (
            <ul className="board-node-camera" aria-label={n ? t('shots.cam.group', { n }) : undefined}>
              {camera.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {editable && !editing && n && (
        <div className="board-node-actions nodrag">
          <button type="button" className="btn btn-ghost btn-sm" aria-label={t('board.node.editAria', { n })} onClick={() => setEditing(true)}>
            {t('board.node.edit')}
          </button>
          <button
            type="button"
            className="icon-btn board-icon"
            aria-label={t('board.node.earlier', { n })}
            title={t('board.node.earlier', { n })}
            disabled={n === 1}
            onClick={() => move(node.id, -1)}
          >
            ←
          </button>
          <button
            type="button"
            className="icon-btn board-icon"
            aria-label={t('board.node.later', { n })}
            title={t('board.node.later', { n })}
            disabled={n === total}
            onClick={() => move(node.id, 1)}
          >
            →
          </button>
          <button type="button" className="link-btn" aria-label={t('board.node.deleteAria', { n })} onClick={() => remove(node.id)}>
            {t('board.node.delete')}
          </button>
        </div>
      )}

      {editable && loose && (
        <div className="board-node-place nodrag">
          <label htmlFor={`board-where-${node.id}`}>{t('board.loose.where')}</label>
          <select id={`board-where-${node.id}`} value={after} onChange={(e) => setWhere(Number(e.target.value))}>
            <option value={-1}>{t('board.loose.start')}</option>
            {Array.from({ length: total }, (_, i) => (
              <option key={i} value={i}>
                {t('board.loose.after', { n: i + 1 })}
              </option>
            ))}
          </select>
          <div className="board-node-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => place(node.id, after)}>
              {t('board.loose.place')}
            </button>
            <button type="button" className="link-btn" onClick={() => remove(node.id)}>
              {t('board.loose.remove')}
            </button>
          </div>
        </div>
      )}
      <Handle type="source" position={Position.Right} isConnectable={false} className="board-handle" />
    </article>
  )
}
