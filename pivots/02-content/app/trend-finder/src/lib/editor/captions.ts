// Captions: from the shots' lines (default) or from a voiceover's word times. Pure functions; the Vite app, the
// Remotion bundle and the unit tests all use them.
import { createTikTokStyleCaptions, type Caption, type TikTokPage, type TikTokToken } from '@remotion/captions'
import { clipLength, clipStarts, totalLength } from './timeline.ts'
import type { EditProject, SpeechCaption, VoiceSeg, Word } from './types.ts'

export const COMBINE_MS = 1200
// A page also ends once it holds about this many width units (about 7 Chinese characters), where @remotion/captions
// would not break it: it only breaks before a token that has a leading space.
export const PAGE_UNITS = 14
// The backend's cap for a spoken text (backend/generations.py MAX_VOICE_UNITS): a CJK character is 2 units.
export const MAX_VOICE_UNITS = 480

// Same ranges as backend/subtitles.py is_cjk.
export function isCjk(ch: string): boolean {
  const o = ch.codePointAt(0) ?? 0
  return (o >= 0x2e80 && o <= 0x9fff) || (o >= 0xac00 && o <= 0xd7af) || (o >= 0xf900 && o <= 0xfaff) || (o >= 0x3000 && o <= 0x303f) || (o >= 0xff00 && o <= 0xffef)
}

export function widthUnits(text: string): number {
  let n = 0
  for (const ch of text) n += isCjk(ch) ? 2 : 1
  return n
}

// A CJK character is one token. A run of other characters is split at spaces into words; a word that had a space
// before it (and is not the very first token) carries one space, as @remotion/captions expects. No space is put
// before a CJK character.
export function tokens(text: string): string[] {
  const out: string[] = []
  let cur = ''
  let space = false
  const flush = () => {
    if (!cur) return
    out.push((space && out.length > 0 ? ' ' : '') + cur)
    cur = ''
    space = false
  }
  for (const ch of text) {
    if (/\s/.test(ch)) {
      flush()
      space = true
    } else if (isCjk(ch)) {
      flush()
      out.push(ch)
      space = false
    } else cur += ch
  }
  flush()
  return out
}

const SENTENCE_END = /[。！？!?.]$/ // a page always ends here
const COMMA_LIKE = /[，、,；;：:]$/ // a page ends here once it is long enough

function cap(text: string, startMs: number, endMs: number): Caption {
  const c: Caption = { text, startMs, endMs, timestampMs: null, confidence: null }
  if (SENTENCE_END.test(text.trim())) c.pageBreakAfter = true
  return c
}

// Each token takes a share of [from, to] in proportion to its width.
function spread(toks: string[], from: number, to: number): Caption[] {
  const total = toks.reduce((n, s) => n + widthUnits(s.trim()), 0) || 1
  let acc = 0
  return toks.map((text) => {
    const w = widthUnits(text.trim())
    const startMs = Math.round(from + ((to - from) * acc) / total)
    acc += w
    const endMs = Math.max(startMs, Math.round(from + ((to - from) * acc) / total))
    return cap(text, startMs, endMs)
  })
}

const ms = (sec: number): number => Math.round(sec * 1000)

// A shot's line is spread over the combined time of all that shot's clips, in timeline order, so the gaps where
// other shots' clips sit are skipped. The text is the first of those clips that has a `caption` override, else the
// shot's line. A token never straddles a gap: it ends where its clip ends.
export function lineCaptions(p: EditProject, lines: Record<string, string>): Caption[] {
  const starts = clipStarts(p)
  const shots = new Map<string, number[]>()
  p.clips.forEach((c, i) => {
    const id = c.source.shotId
    if (!id) return
    const list = shots.get(id)
    if (list) list.push(i)
    else shots.set(id, [i])
  })
  const out: Caption[] = []
  const starts_shot = new Set<Caption>()
  for (const [shotId, clips] of shots) {
    const placed: { c: Caption; k: number }[] = []
    const over = clips.map((i) => p.clips[i]).find((c) => c.caption !== undefined)
    const toks = tokens(over ? (over.caption as string) : (lines[shotId] ?? ''))
    if (toks.length === 0) continue
    const spans = clips.map((i) => ({ from: ms(starts[i]), to: ms(starts[i] + clipLength(p.clips[i])) }))
    const T = spans.reduce((n, s) => n + (s.to - s.from), 0)
    const W = toks.reduce((n, s) => n + widthUnits(s.trim()), 0) || 1
    let acc = 0
    for (const text of toks) {
      const s = (T * acc) / W
      acc += widthUnits(text.trim())
      const e = (T * acc) / W
      let base = 0
      let k = 0
      while (k < spans.length - 1 && s >= base + (spans[k].to - spans[k].from) - 1e-6) {
        base += spans[k].to - spans[k].from
        k++
      }
      const startMs = Math.min(spans[k].to, Math.round(spans[k].from + (s - base)))
      const endMs = Math.max(startMs, Math.min(spans[k].to, Math.round(spans[k].from + (e - base))))
      const prev = placed[placed.length - 1]
      if (prev && PUNCT_ONLY.test(text.trim())) {
        // Punctuation belongs to the word before it, even where the line crosses into the next clip.
        placed.push({ c: cap(text, prev.c.endMs, prev.c.endMs), k: prev.k })
      } else placed.push({ c: cap(text, startMs, endMs), k })
    }
    // A page never runs past the end of a clip, and two shots never share a page.
    placed.forEach((x, i) => {
      if (i + 1 >= placed.length || placed[i + 1].k !== x.k) x.c.pageBreakAfter = true
    })
    starts_shot.add(placed[0].c)
    out.push(...placed.map((x) => x.c))
  }
  out.sort((a, b) => a.startMs - b.startMs)
  // The first word of a shot follows another shot's words: keep a space between them.
  out.forEach((c, i) => {
    if (i > 0 && starts_shot.has(c) && !isCjk(c.text[0]) && !c.text.startsWith(' ')) c.text = ` ${c.text}`
  })
  return out
}

const NO_SPACE_BEFORE = /^[,.!?;:，。！？；：、)\]]/

// The words of each voiceover, moved to where the voiceover starts; whatever starts after `total` seconds is dropped.
export function voiceCaptions(segs: VoiceSeg[], words: Record<string, Word[]>, total: number): Caption[] {
  const limit = ms(total)
  const out: Caption[] = []
  for (const seg of segs) {
    let last = ''
    for (const w of words[seg.id] ?? []) {
      const toks = tokens(w.text.trim())
      if (toks.length === 0) continue
      const lead = last !== '' && !isCjk(last) && !isCjk(toks[0][0]) && !NO_SPACE_BEFORE.test(toks[0]) ? ' ' : ''
      toks[0] = lead + toks[0]
      for (const c of spread(toks, ms(seg.start + w.start), ms(seg.start + w.end))) {
        if (c.startMs >= limit) continue
        out.push({ ...c, endMs: Math.min(c.endMs, limit) })
      }
      last = toks[toks.length - 1].trim().slice(-1)
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs)
}

// Page rule for tokens without a leading space (every CJK character; @remotion/captions only breaks before a token
// that has one). A page always ends at sentence punctuation and at the end of a clip or shot (the flags set above).
// Inside such a run it ends at 14 width units, after a comma-like mark once it holds 6, or after 1200 ms once it holds
// 8. A run of 18 units or less is one page, and a last page under 4 units joins the one before when that stays <= 18.
const PUNCT_ONLY = /^[，。！？、；：,.!?;:…）」』]+$/
const SHORT_RUN = 18
const MIN_TAIL = 4
const COMMA_UNITS = 6
const TIME_UNITS = 8

// A comma-like mark that would still end this page within SHORT_RUN units: wait for it instead of cutting on time.
function commaSoon(run: Caption[], w: number[], i: number, units: number): boolean {
  let n = units
  for (let j = i + 1; j < run.length && n + w[j] <= SHORT_RUN; j++) {
    n += w[j]
    if (COMMA_LIKE.test(run[j].text.trim())) return true
  }
  return false
}

function breaksInRun(run: Caption[]): Set<number> {
  const w = run.map((c) => widthUnits(c.text.trim()))
  const out = new Set<number>()
  if (w.reduce((n, x) => n + x, 0) <= SHORT_RUN) return out
  let from = 0
  let units = 0
  const pages: { last: number; units: number }[] = []
  run.forEach((c, i) => {
    units += w[i]
    const next = run[i + 1]
    if (!next || next.text.startsWith(' ') || PUNCT_ONLY.test(next.text.trim())) return // the run ends, @remotion/captions decides, or a mark stays with its word
    const timed = c.endMs - run[from].startMs >= COMBINE_MS && units >= TIME_UNITS && !commaSoon(run, w, i, units)
    const long = units >= PAGE_UNITS || (COMMA_LIKE.test(c.text.trim()) && units >= COMMA_UNITS) || timed
    if (long) {
      pages.push({ last: i, units })
      from = i + 1
      units = 0
    }
  })
  const tail = units
  const prev = pages[pages.length - 1]
  if (prev && tail > 0 && tail < MIN_TAIL && prev.units + tail <= SHORT_RUN) pages.pop()
  pages.forEach((x) => out.add(x.last))
  return out
}

function withBreaks(caps: Caption[]): Caption[] {
  const out: Caption[] = []
  let run: Caption[] = []
  const flush = () => {
    const inner = breaksInRun(run)
    run.forEach((c, i) => out.push(inner.has(i) && !c.pageBreakAfter ? { ...c, pageBreakAfter: true } : c))
    run = []
  }
  for (const c of caps) {
    run.push(c)
    if (c.pageBreakAfter) flush()
  }
  flush()
  return out
}

export function captionPages(caps: Caption[]): TikTokPage[] {
  if (caps.length === 0) return []
  return createTikTokStyleCaptions({ captions: withBreaks(caps), combineTokensWithinMilliseconds: COMBINE_MS }).pages
}

// Where a page stops showing: its last token ends (not the next page's start, which may be a gap away).
export function pageEnd(page: TikTokPage): number {
  const last = page.tokens[page.tokens.length - 1]
  return last ? last.toMs : page.startMs + page.durationMs
}

// `edits` maps a page's index (as a string) to the text shown instead. Pages are those of ONE voiceover (F26).
export function pagesWithEdits(pages: TikTokPage[], edits: Record<string, string>): TikTokPage[] {
  return pages.map((pg, i) => {
    const text = edits[String(i)]
    if (text === undefined || text === pg.text) return pg
    const toks: TikTokToken[] = spread(tokens(text), pg.startMs, pageEnd(pg)).map((c) => ({ text: c.text, fromMs: c.startMs, toMs: c.endMs }))
    return { ...pg, text: text.trim(), tokens: toks }
  })
}

// The pages of one voiceover before edits (the edit keys count these).
export function segmentPages(seg: VoiceSeg, words: Record<string, Word[]>, total: number): TikTokPage[] {
  return captionPages(voiceCaptions([seg], words, total))
}

export function voicePages(segs: VoiceSeg[], words: Record<string, Word[]>, total: number): TikTokPage[] {
  return segs
    .flatMap((seg) => pagesWithEdits(segmentPages(seg, words, total), seg.edits ?? {}))
    .sort((a, b) => a.startMs - b.startMs)
}

const squash = (s: string) => s.trim().split(/\s+/).filter(Boolean).join(' ')

// A line's words at their own times, while its text still reads as those words; null when it does not (it was edited by
// hand, or made before word timing existed). A word is kept inside the line's time.
function wordTimed(e: SpeechCaption, limit: number): Caption[] | null {
  const words = e.words ?? []
  if (words.length === 0 || squash(e.text) !== squash(words.map((w) => w.text).join(' '))) return null
  const lo = ms(e.start)
  const hi = Math.min(limit, ms(e.end))
  const out: Caption[] = []
  let last = ''
  for (const w of words) {
    const toks = tokens(w.text.trim())
    if (toks.length === 0) continue
    const lead = last !== '' && !isCjk(last) && !isCjk(toks[0][0]) && !NO_SPACE_BEFORE.test(toks[0]) ? ' ' : ''
    toks[0] = lead + toks[0]
    const a = Math.min(hi, Math.max(lo, ms(w.start)))
    out.push(...spread(toks, a, Math.max(a, Math.min(hi, ms(w.end)))))
    last = toks[toks.length - 1].trim().slice(-1)
  }
  return out.length > 0 ? out : null
}

// The caption lines made from speech: each one is a page of its own. Its words show at the times they were said when the
// line carries them; otherwise they share the line's time by width.
export function speechCaptions(entries: SpeechCaption[], total: number): Caption[] {
  const limit = ms(total)
  const out: Caption[] = []
  for (const e of entries) {
    const toks = tokens(e.text.trim())
    if (toks.length === 0 || ms(e.start) >= limit) continue
    const caps = wordTimed(e, limit) ?? spread(toks, ms(e.start), Math.min(limit, ms(e.end)))
    caps[caps.length - 1].pageBreakAfter = true
    out.push(...caps)
  }
  return out.sort((a, b) => a.startMs - b.startMs)
}

export type CaptionMode = 'lines' | 'voice' | 'speech'

// Any voiceover with word times switches the captions to the voice (spec 11.6); otherwise the shots' lines.
export function captionMode(p: EditProject, words: Record<string, Word[]>): CaptionMode {
  if (p.captions.source === 'speech') return 'speech'
  return p.voiceover.some((v) => (words[v.id]?.length ?? 0) > 0) ? 'voice' : 'lines'
}

// Everything the video shows as captions, in time order. Nothing when captions are off.
export function projectPages(p: EditProject, lines: Record<string, string>, words: Record<string, Word[]>): TikTokPage[] {
  if (!p.captions.enabled) return []
  if (captionMode(p, words) === 'speech') return captionPages(speechCaptions(p.captions.speech ?? [], totalLength(p)))
  if (captionMode(p, words) === 'voice') return voicePages(p.voiceover, words, totalLength(p))
  return captionPages(lineCaptions(p, lines))
}

// The default text for an AI voice: every shot's line in order, cut to the backend's width cap.
export function ttsDefaultText(lines: string[]): { text: string; truncated: boolean } {
  const all = lines.map((l) => l.trim()).filter(Boolean).join('\n')
  let out = ''
  let units = 0
  for (const ch of all) {
    units += isCjk(ch) ? 2 : 1
    if (units > MAX_VOICE_UNITS) return { text: out.trimEnd(), truncated: true }
    out += ch
  }
  return { text: out, truncated: false }
}
