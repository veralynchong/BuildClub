import type { SavedIdea } from '../types'

// The plans a client can open a canvas for: approved ones, soonest due date first.
export const approvedPlans = (ideas: SavedIdea[], clientId: string): SavedIdea[] =>
  ideas.filter((i) => i.clientId === clientId && i.status === 'approved').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
