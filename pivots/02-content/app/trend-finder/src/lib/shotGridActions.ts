import type { Shot } from '../types'
import { StaleCanvas, type StartGenBody } from './canvas/api.ts'
import { genFinished, genRequest, genStarted } from './canvas/graph.ts'
import type { CanvasDoc, GenModel, Generation } from './canvas/types.ts'
import { setPrompt, type GridCell } from './shotGrid.ts'

// Everything the storyboard grid needs from the server, injected so tests use a fake.
export interface GridIO {
  put(version: number, doc: CanvasDoc): Promise<number>
  reload(): Promise<{ doc: CanvasDoc; version: number; generations: Generation[] }>
  start(body: StartGenBody): Promise<Generation>
  quote?(nodeId: string, version: number): Promise<{ total?: number; inputStamp?: string; quoteStamp?: string }> // workspace ideas only
}

// A saved doc; `generations` is set when a conflict made us reload.
export type Saved = DocState & { generations?: Generation[] }

export interface DocState {
  doc: CanvasDoc
  version: number
}

function patchNode(doc: CanvasDoc, nodeId: string, fn: (data: CanvasDoc['nodes'][number]['data']) => CanvasDoc['nodes'][number]['data']): CanvasDoc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === nodeId ? { ...n, data: fn(n.data) } : n)) }
}

// Applies an edit and saves it. When someone saved the canvas first, reloads once and applies the same edit to the
// fresh copy (returning its generations); a second conflict is thrown.
async function putEdit(io: GridIO, state: DocState, edit: (doc: CanvasDoc) => CanvasDoc): Promise<Saved> {
  try {
    const doc = edit(state.doc)
    return { doc, version: await io.put(state.version, doc) }
  } catch (e) {
    if (!(e instanceof StaleCanvas)) throw e
  }
  const fresh = await io.reload()
  const doc = edit(fresh.doc)
  return { doc, version: await io.put(fresh.version, doc), generations: fresh.generations }
}

// Saves the frame's own prompt (null clears it).
export function savePrompt(io: GridIO, state: DocState, nodeId: string, prompt: string | null): Promise<Saved> {
  return putEdit(io, state, (doc) => setPrompt(doc, nodeId, prompt))
}

// Starts one image job for the frame and records it on the node. Nothing is started when the prompt cannot be saved
// and nothing more is saved when the job cannot start. A workspace reads prompt and model from the saved canvas and
// wants a quote first, so with `io.quote` the prompt and model are saved, quoted, then confirmed with the stamps.
// `agreedUsd` is the price the user saw. A workspace quote above it (the node has a size or count option) stops before
// starting and returns `priceChanged` with the quoted total, so the caller can show it and ask again. Legacy ideas
// have no quote, so they are not checked.
export async function regenerate(
  io: GridIO, state: DocState, cell: GridCell, shots: Shot[], gens: Generation[], model: GenModel, agreedUsd: number,
): Promise<Saved & ({ gen: Generation; priceChanged?: undefined } | { gen?: undefined; priceChanged: number })> {
  if (!cell.nodeId) throw new Error('This shot has no frame to regenerate.')
  const nodeId = cell.nodeId
  let cur: Saved = state
  let reloaded: Generation[] | undefined
  const track = (s: Saved) => { cur = s; reloaded = s.generations ?? reloaded }
  const body: StartGenBody = { nodeId, model: model.id, prompt: cell.prompt, references: genRequest(state.doc, nodeId, shots, gens).references, aspectRatio: '9:16', confirm: true }
  if (io.quote) {
    track(await putEdit(io, state, (doc) => patchNode(setPrompt(doc, nodeId, cell.prompt), nodeId, (d) => ({ ...d, model: model.id }))))
    const q = await io.quote(nodeId, cur.version)
    if (q.total !== undefined && q.total > agreedUsd + 0.005) return { ...cur, generations: reloaded, priceChanged: q.total }
    body.inputStamp = q.inputStamp
    body.quoteStamp = q.quoteStamp
  }
  body.canvasVersion = cur.version
  const gen = await io.start(body)
  track(await putEdit(io, cur, (doc) => patchNode(doc, nodeId, (d) => genStarted(d, model.id, gen.id))))
  return { ...cur, generations: reloaded, gen }
}

// A job the frame waited for ended: a done one becomes the shown version, a failed one leaves the old one.
export function finish(state: Pick<DocState, 'doc'>, nodeId: string, gen: Generation): CanvasDoc {
  return patchNode(state.doc, nodeId, (d) => genFinished(d, gen))
}
