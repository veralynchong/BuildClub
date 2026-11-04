# 空白自由畫布改版計畫

日期：2026-11-05 Sydney。使用者已確認方向、無人值守執行，以及 commit／push／開 PR 授權；不合併 PR。

## 目標與依據

新 Canvas 直接取代舊入口，從空白開始，自由新增、連線及執行。深色畫布、工具列、節點與面板配置貼近 Magnific 拆解。保留既有資料，不設雙版本入口。支援文字／Prompt、上傳素材、圖片生成、影片生成、配音、剪輯／合成輸出，並接好既有助手。全站盤點接線狀態；優先修復素材 → Canvas → 剪輯 → 輸出 → 送審。

研究來源（本機唯讀）：`/Users/tommy/orca/workspaces/BuildClub/canvas-p1/.orca/drops/Magnific Canvas 拆解/index.html`、同目錄 `assets/`；Markdown 在原 worktree 的 `pivots/02-content/research/magnific-canvas/magnific-canvas-teardown.md`。觀察日期 2026-11-05；研究未執行生成，不代表生成行為已驗證。

## 約束與範圍

- 桌面 1440；英文影片內容；英文與 zh-Hant UI 均保留。
- 禁止外部 API 測試、付費、安裝依賴、讀取秘密、接管其他 session 的資料庫／browser／服務。
- 允許本機 API、mock、暫存 SQLite、瀏覽器、既有 ffmpeg／Remotion。真實供應商留給使用者明早測試，不冒充已驗收。
- 不刪既有計畫、素材或歷史生成。依現有儲存與剪輯契約作增量相容改造；不把既有計畫自動當成使用者已審核的影片。
- 非本輪：3D、手繪、貼圖、多人協作、完整自主建圖 agent、社群真實發布、分析平台。
- 程式基準 `origin/main`：`e442b3ae80964ee53fda7265df61d18a210f66b3`。整合分支 `feat/freeform-canvas`。不使用 canvas-p1 的舊分支作產品基準。
- 先沿用已驗證離線保護（PR51 的驗證腳本、dotenv skip 及測試），不修改 AGENTS／CLAUDE 或合併 PR。ignored symlink 重用 canvas-p1 既有 `.venv`、`node_modules`，不安裝。

## 實作策略與分工

先完成兩份唯讀探索：A 釐清獨立空白畫布與既有 generation／editor／approval 的最小相容契約；B 全站逐項追查 UI → API → storage/provider，標出佔位、模擬、可呼叫但未真實測試及已驗證能力。Lead 依證據固定前後端契約與檔案歸屬後才分派 writer，避免同時更改共用型別。

原程式：`backend/canvas.py` 依計畫 shots 自動建立節點，`src/App.tsx` Canvas 入口依批准計畫選擇，`src/lib/canvas/types.ts` 未納入 audio。這三個限制都必須解決，不能只把畫布背景改黑。

優先重用 React Flow、generation queue、素材上傳、Remotion editor、review link 與助手；新增程式只補自由畫布必需能力。UI 採 inline prompt／參數／執行、typed ports／相容建立、漸進工具列、共用右側 dock。不存在的能力不以可按的假按鈕交付。

每位 writer 使用獨立 Orca worktree、明確 base commit、檔案範圍與 Tasks 驗收；不得自行擴大範圍、push、merge、呼叫外部服務或再委派。相依修改串行；lead 整合。唯讀 reviewer 分別檢查需求符合與正確性，整合者對具體 SHA 記錄接受／拒絕。

## 驗證與交付

細節見同目錄 `2026-11-05-freeform-canvas-tasks.md`。Status 與每項證據在 `2026-11-05-freeform-canvas-status.md`。

離線 gate：repo root `bash bin/verify.sh full`。Frontend：app 目錄 `npm run build`、`npm run lint`。行為回歸先觀察失敗再實作；mock 本機 E2E 必須驗證空白入口、持久化、連線傳值、素材→剪輯→輸出→送審，不能只檢查 DOM 按鈕。測試瀏覽器在 finally 關閉自有 context，停止自有 backend。擷取 1440 截圖與影片 ffprobe 證據；不做 mobile。

交付可審閱 PR 至 `veralynchong/BuildClub` 的 `main`，列出實際通過、未通過及明早真實測試項。未通過不標完成。保留工作樹供使用者檢查，不刪除其他 worktrees。

## 固定實作契約（T1 來源探索，2026-11-05）

獨立 workspaces table 保存 id/client_id/title/created_at/updated_at，id 由伺服器產生 `ws_` + UUID，client 必須存在且建立後不可改歸屬。canvases/generations/edit_projects/renders/cut_reviews 的既有 idea_id 欄位保持相容，視作 resource id；不新增偽 ideas、不搬動歷史素材。新畫布真正 nodes=[]、edges=[]，不可隱式插入 kit/shot/timeline。

- `POST /api/workspaces {clientId,title?}` → 201 `{workspace,version:1,doc:{nodes:[],edges:[],viewport:{x:0,y:0,zoom:1}},generations:[],takes:[]}`。
- `GET /api/workspaces?clientId=...` → `{workspaces:[{id,kind:"workspace",clientId,title,createdAt,updatedAt}]}`；不自動建立。
- `GET /api/workspaces/{id}` → `{workspace,version,doc,generations,takes:[]}`；純讀，不自動補節點。
- `PUT /api/workspaces/{id} {version,doc,title?}` → `{workspace,version,doc}`；CAS，過期409，無效422，未知404；版本 strict int，座標/viewport finite，zoom>0。
- 原 handler 同時註冊 `/api/workspaces/{idea_id}/gen...`、`/edit...`、`/cut...`、`/agent/plan` aliases；使用顯式 scope resolver 分辨 workspace 與 legacy-plan。舊 plan 路由的 approved guard 保留，新 workspace 可編輯；不能只刪舊 gate。
- `storyboard` 仍是圖片生成 node 的內部 kind；新增 `voice`、`editor`，media 新增 `audio`。Upload image/video 保存為 generation，audio 保存為 voice source；圖片/影片用 `data.selected`，audio 用 `data.voiceId`。editor 消費 selected video generations 與連入 voice sources，不假造 shot/take。
- workspace 單節點生成 body 加 `canvasVersion`；後端從持久化 graph 計算 prompt/start frame/references，不能只信任 caller。quote/confirm 與 budget/refund 保留，mock 可 US$0 執行；付費每次重新確認。
- workspace 助手 `{promptNodeId,canvasVersion}` → `{source,promptNodeId,canvasVersion,storyboard:{prompt,model},video:{prompt,model,duration},planUsd}`。預覽後 Apply 新建圖片/影片並接線；保留無關 nodes，來源 demo 明示；不自動生成。
- token review 從 workspace 的 client_id 和 title 解析，不依賴 ideas/library；不能讓其他客戶 token 看見 workspace 影片。保留失效連結、舊成片版本、退回後重匯出與並發判斷。

T3 backend writer 唯一擁有 backend/（含新增 workspaces.py 與 backend tests）；T4 frontend writer 唯一擁有 src/、unit/ 及 UI 樣式，不改 backend/、package manifests、root docs 或 e2e/。Lead 擁有 docs、e2e、整合與最終驗證。兩 writer 自同一已固定契約 commit 分出獨立工作區，依契約平行實作；接口變更先通知 lead，不能各自猜測。

### 串接細節與安全邊界（T1 第二部分）

ResourceRef 型別 `{kind:'workspace'|'legacy-plan',id:string}`；Canvas context 另外持有 clientId/title/readOnly/shots（workspace shots=[]），不可建立 fake SavedIdea 滿足 props。apiBase 顯式決定 /workspaces 或 /ideas；既有計畫從同一個新版入口可開啟，不保留另一套公開舊 Canvas UI。

新 workspace 路由必須即使沒有本機 users 也拒絕未登入；沿用 auth.session_user 的明確 dependency，不放寬舊 bootstrap 行為，不將 workspace 加 PUBLIC_API。不要讓 /api/ideas/ws_id 成為繞過新 session gate 的入口。內部 staff 帳戶依現有全機權限，不聲稱已新增多租戶隔離。

editor node 使用 `n_editor`，最多一個，只由使用者新增；空圖不隱式建立。EditProject 是 clips/voiceover 的唯一真相：video→editor 的 `in:clips`、audio→editor 的 `in:audio` 是 derived edges，不存 doc.edges；連線成功先 PUT edit CAS，再畫線；刪線先移除 project 中對應來源再保存。後端拒直接持久化 editor-input edges（code editor_edges_derived）。workspace useForSource 重用通用 insertClip，不做 shot/primaries/oneClipPerShot。圖片先生成影片才入剪輯器，不提供 image→editor 假相容連線。

圖的常規 ports：prompt.in:text←text；storyboard.in:text←text、in:ref←image、in:kit←kit；video.in:text←text、in:start←image、in:ref←image；voice.in:text←text；upload/kit 無input；out sourceHandle 固定 out。單值 port 至多一條、ref 依 model.maxRefs。backend 與 frontend 同時拒絕錯 handle/media、重複、self/cycle、模型不支援 input；workspace 嚴格驗證不破壞 legacy 舊圖。

生成 inputStamp 為後端對有效 prompt、上游 selected generation/reference、model/duration/kit 等輸入的 canonical SHA256（不含座標/viewport/結果本身）；寫入 generation.inputs。workspace GET 純讀派生 stale，不能相信客端 stale:false；上游改動或運算期間改動不得被 done callback 洗掉。export/send/public review 也由後端檢查來源是否 stale。upload 不受生成stamp限制。舊 generation 無stamp只走legacy原規則，不整批作廢。

voice 保留後端 kind='voice'，畫布媒體='audio'。TTS／upload／from-gen 沿原 editor API 與 body 格式加可選 nodeId，workspace 必須指向合法 voice/upload node，回傳 voiceId 再由連線加入 VoiceSeg；不是上傳就自動放入時間軸。voice file 及 generation/take source 全部驗證同scope，不能跨workspace引用。

client_brand/shot_lines/signature 透過真scope找client，workspace無shot lines；沿既有音訊word timings／手動字幕與brand。review cuts DTO 用 union：舊 `{idea,video,format,cut}` 保留，新 `{workspace:{id,title},cut}` 不回 prompts/doc/private notes。SharedReviewPage 明確分支。token/client/version/active/stale/reject理由/並發保護完整保留。

### 執行與上傳 body 補充（lead決定）

workspace `POST /api/workspaces/{id}/gen`：`{nodeId,canvasVersion,confirm:false}` 純報價200，回既有 Quote `{total,remaining,items}` 加 `{inputStamp,canvasVersion}`。模型/prompt/startFrame/references 以保存doc解析；confirm:true 必帶報價的inputStamp及canvasVersion，重算不符409且不排隊/扣款，成功201 Generation。Mock同樣可quote→confirm且US$0；真付費每次UI確認。legacy `/ideas/gen` 原body/行為保留。

image/video upload：`/api/workspaces/{id}/gen/upload?nodeId=...`，raw body、Content-Type、可附x-filename，回Generation。audio：`/edit/voice?source=upload&nodeId=...` raw body，回原VoiceInfo；不放進image/video upload。TTS沿既有editor quote/confirm response，body加nodeId/canvasVersion。API實際首報由lead核對再接前端。

### Run all執行策略

workspace以拓撲順序逐node quote→confirm→完成→選取並保存→下一node，仍提供Run all。workspace chain endpoint明確422，不使用尚未selected的待完成圖片當成video stamp；legacy chain原樣保留。逐步失敗需顯示原因並允許重試，不假稱全鏈成功。
