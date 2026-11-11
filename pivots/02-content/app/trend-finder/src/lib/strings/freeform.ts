import { getActiveLang } from '../i18n.ts'

const words = {
  arrangeShots: ['Arrange shots', '排列鏡頭'], versions: ['Other versions', '其他版本'], versionLabel: ['Version', '版本'],
  demoPrompt: ['Demo prompt', '示範 Prompt'],
  promptUsed: ['Prompt used for this version', '此版本使用的 Prompt'],
  nextPrompt: ['Prompt for the next version', '下一個版本的 Prompt'],
  promptChanged: ['Changed framing', '修改構圖描述'],
  samplePrompt1: ['Sample prompt 1', '範例描述 1'],
  samplePrompt2: ['Sample prompt 2', '範例描述 2'],
  preparedFraming: ['Prepared framing variants from one existing AI clip · no live generation.', '同一段既有 AI 影片的預備構圖版本，無即時生成。'],
  preparedReplay: ['Prepared material replay', '預備素材回放'],
  estimate: ['Estimate', '預估'],
  ratio: ['Ratio', '比例'], size: ['Size', '尺寸'], count: ['Count', '張數'], modelDefault: ['Model default', '模型預設'],
  refsUnsupported: ['This model cannot use the connected references. Remove their connections first.', '此模型不支援已連接的參考圖片，請先移除連線。'], tooManyRefs: ['Connected references exceed this model’s limit', '已連接的參考圖片超過模型上限'], startUnsupported: ['This model cannot use the connected start frame.', '此模型不支援已連接的起始畫面。'],
  uploadImage: ['Upload image', '上傳圖片'], existingImage: ['Existing canvas image', '畫布既有圖片'], addReference: ['Add reference', '新增參考圖片'], removeReference: ['Remove connection', '移除連線'], previous: ['Previous version', '上一版本'], next: ['Next version', '下一版本'], reuse: ['Reuse settings', '重用設定'], noImages: ['No ready images to connect.', '尚無可連接的圖片。'],
  capabilities: ['Supported', '支援'], references: ['References', '參考圖片'], batch: ['Batch', '批次'], needsKey: ['Provider is unavailable. Configure its account before running.', '服務尚未啟用，請先設定帳戶。'],

  queued: ['Queued', '排隊中'], waiting: ['Waiting', '等待中'], done: ['Done', '已完成'], failed: ['Failed', '失敗'], unknown: ['Result unknown', '結果不明'], image: ['Image', '圖片'], audio: ['Audio', '音訊'],
  canvasVoice: ['Add voice nodes or upload audio on the canvas, then connect them to the editor.', '請在畫布新增配音節點或上傳音訊，再連接至剪輯器。'],
  unavailable: ['Unavailable', '無法使用'], navigation: ['⌘ + scroll to zoom', '⌘ + 捲動縮放'], runAll: ['Run all', '全部執行'], stop: ['Stop after this node', '完成此節點後停止'], textPort: ['Text', '文字'], startPort: ['Start frame', '起始畫面'], referencePort: ['References', '參考圖片'], kitPort: ['Kit', '素材組'],
  recoverTitle: ['Recover local canvas edits?', '恢復本機畫布變更？'], recoverBody: ['A local draft was kept. Restoring it replaces the current canvas with that draft; discard it to keep the server copy.', '已保留本機草稿。恢復會以草稿取代目前畫布；放棄則保留伺服器版本。'], restoreDraft: ['Restore draft', '恢復草稿'], discardDraft: ['Discard local draft', '放棄本機草稿'], unsavedTitle: ['Your edits are not saved', '變更尚未儲存'], unsavedBody: ['Keep a local draft before reloading, or explicitly discard these edits. Nothing will overwrite the newer server copy automatically.', '重新載入前保留本機草稿，或明確放棄變更。不會自動覆寫伺服器的新版本。'], keepReload: ['Keep draft and reload', '保留草稿並重新載入'],
  kitUnavailable: ['The consistency kit is not loaded. Reload before generating from kit inputs.', '一致性素材組尚未載入，請重新載入後再生成。'], sourceRollbackFailed: ['The original media was restored, but its editor sources could not be saved. Reload the editor before reconnecting them.', '已恢復原素材，但無法儲存剪輯來源。請重新載入剪輯器後再連接。'],
  create: ['Create canvas', '建立畫布'], title: ['Untitled canvas', '未命名畫布'], spaces: ['Canvases', '畫布'],
  intro: ['Start with an empty space. Add an idea, connect your tools, make something new.', '從空白開始。加入想法，連接工具，創作新內容。'],
  name: ['Canvas name', '畫布名稱'], existing: ['Existing plan canvases', '既有計畫畫布'],
  prompt: ['Prompt', '文字提示'], storyboard: ['Image generator', '圖片生成'], video: ['Video generator', '影片生成'], upload: ['Upload media', '上傳素材'], voice: ['Voiceover', '配音'], editor: ['Editor & output', '剪輯與輸出'], shot: ['Shot', '鏡頭'], footage: ['Footage', '實拍素材'], kit: ['Consistency kit', '一致性素材組'],
  add: ['Add node', '新增節點'], select: ['Select', '選取'], pan: ['Pan', '平移'], inspect: ['Inspector', '設定'], history: ['History', '歷史'], assistant: ['Assistant', '助手'], close: ['Close', '關閉'],
  emptyTitle: ['A little space for your next big idea.', '讓下一個好點子，在這裡開始。'], emptyBody: ['Add a prompt or upload media to begin. Everything starts with you.', '新增文字提示或上傳素材，由你決定第一步。'],
  hint: ['Describe what you want to create…', '描述你想創作的內容…'], model: ['Model', '模型'], duration: ['Duration', '長度'], run: ['Run', '執行'], running: ['Running…', '執行中…'], free: ['Free', '免費'],
  saved: ['Saved', '已儲存'], saving: ['Saving…', '儲存中…'], failedSave: ['Save failed · Retry', '儲存失敗・重試'], conflict: ['This canvas changed elsewhere. Reload to continue.', '畫布已在其他地方變更，請重新載入後繼續。'], reload: ['Reload', '重新載入'],
  stale: ['Inputs changed · Run again', '輸入已變更・請重新執行'], ready: ['Ready', '就緒'], uploadHint: ['Image, video or audio', '圖片、影片或音訊'], choose: ['Choose file', '選擇檔案'],
  openEditor: ['Open editor', '開啟剪輯器'], clips: ['clips', '段影片'], voices: ['audio tracks', '條音軌'], composeHint: ['Connect video and audio outputs to compose your cut.', '連接影片與音訊輸出，組合你的作品。'],
  delete: ['Delete', '刪除'], duplicate: ['Duplicate', '複製'], connect: ['Connect to…', '連接至…'], settings: ['Settings', '設定'],
  useInEdit: ['Use in Edit', '放入剪輯'],
  noSelection: ['Select a node to inspect its settings.', '選取節點以查看設定。'], noHistory: ['No generations yet. Your results will appear here.', '尚無生成紀錄，結果會顯示於此。'], version: ['Use this version', '使用此版本'],
  assistantHint: ['Select a prompt node. Preview a connected image and video plan, then apply it to this canvas.', '選取文字提示節點，預覽連接圖片與影片的計畫，再套用至此畫布。'], preview: ['Preview plan', '預覽計畫'], apply: ['Apply to canvas', '套用至畫布'], demo: ['Demo plan · no AI call', '示範計畫・未呼叫 AI'], source: ['Plan source', '計畫來源'], noAuto: ['Apply creates nodes only. Run each node when you are ready.', '套用僅新增節點。準備好後再逐一執行。'],
  assistantLegacyHint: ['Choose a shot from the approved plan. Preview its image and video settings, then apply them to that shot. The assistant uses the plan’s shot text.', '請選擇已核准計畫中的鏡頭，預覽圖片與影片設定後套用至該鏡頭。助手會使用計畫中的鏡頭文字。'], assistantLegacyApply: ['Apply updates this shot’s settings and adds missing nodes. Run each node when you are ready.', '套用會更新此鏡頭的設定並補上缺少的節點。準備好後再逐一執行。'], assistantShot: ['Plan shot', '計畫鏡頭'], assistantChooseShot: ['Choose a shot…', '選擇鏡頭…'],
  quote: ['Confirm generation', '確認生成'], cancel: ['Cancel', '取消'], confirm: ['Confirm and run', '確認並執行'], changed: ['The price or inputs changed. Review the new quote.', '價格或輸入已變更，請重新確認。'], left: ['Remaining today', '今日剩餘'],
  readonly: ['This plan is read-only until approved.', '此計畫核准前僅供檢視。'], back: ['Back to canvases', '返回畫布列表'], share: ['Review link', '審核連結'], copy: ['Copy link', '複製連結'], copied: ['Copied', '已複製'],
  noResult: ['Run this node to see your result.', '執行節點以查看結果。'], ports: ['Inputs', '輸入'], output: ['Output', '輸出'], budget: ['Daily wallet', '每日預算'], page: ['Canvas', '畫布'], incompatible: ['These ports cannot connect.', '這些連接埠無法相連。'], needOutput: ['Run or upload the source first.', '請先生成或上傳來源。'], saveFirst: ['Save failed. Retry before continuing.', '儲存失敗，請重試後再繼續。'],
} as const
export type Word = keyof typeof words
export const ff = (key: Word): string => words[key][getActiveLang() === 'zh-Hant' ? 1 : 0]

export const usd = (value: number): string => `US$${value.toFixed(3)}`
export const seconds = (value: number): string => `${value}s`
