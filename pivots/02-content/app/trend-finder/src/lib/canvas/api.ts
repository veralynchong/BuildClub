import { t } from '../i18n.ts'
import { imageError, imageType } from './upload.ts'
import type { CanvasDoc, CanvasState, GenModel, Generation } from './types.ts'

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

const base = (ideaId: string) => `/api/ideas/${encodeURIComponent(ideaId)}`

async function send<T>(r: Response, fallback: string): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  throw new Error(body?.error ?? fallback)
}

export async function getCanvas(ideaId: string): Promise<CanvasState> {
  const r = await fetch(`${base(ideaId)}/canvas`)
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  if (r.status === 409 && body?.code === 'no-shots') throw new NoShots(body.error)
  throw new Error(body?.error ?? t('canvas.err.load'))
}

export async function putCanvas(ideaId: string, version: number, doc: CanvasDoc): Promise<number> {
  const r = await fetch(`${base(ideaId)}/canvas`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version, doc }),
  })
  if (r.status === 409) {
    const body = await r.json().catch(() => null)
    if (typeof body?.version === 'number') throw new StaleCanvas(body.error ?? t('canvas.err.stale'), body.version, body.doc ?? null)
    throw new Error(body?.error ?? t('canvas.err.save'))
  }
  return (await send<{ version: number }>(r, t('canvas.err.save'))).version
}

export async function getModels(): Promise<GenModel[]> {
  return (await send<{ models: GenModel[] }>(await fetch('/api/gen/models'), t('canvas.err.models'))).models
}

export async function listGens(ideaId: string): Promise<Generation[]> {
  return send(await fetch(`${base(ideaId)}/gen`), t('canvas.err.gens'))
}

export interface StartGenBody {
  nodeId: string
  model: string
  prompt: string
  startFrame?: string
  reference?: string
  duration?: number
}

export async function startGen(ideaId: string, body: StartGenBody): Promise<Generation> {
  const r = await fetch(`${base(ideaId)}/gen`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return send(r, t('canvas.err.start'))
}

async function getGen(ideaId: string, genId: string): Promise<Generation> {
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

// Polls one generation, passing every state to onState, until it is done or failed (both resolve with that
// state). Aborting stops the polling and resolves null. A failed request rejects.
export async function pollGen(
  ideaId: string,
  genId: string,
  onState: (gen: Generation) => void,
  { signal, intervalMs = 2000 }: { signal?: AbortSignal; intervalMs?: number } = {},
): Promise<Generation | null> {
  while (!signal?.aborted) {
    const gen = await getGen(ideaId, genId)
    if (signal?.aborted) return null
    onState(gen)
    if (gen.status === 'done' || gen.status === 'failed') return gen
    await sleep(intervalMs, signal)
  }
  return null
}

// An image for an upload node. A file the server would refuse is rejected here, without sending it.
export async function uploadImage(ideaId: string, nodeId: string, file: File): Promise<Generation> {
  const bad = imageError(file)
  if (bad) throw new Error(bad)
  const r = await fetch(`${base(ideaId)}/gen/upload?nodeId=${encodeURIComponent(nodeId)}`, {
    method: 'POST',
    body: file,
    headers: { 'content-type': imageType(file) ?? '' },
  })
  return send(r, t('canvas.err.upload'))
}
