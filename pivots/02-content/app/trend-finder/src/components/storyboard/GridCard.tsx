import { useEffect, useState } from 'react'
import type { GridCell } from '../../lib/shotGrid'
import { cameraTag, generatingElapsed, shotMidSecond } from '../../lib/shotGrid'
import { t } from '../../lib/i18n'

export interface GridCardProps {
  cell: GridCell
  referenceCover?: string
  // The plan's id, to fetch the reference video's frame at this shot's time (falls back to the cover).
  ideaId?: string | null
  selected: boolean
  readOnly: boolean
  showAction: boolean
  showLine: boolean
  showCamera: boolean
  price: string
  busy: boolean
  onSelect: () => void
  onRefine: (anchor: DOMRect) => void
  onRegenerate: () => void
  onStep: (dir: -1 | 1) => void
}

export function GridCard({ cell, referenceCover, ideaId, selected, readOnly, showAction, showLine, showCamera, price, busy, onSelect, onRefine, onRegenerate, onStep }: GridCardProps) {
  const { shot, index, versions, shown, pending, failed, changed } = cell
  const done = versions.filter((v) => v.status === 'done')
  const at = shown ? done.findIndex((v) => v.id === shown.id) + 1 : 0
  const camera = cameraTag(shot)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!pending) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [pending])
  const wait = pending ? generatingElapsed(pending.createdAt, now) : null
  const mid = shotMidSecond(shot.time)
  const frameUrl = ideaId && mid !== null ? `/api/ideas/${encodeURIComponent(ideaId)}/reference-frame?t=${mid}` : undefined
  const [frameFailed, setFrameFailed] = useState(false)
  const reference = frameUrl && !frameFailed ? frameUrl : referenceCover
  return (
    <div className={`sg-card${selected ? ' sg-sel' : ''}`}>
      <div className="sg-frame" onClick={onSelect}>
        {shown?.url ? <img src={shown.url} alt="" loading="lazy" /> : (
          <>
            {reference && <img className="sg-ref" src={reference} alt="" loading="lazy" onError={() => setFrameFailed(true)} />}
            <span className="sg-empty">{reference ? t('grid.noFrameRef') : t('grid.noFrame')}</span>
          </>
        )}
        <span className="sg-badge sg-n">{index + 1}</span>
        <span className="sg-badge sg-t">{shot.time}</span>
        {pending && wait ? <span className="sg-status">{t('grid.generatingFor', { s: wait.sec })}{wait.slow && <small>{t('grid.generatingSlow')}</small>}</span>
          : failed ? <span className="sg-status sg-warn">{failed.error || t('grid.failed')}</span>
          : changed ? <span className="sg-status sg-warn">{t('grid.changed')}</span> : null}
        <div className="sg-hover">
          <button type="button" data-refine={index} disabled={readOnly || !cell.nodeId} onClick={(e) => { e.stopPropagation(); onRefine(e.currentTarget.closest('.sg-frame')!.getBoundingClientRect()) }}>{t('grid.refine')}</button>
          <button type="button" disabled={readOnly || !cell.nodeId || !!pending || busy || !price} title={price ? undefined : t('grid.noModel')} onClick={(e) => { e.stopPropagation(); onRegenerate() }}>{price ? t('grid.regenerate', { price }) : t('grid.regenerateOff')}</button>
        </div>
      </div>
      <div className="sg-ver">
        <span>
          <button type="button" aria-label={t('grid.prev')} disabled={at <= 1} onClick={() => onStep(-1)}>‹</button>
          {at > 0 ? `v${at} / ${done.length}` : '—'}
          <button type="button" aria-label={t('grid.nextVersion')} disabled={at === 0 || at >= done.length} onClick={() => onStep(1)}>›</button>
        </span>
      </div>
      {showAction && <div className="sg-fld"><label>{t('grid.show.action')}</label><p>{shot.shot}</p></div>}
      {showLine && <div className="sg-fld"><label>{t('grid.show.line')}</label>{shot.line ? <p>{shot.line}</p> : <p className="sg-muted">{t('grid.noLine')}</p>}</div>}
      {showCamera && camera && <div className="sg-tags">{camera.split(' · ').map((c) => <span key={c} className="sg-chip">{c}</span>)}</div>}
    </div>
  )
}
