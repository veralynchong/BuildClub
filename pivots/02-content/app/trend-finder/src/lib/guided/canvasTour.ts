import { SIX_SHOTS } from './sixShot.ts'
import type { GuidedCanvasStep, GuidedFocusRequest, GuidedRoute, GuidedState } from './contracts'

type CanvasTourStep = {
  id: GuidedCanvasStep
  focus: GuidedFocusRequest
  en: { title: string; description: string }
  'zh-Hant': { title: string; description: string }
  generation?: 'image' | 'video'
}
function routeSteps(route: GuidedRoute): CanvasTourStep[] {
  const steps: CanvasTourStep[] = [{ id: 'shots', focus: { nodeIds: [SIX_SHOTS[0].nodes.shot], dock: null },
    en: { title: 'Six shots, one story', description: route === 'ai' ? 'Build a six-shot ad with prepared AI images and motion. Editing and local export are real.' : 'Plan six shots using storyboard references. The preview is an animatic, not filmed footage.' },
    'zh-Hant': { title: '六鏡，串起一個故事', description: route === 'ai' ? '使用預備 AI 圖像與動態組成六鏡廣告；剪輯與本機匯出會實際執行。' : '以分鏡參考規劃六鏡拍攝。預覽是動態分鏡，並非實拍影片。' } }]
  for (const [i, shot] of SIX_SHOTS.entries()) {
    const nodes = { ...shot.nodes, video: `n_six_video_s${i + 1}` }
    if (i < 2) steps.push({ id: `prompt-${shot.id}`, focus: { nodeIds: [nodes.prompt], dock: null },
      en: { title: `Shot ${i + 1} · ${route === 'ai' ? 'Read the prompt' : 'Plan the shot'}`, description: route === 'ai' ? 'Read the visual intention. This fixed input replays prepared material without a provider call.' : 'Review the action, framing and adapted copy before planning the camera.' },
      'zh-Hant': { title: `第 ${i + 1} 鏡 · ${route === 'ai' ? '查看 Prompt' : '規劃拍攝'}`, description: route === 'ai' ? '查看畫面意圖；固定輸入只回放預備素材，不呼叫生成服務。' : '先確認動作、構圖與改編文案，再安排鏡位。' } })
    if (route === 'shoot' || i !== 3) steps.push({ id: `image-${shot.id}`, generation: 'image', focus: { nodeIds: [nodes.image], dock: 'inspect', revealNodeIds: [nodes.prompt, nodes.image] },
      en: { title: `Shot ${i + 1} · ${route === 'shoot' ? 'Preview the storyboard' : i === 0 || i === 4 ? 'Replay the original parent image' : 'Prepare a static frame'}`, description: route === 'shoot' ? 'Click Run to reveal the source-derived storyboard reference. Use in Edit adds its static animatic.' : i === 0 || i === 4 ? 'Click Run to replay the exact text-generated image used by the original AI video. Select it before the motion step.' : 'Click Run to reveal a still extracted from existing AI material. It is a static presentation, not a newly generated image.' },
      'zh-Hant': { title: `第 ${i + 1} 鏡 · ${route === 'shoot' ? '預覽分鏡參考' : i === 0 || i === 4 ? '回放原始首圖' : '準備靜態畫面'}`, description: route === 'shoot' ? '按 Run 顯示原片衍生分鏡參考；Use in Edit 會加入對應的靜態分鏡。' : i === 0 || i === 4 ? '按 Run 回放原 AI 影片真正使用的文字生成首圖；完成並選用後再進動態步驟。' : '按 Run 顯示既有 AI 素材的抽幀。這是靜態呈現，不宣稱新生成圖片。' } })
    if (route === 'ai' && [0, 3, 4].includes(i)) steps.push({ id: `video-${shot.id}`, generation: 'video', focus: { nodeIds: [nodes.video], dock: 'inspect', revealNodeIds: [nodes.prompt, nodes.video] },
      en: { title: `Shot ${i + 1} · ${i === 3 ? 'Replay text-to-video' : 'From image to motion'}`, description: i === 3 ? 'Run replays an existing text-to-video result, with a short accepted motion interval and a still hold. Its poster was extracted afterwards; no image-to-video connection is implied.' : 'The original parent image is connected as the start frame. Click Run to replay its real AI motion, followed by an explicit still hold. No new generation is charged.' },
      'zh-Hant': { title: `第 ${i + 1} 鏡 · ${i === 3 ? '回放文字生成影片' : '從圖片到動態'}`, description: i === 3 ? 'Run 回放既有文字生成影片，含短動態與靜態停留；海報是事後抽幀，不是圖生影片的輸入。' : '真正的原始首圖已接至起始畫面；按 Run 回放其 AI 動態與靜態停留，不新增付費生成。' } })
    if (route === 'shoot' && i < 2) steps.push({ id: `camera-${shot.id}`, focus: { nodeIds: [nodes.image], dock: null },
      en: { title: `Shot ${i + 1} · Plan the camera`, description: i === 0 ? 'Frame the tofu and hands clearly. Keep the product readable and the tray movement simple. Film your own take in a real project.' : 'Choose a close angle for the ingredients, keep hands in frame and match the bowl and lighting. No filmed take is uploaded in this demo.' },
      'zh-Hant': { title: `第 ${i + 1} 鏡 · 安排鏡位`, description: i === 0 ? '讓豆腐與手部清楚入鏡，保持產品可讀、包裝動作簡單；正式專案再拍攝自己的素材。' : '以近景呈現食材，手部保留在畫面內，碗與光線保持連續；此 Demo 沒有上傳實拍。' } })
    if (i < 2 || i === 5) steps.push({ id: i === 5 ? 'versions' : `history-${shot.id}`, focus: { nodeIds: [route === 'ai' && [0, 3, 4].includes(i) ? nodes.video : nodes.image], dock: 'history' },
      en: { title: 'Review and use in Edit', description: 'Preview a result, select its version, then click Use in Edit on the node. Preview alone does not change the timeline. The Editor saves and exports locally.' },
      'zh-Hant': { title: '檢查並放入剪輯', description: '預覽結果、選擇版本，再按節點上的 Use in Edit。單純預覽不改時間軸；Editor 會在本機真正儲存及匯出。' } })
  }
  return steps
}
export const CANVAS_TOURS: Readonly<Record<GuidedRoute, readonly CanvasTourStep[]>> = { ai: routeSteps('ai'), shoot: routeSteps('shoot') }
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
