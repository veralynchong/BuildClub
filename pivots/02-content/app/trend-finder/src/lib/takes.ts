import type { IdeaStatus } from '../types'
import { areas, t } from './i18n.ts'
import { serverText } from './serverText.ts'

// One uploaded video for a shot of an approved plan. One take per shot is chosen. A take belongs to a shot by its
// stable id (`shotId`); `shot` is that shot's current 0-based place in the list, null once the shot was removed.
export interface Take {
  id: string
  ideaId: string
  shot: number | null
  shotId: string | null
  name: string
  size: number
  chosen: boolean
  createdAt: number
  url: string
  cleanedFrom: string | null // the take this one was cleaned from, null for an upload
  analysis?: TakeAnalysis | null // what the server found out about the footage; absent in lists that don't carry it
}

// The background look at a take (words, pauses, picture cuts, loudness); `summary` is there once it is done.
export interface TakeAnalysis {
  status: 'queued' | 'running' | 'done' | 'failed'
  error: string | null
  summary?: { duration: number | null; words: number; speech: string | null; silences: number; cuts: number }
}

export const analysing = (take: Take): boolean => take.analysis?.status === 'queued' || take.analysis?.status === 'running'

// Same limits and copy as backend/takes.py.
export const MAX_TAKE_BYTES = 200 * 1024 * 1024

const VIDEO_TYPES = { mp4: 'video/mp4', mov: 'video/quicktime', m4v: 'video/x-m4v', webm: 'video/webm' } as const
type VideoType = (typeof VIDEO_TYPES)[keyof typeof VIDEO_TYPES]

// The upload's Content-Type. Some browsers leave file.type empty, so the extension decides then.
export function videoType(file: { name: string; type: string }): VideoType | null {
  const known = Object.values(VIDEO_TYPES) as string[]
  if (known.includes(file.type)) return file.type as VideoType
  if (file.type) return null
  const ext = file.name.toLowerCase().split('.').pop() as keyof typeof VIDEO_TYPES
  return VIDEO_TYPES[ext] ?? null
}

// The reason a file can't be uploaded, checked before sending it; null when it can.
export function checkFile(file: { name: string; type: string; size: number }): string | null {
  if (!videoType(file)) return t('plan.takes.notVideo')
  if (file.size > MAX_TAKE_BYTES) return t('plan.takes.tooBig')
  return null
}

// 1536 -> "1.5 KB", 52428800 -> "50 MB"
export function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let n = bytes
  let u = 0
  while (n >= 1024 && u < units.length - 1) {
    n /= 1024
    u += 1
  }
  return `${u === 0 ? n : Number(n.toFixed(1))} ${units[u]}`
}

// Takes grouped per current shot; takes of shots since removed are left out (they stay stored).
export function takesByShot(takes: Take[], shotCount: number): Take[][] {
  const groups: Take[][] = Array.from({ length: shotCount }, () => [])
  for (const t of takes) if (t.shot !== null && t.shot >= 0 && t.shot < shotCount) groups[t.shot].push(t)
  return groups
}

// How many of the current shots have a chosen take.
export function checklistProgress(shotCount: number, takes: Take[]): { done: number; total: number } {
  const done = takesByShot(takes, shotCount).filter((g) => g.some((t) => t.chosen)).length
  return { done, total: shotCount }
}

// Takes can be added, chosen or deleted only while the plan is approved; reopened plans keep them read-only.
export const canEdit = (status: IdeaStatus): boolean => status === 'approved'

const base = (ideaId: string) => `/api/ideas/${encodeURIComponent(ideaId)}`

async function send<T>(r: Response, fallback: string): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  throw new Error(serverText(body?.error) || fallback)
}

export async function listTakes(ideaId: string): Promise<Take[]> {
  return send(await fetch(`${base(ideaId)}/takes`), t('plan.takes.err.load'))
}

export async function uploadTake(ideaId: string, shot: number, file: File): Promise<Take> {
  const r = await fetch(`${base(ideaId)}/shots/${shot}/takes`, {
    method: 'POST',
    body: file,
    headers: { 'content-type': videoType(file) ?? '', 'x-filename': encodeURIComponent(file.name) },
  })
  return send(r, t('plan.takes.err.upload'))
}

export async function retryAnalysis(ideaId: string, takeId: string): Promise<void> {
  await send(await fetch(`${base(ideaId)}/takes/${encodeURIComponent(takeId)}/analysis/retry`, { method: 'POST' }), t('editor.analysis.retryFailed'))
}

export async function chooseTake(ideaId: string, takeId: string): Promise<Take[]> {
  return send(await fetch(`${base(ideaId)}/takes/${encodeURIComponent(takeId)}/choose`, { method: 'POST' }), t('plan.takes.err.choose'))
}

export async function deleteTake(ideaId: string, takeId: string): Promise<Take[]> {
  return send(await fetch(`${base(ideaId)}/takes/${encodeURIComponent(takeId)}`, { method: 'DELETE' }), t('plan.takes.err.delete'))
}

export interface CleanResult {
  take: Take
  takes: Take[]
  originalSec: number
  cleanSec: number
  trims: { kind: 'pause' | 'filler'; start: number; end: number }[]
}

// A take can be cleaned once: it is not itself a cleaned version and none was made from it yet.
export function canClean(take: Take, all: Take[]): boolean {
  return !take.cleanedFrom && !all.some((x) => x.cleanedFrom === take.id)
}

// The seconds a clean-up cut, as the note shows them.
export const cutSeconds = (r: Pick<CleanResult, 'originalSec' | 'cleanSec'>): string => Math.max(0, r.originalSec - r.cleanSec).toFixed(1)

// Clean-ups the server refuses only because there is nothing to cut. That is a result, not a failure.
export class NothingToCut extends Error {}
const NOTHING_TO_CUT = new Set([areas.server.en['server.cleaning.noSpeech'], areas.server.en['server.cleaning.nothing']])
export const isNothingToCut = (error: unknown): boolean => typeof error === 'string' && NOTHING_TO_CUT.has(error)

export async function cleanTake(ideaId: string, takeId: string): Promise<CleanResult> {
  const r = await fetch(`${base(ideaId)}/takes/${encodeURIComponent(takeId)}/clean`, { method: 'POST' })
  if (r.status === 422) {
    const body = await r.clone().json().catch(() => null)
    if (isNothingToCut(body?.error)) throw new NothingToCut(serverText(body.error))
  }
  return send(r, t('canvas.footage.cleanFailed'))
}
