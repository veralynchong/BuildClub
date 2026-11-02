import type { Angle, Framing, Movement, Shot } from '../types'
import { t } from './i18n.ts'

export const FRAMINGS: Framing[] = ['wide', 'medium', 'close_up', 'extreme_close_up', 'overhead', 'pov']
export const ANGLES: Angle[] = ['eye_level', 'high', 'low', 'top_down']
export const MOVEMENTS: Movement[] = ['static', 'pan', 'tilt', 'push_in', 'handheld', 'tracking']

// Same limit as backend/shotlist.py.
export const MAX_SCRIPT = 6000

export const framingLabel = (v: Framing): string => t(`shots.framing.${v}`)
export const angleLabel = (v: Angle): string => t(`shots.angle.${v}`)
export const movementLabel = (v: Movement): string => t(`shots.movement.${v}`)

// The camera words a shot has, in the order framing, angle, movement. Empty for shots without any.
export function cameraLabels(s: Pick<Shot, 'framing' | 'angle' | 'movement'>): string[] {
  return [
    s.framing && framingLabel(s.framing),
    s.angle && angleLabel(s.angle),
    s.movement && movementLabel(s.movement),
  ].filter((x): x is string => !!x)
}

// Set one camera field; an empty value clears it so the shot saves without the key.
export function setCamera(shots: Shot[], index: number, field: 'framing' | 'angle' | 'movement', value: string): Shot[] {
  return shots.map((s, i) => {
    if (i !== index) return s
    const next = { ...s }
    if (value) (next as Record<string, unknown>)[field] = value
    else delete next[field]
    return next
  })
}

// ---- from a script -------------------------------------------------------------------------------

// What /api/shots/from-script returns for one shot. question and reaction are set for interviews only.
export interface DraftShot extends Shot {
  question?: string
  reaction?: string
}

const INTERVIEW_WORDS = /interview|street|vox ?pop|man on the street|街訪|街頭訪|訪談|採訪/i

// Whether a plan reads like a street interview, from the format name and its concept. The user can still tick it.
export function looksLikeInterview(...texts: (string | undefined)[]): boolean {
  return texts.some((x) => !!x && INTERVIEW_WORDS.test(x))
}

// A draft shot as it is stored in the plan. An interview shot reads as the question to ask, with the reaction to
// capture put in front of the tip; the wording of "Ask:" and "Capture:" follows the screen's language.
export function toPlanShot(d: DraftShot): Shot {
  const out: Shot = { time: d.time, shot: d.shot }
  if (d.question) {
    out.shot = `${t('shots.fs.ask')} ${d.question}`
    if (d.reaction) out.tip = `${t('shots.fs.capture')} ${d.reaction}${d.tip ? ` ${d.tip}` : ''}`
    else if (d.tip) out.tip = d.tip
  } else if (d.tip) out.tip = d.tip
  if (d.text) out.text = d.text
  if (d.framing) out.framing = d.framing
  if (d.angle) out.angle = d.angle
  if (d.movement) out.movement = d.movement
  return out
}

const RANGE = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*s?\s*$/

// Where the plan's timing ends, in seconds: the biggest end among shots whose time reads like "3-8s". 0 if none do.
export function planEnd(shots: Pick<Shot, 'time'>[]): number {
  let end = 0
  for (const s of shots) {
    const m = RANGE.exec(s.time)
    if (m) end = Math.max(end, Number(m[2]))
  }
  return end
}

const num = (n: number) => String(Math.round(n * 10) / 10)

// "0-3s" moved later by `offset` seconds. Times that don't read as a range stay as they are.
export function shiftTime(time: string, offset: number): string {
  const m = RANGE.exec(time)
  if (!m || offset <= 0) return time
  return `${num(Number(m[1]) + offset)}-${num(Number(m[2]) + offset)}s`
}

export type ApplyMode = 'replace' | 'append'

// Replace swaps the whole list. Append adds to the end, with the new timings moved to start where the plan ends.
export function applyDraft(shots: Shot[], draft: DraftShot[], mode: ApplyMode): Shot[] {
  const fresh = draft.map(toPlanShot)
  if (mode === 'replace') return fresh
  const offset = planEnd(shots)
  return [...shots, ...fresh.map((s) => ({ ...s, time: shiftTime(s.time, offset) }))]
}

export interface DraftResult {
  source: 'claude' | 'demo'
  interview: boolean
  shots: DraftShot[]
}

export async function shotsFromScript(script: string, interview: boolean): Promise<DraftResult> {
  let r: Response
  try {
    r = await fetch('/api/shots/from-script', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ script, interview }),
    })
  } catch {
    throw new Error(t('shots.fs.err.failed'))
  }
  if (r.ok) return r.json()
  const data = await r.json().catch(() => null)
  throw new Error(typeof data?.error === 'string' ? data.error : t('shots.fs.err.failed'))
}
