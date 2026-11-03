import { useRef } from 'react'
import { t } from '../../../lib/i18n'
import { formatSize } from '../../../lib/takes'
import { ClipActions, ClipGrip } from './ClipActions'
import { useCanvas } from './ctx'
import { PortLabels, Ports } from './Ports'
import type { CvNodeProps } from './types'

// The takes of this node's shot (matched by the shot's id): which one is used, add one, use another.
export function FootageNode({ id, data: { node } }: CvNodeProps) {
  const input = useRef<HTMLInputElement>(null)
  const { takes, readOnly, shotIndex, uploading, addTake, pickTake } = useCanvas()
  const index = shotIndex(node.shotId)
  const gone = index < 0
  const mine = gone ? [] : takes.filter((x) => x.shotId === node.shotId)
  const chosen = mine.find((x) => x.chosen)
  const busy = uploading(id)
  return (
    <div className="cv-node cv-footage">
      <div className="cv-node-title">{t('canvas.node.footage')}</div>
      {gone && <p className="small muted">{t('canvas.footage.gone')}</p>}
      <div className="cv-preview small muted">
        {busy ? (
          <span role="status">
            <span className="cv-spin" aria-hidden="true" /> {t('canvas.footage.uploading')}
          </span>
        ) : chosen ? (
          <video className="nodrag" src={chosen.url} muted playsInline controls preload="metadata" aria-label={t('canvas.footage.video')} />
        ) : (
          t('canvas.footage.empty')
        )}
      </div>
      {mine.length > 0 && (
        <ul className="cv-takes nodrag nowheel" aria-label={t('canvas.footage.takes')}>
          {mine.map((x) => (
            <li key={x.id} className={x.chosen ? 'is-chosen' : undefined}>
              <ClipGrip src={{ kind: 'take', id: x.id, shotId: node.shotId }} />
              <span className="cv-take-name small" title={x.name}>{x.name}</span>
              <span className="small muted">{formatSize(x.size)}</span>
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
      {chosen && <ClipActions grip={false} src={{ kind: 'take', id: chosen.id, shotId: gone ? undefined : node.shotId }} />}
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
      <PortLabels node={node} />
      <Ports node={node} />
    </div>
  )
}
