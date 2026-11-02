import { t } from '../../../lib/i18n'
import { AddNodeMenu } from '../AddNodeMenu'
import { useCanvas } from './ctx'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

export function ShotNode({ id, data: { node } }: CvNodeProps) {
  const { shots, shotNumbers, readOnly, addAfterShot } = useCanvas()
  const shot = shots.find((s) => s.id === node.shotId)
  const line = shot?.line?.trim() ? shot.line : (shot?.shot ?? '')
  const removed = node.data.removed === true
  return (
    <div className={`cv-node cv-shot${removed ? ' is-removed' : ''}`}>
      <div className="cv-node-title">{t('canvas.node.shot', { n: shotNumbers.get(id) ?? 1 })}</div>
      <p className="cv-shot-line">{line || t('canvas.shot.noLine')}</p>
      {removed && <p className="cv-shot-removed small">{t('canvas.shot.removed')}</p>}
      {!readOnly && !removed && (
        <AddNodeMenu
          className="cv-add-corner"
          icon="+"
          label={t('canvas.add.after')}
          kinds={['prompt', 'storyboard', 'video', 'upload', 'footage']}
          onPick={(k) => addAfterShot(id, k)}
        />
      )}
      <Ports node={node} />
    </div>
  )
}
