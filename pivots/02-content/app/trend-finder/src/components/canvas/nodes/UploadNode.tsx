import { useRef } from 'react'
import { t } from '../../../lib/i18n'
import { selectedGen, versionsOf } from '../../../lib/canvas/graph'
import { VersionStrip } from '../VersionStrip'
import { CardHead, CardMedia } from './Card'
import { ClipActions } from './ClipActions'
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
    <div className="cv-node cv-card cv-upload">
      <CardHead title={t('canvas.node.upload')} status={busy ? { key: 'canvas.upload.uploading', tone: 'busy' } : null} />
      <CardMedia kind={take ? 'video' : 'image'} url={take ? take.url : shown?.url} running={busy} label={t(take ? 'canvas.upload.video' : 'canvas.gen.image')}>
        <span className="small muted">{t('canvas.upload.empty')}</span>
      </CardMedia>
      {isVideo && take && <p className="cv-footage-name small muted">{t('canvas.upload.video')} · {take.name}</p>}
      {take && <ClipActions src={{ kind: 'take', id: take.id, shotId: take.shotId ?? undefined }} />}
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
