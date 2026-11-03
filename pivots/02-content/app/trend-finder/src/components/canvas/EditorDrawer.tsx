import { useRef } from 'react'
import { t } from '../../lib/i18n'

const STEP = 24

interface Props {
  open: boolean
  width: number // px; ignored by the stacked (narrow screen) layout, which uses the full width
  onWidth: (px: number, save: boolean) => void // the raw wish (the screen clamps it); `save` once the change is final
}

// The editor lives here from the next step on. For now it is an empty shell with a draggable left edge.
export function EditorDrawer({ open, width, onWidth }: Props) {
  const drag = useRef<{ startX: number; startWidth: number; last: number } | null>(null)
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
          drag.current = { startX: e.clientX, startWidth: width, last: width }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          drag.current.last = drag.current.startWidth + (drag.current.startX - e.clientX)
          onWidth(drag.current.last, false)
        }}
        onPointerUp={() => {
          if (drag.current) onWidth(drag.current.last, true)
          drag.current = null
        }}
        onPointerCancel={() => {
          if (drag.current) onWidth(drag.current.last, true)
          drag.current = null
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') onWidth(width + STEP, true)
          else if (e.key === 'ArrowRight') onWidth(width - STEP, true)
          else return
          e.preventDefault()
        }}
      />
      <div className="cv-drawer-body">
        <h2>{t('canvas.editor.title')}</h2>
        <p className="muted">{t('canvas.editor.empty')}</p>
      </div>
    </aside>
  )
}
