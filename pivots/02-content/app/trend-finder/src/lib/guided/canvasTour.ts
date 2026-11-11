import { SIX_SHOTS } from './sixShot.ts'
import type { GuidedCanvasStep, GuidedFocusRequest, GuidedRoute, GuidedState } from './contracts'

type CanvasTourStep = {
  id: GuidedCanvasStep
  focus: GuidedFocusRequest
  en: { title: string; description: string }
  'zh-Hant': { title: string; description: string }
  generation?: 'image' | 'video'
}
const steps: CanvasTourStep[] = [{
  id: 'shots', focus: { nodeIds: [SIX_SHOTS[0].nodes.shot], dock: null },
  en: { title: 'Six shots, one story', description: 'Six readable Shot cards run left to right. Start with the tofu reveal; Next adds its prompt. No images are generated automatically.' },
  'zh-Hant': { title: '六鏡，串起一個故事', description: '六張 Shot 卡由左往右排列。先看豆腐開場，按下一步才加入 Prompt，不會自動產圖。' },
}]
for (const [i, shot] of SIX_SHOTS.entries()) {
  if (i < 2) steps.push({
    id: `prompt-${shot.id}`, focus: { nodeIds: [shot.nodes.prompt], dock: null },
    en: { title: `Shot ${i + 1} · Read the prompt`, description: `${shot.title}: this prompt follows the six-shot adapted script. Only the fixed prepared prompt can replay. Next adds the image node and its connection.` },
    'zh-Hant': { title: `第 ${i + 1} 鏡 · 查看 Prompt`, description: `${shot.zh}：Prompt 來自六鏡改編腳本。僅固定的預備 Prompt 可回放；下一步才加入圖片節點及連線。` },
  })
  steps.push({
    id: `image-${shot.id}`, generation: 'image', focus: { nodeIds: [shot.nodes.image], dock: 'inspect', revealNodeIds: [shot.nodes.prompt, shot.nodes.image] },
    en: { title: `Shot ${i + 1} · ${shot.title}`, description: i < 2 ? 'The prompt connects to this image. Check the prepared model and 9:16 ratio, then click Run (Generate). Watch queued → running → done. Next unlocks when this shot finishes; this is source-derived storyboard playback, not live AI.' : 'Same workflow: the prompt is connected. Click Run (Generate) to replay this shot’s own prepared storyboard, then Next. No provider is called.' },
    'zh-Hant': { title: `第 ${i + 1} 鏡 · ${shot.zh}`, description: i < 2 ? 'Prompt 已接到圖片。確認預備模型與 9:16 比例，再按 Run（Generate），觀察排隊 → 執行 → 完成；完成後才可下一步。這是原片衍生分鏡回放，並非即時 AI。' : '沿用相同流程：Prompt 已連接。按 Run（Generate）回放這一鏡專屬的預備圖片，再按下一步；不呼叫生成服務。' },
  })
  if (i < 2 || i === 5) steps.push({
    id: i === 5 ? 'versions' : `history-${shot.id}`, focus: { nodeIds: [shot.nodes.image], dock: 'history' },
    en: { title: `Shot ${i + 1} · Review in History`, description: i === 5 ? 'All six beats are ready to review. Next opens the original Editor with a six-shot adapted timeline. Its existing source-derived download excludes draft edits.' : 'Review this shot’s own result in the original History panel. Select it on the node, or replay the same fixed prompt. Next moves to the next shot.' },
    'zh-Hant': { title: `第 ${i + 1} 鏡 · 在 History 檢查`, description: i === 5 ? '六個段落已可檢查。下一步開啟原 Editor 的六鏡改編時間軸；既有原片衍生下載不包含草稿修改。' : '在原 History 檢查這一鏡的結果，可在節點選用或回放相同固定 Prompt。下一步進入下一鏡。' },
  })
}
export const CANVAS_TOURS: Readonly<Record<GuidedRoute, readonly CanvasTourStep[]>> = { ai: steps, shoot: steps }
export function canvasStepFor(state: GuidedState): CanvasTourStep | null {
  if (state.stepId !== 'canvas' || state.route === null) return null
  const steps = CANVAS_TOURS[state.route]
  return steps.find(step => step.id === state.canvasStep) ?? steps[0]
}
export function canvasProgress(state: GuidedState): { current: number; total: number } | null {
  const step = canvasStepFor(state)
  if (!step || state.route === null) return null
  const steps = CANVAS_TOURS[state.route]
  return { current: steps.indexOf(step) + 1, total: steps.length }
}
export function nextCanvasStepId(route: GuidedRoute, id: GuidedCanvasStep | undefined, direction: 'next' | 'previous'): GuidedCanvasStep | null {
  const steps = CANVAS_TOURS[route]
  const index = Math.max(0, steps.findIndex(step => step.id === id))
  return steps[index + (direction === 'next' ? 1 : -1)]?.id ?? null
}
