# Demo QA issues (Demo Night, Sat 2026-11-07)

P0 = breaks a live demo · P1 = looks bad / confuses · P2 = minor.
Status: `open`, `fixed @sha`, `wontfix (why)`. Screenshots sit in the dated folders next to this file.
Branch under test: `chore/demo-integrate-main-1104` (PR #49).

| # | P | Page | Problem | Screenshot | Suspected file | Status |
|---|---|---|---|---|---|---|
| 1 | P1 | Research → Plans | Picking a demo-data row ("★ Picked") creates the idea but Plans stays empty: `shownIdeas` hides ideas whose video is not live, and demo rows use sample ids. Only live-search rows appear. A demo that picks a pre-filled row looks broken. | 2026-11-04-ai-pass/03-plans-picked-demo-row-never-appears.png | src/App.tsx:896 | open |
| 2 | P1 | Research | Expanding a row makes the table wider than the screen (page 1477 px at 1440); Status select and due date clipped, "Not picked" control needs side-scroll. | 2026-11-04-ai-pass/01-research-expanded-row-clipped-right.png | `.rs-table-wrap` CSS | open |
| 3 | P1 | Plans after send | After "Send to Annie" the plan card stays "Approved, ready to film"; "Waiting for approval" shows 0. Editor gives no link to where the review lives. | 2026-11-04-ai-pass/08-plans-cut-sent-but-card-still-ready-to-film.png | Plans board status mapping | open |
| 4 | P1 | Plan page | Three overlapping entries: teammate's "Open planning board" (shot graph), our "Open the canvas", and "Make the video". Planning board has a stub edge not reaching node 2; "Change the board" panel shown though board is view-only. | 2026-11-04-ai-pass/05-planning-board-duplicates-canvas-and-broken-edge.png | PlanScreen.tsx, board/ | open — needs a product call with the teammate |
| 5 | P1 | Plan / Canvas / export | Video with no caption is titled "TikTok video"; hook becomes "Did you know tikTok video could look like this?", and that casing flows into canvas prompts and the exported caption. | 2026-11-04-ai-pass/04-plan-placeholder-title-and-hook-casing.png | hook template / title fallback | open |
| 6 | P2 | Find ideas | "SEARCHES THAT FIT BUSY MUMS…" label squeezed into a narrow column; "SEARCHING FOR" chip shows "tofu" for query "tofu recipe". | 2026-11-04-ai-pass/02-find-ideas-section-label-squeezed.png | find/ | open |
| 7 | P2 | Canvas Run all | Canvas disappears behind the price dialog (blank backdrop); dialog shows only a total. | 2026-11-04-ai-pass/06-canvas-runall-dialog-blank-backdrop.png | canvas Run all dialog | open |
| 8 | P2 | Editor | Canvas toast "Put in the timeline · Open editing" stays and covers the Clip sound slider; "Shot 1" wraps to two lines. | 2026-11-04-ai-pass/07-editor-stale-toast-over-clip-sound.png | toast / editor.css | open |
| 9 | P2 | Plan page | No h1 on the plan page (title is not a heading) — accessibility, and breaks `e2e/polish-a-shell.cjs`. | 2026-11-04-ai-pass (a-shell zz-error in scratchpad) | PlanScreen.tsx | open |
| 10 | P1 | Canvas | "核准並執行" on nodes that already have results only marks them stale and says "沒有要跑的" — reads as "nothing happened". Known since 2026-11-04 (spec §9.2.5). | — | canvas agent approve | open |

## 2026-11-05：非 Canvas 接線矩陣（e442b3a）

唯讀原始碼盤點；「已接線／未測」不等於 UI 通過。路徑以 `pivots/02-content/app/trend-finder/` 為根。完整 worker 證據：Orca run `run_fd420feccced`、task `task_eb358747b731`。

| 功能 | 資料與保存 | 分類及 demo 限制 | 原始碼證據 |
|---|---|---|---|
| Staff 登入 | auth API、SQLite sessions、cookie | 已接線／未測；Client login disabled，demo 登入不等於真帳號 | src/components/LoginScreen.tsx:44；backend/auth.py:117 |
| 客戶／Brief | clients API、SQLite store；本機快取 | 已接線／未測；需驗 reload | src/App.tsx:1222；src/components/SettingsScreen.tsx:37 |
| Overview／Home | clients、ideas、production | 清單已接線／未測；Home Later 是 placeholder | src/components/ClientHome.tsx:167 |
| Find／近期搜尋 | search API、backend cache；近期搜尋本機 | 快取已接線／未測；真搜尋／分析可能付費，不執行 | src/lib/live.ts:161；backend/server.py:657 |
| Research | research.v4、research-slots.v2 localStorage | 本機可保存；沒有 server sync，不宣稱跨裝置；sample Picked 在 live 模式有 #1 | src/state.ts:49；src/App.tsx:897 |
| Compare | compare API、backend jobs、localStorage | 已接線／未測；未快取分析可能付費，跳過 | src/lib/compare.ts:113；backend/compare.py:137 |
| Plans／Plan | ideas API、SQLite、revision | 已接線／未測；hook 是模板，#1/#3/#5 仍有成因 | src/App.tsx:897；src/lib/hooks.ts:63；src/components/ShortlistBoard.tsx:135 |
| 匿名 Review | share/review/cut decide API；SQLite shares/cut_reviews | 已接線／未測；需實測版本、退回、理由、核准 | backend/share.py:102；backend/cut_review.py:70 |
| 語言／主題 | localStorage | 已接線／未測；非帳戶同步 | src/components/PreferencesScreen.tsx:28 |
| Channel | channel API、backend/channels、sessionStorage | 已接線／未測；跨專案 decoder 路徑依賴；跳過新分析 | backend/channels.py:37；src/lib/channel.ts:69 |
| Publish | publications SQLite；FakePublisher 預設 | mock；真 adapter 只檢查 https:// 前綴，未驗 public 可達性，但路由傳本機 final.mp4，真發布未接通；demo 止於核准 | backend/publishing.py:206；backend/publishers.py:138 |
| Analytics | 手填 metrics、summary API；SQLite | 手填已接線／未測；真平台抓數未驗、Home placeholder | src/components/publish/ResultsEntry.tsx:42；backend/publishers.py:127 |
| 新版 Canvas／Editor／真人成品 | 另一 agent 交付後固定版本 | 本輪未測，不能用 main 舊版或合成 say 素材代替真人驗收 | 三天計畫與本輪交接 |

既有問題核對：#1 的 sample video 在 live 模式被 `shownIdeas` 隱藏、#3 缺影片 waiting 訊號、#5 的 TikTok fallback 被首字母 lower-case，原始碼仍有成因（P1）；#9 Plan h2 沒有 h1（P2）。#2 的 1440 overflow 要 UI 量測，未重現也未標已修。沒有新確認 P0，不代表權限／資料遺失風險已驗清零。

素材查核（task `task_24d894024c52`）：已追蹤影音只有 `public/media/remake-tour.mp4`，48.000021 s、H264 1920×1080、AAC，屬產品導覽，沒有真人英文及使用權證據。既有 whisper fixture／make-fixtures 使用手寫、testsrc2、sine 或 macOS say，不能當真人。待 Tommy 提供有權使用的真人英文原片、兩段 B-roll、腳本順序，選用 logo／授權配樂；HEVC/HDR 必須有原檔才驗。

環境：本輪 `bash bin/verify.sh` 四項 PASS／GREEN；只在本工作區接上既有依賴的 ignored symlink，沒有安裝。`isolated-backend.sh` 會清掉 mktemp，不可當持久重啟證據；後續 QA 必須使用自己建立並保留的 sandbox 與零預算設定。UI 尚未驗收、真人 MP4 尚未產出，費用 US$0。

獨立覆核（2026-11-05，task `task_6a6c14d68b61`）接受上述六項靜態成因；live 模式條件與 HTTPS gate 精度已修正。覆核未跑瀏覽器、真人影片或 provider，不代表動態驗收通過。

## 2026-11-05：P1 #1／#5 程式修正整合

已將隔離工作區七檔未提交差異套用至 `fix/demo-flow-qa-mainline`（base HEAD `e442b3a`，無 commit／merge／push）。#1 改用每個計畫的 optional `savedInLive` 標記，保存原始 sample 來源、重選既有計畫時只補標記，避免同影片跨客戶露出預置計畫；前後端 model 允許此標記並有 API round-trip 回歸。#5 保留 TikTok 品牌大小寫。獨立覆核 task `task_82b57e760129` 接受程式範圍，親跑聚焦測試 20/20；整合者接受，並修正一行過時測試註解。原表 #1／#5 的歷史 open 記錄保留：目前為程式已修、待 UI 驗收，不能標 fixed @sha（尚無修正 commit）。

驗收限制：沒有 React DOM／真 reload／真人／新版 Canvas 證據；初始 GET 前互動可能被 remote 覆蓋、舊版 client 全量 PUT 可能清標記、library 缺版本保護，仍保留待驗。UI 副本操作曾被安全 hook 擋下，等待 Tommy 明確批准，沒有繞過。

## 2026-11-05：整合者接回 UI／匯出，零支出證據

- 原UI dispatch ctx_5412d8a8ceb6 為failed/exited，僅交靜態矩陣；不改寫其歷史。整合者現在以唯讀靜態前端＋瀏覽器fake API實際驗 sample Picked→Plans出現→真reload仍在→shot list編輯保存，均通過；#1為mock-API UI通過，真後端重啟仍未測。#5維持單元／獨立覆核通過，不冒稱本輪影片字幕來自TikTok fallback。
- #2確認重現：Research Video4展開後document scrollWidth1473、viewport1440，仍open。未做版面重設計。
- 現有素材工程匯出已完成：existing-footage-proof.mp4，1080×1920／30fps／H264／AAC，9.024秒，完整解碼與瀏覽器ended=true；3個真既有來源片段、英文自寫技術標籤，來源hash/時間範圍可查。不是正式案例、不是真人或新生成驗收。
- 證據9檔在 `2026-11-05-zero-spend/`；零支出fake入口測試32項通過，provider/network spy=0，無wallet扣額。自己的靜態server只綁loopback且POST501、沒有任何付費backend，API全部browser fake；外網請求abort；測後關自己的page/server、釋放lease。
- 核心仍缺同案例真拆解／原片視覺參考接入／Canvas固定版本整合／有權真人或既有真AI素材／正式MP4品質與真後端持久驗收。付費批准US$0，故不跑未快取分析或新生成；舊副本hook仍blocked，未繞過。

## 2026-11-05：原生素材鏈新增驗收（最新）

- **完成**：真後端in-process API上傳4 takes／3 shots、選取alternate、真probe、edit v1保存、原生export worker→真Remotion MP4→下載hash核對；H264 1080×1920／30fps／AAC／9.024s，全片decode通過、瀏覽器完整播放ended=true。新Python程序沿用同一臨時DB／media後edit／takes／成品hash一致；不是HTTP服務重啟或真前端接線通過。provider/network spies0、wallet空，paid budgets全0。
- **限制**：本次是repo導覽片，原生cover裁切橫片內容，不能當可展示的正式案例成品；字幕為自寫技術標籤，沒有真人逐句聽驗或Clean up。沒有改渲染版型，沒有碰Canvas。證據`2026-11-05-zero-spend/native-takes-*`，保留舊工程片及原UI failed歷史。
- **驗證RED**：全套verify於嚴格零預算環境後端92 failed／910 passed／2 skipped，其餘三步PASS。聚焦一項fake provider測試預期502但零預算提前429；其他91項未逐一分類。32項零支出回歸與本次原生鏈各自PASS，不提高預算換綠燈，不宣稱整體GREEN。
- **未測／blocked**：真前端＋後端UI、正式同案例素材／拆解／畫音字幕、真人Clean up及Canvas固定版本。素材路徑已異步詢問；舊副本操作仍未批准，不繞過；搜尋／分析／生成／配音付費均禁止。自己的tab已關，8891／8892無listener，browser/static/render三個test-slot均held=false。

## 2026-11-07：提交版 prepared 展示 review（最新適用性）

Source `b37ddc1258c41f67a954e60b55b156f0bc85fe5c`，base `2be89f0f03695b0adbec4cfd463da9e07a992a0c`；獨立 Orca task `task_730702972645`／dispatch `ctx_4eca8615fb5d` ACCEPT 全部 79 檔增量，無新增 P0–P3 finding。Root 核對 HEAD／無 drift 後接受。這是原始碼與既有證據 review，沒有新增瀏覽器測量，不重寫上表歷史 open。

| 舊編號 | 本次判定 | 下一步 |
| --- | --- | --- |
| 1 | savedInLive 原始碼已修；prepared 非主參考停用 Pick | native 真後端 reload／重啟仍需專項 UI 驗證 |
| 2 | Research 已是後續 grid／container 版本，舊 1473px 不代表目前重現 | 1440 動態量測展開列，仍未宣告 fixed |
| 3 | **P1 仍在 native 模式**：Signals 無 cutWaiting，Plans 分欄不顯示成片等待，缺影片 review 入口 | 展示後優先修；prepared ExportBar 隱藏 Send，非本次展示阻擋 |
| 4 | saved／approved 入口已有分流；approved 仍有 CutPanel 與 Canvas，readonly 工具可開但控制停用 | 產品決策與 edge／drawer 動態確認 |
| 5 | TikTok casing 原始碼已修；無 caption fallback 品質仍需內容驗收 | native 輸出／標題驗收，prepared 固定腳本不能代替 |
| 6 | 完整 interp.text 已接入，舊 chip 不在 active JSX | 分組標籤擠字需 1440 動態檢視 |
| 7 | 價格 modal 已有逐節點模型／設定／價格／餘額，board 未從 DOM 移除 | native backdrop 視覺需動態驗證；prepared 零費回放不走此 modal |
| 8 | notice 現在位於編輯時 hidden 的 board，遮擋成因已有改善 | Shot 1 換行與每個 label 版面仍需動態檢視 |
| 9 | **P2 仍在**：PlanScreen 主標題為 h2、頁面無 h1 | 後續小修，不阻擋此次核心 prepared 流程 |
| 10 | 原 AgentPanel 核准並執行已非 active 路徑；目前 Apply to canvas 後逐節點 Run | native 重跑行為需動態確認，不能沿用舊路徑斷言 |

限制：此 verdict 只接受本次 prepared 增量，非全產品／真 provider／真人拍攝／外觀批准。未測多節點拖曳與 cancel／resize 並發、pending-navigation Exit race、所有 drawer 影片。既有 ViewTransition 背景 timeout 未宣稱已修。語音依使用者決定不列阻擋。實際 MacBook smoke、離線播放、兩次真人彩排仍待人員確認。
