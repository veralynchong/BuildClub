// The play-mark search loader: the pure parts (tile set, progress estimate, timings), kept apart from React and
// the canvas so they can be unit-tested. Spec: docs/design-review/remake-review/remake-mark/loading.html (approved
// 4 Nov 2026), built from the landing hero's tiles ("play", seed 11). Only the estimated fill model is used:
// the backend reports no progress yet.

// Colour keys, resolved to the six-colour palette (navy, blue, mustard, beige, black, white) when drawing.
export type MarkColour = 'navy' | 'blue' | 'mustard' | 'beige' | 'black' | 'white'

export interface MarkTile {
  c: number // column and row on the 16px tile grid
  r: number
  bg: MarkColour
  fg: MarkColour | null // the little glyph (a bar and a dot); loose pixels have none
  sx: number // where it flies in from (and scatters back to)
  sy: number
  t: number // the hero's per-tile delay, used as the arrival order
  hit: boolean // one of the three tiles that turn mustard when the results arrive
  s: number // tile size in canvas pixels
  loose?: boolean
}

export interface MarkTiles {
  T: number
  tiles: MarkTile[]
  core: MarkTile[]
  loose: MarkTile[]
}

// Per-tile flight: cubic ease-out over 415ms (0.3 of the hero's 1.8s over its 1.3 timeline).
export const FLY_MS = 415
// Results arrive: the rest snap in over 260ms, the three tiles turn mustard at 560ms, scatter starts 700ms later
// and lasts 600ms. About 2 seconds in all.
export const SNAP_MS = 260
export const MUSTARD_AT_MS = 560
export const SCATTER_DELAY_MS = 700
export const SCATTER_MS = 600
export const RESOLVE_MS = MUSTARD_AT_MS + SCATTER_DELAY_MS + SCATTER_MS
// Reduced motion: no scatter; the mustard tiles show briefly, then the results replace the card.
export const RESOLVE_MS_REDUCED = 200
// Results faster than this count as instant (a cached repeat): no resolve, nothing waits for the animation.
export const INSTANT_MS = 1500
// The first step ("Sending the search") lasts 3 seconds, as the card's checklist already assumes.
export const SENDING_S = 3
// After a minute the mark holds nearly full and the newest tiles shimmer slowly.
export const HOLD_S = 60
export const SHIMMER_MS = 420

export const easeOutCubic = (q: number) => 1 - Math.pow(1 - q, 3)

// Estimated fill (model b): nothing while sending, then eases toward 90% over about a minute. It never
// completes on its own; only the results finish the mark.
export const estimate = (s: number) => (s < SENDING_S ? 0 : 0.9 * (1 - Math.exp(-(s - SENDING_S) / 24)))

// Loose pixels drift in during the first 3 seconds, up to 60% of them; the rest come with the results.
export const looseFraction = (s: number) => Math.min(1, Math.max(0, s) / SENDING_S) * 0.6

// Only a search that took a while gets the ~2s resolve; an instant (cached) one shows its results at once.
export const shouldPlayResolve = (elapsedMs: number, hidden = false) => !hidden && elapsedMs >= INSTANT_MS

export const resolveMs = (reduced: boolean) => (reduced ? RESOLVE_MS_REDUCED : RESOLVE_MS)

// The hero's Park–Miller generator, so the same seed gives the same tiles as the landing mark.
export function makeRng(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

// How much of a grid cell sits inside the play triangle: 1 inside, 0.4 on the soft edge, 0 outside.
export function inTri(c: number, r: number, cols: number, rows: number) {
  const u = (c + 0.5) / cols
  const v = (r + 0.5) / rows
  const xL = 0.12
  const xR = 0.92
  if (u < xL || u > xR) return 0
  const half = 0.46 * (1 - (u - xL) / (xR - xL))
  const dv = Math.abs(v - 0.5)
  return dv < half ? 1 : dv < half + 0.06 ? 0.4 : 0
}

const BGS: MarkColour[] = ['navy', 'blue', 'navy', 'beige', 'black']
const FGS: MarkColour[] = ['white', 'mustard', 'beige', 'blue']

// The tile set, generated exactly as the hero's Concept C thumbs() ('play', seed 11). The order of the random
// draws matters: it is the hero's own.
export function makeTiles(W: number, H: number): MarkTiles {
  const T = 16
  const cols = Math.floor(W / T)
  const rows = Math.floor(H / T)
  const rnd = makeRng(11)
  const tiles: MarkTile[] = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const k = inTri(c, r, cols, rows)
      if (k && rnd() < (k === 1 ? 0.93 : 0.35)) {
        const bg = BGS[Math.floor(rnd() * 5)]
        const fg = FGS[Math.floor(rnd() * 4)]
        const sx = rnd() * W
        const sy = rnd() * H
        const t = rnd() * 0.7
        const s = rnd() < 0.18 ? 10 : 14
        tiles.push({ c, r, bg, fg, sx, sy, t, hit: false, s })
      }
    }
  for (let i = 0; i < 60; i++) {
    const c = Math.floor(rnd() * cols)
    const r = Math.floor(rnd() * rows)
    if (!inTri(c, r, cols, rows)) {
      const bg: MarkColour = rnd() < 0.5 ? 'navy' : 'black'
      const sx = rnd() * W
      const sy = rnd() * H
      const t = rnd() * 0.9
      const s = [4, 6, 8][Math.floor(rnd() * 3)]
      tiles.push({ c, r, bg, fg: null, sx, sy, t, hit: false, s, loose: true })
    }
  }
  const core = tiles.filter((t) => !t.loose)
  for (const f of [0.15, 0.48, 0.81]) {
    const t = core[Math.floor(f * core.length)]
    if (t) t.hit = true
  }
  return { T, tiles, core, loose: tiles.filter((t) => t.loose) }
}

// Arrival order: the hero's own per-tile delay; with reduced motion, bottom row first, like a progress bar.
export function arrivalOrder(core: MarkTile[], reduced: boolean) {
  return reduced ? [...core].sort((a, b) => b.r - a.r || a.c - b.c) : [...core].sort((a, b) => a.t - b.t)
}

export interface TickerCell {
  c: number
  r: number
  k: number
  col: MarkColour
}

// The 16px sidebar ticker: the play shape on an 8 × 8 grid of 2px cells, navy and blue, in a fixed fill order
// (bottom row first with reduced motion).
export function tickerCells(reduced: boolean): TickerCell[] {
  const N = 8
  const rnd = makeRng(3)
  const cells: TickerCell[] = []
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if (inTri(c, r, N, N) === 1) {
        const k = rnd()
        const col: MarkColour = rnd() < 0.4 ? 'blue' : 'navy'
        cells.push({ c, r, k, col })
      }
  return reduced ? cells.sort((a, b) => b.r - a.r || a.c - b.c) : cells.sort((a, b) => a.k - b.k)
}
