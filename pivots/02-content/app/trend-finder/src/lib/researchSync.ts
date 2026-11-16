import type { ResearchEntry, ResearchSlot } from './research.ts'

// The Research tab as the API keeps it (GET/PUT /api/research).
export interface ResearchSheet {
  entries: ResearchEntry[]
  slots: ResearchSlot[]
}

// One list after another tab saved first. Per id: this tab's copy wins; an id this tab removed since `base`
// (the copy it last saved or loaded) stays removed; an id only the other tab has is kept.
function mergeList<T extends { id: string }>(base: T[], mine: T[], theirs: T[]): T[] {
  const mineById = new Map(mine.map((x) => [x.id, x]))
  const removed = new Set(base.filter((x) => !mineById.has(x.id)).map((x) => x.id))
  const theirIds = new Set(theirs.map((x) => x.id))
  const kept = theirs.filter((x) => !removed.has(x.id)).map((x) => mineById.get(x.id) ?? x)
  return [...kept, ...mine.filter((x) => !theirIds.has(x.id))]
}

export function mergeResearch(base: ResearchSheet, mine: ResearchSheet, theirs: ResearchSheet): ResearchSheet {
  return { entries: mergeList(base.entries, mine.entries, theirs.entries), slots: mergeList(base.slots, mine.slots, theirs.slots) }
}

// What a browser uploads the first time the API has no sheet: its own rows, never the built-in sample ones.
export function withoutSampleResearch(sheet: ResearchSheet, sampleSlots: { id: string }[]): ResearchSheet {
  const sampleSlotIds = new Set(sampleSlots.map((s) => s.id))
  return {
    entries: sheet.entries.filter((e) => e.source !== 'sample'),
    slots: sheet.slots.filter((s) => !sampleSlotIds.has(s.id)),
  }
}

// The sheet a browser starts from on its first sync. Rows an older version kept only in this browser move up once,
// even when a teammate's browser already put a sheet on the server: they are added to it (the server's copy wins
// for the same id). After that the server's sheet is the one that counts.
export function initialResearch(
  remote: ResearchSheet | null,
  local: ResearchSheet,
  alreadyMigrated: boolean,
): { sheet: ResearchSheet; upload: boolean } {
  if (!remote) return { sheet: local, upload: true }
  if (alreadyMigrated) return { sheet: remote, upload: false }
  const merged = mergeResearch({ entries: [], slots: [] }, remote, local)
  const grew = merged.entries.length > remote.entries.length || merged.slots.length > remote.slots.length
  return grew ? { sheet: merged, upload: true } : { sheet: remote, upload: false }
}

export const RESEARCH_MIGRATED_KEY = 'trend-finder.research-migrated.v1'

export function researchMigrated(): boolean {
  try {
    return localStorage.getItem(RESEARCH_MIGRATED_KEY) === '1'
  } catch {
    return false
  }
}

export function markResearchMigrated(): void {
  try {
    localStorage.setItem(RESEARCH_MIGRATED_KEY, '1')
  } catch {
    // Storage blocked: the next load merges this browser's rows again, which adds nothing new.
  }
}
