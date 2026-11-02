import type { IdeaStatus } from '../types'
import type { Step } from './steps.ts'

// The tabs of the plan page, in production order.
export type PlanTab = 'script' | 'storyboard' | 'shoot' | 'edit' | 'post'

export const PLAN_TABS: readonly PlanTab[] = ['script', 'storyboard', 'shoot', 'edit', 'post']

// The tab a plan opens on: the one where its current step is worked.
export function defaultTab(step: Step): PlanTab {
  switch (step) {
    case 'idea':
    case 'script':
      return 'script'
    case 'storyboard':
      return 'storyboard'
    case 'filming':
      return 'shoot'
    case 'editing':
      return 'edit'
    case 'posted':
      return 'post'
  }
}

// Editing and posting wait for the approval. 'needs-approval' means the tab shows why instead of its content.
export function tabLocked(tab: PlanTab, status: IdeaStatus): 'needs-approval' | null {
  return (tab === 'edit' || tab === 'post') && status !== 'approved' ? 'needs-approval' : null
}

// The tab a plan was last on, per plan, for this browser session.
export const planTabKey = (ideaId: string): string => `remake.plan-tab.${ideaId}`

export function isPlanTab(v: unknown): v is PlanTab {
  return typeof v === 'string' && (PLAN_TABS as readonly string[]).includes(v)
}

// Ids that tie a tab to its panel (aria-controls / aria-labelledby).
export const tabId = (base: string, tab: PlanTab): string => `${base}-tab-${tab}`
export const panelId = (base: string, tab: PlanTab): string => `${base}-panel-${tab}`

// What a locked tab says, by status: a saved plan has to be sent, a waiting one (also a reopened one) only waits,
// a sent-back one has to be fixed and sent again. `toStoryboard` is whether the button to the Storyboard tab helps.
type LockedKind = 'saved' | 'waiting' | 'rejected'
type LockedKey<Part extends 'title' | 'body'> = `plan.tab.locked.${'edit' | 'post'}.${LockedKind}.${Part}`
export interface LockedNotice {
  titleKey: LockedKey<'title'>
  bodyKey: LockedKey<'body'>
  toStoryboard: boolean
}

export function lockedNotice(tab: PlanTab, status: IdeaStatus): LockedNotice | null {
  if (tab !== 'edit' && tab !== 'post') return null
  if (!tabLocked(tab, status)) return null
  const kind: LockedKind = status === 'waiting' ? 'waiting' : status === 'rejected' ? 'rejected' : 'saved'
  return { titleKey: `plan.tab.locked.${tab}.${kind}.title`, bodyKey: `plan.tab.locked.${tab}.${kind}.body`, toStoryboard: kind !== 'waiting' }
}
