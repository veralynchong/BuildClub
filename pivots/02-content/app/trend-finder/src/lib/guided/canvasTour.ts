import { GUIDED_CANVAS_IDS as ids } from './contracts.ts'
import type { GuidedCanvasStep, GuidedFocusRequest, GuidedRoute, GuidedState } from './contracts'

type CanvasTourStep = {
  id: GuidedCanvasStep
  focus: GuidedFocusRequest
  en: { title: string; description: string }
  'zh-Hant': { title: string; description: string }
  generation?: 'image' | 'video'
}
const shots: CanvasTourStep = {
  id: 'shots', focus: { nodeIds: [ids.nodes.shot], dock: null },
  en: { title: 'Your shot list is now on the canvas', description: 'Each card is one shot from your script. Let’s follow Shot 19.' },
  'zh-Hant': { title: 'Shot list 已經放上畫布', description: '每張卡就是腳本裡的一個鏡頭，我們跟著第 19 鏡走一遍。' },
}
const prompt: CanvasTourStep = {
  id: 'prompt', focus: { nodeIds: [ids.nodes.prompt], dock: null },
  en: { title: 'This is the prompt', description: 'It comes from the Shot 19 script and describes the image. You can edit it; only the fixed prepared prompt can replay here, with no live generation.' },
  'zh-Hant': { title: '這是 Prompt', description: '從第 19 鏡腳本帶入，描述畫面長相，可以直接修改；此示範僅能回放固定的預備 Prompt，不會即時生成。' },
}
const image: CanvasTourStep = {
  id: 'image', focus: { nodeIds: [ids.nodes.image], dock: 'inspect' }, generation: 'image',
  en: { title: 'Make the first frame', description: 'Choose the prepared model and ratio, then click Run (Generate) yourself. A prepared image appears; no provider is called.' },
  'zh-Hant': { title: '產生首幀圖片', description: '選預備模型與比例，親自按 Run（Generate）。這裡顯示預先準備的圖片，不呼叫生成服務。' },
}
const connect: CanvasTourStep = {
  id: 'connect', focus: { nodeIds: [ids.nodes.image, ids.nodes.video], edgeIds: [ids.edges.imageVideo], dock: null },
  en: { title: 'Connect image to video', description: 'Outputs flow left to right. The image connects to the video’s start frame input.' },
  'zh-Hant': { title: '把圖片接到影片', description: '由左往右流，圖片的輸出接到影片節點的「起始畫面」。' },
}
const video: CanvasTourStep = {
  id: 'video', focus: { nodeIds: [ids.nodes.video], dock: 'inspect' }, generation: 'video',
  en: { title: 'Turn it into video', description: 'Click Run (Generate) yourself to replay a prepared clip from the fixed start frame and prompt. This is not live generation.' },
  'zh-Hant': { title: '生成影片', description: '親自按 Run（Generate），以固定起始畫面與 Prompt 回放預備片段，並非即時生成。' },
}
const footage: CanvasTourStep = {
  id: 'footage', focus: { nodeIds: [ids.nodes.footage], dock: null },
  en: { title: 'Add your footage', description: 'In a formal project, upload filmed clips here for this shot. This demo shows prepared AI angle concepts, not filmed footage.' },
  'zh-Hant': { title: '放入實拍素材', description: '正式專案可在這裡上傳這一鏡拍好的影片；此示範顯示預備 AI 角度概念，並非實拍素材。' },
}
const versions = (nodeId: string): CanvasTourStep => ({
  id: 'versions', focus: { nodeIds: [nodeId], dock: 'history' },
  en: { title: 'Compare and pick a version', description: 'Compare prepared versions in History and choose one. Click Next to open the Editor and put it in the timeline.' },
  'zh-Hant': { title: '比較並選定版本', description: '在 History 比較並選用版本。按下一步開啟 Editor，再將版本放入時間軸。' },
})
export const CANVAS_TOURS: Readonly<Record<GuidedRoute, readonly CanvasTourStep[]>> = {
  ai: [shots, prompt, image, connect, video, versions(ids.nodes.video)],
  shoot: [shots, prompt, footage, versions(ids.nodes.footage)],
}

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
