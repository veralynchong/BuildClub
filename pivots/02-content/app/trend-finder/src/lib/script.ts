import type { Client, PlanScript, ScriptLine, Shot } from '../types'
import { t } from './i18n.ts'
import { writeScript } from './storyboard.ts'

// The plan's script: one spoken line, plus any on-screen words, per shot. Shot 1 says the picked hook.
// Pure logic only, so it can be unit tested; components/PlanScript.tsx shows and edits it.

const clean = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim()

// What the shot shows, ready to drop into a sentence: the part after a camera note ("Close-up: cubes turning
// golden" → "cubes turning golden"), without a closing full stop, lower-cased when it starts like a sentence.
export function shotPhrase(shot: string): string {
  let x = clean(shot)
  const colon = x.indexOf(':')
  if (colon > 0 && colon < 24 && x.slice(colon + 1).trim()) x = x.slice(colon + 1).trim()
  x = x.replace(/[.。!！]+$/, '')
  return /^[A-Z][a-z]/.test(x) ? x[0].toLowerCase() + x.slice(1) : x
}

// The shot list a script is written from. Only what changes the script counts (what is filmed, the line, the
// on-screen words, the order); timing, camera and ids don't.
export function scriptBasis(shots: Pick<Shot, 'shot' | 'line' | 'text'>[]): string {
  return JSON.stringify(shots.map((s) => [clean(s.shot), clean(s.line), clean(s.text)]))
}

// The shot list changed since the script was written.
export const scriptOutOfDate = (script: Pick<PlanScript, 'basedOn'>, shots: Pick<Shot, 'shot' | 'line' | 'text'>[]): boolean =>
  script.basedOn !== scriptBasis(shots)

export interface ScriptInput {
  shots: Pick<Shot, 'shot' | 'line' | 'text'>[]
  // The picked hook (shot 1's line). Empty: the first suggested hook, given by the caller.
  hook: string
  client: Pick<Client, 'name'>
}

// A sensible script from the shots, in the screen's language. A shot's own line (typed on the board, or the
// picked hook) is kept word for word; the others get a short line built from what the shot shows.
// The last shot asks people to follow the client.
export function buildScript({ shots, hook, client }: ScriptInput): ScriptLine[] {
  const total = shots.length
  return shots.map((s, i) => {
    const own = clean(s.line)
    const what = shotPhrase(s.shot)
    const onScreen = clean(s.text)
    if (i === 0) {
      const say = clean(hook) || own || (what ? t('plan.script.sample.hook', { what }) : '')
      return { say, onScreen }
    }
    if (i === total - 1) {
      const say = own || (what ? t('plan.script.sample.cta', { what, client: client.name }) : t('plan.script.sample.ctaOnly', { client: client.name }))
      return { say, onScreen: onScreen || t('plan.script.sample.ctaText', { client: client.name }) }
    }
    const say = own || (what ? t(i === 1 ? 'plan.script.sample.first' : 'plan.script.sample.next', { what }) : '')
    return { say, onScreen }
  })
}

// A new script for these shots.
export function makeScript(input: ScriptInput, now = Date.now()): PlanScript {
  return { lines: buildScript(input), basedOn: scriptBasis(input.shots), writtenAt: now }
}

// Native plans use the backend writer; sample mode remains local and never calls a provider.
export async function draftScript(ideaId: string, input: ScriptInput, live = false, force = false): Promise<PlanScript> {
  if (!live) return makeScript(input)
  const written = await writeScript(ideaId, force, scriptBasis(input.shots))
  if (!Array.isArray(written.shots) || written.shots.length !== input.shots.length) throw new Error(t('plan.script.stale'))
  if (written.shots.some((shot, i) => 'shot' in shot && shot.shot !== input.shots[i].shot)) throw new Error(t('plan.script.stale'))
  if (written.shots.some(shot => typeof shot.line !== 'string')) throw new Error(t('plan.sb.err.write'))
  return { lines: written.shots.map((shot, i) => ({ say: shot.line!, onScreen: clean(input.shots[i].text) })), basedOn: scriptBasis(input.shots), writtenAt: Date.now() }
}

// The user's change to one line. The script is then marked as edited, so writing it again asks first.
export function editScriptLine(script: PlanScript, index: number, patch: Partial<ScriptLine>): PlanScript {
  if (index < 0 || index >= script.lines.length) return script
  return { ...script, edited: true, lines: script.lines.map((l, i) => (i === index ? { ...l, ...patch } : l)) }
}

// Old or hand-edited saved data: a script is used only when it has a list of lines.
export function savedScript(raw: unknown): PlanScript | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<PlanScript>
  if (!Array.isArray(s.lines)) return null
  return {
    lines: s.lines.map((l) => ({ say: typeof l?.say === 'string' ? l.say : '', onScreen: typeof l?.onScreen === 'string' ? l.onScreen : '' })),
    basedOn: typeof s.basedOn === 'string' ? s.basedOn : '',
    edited: !!s.edited,
    writtenAt: typeof s.writtenAt === 'number' ? s.writtenAt : 0,
  }
}
