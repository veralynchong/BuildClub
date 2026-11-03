import type { EditProject } from '../editor/types.ts'
import type { Box } from './frames.ts'
import type { FlowEdge, FlowNode } from './flow.ts'
import type { CanvasDoc } from './types.ts'

// The Timeline node (spec §7.1) and its lines are virtual: built on screen from the edit project, never saved.
export const TIMELINE_NODE_ID = 'n_timeline'
export const TIMELINE_GAP = 120 // right of the rightmost frame
const LINE_PREFIX = 'e_tl_'

export function isVirtual(id: string): boolean {
  return id === TIMELINE_NODE_ID || id.startsWith(LINE_PREFIX)
}

// The canvas node a clip came from: its own node for a generation; for a take, the upload node holding it, else the
// shot's footage node. Null when that node is not on the board.
function clipNode(doc: CanvasDoc, src: EditProject['clips'][number]['source']): string | null {
  const has = (id: string | undefined) => !!id && doc.nodes.some((n) => n.id === id)
  if (has(src.nodeId)) return src.nodeId!
  if (src.kind !== 'take') return null
  const upload = doc.nodes.find((n) => n.type === 'upload' && n.data.takeId === src.id)
  if (upload) return upload.id
  return doc.nodes.find((n) => n.type === 'footage' && !!src.shotId && n.shotId === src.shotId)?.id ?? null
}

// The node sits TIMELINE_GAP right of the rightmost frame, level with the top one; one line per clip's node into it.
export function timelineFlow(doc: CanvasDoc, project: EditProject | null, boxes: Map<string, Box>): { node: FlowNode; edges: FlowEdge[] } {
  const all = [...boxes.values()]
  const position = all.length ? { x: Math.max(...all.map((b) => b.x + b.w)) + TIMELINE_GAP, y: Math.min(...all.map((b) => b.y)) } : { x: 0, y: 0 }
  const node: FlowNode = {
    id: TIMELINE_NODE_ID,
    type: 'timeline',
    position,
    // Not a saved node: fromFlow drops it, and nothing on the board reads this stand-in.
    data: { node: { id: TIMELINE_NODE_ID, type: 'video', position, data: {} } },
    deletable: false,
    draggable: false, // left selectable: React Flow turns off pointer events (its buttons) on a node that is neither;
    // the board drops its selection changes, so it never shows as selected
  }
  const sources = new Set<string>()
  for (const c of project?.clips ?? []) {
    const id = clipNode(doc, c.source)
    if (id) sources.add(id) // split pieces of one source share one line
  }
  const edges: FlowEdge[] = [...sources].map((id) => ({
    id: `${LINE_PREFIX}${id}`,
    source: id,
    target: TIMELINE_NODE_ID,
    sourceHandle: 'out',
    targetHandle: 'in:clips',
    deletable: false,
  }))
  return { node, edges }
}
