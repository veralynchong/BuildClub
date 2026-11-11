import type { DemoStepId } from './session'

export type DemoStep = {
  id: DemoStepId
  en: { title: string; description: string }
  'zh-Hant': { title: string; description: string }
}

export const DEMO_STEPS: readonly DemoStep[] = [
  {
    id: 'research',
    en: { title: 'Find the content', description: 'Explore the tofu source and its dated, cached performance data.' },
    'zh-Hant': { title: '找到內容', description: '查看豆腐原片與標有日期的快取表現資料。' },
  },
  {
    id: 'breakdown',
    en: { title: 'Understand the content', description: 'Review the actions, pacing and on-screen text in the prepared analysis.' },
    'zh-Hant': { title: '理解內容', description: '查看預先準備的分析，理解動作、節奏與畫面文字。' },
  },
  {
    id: 'script',
    en: { title: 'Adapt the script and shots', description: 'Explore the adapted script, shot list and storyboard for this tofu ad.' },
    'zh-Hant': { title: '改編腳本與分鏡', description: '查看這支豆腐廣告的改編腳本、鏡頭清單與分鏡。' },
  },
  {
    id: 'route',
    en: { title: 'Choose how to make it', description: 'Plan a shoot or create an AI ad; return here to try the other route.' },
    'zh-Hant': { title: '選擇製作方式', description: '選擇規劃拍攝或製作 AI 廣告，也可返回這裡切換路線。' },
  },
  {
    id: 'canvas',
    en: { title: 'Explore the Canvas', description: 'Compare prepared options and choose a shot for the same tofu story.' },
    'zh-Hant': { title: '探索 Canvas', description: '比較預先準備的版本，為同一個豆腐故事選用鏡頭。' },
  },
  {
    id: 'edit',
    en: { title: 'Edit the ad', description: 'Play the selected footage in the Editor and try a small adjustment.' },
    'zh-Hant': { title: '剪輯廣告', description: '在 Editor 播放選用素材，並嘗試小幅調整。' },
  },
  {
    id: 'result',
    en: { title: 'Watch the result', description: 'Play the prepared cut, then return to explore another route or restart.' },
    'zh-Hant': { title: '觀看成片', description: '播放預先準備的成片，再返回探索另一條路線或重新開始。' },
  },
]
