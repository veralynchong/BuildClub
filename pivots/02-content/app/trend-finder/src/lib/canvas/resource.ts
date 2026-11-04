import type { Shot } from '../../types.ts'

export type ResourceRef = { kind: 'workspace' | 'legacy-plan'; id: string }
export type ResourceInput = ResourceRef | string
export interface CanvasContext {
  resource: ResourceRef
  clientId: string
  title: string
  readOnly: boolean
  shots: Shot[]
}
export interface Workspace {
  id: string
  kind: 'workspace'
  clientId: string
  title: string
  createdAt: number
  updatedAt: number
}
// Strings keep existing callers on the legacy route, even if an id resembles a workspace.
export function apiBase(ref: ResourceInput): string {
  const r = typeof ref === 'string' ? { kind: 'legacy-plan', id: ref } : ref
  return `/api/${r.kind === 'workspace' ? 'workspaces' : 'ideas'}/${encodeURIComponent(r.id)}`
}
export const canvasUrl = (ref: ResourceInput): string => `${apiBase(ref)}${typeof ref !== 'string' && ref.kind === 'workspace' ? '' : '/canvas'}`

export function scopedWorkspaces(spaces: Workspace[], clientId: string): Workspace[] {
  return spaces.filter((w) => w.clientId === clientId)
}
