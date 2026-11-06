# 節點畫布 UI 流程：Dreamina AI Canvas / LTX Studio / Runway

調查日期：2026-11-03。圖片根目錄 `IMG` = `/Users/tommy/Desktop/my-vault/research/ui-flow-node-canvas-2026-11-03/`。
方法：只看 YouTube 影片與公開文件抽幀，沒有登入任何產品、沒有付費 API。每張保留的圖都實際看過，說明依畫面所見撰寫。
對照基準：BuildClub 畫布 Shot → Storyboard 圖片節點（模型、v1/v2、約 US$）→ Video 節點（起始幀、模型、秒數）→ 加入時間軸 → 全螢幕編輯器 → 匯出／送審。

---

## 一、Dreamina AI Canvas（ByteDance / CapCut）

### 來源
- Jon Law，〈AI Video Just Moved From Prompts to a Canvas (Dreamina 2.0 Tutorial)〉，2026-10-25，https://www.youtube.com/watch?v=kg_rrbn3f7I （主要來源，螢幕錄影＋講者小窗；以下簡稱 J）
  - 進入 &t=168s、加節點／模型 &t=372s、費用 &t=396s、佇列 &t=468s、迭代 &t=420s／&t=456s、時間軸 &t=492s、匯出 &t=504s／&t=540s、代理 &t=276s／&t=324s
- Ai Ragger，〈Dreamina 2.0 Changes AI Video Creation Forever? (New Canvas Workflow)〉，2026-11-01，https://www.youtube.com/watch?v=WxPH8Vvbzv8 （香水範例，畫面有 $0.29 推廣浮水印；以下簡稱 A）
  - 範例 &t=240s、空節點 &t=96s、加節點選單 &t=84s、skills 選單 &t=192s、時間軸 &t=336s
- 只做瀏覽未採用：The AI Frontier（ORq09cg1Qn0）、ZAFFAI（t7SOYLTyWJM）、AI Outlet 2026-10-28（gYX_nWZ86tA）。
- UI 版本風險：影片均為 2026-10 底至 11 月初，屬於目前最新版，風險低。但 Dreamina 迭代快、且會員／點數規則在影片中仍在變。

### 階段
**1 進入** — `IMG/dreamina/01-entry-canvas-home.jpg`、`IMG/dreamina/01-entry-explore-see-how-its-made.jpg`
首頁有「Generate | Canvas」切換，Canvas 分頁有「New canvas」方塊與既有畫布清單，底部提示列可用「/」叫出 skills。Explore 展示區每個作品附「see how it's made / copy canvas」，可直接複製別人的畫布當範本。
對我們的啟示：「複製別人的畫布」是最低門檻的入口，我們的範本（例如一個 Shot 的完整節點鏈）也可以這樣給新使用者。

**2 起手** — `IMG/dreamina/02-first-node-empty-image-node-prompt.jpg`
空的 Images 節點加上提示面板，顯示模型「Seedream 5.0 Pro」與生成按鈕上的「12/image」點數。
對我們的啟示：價格直接寫在生成按鈕上，使用者第一次生成就看到。

**3 加節點與接線** — `IMG/dreamina/03-add-node-menu-double-click.jpg`
在空白處雙擊跳出選單：Text、Image、Video、Audio、Timeline、Element、3D Director Console、Select from Assets、Upload from device。節點工具列另有 Smart edit、Panorama、Expand、Upscale、Remove BG、Views、Angles、Relight、Marketing、More tools、Ask agent（A &t=120s 所見，未存圖）。
對我們的啟示：節點選單裡有「Timeline」這種後製節點，與生成節點同層級，是我們「加入時間軸」的對照原型。

**4 選模型與參數** — `IMG/dreamina/04-model-params-video-node-seedance2.jpg`
Video 節點面板：Dreamina Seedance 2.0、16:9、720P、4s、Omni reference，旁邊價格顯示「+68」。
對我們的啟示：模型、比例、解析度、秒數放在同一個節點面板，且價格即時跟著參數變。

**5 執行前費用** — `IMG/dreamina/05-cost-video-node-seedance25-1080p.jpg`
同一節點切到 Seedance 2.5、1080P，價格變「+364」（已用全解析度確認數字）。
對我們的啟示：改一個參數價格就跳，使用者自然學會「貴在哪」。沒看到額外的確認彈窗。

**6 執行中／結果／失敗** — `IMG/dreamina/06-running-queue-timeline-node.jpg`
畫布上同時有 Timeline 節點（「Drag and drop media here」、「Edit in full screen」）與一個顯示「1/1 in queue」的 Video 節點。失敗畫面：**沒找到**。
對我們的啟示：排隊狀態直接顯示在節點本體。

**7 迭代** — `IMG/dreamina/07-iteration-video-toolbar-variants.jpg`、`IMG/dreamina/07-iteration-angles-panel.jpg`
Video 節點工具列：Edit segment、Creative upscale、Edit video、Extend、Frame capture、Trim；另有鏡頭角度面板。迭代走「在節點上再加工」而不是版本分支。
對我們的啟示：v1/v2 之外，也可考慮把「Extend／Frame capture」放成節點工具列動作。

**8 組成影片** — `IMG/dreamina/08-timeline-fullscreen-editor.jpg`、`IMG/dreamina/08-timeline-fullscreen-perfume.jpg`
Timeline 節點按「Edit in full screen」進入全螢幕時間軸，有「Imported / On canvas」兩個分頁，已加入的素材標「Added to timeline」，右上有 Export。
對我們的啟示：這就是我們目標流程的直接對照：畫布上的 Timeline 節點＋全螢幕編輯器，「On canvas」分頁讓使用者從畫布素材挑片。

**9 交付** — `IMG/dreamina/09-delivery-export-view-on-canvas.jpg`、`IMG/dreamina/09-delivery-exported-mp4-node.jpg`
匯出後跳出「Exporting video… View on canvas」提示與「More export options」；成片以「Timelines 1.mp4」節點回到畫布。A 的口述提到可匯出到 Premiere／FCP。送審／分享連結：**沒找到**。
對我們的啟示：匯出結果回到畫布成為節點，可再接下一步，值得學。

**10 AI 代理** — `IMG/dreamina/10-agent-empty-skills.jpg`、`IMG/dreamina/10-agent-result-credits-consumed.jpg`、`IMG/dreamina/10-agent-skills-picker.jpg`
側邊聊天面板寫「Explore what skills can do」，晶片有 Video analysis、Shot design、TV commercial、Narrative short film、E-commerce images；輸入「/」出 skills 下拉；結果下方顯示「80 credits consumed」。J 口述：代理生成會耗點數、畫布內影片模型需會員、另有 CLI 讓 Codex 這類 coding agent 操作畫布（口述，未驗證）。
對我們的啟示：代理用「技能」而非空白輸入框開場，並在結果處回報實際點數。

---

## 二、LTX Studio（非節點對照組）

### 來源
- LTX_io，〈Create an Ad Using LTX Studio (Full Walkthrough)〉（「From Brief to Build」webinar），2026-03-23，https://www.youtube.com/watch?v=erqNhzKQvLg
  - Gen Space &t=815s、Gen Space 提示 &t=840s、storyboard 建立 &t=1160s、鏡頭導覽列 &t=1200s、模型 &t=1250s、更多設定 &t=1290s、變體 &t=1500s／&t=1520s、Video Editor &t=1700s、音軌 &t=1760s、旁白 &t=1850s、匯出 &t=2010s
- LTX_io，〈Video Editor Workflow in LTX Explained〉，2026-01-09，https://www.youtube.com/watch?v=g4yMVLObuos （&t=22s 工具選單、&t=172s 匯出時間軸）
- LTX_io，〈Meet Canvas in LTX Studio〉，2026-04-27，https://www.youtube.com/watch?v=ZrDiw4T7CEU （行銷動畫，&t=20s／&t=28s）
- LTX_io，〈How to Use Retake in LTX〉，2025-11-26，https://www.youtube.com/watch?v=bzU82Olv8_M （&t=24s／&t=40s；為 LTX API Playground 的 Retake）
- LTX_io，〈How to use Elements in LTX Studio〉，2026-02-19，https://www.youtube.com/watch?v=nnq8JVBSVIc （&t=0s／&t=24s）
- 未採用：p6pBez477Ys（Theoretically Media，LTX Desktop，是不同產品）。
- UI 版本風險：Gen Space 畫面來自 2026-03 webinar；Video Editor 工具選單來自 2026-01；Canvas（beta）只有官方宣傳動畫，不是實際操作錄影。Retake 畫面是 API Playground，不是 Studio 本體。

### 結構
LTX Studio 是線性分頁流程：Elements | Gen Space | Canvas (beta) | Storyboard | Video Editor。Canvas 只是 beta 的情緒板式視圖，不是節點圖。

### 階段
**1 進入** — `IMG/ltx-studio/01-entry-gen-space-image-storming.jpg`、`IMG/ltx-studio/01-entry-elements-collection.jpg`
頂部分頁列如上，Gen Space 首頁寫「Let's start with some image storming」並附預設。Elements 頁收集已存的角色／物件。
對我們的啟示：分頁就是流程步驟，使用者永遠知道「下一個分頁是什麼」，節點圖沒有這種導引。

**2 起手** — `IMG/ltx-studio/02-first-element-select-type.jpg`、`IMG/ltx-studio/02-first-shot-storyboard-builder.jpg`、`IMG/ltx-studio/02-first-shot-gen-space-prompt-with-elements.jpg`
Element 類型：Character、Object、Logo、Font、Style、Other。Storyboard 建立頁問「What's your story?」，可上傳劇本或空白 storyboard。Gen Space 提示可用 @ 標籤引用 Elements，選 Nano Banana Pro 類圖片模型。
對我們的啟示：「可重複使用的 Element + @ 引用」是跨鏡頭一致性的好做法，與我們的參考圖節點可對照。

**3 加節點與接線** — 非節點產品，**不適用**。對照圖：`IMG/ltx-studio/03-nonode-shot-navigator-strip.jpg`（鏡頭導覽列）、`IMG/ltx-studio/03-canvas-beta-prompt-box-collab.jpg`、`IMG/ltx-studio/03-canvas-beta-artboard-selection.jpg`（Canvas beta 宣傳動畫：協作游標、留言、artboard）。
對我們的啟示：用底部鏡頭條切換鏡頭，是節點圖之外的另一種「鏡頭導覽」。

**4 選模型與參數** — `IMG/ltx-studio/04-model-picker-video-models-cost-badges.jpg`
影片模型清單：LTX-2.3 Pro/Fast、LTX-2 Pro/Fast、Veo 3.1 標「LONG WAIT / EXTREME COST」、Veo 3.1 Fast 標「HIGH COST」、Kling 2.6 Pro，Kling 3.0 標 coming soon。
對我們的啟示：選單裡用文字徽章標「HIGH COST／LONG WAIT」，不用數字也能傳達貴與慢，可補強我們的 ≈US$ 顯示。

**5 執行前費用** — `IMG/ltx-studio/05-cost-more-settings-credit-usage.jpg`
More settings 有音訊開關、影片數量、fps；頂列有「Credit usage」連結。生成按鈕處沒看到單次價格。
對我們的啟示：LTX 把成本放在總量（頂列）與模型徽章，沒有單次估價，對照我們有更明確的估價優勢。

**6 執行中** — `IMG/ltx-studio/06-running-placeholder-tiles.jpg`、`IMG/ltx-studio/06-running-video-generating.jpg`
先出現佔位磚，影片生成中顯示進度狀態。失敗畫面：**沒找到**。

**7 迭代** — `IMG/ltx-studio/07-iteration-variants-use-as-reference.jpg`、`IMG/ltx-studio/07-iteration-image-variants-per-prompt.jpg`、`IMG/ltx-studio/07-iteration-tools-menu-retake-send-to-editor.jpg`、`IMG/ltx-studio/07-iteration-retake-select-segment.jpg`、`IMG/ltx-studio/07-iteration-retake-prompt-generate.jpg`
每個提示產出多個變體，可「用作參考」再生成；Tools 選單有 Send to Video Editor、Audio、Retake、Set as project cover、Delete。Retake 可框選一段影片、改提示重生（API Playground 畫面）。
對我們的啟示：「Retake 只重生一段」與「Send to Video Editor」都是單片層級動作，相當於我們「把這支當 main clip」之前的挑選動作。

**8 組成影片** — `IMG/ltx-studio/08-timeline-video-editor-import-storyboard.jpg`、`IMG/ltx-studio/08-timeline-video-editor-soundtrack.jpg`、`IMG/ltx-studio/08-timeline-voiceover-panel.jpg`
Video Editor 可從 storyboard 匯入鏡頭，webinar 口述有 2 條影片軌、最多 5 條音軌，並有音軌與旁白面板。
對我們的啟示：從 storyboard 一鍵匯入時間軸，不需逐片拖拉；我們的「加入時間軸」可以也支援「整個 Shot 清單一次匯入」。

**9 交付** — `IMG/ltx-studio/09-delivery-export-package-or-video.jpg`、`IMG/ltx-studio/09-delivery-export-timeline-package-xml.jpg`
Export Video 二選一：Package（全部素材＋給 DaVinci／Premiere 的 XML）或 Video（MP4）。另有 Share、Upgrade，以及「26% Credits」用量顯示。客戶審核流程：**沒找到**。
對我們的啟示：XML Package 匯出是專業後製的交棒方式，送審之外可再提供。

**10 AI 代理** — **沒找到**（影片與文件都未見對話式代理改圖）。

---

## 三、Runway（Workflows 節點編輯器 + Agent）

### 來源
- Cole Bielecki，〈How to Use Runway Workflows (Beginner Tutorial)〉，2026-05-23，https://www.youtube.com/watch?v=0t2oOrEznkA （最新且畫質最好；以下簡稱 W）
  - 首頁 &t=28s、影片節點選單 &t=50s、音訊節點 &t=60s、Gemini 埠標籤 &t=100s、圖片節點 &t=112s、比例選單 &t=285s、完整圖 &t=300s、結果面板 &t=345s、執行中 &t=535s、多版本計數 &t=550s
- Runway Academy，〈Using Workflows〉，2025-11-21，https://www.youtube.com/watch?v=MsVl_CKu_gk （&t=30s 範本庫、&t=46s 6 credits、&t=100s 66 credits；以下簡稱 R1）
- Runway Academy，〈How to Use Agent 2.0〉，2026-07-01，https://www.youtube.com/watch?v=OfqZtW4b8ZE （&t=40s、&t=52s、&t=85s）
- Runway，〈How to Use Aleph 2.0 in Edit Studio〉，2026-05-22，https://www.youtube.com/watch?v=-lVVZDuEIVs （&t=70s）
- 參考未存圖：Cole Bielecki，〈Runway ML Agent Tutorial: Don't Switch From Workflows Yet!〉，2026-07-07，https://www.youtube.com/watch?v=hs-hxWjCGD4 ；Runway，〈Story Panels Workflow〉，2026-02-12，https://www.youtube.com/watch?v=nlReW9osT48 ；Runway，〈How to Build Custom Workflows〉，2025-11-21，https://www.youtube.com/watch?v=KQ1nXVT8iJM
- 文件：Runway Help Center〈Trim and Assemble Clips in Studio〉(help.runwayml.com，文章編號 52685547867667)。**無法取得全文**（回 403 Cloudflare），只從搜尋摘要得知：建立 Cut、把 Assets 面板的片段拖進時間軸或雙擊加入、目前不支援圖片、有 Detect Shots 選項。舊版 Timeline 說明頁說舊編輯器已不再維護。
- UI 版本風險：Workflows 畫面橫跨 2025-11（R1）、2026-05（W）；節點選單（Gen-4.5、Kling O3、Seedance 2.0）以 W 為準。Agent 2.0 為 2026-07。**Timeline Studio（約 2026-07-30 推出）沒有找到任何操作影片**，下面第 8 階段因此沒有圖。

### 階段
**1 進入** — `IMG/runway/01-entry-workflows-home.jpg`、`IMG/runway/01-entry-template-gallery.jpg`
側欄有 Apps、Custom、Agent、Recents、Workflow、Characters；Workflows 首頁標語「Build the Workflows that work for you.」，按鈕「Build a Workflow」，下方「Featured workflows」（Team Runway／Creative Partners Program）。R1 的範本庫列出 Style Generator、Image Variations、Storyboard Creator、Virtual Try On、Image to Text、AI Hair Salon、Mockup Generator；選範本後出現「Workflow cloned」提示。
對我們的啟示：範本是「複製成自己的工作流」，進去就有完整的節點鏈可直接改。

**2 起手** — 主要用 `IMG/runway/03-wiring-gemini-port-labels.jpg` 的空 Text 節點（「Type a prompt」）與 Gemini 節點。首個節點一律是 Text 或 Image（「Click to upload / Select asset」）輸入節點。
對我們的啟示：起手就是輸入節點，沒有專用的「Shot」概念，我們的 Shot 節點是更貼近分鏡的起手。

**3 加節點與接線** — `IMG/runway/04-model-picker-video-nodes.jpg`、`IMG/runway/03-add-node-audio-nodes.jpg`、`IMG/runway/03-add-node-image-and-gemini-nodes.jpg`、`IMG/runway/03-wiring-gemini-port-labels.jpg`、`IMG/runway/03-wiring-full-graph-seedance.jpg`
「+」開啟搜尋式節點選單，左欄分類 New nodes / Recently used / Video / Image / Audio / Text，右側每個模型列出名稱與輸入輸出型態（例如 Gen-4.5「Text to Video」與「Text+Image to Video」、Kling O3 4K「Text/Image to Video」）；底部有「Keep open to add multiple nodes」開關。音訊類有 Text to Speech、Text to SFX、Voice Dubbing、Voice Isolation、Speech to Speech、Lyria 3 Clip。接線時埠上有彩色型態標籤：綠色 System Prompt／Text Prompt／Response，藍色 Image 1／2／3；R1 中必填埠有星號（Prompt*、Image*）。完整圖：兩張參考圖＋Gemini 寫提示→Nano Banana 2→Seedance 2.0。
對我們的啟示：按型態配色的埠、必填星號、選單列出輸入輸出型態，都能讓連線錯誤在連之前就被看到。

**4 選模型與參數** — `IMG/runway/04-model-picker-video-nodes.jpg`（模型就是節點）、`IMG/runway/04-params-aspect-ratio.jpg`、`IMG/runway/04-params-nano-banana-settings-done.jpg`
Runway 的「選模型」等於「選哪種節點」。參數在節點的設定面板：Nano Banana 2 有 Resolution（4K）與 Aspect Ratio，下拉含 Auto、1:1、2:3、3:2、3:4、4:3、4:5、5:4、9:16、16:9、21:9，按 Done 收起。
對我們的啟示：模型即節點讓圖本身就記錄了用了什麼模型；但缺點是換模型要換節點。

**5 執行前費用** — `IMG/runway/05-cost-run-all-6-credits.jpg`、`IMG/runway/05-cost-run-all-66-credits.jpg`
頂欄「Run all • [6 credits]」，加入 Gen-4 Video 節點後變「Run all • [66 credits]」，右上顯示剩餘點數；每個節點另有自己的「Run ⓘ」按鈕。
對我們的啟示：整張圖的總價與單節點執行並存，這就是「全部執行前先看總價」的標準寫法，與我們每節點 ≈US$ 互補，建議加總價。

**6 執行中／結果／失敗** — `IMG/runway/06-running-execution-toast-upscale-0pct.jpg`
按 Run all 後出現「Created workflow execution」提示，新加的 Upscale Video 節點顯示 0%，Run all 暫時變灰。失敗畫面：**沒找到**。
對我們的啟示：節點內進度百分比＋全域灰掉的 Run all，能避免重複點擊。

**7 迭代** — `IMG/runway/07-iteration-result-panel-reuse.jpg`、`IMG/runway/07-iteration-multi-result-counters.jpg`、`IMG/runway/07-iteration-edit-studio-reprompt-use-as-reference.jpg`
點結果開詳情面板：提示詞縮圖與文字、Generated with、Aspect ratio、Resolution、Image size，底部按鈕「Reuse prompt and settings」。多次執行後，節點底部出現「2/2」「3/3」的版本計數與左右箭頭，可翻看各次結果。Edit Studio（另一個應用）預覽下有 Re-prompt、Edit this image、Use as reference、Generate video。
對我們的啟示：用「節點內版本箭頭」取代分支，並提供「Reuse prompt and settings」，v1/v2 的做法可對照。

**8 組成影片** — **沒找到**。
沒有任何影片展示 Timeline Studio，也沒看到 Workflow 輸出送進時間軸的畫面。**關鍵問題「Workflow 輸出如何進入時間軸」：未驗證。** 現有線索只有：(a) help 文章說 Studio 是從 Assets 面板把片段拖進時間軸（推測 Workflow 結果會存進 Assets，因為結果面板有 Tag/素材名稱，但沒看到直接的「Send to timeline」按鈕）；(b) W 的結果片段上有分享、收藏、下載圖示，沒有時間軸圖示。要確認需登入實測或等 Timeline Studio 有教學。
對我們的啟示：若 Runway 真的以 Assets 為中介，我們直接「從節點加入時間軸」會比它少一步。

**9 交付** — **沒找到**（無匯出／送審畫面）。只看到結果片段的下載與分享圖示、以及頂欄的 Publish（發布工作流，不是交付成片）。

**10 AI 代理** — `IMG/runway/10-agent-home-prompt-box.jpg`、`IMG/runway/10-agent-clarifying-questions-card.jpg`、`IMG/runway/10-agent-result-clips-on-canvas.jpg`
Agent 2.0 首頁「Hi Marko, What are you working on?」，提示框寫「Start with anything. A product, an idea, an image…」，下方有預設卡片（Build a campaign、Break down an ad、Make ad variations、Build on past content）。代理會先問「A few quick questions before we dive in」，用 1 of 3 / 2 of 3 / 3 of 3 的選項卡（格式、風格、主訴求，可 Skip），答完再生成。結果以並排片段與右側對話顯示，下方有「Add all to prompt」，額度顯示在右上。hs-hxWjCGD4 的結論（Cole Bielecki，口述）：Agent 不能取代 Workflows，適合找靈感與起手，提示詞再複製進工作流；他的工作流並非代理自動建成。Workflows 內建代理（2026-08-14 第三方新聞影片）未能查證。
對我們的啟示：選項卡式追問比空白輸入更好用；但 Runway 的代理產出的是對話裡的片段，不是節點圖。

---

## 四、跨產品最強的 UI 模式

1. **時間軸作為畫布上的節點＋全螢幕編輯器**（Dreamina）：節點上寫「Edit in full screen」，匯出的成片以 mp4 節點回到畫布。最貼近我們的目標流程。
2. **價格貼在動作按鈕旁**：Dreamina 的 +68／+364 隨參數即時變動；Runway 的「Run all • [N credits]」是整圖總價，另有每節點 Run。兩種並存最完整。LTX 則用 HIGH COST／EXTREME COST 文字徽章。
3. **型態化的埠**：Runway 的彩色埠標籤與必填星號，連線前就知道能不能接。
4. **複製範本進自己的空間**：Dreamina 的 copy canvas、Runway 的 Workflow cloned，降低空白畫布恐懼。
5. **節點內版本箭頭與「Reuse prompt and settings」**（Runway），對照 Dreamina 在節點工具列做 Extend／Trim／Frame capture。
6. **代理先追問再動手**：Runway 的選項卡、Dreamina 的 skills 晶片與「N credits consumed」回報。
7. **線性分頁當導覽**（LTX）：分頁順序即流程，storyboard 一鍵匯入時間軸；且提供 XML Package 匯出給專業後製。

### 沒找到／未驗證彙整
- Dreamina：失敗狀態。
- LTX Studio：代理、失敗狀態、客戶審核；Canvas（beta）僅有宣傳動畫。
- Runway：第 8 階段（Timeline Studio 與 Workflow 輸出進時間軸）、第 9 階段（匯出／送審）、失敗狀態。Help Center 全文因 403 無法讀取。
