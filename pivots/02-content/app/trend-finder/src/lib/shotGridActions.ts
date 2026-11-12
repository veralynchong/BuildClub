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
}

export interface DocState {
  doc: CanvasDoc
  version: number
}

function patchNode(doc: CanvasDoc, nodeId: string, fn: (data: CanvasDoc['nodes'][number]['data']) => CanvasDoc['nodes'][number]['data']): CanvasDoc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === nodeId ? { ...n, data: fn(n.data) } : n)) }
}

// Saves the frame's own prompt (null clears it). When someone saved the canvas first, reloads once and applies the
// same prompt to the fresh copy; a second conflict is thrown.
export async function savePrompt(io: GridIO, state: DocState, nodeId: string, prompt: string | null): Promise<DocState> {
  try {
    const doc = setPrompt(state.doc, nodeId, prompt)
    return { doc, version: await io.put(state.version, doc) }
  } catch (e) {
    if (!(e instanceof StaleCanvas)) throw e
  }
  const fresh = await io.reload()
  const doc = setPrompt(fresh.doc, nodeId, prompt)
  return { doc, version: await io.put(fresh.version, doc) }
}

// Starts one image job for the frame and records it on the node. Nothing is saved when the job cannot start.
export async function regenerate(
  io: GridIO, state: DocState, cell: GridCell, shots: Shot[], gens: Generation[], model: GenModel,
): Promise<DocState & { gen: Generation }> {
  if (!cell.nodeId) throw new Error('This shot has no frame to regenerate.')
  const nodeId = cell.nodeId
  const { references } = genRequest(state.doc, nodeId, shots, gens)
  const gen = await io.start({ nodeId, model: model.id, prompt: cell.prompt, references, aspectRatio: '9:16', canvasVersion: state.version, confirm: true })
  const doc = patchNode(state.doc, nodeId, (d) => genStarted(d, model.id, gen.id))
  return { doc, version: await io.put(state.version, doc), gen }
}

// A job the frame waited for ended: a done one becomes the shown version, a failed one leaves the old one.
export function finish(state: Pick<DocState, 'doc'>, nodeId: string, gen: Generation): CanvasDoc {
  return patchNode(state.doc, nodeId, (d) => genFinished(d, gen))
}
