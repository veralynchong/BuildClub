import type { Key } from '../i18n'
import type { EditProject } from './types.ts'

// The five steps of making the video, in order. Export and Send are done from the export controls.
export const EDITOR_STEPS = ['clips', 'captions', 'logo', 'export', 'send'] as const
export type EditorStep = (typeof EDITOR_STEPS)[number]

export const STEP_LABEL: Record<EditorStep, Key> = {
  clips: 'editor.step.clips',
  captions: 'editor.step.captions',
  logo: 'editor.step.logo',
  export: 'editor.step.export',
  send: 'editor.step.send',
}

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
