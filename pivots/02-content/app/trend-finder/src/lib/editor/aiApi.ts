import { t } from '../i18n.ts'
import { serverText } from '../serverText.ts'
import type { Clip, SpeechCaption } from './types.ts'

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
