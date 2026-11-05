import type { SavedIdea, Shot } from '../types'

// The plans a client can open a canvas for: approved ones, soonest due date first.
export const approvedPlans = (ideas: SavedIdea[], clientId: string): SavedIdea[] =>
  ideas.filter((i) => i.clientId === clientId && i.status === 'approved').sort((a, b) => a.dueDate.localeCompare(b.dueDate))

// The plans a client can open the video canvas (planning board) for: all of them, soonest due date first.
export const boardPlans = (ideas: SavedIdea[], clientId: string): SavedIdea[] =>
  ideas.filter((i) => i.clientId === clientId).sort((a, b) => a.dueDate.localeCompare(b.dueDate))

// How far a plan is on the canvas picker: its shots, and those that already have a storyboard frame.
export const planProgress = (idea: SavedIdea, shotList: Shot[]): { shots: number; ready: number } => {
  const shots = idea.shots ?? shotList
  return { shots: shots.length, ready: shots.filter((s) => !!s.frameImage).length }
}
