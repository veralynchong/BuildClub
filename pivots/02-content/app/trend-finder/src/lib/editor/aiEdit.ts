// What accepting an AI suggestion does to the edit project. Pure functions: each returns a new project (or the same
// one when nothing can be done), so the editor can keep the old one for "Undo last AI change".
import { t, tp } from '../i18n.ts'
import type { Clip, ClipSource, EditProject, SpeechCaption } from './types.ts'
import { applyNewer, clipLength, clipStarts, FPS, MAX_TOTAL, MIN_CLIP, totalLength } from './timeline.ts'
import type { RankedTake } from './aiApi.ts'

export const MAX_CLIPS = 100 // backend/editing.py MAX_CLIPS
export const PAD_DEFAULT = 4
export const PAD_MAX = 10

const frame = (sec: number): number => Math.round(sec * FPS) / FPS

// A short stable key of what the speech captions were made from (the take clips and their trims).
export function speechKey(p: Pick<EditProject, 'clips'>): string {
  let h = 5381
  const text = p.clips.map((c) => `${c.source.kind}:${c.source.id}:${c.in.toFixed(3)}:${c.out.toFixed(3)}`).join('|')
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0
  return `${p.clips.length}-${h.toString(36)}`
}

export function withSpeechCaptions(p: EditProject, entries: SpeechCaption[]): EditProject {
  return { ...p, captions: { ...p.captions, enabled: true, source: 'speech', speech: entries, speechKey: speechKey(p) } }
}

// The clip becomes one clip per kept range, in order, of the same take with its trim moved. The first keeps the id (so it
// stays selected); the shot's caption override stays on the first only.
export function replaceWithRanges(p: EditProject, clipId: string, ranges: number[][], newId: (used: Set<string>) => string): EditProject {
  const i = p.clips.findIndex((c) => c.id === clipId)
  if (i < 0 || ranges.length === 0) return p
  const c = p.clips[i]
  if (p.clips.length - 1 + ranges.length > MAX_CLIPS) return p
  const used = new Set(p.clips.map((x) => x.id))
  const { caption: _caption, ...rest } = c
  void _caption
  const pieces: Clip[] = ranges.map(([from, to], k) => {
    const id = k === 0 ? c.id : newId(used)
    used.add(id)
    return { ...(k === 0 ? c : rest), id, in: frame(from), out: frame(to) }
  })
  return { ...p, clips: [...p.clips.slice(0, i), ...pieces, ...p.clips.slice(i + 1)] }
}

// Next free "c<n>" id given the ids already used.
export function nextClipId(used: Set<string>): string {
  let max = 0
  for (const id of used) {
    const m = /^c(\d+)$/.exec(id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `c${max + 1}`
}

// Trim a clip to [from, to] of its take ("Trim to the line"). Left alone when it would not fit the video or the 180 s.
export function setClipRange(p: EditProject, clipId: string, from: number, to: number, sourceDuration: number): EditProject {
  const c = p.clips.find((x) => x.id === clipId)
  if (!c) return p
  const nin = Math.max(0, frame(from))
  const nout = Math.min(Math.floor(sourceDuration * FPS + 1e-6) / FPS, frame(to))
  if (nout - nin < MIN_CLIP - 1e-6) return p
  if (totalLength(p) - clipLength(c) + (nout - nin) > MAX_TOTAL + 1e-6) return p
  if (nin === c.in && nout === c.out) return p
  return { ...p, clips: p.clips.map((x) => (x.id === clipId ? { ...x, in: nin, out: nout } : x)) }
}

// The shot uses another take, in the same place on the timeline: every piece of the old take goes, the new one takes the
// first piece's place with its trim, and the shot's pin follows.
export function swapTake(p: EditProject, clipId: string, src: ClipSource, duration: number, range: { in: number | null; out: number | null }): EditProject {
  const old = p.clips.find((x) => x.id === clipId)
  if (!old) return p
  const taken = applyNewer(p, clipId, src, duration, true)
  if (taken === p) return p
  // The new clip answers to the id of the clip that was selected, so it stays selected.
  const swapped = { ...taken, clips: taken.clips.map((x) => (x.source.kind === src.kind && x.source.id === src.id ? { ...x, id: clipId } : x)) }
  const trimmed = range.in !== null && range.out !== null ? setClipRange(swapped, clipId, range.in, range.out, duration) : swapped
  const shotId = old.source.shotId
  return shotId ? { ...trimmed, primaries: { ...trimmed.primaries, [shotId]: src } } : trimmed
}

// Timeline frame of a moment of the clip's take, or null when that moment is trimmed away.
export function previewFrame(p: EditProject, clipId: string, takeSeconds: number): number | null {
  const i = p.clips.findIndex((c) => c.id === clipId)
  if (i < 0) return null
  const c = p.clips[i]
  const at = Math.min(Math.max(takeSeconds, c.in), c.out - 0.01)
  return Math.round((clipStarts(p)[i] + at - c.in) * FPS)
}

// "0:04.2"
export function stamp(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${m}:${(sec - m * 60).toFixed(1).padStart(4, '0')}`
}

// A take's one-line reason in the current language, from the numbers the server counted.
export function rankReason(r: Pick<RankedTake, 'coverage' | 'fillers' | 'longPauses' | 'retakes' | 'speech'>): string {
  const parts = [r.coverage !== null ? t('editor.ai.rank.covers', { pct: Math.round(r.coverage * 100) }) : t(r.speech === 'unavailable' ? 'editor.ai.rank.noSpeech' : 'editor.ai.rank.noLine'), tp('editor.ai.rank.fillers', r.fillers)]
  if (r.longPauses) parts.push(tp('editor.ai.rank.pauses', r.longPauses))
  if (r.retakes) parts.push(tp('editor.ai.rank.retakes', r.retakes))
  return parts.join(t('editor.ai.rank.sep'))
}
