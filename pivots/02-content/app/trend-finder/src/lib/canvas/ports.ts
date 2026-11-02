import { t, type Key, type Vars } from '../i18n.ts'
import { downstream } from './graph.ts'
import type { CanvasDoc, CanvasEdge, CanvasNode, GenModel, Media, NodeKind } from './types.ts'

type PortId = 'in:text' | 'in:start' | 'in:ref'
interface Port {
  id: PortId
  media: Media
  modelInput?: 'text' | 'startFrame' | 'reference'
}

const TEXT: Port = { id: 'in:text', media: 'text', modelInput: 'text' }
const START: Port = { id: 'in:start', media: 'image', modelInput: 'startFrame' }
const REF: Port = { id: 'in:ref', media: 'image', modelInput: 'reference' }

// Every node has one output, `out`.
export const PORTS: Record<NodeKind, { inputs: Port[] }> = {
  shot: { inputs: [] },
  prompt: { inputs: [{ id: 'in:text', media: 'text' }] },
  storyboard: { inputs: [TEXT, REF] },
  video: { inputs: [TEXT, START, REF] },
  upload: { inputs: [] },
  footage: { inputs: [{ id: 'in:text', media: 'text' }, { id: 'in:ref', media: 'image' }] },
}

export function outMedia(node: CanvasNode): Media | null {
  switch (node.type) {
    case 'shot':
    case 'prompt':
      return 'text'
    case 'storyboard':
      return 'image'
    case 'video':
    case 'footage':
      return 'video'
    case 'upload':
      return node.data.media ?? null
  }
}

export type Connect = { ok: true } | { ok: false; reason: Key; vars?: Vars }

// The first rule a new line breaks, or ok.
export function canConnect(doc: CanvasDoc, c: { source: string; target: string; targetHandle: string }, models: GenModel[]): Connect {
  const source = doc.nodes.find((n) => n.id === c.source)
  const target = doc.nodes.find((n) => n.id === c.target)
  if (!source || !target) return { ok: false, reason: 'canvas.conn.media', vars: { from: '', to: '' } }
  if (source.id === target.id) return { ok: false, reason: 'canvas.conn.self' }
  const from = outMedia(source)
  if (from === null) return { ok: false, reason: 'canvas.conn.empty' }
  const port = PORTS[target.type].inputs.find((p) => p.id === c.targetHandle)
  if (!port || port.media !== from) {
    return { ok: false, reason: 'canvas.conn.media', vars: { from: t(`canvas.media.${from}`), to: port ? t(`canvas.media.${port.media}`) : '' } }
  }
  if (doc.edges.some((e) => e.target === c.target && e.targetHandle === c.targetHandle)) return { ok: false, reason: 'canvas.conn.taken' }
  if (downstream(doc, c.target).includes(c.source)) return { ok: false, reason: 'canvas.conn.cycle' }
  const modelId = target.data.model
  if (port.modelInput && modelId) {
    const model = models.find((m) => m.id === modelId)
    if (model && (model.inputs[port.modelInput] ?? 'none') === 'none') return { ok: false, reason: 'canvas.conn.model', vars: { model: modelId } }
  }
  return { ok: true }
}

export function edgeLabel(edge: Pick<CanvasEdge, 'targetHandle'>): Key | null {
  return edge.targetHandle === 'in:start' ? 'canvas.edge.start' : edge.targetHandle === 'in:ref' ? 'canvas.edge.ref' : null
}
