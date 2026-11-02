import type { Key } from '../i18n.ts'
import type { Shot } from '../../types.ts'
import type { CanvasDoc, CanvasNode, GenModel, Generation } from './types.ts'

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
