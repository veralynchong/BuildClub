// The transcript view: the words of the take clips on the timeline, in timeline order, and what selecting, cutting and
// correcting them does to the edit project. Pure functions, so the unit tests can check them; Transcript.tsx draws them.
import type { EditProject, SpeechCaption } from './types.ts'
import { clipStarts } from './timeline.ts'

export type TakeWord = { text: string; start: number; end: number } // seconds in the take
export type TakeSpeech = { status: 'ok' | 'none' | 'unavailable'; words: TakeWord[] }

export const GAP_MIN = 0.5 // a pause this long shows as a "(0.8s)" pill
// How far a word cut reaches into the quiet beside it, so the air the clean-up keeps around a cut comes out of the pause and
// not out of the deleted word (suggest.py PAD_DEFAULT is 4 frames).
export const REACH = 0.15

// Same list as backend/cutting.py FILLERS; "like" counts only when set off with a comma (suggest.py is_filler).
const FILLERS = new Set(['um', 'umm', 'uh', 'uhh', 'er', 'erm', 'hm', 'hmm'])
const bare = (s: string) => s.trim().toLowerCase().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '')
const COMMA_END = /[,;:，；：、]$/

export function isFiller(words: TakeWord[], i: number): boolean {
  const b = bare(words[i].text)
  if (FILLERS.has(b)) return true
  if (b !== 'like') return false
  return COMMA_END.test(words[i].text.trim()) || (i > 0 && COMMA_END.test(words[i - 1].text.trim()))
}

// "<take>:<start in ms>", the same key suggest.py word_key gives a caption word.
export const wordKey = (takeId: string, start: number): string => `${takeId}:${Math.round(start * 1000)}`

export type TItem =
  | { kind: 'word'; key: string; text: string; original: string; filler: boolean; from: number; to: number; takeFrom: number; takeTo: number }
  | { kind: 'gap'; key: string; seconds: number; from: number; to: number; takeFrom: number; takeTo: number }

// 'pending': the take's words are not here yet (analysis running, or still loading); 'generation': an AI video, no speech.
export type GroupState = 'ok' | 'none' | 'unavailable' | 'pending' | 'generation'

export type TGroup = { clipId: string; in: number; out: number; from: number; to: number; state: GroupState; items: TItem[] }

// One group per clip, in timeline order. A take clip lists the words whose middle is inside its trim (the others are cut
// away, so they are not shown), each moved to where it plays on the timeline, with the pauses of GAP_MIN or more between
// them (and before the first word and after the last) as gap items. `fixes` are the words corrected by hand.
export function transcriptGroups(p: Pick<EditProject, 'clips'>, speech: Record<string, TakeSpeech | undefined>, fixes: Record<string, string> = {}): TGroup[] {
  const starts = clipStarts(p as EditProject)
  return p.clips.map((c, i) => {
    const at = starts[i]
    const base = { clipId: c.id, in: c.in, out: c.out, from: at, to: at + c.out - c.in }
    if (c.source.kind !== 'take') return { ...base, state: 'generation' as const, items: [] }
    const sp = speech[c.source.id]
    if (!sp) return { ...base, state: 'pending' as const, items: [] }
    const place = (sec: number) => at + Math.min(c.out, Math.max(c.in, sec)) - c.in
    const items: TItem[] = []
    let edge = c.in // where the last shown word ended, in the take
    const gap = (a: number, b: number) => {
      if (b - a >= GAP_MIN - 1e-6) items.push({ kind: 'gap', key: `${c.id}:gap:${Math.round(a * 1000)}`, seconds: b - a, from: place(a), to: place(b), takeFrom: a, takeTo: b })
    }
    sp.words.forEach((w, k) => {
      const mid = (w.start + w.end) / 2
      if (mid < c.in || mid > c.out) return
      const a = Math.max(c.in, w.start)
      gap(edge, a)
      const key = wordKey(c.source.id, w.start)
      items.push({ kind: 'word', key, text: fixes[key] ?? w.text.trim(), original: w.text.trim(), filler: isFiller(sp.words, k), from: place(w.start), to: place(w.end), takeFrom: a, takeTo: Math.min(c.out, w.end) })
      edge = Math.max(edge, Math.min(c.out, w.end))
    })
    if (items.some((x) => x.kind === 'word')) gap(edge, c.out)
    const state: GroupState = items.length > 0 ? 'ok' : sp.status === 'unavailable' ? 'unavailable' : 'none'
    return { ...base, state, items }
  })
}

export type Flat = { g: number; i: number; item: TItem } // group and item index
export const flatItems = (groups: TGroup[]): Flat[] => groups.flatMap((grp, g) => grp.items.map((item, i) => ({ g, i, item })))

// The word (or pause) playing at `t` timeline seconds, or null.
export function itemAt(groups: TGroup[], t: number): string | null {
  for (const grp of groups) {
    if (t < grp.from - 1e-6 || t >= grp.to) continue
    for (const x of grp.items) if (t >= x.from - 1e-6 && t < x.to) return x.key
  }
  return null
}

export type Cut = { clipId: string; from: number; to: number; whole: boolean } // take seconds to remove from that clip

// What deleting the flat items lo..hi (inclusive, in any order) removes: per clip, one take range. A run that starts at a
// clip's first item or ends at its last reaches the clip edge; otherwise a word run reaches up to REACH into the quiet
// beside it (never into a word that stays). A clip whose every item is selected goes whole.
export function selectionCuts(groups: TGroup[], a: number, b: number): Cut[] {
  const flat = flatItems(groups)
  const lo = Math.max(0, Math.min(a, b))
  const hi = Math.min(flat.length - 1, Math.max(a, b))
  const out: Cut[] = []
  for (let g = 0; g < groups.length; g++) {
    const picked = flat.filter((f, k) => f.g === g && k >= lo && k <= hi)
    if (picked.length === 0) continue
    const grp = groups[g]
    const first = picked[0]
    const last = picked[picked.length - 1]
    const before = grp.items[first.i - 1]
    const after = grp.items[last.i + 1]
    // The quiet next to the run ends where the word beside it is (a pill starts where the word before it ended).
    const prevEdge = before ? (before.kind === 'word' ? before.takeTo : before.takeFrom) : grp.in
    const nextEdge = after ? (after.kind === 'word' ? after.takeFrom : after.takeTo) : grp.out
    const from = !before ? grp.in : first.item.kind === 'gap' ? first.item.takeFrom : Math.max(prevEdge, first.item.takeFrom - REACH)
    const to = !after ? grp.out : last.item.kind === 'gap' ? last.item.takeTo : Math.min(nextEdge, last.item.takeTo + REACH)
    out.push({ clipId: grp.clipId, from, to, whole: !before && !after })
  }
  return out
}

// The selection as a short label for the undo history: the words, or the pause length.
export function selectionLabel(groups: TGroup[], a: number, b: number): { text: string; gap: number | null } {
  const flat = flatItems(groups).slice(Math.min(a, b), Math.max(a, b) + 1)
  const words = flat.flatMap((f) => (f.item.kind === 'word' ? [f.item.text] : []))
  if (words.length === 0) return { text: '', gap: flat.reduce((n, f) => n + (f.item.kind === 'gap' ? f.item.seconds : 0), 0) }
  const text = words.join(' ')
  return { text: text.length > 40 ? `${text.slice(0, 40)}…` : text, gap: null }
}

// ---- corrections ----

const squash = (s: string) => s.trim().split(/\s+/).filter(Boolean).join(' ')
const joined = (words: { text: string }[]) => squash(words.map((w) => w.text).join(' '))

// The caption line with the corrected words. Its text follows when it still read as its words; a line edited by hand
// gets the old word replaced once, where it is found.
function fixLine(e: SpeechCaption, fixes: Record<string, string>): SpeechCaption {
  if (!e.words?.some((w) => w.key !== undefined && fixes[w.key] !== undefined && fixes[w.key] !== w.text)) return e
  const words = e.words.map((w) => (w.key !== undefined && fixes[w.key] !== undefined ? { ...w, text: fixes[w.key] } : w))
  if (squash(e.text) === joined(e.words)) return { ...e, words, text: joined(words) }
  let text = e.text
  e.words.forEach((w, k) => {
    if (words[k].text !== w.text && w.text) text = text.replace(w.text, words[k].text)
  })
  return { ...e, words, text }
}

export function fixCaptions(entries: SpeechCaption[], fixes: Record<string, string>): SpeechCaption[] {
  return entries.map((e) => fixLine(e, fixes))
}

// Correct one word: the transcript shows `text`, and the speech captions holding that word read it too. Setting the word
// back to what was said (or to nothing) drops the correction. The timing never changes.
export function setWordFix(p: EditProject, key: string, text: string, original: string): EditProject {
  const value = squash(text)
  const fixes = { ...(p.transcriptFixes ?? {}) }
  if (!value || value === original) delete fixes[key]
  else fixes[key] = value
  const shown = value || original
  const speech = p.captions.speech ? fixCaptions(p.captions.speech, { [key]: shown }) : undefined
  const next: EditProject = { ...p, transcriptFixes: fixes }
  return speech && speech !== p.captions.speech ? { ...next, captions: { ...p.captions, speech } } : next
}
