import { t } from '../i18n.ts'
import type { Shot } from '../../types.ts'
import type { CanvasDoc, CanvasNode } from './types.ts'

// Shot frames (spec §5.1, §12.5.1-2): a shot node is drawn as a frame around the nodes that share its shotId.
// Pure layout: positions here are absolute canvas positions, as the saved document keeps them.
export const FRAME_PAD = 16
export const FRAME_HEAD = 64
export const NODE_SIZE = { w: 200, h: 300 }
export const MIN_FRAME = { w: 280, h: 220 }
export const KIT_GAP = 80
export const FRAME_GAP = 24 // between a frame and one moved below it
const SLOT_GAP = 40 // between nodes in a row, as freeSpot leaves

export type Box = { x: number; y: number; w: number; h: number }
type Size = { w: number; h: number }
type Placed = { x: number; y: number; w: number; h: number }

// The one Shot id -> shot node id mapping. Nothing else builds or parses shot node ids.
export function shotNodeOf(doc: CanvasDoc, shotId: string): string | null {
  return doc.nodes.find((n) => n.type === 'shot' && n.shotId === shotId)?.id ?? null
}

// The shot node id of the frame a node sits in; null for shot, kit and free nodes.
export function frameOf(doc: CanvasDoc, node: CanvasNode): string | null {
  if (node.type === 'shot' || node.type === 'kit' || !node.shotId) return null
  return shotNodeOf(doc, node.shotId)
}

// A frame's box around its members; an empty frame sits at `at` with the minimum size.
export function boxAround(members: Placed[], at: { x: number; y: number }): Box {
  if (!members.length) return { x: at.x, y: at.y, w: MIN_FRAME.w, h: MIN_FRAME.h }
  const minX = Math.min(...members.map((m) => m.x))
  const minY = Math.min(...members.map((m) => m.y))
  const maxX = Math.max(...members.map((m) => m.x + m.w))
  const maxY = Math.max(...members.map((m) => m.y + m.h))
  return {
    x: minX - FRAME_PAD,
    y: minY - FRAME_HEAD,
    w: Math.max(MIN_FRAME.w, maxX - minX + 2 * FRAME_PAD),
    h: Math.max(MIN_FRAME.h, maxY - minY + FRAME_HEAD + FRAME_PAD),
  }
}

function membersOf(doc: CanvasDoc, shotNodeId: string, sizes?: Map<string, Size>): Placed[] {
  return doc.nodes
    .filter((n) => frameOf(doc, n) === shotNodeId)
    .map((n) => {
      const s = sizes?.get(n.id) ?? NODE_SIZE
      return { x: n.position.x, y: n.position.y, w: s.w, h: s.h }
    })
}

// Keyed by shot node id.
export function frameBoxes(doc: CanvasDoc, sizes?: Map<string, Size>): Map<string, Box> {
  const boxes = new Map<string, Box>()
  for (const n of doc.nodes) if (n.type === 'shot') boxes.set(n.id, boxAround(membersOf(doc, n.id, sizes), n.position))
  return boxes
}

// Where a new node goes in a frame: right of the rightmost member, on the top row. Absolute.
export function slotInFrame(doc: CanvasDoc, shotNodeId: string, sizes?: Map<string, Size>): { x: number; y: number } {
  const members = membersOf(doc, shotNodeId, sizes)
  if (!members.length) {
    const at = doc.nodes.find((n) => n.id === shotNodeId)?.position ?? { x: 0, y: 0 }
    return { x: at.x + FRAME_PAD, y: at.y + FRAME_HEAD }
  }
  return { x: Math.max(...members.map((m) => m.x + m.w)) + SLOT_GAP, y: Math.min(...members.map((m) => m.y)) }
}

// Frames never overlap. Going down the board, a frame that overlaps one above it (the backend adds a new shot one row
// below the lowest shot node, however tall that frame has grown) moves to FRAME_GAP below it. How far each frame that
// moves goes down, keyed like boxes.
export function spreadFrames(boxes: Map<string, Box>): Map<string, number> {
  const order = [...boxes.entries()].sort(([, a], [, b]) => a.y - b.y || a.x - b.x)
  const placed: Box[] = []
  const out = new Map<string, number>()
  for (const [id, b] of order) {
    let y = b.y
    for (let hit = placed.find((p) => overlaps(p, { ...b, y })); hit; hit = placed.find((p) => overlaps(p, { ...b, y }))) y = hit.y + hit.h + FRAME_GAP
    if (y !== b.y) out.set(id, y - b.y)
    placed.push({ ...b, y })
  }
  return out
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

// The frame header's chip: the shot's purpose and its length from a "0-3s" time; either may be missing.
export function shotChip(shot: Pick<Shot, 'time' | 'purpose'>): string | null {
  const m = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*s?\s*$/.exec(shot.time ?? '')
  const secs = m ? Math.round((Number(m[2]) - Number(m[1])) * 10) / 10 : 0
  const parts = [shot.purpose ? t(`plan.sb.purpose.${shot.purpose}`) : '', secs > 0 ? `${secs}s` : ''].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}

// The kit sits KIT_GAP left of the leftmost frame, level with the top one.
export function kitSpot(boxes: Map<string, Box>): { x: number; y: number } {
  const all = [...boxes.values()]
  if (!all.length) return { x: -KIT_GAP - NODE_SIZE.w, y: 0 }
  return { x: Math.min(...all.map((b) => b.x)) - KIT_GAP - NODE_SIZE.w, y: Math.min(...all.map((b) => b.y)) }
}

// Shot text is implicit now (spec §5.1), so lines out of a shot node are dropped on every load:
// the backend still writes a shot -> storyboard/footage text line for each new shot. Same object when there is none.
export function migrateDoc(doc: CanvasDoc): CanvasDoc {
  const shots = new Set(doc.nodes.filter((n) => n.type === 'shot').map((n) => n.id))
  const edges = doc.edges.filter((e) => !shots.has(e.source))
  return edges.length === doc.edges.length ? doc : { ...doc, edges }
}
