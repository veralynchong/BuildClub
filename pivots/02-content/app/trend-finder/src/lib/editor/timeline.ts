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

// ---- editing: every function returns a new project and leaves its input alone ----
// Times are kept on whole frames (1/30 s) so a trim can never land a hair under MIN_CLIP (F9).
const MIN_F = Math.round(MIN_CLIP * FPS)
const MAX_F = MAX_TOTAL * FPS
const frames = (sec: number): number => Math.round(sec * FPS)
const floorFrames = (sec: number): number => Math.floor(sec * FPS + 1e-6)
const secs = (f: number): number => f / FPS
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const withClips = (p: EditProject, clips: Clip[]): EditProject => ({ ...p, clips })
const totalFrames = (p: EditProject): number => p.clips.reduce((sum, c) => sum + frames(clipLength(c)), 0)

export function insertClip(p: EditProject, src: ClipSource, duration: number, index: number, id: string): EditProject {
  const room = MAX_F - totalFrames(p)
  const len = Math.min(floorFrames(duration), room)
  if (len < MIN_F) return p // too little room (or a source too short) counts as full (F10)
  const clip: Clip = { id, source: src, in: 0, out: secs(len), volume: 1, muted: false }
  const at = clamp(index, 0, p.clips.length)
  return withClips(p, [...p.clips.slice(0, at), clip, ...p.clips.slice(at)])
}

export function trimClip(p: EditProject, clipId: string, edge: 'in' | 'out', value: number, sourceDuration: number): EditProject {
  const i = p.clips.findIndex((c) => c.id === clipId)
  if (i < 0) return p
  const c = p.clips[i]
  const cin = frames(c.in)
  const cout = frames(c.out)
  const maxLen = MAX_F - (totalFrames(p) - (cout - cin)) // longest this clip may be
  const v = frames(value)
  let nin = cin
  let nout = cout
  if (edge === 'in') {
    const lo = Math.max(0, cout - maxLen)
    const hi = cout - MIN_F
    if (lo > hi) return p
    nin = clamp(v, lo, hi)
  } else {
    const lo = cin + MIN_F
    const hi = Math.min(floorFrames(sourceDuration), cin + maxLen)
    if (lo > hi) return p
    nout = clamp(v, lo, hi)
  }
  if (nin === cin && nout === cout) return p
  return withClips(p, p.clips.map((x, k) => (k === i ? { ...x, in: secs(nin), out: secs(nout) } : x)))
}

// Cut the clip under the playhead `t` (timeline seconds) in two; the second half gets `newId`.
export function splitAt(p: EditProject, t: number, newId: string): EditProject {
  const starts = clipStarts(p)
  const i = p.clips.findIndex((c, k) => t >= starts[k] && t < starts[k] + clipLength(c))
  if (i < 0) return p
  const c = p.clips[i]
  const at = frames(c.in + (t - starts[i]))
  if (at - frames(c.in) < MIN_F || frames(c.out) - at < MIN_F) return p
  const { caption: _caption, ...rest } = c
  void _caption
  const first: Clip = { ...c, out: secs(at) }
  const second: Clip = { ...rest, id: newId, in: secs(at) }
  return withClips(p, [...p.clips.slice(0, i), first, second, ...p.clips.slice(i + 1)])
}

export function removeClip(p: EditProject, clipId: string): EditProject {
  if (!p.clips.some((c) => c.id === clipId)) return p
  return withClips(p, p.clips.filter((c) => c.id !== clipId))
}

export function moveClip(p: EditProject, from: number, to: number): EditProject {
  const n = p.clips.length
  if (from === to || from < 0 || from >= n || to < 0 || to >= n) return p
  const clips = [...p.clips]
  const [c] = clips.splice(from, 1)
  clips.splice(to, 0, c)
  return withClips(p, clips)
}

export function setClipAudio(p: EditProject, clipId: string, patch: { volume?: number; muted?: boolean }): EditProject {
  if (!p.clips.some((c) => c.id === clipId)) return p
  return withClips(
    p,
    p.clips.map((c) =>
      c.id === clipId
        ? { ...c, volume: patch.volume === undefined ? c.volume : clamp(patch.volume, 0, 2), muted: patch.muted ?? c.muted }
        : c,
    ),
  )
}

// Where a dragged clip lands: before the first clip whose left half holds x (px from the timeline start).
export function dropIndex(p: EditProject, x: number, pxPerSec: number): number {
  const starts = clipStarts(p)
  for (let i = 0; i < p.clips.length; i++) {
    if (x < (starts[i] + clipLength(p.clips[i]) / 2) * pxPerSec) return i
  }
  return p.clips.length
}

export function newClipId(p: EditProject): string {
  let max = 0
  for (const c of p.clips) {
    const m = /^c(\d+)$/.exec(c.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `c${max + 1}`
}
