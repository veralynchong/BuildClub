import type { Take } from '../takes.ts'

// Shapes of the canvas document (backend/canvas.py) and generation rows (backend/generations.py to_json).
export type Media = 'text' | 'image' | 'video'
export type NodeKind = 'shot' | 'prompt' | 'storyboard' | 'video' | 'upload' | 'footage'
export type InputNeed = 'required' | 'optional' | 'none'

export interface NodeData {
  removed?: boolean // shot: taken out of the shot list
  primary?: boolean // storyboard: the frame the shot list shows
  model?: string
  prompt?: string
  text?: string // prompt node
  selected?: string | null // the chosen version (a generation id)
  awaiting?: string // the generation being waited for; the chosen version stays until it finishes
  stale?: boolean // an input changed after the last version was made
  media?: 'image' | 'video' // upload
  takeId?: string // upload of a video
  duration?: number
}

export interface CanvasNode {
  id: string
  type: NodeKind
  shotId?: string
  position: { x: number; y: number }
  data: NodeData
}

export interface CanvasEdge {
  id: string
  source: string
  sourceHandle: string
  target: string
  targetHandle: string
}

export interface CanvasDoc {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

// waiting: a video held until its storyboard image is done; unknown: the provider lost the result (may have charged)
export type GenStatus = 'queued' | 'waiting' | 'running' | 'done' | 'failed' | 'unknown'

export interface Generation {
  id: string
  ideaId: string
  nodeId: string
  kind: 'image' | 'video'
  model: string // a model id, or 'upload' / 'imported'
  inputs: { prompt?: string; startFrame?: string | null; reference?: string | null; duration?: number | null }
  status: GenStatus
  estUsd: number
  actualUsd: number | null
  url: string | null
  error: string | null
  after?: string // waiting: the generation id it is held for
  createdAt: number
  finishedAt: number | null
}

// One item of backend/gen_models.json. A missing input means 'none'.
export interface GenModel {
  id: string
  label: string
  kind: 'image' | 'video' | 'voice'
  provider: string
  endpoint: string
  tier: string
  price: { per: string; usd: number }
  priceCheckedAt: string
  available: boolean
  inputs: { text?: InputNeed; startFrame?: InputNeed; reference?: InputNeed }
  durations?: number[]
  aspects: string[]
}

export interface CanvasState {
  version: number
  doc: CanvasDoc
  generations: Generation[]
  takes: Take[]
}

// GET /api/gen/budget: per kind, what was spent today and the daily cap.
export interface Budget {
  image: { spent: number; cap: number }
  video: { spent: number; cap: number }
}

export interface ChainBody {
  imageNodeId: string
  videoNodeId: string
  imageModel: string
  videoModel: string
  prompt: string
  videoPrompt?: string
  duration?: number
}

// The answer to a chain request that was not confirmed: nothing is started.
export interface Quote {
  total: number
  remaining: { image: number; video: number }
  items: { nodeId: string; model: string; usd: number }[]
}
