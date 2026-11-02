import type { CanvasDoc, CanvasEdge, CanvasNode, NodeKind } from './types.ts'

// Conversion between the saved canvas document and what React Flow shows. Pure, so it can be tested.
// The saved node/edge rides along in `data`, so everything React Flow doesn't know about survives a save.
export interface FlowNode {
  id: string
  type: NodeKind
  position: { x: number; y: number }
  data: { node: CanvasNode }
  deletable: boolean
  selected?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  data?: { edge: CanvasEdge }
}

type Viewport = { x: number; y: number; zoom: number }

export function toFlow(doc: CanvasDoc) {
  const nodes: FlowNode[] = doc.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: { ...n.position },
    data: { node: n },
    deletable: n.type !== 'shot',
  }))
  const edges: FlowEdge[] = doc.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: { edge: e },
  }))
  return { nodes, edges }
}

export function fromFlow(nodes: FlowNode[], edges: FlowEdge[], viewport: Viewport | undefined): CanvasDoc {
  const doc: CanvasDoc = {
    nodes: nodes.map((n) => ({ ...n.data.node, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) } })),
    edges: edges.map(
      (e) =>
        e.data?.edge ?? {
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle ?? '',
          target: e.target,
          targetHandle: e.targetHandle ?? '',
        },
    ),
  }
  if (viewport) doc.viewport = { x: Math.round(viewport.x), y: Math.round(viewport.y), zoom: Math.round(viewport.zoom * 1000) / 1000 }
  return doc
}

// A new canvas starts with the backend's neutral view (0, 0, zoom 1); that means "nobody has looked yet", so fit it.
export const isDefaultViewport = (vp: Viewport | undefined): boolean => !vp || (vp.x === 0 && vp.y === 0 && vp.zoom === 1)
