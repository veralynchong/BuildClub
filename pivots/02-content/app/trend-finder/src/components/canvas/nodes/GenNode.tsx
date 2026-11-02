import { t } from '../../../lib/i18n'
import { PortLabels, Ports } from './Ports'
import type { CvNodeProps } from './types'

// A storyboard or video node. For now it shows its title, model and an empty preview; making versions comes next.
export function GenNode({ data: { node } }: CvNodeProps) {
  return (
    <div className={`cv-node cv-gen cv-gen-${node.type}`}>
      <div className="cv-node-title">{t(`canvas.node.${node.type}`)}</div>
      {node.data.model && <div className="cv-model small muted">{node.data.model}</div>}
      <div className="cv-preview small muted">{t('canvas.gen.empty')}</div>
      <PortLabels node={node} />
      <Ports node={node} />
    </div>
  )
}
