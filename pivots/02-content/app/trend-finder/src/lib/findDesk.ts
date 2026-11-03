import type { Platform, SavedIdea } from '../types'
import type { ResearchEntry, ResearchSlot, ResearchStatus } from './research.ts'
import { slotSummary, viewsPerFollower } from './research.ts'

// Find ideas' "desk": the client's recent searches and what is already saved to Research, worked out from what
// this browser stores. Pure, so the rules can be tested without the screen.
//
// There is no server-side search history or daily re-check yet. A search is recorded here each time its results
// are shown, with the ids of the videos it found. Running the same search again compares the two lists, which is
// the only honest source for "N new since Thu".

export const SEARCH_RUNS_KEY = 'trend-finder.searches.v1'

export interface SearchRun {
  id: string
  clientId: string
  // What was typed, as typed (trimmed).
  text: string
  platforms: Platform[]
  // When its results were last shown.
  at: number
  // The run it was compared with ("since"), if there was one.
  prevAt?: number
  // Every video id the search returned (capped).
  resultIds: string[]
  // Ids that were not in the run it was compared with.
  newIds: string[]
  // The signed-in person who ran it, when known.
  by?: string
}

// Searches kept per client, newest first.
export const MAX_RUNS_PER_CLIENT = 30
const MAX_IDS = 300
// Opening the same search again within this window keeps comparing against the older run, so a second look
// a few minutes later still says "6 new since Thu" instead of "nothing new since just now".
export const SAME_LOOK_MS = 30 * 60_000
// Searches older than this say "Run again" instead of "Open".
export const STALE_MS = 7 * 86_400_000

export const normalizeSearch = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase()

export interface RecordInput {
  clientId: string
  text: string
  platforms: Platform[]
  resultIds: string[]
  by?: string
}

// Adds (or updates) one search for a client. The same words for the same client update the existing row.
export function recordSearch(runs: SearchRun[], input: RecordInput, now = Date.now()): SearchRun[] {
  const key = normalizeSearch(input.text)
  if (!key || !input.clientId) return runs
  const prev = runs.find((r) => r.clientId === input.clientId && normalizeSearch(r.text) === key)
  const ids = [...new Set(input.resultIds)].slice(0, MAX_IDS)
  let baseIds: string[] | null = null
  let baseAt: number | undefined
  if (prev) {
    const sameLook = now - prev.at < SAME_LOOK_MS
    if (sameLook) {
      // Compare with what the older run had, not with the look a moment ago.
      if (prev.prevAt !== undefined) {
        const fresh = new Set(prev.newIds)
        baseIds = prev.resultIds.filter((id) => !fresh.has(id))
        baseAt = prev.prevAt
      }
    } else {
      baseIds = prev.resultIds
      baseAt = prev.at
    }
  }
  const before = new Set(baseIds ?? [])
  const run: SearchRun = {
    id: prev?.id ?? `${input.clientId}-${now.toString(36)}-${runs.length}`,
    clientId: input.clientId,
    text: input.text.trim(),
    platforms: [...input.platforms],
    at: now,
    ...(baseAt !== undefined ? { prevAt: baseAt } : {}),
    resultIds: ids,
    newIds: baseIds ? ids.filter((id) => !before.has(id)) : [],
    ...(input.by ? { by: input.by } : prev?.by ? { by: prev.by } : {}),
  }
  const others = runs.filter((r) => r !== prev)
  const mine = [run, ...others.filter((r) => r.clientId === input.clientId)].slice(0, MAX_RUNS_PER_CLIENT)
  return [...mine, ...others.filter((r) => r.clientId !== input.clientId)]
}

// Anything that is not a list of runs (old data, junk) is dropped rather than breaking the page.
export function cleanRuns(raw: unknown): SearchRun[] {
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (r): r is SearchRun =>
      !!r &&
      typeof r === 'object' &&
      typeof (r as SearchRun).clientId === 'string' &&
      typeof (r as SearchRun).text === 'string' &&
      typeof (r as SearchRun).at === 'number' &&
      Array.isArray((r as SearchRun).resultIds) &&
      Array.isArray((r as SearchRun).newIds) &&
      Array.isArray((r as SearchRun).platforms),
  )
}

export interface RecentRow {
  run: SearchRun
  // Videos found by this search that are now in the client's Research.
  saved: number
  // New since the run it was compared with; null when it has only run once (nothing to compare).
  fresh: number | null
  // Older than a week: offer "Run again".
  stale: boolean
}

// The client's recent searches for the 01 block: searches with new videos first, then newest first.
export function recentSearches(
  runs: SearchRun[],
  clientId: string,
  savedVideoIds: Set<string>,
  now = Date.now(),
  limit = 6,
): RecentRow[] {
  const hot = (r: RecentRow) => Number(!r.stale && (r.fresh ?? 0) > 0)
  return runs
    .filter((r) => r.clientId === clientId)
    .map((run) => ({
      run,
      saved: run.resultIds.filter((id) => savedVideoIds.has(id)).length,
      fresh: run.prevAt === undefined ? null : run.newIds.length,
      stale: now - run.at > STALE_MS,
    }))
    .sort((a, b) => hot(b) - hot(a) || b.run.at - a.run.at)
    .slice(0, limit)
}

// The search run that matches what the results screen shows, if it was recorded.
export function runFor(runs: SearchRun[], clientId: string, text: string | null): SearchRun | undefined {
  if (!text) return undefined
  const key = normalizeSearch(text)
  return runs.find((r) => r.clientId === clientId && normalizeSearch(r.text) === key)
}

export interface SavedRow {
  // null = Unsorted (saved, not filed under one of the client's videos).
  slot: ResearchSlot | null
  refs: ResearchEntry[]
  // The best reference to show: most views per follower, else most views.
  top?: ResearchEntry
  picked: boolean
  status: ResearchStatus
}

const better = (a: ResearchEntry, b: ResearchEntry): number =>
  (viewsPerFollower(b) ?? -1) - (viewsPerFollower(a) ?? -1) || b.views - a.views

// One row per Research video for the 02 block and the bottom strip, in number order, then Unsorted (only when
// something is unsorted). Pass one client's slots and entries.
export function savedByVideo(slots: ResearchSlot[], entries: ResearchEntry[], ideas: SavedIdea[]): SavedRow[] {
  const mySlots = [...slots].sort((a, b) => a.number - b.number)
  const rows: SavedRow[] = mySlots.map((slot) => {
    const sum = slotSummary(slot, entries, ideas)
    return { slot, refs: sum.refs, top: [...sum.refs].sort(better)[0], picked: !!sum.picked, status: sum.status }
  })
  const filed = new Set(rows.flatMap((r) => r.refs.map((e) => e.id)))
  const unsorted = entries.filter((e) => !filed.has(e.id))
  if (unsorted.length) rows.push({ slot: null, refs: unsorted, top: [...unsorted].sort(better)[0], picked: false, status: 'none' })
  return rows
}

// Which rows the 02 block shows before "Show all": videos not posted yet (the first `limit`), plus Unsorted.
export function savedPreview(rows: SavedRow[], limit = 4): SavedRow[] {
  const open = rows.filter((r) => r.slot && r.status !== 'posted').slice(0, limit)
  const unsorted = rows.filter((r) => !r.slot)
  return [...open, ...unsorted]
}

// One line in the drop-down under the search box while typing.
export interface TypeAheadItem {
  group: 'recent' | 'search' | 'brief' | 'ask'
  label: string
  // What gets searched when it's picked.
  value: string
  hint?: string
}

export interface TypeAheadSources {
  // The client's own recent searches.
  recent: string[]
  // Common searches: past searches from the server and refinements of what was typed (kept only when they
  // contain every word typed).
  searches: { label: string; value: string }[]
  // Searches written from the client's brief (starter searches, audience fits), with why they fit.
  brief: { label: string; value: string; hint?: string }[]
  // Finished questions that run straight away (already written from what was typed, so not filtered).
  questions: string[]
}

const GROUP_MAX: Record<TypeAheadItem['group'], number> = { recent: 3, search: 3, brief: 2, ask: 2 }

// Does `candidate` contain every word typed? The last word may be half typed (prefix of a word).
export function matchesTyped(typed: string, candidate: string): boolean {
  const words = normalizeSearch(typed).split(' ').filter(Boolean)
  if (!words.length) return false
  const hay = normalizeSearch(candidate).split(/[\s,.!?'"“”‘’()-]+/).filter(Boolean)
  return words.every((w, i) =>
    i === words.length - 1 ? hay.some((h) => h.startsWith(w)) : hay.some((h) => h === w || h.startsWith(w)),
  )
}

// The drop-down while typing: the client's recent searches, common searches, versions that fit the brief, and
// questions, each matched to what was typed, no line twice, nothing equal to what's already in the box.
export function typeAhead(text: string, src: TypeAheadSources): TypeAheadItem[] {
  const typed = normalizeSearch(text)
  if (typed.length < 2 || /https?:\/\//i.test(text)) return []
  const seen = new Set([typed])
  const out: TypeAheadItem[] = []
  const add = (group: TypeAheadItem['group'], label: string, value: string, hint?: string, match = true) => {
    const key = normalizeSearch(value)
    if (!key || seen.has(key) || (match && !matchesTyped(text, `${label} ${value}`))) return
    if (out.filter((x) => x.group === group).length >= GROUP_MAX[group]) return
    seen.add(key)
    out.push({ group, label, value, ...(hint ? { hint } : {}) })
  }
  for (const r of src.recent) add('recent', r, r)
  for (const s of src.searches) add('search', s.label, s.value)
  for (const b of src.brief) add('brief', b.label, b.value, b.hint)
  for (const q of src.questions) add('ask', q, q, undefined, false)
  return out
}
