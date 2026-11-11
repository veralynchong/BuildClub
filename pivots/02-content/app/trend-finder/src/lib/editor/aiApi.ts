import { t } from '../i18n.ts'
import { serverText } from '../serverText.ts'
import type { Clip, ClipSource, EditProject, SpeechCaption } from './types.ts'

// The editor's AI suggestions (backend/suggest.py). Every answer is a proposal; nothing is changed on the server.

export type CleanupType = 'silence' | 'filler' | 'retake'

export interface CleanupItem {
  id: string
  type: CleanupType
  start: number // seconds in the take
  end: number
  label: string
  reason: string
  text?: string // the filler word, or the earlier try of a retake
  where?: 'start' | 'middle' | 'end' // silences only
}

export type Alignment =
  | { status: 'manual' } // the shot has no spoken line
  | { status: 'ok'; coverage: number; matched: number; total: number; in: number | null; out: number | null; missing: string[] }

export type Speech = 'ok' | 'none' | 'unavailable'

export interface ClipSuggestions {
  takeId: string
  shotId: string | null
  speech: Speech
  speechError?: string | null
  duration: number | null
  line: string | null
  alignment: Alignment
  cleanup: CleanupItem[]
}

export interface RankedTake {
  takeId: string
  name: string
  chosen: boolean
  duration: number | null
  score: number
  reason: string
  speech: string
  coverage: number | null
  fillers: number
  longPauses: number
  retakes: number
  lufs: number | null
  in: number | null
  out: number | null
  missing: string[]
}

export interface TakeRanking {
  shotId: string
  line: string | null
  count: number
  pending: string[]
  ranking: RankedTake[]
}

// 409 from the server: the take is still being looked at (`queued`, `running`) or could not be (`failed`).
export class NotReady extends Error {
  status: 'queued' | 'running' | 'failed'
  constructor(status: string, message: string) {
    super(message)
    this.status = status === 'failed' ? 'failed' : status === 'running' ? 'running' : 'queued'
  }
}

const base = (planId: string) => `/api/ideas/${encodeURIComponent(planId)}/edit/suggest`

async function send<T>(r: Response): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  if (r.status === 409 && body && typeof body.status === 'string') throw new NotReady(body.status, serverText(body.error))
  throw new Error(serverText(body?.error) || t('editor.ai.err'))
}

export async function getClipSuggestions(planId: string, takeId: string, from: number, to: number, paddingFrames: number): Promise<ClipSuggestions> {
  const q = new URLSearchParams({ take: takeId, in: String(from), out: String(to), padding: String(paddingFrames) })
  return send(await fetch(`${base(planId)}/clip?${q}`))
}

export async function getTakeRanking(planId: string, shotId: string): Promise<TakeRanking> {
  return send(await fetch(`${base(planId)}/takes?shot=${encodeURIComponent(shotId)}`))
}

// The parts of [from, to] that stay once `removals` are cut, with the padding added around each cut.
export async function getKeeps(planId: string, from: number, to: number, removals: [number, number][], paddingFrames: number): Promise<number[][]> {
  const r = await fetch(`${base(planId)}/keeps`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ in: from, out: to, removals, paddingFrames }),
  })
  return (await send<{ keeps: number[][] }>(r)).keeps
}

export async function getSpeechCaptions(planId: string, clips: Clip[]): Promise<{ status: Speech; entries: SpeechCaption[] }> {
  const r = await fetch(`${base(planId)}/captions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clips: clips.map((c) => ({ source: { kind: c.source.kind, id: c.source.id }, in: c.in, out: c.out })) }),
  })
  return send(r)
}

// ---- auto first cut ----

// One decision of the first cut. `at` is the second of the new timeline to look at; the other fields depend on `kind`.
export interface FirstCutEntry {
  kind: 'pick' | 'trim' | 'missing' | 'cut' | 'skip' | 'limit'
  text: string // the sentence in English, as the server says it
  shot: number // 1-based place in the shot list
  at: number
  takeId?: string
  name?: string
  takes?: number
  speech?: string
  coverage?: number | null
  fillers?: number
  longPauses?: number
  retakes?: number
  type?: CleanupType
  start?: number
  end?: number
  duration?: number
  seconds?: number
  said?: string | null
  words?: string[]
  why?: 'none' | 'short' | 'empty' // skips only
}

export interface FirstCut {
  clips: Clip[]
  primaries: Record<string, ClipSource>
  log: FirstCutEntry[]
  seconds: number
  shotsUsed: number
  captions: { status: Speech; entries: SpeechCaption[] }
}

export async function getFirstCut(planId: string, paddingFrames: number): Promise<FirstCut> {
  const r = await fetch(`${base(planId)}/first-cut`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paddingFrames }),
  })
  return send(r)
}

// Where the music goes down for these clips (timeline seconds). The export works the same ranges out itself.
export async function getDuckRanges(planId: string, project: Pick<EditProject, 'clips' | 'voiceover'>): Promise<[number, number][]> {
  const r = await fetch(`/api/ideas/${encodeURIComponent(planId)}/edit/duck`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      clips: project.clips.map((c) => ({ source: { kind: c.source.kind, id: c.source.id }, in: c.in, out: c.out, volume: c.volume, muted: c.muted })),
      voiceover: project.voiceover.map((v) => ({ id: v.id, start: v.start })),
    }),
  })
  return (await send<{ ranges: [number, number][] }>(r)).ranges
}

// The saved timeline as an EDL (Premiere, DaVinci Resolve) or OpenTimelineIO.
export const edlUrl = (planId: string, format: 'edl' | 'otio' = 'edl'): string => `/api/ideas/${encodeURIComponent(planId)}/edit/edl?format=${format}`

// ---- writing helpers (backend/editor_ai.py) ----

// "ai" when Claude wrote it, "rules" when the plain checks did (no key, or the demo switch is on).
export type AnswerSource = 'ai' | 'rules'

export interface HookCheck {
  source: AnswerSource
  score: number // 1 to 5
  verdict: string
  fixes: string[]
}

export interface CaptionRewrite {
  id: string
  before: string
  after: string
}

export interface PostCopy {
  source: AnswerSource
  preset: string
  title: string // at most 60 characters
  caption: string // at most 150
  hashtags: string[] // 3 to 5, each starting with #
}

export type TaskType = 'swap_take' | 'trim' | 'caption' | 'music' | 'other'

export interface ClientNote {
  id: string
  atSec: number | null // null: a note on the whole cut
  text: string
  author: string
  source: 'staff' | 'review'
}

export interface NoteTask {
  commentId: string
  type: TaskType
  target: string
  action: string
  done: boolean
  source: AnswerSource
}

export interface ClientNotes {
  shared: boolean // a cut was sent to the client's approver
  cut: { status: 'waiting' | 'approved' | 'rejected'; sentAt: number; decidedAt: number | null } | null
  notes: ClientNote[]
  tasks: NoteTask[]
}

export interface TimedLine {
  id?: string
  start: number
  end: number
  text: string
}

const aiBase = (planId: string) => `/api/ideas/${encodeURIComponent(planId)}/edit/ai`

const post = (url: string, body: unknown): Promise<Response> =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export async function checkHook(planId: string, captions: TimedLine[], texts: TimedLine[]): Promise<HookCheck> {
  return send(await post(`${aiBase(planId)}/hook-check`, { captions, texts }))
}

export async function rewriteCaptions(planId: string, captions: SpeechCaption[]): Promise<{ source: AnswerSource; items: CaptionRewrite[] }> {
  return send(await post(`${aiBase(planId)}/rewrite-captions`, { captions: captions.map(({ id, start, end, text }) => ({ id, start, end, text })) }))
}

export async function writePost(planId: string, preset: string): Promise<PostCopy> {
  return send(await post(`${aiBase(planId)}/copy`, { preset }))
}

export async function getClientNotes(planId: string): Promise<ClientNotes> {
  return send(await fetch(`${aiBase(planId)}/client-notes`))
}

export async function makeNoteTasks(planId: string): Promise<{ source: AnswerSource; tasks: NoteTask[] }> {
  return send(await post(`${aiBase(planId)}/client-notes/tasks`, {}))
}

export async function setTaskDone(planId: string, commentId: string, done: boolean): Promise<NoteTask[]> {
  const r = await fetch(`${aiBase(planId)}/client-notes/tasks/${encodeURIComponent(commentId)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ done }),
  })
  return (await send<{ tasks: NoteTask[] }>(r)).tasks
}
