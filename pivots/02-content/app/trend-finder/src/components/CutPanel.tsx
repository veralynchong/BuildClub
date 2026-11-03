import { useEffect, useRef, useState } from 'react'
import type { IdeaStatus } from '../types'
import type { CutState } from '../lib/cut'
import { formatDuration, getCut, pollCut, reviewLine, sendCutForReview } from '../lib/cut'
import { useManagerName } from '../lib/appContext'
import { t } from '../lib/i18n'
import { serverText } from '../lib/serverText'
import { formatDay } from '../lib/dates'
import { formatSize } from '../lib/takes'
import { CutVideo } from './cut/CutVideo'

interface Props {
  ideaId: string
  status: IdeaStatus
  shotCount: number
  // Bumped whenever the takes change, so a finished cut can be checked for staleness without a reload.
  takesRevision?: number
  // Opens the canvas, where the editor makes the video.
  onOpenCanvas: (editor?: boolean) => void
}

const isActive = (c: CutState | null) => c?.status === 'queued' || c?.status === 'running'

// The finished video of an approved plan: watch, download, send for approval. The editor makes the video.
export function CutPanel({ ideaId, status, shotCount, takesRevision = 0, onOpenCanvas }: Props) {
  const [cut, setCut] = useState<CutState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Bumped to (re)load the state and resume polling when it is still active.
  const [loadKey, setLoadKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const manager = useManagerName()

  useEffect(() => {
    const ac = new AbortController()
    setLoadError(null)
    void (async () => {
      try {
        const state = await getCut(ideaId, shotCount)
        if (ac.signal.aborted) return
        setCut(state)
        if (isActive(state)) await pollCut(ideaId, (s) => setCut(s), { signal: ac.signal })
      } catch (e) {
        if (!ac.signal.aborted) setLoadError((e as Error).message)
      }
    })()
    return () => ac.abort()
  }, [ideaId, loadKey, shotCount])

  // Re-read the state (for `stale`) when the takes change, unless a job is active and already being polled.
  const activeRef = useRef(false)
  activeRef.current = isActive(cut)
  useEffect(() => {
    if (takesRevision > 0 && !activeRef.current) setLoadKey((k) => k + 1)
  }, [takesRevision])

  const approved = status === 'approved'
  const active = isActive(cut)
  const output = cut?.output
  if (!approved && !output && !active) return null

  const send = async () => {
    setError(null)
    setSending(true)
    try {
      setCut(await sendCutForReview(ideaId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const review = cut?.review ?? null
  const canSend = approved && !cut?.stale && !active && review?.status !== 'waiting' && review?.status !== 'approved' && review?.status !== 'rejected'
  // A reopened plan is hidden from the approver, so a waiting review must not promise that they will see it.
  const line = !approved && review?.status === 'waiting' ? t('cut.panel.hidden', { name: manager }) : reviewLine(review, manager, formatDay)

  return (
    <section className="block cut-panel">
      <h3>{t('cut.panel.title')}</h3>

      {approved && !output && !active && (
        <div className="cut-options">
          <p className="muted small">{t('cut.panel.useEditor')}</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => onOpenCanvas(true)}>
            {t('canvas.makeVideo')}
          </button>
        </div>
      )}

      {active && cut && (
        <div className="cut-progress" role="status">
          <progress value={cut.progress} max={1} />
          <span className="muted small">{serverText(cut.step)}</span>
        </div>
      )}

      {cut?.status === 'failed' && (
        <p className="error" role="alert">
          {serverText(cut.error)}
        </p>
      )}

      {loadError && (
        <p className="error" role="alert">
          {loadError}{' '}
          <button type="button" className="link-btn" onClick={() => setLoadKey((k) => k + 1)}>
            {t('cut.common.retry')}
          </button>
        </p>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {output && (
        <div className="cut-output">
          {cut?.stale && <p className="small">{t('cut.panel.stale')}</p>}
          <CutVideo url={output.url} />
          <div className="cut-output-meta">
            <a className="btn btn-ghost btn-sm" href={`${output.url}${output.url.includes('?') ? '&' : '?'}download=1`} download>
              {t('cut.panel.download')}
            </a>
            {canSend && (
              <button type="button" className="btn btn-primary btn-sm" disabled={sending} onClick={() => void send()}>
                {t('cut.panel.send', { name: manager })}
              </button>
            )}
            <span className="muted small">
              {formatDuration(output.durationSec)} · {formatSize(output.size)}
            </span>
          </div>
          {cut?.source === 'editor' && <p className="small muted">{t('cut.panel.editorMade')}</p>}
          {line && <p className="small cut-review-line">{line}</p>}
          {review?.status === 'rejected' && review.reason && <p className="quote">{review.reason}</p>}
          {review?.status === 'rejected' && !cut?.stale && <p className="muted small">{t('cut.panel.sentBackExport', { name: manager })}</p>}
        </div>
      )}
    </section>
  )
}
