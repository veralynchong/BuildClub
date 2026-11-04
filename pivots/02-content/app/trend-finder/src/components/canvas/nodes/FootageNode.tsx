import { useRef, useState } from 'react'
import { t } from '../../../lib/i18n'
import { canClean, formatSize } from '../../../lib/takes'
import { ClipActions } from './ClipActions'
import { useCanvas } from './ctx'
import { CardHead, CardMedia } from './Card'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

// The takes of this node's shot (matched by the shot's id): which one is used, add one, use another.
export function FootageNode({ id, data: { node } }: CvNodeProps) {
  const input = useRef<HTMLInputElement>(null)
  const { takes, readOnly, shotIndex, uploading, addTake, pickTake, cleanTake, blocked } = useCanvas()
  const index = shotIndex(node.shotId)
  const gone = index < 0
  const mine = gone ? [] : takes.filter((x) => x.shotId === node.shotId)
  const chosen = mine.find((x) => x.chosen)
  const busy = uploading(id)
  const [cleaning, setCleaning] = useState(false) // the busy state is a clean-up, not an upload
  return (
    <div className="cv-node cv-card cv-footage">
      <CardHead title={t('canvas.node.footage')} status={busy ? { key: cleaning ? 'canvas.footage.cleaning' : 'canvas.footage.uploading', tone: 'busy' } : null} />
      {gone && <p className="small muted">{t('canvas.footage.gone')}</p>}
      <CardMedia kind="video" url={chosen?.url} running={busy} label={t('canvas.footage.video')}>
        <span className="small muted">{t('canvas.footage.empty')}</span>
      </CardMedia>
      {mine.length > 0 && (
        <ul className="cv-takes nodrag nowheel" aria-label={t('canvas.footage.takes')}>
          {mine.map((x) => (
            <li key={x.id} className={x.chosen ? 'is-chosen' : undefined}>
              <span className="cv-take-name small" title={x.name}>{x.name}</span>
              <span className="small muted">{formatSize(x.size)}</span>
              {x.cleanedFrom && <span className="cv-badge small">{t('canvas.footage.cleanedBadge')}</span>}
              {!readOnly && !gone && canClean(x, takes) && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy || blocked}
                  title={t('canvas.footage.cleanHint')}
                  onClick={() => {
                    setCleaning(true)
                    void cleanTake(id, x.id).finally(() => setCleaning(false))
                  }}
                >
                  {t('canvas.footage.clean')}
                </button>
              )}
              {x.chosen ? (
                <span className="cv-badge small">{t('canvas.footage.chosen')}</span>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" disabled={readOnly || gone} onClick={() => pickTake(x.id)}>
                  {t('canvas.footage.use')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {chosen && <ClipActions src={{ kind: 'take', id: chosen.id, shotId: gone ? undefined : node.shotId }} />}
      <input
        ref={input}
        type="file"
        className="cv-file"
        accept="video/mp4,video/quicktime,.mp4,.mov"
        aria-label={t('canvas.footage.upload')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) addTake(id, file)
        }}
      />
      <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={readOnly || gone || busy} onClick={() => input.current?.click()}>
        {t('canvas.footage.upload')}
      </button>
      <Ports node={node} />
    </div>
  )
}
