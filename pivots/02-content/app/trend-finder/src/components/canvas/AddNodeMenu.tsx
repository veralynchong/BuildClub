import { useState } from 'react'
import { t } from '../../lib/i18n'
import type { NodeKind } from '../../lib/canvas/types'

interface Props {
  kinds: NodeKind[]
  label: string // the button's visible text or, with `icon`, its accessible name
  icon?: string
  className?: string
  disabled?: boolean
  onPick: (kind: NodeKind) => void
}

// A button that opens a short list of node kinds.
export function AddNodeMenu({ kinds, label, icon, className, disabled, onPick }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className={`cv-add ${className ?? ''}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false)
      }}
    >
      <button
        type="button"
        className={icon ? 'cv-add-plus nodrag' : 'btn btn-ghost btn-sm'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={icon ? label : undefined}
        disabled={disabled}
        onClick={() => setOpen(!open)}
      >
        {icon ?? label}
      </button>
      {open && (
        <ul className="cv-add-list nodrag nopan" role="menu">
          {kinds.map((k) => (
            <li key={k} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onPick(k)
                }}
              >
                {t(`canvas.node.${k}`)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
