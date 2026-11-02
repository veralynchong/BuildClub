import { useRef } from 'react'
import { t } from '../../../lib/i18n'
import { selectedGen, versionsOf } from '../../../lib/canvas/graph'
import { VersionStrip } from '../VersionStrip'
import { useCanvas } from './ctx'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

// A file picker: an image becomes a version of this node (a new one for each upload); a video becomes a take of the shot.
export function UploadNode({ id, data: { node } }: CvNodeProps) {
  const input = useRef<HTMLInputElement>(null)
  const { gens, takes, readOnly, uploading, uploadToNode, onSelectVersion } = useCanvas()
  const busy = uploading(id)
  const isVideo = node.data.media === 'video'
  const take = isVideo ? takes.find((x) => x.id === node.data.takeId) : undefined
  const versions = isVideo ? [] : versionsOf(id, gens)
  const shown = isVideo ? null : selectedGen(node, gens)
  const has = isVideo ? !!take : !!shown?.url
  return (
    <div className="cv-node cv-upload">
      <div className="cv-node-title">{t('canvas.node.upload')}</div>
      <div className="cv-preview small muted">
        {busy ? (
          <span role="status">
            <span className="cv-spin" aria-hidden="true" /> {t('canvas.upload.uploading')}
          </span>
        ) : take ? (
          <video className="nodrag" src={take.url} muted playsInline controls preload="metadata" />
        ) : shown?.url ? (
          <img src={shown.url} alt={t('canvas.gen.image')} draggable={false} />
        ) : (
          t('canvas.upload.empty')
        )}
      </div>
      {isVideo && take && <p className="cv-footage-name small muted">{t('canvas.upload.video')} · {take.name}</p>}
      {!isVideo && <VersionStrip versions={versions} selectedId={shown?.id ?? null} disabled={readOnly} onSelect={(g) => onSelectVersion(id, g)} />}
      <input
        ref={input}
        type="file"
        className="cv-file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime,.png,.jpg,.jpeg,.webp,.mp4,.mov"
        aria-label={t('canvas.upload.choose')}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) uploadToNode(id, file)
        }}
      />
      <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={readOnly || busy} onClick={() => input.current?.click()}>
        {has ? t('canvas.upload.replace') : t('canvas.upload.choose')}
      </button>
      {!has && <p className="small muted">{t('canvas.upload.hint')}</p>}
      <Ports node={node} />
    </div>
  )
}
