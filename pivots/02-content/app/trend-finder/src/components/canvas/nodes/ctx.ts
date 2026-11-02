import { createContext, useContext } from 'react'
import type { Shot } from '../../../types'
import type { Key } from '../../../lib/i18n'
import type { Take } from '../../../lib/takes'
import type { GenModel, Generation, NodeData, NodeKind } from '../../../lib/canvas/types'

// What the node components need from the board: the shot list, whether editing is allowed, and a few actions.
export interface CanvasCtx {
  shots: Shot[]
  readOnly: boolean
  shotNumbers: Map<string, number> // shot node id -> its place in the list, from 1
  updateData: (nodeId: string, patch: Partial<NodeData>) => void
  addAfterShot: (shotNodeId: string, kind: NodeKind) => void
  models: GenModel[]
  gens: Generation[]
  onGenerate: (nodeId: string) => void
  onSelectVersion: (nodeId: string, genId: string) => void
  // The node's own prompt or a prompt node's text was edited: the generated nodes it feeds are out of date.
  edited: (nodeId: string) => void
  incomingHandles: (nodeId: string) => string[] // the inputs that have a line
  missing: (nodeId: string) => Key | null // what a generation still needs, or null
  takes: Take[]
  shotIndex: (shotId: string | undefined) => number // the shot's current place in the shot list from 0, or -1 when gone
  uploading: (nodeId: string) => boolean
  // An upload node was given a file (image or video); a footage node adds a take for its shot.
  uploadToNode: (nodeId: string, file: File) => void
  addTake: (nodeId: string, file: File) => void
  pickTake: (takeId: string) => void
  // While a line is being dragged: whether it could end on this input (true when nothing is being dragged).
  acceptsDrop: (nodeId: string, handleId: string) => boolean
}

export const CanvasContext = createContext<CanvasCtx | null>(null)

export function useCanvas(): CanvasCtx {
  const c = useContext(CanvasContext)
  if (!c) throw new Error('Canvas node used outside the canvas board')
  return c
}
