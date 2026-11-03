import type { Shot } from '../../types.ts'
import type { CanvasDoc, GenModel, Generation } from './types.ts'

export const FULLSCREEN_KEY = 'remake.canvas.fullscreen'

function defaultStore(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export function readFullscreen(store?: Pick<Storage, 'getItem'> | null): boolean {
  try {
    const s = store === undefined ? defaultStore() : store
    return !!s && s.getItem(FULLSCREEN_KEY) === '1'
  } catch {
    return false
  }
}

export function writeFullscreen(on: boolean, store?: Pick<Storage, 'setItem'> | null): void {
  try {
    const s = store === undefined ? defaultStore() : store
    s?.setItem(FULLSCREEN_KEY, on ? '1' : '0')
  } catch {
    // storage unavailable: full screen just won't be remembered
  }
}

// F enters full screen; Esc leaves it. Typing, an open dialog or the editor take the key first.
export function shellKey(
  e: { key: string; typing: boolean; dialogOpen: boolean; editorOpen: boolean },
  fullscreen: boolean,
): 'enter' | 'leave' | null {
  if (e.typing) return null
  if (e.key === 'Escape') return fullscreen && !e.dialogOpen && !e.editorOpen ? 'leave' : null
  if ((e.key === 'f' || e.key === 'F') && !fullscreen && !e.dialogOpen && !e.editorOpen) return 'enter'
  return null
}

export function aboutTime(seconds: number): { key: 'canvas.time.sec' | 'canvas.time.min'; n: number } {
  if (seconds < 60) return { key: 'canvas.time.sec', n: Math.max(5, Math.ceil(seconds / 5) * 5) }
  return { key: 'canvas.time.min', n: Math.ceil(seconds / 60) }
}

export function etaOf(
  g: Pick<Generation, 'status' | 'createdAt'>,
  model: Pick<GenModel, 'typicalSeconds'> | undefined,
  now: number,
): { elapsed: number; left: number | null } {
  const elapsed = Math.max(0, Math.round((now - g.createdAt) / 1000))
  const typical = model?.typicalSeconds
  if (typical == null || g.status === 'waiting') return { elapsed, left: null }
  return { elapsed, left: Math.max(0, typical - elapsed) }
}

export interface QueueItem {
  nodeId: string
  genId: string
  kind: 'image' | 'video'
  shotNumber: number | null
  elapsed: number
  left: number | null
}

export function runningQueue(doc: CanvasDoc, gens: Generation[], models: GenModel[], shots: Shot[], now: number): QueueItem[] {
  const nodes = new Map(doc.nodes.map((n) => [n.id, n]))
  return gens
    .filter((g) => (g.status === 'queued' || g.status === 'waiting' || g.status === 'running') && nodes.has(g.nodeId))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((g) => {
      const shotId = nodes.get(g.nodeId)?.shotId
      const idx = shotId ? shots.findIndex((s) => s.id === shotId) : -1
      const { elapsed, left } = etaOf(g, models.find((m) => m.id === g.model), now)
      return { nodeId: g.nodeId, genId: g.id, kind: g.kind, shotNumber: idx >= 0 ? idx + 1 : null, elapsed, left }
    })
}

export function queueLeft(items: QueueItem[]): number | null {
  const known = items.map((i) => i.left).filter((l): l is number => l !== null)
  return known.length ? Math.max(...known) : null
}
