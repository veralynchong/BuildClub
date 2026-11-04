import { apiBase, canvasUrl, type ResourceInput, type Workspace } from './resource.ts'
import type { GenRef } from './kit.ts'
import { t } from '../i18n.ts'
import { serverText } from '../serverText.ts'
import { imageError, imageType } from './upload.ts'
import type { Kit, KitItem, KitKind } from '../../types.ts'
import type { Budget, CanvasDoc, CanvasState, ChainBody, GenModel, Generation, Quote } from './types.ts'

// A plan with no saved shots has no canvas yet.
export class NoShots extends Error {}

// Someone saved the canvas since it was loaded; version and doc are the server's.
export class StaleCanvas extends Error {
  version: number
  doc: CanvasDoc | null
  constructor(message: string, version: number, doc: CanvasDoc | null) {
    super(message)
    this.version = version
    this.doc = doc
  }
}

// backend/canvas.py check_doc: the saved copy has shot nodes this one lacks
const SHOT_DELETE = "Shot nodes can't be deleted."

const base = apiBase

async function send<T>(r: Response, fallback: string): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  if (r.status === 409 && (body?.version !== undefined || body?.error === 'The canvas changed somewhere else. Reload it.')) throw new StaleCanvas(serverText(body?.error) || t('canvas.err.stale'), body?.version ?? 0, body?.doc ?? null)
  throw new Error(serverText(body?.error) || fallback)
}

export async function getCanvas(ideaId: ResourceInput): Promise<CanvasState> {
  const r = await fetch(canvasUrl(ideaId))
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  if (r.status === 409 && body?.code === 'no-shots') throw new NoShots(serverText(body.error))
  throw new Error(serverText(body?.error) || t('canvas.err.load'))
}

export async function putCanvas(ideaId: ResourceInput, version: number, doc: CanvasDoc): Promise<number> {
  const r = await fetch(canvasUrl(ideaId), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version, doc }),
  })
  if (r.status === 409 || r.status === 422) {
    const body = await r.json().catch(() => null)
    // A newer copy exists (409 with its version), the plan is no longer approved (409 without one), or a shot node is
    // missing (422): in every case this copy can't be saved, so the board must be reloaded.
    if (r.status === 409) throw new StaleCanvas(serverText(body?.error) || t('canvas.err.stale'), typeof body?.version === 'number' ? body.version : 0, body?.doc ?? null)
    if (body?.error === SHOT_DELETE) throw new StaleCanvas(t('canvas.err.stale'), 0, null)
    throw new Error(serverText(body?.error) || t('canvas.err.save'))
  }
  return (await send<{ version: number }>(r, t('canvas.err.save'))).version
}

export async function getModels(): Promise<GenModel[]> {
  return (await send<{ models: GenModel[] }>(await fetch('/api/gen/models'), t('canvas.err.models'))).models
}

export async function listGens(ideaId: ResourceInput): Promise<Generation[]> {
  return send(await fetch(`${base(ideaId)}/gen`), t('canvas.err.gens'))
}

export interface StartGenBody {
  inputStamp?: string
  canvasVersion?: number
  confirm?: boolean
  nodeId: string
  model: string
  prompt: string
  startFrame?: string
  references?: GenRef[]
  duration?: number
}

export async function startGen(ideaId: ResourceInput, body: StartGenBody): Promise<Generation> {
  const r = await fetch(`${base(ideaId)}/gen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return send(r, t('canvas.err.start'))
}

export async function getBudget(): Promise<Budget> {
  return send(await fetch('/api/gen/budget'), t('canvas.err.budget'))
}

async function chain<T>(ideaId: ResourceInput, body: ChainBody, confirm: boolean): Promise<T> {
  const r = await fetch(`${base(ideaId)}/gen/chain`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, confirm }),
  })
  return send(r, t('canvas.err.start'))
}

// The price of a storyboard image plus the video that starts from it, and what is left today. Starts nothing.
export function quoteChain(ideaId: ResourceInput, body: ChainBody): Promise<Quote> {
  return chain(ideaId, body, false)
}

// Starts both: the image now, the video once the image is done. A 429 or 422 throws with the server's sentence.
export function startChain(ideaId: ResourceInput, body: ChainBody): Promise<{ image: Generation; video: Generation }> {
  return chain(ideaId, body, true)
}

async function getGen(ideaId: ResourceInput, genId: string): Promise<Generation> {
  return send(await fetch(`${base(ideaId)}/gen/${encodeURIComponent(genId)}`), t('canvas.err.gens'))
}

// Resolves after ms, or early when the signal aborts.
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const done = () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', done)
      resolve()
    }
    const timer = setTimeout(done, ms)
    signal?.addEventListener('abort', done)
  })
}

// Polls one generation, passing every state to onState, until it is done, failed or unknown (all resolve with that
// state). Aborting stops the polling and resolves null. A failed request rejects.
export async function pollGen(
  ideaId: ResourceInput,
  genId: string,
  onState: (gen: Generation) => void,
  { signal, intervalMs = 2000 }: { signal?: AbortSignal; intervalMs?: number } = {},
): Promise<Generation | null> {
  while (!signal?.aborted) {
    const gen = await getGen(ideaId, genId)
    if (signal?.aborted) return null
    onState(gen)
    if (gen.status === 'done' || gen.status === 'failed' || gen.status === 'unknown') return gen
    await sleep(intervalMs, signal)
  }
  return null
}

// An image for an upload node. A file the server would refuse is rejected here, without sending it.
export async function uploadImage(ideaId: ResourceInput, nodeId: string, file: File): Promise<Generation> {
  const bad = imageError(file)
  if (bad) throw new Error(bad)
  const r = await fetch(`${base(ideaId)}/gen/upload?nodeId=${encodeURIComponent(nodeId)}`, {
    method: 'POST',
    body: file,
    headers: { 'content-type': imageType(file) ?? '' },
  })
  return send(r, t('canvas.err.upload'))
}

// ---- consistency kit (backend/kit.py): the client's characters, products, places and looks ----
const kitBase = (clientId: string) => `/api/clients/${encodeURIComponent(clientId)}/kit`
const itemBase = (clientId: string, itemId: string) => `${kitBase(clientId)}/items/${encodeURIComponent(itemId)}`
const json = { 'content-type': 'application/json' }

export async function getKit(clientId: string): Promise<Kit> {
  return send(await fetch(kitBase(clientId)), t('canvas.kit.panel.err.load'))
}

export async function createKitItem(clientId: string, body: { kind: KitKind; name: string; note?: string }): Promise<KitItem> {
  const r = await fetch(`${kitBase(clientId)}/items`, { method: 'POST', headers: json, body: JSON.stringify(body) })
  return send(r, t('canvas.kit.panel.err.save'))
}

export async function updateKitItem(clientId: string, itemId: string, body: Partial<{ kind: KitKind; name: string; note: string }>): Promise<KitItem> {
  const r = await fetch(itemBase(clientId, itemId), { method: 'PATCH', headers: json, body: JSON.stringify(body) })
  return send(r, t('canvas.kit.panel.err.save'))
}

export async function deleteKitItem(clientId: string, itemId: string): Promise<Kit> {
  return send(await fetch(itemBase(clientId, itemId), { method: 'DELETE' }), t('canvas.kit.panel.err.save'))
}

export async function addKitImage(clientId: string, itemId: string, file: File): Promise<KitItem> {
  const r = await fetch(`${itemBase(clientId, itemId)}/images`, { method: 'PUT', headers: { 'content-type': imageType(file) ?? file.type }, body: file })
  return send(r, t('canvas.kit.panel.err.upload'))
}

export async function deleteKitImage(clientId: string, itemId: string, name: string): Promise<KitItem> {
  return send(await fetch(`${itemBase(clientId, itemId)}/images/${encodeURIComponent(name)}`, { method: 'DELETE' }), t('canvas.kit.panel.err.save'))
}

export const kitFileUrl = (clientId: string, name: string): string => `${kitBase(clientId)}/files/${encodeURIComponent(name)}`

export async function listWorkspaces(clientId: string): Promise<Workspace[]> {
  return (await send<{ workspaces: Workspace[] }>(await fetch(`/api/workspaces?clientId=${encodeURIComponent(clientId)}`), t('canvas.err.load'))).workspaces
}
export async function createWorkspace(clientId: string, title?: string): Promise<CanvasState & { workspace: Workspace }> {
  return send(await fetch('/api/workspaces', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId, title }) }), t('canvas.err.save'))
}
export async function uploadMedia(resource: ResourceInput, nodeId: string, file: File): Promise<Generation> {
  return send(await fetch(`${base(resource)}/gen/upload?nodeId=${encodeURIComponent(nodeId)}`, { method: 'POST', headers: { 'content-type': file.type, 'x-filename': encodeURIComponent(file.name) }, body: file }), t('canvas.err.upload'))
}

export interface NodeQuote {
  total: number
  remaining: Record<string, number>
  items: { nodeId: string; model: string; usd: number }[]
  inputStamp: string
  canvasVersion: number
}
export async function quoteNode(resource: ResourceInput, nodeId: string, canvasVersion: number): Promise<NodeQuote> {
  return send(await fetch(`${base(resource)}/gen`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nodeId, canvasVersion, confirm: false }) }), t('canvas.err.start'))
}
