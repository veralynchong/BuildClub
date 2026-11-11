# 用免費工具剪出 Cursor 式 80 秒示範

**結論先講：** 你們要的那種「螢幕錄影＋自動放大縮小＋平滑游標＋keynote 式字卡」，是 Cursor、Linear、Raycast、Notion 這類設計導向公司的品牌短片格式。片長 **35–90 秒**，不露臉，一句短字卡接一段放大的 UI 操作，結尾是 tagline 加 logo。YC 自己在 2026 年給新創的建議卻是另一套：**露臉、創辦人自己講、音質第一、片長約一分鐘、開場 setup 只佔 10–20%**。兩套各有用處：**Demo Day 申請版**用「品牌短片的畫面＋創辦人旁白」的混合版，**台上備援版**用同一個專案輸出無聲版，靠字卡自己說明。工具上，兩人學生團隊的首選是免費開源的 **Recordly**（$0，macOS 14+）。同一段 take 也拿 **OpenScreen 社群 fork**（$0，MIT，內建本機字幕）錄一次比較。兩個都不行時，學校信箱可領 **Tella Education 6 個月免費 Pro**（無浮水印）；要付錢就買 **Screen Studio 一個月 $29**，比學生年費約 $65 便宜。字卡直接用 pitch deck 的母片做（#f7f7f4 底、#26251e 字、#f54e00 只用一次、Geist＋JetBrains Mono），所以影片和簡報本來就是同一套視覺。下面附 Trend Finder 約 82 秒的逐鏡頭腳本。另外，你們自己的 repo 顯示新搜尋要 **3–4 分鐘**、影片分析約 **1 分鐘**，所以台上備援不是保險而已，是必要的。

> **證據等級說明：** 本報告綜合三份研究筆記（2026-10-27 存取）。標「筆記已核對」的，是研究員當天實際開過來源，影片則看過逐格截圖。標「僅摘要」的只看過搜尋結果片段。標【推論】的是推理，不是有來源的事實。撰寫本報告時沒有再重新打開每個連結，購買前請到連結頁確認價格。Trend Finder 的畫面與耗時引自本 repo 的 `pivots/02-content/app/trend-finder/README.md` 與 `docs/STATUS.md`。

## 建議：Recordly 錄、deck 母片做字卡、一個專案輸出兩個檔

### 工具組合（全部 $0 的路線）

| 用途 | 首選 | 備案 | 費用 |
|---|---|---|---|
| 錄影＋自動放大＋平滑游標＋背景 | **Recordly**（[GitHub](https://github.com/webadderall/Recordly)） | **OpenScreen 社群 fork**（[GitHub](https://github.com/getopenscreen/openscreen)）；再不行用 **Tella Education**（[條款](https://www.tella.com/for-education)） | $0 |
| 字卡 | pitch deck 本身的母片，輸出 1920×1080 PNG；或 **Keynote** File > Export To > Movie（[Elephorm](https://www.elephorm.com/formation/maitriser-keynote-2026/exporter-un-diaporama-keynote-en-video-guide-etape-par-etape)） | **Canva Free**，只用免費素材就無浮水印（[Canva help](https://www.canva.com/en_gb/help/download-video-as-separate-files/)） | $0 |
| 剪接（字卡＋片段＋旁白） | iMovie 或 Keynote（【推論】筆記沒研究剪接軟體） | DaVinci Resolve / CapCut（未研究） | $0 |
| 音樂（只用在申請版） | YouTube Audio Library，篩 "no attribution required"（[YouTube Help](https://support.google.com/youtube/answer/3376882)） | 不放音樂 | $0 |
| 付費退路 | **Screen Studio 單月 $29**（[screen.studio](https://screen.studio)） | Cap Desktop 一次買斷 $58（[cap.so/pricing](https://cap.so/pricing)） | $29–58 |

> **證據**：Recordly 的 README 列出依游標活動自動建議放大、手動放大區段、重繪游標（平滑、motion blur、點擊彈跳）、桌布/漸層/自訂圖片背景、padding、圓角、陰影、MP4/GIF 輸出，需要 macOS 14+，授權 AGPL-3.0（[GitHub](https://github.com/webadderall/Recordly)，筆記已核對）。OpenScreen fork 有自動/手動放大、游標 motion blur、**本機字幕且逐字稿可編輯**、背景、裁切、輸出 MP4/GIF，需要 macOS 13+，1.9.0 起有簽章公證（[GitHub](https://github.com/getopenscreen/openscreen)，筆記已核對）。Screen Studio 現在只賣訂閱：年繳 $9/月或月繳 $29，新買家不能一次買斷，學生 40% off（[screen.studio](https://screen.studio)，筆記已核對；`/pricing` 頁 404，數字來自首頁）。
> **推理**：Recordly 的效果清單最接近 Screen Studio，又不用帳號、不用付錢。專案只剩約 11 天（今天 10/27，Demo Day 11/7），年費方案多半用不到。Screen Studio 單月 $29 比學生年費（$108×0.6≈$65，【推論】）便宜。學生折扣能不能套在月繳上，筆記沒查到。
> **弱點**：Recordly 2026 年 3 月才推出，GitHub 星數在不同來源差很多（35.3k 對 13k+），也沒有任何獨立的畫質比較。兩人的 Mac 都要先確認是 macOS 14 以上。Recordly 的 README 沒提到字幕和字卡，所以字幕要靠 OpenScreen 或剪接軟體。Cap 免費版明寫只限 "personal use"，新創 demo 大概算商業用途（這是對方案文字的解讀，不是法律意見），所以沒列為首選。

### Trend Finder 逐鏡頭腳本（約 82 秒）

畫面上的字卡用英文（觀眾與評審在雪梨）。旁白欄是**申請版**用的。台上版把旁白拿掉，只靠字卡和畫面。時間點是【推論】：依「每 2–3 個字讀 1 秒、字卡不超過 5 秒」的閱讀速度經驗法則（[Biteable](https://biteable.com/blog/video-word-count/)、[SSW](https://www.ssw.com.au/rules/post-production-do-you-give-enough-time-to-read-texts-in-your-videos)，僅摘要）和 YC「前 3 秒決定滑不滑走」推算。

| # | 時間 | 類型 | 畫面 | 字卡文字／放大目標 | 申請版旁白（約 150 字） |
|---|---|---|---|---|---|
| 1 | 0:00–0:04 | 字卡（鉤子） | cream 底，大字 Geist，數字用橘色 | "1,000 followers. **1,000,000** views. Why?" 左上角 mono 小標 `TREND FINDER` | "Hi, we're Tommy and Veralyn." |
| 2 | 0:04–0:08 | 字卡（問題） | 同上，無強調色 | "Agencies scroll for hours. Clients still say no." | "Social media agencies spend hours hunting for one video idea their client will actually approve." |
| 3 | 0:08–0:19 | App | Search 畫面打字 "tofu recipes for busy students" → Results（用快取，瞬間出現） | 放大到 "Searching for" chips | "With Trend Finder, you type a niche in plain English. We pull recent TikTok and Instagram videos…" |
| 4 | 0:19–0:22 | 字卡 | mono 小標 `01 / OUTLIER SCORE` | "Ranked by outlier score, not views." | "…and rank them by outlier score: views against the account's usual views." |
| 5 | 0:22–0:34 | App | Results 欄位依 outlier score 排序 → "Formats that repeat" 條 | 先放大第一名的分數徽章，再放大 Early / Rising 標籤 | "So a small account with a huge hit jumps to the top, and formats that repeat get flagged early." |
| 6 | 0:34–0:37 | 字卡 | `02 / WHY IT WORKED` | "See why it went viral." | （停頓） |
| 7 | 0:37–0:50 | App | 開 Video breakdown 抽屜：五項指標 → why it worked → "Can this client film it?" | 依序放大三個區塊，每個停 1–2 秒讓結果出現 | "Open any video to see why it worked: the hook, the pacing, the sound, and whether this client can actually film it." |
| 8 | 0:50–0:53 | 字卡 | `03 / SHOT LIST` | "Turn it into a shot list." | "One click turns it into a recreate plan…" |
| 9 | 0:53–1:04 | App | Save to client → Recreate plan（shot list、props、editor notes） | 放大 shot list 的前三列 | "…shots, props, editor notes, due date." |
| 10 | 1:04–1:11 | App | 客戶手機版畫面：Annie 按 Approve → Overview 的 approved vs monthly target | 放大 Approve 按鈕，再拉遠看到進度數字 | "The client approves it from their phone, and the agency tracks every approved video against the monthly target." |
| 11 | 1:11–1:16 | 字卡（證據） | 無強調色 | "Built with Mercif, an agency running 10+ clients." | "We're building it with Mercif, an agency running more than ten clients." |
| 12 | 1:16–1:22 | 結尾卡 | 字標 "Trend Finder" + 橘色 tagline | "From viral video to approved shot list." 下方 mono：網址 / `PROJECT SOCIETY DEMO DAY · 7 NOV 2026` | "Trend Finder. From viral video to approved shot list." |

> **證據**：品牌短片的節奏是「一句短字卡 → 放大的 UI 片段」重複 3–5 次，例如 Cursor 2.0 的 "Run a task across multiple models." 等卡片（[YouTube](https://www.youtube.com/watch?v=An8IM-kPyms)，筆記已逐格核對）。Raycast 用 mono 小標卡 "NEW / LAUNCHER DESIGN"（[YouTube](https://www.youtube.com/watch?v=Mi173xGb0ZA)，筆記已核對）。Farza Majeed 在 YC Startup School 說一分鐘影片的 setup "should only be like 10, 20%"，前 10 秒要講清楚 "what you're doing, why it's important, let's get into it"（[YC Library](https://www.ycombinator.com/library/fY-this-is-how-you-should-actually-make-launch-videos)，筆記已核對）。鉤子用 Daphne 的 "1-to-10" 規則：1,000 粉絲的帳號拿到 100 萬觀看，代表點子好（本 repo `PROJECT_CONTEXT.md`）。畫面名稱取自 Trend Finder README。
> **推理**：腳本裡 setup（第 1–2 鏡）佔 8 秒，約 10%，符合 Farza 的比例。字卡共約 25 秒，App 片段約 57 秒，產品畫面佔多數。三張編號字卡（01/02/03）對應產品的三步，就是 Raycast 式 mono 標籤加 Cursor 2.0 式的淺色字卡。旁白約 150 字跑 82 秒，約 110 wpm，落在研究筆記建議的 110–170 字預算內，字卡和停頓也有留空間。
> **弱點**：第 11 鏡點名 Mercif，要先取得 Daphne 同意。第 1 鏡的數字是 Daphne 規則的示意，不是某支真實影片。畫面上用真實 TikTok 創作者的影片和名字，可能有肖像和版權疑慮，sample data 比較安全，但說服力也比較低，這個取捨要你們自己決定。sample 裡的 "MYST Nightclub Sydney" 如果是真實店家，錄影前要換掉或取得同意（【推論】，未查證）。Project Society 申請表的長度和格式限制，本研究沒有查到。

### 一個專案、兩個輸出

**A. 申請版（YouTube unlisted 或上傳檔）**：字卡＋放大片段＋創辦人旁白＋燒進畫面的字幕，音樂比人聲低 18–25 dB 或乾脆不放。可以在第 1 鏡前加 3–5 秒兩人露臉說 "Hi, we're Tommy and Veralyn"。**B. 台上備援版**：同一條時間軸，拿掉旁白和音樂；字卡停留時間各加約 1 秒，因為台下的人離螢幕遠；開頭加一格靜止畫面，結尾停在最後一格。存成本機 MP4，筆電一份、USB 一份，不要從 YouTube 串流。兩版都輸出 MP4、H.264、1080p、30 fps、8 Mbps、AAC 48 kHz（[YouTube Help](https://support.google.com/youtube/answer/1722171)，筆記已核對），縮圖 1280×720、小於 2 MB（[YouTube Help](https://support.google.com/youtube/answer/72431)）。

> **證據**：預錄一支 backup demo 是常見建議（[Arcade live demos guide](https://www.arcade.software/post/live-demos-guide)，筆記已核對；[Reskilll](https://blogs.reskilll.com/hackathon-demo-presentation-tips-pitch-3-minutes-win-2026/)，僅摘要）。燒進畫面的字幕在每個平台都會顯示，關不掉（[AutoCaption](https://autocaption.io/blog/open-captions-vs-closed-captions)，廠商部落格）。本 repo 的 README 寫明新的 TikTok 搜尋要 3–4 分鐘，`docs/STATUS.md` 寫明 `/api/analyze` 約 1 分鐘、首次約 US$0.08。
> **推理**：台上 demo 時間通常以分鐘計，等 3–4 分鐘的 API 不可行，所以現場 demo 也只能用快取過的搜尋。網路或 Apify 一出問題就要切到 B 版。兩個版本共用一條時間軸，改一處兩邊都會同步。
> **弱點**：「無聲循環播放」怎麼放在 Keynote/投影軟體裡、投影時字幕要多大，筆記都沒有來源，上述做法是【推論】，一定要在現場設備實測。

## 這種影片的樣貌：35–90 秒、不露臉、字卡與放大畫面交替

研究員逐格看過的品牌短片，結構幾乎一樣：開場是 logo 或一句宣言，接著 3–5 個功能段落，每段先出一張 3–6 字的字卡，再出放大到那個操作的 UI 錄影，最後是 tagline 加 logo。**Cursor 2.0（1:04）**最接近你們要的樣子：淺色背景，開頭是 "2.0" logo 卡與 benchmark 圖，然後字卡與放大 UI 交替，約 946 萬觀看（[YouTube](https://www.youtube.com/watch?v=An8IM-kPyms)）。**Linear Agent（0:55）**一開場就是 App，3D 傾斜視角的鏡頭飄進輸入框，最後約 8 秒是字標、"Linear. At your command."、logo（[YouTube](https://www.youtube.com/watch?v=mRql2VJ99gM)）。**Raycast "New Raycast. Coming 2026"（0:39）**用 UI 局部極近特寫配 mono 標籤卡（[YouTube](https://www.youtube.com/watch?v=Mi173xGb0ZA)）。**Notion 3.0（1:30）**用游標操作加打字提示加字幕卡（[YouTube](https://www.youtube.com/watch?v=R1cF4T4lgI4)）。**Lovable 2.0（1:20）**比較偏動態排版與裝置 mockup（[YouTube](https://www.youtube.com/watch?v=xDwR1_vrIg8)）。YC 批次新創則多半走另一條路：**Cardboard（YC W26，1:01）**用實拍開場講問題、約 20 秒時 "Introducing Cardboard"、旁白加黃色逐字字幕、結尾 logo 加網址（[YouTube](https://www.youtube.com/watch?v=wUshe13d2aw)）。

### 值得研究的範例（依對你們的參考價值排序）

| 優先 | 影片 | 長度 | 學什麼 | 核對狀態 |
|---|---|---|---|---|
| 1 | [Introducing Cursor 2.0](https://www.youtube.com/watch?v=An8IM-kPyms) | 1:04 | 淺色字卡＋放大 UI 交替，和你們 Cursor 風格的 deck 最接近 | 筆記已逐格核對 |
| 2 | [Cardboard Launch (YC W26)](https://www.youtube.com/watch?v=wUshe13d2aw) | 1:01 | 學生/早期團隊做得到的「問題 → Introducing → demo → 網址」結構，有旁白與字幕 | 筆記已逐格核對＋逐字稿 |
| 3 | [Introducing Linear Agent](https://www.youtube.com/watch?v=mRql2VJ99gM) | 0:55 | 一開場就是產品在動；結尾三段式（字標、tagline、logo） | 筆記已逐格核對 |
| 4 | [New Raycast. Coming 2026](https://www.youtube.com/watch?v=Mi173xGb0ZA) | 0:39 | mono 小標卡（對應你們的 JetBrains Mono） | 筆記已逐格核對 |
| 5 | [Introducing Notion 3.0: Agents](https://www.youtube.com/watch?v=R1cF4T4lgI4) | 1:30 | 只有音樂、靠字卡說話的版本（=台上版的參考） | 逐格＋字幕檔只有 "[Music]" |
| 6 | [Hey Clicky: screen-aware dictation](https://www.youtube.com/watch?v=km54y7Xd_7g) | 2:00 | 創辦人隨性但有稿的旁白，YC 演講引用的例子 | 僅逐字稿開頭；是否露臉未確認 |
| 7 | [Introducing Cursor 3](https://www.youtube.com/watch?v=UxbULt_hCdA) | 1:30 | 反例：同一家公司 2026 年改成兩人入鏡對談 | 筆記已逐格核對 |
| 8 | [YC: This is how you should actually make launch videos](https://www.youtube.com/watch?v=v12aSIZIXUs) | 47 min | 第 08:34 "did my eyes stop" 測試、37:07 "Beats, not cuts"、40:49 音質 | 逐字稿已核對（[YC Library](https://www.ycombinator.com/library/fY-this-is-how-you-should-actually-make-launch-videos)） |

> **證據**：上表的連結都經 YouTube oEmbed 核對過標題與頻道，第 1–5、7 支有研究員自己做的逐格截圖。Arc 1.0（[YouTube](https://www.youtube.com/watch?v=n5Vwrj1gEWs)）幾乎沒有產品畫面，對 demo 參考價值低。
> **推理**：研究員看過的品牌短片長度落在 33–90 秒，加上 YC 建議的一分鐘，所以 75–85 秒是合理上限。
> **弱點**：研究員**沒有聽音軌**。Cursor 2.0、Linear、Raycast「只有音樂」的判斷，是從沒產生自動字幕推論的，只有 Notion 有字幕檔佐證。Supabase、Cal.com、Granola 沒找到同風格的 2023–2026 影片。觀看數會變動。

## 讓它有效的三條規則：3 秒鉤子、一卡一功能、放大要拍到結果

第一條是**鉤子在前 3 秒**。Farza 的 "Did my eyes stop?" 測試是：問自己會不會停在第一句話或第一格畫面上，因為 "Most people when they're scrolling see the first three seconds"。他的做法是刻意放大一個很小的 UI 元素並讓它動，抓住視線（[YC Library](https://www.ycombinator.com/library/fY-this-is-how-you-should-actually-make-launch-videos)）。賣影片製作服務的工作室 Flowjam 的說法類似："show the product early, no logo card, no manifesto"（[Flowjam](https://www.flowjam.com/blog/yc-launch-video-example-copy-this-script-2026)，廠商自家資料，未經驗證）。所以腳本第 1 鏡用的是一個問題，不是 logo。

第二條是**一卡一功能，故事一直往前走**。Farza 說 "Beats, not cuts"，他要的是 "keep the story moving"，不是硬留住注意力（同上來源）。Stackmatix 建議一支影片只完成一件工作，問題要在前 5 秒出現，結尾停在成果上而不是 logo（[Stackmatix](https://www.stackmatix.com/blog/product-demo-video-for-startups)，2026-09）。Trend Finder 的「一件工作」就是「從爆紅影片到客戶核准的 shot list」，所以腳本只走 Search → Results → Breakdown → Plan → Approve 這一條線，Tracking、Client settings 都不放。

第三條是**放大是為了看清楚，不是裝飾**。Screen Studio 的自動放大跟著點擊位置走，沒點擊的地方就不會放大，要手動補（[Screen Studio](https://screen.studio/create/product-demo-videos)）。第三方評測說：放大一顆按鈕卻沒拍到按下去的結果，就是裝飾；先用自動放大，再逐一對齊旁白（[NemoVideo](https://www.nemovideo.com/blog/ai-video-workflows/screen-studio-review)，僅摘要）。錄影建議是重要變化之後停一下讓觀眾看到結果，畫面還沒載完不要先點下一步（[MacMyths](https://macmyths.com/how-to-record-your-website-for-a-demo/)，2026-09）。

> **證據**：如上各來源。字數預算方面，旁白每分鐘約 140–150 字（[Consensus](https://goconsensus.com/blog/product-video-scripts-get-better-with-3-constraints)）。Wistia 分析 1,300 萬支影片，一分鐘以下的影片平均參與度約 52%，大多數觀眾在影片一半左右離開（[Wistia](https://wistia.com/blog/optimal-video-length)）。
> **推理**：觀眾大多在一半離開，所以最有說服力的畫面（Breakdown 的 "why it worked"）要排在 40 秒以前出現，腳本放在 0:37。只有等待（載入、打字）可以加速 2–4 倍，游標移動本身要維持原速；每 10 秒的片段最多放大兩次（【推論】，沒有來源給數字）。
> **弱點**：Wistia 的資料是一般行銷影片，不是 Demo Day 評審情境。「前 3 秒」是社群平台的滑動行為，評審通常會看完整支，所以鉤子對申請版的重要性可能比對社群版低。

## 旁白還是純音樂：申請版要人聲，台上版要靜音

這是兩派建議真正衝突的地方。**YC 2026 的建議**很明確：要讓人知道 "Who is the person making this thing? ... Show your face very clearly"，開場要 "a very clear, hi, this is what I'm working on"，而且 "The most important thing in any video you make ... is audio quality. If your audio is bad, I'm bouncing"。他甚至說一支自己打招呼介紹產品的影片 "is probably gonna perform way better than like a twenty thousand dollar produced video"（[YC Library](https://www.ycombinator.com/library/fY-this-is-how-you-should-actually-make-launch-videos)）。**品牌短片派**（Cursor 2.0、Linear、Raycast、Notion）則是不露臉、不旁白、靠字卡和音樂。連 Cursor 自己在 2026 年的 Cursor 3 都改成兩個人入鏡對談（[YouTube](https://www.youtube.com/watch?v=UxbULt_hCdA)）。

**申請版選混合版**：品牌短片的畫面語言（deck 字卡＋自動放大），加上創辦人自己的旁白，可以在開頭加 3–5 秒露臉。理由是評審不認識你們。Cursor 和 Linear 能只放音樂，是因為觀眾早就知道他們是誰；一個沒人聽過的學生團隊，人聲是建立信任最便宜的方法，這也是 Farza 論點的核心。**台上版選純畫面**：台上已經有一個活生生的講者，影片再有旁白就會和講者搶話。YC 2016 年的 Demo Day 指南甚至把 "Including a video" 列為常見錯誤，因為投資人 "want to see you perform live"（[YC Blog](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/)）。所以備援影片只在現場出問題時才播，由講者現場口述，影片只負責畫面。這時 Notion 3.0 那種「字卡自己會說話」的設計正好派上用場。

> **證據**：如上引文，均為筆記已核對的一手來源。YC 對自家申請影片另有規定："nothing except the founders talking"、"not the place to submit a demo or promotional video"（[YC: The Application Video](https://www.ycombinator.com/video)）。
> **推理**：如果 Project Society 的申請表**另外**要一支創辦人自我介紹影片，那是另一個檔案，不要拿 demo 充數。如果只要一支 demo，混合版就同時滿足「看得到人」和「看得到產品」。【推論】
> **弱點**：Farza 的建議針對社群平台上的 launch video，證據是他個人的經驗（例如一支片在 Twitter 約 300 萬觀看），不是針對比賽申請，也不是對照實驗。YC 2016 那篇是針對現場簡報、時間也舊。Project Society Demo Day 的評分標準和影片規格，本研究**完全沒有查到**，送件前務必先讀申請表。旁白用自己聲音或 AI 聲音，目前沒有正面比較的研究；Arcade 的資料顯示 AI 旁白和完成率高 14% 有相關，但那是互動式 demo，且只是相關（[Arcade 2026](https://www.arcade.software/post/2026-arcade-benchmarks)）。

## Mac 工具價格一覽：免費的已經夠，付費的買一個月就好

| 工具 | 平台 | 價格（2026-10-27 所見，USD） | 免費/試用 | 學生 | 對你們的判斷 |
|---|---|---|---|---|---|
| **Recordly** | Mac/Win/Linux，macOS 14+ | $0（AGPL-3.0） | 全免費 | — | **首選** |
| **OpenScreen fork** | macOS 13+ | $0（MIT） | 全免費；原版已封存，別用原版 | — | **並行測試**，字幕強 |
| **Tella** | Web＋Mac app | Pro $13/人/月（年繳） | 沒有免費方案；7 天試用 | **6 個月 Pro 免費**，之後 5 折，要學校信箱 | $0 備案；任何方案都無浮水印 |
| **Screen Studio** | 只支援 Mac | 年繳 $9/月，月繳 $29 | 官方頁沒提試用 | 40% off | 付費退路，買一個月 |
| **Cap** | Mac/Win | 免費版只限個人使用；Desktop $29/年或 **$58 買斷** | 分享連結上限 5 分鐘 | 30% off | 商用要付費 |
| **FocuSee** | Mac/Win | $49.99/年 | 試用只能輸出一次 | 30% off | 可以，但不省錢 |
| **ScreenFlow** | Mac | 起價 $199 | 試用版輸出有浮水印 | — | 沒有自動放大 |
| **Loom** | Web | 免費 720p | 5 分鐘 | — | 沒有自動放大，不合用 |
| **Arcade** | Web | Pro $49/月（年繳） | 免費版**最長 30 秒**、有浮水印 | — | 做不了 90 秒 |
| **Rapidemo** | **只支援 Windows** | — | — | — | 排除 |

來源：[screen.studio](https://screen.studio)、[cap.so/pricing](https://cap.so/pricing)、[Recordly](https://github.com/webadderall/Recordly)、[OpenScreen fork](https://github.com/getopenscreen/openscreen)、[OpenScreen 原版（封存）](https://github.com/siddharthvaddem/openscreen)、[Tella pricing](https://www.tella.com/pricing)、[Tella 無浮水印/無免費方案](https://help.tella.com/docs/help/faq/tella-branding-on-videos.md)、[Tella education](https://www.tella.com/for-education)、[FocuSee](https://focusee.imobie.com/pricing.htm)、[ScreenFlow](https://www.telestream.net/screenflow/overview.htm)、[Loom](https://www.loom.com/pricing)、[Arcade](https://www.arcade.software/pricing)、[Rapidemo](https://getrapidemo.com)，皆為官方頁、筆記已核對。

> **證據**：如上表。Farza 在 YC 說 Screen Studio "costs like 30 bucks"（[YC Library](https://www.ycombinator.com/library/fY-this-is-how-you-should-actually-make-launch-videos)），這和現在官網的「只賣訂閱」不同。
> **推理**：Farza 的價格是舊的一次買斷價，引用 YC 演講時別當成現價。一個人負責錄和剪就好，所以只需要一個授權。Tella 的教育方案每個符合資格的人在每個 workspace 可領一次，兩人都有學校信箱就等於免費（【推論】，依條款文字）。
> **弱點**：Screen Studio、Cap、FocuSee 的試用或免費輸出有沒有浮水印，官方頁沒寫。Tella 的「自動放大」只有 Tella 自己的比較文章這麼說（[Tella blog](https://www.tella.com/blog/best-screen-recorders-with-automatic-zooms-and-hosted-sharing)，廠商自評）。免費工具和 Screen Studio 的畫質沒有任何獨立比較，Reddit/X 上的第一手評價也沒抓到。

### 讓字卡和 deck 長得一樣的做法

字卡直接在 pitch deck 的母片上做成投影片，輸出 1920×1080 PNG。如果 deck 是 HTML，就在瀏覽器把視窗設成 1920×1080 截圖。版面建議：底色 #f7f7f4，主標 Geist、字色 #26251e，每張卡**只有一個** #f54e00 的字或數字，左上角放 JetBrains Mono 大寫小標（例如 `02 / WHY IT WORKED`），字數控制在 6 字以內。錄影時把 Recordly 的背景設成一張純 #f7f7f4 的圖，加 padding、圓角、淡陰影，這樣從字卡硬切到 App 畫面時，底色是連續的。最後從錄影裡挑 2–3 格當 deck 的產品頁截圖，兩邊就會完全一致。

> **證據**：Recordly 支援自訂圖片背景、padding、圓角、陰影（[GitHub](https://github.com/webadderall/Recordly)）。Screen Studio 和 Tella 也有自訂背景（[Screen Studio](https://screen.studio/create/product-demo-videos)）。Cursor 2.0 本身就是淺底字卡配 UI 的範例。
> **推理**：同一套 token、同一個母片，就不用另外維護一套影片設計。這整段是【推論】，筆記找不到任何團隊公開過「deck 與影片共用視覺系統」的實際流程。
> **弱點**：Geist 和 JetBrains Mono 是否已裝在剪接用的 Mac 上要先確認，Keynote 匯出時缺字型會被替換。另外有一則廠商說法提到投影片字級約 60 pt（[Flowjam](https://www.flowjam.com/blog/yc-style-launch-video-demo-day-ready-2026)，未驗證是否為 YC 規則）。

### 錄影前的準備（照順序做）

先寫稿：一句承諾、一件工作、4–6 個 App 步驟、一個 CTA，字卡和旁白一起寫，字卡不要逐字重複旁白（【推論】）。App 用 demo 帳號和假資料，每一 take 前都重設到同一狀態，從第一個畫面開始；用乾淨的 Chrome profile、隱藏書籤列（Cmd+Shift+B）、開勿擾模式；每次都用同一個錄影尺寸（[Supademo](https://supademo.com/academy/create-your-demo/recording-best-practices)、[MacMyths](https://macmyths.com/how-to-record-your-website-for-a-demo/)）。固定 16:9 區域，瀏覽器縮放 125–150%，讓文字在 1080p 和手機上都讀得到（【推論】，沒有來源給數字）。每個步驟各錄一段，游標慢慢移、結果出現後停 1–2 秒，點錯就重錄，不要靠剪接救。搜尋一定要用**已經快取**的關鍵字（例如 tofu），否則一次要等 3–4 分鐘。旁白每一鏡分開錄，用手機或耳機麥克風，在衣櫃或棉被裡、離嘴 15–20 cm；響度做到 −16 到 −14 LUFS、true peak −1 dB（[Wikipedia: Audio normalization](https://en.wikipedia.org/wiki/Audio_normalization)，僅摘要）。音樂要比人聲低 18–25 dB（[Vidpros](https://vidpros.com/fix-background-music-too-loud-video/)，實務建議）。

時程上（【推論】）：MVP 11/2 才交給 Daphne，UI 在那之前還會變。如果申請截止早於 11/2，先用現在的 prototype 錄 v0 送件；11/3–11/4 用穩定版重錄，11/5 在場地設備上試播 B 版。

## 結論

這份研究改變的判斷是：你們要的「YC 風格」其實是兩種風格疊在一起。一種是**品牌公司的畫面語言**（Cursor、Linear），一種是 **YC 對新創的溝通方式**（露臉、人聲、真實勝過精緻）。它們不需要二選一，可以按用途拆開：畫面語言兩版共用，人聲只放在申請版。這個拆法也把「台上備援」從額外工作變成同一個專案多輸出一個檔。

第二個收穫是，做出這種質感的門檻已經降到 $0。開源的 Recordly 和 OpenScreen 在 2026 年把 Screen Studio 的核心效果做出來了，Screen Studio 自己反而改成訂閱制，YC 演講裡那句 "like 30 bucks" 已經過時。真正的瓶頸不在工具，在三件工具幫不上的事：產品動作夠不夠快能錄（快取搜尋）、旁白音質、還有 Project Society 申請表到底要什麼。最後這一項本研究沒有查到，應該第一個去確認。
