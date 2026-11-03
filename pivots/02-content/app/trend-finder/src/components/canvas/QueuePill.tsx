import { useState } from 'react'
import { t } from '../../lib/i18n'
import { aboutTime, queueLeft, type QueueItem } from '../../lib/canvas/shell'

interface Props {
  items: QueueItem[]
  onJump: (nodeId: string) => void
}

const etaText = (seconds: number) => {
  const a = aboutTime(seconds)
  return t(a.key, { n: a.n })
}

// "● 3 running · about 40 s" at the board's bottom left; click lists what is running and jumps to a node.
export function QueuePill({ items, onJump }: Props) {
  const [open, setOpen] = useState(false)
  if (!items.length) return null
  const left = queueLeft(items)
  return (
    <div className="cv-queue nodrag nopan">
      {open && (
        <ul className="cv-queue-list" aria-label={t('canvas.queue.list')}>
          {items.map((i) => (
            <li key={i.genId}>
              <button type="button" onClick={() => onJump(i.nodeId)}>
                <span>{i.shotNumber != null ? t('canvas.queue.shot', { n: i.shotNumber }) : t('canvas.queue.free')} · {t(`canvas.media.${i.kind}`)}</span>
                <span className="muted">{i.left != null ? etaText(i.left) : t('canvas.time.sec', { n: i.elapsed })}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="cv-queue-pill" aria-expanded={open} onClick={() => setOpen(!open)}>
        {left != null ? t('canvas.queue.running', { n: items.length, eta: etaText(left) }) : t('canvas.queue.runningNoEta', { n: items.length })}
      </button>
    </div>
  )
}
