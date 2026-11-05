import type { Platform } from '../../types'

// The platform's mark in white line work, for the navy tile on each reference card.
export function PlatformGlyph({ platform, size = 22 }: { platform: Platform; size?: number }) {
  const common = { 'aria-hidden': true, width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (platform) {
    case 'tiktok':
      return (
        <svg {...common}>
          <path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5" />
          <path d="M14 4c.4 2.6 2.2 4.3 5 4.5" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" />
        </svg>
      )
    case 'instagram':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.6" />
          <circle cx="16.8" cy="7.2" r=".9" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'reddit':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="14" rx="7.5" ry="5" />
          <path d="M12 9l1.5-5 4 1" />
          <circle cx="9.3" cy="13.5" r=".8" fill="currentColor" stroke="none" />
          <circle cx="14.7" cy="13.5" r=".8" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      )
  }
}
