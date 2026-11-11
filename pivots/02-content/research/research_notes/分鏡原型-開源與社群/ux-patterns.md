# 分鏡 / Remake 工具的 UX 版型研究

存取日期：2026-11-02（所有連結皆於當日存取）。範圍：只看「介面怎麼組織、每個場景能做什麼動作、輸出是什麼、給誰用」。功能清單、價格、場景切分 pipeline 與 prompt 由另一份研究負責，這裡不重複。

證據標籤：
- [O] 我自己用 Playwright 開公開頁面、或下載官方圖片後目視確認
- [V] 廠商自己的頁面／文件（行銷性質，當作宣稱）
- [T] 第三方評測／目錄站
- [U] 未能驗證（頁面沒寫、或來源互相矛盾）

---

## 1. 版型對照表

| 工具 | 版型 | 每場景動作 | 輸出 | 目標使用者 | 證據 |
|---|---|---|---|---|---|
| **LTX Studio** | 劇本 → 場景(scene) → 鏡頭(shot) 的分鏡板；另有 shot 編輯面板與 timeline。實際畫面是 rows 還是 grid [U]（官方頁沒有文字描述） | 編輯 project/board/frame 三層；單格 regenerate；merge/split/add shot；Elements（角色/道具）可標記重用；Retake 重生鏡頭內 2–16 秒片段 | 動態分鏡 MP4、PDF pitch deck；LTX 內 timeline 出片 | 廣告公司、製作人、創作者；官方稱「all skill levels」；僅桌機 | [V] [ltx.io/blog/how-to-storyboard](https://ltx.io/blog/how-to-storyboard)（經搜尋摘要）、[ai-storyboard-generator](https://website.ltx.studio/studio/platform/ai-storyboard-generator)、[Luma 評測](https://lumalabs.ai/news/ltx-studio-review) [T]；CineD 2024-06 評測只確認角色可個別編輯、可「refresh」重生 [T] [cined](http://www.cined.com/ltx-studio-deep-dive-the-first-ai-based-full-editing-suite)。官方頁未提 lock / reorder / comment |
| **Boords** | 兩段式：①「Script」雙欄 AV 文件（Scene / Audio / Visual）②「Storyboard」編號 frame 列（標題、對白或螢幕字、秒數） | script 逐行評論（綁文字，段落移動時評論跟著走）；frame 層評論；@mention；team-only 評論；版本制（要求修改 = 新版本，已核准版本不動）；狀態 Draft → In progress → In review → Changes requested → Approved，核准時記錄姓名與時間；可鎖定客戶核准的 revision | PDF（可調版面、品牌、封面）、Word/Markdown/純文字（部分付費）；有時間軸的 animatic；approve 時 webhook | 廣告公司、製作公司；客戶免登入看 share link | [V] [script editor](https://boords.com/blog/introducing-script-editor)、[commenting-feedback](https://boords.com/collaborate/commenting-feedback)、[pdf-exports](https://assets.boords.com/docs/pdf-exports)。frame 是 grid 還是 list 頁面沒寫 [U]；客戶能不能自己改狀態，頁面前後矛盾 [U]；留言/核准軌跡是否進 PDF 未見文件 [U] |
| **Katalist** | 劇本 → 每場景多個 AI 變體的分鏡板；編輯器版面官方頁無描述 [U] | 一鍵換角度/換演員/改道具；「Regenerate any shot」；客戶/團隊留言 → agent 把留言變成新版本；全域角色替換。無 reorder、無明確 approve 按鈕 | 分鏡面板（含 slug-line、鏡頭備註）、動畫版配音、可匯出有時間軸的 Premiere Pro 專案 | 製作人、創意總監、提案用的廣告公司 | [V] [agentic-storyboarder](https://www.katalist.ai/agentic-storyboarder)；第三方說長腳本建議 ≤ 約 20 格 [T] |
| **Storyboarder (Wonder Unit)** | 手繪 panel 序列（開源桌面程式），panel 可拖曳重排 | 畫圖、重排、加動作/對白、animatic 播放 | PDF、Premiere/FCP/Avid、GIF、影片 | 導演、分鏡師（技術門檻偏中） | [T] [cartoonbrew](https://www.cartoonbrew.com/tools/new-storyboarding-software-free-open-source-153927.html)、[wonderunit](https://www.wonderunit.com/storyboarder)（匯出清單各來源不一致 [U]） |
| **StoryboardHero** | 場景下掛鏡頭的 shot list + 分鏡 tab | 鏡頭可在場景間重新整理；每格有 shot type/perspective/movement/camera/focus/lighting/focal length；角色重用；Storyboard tab 匯出前可勾選要包含的鏡頭 | shot list 的 PDF / CSV；分鏡 PDF（可品牌化） | 廣告公司、電影工作者、創作者 | [V] [v2 公告 2024-05](https://storyboardhero.ai/v2)、[PDF 教學](https://storyboardhero.ai/tutorial/how-to-export-a-storyboard-in-pdf-format)；分享連結可評論、密碼保護僅見第三方 [T][U]；PPT/MP4 匯出未被官方確認 [U] |
| **Higgsfield Popcorn → Cinema Studio** | 一次最多 8 格的圖像序列（影格 grid）；shot list 是 markdown 表格（Scene / Shot ID / Shot Size / Camera Movement / Reference / Notes） | 調光/背景/構圖後 regenerate、保持角色一致；「lock」板後才送進 Cinema Studio 4.0 做影片；點圖有 download / edit / upscale / animate 快捷面板 [T] | 圖像影格（3:4–9:16）、可當 Kling/Veo 的起始幀 | 創作者；偏「導演感」 | [V] [help center](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-popcorn)、[shot list 文章](https://higgsfield.ai/blog/script-to-ai-storyboard-shot-list)；help 文件沒有 lock/reorder 的 UI 說明 [U]；快捷面板為第三方影片摘要 [T] |
| **Figma Weave (原 Weavy)** | 無限節點畫布（暗色） | 每個節點可單獨 Re-run；連線；節點群組；Figma 稱可把 workflow 包成簡化「tool / app」介面，隊友只填輸入（腳本、brief）即可跑同一套 pipeline | 圖像/影片/3D 節點輸出；不是結構化 shot list | 創意專業人士；Krea 稱它「雜亂偏技術」（競品宣稱） | [O] 官方 Figma blog 圖；[V] [figma.com/solutions/ai-storyboard-generator-weave](https://www.figma.com/solutions/ai-storyboard-generator-weave/)、[blog](https://www.figma.com/blog/connecting-figma-and-weave/)；簡化介面細節頁面未寫 [U] |
| **Flora (flora.ai)** | 無限畫布；節點是「圖片卡 + 左上標籤 + 右上模型名」，連線極淡 | 逐節點生成；風格節點可接到所有生成區塊；版本歷史、即時評論（第三方描述） | 圖/影片資產 | 創意團隊、設計師 | [O] 官方行銷截圖（白底淡線）；[T] [Krea 對比文](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)（競品自家文章）、[Creative Bloq](https://www.creativebloq.com/ai/ai-art/this-node-based-creative-ai-tool-is-changing-how-artists-work) |
| **Krea Nodes** | 無限畫布；淺色卡片節點，輸入在左、參數在內、輸出在右；handle 依資料型別上色 | 節點可群組、section、便利貼；單節點最多 10 條出線；**Node App Builder**：選哪些參數變成表單欄位，發佈成簡化 app / API；Node Agent 可用文字建立 workflow | 圖/影片/音訊/3D；app 形式的表單 | 號稱「進階控制但不嚇到新手」（Krea 自稱） | [O] 開 [krea.ai/nodes](https://www.krea.ai/nodes) 目視；[V] [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes) |
| **Freepik Spaces（現已改名 Magnific）** | 無限畫布，白底點陣；節點 = 卡片，連線是細曲線 | List node 可對一批 prompt/素材批次跑；可重跑換輸入；多人即時協作（游標有人名） | 圖/影片/音訊 | 團隊、素材量產型 agency | [O] 開 [magnific.com/spaces](https://www.magnific.com/spaces)（導向自 freepik.com/ai/spaces，頁面橫幅寫「Freepik is now Magnific」）；[T] [kingy.ai 評測](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)；官方 docs 對我 403，改靠搜尋摘要 [U] |
| **Runway Workflows** | 節點畫布；色碼：文字橘、圖片粉、影片綠；右上 Run all | 整個 workflow 或單節點執行；可重新生成單一步驟；可發佈成版本化 API | 圖/影片；節點 pipeline | 創作者與團隊，「不用寫程式」 | [V] [runway.com/workflows](https://runway.com/workflows)；搜尋摘要稱有「lock node output」，但官方頁沒提 [U]；2025-10 初期僅限部分客戶 [T] |
| **Arcads** | 專案制「選演員 → 腳本 → 生成」；是否有 timeline 各來源矛盾 | 腳本換演員/換版本；B-roll 另開專案型別 | 演員口播影片、B-roll，需外部剪輯收尾（舊評測） | 投放/DTC 行銷人 | [T] [codingem 評測](https://www.codingem.com/arcads-ai-review/)；官方 workflow 說明頁 404 [U] |
| **Creatify Ads Clone** | 輸入連結/影片 → AI 分析 → 產出「可編輯的新廣告」→ 內建編輯器微調 | 可改產品畫面、腳本、旁白、品牌色、音樂、字幕、CTA；單場景編輯/regenerate 官方頁沒寫 | 匯出給 TikTok/Reels/Meta/Shorts 的影片；每秒 1 credit | 廣告主、行銷人 | [V] [help](https://help.creatify.ai/en/articles/15049358-ads-clone)（頁面未描述產出後的畫面 [U]） |
| **Sandcastles** | 追蹤頻道的 feed（可標 outlier）→ 開單支影片看分析 → 逐字稿 → hooks → 腳本；腳本存在 Projects | 無剪輯器；沒有原生匯出，複製純文字到 CapCut/Descript | Viral Analysis（hook 類型、敘事格式、節奏）、hooks 批次、腳本文字 | 短影音創作者 | [T] [GTM Directory](https://thegtmdirectory.com/tools/sandcastles)；[V] 競品 Format Finder 的比較頁（2026-09-07，非實測）[formatfinder compare](https://formatfinder.onepeakcreative.com/resources/compare/format-finder-vs-sandcastles-ai)。「playbook」一詞只在後者出現；任務敘述中的「remix playbook」我找不到官方出處 [U] |
| **Virlo** | 「outlier 影片 → 拆 hook/format/CTA → 腳本」的研究流程；亦可經 MCP 接 Claude | 未見單場景編輯描述 | 腳本（含時間標記的 hook） | 創作者／行銷 | [V] [virlo.ai](https://virlo.ai)、[start](https://virlo.ai/start)；UI 版面我沒能確認 [U] |
| **Format Finder (One Peak Creative)** | niche → 65+ 命名格式庫 → 腳本 / shot plan / caption | 每鏡頭欄位、regenerate 官方支援頁沒寫 | 腳本、shot plan、caption；One Click Editor | 短影音創作者 | [V] [support](https://formatfinder.onepeakcreative.com/support/using-format-finder)；「shot plan」結構不得而知 [U]。格式數 60+/65+、創作者 16 萬等數字各頁不一致 |
| **CapCut Script-to-Video / AI storyboard** | 腳本 → 場景(storyboard 模板) → 時間軸；每個 clip 可點「Replace」換成自己的素材 | 單 clip Replace（自己的素材/素材庫/AI）；Scenes tab 一次換全部媒體；配音 | 剪好的影片草稿 | 一般創作者，門檻最低 | [V] [script-to-video](https://www.capcut.com/resource/script-to-video-ai)（多語言版本，經搜尋摘要）。另有 CapCut 文章建議每鏡頭一張 card：purpose/duration/framing/action/continuity/prompt/transition，最後才進 timeline 組裝 [V] [shot-sequences](https://www.capcut.com/create/ai-video-storyboarding-shot-sequences-before-generation) |
| **Descript** | 文件式：逐字稿即時間軸，Scenes + Layouts | 刪逐字稿字句 = 刪影片；Underlord 起草/修改腳本；Layout 套用保持一致 | 剪輯完成的影片 | 非剪輯師的內容創作者 | [V][T] [descript.com](https://www.descript.com/)、[help](https://help.descript.com/hc/en-us/articles/37585546799757)（細節為搜尋摘要） |
| **Agency shot list（Sheets/Notion）** | 表格（一列 = 一鏡頭或一個交付物） | 狀態下拉、備註、連到腳本 Doc | 共享表格/PDF | 所有 agency，零學習成本 | [V] [Later 模板](https://later.com/resources/downloadable/shot-list-template-googlesheets)欄位：Status(To Do/In Progress/Done/Blocked)、Shot type、Phase、Platform、Deliverable type、Concept、Model、Script link、Notes。Lido、Vimeo 模板內容我沒讀到，欄位未驗證 [U]；此模板偏「拍攝日清單」，不含 on-screen text / spoken line 欄 |

### 規律歸納（這些是我的推論，不是來源直接說的）
1. **「給客戶看、要簽核」的工具（Boords、Katalist、StoryboardHero）全是線性清單/框格 + 評論 + 版本/狀態**，輸出是 PDF 或可匯出的時間軸。沒有一個把節點畫布當客戶簽核介面。
2. **節點畫布工具（Weave、Flora、Krea、Spaces、Runway）都在往「簡化外殼」走**：Weave 的 tool/app、Krea 的 Node App Builder。這等於廠商自己承認「非技術人員不該直接面對節點圖」。
3. **「逐場景 regenerate」是基本款**（LTX、Katalist、Popcorn、Runway 單節點 re-run）。**lock 是少數**：只有 Boords 的 revision lock、Higgsfield 的「board locked 才進 Cinema Studio」、LTX 的 Elements 重用有證據；其餘沒文件。
4. **「先審腳本/分鏡，再花錢生成影片」是共同的安全閥**（Boords 腳本核准後才能按 Storyboard；Higgsfield 先核准靜態 anchor；VidMuse 把場景編輯放在生成前 [T]）。

---

## 2. 病毒截圖辨識：暗色節點圖 + 睫毛膏 + 青綠貝茲曲線

**結論：最像 Weavy / Figma Weave。信心：約 80%。**（我沒有看到該張病毒截圖本身，只有任務描述的特徵；比對基準是各家官方公開圖片。）

我用 Playwright 開官方頁面並下載官方 blog 圖片目視比對：

| 候選 | 背景 | 連線色 | 節點外觀 | 與描述吻合度 | 證據 |
|---|---|---|---|---|---|
| **Weavy / Figma Weave 的 app 畫面** | 近黑（約 #0e0e12）+ 極淡點陣 | **細曲線，青綠（teal/mint，圖像資料）與粉紫（文字資料）兩色**；端點是空心圓環 | 深灰圓角卡片；標題列「Prompt」「GPT Image 1 Edit」+「…」選單；圖像卡下方有「Model Details」「Re-run model」按鈕；Prompt 節點是灰色文字框 | **高**：暗底、文字 prompt 節點、青綠曲線、圖卡皆符合 | [O] [Weave 暗色畫布圖](https://cdn.sanity.io/images/599r6htc/regionalized/681ef55f0f8c32783d864de1c8b60f2c32372bdf-4000x2494.jpg)（Figma blog《Introducing Figma Weave》）、[粉青連線特寫](https://cdn.sanity.io/images/599r6htc/regionalized/aa01d597cc9556f8243eab17691187f7dfee01f7-1631x918.png)（Figma blog 圖片替代文字：「connected by pink and teal lines with node points」）、[暗色大圖](https://cdn.sanity.io/images/599r6htc/regionalized/cd501f0d542b3f3e7fa9de81cd3fb56a32dda488-2270x1418.png)（Figma blog 替代文字：「Dark-themed visual workflow editor」）。另有第三方教學：以 prompt concatenator + Nano Banana 做「woman holding product」的 UGC 廣告圖 [T] [Recapio 摘要](https://recapio.com/digest/stop-filming-ugc-ads-build-them-in-weavy-ai-by-ludovit-nastisin) |
| **Flora** | 行銷站全黑，但畫布示意圖是**白底** | 幾乎看不到的極淡灰線 | 圖卡加左上小標題、右上模型名；無明顯「節點外框」 | 低：白底淡線；暗色 app 畫面我沒能驗證（找不到公開的暗色/色碼資料）[U] | [O] [flora.ai](https://flora.ai) 首頁、[advertising 示意圖](https://ik.imagekit.io/ff5bkg98p/framer-website-assets/SEO%20LP/ai%20image%20generator/advertisign-.png)（官方行銷圖） |
| **Krea Nodes** | 行銷圖為灰階；節點是**淺色/白色卡片** | 藍、黃、綠（依型別） | 淺色圓角卡，內含 prompt 文字框與「Settings」 | 低：卡片偏淺、連線非青綠 | [O] [krea.ai/nodes](https://www.krea.ai/nodes) |
| **Freepik Spaces / Magnific** | 白底點陣 | 鼠尾草綠與紫藍 | 白色圓角卡，圓形圖示 handle | 低：白底；找不到暗色模式的資料 [U] | [O] [magnific.com/spaces](https://www.magnific.com/spaces) |
| **ComfyUI** | 官網為深紫黑；經典 app 為深灰 | 官網示意圖為黃色線；經典 app 多色 slot 線 | 官網示意圖是圓角卡 + 黃色小點；經典 app 是有標題列的矩形節點、參數多 | 低~中：暗底符合，但邊緣色與節點外觀不符，且通常看得到大量參數 widgets | [O] [comfy.org](https://comfy.org)；經典 app 外觀為我的既有印象，本次未驗證 [U] |
| **Runway Workflows** | （未驗證） | 型別色：文字橘、圖片粉、影片綠 | — | 低：文字節點線應為橘色 | [V] [runway.com/workflows](https://runway.com/workflows) |

**判斷依據**：暗底 + 「文字 prompt 節點」+ 「圖像節點接出青綠細曲線」這個組合，只有 Weave 的 app 畫面三項同時成立；且 Weave 有大量 UGC/產品圖的公開教學（第三方）。
**不確定處（這就是 20% 的來源）**：
- 沒看到原圖；若原圖的曲線是「單一青綠」而非 Weave 的青綠/粉紫雙色，也可能只是只有圖像線被截進去。
- Flora、Spaces 可能有我沒驗證到的暗色主題；ComfyUI 可換主題/用 Nodes 2.0 外觀。
- 建議用一個低成本檢查確認：原圖左側是否有窄的垂直圖示欄（Weave 暗色畫面左側有 8–10 個圖示的直欄）、底部是否有居中的 select/hand/note/undo/redo/縮放工具列、右上角是否有「credits」與「Share」。這些三項在 Weave 官方圖都有 [O]。

---

## 3. 卡片清單 vs 節點畫布 vs 時間軸：哪個適合「非技術 agency 人員 + 客戶一起核准分鏡」

### 結論
**主介面用「卡片清單（一鏡頭一張卡，直向排列，可切換成表格/框格預覽）」。** 節點畫布不要放進這個原型；時間軸只當最後一步的唯讀預覽。

### 證據 → 推理 → 弱點

**證據**
1. 唯一有「客戶簽核」完整文件的工具 Boords：frame 列表 + frame 層評論 + 版本 + 狀態 + 核准記錄姓名時間 + 客戶免登入。[V]
2. Katalist 把流程定成「上傳腳本 → 每場景變體 → 評論驅動修訂」，並以 PDF/Premiere 時間軸交付。[V]
3. 節點畫布的廠商自己提供「簡化外殼」（Weave tool/app、Krea Node App Builder），表示畫布主要是「建流程的人」用，不是「審結果的人」用。[V]
4. 競品自己也批評節點圖的複雜度（Krea 稱 Weave「cluttered and technical」）。這是競品宣稱，不是獨立評測。[V]
5. 我們要的欄位（時間、鏡頭、螢幕字、口白）本質上就是 Boords / CapCut shot card / 代理商 shot list 的欄位。[V]
6. 行業慣例：agency 用 Sheets/Notion 表格當 shot list，客戶以評論/狀態核准。[V][Later 模板]

**推理**
- 簽核的核心動作是「讀 → 指出哪一格要改 → 改完再看 → 說可以」。這是線性、逐項、有狀態的任務，卡片清單的一列對應一個決策單位，評論可綁在卡上，狀態可存在卡上。
- 節點圖強項是「分支、組合、多模型串接」，我們的原型沒有分支：一支參考影片 → N 個場景 → 每場景一次 LLM 改寫。用節點會把線性結構畫成無意義的線。
- 「人類保持控制」在卡片上最容易做到：每張卡有 AI 建議、手動編輯、regenerate、鎖定（locked = 之後 regenerate 全部時略過）、逐卡狀態。這幾個動作與 Boords 的 revision lock、Runway 單節點 re-run 的概念相通，但呈現成非技術人員熟悉的「列」。
- 時間軸適合節奏檢查（總秒數、每場景佔比），不適合改文案。CapCut 的指引也是「最後才進 timeline 組裝」。[V]

**弱點 / 不確定**
- **沒有任何實測數據**說明非技術 agency 人員在節點圖上較差；上面的論證來自廠商行為（把畫布包成簡化外殼）與流程特性。這是推論，不是已被量測的事實。
- 若之後想支援「多模型串接、批量變體」（例如一個產品 × 10 個 hook），節點畫布或 Spaces 式 List node 會比卡片更自然；那是 v2 的問題。
- 卡片清單在場景很多（>15）時要捲很久；Katalist 第三方建議 ≤ 約 20 格 [T]，我們的短影音通常 6–12 個場景，應該不是問題，但未實測。
- Boords 的「客戶能不能改狀態」頁面自相矛盾 [U]，所以「客戶自己按核准」的 UX 是否可行需另外確認，原型可先做成「agency 人員代客戶按核准」。
- LTX Studio 的真實畫面（rows vs grid）我沒驗證到，這部分對照表是靠文字描述，非目視。

### 對原型的具體建議（皆為設計建議，非來源事實）
1. 一張卡 = 一個場景：左側縮圖/來源畫面（若有），右側四個欄位 **時間、鏡頭、螢幕字、口白**，每個欄位上下對照「參考原片」vs「改寫後（對你的產品）」。
2. 每張卡的動作：`重新生成` / `手動編輯` / `鎖定` / `留言` / 狀態（待審 → 需修改 → 已核准）。
3. 頂部全域：一鍵「重新生成全部（略過已鎖定）」、總秒數、輸出 PDF/Markdown。
4. 順序：先核准文字分鏡，再考慮任何昂貴動作（對齊 Boords 的「腳本核准才能轉分鏡」與 Higgsfield 的「先核准 anchor」）。
5. 輸出用 PDF + 表格（CSV/Markdown）：對應 StoryboardHero 的 PDF/CSV、Boords 的 PDF/Markdown。
6. 若要留一個進階入口，用 Krea 式「Node App Builder」的反向想法：先做卡片，之後再提供「進階：節點檢視」。

---

## 4. 研究限制
- 多數來源是廠商行銷頁或第三方目錄站；我標了 [V]/[T]/[U]。
- 許多 UI 細節（Boords 框格排版、LTX 實際畫面、Spaces 暗色、Virlo 版面）頁面沒寫，我沒有註冊帳號登入實測，因此沒有填寫猜測。
- 一些搜尋結果為 AI 摘要，已盡量用原頁面的 WebFetch 再確認；仍標註的 [U] 是最後沒能確認的。
- 「Sandcastles remix playbook」我找不到官方文件；Sandcastles 的描述主要來自 GTM Directory 與競品 Format Finder 的比較頁。
- 病毒截圖本人未見，辨識僅依文字描述；信心 80%。
- Freepik 已更名 Magnific（2026-11-02 在 freepik.com/ai/spaces 導向 magnific.com/spaces 並看到橫幅）。
- 暫存的官方圖片放在 scratchpad：`/private/tmp/claude-501/-Users-tommy-orca-workspaces-BuildClub-blenny/53be9641-9a5c-465e-9783-072bf821570a/scratchpad/img/`（不屬於 repo）。
