import type { ResearchEntry, ResearchSlot, ResearchStatus, SlotSummary } from '../../lib/research.ts'

// Plain helpers for the Research sheet's content slots: grouping rows by slot, and which groups are open.

// The group id for references that are not in any slot (or in a slot that no longer exists).
export const UNSORTED = '__unsorted__'

export interface Group {
  // A slot id, or UNSORTED.
  id: string
  slot?: ResearchSlot
  summary?: SlotSummary
  // Rows to show (already filtered and sorted), in sheet order.
  rows: ResearchEntry[]
  // Every reference in the group, ignoring the search and filters.
  total: number
}

// Slots in number order, then Unsorted. `rows` keep the order they were given in (the current sort).
export function groupRows(
  slots: ResearchSlot[],
  entries: ResearchEntry[],
  rows: ResearchEntry[],
  summaryOf: (slot: ResearchSlot) => SlotSummary,
): Group[] {
  const ordered = [...slots].sort((a, b) => a.number - b.number)
  const ids = new Set(ordered.map((s) => s.id))
  const groupOf = (e: ResearchEntry) => (e.slotId && ids.has(e.slotId) ? e.slotId : UNSORTED)
  const shown = new Map<string, ResearchEntry[]>()
  const totals = new Map<string, number>()
  for (const e of rows) {
    const g = groupOf(e)
    shown.set(g, [...(shown.get(g) ?? []), e])
  }
  for (const e of entries) {
    const g = groupOf(e)
    totals.set(g, (totals.get(g) ?? 0) + 1)
  }
  // The picked reference goes to the top of its video; the rest keep the sheet's order.
  const pickedFirst = (list: ResearchEntry[], pickedId?: string) =>
    pickedId ? [...list.filter((e) => e.id === pickedId), ...list.filter((e) => e.id !== pickedId)] : list
  return [
    ...ordered.map((slot) => {
      const summary = summaryOf(slot)
      return {
        id: slot.id,
        slot,
        summary,
        rows: pickedFirst(shown.get(slot.id) ?? [], summary.picked?.id),
        total: totals.get(slot.id) ?? 0,
      }
    }),
    { id: UNSORTED, rows: shown.get(UNSORTED) ?? [], total: totals.get(UNSORTED) ?? 0 },
  ]
}

// Where a row stands inside its slot: the one planned (picked), one marked Backup, or neither.
export type RowRole = 'picked' | 'backup' | 'open'
export function rowRole(e: ResearchEntry, group: Group): RowRole {
  if (group.summary?.picked?.id === e.id) return 'picked'
  return e.backup ? 'backup' : 'open'
}

// A slot chip in the summary: nothing picked, picked (planning or waiting), or approved and further along.
export type ChipState = 'open' | 'picked' | 'done'
const DONE: ResearchStatus[] = ['approved', 'filming', 'editing', 'posted']
export const chipState = (s: SlotSummary): ChipState => (!s.picked ? 'open' : DONE.includes(s.status) ? 'done' : 'picked')

// Which groups are open, per client, in this browser. Only the groups someone toggled are stored.
export type OpenMap = Record<string, boolean>
const openKey = (clientId: string) => `remake.research.groups.v2.${clientId}`

export function readOpen(clientId: string): OpenMap {
  try {
    const raw = globalThis.localStorage?.getItem(openKey(clientId))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: OpenMap = {}
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'boolean') out[k] = v
    return out
  } catch {
    return {}
  }
}

export function writeOpen(clientId: string, map: OpenMap): void {
  try {
    globalThis.localStorage?.setItem(openKey(clientId), JSON.stringify(map))
  } catch {
    /* private window or blocked storage: the groups just won't remember */
  }
}
