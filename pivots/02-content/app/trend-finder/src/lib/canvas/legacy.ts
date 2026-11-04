import type { CanvasDoc, GenModel, Generation } from './types.ts'
import type { Kit, Shot } from '../../types.ts'
import { genRequest, primaryFrames } from './graph.ts'

export function legacyGenerationRequest(doc: CanvasDoc, nodeId: string, shots: Shot[], gens: Generation[], kit: Kit | null, model?: GenModel) {
  const request = genRequest(doc, nodeId, shots, gens, kit, model)
  const ids = new Set(request.references.flatMap((r) => r.source === 'kit' ? [r.itemId] : []))
  // Preview only: references remain typed ids so the existing backend builds its canonical prefix once.
  const kitPreview = (kit?.items ?? []).filter((i) => ids.has(i.id)).map((i) => `${i.name}: ${i.note}`).join('\n')
  return { request, kitPreview }
}
export function applyLegacyFrames(doc: CanvasDoc, shots: Shot[], gens: Generation[]): Shot[] {
  const selectedDoc = { ...doc, nodes: doc.nodes.filter((n) => n.type !== 'storyboard' || !!n.data.selected) }
  const updates = primaryFrames(selectedDoc, shots, gens)
  if (!updates.length) return shots
  return shots.map((shot, index) => { const update = updates.find((f) => f.index === index); return update ? { ...shot, frameImage: update.frameImage } : shot })
}

export function legacyInputsMatch(doc: CanvasDoc, gen: Generation, shots: Shot[], gens: Generation[], kit: Kit | null, model: GenModel): boolean {
  const node = doc.nodes.find((n) => n.id === gen.nodeId)
  if (!node || (node.data.model ?? model.id) !== gen.model) return false
  if (!kit && doc.edges.some((e) => e.target === node.id && e.targetHandle === 'in:kit')) return false
  const { request } = legacyGenerationRequest(doc, node.id, shots, gens, kit, model)
  const refs = (values: Generation['inputs']['references'] = []) => values.map((r) => r.source === 'gen' ? { source: r.source, genId: r.genId } : { source: r.source, itemId: r.itemId, image: r.image })
  return request.prompt === (gen.inputs.prompt ?? '') && (request.startFrame ?? null) === (gen.inputs.startFrame ?? null) &&
    (request.duration ?? model.durations?.[0] ?? null) === (gen.inputs.duration ?? null) &&
    JSON.stringify(refs(request.references)) === JSON.stringify(refs(gen.inputs.references)) &&
    Object.entries(gen.inputs.kitStamp ?? {}).every(([id, stamp]) => kit?.items.some((item) => item.id === id && item.updatedAt === stamp))
}
