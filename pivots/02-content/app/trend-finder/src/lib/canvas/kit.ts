import type { Kit, KitItem, KitKind } from '../../types.ts'
import { selectedGen } from './graph.ts'
import type { CanvasDoc, CanvasEdge, CanvasNode, GenModel, Generation } from './types.ts'

// A reference as the app sends it. A kit ref without `image` is text only: it adds the item's line to the prompt (a
// style with no pictures) and sends no file.
export type GenRef = { source: 'gen'; genId: string } | { source: 'kit'; itemId: string; image?: string }

export interface KitRefs {
  references: GenRef[]
  dropped: string[] // names of kit items (or 'image N' for manual refs) not sent in full
  unused: boolean // the model takes no references
}

const ORDER: KitKind[] = ['character', 'product', 'place', 'style']

function fromHandle(doc: CanvasDoc, nodeId: string, handle: string): CanvasEdge[] {
  return doc.edges.filter((e) => e.target === nodeId && e.targetHandle === handle)
}

// What the node sends as reference images: its manual in:ref lines first, then the kit items on its in:kit line
// (kind order, every image of an item), over the model's cap trimmed from the end (manual lines last).
// Text-only kit refs (an item with no images) are not counted and never trimmed.
export function kitRefs(doc: CanvasDoc, nodeId: string, kit: Kit | null, gens: Generation[], model: GenModel | undefined): KitRefs {
  if (model && (model.inputs.reference ?? 'none') === 'none') return { references: [], dropped: [], unused: true }
  const node = doc.nodes.find((n) => n.id === nodeId)
  const manual: GenRef[] = []
  for (const e of fromHandle(doc, nodeId, 'in:ref')) {
    const src = doc.nodes.find((n) => n.id === e.source)
    const g = src && selectedGen(src, gens)
    if (g) manual.push({ source: 'gen', genId: g.id })
  }
  const kitSrc = fromHandle(doc, nodeId, 'in:kit')
    .map((e) => doc.nodes.find((n) => n.id === e.source))
    .find((n) => n?.type === 'kit')
  const items: KitItem[] = []
  if (kit && kitSrc) {
    const used = new Set(kitSrc.data.kitItems ?? [])
    const off = new Set(node?.data.kitOff ?? [])
    for (const kind of ORDER) items.push(...kit.items.filter((i) => i.kind === kind && used.has(i.id) && !off.has(i.id)))
  }
  const cap = model ? (model.maxRefs ?? 1) : Infinity
  let room = cap - manual.length
  const references: GenRef[] = manual.slice(0, Math.max(0, cap))
  const dropped: string[] = []
  for (const item of items) {
    if (item.images.length === 0) {
      references.push({ source: 'kit', itemId: item.id })
      continue
    }
    const take = Math.max(0, Math.min(item.images.length, room))
    for (const image of item.images.slice(0, take)) references.push({ source: 'kit', itemId: item.id, image })
    room -= take
    if (take < item.images.length) dropped.push(item.name)
  }
  for (let n = references.filter((r) => r.source === 'gen').length; n < manual.length; n++) dropped.push(`image ${n + 1}`)
  return { references, dropped, unused: false }
}

// Puts a line from the kit node to every storyboard that has none, except those whose line was cut by hand.
export function wireKit(doc: CanvasDoc): CanvasDoc {
  const kitNode = doc.nodes.find((n) => n.type === 'kit')
  if (!kitNode) return doc
  const add: CanvasEdge[] = doc.nodes
    .filter((n) => n.type === 'storyboard' && !n.data.kitCut && !fromHandle(doc, n.id, 'in:kit').length)
    .map((n) => ({ id: `e_${kitNode.id}_${n.id}_in:kit`, source: kitNode.id, sourceHandle: 'out', target: n.id, targetHandle: 'in:kit' }))
  return add.length ? { ...doc, edges: [...doc.edges, ...add] } : doc
}

// Drops ids of deleted kit items from the kit node's kitItems and the storyboards' kitOff. Unchanged without a kit.
export function pruneKit(doc: CanvasDoc, kit: Kit | null): CanvasDoc {
  if (!kit) return doc
  const live = new Set(kit.items.map((i) => i.id))
  let changed = false
  const clean = (n: CanvasNode, field: 'kitItems' | 'kitOff'): CanvasNode => {
    const list = n.data[field]
    if (!list || list.every((id) => live.has(id))) return n
    changed = true
    return { ...n, data: { ...n.data, [field]: list.filter((id) => live.has(id)) } }
  }
  const nodes = doc.nodes.map((n) => (n.type === 'kit' ? clean(n, 'kitItems') : n.type === 'storyboard' ? clean(n, 'kitOff') : n))
  return changed ? { ...doc, nodes } : doc
}

export interface KitStale {
  nodeId: string
  removed: string[] // names of deleted items it used
}

// Storyboards whose shown version was made with a kit item that has changed since (updatedAt newer than the stamp)
// or is gone.
export function kitStale(doc: CanvasDoc, gens: Generation[], kit: Kit | null): KitStale[] {
  if (!kit) return []
  const out: KitStale[] = []
  for (const n of doc.nodes) {
    if (n.type !== 'storyboard') continue
    const g = selectedGen(n, gens)
    if (!g) continue
    let stale = false
    const removed: string[] = []
    for (const [id, stamp] of Object.entries(g.inputs.kitStamp ?? {})) {
      const item = kit.items.find((i) => i.id === id)
      if (!item) {
        stale = true
        const ref = g.inputs.references?.find((r) => r.source === 'kit' && r.itemId === id)
        removed.push((ref && 'name' in ref && ref.name) || id)
      } else if (item.updatedAt > stamp) stale = true
    }
    if (stale) out.push({ nodeId: n.id, removed })
  }
  return out
}
