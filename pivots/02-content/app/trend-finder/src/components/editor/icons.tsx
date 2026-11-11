// The editor's icons: 16 px, 1.5 px strokes in currentColor, drawn by hand so no icon package is needed.
import type { ReactNode, SVGProps } from 'react'

export type IconName =
  | 'back' | 'play' | 'pause' | 'toStart' | 'toEnd' | 'stepBack' | 'stepFwd' | 'loop' | 'volume' | 'volumeOff'
  | 'eye' | 'eyeOff' | 'magnet' | 'fullscreen' | 'zoomIn' | 'zoomOut' | 'fit' | 'upload' | 'film' | 'sparkles'
  | 'text' | 'captions' | 'mic' | 'music' | 'brand' | 'speed' | 'scissors' | 'trash' | 'undo' | 'redo' | 'export'
  | 'check' | 'alert' | 'safe' | 'chevronDown'

const PATHS: Record<IconName, ReactNode> = {
  back: <path d="M10 3.5 5.5 8l4.5 4.5" />,
  play: <path d="M5 3.2v9.6L12.6 8z" fill="currentColor" stroke="none" />,
  pause: <><rect x="4" y="3.5" width="2.6" height="9" rx=".6" fill="currentColor" stroke="none" /><rect x="9.4" y="3.5" width="2.6" height="9" rx=".6" fill="currentColor" stroke="none" /></>,
  toStart: <><path d="M3.5 3.5v9" /><path d="M12.5 3.5v9L6 8z" fill="currentColor" stroke="none" /></>,
  toEnd: <><path d="M12.5 3.5v9" /><path d="M3.5 3.5v9L10 8z" fill="currentColor" stroke="none" /></>,
  stepBack: <><path d="M5 4v8" /><path d="M12 4v8L6.5 8z" fill="currentColor" stroke="none" /></>,
  stepFwd: <><path d="M11 4v8" /><path d="M4 4v8L9.5 8z" fill="currentColor" stroke="none" /></>,
  loop: <><path d="M3 7.5V7a2.5 2.5 0 0 1 2.5-2.5h7" /><path d="m10.5 2.5 2 2-2 2" /><path d="M13 8.5V9a2.5 2.5 0 0 1-2.5 2.5h-7" /><path d="m5.5 13.5-2-2 2-2" /></>,
  volume: <><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" /><path d="M11 5.5a3.5 3.5 0 0 1 0 5" /><path d="M12.8 3.6a6 6 0 0 1 0 8.8" /></>,
  volumeOff: <><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z" /><path d="m11 6 3.5 4M14.5 6 11 10" /></>,
  eye: <><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" /><circle cx="8" cy="8" r="2" /></>,
  eyeOff: <><path d="M6.2 3.8A6.6 6.6 0 0 1 8 3.5C12 3.5 14.5 8 14.5 8a11 11 0 0 1-1.9 2.4M10 11.9a6 6 0 0 1-2 .6C4 12.5 1.5 8 1.5 8a11 11 0 0 1 2.4-2.9" /><path d="m2 2 12 12" /></>,
  magnet: <><path d="M3.5 3v5a4.5 4.5 0 0 0 9 0V3" /><path d="M3.5 3h3v5a1.5 1.5 0 0 0 3 0V3h3" /><path d="M3.5 5.5h3M9.5 5.5h3" /></>,
  fullscreen: <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />,
  zoomIn: <><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3M5 7h4M7 5v4" /></>,
  zoomOut: <><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3M5 7h4" /></>,
  fit: <><path d="M2.5 8h11" /><path d="m5 5.5-2.5 2.5L5 10.5M11 5.5l2.5 2.5-2.5 2.5" /></>,
  upload: <><path d="M8 10.5V2.5M5 5.5l3-3 3 3" /><path d="M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" /></>,
  film: <><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 3v10M11 3v10M2 6h3M2 10h3M11 6h3M11 10h3" /></>,
  sparkles: <><path d="M6.5 2.5 7.6 5.9 11 7l-3.4 1.1L6.5 11.5 5.4 8.1 2 7l3.4-1.1z" /><path d="M12 9.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5z" /></>,
  text: <path d="M3 4V3h10v1M8 3v10M6 13h4" />,
  captions: <><rect x="1.5" y="3" width="13" height="10" rx="1.5" /><path d="M7 6.6a1.8 1.8 0 1 0 0 2.8M12 6.6a1.8 1.8 0 1 0 0 2.8" /></>,
  mic: <><rect x="5.5" y="1.5" width="5" height="8" rx="2.5" /><path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2" /></>,
  music: <><path d="M6 12V3.5l7-1.5V10.5" /><circle cx="4.5" cy="12" r="1.5" /><circle cx="11.5" cy="10.5" r="1.5" /></>,
  brand: <><path d="M8 1.5 14.5 8 8 14.5 1.5 8z" /><circle cx="8" cy="8" r="1.5" /></>,
  speed: <><path d="M2.5 11a5.5 5.5 0 1 1 11 0" /><path d="m8 11 2.5-3" /></>,
  scissors: <><circle cx="4" cy="4.5" r="1.8" /><circle cx="4" cy="11.5" r="1.8" /><path d="M5.6 5.5 13.5 12M5.6 10.5 13.5 4" /></>,
  trash: <><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.7 9h6.6l.7-9" /></>,
  undo: <><path d="M5.5 3 2.5 6l3 3" /><path d="M2.5 6h7a3.5 3.5 0 0 1 0 7H6" /></>,
  redo: <><path d="m10.5 3 3 3-3 3" /><path d="M13.5 6h-7a3.5 3.5 0 0 0 0 7H10" /></>,
  export: <><path d="M8 2v8M5 5l3-3 3 3" /><path d="M3 9v4.5h10V9" /></>,
  check: <path d="m3 8.5 3 3 7-7" />,
  alert: <><path d="M8 2 14.5 13.5h-13z" /><path d="M8 6.5v3M8 11.5v.01" /></>,
  safe: <><rect x="3.5" y="1.5" width="9" height="13" rx="1.5" /><path d="M5.5 4h5M5.5 12h5" strokeDasharray="1.5 1.5" /></>,
  chevronDown: <path d="m4 6 4 4 4-4" />,
}

export function Icon({ name, size = 16, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>
      {PATHS[name]}
    </svg>
  )
}
