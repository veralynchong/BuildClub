import { t } from '../../../lib/i18n'
import { shotChip } from '../../../lib/canvas/frames'
import { AddNodeMenu } from '../AddNodeMenu'
import { useCanvas } from './ctx'
import type { CvNodeProps } from './types'

// A shot is drawn as a frame around its nodes (spec §5.1). The header row is the frame's drag handle; the shot's text
// reaches the nodes inside through their shotId, so the frame has no ports.
export function ShotNode({ id, data: { node } }: CvNodeProps) {
  const { shots, shotNumbers, readOnly, addAfterShot, shotHasClip } = useCanvas()
  const shot = shots.find((s) => s.id === node.shotId)
  const line = shot?.line?.trim() ? shot.line : (shot?.shot ?? '')
  const chip = shot ? shotChip(shot) : null
  const removed = node.data.removed === true
  return (
    <div className={`cv-frame${removed ? ' is-removed' : ''}`}>
      <div className="cv-frame-head">
        <span className="cv-frame-title">{shotNumbers.has(id) ? t('canvas.node.shot', { n: shotNumbers.get(id) ?? 0 }) : t('canvas.node.shotGone')}</span>
        {chip && <span className="cv-chip">{chip}</span>}
        <span className="cv-frame-line" title={line || undefined}>
          {line || t('canvas.shot.noLine')}
        </span>
        {removed && <span className="cv-chip cv-frame-removed">{t('canvas.frame.removed')}</span>}
        {/* slot: "✦ Build this shot" comes in a later phase */}
        <span className="cv-frame-status">{!removed && shotHasClip(node.shotId) ? t('canvas.clip.main') : null}</span>
        <span className="cv-frame-agent" />
        {!readOnly && !removed && (
          <AddNodeMenu
            className="cv-frame-add"
            icon="+"
            label={t('canvas.add.after')}
            kinds={['prompt', 'storyboard', 'video', 'upload', 'footage']}
            onPick={(k) => addAfterShot(id, k)}
          />
        )}
      </div>
    </div>
  )
}
