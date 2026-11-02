import { t } from '../../../lib/i18n'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

export function UploadNode({ data: { node } }: CvNodeProps) {
  return (
    <div className="cv-node cv-upload">
      <div className="cv-node-title">{t('canvas.node.upload')}</div>
      <div className="cv-preview small muted">{t('canvas.upload.empty')}</div>
      <Ports node={node} />
    </div>
  )
}
