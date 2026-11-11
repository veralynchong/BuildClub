import { CANVAS_TOURS, nextCanvasStepId } from './canvasTour.ts'
import { GUIDED_IDS } from './contracts.ts'
import type { GuidedRoute, GuidedState, GuidedStep } from './contracts'

export const GUIDED_STEPS: readonly { id: GuidedStep; en: { title: string; description: string }; 'zh-Hant': { title: string; description: string } }[] = [
  { id: 'search', en: { title: 'Find your next idea', description: 'Search for Tofu Recipe using the search box below.' }, 'zh-Hant': { title: '搜尋下一個靈感', description: '在原搜尋框輸入 Tofu Recipe，開始找參考影片。' } },
  { id: 'results', en: { title: 'Choose this reference', description: 'Click Save on the thumbnail or Next, choose a project, then continue straight to Research.' }, 'zh-Hant': { title: '選用這支參考', description: '按縮圖右上角 Save 或 Next，選擇存入的 Project，完成後直接進入 Research。' } },
  { id: 'research', en: { title: 'Save your reference', description: 'Projects start collapsed. Click a project to open its saved references, then Next to continue.' }, 'zh-Hant': { title: '儲存參考', description: 'Project 預設收起；點開 Project 查看已存參考，再按 Next 繼續。' } },
  { id: 'script', en: { title: 'Shape your story', description: 'Review the script and shots in the plan.' }, 'zh-Hant': { title: '改編故事', description: '在原計畫中查看腳本與分鏡。' } },
  { id: 'route', en: { title: 'Plan a shoot', description: 'Click Plan a shoot to open the Canvas, demonstrate one shot and continue to the full six-shot Editor.' }, 'zh-Hant': { title: '規劃拍攝', description: '按「規劃拍攝」直接開啟 Canvas，一步步示範一鏡，再進入完整六鏡 Editor。' } },
  { id: 'canvas', en: { title: 'Choose your material', description: 'Explore prepared versions using the original Canvas controls.' }, 'zh-Hant': { title: '選用素材', description: '使用原 Canvas 控制項查看預備版本並選用。' } },
  { id: 'edit', en: { title: 'Edit the video', description: 'Edit the six-shot timeline, trim a clip and change the English text. Save and export a new video locally.' }, 'zh-Hant': { title: '剪輯影片', description: '在原 Editor 調整六鏡時間軸、裁切片段及修改英文文字，儲存後於本機匯出新影片。' } },
  { id: 'result', en: { title: 'Watch the result', description: 'Review the prepared cut and its source before downloading.' }, 'zh-Hant': { title: '觀看成片', description: '下載前查看預備成片與來源說明。' } },
]
const KEY = 'guided-progress.v1'
export const createGuidedState = (): GuidedState => ({ version: 1, active: true, stepId: 'search', route: null })

export function readGuidedState(store: Pick<Storage, 'getItem'>): GuidedState {
  try {
    const value = JSON.parse(store.getItem(KEY) ?? 'null')
    if (value?.version === 1 && ['save', 'breakdown'].includes(value.stepId)) value.stepId = 'research'
    if (!value || value.version !== 1 || typeof value.active !== 'boolean' || !GUIDED_STEPS.some(step => step.id === value.stepId) ||
      (value.route !== null && value.route !== 'shoot' && value.route !== 'ai') ||
      (['canvas', 'edit', 'result'].includes(value.stepId) && value.route === null)) return createGuidedState()
    // Older shoot walkthroughs visited all six shots; preserve their session and editor.
    if (value.route === 'shoot') {
      if (value.active && value.stepId === 'canvas' && value.canvasStep === 'versions' && value.shootNextRevision !== 1) value.canvasStep = 'prompt-s1'
      const retired = ['video-s1', 'video-s1-v2', 'camera-s1', 'history-s1', 'prompt-s2', 'image-s2', 'camera-s2', 'history-s2', 'image-s3', 'image-s4', 'image-s5', 'image-s6']
      if (retired.includes(value.canvasStep)) value.canvasStep = value.stepId === 'canvas' ? 'prompt-s1' : 'versions'
      if (Array.isArray(value.skippedCanvasSteps)) value.skippedCanvasSteps = value.skippedCanvasSteps.filter((step: unknown) => !retired.includes(step as string) && !['image-s1', 'image-s1-v2'].includes(step as string))
    }
    const canvasSteps = value.route ? CANVAS_TOURS[value.route as GuidedRoute] : []
    if (value.canvasStep !== undefined && !canvasSteps.some((step) => step.id === value.canvasStep)) return createGuidedState()
    if (value.skippedCanvasSteps !== undefined && (!Array.isArray(value.skippedCanvasSteps) || new Set(value.skippedCanvasSteps).size !== value.skippedCanvasSteps.length || value.skippedCanvasSteps.some((step: unknown) => !value.route || !canvasSteps.some((known) => known.id === step && known.generation)))) return createGuidedState()
    return { version: 1, active: value.active, stepId: value.stepId, route: value.route,
      ...(value.canvasStep !== undefined ? { canvasStep: value.canvasStep } : {}),
      ...(value.skippedCanvasSteps !== undefined ? { skippedCanvasSteps: [...value.skippedCanvasSteps] } : {}),
    }
  } catch { return createGuidedState() }
}
export function saveGuidedState(store: Pick<Storage, 'setItem'>, state: GuidedState): void {
  store.setItem(KEY, JSON.stringify({ ...state, shootNextRevision: 1 }))
}
export function requestedStep(state: GuidedState, direction: 'next' | 'previous'): GuidedStep {
  if (!state.active || (direction === 'next' && state.stepId === 'route' && !state.route)) return state.stepId
  if (state.stepId === 'save' || state.stepId === 'breakdown') return direction === 'next' ? 'research' : 'results'
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
  const groups: readonly (readonly GuidedStep[])[] = [['search', 'results'], ['research'], ['script'], ['route'], ['canvas'], ['edit'], ['result']]
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

export function referenceSavedInitially(state: GuidedState | null, stored: string | null): boolean {
  return stored !== null ? stored === 'true' : !!state && !['search', 'results'].includes(state.stepId)
}
