import type { Shot } from '../../types.ts'
import type { ClipSource } from '../../lib/editor/types.ts'
import type { Generation } from '../../lib/canvas/types.ts'
import type { Take } from '../../lib/takes.ts'
import { t } from '../../lib/i18n.ts'

// "Shot 3" when the footage belongs to a shot of the plan, else a generic name.
export function clipName(source: { shotId?: string }, shots: Shot[]): string {
  const i = source.shotId ? shots.findIndex((s) => s.id === source.shotId) : -1
  return i >= 0 ? t('editor.clip.shot', { n: i + 1 }) : t('editor.clip.generic')
}

// "Shot 1 · v3" for a generated clip (the version's place among the node's done versions), "Shot 2 · Take 1" for a take
// (its order within the shot), else the generic name.
export function clipLabel(src: ClipSource, shots: Shot[], gens: Generation[], takes: Take[]): string {
  const i = src.shotId ? shots.findIndex((s) => s.id === src.shotId) : -1
  if (i < 0) return t('editor.clip.generic')
  if (src.kind === 'generation') {
    const g = gens.find((x) => x.id === src.id)
    const done = g ? gens.filter((x) => x.nodeId === g.nodeId && x.status === 'done').sort((a, b) => a.createdAt - b.createdAt) : []
    const v = done.findIndex((x) => x.id === src.id) + 1
    return v > 0 ? t('editor.clip.shotVersion', { n: i + 1, v }) : t('editor.clip.shot', { n: i + 1 })
  }
  const k = takes.filter((x) => x.shotId === src.shotId).sort((a, b) => a.createdAt - b.createdAt).findIndex((x) => x.id === src.id) + 1
  return k > 0 ? t('editor.clip.shotTake', { n: i + 1, k }) : t('editor.clip.shot', { n: i + 1 })
}
