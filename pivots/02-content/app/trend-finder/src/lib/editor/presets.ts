// Export presets (all 1080 x 1920) and the safe-zone check. Platforms put their own buttons, caption and account line over
// the video; keep anything important out of those parts.
import type { TikTokPage } from '@remotion/captions'
import type { EditProject, ExportPreset, ExportSettings, TextItem } from './types.ts'

export const WIDTH = 1080
export const HEIGHT = 1920

export interface Platform {
  label: string
  maxSeconds: number // a longer video gets a warning
  // The part of the frame (as a share of its height or width) the platform's own interface covers. These numbers are
  // APPROXIMATE, from the apps as of late 2026; the platforms move their buttons from time to time. Adjust them here.
  zone: { top: number; bottom: number; right: number }
}

export const PLATFORMS: Record<ExportPreset, Platform> = {
  tiktok: { label: 'TikTok', maxSeconds: 600, zone: { top: 0.1, bottom: 0.2, right: 0.12 } },
  reels: { label: 'Instagram Reels', maxSeconds: 180, zone: { top: 0.14, bottom: 0.22, right: 0.1 } },
  shorts: { label: 'YouTube Shorts', maxSeconds: 180, zone: { top: 0.1, bottom: 0.22, right: 0.14 } },
}
export const PRESETS = Object.keys(PLATFORMS) as ExportPreset[]
export const DEFAULT_EXPORT: ExportSettings = { preset: 'tiktok', loudnorm: true }

export const exportSettings = (p: Pick<EditProject, 'export'>): ExportSettings => ({ ...DEFAULT_EXPORT, ...p.export })

export type Side = 'top' | 'bottom' | 'right'
export interface ZoneWarning {
  kind: 'text' | 'caption'
  side: Side
  count: number
  at: number // seconds on the timeline of the first one, to look at it
}

// How the reel draws words (src/remotion/Reel.tsx): a 940 px column from x = 70.
const COLUMN = 940
const TEXT = { size: 96, line: 1.25 }
const CAPTION = { size: 56, line: 1.25, bottom: 1460 }
const TEXT_TOP = 220
const TEXT_BOTTOM = 1300
const CJK = /[\u3000-\u9fff\uff00-\uffef]/

// A line's width: a Chinese character is as wide as the font is tall, other letters about 0.55 of it.
function lineWidth(line: string, size: number): number {
  let w = 0
  for (const ch of line) w += CJK.test(ch) ? size : size * 0.55
  return w
}

// The box words take: width (up to the column) and height of their lines, wrapped at the column.
export function wordsBox(text: string, size: number, line: number): { w: number; h: number } {
  const lines = text.split('\n')
  const widest = Math.max(...lines.map((l) => lineWidth(l, size)))
  const rows = lines.reduce((n, l) => n + Math.max(1, Math.ceil(lineWidth(l, size) / COLUMN)), 0)
  return { w: Math.min(COLUMN, widest), h: rows * size * line }
}

interface Box { kind: 'text' | 'caption'; at: number; x1: number; y0: number; y1: number }

function textBox(x: TextItem): Box {
  const { w, h } = wordsBox(x.text, TEXT.size, TEXT.line)
  const y0 = x.position === 'top' ? TEXT_TOP : x.position === 'bottom' ? TEXT_BOTTOM - h : (HEIGHT - h) / 2
  return { kind: 'text', at: x.start, x1: WIDTH / 2 + w / 2, y0, y1: y0 + h }
}

function captionBox(pg: TikTokPage): Box {
  const { w, h } = wordsBox(pg.text, CAPTION.size, CAPTION.line)
  return { kind: 'caption', at: pg.startMs / 1000, x1: WIDTH / 2 + w / 2, y0: CAPTION.bottom - h, y1: CAPTION.bottom }
}

// The texts and caption pages that reach into the part of the frame the platform covers.
export function safeZoneWarnings(project: Pick<EditProject, 'texts'>, pages: readonly TikTokPage[], preset: ExportPreset): ZoneWarning[] {
  const z = PLATFORMS[preset].zone
  const boxes = [...project.texts.map(textBox), ...pages.map(captionBox)]
  const hits = (side: Side, test: (b: Box) => boolean, kind: Box['kind']): ZoneWarning | null => {
    const inside = boxes.filter((b) => b.kind === kind && test(b))
    return inside.length ? { kind, side, count: inside.length, at: Math.min(...inside.map((b) => b.at)) } : null
  }
  const out: ZoneWarning[] = []
  for (const kind of ['text', 'caption'] as const) {
    for (const w of [
      hits('top', (b) => b.y0 < z.top * HEIGHT, kind),
      hits('bottom', (b) => b.y1 > (1 - z.bottom) * HEIGHT, kind),
      hits('right', (b) => b.x1 > (1 - z.right) * WIDTH, kind),
    ]) if (w) out.push(w)
  }
  return out
}

// Over the platform's length limit (seconds over), or 0.
export const secondsOver = (seconds: number, preset: ExportPreset): number => Math.max(0, seconds - PLATFORMS[preset].maxSeconds)
