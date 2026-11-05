import { useEffect, useRef } from 'react'
import {
  FLY_MS, HOLD_S, MUSTARD_AT_MS, SCATTER_DELAY_MS, SCATTER_MS, SHIMMER_MS, SNAP_MS,
  arrivalOrder, easeOutCubic, estimate, looseFraction, makeTiles, tickerCells,
  type MarkColour, type MarkTile,
} from '../lib/playMark'
import { usePrefersReducedMotion } from '../lib/motion'

// Canvas size in pixels; CSS scales it down (260 × 272 on the card, 180 × 188 on a phone), kept crisp with
// image-rendering: pixelated. 440 × 460 gives the hero's 27 × 28 grid of 16px tiles.
const W = 440
const H = 460
const PAST = -1e9 // "landed long ago": drawn in place with no flight

type Palette = Record<MarkColour, string>

// The six palette colours, read once from the loader's CSS tokens (playmark.css).
function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el)
  const v = (name: string, fallback: string) => cs.getPropertyValue(name).trim() || fallback
  return {
    navy: v('--pm-navy', '#060a47'),
    blue: v('--pm-blue', '#1a33f2'),
    mustard: v('--pm-mustard', '#f2b705'),
    beige: v('--pm-beige', '#f6f1e7'),
    black: v('--pm-black', '#000000'),
    white: v('--pm-white', '#ffffff'),
  }
}

interface Live extends MarkTile {
  arr: number | null // when it starts its flight (performance.now time); null = not yet sent
  fgNow: MarkColour | null
}

// The mark on the search loading card. It fills from the search's own start time (so leaving the page and
// coming back shows the same progress), never empties or restarts while mounted, and plays the resolve once
// when `resolvedAt` is set. All drawing happens on a canvas in requestAnimationFrame, outside React.
export function PlayMarkLoader({ startedAt, resolvedAt }: { startedAt: number; resolvedAt: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const startRef = useRef(startedAt)
  const resolveRef = useRef(resolvedAt)
  const kickRef = useRef<() => void>(() => {})
  useEffect(() => {
    startRef.current = startedAt
    resolveRef.current = resolvedAt
  }, [startedAt, resolvedAt])

  useEffect(() => {
    const cv = canvas.current
    const x = cv?.getContext('2d')
    if (!cv || !x) return
    const K = readPalette(cv)
    const set = makeTiles(W, H)
    const tiles = set.tiles as Live[]
    tiles.forEach((t) => {
      t.arr = null
      t.fgNow = t.fg
    })
    const core = set.core as Live[]
    const loose = set.loose as Live[]
    const order = arrivalOrder(core, reduced) as Live[]
    const T = set.T
    let landed = 0
    let loosed = 0
    let shown = 0 // highest fill so far: the mark never goes backwards (a pasted link hands over to its search)
    let resolved = 0 // when the mustard tiles light (0 = not resolving)
    let scatterAt = 0
    let busyUntil = 0 // tiles are in flight (or scattering) until this time
    let lastShim = 0
    let first = true
    let dirty = true
    const newest: Live[] = []
    let raf = 0
    let timer = 0

    const send = (t: Live, at: number) => {
      t.arr = at
      busyUntil = Math.max(busyUntil, at + FLY_MS)
      dirty = true
    }
    // On the first frame anything already due lands in place, so coming back mid-search doesn't replay it all.
    const arrival = (now: number) => (reduced || first ? PAST : now)
    const setLoose = (f: number, now: number) => {
      const n = Math.round(f * loose.length)
      while (loosed < n) send(loose[loosed++], arrival(now))
    }
    const setProgress = (f: number, now: number) => {
      const n = Math.min(order.length, Math.round(f * order.length))
      while (landed < n) {
        const t = order[landed++]
        send(t, first || reduced ? PAST : now + (landed % 3) * 40)
        newest.push(t)
        if (newest.length > 8) newest.shift()
      }
    }
    // Results: the rest snap in, three turn mustard, then the mark scatters.
    const resolve = (now: number) => {
      setLoose(1, now)
      const left = order.length - landed
      let i = 0
      while (landed < order.length) send(order[landed++], reduced ? PAST : now + (i++ / Math.max(1, left)) * SNAP_MS)
      resolved = now + (reduced ? 0 : MUSTARD_AT_MS)
      scatterAt = reduced ? 0 : resolved + SCATTER_DELAY_MS
      busyUntil = Math.max(busyUntil, scatterAt + SCATTER_MS, resolved)
      dirty = true
    }
    // A long wait: one of the newest tiles' glyphs swaps to beige and back, slowly.
    const shimmer = () => {
      if (!newest.length) return
      const t = newest[Math.floor(Math.random() * newest.length)]
      if (t.fg) t.fgNow = t.fgNow === 'beige' ? t.fg : 'beige'
      dirty = true
    }

    const draw = (now: number) => {
      x.clearRect(0, 0, W, H)
      const sc = scatterAt && now > scatterAt ? Math.min(1, (now - scatterAt) / SCATTER_MS) : 0
      // Empty slots: the faint outline of the mark, beige squares where tiles will land.
      if (!sc) {
        x.fillStyle = K.beige
        for (const t of core)
          if (t.arr === null || now - t.arr < FLY_MS) x.fillRect(t.c * T + (T - t.s) / 2, t.r * T + (T - t.s) / 2, t.s, t.s)
      }
      const hitOn = resolved && now >= resolved
      if (sc) x.globalAlpha = 1 - sc
      for (const t of tiles) {
        if (t.arr === null) continue
        const q = Math.max(0, Math.min(1, (now - t.arr) / FLY_MS))
        if (q <= 0) continue
        const tx = t.c * T + (T - t.s) / 2
        const ty = t.r * T + (T - t.s) / 2
        const e = sc ? 1 - sc * sc : easeOutCubic(q) // scatter: back out toward where it came from
        const X = Math.round(t.sx + (tx - t.sx) * e)
        const Y = Math.round(t.sy + (ty - t.sy) * e)
        const hit = t.hit && hitOn && q >= 1
        x.fillStyle = hit ? K.mustard : K[t.bg]
        x.fillRect(X, Y, t.s, t.s)
        if (t.fgNow && t.s >= 10) {
          x.fillStyle = hit ? K.black : K[t.fgNow]
          x.fillRect(X + 3, Y + t.s - 6, t.s - 6, 2)
          x.fillRect(X + (t.s >> 1) - 1, Y + 3, 3, 3)
        }
      }
      x.globalAlpha = 1
    }

    const step = () => {
      raf = 0
      timer = 0
      const now = performance.now()
      const resolvedAt = resolveRef.current
      const s = ((resolvedAt ?? Date.now()) - startRef.current) / 1000
      if (!resolved) {
        setLoose(looseFraction(s), now)
        if (resolvedAt != null) resolve(now)
        else {
          shown = Math.max(shown, estimate(s))
          setProgress(shown, now)
          if (s > HOLD_S && !reduced && now - lastShim > SHIMMER_MS) {
            lastShim = now
            shimmer()
          }
        }
      }
      first = false
      const busy = now < busyUntil
      if (dirty || busy) draw(now)
      dirty = false
      // The scatter is the end: nothing more to draw. Otherwise animate while busy, and check back a few
      // times a second while idle (no per-frame work between tiles).
      if (resolved && !busy) return
      if (busy) raf = requestAnimationFrame(step)
      else timer = window.setTimeout(step, s > HOLD_S && !reduced ? SHIMMER_MS : 120)
    }
    raf = requestAnimationFrame(step)
    // A resolve that starts while idle shouldn't wait for the next check.
    const kick = () => {
      if (timer) {
        clearTimeout(timer)
        timer = 0
        raf = requestAnimationFrame(step)
      }
    }
    kickRef.current = kick
    return () => {
      kickRef.current = () => {}
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [reduced])

  // Tell an idle loop that the results are in, so the resolve starts on the next frame.
  useEffect(() => {
    if (resolvedAt != null) kickRef.current()
  }, [resolvedAt])

  return <canvas ref={canvas} className="pm-mark" width={W} height={H} aria-hidden="true" />
}

// The 16px play mark beside "Find ideas" in the sidebar: the same shape as 2px cells, beige until filled, then
// navy and blue. It redraws when the parent's seconds tick (once a second), so it needs no animation loop.
export function PlayMarkTicker({ startedAt, seconds }: { startedAt: number; seconds: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const reduced = usePrefersReducedMotion()
  const shown = useRef(0)
  useEffect(() => {
    const cv = canvas.current
    const x = cv?.getContext('2d')
    if (!cv || !x) return
    const K = readPalette(cv)
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    if (cv.width !== 16 * dpr) cv.width = cv.height = 16 * dpr
    const cells = tickerCells(reduced)
    shown.current = Math.max(shown.current, estimate((Date.now() - startedAt) / 1000))
    const n = Math.round(shown.current * cells.length)
    const size = 2 * dpr
    x.clearRect(0, 0, cv.width, cv.height)
    cells.forEach((cl, i) => {
      x.fillStyle = i < n ? K[cl.col] : K.beige
      x.fillRect(cl.c * size, cl.r * size, size, size)
    })
  }, [startedAt, seconds, reduced])
  return <canvas ref={canvas} className="pm-ticker" width={16} height={16} aria-hidden="true" />
}
