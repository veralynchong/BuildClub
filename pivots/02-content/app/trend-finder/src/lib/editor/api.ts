import { t } from '../i18n.ts'
import type { CutState } from '../cut.ts'
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
  if (r.status === 409) throw new StaleProject()
  return (await send<{ version: number }>(r, t('editor.err.save'))).version
}

export async function getSources(ideaId: string): Promise<SourceInfo[]> {
  return (await send<{ sources: SourceInfo[] }>(await fetch(`${base(ideaId)}/sources`), t('editor.err.sources'))).sources
}

export async function startExport(ideaId: string): Promise<CutState> {
  return send(await fetch(`${base(ideaId)}/export`, { method: 'POST' }), t('editor.err.export'))
}
