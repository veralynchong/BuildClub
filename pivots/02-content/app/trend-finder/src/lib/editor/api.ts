import { apiBase, type ResourceInput } from '../canvas/resource.ts'
import { t } from '../i18n.ts'
import { serverText } from '../serverText.ts'
import type { CutState } from '../cut.ts'
import type { Brand } from '../../types'
import type { Generation } from '../canvas/types.ts'
import type { EditProject, SourceInfo, Word } from './types.ts'

// Someone saved the edit since it was loaded (or the plan is no longer approved); this copy must be reloaded.
export class StaleProject extends Error {}

const base = (ideaId: ResourceInput) => `${apiBase(ideaId)}/edit`

async function send<T>(r: Response, fallback: string): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  throw new Error(serverText(body?.error) || fallback)
}

export async function getProject(ideaId: ResourceInput): Promise<{ version: number; project: EditProject }> {
  return send(await fetch(base(ideaId)), t('editor.err.load'))
}

export async function putProject(ideaId: ResourceInput, version: number, project: EditProject): Promise<number> {
  const r = await fetch(base(ideaId), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ version, project }),
  })
  if (r.status === 409) {
    const body = await r.clone().json().catch(() => null)
    if (body && typeof body === 'object' && 'version' in body) throw new StaleProject()
  }
  return (await send<{ version: number }>(r, t('editor.err.save'))).version
}

export async function getSources(ideaId: ResourceInput): Promise<SourceInfo[]> {
  return (await send<{ sources: SourceInfo[] }>(await fetch(`${base(ideaId)}/sources`), t('editor.err.sources'))).sources
}

export async function startExport(ideaId: ResourceInput): Promise<CutState> {
  return send(await fetch(`${base(ideaId)}/export`, { method: 'POST' }), t('editor.err.export'))
}

// ---- the client's brand kit (logo, font, colour); showLogo is a project field and is not sent here ----
const brandBase = (clientId: string) => `/api/clients/${encodeURIComponent(clientId)}/brand`

export async function putBrand(clientId: string, body: { font: Brand['font']; color: string | null }): Promise<Brand> {
  const r = await fetch(brandBase(clientId), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  return send(r, t('editor.err.brand'))
}

export async function putLogo(clientId: string, file: File): Promise<Brand> {
  const r = await fetch(`${brandBase(clientId)}/logo`, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
  return send(r, t('editor.err.logo'))
}

export async function deleteLogo(clientId: string): Promise<Brand> {
  return send(await fetch(`${brandBase(clientId)}/logo`, { method: 'DELETE' }), t('editor.err.logo'))
}

// ---- voiceover files (backend/editing.py): recorded, uploaded or spoken by an AI voice ----
export interface VoiceInfo {
  nodeId?: string
  genId?: string
  id: string
  url: string
  duration: number
  words: Word[] | null // null: no word times, so the captions fall back to the shots' lines
  wordsError?: string
}

export async function getVoices(ideaId: ResourceInput): Promise<VoiceInfo[]> {
  return (await send<{ voices: VoiceInfo[] }>(await fetch(`${base(ideaId)}/voice`), t('editor.err.voice'))).voices
}

export async function putVoice(ideaId: ResourceInput, file: Blob, source: 'recording' | 'upload', nodeId?: string): Promise<VoiceInfo> {
  const r = await fetch(`${base(ideaId)}/voice?source=${source}${nodeId ? `&nodeId=${encodeURIComponent(nodeId)}` : ''}`, { method: 'PUT', headers: { 'content-type': file.type }, body: file })
  return send(r, t('editor.err.voice'))
}

async function tts<T>(ideaId: ResourceInput, text: string, model: string, confirm: boolean, nodeId?: string, canvasVersion?: number, inputStamp?: string): Promise<T> {
  const r = await fetch(`${base(ideaId)}/voice/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, model, confirm, nodeId, canvasVersion, inputStamp }),
  })
  return send(r, t('editor.err.tts'))
}

// What the voice would cost and what is left today. Spends nothing.
export function quoteTts(ideaId: ResourceInput, text: string, model: string, nodeId?: string, canvasVersion?: number): Promise<{ usd: number; remaining: number; canvasVersion?: number; inputStamp?: string }> {
  return tts(ideaId, text, model, false, nodeId, canvasVersion)
}

// Starts the voice job (spends the estimate). Poll it with pollGen, then importTts.
export function startTts(ideaId: ResourceInput, text: string, model: string, nodeId?: string, canvasVersion?: number, inputStamp?: string): Promise<Generation> {
  return tts(ideaId, text, model, true, nodeId, canvasVersion, inputStamp)
}

export async function importTts(ideaId: ResourceInput, genId: string, nodeId?: string): Promise<VoiceInfo> {
  return send(await fetch(`${base(ideaId)}/voice/from-gen/${encodeURIComponent(genId)}${nodeId ? `?nodeId=${encodeURIComponent(nodeId)}` : ''}`, { method: 'POST' }), t('editor.err.voice'))
}

// The server refuses (409) while the saved project still uses the file: save the removal first.
export async function deleteVoice(ideaId: ResourceInput, vid: string): Promise<void> {
  await send(await fetch(`${base(ideaId)}/voice/${encodeURIComponent(vid)}`, { method: 'DELETE' }), t('editor.err.voice'))
}

// AI voice jobs that were never imported (the editor was left while one ran): finished ones, and ones still going.
export interface PendingVoice {
  id: string
  status: 'queued' | 'running' | 'done'
}

export async function getPendingVoices(ideaId: ResourceInput): Promise<PendingVoice[]> {
  const r = await send<{ pending: PendingVoice[] }>(await fetch(`${base(ideaId)}/voice/pending`), t('editor.err.voice'))
  return r.pending.map((g) => ({ id: g.id, status: g.status }))
}
