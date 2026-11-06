import type { Shot } from '../../types.ts'
import type { CanvasDoc, CanvasNode, NodeKind } from './types.ts'

type Size = { width: number; height: number }
export type LayoutSizes = ReadonlyMap<string, Size>
const GAP = 80
const ORDER: NodeKind[] = ['upload', 'prompt', 'storyboard', 'video', 'footage', 'voice', 'kit', 'editor']
const sizeOf = (node: CanvasNode, sizes?: LayoutSizes): Size => ({ width: Math.max(350, sizes?.get(node.id)?.width ?? 0), height: Math.max(node.type === 'shot' ? 200 : 720, sizes?.get(node.id)?.height ?? 0) })

// References without shotId belong to their downstream shot. Shared inputs remain single, separate nodes.
function ownersOf(doc: CanvasDoc): Map<string, Set<string>> {
  const owners = new Map(doc.nodes.map((n) => [n.id, new Set(n.shotId ? [n.shotId] : [])]))
  const explicit = new Set(doc.nodes.filter((n) => n.shotId).map((n) => n.id))
  let changed = true
  while (changed) {
    changed = false
    for (const edge of doc.edges) {
      if (explicit.has(edge.source)) continue
      const source = owners.get(edge.source)
      if (!source) continue
      for (const shot of owners.get(edge.target) ?? []) if (!source.has(shot)) { source.add(shot); changed = true }
    }
  }
  return owners
}

export function arrangeShots(doc: CanvasDoc, shots: Shot[], sizes?: LayoutSizes): CanvasDoc {
  const headers = doc.nodes.filter((n) => n.type === 'shot' && n.shotId)
  if (!headers.length) return doc
  const ids = [...new Set([...shots.map((s) => s.id), ...headers.map((n) => n.shotId!)])].filter((id): id is string => typeof id === 'string' && headers.some((n) => n.shotId === id))
  const owners = ownersOf(doc)
  const members = doc.nodes.filter((n) => n.type !== 'shot' && owners.get(n.id)?.size === 1)
  const kinds = ORDER.filter((kind) => members.some((n) => n.type === kind))
  const widths = new Map(kinds.map((kind) => [kind, Math.max(350, ...members.filter((n) => n.type === kind).map((n) => sizeOf(n, sizes).width))]))
  const headerHeight = Math.max(...headers.map((n) => sizeOf(n, sizes).height))
  const groupWidth = Math.max(350, kinds.reduce((w, kind) => w + widths.get(kind)! + GAP, 0)) + GAP
  const positions = new Map<string, { x: number; y: number }>()
  ids.forEach((id, index) => {
    const x = index * groupWidth
    for (const h of headers.filter((n) => n.shotId === id)) positions.set(h.id, { x, y: 60 })
    let columnX = x
    for (const kind of kinds) {
      let y = 60 + headerHeight + GAP
      const column = members.filter((n) => n.type === kind && owners.get(n.id)?.has(id)).sort((a, b) => Number(!!b.data.primary) - Number(!!a.data.primary))
      for (const n of column) { positions.set(n.id, { x: columnX, y }); y += sizeOf(n, sizes).height + GAP }
      columnX += widths.get(kind)! + GAP
    }
  })
  const free = doc.nodes.filter((n) => !positions.has(n.id))
  const trayY = -Math.max(0, ...free.map((n) => sizeOf(n, sizes).height)) - GAP
  let trayX = 0
  for (const n of free) { positions.set(n.id, { x: trayX, y: trayY }); trayX += sizeOf(n, sizes).width + GAP }
  const nodes = doc.nodes.map((n) => {
    const position = positions.get(n.id)!
    return n.position.x === position.x && n.position.y === position.y ? n : { ...n, position }
  })
  return doc.layout === 'shots-horizontal' && nodes.every((n, i) => n === doc.nodes[i]) ? doc : { ...doc, layout: 'shots-horizontal', nodes }
}

export function variantPosition(doc: CanvasDoc, kind: NodeKind, shotId: string, sizes?: LayoutSizes): { x: number; y: number } {
  const owners = ownersOf(doc)
  const column = doc.nodes.filter((n) => n.type === kind && owners.get(n.id)?.size === 1 && owners.get(n.id)?.has(shotId))
  if (column.length) return { x: column[0].position.x, y: Math.max(...column.map((n) => n.position.y + sizeOf(n, sizes).height)) + GAP }
  const header = doc.nodes.find((n) => n.type === 'shot' && n.shotId === shotId)
  return { x: (header?.position.x ?? 0) + ORDER.indexOf(kind) * (350 + GAP), y: (header?.position.y ?? 60) + (header ? sizeOf(header, sizes).height : 200) + GAP }
}

// Only untouched server defaults are auto-arranged. Existing custom canvases require the explicit Arrange action.
export function initialShotLayout(doc: CanvasDoc, shots: Shot[]): boolean {
  return shots.length > 0 && !doc.layout && doc.nodes.some((n) => n.type === 'shot') && doc.nodes.every((n) => {
    if (n.type === 'kit') return true
    if (!['shot', 'storyboard', 'footage'].includes(n.type)) return false
    const index = shots.findIndex((s) => s.id === n.shotId)
    const x = n.type === 'shot' ? 0 : n.type === 'storyboard' ? 360 : 720
    return index >= 0 && n.position.x === x && n.position.y === index * 480
  })
}
