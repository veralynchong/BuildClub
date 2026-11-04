import type { Take } from '../takes.ts'
import type { GenRef } from './kit.ts'

// Shapes of the canvas document (backend/canvas.py) and generation rows (backend/generations.py to_json).
export type Media = 'text' | 'image' | 'video' | 'audio' | 'kit'
export type NodeKind = 'shot' | 'prompt' | 'storyboard' | 'video' | 'upload' | 'footage' | 'kit' | 'voice' | 'editor'
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
  media?: 'image' | 'video' | 'audio' // upload
  voiceId?: string
  takeId?: string // upload of a video
  duration?: number
  kitItems?: string[] // kit node: the kit item ids this video uses
  kitOff?: string[] // storyboard: kit items left out of this shot
  shotTextOff?: boolean // storyboard/video: do not use the shot's text
  kitCut?: boolean // storyboard: the kit line was cut by hand, so it is not put back
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

// A reference as the server keeps it: the request's GenRef plus what it showed (a kit item's name and kind, its file).
export type StoredRef = GenRef & { name?: string; kind?: string; file?: string }

// waiting: a video held until its storyboard image is done; unknown: the provider lost the result (may have charged)
export type GenStatus = 'queued' | 'waiting' | 'running' | 'done' | 'failed' | 'unknown'

export interface Generation {
  id: string
  ideaId: string
  nodeId: string
  kind: 'image' | 'video' | 'voice'
  model: string // a model id, or 'upload' / 'imported'
  inputs: {
    inputStamp?: string
    prompt?: string
    startFrame?: string | null
    references?: StoredRef[]
    kitStamp?: Record<string, number> // kit item id -> its updatedAt when this was made
    sentPrompt?: string // the prompt the model got, kit lines included
    duration?: number | null
  }
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
  maxRefs?: number // reference images the model takes; missing counts as 1
  aspects: string[]
  typicalSeconds?: number // seconds a job usually takes; the UI always says "about"
}

export interface CanvasState {
  workspace?: import('./resource.ts').Workspace
  version: number
  doc: CanvasDoc
  generations: Generation[]
  takes: Take[]
}

// GET /api/gen/budget: per kind, what was spent today and the daily cap.
export interface Budget {
  image: { spent: number; cap: number }
  video: { spent: number; cap: number }
  voice: { spent: number; cap: number }
}

export interface ChainBody {
  imageNodeId: string
  videoNodeId: string
  imageModel: string
  videoModel: string
  prompt: string
  videoPrompt?: string
  duration?: number
  references?: GenRef[] // for the storyboard image only
}

// The answer to a chain request that was not confirmed: nothing is started.
export interface Quote {
  total: number
  remaining: { image: number; video: number }
  items: { nodeId: string; model: string; usd: number }[]
}
