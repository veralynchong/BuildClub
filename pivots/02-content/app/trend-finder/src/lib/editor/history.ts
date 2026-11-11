// Undo and redo for the edit project: every change keeps the project as it was before it. Pure, so the unit tests can
// check it; EditorPanel holds one of these in a ref.
import type { EditProject } from './types.ts'

export type Step = { project: EditProject; label: string | null; at: number } // the project before a change, and what the change was
export type History = { past: Step[]; future: Step[] }

export const HISTORY_LIMIT = 100
// Unnamed changes this close together are one step: a drag sends a change on every pointer move, typing one per key.
export const MERGE_MS = 500

export const emptyHistory = (): History => ({ past: [], future: [] })

// A change from `before`. A named change (an AI suggestion) is always its own step; an unnamed one right after another
// unnamed one joins it, so the step goes back to before the whole gesture.
export function record(h: History, before: EditProject, label: string | null, now: number): History {
  const last = h.past[h.past.length - 1]
  if (label === null && last && last.label === null && now - last.at < MERGE_MS) {
    return { past: [...h.past.slice(0, -1), { ...last, at: now }], future: [] }
  }
  return { past: [...h.past, { project: before, label, at: now }].slice(-HISTORY_LIMIT), future: [] }
}

// Back one step from `current`: the project to show, and the history after it. Null when there is nothing to undo.
export function undo(h: History, current: EditProject): { history: History; project: EditProject; label: string | null } | null {
  const last = h.past[h.past.length - 1]
  if (!last) return null
  return { project: last.project, label: last.label, history: { past: h.past.slice(0, -1), future: [...h.future, { project: current, label: last.label, at: 0 }] } }
}

export function redo(h: History, current: EditProject): { history: History; project: EditProject; label: string | null } | null {
  const next = h.future[h.future.length - 1]
  if (!next) return null
  return { project: next.project, label: next.label, history: { past: [...h.past, { project: current, label: next.label, at: 0 }], future: h.future.slice(0, -1) } }
}

// The AI change that the last step was, if it was one ("Undo last AI change" shows only then).
export function lastAi(h: History): { label: string } | null {
  const last = h.past[h.past.length - 1]
  return last && last.label !== null ? { label: last.label } : null
}
