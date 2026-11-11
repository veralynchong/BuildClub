import type { EditProject } from './types.ts'

// The editor's tabs, in order (spec §7.2: the old step bar became these tabs).
export const EDITOR_TABS = ['clips', 'ai', 'text', 'captions', 'voice', 'music', 'brand'] as const
export type Tool = (typeof EDITOR_TABS)[number]

// What stepsDone reports. Export and Send are done from the export controls.
export type EditorStep = 'clips' | 'captions' | 'logo' | 'export' | 'send'

export interface StepFacts {
  project: Pick<EditProject, 'clips' | 'captions' | 'showLogo'> | null
  clientHasLogo: boolean
  // The latest cut as the server reports it; null before it has loaded.
  cut: { status: string; source?: string; stale: boolean; output?: unknown; review: { status: string } | null } | null
}

// Which steps are done. Export counts only for a finished editor video that is not out of date; Send once the
// approver has the video to look at or has approved it.
export function stepsDone({ project, clientHasLogo, cut }: StepFacts): Record<EditorStep, boolean> {
  const exported = !!cut && cut.status === 'done' && cut.source === 'editor' && !!cut.output && !cut.stale
  const review = exported ? cut.review?.status : undefined
  return {
    clips: (project?.clips.length ?? 0) > 0,
    captions: project?.captions.enabled === true,
    logo: project?.showLogo === true && clientHasLogo,
    export: exported,
    send: review === 'waiting' || review === 'approved',
  }
}

// Which tabs carry a tick: only one opened this session whose condition holds, so nothing is ticked in advance
// (captions are on by default, but stay unticked until the Captions tab was looked at).
export function tabsDone(facts: StepFacts & { texts: number; voices: number; music: boolean }, visited: ReadonlySet<Tool>): Partial<Record<Tool, boolean>> {
  const steps = stepsDone(facts)
  const holds: Record<Tool, boolean> = {
    clips: steps.clips,
    ai: false, // suggestions are offered, never a step to finish
    text: facts.texts > 0,
    captions: steps.captions,
    voice: facts.voices > 0,
    music: facts.music,
    brand: steps.logo,
  }
  return Object.fromEntries(EDITOR_TABS.map((tab) => [tab, visited.has(tab) && holds[tab]]))
}
