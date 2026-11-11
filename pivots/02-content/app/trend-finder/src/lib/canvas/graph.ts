import { ff } from '../strings/freeform.ts'
import { t, type Key } from '../i18n.ts'
import type { Kit, Shot } from '../../types.ts'
import { kitRefs, type GenRef } from './kit.ts'
import { shotNodeOf, slotInFrame } from './frames.ts'
import { variantPosition } from './shotLayout.ts'
import type { Budget, CanvasDoc, CanvasNode, GenModel, Generation, NodeData, NodeKind } from './types.ts'

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
  const open = versionsOf(nodeId, gens).filter((g) => g.status === 'queued' || g.status === 'waiting' || g.status === 'running')
  return open[open.length - 1] ?? null
}

// The node's newest version when it failed or its result was lost (a later finished or running one hides it), else null.
export function failedGen(nodeId: string, gens: Generation[]): Generation | null {
  const all = versionsOf(nodeId, gens)
  const last = all[all.length - 1]
  return last?.status === 'failed' || last?.status === 'unknown' ? last : null
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
      after.has(n.id) && (n.type === 'storyboard' || n.type === 'video' || n.type === 'voice') && versionsOf(n.id, gens).some((g) => g.status === 'done')
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
    .filter((n) => ids.has(n.id) && (n.type === 'storyboard' || n.type === 'video' || n.type === 'voice') && versionsOf(n.id, gens).some((g) => g.status === 'done'))
    .map((n) => n.id)
}

// A generation was started for the node: the chosen version stays as it is while the job runs; `awaiting` marks the wait.
export function genStarted(data: NodeData, model: string, genId: string): NodeData {
  return { ...data, model, awaiting: genId }
}

// A job the node was waiting for ended. Done: it becomes the chosen version and the node is up to date. Failed: the
// chosen version stays. Either way the wait ends. A job other than the one awaited changes nothing (a node saved
// before `awaiting` existed has none, and takes its job's result as before).
export function genFinished(data: NodeData, end: Pick<Generation, 'id' | 'status'>): NodeData {
  if (data.awaiting !== undefined && data.awaiting !== end.id) return data // a newer job is the one awaited
  const rest = { ...data }
  delete rest.awaiting
  return end.status === 'done' ? { ...rest, selected: end.id, stale: false } : rest
}

// Nodes that were waiting for a job (`awaiting`) which ended while the canvas was closed. `select`: it finished, so show
// it and date what follows; otherwise it failed and only the wait ends. Nodes without `awaiting` (legacy imports,
// uploads) are never touched.
export function finishedWhileAway(doc: CanvasDoc, gens: Generation[]): { nodeId: string; genId: string; select: boolean }[] {
  const out: { nodeId: string; genId: string; select: boolean }[] = []
  for (const n of doc.nodes) {
    const awaiting = n.data.awaiting
    if (!awaiting) continue
    const g = versionsOf(n.id, gens).find((x) => x.id === awaiting)
    if (!g) out.push({ nodeId: n.id, genId: awaiting, select: false })
    else if (g.status === 'done') out.push({ nodeId: n.id, genId: awaiting, select: true })
    else if (g.status === 'failed' || g.status === 'unknown') out.push({ nodeId: n.id, genId: awaiting, select: false })
  }
  return out
}

function upstream(doc: CanvasDoc, nodeId: string, handle: string): CanvasNode | null {
  const edge = doc.edges.find((e) => e.target === nodeId && e.targetHandle === handle)
  return (edge && doc.nodes.find((n) => n.id === edge.source)) || null
}

// The text a Prompt node on the in:text line gives, looking further up when a Prompt node is empty. A line from a
// shot node is ignored: the shot text comes from the node's shotId (migrateDoc removes such lines).
function promptLineText(doc: CanvasDoc, nodeId: string, seen = new Set<string>()): string {
  if (seen.has(nodeId)) return ''
  seen.add(nodeId)
  const src = upstream(doc, nodeId, 'in:text')
  if (!src || src.type !== 'prompt') return ''
  return src.data.text?.trim() ? src.data.text : promptLineText(doc, src.id, seen)
}

// The text a node generates from, and where it comes from (spec §12.5.3): its own prompt, else a Prompt node on its
// text line, else its shot's line (or description) when it is a storyboard or video of a shot that still has a shot
// node and shotTextOff is not set, else nothing. shotNumber is the shot's 1-based place in `shots` (from 'shot' only).
export function shotTextSource(doc: CanvasDoc, nodeId: string, shots: Shot[]): { text: string; from: 'own' | 'prompt' | 'shot' | 'none'; shotNumber?: number } {
  const node = doc.nodes.find((n) => n.id === nodeId)
  if (!node) return { text: '', from: 'none' }
  if (node.data.prompt?.trim()) return { text: node.data.prompt, from: 'own' }
  const fromPrompt = promptLineText(doc, nodeId)
  if (fromPrompt) return { text: fromPrompt, from: 'prompt' }
  if ((node.type === 'storyboard' || node.type === 'video') && node.shotId && shotNodeOf(doc, node.shotId) && !node.data.shotTextOff) {
    const index = shots.findIndex((s) => s.id === node.shotId)
    const shot = shots[index]
    const text = (shot?.line?.trim() ? shot.line : shot?.shot) ?? ''
    if (text) return { text, from: 'shot', shotNumber: index + 1 }
  }
  return { text: '', from: 'none' }
}

export interface GenRequest {
  aspectRatio?: string
  resolution?: string
  count?: number
  prompt: string
  startFrame?: string
  references: GenRef[]
  duration?: number
}

export function genRequest(doc: CanvasDoc, nodeId: string, shots: Shot[], gens: Generation[], kit: Kit | null = null, model?: GenModel): GenRequest {
  const node = doc.nodes.find((n) => n.id === nodeId)
  if (!node) return { prompt: '', references: [] }
  const req: GenRequest = { prompt: shotTextSource(doc, nodeId, shots).text, references: kitRefs(doc, nodeId, kit, gens, model).references }
  const frame = (handle: string) => {
    const src = upstream(doc, nodeId, handle)
    return src ? selectedGen(src, gens)?.id : undefined
  }
  const start = frame('in:start')
  if (start) req.startFrame = start
  if (typeof node.data.duration === 'number') req.duration = node.data.duration
  if (node.type === 'storyboard') {
    if (node.data.aspectRatio !== undefined) req.aspectRatio = node.data.aspectRatio
    if (node.data.resolution !== undefined) req.resolution = node.data.resolution
    if (node.data.count !== undefined) req.count = node.data.count
  }
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

// A new node. With a shotId (a plan Shot id) it goes in that shot's frame, right of its last member; no text line is
// added, the shot text reaches it through shotId. A footage node needs a shot. Returns a new doc.
export function addNode(doc: CanvasDoc, kind: NodeKind, at: { x: number; y: number }, shotId?: string, sizes?: Map<string, { w: number; h: number }>): CanvasDoc {
  const shotNode = shotId ? shotNodeOf(doc, shotId) : null
  if (kind === 'footage' && !shotNode) throw new Error('A footage node needs a shot.')
  const measured = sizes && new Map([...sizes].map(([id, s]) => [id, { width: s.w, height: s.h }]))
  const position = shotNode ? doc.layout === 'shots-horizontal' ? variantPosition(doc, kind, shotId!, measured) : slotInFrame(doc, shotNode, sizes) : { x: Math.round(at.x), y: Math.round(at.y) }
  const node: CanvasNode = { id: newId(doc, kind), type: kind, ...(shotNode ? { shotId } : {}), position, data: startData(kind) }
  return { ...doc, nodes: [...doc.nodes, node] }
}

// The settings of an earlier version, to put back on its node.
export function reuseSettings(g: Generation): Partial<NodeData> {
  return { model: g.model, prompt: g.inputs.prompt ?? '', ...(typeof g.inputs.duration === 'number' ? { duration: g.inputs.duration } : {}), ...(g.kind === 'image' ? { aspectRatio: g.inputs.aspectRatio ?? '9:16', resolution: g.inputs.resolution, count: g.inputs.count ?? 1 } : {}) }
}

// The storyboard and the video it starts (the storyboard's line into the video's in:start), found from either node.
export function chainPair(doc: CanvasDoc, nodeId: string): { imageNodeId: string; videoNodeId: string } | null {
  const type = (id: string) => doc.nodes.find((n) => n.id === id)?.type
  for (const e of doc.edges) {
    if (e.targetHandle !== 'in:start' || type(e.source) !== 'storyboard' || type(e.target) !== 'video') continue
    if (e.source === nodeId || e.target === nodeId) return { imageNodeId: e.source, videoNodeId: e.target }
  }
  return null
}

// Whether either end of the node's chain still has a generation in progress (starting another would charge twice).
export function chainBusy(doc: CanvasDoc, nodeId: string, gens: Generation[]): boolean {
  const pair = chainPair(doc, nodeId)
  return !!pair && (pendingGen(pair.imageNodeId, gens) !== null || pendingGen(pair.videoNodeId, gens) !== null)
}

// What one generation with the model costs in US$: flat per image, or per second times the length (default: the first).
export function priceOf(m: Pick<GenModel, 'price' | 'durations'>, seconds: number | undefined): number {
  return m.price.per === 'second' ? m.price.usd * (seconds ?? m.durations?.[0] ?? 0) : m.price.usd
}

// What is left of today's budget for the kind, or null while it is unknown.
export function budgetLeft(b: Budget | null, kind: 'image' | 'video'): number | null {
  return b ? Math.max(0, Math.round((b[kind].cap - b[kind].spent) * 1e4) / 1e4) : null
}

// The node's saved model is not on the menu for its kind (taken off, or unknown). False while the menu is empty.
export function isRetired(models: Pick<GenModel, 'id' | 'kind'>[], kind: 'image' | 'video', id: string | undefined): boolean {
  return !!id && models.length > 0 && !models.some((m) => m.id === id && m.kind === kind)
}

// Connects the newest storyboard of the video's frame to its free `in:start` when the video's model takes a start frame.
// Returns the same doc when nothing changes.
export function wireStart(doc: CanvasDoc, videoNodeId: string, models: GenModel[]): CanvasDoc {
  const video = doc.nodes.find((n) => n.id === videoNodeId)
  if (!video || video.type !== 'video' || !video.shotId) return doc
  if (doc.edges.some((e) => e.target === videoNodeId && e.targetHandle === 'in:start')) return doc
  const model = models.find((m) => m.id === video.data.model)
  if (model && (model.inputs.startFrame ?? 'none') === 'none') return doc
  const sbs = doc.nodes.filter((n) => n.type === 'storyboard' && n.shotId === video.shotId)
  const sb = sbs[sbs.length - 1]
  if (!sb) return doc
  const edge = { id: `e_${sb.id}_${videoNodeId}_in:start`, source: sb.id, sourceHandle: 'out', target: videoNodeId, targetHandle: 'in:start' }
  return { ...doc, edges: [...doc.edges, edge] }
}

// "Free" or "about US$x.xx" for one run of the model at the length (the model's first length when seconds is unset).
export function priceLabel(m: Pick<GenModel, 'price' | 'durations'>, seconds: number | undefined): string {
  const usd = priceOf(m, seconds)
  return usd === 0 ? t('canvas.gen.free') : t('canvas.gen.cost', { usd: usd.toFixed(2) })
}

// What a storyboard or video node shows about its model, shared by the card and the right panel so they can't drift:
// the model in use (none when the saved one was retired), the length, one run's price, what is left of today's budget,
// and whether Generate is allowed (callers add their own busy/read-only check). `need` is what the node still lacks.
export function genView(node: CanvasNode, models: GenModel[], budget: Budget | null, need: Key | null) {
  const kind: 'image' | 'video' = node.type === 'video' ? 'video' : 'image'
  const options = models.filter((m) => m.kind === kind)
  const retired = isRetired(models, kind, node.data.model)
  const model = retired ? undefined : (options.find((m) => m.id === node.data.model) ?? options[0])
  const seconds = model?.durations?.includes(node.data.duration ?? -1) ? node.data.duration : model?.durations?.[0]
  const usd = model ? priceOf(model, seconds) : 0
  return { kind, options, retired, model, seconds, usd, left: budgetLeft(budget, kind), canGenerate: !!model && model.available && !retired && need === null }
}


export function normalizeImageSettings(data: NodeData, model: GenModel): Pick<NodeData, 'aspectRatio' | 'resolution' | 'count'> {
  const aspects = model.aspects ?? []
  const resolutions = model.resolutions ?? []
  return {
    aspectRatio: aspects.includes(data.aspectRatio ?? '') ? data.aspectRatio : aspects.includes('9:16') ? '9:16' : aspects[0],
    resolution: resolutions.includes(data.resolution ?? '') ? data.resolution : resolutions.includes('1K') ? '1K' : resolutions[0],
    count: Number.isInteger(data.count) && data.count! >= 1 && data.count! <= (model.maxCount ?? 1) ? data.count : 1,
  }
}
export function imageEstimate(model: GenModel, data: NodeData): number {
  const options = normalizeImageSettings(data, model)
  return Math.round((model.price.byResolutionUsd?.[options.resolution ?? ''] ?? model.price.usd) * (options.count ?? 1) * 1e6) / 1e6
}
export function successfulVersions(nodeId: string, gens: Generation[]): Generation[] {
  return versionsOf(nodeId, gens).filter((g) => g.status === 'done')
}
export function referenceEdge(source: string, target: string, kit: boolean) {
  const targetHandle = kit ? 'in:kit' : 'in:ref'
  return { id: `e_${source}_${target}_${targetHandle}`, source, sourceHandle: 'out', target, targetHandle }
}
// Count untrimmed inputs: model changes must never silently discard connected references.
export function referenceCount(doc: CanvasDoc, nodeId: string, kit: Kit | null): number {
  const node = doc.nodes.find((n) => n.id === nodeId)
  let count = doc.edges.filter((e) => e.target === nodeId && e.targetHandle === 'in:ref').length
  for (const e of doc.edges.filter((e) => e.target === nodeId && e.targetHandle === 'in:kit')) {
    const source = doc.nodes.find((n) => n.id === e.source)
    count += (kit?.items ?? []).filter((i) => source?.data.kitItems?.includes(i.id) && !node?.data.kitOff?.includes(i.id)).reduce((n, i) => n + i.images.length, 0)
  }
  return count
}
export function modelRefusal(doc: CanvasDoc, nodeId: string, model: GenModel, gens: Generation[], kit: Kit | null): string | null {
  const incoming = doc.edges.filter((e) => e.target === nodeId)
  const refs = referenceCount(doc, nodeId, kit)
  if ((refs || incoming.some((e) => e.targetHandle === 'in:kit')) && (model.inputs.reference ?? 'none') === 'none') return ff('refsUnsupported')
  if (refs > (model.maxRefs ?? 1)) return `${ff('tooManyRefs')}: ${refs}/${model.maxRefs ?? 1}`
  if (incoming.some((e) => e.targetHandle === 'in:start') && (model.inputs.startFrame ?? 'none') === 'none') return ff('startUnsupported')
  void gens
  return null
}
