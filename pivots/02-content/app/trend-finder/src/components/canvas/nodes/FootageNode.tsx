import { t } from '../../../lib/i18n'
import { PortLabels, Ports } from './Ports'
import type { CvNodeProps } from './types'

export function FootageNode({ data: { node } }: CvNodeProps) {
  return (
    <div className="cv-node cv-footage">
      <div className="cv-node-title">{t('canvas.node.footage')}</div>
      <div className="cv-preview small muted">{t('canvas.footage.empty')}</div>
      <PortLabels node={node} />
      <Ports node={node} />
    </div>
  )
}
