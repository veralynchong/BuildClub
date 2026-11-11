import { useLayoutEffect, useState, type RefObject } from 'react'
import type { PlayerRef } from '@remotion/player'
import { t } from '../../lib/i18n'
import { HEIGHT, WIDTH, type Platform } from '../../lib/editor/presets'

interface Props {
  player: RefObject<PlayerRef | null>
  host: RefObject<HTMLElement | null> // the element the overlay is positioned in
  platform: Platform
}

// Shades the parts of the video the platform's own buttons and text cover. It sits over the picture the player draws, which is
// the largest 9:16 box that fits the player's container, centred.
export function SafeZoneOverlay({ player, host, platform }: Props) {
  const [box, setBox] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  useLayoutEffect(() => {
    const node = player.current?.getContainerNode()
    const root = host.current
    if (!node || !root) return
    const measure = () => {
      const a = node.getBoundingClientRect()
      const r = root.getBoundingClientRect()
      const scale = Math.min(a.width / WIDTH, a.height / HEIGHT)
      const width = WIDTH * scale
      const height = HEIGHT * scale
      setBox({ left: a.left - r.left + (a.width - width) / 2, top: a.top - r.top + (a.height - height) / 2, width, height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    ro.observe(root)
    return () => ro.disconnect()
  }, [player, host])
  if (!box) return null
  const z = platform.zone
  const label = t('editor.exp.safeLabel', { platform: platform.label })
  return (
    <div className="cv-ed-safe" data-testid="safe-zone" style={box} aria-hidden="true">
      <div style={{ left: 0, top: 0, width: '100%', height: `${z.top * 100}%` }}>{label}</div>
      <div style={{ left: 0, bottom: 0, width: '100%', height: `${z.bottom * 100}%` }}>{label}</div>
      <div style={{ right: 0, top: `${z.top * 100}%`, bottom: `${z.bottom * 100}%`, width: `${z.right * 100}%` }} />
    </div>
  )
}
