import type { Framing, Shot } from '../types'
import { DEFAULT_SECONDS, retime, secondsOf } from './shotBoard.ts'

// Editing the planning board by prompt. The routes below are proposed (see docs/shot-board-api.md) and not built
// yet, so every call falls back to a sample edit made here from the prompt's words. The sample is deterministic:
// the same prompt on the same shots always gives the same result, so a demo never fails or surprises.

// 'ai': the API answered. 'sample': made here, because the app runs on sample data ('offline') or the call
// failed ('failed'), which the board says in words.
export type AssistSource = 'ai' | 'sample'
export type SampleReason = 'offline' | 'failed'

export interface Assisted<T> {
  source: AssistSource
  reason?: SampleReason
  result: T
}

// Same limit for both prompts; the server should use it too.
export const MAX_PROMPT = 500

const base = (ideaId: string) => `/api/ideas/${encodeURIComponent(ideaId)}/board`

type Fetch = typeof fetch

async function post(url: string, body: unknown, fetcher: Fetch): Promise<unknown> {
  const r = await fetcher(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

const isShot = (x: unknown): x is Shot =>
  !!x && typeof x === 'object' && typeof (x as Shot).shot === 'string' && typeof ((x as Shot).time ?? '') === 'string'

// The board's own fields (footage) never go to the server: it doesn't need the pictures to write shots.
const forServer = (s: Shot): Shot => {
  const { footage, ...rest } = s
  return footage ? { ...rest, shot: rest.shot || footage.name } : rest
}

export interface AssistOptions {
  // False in sample mode (no local API): go straight to the sample edit.
  live: boolean
  fetcher?: Fetch
}

// "Change the shot list": the whole list rewritten from a prompt ("make it faster").
export async function rewriteShots(ideaId: string, shots: Shot[], prompt: string, opts: AssistOptions): Promise<Assisted<Shot[]>> {
  if (opts.live) {
    try {
      const data = (await post(`${base(ideaId)}/rewrite`, { prompt, shots: shots.map(forServer) }, opts.fetcher ?? fetch)) as {
        shots?: unknown
      }
      if (Array.isArray(data?.shots) && data.shots.every(isShot)) {
        return { source: 'ai', result: keepFootage(shots, data.shots as Shot[]) }
      }
    } catch {
      // fall through to the sample
    }
  }
  return { source: 'sample', reason: opts.live ? 'failed' : 'offline', result: sampleRewrite(shots, prompt) }
}

// "Add a shot between two cards": one new shot written for that gap.
export async function insertShot(
  ideaId: string,
  before: Shot | null,
  after: Shot | null,
  prompt: string,
  opts: AssistOptions,
): Promise<Assisted<Shot>> {
  if (opts.live) {
    try {
      const body = { prompt, before: before && forServer(before), after: after && forServer(after) }
      const data = (await post(`${base(ideaId)}/insert`, body, opts.fetcher ?? fetch)) as { shot?: unknown }
      if (isShot(data?.shot)) return { source: 'ai', result: data.shot }
    } catch {
      // fall through to the sample
    }
  }
  return { source: 'sample', reason: opts.live ? 'failed' : 'offline', result: sampleInsert(before, prompt) }
}

// A rewrite never drops the team's own footage by accident: a returned shot at the same index keeps its file.
function keepFootage(old: Shot[], fresh: Shot[]): Shot[] {
  return fresh.map((s, i) => (old[i]?.footage && !s.footage ? { ...s, footage: old[i].footage } : s))
}

// ---- sample edits (no AI) ------------------------------------------------------------------------

const FASTER = /\b(fast|faster|quick|quicker|short|shorter|tight|tighter|snappy|speed)\b|快|短|精簡/i
const SLOWER = /\b(slow|slower|long|longer|breathe|calm)\b|慢|長/i
const ADD = /^\s*(?:please\s+)?(?:add|insert|include|put in|show)\s+(?:a\s+|an\s+|the\s+|some\s+)?|^\s*(?:加入|加上|加|增加|新增|插入)\s*(?:一個|一段|一顆)?/i
const REMOVE = /^\s*(?:please\s+)?(?:remove|drop|cut|delete|lose)\s+(?:the\s+|a\s+|an\s+)?|^\s*(?:刪除|刪掉|去掉|拿掉)\s*/i

// The words a prompt is about, without the verb ("add a taste-test reaction" → "taste-test reaction").
export function promptSubject(prompt: string): string {
  return prompt.replace(ADD, '').replace(REMOVE, '').replace(/[.!。！]+$/, '').trim()
}

// A framing guessed from the words, so the sample shot has camera direction like the rest.
export function guessFraming(text: string): Framing {
  if (/reaction|face|taste|bite|close|detail|hands?|表情|反應|特寫|試吃|手/i.test(text)) return 'close_up'
  if (/wide|room|shop|store|street|crowd|establish|outside|全景|店|街|外/i.test(text)) return 'wide'
  if (/overhead|top|table|flat ?lay|俯拍|桌/i.test(text)) return 'overhead'
  if (/pov|point of view|my eyes|第一人稱/i.test(text)) return 'pov'
  return 'medium'
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

// A new shot from a prompt: what to film is the prompt's subject, timed DEFAULT_SECONDS from where `before` ends.
export function sampleShot(prompt: string, before: Shot | null): Shot {
  const subject = capitalise(promptSubject(prompt) || prompt.trim())
  const start = before ? endOf(before) : 0
  return {
    time: `${round(start)}-${round(start + DEFAULT_SECONDS)}s`,
    shot: subject,
    framing: guessFraming(subject),
    angle: 'eye_level',
    movement: 'static',
  }
}

export function sampleInsert(before: Shot | null, prompt: string): Shot {
  return sampleShot(prompt, before)
}

// The whole list from a prompt. Rules, in order:
// - "remove X": drops shots that mention X (never the last one standing);
// - "add X": a new shot about X before the last shot, so the ending stays last;
// - "faster / shorter": every shot about 60% as long, and at most 5 shots (keep the first four and the last);
// - "slower / longer": every shot about 140% as long;
// - anything else: read as "add X".
// Times always run on from one shot to the next afterwards.
export function sampleRewrite(shots: Shot[], prompt: string): Shot[] {
  const p = prompt.trim()
  if (!p) return shots
  let out = shots
  if (REMOVE.test(p)) {
    const words = promptSubject(p).toLowerCase().split(/\s+/).filter((w) => w.length > 2 || w.charCodeAt(0) > 127)
    const hit = (s: Shot) => words.length > 0 && words.some((w) => `${s.shot} ${s.text ?? ''} ${s.line ?? ''}`.toLowerCase().includes(w))
    const left = out.filter((s) => !hit(s))
    out = left.length ? left : out.slice(0, 1)
  } else if (!ADD.test(p) && FASTER.test(p)) {
    const kept = out.length > 5 ? [...out.slice(0, 4), out[out.length - 1]] : out
    out = kept.map((s) => scale(s, 0.6))
  } else if (!ADD.test(p) && SLOWER.test(p)) {
    out = out.map((s) => scale(s, 1.4))
  } else {
    const at = Math.max(0, out.length - 1)
    out = [...out.slice(0, at), sampleShot(p, out[at - 1] ?? null), ...out.slice(at)]
  }
  return retime(out)
}

const round = (n: number) => String(Math.round(n * 10) / 10)

function endOf(s: Shot): number {
  const m = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/.exec(s.time ?? '')
  return m ? Number(m[2]) : 0
}

// A shot made `k` times as long (at least 1 second). Shots whose time isn't a range keep it.
function scale(s: Shot, k: number): Shot {
  const len = secondsOf(s.time ?? '')
  if (len === null) return s
  const next = Math.max(1, Math.round(len * k * 10) / 10)
  return { ...s, time: `0-${round(next)}s` }
}
