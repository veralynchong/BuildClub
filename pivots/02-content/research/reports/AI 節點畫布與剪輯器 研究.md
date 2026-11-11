# 用鏡頭節點生成，用輕剪輯面板收尾

> 研究日期：2026-11-02（雪梨）。原始筆記：`research/research_notes/AI 節點畫布與剪輯器 研究/`（A1 畫布 SaaS UX、A2 剪輯器與「生成＋剪輯同畫面」、B 多模型後端、C1 開源畫布、C2 開源剪輯器）。
> 背景報告（不重複）：《分鏡原型-開源與社群》《電影式影片製作流程-競品UI參考》《AI 翻拍剪輯競品與熱門影片》。
> **專案性質**：Remake 是**非商業的學生 demo 專案**。所以本報告挑開源專案時，看的是適不適合、成熟度、多快能做出 demo，不把授權當門檻。AGPL、GPL、PolyForm Noncommercial、Sustainable Use、source-available 的專案都可以拿來參考，也可以直接用它們的程式碼。**授權註記（只寫這一次）：如果日後轉成商用，本報告推薦的每個元件都要重新檢查授權**，特別是 tldraw 的 hobby 授權、Remotion 超過 3 人的公司授權、AGPL 和 GPL 專案、PolyForm 授權、Twick 的 Sustainable Use 授權。
> **證據標籤**：〔已核對〕＝研究員 2026-11-02 開了原頁，或用 `gh api`／`npm view` 查過；〔廠商自述〕＝產品自己的頁面；〔競品所述〕＝對手寫的比較頁；〔第三方〕＝獨立評測、新聞或價格追蹤站，沒有對到原廠頁；〔僅摘要〕＝只看到搜尋摘要，原頁打不開（403、404 或 LinkedIn 擋）；〔程式碼〕＝撰寫本報告時直接讀了 Remake repo；〔推論〕＝本報告的判斷，不是任何來源的原話。撰寫本報告時沒有重開來源，「已核對」指的是研究員當天的紀錄。
> **存取日期**：除非另註，所有來源都在 2026-11-02 存取。**所有價格都是 2026-11-02 的快照，可能已經過時；放進預算前要回原廠頁再確認。**

## 結論與建議

**畫布用 React Flow（`@xyflow/react`），每顆鏡頭一個「鏡頭節點」，由現有的鏡頭清單自動生成。程式碼可以直接從 node-banana（同樣是 React 19 加 React Flow）和 bananaflow（把劇本拆成鏡頭、非同步工作輪詢）搬。後端自己寫一層薄的模型轉接層，影片走 fal 這類聚合商，圖片直連 Google Gemini API，模型清單存成資料。剪輯器首選 Remotion：學生團隊可用免費授權，用一份 React 組合同時做預覽和出片，現有的 ffmpeg 和 whisper.cpp 繼續負責每段拍攝的清理和轉錄。如果實測出片太慢，退回「瀏覽器預覽＋伺服器 ffmpeg 出片」，兩邊讀同一份 JSON。** 理由有四。

第一，市面上的節點畫布（Figma Weave、Runway Workflows、Krea Nodes、Freepik Spaces、Flora）已經長出同一套操作方式：輸入在左、輸出在右、連接埠依型別上色、執行前先顯示成本。照抄沒有風險。

第二，評測裡反覆出現的抱怨是「空白畫布不知從何下手」「模型太多不會選」「影片點數燒得難以預測」。Remake 已經有鏡頭清單，可以替使用者把畫布排好，這三個問題能在設計上先擋掉。

第三，影片生成的單價從每秒 $0.025 到 $0.75，差了 30 倍，而且模型一直在下架（OpenAI 的 Sora API 已在 2026-09-24 停止服務），所以模型一定要能透過設定替換。

第四，授權不再是限制後，剪輯器的瓶頸變成「預覽和成片長得不一樣」以及「做出一個像樣的 demo 要多久」。Remotion 是成熟度最高的選項（69.9k 顆星，2026-11-02 當天還有發版），而且讓預覽和出片共用同一份定義。

成本方面：6 鏡 30 秒的片子只做 AI 分鏡圖，每支約 $0.11–$0.80；每鏡都用中階模型生 5 秒影片約 $1.5–$4.2；用頂級 Veo 3.1 要 $12–$22.5，還沒算重生的次數。所以 AI 影片要由使用者自己選擇開啟，分鏡圖核可後才能生成，並設每日花費上限；demo 時優先播放已經快取的生成結果。

**跟前一份報告有衝突，需要你拍板。** 今天稍早的《分鏡原型-開源與社群》建議「做卡片清單，不做節點畫布」，理由是給客戶簽核的工具全部是線性清單，而且我們的流程沒有分支。〔推論〕兩者可以並存：製作端用畫布，因為 AI 圖、AI 影片、參考圖之間確實有上下游關係；客戶審核端仍然用卡片清單。鏡頭節點收合起來就是一張卡片（縮圖、狀態、成本），兩種畫面讀同一份鏡頭資料即可。

**另外有一個現有程式的風險要先查。** `backend/storyboard.py` 寫的是 `IMAGE_MODEL = "gpt-image-1"`〔程式碼〕，但 OpenAI 的棄用頁列出 `gpt-image-1` 已在 2026-10-23 停止服務〔已核對〕([OpenAI API Deprecations](https://developers.openai.com/api/docs/deprecations))。只要設定了 `FRAME_IMAGE_PROVIDER=openai`，AI 分鏡圖這條路現在很可能已經壞了。

| 元件 | 首選 | 次選或可搬的程式碼 | 不選（原因） | 主要依據 |
|---|---|---|---|---|
| 畫布函式庫 | `@xyflow/react` 12.12.1 ＋ Zustand ＋ `zundo`；React Flow Pro 範例對學生免費 | tldraw ＋ Image pipeline kit（hobby 授權，會加浮水印） | ComfyUI 前端（用 Vue，跟現有的 React 不合） | C1〔已核對〕 |
| 參考或可搬的程式碼 | `shrimbly/node-banana`（同樣是 React 19 ＋ React Flow） | `maxlibin/bananaflow`（劇本拆成鏡頭、非同步輪詢與收尾） | flowboard（依賴 Google Flow 的 Chrome 擴充） | C1〔已核對〕 |
| 模型接入 | 自寫轉接層＋模型註冊表；影片主走 fal、備援 OpenRouter；圖片直連 Gemini API | ComfyUI 後端（要自備 GPU 或付費 Comfy Cloud） | 用 LiteLLM 接影片（媒體支援沒確認）；Sora（已停止服務） | B〔已核對＋第三方〕 |
| 剪輯器組合與出片 | Remotion（免費授權），Player 負責預覽，renderer 負責出片 | `<video>`＋DOM 預覽、伺服器 ffmpeg 出片（沿用現有管線） | ffmpeg.wasm（比原生慢 12–25 倍）；Etro（只能即時錄製） | C2〔已核對〕 |
| 剪輯器介面起點 | 等程式層級拆解（見附錄）後，從 openvideodev/react-video-editor、Twick 二選一，或自己做 | Rescript（逐字稿刪字就剪片）的字幕編輯程式碼 | OpenCut、Omniclip（都在重寫，基底不穩） | C2〔已核對〕 |
| 交接 | 片段引用 `nodeId`＋`assetId`；預設順序＝鏡頭清單順序；成片回到畫布成為輸出節點 | — | 畫布和剪輯器各存一份順序 | A1、A2〔推論〕 |

---

## Part 1 節點畫布：把鏡頭清單變成一張已經接好線的圖

### 1A. 該照抄的 SaaS 模式：型別連接埠、執行前看成本、只重跑下游

**結論 1A-1：照抄現成的節點規則，但每條連線要明確標出「角色」。**

證據：Runway Workflows 的節點分成 Input、Model、LLM、Utility 四類，輸出只能接到同型別的輸入，也不支援條件分支或迴圈〔已核對〕([Runway API docs: Workflows](https://docs.dev.runwayml.com/workflows/))。畫面上用顏色區分型別：橘色是文字、粉色是圖片、綠色是影片〔第三方〕([AlternativeTo, 2025-10-24](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines))。Krea 也是輸入在左、參數放在節點內、輸出在右，接點依資料型別上色；從接點往外拖會列出能接的節點；型別不合時，Node Agent 會修正連線或插入一個轉換節點〔廠商自述，已核對〕([Krea docs: Nodes](https://www.krea.ai/docs/user-guide/features/nodes.md))。反例是 Higgsfield：同樣是「圖片接到影片節點」，接 Seedance 時代表參考圖，而且要在 prompt 裡寫明每張參考圖的作用；接 Kling 時卻代表起始畫格〔廠商自述，已核對〕([Higgsfield help: How do I use Canvas](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas))。

推理〔推論〕：依媒體種類上色是基本配備，但不夠。同一條線換了模型就代表不同意思，使用者只會覺得「生出來的東西怎麼不對」。Remake 的連線上應該直接寫出角色（起始畫格、結束畫格、參考圖、音訊）；使用者選了模型之後，該模型不支援的角色就變灰。

弱點：研究員沒有親手操作任何一個產品，連接埠規則都來自文件和評測。Freepik 和 Weave 的官方節點文件回傳 403，這兩家的型別規則沒有確認到。

**結論 1A-2：由鏡頭清單自動排好畫布，不給空白畫布；鏡頭節點是畫布上的基本單位。**

證據：評測對 Weave 的抱怨是學習曲線陡、光是選模型就要另外學、選錯會浪費點數〔第三方〕([Banani: Figma Weave Review, 2026-06](https://www.banani.co/blog/figma-weave-review))。對 Flora 的抱怨是很難理解怎麼把素材接到生成節點，而且不同模型的成本差到約 8 倍〔第三方〕([Banani: Flora review, 2026-06](https://www.banani.co/blog/flora-ai-review))。Freepik Spaces 的評測提到從空白畫布開始要花時間學，而且一步出錯會傳到所有下游的變體〔第三方〕([Kingy AI, 2026-03-18，2026-10-22 更新](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/))。2026 年各家的解法是讓代理人幫忙建圖，例如 Runway Agent 能用一句話建出整個 Workflow，建好的節點仍可手動修改（2026-07-23）〔廠商自述，已核對〕([Runway changelog](https://runway.com/en/changelog))。研究員看過的產品都沒有「鏡頭」型別的節點（A1 筆記；這是從「沒看到」推出的結論）。

推理〔推論〕：Remake 不需要代理人，因為鏡頭清單本身就是建圖的指令。每一鏡生成一個鏡頭節點。收合時只顯示縮圖、狀態和成本，也就是前一份報告提的卡片；展開後才看到「參考圖 → AI 分鏡圖 → AI 影片」這條鏈，以及上傳真人拍攝檔的位置。上傳位置直接接現有的 `takes` 表：每一鏡可以上傳多段拍攝，再挑其中一段〔程式碼：`takes.py`〕。bananaflow 已經做了「劇本 → Break into shots → 關鍵畫格 → 影片」，可以直接搬它的拆鏡和生成流程程式碼〔已核對〕([bananaflow](https://github.com/maxlibin/bananaflow))。

弱點：自動建圖會限制自由度。進階使用者若想在兩鏡之間插一個「抽格 → 重繪」的分支，需要另外開一塊可自由擺放節點的區域。這個需求有多大，沒有使用者資料。

**結論 1A-3：成本要在三個地方被看到：節點上的預估、批次執行前的總額確認、每日預算條。另外，分鏡圖沒核可之前，不能生成影片。**

證據：Weave 每次執行前會顯示大約要花多少點數，評測說實際扣的跟預估一致〔第三方〕([Banani](https://www.banani.co/blog/figma-weave-review))。Krea 的 Node Agent 在執行前列出每個節點的運算成本，使用者同意後才開始跑；修改上游時只重跑下游，沒變的結果直接用快取〔廠商自述，已核對〕([Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md))。Flora 在 2026 年把點數改成工作區共用的美元預算，用百分比條顯示〔第三方〕([IT Brief NZ, 2026-05-07](https://itbrief.co.nz/story/flora-launches-on-canvas-tools-dollar-usage-pools))。Runway 同時跑多個節點時，會打開一個 Active Runs 選單，可以追蹤或取消〔僅摘要〕([Runway help](https://help.runwayml.com/hc/en-us/articles/45763528999699)，原頁回傳 403)。Krea 會在所有協作者的畫面上同步顯示 queued → running → done，但整條鏈要靠發起者的分頁送出下一步〔廠商自述，已核對〕([Krea: Multiplayer nodes, 2026-10-22](https://www.krea.ai/blog/multiplayer-nodes))。

推理〔推論〕：除了每個節點的預估，還要一個「執行全部鏡頭：預估 $X」的確認視窗。影片的價錢是圖片的 10–50 倍（見〈成本估算〉），所以「分鏡圖核可了才能按生成影片」這道關卡本身就是最主要的成本控制。執行要放在伺服器上，關掉分頁也不會中斷，這樣就避開了 Krea 的弱點。

弱點：沒有任何來源描述執行失敗時畫面該怎麼呈現；Weave 預估準不準，只有一篇評測的說法。

**結論 1A-4：模型只給 3–5 個依用途分類的預設（例如「快速草稿」「最佳品質」「角色一致」），自己挑模型放在進階選項裡。**

證據：Krea 宣稱有 50 個以上的模型〔廠商自述〕([Krea blog, 2025-10-30](https://www.krea.ai/blog/top-node-based-ai-workflow-apps))。Krea 的模型節點會標出自身限制，例如最多能接幾張參考圖，從 1 張（Ideogram 3.0）到 15 張（Nano Banana Pro）不等〔已核對〕([Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md))。Weave 的評測說模型多到讓新手吃不消〔第三方〕([Banani](https://www.banani.co/blog/figma-weave-review))。

推理〔推論〕：模型標籤上要顯示它的能力（參考圖上限、是否支援起始／結束畫格、片長、有沒有聲音），因為這些能力決定了哪些連接埠可以用。

弱點：各家的模型清單大約每季就換一次，上面列的可能已經過時好幾週。

**結論 1A-5：每次生成都存成一筆不再修改的「生成紀錄」，節點只記住目前選的是哪一筆。**

證據：研究員看過的評測和文件裡，沒有一家描述過節點層級的版本切換或歷史介面（A1 第 2 節；這是從「沒看到」推出的結論）。Krea 只有工作區快照，最多每 5 分鐘一次、保留 5 天〔廠商自述，已核對〕([Krea: Multiplayer nodes](https://www.krea.ai/blog/multiplayer-nodes))。Google Flow 會保留原片，並在 History 面板列出舊版本〔已核對，官方〕([Google Flow Help](https://support.google.com/flow/answer/16935718))。

推理〔推論〕：「一鏡生成 3 個版本，挑一個往下傳」是競品做得最弱的地方，也是 demo 裡最好展示的差異點。做法很便宜：`generations` 表每生成一次就存一筆（素材、參數、成本），節點用 `selectedGenerationId` 指向被選中的那一筆。

弱點：研究員沒有親手操作競品，「沒有人做」可能只是文件沒寫。

### 1B. 開源畫布：React Flow 最合適，node-banana 和 bananaflow 的程式碼可以直接搬

**結論 1B-1：用 `@xyflow/react`，節點用自訂的 DOM 元件；React Flow Pro 的範例對學生免費，可以申請。**

證據〔已核對，gh 和 npm，2026-11-02〕：`xyflow/xyflow` 有 38,864 顆星，`@xyflow/react` 12.12.1 在 2026-11-02 當天發布，peer 依賴是 `react >=17`。2025 年回報的三個 React 19 相容性 issue 都已經關閉 ([GitHub](https://github.com/xyflow/xyflow), [npm](https://www.npmjs.com/package/@xyflow/react))。Langflow 和 node-banana 都是實際在用 React 19 加 React Flow 12 的專案 ([langflow package.json](https://github.com/langflow-ai/langflow/blob/main/src/frontend/package.json), [node-banana package.json](https://github.com/shrimbly/node-banana/blob/main/package.json))。官方的效能建議包括：自訂節點包 `React.memo`、用 selector 取資料而不是讀整個 nodes 陣列、收合時設 `hidden`、少用動畫和陰影 ([React Flow Performance](https://reactflow.dev/learn/advanced-use/performance))。Pro 方案提供範例原始碼，包括 Undo and Redo、Collaborative（React Flow 加 Yjs）、Auto Layout、Workflow Editor Template、AI Workflow Template；價格是每月 $169 或 $289，但**對學生、教育者和非商業開源專案免費** ([React Flow Pro](https://reactflow.dev/pro), [Pro Examples](https://reactflow.dev/pro/examples))。

推理〔推論〕：鏡頭節點裡要放 `<img>`、`<video>` 和 React 元件。這些用 DOM 節點（React Flow）放，比用 `<canvas>` 畫的節點（LiteGraph、Konva）方便得多。React Flow 也和現有的 React 19 加 Vite 前端直接相容。申請到 Pro 學生資格的話，AI Workflow 範本加上復原和自動排版的範例，大約能省 3–5 天（C1 筆記估計，沒有出處）。媒體一多，效能要靠一些規則：預設只顯示海報圖，滑鼠移上去才播放，畫面外的節點不載入。

弱點：沒有人測過放 20 個以上影片節點時的幀率。學生免費資格怎麼申請、要審多久，沒有查。

**結論 1B-2：node-banana 是主要的程式碼來源，bananaflow 補鏡頭拆分和非同步工作；tldraw 是備案；ComfyUI 不在 demo 範圍內。**

證據〔已核對〕：node-banana 有 1,657 顆星，v2.3.0 於 2026-10-23 發布。它用 Next.js 16、React 19、`@xyflow/react` 12.11.2、Konva 和 Zustand 5。節點有 Prompt、Generate Image、Generate Video、Video Trim、Frame Grab、Image Compare、Output Gallery 等；工作流存成可攜的 JSON；已接好 Gemini、Replicate、fal、Kie.ai、WaveSpeed 和 ComfyUI ([node-banana](https://github.com/shrimbly/node-banana))。bananaflow 用 Next.js 加 React Flow 加 Postgres/Drizzle，有各供應商的轉接器；Veo 這類長時間工作由程式內的排程器輪詢，再由收尾程序存檔；另外有劇本編輯器和「Break into shots」。但它只有 1 顆星 ([bananaflow](https://github.com/maxlibin/bananaflow))。tldraw 的 Image pipeline kit 已經能從連線建出 DAG、讓獨立分支平行執行、快取節點結果、顯示載入狀態，共有 17 種節點 ([tldraw image pipeline kit](https://tldraw.dev/starter-kits/image-pipeline))；hobby 授權可用於非商業用途，但必須保留浮水印 ([tldraw license](https://tldraw.dev/community/license))。ComfyUI 有 144.6k 顆星，提供 `/prompt`、WebSocket 進度、`/history` 等 API ([server routes](https://docs.comfy.org/development/comfyui-server/comms_routes))；它的 Comfy Cloud API 只開放給付費方案 ([Comfy Cloud docs](https://docs.comfy.org/development/cloud/overview.md)，僅摘要)；ComfyUI 的前端用 Vue ([ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend))。

推理〔推論〕：依「多快能做出 demo」排序：node-banana 的節點元件、供應商呼叫、JSON 存檔可以直接搬，但它綁在 Next.js 上，要把 API routes 改寫成 FastAPI。bananaflow 的鏡頭拆分和「輪詢 → 收尾存檔」流程最貼近 Remake，可以搬邏輯，但一顆星代表沒人實際用過，要自己讀懂、自己測。tldraw 的執行引擎現成可用（DAG、平行、快取），但它是自由白板的模式，跟「鏡頭清單驅動」的結構不合，所以只當備案。ComfyUI 要 GPU 或付費雲端，demo 期間不碰。

弱點：GitHub 搜尋的涵蓋範圍有限，可能漏掉新的小專案。node-banana 從 Next.js 拆出來要花多少工，沒有估過。

**結論 1B-3：存檔用 React Flow 原生的 `{nodes, edges, viewport}` 再加一個 `version`，放在 SQLite 的 JSON 欄位；demo 只做單人復原，不做多人協作。**

證據〔已核對〕：node-banana 把工作流存成可攜的 JSON ([README](https://github.com/shrimbly/node-banana))。`zundo` 是 Zustand 的單人復原／重做外掛 ([npm](https://www.npmjs.com/package/zundo))。多人協作可以用 Yjs 加 `y-websocket` 或 hocuspocus ([yjs](https://github.com/yjs/yjs), [hocuspocus](https://github.com/ueberdosis/hocuspocus))。

推理〔推論〕：JSON 裡只存素材 ID，不直接塞圖片或影片。Yjs 的伺服器要多跑一個 Node 程式，demo 不需要多人協作。

弱點：Python 端有哪些 Yjs 伺服器可用，沒有研究。

### 1C. 多模型後端：薄轉接層加模型註冊表，影片走聚合商，圖片直連

**結論 1C-1：所有平台都是「送出工作 → 拿到 ID → 等 webhook 或輪詢 → 一小時內把檔案搬走」，所以後端要有自己的工作表和記帳表。**

證據〔已核對〕：fal 送出後回傳 `request_id`，完成時打 webhook；同一個 ID 可能送來不只一次，處理要能重複執行而不出錯；簽章用 ED25519 加 JWKS；結果大約保存 1 小時，大檔可能只有約 6 分鐘 ([fal Webhooks](https://fal.ai/docs/model-apis/model-endpoints/webhooks))。Replicate 每分鐘最多建立 600 個工作，超過回 429；由 API 建立的輸入和輸出檔案 1 小時後自動刪除 ([rate limits](https://replicate.com/docs/topics/predictions/rate-limits), [webhooks](https://replicate.com/docs/topics/webhooks))。OpenRouter 有非同步影片 API（`POST /api/v1/videos`，再輪詢工作狀態），支援 `frame_images` 和 `input_references` 參數，回應裡附 `usage.cost`，建議每 30 秒輪詢一次 ([OpenRouter video docs](https://openrouter.ai/docs/guides/overview/multimodal/video-generation))。Remake 已經有「一個背景執行緒依序跑工作」的寫法（`renders.py` 的 render-worker、`channels.py` 的 channel-worker），也有每日預算錢包：`WALLETS` 從 `.env` 讀額度，超過就丟出 `OverBudget`〔程式碼〕。

推理〔推論〕：新增一張 `jobs` 表，欄位為 `id, node_id, provider, model_key, params_json, idempotency_key, status, provider_request_id, cost_estimate, cost_actual, output_asset_id`。送出時先預扣額度，完成時結算，失敗就退回。工作一完成就把檔案下載到自己的儲存空間，不要存供應商給的網址。demo 的 API 跑在本機（`localhost:8787`），收不到 webhook，所以只用輪詢就夠了。在 `WALLETS` 加一個 `ai_media` 錢包，沿用現有的每日上限機制。

弱點：fal 的速率和並行上限沒有公開；多個工作同時寫入時，SQLite 會不會出問題，要靠單一寫入佇列避開。

**結論 1C-2：模型清單是資料（存在 YAML 或資料庫），不寫在程式裡，因為 2026 年模型一直在下架。**

證據〔已核對〕：OpenAI 在 2026-09-24 停止 Videos API 和所有 Sora 2 模型；`gpt-image-1` 於 2026-10-23 停止服務；`gpt-image-1.5` 和 `gpt-image-1-mini` 將於 2026-12-01 停止 ([OpenAI Deprecations](https://developers.openai.com/api/docs/deprecations))。Google 的 Veo 3.1 *preview* 模型 ID 已在 2026-10-22 停止服務 ([Gemini API: Video](https://ai.google.dev/gemini-api/docs/video))；第一代 Nano Banana 將在 2027-03-15 停止 ([Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing))。

推理〔推論〕：每個 `model_key` 對應一組設定：轉接器、參數對照、計價公式、能力描述。計價公式至少要支援四種計法：每張、每秒、每百萬像素、每 token。

弱點：Nano Banana 2.1、Kling v3、MiniMax H3、Seedance 2.5 等模型名稱，都是照 2026-11-02 抓到的頁面寫的，沒有另外確認發布細節。

**結論 1C-3：影片走聚合商（fal 為主、OpenRouter 為備援），圖片直連 Gemini API；不要把媒體模型的路由交給 LiteLLM。**

證據：fal 的價目頁〔已核對〕([fal Pricing](https://fal.ai/pricing))列出的影片價格：Kling v3 每秒 $0.14、Kling v2.6 Pro $0.07、MiniMax H3 Max $0.05、H3 Max Turbo $0.025；圖片價格：Seedream V4.5 每張 $0.04、Nano Banana 2 每張 $0.08、FLUX 2 每百萬像素 $0.012。這一頁沒有列 Veo、Wan、LTX。Gemini API 直連的價格是 Nano Banana 2 在 1K 解析度每張 $0.067、Nano Banana Pro 每張 $0.134，用批次再打約五折〔已核對〕([Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing))。Runway 的 API 也轉賣 Veo 3.1：含聲音每秒 $0.40，Fast 版 $0.15〔已核對〕([Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/))。OpenRouter 的 Veo 3.1 是每秒 $0.50，1080p 是 $0.75〔已核對〕。Kling 官方 720p 不含聲音每秒 $0.084 這個數字，只來自第三方〔第三方〕([aireiter](https://aireiter.com/blog/kling-api-pricing), [costbench](https://www.costbench.com/software/ai-media-apis/kling-api/))。LiteLLM 文件列的圖片生成供應商裡沒有 fal、Replicate、Runway、Kling ([LiteLLM docs](https://docs.litellm.ai/docs/image_generation))。

推理〔推論〕：影片模型多、變動快、單價高，用一把金鑰就能接到多家，省下維護好幾套帳號和 webhook 的工，這比聚合商可能多收的差價划算。fal 上的 Kling v3 每秒 $0.14，對比第三方說的官方價 $0.084，但兩者規格不一定相同，不能直接比。圖片直連 Gemini 比 fal 便宜約 16%。node-banana 已經寫好 fal、Gemini、Replicate 的呼叫，可以照著改成 Python；現有的 `openai_image()` 也是不靠 SDK、直接發 HTTP 請求〔程式碼〕。

弱點：沒有任何來源比較過各家的可用率；各家的內容政策和拒絕率完全沒有研究；Veo 3.1 正式版的官方價格沒找到。

---

## Part 2 剪輯器：CapCut 等級、單一主軌、預覽和出片同一份定義

### 2A. 最小功能集：剪、字幕、文字、一條音樂軌、品牌素材

**結論 2A-1：v1 只做五件事：單一主軌的修剪、分割、排序；自動字幕（可改字、改樣式、改時間）；文字疊加；一條音樂或旁白軌；品牌面板。並且明白寫出「不做調色、特效、多軌」。**

證據：CapCut 網頁版的字幕流程是：在上方選單點「Subtitles」→「Automatic Captions」；點時間軸上的字幕塊，在右側面板改文字；拖字幕塊的邊緣調時間；右側的「Caption」分頁設定字型、顏色、動畫、位置；按 Cmd/Ctrl+A 可套用到所有字幕〔廠商自述，已核對〕([CapCut: AI Captions, 2026-03-25](https://www.capcut.com/resource/add-captions-with-ai))。Submagic 的功能清單以字幕為主：上傳就轉錄、動態字幕、一鍵加音樂、自動剪掉靜音、修剪〔競品所述〕([Submagic: Opus Clip vs Submagic](https://www.submagic.co/blog/opus-clip-vs-submagic))。Krea 把自家的新時間軸定位為「粗剪和以生成為主的工作」，調色、細緻混音和複雜合成「仍適合交給專門的後製軟體」〔第三方〕([AlphaSignal, 2026-09-17](https://alphasignal.ai/news/krea-agent-adds-a-built-in-video-timeline-to-skip-premiere-pro))。VEED 的品牌組合可以存 logo、色碼和字型檔，並套用到字幕〔第三方摘要〕([VEED blog](https://www.veed.io/blog/veed-101-business-brand-kit))；Submagic 可以替每個客戶各存一組品牌組合〔僅摘要〕([Submagic Help](https://care.submagic.co/en/article/how-to-use-brand-kit-in-submagic-16031pe/))。

推理〔推論〕：CapCut 的版面是「時間軸在底部，右側面板依選取的東西切換」，跟 Remake 規劃的右側收合面板形狀一樣。面板由上到下是：9:16 預覽、單軌縮圖條（字幕和文字用細條疊在上面）、屬性分頁（字幕／文字／音樂／品牌）。品牌面板只需要 logo（位置、大小、9:16 安全區）、2–5 個色碼、1–2 個字型檔，以及一組字幕樣式預設。

弱點：找不到任何「使用者最常用哪些功能」的數據，這個最小集合是從各家主打的功能反推的。

**結論 2A-2：字幕編輯做成「逐字稿模式」，可以直接搬 Rescript 的程式碼。**

證據：Rescript 有 1,023 顆星，用 Next 16 加 React 19.2。它在本機轉錄出每個字的時間戳記，「在逐字稿裡刪掉字，影片裡對應的片段就跟著剪掉」；授權是 PolyForm-Noncommercial，對非商業 demo 沒有問題〔已核對〕([rescript](https://github.com/wassgha/rescript))。`@remotion/captions` 提供字幕資料格式，以及 TikTok 風格的分頁顯示 ([npm](https://www.npmjs.com/package/@remotion/captions))。Remake 的 `subtitles.py` 已經從 whisper 的逐字時間產生 `{id, start, end, text}` 格式的字幕，也有寬度、秒數、停頓的分句規則〔程式碼〕。

推理〔推論〕：Rescript 的技術棧和 Remake 一樣是 React 19，「刪字就剪片」又剛好對上 Remake 已有的「依逐字時間剪掉贅詞」。搬它的逐字稿元件，接上現有的 whisper 輸出，是最快的做法。

弱點：Rescript 的元件和它的 Next.js 頁面、轉錄流程綁得多緊，沒有讀過程式碼（留給附錄的程式拆解）。

### 2B. 開源剪輯器：依適合度、成熟度、做出 demo 的速度重新排序

**結論 2B-1：組合和出片首選 Remotion；介面起點等附錄的程式拆解後，再從 openvideodev/react-video-editor、Twick 和自己做之間選一個。**

證據〔已核對，2026-11-02〕：

| 排名 | 專案 | 適合度 | 成熟度 | 做出 demo 的速度 | 用法 |
|---|---|---|---|---|---|
| 1 | **Remotion**（`@remotion/player`、renderer、`@remotion/captions`） | 高：React 19；剪輯 JSON 直接當 composition 的 props；預覽和出片用同一份定義 | 很高：69,900 顆星，v4.0.540 於 2026-11-02 發布 ([GitHub](https://github.com/remotion-dev/remotion)) | 快 | 個人和 3 人以下的組織適用免費授權 ([LICENSE](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md))；Player 做預覽，出片走伺服器（Node 加 Chromium），或在瀏覽器出片（4.0.491 起穩定，需要 Chrome 94+、Firefox 130+ 或 Safari 26+）([client-side rendering](https://www.remotion.dev/docs/client-side-rendering)) |
| 2 | **openvideodev/react-video-editor** | 高：README 寫「用 Remotion 做的線上 React 剪輯器，CapCut 和 Canva 的仿作」 | 中：1,829 顆星，沒有發過版，最後 push 是 2026-06-30 ([GitHub](https://github.com/openvideodev/react-video-editor)) | 可能最快（如果程式碼品質可以） | 候選的介面起點；是否仍依賴 Remotion、用哪個 React 版本，都還沒確認 |
| 3 | **Twick** | 中高：有工作室介面、可復原的時間軸、播放器、伺服器出片，專案格式是 JSON；`@twick/studio` 支援 React 18 和 19 | 中：546 顆星，v0.15.31（2026-03-18）([GitHub](https://github.com/ncounterspecialist/twick)) | 快 | 候選的介面起點；瀏覽器出片只支援 Chrome 和 Edge |
| 4 | **Rescript** | 高（只限字幕編輯） | 中：1,023 顆星 | 快 | 搬逐字稿元件（見 2A-2） |
| 5 | **Mediabunny** | 中：用來產生縮圖、波形、讀取媒體資訊 | 高：v1.65.0（2026-10-30），Remotion 的瀏覽器出片也是用它 ([GitHub](https://github.com/Vanilagy/mediabunny)) | 中 | 輔助用的零件 |
| 6 | OpenCut | 中 | 約 97k 顆星，但 README 寫「正在從頭重寫」，現在能用的是 opencut-classic ([GitHub](https://github.com/OpenCut-app/OpenCut)) | 慢（基底不穩） | 讀 classic 版學架構，不 fork |
| 7 | Omniclip | 中 | README 寫「2.0 開發中」，語音轉文字還沒做 ([GitHub](https://github.com/omni-media/omniclip)) | 慢 | 只當參考 |
| 8 | Shotstack Studio SDK | 中低：瀏覽器出片上限 5 分鐘，沒提到字幕 ([GitHub](https://github.com/shotstack/shotstack-studio-sdk)) | 活躍，但只有 60 顆星 | 中 | 不優先 |
| 9 | Etro、Diffusion Studio Core | 低：Etro 只能即時錄製出片；Diffusion Studio 沒有 React 綁定，2026 年沒有更新 | 低 | 慢 | 不用 |
| 10 | ffmpeg.wasm | 低：單執行緒比原生慢約 25 倍，多執行緒慢約 12 倍 ([performance](https://ffmpegwasm.netlify.app/docs/performance)) | 中 | — | 不當出片引擎 |

推理〔推論〕：授權不再是限制之後，Remotion 從「要付錢」變成「免費又最成熟」。它最大的好處是預覽和成片出自同一份 React 定義，原本「瀏覽器預覽和 ffmpeg 出片長得不一樣」的風險整個消失。文字疊加、logo、動態字幕都只是 React 元件，加功能比寫 ffmpeg 濾鏡加 Pillow 畫圖快很多。介面的部分，react-video-editor（建在 Remotion 上的 CapCut 仿作）和 Twick（自帶時間軸和出片伺服器）都有機會直接當起點，但兩者都是多軌設計，要砍成單軌。另外，前者沒發過版，後者星數不多，品質要讀了程式碼才知道，所以等附錄的程式拆解再決定。`app/trend-finder/package.json` 裡已經有 `@dnd-kit/core` 6.3.1〔程式碼〕，如果最後決定自己做介面，單軌排序不需要新增套件。

弱點：Remotion 伺服器出片要另外跑 Node 和 Chromium，速度沒有實測；瀏覽器出片只支援部分 HTML 元素，也會在每次出片時送出使用資料 ([client-side rendering](https://www.remotion.dev/docs/client-side-rendering))；Remotion 授權寫明 5.0 版「會稍微改變」。

### 2C. 預覽和出片：Remotion 一條龍，ffmpeg 退到前處理

**結論 2C-1：ffmpeg 和 whisper.cpp 繼續負責每段拍攝的清理（剪靜音和贅詞、加速、音量標準化）和轉錄；組合、疊字、字幕、出片交給 Remotion。如果實測出片太慢，退回「`<video>`＋DOM 預覽、ffmpeg 出片」。**

證據：Remake 現有的 `render_cut` 會接起各段拍攝、剪掉靜音和贅詞、加速、混入音樂、做兩次 loudnorm 並回報進度。因為本機的 ffmpeg 沒有 `subtitles` 和 `drawtext` 濾鏡，字幕是先用 Pillow 畫成圖片再疊進影片〔程式碼：`cutting.py`、`subtitles.py`〕。Remotion Editor Starter 預設在 Lambda 上出片，瀏覽器出片預設關閉 ([Editor Starter FAQ](https://www.remotion.dev/docs/editor-starter/faq))；Remotion 的伺服器出片用 FFmpeg 加 Node，沒有瀏覽器出片的元素限制 ([client-side rendering](https://www.remotion.dev/docs/client-side-rendering))。Twick 的文件也建議長片和正式出片用伺服器 ([Twick](https://github.com/ncounterspecialist/twick))。MDN 指出 WebCodecs 支援的編解碼器依裝置和瀏覽器而不同 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API))。

推理〔推論〕：把工作切成兩段。第一段是現有管線做擅長的事：把每段拍攝處理成乾淨的片段，並產生逐字時間。第二段由 Remotion 負責組合，同一份 composition 給 Player 預覽，也給伺服器出片。demo 只在 Chrome 上展示的話，甚至可以先用瀏覽器出片，連伺服器都不用架。代價是：整支片的 loudnorm 要嘛移到第一段對每個片段各做一次，要嘛出片後再用 ffmpeg 補做一次；現有的 Pillow 字幕會被 Remotion 的字幕元件取代。如果實測 30 秒 1080×1920 的影片出片太慢，就退回「`<video>`＋DOM 預覽、ffmpeg 出片」：文字和字幕仍由伺服器用 Pillow 畫，預覽時直接顯示伺服器畫好的疊加圖，以減少兩邊的落差。

弱點：Remotion 伺服器出片和瀏覽器出片的速度都沒有實測；Safari 上的預覽表現沒有測；把 loudnorm 改成逐片段處理，聽起來會不會不一樣，沒有驗證。

> **兩份建議的差異（需要團隊拍板）**
> 本節的建議和附錄的程式拆解（C3 筆記）選了不同的首選。這裡把兩個選項並列，本報告不替團隊決定。
> **選項 A：Remotion 一條龍（本節 2B-1、2C-1）。** 剪輯 JSON 直接當 composition 的 props，Player 負責預覽，renderer 負責出片，兩邊出自同一份 React 定義。好處：預覽和成片一致；文字、logo、動態字幕都是 React 元件，加功能快。代價：出片要另外跑 Node 加 Chromium，或只在 Chrome 上用瀏覽器出片，兩種速度都沒有實測；現有的 Pillow 字幕和整支片的 loudnorm 要改寫或移位。
> **選項 B：精簡的自製剪輯器，以 FastAPI＋ffmpeg 出片為準（附錄 A-4）。** 前端用 `<video>`＋DOM 疊加做預覽；伺服器把專案 JSON 翻成一個 ffmpeg `filter_complex` 出片，寫法照 Rescript 的 `trim → concat`；Remotion 只搬 `@remotion/captions` 的字幕型別和分頁邏輯。好處：沿用現有管線，不用多一套出片環境；避開各家瀏覽器出片常見的「卡住」「沒有聲音」問題〔已核對，issue 標題〕。代價：預覽和成片可能長得不一樣（字型、文字排版），要靠共用字型檔和相對座標壓低落差；字幕燒錄要用 ASS 或 `drawtext`，但本機的 ffmpeg 沒有 `subtitles` 和 `drawtext` 濾鏡〔程式碼〕，要先換 ffmpeg 版本或沿用 Pillow 畫圖。
> 〔推論〕兩者真正的分歧只有一個：預覽和出片要不要共用同一個引擎。〈建議的下一步〉第 5 項的實驗（30 秒 9:16 各出片一次並計時）可以同時當作這個決定的依據。另外，附錄查到 openvideodev/react-video-editor 已經改用 PixiJS＋WebCodecs，不再建在 Remotion 上，所以 2B-1 表格第 2 列「用 Remotion 做的」說法已經過時〔已核對〕。

---

## 組裝：只講畫布和剪輯器怎麼交接

**結論 3-1：交接靠一個明確的「加入剪輯」動作，加上「片段引用節點」的資料關係；成片再回到畫布，成為一個輸出節點。**

證據：Google Flow 用「Add to Scene」把片段加進場景，可以拖曳排序、用把手修剪〔已核對，官方〕([Google Flow Help](https://support.google.com/flow/answer/16935718))。Runway 用「Send to Editor」〔第三方〕([非官方課程頁](https://lecture2-3d3.pages.dev/en/docs/runway/runway-editing/))。ElevenLabs 是先在 Flows（畫布）做，再「export to Studio」（時間軸）〔廠商自述〕([ElevenLabs help](https://elevenlabs.io/docs/help-center/product/flows-image-video/flows/how-does-flows-differ-from-studio.md))。Krea 在時間軸上手動排列和修剪不扣點數，呼叫模型才扣〔第三方〕([AlphaSignal](https://alphasignal.ai/news/krea-agent-adds-a-built-in-video-timeline-to-skip-premiere-pro))。Flora 剪好的片會回到畫布，成為一般的影片輸出節點〔僅摘要，只有一則 LinkedIn 貼文〕。研究員沒找到任何產品是「節點畫布當主畫面、右側放收合式剪輯面板」〔推論，從「沒看到」推出〕。

推理〔推論〕：交接遵守四條規則。

**一、順序只有一個來源。** 剪輯軌的預設順序就是鏡頭清單的順序。在剪輯器裡拖曳換位置只寫進剪輯 JSON，不回頭改鏡頭清單。

**二、片段用引用，不複製素材。** 每個片段記下 `nodeId` 和當下的 `assetId`。節點換了選中的版本時，剪輯器不會自動跟著換，而是在那個片段上顯示「這一鏡有新版本，要套用嗎？」；如果新版本比原本的修剪範圍短，就標出來。

**三、真人拍攝和 AI 片段在剪輯器裡一視同仁。** 鏡頭節點的輸出二選一：選中的拍攝檔，或選中的 AI 影片。只有分鏡圖的鏡頭先放靜態圖片佔位。現有的 `chosen_ids()` 已經會依鏡頭順序取出選中的拍攝檔〔程式碼：`renders.py`〕，只要把來源擴充成兩種。

**四、反向動作。** 在剪輯器裡對片段按「重生這一鏡」，會跳回畫布上的那個節點並展開，成本控制只需要放在畫布一處。

如果採用 Remotion，下面的 `edit` 文件就直接當成 composition 的 props。

共用 JSON 的最小結構〔推論〕。畫布和剪輯是兩份文件，靠 `nodeId` 連接；`captions.cues` 沿用 `subtitles.py` 現有的格式：

```json
{
  "canvas": { "version": 1,
    "nodes": [{ "id": "shot-3", "type": "shot", "position": {"x": 0, "y": 600},
      "data": { "shotIndex": 3, "mode": "filmed | ai_video | image_only",
                "selectedGenerationId": "gen_81", "chosenTakeId": null, "status": "done" } }],
    "edges": [{ "id": "e1", "source": "ref-1", "target": "shot-3", "role": "start_frame" }] },
  "edit": { "version": 1, "width": 1080, "height": 1920, "fps": 30, "brandKitId": "client-a",
    "clips":    [{ "id": "c3", "nodeId": "shot-3", "assetId": "asset_552", "in": 0.4, "out": 4.6 }],
    "overlays": [{ "type": "text", "start": 0.0, "end": 2.0, "text": "…", "styleId": "client-a/title" }],
    "captions": { "styleId": "client-a/caption", "cues": [{ "id": 1, "start": 0.2, "end": 1.8, "text": "…" }] },
    "audio":    [{ "assetId": "music_12", "start": 0, "volume": 0.3, "duck": true }] }
}
```

弱點：「引用＋提示新版本」是設計假設，沒有經過使用者驗證；「成片回到畫布」只有一則社群貼文的摘要可以佐證。

---

## 成本估算

〔推論〕以下金額是本報告用 B 筆記的單價自己算的，不是任何來源公布的數字。單價都是 **2026-11-02 的快照**；標〔第三方〕的單價沒有對過原廠頁。假設一支 30 秒的片 = 6 鏡 × 每鏡 5 秒；分鏡圖尺寸是 1024×1536（現有程式用的尺寸〔程式碼〕），約 1.57 百萬像素。

| 情境（每支片） | 模型與單價 | 生成一次 | 每鏡重生到 3 次 |
|---|---|---|---|
| 只做 AI 分鏡圖 | FLUX 2，每百萬像素 $0.012（fal）→ 每張約 $0.019 | $0.11 | $0.34 |
| 只做 AI 分鏡圖 | Seedream 4.5，每張 $0.04（fal） | $0.24 | $0.72 |
| 只做 AI 分鏡圖 | Nano Banana 2，1K 每張 $0.067（Gemini 直連） | $0.40 | $1.21 |
| 只做 AI 分鏡圖 | Nano Banana Pro，每張 $0.134（Gemini 直連） | $0.80 | $2.41 |
| 混拍：真人 4 鏡＋AI 影片 2 鏡 | Kling 2.6 Pro，每秒 $0.07（fal）× 10 秒 | $0.70 | $2.10 |
| 全部 AI 影片，中階 | MiniMax H3 Max，每秒 $0.05（fal）；或 Runway Gen-4 Turbo，每秒 $0.05 | $1.50 | $4.50 |
| 全部 AI 影片，中階 | Kling 3.0 720p，每秒 $0.084〔第三方〕；或 Veo 3.1 Fast，每秒 $0.10（Runway） | $2.52–$3.00 | $7.56–$9.00 |
| 全部 AI 影片，偏高 | Kling v3，每秒 $0.14（fal） | $4.20 | $12.60 |
| 全部 AI 影片，頂級 | Veo 3.1 含聲音，每秒 $0.40（Runway）到 $0.75（OpenRouter 1080p） | $12.00–$22.50 | $36–$67.50 |

工具本身幾乎不花錢：React Flow 核心免費，Pro 範例對學生免費；Remotion 在免費授權範圍內；tldraw 的 hobby 授權也免費，但要保留浮水印。伺服器出片只用自己機器的 CPU，沒有實測數字。

〔推論〕對 demo 來說，真正要控制的是 AI 影片的花費。準備 3 支示範片，只做分鏡圖大約 $1–$7，全部用中階 AI 影片並重生到 3 次大約 $13.5–$27，用頂級模型就超過 $100。建議如下：每日 `ai_media` 上限從小額開始（例如 $5，這是建議值，沒有來源）；demo 現場優先播放事先生好、存在快取裡的版本，只有在需要展示「現場生成」時才即時呼叫，而且用中階模型。根據既有的專案慣例，花費低於 US$1 的實測可以直接跑。

---

## 風險與未驗證項目

| 項目 | 為什麼重要 | 怎麼確認 |
|---|---|---|
| `storyboard.py` 用的 `gpt-image-1` 已在 2026-10-23 停止服務〔已核對棄用頁；程式碼〕 | 現有的 AI 分鏡圖功能可能已經壞了 | 看 OpenAI 棄用頁，或呼叫一次 API（花費低於 $0.02） |
| 價格和模型一季一變；Kling、Seedance、Veo 正式版、Luma、MiniMax 的價格只有第三方資料 | 成本估算可能差到一倍以上 | 正式用之前，逐一打開原廠價目頁確認 |
| 沒有親手操作過任何 SaaS 的介面；沒抓到 Reddit 或 X 的原始討論串 | 所有 UX 結論都來自文件和評測，其中不少是競品寫的 | 試用 Weave 免費版和 Krea；用 `reddit-x-research` 補抓 |
| Flora 的時間軸只有一則 LinkedIn 摘要佐證 | 它是「成片回到畫布」唯一的先例 | 開 Flora 官網或直接試用 |
| React Flow 放 20 個以上影片節點時的效能沒測過 | 鏡頭多的片子可能卡頓 | 花 1 天做效能實驗（見下一步） |
| Remotion 出片速度（伺服器和瀏覽器）沒測過 | 決定剪輯器要走 Remotion 還是 ffmpeg | 30 秒 9:16 的影片各出一次並計時 |
| react-video-editor、Twick 的程式碼品質不清楚 | 決定剪輯器介面要用哪個當起點 | 等附錄的程式拆解 |
| bananaflow、node-banana 搬進 Vite＋FastAPI 要花多少工，沒估過 | 影響畫布的時程 | 讀程式碼，列出要改的檔案 |
| fal 的速率上限、各家內容政策、拒絕率都沒查 | demo 現場可能被限流或拒絕生成 | 用中階模型先跑一輪；準備快取好的備援版本 |
| SQLite 在多個工作同時寫入時的表現 | 工作狀態可能遺失 | 用單一寫入佇列 |
| 跟《分鏡原型-開源與社群》的建議互相衝突 | 產品方向要一致 | 由你決定（建議：製作用畫布、審核用清單） |
| 授權只按非商業用途評估 | 日後轉商用的話，大多數推薦都要重新檢查 | 轉商用時重查（見開頭的授權註記） |

---

## 建議的下一步

1. **先查 `gpt-image-1`。** 看 [OpenAI 棄用頁](https://developers.openai.com/api/docs/deprecations)，或呼叫一次 API。如果已經停用，分鏡圖改接 Gemini Nano Banana 2（每張 $0.067；改用哪把金鑰需要你同意）。
2. **決定畫布和清單怎麼分工。** 確認「製作用畫布、審核用卡片清單」之後，再更新 `docs/` 裡的決策紀錄。
3. **申請 React Flow Pro 學生資格，同時做畫布實驗（1–2 天）。** 新增 `@xyflow/react`、`zustand`、`zundo` 需要你同意。用現有的鏡頭清單自動生成 6 個鏡頭節點，節點元件從 node-banana 搬過來改；再放 20 個帶海報圖的影片節點，量測幀率。
4. **後端實驗（1–2 天）。** 建 `jobs` 和 `generations` 兩張表，以及 YAML 格式的模型註冊表。先寫 fal 一個轉接器，用輪詢取結果，供應商呼叫的寫法參考 node-banana 和 bananaflow。預估和實際成本都記帳，`WALLETS` 加一個 `ai_media` 錢包。實測生成 1 張圖和 1 段 5 秒的中階影片，總花費低於 US$1。
5. **剪輯器二選一的實驗（1 天）。** 把剪輯 JSON v0 寫成 Pydantic 模型和 TypeScript 型別，用 Remotion Player 加一個 composition 接上 3 個真實片段、字幕和 logo；30 秒 9:16 的影片在伺服器和瀏覽器各出片一次並計時，再和現有的 `render_cut` 比較，然後決定走 Remotion 還是 ffmpeg。
6. **讀完附錄的程式拆解後，選剪輯器介面的起點**（react-video-editor、Twick 或自己做），把它砍成單軌，再搬 Rescript 的逐字稿字幕編輯；「加入剪輯」和「重生這一鏡」兩個交接動作一起做。
7. **補研究（選做）。** 用 `reddit-x-research` 抓 Weave、Flora、Krea 使用者的原始抱怨。

## 結論

這次研究最重要的發現是：**Remake 的優勢不在畫布或剪輯器本身，而在「鏡頭」這個單位。** 通用畫布最大的痛點是空白畫布、模型太多、成本失控、不知道該選哪個版本，原因都是它們不知道使用者要做什麼。Remake 已經有鏡頭清單、每鏡選定的拍攝檔和字幕管線，所以畫布可以自動排好，剪輯軌的順序也已經決定好了。授權限制拿掉之後，開源專案的角色也變了：node-banana、bananaflow、Rescript、Remotion 不只是參考，而是可以直接搬進來的程式碼。所以 demo 真正的工程量，會集中在把這些程式碼接進 Vite 和 FastAPI，以及後端的工作表、記帳表和模型註冊表。

第二個發現是**成本結構決定了 demo 該怎麼展示**。分鏡圖便宜到可以隨便生成，AI 影片卻是分鏡圖的 10–50 倍，模型也每季在換。所以「AI 影片由使用者自己選擇開啟」不只是產品偏好，也是預算上的必要；「分鏡圖核可後才能生成影片」既是拍攝現場的指引，也是最有效的花費關卡。demo 現場則應該以快取好的結果為主，只示範一次即時生成。

## 附錄：開源剪輯器怎麼做（程式拆解）

研究日期 2026-11-02。方法：淺層 clone（`--depth 1`，不安裝、不執行任何程式），加上 `gh api` 和 Remotion 文件原始碼（`packages/docs/docs/**`）。原始筆記：`research/research_notes/AI 節點畫布與剪輯器 研究/C3_editor_code_dissection.md`。授權照開頭的註記，不列為門檻。

**結論 A-1：沒有任何專案能直接套進「React 19＋Vite＋FastAPI ffmpeg」。能搬的是小模組（資料模型、剪切邏輯、ffmpeg 指令、字幕格式），不是整個剪輯器。**

證據〔已核對，clone、`wc -l` 與 `gh api`，2026-11-02〕：

| 專案 | 技術棧 | 資料模型 | 預覽 | 出片 | 字幕 | 規模（TS 行數／星數） |
|---|---|---|---|---|---|---|
| [opencut-classic](https://github.com/opencut-app/opencut-classic) | Next 16＋React 19＋Zustand 5＋mediabunny＋opencut-wasm（Rust） | `SceneTracks { overlay[], main, audio[] }`；元素有 `startTime`、`duration`、`trimStart`、`trimEnd`（以 tick 計） | 主時鐘（`performance.now()`）＋canvas 每幀繪製 | 瀏覽器，mediabunny `CanvasSource`；issue 有「卡在 5%」「沒有聲音」([#914](https://github.com/OpenCut-app/OpenCut/issues/914), [#915](https://github.com/OpenCut-app/OpenCut/issues/915)) | 瀏覽器 Whisper，只有段落時間，平均分給每個字 | 約 91k＋4.3k Rust／293 |
| [openvideodev/react-video-editor](https://github.com/openvideodev/react-video-editor) | Next 16＋React 19.2＋Zustand 5＋PixiJS 8＋`@openvideo/*`（引擎只在 npm，原始碼找不到） | 扁平的 `clips` 清單，時間單位是微秒 | PixiJS 畫布 | 瀏覽器 WebCodecs | Deepgram 轉錄；逐字分組，`isKeyWord` 標出重點字 | 約 44.5k／1,829 |
| [Twick](https://github.com/ncounterspecialist/twick) | 18 個套件的 monorepo；fabric 6.6＋Motion Canvas 衍生的播放器 | `ProjectJSON { tracks[ { elements[ {s, e, …} ] } ] }` | live-player | 瀏覽器（只限 Chrome、Edge；[#248](https://github.com/ncounterspecialist/twick/issues/248) 音訊合併卡住）或伺服器 render-server | 段落級的 `CaptionElement` | 約 45.6k／546 |
| [Omniclip](https://github.com/omni-media/omniclip) | 不是 React（`@benev/slate` web components）＋PixiJS 7 | `effects[]`，每筆有 `start_at_position`、`start`、`end`（毫秒） | worker 裡的 Pixi 合成 | WebCodecs＋ffmpeg.wasm | 語音轉文字還沒做 | 約 45.1k／1,468 |
| [Rescript](https://github.com/wassgha/rescript) | Next 16＋React 19.2＋Zustand 5＋transformers.js＋ffmpeg.wasm | 字詞清單 `Word { start, end, deleted }`＋`ManualCut`，推出要保留的區段 | 播放時即時跳過被剪掉的部分 | ffmpeg 指令：`trim`／`atrim` → `concat`（[`exportArgs.ts`](https://github.com/wassgha/rescript/blob/main/lib/exportArgs.ts) 383 行，有單元測試） | 逐字時間；刪字就剪片；可拖字的邊界 | 約 30.5k／1,023 |
| [Remotion Editor Starter](https://www.remotion.pro/editor-starter) | 付費 $600，原始碼不公開；React 19，狀態用 `useState`／Context | `tracks`、`items`、`assets`；同一軌不能重疊；可復原狀態和 UI 狀態分開 | `@remotion/player` | 預設 Remotion Lambda；可開瀏覽器出片 | `CaptionsItem`，可改單字和單字時間 | 只讀了公開文件 |
| [Diffusion Studio core](https://github.com/diffusionstudio/core) | 引擎只在 npm；repo 只有 playground 和文件 | 用程式碼定義：Composition → Layer → Clip | 引擎內部（讀不到） | 瀏覽器編碼；免費版要保留浮水印 | `CaptionClip`，逐字 | 引擎不在 repo／1,252 |
| [Revideo](https://github.com/midrender/revideo) | 用程式碼產生影片的引擎，不是剪輯器 | generator 函式寫的場景 | player | 伺服器 ffmpeg（逐幀餵入） | — | 約 45.5k／4,165 |
| [FreeCut](https://github.com/walterlow/freecut) | Vite＋React 19.2＋Zustand 5＋mediabunny＋WebGPU | `TimelineTrack`／`TimelineItem` | — | — | — | 約 530k／2,304（太大，只能參考） |
| [OpenReel Video](https://github.com/Augani/openreel-video) | React 19 monorepo | 只看了最上層 | — | — | — | 約 460k／5,553 |

研究員順便更正了幾個 repo 名稱〔已核對〕：`designcombo/react-video-editor` 現在導向 `openvideodev/react-video-editor`，而且它的 README 和 package.json 寫的是 PixiJS 加 WebCodecs，GitHub 簡介上「using remotion」已經過時；Omniclip 在 `omni-media/omniclip`；Rescript 在 `wassgha/rescript`；Revideo 已移到 `midrender/revideo`。

推理〔推論〕：能用的「精簡」剪輯器是 3–4.5 萬行 TypeScript，完整的專業剪輯器是 46–53 萬行；學生團隊兩到四週能做的大約是 3–6 千行。所有在瀏覽器出片的專案都收斂到 mediabunny 加 WebCodecs，而它們的 issue 以出片失敗為主（卡住、沒有聲音）。星數不代表品質：OpenCut 主 repo 有 9.7 萬顆星，現在卻沒有剪輯器的程式碼。

弱點：行數是用 `wc -l` 粗算，含網站、測試和產生的程式碼；沒有執行任何專案；`@openvideo/*` 和 Diffusion Studio 的引擎原始碼讀不到；Remotion Editor Starter 只讀了公開文件。

**結論 A-2：OpenCut 已經分成三代。能讀的是 classic 版，不要 fork 主 repo。**

證據〔已核對〕：2025 年 7 月的版本（commit `33d8caf`）是 Next 15＋React 18＋Zustand 5＋ffmpeg.wasm ([package.json @33d8caf](https://github.com/OpenCut-app/OpenCut/blob/33d8caf65ca33fec731edcae84f43105b55245c6/apps/web/package.json))。classic 版（2026 年 5 月）是 Next 16.1.3＋React 19＋mediabunny 1.29＋opencut-wasm（Rust）＋瀏覽器內 Whisper；它的 `AGENTS.md` 寫明正在把所有商業邏輯搬進 `rust/` ([opencut-classic](https://github.com/opencut-app/opencut-classic), [AGENTS.md](https://github.com/opencut-app/opencut-classic/blob/main/AGENTS.md))。新版（2026 年 9 月的 main）是 Rust／GPUI 桌面版，加一個只有三個路由的 TanStack Start 網頁殼，全部約 8.3k 行；README 寫「being rewritten from the ground up」，opencut.app 目前仍然跑 classic 版 ([OpenCut README](https://github.com/OpenCut-app/OpenCut/blob/main/README.md))。changelog 0.3.0（2026-04-15）承認之前播放時編輯器會「slow to a crawl」 ([changelog 0.3.0](https://github.com/OpenCut-app/OpenCut/blob/main/changelog/0.3.0.md))。

推理〔推論〕：classic 版的 `timeline/types.ts`、`playback-manager.ts`（257 行）和 `commands.ts`（154 行，復原／重做）最值得讀，用來學架構。classic 版也綁在 Next.js 上，而且邏輯正在搬進 Rust，所以不 fork。

弱點：classic 版 `params`（文字內容和樣式所在的地方）的完整結構沒有細讀。

**結論 A-3：資料模型用「單一主軌＋疊加層」，時間單位用秒（浮點數）或整數毫秒，不要用幀。**

證據〔已核對〕：資料模型分兩派。一派是「軌道 → 元素」，元素有開始時間、長度和修剪點（OpenCut、FreeCut、Twick、Remotion Editor Starter）；另一派是「扁平的片段清單」（OpenVideo、Omniclip） ([OpenCut timeline/types.ts](https://github.com/opencut-app/opencut-classic/blob/main/apps/web/src/timeline/types.ts), [Twick types.ts](https://github.com/ncounterspecialist/twick/blob/main/packages/timeline/src/types.ts), [Editor Starter: tracks-items-assets](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/tracks-items-assets.mdx))。Rescript 的剪輯是「字詞清單＋手動剪切區」，`lib/edits.ts`（572 行）從被刪的字推出要剪的區段，相鄰區段間隔小於 0.35 秒就合併，片段最短 0.05 秒 ([lib/types.ts](https://github.com/wassgha/rescript/blob/main/lib/types.ts), [lib/edits.ts](https://github.com/wassgha/rescript/blob/main/lib/edits.ts))。Remotion 的 `Caption` 型別是 `{ text, startMs, endMs, timestampMs, confidence }`，`createTikTokStyleCaptions()` 把它分成一頁頁、每頁帶逐字時間 ([caption.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/captions/caption.mdx))。各家的時間單位都不一樣：OpenVideo 用微秒、OpenCut 用整數 tick、Twick 和 Rescript 用秒、Remotion 用幀或毫秒。

最小的結構範例〔推論，依 C3 筆記第 2、8 節組合，不是任何專案的原樣〕：

```ts
// Shapes borrowed from OpenCut classic (timeline/types.ts), Rescript (lib/types.ts), @remotion/captions
interface Clip    { id: string; src: string; startTime: number; trimStart: number; trimEnd: number } // seconds
interface Word    { id: number; text: string; start: number; end: number; deleted: boolean }      // Rescript
interface Caption { text: string; startMs: number; endMs: number; timestampMs: number | null; confidence: number | null }
interface Project {
  mainTrack: Clip[];                                    // one main lane, order = shot list order
  overlays:  { text: string; start: number; end: number; styleId: string }[];
  captions:  { words: Caption[]; styleId: string };
  music:     { src: string; volume: number; startTime: number };
  logo:      { src: string; x: number; y: number; scale: number };   // x, y, scale relative to frame
}
```

推理〔推論〕：所有軌道模型共用同一組三元素：時間軸上的位置、長度、修剪點。「分割」就是複製一個元素，改 A 的 `trimEnd` 和 B 的 `trimStart`，再把 B 的 `startTime` 設成 A 的結尾，只要幾十行，而且一對一對應到 ffmpeg 的 `trim`／`atrim`。這個結構和〈組裝〉一節的 `edit` 文件可以合併：`mainTrack` 的每個片段再加上 `nodeId` 和 `assetId`。

弱點：OpenVideo 的 `@openvideo/timeline` 內部結構沒有讀到。

**結論 A-4：學 OpenCut classic、Remotion Editor Starter 文件和 Rescript；搬五個小模組；自己做一個以 FastAPI＋ffmpeg 出片為準的精簡剪輯器。** 這一條和正文 2B-1、2C-1 的 Remotion 首選不同，見 Part 2 的〈兩份建議的差異〉。

證據：計畫本身是 C3 研究員的建議〔推論〕，依據是上面 A-1 到 A-3 的程式碼證據。

學（只讀，不搬）：

- **OpenCut classic**：`timeline/types.ts`、`core/managers/{timeline,playback}-manager.ts`：軌道和元素模型、分割和修剪的規則、主時鐘播放、用命令實作的復原。
- **Remotion Editor Starter 文件**（tracks、state-management、captioning）：可復原狀態和 UI 狀態怎麼分；字幕檢視器有哪些功能；同軌片段不能重疊。
- **Rescript**：`lib/edits.ts`、`lib/exportArgs.ts`、`lib/serializeTimeline.ts`、`lib/silences.ts`：刪字剪片和 ffmpeg 指令怎麼產生。

搬（小模組，改成 TypeScript 加 Vite，或改寫成 Python）：

1. Remotion 的 `Caption` 型別和 `createTikTokStyleCaptions`（直接裝 `@remotion/captions`，或自己重寫約 100 行）：把 whisper.cpp 的逐字時間分成一頁頁的字幕。
2. Rescript 的 `getWordCutRanges`、`mergeCutRanges`，以及 `trim=…,setpts=PTS-STARTPTS`＋`atrim`＋`concat` 的指令產生方式：改寫成 FastAPI 端的 Python，或留在前端、只把最後的保留區段送到伺服器。
3. OpenCut classic 的 `SceneTracks { overlay, main, audio }`、元素的 `startTime／duration／trimStart／trimEnd`，以及 `getVisibleSortedElements` 的排序規則。
4. OpenVideo 的 `groupWordsByWidth` 想法：用 canvas `measureText` 在畫面寬度 80% 處換行，用 `isKeyWord` 標出目前在唸的字。
5. 選用：Remotion `<Player>` 做預覽，前提是團隊願意把疊加層寫成以幀計時的 React 元件。

做（Remake 自己的部分，4 週版）：

| 週 | 內容 |
|---|---|
| 第 1 週 | 用 zod 定義專案 JSON（主軌、疊加文字、字幕、音樂、logo）；Zustand store 加復原；預覽播放器（主時鐘＋片段交界換 `<video>`＋DOM 疊加）；接上現有的上傳和素材網址 |
| 第 2 週 | 時間軸介面（一條主軌＋疊加層、拖曳和修剪把手、在播放頭分割、吸附）；文字疊加的屬性面板；全部用 DOM／CSS，不用 canvas |
| 第 3 週 | 字幕面板（字詞清單、改字、微調逐字時間、樣式預設、用 `@remotion/captions` 分頁）；選做「刪字就剪片」；音樂和 logo 控制；FastAPI `POST /render` 收專案 JSON，產生 ffmpeg 指令（trim／concat、`overlay` 疊 logo、`amix` 混音樂、字幕用 ASS 或 drawtext 燒進去），回報進度給前端輪詢 |
| 第 4 週 | 預覽和成片的一致性（共用字型檔、相對座標）；錯誤狀態；替指令產生器寫測試（參考 Rescript 的 `export-args-test.ts`）；demo 腳本。延伸：伺服器出片卡關時，才考慮用 mediabunny 在瀏覽器出片 |

**2 週退路：** 不做自由時間軸，改成片段清單（排序、修剪把手、分割）＋文字疊加＋字幕編輯器＋音樂和 logo 開關＋伺服器出片。這樣仍然涵蓋 2A-1 的五件事。

推理〔推論〕：風險依序是 (1) 文字和字幕在預覽和成片長得不一樣；(2) 時間軸拖曳和修剪的手感，這是最花時間的介面工作；(3) 遇到可變幀率的素材時，ffmpeg 指令的正確性和修剪後的影音同步（Rescript 為此重設 `setpts`／`asetpts`，並設片段最短 0.05 秒）。對照現有程式：本機 ffmpeg 沒有 `subtitles` 和 `drawtext` 濾鏡〔程式碼：`cutting.py`、`subtitles.py`〕，所以第 3 週的「用 ASS 或 drawtext 燒字幕」要先換一個 ffmpeg 版本，或繼續用 Pillow 畫成圖片再 `overlay`。

弱點：工時是判斷，不是量出來的；團隊人數和對 React、ffmpeg 的熟悉度都沒有納入。

**未驗證項目**

| 項目 | 為什麼重要 |
|---|---|
| 沒有執行任何專案，也沒有量出片速度；所有專案的 issue 和文件都找不到量化的出片速度 | 「伺服器出片比較穩」來自 issue 標題，不是實測 |
| `@openvideo/*` 引擎、Diffusion Studio 引擎、Remotion Editor Starter 的原始碼都讀不到 | 這三者的內部說法只來自 README、範例程式和文件 |
| Remotion Player 的同步精度、HTML `<video>` 的影音漂移都沒有量測 | Player 用 HTML 媒體元素，在剪接點不是逐幀精準；預覽夠用，但沒有數字 |
| Twick 的伺服器出片是不是以 ffmpeg 時間軸為基礎，沒有確認 | 影響它能不能接上現有的 ffmpeg 管線 |
| Remake 現有 ffmpeg 指令的結構和字幕燒錄方式，C3 研究員沒有看 | 選項 B 的工時取決於此；本報告只知道目前用 Pillow 畫字幕〔程式碼〕 |
| 行數和 open issue 數是粗算（issue 數含 PR） | 只能當規模的量級參考 |
