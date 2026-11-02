import type { KeyboardCoordinateGetter } from '@dnd-kit/core'
import type { Format, SavedIdea, Video } from '../../types'
import type { Step } from '../../lib/steps.ts'
import { getActiveLang, t } from '../../lib/i18n'

// The Plans board's three columns, left to right. The steps of a video (lib/steps.ts) are grouped into them.
export type Column = 'planning' | 'waiting' | 'approved'
export const COLUMNS: Column[] = ['planning', 'waiting', 'approved']

export const columnTitle = (col: Column): string => t(`plan.col.${col}`)

// The column a step shows in. Idea and Script are still being planned; Storyboard shows under Waiting only once
// sent (a storyboard that is ready but not sent is still being planned); Filming, Editing and Posted are approved.
export const columnOf = (step: Step, sent: boolean): Column =>
  step === 'idea' || step === 'script' ? 'planning' : step === 'storyboard' ? (sent ? 'waiting' : 'planning') : 'approved'

// A drop on a column is a drop on the step that does the work: Waiting sends (or takes the approval back),
// Approved approves (or moves a staged plan back to ready to film). Still planning takes no drops.
export const stepOfColumn = (col: Column): Step | null => (col === 'waiting' ? 'storyboard' : col === 'approved' ? 'filming' : null)

// The plan's name on the board: the format name, or how a live video starts.
export const planName = (v: Video, f?: Format) => (v.live ? v.hook : (f?.name ?? v.hook))


// Shots the team has written. A saved idea needs its own; one already sent uses the reference's, like the plan does.
export const shotsOf = (idea: SavedIdea, f?: Format) => idea.shots ?? (idea.status === 'saved' ? [] : (f?.shotList ?? []))

// "Nov 13" from "2026-11-13".
export const dueLabel = (iso: string) =>
  new Date(`${iso}T00:00`).toLocaleDateString(getActiveLang() === 'zh-Hant' ? 'zh-TW' : 'en-US', { month: 'short', day: 'numeric' })

export interface DragData {
  column: Column
  targets: Column[]
}

// Keyboard dragging: left and right arrows jump between the plan's own column and the columns it can go to.
export const columnKeys: KeyboardCoordinateGetter = (event, { context, currentCoordinates }) => {
  const step = event.code === 'ArrowRight' ? 1 : event.code === 'ArrowLeft' ? -1 : 0
  const data = context.active?.data.current as DragData | undefined
  const box = context.collisionRect
  if (!step || !data || !box) return undefined
  event.preventDefault()
  const stops = COLUMNS.filter((c) => c === data.column || data.targets.includes(c))
    .map((c) => document.getElementById(`board-${c}`)?.getBoundingClientRect())
    .filter((r): r is DOMRect => !!r)
  if (!stops.length) return undefined
  const mid = currentCoordinates.x + box.width / 2
  const at = stops.reduce(
    (best, r, i) => (Math.abs(r.left + r.width / 2 - mid) < Math.abs(stops[best].left + stops[best].width / 2 - mid) ? i : best),
    0,
  )
  const next = stops[Math.min(Math.max(at + step, 0), stops.length - 1)]
  const top = next.top + 8
  return {
    x: next.left + next.width / 2 - box.width / 2,
    y: Math.min(Math.max(currentCoordinates.y, top), Math.max(top, next.bottom - box.height - 8)),
  }
}
