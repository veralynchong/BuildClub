import type { CanvasDoc, CanvasNode, NodeData } from './types.ts'
import { PORTS } from './ports.ts'
import { ff } from '../strings/freeform.ts'

interface ReplacementIO {
  current: () => CanvasDoc
  change: (doc: CanvasDoc) => void
  restore: (doc: CanvasDoc) => void
  flush: () => Promise<boolean>
  upload: () => Promise<Partial<NodeData>>
  restoreOldSources?: () => Promise<boolean>
  removeOldSources?: () => Promise<boolean>
}
// Only the replaced node and its old output lines are rolled back. Other nodes, viewport changes,
// and input entered while a request was pending belong to the current document.
export async function replaceUploadedMedia(nodeId: string, media: 'image' | 'video' | 'audio', io: ReplacementIO): Promise<void> {
  const before = io.current()
  const original = before.nodes.find((n) => n.id === nodeId)!
  const removed = before.edges.filter((e) => e.source === nodeId && !PORTS[before.nodes.find((n) => n.id === e.target)!.type].inputs.some((p) => p.id === e.targetHandle && p.media === media))
  const removedIds = new Set(removed.map((e) => e.id))
  const patch = (node: CanvasNode, data: Partial<NodeData>) => ({ ...node, data: { ...node.data, ...data } })
  io.change({ ...before, nodes: before.nodes.map((n) => n.id === nodeId ? patch(n, { media, selected: null, voiceId: undefined, takeId: undefined }) : n), edges: before.edges.filter((e) => !removedIds.has(e.id)) })
  let removedSources = false
  try {
    if (!await io.flush()) throw new Error(ff('saveFirst'))
    const result = await io.upload()
    if (io.removeOldSources) {
      if (!await io.removeOldSources()) throw new Error(ff('saveFirst'))
      removedSources = true
    }
    const current = io.current()
    io.change({ ...current, nodes: current.nodes.map((n) => n.id === nodeId ? patch(n, { media, ...result }) : n) })
    if (!await io.flush()) throw new Error(ff('saveFirst'))
  } catch (error) {
    const current = io.current()
    const live = new Set(current.nodes.map((n) => n.id))
    const edgeIds = new Set(current.edges.map((e) => e.id))
    io.restore({ ...current, nodes: current.nodes.map((n) => n.id === nodeId ? { ...n, data: original.data } : n), edges: [...current.edges, ...removed.filter((e) => live.has(e.source) && live.has(e.target) && !edgeIds.has(e.id))] })
    if (removedSources && io.restoreOldSources && !await io.restoreOldSources()) throw new Error(ff('sourceRollbackFailed'))
    await io.flush() // If offline or conflicted, the restored snapshot stays in the recovery draft.
    throw error
  }
}
