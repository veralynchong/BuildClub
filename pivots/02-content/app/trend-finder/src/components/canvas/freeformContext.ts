import { createContext } from 'react'
import type { Node } from '@xyflow/react'
import type { CanvasDoc, CanvasNode, GenModel, Generation, NodeData } from '../../lib/canvas/types'
import type { Take } from '../../lib/takes'
import type { Shot } from '../../types'
import type { EditProject } from '../../lib/editor/types'

export interface FreeformActions {
  freeform: boolean
  doc: CanvasDoc; gens: Generation[]; models: GenModel[]; shots: Shot[]; project: EditProject | null
  takes: Take[]
  pickTake: (id: string) => void
  voices: { id: string; url: string }[]
  readonly: boolean; busy: Set<string>
  update: (id: string, patch: Partial<NodeData>) => void
  run: (id: string) => void; upload: (id: string, file: File) => void
  remove: (ids: string[]) => void; duplicate: (id: string) => void
  inspect: (id: string) => void; openEditor: () => void; connect: (id: string) => void
}
export const FreeformContext = createContext<FreeformActions | null>(null)
export type FreeNode = Node<{ node: CanvasNode }, 'freeform'>
