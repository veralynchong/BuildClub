export type GuidedRoute = 'shoot' | 'ai'
export type GuidedStep = 'search' | 'results' | 'research' | 'breakdown' | 'script' | 'route' | 'canvas' | 'edit' | 'result'
export type GuidedCanvasStep = 'shots' | 'prompt' | 'image' | 'connect' | 'video' | 'versions' | 'footage'
export type GuidedState = { version: 1; active: boolean; stepId: GuidedStep; route: GuidedRoute | null; canvasStep?: GuidedCanvasStep; skippedCanvasSteps?: GuidedCanvasStep[] }
export type GuidedFocusRequest = { nodeIds: readonly string[]; edgeIds?: readonly string[]; dock?: 'inspect' | 'history' | null }

export const GUIDED_CANVAS_IDS = {
  shotId: 's19', shotNumber: 19,
  nodes: { shot: 'n_shot_s19', prompt: 'n_prompt_s19', image: 'n_high-angle_image', video: 'n_high-angle_video', footage: 'n_footage_s19' },
  edges: { promptImage: 'guided-s19-prompt-image', promptVideo: 'guided-s19-prompt-video', imageVideo: 'guided-s19-image-video' },
} as const

export const GUIDED_IDS = {
  clientId: 'guided-evergreen', videoId: 'ig-DVp3xOdFaHL', formatId: 'live-DVp3xOdFaHL',
  researchId: 'guided-tofu-row', slotId: 'guided-tofu-slot',
  plans: { shoot: 'guided-tofu-shoot', ai: 'guided-tofu-ai' },
} as const

export type PreparedBootstrap = {
  local: Record<string, unknown>
  session: Record<string, unknown>
}
export interface PreparedData {
  bootstrap: PreparedBootstrap
  request: (request: Request) => Promise<Response>
  reset: () => void
}
export type PreparedFactory = (local: Storage, session: Storage) => PreparedData
export interface GuidedRuntime {
  sessionId: string
  prefix: string
  local: Storage
  session: Storage
  data: PreparedData
  reset: () => void
  exit: () => void
}
