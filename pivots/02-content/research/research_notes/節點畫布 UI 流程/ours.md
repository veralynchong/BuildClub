# 我們自己的 Canvas（Remake / BuildClub trend-finder）— 十階段實拍

擷取日期：2026-11-03。圖與 GIF 放在 `/Users/tommy/Desktop/my-vault/research/ui-flow-node-canvas-2026-11-03/ours/`（下文只寫檔名）。

## 擷取條件（誠實聲明）

- 程式碼：worktree `canvas-p1`，實際分支是 `feat/canvas-p2-5-kit`（commit 2f2834f），不是任務簡報寫的 `fix/canvas-ux-batch6`。我沒有切分支。這個分支的 working tree 還有別人未提交的 kit 相關修改（KitPanel 等），但本次擷取用的 `dist` 是我在這個 tree 重新 `npm run build` 的，畫面可能含 P2.5 kit 的改動；canvas 畫面上沒看到 kit 入口。
- 後端：`bin/isolated-backend.sh 8861 --demo-data --user ...`，`REMOTION_PORT=8862`，全部預算為 0、只有 mock 模型，沒有任何付費 API 呼叫。已停掉。沒碰 8805。
- 視窗 1440x900，英文介面，桌面版。Playwright 用 e2e/lib.cjs 的 chromium（channel chrome, headless）。
- 資料：e2e 的 seed（客戶 Evergreen Foods、已核准計畫「Crispy tofu ASMR」三個 shot）。每次擷取前重啟後端以得到乾淨狀態。
- 限制：付費模型全部是 disabled（"needs a key"），所以**看不到付費模型的「≈ US$0.04 · US$X left today」那一行**；成本只能拍到「Free」與確認視窗的「Total ≈ US$0.00」。付費那行字串依原始碼是 `≈ US${usd} · US${left} left today`（`src/lib/strings/canvas.ts`、`GenNode.tsx:137`），僅有預算已載入且 usd>0 才顯示，這一點**沒有實拍，只有讀程式碼**。
- 原生 `<select>` 的彈出選單 headless 拍不到。`04-model-options-*.png` 是我用 DOM 把 select 的 `size` 暫時設成 4、讓選項直接展開的樣子，不是使用者真正看到的彈出視窗。
- GIF 是連拍截圖後用 ffmpeg 縫起來，加速約 1.8–2 倍才壓進 6 秒內（mock 生成本身約 2–3 秒）。三支都 ≤ 960 寬、< 200 KB。

---

## 1 進入 Entry

- 圖：`01-entry-client-dashboard.png`（登入後的客戶總覽）、`01-entry-client-home-sidebar.png`（選客戶後，左側欄有 Canvas 項目）、`01-entry-plans-board.png`（Plans 看板）、`01-entry-plan-detail.png`（計畫詳情，有「Open the canvas」）、`01-entry-canvas-chooser.png`（側欄 Canvas，客戶有多個核准計畫時出現的「Pick a plan for the canvas」）。
- 做什麼：兩條路進 Canvas。1) 側欄 Canvas：只有一個核准計畫就直接進，有多個就先出選擇頁（列表卡片，只有影片縮圖、標題、Due 日期）。2) 計畫頁 →「Open the canvas」。沒有範本、沒有 onboarding、沒有空白畫布：畫布一定從一個核准計畫的 shot 長出來（每個 shot 自動配一個 Storyboard 節點並接好 Text 線），文案寫 "Only approved plans have a canvas."
- 友善度問題：
  - 選擇頁兩個計畫標題、縮圖完全一樣（我複製的 seed 造成），只靠 Due 日期區分；真實資料裡同一支參考影片的多個計畫也會這樣。
  - 沒有任何第一次使用的說明，也沒有「這是什麼」的提示。
  - 經側欄進入時，畫布初始視角異常：縮放 2 倍、只看到第一個 shot 和半個 Storyboard，右半被裁切（`02-canvas-opens-zoomed-cropped-via-sidebar.png`、`02-canvas-opens-first-view.png`），要按左下的 fit 鈕才看到全部。從計畫頁進入時則是正常的全覽（縮放約 0.4）。這是兩個入口行為不一致，可能是 fitView 時機問題。

## 2 起手 First node

- 圖：`02-canvas-fit-all-shots.png`（fit 後，三個 shot 各一列：Shot → Storyboard）、`02-first-shot-and-storyboard.png`（放大到一列）。
- 做什麼：起手節點是 Shot（來自計畫，內容是該 shot 的台詞），右上有 + 鈕；Storyboard 節點已預先連線。Shot 內容不能在畫布上改，要回計畫頁改。
- 友善度問題：
  - fit 之後節點只有約 220px 寬、字很小，要自己放大才讀得到；沒有 minimap。
  - 因為一切預先建好，使用者看不到「從零開始」的體驗；但也沒有「空」的狀態需要處理，是優點也是限制（想先放一個自由 Prompt 節點要用右上 Add）。
  - 頁面標題只有 "Canvas"，沒說這是哪個計畫（要靠上方「← Back to plan」猜）。

## 3 加節點與接線

- 圖：`03-add-menu-header.png`（右上 Add：Prompt / Storyboard / Video / Upload）、`03-shot-plus-menu.png`（Shot 的 +：Prompt / Storyboard / Video / Upload / Footage）、`03-video-node-added-unwired.png`、`03-wiring-drag-midway.png`（從 Storyboard 的輸出點拖線時，相容的 Start frame 亮起、不相容的埠變灰）、`03-wired-start-frame.png`（接好後邊上有「Start frame」標籤，Storyboard 出現「Run the whole shot」）。GIF：`06-gif-wire-and-generate.gif`（接線 → Run the whole shot → 確認 → 執行 → 結果，約 5.8 秒）。
- 做什麼：節點有類型化埠，標籤直接寫在埠旁（Text / Start frame / Reference），顏色區分媒體類型（紫=文字、藍=圖片、黃=影片輸出）。從 Shot 的 + 加 Video 會自動連 Shot→Video 的 Text 線並把節點放在右邊；但 Video 的 Start frame **不會自動接**，要手動從 Storyboard 輸出點拖到 Start frame。無法接的情況（同一輸入已有線、迴圈、類型不符）有紅色 toast 說明原因（字串見 `canvas.conn.*`）。
- 友善度問題：
  - Video 的 Start frame 不自動接上同一個 shot 的 Storyboard，新手大概會直接按 Generate，然後被告知需要起始畫面（`canvas.gen.needStart`）。
  - Shot→Video 的 Text 線會穿過 Storyboard 節點後面（`03-wired-start-frame.png` 中 Storyboard 與 Video 之間那條橫線），看起來像是 Storyboard 接到 Video 的 Text，造成誤會。
  - 埠很小（約 8px），拖線要精準；實測我的腳本要加中間點才穩定。
  - 右上 Add 選單沒有 Footage，只有 Shot 的 + 才有；Add 加的節點不跟任何 shot 綁定，而 Upload 要從 shot 的 + 才能加（`canvas.upload.needsShot`）。
  - 有一次實跑看到殘留的紅色 toast「This input already has a line. Remove it first.」留在畫面底部（後續步驟都還在），不會自動消失、要按 ×；最終重拍時沒再出現，不確定是否穩定重現。

## 4 選模型與參數

- 圖：`04-model-options-storyboard.png`、`04-model-options-video.png`（選項為展開示意，見上方聲明）；節點本體見 `03-wired-start-frame.png`（Video 有 model 下拉 + 4s/6s 長度下拉）。
- 做什麼：每個生成節點有原生 select。選項字串是「名稱 · 檔位(cheap/balanced/best) · ≈ US$價格 · needs a key」，如 `Seedream 4.5 · cheap · ≈ US$0.04 · needs a key`。沒設 key 的模型 disabled、滑鼠 hover 有 title。Storyboard：Mock image / Seedream 4.5 / Nano Banana 2 / Nano Banana Pro。Video：Mock video / Hailuo 2.3 Fast / Kling 2.6 Pro / Gemini Omni Flash 1.1，長度只有 4s、6s。
- 友善度問題：
  - 節點太窄，下拉框顯示 "Mock image (..."，選項被截斷，使用者看不到完整名稱與價格，除非展開。
  - 用原生 select：沒有縮圖、沒有模型說明、沒有「這個模型擅長什麼」，檔位只用 cheap/balanced/best 一個字。
  - 其他參數（解析度、比例、seed、負面提示）一個都沒有，只有 prompt 與長度。
  - 預設是 mock 模型：在有 key 的正式環境新手會不會選到最便宜的不明（沒驗證）。

## 5 執行前費用

- 圖：`05-cost-run-whole-shot-dialog.png`（「Run the whole shot」確認視窗：Storyboard ≈ US$0.00、Video ≈ US$0.00、Total ≈ US$0.00、Left today: US$0.00 for images, US$0.00 for videos、Cancel / Confirm）。節點上的單點成本在 Generate 鈕右邊（`03-wired-start-frame.png`：「Free」）。
- 做什麼：單節點 Generate 不需確認，成本行就在按鈕旁（免費顯示「Free」；付費顯示「≈ US$x · US$y left today」，**未實拍，讀自程式碼**）。多節點的「Run the whole shot」先彈出彙總視窗，列出每個節點的模型與價格、總額、今日各類別剩餘額度，再按 Confirm。每日預算是伺服器端上限，用盡時伺服器拒絕並說明。
- 友善度問題：
  - 單節點 Generate 付費模型沒有二次確認，只靠按鈕旁小字；一鍵就扣款。
  - 「Left today」用兩個分開的類別（圖/影片）而且是 US$，沒有換算成還能做幾次。
  - 沒有「這個 shot 全部做完大概多少」的常駐顯示，只有按「Run the whole shot」時才算。
  - Run the whole shot 不支援參考圖（`canvas.chain.noRef`），遇到有 Reference 線就要改用逐節點 Generate。
  - 在 mock 環境無法驗證付費那一行的實際排版。

## 6 執行中／結果／失敗

- 圖：`06-running-storyboard-then-video-waiting.png`（Storyboard「Generating…」，Video 顯示「Waiting for the storyboard image」，按鈕變成淡色的「Waiting for the storyboard image」）、`06-running-video.png`（Storyboard 完成、Video「Generating…」）、`06-result-storyboard-and-video.png`（圖與可播放的影片）、`06-failure-running-again.png`、`06-failure-try-again.png`（提示詞含 `#fail`：紅字「Failed: Mock failure (the prompt asked for one).」，節點標題旁出現紅色「Out of date」，按鈕變「Try again」）。GIF：`06-gif-wire-and-generate.gif`（成功路徑）、`07-gif-fail-retry-versions.gif`（失敗 → 修改 prompt → 重試）。
- 做什麼：節點內有旋轉圖示與狀態字，鏈上的下游節點會等待上游。結果直接在節點裡播放（影片有原生控制列）。失敗時錯誤訊息直接寫在節點內，版本列多一個 ⚠ 的版本，按鈕變「Try again」。
- 友善度問題：
  - 沒有進度百分比或剩餘時間，只有一個轉圈。真模型要等一兩分鐘時看不出有沒有卡住（mock 只有 2–3 秒，無法驗證）。
  - 失敗訊息是 mock 的字串；真實 provider 錯誤會長什麼樣沒有驗證。
  - 失敗後節點同時顯示「Out of date」、上一個成功版本的影片、和紅色失敗字，三種狀態並列，容易混淆哪個是現在的結果。
  - Storyboard 圖縮圖在節點裡只有約 55x100px，看不清楚畫面，要放大畫布或到別處才能檢視；沒有點開看大圖的動作（沒驗證有無）。
  - 節點高度會隨狀態變化（結果出現後變高），會把下方節點或邊擠開，邊的標籤「Start frame」位置跟著跳。

## 7 迭代

- 圖：`07-versions-v1-v2-v3.png`（Video 版本列：v1、⚠v2（失敗，disabled）、v3（目前選取））、`07-versions-pick-v1.png`（點回 v1）。GIF：`07-gif-fail-retry-versions.gif`。
- 做什麼：每個生成節點下有 v1、v2… 小膠囊，點選即切換節點顯示的版本；失敗版本有 ⚠ 且不能選（hover 有原因）。每次 Generate/Regenerate/Try again 新增一個版本，舊版本保留。實測有結果後按鈕仍然寫「Generate」（不是字串表裡的 `Regenerate`），所以看不出這次按下去會「再做一個版本」而不是覆蓋。
- 友善度問題：
  - 版本膠囊很小（約 25x14 px），沒有縮圖或時間，v3 和 v1 長怎樣要點進去才知道，不能並排比較。
  - 失敗的版本佔一個版本號（v2 失敗，成功的是 v3），版本號因此不連續地代表「成功次數」。
  - 沒有分支（不能從 v1 另開一條線），也沒有刪除某個版本的入口（沒找到）。
  - 切換 Storyboard 的版本後，下游 Video 會被標「Out of date」，但不會自動重跑，使用者要自己判斷（這是優點，也是需要說明的地方）。
  - 一次實驗中（沒有重啟後端、已跑過多輪），Storyboard 的版本數在我只按了 Video 的 Generate 後也變多（v2），我沒查明原因，推測是上游過期時下游 Generate 會連帶重跑上游；最後一輪乾淨重拍沒有出現，因此不能確定。

## 8 組成影片

- 圖：`08-before-timeline-video-result.png`（Video 結果節點下方出現「Add to timeline」與「Make this shot's main clip」兩個按鈕，及左邊的「⋮⋮」拖曳把手，title 為 "Drag onto the timeline"）、`08-add-to-timeline-opens-editor.png`（按「Add to timeline」後**直接跳進全螢幕編輯器**）、`08-editor-clips-tab-5-step-bar.png`（5 步驟列 Clips / Captions / Logo / Export / Send，右上主要鈕「Export and send」，左邊預覽，右邊分頁 Clips / Text / Captions / Voiceover / Music / Brand，下方 Shot 時間軸、Split at playhead / Delete clip / Move earlier / Move later）、`08-back-on-canvas-after-add.png`（回畫布後，節點上的按鈕仍然寫「Add to timeline」）、`08-make-main-clip.png`（按「Make this shot's main clip」後按鈕變成灰色的「Main clip of this shot」，文字被裁切）、`08-editor-tab-text.png`、`08-editor-tab-captions.png`、`08-editor-tab-voiceover.png`（錄音 / 上傳 / AI voice 含「See the price」）、`08-editor-tab-music.png`、`08-editor-tab-brand.png`。GIF：`08-gif-add-to-timeline-editor.gif`（按 Add to timeline → 編輯器開啟，約 3.5 秒）。
- 做什麼：在畫布裡，Video 結果有三種把它放進影片的方式：拖到時間軸（把手）、「Add to timeline」、「Make this shot's main clip」（把這個 shot 的主片設為這個版本）。右上「Open editor」開啟全螢幕編輯器（頁面內，不是新視窗），時間軸以 shot 為單位排列。編輯器的素材清單（Footage）列出所有生成的片段，旁邊有 Add 鈕。
- 友善度問題：
  - 「Add to timeline」會把人從畫布整頁跳進編輯器，沒有預告；而回到畫布後，節點上沒有任何「已在時間軸」的標記，按鈕文字也沒變，使用者不知道有沒有成功。
  - 「Add to timeline」和「Make this shot's main clip」兩個動作的差別沒有說明；「Main clip of this shot」的狀態標籤在窄節點裡被截掉。
  - 步驟列的 Clips、Captions 在還沒做任何事的情況下就顯示打勾「(done)」，Logo 沒勾也能繼續送出，步驟列不是強制流程，也看不出打勾的依據。
  - 編輯器素材清單的每個片段標題都叫「Clip · Generated · 4s」，多次生成後無法分辨哪個是哪個（我跑過多輪時看到好幾條同名）。
  - 時間軸很簡單（單軌，沒有文字或音訊軌可視化），預覽文字「今天教你三」是字幕自動帶入。

## 9 交付

- 圖：`09-export-popover.png`（「Export and send」展開面板，內有「Export the video」鈕）、`09-exporting.png`（Exporting… "This usually takes under a minute."）、`09-export-done-send-blocked-no-link.png` 與 `09-send-click-link-off.png`（匯出完成：影片播放器、「Download」、「Send to Annie for approval」；按下去出現紅字「This client's review link is turned off. Make a new one on the Shortlist first.」）、`09-sent-waiting-for-approval.png`（建立分享連結後再送，顯示「Waiting for Annie's approval · sent 3 Nov」，步驟列 Export、Send 打勾）。
- 做什麼：右上「Export and send」開面板 → 匯出（約 20 秒內完成，沒有進度條）→ 預覽 + Download + 「Send to <核准者名字> for approval」。核准者是代理商老闆（預設「Annie」，名字在 All clients 頁的 Agency 設定）。客戶／老闆用 `/review/<token>` 連結免登入審閱並 Approve / Send back（本次沒有實拍審閱頁，已由 e2e F4 覆蓋）。
- 友善度問題：
  - 第一次送審會被擋：客戶的審閱連結預設是關閉的，錯誤訊息叫人去「Shortlist」建立新連結，而畫面上沒有「Shortlist」這個側欄項目（側欄是 Find ideas / Research / Compare videos / Plans …；連結實際在 Plans 看板的 "Get link"）。這是一個斷掉的流程；我是用 `POST /api/share` 補建連結後才送出去（腳本 API，不是 UI 操作）。
  - 匯出面板在同一個浮層裡擠了 Export、錯誤、預覽、Download、Send，視覺上蓋住右側的分頁列（Music、Brand 被遮）。
  - 「Annie」是寫死的預設名稱，在畫面上沒說清楚「Annie 是誰、會收到什麼」，只有送出前的灰字提示 "Annie is your approver. Change the name under Agency on the All clients page."
  - 沒有向客戶本人分享（只有給代理商老闆），這是產品設計決定而非 bug，但和競品的「分享連結給客戶」不同。

## 10 AI 代理

- 我們沒有。canvas 的原始碼（`src/components/canvas`、`src/lib/canvas`、`src/lib/strings/canvas.ts`）搜尋 agent / assistant / copilot 沒有命中；畫布上沒有「描述目標 → 自動建圖」的入口。最接近的是計畫頁的 "From script → Make shot list"（把腳本轉成 shot 清單，在畫布之前，不是在畫布裡操作節點），以及 Run the whole shot（一鍵串跑同一個 shot 的圖+影片，但圖是使用者自己搭好的）。

---

## 整體觀察（給比較用）

1. 強項：節點有類型化且有文字標籤的埠（Text / Start frame / Reference），拖線時相容埠高亮；成本與每日預算是一等公民（確認視窗、伺服器端上限）；結果、版本、失敗訊息都直接留在節點內；一路接到編輯器、匯出、送審是同一個產品內的完整閉環，競品多半停在匯出檔案。
2. 弱項：節點太窄（約 220px），model 名稱、預覽、版本膠囊都偏小；兩個入口的初始視角不一致；Start frame 不自動接；「Add to timeline」跳頁且沒有回饋；送審被擋的錯誤文字指向不存在的畫面；沒有 AI agent、沒有模板、沒有 minimap。
3. 未驗證：付費模型的價格行與每日額度文字、真實模型的等待時間與錯誤文案、審閱頁（客戶端）畫面、多客戶情境、手機版（不在範圍）。
