import type { Format, Platform, SavedIdea, Video } from '../types'
import { stageOf } from './stage.ts'

// The Research tab: one client's log of reference videos (what's out there), like the agency's Excel sheet.
// A row becomes a plan with "Plan it"; the plan then lives on the Plans board (what we're making).
// Front end only for now: rows are kept in this browser (state.ts useResearch), not on the API.

export interface ResearchEntry {
  // `${clientId}-${videoId}`, the same id a plan for this video gets, so a row and its plan line up.
  id: string
  clientId: string
  // A video the app can look up (sample data, the live store, or one made by "Add from link").
  videoId: string
  // A copy of the numbers when the row was logged, so the sheet keeps them even if the video leaves the
  // live store. `loggedAt` says how old they are.
  account: string
  platform: Platform
  followers: number
  views: number
  url?: string
  // Editable in the sheet.
  keywords: string[]
  hook: string
  // "Other info": free text.
  notes: string
  loggedAt: number
  // How the row got here.
  source: 'search' | 'link' | 'sample' | 'plan'
  // The content slot this reference is for; none = Unsorted (e.g. just saved from Find ideas).
  slotId?: string
  // Set by the Status dropdown: kept as a backup for its video. ("Picked" isn't stored: it's the row with a plan.)
  backup?: boolean
}

// One of the videos the client is paying for (e.g. video 3 of a 12-video, 3-month deal). A slot collects
// several reference videos; the one planned is "Picked", the rest are "Backup".
export interface ResearchSlot {
  id: string
  clientId: string
  // Shown as "1", "2", …; slots are listed in this order.
  number: number
  // What this video is about, e.g. "Crispy tofu, quick dinner".
  topic: string
  // YYYY-MM-DD, optional.
  dueDate?: string
  createdAt: number
}

// Where one slot stands, worked out from its references and the plans.
export interface SlotSummary {
  refs: ResearchEntry[]
  // The reference that has a plan (the first one, if somehow more than one does).
  picked?: ResearchEntry
  // The picked reference's plan status; 'none' when nothing is picked.
  status: ResearchStatus
}

// The whole deal at a glance, for the summary on top of the sheet.
export interface ResearchProgress {
  slots: number
  picked: number
  // Picked plans that are approved or further along (filming, editing, posted).
  approved: number
  posted: number
  // References not in any slot.
  unsorted: number
}

// What the sheet's Status column shows: the plan's place in production, or none.
export type ResearchStatus = 'none' | 'planning' | 'waiting' | 'approved' | 'filming' | 'editing' | 'posted'

export const researchId = (clientId: string, videoId: string) => `${clientId}-${videoId}`

// Keywords and hashtags as one list: '#' dropped, trimmed, blanks removed, duplicates removed ignoring case
// (the first spelling wins), so "Tofu", "tofu" and "#tofu" show once.
function mergeKeywords(...lists: (string[] | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of lists) {
    for (const raw of list ?? []) {
      const k = raw.trim().replace(/^#+/, '').trim()
      const key = k.toLowerCase()
      if (!k || seen.has(key)) continue
      seen.add(key)
      out.push(k)
    }
  }
  return out
}

// A short, stable hash (FNV-1a, 32-bit) so ids for pasted links don't collide when two URLs share a long start.
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

// A row from a video found in Find ideas (or a plan that has no row yet).
export function entryFromVideo(
  clientId: string,
  v: Video,
  source: ResearchEntry['source'] = 'search',
  now = Date.now(),
): ResearchEntry {
  return {
    id: researchId(clientId, v.id),
    clientId,
    videoId: v.id,
    account: v.handle,
    platform: v.platform,
    followers: v.followers,
    views: v.views,
    url: v.url,
    keywords: mergeKeywords(v.keywords, v.hashtags),
    hook: v.hook,
    notes: '',
    loggedAt: now,
    source,
  }
}

// Views per follower: the agency's "1-to-10" rule (lots of views on a small account). Null with no followers.
export const viewsPerFollower = (e: Pick<ResearchEntry, 'views' | 'followers'>): number | null =>
  e.followers > 0 ? e.views / e.followers : null

// The plan made from this row, if any.
export const planOf = (e: ResearchEntry, ideas: SavedIdea[]): SavedIdea | undefined =>
  ideas.find((i) => i.clientId === e.clientId && i.videoId === e.videoId)

export function researchStatus(e: ResearchEntry, ideas: SavedIdea[]): ResearchStatus {
  const plan = planOf(e, ideas)
  if (!plan) return 'none'
  if (plan.status === 'saved' || plan.status === 'rejected') return 'planning'
  if (plan.status === 'waiting') return 'waiting'
  return stageOf(plan) ?? 'approved'
}

// Every plan gets a row, so the sheet is never missing a video the team is making. Returns the same array
// when nothing is added.
export function withPlanRows(
  entries: ResearchEntry[],
  ideas: SavedIdea[],
  videoById: Map<string, Video>,
  now = Date.now(),
): ResearchEntry[] {
  const have = new Set(entries.map((e) => e.id))
  const added: ResearchEntry[] = []
  for (const i of ideas) {
    const id = researchId(i.clientId, i.videoId)
    const v = videoById.get(i.videoId)
    if (have.has(id) || !v) continue
    have.add(id)
    added.push(entryFromVideo(i.clientId, v, 'plan', now))
  }
  return added.length ? [...entries, ...added] : entries
}

// What "Add from link" collects. Numbers the person doesn't know are left at 0.
export interface LinkInput {
  url: string
  platform: Platform
  account: string
  followers: number
  views: number
  hook: string
  keywords: string[]
  notes: string
}

// A typed number, or 0 when it's blank, negative or not a number.
const count = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0)

// A video and its "format" for a pasted link, so a row added by hand can still be planned (a plan needs both,
// like a live search result). Shots stay empty for the team to write.
export function videoFromLink(input: LinkInput, now = Date.now()): { video: Video; format: Format } {
  // Readable start plus a hash of the whole URL. The hash keeps case (YouTube ids are case-sensitive) and the
  // part past the cut-off, so two links that start alike still get different ids, and the same link always gets
  // the same one.
  const url = input.url.trim()
  const slug = `${input.platform}-${url.replace(/^https?:\/\/(www\.)?/i, '')}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const key = `${slug}-${hash(`${input.platform} ${url}`)}`
  const id = `link-${key}`
  const hook = input.hook.trim() || url
  const video: Video = {
    id,
    platform: input.platform,
    // No account given: a short name for the link's site (the row shows it), not the whole address.
    handle: input.account.trim() || url.replace(/^https?:\/\/(www\.|m\.)?/i, '').split('/')[0] || url,
    hook,
    views: count(input.views),
    followers: count(input.followers),
    medianViews: null,
    daysAgo: 0,
    lengthSec: 0,
    shares: 0,
    saves: null,
    formatId: id,
    keywords: mergeKeywords(input.keywords),
    live: true,
    url,
    fetchedAt: now,
  }
  const format: Format = {
    id: video.formatId,
    name: hook,
    short: hook,
    tags: [],
    audiences: [],
    summary: input.notes,
    why: { hook: '', first3s: '', length: '', format: '', sound: '' },
    shotList: [],
    props: [],
    needs: [],
    effort: 'medium',
    editorNotes: `Match the pacing and edit style of the reference: ${url}`,
  }
  return { video, format }
}

// A slot's references (only the same client's, so a stray slotId can't pull in another client's row), the
// picked one (the first with a plan) and its status.
export function slotSummary(slot: ResearchSlot, entries: ResearchEntry[], ideas: SavedIdea[]): SlotSummary {
  const refs = entries.filter((e) => e.slotId === slot.id && e.clientId === slot.clientId)
  const picked = refs.find((e) => !!planOf(e, ideas))
  return { refs, picked, status: picked ? researchStatus(picked, ideas) : 'none' }
}

// The deal at a glance. Pass one client's slots and entries (or every client's: each entry is matched to a
// slot of its own client). A reference counts as unsorted when it has no slot, its slot was removed, or its
// slotId points at another client's slot, i.e. whenever no slot's summary lists it.
export function researchProgress(slots: ResearchSlot[], entries: ResearchEntry[], ideas: SavedIdea[]): ResearchProgress {
  const slotClient = new Map(slots.map((s) => [s.id, s.clientId]))
  const sums = slots.map((s) => slotSummary(s, entries, ideas))
  const done: ResearchStatus[] = ['approved', 'filming', 'editing', 'posted']
  return {
    slots: slots.length,
    picked: sums.filter((x) => x.picked).length,
    approved: sums.filter((x) => done.includes(x.status)).length,
    posted: sums.filter((x) => x.status === 'posted').length,
    unsorted: entries.filter((e) => !e.slotId || slotClient.get(e.slotId) !== e.clientId).length,
  }
}

// A new slot for a client: number = the one asked for (a whole number from 1), else the client's highest + 1
// (so a removed slot's number isn't reused while a higher one exists); topic trimmed, a blank due date left out.
// The id is unique even when two slots are made in the same millisecond.
export function newSlot(
  clientId: string,
  existing: ResearchSlot[],
  topic: string,
  dueDate?: string,
  now = Date.now(),
  asked?: number,
): ResearchSlot {
  const mine = existing.filter((s) => s.clientId === clientId)
  const number =
    asked !== undefined && Number.isInteger(asked) && asked >= 1
      ? asked
      : mine.reduce((n, s) => (Number.isFinite(s.number) ? Math.max(n, s.number) : n), 0) + 1
  const taken = new Set(existing.map((s) => s.id))
  const base = `${clientId}-slot-${now.toString(36)}-${number}`
  let id = base
  for (let i = 2; taken.has(id); i++) id = `${base}-${i}`
  return { id, clientId, number, topic: topic.trim(), dueDate: dueDate?.trim() || undefined, createdAt: now }
}

// The due date a plan picked in Research starts with: its video's due date when the slot has a valid one, else
// `fallback` (two weeks from today, like any new plan). Picking never asks for a date; it can be changed on Plans.
export function planDueDate(slot: Pick<ResearchSlot, 'dueDate'> | undefined, fallback: string): string {
  const due = slot?.dueDate?.trim()
  return due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? due : fallback
}

// True when someone has worked on a plan: shots written, editor notes changed from what a new plan starts with
// (`defaultNotes`, the reference's editor notes), a note to the manager, or it was ever sent for approval. Picking
// another reference in the same video replaces a plan like this only after asking; an untouched one is replaced
// at once, so a normal pick never stops to ask.
export function planHasWork(plan: SavedIdea, defaultNotes = ''): boolean {
  return (
    plan.shots !== undefined ||
    plan.notes.trim() !== defaultNotes.trim() ||
    !!plan.noteToApprover?.trim() ||
    plan.sentAt !== undefined ||
    !!plan.history?.length ||
    plan.status !== 'saved'
  )
}
