import type { Client, Format, HookType, Shot, Video } from '../types'
import type { Key } from './i18n.ts'
import { t } from './i18n.ts'
import { editLine } from './storyboard.ts'
import type { WrittenShot } from './storyboard.ts'

// How the plan screen opens: how the copied video starts, ways to start the client's own version, then the shots.
// "Hook" is a code word only; the screen says "how it starts" (copy guide).

export const HOOK_TYPES: HookType[] = ['visual', 'question_or_text', 'rage_bait', 'informative', 'challenge', 'other']

export interface HookUsed {
  // The opening words: the spoken hook line from the breakdown, else the first shot's line or on-screen text,
  // else the caption's first line (video.hook).
  opening: string
  // The first shot's on-screen text, when it isn't already the opening.
  onScreen?: string
  // What you see in the first shot.
  firstShot?: string
  // Only a type the app knows; older breakdowns have none.
  type?: HookType
  // Why the opening works, from the breakdown (format.why.hook).
  why?: string
}

const clean = (s?: string) => (s ?? '').trim()
const same = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, ' ') === b.toLowerCase().replace(/\s+/g, ' ')

export function hookUsed(video: Pick<Video, 'hook'>, format: Pick<Format, 'why' | 'shotList' | 'lines'>): HookUsed {
  const first = format.shotList[0]
  const spoken = clean(format.lines?.find((l) => l.role === 'hook')?.text) || clean(first?.line)
  const onScreen = clean(first?.text)
  const opening = spoken || onScreen || clean(video.hook)
  const out: HookUsed = { opening }
  if (onScreen && !same(onScreen, opening)) out.onScreen = onScreen
  if (clean(first?.shot)) out.firstShot = clean(first?.shot)
  const type = format.why.hookType
  if (type && HOOK_TYPES.includes(type)) out.type = type
  if (clean(format.why.hook)) out.why = clean(format.why.hook)
  return out
}

// ---- suggested openings --------------------------------------------------------------------------

export interface SuggestedHook {
  text: string
  // 'written': lines the script writer offered for the first shot (saved on the plan).
  // 'sample': built here from the idea, so the demo always has something to pick.
  source: 'written' | 'sample'
}

// What the video is about, short enough to drop into a sentence. Live formats copy the caption into `short`,
// so a short that equals the caption is skipped in favour of the name.
export function subjectOf(format: Pick<Format, 'short' | 'name'>, video: Pick<Video, 'hook'>): string {
  // Up to the first comma or colon, lower-cased when it starts like a sentence ("Crispy tofu"), not an acronym ("ASMR").
  const firstPart = (s: string) => {
    const x = s.split(/[,:(（，：|]/)[0].replace(/["“”]/g, '').trim()
    return /^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x
  }
  const short = clean(format.short)
  if (short && !same(short, clean(video.hook)) && Array.from(short).length <= 32) return firstPart(short)
  const name = firstPart(clean(format.name))
  if (name && Array.from(name).length <= 40) return name
  return t('plan.hooks.subjectFallback')
}

// Sample openings, one kind per hook type. The copied video's type comes first, so the samples start the same way.
const SAMPLE_ORDER: HookType[] = ['question_or_text', 'visual', 'informative', 'challenge', 'rage_bait', 'other']
const sampleKey = (type: HookType): Key => `plan.hooks.sample.${type}.line`

export function sampleHooks(
  format: Pick<Format, 'short' | 'name' | 'why'>,
  video: Pick<Video, 'hook'>,
  client: Pick<Client, 'name'>,
  count = 3,
): string[] {
  const subject = subjectOf(format, video)
  const type = format.why.hookType && HOOK_TYPES.includes(format.why.hookType) ? format.why.hookType : null
  const order = type ? [type, ...SAMPLE_ORDER.filter((x) => x !== type)] : SAMPLE_ORDER
  return order.slice(0, count).map((x) => t(sampleKey(x), { subject, client: client.name }))
}

// Openings to pick from: the writer's options on the first shot first, then samples until there are `count`.
// Repeats are dropped. The first shot's current line may be one of them; the screen marks it as picked.
export function suggestedHooks(
  shots: Pick<Shot, 'line' | 'options'>[],
  format: Pick<Format, 'short' | 'name' | 'why'>,
  video: Pick<Video, 'hook'>,
  client: Pick<Client, 'name'>,
  count = 3,
): SuggestedHook[] {
  const out: SuggestedHook[] = []
  const add = (text: string, source: SuggestedHook['source']) => {
    const x = clean(text)
    if (x && out.length < count && !out.some((h) => same(h.text, x))) out.push({ text: x, source })
  }
  for (const o of shots[0]?.options ?? []) add(o, 'written')
  for (const s of sampleHooks(format, video, client, SAMPLE_ORDER.length)) add(s, 'sample')
  return out
}

// ---- changing the plan ---------------------------------------------------------------------------

// The picked opening becomes the first shot's line, marked as the user's own so a script rewrite asks first.
// A plan with no shots gets a first shot to hold it.
export function pickHook(shots: Shot[], text: string): Shot[] {
  const line = clean(text)
  if (!line) return shots
  if (shots.length === 0) return [{ time: '0-3s', shot: '', line, purpose: 'hook', edited: true }]
  return editLine(shots, 0, line).map((s, i) => (i === 0 ? { ...s, purpose: s.purpose ?? 'hook' } : s))
}

// New openings from the writer (/api/ideas/{id}/shots/0/script) become the first shot's options. The line itself
// stays as it is: the user picks from the options.
export function withHookOptions(shots: Shot[], written: WrittenShot): Shot[] {
  if (shots.length === 0) return shots
  const seen: string[] = []
  for (const o of [written.line ?? '', ...(written.options ?? [])]) {
    const x = clean(o)
    if (x && !seen.some((y) => same(x, y))) seen.push(x)
  }
  if (seen.length === 0) return shots
  return shots.map((s, i) => (i === 0 ? { ...s, options: seen.slice(0, 4), purpose: s.purpose ?? 'hook' } : s))
}
