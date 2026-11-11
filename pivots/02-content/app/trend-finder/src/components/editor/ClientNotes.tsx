import { useCallback, useEffect, useState } from 'react'
import { t } from '../../lib/i18n'
import { formatAt } from '../../lib/comments'
import { getClientNotes, makeNoteTasks, setTaskDone, type AnswerSource, type ClientNotes as Notes, type NoteTask } from '../../lib/editor/aiApi'
import { ErrorText } from '../ErrorText'

interface Props {
  planId: string
  readOnly: boolean
  onSeek: (frame: number) => void // move the player there
}

const FPS = 30

// What the client wrote on the plan's latest shared cut, with the time each note points at (click to look), and the edit
// tasks made from them. Task state is saved on the server, so it is the same on the next visit.
export function ClientNotes({ planId, readOnly, onSeek }: Props) {
  const [data, setData] = useState<Notes | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [source, setSource] = useState<AnswerSource | null>(null)

  const load = useCallback(() => {
    getClientNotes(planId).then((v) => { setData(v); setErr('') }, () => setErr(t('editor.notes.failed')))
  }, [planId])
  useEffect(load, [load])

  const tasks = data?.tasks ?? []
  const byId = new Map(tasks.map((x) => [x.commentId, x]))
  const fresh = (data?.notes ?? []).filter((n) => !byId.has(n.id))

  const make = async () => {
    if (busy) return
    setBusy(true)
    setErr('')
    try {
      const r = await makeNoteTasks(planId)
      setSource(r.source)
      setData((d) => (d ? { ...d, tasks: r.tasks } : d))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }
  const tick = async (task: NoteTask) => {
    const done = !task.done
    setData((d) => (d ? { ...d, tasks: d.tasks.map((x) => (x.commentId === task.commentId ? { ...x, done } : x)) } : d))
    try {
      const next = await setTaskDone(planId, task.commentId, done)
      setData((d) => (d ? { ...d, tasks: next } : d))
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
      load()
    }
  }

  return (
    <section className="cv-ed-ai-card" aria-label={t('editor.notes.title')} data-testid="client-notes">
      <h4 className="cv-ed-sub">{t('editor.notes.title')}</h4>
      {!data && !err && <p className="muted small" role="status">{t('editor.notes.loading')}</p>}
      {err && <ErrorText text={err} />}
      {data && data.notes.length === 0 && <p className="muted small" role="status">{t(data.shared ? 'editor.notes.emptyShared' : 'editor.notes.empty')}</p>}
      {data && data.notes.length > 0 && (
        <>
          <p className="muted small">{t('editor.notes.help')}</p>
          <ul className="cv-ed-notes">
            {data.notes.map((n) => (
              <li key={n.id} data-note={n.id}>
                {n.atSec === null ? (
                  <span className="cv-ed-ai-time">{t('editor.notes.whole')}</span>
                ) : (
                  <button type="button" className="cv-ed-ai-time cv-ed-note-time" aria-label={t('editor.notes.at', { time: formatAt(n.atSec) })} onClick={() => onSeek(Math.round(n.atSec! * FPS))}>
                    {formatAt(n.atSec)}
                  </button>
                )}
                <span className="small cv-ed-ai-label"><b>{n.author}</b> {n.text}</span>
              </li>
            ))}
          </ul>
          {fresh.length > 0 && (
            <div>
              <button type="button" className="btn btn-primary btn-sm" disabled={busy || readOnly} onClick={() => void make()}>
                {busy ? t('editor.notes.making') : tasks.length === 0 ? t('editor.notes.make') : t('editor.notes.more', { n: fresh.length })}
              </button>
            </div>
          )}
        </>
      )}
      {tasks.length > 0 && (
        <div aria-label={t('editor.notes.tasks')} data-testid="note-tasks">
          <h5 className="cv-ed-sub">{t('editor.notes.tasks')} <span className="muted small">{t('editor.notes.doneCount', { done: tasks.filter((x) => x.done).length, total: tasks.length })}</span> {source === 'ai' && <span className="cv-badge small">{t('editor.copy.by.ai')}</span>}</h5>
          <ul className="cv-ed-tasks">
            {tasks.map((x) => (
              <li key={x.commentId} data-done={x.done ? '' : undefined} data-type={x.type}>
                <input type="checkbox" checked={x.done} disabled={readOnly} aria-label={t('editor.notes.done', { action: x.action })} onChange={() => void tick(x)} />
                <span className="small">
                  <span className="cv-badge small">{t(`editor.notes.type.${x.type === 'other' ? 'misc' : x.type}` as const)}</span> <span className="muted">{x.target}</span>
                  <br />
                  <span className="cv-ed-task-action">{x.action}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
