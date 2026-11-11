// The multi-track timeline: which bars each lane shows, snapping, the time code and the ruler's ticks. Pure functions,
// so the unit tests can check them; the Timeline component only draws what these return.
import { clipLength, clipStarts, FPS, MIN_CLIP, removeClip, removeText, removeVoice, totalLength, updateText, updateVoice } from './timeline.ts'
import type { EditProject } from './types.ts'

export type LaneId = 'text' | 'captions' | 'video' | 'voice' | 'music'
// Top to bottom, like a pro editor: overlays above the footage, sound below it.
export const LANES: LaneId[] = ['text', 'captions', 'video', 'voice', 'music']

export type Bar = {
  id: string
  start: number // timeline seconds
  end: number
  label: string
  movable: boolean // can be dragged along the lane
  trimmable: boolean // its edges can be dragged
}

export type CaptionPageLike = { startMs: number; durationMs: number; text: string }

export interface LaneFacts {
  captionMode: 'lines' | 'voice' | 'speech'
  pages: CaptionPageLike[] // what the video shows as captions (lines and voice mode)
  voiceSeconds: Record<string, number> // each voiceover file's length, when known
  voiceLabel: (index: number) => string
  musicLabel: string | null // null: no music track
}

// The bars of every lane. Captions made from speech have their own times (editable); captions made from the shots' lines
// or the voiceover follow those, so they can be selected but not moved.
export function laneBars(p: EditProject, facts: LaneFacts): Record<LaneId, Bar[]> {
  const total = totalLength(p)
  const starts = clipStarts(p)
  const speech = facts.captionMode === 'speech'
  const captions: Bar[] = !p.captions.enabled
    ? []
    : speech
      ? (p.captions.speech ?? []).filter((e) => e.start < total).map((e) => ({ id: e.id, start: e.start, end: Math.min(e.end, total), label: e.text, movable: true, trimmable: true }))
      : facts.pages
          .map((pg, i) => ({ id: `page-${i}`, start: pg.startMs / 1000, end: Math.min((pg.startMs + pg.durationMs) / 1000, total), label: pg.text, movable: false, trimmable: false }))
          .filter((b) => b.start < total)
  return {
    text: p.texts.map((x) => ({ id: x.id, start: x.start, end: Math.min(x.end, Math.max(total, x.start)), label: x.text, movable: true, trimmable: true })),
    captions,
    video: p.clips.map((c, i) => ({ id: c.id, start: starts[i], end: starts[i] + clipLength(c), label: '', movable: true, trimmable: true })),
    voice: p.voiceover.map((v, i) => {
      const len = facts.voiceSeconds[v.id] ?? 0
      return { id: v.id, start: v.start, end: Math.min(v.start + (len > 0 ? len : 1), Math.max(total, v.start)), label: facts.voiceLabel(i), movable: true, trimmable: false }
    }),
    music: facts.musicLabel !== null && p.music ? [{ id: 'music', start: 0, end: total, label: facts.musicLabel, movable: false, trimmable: false }] : [],
  }
}

// ---- snapping ----
// Every edge a dragged edge may snap to: 0, the end, the playhead, and the edges of every other bar.
export function snapTargets(lanes: Record<LaneId, Bar[]>, playhead: number, total: number, skip: string | null): number[] {
  const out = new Set<number>([0, total, playhead])
  for (const lane of LANES) for (const b of lanes[lane]) if (b.id !== skip) {
    out.add(b.start)
    out.add(b.end)
  }
  return [...out].sort((a, b) => a - b)
}

// The nearest target within `threshold` seconds of `t`, else `t`.
export function snapTime(t: number, targets: number[], threshold: number): number {
  let best = t
  let gap = threshold
  for (const x of targets) {
    const d = Math.abs(x - t)
    if (d <= gap) {
      gap = d
      best = x
    }
  }
  return best
}

// A bar of `length` moved so it starts at `start`: whichever edge lands nearer a target snaps there, the length kept.
export function snapMove(start: number, length: number, targets: number[], threshold: number): number {
  const a = snapTime(start, targets, threshold)
  const endSnap = snapTime(start + length, targets, threshold)
  const aHit = a !== start
  const bHit = endSnap !== start + length
  if (!aHit && !bHit) return start
  if (!bHit) return a
  const b = endSnap - length
  if (!aHit) return b
  return Math.abs(a - start) <= Math.abs(b - start) ? a : b
}

// Pixels within which a drag snaps, as seconds at this zoom.
export const SNAP_PX = 8
// The timeline zoom range, in pixels per second.
export const MIN_PX = 10
export const MAX_PX = 240
export const snapThreshold = (pxPerSec: number): number => SNAP_PX / Math.max(pxPerSec, 1)

// ---- time code and ruler ----
// "00:41.04": minutes, seconds and the frame within the second.
export function timecode(frame: number, fps: number = FPS): string {
  const f = Math.max(0, Math.round(frame))
  const sec = Math.floor(f / fps)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}.${pad(f % fps)}`
}

// The labelled tick step (seconds) that leaves at least `minPx` between labels, and how many unlabelled ticks go between.
const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60]
export function tickStep(pxPerSec: number, minPx = 64): { major: number; minor: number } {
  const major = STEPS.find((s) => s * pxPerSec >= minPx) ?? STEPS[STEPS.length - 1]
  const minor = major >= 5 ? major / 5 : major / 2
  return { major, minor }
}

// The zoom (px per second) that fits `total` seconds into `width` pixels, within the slider's range.
export function fitZoom(total: number, width: number, min: number, max: number): number {
  if (total <= 0 || width <= 0) return min
  return Math.min(max, Math.max(min, Math.floor((width / total) * 10) / 10))
}

// Where the timeline should scroll so the playhead stays in view while playing: a page on when it runs off the right
// edge (or back when it is left of the view), else null (leave it).
export function followScroll(x: number, scrollLeft: number, width: number, margin = 24): number | null {
  if (x > scrollLeft + width - margin) return Math.max(0, x - margin)
  if (x < scrollLeft) return Math.max(0, x - margin)
  return null
}

// ---- editing a bar ----
const onFrame = (sec: number): number => Math.round(sec * FPS) / FPS

// A text, speech caption or voiceover put at [start, end] (seconds). Kept inside the video and at least MIN_CLIP long; a
// voiceover only moves (its length is its file's). Anything else (clips, pages made from lines, music) is left alone.
export function setBarTime(p: EditProject, lane: LaneId, id: string, start: number, end: number): EditProject {
  const total = totalLength(p)
  const len = Math.max(end - start, MIN_CLIP)
  let s = onFrame(Math.max(0, start))
  let e = onFrame(s + len)
  if (lane !== 'voice' && e > total + 1e-6) {
    // pushed past the end: keep the length and slide it back in
    e = onFrame(total)
    s = onFrame(Math.max(0, e - len))
  }
  if (lane === 'text') {
    const x = p.texts.find((t) => t.id === id)
    if (!x || (x.start === s && x.end === e)) return p
    return updateText(p, id, { start: s, end: e })
  }
  if (lane === 'captions') {
    const lines = p.captions.speech
    const x = lines?.find((c) => c.id === id)
    if (!lines || !x || (x.start === s && x.end === e)) return p
    return { ...p, captions: { ...p.captions, speech: lines.map((c) => (c.id === id ? { ...c, start: s, end: e } : c)) } }
  }
  if (lane === 'voice') {
    const v = p.voiceover.find((x) => x.id === id)
    if (!v || v.start === s) return p
    return updateVoice(p, id, { start: s })
  }
  return p
}

// Delete the selected bar: a clip, a text, a speech caption line or a voiceover. Music and line captions stay.
export function removeBar(p: EditProject, lane: LaneId, id: string): EditProject {
  if (lane === 'video') return removeClip(p, id)
  if (lane === 'text') return removeText(p, id)
  if (lane === 'voice') return removeVoice(p, id)
  if (lane === 'captions') {
    const lines = p.captions.speech
    if (!lines || !lines.some((c) => c.id === id)) return p
    return { ...p, captions: { ...p.captions, speech: lines.filter((c) => c.id !== id) } }
  }
  return p
}

// ---- hide and mute (preview only) ----
// The project the preview plays with some lanes hidden or muted. The saved project and the export never see this.
export function previewOf(p: EditProject, hidden: ReadonlySet<LaneId>, muted: ReadonlySet<LaneId>): EditProject {
  if (hidden.size === 0 && muted.size === 0) return p
  let out = p
  if (hidden.has('text')) out = { ...out, texts: [] }
  if (hidden.has('captions')) out = { ...out, captions: { ...out.captions, enabled: false } }
  if (muted.has('video')) out = { ...out, clips: out.clips.map((c) => ({ ...c, muted: true })) }
  if (muted.has('voice')) out = { ...out, voiceover: out.voiceover.map((v) => ({ ...v, volume: 0 })) }
  if (muted.has('music') && out.music) out = { ...out, music: { ...out.music, volume: 0 } }
  return out
}
