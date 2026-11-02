import type { Key } from '../i18n.ts'
import type { Shot } from '../../types.ts'
import { PORTS } from './ports.ts'
import type { CanvasDoc, CanvasNode, GenModel, Generation, NodeData, NodeKind } from './types.ts'

// Every node reachable by following lines forward; not the node itself.
export function downstream(doc: CanvasDoc, nodeId: string): string[] {
  const seen = new Set<string>()
  const todo = [nodeId]
  while (todo.length) {
    const id = todo.pop()!
    for (const e of doc.edges) {
      if (e.source === id && !seen.has(e.target)) {
        seen.add(e.target)
        todo.push(e.target)
      }
    }
  }
  seen.delete(nodeId)
  return [...seen]
}

export function versionsOf(nodeId: string, gens: Generation[]): Generation[] {
  return gens.filter((g) => g.nodeId === nodeId).sort((a, b) => a.createdAt - b.createdAt)
}

export function pendingGen(nodeId: string, gens: Generation[]): Generation | null {
  const open = versionsOf(nodeId, gens).filter((g) => g.status === 'queued' || g.status === 'running')
  return open[open.length - 1] ?? null
}

// The node's newest version when it failed (a later finished or running one hides it), else null.
export function failedGen(nodeId: string, gens: Generation[]): Generation | null {
  const all = versionsOf(nodeId, gens)
  const last = all[all.length - 1]
  return last?.status === 'failed' ? last : null
}

// The version the node shows: the chosen one if it finished, else the newest finished one.
export function selectedGen(node: CanvasNode, gens: Generation[]): Generation | null {
  const done = versionsOf(node.id, gens).filter((g) => g.status === 'done')
  return done.find((g) => g.id === node.data.selected) ?? done[done.length - 1] ?? null
}

// Marks the generated nodes after nodeId (those with a finished version) as out of date. Returns a new doc.
export function markStale(doc: CanvasDoc, nodeId: string, gens: Generation[]): CanvasDoc {
  const after = new Set(downstream(doc, nodeId))
  return {
    ...doc,
    nodes: doc.nodes.map((n) =>
      after.has(n.id) && (n.type === 'storyboard' || n.type === 'video') && versionsOf(n.id, gens).some((g) => g.status === 'done')
        ? { ...n, data: { ...n.data, stale: true } }
        : n,
    ),
  }
}

// The generated nodes to date after a change at nodeId: those downstream, plus nodeId itself when `self` (its own input
// changed). Only nodes that have a finished version.
export function staleIds(doc: CanvasDoc, nodeId: string, gens: Generation[], self: boolean): string[] {
  const ids = new Set(downstream(doc, nodeId))
  if (self) ids.add(nodeId)
  return doc.nodes
    .filter((n) => ids.has(n.id) && (n.type === 'storyboard' || n.type === 'video') && versionsOf(n.id, gens).some((g) => g.status === 'done'))
    .map((n) => n.id)
}

// Nodes whose job finished while the canvas was closed: the chosen version is missing or gone and the newest finished
// one was made here (not a legacy import or an upload). They should show that version and date what follows.
export function finishedWhileAway(doc: CanvasDoc, gens: Generation[]): { nodeId: string; genId: string }[] {
  const out: { nodeId: string; genId: string }[] = []
  for (const n of doc.nodes) {
    if (n.type !== 'storyboard' && n.type !== 'video') continue
    const done = versionsOf(n.id, gens).filter((g) => g.status === 'done')
    const newest = done[done.length - 1]
    if (!newest || newest.model === 'imported' || newest.model === 'upload') continue
    if (done.some((g) => g.id === n.data.selected)) continue
    out.push({ nodeId: n.id, genId: newest.id })
  }
  return out
}

function upstream(doc: CanvasDoc, nodeId: string, handle: string): CanvasNode | null {
  const edge = doc.edges.find((e) => e.target === nodeId && e.targetHandle === handle)
  return (edge && doc.nodes.find((n) => n.id === edge.source)) || null
}

// The text a node gets from its in:text line: a shot's line (or its description), or a prompt node's text,
// looking further up when a prompt node is empty.
function textFrom(doc: CanvasDoc, nodeId: string, shots: Shot[], seen = new Set<string>()): string {
  if (seen.has(nodeId)) return ''
  seen.add(nodeId)
  const src = upstream(doc, nodeId, 'in:text')
  if (!src) return ''
  if (src.type === 'shot') {
    const shot = shots.find((s) => s.id === src.shotId)
    return (shot?.line?.trim() ? shot.line : shot?.shot) ?? ''
  }
  if (src.type === 'prompt') return src.data.text?.trim() ? src.data.text : textFrom(doc, src.id, shots, seen)
  return ''
}

export interface GenRequest {
  prompt: string
  startFrame?: string
  reference?: string
  duration?: number
}

export function genRequest(doc: CanvasDoc, nodeId: string, shots: Shot[], gens: Generation[]): GenRequest {
  const node = doc.nodes.find((n) => n.id === nodeId)
  if (!node) return { prompt: '' }
  const req: GenRequest = { prompt: node.data.prompt?.trim() ? node.data.prompt : textFrom(doc, nodeId, shots) }
  const frame = (handle: string) => {
    const src = upstream(doc, nodeId, handle)
    return src ? selectedGen(src, gens)?.id : undefined
  }
  const start = frame('in:start')
  const ref = frame('in:ref')
  if (start) req.startFrame = start
  if (ref) req.reference = ref
  if (typeof node.data.duration === 'number') req.duration = node.data.duration
  return req
}

// What a required input of the model is missing, or null when the node can generate.
export function missingInput(doc: CanvasDoc, nodeId: string, model: GenModel, shots: Shot[], gens: Generation[]): Key | null {
  const req = genRequest(doc, nodeId, shots, gens)
  if (model.inputs.text === 'required' && !req.prompt.trim()) return 'canvas.gen.needText'
  if (model.inputs.startFrame === 'required' && !req.startFrame) return 'canvas.gen.needStart'
  return null
}

// Shots whose primary storyboard node shows a different image than the shot list keeps (to write back).
export function primaryFrames(doc: CanvasDoc, shots: Shot[], gens: Generation[]): { index: number; frameImage: string }[] {
  const out: { index: number; frameImage: string }[] = []
  for (const n of doc.nodes) {
    if (n.type !== 'storyboard' || !n.data.primary) continue
    const index = shots.findIndex((s) => s.id === n.shotId)
    const url = selectedGen(n, gens)?.url
    if (index >= 0 && url && url !== shots[index].frameImage) out.push({ index, frameImage: url })
  }
  return out.sort((a, b) => a.index - b.index)
}

// The first place at or below-right of `at` that no node already sits on, so toolbar-added nodes don't stack.
export function freeSpot(doc: CanvasDoc, at: { x: number; y: number }): { x: number; y: number } {
  const p = { x: Math.round(at.x), y: Math.round(at.y) }
  for (let i = 0; i < 200 && doc.nodes.some((n) => Math.abs(n.position.x - p.x) < 30 && Math.abs(n.position.y - p.y) < 30); i++) {
    p.x += 40
    p.y += 40
  }
  return p
}

const ROW_STEP = 360 // matches the backend's column spacing
const ROW_GAP = 280 // a row is 400 apart in the backend; nodes in one row sit well inside this

function startData(kind: NodeKind): NodeData {
  switch (kind) {
    case 'prompt':
      return { text: '' }
    case 'storyboard':
      return { primary: false, model: 'mock-image', prompt: '', selected: null, stale: false }
    case 'video':
      return { model: 'mock-video', prompt: '' }
    default:
      return {}
  }
}

function newId(doc: CanvasDoc, kind: NodeKind): string {
  const used = new Set(doc.nodes.map((n) => n.id))
  for (;;) {
    const id = `n_${kind}_${Math.random().toString(36).slice(2, 8)}`
    if (!used.has(id)) return id
  }
}

// A new node. With a shotId it goes on that shot's row, at the first free place at or right of `at.x`, and the shot's
// text line is connected to it when it has a text input. A footage node needs a shot. Returns a new doc.
export function addNode(doc: CanvasDoc, kind: NodeKind, at: { x: number; y: number }, shotId?: string): CanvasDoc {
  const shot = shotId ? doc.nodes.find((n) => n.type === 'shot' && n.shotId === shotId) : undefined
  if (kind === 'footage' && !shot) throw new Error('A footage node needs a shot.')
  let position = { x: Math.round(at.x), y: Math.round(at.y) }
  if (shot) {
    position = { x: position.x, y: shot.position.y }
    while (doc.nodes.some((n) => Math.abs(n.position.y - position.y) < ROW_GAP && Math.abs(n.position.x - position.x) < ROW_STEP * 0.8)) {
      position.x += ROW_STEP
    }
  }
  const node: CanvasNode = { id: newId(doc, kind), type: kind, ...(shot ? { shotId } : {}), position, data: startData(kind) }
  const edges = [...doc.edges]
  if (shot && PORTS[kind].inputs.some((p) => p.id === 'in:text')) {
    edges.push({ id: `e_${shot.id}_${node.id}`, source: shot.id, sourceHandle: 'out', target: node.id, targetHandle: 'in:text' })
  }
  return { ...doc, nodes: [...doc.nodes, node], edges }
}
