import { useEffect, useRef } from 'react'
import { t } from '../../lib/i18n'
import type { NodeKind } from '../../lib/canvas/types'

interface Props {
  at: { x: number; y: number } // where the line was let go, in the board's own pixels
  options: { kind: NodeKind; handle: string }[]
  onPick: (o: { kind: NodeKind; handle: string }) => void
  onClose: () => void
}

// The kinds of node a line let go on empty board can make (spec §5.3): picking one adds it there, joined to the line.
export function DropMenu({ at, options, onPick, onClose }: Props) {
  const list = useRef<HTMLUListElement>(null)
  useEffect(() => {
    list.current?.querySelector('button')?.focus()
  }, [])
  return (
    <ul
      ref={list}
      className="cv-drop"
      role="menu"
      aria-label={t('canvas.drop.label')}
      style={{ left: at.x, top: at.y }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onClose()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      {options.map((o) => (
        <li key={`${o.kind}-${o.handle}`} role="none">
          <button type="button" role="menuitem" onClick={() => onPick(o)}>
            {t(`canvas.node.${o.kind}`)}
          </button>
        </li>
      ))}
    </ul>
  )
}
