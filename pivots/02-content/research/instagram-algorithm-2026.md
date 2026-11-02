# Instagram Reels 演算法 2026：怎麼把影片推爆，以及 Remake 能量到什麼

_研究日期：2026-11-02。對象：Remake（找爆紅短影音 → 拆解 → 規劃翻拍 → 拍攝剪輯 → 主管核准），第一個設計夥伴是 Mercif（雪梨餐飲與生活風格代理商）。夥伴在訪談中說「留言和互動會把影片推得更遠」，想知道 Instagram 演算法怎麼讓影片爆紅。本文件回答這個問題，並推到產品上。_

## 證據標籤

| 標籤 | 意思 |
| --- | --- |
| **[已查證]** | 本次研究親自打開該頁，看到這句話或這個數字 |
| **[二手]** | 只在搜尋摘要或第三方轉述中看到，沒有對照原始頁面 |
| **[推論]** | 我們自己的推理或建議，不是任何來源的說法 |

官方來源優先：Instagram / Meta 官方頁面 > 主流科技媒體轉述 Mosseri 原話 > 行銷部落格。行銷部落格常出現的數字（例如「分享的權重是按讚的 3–5 倍」「跳過率超過 50% 會被懲罰」）**找不到官方出處**，本文不採用。

---

## 結論先行（5 點）

1. **Reels 不是一個分數，而是一組「預測這個人會做什麼」的模型。** Meta 官方系統說明卡列出 Reels 排序會預測：會不會用這支影片的音樂、會不會看不到 3 秒就滑走、會不會按「有興趣」、會不會留言、看完的比例會不會超過同長度影片 95% 的觀眾、會不會轉傳、會不會分享到站外、會不會追蹤作者。[已查證，Meta Transparency Center，2025-11-11 更新]
2. **Mosseri 親口說最重要的三個訊號是觀看時間、按讚、轉傳（sends）。** 按讚對「已追蹤者」稍微更重要，轉傳對「非追蹤者」稍微更重要。他建議看「平均觀看時間、每觸及按讚數、每觸及轉傳數」。[已查證，Social Media Today 轉述 Mosseri 影片，2025-01-22]
3. **前 3 秒是第一道門。** 官方預測模型之一就是「看不到 3 秒的機率」，訊號包括「被看超過 3 秒的次數」與「打開 2 秒內被滑走的次數」。2025 年 8 月 Instagram 把洞察報告的「View rate」換成「Skip rate」（3 秒內滑走的比例）並加上留存曲線。[Meta 部分已查證；Skip rate 為二手媒體報導但有日期與引述]
4. **小帳號的爆紅是設計出來的，不是偶然。** 2024-04-30 起，Instagram 先把新內容給一小群人測試，表現好的才推給更大的群眾，目的是讓小型原創者「有更平等的機會觸及新觀眾」；同時只推薦原創，重複搬運的帳號（30 天內 10 次以上）被排除在推薦之外。這正好支撐 Remake 的「小帳號、大觀看」黃金訊號。[已查證，Instagram for Creators 官方頁與 Social Media Today]
5. **「留言會推更遠」只對一半。** 留言確實是官方列出的預測之一，但 Mosseri 列的前三名不含留言；對「推給陌生人」最關鍵的是觀看時間與轉傳。[推論，基於第 1、2 點] → Remake 的拆解應把「轉傳／分享率」與「觀看比（views ÷ followers）」放在留言前面。

---

## 1. Reels 怎麼被推出去

```
候選池（追蹤的帳號 + 與你最近互動過的內容相似的 Reels）
        │  輕量模型挑出約 100 支
        ▼
完整性過濾（違規、推薦指南不允許的內容剔除）
        ▼
多個預測模型打分（會看完？會轉傳？會留言？會滑走？…）
        ▼
排序後送到 Reels 分頁 / Explore
        ▼
新內容先給一小群觀眾 → 表現好 → 擴大到更多觀眾
```

- 候選池與「約 100 支」來自 Meta 的 Instagram Reels Chaining 系統說明卡。[已查證，2025-11-11 更新]
- 「先小群測試，再擴大」來自 Instagram 官方原創內容頁：符合資格的 Reels 會先給小群觀眾，表現最好的再推給更大的群眾。[已查證，2024-04-30]
- 每個介面（Feed、Stories、Explore、Reels）有各自的排序系統。[已查證，Mosseri，about.instagram.com，2023-05-31]

**弱點：** 系統說明卡只列「最重要的十個預測模型」，而且 Meta 明說會保留可能被濫用的訊號，所以這不是完整清單，也沒有權重。

## 2. 排序訊號：官方說了什麼

| 訊號 | 官方證據 | 標籤 |
| --- | --- | --- |
| **觀看時間** | Mosseri：「top three signals … watch time, likes and sends」。系統說明卡有「看完比例超過同長度影片 95% 觀眾的機率」，訊號是「影片長度」與「大家花多少時間看」 | [已查證] |
| **轉傳（sends / DM 分享）** | Mosseri：sends 對「非追蹤者（unconnected）」稍微更重要。系統說明卡有「轉傳機率」與「分享到站外機率」兩個模型。2023 年 Mosseri 文章列出「最重要的預測行為」之一是 resharing | [已查證] |
| **按讚** | Mosseri：likes 對「已追蹤者（connected）」稍微更重要 | [已查證] |
| **留言** | 系統說明卡有「留言機率」，訊號是你過去留言的內容與作者、以及「同國家觀眾在這支影片上花的時間」 | [已查證] |
| **收藏（saves）** | 2023 年排序說明提到「你收藏過的 reels」是個人活動訊號；系統說明卡把「你收藏過的影片」當成「有興趣」預測的輸入。**不是**排在前三名的訊號 | [已查證] |
| **用同一段音樂** | 2023 年說明列「造訪音樂頁」為最重要預測行為之一，視為「被激發想自己拍」的代理指標；系統說明卡有「用這段音樂拍片的機率」 | [已查證] |
| **追蹤作者** | 系統說明卡有「追蹤作者的機率」，訊號含「作者透過這支 reel 得到的粉絲數」 | [已查證] |
| **帳號人氣** | 2023 年說明列「發文者資訊（粉絲數、互動）」為第四類訊號，排在使用者活動、互動歷史、影片本身之後 | [已查證] |

**推論（先說明這是我們的解讀）：** 對「讓陌生人看到」最有用的訊號，依官方證據的強度排序是：觀看時間／看完 > 轉傳 > 按讚 > 留言與收藏。理由是前三者 Mosseri 明確點名，且其中「轉傳」被他特別連到非追蹤者。留言與收藏官方有提，但沒有被放在前面。

**弱點：** Mosseri 的說法是 2025 年 1 月，沒有給權重；之後 Instagram 沒有公開新的排名。行銷部落格常說「分享是按讚的 3–5 倍」，查到源頭是第三方工具 CreatorFlow 的估計，不是 Instagram 的數字。[二手]

## 3. 觸及非追蹤者：推薦、Trial Reels、Your Algorithm

- **推薦資格：** 原創、沒有違反社群守則、**沒有可見浮水印**、符合推薦指南。[已查證，Instagram for Creators，2024-04-30] 2023 年說明也提到有浮水印、低畫質、靜音、有邊框或大部分是文字的 Reels 會比較不容易被看到。[已查證，about.instagram.com，2023-05-31]
- **Trial Reels（試用 Reels）：** 2024-12-10 正式推出給所有專業帳號。只推給非追蹤者，不出現在個人頁格狀牆；24 小時後可看觀看、讚、留言、分享數，再決定封存或發到個人頁。[已查證，TechCrunch，2024-12-10] 可選「72 小時內表現好就自動分享給追蹤者」，但門檻沒有公開。[二手，MyMobile India、Planoly 2026-10]
- **Your Algorithm：** 2025-12-10 在美國 Reels 推出，讓使用者看到並調整影響推薦的主題；2026-04-15 擴大到 Explore，2026-06-10 擴大到 Feed、Reels、Explore（全球英文）。Instagram 稱它是「one unified system」。[已查證，about.instagram.com]

**對代理商的意思（推論）：** 推薦越來越依「主題」配對觀眾。食品客戶的影片要讓系統一看就知道主題（畫面、字幕、說明文字明確是「豆腐料理」「點心」），才會被配到對這個主題有興趣的人。Trial Reels 是零成本的 A/B 測試：Remake 規劃的翻拍可以先發成 Trial Reel 測試，再決定是否正式發布。

## 4. 前幾秒的留存

- 官方預測「看不到 3 秒的機率」，訊號包括：在 Instagram 各處被看超過 3 秒的次數、被關掉的次數、開聲音觀看的次數、**打開 2 秒內被滑走的次數**。[已查證，Meta Transparency Center]
- 2025-01-30：Reels 洞察加入「View rate」（看超過 3 秒的觀眾比例），可分追蹤者／非追蹤者。[已查證，Social Samosa]
- 2025-08-25：「Skip rate」（3 秒內滑走的比例）取代 View rate，並加上留存曲線。Instagram 說：「Retention shows you the moments in your Reel that keep or lose your viewers' interest」。[已查證，Social Samosa 引述 @creators]
- 2026-04：據報 Skip rate 與 Share rate 擴大到一般貼文。[二手，onlinemarketing.de 2026-04-27]

**弱點：** 「健康的 skip rate 是 30–40%」「超過 50% 會被懲罰」之類的門檻只出現在工具商部落格，找不到官方出處。[二手，不採用]

## 5. 原創規則

| 規則 | 證據 | 標籤 |
| --- | --- | --- |
| 兩支相同內容只推薦原版；原版夠新時，推薦中的搬運版會被換成原版，並通知原作者 | Instagram for Creators「Helping creators find new audiences」 | [已查證，2024-04-30] |
| 「有明顯修改」的內容不會被替換（迷因、改編、加新配音的混剪） | 同上；Social Media Today | [已查證] |
| 30 天內搬運別人內容 10 次以上的帳號，不出現在推薦介面 | 同上 | [已查證] |
| 搬運貼文會加上連回原作者的標籤 | 同上 | [已查證] |
| 2026-04 原創規則擴大到照片與輪播 | 只有部落格報導 | [二手] |

**對 Remake 很重要（推論）：** Remake 的核心是「翻拍」，不是「搬運」。只要客戶用自己的產品、自己的畫面、自己的口白重新拍，就落在「有明顯修改」這一側。但如果剪輯師直接套用原影片片段或原音軌字幕畫面，就有被判成搬運的風險。產品上應在翻拍計畫中明確寫「哪些元素要換成客戶自己的」。

## 6. 2025–2026 變了什麼（時間線）

| 日期 | 變化 | 來源 | 標籤 |
| --- | --- | --- | --- |
| 2024-04-30 | 原創優先、小創作者先小群測試、排除搬運帳號 | Instagram for Creators | [已查證] |
| 2024-12-10 | Trial Reels 全面推出 | TechCrunch | [已查證] |
| 2025-01-19/20 | Reels 上限從 90 秒延長到 3 分鐘；個人頁格狀牆改長方形 | Business Today 等轉述 Mosseri | [二手] |
| 2025-01-22 | Mosseri：最重要的三個訊號是觀看時間、按讚、轉傳 | Social Media Today | [已查證] |
| 2025-01-30 | Reels 洞察加入 View rate、Views over time | Social Samosa | [已查證] |
| 2025-04-20 | 「Views」成為唯一的內容表現指標，取代 Impressions 與 Plays | Sked Social、Minter.io 等 | [二手] |
| 2025-08-25 | Skip rate 取代 View rate，加入留存曲線 | Social Samosa | [已查證] |
| 2025-11-11 | Meta Reels 系統說明卡更新 | Meta Transparency Center | [已查證] |
| 2025-12-10 | Your Algorithm 在美國 Reels 推出 | about.instagram.com | [已查證] |
| 2025-12-31 | Mosseri 年終貼文：AI 讓「真實感」可以無限複製；精修內容退場，「raw」不完美內容與「只有你能做的東西」更有價值 | Digitimes、The Verge 等轉述 | [二手] |
| 2026-04-15 / 06-10 | Your Algorithm 擴大到 Explore，再到 Feed | about.instagram.com | [已查證] |

## 7. TikTok（簡述）

- TikTok 官方說推薦依「使用者互動」（按讚、分享、留言、看完）、「影片資訊」（說明文字、音樂、hashtag）、「裝置與帳號設定」（權重較低）。「從頭看完一支較長的影片」的權重大於弱訊號。[已查證，TikTok Newsroom，2020-06-18]
- 同一篇說：**粉絲數與帳號過去是否有爆紅影片「都不是直接因素」**。[已查證]
- **弱點：** 這篇是 2020 年的文章，雖仍是 TikTok 最常被引用的官方說明，但已六年。TikTok 支援中心的新頁面本次抓取失敗（只回傳標題），沒有對照到。

**推論：** TikTok 與 Instagram 都說「粉絲數不是決定因素、觀看完成度與分享才是」。這就是為什麼 views ÷ followers 會抓到好點子：小帳號拿到大觀看，代表是內容本身被系統一路推出去，而不是靠既有粉絲。

---

## 8. 這對 Remake 代表什麼

### 8.1 Remake 從公開資料能量到什麼

依照 `app/trend-finder/backend/server.py` 目前讀取的欄位（Apify actors）：

| 欄位 | TikTok | Instagram Reels | 演算法上的意義 |
| --- | --- | --- | --- |
| 觀看數 | 有（`playCount`） | 有（`videoPlayCount` / `videoViewCount`） | 結果，不是原因 |
| 粉絲數 | 有（`authorMeta.fans`） | 要另跑 profile actor（`followersCount`） | 算 views ÷ followers 必需 |
| 按讚 | 有 | 有，但創作者可隱藏（回傳 -1） | Mosseri 前三名之一 |
| 留言 | 有 | 有 | 官方預測之一，非前三 |
| 分享 | 有（`shareCount`） | 有欄位（`sharesCount`），但 Instagram 公開分享數的推出不一致，可能常是 0 或缺漏 | Mosseri 前三名之一，對非追蹤者最重要 |
| 收藏 | 有（`collectCount`） | **沒有**（程式中設為 `None`） | 次要訊號 |
| 觀看時間 / 留存 / Skip rate | 沒有 | 沒有 | **最重要的訊號，但只有影片擁有者在洞察報告看得到** |
| 音樂、hashtag、影片長度 | 有 | 有 | 用來判斷主題與可否用同一段音樂 |

- Instagram Graph API 的 Business Discovery 也只回傳其他專業帳號貼文的 `like_count`、`comments_count`、`view_count`（含付費觀看），沒有分享、收藏、觀看時間。[二手，Meta for Developers 官方文件的搜尋摘要，未打開原頁]
- Instagram 公開分享數：2023 年 12 月 Adweek 報導「部分使用者」看得到貼文分享數，Instagram 沒有正式聲明。[二手]

**關鍵限制：** 演算法最看重的「觀看時間」，Remake 從外部永遠量不到。只能用代理指標推估。

### 8.2 產品建議（以下全部是 [推論]）

依優先順序：

1. **拆解頁的第一個數字仍是 views ÷ followers，但要加一句「為什麼這代表內容好」。** 證據：TikTok 官方說粉絲數不是直接因素；Instagram 2024 年起先小群測試再擴大。推理：小帳號的觀看大多來自推薦，不是粉絲。弱點：有些影片靠付費推廣（Business Discovery 的 view_count 含付費），無法從外部分辨。
2. **加「分享率」= shares ÷ views，並排在「留言率」前面。** 證據：Mosseri 說 sends 對非追蹤者更重要。推理：分享率是外部能量到、最接近「推給陌生人」的訊號。弱點：Instagram 的分享數公開不完整；TikTok 的分享數包含所有分享方式，不等於 DM 轉傳。
3. **用「互動 ÷ 觀看」當觀看時間的替代，但標明是替代。** 例如 (likes + comments + shares) ÷ views。弱點：互動高不一定看完；這是我們的推估，要在介面上寫清楚。
4. **拆解的「Hook」段落要具體到 0–3 秒。** 證據：官方預測模型之一是「看不到 3 秒的機率」，訊號含「2 秒內滑走」。建議欄位：前 1 秒畫面、第一句話／字幕、是否一開始就出現產品。
5. **翻拍計畫加「原創檢查」欄。** 證據：完全相同內容只推原版，搬運帳號被排除推薦，有浮水印的不推薦。建議欄位：要換掉的元素（畫面、口白、字幕）、不得使用原片段、輸出不帶其他 App 浮水印。
6. **建議客戶先用 Trial Reels 發翻拍版。** 證據：Trial Reels 只推給非追蹤者，24 小時後有數據。這也讓「主管核准」之後多一個低風險的發布選項。
7. **主題要明確。** 證據：Your Algorithm 依主題配對觀眾。建議在計畫中寫「這支影片的主題標籤」，讓畫面、字幕、說明文字一致。

### 8.3 回應夥伴「留言會推更遠」

- **證據：** 留言是官方 Reels 預測模型之一 [已查證]；但 Mosseri 列的前三名是觀看時間、按讚、轉傳 [已查證]。
- **推理：** 留言有幫助，但對「從小帳號爆到 100 萬」最關鍵的是觀看完成度與轉傳。留言多的影片常常也是被轉傳多、看得久的影片，所以實務上看起來像留言在推。
- **弱點：** Instagram 沒有公布權重；我們無法排除留言的權重其實很高。建議說法：「留言有幫助，但分享和看完更重要」，不要說「留言沒用」。

## 9. 可能過時或未查證

- Mosseri 的「前三訊號」是 2025-01 的說法，之後沒有新官方排名。
- Instagram 公開分享數的推出範圍與時間不明。
- 3 分鐘 Reels、Views 指標取代 Plays、Mosseri 年終貼文：只看到媒體轉述，沒有打開原始貼文。
- 「2026-04 原創規則擴大到照片與輪播」只有部落格說法。
- TikTok 官方說明是 2020 年的；新的支援中心頁面本次沒有抓到內文。
- Apify actor 的 Instagram `sharesCount` 是否穩定有值，沒有實際跑過大量樣本確認。

## 來源

| 來源 | 發布者 | 日期 | 查證 |
| --- | --- | --- | --- |
| [Instagram Reels Chaining AI system](https://transparency.meta.com/features/explaining-ranking/ig-reels-chaining/) | Meta Transparency Center | 2025-11-11 更新；2026-11-02 存取 | 已查證 |
| [Instagram Ranking Explained](https://about.instagram.com/blog/announcements/instagram-ranking-explained) | Adam Mosseri, Instagram | 2023-05-31；2026-11-02 存取 | 已查證 |
| [Helping creators find new audiences (Recommendations and Originality)](https://creators.instagram.com/recommendations-and-Originality) | Instagram for Creators | 2024-04-30；2026-11-02 存取 | 已查證 |
| [Your Algorithm / Reels algorithm control](https://about.instagram.com/blog/announcements/reels-algorithm-control) | Instagram | 2025-12-10，更新 2026-04-15、2026-06-10；2026-11-02 存取 | 已查證 |
| [Instagram shares algorithm insights for 2025](https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/) | Social Media Today（Andrew Hutchinson） | 2025-01-22 | 已查證 |
| [Instagram algorithm to prioritize original, emerging creators](https://www.socialmediatoday.com/news/instagram-algorithm-prioritize-original-emerging-creators/714777/) | Social Media Today | 2024-04-30 | 已查證 |
| [Instagram rolls out trial reels](https://techcrunch.com/2024/12/10/instagram-rolls-out-trial-reels-that-arent-shown-to-a-creators-followers) | TechCrunch | 2024-12-10 | 已查證 |
| [Instagram enhances Reels insights with view rate](https://www.socialsamosa.com/news-2/instagram-enhances-reels-insights-view-rate-performance-tips-8673312) | Social Samosa | 2025-01-30 | 已查證 |
| [Instagram adds Retention chart & Skip Rate](https://www.socialsamosa.com/news-2/instagram-retention-chart-skip-rate-new-performance-metrics-reels-9730992) | Social Samosa | 2025-08-25 | 已查證 |
| [How TikTok recommends videos #ForYou](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you) | TikTok Newsroom | 2020-06-18 | 已查證 |
| [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery) | Meta for Developers | 2026-11-02 存取 | 搜尋摘要（二手） |
| [Instagram quietly makes share counts public](https://www.adweek.com/media/instagram-quietly-makes-share-counts-public/) | Adweek | 約 2023-12（轉載頁日期） | 已打開，但頁面無日期 |
| [Trial reels auto-share vs manual](https://www.planoly.com/blog/trial-reels-auto-share-vs-manual) | Planoly | 2026-10 | 二手 |
| [Instagram introduces trial reels feature](https://www.mymobileindia.com/instagram-introduces-trial-reels-feature-for-creators-to-test-content-with-non-followers/amp) | MyMobile India | 2024-12 | 二手 |
| [Instagram head announces 3-minute reels](https://www.businesstoday.in/technology/news/story/instagram-head-announces-big-changes-3-minute-reels-and-new-look-for-profile-grid-461527-2025-01-21) | Business Today | 2025-01-21 | 二手 |
| [Updates to Instagram metrics April 2025](https://help.skedsocial.com/updates-to-instagram-metrics-april-2025) | Sked Social | 2025 | 二手 |
| [Instagram neue Metriken: Skiprate, Sharerate](https://onlinemarketing.de/social-media-marketing/instagram-neue-metriken-skiprate-sharerate-insights-reels) | onlinemarketing.de | 2026-04-27 | 二手 |
| [Mosseri year-end post coverage](https://www.digitimes.com/news/a20260105PD201.html) | Digitimes | 2026-01-05 | 二手 |

## 相關

- 競品與 USP：`competitor-usp-2026.md`
- 先前的競品研究：`market/trend-research-competitors.md`
- Daphne 訪談：`interviews/2026-10-21-daphene-summary.md`
