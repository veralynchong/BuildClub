# 空白自由畫布執行狀態

更新：2026-11-05 Sydney。

## 目前

Goal active；使用者已核准無人值守 Multi Agent 實作、commit、push、開 PR，不合併。禁止外部 API 測試、花費與新增依賴。整合 worktree `/Users/tommy/orca/workspaces/BuildClub/freeform-canvas`，分支 `feat/freeform-canvas`，產品基準 `e442b3ae80964ee53fda7265df61d18a210f66b3`。

| Task | 狀態 | Owner／證據 |
|---|---|---|
| T0 | 完成 | Lead：新分支、本機三份計畫文件、安全離線驗證保護；起始 gate GREEN：984 passed, 2 skipped，frontend PASS |
| T1 | 執行中 | Orca task_9671d805b114／ctx_3b4ed7ce46f5；唯讀，固定契約後才開始 writer |
| T2 | 完成 | task_5209fcd0805d／ctx_b9df19f20eb6；來源07d3d93，唯讀，測試 NOT RUN |
| T3–T7 | 待前置完成 | 依 Tasks 順序執行 |

## 已核對

- 2026-11-05：origin/main 為 e442b3a；舊 Canvas 在 `backend/canvas.py` 強制 shots，App 入口依批准計畫，現有 Media 型別未包含 audio。
- 2026-11-05：安全參考 worktree `/Users/tommy/orca/workspaces/BuildClub/offline-verify-context` @1fc1747 完整離線 gate GREEN：984 passed, 2 skipped，frontend unit PASS。這不是新版產品驗收。
- 2026-11-05：Playwright MCP `browser_tabs action=list` 呼叫成功，未開產品 tab；後續測試仍需獨立環境與 browser owner。
- ignored 依賴 symlink 指向 canvas-p1 既有 backend/.venv 及 node_modules，未安裝、不得刪來源。

- 2026-11-05：整合基線 07d3d93，`npm run build` exit 0（僅既有 bundle size 提醒），`npm run lint` exit 0。尚未修改產品程式。

## 全站接線盤點

T2 來源 07d3d93，完整訊息 msg_ea7f2a8dcca4。分類依來源，不推測 runtime keys；所有本輪 live tests NOT RUN。

| 功能 | 追查證據（app 根目錄相對路徑） | 結論／本輪處理 |
|---|---|---|
| 搜尋／參考素材拆解 | App.tsx runLiveSearch/runLinkSearch/runImageSearch → lib/live.ts → server.py /api/search,/like,/like-image,/analyze → cache/Apify/Anthropic | 真實實作與 mock 分支並存；本輪禁止外部測試，不能稱全部可用 |
| Research rows/slots | App.tsx → state.ts useResearch/useResearchSlots → useStored/localStorage | 本機持久化，沒有跨機 API；列後續，不擴成平台 |
| Plans/shot board | App saveIdeas → lib/live.ts → server.py PUT /ideas → SQLite store | 真實後端已存在，保留 |
| Board AI rewrite/insert | lib/boardAssist.ts:51/75 → 無對應後端 route → sample fallback | 有接線缺口；不作新版助手範本，不誤稱真 AI |
| Board media | lib/boardMedia.ts:26 → object URL/deviceOnly | 分頁暫存，非真正上傳；本輪新 Canvas 必須持久化 image/video/audio |
| 舊 Canvas | App.tsx:1734/1745 → canvas/api.ts → canvas.py GET/PUT | 強制 approved plan/shots，直接阻擋空白自由畫布；T3/T4 替換 |
| 生成/助手/Kit | canvas api → generations.py/agent.py/kit.py → queue/provider/files | 已有實作，但助手依賴 shot；T3/T4 改 workspace 契約。歷史直接 FalAdapter smoke 不等於新版 UI 真驗收 |
| 配音 | VoiceTool → editor/api.ts → editing.py voice/tts/from-gen → media/voices | 已有 editor 管線；需 Canvas audio port/node 與輸出連接 |
| 剪輯/輸出 | EditorPanel → editor/api.ts → editing.py/renders.py → Remotion/ffmpeg | 真實本機引擎可重用；本輪重新驗證 workspace source 至 MP4 |
| 送審 | ExportBar → cut/share API → renders.py/share.py/cut_review.py → cut_reviews | 有 token/version/revocation guards，需支援 workspace/client，保留隔離 |
| 社群發布 | PublishPanel → publish.ts → publishing.py → publishers.py fake/Ayrshare | 預設模擬；真發布/公開媒體 hosting 非本輪 |
| 首頁成效 | ClientHome/Overview LaterSection；現有 decisionStats/production summary | 流程統計有資料；post-performance 是明示佔位，非已完成 analytics |
| auth/settings | auth.ts → server/auth/google_auth；save clients → SQLite；preferences local | 本機 auth 存在；register UI 呼叫 login、client login coming soon、OAuth未驗；本輪保留登入保護，不擴大帳戶系統 |


## 下一步

1. 提交已通過 T0 離線 gate 的基線與文件：984 passed, 2 skipped in 31.26s；四步 PASS，verify: GREEN。
2. 分派 T1／T2 唯讀 workers；取得契約與缺口證據。
3. 更新 Tasks 的確切 API 與檔案歸屬，啟動獨立 writer，review／整合／本機 E2E。
4. 最終更新本表、根 STATUS 與 handoff，推送並開 PR，留下明早真實測試清單。

## 尚未驗證

新版 Canvas 尚未實作；外部模型、配音及真實發布本輪禁止測試。沒有任何新版產品完成聲明。
