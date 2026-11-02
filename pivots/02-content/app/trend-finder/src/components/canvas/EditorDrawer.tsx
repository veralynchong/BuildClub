import { useRef } from 'react'
import { t } from '../../lib/i18n'

const STEP = 24

interface Props {
  open: boolean
  width: number // px; ignored by the stacked (narrow screen) layout, which uses the full width
  onWidth: (px: number) => void // the raw wish; the screen clamps it
  onClose: () => void
}

// The editor lives here from the next step on. For now it is an empty shell with a draggable left edge.
export function EditorDrawer({ open, width, onWidth, onClose }: Props) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null)
  if (!open) return null

  return (
    <aside className="cv-drawer" style={{ ['--cv-w' as string]: `${width}px` }} aria-label={t('canvas.editor.title')}>
      <div
        className="cv-drawer-grip"
        role="separator"
        aria-orientation="vertical"
        aria-label={t('canvas.editor.resize')}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { startX: e.clientX, startWidth: width }
        }}
        onPointerMove={(e) => {
          if (drag.current) onWidth(drag.current.startWidth + (drag.current.startX - e.clientX))
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onWidth(width + STEP)
          else if (e.key === 'ArrowRight') onWidth(width - STEP)
          else return
          e.preventDefault()
        }}
      />
      <div className="cv-drawer-body">
        <div className="cv-drawer-head">
          <h2>{t('canvas.editor.title')}</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            {t('canvas.editor.close')}
          </button>
        </div>
        <p className="muted">{t('canvas.editor.empty')}</p>
      </div>
    </aside>
  )
}
