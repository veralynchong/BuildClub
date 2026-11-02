import type { Shot } from '../types'
import { cameraLabels } from '../lib/shots'

// The shot's framing, angle and movement as small tags, and its filming tip. Nothing when the shot has none.
export function CameraTags({ shot, tip = true }: { shot: Shot; tip?: boolean }) {
  const tags = cameraLabels(shot)
  if (tags.length === 0 && !(tip && shot.tip)) return null
  return (
    <span className="cam-info">
      {tags.length > 0 && (
        <span className="cam-tags">
          {tags.map((x, i) => (
            <span key={i} className="cam-tag">
              {x}
            </span>
          ))}
        </span>
      )}
      {tip && shot.tip && <span className="cam-tip">{shot.tip}</span>}
    </span>
  )
}
