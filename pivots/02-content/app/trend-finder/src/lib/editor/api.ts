import { t } from '../i18n.ts'
import type { CutState } from '../cut.ts'
import type { Brand } from '../../types'
import type { EditProject, SourceInfo } from './types.ts'

// Someone saved the edit since it was loaded (or the plan is no longer approved); this copy must be reloaded.
export class StaleProject extends Error {}

const base = (ideaId: string) => `/api/ideas/${encodeURIComponent(ideaId)}/edit`

async function send<T>(r: Response, fallback: string): Promise<T> {
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  throw new Error(body?.error ?? fallback)
}

export async function getProject(ideaId: string): Promise<{ version: number; project: EditProject }> {
  return send(await fetch(base(ideaId)), t('editor.err.load'))
}

export async function putProject(ideaId: string, version: number, project: EditProject): Promise<number> {
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

export async function getSources(ideaId: string): Promise<SourceInfo[]> {
  return (await send<{ sources: SourceInfo[] }>(await fetch(`${base(ideaId)}/sources`), t('editor.err.sources'))).sources
}

export async function startExport(ideaId: string): Promise<CutState> {
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
