import { CANVAS_TOURS, nextCanvasStepId } from './canvasTour.ts'
import { GUIDED_IDS } from './contracts.ts'
import type { GuidedRoute, GuidedState, GuidedStep } from './contracts'

export const GUIDED_STEPS: readonly { id: GuidedStep; en: { title: string; description: string }; 'zh-Hant': { title: string; description: string } }[] = [
  { id: 'search', en: { title: 'Find your next idea', description: 'Search for Tofu Recipe using the search box below.' }, 'zh-Hant': { title: '搜尋下一個靈感', description: '在原搜尋框輸入 Tofu Recipe，開始找參考影片。' } },
  { id: 'results', en: { title: 'Pick a reference', description: 'Open the tofu recipe video to see why it works.' }, 'zh-Hant': { title: '選擇參考影片', description: '點開豆腐食譜影片，查看它的內容拆解。' } },
  { id: 'breakdown', en: { title: 'Understand the idea', description: 'Review the prepared content breakdown in the original panel.' }, 'zh-Hant': { title: '理解內容', description: '在原分析面板查看預先準備的內容拆解。' } },
  { id: 'research', en: { title: 'Save your reference', description: 'Explore the saved tofu reference in Research.' }, 'zh-Hant': { title: '儲存參考', description: '在 Research 查看已儲存的豆腐原片。' } },
  { id: 'script', en: { title: 'Shape your story', description: 'Review the script and shots in the plan.' }, 'zh-Hant': { title: '改編故事', description: '在原計畫中查看腳本與分鏡。' } },
  { id: 'route', en: { title: 'Choose a route', description: 'Plan a shoot or explore prepared AI material for the same case.' }, 'zh-Hant': { title: '選擇製作路線', description: '規劃拍攝，或探索同案例的預備 AI 素材。' } },
  { id: 'canvas', en: { title: 'Choose your material', description: 'Explore prepared versions using the original Canvas controls.' }, 'zh-Hant': { title: '選用素材', description: '使用原 Canvas 控制項查看預備版本並選用。' } },
  { id: 'edit', en: { title: 'Edit the video', description: 'Find Shot 19 and click Put in timeline for your chosen version. Play and adjust the material in the original Editor.' }, 'zh-Hant': { title: '剪輯影片', description: '找到 Shot 19，對選好的版本按「放入時間軸」。在原 Editor 播放並調整素材。' } },
  { id: 'result', en: { title: 'Watch the result', description: 'Review the prepared cut and its source before downloading.' }, 'zh-Hant': { title: '觀看成片', description: '下載前查看預備成片與來源說明。' } },
]
const KEY = 'guided-progress.v1'
export const createGuidedState = (): GuidedState => ({ version: 1, active: true, stepId: 'search', route: null })

export function readGuidedState(store: Pick<Storage, 'getItem'>): GuidedState {
  try {
    const value = JSON.parse(store.getItem(KEY) ?? 'null')
    if (!value || value.version !== 1 || typeof value.active !== 'boolean' || !GUIDED_STEPS.some(step => step.id === value.stepId) ||
      (value.route !== null && value.route !== 'shoot' && value.route !== 'ai') ||
      (['canvas', 'edit', 'result'].includes(value.stepId) && value.route === null)) return createGuidedState()
    const canvasSteps = value.route ? CANVAS_TOURS[value.route as GuidedRoute] : []
    if (value.canvasStep !== undefined && !canvasSteps.some((step) => step.id === value.canvasStep)) return createGuidedState()
    if (value.skippedCanvasSteps !== undefined && (!Array.isArray(value.skippedCanvasSteps) || new Set(value.skippedCanvasSteps).size !== value.skippedCanvasSteps.length || value.skippedCanvasSteps.some((step: unknown) => value.route !== 'ai' || (step !== 'image' && step !== 'video')))) return createGuidedState()
    return { version: 1, active: value.active, stepId: value.stepId, route: value.route,
      ...(value.canvasStep !== undefined ? { canvasStep: value.canvasStep } : {}),
      ...(value.skippedCanvasSteps !== undefined ? { skippedCanvasSteps: [...value.skippedCanvasSteps] } : {}),
    }
  } catch { return createGuidedState() }
}
export function saveGuidedState(store: Pick<Storage, 'setItem'>, state: GuidedState): void {
  store.setItem(KEY, JSON.stringify(state))
}
export function requestedStep(state: GuidedState, direction: 'next' | 'previous'): GuidedStep {
  if (!state.active || (direction === 'next' && state.stepId === 'route' && !state.route)) return state.stepId
  const index = GUIDED_STEPS.findIndex(step => step.id === state.stepId)
  return GUIDED_STEPS[Math.max(0, Math.min(GUIDED_STEPS.length - 1, index + (direction === 'next' ? 1 : -1)))].id
}
export type GuidedObserved = { searchQuery?: string; resultVideoIds?: readonly string[]; view: string; workspace: string; drawerVideoId: string | null; planId: string | null; canvasId: string | null; editing: boolean; exportOpen: boolean; ready: boolean; busy: boolean }
export function matchesGuidedScreen(step: GuidedStep, route: GuidedRoute | null, observed: GuidedObserved): boolean {
  if (!observed.ready || observed.busy || observed.workspace !== GUIDED_IDS.clientId) return false
  const planId = GUIDED_IDS.plans[route ?? 'ai']
  if (step === 'search') return observed.view === 'search' && observed.drawerVideoId === null
  if (step === 'results') return observed.view === 'results' && observed.drawerVideoId === null && observed.searchQuery?.trim().toLowerCase().replace(/\s+/g, ' ') === 'tofu recipe' && !!observed.resultVideoIds?.includes(GUIDED_IDS.videoId)
  if (step === 'research') return observed.view === 'research' && observed.drawerVideoId === null
  if (step === 'breakdown') return observed.drawerVideoId === GUIDED_IDS.videoId
  if (step === 'script' || step === 'route') return observed.view === 'plan' && observed.planId === planId && observed.drawerVideoId === null
  if (observed.view !== 'canvas' || observed.canvasId !== planId || observed.drawerVideoId !== null) return false
  if (step === 'canvas') return !observed.editing
  if (step === 'edit') return observed.editing && !observed.exportOpen
  return observed.editing && observed.exportOpen
}


export function guidedMainProgress(stepId: GuidedStep): { current: number; total: number } {
  const groups: readonly (readonly GuidedStep[])[] = [['search', 'results'], ['breakdown', 'research'], ['script'], ['route'], ['canvas'], ['edit'], ['result']]
  return { current: groups.findIndex((group) => group.includes(stepId)) + 1, total: groups.length }
}


export function requestedGuidedState(state: GuidedState, direction: 'next' | 'previous'): GuidedState {
  if (!state.active) return state
  if (state.stepId === 'canvas' && state.route) {
    const canvasStep = nextCanvasStepId(state.route, state.canvasStep, direction)
    if (canvasStep) return { ...state, canvasStep }
  }
  const stepId = requestedStep(state, direction)
  return { ...state, stepId, ...(stepId === 'canvas' ? { canvasStep: state.stepId === 'edit' && direction === 'previous' ? 'versions' : 'shots' } : {}) }
}
