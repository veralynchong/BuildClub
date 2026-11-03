import { createContext, useContext } from 'react'
import type { Kit, KitItem, Shot } from '../../../types'
import type { Key } from '../../../lib/i18n'
import type { Take } from '../../../lib/takes'
import type { ClipSource } from '../../../lib/editor/types'
import type { KitRefs } from '../../../lib/canvas/kit'
import type { NodeStatus } from '../../../lib/canvas/status'
import type { Budget, CanvasDoc, GenModel, Generation, NodeData, NodeKind } from '../../../lib/canvas/types'

// What the node components need from the board: the shot list, whether editing is allowed, and a few actions.
export interface CanvasCtx {
  doc: CanvasDoc // the board as it is now (what a save would send)
  shots: Shot[]
  readOnly: boolean
  shotNumbers: Map<string, number> // shot node id -> its place in the list, from 1
  updateData: (nodeId: string, patch: Partial<NodeData>) => void
  addAfterShot: (shotNodeId: string, kind: NodeKind) => void
  models: GenModel[]
  gens: Generation[]
  onGenerate: (nodeId: string) => void
  budget: Budget | null // today's spending; null until loaded
  chainOf: (nodeId: string) => { imageNodeId: string; videoNodeId: string } | null // storyboard -> video pair
  onChain: (nodeId: string) => void // quote the pair, then ask before starting it
  chaining: boolean // a quote or a confirmed start is on its way
  onSelectVersion: (nodeId: string, genId: string) => void
  // The node's own prompt or a prompt node's text was edited: the generated nodes it feeds are out of date.
  edited: (nodeId: string) => void
  incomingHandles: (nodeId: string) => string[] // the inputs that have a line
  missing: (nodeId: string) => Key | null // what a generation still needs, or null
  status: (nodeId: string) => NodeStatus // the one status the node card shows
  takes: Take[]
  shotIndex: (shotId: string | undefined) => number // the shot's current place in the shot list from 0, or -1 when gone
  uploading: (nodeId: string) => boolean
  // An upload node was given a file (image or video); a footage node adds a take for its shot.
  uploadToNode: (nodeId: string, file: File) => void
  addTake: (nodeId: string, file: File) => void
  pickTake: (takeId: string) => void
  cleanTake: (nodeId: string, takeId: string) => Promise<void>
  blocked: boolean // stale or read-only: nothing can be changed
  // Timeline: put footage at the end, make it a shot's main clip, ask whether it is.
  addToTimeline: (src: ClipSource) => void
  setPrimary: (shotId: string, src: ClipSource) => void
  isPrimary: (shotId: string, src: ClipSource) => boolean
  // While a line is being dragged: whether it could end on this input (true when nothing is being dragged).
  acceptsDrop: (nodeId: string, handleId: string) => boolean
  dragging: boolean // a line is being dragged from an output
  // Consistency kit. kit is null while it loads, when it failed, or when the idea has no client.
  clientId: string
  kit: Kit | null
  kitFailed: boolean // the load failed (or the idea has no client), as opposed to still loading
  openKit: () => void
  // A storyboard's kit as it sees it: the items its kit line carries and which of them it switched off, plus the
  // names of deleted items its shown version used. Null when it has no kit line.
  kitView: (nodeId: string) => { items: KitItem[]; off: string[]; removed: string[] } | null
  kitSent: (nodeId: string, model: GenModel | undefined) => KitRefs // what the next Generate would send
  setKitOff: (nodeId: string, itemId: string, off: boolean) => void
}

export const CanvasContext = createContext<CanvasCtx | null>(null)

export function useCanvas(): CanvasCtx {
  const c = useContext(CanvasContext)
  if (!c) throw new Error('Canvas node used outside the canvas board')
  return c
}
