import { t, type Key, type Vars } from '../i18n.ts'
import { shotNodeOf } from './frames.ts'
import { downstream } from './graph.ts'
import type { CanvasDoc, CanvasNode, GenModel, Media, NodeKind } from './types.ts'

type PortId = 'in:text' | 'in:start' | 'in:ref' | 'in:kit' | 'in:clips' | 'in:audio'
interface Port {
  id: PortId
  media: Media
  modelInput?: 'text' | 'startFrame' | 'reference'
}

const TEXT: Port = { id: 'in:text', media: 'text', modelInput: 'text' }
const START: Port = { id: 'in:start', media: 'image', modelInput: 'startFrame' }
const REF: Port = { id: 'in:ref', media: 'image', modelInput: 'reference' }
const KIT: Port = { id: 'in:kit', media: 'kit' }

// Every node has one output, `out`.
export const PORTS: Record<NodeKind, { inputs: Port[] }> = {
  shot: { inputs: [] },
  prompt: { inputs: [{ id: 'in:text', media: 'text' }] },
  storyboard: { inputs: [TEXT, REF, KIT] },
  video: { inputs: [TEXT, START, REF] },
  upload: { inputs: [] },
  footage: { inputs: [{ id: 'in:text', media: 'text' }, { id: 'in:ref', media: 'image' }] },
  kit: { inputs: [] },
  voice: { inputs: [TEXT] },
  editor: { inputs: [{ id: 'in:clips', media: 'video' }, { id: 'in:audio', media: 'audio' }] },
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
    case 'voice':
      return 'audio'
    case 'editor':
      return null
    case 'kit':
      return 'kit'
    case 'upload':
      return node.data.media ?? null
  }
}

export type Connect = { ok: true } | { ok: false; reason: Key; vars?: Vars }

// The first rule a new line breaks, or ok.
export function canConnect(doc: CanvasDoc, c: { source: string; target: string; targetHandle: string; sourceHandle?: string | null }, models: GenModel[]): Connect {
  const source = doc.nodes.find((n) => n.id === c.source)
  const target = doc.nodes.find((n) => n.id === c.target)
  if (!source || !target) return { ok: false, reason: 'canvas.conn.media', vars: { from: '', to: '' } }
  if (c.sourceHandle !== undefined && c.sourceHandle !== 'out') return { ok: false, reason: 'canvas.conn.empty' }
  if (doc.edges.some((e) => e.source === c.source && e.target === c.target && e.targetHandle === c.targetHandle)) return { ok: false, reason: 'canvas.conn.taken' }
  if (source.id === target.id) return { ok: false, reason: 'canvas.conn.self' }
  const from = outMedia(source)
  if (from === null) return { ok: false, reason: 'canvas.conn.empty' }
  const port = PORTS[target.type].inputs.find((p) => p.id === c.targetHandle)
  if (!port || port.media !== from) {
    return { ok: false, reason: 'canvas.conn.media', vars: { from: t(`canvas.media.${from}`), to: port ? t(`canvas.media.${port.media}`) : '' } }
  }
  const onPort = doc.edges.filter((e) => e.target === c.target && e.targetHandle === c.targetHandle).length
  if (port.id === 'in:ref') {
    // a reference port takes as many lines as the model takes images (a model that doesn't say takes one)
    const max = models.find((m) => m.id === target.data.model)?.maxRefs ?? 1
    if (onPort >= max) return { ok: false, reason: 'canvas.conn.full', vars: { max } }
  } else if (port.id !== 'in:clips' && port.id !== 'in:audio' && onPort > 0) return { ok: false, reason: 'canvas.conn.taken' }
  if (downstream(doc, c.target).includes(c.source)) return { ok: false, reason: 'canvas.conn.cycle' }
  const modelId = target.data.model
  if (port.modelInput && modelId) {
    const model = models.find((m) => m.id === modelId)
    if (model && (model.inputs[port.modelInput] ?? 'none') === 'none') return { ok: false, reason: 'canvas.conn.model', vars: { model: modelId } }
  }
  return { ok: true }
}

// The kinds a new node can be when a line is dragged from sourceId into empty space, with the input the line goes into.
export function compatibleKinds(doc: CanvasDoc, sourceId: string): { kind: NodeKind; handle: string }[] {
  const source = doc.nodes.find((n) => n.id === sourceId)
  const from = source ? outMedia(source) : null
  if (!source || from === null) return []
  switch (from) {
    case 'image':
      return [{ kind: 'storyboard', handle: 'in:ref' }, { kind: 'video', handle: 'in:start' }]
    case 'text': {
      const list: { kind: NodeKind; handle: string }[] = [
        { kind: 'prompt', handle: 'in:text' },
        { kind: 'storyboard', handle: 'in:text' },
        { kind: 'video', handle: 'in:text' },
        { kind: 'voice', handle: 'in:text' },
      ]
      if (source.shotId && shotNodeOf(doc, source.shotId)) list.push({ kind: 'footage', handle: 'in:text' })
      return list
    }
    case 'video':
      return [{ kind: 'editor', handle: 'in:clips' }]
    case 'audio':
      return [{ kind: 'editor', handle: 'in:audio' }]
    case 'kit':
      return [{ kind: 'storyboard', handle: 'in:kit' }]
    default:
      return []
  }
}
