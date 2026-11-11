# 把爆款變成分鏡的位置，還沒有人佔

**結論先講：** 跟 Trend Finder 相鄰的產品大約有 22 個，分成四層，但**沒有一家把「找到自然流量的爆款 → 歸納格式 → 給真人拍的可編輯分鏡 → 客戶批准」串起來**。找趨勢的工具（Sandcastles、Virlo、Format Finder）做到腳本就停了。「複製這支廣告」的生成器（Creatify、MakeUGC、Higgsfield）拿的參考素材是 Meta 廣告庫，產出的是 AI 演員影片，不是給剪輯師的分鏡。剪輯和切片工具（OpusClip、Submagic、Captions）只處理你已經有的素材。YC 名單也一樣：投資集中在生成、AI 剪輯和「代理商即軟體」，負責「找」的那一層只剩 Bluma（F25，複製對手爆紅影片，但做的是生成）和 Syncly（W23，給大型 CPG 品牌的影片社群聆聽），唯一純做趨勢分析的 Trendpop（W21）在 2022 年被收購。GitHub 上能直接放進商業產品的，只有底層工具：yt-dlp、PySceneDetect、faster-whisper／WhisperX。功能最接近的 ViralMint 是 AGPL 授權，只能參考不能抄。2026-10-30 我們用 Apify 實際抓了 8 個品牌的 TikTok 和 7 個品牌的 Instagram（花費 **US$0.67**），結果很清楚：**這些品牌點閱最高的影片，大多不是自家的產品 demo，而是創作者合作貼文、付費推廣，或 CapCut 那種「範本」機制**。Instagram 播放前 10 名的 reel 全部用「留言 X 拿連結」當 CTA；TikTok 上標為廣告的影片，按讚率中位數只有 0.65%，自然流量的影片是 6.46%。這次也順便解開了上一輪的懸念：clockworks 的 `profileSorting: popular` **是照按讚數排序，不是照播放數**（8 個帳號 8 個都是）。所以之後的搜尋要多抓一些再自己用播放數重排，並且把廣告和合作貼文標出來，不然「爆款」會混進買來的流量。

> **證據標籤說明**（存取日期皆為 2026-10-30，雪梨時間）：〔已核對原頁〕＝研究員抓取並讀了該頁；〔僅摘要〕＝只看到搜尋結果摘要或第三方頁面；〔廠商自述〕＝廠商對自己的說法；〔競品所述〕＝對手寫的比較頁；〔Apify 實測〕＝本次自己跑 Apify 拿到的資料集，數字是登出狀態下的快照，沒有逐支到平台上核對；〔推論〕＝本報告的判斷，不是任何來源的原話。爆款公式（觀看 ÷ 帳號中位數）和平台 API 能拿到哪些指標，上一份報告《短影音趨勢驗證與競品護城河》已經處理，本報告不再重複，只在需要時引用。

## 22 個產品分四層，每一層都停在分鏡前面

### 競品地圖

| 層 | 產品 | 做到哪一步 | 價格（美元／月） | 對代理商的支援 | 牽引力／資金 | 證據 |
|---|---|---|---|---|---|---|
| 找＋腳本 | Sandcastles | 追蹤指定頻道的 outlier、解釋爆紅原因、產出「remix playbook」、hook、腳本；IG／TikTok／Shorts | $49／$99／$499（年繳 $39／$79／$399） | 只有 Titan 方案有 20 個 workspace 和訪客權限 | 沒找到 | 〔已核對原頁〕([Sandcastles](https://www.sandcastles.ai)) |
| 找＋腳本 | Virlo | outlier、AI 拆解 hook／格式、用你的語氣寫腳本、MCP、Meta 廣告庫 | $49／$199／$499 起 | 明確鎖定管理多個客戶帳號的代理商，3–10 個席位 | 「1,700+ teams」〔廠商自述〕 | 〔已核對原頁〕([Virlo](https://virlo.ai/start)、[About](https://virlo.ai/about)) |
| 找＋腳本 | Format Finder | 65+ 個命名格式、依利基生成 hook／腳本／**拍攝計畫**、一鍵剪輯 | $29／$59／$97 | 未提 | 沒找到 | 〔廠商自述〕([Format Finder](https://formatfinder.onepeakcreative.com/resources/compare/format-finder-vs-sandcastles-ai)) |
| 找＋腳本 | Blort | 找對手最好的內容、逐格拆解、改寫成你的產品 | 未公開 | 未提 | 沒找到 | 〔僅摘要〕([creatoreconomytools](https://creatoreconomytools.com/tool/blort-ai)) |
| 找＋腳本 | Spotter Studio、vidIQ Remix | 只做 YouTube（長影音）的點子發想 | Spotter 約 $49（狀態不明，定價頁 404） | 無 | — | 〔僅摘要〕([TechCrunch](https://techcrunch.com/2024/09/03/spotter-launches-ai-tools-youtubers-brainstorm-video-ideas-thumbnails)、[vidIQ](https://support.vidiq.com/en/articles/9899331-remix)) |
| 複製廣告／AI 演員 | Creatify | Ad Clone 用你的產品重建對手廣告結構；追蹤 1,000 萬+ 支 Meta 廣告；投放 | $15–195；API $99／$299 | Business 方案 10 席位、10 個 brand space，另有代管服務 | ARR $9M、A 輪 $15.5M〔廠商自述〕 | 〔已核對原頁〕([Creatify](https://www.creatify.ai/pricing)、[BusinessWire](https://www.businesswire.com/news/home/20250528506486/en/Creatify-Crosses-$9M-ARR-Raises-$15.5M-Series-A-to-Launch-the-First-End-to-End-AI-Ad-Agent-for-Video)) |
| 複製廣告／AI 演員 | MakeUGC | 1,000+ AI 演員、Ad Remake、UGC 格式庫、批次 10 個版本 | $29／$39／$79（年繳） | 導向 Agencies 頁 | 沒找到 | 〔已核對原頁〕([MakeUGC](https://www.makeugc.ai)) |
| 複製廣告／AI 演員 | Higgsfield | Recreate 把參考影片的動作換成你的角色；Content Factory 把熱門風格做成系列 | 約 $19／$47／$99〔僅摘要〕 | 企業客戶已佔多數營收 | B 輪 $400M、估值 $5.4B、年化約 $700M〔廠商自述〕 | 〔已核對原頁〕([Higgsfield](https://higgsfield.ai)、[TNW](https://thenextweb.com/news/higgsfield-series-b-400m-5-4bn-valuation-700m-revenue)) |
| 複製廣告／AI 演員 | Arcads | AI 演員 UGC、現成廣告格式、團隊畫布 | 約 $110 起〔僅摘要〕 | 共享畫布 | 「millions」〔廠商自述〕 | 〔已核對原頁〕([Arcads](https://www.arcads.ai)、[Fluxnote](https://fluxnote.io/guides/arcads-pricing-2026)) |
| 複製廣告／AI 演員 | Icon | 從 AI 廣告製作**轉向真人 UGC**：每月 6 支、18 種格式，付款前先看 6 份腳本 | $1,000 | 白牌 API | 「$30M+ raised」〔廠商自述〕 | 〔已核對原頁〕([Icon](https://www.icon.com)) |
| 生成／剪輯 | HeyGen | 頭像、翻譯、Video Agent（提示 → 成片）、MCP | $29／$49／$149 | Business 共享 workspace、品牌套件 | ARR 超過 $200M〔廠商自述〕 | 〔已核對原頁〕([HeyGen](https://www.heygen.com/pricing)、[HeyGen blog](https://www.heygen.com/blog/heygen-surpasses-200m-arr)) |
| 生成／剪輯 | Captions（Mirage） | AI Edit 自動剪接、B-roll、數位分身、字幕 | 約 $24.99（iOS）〔僅摘要〕 | 未提 | 2026-03 募得 $75M | 〔已核對原頁〕([Captions](https://www.captions.ai)) |
| 生成／剪輯 | CapCut | 從 TikTok 熱門格式長出的範本庫，把素材丟進範本就好 | Pro $7.99–19.99（來源不一） | 無 | — | 〔僅摘要〕([Socialrails](https://socialrails.com/blog/capcut-pricing-guide)) |
| 剪輯／切片 | OpusClip、Submagic、Descript、Vizard、Klap、Choppity、VEED、Munch | 長片切短片、字幕、品牌範本、排程 | 入門 $14–29 | 多為分享連結或團隊 workspace；Choppity Enterprise 有白牌 | Submagic 自力營運，約 $8M ARR〔僅摘要〕 | 〔已核對原頁〕([Opus](https://www.opus.pro/pricing)、[Submagic](https://www.submagic.co/pricing)、[Choppity](https://www.choppity.com/pricing)、[Munch](https://www.munchstudio.com/pricing)) |

**結論一：最接近我們的是 Format Finder（概念）和 Virlo（客群），但兩者都沒有「客戶批准」，也沒有把某支真實爆款轉成分鏡。**

證據：Format Finder 是唯一寫明會產出「shot plans」的產品，但它的格式是人工整理的 65 個固定格式，不是從你的利基即時抓出來的，也不追蹤頻道 ([Format Finder](https://formatfinder.onepeakcreative.com/resources/compare/format-finder-vs-sandcastles-ai))〔廠商自述〕。Virlo 明說要服務「管理多個客戶帳號的代理商」，但產品做到腳本為止，自家部落格還建議行銷人把輸出丟進 AI 影片工具 ([Virlo](https://virlo.ai/start))〔已核對原頁〕。所有產品的公開定價頁，都找不到給客戶簽核分鏡的流程；「審閱」指的是分享連結（Opus、Submagic），或是代管服務裡的一個步驟（Icon 付款前讓你看 6 份腳本）([Opus](https://www.opus.pro/pricing)、[Icon](https://www.icon.com))〔已核對原頁〕。

推理〔推論〕：Trend Finder 的差異不在「找得到 outlier」（這已經是商品），而在兩個步驟：一是把「一支真實的爆款」抽象成「一個格式」，再轉成「這個客戶能拍的分鏡」；二是讓客戶在拍攝前簽核。這跟上一份報告的結論一致：缺的是代理商流程，不是 AI 能力。

弱點：判斷只根據公開定價頁和功能頁，登入後的功能都沒有實測。Format Finder 的資料出自它自己寫的比較頁。

**結論二：「複製爆款」這件事，市場的主流答案是不拍了、改用 AI 演員；Icon 反向轉回真人，是唯一一個支持「真人拍攝」的訊號。**

證據：資金流向很一面倒：Higgsfield 估值 $5.4B、HeyGen ARR 超過 $200M、Mirage 募 $75M、Creatify A 輪 $15.5M；Sandcastles、Blort、Format Finder 都找不到融資紀錄 ([TNW](https://thenextweb.com/news/higgsfield-series-b-400m-5-4bn-valuation-700m-revenue)、[HeyGen](https://www.heygen.com/blog/heygen-surpasses-200m-arr)、[BusinessWire](https://www.businesswire.com/news/home/20250528506486/en/Creatify-Crosses-$9M-ARR-Raises-$15.5M-Series-A-to-Launch-the-First-End-to-End-AI-Ad-Agent-for-Video))。Icon 原本是「The AI Admaker」，2026 年改賣每月 $1,000 的真人 UGC，主打「no AI / 100% real」([Icon](https://www.icon.com))〔已核對原頁，廠商自述〕。另外，這幾家生成器「複製」的參考來源多半是 Meta 廣告庫，不是 TikTok／Reels 的自然流量（Creatify、Virlo Pro、Icon）。

推理〔推論〕：Mercif 的剪輯師在印尼、拍的是真人，賣的是真實素材和手藝。生成器越便宜，「為什麼還要真人拍」的壓力越大，所以我們的說法要站在「品牌安全＋客戶信任」上，而不是「比較省」。法律上也比較乾淨：把來源影片只存成連結、產出新的分鏡給真人拍，比 Higgsfield Recreate 這種直接複製動作和肖像的做法風險低（這是一般原則，未經律師確認）。

弱點：Icon 的轉向只是一個案例，「AI UGC is illegal as of June 9, 2026」那句話在它頁面上沒有出處，我們無法確認。

**結論三：關於剪輯層，上一份報告已經確認它是商品，這次的新資訊只有一個：Munch 已經從切片工具變成「腳本＋生成」套件，並在定價頁放了「For Agencies」。**

證據：Munch 的 Premium 方案是 $60／月，包含無限腳本、30 支生成影片、無限團隊成員，頁面上沒有它過去宣傳的爆紅分析 ([Munch](https://www.munchstudio.com/pricing))〔已核對原頁〕。

推理〔推論〕：剪輯工具正往上游的「腳本」移動，這是值得盯的威脅方向，但目前還沒有任何一家往「分鏡簽核」移動。

弱點：Munch 的頁面沒有說明代理商功能具體是什麼。

## YC 投的是生成和代理商服務，「找」這層只剩兩家

| 公司 | 批次 | 做什麼 | 覆蓋（找／格式／翻拍／生成／發佈） | 客群 | 牽引力（標籤） | 跟我們的關係〔推論〕 |
|---|---|---|---|---|---|---|
| Bluma | F25 | 「第一個 AI 短影音內容引擎」，端到端複製對手的爆紅影片 | 找（對手參考）、翻拍、生成 | 未寫明，推測是行銷／成長團隊 | 2 人團隊，beta，無數據〔已核對原頁〕 | **最接近的 YC 公司**，但做的是生成，沒有分鏡或批准 |
| Syncly | W23 | 影片時代的社群聆聽：品牌／對手聆聽、創作者搜尋 | 找 | 大型 CPG（Tiffany、Clorox） | ARR $2.1M、NDR 142%〔廠商自述〕；種子輪 $3.3M | 同樣分析影片，客群是大品牌，不衝突 |
| Trendpop | W21（2022-01 被 Collab 收購） | 短影音行銷分析平台 | 找、格式 | 唱片公司、品牌 | 分析「超過 10 億支」影片，12 個月內獲利〔廠商自述〕 | 唯一的純趨勢分析 YC 案例：早早獲利，賣得不大 |
| Kuli | P26 | 給大型消費品牌行銷團隊的 AI 同事，分析社群影片找創作者 | 找、營運 | 大品牌（Disney、Nivea） | 「某 Fortune 100 娛樂品牌出活動量變 3 倍」〔廠商自述〕 | 大品牌端，不衝突 |
| Grocalo | S26 | 幫創作者經營內容的 AI 大腦 | 找／發佈、部分生成 | 喜劇／娛樂創作者 | 「2 個月 20 億觀看」〔廠商自述〕 | 創作者端 |
| Knowlify | S25 | 包辦式影片廣告代理商：AI UGC、動畫廣告、Meta 投放 | 生成、營運 | 跑付費社群的公司 | 月方案每週約 25 支成片〔廠商自述〕 | **跟 Mercif 搶客戶**，不是賣給代理商 |
| Tell if AI | F25 | AI 經營的成效代理商，用真手機跑數百個帳號 | 生成、發佈 | 品牌 | 營收分成〔廠商自述〕 | 同上 |
| InstaAgent | P26 | 一份 brief 生成數百種受眾版本，投 Meta／TikTok | 生成、發佈 | B2C | 「10 個月 $1M ARR」〔廠商自述〕 | 同上 |
| Argil | S24 | 2 分鐘影片複製自己的分身，腳本進、成片出 | 生成 | 創作者、企業 | Kwebblekop 每月用 API 生成 1,000 支 shorts〔廠商自述〕 | 生成層 |
| Gooseworks | W23 | 索引品牌素材和廣告成效，讓 agent 生成廣告 | 生成、品牌脈絡 | 行銷團隊 | 「200+ 付費用戶」〔僅摘要〕 | 品牌記憶的鄰居 |
| Craze | S22（從 HR 轉型） | 多模型 AI 影片平台＋時間軸剪輯 | 生成 | 品牌、創作者、代理商 | $19／月〔二手來源〕 | 生成層 |
| Mosaic | W25 | 節點式 agent 剪輯器，可匯出到 Premiere／Resolve | 生成（剪輯） | 創作者、社群行銷 | Launch HN 148 分；留言說手動剪還是比較好〔已核對原頁〕 | 剪輯層 |
| Overlap、Kestroll、Vyra | S24／S25／F26 | 找片段、AI 剪輯 agent | 生成（剪輯） | 媒體公司、短影音創作者 | 無數據 | 剪輯層 |
| Reacher、1stCollab | S25／W23 | 創作者搜尋、邀約、合約、付款 | 營運 | 電商代理商、新創 | 1stCollab「數百家新創」〔廠商自述〕 | 若代理商要找創作者合作才相關 |
| Reforged Labs | 批次未載明 | 給遊戲公司的 AI 影片廣告 | 生成 | 遊戲工作室 | 2026-08 **收掉** | 失敗案例 |

**結論四：YC 裡沒有一家做「小代理商＋分鏡＋客戶批准」；最該盯的是 Bluma，最該小心的是 Knowlify 這類「代理商即軟體」。**

證據：Bluma 的 YC 頁寫的是「自動化消費品行銷，端到端複製對手的爆紅影片」，自家網站只提到「source video reference → new variants」，沒有定價或客戶 ([YC: Bluma](https://www.ycombinator.com/companies/bluma)、[getbluma.com](https://www.getbluma.com))〔已核對原頁〕。Knowlify、Tell if AI、InstaAgent 賣的都是成果，不是工具：Knowlify「價格寫在提案裡」，Tell if AI 收營收分成 ([YC: Knowlify](https://www.ycombinator.com/companies/knowlify)、[YC: Tell if AI](https://www.ycombinator.com/companies/tell-if-ai))〔已核對原頁〕。Syncly 的 ARR $2.1M、Trendpop 被收購、Kuli 鎖定 Fortune 100，都在大品牌端 ([YC: Syncly](https://www.ycombinator.com/companies/syncly)、[YC: Trendpop](https://www.ycombinator.com/companies/trendpop)、[YC: Kuli](https://www.ycombinator.com/companies/kuli))。

推理〔推論〕：YC 的空白處跟商業市場的空白處是同一塊，等於兩邊互相印證「找＋分鏡＋批准」沒人做。但「代理商即軟體」的公司如果做起來，Mercif 這種小代理商的客戶會被搶走，這比任何工具競品都更直接。

弱點：YC 名錄是延遲載入的，研究員在 video（72 家）、marketing（140 家）、content（79 家）三個分類只看到前 50 筆，排序是新批次在前，2021 年以前的公司可能漏掉。所有公司的 TikTok／IG 帳號都沒找到（YC 頁只列 X 和 LinkedIn），所以這次的 Apify 實測沒有涵蓋任何 YC 公司。Creatify、Affogato 是不是 YC 公司都無法確認。

**結論五：這一層唯一的退場和失敗案例，都指向同一個教訓：純做生成的薄包裝會被模型吃掉，純做趨勢分析則賣不大。**

證據：Reforged Labs 在 2026-08 收掉，執行長說「市場很小」、「模型強到我們重寫了產品的大部分」、「我們賣的那個缺口正在關閉」；它的種子輪是 2024 年的 $3.9M ([PocketGamer.biz](https://pocketgamer.biz/reforged-labs-shuts-down-as-ceo-says-ai-is-closing-its-market-opportunity/))〔已核對原頁〕。Trendpop 很早就獲利，然後在 2022 年賣給 Collab，原因沒公開 ([YC: Trendpop](https://www.ycombinator.com/companies/trendpop))。YC 目前的 Requests for Startups 列了 11 項，沒有一項跟影片、內容或創作者有關 ([YC RFS](https://www.ycombinator.com/rfs))〔已核對原頁〕。

推理〔推論〕：Trend Finder 如果只是趨勢清單，會走 Trendpop 的路；如果押在生成，會走 Reforged 的路。押在「流程＋決策紀錄」比較不受模型進步影響，這跟上一份報告的護城河結論一致。

弱點：每個方向都只有一個案例，不能當成規律。

## GitHub 能直接用的只有下載、轉錄、切鏡頭三樣

| Repo | Stars | 最後 commit | 授權 | 我們怎麼用 | 判定 |
|---|---|---|---|---|---|
| [Breakthrough/PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | 5,304 | 2026-10-25 | BSD-3 | 自動切出鏡頭邊界，當作可編輯分鏡的初稿 | **直接用** |
| [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | 203,762 | 2026-10-29 | Unlicense | 抓 TikTok／IG／Shorts 的影片和 metadata 來分析（只存連結與指標，不轉發影片） | **直接用** |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)／[m-bain/whisperX](https://github.com/m-bain/whisperX) | 26,310／24,937 | 2026-10 | MIT／BSD-2 | 逐字稿；WhisperX 有逐字時間戳，可以對齊 hook 的秒數 | **直接用** |
| [openclaw-easy/ViralMint](https://github.com/openclaw-easy/ViralMint) | 182 | 2026-10-24 | **AGPL-3.0** | 功能最接近的參考：outlier 用「頻道基準的 3x–20x」、觀看速度、AI 爆紅分數、69 個工具的 MCP；README 沒看到格式分群 | **只參考，不抄** |
| [Mharis-code/videoanalyzer](https://github.com/Mharis-code/videoanalyzer) | 15 | 2026-06-10 | MIT | 分析結構幾乎就是我們要的「格式」：hook（口說／視覺、分類、可填空模板）、逐秒節拍表、CTA、「複製攻略」 | **借 schema 改寫成我們的 prompt** |
| [zthisgood/hot-video-recreate](https://github.com/zthisgood/hot-video-recreate) | 29 | 2026-07-18 | MIT | 抽出參考影片的「結構 DNA」（構圖、節奏、運鏡、轉場），跨品類轉移，避免變成照抄 | 借概念 |
| [HUANGCHIHHUNGLeo/claude-real-video](https://github.com/HUANGCHIHHUNGLeo/claude-real-video) | 2,274 | 2026-10-08 | MIT | 把影片轉成去重的場景截圖＋時間戳逐字稿，讓 LLM「看」影片；`--grid` 拼成聯絡表 | 借做法 |
| [Agent-Field/reels-af](https://github.com/Agent-Field/reels-af) | 122 | 2026-06-05 | Apache-2.0 | Hook → Mechanism → Payoff 的腳本 prompt | 借 prompt |
| [RayVentura/ShortGPT](https://github.com/RayVentura/ShortGPT) | 8,089 | 2025-02-10 | MIT | 「Editing Markup Language」：LLM 可以編輯的 JSON 剪輯描述，可當可編輯分鏡格式的參考 | 借概念（已停更 9 個月） |
| [apify/crawlee](https://github.com/apify/crawlee) | 26,298 | 2026-10-29 | Apache-2.0 | 跟我們同一套 Node＋Apify 技術棧 | 需要時再用 |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 68,943 | 2026-10-29 | 自訂授權 | React 程式化影片；員工 4 人以上的營利公司要買授權 | 用前先看授權 |

**結論六：底層工具成熟、授權寬鬆；「參考影片 → 新腳本」這層 2026 年才冒出來，多半不到 200 顆星，只能當靈感。沒有任何開源專案做「格式分群」。**

證據：上表 stars、commit 日期、授權，都是研究員 2026-10-30 用 GitHub API 讀的〔已核對原頁〕。ViralMint 的 README 寫了 outlier 是頻道基準的 3x–20x、Scout／Analyzer／Generator 幾個 agent，以及 MCP server，但沒提到把影片歸成格式 ([ViralMint](https://github.com/openclaw-easy/ViralMint))。研究員用 GitHub 搜尋和 topic 查詢，找不到任何做短影音格式分群的 repo。

推理〔推論〕：以我們的技術棧（Node／React＋Apify），實際能重用的是「當成子程序或服務呼叫」的 Python 工具（PySceneDetect、Whisper 系列），以及 MIT／Apache 授權 repo 裡的 prompt 和 schema，而不是把函式庫 import 進 Node app。PySceneDetect 的鏡頭邊界加上 WhisperX 的逐字時間戳，就是一份分鏡的骨架：第幾秒換鏡、這一鏡講了什麼。剩下的「這一鏡要拍什麼」再交給多模態模型。格式分群沒人做，正好也是我們的差異。

弱點：沒有任何 repo 實際跑過，功能描述都是 README 的說法。GitHub 搜尋對多字詞查詢的結果偏少，命名不尋常的 repo 可能漏掉。AGPL／GPL 的 repo（ViralMint、MoneyPrinterV2、Postiz、TikTokDownloader）不能把程式碼抄進閉源產品。

**結論七：非官方的 TikTok／IG 爬蟲天生就脆弱，正式產品繼續外包給 Apify 是對的。**

證據：TikTok-Api（6,720 星）的 README 自己寫，`EmptyResponseException` 代表「TikTok 在擋你、偵測到你是機器人」([TikTok-Api](https://github.com/davidteather/TikTok-Api))；5,238 星的 drawrowfly/tiktok-scraper 從 2023-04 後就沒更新 ([repo](https://github.com/drawrowfly/tiktok-scraper))；instagrapi 的 README 建議正式環境改用付費的 HikerAPI ([instagrapi](https://github.com/subzeroid/instagrapi))；TikTok 服務條款（2025-12-01 版）禁止「用自動化腳本收集資訊」([TikTok ToS](https://www.tiktok.com/legal/page/row/terms-of-service/en))〔已核對原頁〕。

推理〔推論〕：外包給 Apify，把「壞掉要修」的成本轉給別人，但沒有消除服務條款的風險。比較安全的做法是：只用登出狀態的公開資料、不下載影片（`shouldDownloadVideos: false`）、只存指標和連結、顯示時連回原貼文。

弱點：沒查澳洲法律；Meta v. Bright Data 的判決只涵蓋登出狀態的爬取，而且只有搜尋摘要 ([Quinn Emanuel](https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/))。

## 這些品牌最紅的影片，大多不是自己拍的產品 demo

方法〔Apify 實測，2026-10-30〕：TikTok 用 `clockworks~tiktok-scraper` 抓 9 個品牌帳號，`profileSorting: popular`、每個帳號 12 支，另外跑兩個關鍵字搜尋（`/video` 分頁，各 12 支）。Instagram 用 `apify~instagram-reel-scraper` 抓 8 個帳號、每個最新 12 支 reel。兩邊都在本地用播放數（TikTok `playCount`、IG `videoPlayCount`）重排。**請注意兩邊的口徑不同：TikTok 的 popular 是全期間（所以會出現 2021–2024 年的舊片），IG 只是「最近 12 支 reel 裡最高的」。** 共 120 筆 TikTok、84 筆 IG，總花費約 US$0.67（TikTok 約 $0.45、IG 約 $0.22，從 Apify 月用量讀出，可能有延遲）。原始 JSON 存在本機暫存區，沒有放進 repo；筆記在 [r5_apify_top_videos.md](<../research_notes/AI 翻拍剪輯競品與熱門影片/r5_apify_top_videos.md>)。

### 各品牌點閱最高的影片

| 品牌 | 平台（口徑） | 影片 | 播放 | 讚 | 發佈日 | 標記 | 為什麼紅〔推論〕 |
|---|---|---|---|---|---|---|---|
| CapCut | TikTok（全期間） | [cinematic 範本](https://www.tiktok.com/@capcut/video/7361508219904265480) | 84,800,000 | 1,800,000 | 2024-04-24 | 自然 | 示範「套用範本就變電影感」，觀眾看完就能照做；收藏 24.5 萬 |
| CapCut | TikTok（全期間） | [感恩節](https://www.tiktok.com/@capcut/video/7169288221812067586) | 50,900,000 | 2,900,000 | 2022-11-23 | 自然 | 節日情緒＋「標記某個人」 |
| CapCut | TikTok（全期間） | [教學](https://www.tiktok.com/@capcut/video/7119891336831962370) | 23,400,000 | 2,200,000 | 2022-07-13 | 自然 | 剪輯教學，收藏 41 萬，前三名裡收藏率最高（1.75%） |
| Submagic | TikTok（全期間） | [「別用這些工具」](https://www.tiktok.com/@submagic.co/video/7241966959707884827) | 561,000 | 49,600 | 2023-06-07 | 自然、**置頂** | 法語、反向 hook（「不要用」），按讚率 8.8% |
| Submagic | TikTok（全期間） | [AI 字幕](https://www.tiktok.com/@submagic.co/video/7228077897775385883) | 343,000 | 14,500 | 2023-05-01 | **廣告** | 付費推廣 |
| HeyGen | TikTok（全期間） | [聖誕老人學上網](https://www.tiktok.com/@heygen.com/video/7586706345479376141) | 429,300 | 938 | 2025-12-22 | **廣告** | 季節梗＋付費推廣；按讚率 0.22% |
| HeyGen | TikTok（全期間） | [「$4,500 vs $29」](https://www.tiktok.com/@heygen.com/video/7647271350054309134) | 98,200 | 122 | 2026-06-03 | **廣告** | 價格對比 hook |
| HeyGen | TikTok（全期間） | [「AI 怎麼看你」](https://www.tiktok.com/@heygen.com/video/7455095753237613870) | 75,400 | 367 | 2025-01-01 | 自然 | 互動式好奇心 hook |
| Captions | TikTok（全期間） | [「check it out!」](https://www.tiktok.com/@captionsapp/video/7132199937311247662) | 303,300 | 788 | 2022-08-15 | **廣告** | 9 秒功能展示＋付費推廣 |
| Captions | TikTok（全期間） | [AI 降噪](https://www.tiktok.com/@captionsapp/video/7322511832093117738) | 111,500 | 1,368 | 2024-01-10 | 自然 | 前後對比：一聽就懂的功能 |
| Munch | TikTok（全期間） | [「Not so helpful」](https://www.tiktok.com/@munchstudio_com/video/7613433962114845972) | 56,200 | 1,729 | 2026-03-04 | 自然 | 辦公室幽默短劇，分享 730 次，跟產品幾乎無關 |
| Creatify | TikTok（全期間） | [「傳給那個同事」](https://www.tiktok.com/@creatifyai/video/7510014113959922987) | 16,800 | 550 | 2025-05-29 | 自然 | 辦公室幽默＋「傳給同事」，分享 419 次 |
| Virlo | TikTok（全期間） | [「這個爆紅趨勢是用 Virlo 找到的」](https://www.tiktok.com/@virloapp/video/7527019453729623309) | 16,400 | 1,063 | 2025-07-14 | 自然 | 自己翻拍一個熱門梗，再說「趨勢是用 Virlo 找的」，把產品示範藏在翻拍裡 |
| MakeUGC | TikTok（全期間） | [「為什麼他們會失敗」](https://www.tiktok.com/@makeugc/video/7414839776576032033) | 1,146 | 98 | 2024-09-15 | 自然 | 帳號只有 141 個粉絲，TikTok 不是它的主戰場 |
| Higgsfield | TikTok | — | — | — | — | 錯誤 | `@higgsfield.ai` 回傳「Profile has no videos (or is behind a login wall)」，帳號有 4,953 粉絲、0 支影片 |
| Higgsfield | IG（最近 12 支） | [「每個爆紅 AI 網紅都是 Higgsfield 做的」](https://www.instagram.com/p/DeHZl65CI2G/) | 2,574,718 | 44,501 | 2026-10-05 | 自有 | 搭「AI 網紅」話題的大宣稱＋「留言 VIRAL 拿連結」 |
| Higgsfield | IG（最近 12 支） | [Katana（Claude Motion）發表](https://www.instagram.com/p/DePxEsZKKJ8/) | 1,140,999 | 24,070 | 2026-10-08 | 自有 | 新功能發表，搭 Claude MCP 話題 |
| MakeUGC（合作） | IG（最近 12 支） | [@russestudiosv「這是 AI」](https://www.instagram.com/p/DXr_a_zkdrw/) | 992,730 | 2,388 | 2026-04-28 | **創作者合作、付費合作標記** | 「這是 AI」開場的反差＋「留言 UGC 拿免費 prompt」；比 MakeUGC 自己最好的 reel（6,214）高 160 倍 |
| MakeUGC（合作） | IG（最近 12 支） | [@creator.abe](https://www.instagram.com/p/DTdKPFVkfXl/) | 482,729 | 1,991 | 2026-01-13 | 創作者合作 | 「留言 AI 拿完整教學」 |
| Submagic（合作） | IG（最近 12 支） | [@dreomar（西語）](https://www.instagram.com/p/Db_SMR_Rz-1/) | 161,982 | 6,814 | 2026-08-13 | 創作者合作 | 「留言 Captions，我傳連結給你」；留言 3,618 則，CTA 本身就在灌互動 |
| Submagic（合作） | IG（最近 12 支） | [@mr.k.videography](https://www.instagram.com/p/DbfJECFTVdm/) | 50,473 | 3,395 | 2026-08-01 | 創作者合作、付費合作標記 | 剪輯師的教學帳號，「留言 captions」 |
| Captions | IG（最近 12 支） | [與 @sevynthestylist 合作](https://www.instagram.com/p/DcJdgQvKI3S/) | 29,603 | 隱藏 | 2026-08-17 | 共同作者 | 用真實使用者的故事示範 |
| Captions | IG（最近 12 支） | [「留言 TWIN」](https://www.instagram.com/p/DbdbBecipmD/) | 29,155 | 隱藏 | 2026-07-31 | 自有 | 數位分身＋留言 CTA |
| HeyGen | IG（最近 12 支） | [@heyjoshuaxu「用 Claude 做出這支影片」](https://www.instagram.com/p/DexRW9DBMwV/) | 10,050 | 193 | 2026-10-21 | 創作者合作 | 「幕後怎麼做」型 |
| HeyGen | IG（最近 12 支） | [Jan Hotovec 用分身講人生故事](https://www.instagram.com/p/DeiFxneCTEv/) | 8,925 | 89 | 2026-10-15 | 共同作者 | 用戶故事 |
| Munch | IG（最近 12 支） | [行銷預算梗](https://www.instagram.com/p/Dd6iu6gOPFe/) | 4,902 | 74 | 2026-09-30 | 自有 | 辦公室／小老闆幽默 |
| Creatify | IG（最近 12 支） | [Kling 4.0 vs Seedance 2.5](https://www.instagram.com/p/DfAqse1jiPU/) | 1,966 | 22 | 2026-10-27 | 自有 | 模型對比、「你選哪個」 |
| Virlo | IG | — | — | — | — | 錯誤 | `@virloai` 回傳「Profile does not exist」 |

用 Trend Finder 自己的公式（最高播放 ÷ 帳號中位數）看 IG 最近 12 支：Higgsfield 23.8 倍（中位數 108,399）、MakeUGC 250 倍（中位數 3,966，最高那支是合作貼文）、Submagic 10.9 倍、Creatify 4.0 倍、Munch 2.7 倍、HeyGen 和 Captions 都只有 1.7 倍〔Apify 實測〕。也就是說，以這兩週到兩個月的窗口來看，HeyGen 和 Captions 的 IG 很穩定，沒有真正的爆款；MakeUGC 和 Submagic 的「爆款」都不是它們自己發的。

順帶一提，兩個關鍵字搜尋的結果幾乎都是「AI 做出來的內容」，不是「AI 工具的內容」：`ai video editing` 第一名是 150 萬播放的 AI 生成影片（[@alexytyba5e](https://www.tiktok.com/@alexytyba5e/video/7701764174967360781)），第二名是 120 萬播放的 CapCut AI 灌籃範本教學（[@zhufei312](https://www.tiktok.com/@zhufei312/video/7701199439033027871)）；`viral video ai remix` 第一名是 320 萬播放的 AI 寶寶跳舞特效（[@elsdigitalfreedomai](https://www.tiktok.com/@elsdigitalfreedomai/video/7600553954950335775)），第二名是 61.1 萬播放的「hotel lobby」範本（[@jake.s661](https://www.tiktok.com/@jake.s661/video/7687222180597271828)）〔Apify 實測〕。

### 這些爆款的共同模式

**結論八：在 Instagram，紅的是「創作者合作＋留言關鍵字拿連結」，品牌自己的帳號很小。**

證據〔Apify 實測〕：IG 播放前 10 名的 reel，**10 支的文案都有「Comment／Comenta X」**。全部 84 支裡，有這種 CTA 的 32 支播放中位數是 20,018，沒有的 52 支是 2,613。創作者合作貼文（發文者不是品牌本身、品牌掛共同作者）有 16 支，播放中位數 20,018；品牌自己發的 68 支，中位數只有 3,299。Submagic 最近 12 支 reel **全部**是創作者發的；MakeUGC 播放最高的 3 支也都是合作貼文。16 支合作貼文裡，有 5 支帶有 Instagram 的 `paidPartnership` 標記（@russestudiosv、@mr.k.videography 兩支、@jennasharp.edits、@likfoon）。

推理〔推論〕：「留言關鍵字 → 私訊連結」同時做兩件事：把留言數灌高（演算法訊號），又把觀眾導進 DM 漏斗。這些 AI 工具品牌的成長方式，比較像聯盟行銷或付費創作者計畫，而不是品牌帳號的內容。對 Trend Finder 有兩個直接含意。第一，如果客戶的利基裡有很多合作貼文，「爆款」可能反映的是那位創作者的粉絲盤，不是格式本身，所以資料要標出 `ownerUsername` 跟抓取帳號不同的貼文。第二，「留言 X 拿連結」本身就是一個可以寫進分鏡的格式元素。

弱點：CTA 的效果跟品牌混在一起。Higgsfield 12 支全部有 CTA，而且帳號本來就大；在同一個品牌內部比較（Captions：有 CTA 的 8 支中位數 17,372，沒有的 4 支 16,070），差距幾乎消失。所以比較可能的解釋是「合作創作者的觸及」，CTA 只是附帶的特徵。樣本只有 7 個品牌、84 支，而且都是 AI 工具這個利基。另外，研究筆記把 @dreomar 歸給 Captions，但原始資料顯示它是從 `submagic.co` 抓到的，共同作者也是 submagic.co，本報告採用原始資料。

**結論九：在 TikTok，不少「最高播放」其實是付費推廣；按讚率是最簡單的分辨方法。**

證據〔Apify 實測〕：8 個有回傳資料的 TikTok 帳號、96 支影片裡，有 13 支的 `isAd` 是 true，包括 Captions 第一、二名（303,300、284,500）、HeyGen 第一、二名（429,300、98,200）、Submagic 第二、三名（343,000、283,500）。這 13 支的按讚率（讚 ÷ 播放）中位數是 **0.65%**，其餘 83 支是 **6.46%**，差了約 10 倍。例如 HeyGen 的聖誕老人影片有 42.9 萬播放，卻只有 938 個讚。

推理〔推論〕：付費推廣把播放數撐高，但觀眾不太互動。如果 Trend Finder 把這種影片當爆款推薦給客戶，等於叫客戶去翻拍一支「花錢買來的觀看」。所以排序前要先排除 `isAd`，就算沒有這個欄位，也要把「播放高但按讚率低於某個門檻」的影片標成「可能是付費」。上一份報告提到 IG 的觀看數也混了付費流量，這次在 TikTok 看到的是同一個問題。

弱點：clockworks 的頁面沒有定義 `isAd` 的意思，「等於付費推廣」是我們從按讚率差異推出來的。Instagram 的 reel-scraper 只有 `paidPartnership`（合作標記），沒有廣告標記，IG 的付費流量還是分不出來。

**結論十：小品牌最好的自然流量是跟產品無關的職場幽默，大品牌最好的是「看完就能照做」的範本。**

證據〔Apify 實測〕：Munch 的 TikTok 第一名（56,200）和 Creatify 的第一名（16,800）都是辦公室幽默短劇，分享數（730、419）在各自帳號裡最高，遠高於它們的產品示範。CapCut 前三名合計 1.59 億播放，都是範本或教學，收藏數 24.5 萬到 41 萬。Virlo 最好的一支（16,400）是自己翻拍一個熱門梗，文案再說「這個趨勢是用 Virlo 找到的」。Submagic 最好的一支（561,000、按讚率 8.8%）用的是反向 hook「別用這些工具」。

推理〔推論〕：這對 Mercif 的客戶（食物和生活風格品牌）有參考價值：「可以照做」（收藏）和「想傳給某個人」（分享）是兩種不同的爆紅動機，格式卡片上應該分開標，而且分享和收藏正是上一份報告說「拿不到別人的」指標。TikTok 透過 Apify 其實拿得到 `shareCount` 和 `collectCount`，Instagram 拿不到。Virlo 的做法（把產品示範藏在翻拍裡）也正好就是 Trend Finder 要幫客戶做的事。

弱點：每個品牌只有 12 支，而且 TikTok 的「popular」是照讚數挑的（見結論十一），播放高但讚少的影片可能根本沒被抓進來。CapCut 的數據大多是 2021–2022 年的，那時的 TikTok 演算法跟現在不同。

## 之後怎麼搜：先修正排序，再分利基跑

**結論十一：clockworks 的 `profileSorting: popular` 是照按讚數排序。要找「播放最高」，至少抓 30–50 支再自己重排。**

證據〔Apify 實測〕：8 個帳號回傳的 12 支影片，**8 個都完全照 `diggCount` 由大到小排，沒有一個照 `playCount` 排**。例如 CapCut 的回傳順序是 5,090 萬、2,340 萬、1,350 萬、8,480 萬播放，對應的讚是 290 萬、220 萬、210 萬、180 萬。上一輪研究只能從第三方頁面推測「Popular (most liked)」([scrapelabsapi](https://apify.com/scrapelabsapi/tiktok-profile-scraper))〔僅摘要〕，clockworks 自己的頁面只寫「most popular videos first」([clockworks](https://apify.com/clockworks/tiktok-profile-scraper))，這次實測確認了。同一個 actor 頁面也寫了，TikTok 把 popular 排序限制在每個帳號大約 400–500 支 ([clockworks/tiktok-scraper](https://apify.com/clockworks/tiktok-scraper))〔已核對原頁〕。

推理〔推論〕：付費推廣的影片讚少，所以在「照讚數排」的前 12 名裡反而會被擠下去，但它們的播放可能更高（Captions 的廣告片就是這樣，排在第 3、4 位）。如果只抓 12 支，看到的是「最多人按讚的」，不是「最多人看的」。抓 30–50 支，再用 `playCount` 重排、排除 `isAd`，才是我們要的榜單。

弱點：只測了 8 個帳號、每個 12 支，沒測更深的位置是否也照讚數排。

**結論十二：TikTok 的有效單價是標價的兩倍以上，預算要用實測數字算。**

證據〔Apify 實測〕：TikTok 這一輪 120 筆（96 筆帳號＋24 筆搜尋）花了約 US$0.45，等於**每 1,000 筆約 US$3.75**，是 clockworks 標價「from $1.70 / 1,000」的兩倍多 ([clockworks](https://apify.com/clockworks/tiktok-scraper))。IG 84 筆約 US$0.22，等於**每 1,000 筆約 US$2.6**，跟 reel-scraper README 寫的免費方案價 $2.60 一致 ([instagram-reel-scraper](https://apify.com/apify/instagram-reel-scraper))〔已核對原頁〕。

推理〔推論〕：TikTok 多出來的部分，可能是免費方案的費率比較高，或是 `/video` 搜尋分頁、啟動事件另外計費。實際原因要到 Apify 的 run 明細裡看。在搞清楚之前，用 $3.75／1,000 來估預算比較保險。Apify 免費方案每月有 US$5 額度〔僅摘要〕([Apify pricing](https://apify.com/pricing))，以實測單價計算，大約是 1,300 筆 TikTok，或 1,900 筆 IG。

弱點：費用是從 Apify 月用量 API 讀出來的，可能有延遲；只有一次 run，樣本很小。

### 搜尋手冊

以下的設定和成本，是根據上面的實測和 actor 頁面整理的；關鍵字清單是本報告的建議，**還沒驗證過**〔推論〕。

| 任務 | Actor ID | 輸入（重點欄位） | 每次成本 | 拿到之後要做的事 |
|---|---|---|---|---|
| A1. 品牌／對手帳號的 TikTok 爆款（全期間） | `clockworks/tiktok-scraper` | `{"profiles":["capcut","submagic.co","heygen.com"],"profileSorting":"popular","resultsPerPage":40,"excludePinnedPosts":false,"shouldDownloadVideos":false,"shouldDownloadCovers":false}`，不設日期篩選（日期篩選跟 popular 不相容，而且另外收費） | 10 個帳號 × 40 支 = 400 筆 ≈ **US$1.5**（實測單價） | 用 `playCount` 重排；排除 `isAd`；`isPinned` 的影片標出來但保留；計算按讚率，低於 1% 標「可能付費」 |
| A2. 品牌帳號的 TikTok 近期爆款（用我們的公式） | 同上 | `"profileSorting":"latest"`、`"resultsPerPage":30` | 10 個帳號 ≈ **US$1.1** | 用「播放 ÷ 這 30 支的中位數」找 outlier，跟 Trend Finder 現在的算法一致 |
| A3. 品牌帳號的 IG 爆款（只能看最近 N 支） | `apify/instagram-reel-scraper` | `{"username":["higgsfield.ai","submagic.co"],"resultsLimit":50}` | 10 個帳號 × 50 支 = 500 筆 ≈ **US$1.3** | 用 `videoPlayCount` 重排；介面上寫「最近 50 支裡的最高」；`ownerUsername` 跟輸入帳號不同的，標為合作貼文；`paidPartnership` 標出來 |
| B1. 利基關鍵字的 TikTok 熱門影片 | `clockworks/tiktok-scraper` | `{"searchQueries":["capcut template tutorial","ai ugc ads"],"searchSection":"/video","resultsPerPage":30,"proxyCountryCode":"AU"}` | 每個關鍵字 30 筆 ≈ **US$0.11** | 同 A1 的重排和過濾 |
| B2. 同上，便宜版（未測） | `apidojo/tiktok-scraper` | `{"keywords":["ai ugc ads"],"sortType":"MOST_LIKED","location":"AU","maxItems":30}`；輸出的播放欄位叫 `views`，不是 `playCount` | 標價 **US$0.30／1,000**，每個關鍵字約 US$0.01 ([apidojo](https://apify.com/apidojo/tiktok-scraper))；免費方案每次只給 10 筆 | 先用一個關鍵字比較它跟 B1 的結果是否一致，再決定要不要換 |
| B3. 利基關鍵字的 IG 熱門 reel | `apify/instagram-search-scraper` | `search` 填一個關鍵字，`searchType` 選「Search popular reels」（確切的 enum 值要在 [input schema](https://apify.com/apify/instagram-search-scraper/input-schema) 確認） | 每個關鍵字最多約 64 支，約 **US$0.15–0.17** | 有些關鍵字沒有熱門 reel，會回傳 `"error":"no_items"`；先用無痕視窗開 `instagram.com/popular/<關鍵字>` 免費預查 |
| C. 免費前置 | — | TikTok App 搜尋「Most Liked」；TikTok Creative Center Top Ads（看廣告的觸及／CTR）；Meta Ad Library（看品牌現在在推哪些廣告） | 免費 | 只用來找關鍵字、hashtag、對手正在推的素材，再餵進 A／B |

**關鍵字策略〔推論〕。** 這次實測最重要的教訓是：**泛用詞會抓到「AI 做的內容」，不是「關於 AI 工具的內容」**（`ai video editing` 的前三名都是 AI 生成影片或範本教學）。所以要分三類來搜。第一類是品牌名：`Opus Clip`、`Submagic`、`HeyGen`、`Higgsfield`、`Creatify`、`MakeUGC`、`CapCut template`、`Captions app`，這類詞不分語言，適合跨區域。第二類是「教學／意圖」詞：`capcut template tutorial`、`how to make ai ugc`、`ai ugc ads`、`ai avatar video`、`long video to shorts`、`recreate viral video`、`steal this video idea`、`remake any video`。第三類是這次看到的 CTA 句型：`comment for the link`、`comment UGC`、`comment captions`，用來直接撈出合作創作者的貼文。單字 hashtag（`#aiugc`、`#ugcads`、`#capcuttutorial`、`#aivideoeditor`、`#opusclip`、`#heygen`）留給 hashtag 爬蟲；多字詞一律用關鍵字搜尋，因為 IG hashtag 爬蟲會把多個字合成一個 tag，結果變少 ([instagram-hashtag-scraper](https://apify.com/apify/instagram-hashtag-scraper))，TikTok 每個 hashtag 也只能拿到大約 400–800 支 ([tiktok-hashtag-scraper](https://apify.com/clockworks/tiktok-hashtag-scraper))〔已核對原頁〕。區域方面，Mercif 在澳洲，要設 `proxyCountryCode: "AU"`（clockworks）或 `location: "AU"`（apidojo）；這兩個欄位確實存在，但沒有來源測過它們對結果影響多大。中文的 `AI 剪輯`、`AI 翻拍` 內容大多在抖音，TikTok 爬蟲抓不到。

**給客戶利基用的版本〔推論〕。** 上面這套是用來監看競品的；換到 Mercif 的食物和生活風格客戶，流程一樣，只是把關鍵字換成利基詞（例如菜系、城市、「Sydney cafe」這類），先跑 B1／B3 找出陌生的小帳號爆款（這就是 Mercif 的「1-to-10」研究法），再對找到的帳號跑 A2，用中位數確認是不是真的 outlier。每週預算抓 10 個關鍵字（約 US$1.1＋US$1.6）加 10 個帳號（約 US$1.1＋US$1.3），**一週約 US$5，剛好是免費方案一個月的額度**，所以正式跑之前要先升級方案，或是降低頻率。

弱點：所有成本都建立在一次、約 200 筆的實測上。apidojo 和 instagram-search-scraper 這次都沒有跑。關鍵字清單沒有經過任何量測，下一步應該每個詞先抓 10 筆試水溫。

## 結論

這次研究改變最大的，是我們對「爆款」這個詞本身的信任。看完 AI 工具品牌自己的數據，排在最前面的常常是付費推廣（TikTok 上按讚率低了 10 倍）、別人帳號的合作貼文（Submagic 最近 12 支 IG 全是），或是照讚數而不是播放數挑出來的結果。只要 Trend Finder 排序前不先過濾這三種偏差，就會把「花錢買的觀看」和「借來的粉絲」當成「可以翻拍的格式」推薦給客戶。所以下一步要補進產品的不是更多數據來源，而是三個標記：`isAd`／低按讚率、合作貼文、以及「最近 N 支」的口徑說明。這三個標記成本都很低，也正好延續上一份報告「把計算攤開」的方向。

第二個收穫是位置。從商業產品、YC 名單到 GitHub，大家要嘛在做「找」（而且賣不貴），要嘛在做「生成」（而且越做越不需要真人），中間「把一支真實爆款轉成某個客戶能拍、而且客戶簽過名的分鏡」這一段，三個地方都是空的。空著有兩種解釋：機會，或是市場太小。Reforged Labs 和 Trendpop 的下場提醒我們，答案不在研究裡，而在 Mercif 願不願意每週真的在這一段做決定。
