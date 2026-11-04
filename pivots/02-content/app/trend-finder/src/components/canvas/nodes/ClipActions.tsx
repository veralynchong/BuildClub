import { t } from '../../../lib/i18n'
import type { ClipSource } from '../../../lib/editor/types'
import { useCanvas } from './ctx'

// "Put in timeline" (spec 7.1): makes this footage its shot's one clip, replacing the clip the shot had. Footage that is
// already on the timeline shows a badge instead, so pressing again never resets its trim. Not offered for footage
// without a shot of the plan.
export function ClipActions({ src }: { src: ClipSource }) {
  const { readOnly, putInTimeline, isInTimeline, shotIndex } = useCanvas()
  if (!src.shotId || shotIndex(src.shotId) < 0) return null
  return (
    <div className="cv-clip-actions">
      {isInTimeline(src) ? (
        <span className="cv-badge small">{t('canvas.clip.on')}</span>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm nodrag" disabled={readOnly} onClick={() => putInTimeline(src)}>
          {t('canvas.clip.put')}
        </button>
      )}
    </div>
  )
}
