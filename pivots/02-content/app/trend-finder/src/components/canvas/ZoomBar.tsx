import { useReactFlow, useViewport } from '@xyflow/react'
import { t } from '../../lib/i18n'

// Zoom controls at the board's bottom right: minus, percent, plus, fit.
export function ZoomBar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const { zoom } = useViewport()
  return (
    <div className="cv-zoom nodrag nopan" role="group" aria-label={t('canvas.zoom.label')}>
      <button type="button" aria-label={t('canvas.zoom.out')} title={t('canvas.zoom.out')} onClick={() => void zoomOut({ duration: 150 })}>
        −
      </button>
      <span className="cv-zoom-pct" aria-live="off">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" aria-label={t('canvas.zoom.in')} title={t('canvas.zoom.in')} onClick={() => void zoomIn({ duration: 150 })}>
        +
      </button>
      <button type="button" aria-label={t('canvas.zoom.fit')} title={t('canvas.zoom.fit')} onClick={() => void fitView({ padding: 0.2, duration: 200 })}>
        ⤢
      </button>
    </div>
  )
}
