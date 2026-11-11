import type { DemoRoute } from './session'
import { tofuCase } from './tofuCase.ts'
import type { EditProject, SourceInfo } from '../editor/types'

export type DemoMediaMetadata = Record<string, { duration: number; width: number; height: number }>
export type DemoEditDraft = { version: 1; route: DemoRoute; assetId: string; project: EditProject }
export const demoEditKey = (route: DemoRoute) => `buildclub:demo:edit:${route}:v1`

export function demoSources(route: DemoRoute, metadata: DemoMediaMetadata): SourceInfo[] {
  return tofuCase.assets.flatMap(asset => {
    const info = metadata[asset.id]
    if (asset.kind !== 'video' || !asset.available || !asset.routes.includes(route) || !info ||
      !Number.isFinite(info.duration) || info.duration < 0.2 || info.duration > 180 ||
      !Number.isInteger(info.width) || info.width <= 0 || !Number.isInteger(info.height) || info.height <= 0) return []
    return [{ key: `generation:${asset.id}`, kind: 'generation' as const, id: asset.id,
      url: asset.relativePath, duration: info.duration, width: info.width, height: info.height, hasAudio: false }]
  })
}

export function createDemoEditDraft(route: DemoRoute, assetId: string, metadata: DemoMediaMetadata): DemoEditDraft | null {
  const source = demoSources(route, metadata).find(item => item.id === assetId)
  if (!source) return null
  const project: EditProject = { fps: 30, width: 1080, height: 1920, clips: [], texts: [],
    captions: { enabled: false }, music: null, voiceover: [], primaries: {},
    showLogo: false, logoSize: 'medium', logoCorner: 'top-right' }
  if (route === 'ai') {
    let elapsed = 0
    project.clips = tofuCase.shots.map((shot, i) => {
      const start = Math.round(elapsed * 30) / 30
      elapsed += shot.durationSeconds
      return { id: `c${i + 1}`, source: { kind: 'generation', id: assetId, shotId: shot.id },
        in: start, out: Math.round(elapsed * 30) / 30, volume: 1, muted: false }
    })
    if (elapsed > source.duration) return null
  } else {
    project.clips = [{ id: 'c1', source: { kind: 'generation', id: assetId, shotId: 's19' },
      in: 0, out: Math.floor(source.duration * 30 + 1e-6) / 30, volume: 1, muted: false }]
  }
  return { version: 1, route, assetId, project }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const emptyArray = (value: unknown) => Array.isArray(value) && value.length === 0
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const frameTime = (value: unknown): value is number => finite(value) && Math.abs(value * 30 - Math.round(value * 30)) < 1e-6

export function validateDemoEditDraft(value: unknown, route: DemoRoute, metadata: DemoMediaMetadata): value is DemoEditDraft {
  if (!record(value) || Object.keys(value).some(key => !['version', 'route', 'assetId', 'project'].includes(key)) || value.version !== 1 || value.route !== route || typeof value.assetId !== 'string') return false
  const sources = demoSources(route, metadata)
  if (!sources.some(source => source.id === value.assetId)) return false
  const p = value.project
  if (!record(p) || Object.keys(p).some(key => !['fps', 'width', 'height', 'clips', 'texts', 'captions', 'music', 'voiceover', 'primaries', 'showLogo', 'logoSize', 'logoCorner'].includes(key)) || p.fps !== 30 || p.width !== 1080 || p.height !== 1920 ||
    !Array.isArray(p.clips) || p.clips.length > 900 || !emptyArray(p.texts) || !emptyArray(p.voiceover) ||
    p.music !== null || !record(p.primaries) || Object.keys(p.primaries).length !== 0 ||
    !record(p.captions) || p.captions.enabled !== false || p.showLogo !== false ||
    p.logoSize !== 'medium' || p.logoCorner !== 'top-right') return false
  const ids = new Set<string>()
  let total = 0
  for (const c of p.clips) {
    if (!record(c) || typeof c.id !== 'string' || !c.id || ids.has(c.id) ||
      Object.keys(c).some(key => !['id', 'source', 'in', 'out', 'volume', 'muted', 'caption'].includes(key)) ||
      !record(c.source) || c.source.kind !== 'generation' || c.source.id !== value.assetId ||
      Object.keys(c.source).some(key => !['kind', 'id', 'shotId'].includes(key)) ||
      (c.source.shotId !== undefined && !tofuCase.shots.map(shot => shot.id).includes(c.source.shotId as string)) ||
      !frameTime(c.in) || !frameTime(c.out) || c.in < 0 || c.out - c.in < 0.2 - 1e-6 ||
      !finite(c.volume) || c.volume < 0 || c.volume > 2 || typeof c.muted !== 'boolean' ||
      (c.caption !== undefined && (typeof c.caption !== 'string' || c.caption.length > 120))) return false
    const sourceId = c.source.id
    const source = sources.find(source => source.id === sourceId)
    if (!source || c.out > source.duration + 1e-6) return false
    ids.add(c.id)
    total += c.out - c.in
  }
  return total <= 180 + 1e-6
}

export function parseDemoEditDraft(raw: string | null, route: DemoRoute, metadata: DemoMediaMetadata): DemoEditDraft | null {
  if (raw === null) return null
  try {
    const value: unknown = JSON.parse(raw)
    return validateDemoEditDraft(value, route, metadata) ? value : null
  } catch { return null }
}

// Save a detached allowlist of project fields; persisted sources never carry URLs.
export function withDemoProject(draft: DemoEditDraft, project: EditProject, metadata: DemoMediaMetadata): DemoEditDraft | null {
  const next = { ...draft, project }
  return validateDemoEditDraft(next, draft.route, metadata) ? JSON.parse(JSON.stringify(next)) as DemoEditDraft : null
}

export function observeDemoMetadata(
  video: Pick<HTMLVideoElement, 'readyState' | 'duration' | 'videoWidth' | 'videoHeight' | 'error' | 'addEventListener' | 'removeEventListener'>,
  onReady: (metadata: DemoMediaMetadata[string]) => void,
  onError: () => void,
): () => void {
  let active = true
  const snapshot = () => {
    if (!active) return
    if (video.error) { onError(); return }
    if (video.readyState < 1) return
    if (!Number.isFinite(video.duration) || video.duration < 0.2 || video.duration > 180 ||
      !Number.isInteger(video.videoWidth) || video.videoWidth <= 0 ||
      !Number.isInteger(video.videoHeight) || video.videoHeight <= 0) { onError(); return }
    onReady({ duration: video.duration, width: video.videoWidth, height: video.videoHeight })
  }
  const events = ['loadedmetadata', 'durationchange', 'loadeddata', 'resize']
  const failed = () => { if (active) onError() }
  for (const event of events) video.addEventListener(event, snapshot)
  video.addEventListener('error', failed)
  // A cached video may have passed loadedmetadata before the observer mounted.
  snapshot()
  return () => {
    active = false
    for (const event of events) video.removeEventListener(event, snapshot)
    video.removeEventListener('error', failed)
  }
}
