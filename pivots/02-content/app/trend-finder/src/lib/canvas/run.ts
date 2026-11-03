import type { Key } from '../i18n.ts'
import type { Kit, Shot } from '../../types.ts'
import { hasResult } from './edges.ts'
import { shotNodeOf } from './frames.ts'
import { chainPair, genRequest, genView, missingInput, pendingGen } from './graph.ts'
import type { CanvasDoc, ChainBody, GenModel, Generation } from './types.ts'

// Run all, Run the whole shot and the toolbar total (spec §6.4, §12.5.5): which nodes would run, in which batches, and
// what they cost. shotId here is always the plan Shot's id.
export interface RunItem {
  shotId: string
  nodeId: string
  kind: 'image' | 'video'
  model: string
  usd: number
}

export type RunBatch = { chain: { imageNodeId: string; videoNodeId: string } } | { single: string }

const round4 = (n: number) => Math.round(n * 1e4) / 1e4

// The plan's shots (limited to shotId) that still have a shot node not marked removed, in plan order. The toolbar count
// and runScope share it.
export function liveShotIds(doc: CanvasDoc, shots: Shot[], shotId?: string): string[] {
  return shots.flatMap((s) => {
    if (!s.id || (shotId !== undefined && s.id !== shotId)) return []
    const shotNode = shotNodeOf(doc, s.id)
    return shotNode && !doc.nodes.find((n) => n.id === shotNode)?.data.removed ? [s.id] : []
  })
}

export interface RunScopeInfo {
  items: RunItem[]
  // videos whose start-frame storyboard is remade in this run by another video's chain: run them after it finishes
  deferred: string[]
  skippedNoKey: number // candidates left out because their model needs a key
}

// The storyboard and video nodes of live shots (limited to opts.shotId) that would generate now: no job running, a
// model on the menu that can run, no result yet (or a stale one when includeStale), and nothing missing, except a
// start frame that a storyboard in the same scope will make. A storyboard in scope chains one video (the first); the
// other videos it starts are deferred, never started from the frame this run replaces. In shot order, then doc order.
export function runScopeInfo(doc: CanvasDoc, shots: Shot[], gens: Generation[], models: GenModel[], opts: { shotId?: string; includeStale: boolean }): RunScopeInfo {
  const live = liveShotIds(doc, shots, opts.shotId)
  const ready: RunItem[] = []
  const needStart: { item: RunItem; from: string | undefined }[] = []
  let skippedNoKey = 0
  for (const shotId of live) {
    for (const n of doc.nodes) {
      if ((n.type !== 'storyboard' && n.type !== 'video') || n.shotId !== shotId) continue
      if (pendingGen(n.id, gens)) continue
      if (hasResult(n, gens) && !(opts.includeStale && n.data.stale)) continue
      const v = genView(n, models, null, null)
      if (v.model && !v.retired && !v.model.available) skippedNoKey++
      if (!v.model || !v.canGenerate) continue
      const item: RunItem = { shotId, nodeId: n.id, kind: v.kind, model: v.model.id, usd: round4(v.usd) }
      const need = missingInput(doc, n.id, v.model, shots, gens)
      if (need === null) ready.push(item)
      else if (need === 'canvas.gen.needStart') needStart.push({ item, from: startOf(doc, n.id) })
    }
  }
  const sbInScope = new Set(ready.filter((i) => i.kind === 'image').map((i) => i.nodeId))
  const kept = [...ready, ...needStart.filter((x) => x.from !== undefined && sbInScope.has(x.from)).map((x) => x.item)]
  // back in shot order, then doc order
  const order = new Map(doc.nodes.map((n, i) => [n.id, i]))
  const shotOrder = new Map(live.map((id, i) => [id, i]))
  kept.sort((a, b) => shotOrder.get(a.shotId)! - shotOrder.get(b.shotId)! || order.get(a.nodeId)! - order.get(b.nodeId)!)
  const claimed = new Set<string>()
  const deferred: string[] = []
  const items = kept.filter((i) => {
    const from = i.kind === 'video' ? startOf(doc, i.nodeId) : undefined
    if (from === undefined || !sbInScope.has(from)) return true
    if (claimed.has(from)) {
      deferred.push(i.nodeId)
      return false
    }
    claimed.add(from)
    return true
  })
  return { items, deferred, skippedNoKey }
}

export function runScope(doc: CanvasDoc, shots: Shot[], gens: Generation[], models: GenModel[], opts: { shotId?: string; includeStale: boolean }): RunItem[] {
  return runScopeInfo(doc, shots, gens, models, opts).items
}

function startOf(doc: CanvasDoc, nodeId: string): string | undefined {
  return doc.edges.find((e) => e.target === nodeId && e.targetHandle === 'in:start')?.source
}

// A storyboard and the video on its in:start, both in scope, run as one chain; the rest run alone. Chains and
// storyboards come before videos, so a video's start frame is on its way first.
export function runBatches(doc: CanvasDoc, items: RunItem[]): RunBatch[] {
  const inScope = new Set(items.map((i) => i.nodeId))
  const chainOf = new Map<string, string>() // storyboard -> video
  const chained = new Set<string>()
  for (const i of items) {
    if (i.kind !== 'video') continue
    const pair = chainPair(doc, i.nodeId)
    if (pair && pair.videoNodeId === i.nodeId && inScope.has(pair.imageNodeId) && !chainOf.has(pair.imageNodeId)) {
      chainOf.set(pair.imageNodeId, i.nodeId)
      chained.add(i.nodeId)
    }
  }
  const first: RunBatch[] = []
  const videos: RunBatch[] = []
  for (const i of items) {
    if (i.kind === 'image') {
      const video = chainOf.get(i.nodeId)
      first.push(video ? { chain: { imageNodeId: i.nodeId, videoNodeId: video } } : { single: i.nodeId })
    } else if (!chained.has(i.nodeId)) videos.push({ single: i.nodeId })
  }
  return [...first, ...videos]
}

// The body of a storyboard + video chain request, or why it can't be sent (the checks Run the whole shot always made).
export function chainBody(
  doc: CanvasDoc,
  pair: { imageNodeId: string; videoNodeId: string },
  models: GenModel[],
  shots: Shot[],
  gens: Generation[],
  kit: Kit | null,
): { body: ChainBody } | { error: Key } {
  const image = doc.nodes.find((n) => n.id === pair.imageNodeId)
  const video = doc.nodes.find((n) => n.id === pair.videoNodeId)
  const imageModel = models.find((m) => m.id === image?.data.model && m.kind === 'image')
  const videoModel = models.find((m) => m.id === video?.data.model && m.kind === 'video')
  if (!image || !video || !imageModel || !videoModel || !imageModel.available || !videoModel.available) return { error: 'canvas.chain.noKey' }
  if (missingInput(doc, pair.imageNodeId, imageModel, shots, gens)) return { error: 'canvas.chain.missing' }
  const imageReq = genRequest(doc, pair.imageNodeId, shots, gens, kit, imageModel)
  const videoReq = genRequest(doc, pair.videoNodeId, shots, gens)
  if (videoReq.references.length) return { error: 'canvas.chain.noRef' } // the video starts from the storyboard image only
  return {
    body: {
      imageNodeId: pair.imageNodeId,
      videoNodeId: pair.videoNodeId,
      imageModel: imageModel.id,
      videoModel: videoModel.id,
      prompt: imageReq.prompt,
      videoPrompt: videoReq.prompt,
      duration: videoReq.duration ?? videoModel.durations?.[0],
      ...(imageReq.references.length ? { references: imageReq.references } : {}),
    },
  }
}

// The total and each shot's subtotal, in item order, only shots with an item.
export function scopeTotal(items: Pick<RunItem, 'shotId' | 'usd'>[]): { total: number; perShot: { shotId: string; usd: number }[] } {
  const per = new Map<string, number>()
  for (const i of items) per.set(i.shotId, (per.get(i.shotId) ?? 0) + i.usd)
  return {
    total: round4(items.reduce((sum, i) => sum + i.usd, 0)),
    perShot: [...per].map(([shotId, usd]) => ({ shotId, usd: round4(usd) })),
  }
}

// A single Generate that costs money asks once per session.
export function paidConfirmNeeded(usd: number, confirmedThisSession: boolean): boolean {
  return usd > 0 && !confirmedThisSession
}
