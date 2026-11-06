# 節點畫布 UI 流程：其餘六個產品（重點階段版）

圖片根目錄：`/Users/tommy/Desktop/my-vault/research/ui-flow-node-canvas-2026-11-03/`（下稱 `IMG/`）
研究日期：2026-11-03。不登入、不花費 API。只涵蓋重點階段：3 接線、4 模型、5 費用、6 結果、7 迭代、8 時間軸、10 代理。

---

## 1. Freepik / Magnific Spaces（`IMG/freepik-spaces/`）

### 來源
- Magnific Academy「Scaling workflows with Lists」，2026-05-29（官方）。https://www.youtube.com/watch?v=tl4EaQD72Nc
- Artturi Jalli「Magnific AI Tutorial: EVERY Node Explained (Freepik Spaces)」，2026-05-22（評測者）。https://www.youtube.com/watch?v=52WhUjkmsTk
- Magnific Academy「How to add and find nodes in Magnific Spaces」，2026-05-29，只確認上傳，沒有抽幀。
- 費用與抱怨（二手，網頁文字，未在畫面上驗證）：Kingy.ai、Imaginode、Magnific 官方 blog / credits 文件，由 WebSearch 摘要取得。官方 magnific.com 頁面對 curl 只回 JS 外殼，沒抓到官方圖。
- UI 版本風險：影片是 2026-05，產品已在 2026-04 由 Freepik Spaces 改名 Magnific，之後可能再改。

### 階段 3 加節點與接線
- `freepik-spaces/03-add-node-menu.jpg`（Artturi 約 1:07 https://www.youtube.com/watch?v=52WhUjkmsTk&t=67s）：在畫布空白處叫出可搜尋的節點選單，分 Basics（Text、Image Generator、Video Generator、Assistant、Image Upscaler、List）與 Media（Upload、Assets、Stock），上方有類別圖示列。
- `freepik-spaces/03-wiring-assistant-to-list.jpg`（Lists 影片約 1:32 https://www.youtube.com/watch?v=tl4EaQD72Nc&t=92s）：Assistant 節點把輸出設成「Export as list」，右側自動長出 List 節點並接好線。
- `freepik-spaces/03-list-node-empty-ports.jpg`（約 1:44）：空 List 節點，中間「No elements yet / Add text / Add media」，四周有文字、圖片、影片、音訊、SVG 的型別埠。
- `freepik-spaces/03-full-graph-overview.jpg`（約 4:00）：Assistant → List → Image Generator → List（輸出）的全貌，輸入 List 與輸出 List 各是一個節點。
- 對我們的啟示：「輸出模式選 list，就自動生出下游 List 節點並連線」是很順的接線方式；我們的 Shot → 分鏡圖也可以「一鍵長出下一個節點」。

### 階段 4 選模型
- `freepik-spaces/04-image-model-picker.jpg`（Artturi 約 2:07 https://www.youtube.com/watch?v=52WhUjkmsTk&t=127s）：生成節點內的下拉選單，有搜尋框、模型清單（Imagen 4、Nano Banana 2、Nano Banana Pro、GPT 等），每列右邊有一個小圖示（疑為「無限／額度」標記，畫面太小，未確認）。節點底部有 x1、Auto、1:1 比例、Run 按鈕。
- 對我們的啟示：模型選擇做在節點內部的下拉並可搜尋，一排模型旁放費用或標記，跟我們的 model picker 一致。

### 階段 5 費用
- 影片畫面沒找到費用顯示。
- 文字來源（未在畫面驗證）：Imaginode 稱 Run 鈕在每次生成前顯示 credit 費用；Magnific blog 稱搜尋面板 hover 模型會顯示 credit 與生成時間；Kingy.ai 列出 Nano Banana 2 約 75 credits、Kling 3.0 Motion Control Pro 約 450 credits／3 秒、Veo 3.1 4K 含音訊約 2,080 credits／4 秒（價格可能已變）。
- 抱怨（部落格軼事，非驗證資料）：意外扣款、有人回報一個 workflow 燒掉 41,000 credits 沒有警告；Flows 文件把「used more credits than expected」列為已知問題。批次（List）一次乘出 N 次生成，這正是預算爆掉的原因。
- 對我們的啟示：批次或 List 會放大費用，應在執行前顯示「N 次 × 單價 ≈ US$」的合計並要求確認，這是它最大的負面教材。

### 階段 6 結果
- `freepik-spaces/07-list-batch-image-generator.jpg`（Lists 約 3:25 https://www.youtube.com/watch?v=tl4EaQD72Nc&t=205s）：Image Generator 同時接 List（文字）與參考圖，提示詞用 @List #1、@Creation #1 這種提及語法；節點知道要「每個清單項目各跑一次」。
- `freepik-spaces/06-list-batch-results.jpg`（約 3:45 https://www.youtube.com/watch?v=tl4EaQD72Nc&t=225s）：結果進一個輸出 List，3x4 縮圖格，每張是獨立生成、保有完整尺寸；可從中拉出一張放到畫布繼續。
- 失敗狀態：沒找到。

### 階段 7 迭代
- 版本歷史／分支：沒找到。只有「Keep items / Replace items」下拉（List 收到新結果時是追加或覆蓋）。Artturi 提到 variations 功能（約 21:00 後），沒抽幀。
- `freepik-spaces/08-grouped-text-image-video-chain.jpg`（Artturi 約 6:52 https://www.youtube.com/watch?v=52WhUjkmsTk&t=412s）：Text → Image Generator → 第二張圖（把狗改黑）→ Video Generator（以圖為首幀）的串接，用群組框命名「Text, Image & Video」。
- 對我們的啟示：每張圖是下一個節點的輸入，所以「迭代」就是多接一個節點，不是同一節點內的版本。我們的 v1/v2 在同節點內，是差異點。

### 階段 8 時間軸／9 交付／10 代理
- 沒找到時間軸（Spaces 本身沒有，影片也沒展示）。有 Assistant 節點（LLM 聊天節點），算節點內助手，不是「描述目標就自動建圖」的代理。Flows（把 Spaces 流程包成可分享的流程）只讀到文件標題，沒抽幀。

---

## 2. NodeTool（`IMG/nodetool/`，AGPL，github.com/nodetool-ai/nodetool）

### 來源
- GitHub README（main 分支），2026-11-03 取得。https://github.com/nodetool-ai/nodetool
- 圖片：README 引用的 `marketing/public/hero-flow-readme.gif` 與四張 `surface-*-poster.webp`。
- 沒有找到 demo 影片（README 有 film.mp4 範例，是成品影片，不是操作錄影）。
- 重要風險：這些是行銷素材／官方海報，不是真實操作錄影，畫面可能是設計稿，未驗證與實際 UI 一致。

### 階段 10 代理（最有特色）
- `nodetool/10-agent-prompt.jpg`（hero gif 約 1 秒）：首頁一個大輸入框「What are we making today?」，下方 chip 顯示「Agent」「Claude Sonnet 5」，輸入「Make a 15-second short: a kid shi…」。
- `nodetool/02-beat-sheet.jpg`（hero gif 約 5 秒）：代理先產出 Beat sheet，每拍有時間碼、段落標籤（SETUP / SEARCH / REVEAL）與可點的實體標籤（Mia、Flashlight 等）。
- README 文字：「Agents drive the real editors. They wire the graph and run it. You take the wheel at any point.」也可由 CLI 或外部代理經 MCP 呼叫。
- 對我們的啟示：代理的產出是「可編輯的文件」（beat sheet → 實體 → 分鏡），不是一張看不懂的圖，使用者隨時接手。

### 階段 2 起手與 3 接線
- `nodetool/02-storyboard-cards-approve-stills.jpg`（storyboard 海報）：每個 shot 一張卡，有類型（Still／Clip）、秒數、完成勾、標題、下方實體 chips；頂部有 Agent 狀態、模型計數（Seedream 4 5/5、Seedance Pro 4/5）與「Animate approved」按鈕。
- `nodetool/03-nodes-graph-shot-workflow.jpg`（nodes 海報）：單一 shot 的節點圖：Entity（Mia、Moonlit 3D）＋ Prompt → Text to Image（Seedream 4）→ Image to Video（Seedance Pro）→ Timeline clip 輸出（V1 · Shot 2）。線有顏色，埠標有 image、prompt、reference、style、motion。右上「Done · 3.0 s」與 Run。
- 對我們的啟示：分鏡卡是主介面，節點圖是每個 shot 的「展開層」；輸出節點直接寫「Timeline clip V1·Shot 2」，就是我們的「Add to timeline」。

### 階段 5 費用
- 畫面沒找到。README 文字：「Cheap stages first. A Seedream 5 Lite still costs $0.03 on Kie.ai. Five seconds of Seedance 2 costs $1.03 (list prices via genspend.io, August 2026). Generate stills until one looks right, then animate that one.」
- 用 BYOK（自己的 API key），NodeTool 不收中間費；ChatGPT／Gemini 訂閱也可跑圖與影片。
- 對我們的啟示：用「先便宜的圖、核准後才花錢跑影片」當流程設計，並把單價寫進 UI。

### 階段 6 結果與失敗
- `nodetool/06-storyboard-rendering.jpg`（hero gif 約 15 秒）：同一張分鏡板上每張卡有狀態：Still（完成）、Rendering（含進度條）、Queued；頂部「Rendering stills · 1 of 5」。
- `nodetool/06-storyboard-animating.jpg`（約 17 秒）：靜幀全完成，卡上標示 Animating，頂部「Animating clips · 0 of 5」。
- 失敗狀態：沒找到。

### 階段 7 迭代
- 只有 README 文字：「Revise one shot, not the reel」（對單一 clip 跑 video-to-video 得到新 take，由你決定是否取代舊的）；Script 編輯器「changing the words flags that take stale」；時間軸「tweak the workflow and the clip flags itself stale」。無畫面佐證 stale 標記的外觀。
- `nodetool/08-script-takes-voice.jpg`（script 海報）：台詞列表，每行有 Take 1／Take 2 標籤、秒數、波形、Voice 按鈕，角色在左側。可見「take」是版本概念。
- 對我們的啟示：版本用「Take N」標籤放在內容旁，改上游就把下游標 stale，而不是自動重跑。

### 階段 8 時間軸
- `nodetool/08-timeline-final-cut-agent.jpg`（timeline 海報）：上方大預覽，右側聊天泡泡「Tighten the opening.」與「Shot 1 −1.1 s, rest rippled」，下方多軌時間軸：V1（按 SETUP／SEARCH／REVEAL／TWIST／FRIENDS 分段的縮圖片段）、A1 音樂波形、A2 旁白片段。
- README：「One click lays the shots onto a timeline … each clip still linked to its shot」；可在時間軸 clip 上綁 workflow，改參數就原地重生。
- 對我們的啟示：時間軸 clip 保持與原 shot 連結，這是我們「Make this shot's main clip」的完整版。
- 階段 9 交付：README 只有「export an MP4」，沒有審核／分享畫面。

---

## 3. Node Banana（`IMG/node-banana/`，MIT，github.com/shrimbly/node-banana）

### 來源
- GitHub README（master 分支）、CHANGELOG、docs/releases v2.3.0。https://github.com/shrimbly/node-banana
- reflctwillie「Node Banana - Installation guide for beginners」，2026-01-14（舊版 UI，v1）。https://www.youtube.com/watch?v=eAYOIX8fZn8
- 官網 nodebanana.app 的素材是行銷成品圖，不是 UI 截圖，不採用。
- 風險：影片是 2026-01 的舊介面，README 描述的是 v2（2026 下半年），兩者外觀不同。README 中「Edit Video」節點的畫面沒找到任何截圖或影片。

### 階段 1 進入
- `node-banana/01-entry-start-menu.jpg`（約 7:20 https://www.youtube.com/watch?v=eAYOIX8fZn8&t=440s）：啟動卡片四個選項：Blank canvas、Load workflow、Templates、「Prompt a workflow」(BETA)。

### 階段 3 加節點與接線
- `node-banana/03-wired-image-prompt-to-generate.jpg`（約 5:50 &t=350s）：兩個 Image 輸入＋一個 Prompt 接到 Generate 節點，Generate 內有模型下拉（Nano Banana Pro）、比例、解析度、Google Search 勾選；底部浮動工具列有 Image／Annotate／Prompt／Generate／Output／Run。
- `node-banana/03-add-node-menu-from-handle.jpg`（約 6:12 &t=372s）：從埠拖出線後放開，跳出「ADD IMAGE NODE」選單（Annotate、Generate Image、Split Grid Node、Output）。
- 對我們的啟示：從輸出埠拖線放開就彈出「相容的下一個節點」清單，只列型別合法的選項。

### 階段 5 費用
- `node-banana/05-large-workflow-header-cost.jpg`（約 7:42 &t=462s）：頂部標題列在工作流名稱旁有一個「$4.29」，推測是此工作流累計的花費（影片未說明，未驗證含義）。
- 影片只說「The API cost you money, but Node Banana is totally free」。
- 對我們的啟示：標題列常駐累計花費很便宜、很直接；我們可考慮同位置顯示「本專案已花 ≈ US$」。

### 階段 6 結果
- `node-banana/06-generate-result-expanded.jpg`（約 7:00 &t=420s）：Generate 節點內顯示結果縮圖，可展開成大圖（沙丘紅鞋），旁邊再接新的 Prompt 做第二輪修改。
- 失敗狀態：沒找到。

### 階段 7 迭代與 8 時間軸
- README（無畫面）：Batch runs（跑 N 次，每個輸出標示 run）、Asset library（每次生成自動存、可依標籤篩、能看是哪個 workflow 產生）、Array 節點、Group Locking（鎖定群組跳過執行）。
- 時間軸：README 的「Edit Video」節點可在時間軸上剪（trim、split、stack、音訊音量曲線），v2.3.0 加文字層與變速。畫面沒找到。
- `node-banana/00-readme-hero.jpg`：README 主視覺，是真實 v2 UI 的一張大工作流，分成命名的群組欄（Inputs、Baseline Prompt Builder、Hero Image Gen、Shotlist image gen、Video Prompt Builder、Video gen and trim、Stitch and output），右下有小地圖，底部工具列有 Run 下拉。這張最能展示「大型時尚廣告自動化」是用群組框分段，而且最後一欄「Video gen and trim → Stitch and output」。
- 階段 10 代理：README 稱 Agent 是聊天視窗，可建 workflow、改畫布與節點設定，跑在你自己的 Claude Code／Codex 訂閱上，不吃 API 額度；官網有一段示範文字「Swap to GPT Image 2.5, then add 9:16 crops」，沒有畫面。
- 對我們的啟示：用命名群組把長流程分段並可鎖定，能避免誤重跑；Agent 以「你已有的訂閱」運作，這是定價上的差異點。

---

## 4. Wireflow（`IMG/wireflow/`，wireflow.ai）

### 來源
- Wireflow AI「Nano Banana Veo Workflow: Your First AI Workflow in Wireflow」，2026-10-04（官方，最新）。https://www.youtube.com/watch?v=BIHe7xSrT0A
- 另外下載但未抽幀：「Edit Any Photo on an AI Node Canvas ... (Tutorial 02)」2026-06-24；「Weavy AI vs FLORA AI vs Wireflow」2026-09-28 下載失敗。
- 官網 wireflow.ai 首頁與 blog（文字）。

### 階段 1 進入／2 起手／10 代理
- `wireflow/01-entry-my-files.jpg`（約 0:38 https://www.youtube.com/watch?v=BIHe7xSrT0A&t=38s）：My Files 專案列表，頂部輸入框「Describe your idea and watch it come to life」；左下顯示點數餘額（約 8,658 credits）。
- `wireflow/01-empty-canvas-prompt-to-workflow.jpg`（約 0:44 &t=44s）：空畫布中央「What would you like to build?」，輸入框＋Generate，下有範例 chips（15-second product ad、Product photo variations…），下方「Set up your own AI」可選 Claude Code／Claude／ChatGPT。這是「描述目標就建圖」的代理入口，但影片沒展示結果，未驗證。
- 對我們的啟示：空畫布本身就是 prompt 框，提供範例 chips 與自帶 AI 設定。

### 階段 3 接線
- `wireflow/03-node-library-sidebar.jpg`（約 1:00 &t=60s）：左側圖示欄（Quick、Research、Tools、Image、Video、Audio…），展開為可搜尋的節點庫，Image Models 區是大卡片（GPT Image 2.5 Flare 等）。
- `wireflow/03-typed-ports-text-to-image-node.jpg`（約 1:55 &t=115s）：Nano Banana Lite 節點的埠旁有標籤（Prompt、Image 1、Reference Images），從埠 hover 顯示「Output / Text / prompt · TEXT / Not connected to anything」。
- 對我們的啟示：埠旁直接寫型別與名稱，hover 顯示連線狀態，比單純顏色更清楚。

### 階段 4 模型與參數
- `wireflow/04-param-side-panel.jpg`（約 2:30 &t=150s）：選取節點後右側出現參數面板：Aspect Ratio、Number of Images、Output Format、Safety Tolerance、Sync Mode。
- `wireflow/04-video-node-params.jpg`（約 3:45 &t=225s）：Veo 3.1 Lite（PRO 標籤）節點，面板有 Negative Prompt、Aspect Ratio 16:9、Duration 8s、Resolution 720p、Generate Audio；節點上是「Run Model」。

### 階段 5 費用
- 畫面上沒看到每次執行的費用估算；Run Model 鈕只寫「Run Model」。底部工具列有 credits 餘額（約 8,658 → 8,544，推測是跑完後扣減，未逐幀驗證）。
- 對我們的啟示：餘額在底部、不在鈕上，是反面例子；我們的鈕上放 ≈US$ 較好。

### 階段 6 結果
- `wireflow/06-video-result-in-node.jpg`（約 4:00 &t=240s）：Veo 節點內直接播放 8 秒影片（0:03/0:08），右上綠色勾表示完成；左邊接圖片節點。一個工作流頂部出現「Completed · 1m 38s」綠色提示（影片中截圖未保留）。
- `wireflow/08-full-graph-text-image-video.jpg`（約 0:20 &t=20s）：Text Input → Nano Banana Lite → Veo 3.1 Lite，另有第二個 Text Input 當影片提示；右上有 Share、Run Workflow、Publish。

### 階段 7 迭代、8 時間軸
- 版本：沒找到（底部有 Execution History 區塊，畫面太小，沒展開）。
- 時間軸：矛盾。官網 Video Maker 與 AI Movie Maker 頁說它是「生成畫布，不是逐格時間軸剪輯器」；filmmakers 頁說同一畫布上有 Video Editor 與多軌時間軸；首頁範本標示「Video Editor」節點；headless 頁說是沒有時間軸介面的 API。結論：有 Video Editor 節點，是否有可見的多軌時間軸，沒驗證，畫面沒找到。

---

## 5. VidMuse Freeform Canvas（`IMG/vidmuse/` 空）

- 幾乎沒有可看的畫面。vidmuse.ai 與其 blog 對 curl／WebFetch 回 Cloudflare 擋板／403，無法取得官方圖。
- 找到的 YouTube（FILM CRUX 2026-03-06、Muse Method 等）都是音樂 MV 流程，字幕沒提到 canvas／node。
- 僅有文字（WebSearch 摘要，VidMuse 自家 blog，屬行銷文字，未驗證）：Freeform Canvas 為節點式，含 Text／Image／Video／Audio 節點，把輸入連到影片節點生成；畫布負責規劃與生成，組裝在獨立的 Timeline；VidMuse 2.0 公告內建時間軸編輯器；另有一篇說 Free Canvas 模式排在 3.0，名稱與上線狀態不確定。
- 階段 3～10 全部：沒找到。
- 建議：需要時用瀏覽器（Playwright）看 vidmuse.ai/blog/vidmuse-freeform-canvas-guide，圖可能在該頁。

---

## 6. Martini / Astorie（`IMG/martini-astorie/`）

### 來源
- astorie 官方頻道「01 - Martini Kick Start 4K」，2025-10-01，2 分鐘。https://www.youtube.com/watch?v=ANQ46MuWWwc
- 文字：astorie.ai、martini.art/en/features、Future Tools 清單（2026-08）。
- 風險：影片是 2025-10，UI 為舊版；畫面字很小（1280x720 錄的全畫布縮圖）。martini.film 是否同一產品未確認，不採用。時間軸說法矛盾：astorie.ai 說剪輯控制（trim、in/out、轉場）在同一個表面；另一個 Martini 頁說雲端時間軸可匯出 XML 到 Premiere／DaVinci。上線階段沒查到。

### 階段 3 加節點與接線
- `martini-astorie/03-bottom-toolbar-node-types.jpg`（約 0:12 https://www.youtube.com/watch?v=ANQ46MuWWwc&t=12s）：底部工具列，「Edit mode (press Space+V)」提示，其後是 Hand、文字、圖片、影片、音訊、3D 等節點圖示。字幕說：點畫布並打字就能建立節點。
- `martini-astorie/03-two-image-nodes-wired.jpg`（約 1:10 &t=70s）：第二個圖片節點接在第一個後面（用來「精修」）。左下有 Shortcuts 面板，右上有 credit 餘額（約 8,705）。
- `martini-astorie/02-first-image-node-prompt-bar.jpg`（約 0:33 &t=33s）：空的圖片節點有「Upload／From Assets」，下方提示列有模型 chip（Seedream v4）、比例、數量、History、Enhance、Generate。
- 對我們的啟示：提示列浮在選取節點下方（模型、比例、History、Enhance、Generate 同一列），節點本身保持乾淨。

### 階段 4 模型與參數
- `martini-astorie/04-video-node-seedance-reference.jpg`（約 1:22 &t=82s）：影片節點接前一張圖當「Reference Image」，提示列顯示 SeedDance V1，旁有時長（5s）、History、Enhance、Generate。官方字幕：「Add a video node and connect it to the image」。這支影片只展示影片節點接圖片（沒展示不同輸入型別換模式；Martini 的「依輸入型別改變模式」說法只見於官方文字，未驗證）。

### 階段 5 費用
- 畫面沒找到單次費用；右上有 credit 餘額（8,705 → 8,645 一類的變動，未逐幀驗證）。

### 階段 6 結果
- `martini-astorie/06-video-generating.jpg`（約 1:40 &t=100s）：影片節點呈灰色空框，Generate 鈕變成「Generating」。
- `martini-astorie/06-video-result.jpg`（約 1:48 &t=108s）：影片節點內顯示結果，動作是角色向前跑。
- 失敗狀態：沒找到。History 按鈕可能是版本入口，但影片沒點開。

### 階段 7、8、9、10：沒找到（本影片不涵蓋；文字描述見上方來源風險）。

---

## 跨產品摘要：最強的 UI 模式

1. **提示列／參數面板跟著選取節點走**（Martini 浮在節點下方；Wireflow 右側面板；Freepik 與 Node Banana 在節點內）。節點本身保持乾淨。
2. **拖線放開就跳出相容節點清單**（Node Banana），輸出模式選 list 自動長出下游節點並連線（Freepik）。
3. **分鏡卡是主介面，節點圖是每個 shot 的展開層**（NodeTool）：卡上直接有 Still／Rendering／Queued／Animating 狀態與 Approve stills 才跑影片的門檻，是目前看到最貼近我們「Shot → 分鏡圖 → 影片」的設計。
4. **費用**：只有文字證據。NodeTool 用「先便宜靜幀、核准再貴的影片」控管；Node Banana 在標題列常駐累計金額（$4.29，含義未驗證）；Freepik 的批次 List 會乘出多次生成且被抱怨意外燒點數；Wireflow 與 Martini 只顯示點數餘額，沒有執行前估算。我們的「≈US$ 在鈕上＋批次合計確認」仍是差異點。
5. **時間軸連回 shot**（NodeTool）：clip 與原 shot 保持連結，上游改了就標 stale；代理可用自然語言剪（「Tighten the opening」）。
6. **代理**：NodeTool 的代理產出可編輯文件（beat sheet → 實體 → 分鏡），Node Banana 用自己的 Claude／Codex 訂閱，Wireflow 空畫布就是 prompt 框。
7. **大型工作流用命名群組框分段**（Node Banana、Freepik），並可鎖定群組。

## 缺口

- VidMuse：全部沒有畫面。
- Wireflow：時間軸／版本沒找到；Node Banana：Edit Video 節點沒畫面；Freepik：時間軸與版本歷史沒找到。
- 所有產品的「失敗狀態」都沒找到。
- 抓下來的原始影片檔留在 scratchpad（`.../scratchpad/v/`），沒有刪除（刪除指令被安全 hook 擋下），成品資料夾裡只有圖片。
