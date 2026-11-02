// Pure timeline maths for the edit project. No remotion import: the Vite app and the unit tests use it too.
import type { Clip, ClipSource, EditProject } from './types.ts'

export const FPS = 30
export const MIN_CLIP = 0.2
export const MAX_TOTAL = 180

// Same key as backend/editing.py source_key.
export function sourceKey(src: Pick<ClipSource, 'kind' | 'id'>): string {
  return `${src.kind}:${src.id}`
}

export function clipLength(c: Clip): number {
  return c.out - c.in
}

export function totalLength(p: EditProject): number {
  return p.clips.reduce((sum, c) => sum + clipLength(c), 0)
}

// Start of each clip on the timeline, in seconds.
export function clipStarts(p: EditProject): number[] {
  const starts: number[] = []
  let at = 0
  for (const c of p.clips) {
    starts.push(at)
    at += clipLength(c)
  }
  return starts
}

export function toFrames(sec: number): number {
  return Math.round(sec * FPS)
}

export function reelDurationInFrames(p: EditProject): number {
  return Math.max(1, toFrames(totalLength(p)))
}

// Each clip ends where the next one starts (after rounding), and the last ends at the reel end,
// so rounding never leaves a one-frame gap or a one-frame overlap.
export function clipFrames(p: EditProject): { from: number; duration: number }[] {
  const total = reelDurationInFrames(p)
  const froms = clipStarts(p).map(toFrames)
  return froms.map((from, i) => {
    const end = i + 1 < froms.length ? froms[i + 1] : total
    return { from, duration: Math.max(1, end - from) }
  })
}
