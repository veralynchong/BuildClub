import type { CanvasDoc, CanvasEdge, CanvasNode, NodeKind } from './types.ts'
import type { EditProject } from '../editor/types.ts'
import type { VoiceInfo } from '../editor/api.ts'
import { mergeVoiceOwnership } from './voices.ts'
import { addNode } from './graph.ts'

export function createNode(doc: CanvasDoc, kind: NodeKind, at: { x: number; y: number }, shotId?: string): CanvasDoc {
  if (kind === 'editor') {
    if (doc.nodes.some((n) => n.type === 'editor')) return doc
    return { ...doc, nodes: [...doc.nodes, { id: 'n_editor', type: 'editor', position: at, data: {} }] }
  }
  const next = addNode(doc, kind, at, shotId)
  if (kind === 'upload') next.nodes[next.nodes.length - 1]!.data = { media: 'image' }
  if (kind === 'voice') next.nodes[next.nodes.length - 1]!.data = { model: 'mock-voice', prompt: '' }
  return next
}

export function editorEdges(doc: CanvasDoc, project: EditProject | null, voices: VoiceInfo[] = []): CanvasEdge[] {
  if (!project || !doc.nodes.some((n) => n.id === 'n_editor')) return []
  const found = new Map<string, CanvasEdge>()
  const add = (n: CanvasNode, handle: string) => found.set(n.id, { id: `derived:${n.id}`, source: n.id, sourceHandle: 'out', target: 'n_editor', targetHandle: handle })
  for (const clip of project.clips) {
    const node = doc.nodes.find((n) => n.id === clip.source.nodeId || (clip.source.kind === 'generation' && n.data.selected === clip.source.id) || (clip.source.kind === 'take' && n.data.takeId === clip.source.id))
    if (node) add(node, 'in:clips')
  }
  for (const voice of project.voiceover) {
    const owner = mergeVoiceOwnership(doc, voices).find((v) => v.id === voice.id)?.nodeId
    const node = doc.nodes.find((n) => n.id === owner || n.data.voiceId === voice.id || n.data.voiceIds?.includes(voice.id) || Object.values(n.data.voiceSources ?? {}).includes(voice.id))
    if (node) add(node, 'in:audio')
  }
  return [...found.values()]
}

export function removeEditorSource(project: EditProject, nodeId: string, doc: CanvasDoc, voices: VoiceInfo[] = []): EditProject {
  const n = doc.nodes.find((n) => n.id === nodeId)
  const voiceIds = new Set(voices.filter((v) => v.nodeId === nodeId).map((v) => v.id))
  if (n?.data.voiceId) voiceIds.add(n.data.voiceId)
  for (const id of n?.data.voiceIds ?? []) voiceIds.add(id)
  for (const id of Object.values(n?.data.voiceSources ?? {})) voiceIds.add(id)
  return { ...project,
    clips: project.clips.filter((c) => c.source.nodeId !== nodeId && !(c.source.kind === 'generation' && c.source.id === n?.data.selected) && !(c.source.kind === 'take' && c.source.id === n?.data.takeId)),
    voiceover: project.voiceover.filter((v) => !voiceIds.has(v.id)),
  }
}

export interface PromptPlan {
  source: string
  promptNodeId: string
  canvasVersion: number
  storyboard: { prompt: string; model: string }
  video: { prompt: string; model: string; duration: number }
  planUsd: number
}
export function applyPromptPlan(doc: CanvasDoc, plan: PromptPlan): CanvasDoc {
  const prompt = doc.nodes.find((n) => n.id === plan.promptNodeId && n.type === 'prompt')
  if (!prompt) throw new Error('Select a prompt node first.')
  let next = createNode(doc, 'storyboard', { x: prompt.position.x + 420, y: prompt.position.y })
  const image = next.nodes[next.nodes.length - 1]!
  image.data = { ...image.data, ...plan.storyboard }
  next = createNode(next, 'video', { x: image.position.x + 420, y: image.position.y })
  const video = next.nodes[next.nodes.length - 1]!
  video.data = { ...video.data, ...plan.video }
  const edge = (source: string, target: string, targetHandle: string): CanvasEdge => ({ id: `e_${source}_${target}_${targetHandle}`, source, sourceHandle: 'out', target, targetHandle })
  return { ...next, edges: [...next.edges, edge(prompt.id, image.id, 'in:text'), edge(prompt.id, video.id, 'in:text'), edge(image.id, video.id, 'in:start')] }
}

// Stable topological order across text and media nodes, including disconnected generators.
export function generationOrder(doc: CanvasDoc): string[] {
  const seen = new Set<string>()
  const active = new Set<string>()
  const result: string[] = []
  const visit = (node: CanvasNode) => {
    if (seen.has(node.id)) return
    if (active.has(node.id)) throw new Error('Connections cannot form a cycle.')
    active.add(node.id)
    for (const e of doc.edges.filter((e) => e.target === node.id)) {
      const source = doc.nodes.find((n) => n.id === e.source)
      if (source) visit(source)
    }
    active.delete(node.id); seen.add(node.id)
    if (['storyboard', 'video', 'voice'].includes(node.type)) result.push(node.id)
  }
  for (const node of doc.nodes) visit(node)
  return result
}

export function connectedPrompt(doc: CanvasDoc, nodeId: string, seen = new Set<string>()): string {
  if (seen.has(nodeId)) return ''
  seen.add(nodeId)
  const data = doc.nodes.find((n) => n.id === nodeId)?.data
  const own = data?.prompt?.trim() ? data.prompt : data?.text?.trim() ? data.text : ''
  if (own) return own
  const source = doc.edges.find((e) => e.target === nodeId && e.targetHandle === 'in:text')?.source
  return source ? connectedPrompt(doc, source, seen) : ''
}

export function duplicateNode(doc: CanvasDoc, nodeId: string): CanvasDoc {
  const original = doc.nodes.find((n) => n.id === nodeId)!
  const next = createNode(doc, original.type, { x: original.position.x + 60, y: original.position.y + 60 }, original.shotId)
  const copy = next.nodes[next.nodes.length - 1]
  copy.data = { ...original.data, selected: null, voiceId: undefined, voiceIds: undefined, voiceSources: undefined, takeId: undefined, awaiting: undefined }
  return next
}
