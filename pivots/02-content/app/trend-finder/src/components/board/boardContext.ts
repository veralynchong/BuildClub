import { createContext, useContext } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { BoardNode } from '../../lib/shotBoard'
import type { PlanScript, Shot } from '../../types'
import type { HookCard } from '../../lib/hooks'

// One card on the canvas. index is its place in the plan (0-based); null for an upload not placed yet.
export type ShotNodeData = { node: BoardNode; index: number | null; total: number }
export type ShotFlowNode = Node<ShotNodeData, 'shot'>

// The suggested hooks (leading into shot 1) and the script (under the shots). Shown, not edited, on the board.
export type HooksNodeData = { hooks: HookCard[] }
export type HooksFlowNode = Node<HooksNodeData, 'hooks'>
export type ScriptNodeData = { script: PlanScript | null; stale: boolean }
export type ScriptFlowNode = Node<ScriptNodeData, 'script'>
export type ExtraFlowNode = HooksFlowNode | ScriptFlowNode
export type BoardFlowNode = ShotFlowNode | ExtraFlowNode

// One link between two cards in a row: shot a → shot b (1-based, for the words on the + button).
export type SeqEdgeData = { a: number; b: number; dropTarget: boolean }
export type SeqFlowEdge = Edge<SeqEdgeData, 'seq'>

// What the cards and links can do. Kept in context so the canvas data holds only the shot itself.
export interface BoardActions {
  editable: boolean
  // Shots in the plan, for "After shot n" on an upload not placed yet.
  total: number
  openInsert: (beforeId: string, afterId: string) => void
  saveShot: (id: string, patch: Partial<Shot>) => void
  remove: (id: string) => void
  move: (id: string, delta: -1 | 1) => void
  // afterIndex: -1 puts it first.
  place: (looseId: string, afterIndex: number) => void
}

export const BoardActionsContext = createContext<BoardActions | null>(null)

export function useBoardActions(): BoardActions {
  const value = useContext(BoardActionsContext)
  if (!value) throw new Error('useBoardActions must be used inside the planning board')
  return value
}
