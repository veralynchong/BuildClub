// Pure timeline maths for the edit project. No remotion import: the Vite app and the unit tests use it too.
import type { Clip, ClipSource, EditProject, SourceInfo, TextItem, VoiceSeg } from './types.ts'
import type { Shot } from '../../types'
import type { CanvasDoc, CanvasNode, Generation } from '../canvas/types.ts'
import type { Take } from '../takes.ts'
import type { Key } from '../i18n.ts'

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

// ---- canvas -> timeline ----
// The drag type a canvas node sets and the timeline accepts; the data is JSON.stringify(ClipSource).
export const CLIP_MIME = 'application/x-remake-clip'

// Same rule as canvas/graph.ts selectedGen, copied so the Remotion bundle (which imports this file) stays free of
// the canvas modules and their strings.
function selectedGen(node: CanvasNode, gens: Generation[]): Generation | null {
  const done = gens.filter((g) => g.nodeId === node.id && g.status === 'done').sort((a, b) => a.createdAt - b.createdAt)
  return done.find((g) => g.id === node.data.selected) ?? done[done.length - 1] ?? null
}

const liveGen = (id: string, gens: Generation[]): boolean => gens.some((g) => g.id === id && g.status === 'done')

// The footage a shot uses by default (spec 11.5 #6): the pinned primary if it still exists, else the shot's chosen
// take, else the newest finished selected version among the shot's video nodes (S9), else nothing.
export function primaryClipFor(
  shotId: string,
  doc: CanvasDoc,
  gens: Generation[],
  takes: Take[],
  primaries: Record<string, ClipSource>,
): ClipSource | null {
  const pin = primaries[shotId]
  if (pin && (pin.kind === 'take' ? takes.some((x) => x.id === pin.id) : liveGen(pin.id, gens))) return pin
  const chosen = takes.find((x) => x.shotId === shotId && x.chosen)
  if (chosen) return { kind: 'take', id: chosen.id, shotId }
  let best: Generation | null = null
  for (const n of doc.nodes) {
    if (n.type !== 'video' || n.shotId !== shotId) continue
    const g = selectedGen(n, gens)
    if (g && (!best || (g.finishedAt ?? 0) > (best.finishedAt ?? 0))) best = g
  }
  return best ? { kind: 'generation', id: best.id, nodeId: best.nodeId, shotId } : null
}

// Fills an empty timeline with each shot's primary clip, whole, in shot order. Shots with no footage, or whose
// footage has no length yet, are listed in `skipped`. A timeline that already has clips is left alone.
export function fillByShotOrder(
  p: EditProject,
  shots: Pick<Shot, 'id'>[], // a shot without an id has no footage and is left out
  doc: CanvasDoc,
  gens: Generation[],
  takes: Take[],
  sources: SourceInfo[],
): { project: EditProject; skipped: string[] } {
  if (p.clips.length > 0) return { project: p, skipped: [] }
  let out = p
  const skipped: string[] = []
  for (const { id } of shots) {
    if (!id) continue
    const src = primaryClipFor(id, doc, gens, takes, p.primaries)
    const info = src && sources.find((s) => s.key === sourceKey(src))
    const next = src && info ? insertClip(out, src, info.duration, out.clips.length, newClipId(out)) : out
    if (next === out) skipped.push(id)
    out = next
  }
  return { project: out, skipped }
}

export type ClipStatus = { state: 'ok' } | { state: 'newer'; source: ClipSource } | { state: 'missing' }

export function clipStatus(clip: Clip, doc: CanvasDoc, gens: Generation[], takes: Take[]): ClipStatus {
  const src = clip.source
  if (src.kind === 'generation') {
    if (!liveGen(src.id, gens)) return { state: 'missing' }
    const node = src.nodeId ? doc.nodes.find((n) => n.id === src.nodeId) : undefined
    const now = node && selectedGen(node, gens)
    if (now && now.id !== src.id) return { state: 'newer', source: { kind: 'generation', id: now.id, nodeId: src.nodeId, shotId: src.shotId } }
    return { state: 'ok' }
  }
  if (!takes.some((x) => x.id === src.id)) return { state: 'missing' }
  // A take is a separate piece of footage, not a newer version of another take. The one exception is its own
  // cleaned version: that is offered as newer (the latest one when there are several).
  const cleaned = takes.filter((x) => x.cleanedFrom === src.id).sort((a, b) => b.createdAt - a.createdAt)[0]
  if (cleaned) return { state: 'newer', source: { kind: 'take', id: cleaned.id, shotId: src.shotId } }
  return { state: 'ok' }
}

const sameSource = (a: ClipSource | undefined, b: ClipSource): boolean => !!a && a.kind === b.kind && a.id === b.id

export function isPrimaryPin(primaries: Record<string, ClipSource>, shotId: string, src: ClipSource): boolean {
  return sameSource(primaries[shotId], src)
}

export function withPrimary(primaries: Record<string, ClipSource>, shotId: string, src: ClipSource): Record<string, ClipSource> {
  return { ...primaries, [shotId]: src }
}

// When a newer version replaces the pinned one, the pin follows it; any other pin is left alone.
export function repinIfOld(primaries: Record<string, ClipSource>, shotId: string | undefined, oldSrc: ClipSource, newSrc: ClipSource): Record<string, ClipSource> {
  if (!shotId || !sameSource(primaries[shotId], oldSrc)) return primaries
  return { ...primaries, [shotId]: newSrc }
}

// Points a clip at a newer version. The trim is kept where it still fits; otherwise the clip restarts at 0
// with its old length, cut to the new video. With `whole` (a cleaned take) the trim is dropped and the clip takes
// the whole new video; the timeline is left alone when that would pass the length limit.
export function applyNewer(p: EditProject, clipId: string, source: ClipSource, duration: number, whole = false): EditProject {
  const c = p.clips.find((x) => x.id === clipId)
  if (!c) return p
  if (whole) {
    const out = floorFrames(duration)
    if (out < MIN_F) return p
    const next = withClips(p, p.clips.map((x) => (x.id === clipId ? { ...x, source, in: 0, out: secs(out) } : x)))
    return totalFrames(next) > MAX_F ? p : next
  }
  const cap = floorFrames(duration)
  let nin = frames(c.in)
  let nout = Math.min(frames(c.out), cap)
  if (nout - nin < MIN_F) {
    nin = 0
    nout = Math.min(frames(c.out) - frames(c.in), cap)
  }
  if (nout - nin < MIN_F) return p
  return withClips(p, p.clips.map((x) => (x.id === clipId ? { ...x, source, in: secs(nin), out: secs(nout) } : x)))
}

// Why the timeline can't be exported yet (the copy key), or null when it can. `statuses` maps clip id -> clipStatus state.
export function exportBlocked(p: EditProject, statuses: Record<string, ClipStatus['state']>): Key | null {
  if (p.clips.length === 0) return 'editor.export.empty'
  if (p.clips.some((c) => statuses[c.id] === 'missing')) return 'editor.export.missing'
  return null
}

export type FlushResult = 'saved' | 'failed' | 'stale' | 'readonly'

// What a finished flush means: `saved` only when nothing unsaved is left and the edit may be written.
export function flushOutcome(s: { dirty: boolean; blocked: boolean; readOnly: boolean }): FlushResult {
  if (s.blocked) return 'stale'
  if (s.readOnly) return 'readonly'
  return s.dirty ? 'failed' : 'saved'
}

// ---- texts ----
export const MAX_TEXTS = 30
export const MAX_TEXT_CHARS = 120
export const TEXT_SECONDS = 2

// A new text at `at` seconds: 2 s long, at the bottom, white. Near the end it starts earlier so it keeps its length, and the
// timeline is returned unchanged when there is no room (no footage, or 30 texts already).
export function addText(p: EditProject, at: number, text: string, id: string): EditProject {
  const total = totalFrames(p)
  const body = text.slice(0, MAX_TEXT_CHARS)
  if (total < 1 || p.texts.length >= MAX_TEXTS || !body.trim()) return p
  const end = Math.min(clamp(frames(at), 0, total - 1) + TEXT_SECONDS * FPS, total)
  const start = Math.max(0, end - TEXT_SECONDS * FPS) // near the end there is no room after the playhead: start earlier
  const item: TextItem = { id, text: body, start: secs(start), end: secs(end), position: 'bottom', color: 'white' }
  return { ...p, texts: [...p.texts, item] }
}

// A typed number of seconds, or null when it is blank, not a finite number, or negative.
export function parseSeconds(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

// Applies a change to one text and keeps it valid: it starts at 0 or later, ends after it starts, and its words
// are never empty (an empty edit is ignored) or over the limit.
export function updateText(p: EditProject, id: string, patch: Partial<Omit<TextItem, 'id'>>): EditProject {
  const old = p.texts.find((x) => x.id === id)
  if (!old) return p
  const next = { ...old, ...patch }
  if (patch.text !== undefined) {
    next.text = patch.text.slice(0, MAX_TEXT_CHARS)
    if (!next.text.trim()) return p
  }
  next.start = Math.max(0, secs(frames(next.start)))
  next.end = Math.max(secs(frames(next.end)), next.start + secs(1))
  return { ...p, texts: p.texts.map((x) => (x.id === id ? next : x)) }
}

export function removeText(p: EditProject, id: string): EditProject {
  return p.texts.some((x) => x.id === id) ? { ...p, texts: p.texts.filter((x) => x.id !== id) } : p
}

export function newTextId(p: EditProject): string {
  let max = 0
  for (const x of p.texts) {
    const m = /^t(\d+)$/.exec(x.id)
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `t${max + 1}`
}

// The texts on screen at `t` seconds.
export function textsAt(p: EditProject, t: number): TextItem[] {
  return p.texts.filter((x) => x.start <= t && t < x.end)
}

// ---- voiceovers ----
export const MAX_VOICE = 20 // backend/editing.py MAX_VOICE

export function addVoice(p: EditProject, seg: VoiceSeg): EditProject {
  if (p.voiceover.length >= MAX_VOICE || p.voiceover.some((v) => v.id === seg.id)) return p
  return { ...p, voiceover: [...p.voiceover, seg] }
}

export function updateVoice(p: EditProject, id: string, patch: Partial<Omit<VoiceSeg, 'id'>>): EditProject {
  if (!p.voiceover.some((v) => v.id === id)) return p
  return { ...p, voiceover: p.voiceover.map((v) => (v.id === id ? { ...v, ...patch } : v)) }
}

export function removeVoice(p: EditProject, id: string): EditProject {
  if (!p.voiceover.some((v) => v.id === id)) return p
  return { ...p, voiceover: p.voiceover.filter((v) => v.id !== id) }
}

// Sets (or, with undefined, clears) the caption of a shot: the whole line, kept on the shot's first clip (F27). The
// shot's other clips lose their own override so this one is the only one.
export function setShotCaption(p: EditProject, shotId: string, text: string | undefined): EditProject {
  const first = p.clips.findIndex((c) => c.source.shotId === shotId)
  if (first < 0) return p
  const clips = p.clips.map((c, k) => {
    if (c.source.shotId !== shotId) return c
    const { caption: _old, ...rest } = c
    void _old
    return k === first && text !== undefined ? { ...rest, caption: text } : rest
  })
  return { ...p, clips }
}
