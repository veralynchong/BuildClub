import type { CanvasDoc, CanvasEdge, CanvasNode, NodeKind } from './types.ts'
import { boxAround, frameBoxes, frameOf, kitSpot, NODE_SIZE, spreadFrames, type Box } from './frames.ts'

// Conversion between the saved canvas document and what React Flow shows. Pure, so it can be tested.
// The saved node/edge rides along in `data`, so everything React Flow doesn't know about survives a save.
// A shot node is shown as a React Flow parent (its frame); nodes of that shot are its children, with positions
// relative to the frame on screen and absolute in the saved document.
export interface FlowNode {
  id: string
  type: NodeKind
  position: { x: number; y: number }
  data: { node: CanvasNode }
  deletable: boolean
  selected?: boolean
  parentId?: string
  extent?: 'parent'
  expandParent?: boolean
  style?: { width: number; height: number }
  draggable?: boolean
  dragHandle?: string
  measured?: { width?: number; height?: number }
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

const FRAME_HANDLE = '.cv-frame-head'

function frameNode(n: CanvasNode, box: Box): FlowNode {
  return {
    id: n.id,
    type: n.type,
    position: { x: box.x, y: box.y },
    data: { node: n },
    deletable: false,
    style: { width: box.w, height: box.h },
    dragHandle: FRAME_HANDLE,
  }
}

function memberNode(base: FlowNode, parent: string, frame: { x: number; y: number }, abs: { x: number; y: number }): FlowNode {
  return { ...base, position: { x: abs.x - frame.x, y: abs.y - frame.y }, parentId: parent, extent: 'parent', expandParent: true }
}

// Moves the frames spreadFrames says overlap; returns how far each one went down.
function spread(boxes: Map<string, Box>): Map<string, number> {
  const dy = spreadFrames(boxes)
  for (const [id, d] of dy) {
    const b = boxes.get(id)!
    boxes.set(id, { ...b, y: b.y + d })
  }
  return dy
}

export function toFlow(doc: CanvasDoc, sizes?: Map<string, { w: number; h: number }>) {
  const boxes = frameBoxes(doc, sizes)
  const dy = spread(boxes)
  const frames: FlowNode[] = doc.nodes.filter((n) => n.type === 'shot').map((n) => frameNode(n, boxes.get(n.id)!))
  const rest: FlowNode[] = doc.nodes
    .filter((n) => n.type !== 'shot')
    .map((n) => {
      const base: FlowNode = { id: n.id, type: n.type, position: { ...n.position }, data: { node: n }, deletable: true }
      if (n.type === 'kit') return { ...base, position: boxes.size ? kitSpot(boxes) : base.position, draggable: false }
      const parent = frameOf(doc, n)
      return parent ? memberNode(base, parent, boxes.get(parent)!, { x: n.position.x, y: n.position.y + (dy.get(parent) ?? 0) }) : base
    })
  const nodes = [...frames, ...rest]
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

// A node's absolute position: a child's is its frame's position plus its own.
function absolute(n: FlowNode, byId: Map<string, FlowNode>): { x: number; y: number } {
  const parent = n.parentId ? byId.get(n.parentId) : undefined
  return parent ? { x: parent.position.x + n.position.x, y: parent.position.y + n.position.y } : n.position
}

// Recomputes every frame from where its members now are (and their measured sizes), and re-bases the members.
// A node with a shotId but no parent yet (just added, absolute position) is taken into its shot's frame. Frames that
// would overlap are spread down the board, and the kit goes back left of them all.
export function reframe(nodes: FlowNode[]): FlowNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const frameByShot = new Map<string, FlowNode>()
  for (const n of nodes) if (n.type === 'shot' && n.data.node.shotId) frameByShot.set(n.data.node.shotId, n)
  const frameFor = (n: FlowNode) =>
    n.type === 'shot' || n.type === 'kit' || !n.data.node.shotId ? undefined : frameByShot.get(n.data.node.shotId)
  const abs = new Map(nodes.map((n) => [n.id, absolute(n, byId)]))
  const boxes = new Map<string, Box>()
  for (const f of nodes) {
    if (f.type !== 'shot') continue
    const members = nodes
      .filter((n) => frameFor(n) === f)
      .map((n) => ({ ...abs.get(n.id)!, w: n.measured?.width ?? NODE_SIZE.w, h: n.measured?.height ?? NODE_SIZE.h }))
    boxes.set(f.id, boxAround(members, f.position))
  }
  const dy = spread(boxes)
  for (const n of nodes) {
    const d = dy.get(frameFor(n)?.id ?? '')
    if (d) abs.set(n.id, { ...abs.get(n.id)!, y: abs.get(n.id)!.y + d })
  }
  const frames = nodes
    .filter((n) => n.type === 'shot')
    .map((f) => {
      const b = boxes.get(f.id)!
      return { ...f, position: { x: b.x, y: b.y }, style: { width: b.w, height: b.h }, dragHandle: FRAME_HANDLE }
    })
  const rest = nodes
    .filter((n) => n.type !== 'shot')
    .map((n) => {
      if (n.type === 'kit' && boxes.size) return { ...n, position: kitSpot(boxes) } // stays left of every frame
      const f = frameFor(n)
      return f ? memberNode(n, f.id, boxes.get(f.id)!, abs.get(n.id)!) : n
    })
  return [...frames, ...rest]
}

// Members go back to absolute positions; a shot node is saved at its frame's top-left.
export function fromFlow(nodes: FlowNode[], edges: FlowEdge[], viewport: Viewport | undefined): CanvasDoc {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const doc: CanvasDoc = {
    nodes: nodes.map((n) => {
      const p = absolute(n, byId)
      return { ...n.data.node, position: { x: Math.round(p.x), y: Math.round(p.y) } }
    }),
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
