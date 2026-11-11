// What the video lane draws on a clip besides its name: the AI clean-up markers, the filmstrip and the waveform. Pure
// functions, so the unit tests can check them; Timeline only draws what these return.
import type { Clip } from './types.ts'
import type { CleanupItem } from './aiApi.ts'
import { FPS } from './timeline.ts'

// The most air the clean-up keeps around a cut (suggest.py PAD_MAX). A suggestion cut off by a clip edge with no more
// than this left showing is the air an applied cut left behind, so it is not offered again.
export const LEFTOVER = 10 / FPS + 1e-3

export type Mark = {
  key: string // `${takeId}:${item.id}`, what Keep remembers
  item: CleanupItem
  from: number // timeline seconds of the part that shows
  to: number
}

// The clean-up suggestions of a clip's take that show inside the clip, on the timeline. `start` is where the clip starts on
// the timeline; only the part of each suggestion inside the clip's in/out shows. Dismissed keys are left out.
export function clipMarks(clip: Pick<Clip, 'in' | 'out' | 'source'>, start: number, items: CleanupItem[], dismissed: ReadonlySet<string> = new Set()): Mark[] {
  const out: Mark[] = []
  for (const item of items) {
    const key = `${clip.source.id}:${item.id}`
    if (dismissed.has(key)) continue
    const a = Math.max(item.start, clip.in)
    const b = Math.min(item.end, clip.out)
    if (b - a <= 1e-6) continue
    const cutOff = item.start < clip.in - 1e-6 || item.end > clip.out + 1e-6
    if (cutOff && b - a <= LEFTOVER) continue
    out.push({ key, item, from: start + a - clip.in, to: start + b - clip.in })
  }
  return out
}

// ---- waveform ----

export type Peaks = { rate: number; values: number[] } // loudest sample per 1/rate second, 0 to 1

// The loudest peak in each of `columns` equal slices of [from, to] seconds of the source; 0 where there is no sound data.
export function peaksSpan(peaks: Peaks, from: number, to: number, columns: number): number[] {
  const n = Math.max(0, Math.floor(columns))
  const out = new Array<number>(n).fill(0)
  if (n === 0 || to <= from || peaks.rate <= 0) return out
  const per = (to - from) / n
  for (let c = 0; c < n; c++) {
    const lo = Math.floor((from + c * per) * peaks.rate)
    const hi = Math.max(lo + 1, Math.ceil((from + (c + 1) * per) * peaks.rate))
    let m = 0
    for (let i = Math.max(0, lo); i < Math.min(hi, peaks.values.length); i++) if (peaks.values[i] > m) m = peaks.values[i]
    out[c] = m
  }
  return out
}

// One closed SVG path of the columns mirrored around the middle, in a box `columns` wide and 100 high (the SVG stretches
// it). `gain` is the clip's volume (0 to 2); a column never goes past the box.
export function waveformPath(cols: number[], gain = 1): string {
  if (cols.length === 0) return ''
  const h = (v: number) => Math.min(50, Math.max(0.6, v * gain * 50))
  const top = cols.map((v, i) => `${i},${(50 - h(v)).toFixed(1)} ${i + 1},${(50 - h(v)).toFixed(1)}`)
  const bottom = cols.map((v, i) => `${i + 1},${(50 + h(v)).toFixed(1)} ${i},${(50 + h(v)).toFixed(1)}`).reverse()
  return `M0,50 L${top.join(' ')} L${bottom.join(' ')} Z`
}

// Peaks from decoded samples (-1 to 1), `rate` buckets a second; used for the music file, which the browser decodes.
export function peaksFromSamples(samples: ArrayLike<number>, sampleRate: number, rate: number): Peaks {
  const size = Math.max(1, Math.floor(sampleRate / rate))
  const values: number[] = []
  for (let i = 0; i < samples.length; i += size) {
    let m = 0
    const end = Math.min(samples.length, i + size)
    for (let k = i; k < end; k++) {
      const v = Math.abs(samples[k])
      if (v > m) m = v
    }
    values.push(Math.round(Math.min(1, m) * 100) / 100)
  }
  return { rate, values }
}

// ---- filmstrip ----

export type Tile = { left: number; width: number; n: number } // px inside the clip, and which thumbnail

// Thumbnails tiled across a clip `widthPx` wide showing [from, to] of its source: each tile shows the thumbnail taken
// nearest the moment under its middle. `times` are when each thumbnail was taken.
export function filmTiles(times: number[], from: number, to: number, widthPx: number, tileW: number): Tile[] {
  if (times.length === 0 || widthPx <= 0 || tileW <= 0 || to <= from) return []
  const count = Math.ceil(widthPx / tileW)
  const out: Tile[] = []
  for (let i = 0; i < count; i++) {
    const left = i * tileW
    const width = Math.min(tileW, widthPx - left)
    const at = from + ((left + width / 2) / widthPx) * (to - from)
    let n = 0
    for (let k = 1; k < times.length; k++) if (Math.abs(times[k] - at) < Math.abs(times[n] - at)) n = k
    out.push({ left, width, n })
  }
  return out
}

// ---- first-cut pins ----

export type Pin = { at: number; lines: string[]; cut: boolean } // timeline seconds; `cut` when a line removed something

// "Why these cuts" lines grouped by where they point, so lines about the same moment share one pin.
export function groupPins(entries: { at: number; text: string; kind: string }[]): Pin[] {
  const by = new Map<number, Pin>()
  for (const e of entries) {
    const at = Math.round(e.at * 20) / 20
    const pin = by.get(at) ?? { at, lines: [], cut: false }
    pin.lines.push(e.text)
    if (e.kind === 'cut') pin.cut = true
    by.set(at, pin)
  }
  return [...by.values()].sort((a, b) => a.at - b.at)
}
