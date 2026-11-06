import { getGuidedRuntime } from '../../lib/guided/runtime'
import { type ResourceInput } from '../../lib/canvas/resource.ts'
import { useCallback, useEffect, useRef, useState } from 'react'
import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import { useManagerName } from '../../lib/appContext'
import { formatDay } from '../../lib/dates'
import { formatDuration, getCut, pollCut, reviewLine, NoLinkError, sendWithLink, type CutState } from '../../lib/cut'
import { exportBlocked, type ClipStatus } from '../../lib/editor/timeline'
import type { EditProject } from '../../lib/editor/types'
import type { Key } from '../../lib/i18n'
import { createShareLink } from '../../lib/share'
import { startExport } from '../../lib/editor/api'
import type { EditHook } from '../../lib/editor/useEditProject'
import type { TimelineActions } from '../../lib/editor/useTimelineActions'
import { ErrorText } from '../ErrorText'

interface Props {
  ideaId: ResourceInput
  clientId: string
  focus?: 'export' | 'send' | null
  edit: EditHook
  timeline: TimelineActions
  readOnly: boolean
  brandKey: string // changes when the client's logo, colour or font does, which also makes a finished video out of date
  musicKey: number // bumps when the music file is uploaded or replaced
  linesKey: string // the shots' lines, which are the captions while captions are on
  onCut: (cut: CutState | null) => void // the latest state of the export, for the step bar
}

const isActive = (c: CutState | null) => c?.status === 'queued' || c?.status === 'running'

// Export the timeline as a video, show the render's progress, then preview it and send it for review.
export function ExportBar({ ideaId, clientId, focus = null, edit, timeline, readOnly, brandKey, musicKey, linesKey, onCut }: Props) {
  const [cut, setCut] = useState<CutState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollDead, setPollDead] = useState(false) // the polling failed while the export was active
  const [busy, setBusy] = useState(false) // saving the edit or starting the export
  const [sending, setSending] = useState(false)
  const [noLink, setNoLink] = useState(false) // the review link could not be turned on
  const [linkMade, setLinkMade] = useState(false) // "Create link" just turned the link on
  const sendingRef = useRef(false) // two clicks in one tick send once
  const manager = useManagerName()
  const doneRef = useRef<HTMLDivElement>(null)
  const sendRef = useRef<HTMLButtonElement>(null)
  const focusedSend = useRef(false)
  const wasActive = useRef(false)

  const cutRef = useRef<CutState | null>(null)
  useEffect(() => {
    cutRef.current = cut
    onCut(cut)
  }, [cut, onCut])

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

  // A saved edit can make the finished video out of date (for example after applying a newer version), and so can a
  // new brand kit, music file or caption line: look again. Those are saved on their own, so they need no saved edit.
  const captionsOn = edit.project?.captions.enabled === true
  const looksKey = `${brandKey}|${musicKey}|${captionsOn ? linesKey : ''}`
  const seenLooks = useRef(looksKey)
  useEffect(() => {
    const looksChanged = seenLooks.current !== looksKey
    seenLooks.current = looksKey
    if (edit.save !== 'saved' && !looksChanged) return
    const ac = new AbortController()
    getCut(ideaId).then(
      (state) => {
        if (ac.signal.aborted) return
        if (isActive(state) && !isActive(cutRef.current)) void track(state) // an export started elsewhere: poll it
        else setCut((prev) => (isActive(prev) ? prev : state))
      },
      () => undefined, // the polling and the export button report real failures
    )
    return () => ac.abort()
  }, [ideaId, edit.save, looksKey, track])

  // When an export finishes, bring the finished video and the send button into view.
  const finished = isActive(cut) ? 'active' : cut?.status === 'done' && cut.output ? 'done' : 'idle'
  useEffect(() => {
    if (finished === 'active') wasActive.current = true
    else if (finished === 'done' && wasActive.current) {
      wasActive.current = false
      doneRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    } else wasActive.current = false
  }, [finished])

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
    if (sendingRef.current) return
    sendingRef.current = true
    setError(null)
    setNoLink(false)
    setLinkMade(false)
    setSending(true)
    try {
      setCut(await sendWithLink(ideaId, clientId))
    } catch (e) {
      if (e instanceof NoLinkError) setNoLink(true)
      setError((e as Error).message) // the server's reason, including EDIT_STALE; NoLinkError when the link could not be turned on
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }

  const makeLink = async () => {
    setError(null)
    try {
      await createShareLink(clientId)
      setNoLink(false)
      setLinkMade(true)
    } catch {
      setError(t('cut.err.link'))
    }
  }

  const active = isActive(cut) && !pollDead
  const output = cut?.source === 'editor' ? cut.output : undefined
  const review = output ? (cut?.review ?? null) : null
  const canSend = !readOnly && !!output && !cut?.stale && !active && review?.status !== 'waiting' && review?.status !== 'approved' && review?.status !== 'rejected'
  const line = reviewLine(review, manager, formatDay)

  // Opened from the toolbar's Send for approval: focus Send the first time it exists (the export state loads after
  // opening), and only when nothing else has the focus yet, or the Export button the editor focused while waiting.
  useEffect(() => {
    if (focus !== 'send' || !canSend || focusedSend.current) return
    focusedSend.current = true
    const at = document.activeElement
    if (!at || at === document.body || (at instanceof HTMLElement && at.dataset.step === 'export')) sendRef.current?.focus()
  }, [focus, canSend])

  return (
    <section className="cv-ed-export">
      <div className="cv-ed-export-row">
        <button type="button" data-step="export" className="btn btn-primary btn-sm" disabled={readOnly || busy || active || reason !== null} onClick={() => void run()}>
          {busy || active ? t('editor.export.working') : cut?.status === 'failed' ? t('cut.common.tryAgain') : t('editor.export.button')}
        </button>
        {reason && !readOnly && <span className="muted small">{t(reason)}</span>}
        {focus === 'send' && !output && !active && !readOnly && <span className="muted small" role="status">{t('editor.export.needFirst')}</span>}
      </div>
      {active && cut && (
        <div className="cut-progress" role="status">
          <progress value={cut.progress} max={1} />
          <span className="muted small">{serverText(cut.step)}</span>
          <span className="muted small">{t('editor.export.expect')}</span>
        </div>
      )}
      {pollDead && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void recheck()}>
          {t('editor.export.recheck')}
        </button>
      )}
      {cut?.status === 'failed' && cut.error && <p className="error" role="alert"><ErrorText text={serverText(cut.error)} /></p>}
      {error && <p className="error" role="alert"><ErrorText text={error} /></p>}
      {cut?.status === 'done' && cut.source !== 'editor' && !active && (
        <p className="small">
          {t('editor.export.autoExists')}
          {(cut.review?.status === 'waiting' || cut.review?.status === 'approved') && <> {t('cut.panel.clearsApproval', { name: manager })}</>}
        </p>
      )}
      {output && !active && (
        <div className="cv-ed-export-done" ref={doneRef}>
          {cut?.stale && <p className="small">{t('editor.export.stale')}</p>}
          <video className="cv-ed-export-video" src={output.url} controls playsInline preload="metadata" />
          <div className="cv-ed-export-row">
            <a className="btn btn-ghost btn-sm" href={output.url} target="_blank" rel="noopener noreferrer">{t('editor.export.openVideo')} ↗</a>
            <a className="btn btn-ghost btn-sm" href={`${output.url}${output.url.includes('?') ? '&' : '?'}download=1`} download>
              {t('cut.panel.download')}
            </a>
            {canSend && !getGuidedRuntime() && (
              <button type="button" data-step="send" ref={sendRef} className="btn btn-primary btn-sm" disabled={sending} onClick={() => void send()}>
                {t('cut.panel.send', { name: manager })}
              </button>
            )}
            <span className="muted small">{formatDuration(output.durationSec)}</span>
          </div>
          {noLink && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void makeLink()}>
              {t('cut.panel.makeLink')}
            </button>
          )}
          {linkMade && canSend && <p className="muted small" role="status">{t('cut.panel.linkMade')}</p>}
          {canSend && <p className="muted small">{t('editor.export.approver', { name: manager })}</p>}
          {review?.status === 'rejected' && !cut?.stale && <p className="muted small">{t('cut.panel.sentBackExport', { name: manager })}</p>}
          {line && <p className="small cut-review-line">{line}</p>}
          {review?.status === 'rejected' && review.reason && <p className="quote">{review.reason}</p>}
        </div>
      )}
    </section>
  )
}
