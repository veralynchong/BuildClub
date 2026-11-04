import { t, type Key, type Vars } from '../i18n.ts'
import type { Shot } from '../../types.ts'
import { hasResult } from './edges.ts'
import { failedGen, missingInput, pendingGen, selectedGen, versionsOf } from './graph.ts'
import { aboutTime, etaOf } from './shell.ts'
import type { CanvasDoc, CanvasNode, GenModel, Generation } from './types.ts'

export type NodeStatus = { key: Key; vars?: Vars; tone: 'busy' | 'bad' | 'wait' | 'stale' | 'ok' | 'none' }

const timeText = (seconds: number): string => {
  const a = aboutTime(seconds)
  return t(a.key, { n: a.n })
}

// The node on the line into the node's start frame, if any.
const startSource = (doc: CanvasDoc, nodeId: string): CanvasNode | null => {
  const e = doc.edges.find((x) => x.target === nodeId && x.targetHandle === 'in:start')
  return (e && doc.nodes.find((n) => n.id === e.source)) || null
}

const waitFor = (src: CanvasNode | null): NodeStatus => ({
  key: 'canvas.status.waitFor',
  vars: { node: t(src && src.type !== 'shot' ? `canvas.node.${src.type}` : 'canvas.node.storyboard') },
  tone: 'wait',
})

// The one status a node card shows (spec §6.1), first match wins: a job in progress, a failed newest attempt, a
// required start frame whose source has no result yet, out of date, the shown version among the done ones, nothing.
export function nodeStatus(doc: CanvasDoc, nodeId: string, gens: Generation[], models: GenModel[], shots: Shot[], now: number): NodeStatus {
  const node = doc.nodes.find((n) => n.id === nodeId)
  if (!node) return { key: 'canvas.status.none', tone: 'none' }
  const pending = pendingGen(nodeId, gens)
  if (pending) {
    if (pending.status === 'waiting') return waitFor(startSource(doc, nodeId))
    const { elapsed, left } = etaOf(pending, models.find((m) => m.id === pending.model), now)
    return left !== null
      ? { key: 'canvas.status.running', vars: { eta: timeText(left) }, tone: 'busy' }
      : { key: 'canvas.status.elapsed', vars: { eta: timeText(elapsed) }, tone: 'busy' }
  }
  if (failedGen(nodeId, gens)) return { key: 'canvas.status.failed', tone: 'bad' }
  const kind = node.type === 'video' ? 'video' : 'image'
  const model = models.find((m) => m.id === node.data.model) ?? models.find((m) => m.kind === kind)
  if (model && missingInput(doc, nodeId, model, shots, gens) === 'canvas.gen.needStart') {
    const src = startSource(doc, nodeId)
    if (src && !hasResult(src, gens)) return waitFor(src)
  }
  if (node.data.stale === true) return { key: 'canvas.status.stale', tone: 'stale' }
  const shown = selectedGen(node, gens)
  if (shown) {
    const done = versionsOf(nodeId, gens).filter((g) => g.status === 'done')
    return { key: 'canvas.status.version', vars: { n: done.findIndex((g) => g.id === shown.id) + 1, total: done.length }, tone: 'ok' }
  }
  return { key: 'canvas.status.none', tone: 'none' }
}

// The card's main button: Try again after a failed newest attempt, Regenerate (v<next>) once a version is done (only
// done versions count, as in the version strip), else Generate.
export function genButton(node: CanvasNode, gens: Generation[]): { key: 'canvas.gen.go' | 'canvas.gen.regenerate' | 'canvas.gen.retry'; vars?: { n: number } } {
  if (failedGen(node.id, gens)) return { key: 'canvas.gen.retry' }
  const done = versionsOf(node.id, gens).filter((g) => g.status === 'done').length
  return done > 0 ? { key: 'canvas.gen.regenerate', vars: { n: done + 1 } } : { key: 'canvas.gen.go' }
}
