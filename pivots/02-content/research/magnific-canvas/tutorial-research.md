# Magnific Spaces 與 Figma Weave（Weavy）新手教學調查

調查日期：2026-11-06。目的：決定我們 demo 的 Canvas 區塊要放幾步引導、每步指向什麼、說什麼。
截圖目錄：`tutorial-assets/`（本檔用相對路徑引用）。功能截圖不在此範圍，見 `magnific-canvas-teardown.md` 與 `assets/`。

## 0. 先講結論（給 demo 決策用）

- 兩家的官方教學都不是「在畫面上疊 coachmark」，而是**官方文件的編號步驟 + 影片課程**。我們能直接觀察到的「畫面內導覽」為零（見第 6 節）。所以下面的步數是從文件和影片章節推出來的，不是量到的 in-app tour。
- Magnific 最短的官方教學是 `Getting started with Spaces` 的「Your first workflow」：**4 個 Step、共 13 個子動作**（Step 1 到 3 各 3 個，Step 4 有 4 個）。Step 標題就是一句話，子動作是一句動詞片語。
- Magnific 官方課程「Introduction to Spaces」是 13 集、1 小時 13 分，分 7 單元。第一集 `Navigating Spaces` 5:08，第二單元才教加節點和連線。
- Weave（Weavy）官方最短的是 `Tutorial 01`（3:33）；完整版是 58 分鐘、19 個章節，最後一直做到把 workflow 變成可部署工具。
- 對我們的建議（推論，非來源事實）：Canvas 引導做 **5 步**，對應 Magnific 的「導覽 → 加節點 → 連線 → 執行 → 看結果／比較版本」，再加我們獨有的「送到 Editor」。理由在第 5 節。

---

## 1. 來源（全部存取日 2026-11-06）

### Magnific
| # | URL | 標題 | 備註 |
|---|---|---|---|
| M1 | https://www.magnific.com/app/spaces/a324d283-aa0c-4a09-9090-73b13f07e260 | Untitled space - Spaces \| Magnific AI | 需登入，只看到 "Sign in to open this space"（t01） |
| M2 | https://www.magnific.com/ai/docs/getting-started-with-spaces | Getting Started with Spaces \| Magnific Docs | 主要來源。WebFetch 回 403，改用瀏覽器讀 |
| M3 | https://www.magnific.com/ai/docs/spaces-overview | Spaces overview（頁面內標題 "Spaces"） | 含 "Create your first space" 與 Templates |
| M4 | https://www.magnific.com/ai/docs/nodes-and-connections | Nodes & connections | 只讀了搜尋摘要與頁面抓取，未逐字整理 |
| M5 | https://www.magnific.com/academy/course/introduction-to-spaces | Introduction to Spaces \| Magnific Academy | 13 集課程目錄 |
| M6 | https://www.magnific.com/academy | Magnific Academy | 課程列表（AI Suite Fundamentals 28 集 2h10m；Introduction to Spaces 13 集 1h13m；Introduction to agents 4 集） |
| M7 | https://www.youtube.com/watch?v=SfBjTAjxwiU | Navigating Spaces \| Magnific Academy（5:08，2025 年上傳，約 24k 觀看） | 說明欄無章節；字幕抓不到 |
| M8 | https://www.youtube.com/watch?v=z1vtpCbJfU0 | How to add and find nodes in Magnific Spaces \| Magnific Academy（4:19） | 同上 |
| M9 | https://magnific.com/spaces | Freepik is now Magnific（Spaces 產品頁） | 有 "Discover and get started" 區塊 |
| M10 | https://www.magnific.com/blog/introducing-spaces/ | Introducing Spaces: the infinite canvas for creative workflows（2025-11-04） | 有 6 步 "How it works" |
| M11 | https://www.youtube.com/@magnific_ai | Magnific 官方 YouTube | 播放清單 "Magnific Spaces \| Magnific Academy"（15 支） |
| M12 | 第三方：https://www.youtube.com/watch?v=52WhUjkmsTk 所屬影片 "Magnific AI Tutorial: EVERY Node Explained (Freepik Spaces)"（Artturi Jalli，23 章） | 非官方，只用其章節標題作參考 | 章節名來自 YouTube 搜尋結果頁 |

### Figma Weave（原 Weavy）
| # | URL | 標題 | 備註 |
|---|---|---|---|
| W1 | https://www.youtube.com/watch?v=1pwXwbtqjBQ | How to Get Started with Figma Weave \| Complete First Steps Guide（58:13，2026-08-17，約 26k 觀看，官方頻道） | 說明欄有 19 個章節，全文已讀 |
| W2 | https://www.youtube.com/watch?v=ihOFi5lpQr8 | Tutorial 01: How to Build Your First AI Workflow in Weavy (The Right Way)（3:33，約 117k 觀看） | 說明欄列出涵蓋重點，另附可開啟的範例 workflow 連結 |
| W3 | https://help.weavy.ai/en/articles/12292386-understanding-nodes | Understanding Nodes \| Figma Weave's Knowledge Center（2026-03-29） | 官方說明文 |
| W4 | https://help.weavy.ai/en/collections/15341378-weave-s-editor | Weave's Editor（24 篇） | 其中 "Navigating Weave" 分組含 Navigating the Canvas、Connecting Edges (Wires)、Understanding Nodes 等 |
| W5 | https://www.figma.com/webinars/get-started-weave/ | Get started with Figma Weave | 需填表才能看，只讀到簡介 |
| W6 | https://weave.figma.com/ | Figma Weave \| AI-Powered Design Workflows, Built for Creative Pros | 行銷首頁 |
| W7 | https://app.weavy.ai/flow/AcmG6pds6B8AcDDt2bR9 | W2 附的範例 workflow | 被 Cloudflare 人機驗證擋住，未嘗試繞過，只確認連結存在 |

### 其他（只作輔助，沒深讀）
- Krea Nodes 官方文件 https://www.krea.ai/docs/user-guide/features/nodes ：沒有逐步教學，只有「基本三要素 / 畫布操作 / 整理」三段加三支嵌入短影片（t14）。
- Flora 官方 quickstart https://docs.florafauna.ai/getting-started/quickstart ：只有「註冊 → Welcome to your creative canvas!」，沒有步驟，所以沒選 Flora。

選 Weave 當對照的原因：官方頻道有明確章節與短版（3:33）和長版（58 分）兩個層級，且有「可複製的範例 workflow」。Krea 和 Flora 的官方教學內容太薄。

---

## 2. Magnific Spaces

### 2.1 教學入口的全貌（可確認）

| 層級 | 內容 | 形式 | 截圖 |
|---|---|---|---|
| 產品頁 | "Discover and get started — Follow the onboarding to begin, or check the how-tos if you want to jump straight into action."；下面是一支 Assistant → Video Generator 的示意影片（有播放鍵） | 產品頁區塊 + 影片 | `tutorial-assets/t02-magnific-spaces-landing-onboarding-video.jpg` |
| 模板 | 產品頁列 10 個模板：Adapt and animate ads、Create product variations in context、Create social media post、Generate 360º product view、Generate product scenes、Localize UGC-style video、Replace product in existing design、Restore your memories、Storyboard to motion、Transform product photo into studio-quality image | 卡片輪播，按 "Open in Spaces" | 同上（未截到輪播本身） |
| 文件 | Getting started with Spaces（見 2.2）、Spaces overview、Nodes and connections | 帶側欄的編號步驟頁 | t04、t05、t06、t07 |
| 課程 | Academy「Introduction to Spaces」13 集 | 影片 | t03、t12 |
| YouTube | 官方播放清單 15 支；Navigating Spaces 5:08、How to add and find nodes 4:19 | 影片 | t08 |

文件裡的原話提示（M3，Templates 段）：「If you're not sure where to start, pick any template and explore how it's built before editing it. Templates are a fast way to understand how nodes and connectors work together in practice.」意思是 Magnific 把「開模板自己看」當成官方建議的學習方式之一。

### 2.2 文件版「Your first workflow」步驟表（M2，逐字）

截圖：`tutorial-assets/t06-magnific-docs-first-workflow-text-image-upscaler.jpg`（文件頁用左側目錄 + 右側 "ON THIS PAGE"，每個子動作是一個編號圓圈，圓圈之間有一條細線連起來）。

| Step | 子動作與原文 | 指向的 UI | 呈現方式 |
|---|---|---|---|
| Step 1 — Add a Text node | 1. **Open Spotlight** "Press Space bar to open Spotlight." 2. **Search and place** "Type Text in the search field and press Enter." 3. **Write your prompt** "Click the text area on the node card and type your prompt — for example: A futuristic city skyline at golden hour, volumetric clouds, ultra detailed." | Spotlight 搜尋面板；Text 節點的文字區 | 文件編號清單；每個子動作 = 粗體動詞片語 + 一句說明 |
| Step 2 — Add an Image Generator | 1. **Open Spotlight again** "Press Space bar." 2. **Search for the node** "Type Image Generator — or pick a specific variant like Image Generator with Flux Ultra." 3. **Place and connect** "Press Enter to place it, then connect the Text node output port to the Image Generator prompt input port by dragging from right to left." | Spotlight；Text 節點右側 output port；Image Generator 左側 prompt input port | 同上 |
| Step 3 — Add an Image Upscaler | 1. **Open Spotlight** "Press Space bar one more time." 2. **Search and place** "Type Upscaler and press Enter." 3. **Connect** "Connect the Image Generator image output to the Upscaler image input." | 同上 | 同上 |
| Step 4 — Run the workflow | 1. **Click Run** "Click the Run button on the Upscaler node." 2. **Select Run Workflow** "This executes the entire chain from start to finish." 3. **Watch it flow** "The Text node passes your prompt to the Image Generator, which creates an image, which then flows into the Upscaler for enhancement." 4. **See the result** "The final upscaled image appears on the Upscaler node card." | Upscaler 節點上的 Run 按鈕；Run 選單（Run Node / Run Workflow / Run Downstream） | 同上 |

「Connecting nodes」另有一段 3 個子動作（t05）：**Hover over the output port** "Hover over the output port on the right side of the first node until it highlights." → **Drag to the input port** → **Release to connect** "A line appears between the nodes, representing the data flow."

可借用的規則（逐字，M2）：
- 連線顏色：Blue = Text、Purple = Image、Green = Video、Orange = Audio。
- "If you try to connect incompatible ports, the connection will not snap — the line disappears when you release."
- 版本比較：「Use the arrow buttons on a node card to browse previous generations. Every time you run a node, the result is saved to its history, so you can compare outputs or go back to an earlier version.」（這句正好對應我們的「比較版本」）。
- 節點狀態：Idle / Pending / Running / Paused / Cancelled / Completed / Failed。

### 2.3 文件版「The canvas interface」（M2）

先講畫面分三區再教操作：Canvas（"The infinite workspace where you place and connect nodes."）、Node panel — left sidebar、Toolbar — top bar（"Space title, run controls, sharing options, and zoom level."）。另外提到右下角 minimap。這是「先認地圖」的做法，而不是直接叫使用者點東西。

### 2.4 Spaces overview 的「Create your first space」（M3）：6 步

截圖：`tutorial-assets/t07-magnific-docs-spaces-overview-create-first-space-templates.jpg`

1. Open Spaces — "Go to magnific.com/pikaso/spaces or click Spaces in the top navigation."
2. Create a new space — "Click + New space to open a blank canvas."
3. Add your first node — "Click + on the canvas, use the left sidebar, or press Space or / to open Spotlight and search for the node you need."
4. Configure the node — "Set your inputs: write a prompt, upload an image, or adjust settings depending on the node type."
5. Connect nodes — "Drag from the output handle of one node to the input handle of another to create a connector."
6. Run it — "Click Run on the node or use the Run button in the toolbar to execute the workflow."

### 2.5 部落格版 "How it works"（M10，2025-11-04）：6 步

Start with a blank canvas → Add a text node with your idea（例句：「A minimal product photo of a ceramic mug on a wooden table, soft daylight, pastel tones, editorial style.」）→ Connect it to an image generator → Add an upscale node → Attach a video generator "to bring the scene to life" → "Group everything into a panel, duplicate, re-run, and export your campaign assets instantly."

### 2.6 Academy 課程「Introduction to Spaces」（M5）：7 單元 13 集

截圖：`tutorial-assets/t03-magnific-academy-introduction-to-spaces-course.jpg`、`tutorial-assets/t12-magnific-academy-hub-courses.jpg`

| 單元 | 集名（時長） |
|---|---|
| 01. Navigating Spaces | Navigating Spaces（5:08） |
| 02. Workflow fundamentals | How to add and find Nodes（4:19）；Understanding Nodes and connections（5:47） |
| 03. Collaboration | Sharing and collaborating（2:51） |
| 04. Image workflows | Starting a workflow with the Assistant（6:29）；Generating and editing images in a workflow（6:07）；Expanding an Image workflow with Variations（6:07）；Scaling workflows with Lists（6:03） |
| 05. Video workflows | Connecting images to video generation（4:57）；Combining and upscaling videos（4:32）；Extracting frames from video（5:15） |
| 06. Audio workflows | Adding audio nodes to a workflow（5:42） |
| 07. Complete workflows | From references to a complete workflow（9:55） |

觀察：課程順序是「導覽 → 加節點與連線 → 協作 → 圖 → 影片 → 音訊 → 整條串起來」。每集 2 到 10 分鐘，多數 4 到 6 分鐘。單元 05 第一集「Connecting images to video generation」就是我們 image→video 那一步的官方講法，但我沒看到該集內容，只有標題和長度。

課程介紹文（M5）的關鍵句：「each Node represents a step, ports define how information enters or leaves, and connections turn individual actions into complete workflows.」

### 2.7 官方 YouTube「Navigating Spaces」（M7）

只拿到下列可確認資訊：標題、5:08、說明一句「Learn how to navigate Magnific Spaces, explore the canvas, find key tools, and start building smoother AI creative workflows with Magnific.」。說明欄沒有章節，字幕抓不到（YouTube 沒給我可讀的 transcript）。第三方摘要網站（findtube.ai，頁面已 404）曾描述它涵蓋「首頁入口、專案列表、分享的 spaces、模板、搜尋」，**我沒能自己驗證**，只當線索。

### 2.8 第三方章節（M12，僅供對照，非官方）

"EVERY Node Explained" 的 23 章：Intro｜Basic Nodes｜Text Node｜Image Generator｜Video Generator｜Assistant Node｜The List Node｜Media Nodes｜Image Upscaler｜Image Editor｜Variations Node｜Designer Node｜Image to SVG Node｜SVG Generator｜Video Nodes｜Video Combiner｜Video Upscaler｜Media Extractor｜AI Voiceover｜AI Sound Effect Node｜Music Generator｜Utility Nodes｜Outro。這是「按節點類型逐個講」的結構，和官方「按任務流程講」不同。

---

## 3. Figma Weave（原 Weavy）

### 3.1 教學入口的全貌

| 層級 | 內容 | 形式 | 截圖 |
|---|---|---|---|
| 官方短片 | Tutorial 01，3:33，「New to Weavy? This is your starting point.」 | YouTube，附可開啟的範例 workflow 連結（W7，被 Cloudflare 擋，**未驗證內容**） | 無（頁面沒截） |
| 官方長片 | Complete First Steps Guide，58:13，19 章 | YouTube，附「Duplicate the workflow and explore」連結 https://figma.bot/WeaveFirstSteps | `tutorial-assets/t11-weave-official-first-steps-video-page.jpg` |
| 官方播放清單 | "Weave Tutorials: From Prompt to Production"，31 支（來自搜尋結果頁，未逐支確認） | YouTube | 無 |
| 說明中心 | Understanding Nodes；Navigating the Canvas；Connecting Edges (Wires)；Keyboard Shortcuts 等 24 篇 | 文字說明文，無編號步驟教學 | `tutorial-assets/t10-weavy-help-understanding-nodes.jpg`、`tutorial-assets/t13-weavy-help-weaves-editor-collection.jpg` |
| 網路研討會 | Get started with Figma Weave | 要填表才看得到 | 未看 |
| 首頁 | 只有行銷圖與 "Start Now" | — | `tutorial-assets/t09-figma-weave-landing.jpg` |

### 3.2 官方長片 19 章（W1，說明欄逐字）

| # | 時間 | 章節名 | 對我們有用的角度 |
|---|---|---|---|
| 1 | 00:00 | Welcome & what we're building today | 開場先講「今天要做出什麼」 |
| 2 | 01:20 | A tour of the Weave dashboard | 先認 dashboard（相當於 Magnific 的 Spaces home） |
| 3 | 02:44 | Creating your first canvas and node | 建第一個節點 |
| 4 | 05:12 | Comparing multiple image models at once | 一個 prompt 接多個模型，並排比較 |
| 5 | 07:17 | Writing a detailed, specific prompt | 把 prompt 從籠統改具體 |
| 6 | 09:30 | Editing images with an image-to-image sequence | 圖生圖 |
| 7 | 12:48 | Comparing edits with the Compare node | 比較版本（有獨立的 Compare 節點） |
| 8 | 14:21 | Adding a second character to the shot | |
| 9 | 20:10 | Color grading with Color Correction & Levels | |
| 10 | 22:29 | Cropping and building posters in the Compositor | |
| 11 | 28:54 | Recap: from prompt to finished composition | **階段回顧** |
| 12 | 29:25 | Turning a still into video | 圖生影片 |
| 13 | 32:21 | A second angle, music, and sound effects | |
| 14 | 35:50 | Editing it all together in the Timeline | 送進時間軸剪輯（相當於我們的 Editor） |
| 15 | 40:54 | Recap: everything we've built so far | **階段回顧** |
| 16 | 41:25 | Building an idea-generating machine | |
| 17 | 49:05 | Scaling with the Text Iterator | 批次化 |
| 18 | 54:20 | Turning your workflow into a deployable tool | |
| 19 | 57:06 | Recap and your next steps | **收尾 + 下一步** |

結構特徵：19 章裡有 **3 個 Recap**（11、15、19），每做完一大段就回顧。主線是「prompt → 多模型出圖並比較 → 編修 → 圖生影片 → Timeline 剪輯」，和我們的產品流程幾乎同形。

### 3.3 Tutorial 01（W2，3:33）涵蓋項目（說明欄逐字翻成條列）

1. Navigating the Weavy interface and menu system
2. Using a single prompt to test multiple image models（Flux、Recraft、SDXL、DALL·E、Imagine 等）
3. Connecting your generated image to multiple video models（Runway、Kling、Luma、Pixverse 等）
4. Adjusting model properties like prompt strength, aspect ratio, and more
5. Understanding the left-hand toolbox: prompts, in/out, compositing tools, 3D, and your saved models
6. Tips on file naming, gallery previews, and sharing workflows

說明欄另有「Try the workflow →」連結（開一個現成的範例 workflow）。**影片本身沒看，只依說明欄。**

### 3.4 說明中心「Understanding Nodes」（W3）

- 結構：What is a Node → Connecting Nodes → Types of Nodes → Adding Nodes to Your Canvas → Nodes Properties → Nodes Color Guide → Running Models，共 7 段。
- 連線：「Click and drag from an output handle on one node to an input handle on another」，要求內容類型相容。
- 新增節點：左側選單、在畫布按 Tab 搜尋，"Pro tip: Right-click anywhere on the canvas to see a menu of all nodes"。
- 屬性：「Click on a node to select it. The right-side panel will display all available parameters for that node.」
- 顏色：Green = Image、Purple = Text、Red = Video、Blue = Array/List/3D、Lime = Mask。
- 計費說明：生成式節點有 Run 鈕且花 credits；非生成節點不花。
- 執行：「Ensure all required inputs are properly connected → Click the "Run" button on the node」。

---

## 4. 兩邊並排：教學的步數與結構

| 項目 | Magnific Spaces | Figma Weave |
|---|---|---|
| 最短文件 / 影片教學 | 文件「Your first workflow」4 Step、13 子動作 | Tutorial 01，3:33，6 個重點 |
| 中等 | Overview「Create your first space」6 步；Blog 6 步 | 說明中心 Understanding Nodes 7 段 |
| 完整課程 | Introduction to Spaces：13 集 / 7 單元 / 1h13m | First Steps Guide：19 章 / 58 分，含 3 個 Recap |
| 起點 | 空白 space 或模板（"Use Template"） | 空白 canvas 或看範例 workflow（"Duplicate the workflow and explore"） |
| 最先教的動作 | 加節點（Spotlight：Space 或 /） | 建第一個 canvas 和 node，單一 prompt 接多模型 |
| 連線教學重點 | 拖 output port 到 input port；顏色代表類型；類型不符不會吸附 | 同左；顏色代表類型 |
| 比較版本 | 節點卡片上的箭頭瀏覽歷史 | 獨立的 Compare 節點（章節 7） |
| 影片→後製 | 課程「Combining and upscaling videos」等 | Timeline 剪輯（章節 14） |

---

## 5. 兩邊共通的模式，與對我們 demo 的可用性（推論）

以下「可用性」是我根據上面的來源做的推論，不是來源直接說的。

1. **先認地圖，再動手。** Magnific 文件先講畫面三區（Canvas / Node panel / Toolbar），課程第一集也是 Navigating；Weave 長片第 2 章是 dashboard 導覽。可用：第 1 步只指整體（Shot list 卡片區），一句話講這裡有什麼，不要求任何操作。
2. **一步一個動詞。** Magnific 每個子動作是「粗體動詞片語 + 一句話」（Open Spotlight / Search and place / Write your prompt）。可用：每步文案固定成「動詞標題 + 一句說明」，一句話內結束。
3. **把「連線」講成 output → input，並用顏色區分類型。** 兩家都這樣教。可用：在 Prompt 節點到圖片節點、圖片節點到影片節點的連線上各指一次，說明資料往右流。
4. **用同一個小例子貫穿。** Magnific 用 Text → Image → Upscaler 三節點；Weave 用同一個角色做完圖、影片、剪輯。可用：全程只用同一個 shot。
5. **比較是核心動作。** Magnific 用卡片上的歷史箭頭；Weave 單獨設 Compare 節點與一整章。可用：「比較版本」值得獨立成一步，不要附帶在影片生成那步。
6. **階段回顧。** Weave 長片每大段後有 Recap。可用：最後一步用一句回顧加下一步（送 Editor），而不是每步都回顧。
7. **給「複製範例」的出口。** Magnific 有 "Use Template"，Weave 有 "Duplicate the workflow and explore"。可用：guide 結束時提供「重新開始 / 自由探索」。
8. **錯誤處理只講規則，不當一步。** Magnific 只用一句「類型不符就不會吸附」。可用：不要為錯誤情境額外增加步驟。

### 建議的步數（推論，需你和 Veralyn 對齊）

| 步 | 指向 | 一句話的方向 |
|---|---|---|
| 1 | Shot list 匯入後的 shot 卡片區 | 每個 shot 一張卡，這裡是整個專案的地圖 |
| 2 | 某個 shot 的 Prompt 節點 | 在這裡寫（或檢查）這個鏡頭的描述 |
| 3 | 圖片生成節點（首格畫面）與 Prompt 到它的連線 | Prompt 連到圖片節點，按 Run 產生首格 |
| 4 | 影片生成節點與圖片到它的連線 | 首格圖接到影片節點，生成這個 shot 的片段 |
| 5 | 版本比較區 | 每次生成都會留下版本，並排比較再挑一個 |
| 6（可選） | 「送到 Editor」 | 挑好後送進 Editor 剪輯 |

核心是 5 步；若 demo 時間緊，第 2 步可以和第 3 步合併為「Prompt → 圖片」。Magnific 文件的最短教學是 4 個 Step，Weave 短片 6 個重點，所以 5 到 6 步落在兩家的範圍內。

---

## 6. 沒有觀察到的東西（重要）

- **Magnific 的 in-app 首次體驗完全沒看到。** 起始網址要登入，只顯示 "Sign in to open this space / Someone shared this space with you. Sign in to open it and start collaborating."（`tutorial-assets/t01-magnific-app-spaces-login-gate.jpg`）。依規定我沒有註冊、輸入帳密或繞過。因此以下都**未驗證**：歡迎彈窗、tooltip / coachmark 導覽、checklist、空畫布提示、Help 選單內容。
- 產品頁寫「Follow the onboarding to begin」，證明 Magnific 有「onboarding」，但文字沒說明內容；我搜尋也沒找到任何描述（單一第三方評論提到有個 "Welcome to Spaces" 模板像導覽，**只有一個來源，未驗證**）。
- Weave 的 in-app 首次體驗也沒看到：範例 workflow 連結被 Cloudflare 人機驗證擋住，我沒有嘗試繞過；也沒登入。
- 兩邊的 YouTube **字幕都沒抓到**，所以 Magnific 的 Navigating Spaces、Connecting images to video generation，以及 Weave 的 Tutorial 01，都只有標題、長度、說明欄，沒有影片實際講了什麼、畫面上標了哪個元素。
- Magnific Academy 每一集的獨立頁面沒有逐集讀（只讀了課程目錄）；`/academy/tutorial/navigating-spaces` 這個網址被轉回列表頁。
- Magnific 的 Nodes and connections（M4）、Weave 的 Navigating the Canvas / Connecting Edges 兩篇，沒有逐字整理。
- Krea 與 Flora 只看了文件，沒深入；Weave 的網路研討會需填表，沒看。
- 觀看數與「約 N 個月前」都來自 YouTube 搜尋結果頁，是 2026-11-06 當天的快照，之後會變。
- 沒有登入、沒有點任何會觸發生成或花 credits 的東西。

## 7. 檔案清單

截圖（`tutorial-assets/`，共 14 張）：
- `t01-magnific-app-spaces-login-gate.jpg` 起始網址的登入牆
- `t02-magnific-spaces-landing-onboarding-video.jpg` 產品頁 "Discover and get started" 下的示意影片
- `t03-magnific-academy-introduction-to-spaces-course.jpg` 課程頁
- `t04-magnific-docs-getting-started-with-spaces-top.jpg` 文件頁頂
- `t05-magnific-docs-connecting-nodes-steps.jpg` 連線三步
- `t06-magnific-docs-first-workflow-text-image-upscaler.jpg` 第一個 workflow
- `t07-magnific-docs-spaces-overview-create-first-space-templates.jpg` 建立第一個 space 與模板
- `t08-magnific-academy-navigating-spaces-video-page.jpg` Navigating Spaces 影片頁
- `t09-figma-weave-landing.jpg` Weave 首頁
- `t10-weavy-help-understanding-nodes.jpg` Weave 說明文
- `t11-weave-official-first-steps-video-page.jpg` Weave 官方長片頁
- `t12-magnific-academy-hub-courses.jpg` Academy 首頁
- `t13-weavy-help-weaves-editor-collection.jpg` Weave 說明中心分類
- `t14-krea-docs-nodes-workflows.jpg` Krea 文件
