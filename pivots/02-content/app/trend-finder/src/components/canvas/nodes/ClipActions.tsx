import { t } from '../../../lib/i18n'
import { CLIP_MIME } from '../../../lib/editor/timeline'
import type { ClipSource } from '../../../lib/editor/types'
import { useCanvas } from './ctx'

// The handle a video or a take is dragged by onto the timeline (React Flow must not take the drag for a node move).
export function ClipGrip({ src }: { src: ClipSource }) {
  const { readOnly } = useCanvas()
  return (
    <span
      className="cv-clip-grip nodrag nopan"
      draggable={!readOnly}
      role="img"
      aria-label={t('canvas.clip.drag')}
      title={t('canvas.clip.drag')}
      onDragStart={(e) => {
        e.dataTransfer.setData(CLIP_MIME, JSON.stringify(src))
        e.dataTransfer.effectAllowed = 'copy'
      }}
    >
      ⋮⋮
    </span>
  )
}

// "Add to timeline" and, for a clip of a shot, "make this the shot's main clip".
export function ClipActions({ src, grip = true }: { src: ClipSource; grip?: boolean }) {
  const { readOnly, addToTimeline, setPrimary, isPrimary } = useCanvas()
  const main = src.shotId ? isPrimary(src.shotId, src) : false
  return (
    <div className="cv-clip-actions">
      {grip && <ClipGrip src={src} />}
      <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={readOnly} onClick={() => addToTimeline(src)}>
        {t('canvas.clip.add')}
      </button>
      {src.shotId && (
        <button
          type="button"
          className="btn btn-ghost btn-sm nodrag"
          aria-pressed={main}
          disabled={readOnly || main}
          onClick={() => src.shotId && setPrimary(src.shotId, src)}
        >
          {main ? t('canvas.clip.isPrimary') : t('canvas.clip.primary')}
        </button>
      )}
    </div>
  )
}
