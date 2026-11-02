# Remake 競品比較與 USP（2026-11）

_研究日期：2026-11-02。設計夥伴 Mercif 請我們用 product、price、promotion、place、pricing 跟競品比較，並寫出 USP。訪談提到的競品：「Sheila」（語音轉文字）、「Roll」（Alfie Robertson 的 App）、「PopCut」。另外補上 4 個相關工具。本文件延伸 `market/trend-research-competitors.md`（2026-10-26），不取代它。_

## 證據標籤

| 標籤 | 意思 |
| --- | --- |
| **[已查證]** | 本次（2026-11-02）親自打開官網或 App Store 頁面，看到該功能或價格 |
| **[二手]** | 只在搜尋摘要、第三方或廠商以外的頁面看到 |
| **[前次]** | 來自 2026-10-26 的競品研究，本次沒有重新打開 |
| **[推論]** | 我們自己的判斷或建議 |

價格以官網顯示為準，**幣別頁面沒有寫代碼，依美國版頁面與 App Store 美國區推定為美元**。價格變動頻繁，對外引用前要再看一次。所有功能都是廠商自己的說法，沒有實際試用。

---

## 結論先行（5 點）

1. **「Sheila」就是 Cila（cila.app）。** 訪談逐字稿裡 Whisper 聽成「Sila」，2026-10-25 已確認拼法（見 `interviews/2026-10-21-daphene-transcript.md`）。Cila 有語音轉文字逐字稿、異常值（outlier）評分、熱門音樂，只支援 Instagram 和 TikTok，US$24/月（50 個帳號）或 US$48/月（250 個帳號）。[已查證]
2. **「找爆紅影片」已經是基本功能，不是差異。** Cila、Sandcastles、Virlo、Shortimize、Silma 都在找異常值影片，價格 US$9–499/月。[已查證]
3. **沒有任何一家說自己用「觀看 ÷ 粉絲」排序。** 我們查到的工具都用「這支影片 ÷ 這個帳號平常的觀看」，或沒說明算法。Remake 的「小帳號、大觀看」（< 5K 粉絲、≥ 1M 觀看）是一個不同的切法。[已查證：Cila、Silma、Shortimize、1of10 寫的是帳號基準；Virlo、Sandcastles 沒寫]
4. **沒有任何一家把「研究 → 翻拍計畫 → 拍 → 剪 → 主管核准」串成一條代理商流程；Remake 在 main 上已經串起來。** 研究工具停在「看懂為什麼爆」，剪輯工具（Roll、PopCut）從「已經有素材」開始。最接近代理商的是 Sandcastles 最高方案（US$499/月）的「工作區訪客權限（ideal for agencies）」與 Virlo Pro 的 3 個座位，都沒有核准流程。[已查證]
5. **Roll 和 PopCut 不是研究工具，是剪輯工具。** Roll 把相機膠卷套進「頂尖創作者」模板，US$49/月或 US$229/年（早鳥五折）；PopCut 是一般 AI 剪輯 App，US$9.99/週到 US$99.99/年。它們跟 Remake「剪」那一步重疊（Remake 只有自動粗剪、調色與字幕），可以當作需要精修時的替代品或串接工具，不是「找」與「拆」的對手。[已查證]

---

## 1. 「Sheila」是誰

- **證據：** Daphne 訪談逐字稿 07:12「So let me see, Sila. Sila app. … it basically helps you to find trending videos」；逐字稿檔頭註明「The trend-research tool is Cila (heard as "Sila"/"Scylla"/"Sika")」，2026-10-25 確認。Cila 官網列出每支影片的語音轉文字逐字稿，與「speech-to-text」吻合。[已查證：repo 內逐字稿與 cila.app]
- **推理：** 名字發音（Cila / Sila / Sheila）與功能（找爆紅影片 + 逐字稿）都對得上，而且夥伴當時正在螢幕上展示它。
- **弱點：** 「Sheila」這次是第二次轉述，若夥伴在新訪談中指的是另一個工具，就要重查。搜尋「Sheila / Shila」沒有找到任何同名的影片研究工具；發音相近的還有 Silma（silma.app，AI 拆解 Reels 為何成功），功能部分重疊但沒有語音轉文字，可能性較低。
- **補充：** Cila 創辦人是 Yuka Tsunashima（社群行銷人，官網自稱為品牌帶來 1 億以上自然觀看）。訪談中 Daphne 說「that's the app that she created」，也對得上。[已查證，cila.app；成績數字是她自己的說法]

## 2. 比較表（4P + 定價模式）

| 工具 | Product（功能） | 目標用戶 | Price（價格／方案） | Pricing（模式） | Promotion（定位） | Place（平台與通路） |
| --- | --- | --- | --- | --- | --- | --- |
| **Remake**（我們） | 找爆紅影片（views ÷ followers，預設 1M+）→ 拆解 hook、結構、情緒 → 翻拍計畫（分鏡）→ 主管核准計畫 → 分鏡拍攝清單，每個鏡頭上傳實拍素材並選定 → 「Make the video」自動粗剪（ffmpeg；whisper.cpp 逐字稿用來剪掉停頓與「um」；可選 1x／1.1x／1.25x 與自備音樂）→ 調色 + 燒入字幕 → 主管在免登入審核連結上核准成片；每個客戶一個工作區（`docs/STATUS.md` phase 2a–2c 與 2026-11-02 段） | 社群代理商（先從雪梨餐飲客戶） | 尚未定價 | 尚未定 | 「從爆紅影片到客戶核准的翻拍流程」 | 網頁；TikTok、IG Reels、YT Shorts |
| **Cila** | 追蹤帳號清單、帳號基準 outlier 評分、逐字稿、熱門音樂、依品牌／客戶分清單、篩選（表現、日期、平台、業配）、Excel 匯出（Business） | 創作者、小商家、社群經理、代理商、品牌 | Creator US$24/月（50 帳號、每日更新）；Business US$48/月（250 帳號、每 6 小時） | 訂閱；首月半價；年繳省 50%；7 天退款 | 「Find proven content ideas for any niche in minutes」；創辦人個人品牌帶動 | 網頁；IG、TikTok（無 YouTube）；有 MCP 頁 |
| **Sandcastles** | 找前 1% outlier、拆解 hook／敘事／格式、追蹤競品頻道、產生 hook 與腳本、下載逐字稿 | 創作者與品牌 | Pro US$49（年繳 US$39）100 點；Visionary US$99（US$79）250 點；Titan US$499（US$399）1,500 點 | 點數制，點數每月歸零，不退款；Titan 含 API 與給代理商的工作區訪客權限 | 「Create viral short-form videos in seconds」 | 網頁；IG、TikTok、YT Shorts |
| **Virlo** | 短影音社群聆聽：研究 agent 找 outlier 與新興創作者、創作者追蹤與提醒、內容工作室、Meta 廣告分析（Pro）、MCP | 個人經營者（Starter）、成長中的代理商與團隊（Pro） | Starter US$49 2,000 點；Pro US$199 12,000 點、3 座位、Slack／Discord／webhook、Zapier、n8n；Enterprise 另議 | 點數制，月繳；試用 7 天（比較頁說的） | 「Social Listening & Analytics for Short-Form Video」 | 網頁；TikTok、YT Shorts、IG Reels |
| **Shortimize** | 無限帳號追蹤、依帳號基準標出爆量與 outlier、Slack／Discord 提醒、API、自動付款給創作者 | App 創辦人、代理商、企業（跑 UGC 創作者團隊） | Launch US$99（1 座位）；Scale US$249（3 座位）；Enterprise 另議（白牌） | 訂閱；年繳省 20%；有試用（天數未寫） | 「Scale Viral Strategies Like Clockwork」 | 網頁；YT Shorts、TikTok、IG Reels、Facebook、Snapchat |
| **Silma** | 把任何貼文放回脈絡：帳號基準 outlier（如「380× their usual」）、拆 hook 類型與節奏、發文前 hook 評分、競品追蹤 | 創作者、社群經理 | Lite US$9（200 點）；Starter US$29（600 點，含競品追蹤）；Pro US$79（1,500 點） | 點數制，月繳 | 「Bring any social media post into context」 | 網頁；IG、TikTok、YouTube |
| **Roll**（Alfie Robertson） | 逐格掃描相機膠卷挑出好片段，套進 1,000+ 個「各領域頂尖創作者」模板，加音樂、字幕、文字，匯出到 IG／TikTok／Shorts | 創作者（「made by creators for creators」） | 月繳 US$49（原 US$97，早鳥五折）；年繳 US$229（原 US$588） | 訂閱；7 天免費試用 | 創辦人本人的 IG／TikTok／YouTube（@Alfiegetshard）、Podcast、演講 | iPhone App（iOS 16+）；App Store 4.8 分、782 則評分 |
| **PopCut** | 一般 AI 剪輯：裁切、變速、自動字幕、去背、動態追蹤、濾鏡轉場、4K 60fps 匯出 | 一般創作者、Vlogger | 週 US$9.99；月 US$19.99；年 US$99.99 | 訂閱；Pro 去浮水印 | 「AI Video Editor & Maker」 | iPhone App（iOS 15+）；評分僅 3 則（新 App，約 2026-04 上架） |
| **Mysocial Outliers** | 依主題／關鍵字搜尋，依創作者中位數倍數排序，收藏後自動轉逐字稿，與自己帳號的「fit」評分，MCP | 創作者、品牌 | US$49／149／349 每月（20 次搜尋起） | 訂閱 | — | 網頁；TikTok、IG、YouTube、X、Threads |

來源與查證狀態：Cila、Sandcastles、Virlo、Shortimize、Silma、Roll、PopCut [已查證，2026-11-02]；Mysocial Outliers [前次，2026-10-26]。Roll 與 Alfie Robertson 的關係依 alfierobertson.com 自述 [已查證]；App Store 賣家是 GOSUBIT PTY LTD，兩者的公司關係沒有查到 [推論]。PopCut 上架月份來自第三方 [二手]。

**YouTube 專用工具**（不放進主表）：1of10 免費到 US$89/月、Ultra US$4,999/年，找 10–100 倍頻道平均的影片 [已查證]；Viewstats Business 從 US$249/月起 [已查證]。Mercif 的客戶以 IG 為主，這兩個參考價值低。

## 3. 功能矩陣（流程哪一段有人做）

| 流程 | Cila | Sandcastles | Virlo | Shortimize | Silma | Roll | PopCut | **Remake** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 找爆紅影片 | 有 | 有 | 有 | 有 | 有 | — | — | 有 |
| 依 views ÷ followers 排序 | 否（帳號基準） | 未說明 | 未說明 | 否（帳號基準） | 否（帳號基準） | — | — | **是** |
| 逐字稿 | 有 | 有 | 未確認 | 未確認 | 未確認 | — | 自動字幕 | 有，但用在自己的實拍素材（whisper.cpp，剪停頓與字幕），不是爆紅影片的逐字稿 |
| 拆解 hook／結構 | 否 | 有 | 未確認 | 未確認 | 有 | — | — | 有（含情緒） |
| 產出可拍的翻拍計畫 | 否 | 腳本與 hook | 內容工作室 | 否 | 否 | 模板 | — | **有（分鏡＋剪輯說明）** |
| 拍攝／剪輯 | 否 | 否 | 否 | 否 | 否 | 有 | 有 | 有：拍攝清單與素材上傳、自動粗剪、調色、燒入字幕；沒有完整剪輯器 |
| 每個客戶一個工作區 | 依客戶分清單 | 工作區（Titan） | 否 | 否 | 否 | 否 | 否 | **有** |
| 主管／客戶核准 | 否 | 否 | 否 | 否 | 否 | 否 | 否 | **有（計畫與成片都要核准）** |
| 平台 | IG、TT | IG、TT、YT | IG、TT、YT | 5 個 | IG、TT、YT | 匯出 3 個 | 匯出多個 | IG、TT、YT |

「否」= 官網沒有寫，不等於確定沒有。[已查證範圍：各家首頁與價格頁]

---

## 4. USP

### Remake 不一樣的地方

1. **一條代理商流程，而不是一個研究工具。** 證據：上表沒有任何一家同時有「研究」與「核准」。推理：Daphne 說「Research. I don't like research.」，而且 Annie 審核是現有流程的一部分（`interviews/2026-10-21-daphene-summary.md`）。弱點：代理商可能已經用 Google Drive + WhatsApp 做核准，不覺得需要換工具。
2. **「小帳號、大觀看」是不同的爆紅定義。** 證據：競品寫明的都是帳號基準。推理：帳號基準抓的是「這個人這次特別好」，views ÷ followers 抓的是「這個點子本身被系統推出去」，對沒有粉絲基礎的食品客戶更有參考價值（見 `instagram-algorithm-2026.md` 第 7 節）。弱點：這只是排序公式，競品幾天就能加上；它不是護城河，只是切入點。
3. **翻拍計畫是給拍攝團隊用的，不是給創作者自己。** 分鏡拍攝清單、每個鏡頭上傳實拍素材、自動粗剪成片，最後由主管在審核連結上核准成片（「原創檢查」是 `instagram-algorithm-2026.md` 建議新增的欄位，目前還沒有）。弱點：Sandcastles 已經產生 hook 與腳本，差距只在「格式」與「團隊交接」，需要用真實客戶證明這個差距值錢。

### Remake 比較弱的地方

1. **資料深度與規模。** 競品追蹤數百帳號、每 6 小時更新、有 API 與提醒；Remake 是按搜尋即時抓，Instagram 粉絲數要另外查（`app/trend-finder/backend/instagram.py`），每次搜尋都有成本。
2. **品牌與通路。** Cila、Roll 都由有大量粉絲的創辦人帶動；Remake 沒有自己的受眾。
3. **只有自動粗剪，沒有完整剪輯器。** Remake 的剪輯是自動粗剪（剪停頓與「um」、變速、自備音樂）加調色與燒入字幕，沒有時間軸、轉場或模板。Roll 有 1,000+ 模板、PopCut 有完整剪輯器；需要精修的影片仍要交給剪輯師或其他 App。粗剪也還沒用真實 iPhone HDR 素材與真人口白完整驗證（`docs/STATUS.md` phase 2c-1「Not verified」）。
4. **價格錨點很低。** Cila US$24/月就有研究功能，Daphne 的團隊連這個都在省。

### USP 候選（一句話）

> **Remake 幫社群代理商把「小帳號爆紅」的影片，變成每個客戶都能拍、自動剪成片、主管一鍵核准的翻拍影片。**

英文版（對外用）：*Remake turns small-account viral videos into remakes your team can film, auto-cut and get approved by your manager, for every client.*

---

## 5. 定價想法 [推論]

以下全部是我們的推論，沒有任何客戶付費意願的證據。

- **推理基礎：** 研究工具的價格帶是 US$24–249/月（Cila 最低、Shortimize Scale 最高）；有代理商功能的方案在 US$199–499/月（Virlo Pro、Sandcastles Titan）。Remake 多了流程與核准，可以比純研究貴，但 Mercif 對價格敏感。
- **選項 A：依客戶數收費（建議優先測試）。** 例如每個客戶工作區每月固定價，因為代理商按客戶向品牌收費，成本容易轉嫁。
- **選項 B：分級方案。** 入門方案（少量客戶、有限搜尋次數）定在 Cila Business 與 Sandcastles Pro 之間；代理商方案（多客戶、核准、多座位）對標 Virlo Pro。
- **搜尋次數要有上限或用點數。** 每次 Instagram 搜尋都要付資料費（`server.py` 的 Apify 成本），Sandcastles、Virlo、Silma 都用點數制控制成本。
- **對 Mercif：** 先免費試用一段時間換取使用數據與案例，再請 Annie 給出「願意付多少」的數字（這是 `hackathon-plan-trend-tool.md` 已列的開放問題）。
- **弱點：** 沒有查澳幣匯率，也沒有澳洲代理商的軟體預算資料；具體數字要等 Annie 的回答。

## 6. 更大的市場：醫院、診所、大學的內部行銷團隊

- **證據：**
  - Colorado State University 的社群團隊在 2022 年轉向直式短影音與學生創作者，Reels 從每月 1–2 支變成超過一半的發文，平均觸及 +37%、互動 +50%。[已查證，social.colostate.edu，2022-11-01；資料已舊]
  - 醫療行銷廠商 Geonetric 說很少醫療機構自己做短影音，而且單一團隊自己發會和其他部門產生摩擦。[二手，未標日期]
  - Instagram 官方：「敏感健康」類內容可能被限制推薦。[已查證，Instagram for Creators，2024-04-30]
- **推理：** 大學與醫院有內部團隊、有審核層級（法務、品牌、醫療合規），「主管核准」對他們可能比對代理商更重要。但醫療內容的推薦限制會讓「找爆紅影片 → 翻拍」的效果打折。
- **弱點：** 沒有找到 2025–2026 年的調查資料；這是一個值得訪談驗證的假設，不是結論。建議先訪談 1–2 個大學社群團隊再決定。

## 7. 未查證或可能過時

- Cila 年繳的實際金額；Cila 用戶數。
- Sandcastles 與 Virlo 的 outlier 算法；Virlo、Shortimize 是否真的做 hook 分析。
- Sandcastles、Shortimize 的試用天數。
- Roll 與 GOSUBIT PTY LTD 的公司關係；Roll 的上架年份（「Jul 15」推定為 2026）。
- PopCut 的公司官網；是否有其他同名產品。
- Mysocial Outliers 價格是 2026-10-26 的資料，本次沒有重查。
- 所有功能都是廠商自己的說法，沒有實際註冊試用。

## 來源

| 來源 | 發布者 | 日期 | 查證 |
| --- | --- | --- | --- |
| [Cila](https://cila.app/) | Cila | 2026-11-02 存取（/pricing 回 404，價格取自首頁） | 已查證 |
| [Sandcastles](https://sandcastles.ai)、[價格](https://www.sandcastles.ai/#pricing) | Sandcastles | 2026-11-02 存取 | 已查證 |
| [Virlo pricing](https://virlo.ai/pricing)、[Virlo vs Shortimize](https://virlo.ai/compare/virlo-vs-shortimize) | Virlo | 2026-11-02 存取 | 已查證（比較頁是競品自寫） |
| [Shortimize pricing](https://www.shortimize.com/pricing) | Shortimize | 2026-11-02 存取 | 已查證 |
| [Silma](https://silma.app/) | Silma | 2026-11-02 存取 | 已查證 |
| [Roll: Camera Roll to Reels（App Store）](https://apps.apple.com/us/app/roll-camera-roll-to-reels/id6774188040)、[rolltoreel.com](https://rolltoreel.com/)、[rollwaitlist.com](https://www.rollwaitlist.com/) | GOSUBIT PTY LTD | 2026-11-02 存取 | 已查證 |
| [alfierobertson.com](https://alfierobertson.com/) | Alfie Robertson（自述） | 2026-11-02 存取 | 已查證 |
| [PopCut: AI Video Editor & Maker（App Store）](https://apps.apple.com/us/app/id6761034988) | Hong Kong Deepscape Technology Limited | 2026-11-02 存取 | 已查證 |
| [AppGoblin PopCut](https://appgoblin.info/apps/6761034988) | AppGoblin | 2026-11-02 存取 | 二手 |
| [1of10](https://1of10.com) | 1of10 | 2026-11-02 存取 | 已查證 |
| [Viewstats pricing](https://www.viewstats.com/pricing) | Viewstats | 2026-11-02 存取 | 已查證 |
| [Mysocial Outliers](https://mysocial.io/outliers/) | Mysocial | 2026-10-26 存取 | 前次 |
| [How we pivoted our social content strategy to speak to Gen Z](https://social.colostate.edu/strategy/how-we-pivoted-our-social-content-strategy-to-speak-to-gen-z/) | Colorado State University | 2022-11-01 | 已查證 |
| [Helping creators find new audiences](https://creators.instagram.com/recommendations-and-Originality) | Instagram for Creators | 2024-04-30 | 已查證 |
| Daphne 訪談逐字稿與摘要 | repo 內 `interviews/2026-10-21-daphene-*.md` | 2026-10-21，拼法 2026-10-25 確認 | 已查證 |

## 相關

- Instagram 演算法：`instagram-algorithm-2026.md`
- 先前的競品研究：`market/trend-research-competitors.md`
- Hackathon 計畫與開放問題：`hackathon-plan-trend-tool.md`
