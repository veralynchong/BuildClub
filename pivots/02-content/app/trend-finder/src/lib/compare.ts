// Compare viral videos: 2-5 links go to the API, which breaks each one down (reusing finished
// breakdowns) and then writes what they share. Shapes follow CompareJob in backend/models.py.

import { t, type Key } from './i18n.ts'

export const MIN_VIDEOS = 2
export const MAX_VIDEOS = 5

export type HookType = 'visual' | 'question_or_text' | 'rage_bait' | 'informative' | 'challenge' | 'other'

// The label key of a hook type. "other" is spelled "misc" in the strings, since a key ending in .other
// would read as the plural form of a count.
export const hookLabelKey = (h: HookType): Key => `compare.hookType.${h === 'other' ? 'misc' : h}` as Key

export interface CompareBeat {
  beat: string
  what: string
  timing: string
}

export interface CompareResult {
  commonFormat: string
  structure: CompareBeat[]
  typicalLength: string
  hookPattern: { pattern: string; hookTypes: HookType[] }
  emotionPattern: string
  whatToCopy: string[]
  whatDiffers: string[]
  confidence: string
}

export interface CompareVideo {
  url: string
  job: string
  status: 'queued' | 'running' | 'done' | 'failed'
  progress: number
  step: string
  error?: string
  concept?: string
  lengthSec?: number
}

export interface CompareProgress {
  status: 'queued' | 'running' | 'done' | 'failed'
  step: string
  progress: number
  videos: CompareVideo[]
}

export interface CompareDone {
  job: string
  videos: CompareVideo[]
  result: CompareResult
}

// The same link check as the backend (is_video_link in server.py).
const X_STATUS = /^https:\/\/(www\.|mobile\.)?(x|twitter)\.com\/\w+\/status\/\d+/
const PREFIXES = [
  'https://www.tiktok.com/',
  'https://www.instagram.com/',
  'https://www.youtube.com/shorts/',
  'https://youtube.com/shorts/',
  'https://www.reddit.com/r/',
  'https://v.redd.it/',
]
export const isVideoLink = (url: string): boolean => PREFIXES.some((p) => url.startsWith(p)) || X_STATUS.test(url)

// Links pasted one per line (or separated by spaces or commas), without blanks or repeats.
export function parseLinks(text: string): string[] {
  return [...new Set(text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean))]
}

// "@name · hook" for the picker. A handle may already carry its "@" (live results) or be a "r/community".
export const pickLabel = (handle: string, text: string): string => `${/^(@|r\/)/.test(handle) ? handle : `@${handle}`} · ${text}`.slice(0, 120)

// Pasted links and ticked videos together, in that order, without repeats.
export const mergeLinks = (pasted: string[], picked: string[]): string[] => [...new Set([...pasted, ...picked])]

export type Check = { ok: true; urls: string[] } | { ok: false; reason: 'few' | 'many' | 'link'; link?: string }

export function checkLinks(urls: string[]): Check {
  const bad = urls.find((u) => !isVideoLink(u))
  if (bad) return { ok: false, reason: 'link', link: bad }
  if (urls.length < MIN_VIDEOS) return { ok: false, reason: 'few' }
  if (urls.length > MAX_VIDEOS) return { ok: false, reason: 'many' }
  return { ok: true, urls }
}

const CHECK_ERRORS: Record<'few' | 'many' | 'link', Key> = {
  few: 'compare.err.few',
  many: 'compare.err.many',
  link: 'compare.err.link',
}
export const checkMessage = (c: Extract<Check, { ok: false }>): string => t(CHECK_ERRORS[c.reason], { link: c.link ?? '' })

// The backend answers in English; its input errors carry a code so the page can use the chosen language.
const API_ERRORS: Record<string, Key> = { few: 'compare.err.few', many: 'compare.err.many', link: 'compare.err.link' }
export const apiMessage = (body: { error?: string; code?: string }, fallback: Key): string =>
  (body.code && API_ERRORS[body.code] ? t(API_ERRORS[body.code], { link: '' }) : body.error) ?? t(fallback)

const LAST = 'remake.compare.last'

// The comparison on show, so a refresh brings it back (the result itself is saved by the server).
export function lastCompare(store: Pick<Storage, 'getItem'> | null = safeStore()): { job: string; urls: string[] } | null {
  try {
    const v = JSON.parse(store?.getItem(LAST) ?? 'null')
    return v && typeof v.job === 'string' && Array.isArray(v.urls) ? v : null
  } catch {
    return null
  }
}

export function rememberCompare(job: string, urls: string[], store: Pick<Storage, 'setItem'> | null = safeStore()): void {
  try {
    store?.setItem(LAST, JSON.stringify({ job, urls }))
  } catch {
    // Private windows can refuse storage; the page works without it.
  }
}

function safeStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((done, fail) => {
    const timer = setTimeout(done, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      fail(new DOMException('Stopped', 'AbortError'))
    })
  })

export async function startCompare(urls: string[], signal?: AbortSignal): Promise<string> {
  const r = await fetch('/api/compare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls }),
    signal,
  })
  const body = (await r.json().catch(() => ({}))) as { job?: string; error?: string; code?: string }
  if (!r.ok || !body.job) throw new Error(apiMessage(body, 'compare.err.start'))
  return body.job
}

export async function pollCompare(job: string, onProgress: (p: CompareProgress) => void, signal?: AbortSignal): Promise<CompareDone> {
  for (;;) {
    const res = await fetch(`/api/compare/${job}`, { signal })
    const body = (await res.json().catch(() => ({}))) as Partial<CompareProgress> & { result?: CompareResult; error?: string }
    if (!res.ok) throw new Error(body.error ?? t('compare.err.lost'))
    if (body.status === 'done' && body.result) return { job, videos: body.videos ?? [], result: body.result }
    if (body.status === 'failed') throw new Error(body.error ?? t('compare.err.failed'))
    onProgress({ status: body.status ?? 'queued', step: body.step ?? '', progress: body.progress ?? 0, videos: body.videos ?? [] })
    await pause(2000, signal)
  }
}
