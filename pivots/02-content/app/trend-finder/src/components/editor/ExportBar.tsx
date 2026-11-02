import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import { useManagerName } from '../../lib/appContext'
import { formatDay } from '../../lib/dates'
import { formatDuration, getCut, pollCut, reviewLine, sendCutForReview, type CutState } from '../../lib/cut'
import { exportBlocked, type ClipStatus } from '../../lib/editor/timeline'
import type { EditProject } from '../../lib/editor/types'
import type { Key } from '../../lib/i18n'
import { startExport } from '../../lib/editor/api'
import type { EditHook } from '../../lib/editor/useEditProject'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { ErrorText } from '../ErrorText'

interface Props {
  ideaId: string
  edit: EditHook
  timeline: TimelineActions
  readOnly: boolean
}

const isActive = (c: CutState | null) => c?.status === 'queued' || c?.status === 'running'

// Export the timeline as a video, show the render's progress, then preview it and send it for review.
export function ExportBar({ ideaId, edit, timeline, readOnly }: Props) {
  const [cut, setCut] = useState<CutState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollDead, setPollDead] = useState(false) // the polling failed while the export was active
  const [busy, setBusy] = useState(false) // saving the edit or starting the export
  const [sending, setSending] = useState(false)
  const manager = useManagerName()

  // The polling in flight; replaced when a new export starts and stopped on unmount.
  const poller = useRef<AbortController | null>(null)
  const track = useCallback(
    async (initial: CutState) => {
      poller.current?.abort()
      const ac = new AbortController()
      poller.current = ac
      setCut(initial)
      setPollDead(false)
      if (!isActive(initial)) return
      try {
        await pollCut(ideaId, setCut, { signal: ac.signal })
      } catch (e) {
        if (!ac.signal.aborted) {
          setPollDead(true)
          setError((e as Error).message)
        }
      }
    },
    [ideaId],
  )
  useEffect(() => {
    const ac = new AbortController()
    void (async () => {
      try {
        const state = await getCut(ideaId)
        if (!ac.signal.aborted) await track(state) // resumes polling when an export is still running
      } catch (e) {
        if (!ac.signal.aborted) setError((e as Error).message)
      }
    })()
    return () => {
      ac.abort()
      poller.current?.abort()
    }
  }, [ideaId, track])

  const blockOf = (project: EditProject | null): Key | null =>
    project ? exportBlocked(project, Object.fromEntries(project.clips.map((c) => [c.id, timeline.statusOf(c).state] as [string, ClipStatus['state']]))) : 'editor.export.empty'
  const reason = blockOf(edit.project)

  const run = async () => {
    setError(null)
    setBusy(true)
    try {
      const saved = await edit.flush()
      if (saved !== 'saved') return setError(t('editor.export.saveFailed'))
      const why = blockOf(edit.current()) // the hook's own newest project, not a rendered one
      if (why) return setError(t(why))
      await track(await startExport(ideaId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // The polling died (a failed request): one look at the server tells whether the export still runs.
  const recheck = async () => {
    setError(null)
    try {
      await track(await getCut(ideaId))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const send = async () => {
    setError(null)
    setSending(true)
    try {
      setCut(await sendCutForReview(ideaId))
    } catch (e) {
      setError((e as Error).message) // the server's reason, including EDIT_STALE and NO_LINK
    } finally {
      setSending(false)
    }
  }

  const active = isActive(cut) && !pollDead
  const output = cut?.source === 'editor' ? cut.output : undefined
  const review = output ? (cut?.review ?? null) : null
  const canSend = !readOnly && !!output && !cut?.stale && !active && review?.status !== 'waiting' && review?.status !== 'approved'
  const line = reviewLine(review, manager, formatDay)

  return (
    <section className="cv-ed-export">
      <div className="cv-ed-export-row">
        <button type="button" className="btn btn-primary btn-sm" disabled={readOnly || busy || active || reason !== null} onClick={() => void run()}>
          {busy || active ? t('editor.export.working') : cut?.status === 'failed' ? t('cut.common.tryAgain') : t('editor.export.button')}
        </button>
        {reason && !readOnly && <span className="muted small">{t(reason)}</span>}
      </div>
      {active && cut && (
        <div className="cut-progress" role="status">
          <progress value={cut.progress} max={1} />
          <span className="muted small">{cut.step}</span>
        </div>
      )}
      {pollDead && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void recheck()}>
          {t('editor.export.recheck')}
        </button>
      )}
      {cut?.status === 'failed' && cut.error && <p className="error" role="alert"><ErrorText text={cut.error} /></p>}
      {error && <p className="error" role="alert"><ErrorText text={error} /></p>}
      {cut?.status === 'done' && cut.source !== 'editor' && !active && (
        <p className="small">
          {t('editor.export.autoExists')}
          {(cut.review?.status === 'waiting' || cut.review?.status === 'approved') && <> {t('cut.panel.clearsApproval', { name: manager })}</>}
        </p>
      )}
      {output && !active && (
        <div className="cv-ed-export-done">
          {cut?.stale && <p className="small">{t('editor.export.stale')}</p>}
          <video className="cv-ed-export-video" src={output.url} controls preload="metadata" />
          <div className="cv-ed-export-row">
            <a className="btn btn-ghost btn-sm" href={`${output.url}${output.url.includes('?') ? '&' : '?'}download=1`} download>
              {t('cut.panel.download')}
            </a>
            {canSend && (
              <button type="button" className="btn btn-primary btn-sm" disabled={sending} onClick={() => void send()}>
                {t('cut.panel.send', { name: manager })}
              </button>
            )}
            <span className="muted small">{formatDuration(output.durationSec)}</span>
          </div>
          {line && <p className="small cut-review-line">{line}</p>}
          {review?.status === 'rejected' && review.reason && <p className="quote">{review.reason}</p>}
        </div>
      )}
    </section>
  )
}
