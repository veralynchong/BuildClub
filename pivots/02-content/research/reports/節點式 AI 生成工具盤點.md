# 節點畫布擠滿對手，「分鏡到時間軸」仍沒人做好

> 資料取用日期：2026-11-03（雪梨時間）。所有價格除特別註明外皆為美元，以研究員當天讀到的頁面為準。本報告由四份研究筆記整合而成（商業 SaaS、免費／託管／亞洲、開源、分鏡式影片流程）；撰寫時**沒有重新抓取來源**，「是否對過一手來源」依研究員筆記標註。沒有任何產品經過實際試用。2026-11-03 另外補了一輪 Reddit＋X 社群查核，結果放在〈社群聲音（Reddit + X）〉一節；那一節是**社群訊號，不是市場數據**。

**結論先講：** 截至 2026-11-03，用「連線節點畫布」生成 AI 圖片與影片的產品，**商業 SaaS 至少有 15 個有影片的**（Figma Weave、Flora、Krea Nodes、Magnific／Freepik Spaces、Runway Workflows、Higgsfield Canvas、Adobe Firefly Graph、ImagineArt、Picsart Flow、Martini／Astorie、Scenario、TapNow、Zeemo、Fuser、Wireflow），另外有字節的 Dreamina AI Canvas 和快手的可靈「灵动画布」。開源方面有 ComfyUI 生態，加上一批用 React Flow 寫的新專案，**Node Banana（MIT）和 NodeTool（AGPL）跟我們最像**。所以「節點畫布＋多模型」本身已是基本配備，算不上護城河；這些產品幾乎都透過 fal 這類聚合商串同一批 Seedream／Nano Banana／Kling／Seedance／Hailuo 模型。真正的空位在下游：大廠（Weave、Krea、Spaces、Higgsfield）的文件裡都**沒有原生時間軸**，大家都停在「節點輸出」或「匯出到 Premiere／Resolve」。內建時間軸的只有 Dreamina（廠商自述）、Flora（2026-07，單一來源，資料互相矛盾）、Runway（時間軸是另一個獨立介面），加上開源的 NodeTool。**沒有一份來源描述過我們這種設計**：「Shot」是一個正式物件，下面接 Storyboard 圖、再接 Video，有 v1/v2 版本，再挑一支「main clip」送進剪輯器。威脅最大的是 Dreamina，因為它有自家模型補貼、官網直接用澳幣標價（A$22.90／月），也內建時間軸。對澳洲代理商來說，我們能說服人的差異點有四個：生成**前**就看到每個節點和整個鏡頭的預估費用、明確的版本與主片段選擇、參數改了會標示片段過期，以及客戶審閱流程。

**社群查核補充（2026-11-03，社群訊號，不是市場數據）：** Reddit＋X 的查核強化了兩點，也提醒了一點。第一，**「節點圖太亂、太難」是兩個平台唯一站得住的共識**：Reddit 有 ↑1074、↑602、↑444 的高分串，X 也有低互動的個人抱怨。這支持把線藏在「鏡頭卡」後面的方向。第二，**時間軸缺口有了使用者端的證據**：r/comfyui 有 4 串年度熱門（↑270–↑486）是使用者自己在 ComfyUI 上補時間軸或剪輯層，但這只出現在 Reddit，X 上沒有。第三，有一則 X 使用者貼文說，因為 **credit 會過期、自己是一陣一陣地用**，不再付費 Higgsfield／Weave／Flora；這只有單一低互動來源，但跟代理商「接案才用」的節奏相符，值得在計費設計時記住【推論】。要提醒的是：X 上互動最高的貼文幾乎都是廠商、員工或工具作者發的，Reddit 這些看板則幾乎不討論商業畫布，所以社群資料**不能用來判斷 Flora、Weave、Dreamina 的使用者滿意度**。

---

## 證據標籤怎麼讀

本報告每個結論都照「**證據 → 推理 → 弱點**」寫。證據用以下標籤：

| 標籤 | 意思 |
|---|---|
| 【一手】 | 研究員直接讀了官方文件、定價頁、官方新聞稿或 GitHub API |
| 【二手】 | 評測、新聞、聚合站、搜尋摘要 |
| 【廠商自述】／【競品自述】 | 產品自己的行銷頁，或是對手寫的「替代品排行」（像 Wireflow、Morphic、Martini、Dreamina、Krea 的比較文都偏向自家） |
| 【單一來源】 | 只有一個來源，找不到第二個佐證 |
| 【衝突】 | 不同來源講法互相矛盾 |
| 【未驗證】／【可能已停】 | 找不到可靠來源，或有跡象顯示已關閉、轉型 |
| 【推論】 | 我的推論，不是有來源的事實 |

---

## 總比較表（約 70 項）

「連線／畫板」：**連線節點**＝有輸出、輸入接口，要拉線；**畫板**＝自由擺放，沒有接線；**線性**＝依序排的分鏡卡片。

### A. 商業 SaaS：連線節點畫布

| 名稱 | 類型 | 連線／畫板 | 影片 | 時間軸 | 價格／免費額度 | 狀態 | 證據 |
|---|---|---|---|---|---|---|---|
| Figma Weave（原 Weavy） | SaaS | 連線節點 | 有（經 fal：Seedance、Sora、Veo 等） | 文件未提 | Free 150 credits；Starter $24／月（年繳）1,500 credits；Pro $45；Max $100；Team $42／人 | 營運中；2025-10 被 Figma 收購，獨立計費 | 【一手】官方定價、Figma Help |
| Flora | SaaS | 連線節點 | 有（Starter 起；Free 沒有影片） | 【衝突】2026-07 推出 Timeline Editor（單一聚合站）vs 競品頁說沒有 | Free；Starter $18、Pro $50、Max $200／月＝等額美元用量 | 營運中；累計融資 $52M | 【一手】官方 docs 定價；時間軸【未驗證】 |
| Krea Nodes | SaaS | 連線節點 | 有（Veo、Sora、Kling、Wan、**Hailuo**、Seedance、LTX-2） | 只有 Trim／Stitch 工具節點 | 【衝突】各來源從 $9 到 $200 都有 | 營運中 | 【一手】官方 docs；價格【二手】 |
| Magnific Spaces（原 Freepik Spaces） | SaaS | 連線節點 | 有（Veo 3.1、Kling 3.0、Wan 2.5） | 無，手動匯出 | Free 3 個 Space＋每日上限；Premium $20／月 | 2025-11-04 上線；2026-04-28 改名 Magnific | 【一手】新聞稿；評測【二手】 |
| Runway Workflows（後稱 Apps） | SaaS | 連線節點 | 有（Gen-4.5＋第三方） | 另有獨立的 Timeline Studio（2026-07） | Free 一次性 125 credits；Standard $12–15／人 | 營運中 | 【二手】（官方 help 回 403） |
| Higgsfield Canvas | SaaS | 連線節點 | 有（Soul、Seedance 2.0、Kling 3.0、Veo 3.1、Nano Banana Pro） | 文件未提 | 建圖免費，生成才扣 credits；Unlimited 方案在 Canvas 不適用 | 2026 上半年推出（日期未確認） | 【一手】官方 help |
| Adobe Firefly Graph | SaaS（企業） | 連線節點，300+ 節點類型 | 有 | 未見 | 企業議價 | Enterprise 已上；Teams 公測（2026-06） | 【一手】Adobe Help＋新聞 |
| ImagineArt Workflows | SaaS | 連線節點（有型別檢查） | 有（Seedance 2.5、Kling 3.0、**Hailuo 2.3 Pro**） | 未見 | Basic $9／月；免費約每天 100 credits | 營運中 | 【一手】docs；價格【二手】 |
| Picsart Flow | SaaS | 連線節點 | 有（Motion Graphics、Veo 3.1 Fast、Kling 3.0） | 未見 | 找不到 | 2025-11 推出；2026-03 加 Copilot | 【一手】官方頁、Business Wire |
| Martini → Astorie | SaaS | 連線節點 | 有（含 **Hailuo**、Seedance 2、Kling 3） | 【衝突】內建時間軸＋XML 匯出 vs「最後剪輯交給外部 NLE」 | Free（專案公開）；$15／月起 | martini.art 轉址到 astorie.ai，改名沒有公告 | 【一手】官方頁；【二手】No Film School |
| Scenario | SaaS | 連線節點（有 If-Else） | 有 | 無 | $15／$45／$75（可能過時） | 營運中，主打遊戲素材 | 【一手】help；價格【二手】 |
| TapNow（Tapflow） | SaaS | 節點＋AI 代理 | 有 | 能規劃分鏡，沒有時間軸證據 | 註冊送 200 Tappies | 公司不明 | 【二手】行銷味重 |
| Zeemo AI Video Studio | SaaS | 節點（4 種） | 有（圖片可當參考幀） | 官方把畫布定位成「取代時間軸」 | Pro 約 10（幣別不明）、300 credits | 營運中 | 【一手】docs；價格【二手】 |
| Fuser | SaaS | 連線節點 | 有 | 未見 | 有免費版；$5／月起（可能是 2025 資料） | 營運中 | 【一手】llms.txt；【二手】 |
| Wireflow | SaaS | 節點 | 付費才有 | 內建影片編輯器（0 credits） | Free 60 credits（無影片）；$36–$299／月 | 營運中；自家比較文偏頗 | 【一手】定價頁 |
| PlugNode | SaaS | 節點，自帶 API key | ? | ? | 用自己的 key，平台不加價 | — | 【廠商自述】 |
| Vilva | SaaS | AI 代理建的節點板 | ? | ? | 送 200 免費 credits | — | 【廠商自述】 |
| fal Workflows | 開發者平台 | 視覺化 workflow（JSON） | 有 | 無 | 按輸出計價，預付 | 編輯器是否還在維護未確認 | 【一手】定價頁、範例頁 |
| Google Opal | 免費（Labs） | 節點式小 app 建構器 | Veo | 無 | 免費 | 2026-11 現況未重查 | 【二手】 |
| Beeble Canvas | SaaS（VFX） | 節點合成 | 有 | ? | ? | 2026-05-19 推出 | 【一手】官方公告 |

### B. 畫板、線性分鏡、有時間軸的產品

| 名稱 | 類型 | 連線／畫板 | 影片 | 時間軸 | 價格／免費額度 | 狀態 | 證據 |
|---|---|---|---|---|---|---|---|
| **Dreamina AI Canvas**（字節／CapCut） | SaaS（有免費） | 節點畫布（有沒有可見連線未說明） | 有（Seedance 2.5、Sora 2、Veo 3.1；圖：Seedream 5.0、Nano Banana Pro） | **有，內建** | 每日免費 credits（數量未寫）；**A$22.90／月 2,215 credits** | 營運中 | 【廠商自述】 |
| VidMuse Freeform Canvas | SaaS | 節點 | 有 | 有（底部時間軸） | ? | ? | 只有搜尋摘要（頁面 403） |
| Morphic | SaaS | 畫板（自家頁面說法互相矛盾） | 有 | 有（Compose） | Free 20 credits；$19–$170／月 | 營運中 | 【廠商自述】 |
| Renoise | SaaS | 畫布 | ? | 有（只有桌面版） | ? | 沒深查 | 搜尋摘要 |
| Mosaic（YC W25） | SaaS | 節點「Tiles」（以剪輯為主） | 以剪輯為主 | 匯出 XML 到 Resolve／FCP／Premiere | 有免費層；$25／月 | 營運中 | 【二手】HN、評測 |
| Adobe Firefly Boards＋影片編輯器 beta | SaaS | 畫板 | 有（Adobe＋Veo；可設首尾幀） | 有（**選取順序＝時間軸順序**） | 生成式 credits | beta | 【一手】Adobe Help |
| LTX Studio | SaaS | 線性：劇本→場景→鏡頭 | 有 | 有（2025-08） | Free／Pro／Enterprise | 營運中 | 【二手】 |
| Google Flow | SaaS（有免費） | 線性 | Veo 3.1 | Scenebuilder（「離開專案就重置」未驗證） | 免費每天 50 credits | 營運中 | 【一手】Google support；【二手】 |
| Luma Boards／Agents | SaaS | 畫板＋代理 | Dream Machine | 未見 | 兩個獨立 credit 池 | 2026-03-05 推出 | 【一手】BusinessWire |
| Kaiber Superstudio | SaaS | 「類節點」畫布 | 有 | 無 | Creator／Pro | 營運中 | 【競品自述】 |
| Lovart | SaaS | 代理＋畫板，沒有連線 | 有 | 無 | 【衝突】免費額度；Starter 約 $19–29 | 2025-07 全球上線 | 【二手】 |
| Leonardo Blueprints／Flow State | SaaS | 預設範本（底層是節點） | 有 | 無 | — | Blueprints 2025-11 | 【一手】API docs |
| OpenArt Suite | SaaS | 整合工作區，不是節點 | 有 | 無 | 免費每天 50 credits【未驗證】 | 2026-03 | 【一手】官方部落格 |
| Higgsfield Popcorn | SaaS | 線性，最多 8 格 | 有 | 無 | — | — | 【廠商自述】 |
| Kling 分鏡（Smart／Custom Storyboard） | SaaS | 線性 | 一次最多 6 個 cut | 無 | — | Kling 3.0 於 2026-02 推出 | 【二手】 |
| Sora storyboard | SaaS | 線性卡片 | 有 | 卡片間距控制節奏 | Pro | 【未驗證】有一份指南說 App 於 2026-04-26 關閉 | 【二手】 |
| Boords／Katalist／Krock.io | SaaS | 分鏡板 | 有限 | 動態分鏡（animatic） | — | — | 【二手】 |
| Autodesk Flow Studio | SaaS | 3D＋Canvas | 有 | ? | — | — | 【一手】官方頁 |

### C. 中國與亞洲

| 名稱 | 類型 | 連線／畫板 | 影片 | 時間軸 | 價格／免費額度 | 狀態 | 證據 |
|---|---|---|---|---|---|---|---|
| 可靈 灵动画布（快手） | SaaS | 節點；改 prompt 會開新分支 | Kling | 未提 | **每一步顯示成本明細**；價格不明 | 2025-07 內測；現況【未驗證】 | 【二手】PingWest |
| 即夢 智能画布（字節中國站） | SaaS | ? | ? | ? | ? | 【未驗證】 | 目錄站 |
| RunningHub | SaaS | ComfyUI＋AI Apps＋無限畫布 | 有（Seedance 2.5 每秒 $0.036 起） | 無 | 邀請送 500 RH 幣（各處說法不同） | 營運中 | 【一手】首頁 |
| LiblibAI（哩布哩布） | SaaS | 雲端 ComfyUI | ? | 無 | 免費每天 10 credits；¥29／月起；只收中國的支付方式 | 營運中 | 【二手】 |
| MiniMax Hub | 桌面 app | 畫布＋workflow 檢視 | Hailuo | ? | ? | 宣傳文，日期不明 | 【二手】 |
| SJinn Canvas、AI-Flow、Flowith、TinyCommand | — | — | — | — | — | 【未驗證】只出現過名字 | — |

### D. 託管 ComfyUI、模型平台、免費 app、自動化工具

| 名稱 | 類型 | 連線／畫板 | 影片 | 時間軸 | 價格／免費額度 | 狀態 | 證據 |
|---|---|---|---|---|---|---|---|
| Comfy Cloud | SaaS | ComfyUI 節點圖 | 有（Wan＋Partner 節點） | 無 | 【衝突】免費「5 次」vs「400 credits」；$20／$35／$100／$700 | 2026-03 結束 beta | 【一手】定價頁、官方部落格 |
| Comfy Desktop | 免費 app | ComfyUI | 本地模型＋付費 Partner 節點 | 無 | 免費 | 營運中 | 【一手】 |
| RunComfy | SaaS | ComfyUI（雲端主機） | 有，另有 Model API | 無 | 用多少付多少，每小時 $0.99 起；Pro $19.99 | 營運中 | 【一手】 |
| ThinkDiffusion | SaaS | ComfyUI／A1111 | 透過 workflow | 無 | 註冊送 15 分鐘；每小時 $0.99–2.50 | 營運中 | 【一手】 |
| RunDiffusion | SaaS | ComfyUI／A1111 | Hobby 以上 | 無 | 每天 100 tokens；$8.79–179.99 | 營運中 | 【一手】 |
| ViewComfy | SaaS | ComfyUI 包成表單 app | 透過 workflow | 無 | $0＋運算費；$30／$200 | 營運中 | 【一手】 |
| ComfyDeploy | SaaS | ComfyUI 部署 | ? | 無 | 定價頁 404 | 【可能已停】 | — |
| Comfy.ICU | ? | ? | ? | ? | ? | 【未驗證】找不到任何來源 | — |
| Civitai「Comfy on Civitai」 | SaaS | 瀏覽器版 ComfyUI | 有（Buzz 點數） | 無 | Buzz | 2026-07 公告，內文 403 | 只有標題 |
| Shakker／SeaArt／Tensor.art／MimicPC | SaaS | 線上跑 ComfyUI | ? | 無 | Tensor.art 有每日免費額度 | 【未驗證】 | 【二手】 |
| Replicate | API | 沒有節點編輯器 | 有 | 無 | 按秒計費 | 營運中 | 【一手】 |
| Draw Things | 免費 app（Apple） | 無限畫布，沒找到節點 | 圖生影片 | 無 | 免費；Draw Things+ $8.99／月 | 營運中 | 【一手】 |
| Pinokio | 免費開源啟動器 | 一鍵安裝 ComfyUI 等 | 透過 ComfyUI | 無 | 免費 | 營運中 | 【二手】 |
| n8n／Make／Zapier | 自動化工具 | 流程圖 | 透過 fal 等 API | 無 | n8n 自架免費；Zapier 每月 100 tasks；Make 約 1,000 credits | 營運中 | 【二手】 |

### E. 開源（星數、授權取自 GitHub API，2026-11-03）

| 名稱 | 類型 | 連線／畫板 | 影片 | 時間軸 | 授權／星數 | 狀態 | 證據 |
|---|---|---|---|---|---|---|---|
| **Node Banana** | 開源（Web＋桌面） | 連線節點，**@xyflow/react 12** | 有（fal、Replicate、Gemini、Kie、WaveSpeed） | **有「Edit Video」節點** | **MIT**／1,661 | 很活躍（v2.3.0，2026-10-23） | 【一手】README、package.json |
| **NodeTool** | 開源（Web／桌面／手機） | 連線節點，@xyflow/react 12 | 有 | **有，多軌時間軸、分鏡卡、片段過期標記** | **AGPL-3.0**／607 | 很活躍（v0.8.10，2026-11-01） | 【一手】README |
| TwitCanva-Video-Workflow | 開源 | 自製畫布（不是 React Flow） | 有（**Hailuo 2.3**、Kling、Veo、fal） | 沒找到 | Apache-2.0／292 | 2026-07 | 【一手】README |
| Vibe-Workflow | 開源 | reactflow 11 | 有（只接 MuAPI） | 無 | MIT／637 | 2026-09 | 【一手】README |
| OneTake | 開源 | @xyflow/react 12 | 有（文生圖→圖生影片→TTS→ffmpeg） | 用 ffmpeg 串接 | **沒有授權**／12 | 2026-08 | 【一手】 |
| OpenCanvas | 開源 | @xyflow/react 12 | 自稱有 | 無 | MIT／45 | 黑客松作品 | 【一手】 |
| ComfyUI | 開源 | Litegraph＋Vue | 有（本地＋Partner API 節點） | 無 | GPL-3.0／144,779 | 很活躍 | 【一手】 |
| InvokeAI | 開源 | **@xyflow/react 12，React 19** | 以圖片為主 | 無 | Apache-2.0／28,970 | 很活躍（託管版已停） | 【一手】 |
| chaiNNer | 開源 | 節點 GUI | 圖片處理 | 無 | GPL-3.0／6,130 | 活躍 | 【一手】 |
| griptape-nodes | 開源（只有引擎） | 編輯器是雲端、閉源 | 透過函式庫 | 無 | Apache-2.0／86 | 活躍 | 【一手】 |
| ComfyUI-Montagen | 開源 | ComfyUI 時間軸 | 有 | 用節點控制時間軸 | AGPL-3.0／34 | **停更（2025-05）** | 【一手】 |
| kitchen-comfyui | 開源 | reactflow 版 ComfyUI 前端 | — | 無 | MIT／240 | **停更（2024-12）** | 【一手】 |
| Flowise | 開源 | LLM 流程 | 無 | 無 | 自訂授權／55,547 | **GitHub API 顯示已封存** | 【一手】 |

### F. 已停、已轉型或狀態不明

| 名稱 | 說明 | 證據 |
|---|---|---|
| Visual Electric | **已停**。2025-10-02 團隊被 Perplexity 收購，產品 90 天內關閉，訂戶可退款、匯出（[TechCrunch](https://techcrunch.com/2025/10/02/perplexity-acquires-the-team-behind-sequioa-backed-ai-design-startup-visual-electric/)） | 【一手】新聞 |
| Invoke 託管版 | **已停**。2025-10 團隊加入 Adobe，開源版繼續維護（[Invoke](https://app.invoke.ai)） | 【一手】 |
| Glif | 【未驗證】傳 2026-03 改成聊天代理、REST API 在 2026-05-20 停用，但同年 6 月還有目錄站描述它是節點建構器（[APIs.io](https://apis.io/providers/glif-app/)、[Tool Directory](https://tooldirectory.ai/tools/glif)） | 【單一來源】【衝突】 |
| Rubbrband | 搜尋沒有任何結果，可能已停或名字拼錯 | — |
| OpenCreator | 【衝突】有一份排行說它有節點畫布和時間軸，但它官網只看到 Storyboard Builder（[Alignify](https://alignify.co/tools/canvas-video)、[OpenCreator](https://opencreator.io/template-storyboard-builder)） | 【衝突】 |
| Sora App | 【未驗證】有一份指南說 OpenAI 公告 App 於 2026-04-26、API 於 2026-09-24 關閉，但找不到 OpenAI 或主流媒體佐證（[Shai Creative](https://shaicreative.ai/?p=1731)）。很多畫布仍列 Sora 2 當影片模型，這件事要先查清楚 | 【單一來源】 |

---

## 連線節點畫布在 18 個月內從新奇變成大廠標配

**結論 1：連線節點加影片已是基本配備，不是差異點。**

**證據：** 2025 下半年到 2026 上半年，這個品類被大量收購、大量跟進。Figma 在 2025-10-30 收購 Weavy 並改名 Figma Weave（[Dataconomy](https://dataconomy.com/2025/10/30/figma-buys-ai-design-startup-weavy-and-launches-new-brand-figma-weave)）；Weave 目前仍是**獨立產品、獨立計費**（[Figma Help](https://help.figma.com/hc/en-us/articles/35965787376919)）【一手】。Runway 在 2025-10 推出節點式 Workflows（[AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines)）。Freepik Spaces 在 2025-11-04 發新聞稿上線（[BusinessWire](https://www.businesswire.com/news/home/20251104023735/en/Freepik-Launches-Freepik-Spaces-to-Power-AI-Visual-Creation-and-Collaboration-in-Real-Time)）【一手】，2026-04-28 隨母公司改名 Magnific（[Hackceleration](https://hackceleration.com/labs/review/freepik-spaces)）【二手，改名日期未對過一手】。Adobe 的 Firefly Graph 有 **300+ 種節點**，2026-06 已給企業用（[Computerworld](https://www.computerworld.com/article/4186410/adobe-new-firefly-graph-can-turn-creative-workflows-into-reusable-assets.html)）。Higgsfield、Picsart、ImagineArt、Krea 也各自推出節點畫布，而且大部分都附「描述需求、AI 自動建圖」的代理：Krea Node Agent（2026-03-18）、Flora 的 FAUNA、Picsart Copilot（[Business Wire 2026-03-13](https://www.businesswire.com/news/home/20260313163797/en/Picsart-Unveils-AI-Copilot-in-Flow-Turning-Every-Creator-into-Their-Own-Creative-Director)）、Runway Agent、Scenario Node Agent，開源的 Node Banana 也有內建代理。

**推理：** 模型清單幾乎一樣。Weave、Flora、Krea、Spaces、Higgsfield、Astorie 列的都是 Seedance、Kling、Veo、Wan、Nano Banana、Seedream。Weave 直接透過 fal 接模型（[AlternativeTo](https://alternativeto.net/news/2025/11/figma-acquires-ai-content-platform-weavy-launching-node-based-image-and-video-editing-tool/)）。我們選 Seedream、Nano Banana、Hailuo，Krea（[Krea docs](https://www.krea.ai/docs/user-guide/features/nodes)）、ImagineArt（[docs](https://docs.imagine.art/workflows/ai-models.md)）和 Astorie（[Astorie](https://astorie.ai/features/ai-video-workflow)）都已經有。所以「能選模型」和「有節點」都說服不了客戶，能說服客戶的是**工作流程長什麼樣**。

**弱點：** 「有節點、有影片」大多是看文件和評測判斷的，沒有實際試用。好幾個產品的上線日期沒有一手來源（Krea Nodes、ImagineArt、Higgsfield Canvas、TapNow、Fuser）。Reddit／X 的原始討論串幾乎抓不到，所以「普及程度」是從廠商數量推的，不是從使用人數推的【推論】。（2026-11-03 補做的社群查核也沒有改變這點：Reddit 的節點討論幾乎全是 ComfyUI，商業畫布零星出現，見〈社群聲音（Reddit + X）〉。）

### 各家節點畫布的重點差異

**Flora** 最接近「給專業創意團隊用」的路線。官方 docs 寫，**費用是以美元計的用量池**：Starter $18 就是 $18 的生成額度，可以設共用或每人上限，也可以設超額上限，每個方案最多 8 個席位（[Flora docs](https://docs.flora.ai/plans-and-billing/pricing.md)）【一手】。它有「visual genealogy」分支版本歷史，還有把劇本拆成鏡頭序列的「Story Analysis」（[Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/)）【二手】。批評集中在影片控制太淺、單人使用很難回本、API 還在 beta（[PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders)）【競品自述】。

**Krea Nodes** 的官方 docs 寫得最完整：接口依型別上色，每個節點最多 10 條輸出連線，還有 Trim Video、Stitch Videos 這類工具節點（大多要 Pro），可以把 workflow 發布成 Node App 並用 API 呼叫，Business 方案可多人共編（[Krea docs](https://www.krea.ai/docs/user-guide/features/nodes)）【一手】。另外有價格追蹤站觀察到，「Access to Nodes Agent」在 2026-10-20 前後從方案比較表上消失（[PricingSaaS](https://pricingsaas.com/companies/krea/diffs/2026D294)）【單一來源】。

**Magnific Spaces** 是反面教材。有評測記錄一個 workflow **沒有任何警告就燒掉 41,000 credits**，主控台和 Spaces 裡顯示的餘額不一樣，退款也被拒（[Hackceleration](https://hackceleration.com/labs/review/freepik-spaces)）【二手】。它沒有迴圈、條件判斷或外部觸發，也沒有 API，只能手動匯出。它的「Lists」批次生產主打代理商（[kingy.ai](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)）。

**Higgsfield Canvas** 的官方 help 有兩點值得注意：**連 Kling 時，接進來的圖片會被當成起始幀**，這跟我們「分鏡圖當起始幀」的設計一樣；另外**建圖免費，生成才扣 credits**（[Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)）【一手】。它還有 FigJam 外掛，可以在 FigJam 裡用 Canvas 節點。

**Martini／Astorie** 的影片節點會依接進來的東西改變模式：接文字是文生影片，接一張圖是圖生影片，接多張圖是多參考，接影片是編輯（[Astorie](https://astorie.ai/features/ai-video-workflow)）【一手】。這是一個節省節點種類的設計。但它到底有沒有內建時間軸，來源有衝突：No Film School 的創辦人示範文說有時間軸編輯器和 XML 匯出（[No Film School](https://nofilmschool.com/martini-ai-film-set)），Astorie 自家頁面卻說最後剪輯交給 DaVinci／Premiere【衝突】。martini.art 轉址到 astorie.ai 一事沒有任何公告，改名是從轉址推出來的【推論】。

---

## 「節點＋時間軸」組合極少，而且證據都偏弱

**結論 2：大廠節點畫布幾乎都停在節點輸出，有時間軸的產品證據都不夠硬。**

**證據：** Weave 的官方定價頁和 help 都沒提時間軸。有一篇競品文說使用者會去別處找「可編輯的動態時間軸」（[Motionbox](https://motionbox.io/blog/best-figma-weave-alternatives-2026)）【競品自述】。Krea 只有 Trim／Stitch 節點【一手】，Spaces 只能手動匯出【二手】，Higgsfield 文件沒提【一手】。宣稱有時間軸的有以下幾家。**Dreamina AI Canvas** 在同一張畫布上跑 Seedream 5.0、Seedance 2.5、Seedaudio 2.0，並有內建時間軸排片段（[Dreamina AI Canvas](https://dreamina.capcut.com/ai-video/ai-canvas)）【廠商自述】；它自己的評測頁也承認**素材只能在目前畫布內搜尋，多條時間軸無法合併**（[Dreamina review](https://dreamina.capcut.com/ai-video/ai-canvas-review)）。**Flora** 有一個聚合站說 Timeline Editor 在 2026-07 推出（[checkthat.ai](https://checkthat.ai/brands/flora)），有一篇 LinkedIn 貼文說畫布上有多軌時間軸，Morphic 的競品頁卻說 Flora 沒有時間軸（[Morphic](https://morphic.com/de/resources/alternatives/flora-ai-alternatives)）【衝突】。**Runway** 的 Timeline Studio 在 2026-07-30 取代 Video Editor Projects，但它是 Workflows 以外的另一個介面，兩者之間能不能直接送片段過去沒查到（[scriptbyai](https://www.scriptbyai.com/runway-ai-timeline/)）【單一二手來源】。**Adobe Firefly Boards** 是畫板，不是節點：多選素材後按「Open in Firefly video editor」，就會**照選取順序**放上時間軸（[Adobe Help](https://helpx.adobe.com/firefly/web/create-mood-boards/firefly-boards/add-videos.html)）【一手】。VidMuse 只有搜尋摘要（[VidMuse](https://vidmuse.ai/blog/vidmuse-freeform-canvas-guide)）。Mosaic 是剪輯工具，用 XML 交給 Resolve／FCP／Premiere（[HN](https://hn.svelte.dev/item/45980760)）。

**推理：** 多數對手選擇「匯出到外部 NLE」，不自己做時間軸。可能是因為時間軸工程量大，也可能是他們的目標客群本來就用 Premiere【推論】。這代表「在同一個產品裡，鏡頭直接進剪輯器」仍然少見，而有在做的 Dreamina 是資源最多的那一家。線性分鏡工具（LTX Studio、Google Flow Scenebuilder、Sora storyboard 卡片）則是另一個極端：有鏡頭順序也有時間軸，但沒有節點，做不到「只改一個環節、其他保留」。LTX 的時間軸被評為比正式 NLE 陽春（[CineD](https://cined.com/ltx-studio-deep-dive-the-first-ai-based-full-editing-suite)）；Google Flow 的 Scenebuilder 據說離開專案就會重置（[Whisk AI Labs](https://whiskailabs.net/google-flow-ai-filmmaking-tool-veo-guide-2026/)）【未驗證】。

**弱點：** 「沒有時間軸」是從文件沒寫推出來的，文件沒寫不代表產品沒有。Flora、Dreamina、Runway 三家的時間軸都需要實際試用才能確認。研究員也表示，若要把這張比較表拿去用，需要再核對一次，因為過去半年有好幾家改過價格或產品（Flora 2026-05 改成美元計價、Runway 2026-07 退役舊編輯器、Martini 換網域）。

---

## 最接近我們 Prompt → 分鏡 → 影片 → 時間軸 的對手

**結論 3：沒有任何一個產品完整做到我們的組合。最該試用研究的是 Dreamina、Flora、NodeTool、Node Banana，其次是 Runway 和可靈。**

下面的排序是我的判斷【推論】，依據是「有沒有接線節點、有沒有分鏡或鏡頭概念、圖能不能當起始幀、有沒有版本、有沒有預估費用、有沒有時間軸」這幾點跟我們重疊多少：

| 排名 | 產品 | 重疊的部分 | 缺的部分 | 證據強度 |
|---|---|---|---|---|
| 1 | **Dreamina AI Canvas** | 節點畫布、自家 Seedream／Seedance、Nano Banana、內建時間軸、**澳幣標價** | 連線是否可見未說明；多條時間軸不能合併；沒看到版本和預估費用的描述 | 只有廠商自述 |
| 2 | **Flora** | 連線節點、劇本拆鏡頭、分支版本歷史、Run 按鈕可顯示美元、多席位 | 時間軸有衝突；影片控制淺；沒有「鏡頭」物件 | 定價有一手；其餘二手 |
| 3 | **NodeTool**（開源） | 分鏡卡（動作／鏡位／運鏡／秒數）、**先核准靜態圖再花錢做影片**、多軌時間軸、**參數一改片段就標示過期** | 以代理為主、規模小（607 星）、AGPL | 一手 README |
| 4 | **Node Banana**（開源） | 同樣用 xyflow 12、接 fal、Edit Video 時間軸節點、素材庫會記錄是哪個 workflow 產生的 | 沒有分鏡、鏡頭概念；沒確認有費用帳本 | 一手 README |
| 5 | Runway | 節點 Workflows＋Timeline Studio＋Agent | 兩個介面之間怎麼交接不明 | 二手 |
| 6 | 可靈 灵动画布 | 改 prompt 開分支（等於版本）、每步顯示成本明細、素材庫 | 2025-07 還在內測，現況不明 | 二手 |
| 7 | Martini／Astorie | 節點、多鏡頭、可能有時間軸／XML | 時間軸有衝突，改名未公告 | 一手＋二手 |
| 8 | Higgsfield Canvas | 圖當起始幀、建圖免費、可存成範本 | 文件沒提時間軸和版本 | 一手 |
| 9 | Adobe Firefly Boards | 首尾幀、照選取順序上時間軸 | 不是連線節點 | 一手 |
| 10 | LTX Studio | 劇本→場景→鏡頭→時間軸、Elements 保持角色一致 | 線性、沒有節點；重算很燒 credits | 二手 |

**證據：** NodeTool 的 README 描述了分鏡卡、角色／場景／風格「entities」（會貼進 prompt）、「approve stills before spending on video」、多軌時間軸，以及「片段綁定 workflow，參數改了就變 stale」（[NodeTool](https://github.com/nodetool-ai/nodetool)）【一手】。Node Banana 的 README 列出 Edit Video 節點（剪輯、分割、疊軌、音訊、音量曲線）、依相依順序執行、批次執行（[Node Banana](https://github.com/shrimbly/node-banana)）【一手】。可靈的部分來自 PingWest 2025-07-30 的報導（[PingWest](https://www.pingwest.com/a/306521)）【二手】。

**推理：** Flora 和 Dreamina 是威脅最大的商業對手，Flora 贏在專業團隊和費用透明，Dreamina 贏在價格和模型。NodeTool 證明「鏡頭→靜態圖→片段→時間軸＋過期標記」這套邏輯有人獨立想出來，算是間接驗證我們的方向【推論】。節點產品（Spaces、Weave、Higgsfield）在已讀到的文件裡只把鏡頭當成一群節點，沒有正式的「Shot」物件（例：[Chase Jarvis 的 Spaces 指南](https://chasejarvis.com/blog/freepik-spaces/)、[Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)）【推論：依據是文件沒寫】。

**弱點：** 排序靠文件和評測，不是實測。Dreamina 的描述全部來自字節自己。Flora 和 Runway 可能已經做到我們的功能，但文件沒寫。

---

## 值得直接抄的 UX 模式

**結論 4：在費用顯示、版本、「建圖免費、生成才付費」、片段過期這四點上，市場已有可參考的做法。但「整個鏡頭的總預估費用」和「明確的 v1/v2」沒人寫進文件，正好是可以做出差異的地方。**

**費用顯示。** 做法從透明到不透明依序如下。**Flora** 預設只顯示用量百分比條，打開「Show generation costs in dollars」後，**每個模型和 Run 按鈕上都會顯示確切美元**，另有依每次生成、專案、成員分開的 Usage History（[Flora docs](https://docs.flora.ai/plans-and-billing/pricing.md)）【一手】。這是跟我們「每個節點顯示預估費用」最接近的範本。**Krea** 的 Node Agent 建圖前會列出每個節點的運算成本，**使用者核准後才執行**；Node App 執行前也會顯示成本（[Krea docs](https://www.krea.ai/docs/user-guide/features/nodes)）【一手】。**可靈灵动画布**每一步都顯示成本明細【二手】。**Weave** 據說處理前會顯示 credits（[Banani](https://www.banani.co/blog/figma-weave-review)）【二手轉述】。**ImagineArt** 有一份 docs 說節點上會顯示每個模型的 credit 成本（[ImagineArt models](https://docs.imagine.art/workflows/ai-models.md)），另一份畫布介面 docs 卻完全沒提（[canvas docs](https://docs.imagine.art/workflows/canvas-interface.md)）【衝突】。**Magnific Spaces** 沒有清楚的事前警告【二手】。費用估算可以直接用供應商單價。fal 官方定價：Seedream V4.5 每張 $0.04、Nano Banana 2 每張 $0.08、Nano Banana Pro 每張 $0.15、Kling v2.5 Turbo Pro 圖生影片每秒 $0.07、MiniMax H3 Max Turbo 圖生影片每秒 $0.025（[fal pricing](https://fal.ai/pricing)）【一手】。H3 就是 Hailuo 03，這個對應來自 Wireflow（[Wireflow H3](https://www.wireflow.ai/features/minimax-h3)）【二手】。有社群回報，最便宜和最貴的影片模型之間差 6–10 倍（[Reddit 鏡像](https://reddit.sentinel-team.org/posts/1t47rf5/snapshots/2026-05-09T01%3A32%3A43.311857Z)）【二手】。**推理：** 模型價差這麼大，選模型時沒有費用預覽很容易嚇到帳單；費用不透明也是整個市場被抱怨最多的地方（Spaces、LTX、Google Flow、Adobe、Weavy 都有）【推論】。**弱點：** 抱怨多半來自評測站、Trustpilot、論壇鏡像，不是有系統的調查。

**版本。** 沒有任何來源描述「每個節點 v1/v2」這種介面。最接近的是 Flora 的分支 genealogy、可靈「改 prompt 開分支不覆蓋」，以及 Krock.io 在分鏡板上做版本管理（[Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools)）。LTX 的 Retake 只重算鏡頭裡 2–16 秒的片段，不必整段重來（[Luma 對 LTX 的評測](https://lumalabs.ai/news/ltx-studio-review)）【競品自述】。**推理：** 我們的「明確版本＋main clip」比分支樹更好懂，對不想看圖的代理商客戶比較友善【推論】。**弱點：** 找不到描述也可能是研究不夠深，這需要實際試用確認。

**建圖免費、生成才付費。** Higgsfield（建節點、拉線都不扣點）、Comfy Cloud（「only for active GPU time while a workflow is actually running」，見[Comfy blog](https://blog.comfy.org/p/comfy-cloud-is-out-of-beta-and-its)）【一手】都這樣做。要注意 Higgsfield 的 Unlimited 方案**在 Canvas 不適用**，這種例外條款很容易引來客訴。Runway Edit Studio 生成前可以先預覽關鍵幀（[Runtime Wire](https://runtimewire.com/article/runway-aleph-2-edit-studio-natural-language-video-editing)），Luma Ray3 Draft Mode 號稱約 5 倍快、省約 5 倍 credits（[Genra](https://genra.ai/blog/luma-ray3-complete-guide-review)）【未驗證】。這兩個「先出草稿再出正式版」的做法，可以接在我們分鏡階段後面。

**片段過期與「先核准靜態圖」。** NodeTool 是唯一有文件寫明的：片段綁定產生它的 workflow，參數一改就標示 stale；流程設計成先核准便宜的靜態圖，再花錢做影片（[NodeTool](https://github.com/nodetool-ai/nodetool)）【一手】。Spaces 改了圖片 prompt 會自動帶動下游的影片節點（[Chase Jarvis](https://chasejarvis.com/blog/freepik-spaces/)），這是「自動傳遞」，跟「標示過期」是兩種不同選擇。對按次付費的產品來說，標示過期、讓使用者自己決定要不要重算比較安全，自動重算可能在背後燒錢【推論】。

**其他。** 圖片接影片節點就當起始幀（Higgsfield、Spaces、Google Flow 的 Frames to Video）；首尾幀（Adobe、Google Flow）；角色、場景參考物件（LTX Elements、Morphic character sheet）；照選取順序上時間軸（Adobe）；影片節點依輸入改變模式（Astorie）；型別安全的接口，圖片接口只能接圖片（ImagineArt、Krea、TwitCanva）。

---

## 能合法重用的開源程式碼

**結論 5：程式碼能直接拿來用的只有 MIT 和 Apache-2.0 專案，最值得讀的是 Node Banana 和 InvokeAI。NodeTool 和 ComfyUI 只能參考設計，不要複製程式碼。**

| 專案 | 授權 | 技術棧 | 能拿什麼 | 注意 |
|---|---|---|---|---|
| **Node Banana** | MIT | Next.js 16＋@xyflow/react 12.11 | 節點登錄、依相依順序執行、fal／Replicate 供應商層、Edit Video 時間軸節點 | 只有 11 個月大；內部架構沒細看 |
| **InvokeAI 前端**（webv1／webv2） | Apache-2.0 | @xyflow/react 12＋React 19 | 最成熟的大型 React Flow 圖編輯器：型別連線、驗證、執行 | 以本地 diffusion 為主，程式碼量大 |
| TwitCanva | Apache-2.0 | Vite＋React 19＋Express 代理 | **Hailuo**、Kling、fal 呼叫；IMAGE→VIDEO 連線驗證；後端保管 key | 畫布不是 React Flow |
| xyflow／React Flow | MIT | — | 我們已經在用 | — |
| vercel/ai-elements | LICENSE 檔是 Apache-2.0（GitHub 判成 NOASSERTION） | @xyflow/react 12 | Canvas 元件、節點和連線樣式 | 偏聊天／代理用途 |
| fal-js | MIT | — | fal 客戶端 | — |
| ComfyUI-fal-API | Apache-2.0 | Python | 1,400+ fal 模型的參數定義可參考 | ComfyUI 節點包 |
| Vibe-Workflow、OpenCanvas、noder | MIT | reactflow 11／xyflow 12 | 小型參考 | Vibe-Workflow 綁 MuAPI 廠商 |
| **NodeTool** | **AGPL-3.0** | xyflow 12＋Python | **只參考設計**（分鏡卡、過期標記、先核准靜態圖） | 用到它的程式碼對外提供服務，就要公開原始碼 |
| ComfyUI、ComfyUI_frontend | GPL-3.0 | Litegraph＋Vue | 只參考設計；`comfy_api_nodes/` 有各閉源 API 的參數形狀可看（[ComfyUI](https://github.com/Comfy-Org/ComfyUI/tree/master/comfy_api_nodes)） | 前端也不是 React，移植價值低 |
| OneTake、Nexa-Canvas 等小專案 | **沒有授權** | xyflow 12 | 只能看 | 預設是「保留所有權利」 |
| n8n、Dify、Flowise、ComfyUI-LTXVideo、HunyuanVideo | 自訂／NOASSERTION | — | 不建議 | 條款沒有全文讀過；Flowise 已封存 |

**證據：** 授權用的是 GitHub API 判定的 SPDX 代碼，研究員在 2026-11-03 抓取，各專案的 package.json 也有讀（[Node Banana package.json](https://github.com/shrimbly/node-banana/blob/main/package.json)、[InvokeAI webv2 package.json](https://github.com/invoke-ai/InvokeAI/blob/main/invokeai/frontend/webv2/package.json)）【一手】。

**推理：** MIT 和 Apache-2.0 允許閉源商用，條件是保留版權聲明和授權全文；Apache 另有 NOTICE 檔和專利條款。AGPL 的特點是「透過網路提供服務」就要公開原始碼，所以 SaaS 不能碰。GPL 在純伺服器端使用時一般認為不觸發，但**前端 JS 送到使用者瀏覽器通常被視為散布**，所以 GPL 的前端程式碼也不該抄進來。以上是一般授權知識，不是法律意見；如果要把 ComfyUI 當獨立後端程序接起來，需要請律師另外看【推論】。模型權重（Wan、LTX、Hunyuan）有各自的授權，本輪沒有查。

**弱點：** Node Banana 和 NodeTool 的內部程式碼（store 結構、費用、版本紀錄）沒有實際打開看。研究員建議的下一步是在它們的程式碼裡搜尋 cost／price／usage。GitHub 搜尋中途被限流，小型專案應該還有漏掉的。另外有一份搜尋摘要說「React Flow 團隊發文表示 Weavy 是用 React Flow 做的」，但那份摘要把收購方寫錯了，原文沒有核對【未驗證】。

---

## 缺口與我們的差異化機會

**結論 6：值得主打四件事：「鏡頭是正式物件＋main clip 送進剪輯器」、「生成前顯示整個鏡頭的總費用」、「明確版本＋過期標記」、「代理商客戶審閱」。要補的短板是 AI 代理建圖、批次生產，以及跟 Dreamina 的價格差距。**

**證據：** 我們能主打的四點都有對應的市場缺口。(1) 沒有來源描述「Shot 節點帶出 Storyboard 再到 Video，最後一起上時間軸」的單一畫布（video pipeline 研究結論，見上方各產品來源）。(2) 每個節點都有費用的例子不少（Flora、Krea、可靈），但「一鍵跑完整個鏡頭，先顯示總額」沒有任何文件寫到。費用不透明是各家共同的抱怨：LTX 用戶說重算燒掉大量 credits、沒用完的 credits 不能累積（[Trustpilot](https://ca.trustpilot.com/review/ltx.studio)），Google Flow 生成失敗也照扣（[Google AI forum](https://discuss.ai.google.dev/t/credit-charges-with-no-editing/178360)）。(3) 明確的 v1/v2 沒有任何文件描述；過期標記只有 NodeTool 有。(4) 客戶審閱在節點產品裡幾乎看不到，只出現在分鏡工具：Boords 有客戶留言和分享、Krock.io 有標註式審閱（[Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools)）。

要補的短板也有證據。AI 代理建圖已是各家標配（見結論 1）。批次生產有 Freepik Lists 和 Flora Batch Techniques（[checkthat.ai](https://checkthat.ai/brands/flora)）。Dreamina 用自家模型補貼，A$22.90 有 2,215 credits；RunningHub 的 Seedance 2.5 每秒 $0.036 起，是補貼後的價格（[RunningHub](https://www.runninghub.ai)）【一手】。我們靠第三方 API，單價很難壓得比它們低。

**推理：** 對澳洲代理商來說，「這個鏡頭會花多少錢、交給客戶的是哪一版、哪些片段已經過期」比模型數量更重要，因為他們要對客戶報價，也要管修改次數【推論】。另外，有評論認為節點太複雜、拉線太抽象，而且沒有排序視圖（[ponpon.ai](https://ponpon.ai/blog/end-to-end-long-form-ai-video-pipeline)）【廠商部落格意見】；Weave 的學習曲線也常被批評（[Banani](https://www.banani.co/blog/figma-weave-review)）。這支持把線藏在「鏡頭卡」後面，讓非技術的代理商用戶只看到鏡頭、版本和費用【推論，未經使用者測試】。

**弱點：** 本輪**沒有找到任何澳洲市場專屬的資料**，包括本地競品、澳洲代理商的使用習慣、澳幣定價慣例。Dreamina 用澳幣標價是唯一的在地化訊號。差異點都是從「文件沒寫」推出來的，對手可能已經默默上線。字節、Adobe、Runway 都有能力在一季內補上時間軸或費用預覽。

---

## 社群聲音（Reddit + X）

> 2026-11-03 補做。Reddit：r/comfyui、r/StableDiffusion、r/aivideo、r/runwayml、r/generativeAI、r/KlingAI_Videos 的年度 top 100，讀了 18 串。X：一份 Grok 回答（15 則），oEmbed 抽查 6/6 作者、日期、內文相符，**互動數全部未驗證**。完整交叉查核見 `research_notes/節點式 AI 生成工具盤點/reddit-x-2026-11-03/report.md`。**本節全部是社群訊號，不是市場數據。**這兩個平台的節點討論以 ComfyUI 本地技術使用者為主，不代表澳洲代理商或一般創作者。

**結論 7：社群最一致的聲音是「節點圖太亂」，其次是「節點之後缺時間軸」。商業畫布本身在社群裡幾乎沒被討論，所以社群資料只能支持我們的方向，不能用來比較對手的使用者滿意度。**

**證據：**

- **複雜度是兩邊唯一站得住的共識。** Reddit：〈The average ComfyUI experience when downloading a new workflow〉↑1074（[Reddit](https://www.reddit.com/comments/1oqwj6t)），最高留言 ↑325 列出下載別人 workflow 的慘況，↑39 稱它「spaghetti nightmare of terrible UX」；整理連線的 reroute 節點 ↑602（[Reddit](https://www.reddit.com/comments/1pqqtbv)）、cable management 擴充 ↑444（[Reddit](https://www.reddit.com/comments/1vi2v3s)）。X：只有低互動的個人抱怨，例如 [@YuliyaValen1999](https://x.com/YuliyaValen1999/status/2116151418008768683)（更新太多跟不上）、[@Not_Weird_Green](https://x.com/Not_Weird_Green/status/2116377396722938080)【一手：Reddit 分數為抓取快照；X 兩則未抽查】。
- **時間軸缺口只在 Reddit 有證據。** 4 串年度熱門是使用者自己在 ComfyUI 上補時間軸或剪輯層：NKD Preview Tools ↑307（[Reddit](https://www.reddit.com/comments/1vkhlot)，作者是專業剪輯師）、LTX Director 2.0 ↑486（[Reddit](https://www.reddit.com/comments/1ub4lui)）、Wan TTM timeline ↑371（[Reddit](https://www.reddit.com/comments/1pchua3)）、ComfyStudio ↑270（[Reddit](https://www.reddit.com/comments/1sunnmo)，比較像導演／剪輯層）。另有一串 ↑318 說日常瓶頸是管素材、批次和挑片，不是接線（[Reddit](https://www.reddit.com/comments/1vh32n7)）。X 上 Grok 說找不到「偏好時間軸」的高互動貼文【一手；作者身分未逐一核對】。
- **計費不滿的證據很薄。** X 唯一有連結的使用者付費痛點來自 [@SataEricUX](https://x.com/SataEricUX/status/2116938308043559412)：credit 會過期、使用是一陣一陣的，所以不再付費 Higgsfield／Weave／Flora，改成自建（低到中互動，已抽查相符）。Reddit 上只有一位 0 分發文者主張現有節點編輯器「charging a subscription AND taking a cut」（[Reddit](https://www.reddit.com/comments/1rxwp4j)），以及對 Higgsfield「deceptive billing」的匿名指控 ↑104（[Reddit](https://www.reddit.com/comments/1xixx2p)）【單一來源；指控未查證】。
- **AI 代理建圖有熱度，但熱度多來自廠商。** X 的 [@ComfyUI 官方](https://x.com/ComfyUI/status/2105697121190178891)（約 5732 likes）和 ComfyUI 員工 [@c__byrne](https://x.com/c__byrne/status/2049619957647028538)（約 436 likes）在推；Reddit 的 Claude Code 操作 ComfyUI 串 ↑552（[Reddit](https://www.reddit.com/comments/1r6cc8b)）留言卻在質疑資安（↑17）和實用性（↑16）【廠商自述＋一手留言】。
- **開源複製品很多。** X 的 [@RaphaelLiu10](https://x.com/RaphaelLiu10/status/2115913910075449637) 發布 MIT 授權的開源 Higgsfield Canvas 替代品（約 581 likes），Reddit 的 Freefield 把 Higgsfield 改成 ComfyUI 工作流 ↑426（[Reddit](https://www.reddit.com/comments/1xh73t4)）。兩者都是作者自己發文推廣【廠商自述】。
- **商業畫布在 Reddit 幾乎沒人談。** Weavy 只有 3 串，全部 0 分，被「須開源／本地」版規擋下；Flora、Krea Nodes、Magnific Spaces、Runway Workflows、Dreamina、ImagineArt 在年度熱門裡零或接近零。

**推理（對我們的意義）：**

1. **把線藏起來是對的。** 連重度 ComfyUI 使用者都把「整理連線」的工具推到 400–600 分，澳洲代理商和創作者對複雜度的容忍度只會更低。這支持結論 6 的「讓非技術用戶只看到鏡頭、版本和費用」，React Flow 的線可以預設收起、只在進階模式露出【推論】。
2. **時間軸缺口有了使用者端的旁證。** 結論 2 原本只靠「對手文件沒寫」；現在多了一個訊號：重度使用者自己動手補時間軸。我們「main clip 直接送進時間軸」的設計對應的正是這個缺口【推論；只有 Reddit 一個平台】。
3. **挑片和版本比接線更花時間。** ↑318 那串說日常時間花在管素材、批次和挑片。這支持「明確 v1/v2＋main clip」優先於更多節點種類【推論】。
4. **計費要考慮「接案才用」的節奏。** 代理商的用量跟著案子走，credit 過期的月訂閱對他們不友善。每節點費用之外，可以考慮按專案的預算上限、不過期的預付額度，或像 Flora 一樣用美元計的用量池【推論；計費證據只有單一低互動來源】。
5. **AI 代理建圖的安全做法是「先提案、顯示費用、使用者核准才跑」。** 社群對代理的疑慮在可靠度和權限，Krea Node Agent「建圖前列出每個節點成本，核准後才執行」的做法剛好回應這點（見結論 4）【推論】。
6. **節點畫布很容易被複製。** 開源替代品頻繁出現，再次說明「節點＋多模型」不是護城河（結論 1）【推論】。

**弱點：** Reddit 只看了各板年度前 100 名，標題搜尋大多逾時，商業畫布的中低熱度討論可能被漏掉。X 只有一份 Grok 回答，互動數全部未驗證；互動最高的 5 則裡有 4 則是廠商、員工、工具作者或疑似業配（例如疑似 Dreamina 業配的 [@FellMentKE](https://x.com/FellMentKE/status/2117295315565121868)）。兩邊都沒有澳洲在地討論、沒有代理商視角，也沒有 credit 驚喜花費的具體數字。社群資料不能用來判斷 Flora、Weave、Dreamina 做得好不好，那仍然要靠實際試用。

---

## 需要另外處理的衝突與未驗證項目

下面這些衝突不影響主結論，但引用前要先核對。**Flora 的時間軸**：checkthat.ai 和 LinkedIn 說有，Morphic 說沒有。**Martini 的時間軸**：No Film School 說有，Astorie 頁面說交給外部 NLE。**Comfy Cloud 免費額度**：官方頁寫 5 次免費執行，多家第三方寫每月 400 credits（[Comfy pricing](https://comfy.org/pricing)、[Wireflow](https://www.wireflow.ai/blog/best-comfyui-cloud-pricing-tools-in-2026)）。**Krea 價格**：$9 到 $200 都有人寫，官方定價頁讀不到。**ImagineArt 的節點費用顯示**：兩份 docs 說法不同。**Flora 模型數**：50+、60+、200+ 都有。**Flora A 輪日期**：2025-04 或 2026-01（[Dealroom](https://ai-startups.dealroom.co/news/feed/node-based-design-tool-flora-raises-42m-from-redpoint-ventures-2)、[SiliconANGLE](https://siliconangle.com/?p=729193)）。**Weavy 收購價**：只有 Calcalist 標題說超過 $200M（[Calcalist](https://www.calcalist.co.il/calcalistech/article/rym0rywk11x)），沒有其他來源。**Lovart 估值**：Caplight 寫 $2B，TechCrunch 贊助文寫未公開。**Glif 是否轉型**、**Sora App 是否關閉**、**ComfyDeploy 是否還在**、**Comfy.ICU 是否存在**、**可靈灵动画布是否結束內測**，全部【未驗證】。另外 Dreamina 頁面同時出現「A$0.44 首月」和「$0.29／月、98% off」兩種促銷，彼此不一致（[Dreamina](https://dreamina.capcut.com/ai-video/ai-canvas)）。

研究方法的限制：Runway help、BetaNews、Freepik docs、VidMuse、Civitai 文章都回 403，只能靠搜尋摘要。Reddit／X 只拿到鏡像快照（2026-11-03 補做的社群查核及其限制見〈社群聲音（Reddit + X）〉）。Pika、Hedra、Invideo、Pollo、Recraft、Canva、Kling 自家畫布、即夢、Hugging Face Spaces 都沒有深入查。iOS／Android 上沒有找到節點式 app。

---

## 結論

這份盤點改變了問題的問法。原本的問題是「有沒有人做節點式 AI 影片畫布」，答案是太多了，而且 Figma、Adobe、Runway、字節、快手都在場上。現在該問的是「誰把節點畫布接到可交付的成片」。在這一段，大廠的選擇是交給外部 NLE，或做一個跟節點分開的時間軸。真正把「鏡頭」當成正式物件、把版本、預估費用和過期狀態綁在鏡頭上的，目前只有一個 607 星的 AGPL 開源專案。對我們來說，節點畫布只是入場券，價值在畫布之後那一段：一個鏡頭從分鏡到 main clip 再到時間軸的完整生命週期，加上全程看得到的錢。

接下來最值得做的三件事：第一，用免費額度實際試用 Dreamina AI Canvas 和 Flora，確認它們的時間軸和費用顯示到底做到哪裡，因為它們是最可能讓我們的差異點失效的兩家；第二，讀 Node Banana（MIT）的執行引擎和 fal 供應商層，看哪些可以直接拿來用；第三，參考 NodeTool 的過期標記和「先核准靜態圖」設計（只看設計，不抄 AGPL 程式碼），把「整個鏡頭的總預估費用」做成我們最醒目的介面元素，因為這是全市場被抱怨最多、也還沒有人在文件裡承諾的地方。
