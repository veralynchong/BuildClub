import type { Take } from '../takes.ts'
import type { EditProject } from '../editor/types.ts'
import type { CanvasDoc, CanvasNode, Generation } from './types.ts'
import { selectedGen, successfulVersions } from './graph.ts'

export interface ShotAsset {
  key: string
  node: CanvasNode
  generation: Generation | null
  take?: Take
  url: string | null
  media: 'image' | 'video' | 'audio' | 'text' | 'kit'
  chosenOnNode: boolean
  primaryImage: boolean
  onTimeline: boolean
}

export function shotAssets(doc: CanvasDoc, shotId: string, generations: Generation[], takes: Take[] = [], project: Pick<EditProject, 'clips'> | null = null) {
  const owned = doc.nodes.filter((n) => n.shotId === shotId)
  const fromGeneration = (node: CanvasNode, generation: Generation): ShotAsset => ({
    key: `g:${generation.id}`, node, generation, url: generation.url,
    media: generation.kind === 'voice' ? 'audio' : generation.kind,
    chosenOnNode: selectedGen(node, generations)?.id === generation.id,
    primaryImage: node.type === 'storyboard' && !!node.data.primary && selectedGen(node, generations)?.id === generation.id,
    onTimeline: project?.clips.some((c) => c.source.kind === 'generation' && c.source.id === generation.id) ?? false,
  })
  const versions = (nodes: CanvasNode[]) => [...new Map(nodes.flatMap((n) => successfulVersions(n.id, generations).map((g) => [g.id, fromGeneration(n, g)] as const))).values()]
    .sort((a, b) => a.generation!.createdAt - b.generation!.createdAt)
  const images = versions(owned.filter((n) => n.type === 'storyboard'))
  const videos = versions(owned.filter((n) => n.type === 'video' || n.type === 'footage'))
  const footage = owned.find((n) => n.type === 'footage')
  if (footage) for (const take of takes.filter((t) => t.shotId === shotId)) videos.push({ key: `t:${take.id}`, node: footage, generation: null, take, url: take.url, media: 'video', chosenOnNode: take.chosen, primaryImage: false, onTimeline: project?.clips.some((c) => c.source.kind === 'take' && c.source.id === take.id) ?? false })

  const reference = (node: CanvasNode): ShotAsset => {
    const generation = selectedGen(node, generations)
    return generation ? fromGeneration(node, generation) : { key: `n:${node.id}`, node, generation: null, url: null, media: node.type === 'prompt' ? 'text' : node.type === 'kit' ? 'kit' : node.data.media ?? 'image', chosenOnNode: false, primaryImage: false, onTimeline: false }
  }
  const visited = new Set(owned.map((n) => n.id))
  const queue = [...visited]
  const references = owned.filter((n) => ['upload', 'prompt', 'kit', 'voice'].includes(n.type)).map(reference)
  while (queue.length) {
    const target = queue.shift()!
    for (const edge of doc.edges.filter((e) => e.target === target)) {
      if (visited.has(edge.source)) continue
      visited.add(edge.source)
      const node = doc.nodes.find((n) => n.id === edge.source)
      if (!node || node.type === 'shot' || node.type === 'editor') continue
      // A foreign generator is a reference, not another generator of the current shot.
      if (!node.shotId || node.shotId === shotId) queue.push(node.id)
      references.push(reference(node))
    }
  }
  return { references, images, videos, imageNode: owned.find((n) => n.type === 'storyboard' && n.data.primary) ?? owned.find((n) => n.type === 'storyboard'), videoNode: owned.find((n) => n.type === 'video'), shotNode: owned.find((n) => n.type === 'shot') }
}

export function shotCover(doc: CanvasDoc, shotId: string, generations: Generation[]): ShotAsset | null {
  const { images, videos, references } = shotAssets(doc, shotId, generations)
  return images.find((a) => a.primaryImage) ?? images[0] ?? references.find((a) => a.url && a.media === 'image') ?? videos[0] ?? null
}
