import { serverText } from '../serverText.ts'
import { shotNodeOf } from './frames.ts'
import { addNode, priceOf } from './graph.ts'
import { wireKit } from './kit.ts'
import type { CanvasDoc, CanvasNode, GenModel } from './types.ts'

// What the "build this shot" agent proposes for one shot (backend/agent.py).
export interface AgentPlan {
  source: 'demo' | 'claude'
  shotId: string
  storyboard: { prompt: string; model: string }
  video: { prompt: string; model: string; duration: number }
  planUsd: number
}

const FAILED = "Couldn't plan this shot. Try again."

// Asks the server to plan one shot (shotId is the plan Shot id). Throws the server's sentence on error.
export async function askAgent(ideaId: string, shotId: string): Promise<AgentPlan> {
  const r = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/agent/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shotId }),
  })
  if (r.ok) return r.json()
  const body = await r.json().catch(() => null)
  throw new Error(serverText(body?.error) || serverText(FAILED))
}

const round = (n: number) => Math.round(n * 1e4) / 1e4

// What running the plan's storyboard and video once would cost in US$.
export function planCost(plan: AgentPlan, models: GenModel[]): { storyboard: number; video: number; total: number } {
  const sb = models.find((m) => m.id === plan.storyboard.model)
  const vid = models.find((m) => m.id === plan.video.model)
  const storyboard = sb ? round(priceOf(sb, undefined)) : 0
  const video = vid ? round(priceOf(vid, plan.video.duration)) : 0
  return { storyboard, video, total: round(storyboard + video) }
}

// Puts the plan on the shot's frame: reuses the primary (else newest) storyboard and the video on its in:start (else
// the newest video), creates what is missing, and sets model, prompt and the video's length. `changed` lists existing
// nodes whose settings changed (the caller marks them stale). Same doc when nothing changes.
export function applyAgentPlan(
  doc: CanvasDoc,
  shotId: string,
  plan: AgentPlan,
  models: GenModel[],
  sizes?: Map<string, { w: number; h: number }>,
  newNodeSize?: { w: number; h: number },
): { doc: CanvasDoc; storyboardId: string; videoId: string; changed: string[] } {
  if (!shotNodeOf(doc, shotId)) throw new Error(`Shot ${shotId} has no node.`)
  const inFrame = (d: CanvasDoc, type: CanvasNode['type']) => d.nodes.filter((n) => n.type === type && n.shotId === shotId)
  const origin = { x: 0, y: 0 }
  const placementSizes = newNodeSize ? new Map(sizes) : sizes
  let next = doc

  const sbs = inFrame(next, 'storyboard')
  let sb = sbs.find((n) => n.data.primary) ?? sbs[sbs.length - 1]
  const sbNew = !sb
  if (!sb) {
    next = addNode(next, 'storyboard', origin, shotId, placementSizes)
    sb = next.nodes[next.nodes.length - 1]
    // This card has not mounted yet, but the following video must reserve its full width.
    if (newNodeSize) placementSizes!.set(sb.id, newNodeSize)
  }

  const vids = inFrame(next, 'video')
  const startId = next.edges.find((e) => e.targetHandle === 'in:start' && e.source === sb.id)?.target
  let vid = vids.find((n) => n.id === startId) ?? vids[vids.length - 1]
  const vidNew = !vid
  if (!vid) {
    next = addNode(next, 'video', origin, shotId, placementSizes)
    vid = next.nodes[next.nodes.length - 1]
  }

  const sbData = { model: plan.storyboard.model, prompt: plan.storyboard.prompt }
  const vidData = { model: plan.video.model, prompt: plan.video.prompt, duration: plan.video.duration }
  const differs = (n: CanvasNode, data: Record<string, unknown>) =>
    Object.entries(data).some(([k, v]) => (n.data as Record<string, unknown>)[k] !== v)
  const changed: string[] = []
  if (!sbNew && differs(sb, sbData)) changed.push(sb.id)
  if (!vidNew && differs(vid, vidData)) changed.push(vid.id)

  const sbId = sb.id
  const vidId = vid.id
  const nodes = next.nodes.map((n) => {
    if (n.id === sbId && differs(n, sbData)) return { ...n, data: { ...n.data, ...sbData } }
    if (n.id === vidId && differs(n, vidData)) return { ...n, data: { ...n.data, ...vidData } }
    return n
  })
  if (nodes.some((n, i) => n !== next.nodes[i])) next = { ...next, nodes }
  // wireStart picks the frame's newest storyboard; the line must come from the one chosen here.
  if (!next.edges.some((e) => e.target === vidId && e.targetHandle === 'in:start')) {
    const model = models.find((m) => m.id === plan.video.model)
    if (!model || (model.inputs.startFrame ?? 'none') !== 'none') {
      const edge = { id: `e_${sbId}_${vidId}_in:start`, source: sbId, sourceHandle: 'out', target: vidId, targetHandle: 'in:start' }
      next = { ...next, edges: [...next.edges, edge] }
      // a new start line changes what an existing video is made from
      if (!vidNew && !changed.includes(vidId)) changed.push(vidId)
    }
  }
  next = wireKit(next)
  return { doc: next, storyboardId: sbId, videoId: vidId, changed }
}
