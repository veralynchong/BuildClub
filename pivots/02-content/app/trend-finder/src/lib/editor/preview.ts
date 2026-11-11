// The one ReelInput builder: the editor's player and the Timeline node's preview both use it (rulings P9/P11).
import type { Brand, Shot } from '../../types'
import type { EditProject, ReelInput } from './types.ts'

export const FONT_URL = '/fonts/NotoSansTC-VF.ttf'

// Shot id -> its line, for the shots that have a non-blank one.
export function shotLines(shots: Shot[]): Record<string, string> {
  return Object.fromEntries(shots.flatMap((s) => (s.id && s.line?.trim() ? [[s.id, s.line]] : [])))
}

export function reelInput(a: {
  project: EditProject
  urls: Record<string, string>
  shots: Shot[]
  musicUrl: string | null
  voice: ReelInput['voice']
  brand: ReelInput['brand']
  duck?: ReelInput['duck']
}): ReelInput {
  return { project: a.project, urls: a.urls, lines: shotLines(a.shots), musicUrl: a.musicUrl, ...(a.duck ? { duck: a.duck } : {}), voice: a.voice, brand: a.brand, fontUrl: FONT_URL }
}

// The Timeline node's preview: no music or voiceover (each needs its own load; the full editor plays them).
export function previewInput(project: EditProject, urls: Record<string, string>, shots: Shot[], brand: ReelInput['brand']): ReelInput {
  return reelInput({ project, urls, shots, musicUrl: null, voice: [], brand })
}

// The client's brand as the reel draws it.
export function reelBrand(kit: Brand | undefined, clientId: string): ReelInput['brand'] {
  return {
    font: kit?.font ?? 'Noto Sans TC',
    color: kit?.color ?? null,
    logoUrl: kit?.logo ? `/api/clients/${encodeURIComponent(clientId)}/brand/logo?v=${encodeURIComponent(kit.logo)}` : null,
  }
}
