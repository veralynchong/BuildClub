# 發佈工具比較：Ayrshare 與替代方案

> 研究日期：2026-11-02（Sydney, AEDT）。所有價格為美元、月繳，除非另註明。
> 證據標記：**[官方✓]** 已對照官方頁面核對；**[官方·部分]** 官方頁有但內容不完整或自相矛盾；**[第三方]** 第三方或競品頁面，未能對照官方；**[推論]** 我的推算或判斷；**[未驗證]** 找不到可靠來源。
> 排名與推薦都是**推論**，依據是下方已核對的價格與功能，加上 Remake 的需求排序。

---

## 1. 結論

**[推論] 推薦：MVP 現在用 Upload-Post，擴大後仍用 Upload-Post，Zernio（前身 Late）當備案。**

1. **MVP（3 個客戶）**：Upload-Post **Basic US$24/月**（5 個 profile，由代理商自己在後台連接客戶帳號），需要讓客戶自己點連結授權時升級 **Professional US$50/月**（25 個 profile、含白標 connect link）。月繳、無合約。免費方案不含 TikTok，所以沒有真正零成本的路線能跑 TikTok demo。
2. **擴大（10–25 個客戶）**：Upload-Post Professional 一個方案打平到 25 個客戶，US$50/月（年繳約 US$33/月）。超過 25 個客戶升 Advanced US$147/月（75 個 profile）。
3. **Ayrshare 不建議**：之前報告的「Premium 約 US$149/月」價格正確 **[官方✓]**，但 Premium 只有 **1 個 profile**，無法放多個客戶；多客戶最低是 **Launch US$299/月（最多 10 個 profile）**，25 個客戶要 **Business US$599/月**（年繳 US$499/月）。同樣需求下是 Upload-Post 的 6–12 倍價格。Ayrshare 的優勢是文件最完整、明確支援 TikTok 個人與商業帳號，若 Upload-Post 可靠度出問題才值得付這個價。
4. **直接串官方 API 不建議**：TikTok 的內容分享準則明確把「幫你或你的團隊管理的帳號上傳內容的工具」列為不被接受的用途 **[官方✓]**。Remake 正是這種內部代理商工具，審核很可能不過；未審核前所有貼文只能私人可見、每 24 小時最多 5 個使用者 **[官方✓]**。

**為什麼是 Upload-Post 而不是更便宜的選項 [推論]**：Post for Me（US$10/月不限帳號）與 Outstand（US$19/月不限帳號）更便宜，但它們的分析 API 欄位、TikTok 商業帳號支援我都沒能在官方文件核對到；Upload-Post 的分析文件逐平台列出 views/likes/comments/shares/saves 與粉絲數 **[官方✓]**，且「一個 profile = 一個客戶、每個平台一個帳號」的模型剛好對上 Remake 的資料結構。Post for Me 值得在 MVP 階段花一個月 US$10 實測，若分析欄位夠用，是最便宜的替代。

**真正的鎖定風險 [推論]**：所有候選都是月繳、無長約；真正的轉換成本是**客戶的 OAuth 授權綁在供應商的 App 上**——換供應商時每個客戶的每個帳號都要重新授權一次。Publisher 介面能讓程式碼換得快，但客戶端的重新授權無法避免，所以第一次就選對比省月費重要。

---

## 2. 比較表

假設每個客戶接 3 個帳號（TikTok、Instagram、YouTube），括號內為加 Facebook 的 4 個帳號情境。

| 工具 | 三大平台影片發佈 | 每則貼文分析 | 多客戶模型 | 3 客戶 | 10 客戶 | 25 客戶 | 免費方案 | 鎖定 | 主要風險 |
|---|---|---|---|---|---|---|---|---|---|
| **Upload-Post** | TikTok/IG/YT/FB 皆支援 [官方✓] | views, likes, comments, shares, saves（TikTok 叫 favorites）；粉絲數有端點 [官方✓] | 按 profile 計價，1 profile = 1 客戶，每平台 1 帳號；白標 connect link（48 小時有效）[官方✓] | $24（Basic，無白標）/ $50（Pro）| $50 | $50（剛好上限）| 有，但**不含 TikTok**，2 profile、10 次上傳/月 [官方✓] | 月繳 | TikTok 商業帳號支援未在文件看到 [未驗證]；可靠度無獨立數據 |
| **Zernio（前 Late）** | 支援；新 TikTok 連線走 TikTok for Business App [官方✓] | impressions, reach, likes, comments, shares, saves, views；saves 文件只寫 IG/Pinterest/X [官方·部分] | 按「連接帳號」計價，profile 免費 [官方✓] | $42（$54）| $108（$138）| $243（$318）| 前 2 個帳號免費、免信用卡 [官方✓] | 月繳 | 計價隨帳號線性上升；Trustpilot 有一則抱怨斷開後存取仍有效 [第三方] |
| **Ayrshare** | 支援；TikTok 個人與商業帳號皆可 [官方✓] | TikTok videoViews/likes/comments/shares；IG 含 saves；YT 無 shares/saves [官方✓] | Premium 只有 1 profile；Launch ≤10、Business 30 起 [官方✓] | $299（Launch）| $299 | $599（年繳 $499）| 無；Launch 有 28 天試用 [官方✓] | 月繳或年繳 | 價格最高；Premium/Launch 年繳價未公開 |
| **bundle.social** | 支援 TikTok/IG/YT/FB [官方·部分] | 有 post 與 account 分析端點，24 小時更新；欄位未核對 [官方·部分] | 以 team 為單位，有 hosted portal link（最長 48 小時）[第三方摘要自官方文件] | $100（Pro）| $100 | $100 | 有：3 個帳號、20 則/月 [官方✓] | 月繳 | Free → Pro 價差大；平台細節未核對 |
| **Post for Me** | 列出 TikTok/IG/YT/FB [官方·部分] | 「views, likes, shares, engagement」，欄位未核對 [官方·部分] | 不限帳號；Quickstart 用其開發者憑證 [官方✓] | $10 | $10 | $10 | 無 [官方✓] | 月繳（條款未列） | 分析與 TikTok 商業帳號細節未驗證；共用憑證可能受平台全 App 上限影響 [推論] |
| **Outstand** | TikTok/IG/YT/FB 皆為 Managed Keys [官方✓] | likes, shares, reach, impressions；views/saves 未列 [官方·部分] | 不限帳號，按貼文數計價 [官方✓] | $19 | $19 | $19 | 無 [官方✓] | 月繳 | 第三方報價互相矛盾；分析欄位較少 |
| **Blotato** | 支援 8 個平台含 TikTok/IG/YT/FB [第三方摘要自官方說明] | 有單則貼文分析端點 [第三方摘要自官方說明] | 未找到給終端客戶的 connect 流程 | $29（20 帳號）| $97（40 帳號）| $499 | 7 天試用但試用不含 API [官方✓] | 月繳 | 偏個人創作者工具，非多租戶 |
| **Publer API** | — | — | API 帳號端點唯讀，帳號需在後台手動連 [第三方] | ~$10/帳號 [第三方，矛盾] | — | — | 14 天試用 | — | 定價頁無法讀取 |
| **Buffer API** | — | — | — | 不開放 | — | — | — | — | 官方 2025-07 說正在重建，只收早期申請 [官方✓] |
| **Hootsuite / Sprout** | 據報 Publishing API 不能發 TikTok/YouTube [第三方] | — | 企業方案 | 數百美元起 [第三方] | — | — | — | 年約 | 排除 |
| **Zapier / Make** | Zapier 原生 TikTok 整合只做廣告 lead，不發影片 [第三方] | — | 還是要接第三方發佈工具 | — | — | — | — | — | 排除 |
| **直接串官方 API** | TikTok 需審核，內部工具很可能不過 [官方✓] | 各平台自己的 insights API | 自己做 OAuth | $0 | $0 | $0 | — | 無 | 審核時間與維護成本；TikTok 可能卡死 |

### 成本計算說明 [推論，依官方價目推算]

- **Zernio**：前 2 個帳號免費、第 3–10 個 $6、第 11–100 個 $3、101 以上 $1（累進）。官方範例「10 個帳號 $48、20 個 $78、100 個 $318」與此算法一致。9 帳號 = 7×6 = $42；30 帳號 = 48 + 20×3 = $108；75 帳號 = 48 + 65×3 = $243。
- **Upload-Post**：profile 限制 Basic 5、Professional 25、Advanced 75。年繳：Basic $192/年、Professional $400/年、Advanced $1,411/年。
- **Ayrshare**：Launch 上限 10 個 profile，到上限時 API 回錯誤並提示升級 [官方✓]；Business 30 個 profile 起，31–100 個每個 $8.99/月（年繳 $7.99）。
- 未計入：各工具的 X/Twitter 額外費用（與 Remake 無關）、Ayrshare Max Pack（$300/月，非必要）。

---

## 3. 各候選詳細

### 3.1 Upload-Post（推薦）

- **價格** [官方✓]：Free $0（2 profile、10 次上傳/月、1 seat、**不含 TikTok**）、Basic $24/月（年繳 $192/年，5 profile、不限上傳）、Professional $50/月（年繳 $400/年，25 profile、2 seat、白標）、Advanced $147/月（75 profile）、Business $438/月（225 profile）。來源：[Upload-Post Pricing](https://www.upload-post.com/pricing)，2026-11-02 讀取。
- **多客戶** [官方✓]：每個客戶建一個 profile，呼叫 `generate-jwt` 拿 `access_url` 傳給客戶，客戶在 app.upload-post.com/connect 登入各平台，不需要 Upload-Post 帳號；每個連結只開一個 profile，48 小時過期。「一個 profile 每個平台只有一個帳號」，客戶有兩個 IG 就要兩個 profile。白標只在 Professional 以上。來源：[Upload-Post White-label](https://www.upload-post.com/whitelabel/)，2026-11-02。另有 headless 的 `POST /api/uploadposts/oauth/{platform}/start` 回傳 `authorize_url`（15 分鐘內導向）[官方✓，docs.upload-post.com 首頁摘要]。
- **分析** [官方✓]：`GET /api/uploadposts/post-analytics/{platform_post_id}`。TikTok：views, likes, comments, shares, favorites（收藏）、reach、觀看時長；Instagram：views（只算 IG 播放）、likes, comments, shares, saves, reach, impressions；YouTube：views, likes, comments, favorites（無 shares/saves）；Facebook：reactions, likes, comments, shares（無 views/saves）。粉絲數：`GET /api/analytics/{profile_username}` 的 `followers`。頁面未提到方案限制。來源：[Upload-Post Get Analytics](https://docs.upload-post.com/api/get-analytics)，2026-11-02。
- **弱點**：(1) TikTok 商業帳號是否支援，白標頁與文件摘要都沒寫 [未驗證]。(2) 自稱 4.9/5、127+ 評價，是自家數據 [第三方/自述]；找不到 Reddit 上的可靠度討論。(3) Basic 方案無白標時，代理商要自己登入客戶帳號連接，這對 Remake 的「客戶自己連」流程不理想 [推論]。(4) 25 profile 剛好打平 25 個客戶，沒有餘裕；客戶有兩個同平台帳號會吃掉更多 profile [推論]。

### 3.2 Zernio（前身 Late / getlate.dev，備案）

- **改名** [第三方]：getlate.dev 已 301 轉址到 zernio.com（WebFetch 實測 [官方✓]）。第三方頁面引述官方改名頁說 API 路由、參數、金鑰、價格不變，舊 SDK 至少可用 6 個月。來源：[OpenTweet vs Zernio](https://opentweet.io/vs/zernio)、[Ryan Doser 評測](https://ryandoser.com/zernio-review/)，2026-11-02。
- **價格** [官方✓]：「no plans, no seats」，按連接帳號計價：1–2 個免費、3–10 個每個 $6、11–100 個 $3、101 以上 $1；貼文不限。來源：[Zernio Pricing](https://zernio.com/pricing)，2026-11-02。
- **多客戶** [官方✓]：每個客戶一個 profile（免費），`GET /v1/connect/{platform}` 回傳 `authUrl`，預設 Zernio 代管選帳號畫面，可 `headless=true` 自己畫，或 `welcome=true` 顯示你的品牌；連結 30 分鐘過期。「Profiles are free. Each connected account is metered.」來源：[Zernio Build a platform](https://docs.zernio.com/multi-tenant)，2026-11-02。
- **分析** [官方·部分]：`PostAnalytics` 含 impressions, reach, likes, comments, shares, saves, clicks, views；但 saves 欄位說明只寫「Instagram, Pinterest, X」。舊方案需要 Analytics add-on，**用量計價方案預設包含**；粉絲數走 `/v1/accounts/follower-stats`。TikTok 頁面把分析標為「Limited」。來源：[Zernio Get analytics](https://docs.zernio.com/analytics/get-analytics)、[Zernio TikTok](https://docs.zernio.com/platforms/tiktok)，2026-11-02。
- **TikTok** [官方✓]：新連線一律走 TikTok for Business App，不受全 App 直發上限影響；舊的 developer App 連線共用上限，可能失敗回「TikTok direct posting is at capacity right now」。Business App 的影片直發只能公開。
- **弱點**：(1) 成本隨帳號數上升，25 客戶時是 Upload-Post 的約 5 倍 [推論]。(2) Trustpilot 一則評論指控斷開並刪除帳號後，部分社群帳號存取仍有效；另有對 AppSumo 終身方案漲價的不滿 [第三方，單一評論]。(3) 品牌剛換，文件 URL 有些 404 [實測]。
- **適合**：零成本 demo（一個客戶的 TikTok + IG 兩個帳號免費、免卡）[推論]。

### 3.3 Ayrshare（目前的選擇，不建議）

- **價格** [官方✓]：Premium $149/月（1 profile、最多 14 個帳號、無試用）、Launch $299/月（最多 10 profile、28 天免費試用）、Business $599/月（30 profile；年繳 $499/月；31–100 個每個 $8.99）、Enterprise 客製。年繳切換寫「Save 17%」，但 Premium/Launch 年繳價未列。所有方案「unlimited API calls and unlimited posts」。來源：[Ayrshare Pricing](https://www.ayrshare.com/pricing/)，2026-11-02。
  - 頁面自相矛盾：Premium 帳號數寫 13 和 14；Launch 寫 130 和 140；試用期一處寫 Launch 權限、FAQ 寫「full Business Plan access, including Max Pack」[官方·部分]。
- **之前報告的核對**：「Premium 約 US$149/月」**正確**，但 Premium 只有 1 個 user profile，**不能放多個客戶**。多客戶需要 User Profiles，官方文件說 Launch 與 Business 才能「manage social media for all your users」[官方✓，[Ayrshare docs intro](https://www.ayrshare.com/docs/introduction)、[Launch overview](https://www.ayrshare.com/docs/multiple-users/business-launch-overview)]。
- **分析** [官方✓]：所有方案都有分析，Premium 為「Basic」、其他為「Advanced」，頁面沒定義差別。Post analytics：TikTok videoViews, likeCount, commentsCount, shareCount, reach, 平均觀看時間（24–48 小時更新）；IG likes, comments, shares, saved, reach, views；YouTube views, likes, comments（無 shares/saves）；Facebook 無 saves。Launch 文件寫「Per-user analytics on posts, social profiles, and links」。來源：[Ayrshare Post Analytics](https://www.ayrshare.com/docs/apis/analytics/post)。
- **TikTok** [官方✓]：支援「personal or business TikTok account」；可直發或存草稿；TikTok 限制 API 每分鐘 6 支、每天上限 15 支影片。來源：[Ayrshare TikTok](https://www.ayrshare.com/docs/apis/post/social-networks/tiktok)。
- **客戶連接** [官方·部分]：Launch 有 JWT 社群連結頁；Max Pack（$300/月）才有可寄 email 的長效 JWT 連結 [官方✓，[Max Pack](https://www.ayrshare.com/docs/additional/max-pack)]。
- **評價**：找不到 Reddit 抱怨；第三方評價數量少（競品頁說 G2 只有 7 則、3.9/5）[第三方，競品]。
- **弱點**：價格是同類 6–12 倍；Launch 卡 10 個 profile，第 11 個客戶就要跳到 $599 [推論]。

### 3.4 bundle.social

- **價格** [官方✓]：Free $0（20 則/月、3 個帳號）、Pro $100/月（10,000 則、不限帳號、14 天試用）、Business $400/月、Enterprise 客製；年繳價未顯示。另有每帳號每月貼文匯入上限（Pro 100）。來源：[bundle.social Pricing](https://bundle.social/pricing)，2026-11-02。
- **多客戶** [第三方摘要自官方文件]：`POST /api/v1/social-account/create-portal-link` 帶 teamId 與 redirect URL，有效期 5–2880 分鐘；代管 OAuth、選帳號、選頻道。來源：[bundle.social hosted flow](https://info.bundle.social/api-reference/connect-social-accounts/hosted-flow)。
- **分析** [官方·部分]：`GET /api/v1/analytics/post` 與 `/analytics/social-account`，24 小時更新；TikTok 基本分析 2024-08 加入；確切欄位未核對。
- **評語** [推論]：Free 方案能零成本跑一個客戶三平台 demo（是否含 TikTok 未核對），但正式用時直接跳 $100，比 Upload-Post 貴一倍。

### 3.5 Post for Me

- **價格** [官方✓]：$10/月，不限社群帳號、每月最多 1,000 則成功貼文、含「Analytics for social posts」、可用自己或 Post for Me 的開發者憑證；無免費方案；超量不會自動停或加價。來源：[Post for Me Pricing](https://www.postforme.dev/pricing)，2026-11-02。
- **憑證** [官方✓]：Quickstart 用 Post for Me 的平台憑證，不需自己過平台審核；White Label 要自己的開發者憑證（需各平台審核）。
- **弱點**：分析欄位、TikTok 商業帳號、hosted connect 流程都未在文件核對到（API 文件頁是 JS 渲染，抓不到內容）[未驗證]。共用憑證代表 TikTok 的全 App 直發上限由所有客戶共享（Zernio 文件描述過同類問題）[推論]。
- **評語** [推論]：最便宜；值得用 $10 實測一個月確認分析欄位，若可用，可成為 Upload-Post 的替代。

### 3.6 Outstand

- **價格** [官方✓，官網首頁]：Pay as you go $19/月含 3,000 則，超過 $0.007/則、10k 以上 $0.005；Business $129/月含 50,000 則；不限連接帳號；Managed Keys 涵蓋 TikTok/IG/YT/FB，兩個方案都含；無免費方案。來源：[outstand.so](https://www.outstand.so/)，2026-11-02（/pricing 回 404）。
- **衝突**：第三方報 $5 基本費 + $0.01/則、或 $69/月 managed OAuth [第三方]，與官網不符；以官網為準。
- **分析** [官方·部分]：`GET /v1/posts/{id}/analytics` 回 likes, shares, reach, impressions；views、saves、comments 未列。
- **評語** [推論]：價格便宜且不隨客戶數上升，但分析欄位可能不夠 Remake 回饋選題用。

### 3.7 Blotato、Publer、Buffer、Hootsuite/Sprout、Zapier/Make（排除）

- **Blotato** [官方✓ 價格]：Starter $29（20 帳號）、Creator $97（40 帳號）、Agency $499；試用不含 API，產生 API key 即結束試用。有單則貼文分析端點 [第三方摘要自 help.blotato.com]。找不到讓終端客戶自行連帳號的流程 → 偏創作者自用，不適合多客戶。
- **Publer** [第三方]：Business 方案有 API（需「good standing」），約 $10/帳號起；API 帳號端點唯讀，帳號只能在後台手動連（來源為競品 Blotato）。publer.com/pricing 重新導向過多無法讀取。
- **Buffer** [官方✓]：官方 2025-07 文章說多年前已停收新開發者申請，正在重建 API、只開早期申請。來源：[Buffer: Rebuilding Buffer's API](https://buffer.com/resources/rebuilding-buffers-api/)。
- **Hootsuite / Sprout** [第三方]：API 需開發者審核、方案要求不明；據報 Publishing API 不能發 TikTok/YouTube。來源：[Supergood API Report Card](https://supergood.ai/api-report-card/hootsuite)、[Activepieces](https://www.activepieces.com/blog/hootsuite-api-setup-authentication-and-docs-2026)。企業級價格，對小代理商不划算。
- **Zapier / Make** [第三方]：Zapier 原生 TikTok 整合只做廣告 lead，發影片要透過第三方（例如 Upload-Post 的 Zapier app）。來源：[Zapier Community](https://community.zapier.com/how-do-i-3/building-a-workflow-to-post-directly-to-tiktok-need-advice-52687)。Remake 已有 Python 後端，多一層 Zapier 只增加成本與失敗點 [推論]。

---

## 4. 直接串官方 API 的路線

| 平台 | 審核需求 | 未審核限制 | 估計時間與工作量 [推論] |
|---|---|---|---|
| **TikTok Content Posting API** | App review 取得 `video.publish` scope，再做 audit 才能公開發佈 [官方✓] | 只能 `SELF_ONLY`、每 24 小時最多 5 個使用者 [官方✓] | **很可能過不了**：準則把「A utility tool to help upload contents to the account(s) you or your team manages」列為不可接受 [官方✓]。第三方估 audit 2–6 週或 3–7 工作天，官方未公布 [第三方] |
| **Instagram Graph API** | 只服務「你擁有或管理的帳號」用 Standard Access 即可；服務非你管理的帳號需 Advanced Access = App Review + Business Verification [官方✓] | 需 Instagram 專業帳號（商業或創作者）[官方✓]；每帳號 24 小時 100 則 API 貼文（同頁另一處寫 50）[官方·部分] | 代理商若把客戶 IG 加入自己的 business portfolio，可用 Standard Access 免審核 [推論]；否則 Business Verification 據報 10 天到一個月以上 [第三方，Meta 社群論壇] |
| **YouTube Data API** | `videos.insert` 自 2026-06-01 起有獨立 quota bucket；2025-12-04 上傳成本由約 1600 降到約 100 單位 [官方✓ revision history] | 目前 videos.insert 頁寫「Videos uploaded from unverified API projects are not restricted to private viewing mode」，與 2020 年的私人限制公告矛盾 [官方·部分] | 最容易；但 `youtube.upload` 是敏感 scope，正式上線需 Google OAuth 驗證 [未驗證，本次未查] |
| **Facebook Reels** | 同 Meta App，Pages 權限 | — | 與 IG 一起做 |

**結論 [推論]**：直接 API 每月 $0，但 (1) TikTok 很可能審核不過、未審核只能私人發佈，這直接擋掉需求第一優先；(2) 四個平台各自的 OAuth、token 刷新、上傳格式、分析 API 與政策變動要自己維護，估計首次開發 4–8 週加上不定的審核等待。代理商規模下月費省下的 $24–50 遠低於這些成本。可以考慮的混合方案：YouTube 直接串（最容易），其他走 Upload-Post——但這省不到錢（Upload-Post 按 profile 而非平台計價），所以不建議。

---

## 5. 未解問題

1. **Upload-Post 是否支援 TikTok 商業帳號**，以及新連線是否走 TikTok for Business App（影響全 App 上限）——要問 Upload-Post 或用 Basic 實測。
2. **Upload-Post Basic 方案能否用 API 建 user profile**（還是只能後台）——白標頁只說 Basic 沒白標 [未驗證]。
3. **Post for Me 的分析欄位與 TikTok 商業帳號支援**——文件頁無法抓取。
4. **bundle.social Free 是否包含 TikTok**、年繳價。
5. **Ayrshare Premium / Launch 的年繳價**（頁面只寫 Save 17%，推估 Launch 約 $249/月 [推論]）。
6. **Outstand 的 views/saves 欄位**、官網與第三方價格不一致的原因。
7. **YouTube 未驗證專案是否仍限私人**——官方兩處說法矛盾。
8. **可靠度**：所有候選都找不到獨立的上線率或 Reddit 失敗率數據；建議 MVP 第一個月記錄每次發佈成功率。

## 6. 主要來源（皆 2026-11-02 讀取）

- [Ayrshare Pricing](https://www.ayrshare.com/pricing/)｜[Ayrshare Post Analytics](https://www.ayrshare.com/docs/apis/analytics/post)｜[Ayrshare TikTok](https://www.ayrshare.com/docs/apis/post/social-networks/tiktok)｜[Ayrshare Launch overview](https://www.ayrshare.com/docs/multiple-users/business-launch-overview)｜[Ayrshare Max Pack](https://www.ayrshare.com/docs/additional/max-pack)
- [Upload-Post Pricing](https://www.upload-post.com/pricing)｜[Upload-Post White-label](https://www.upload-post.com/whitelabel/)｜[Upload-Post Get Analytics](https://docs.upload-post.com/api/get-analytics)
- [Zernio Pricing](https://zernio.com/pricing)｜[Zernio multi-tenant](https://docs.zernio.com/multi-tenant)｜[Zernio analytics](https://docs.zernio.com/analytics/get-analytics)｜[Zernio TikTok](https://docs.zernio.com/platforms/tiktok)
- [bundle.social Pricing](https://bundle.social/pricing)｜[bundle.social hosted flow](https://info.bundle.social/api-reference/connect-social-accounts/hosted-flow)
- [Post for Me Pricing](https://www.postforme.dev/pricing)｜[Outstand](https://www.outstand.so/)｜[Blotato Pricing](https://www.blotato.com/pricing)
- [TikTok Content Sharing Guidelines](https://developers.tiktok.com/doc/content-sharing-guidelines)｜[TikTok Content Posting API](https://developers.tiktok.com/doc/content-posting-api-get-started)
- [Instagram Platform Overview](https://developers.facebook.com/docs/instagram-platform/overview)｜[Instagram Content Publishing](https://developers.facebook.com/docs/instagram-platform/content-publishing/)
- [YouTube videos.insert](https://developers.google.com/youtube/v3/docs/videos/insert)｜[YouTube quota cost](https://developers.google.com/youtube/v3/determine_quota_cost)｜[YouTube revision history](https://developers.google.com/youtube/v3/revision_history)
- [Buffer: Rebuilding Buffer's API](https://buffer.com/resources/rebuilding-buffers-api/)
- 第三方：[OpenTweet vs Zernio](https://opentweet.io/vs/zernio)、[Ryan Doser Zernio review](https://ryandoser.com/zernio-review/)、[Trustpilot Zernio](https://dk.trustpilot.com/review/zernio.com)、[Supergood Hootsuite](https://supergood.ai/api-report-card/hootsuite)、[Meta 社群論壇：Business verification 10 天](https://communityforums.atmeta.com/questions-and-discussions-26/business-verification-in-review-10-days-blocking-app-review-submission-177498)、[Zapier Community TikTok](https://community.zapier.com/how-do-i-3/building-a-workflow-to-post-directly-to-tiktok-need-advice-52687)
