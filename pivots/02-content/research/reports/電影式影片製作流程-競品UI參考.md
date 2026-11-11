# 電影式影片製作流程：競品 UI 參考

> 研究日期：2026-11-02（雪梨）。範圍：把「腳本 → 分鏡 → 拍攝 → 剪輯 → 字幕調色 → 審核 → 發佈」做成片場式流程的 app，看 Remake 可以借哪些 UI。
> 共 30 個 app、88 張官方截圖。看圖版（HTML，可點圖放大）：`/private/tmp/claude-501/-Users-tommy-orca-workspaces-BuildClub-blenny/a1d86def-d500-4bc7-b376-98b55469d18d/scratchpad/film-ui/index.html`，圖片在同目錄 `img/`。
> 標記：**[來源]** = 有官方頁面或官方影片佐證（附網址）；**[推論]** = 我們的判斷。所有截圖僅供內部參考。

## 結論：最值得借的 8 個 UI 模式

排序依對 Remake 的影響 [推論]。每條寫出會被改到的 Remake 畫面、依據、以及建議做法。

### P1. 每顆鏡頭都有自己的狀態點，主管逐鏡核可
- **改善畫面**：鏡頭規劃卡 + 主管審核連結
- **看到什麼** [來源，見各 app 小節網址]：Boords 在每格分鏡角落放一個彩色圓點（In Progress / Approved / Review Needed），頂部再有「v2 · In review」整份狀態。Krock 的審核畫面在每格上方有 Approve / Reject。核可的單位是「一顆鏡頭」，不是整支片。
- **Remake 怎麼做** [推論]：鏡頭卡右上角一個狀態點（待審 / 要修改 / 已核可）。免登入審核連結上，主管對每一鏡按「核可」或「要修改＋一句話」。全部鏡頭核可後，看板自動把這支片推到「拍攝」。
- **出處 app**：Boords、Krock.io、Frame.io（Status 欄位）；代表圖 `img/boords-frame-status.jpg`

### P2. 鏡頭卡用固定版型：編號、畫格、景別、一句話
- **改善畫面**：鏡頭規劃卡（分鏡）
- **看到什麼** [來源，見各 app 小節網址]：Celtx、Saga、StudioBinder、Filmustage 的分鏡卡都長一樣：「1.3」或「Scene 1 Shot 1」編號、畫格、景別下拉（ECU / MS / CU）、一行描述。Boords 和 StudioBinder 可以把同一份資料切成表格；Yamdu 的 AV Script 是左「畫面」右「聲音」雙欄。
- **Remake 怎麼做** [推論]：卡片固定順序：編號 → AI 分鏡圖 → 景別下拉（特寫 / 中景 / 全景）→ 台詞 → 目的 → 秒數。旁邊加「卡片 / 表格」切換，表格用 AV 雙欄（畫面與目的｜台詞與字幕），給經理一眼掃完整支片。
- **出處 app**：Celtx、Saga、StudioBinder、Filmustage、Boords、Yamdu；代表圖 `img/celtx-storyboard-sequences.jpg`

### P3. 看板卡片 = 縮圖 + 階段 + 狀態膠囊 + 審閱進度
- **改善畫面**：六步驟製作看板
- **看到什麼** [來源，見各 app 小節網址]：Krock 每張卡寫階段名（Principal photography、Final Cut）和一個狀態膠囊。Wipster 卡底是「0/4 審閱人 · 12 則留言 · Awaiting Review」。Ziflow 用一排小方塊表示走到第幾關。Assemble 另有「階段 × 日期」的時間軸檢視。
- **Remake 怎麼做** [推論]：每支影片一張直式卡：封面、客戶名、狀態膠囊、留言數、截止日；卡底 6 個小方塊對應 選題 → 腳本 → 分鏡 → 拍攝 → 剪輯 → 發佈，走過的填色。另做時間軸檢視，用來排拍攝日。
- **出處 app**：Krock.io、Wipster、Ziflow、Assemble、Frame.io；代表圖 `img/krock-status-grid.jpg`

### P4. 審核連結的標準版面：影片、時間碼留言、一顆核可鍵
- **改善畫面**：免登入審核連結 / 最終核可頁
- **看到什麼** [來源，見各 app 小節網址]：Frame.io、Wipster、VEED、Kapwing、Descript 收斂到同一個版面：影片在左，右側留言自動帶時間碼，時間軸上用頭像點標出留言位置，畫面可圈選。Wipster 有一顆綠色「Finish Review」，Frame.io 把新版本疊在同一張卡上（v4）。
- **Remake 怎麼做** [推論]：手機上影片在上、留言在下；留言自動帶時間碼並可點回該秒。頂部只放兩顆鍵：主鍵「核可」、次鍵「要修改」。新版本疊在同一個連結（v1 → v2），可左右對照上一版。
- **出處 app**：Frame.io、Wipster、VEED、Kapwing、Descript、Assemble、Filestage；代表圖 `img/frameio-comments-annotate.jpg`

### P5. 核可要留紀錄，核可後自動進下一步
- **改善畫面**：最終核可 → 發佈
- **看到什麼** [來源，見各 app 小節網址]：Planable 的活動紀錄寫「Nora approved this post · just now」，功能頁寫「Have posts automatically scheduled once they get the green light」。Filestage 有「Approved by」名單與多關卡矩陣；Ziflow 讓上一關的決定觸發下一關。
- **Remake 怎麼做** [推論]：免登入核可時請對方填名字，記下「誰、何時、哪一版」。經理核可後才自動把連結寄給客戶；客戶核可後自動排入發佈並鎖住成片。這也是 Remake 的差異點：Planable 的公開連結只能看和留言，不能核可。
- **出處 app**：Planable、Filestage、Ziflow；代表圖 `img/planable-activity-approved.jpg`

### P6. AI 分鏡設定用片場詞彙的膠囊，一次給 4 張候選
- **改善畫面**：AI 分鏡圖 + 色盤
- **看到什麼** [來源，見各 app 小節網址]：Higgsfield Cinema Studio 的生成面板上排是 Film setup、Camera、Color palette、Lighting 四個膠囊（預設 Auto），Generate 鍵上直接寫要花多少點數。Saga 的 Create Shot 一次給 4 張候選圖。LTX Studio 讓角色和產品上傳一次，之後每格沿用。
- **Remake 怎麼做** [推論]：鏡頭卡的「生成分鏡圖」旁放 景別 / 運鏡 / 色盤 / 打光 四個膠囊，預設自動。一次出 4 張讓人挑。客戶的產品、門市、出鏡人做成可重用的 @元素，所有鏡頭共用。
- **出處 app**：Higgsfield、Saga、LTX Studio、Runway、Filmustage；代表圖 `img/higgsfield-cinema-studio-controls.jpg`

### P7. 自動剪輯要看得懂：逐字稿、開關列、一句話回報
- **改善畫面**：自動剪輯頁（whisper）
- **看到什麼** [來源，見各 app 小節網址]：Descript 把口頭禪標亮、刪字就剪片。VEED 有 Delete Silences（長 / 中 / 短）和 Delete Filler Words 開關。Submagic 把每個自動步驟做成一列開關。Captions 的時間軸用人話標出 AI 加了什麼。Descript 的 Underlord 剪完會用一句話說明做了哪些事。
- **Remake 怎麼做** [推論]：whisper 結果直接變成可刪字的逐字稿，口頭禪標亮可一鍵刪。自動剪輯參數做成一列開關（刪靜音、刪口頭禪、自動放大、B-roll）。剪完用一句話回報：「刪了 6 段停頓，總長 58 秒 → 41 秒」。
- **出處 app**：Descript、VEED、Submagic、Captions / Mirage、Vizard、InVideo AI；代表圖 `img/descript-transcript-edit.jpg`

### P8. 字幕樣式用這支片的台詞預覽，並疊上平台安全區
- **改善畫面**：字幕 / 調色預設 + 發佈前檢查
- **看到什麼** [來源，見各 app 小節網址]：Kapwing 的 Safe Zones 會在畫面上疊出 TikTok、Instagram、YouTube 按鈕的遮擋區。VEED 和 CapCut 的字幕樣式卡直接用實際台詞顯示效果。Opus Clip 的 Brand kit 把 logo、字幕樣式、版面存成每個品牌一組。
- **Remake 怎麼做** [推論]：字幕樣式卡用這支片的第一句台詞預覽。預覽框可切換 TikTok / IG / YouTube 遮擋區，字幕被蓋住就提醒。每個客戶存一組品牌預設（字幕樣式、調色 preset、logo），新片自動套用。
- **出處 app**：Kapwing、VEED、CapCut、Opus Clip、Pictory；代表圖 `img/kapwing-safe-zones.jpg`

### 對照 Remake 畫面的快速索引 [推論]

| Remake 畫面 | 套用模式 | 最好的參考圖 |
| --- | --- | --- |
| 鏡頭規劃卡（每鏡台詞、目的、AI 分鏡、色盤） | P2、P6、P1 | celtx-storyboard-sequences、boords-frame-status、higgsfield-cinema-studio-controls、yamdu-av-script |
| 製作看板（選題 → 發佈六步） | P3 | krock-status-grid、wipster-status-card、assemble-phase-timeline、ziflow-proof-list-status |
| 主管免登入審核連結 | P1、P4、P5 | boords-review-comments、krock-approve-reject-player、frameio-comments-annotate |
| 逐鏡上傳 takes | P4（版本疊在同一卡） | frameio-version-stack、studiobinder-shotlist |
| 自動剪輯 + 字幕 + 調色 | P7、P8 | descript-transcript-edit、veed-edit-with-script、kapwing-safe-zones、opusclip-brand-kit |
| 最終核可 → 發佈 → 數據 | P5 | planable-activity-approved、opusclip-calendar、opusclip-virality-score、vizard-publish-form |

## App 總表

電影感 1–5 為主觀判斷 [推論]：看有沒有 shot、scene、call sheet、stage、review 這些片場語彙與結構。定價皆讀自官方定價頁，存取 2026-11-02；讀不到就寫「未能確認」。

| App | 類別 | 涵蓋流程 | 電影感 | 定價入口 | 官方定價頁 |
| --- | --- | --- | --- | --- | --- |
| Boords | AI 分鏡 / previs | 腳本、分鏡、animatic、審核 | 4 | Free（5 個 storyboard）；Solo US$39/月（年繳 US$26）；所有付費方案客戶免帳號審核 | https://boords.com/pricing |
| LTX Studio | AI 分鏡 / previs | 腳本、分鏡、AI 生成鏡頭、剪輯時間軸 | 4 | Free（800 一次性點數）；Lite US$15/月（年繳 US$12） | https://ltx.io/studio/pricing |
| Saga | AI 分鏡 / previs | 腳本、分鏡、短 previz | 4 | Basic 免費；Premium US$19.99/月 | https://writeonsaga.com/ |
| Katalist | AI 分鏡 / previs | 腳本匯入、分鏡、AI 影片、變體 | 3 | 未能確認（官網無價目頁，寫「免費點數起步」） | https://www.katalist.ai/ |
| Higgsfield | AI 分鏡 / previs | 分鏡（Popcorn）、AI 生成鏡頭 | 4 | 未能確認（定價頁由 JS 載入） | https://higgsfield.ai/pricing |
| Runway | AI 分鏡 / previs | 分鏡、AI 生成鏡頭、少量剪輯 | 3 | Free（125 點）；Standard US$12/月（年繳） | https://runway.com/pricing |
| Storyboarder (Wonder Unit) | AI 分鏡 / previs | 分鏡 → 匯出到剪輯軟體 | 4 | 免費開源 | https://wonderunit.com/storyboarder/ |
| Autodesk Flow Studio | AI 分鏡 / previs | previs、VFX、動畫 | 5 | Free / Lite US$10/月（第三方報導，官網擋爬蟲未核對） | https://www.autodesk.com/products/flow-studio/compare |
| StudioBinder | 前製管理 | 腳本、分鏡、shot list、call sheet、排程、看板 | 5 | 未能確認（價目頁由 JS 載入；第三方數字互相矛盾） | https://www.studiobinder.com/pricing/ |
| Filmustage | 前製管理 | AI 劇本拆解、分鏡、排程、call sheet | 5 | Free；Director's Cut 月繳 US$49 起 | https://filmustage.com/pricing/ |
| Celtx | 前製管理 | 腳本、分鏡、shot list、排程 | 4 | 有 Free 方案（1 個專案）；付費金額在圖片裡，未能確認 | https://www.celtx.com/pricing/ |
| Assemble | 前製管理 | 專案排程、素材審核、免登入分享、客戶 dashboard | 3 | Starter US$5/人/月；同頁比較表寫 US$20，互相矛盾 | https://www.onassemble.com/pricing |
| Yamdu | 前製管理 | 腳本（AV Script）、AI 拆解、排程、call sheet、預算 | 5 | 未能確認（價目頁動態載入） | https://www.yamdu.com/en/pricing/ |
| Milanote | 前製管理 | 參考、腳本、分鏡 | 2 | Free；個人 US$9.99/月（年繳） | https://milanote.com/plans |
| Frame.io | 審核核可 | 素材上傳、審核、版本、分享 | 5 | Free（2 人、2GB）；Pro US$15/人/月 | https://frame.io/pricing |
| Wipster | 審核核可 | 審核、版本比較 | 3 | Light US$9.95/月（年繳） | https://wipster.io/pricing |
| Krock.io | 審核核可 | 分鏡、animatic、審核、專案排程 | 4 | Free（1 人、2GB、不限審閱人）；Pro US$10/人 | https://krock.io/pricing/ |
| Filestage | 審核核可 | 多關卡審核、版本比較 | 2 | Free（1 個專案）；Starter US$199/月 | https://filestage.io/pricing/ |
| Planable | 審核核可 | 文案、審核、排程發佈、數據 | 1 | Free（50 篇）；Basic US$33/workspace/月 | https://planable.io/pricing/ |
| Ziflow | 審核核可 | 多階段審核 | 1 | Free（2 人、單階段）；Standard US$199/月（年繳） | https://www.ziflow.com/pricing |
| Descript | 短影音剪輯 | 腳本、剪輯、字幕、分享留言 | 2 | Free；Hobbyist US$16 起（月繳 / 年繳未標明） | https://www.descript.com/pricing |
| CapCut | 短影音剪輯 | 剪輯、字幕、調色濾鏡、上傳 TikTok | 1 | Free；Pro AUD 37.99/月（頁面以澳幣顯示） | https://www.capcut.com/pricing |
| Opus Clip | 短影音剪輯 | 自動切片、字幕、調色、排程、數據 | 1 | Free；Starter US$15/月 | https://www.opus.pro/pricing |
| Captions / Mirage | 短影音剪輯 | 腳本、AI 剪輯、字幕 | 2 | Free；Max US$24.99/月（iOS 價格） | https://captions.ai/pricing |
| VEED | 短影音剪輯 | 腳本、剪輯、字幕、分享審閱、發佈 | 1 | 有 Free；付費金額由 JS 載入，未能確認 | https://www.veed.io/pricing |
| Kapwing | 短影音剪輯 | 剪輯、字幕、時間碼留言、分享 | 2 | Free；Pro US$16（月繳或年繳未標明） | https://www.kapwing.com/pricing |
| Submagic | 短影音剪輯 | 剪輯、字幕、排程發佈 | 1 | Starter 月繳 US$19（年繳 US$12/月） | https://www.submagic.co/pricing |
| Vizard | 短影音剪輯 | 切片、逐字稿剪輯、字幕、排程發佈 | 1 | Free（每月 60 credits）；付費金額由 JS 載入，未能確認 | https://vizard.ai/pricing |
| InVideo AI | 短影音剪輯 | 腳本、分鏡、多軌剪輯、字幕 | 4 | Starter 每席月繳 US$20（年繳 US$10/月） | https://invideo.io/pricing |
| Pictory | 短影音剪輯 | 腳本、自動分場景、剪輯、字幕 | 2 | 14 天試用；Starter 月繳 US$29 | https://pictory.ai/pricing |

另有只簡述、未收圖的 app：Krea（Free；Basic US$9/月起，https://www.krea.ai/pricing）、Pika（Free；Starter US$10/月，https://pika.art/pricing）、Previs Pro（2025-09 推出 Previs Pro 3，加入 animatic 與免費層，[來源] https://digitalproduction.com/2025/09/22/animatics-ai-lighting-and-a-free-tier-previs-pro-3-expands-storyboarding-on-ipad/ ；付費價未核對）、Storyboarder.ai（仍活躍，但只有行銷合成圖）。三者電影感約 1–4 [推論]，偏素材生成，與製作管理距離較遠。

## 各 App 筆記

### AI 分鏡 / previs

#### Boords
- **定位** [來源]：給廣告與代理商的線上分鏡、animatic 與客戶審核工具，近年加入 AI 分鏡生成。這組裡最貼近 Remake。
- **涵蓋流程**：腳本、分鏡、animatic、審核
- **電影感** [推論]：4/5
- **定價入口** [來源 https://boords.com/pricing，accessed 2026-11-02]：Free（5 個 storyboard）；Solo US$39/月（年繳 US$26）；所有付費方案客戶免帳號審核
- **可借** [推論]：
  - 分鏡格角落狀態點 + 頂部版本與「In review」膠囊 → 鏡頭規劃卡
  - Share 對話框（review link、passphrase、允許留言、隱藏已完成）→ 免登入審核連結設定
  - 卡片 / Shot list 表格切換 → 鏡頭規劃
- **截圖**：
  - `img/boords-shotlist.jpg`：Boords Shot list 檢視：同一份分鏡切到表格，欄位有 Frame、Image、Label、Voiceover、Action、Shot（彩色標籤）、Cast、Sound。。Source: Boords (https://boords.com/ai-storyboard-generator), accessed 2026-11-02
  - `img/boords-frame-status.jpg`：Boords 分鏡格狀態：每格可標 In Progress / Approved / Review Needed，以格子角落的彩色圓點顯示；頂部有 v2 版本與 In review 狀態膠囊。。Source: Boords (https://boords.com/ai-storyboard-generator), accessed 2026-11-02
  - `img/boords-share-link.jpg`：Boords Share storyboard 對話框：Review link、Passphrase 開關、Allow comments、Hide completed、Allow on old versions、顯示格號/狀態/文字等外觀開關。。Source: Boords (https://boords.com/ai-storyboard-generator), accessed 2026-11-02
  - `img/boords-review-comments.jpg`：Boords 審核畫面：左邊大圖加 animatic 時間軸與縮圖列，右邊 Frame 5 的留言串（客戶 Ruth 提意見、製片 Callum 回覆並標記 approved）。。Source: Boords (https://boords.com/ai-storyboard-generator), accessed 2026-11-02

#### LTX Studio
- **定位** [來源]：Lightricks 的 AI 製片平台：腳本自動拆 scene / shot、生成分鏡，再到影片與時間軸。官網已從 ltx.studio 轉到 ltx.io/studio。
- **涵蓋流程**：腳本、分鏡、AI 生成鏡頭、剪輯時間軸
- **電影感** [推論]：4/5
- **定價入口** [來源 https://ltx.io/studio/pricing，accessed 2026-11-02]：Free（800 一次性點數）；Lite US$15/月（年繳 US$12）
- **可借** [推論]：
  - 分鏡卡底固定兩顆鍵（Edit Image / Generate Video）→ 鏡頭卡
  - Elements：產品、人物上傳一次，所有分鏡沿用 → AI 分鏡一致性
- **截圖**：
  - `img/ltx-storyboard-collab.jpg`：LTX Studio Storyboard 畫面：左側 Scene 2 設定地點/風格，右側一格一格 shot 卡，每格下方有 Edit Image / Generate Video 與 prompt，畫面上可見其他協作者的游標（AK、BN）。。Source: LTX Studio (Lightricks) (https://ltx.studio/blog/how-to-storyboard), accessed 2026-11-02
  - `img/ltx-script-shots.jpg`：LTX Studio 腳本拆解：每個 scene 底下列 SHOT 1、SHOT 2，台詞中的角色/道具/地點以 @Element 標籤呈現。。Source: LTX Studio (Lightricks) (https://ltx.studio/blog/how-to-storyboard), accessed 2026-11-02
  - `img/ltx-elements.jpg`：LTX Studio Edit Element 對話框：上傳一張來源圖，設定名稱與類型（Character / Object / Other），之後在每格分鏡重複使用。。Source: LTX Studio (Lightricks) (https://ltx.studio/blog/how-to-storyboard), accessed 2026-11-02

#### Saga
- **定位** [來源]：AI 編劇加製片 app，從 Plot、Beats、Script 到 Storyboards 一條龍；2026 年宣布改名 CreateSagas.com。
- **涵蓋流程**：腳本、分鏡、短 previz
- **電影感** [推論]：4/5
- **定價入口** [來源 https://writeonsaga.com/，accessed 2026-11-02]：Basic 免費；Premium US$19.99/月
- **可借** [推論]：
  - 頂部分頁就是製作階段 → Remake 專案頁的六步驟分頁
  - Create Shot 一次給 4 張候選 → AI 分鏡圖
- **截圖**：
  - `img/saga-storyboard-cards.jpg`：Saga Storyboards：每張卡標題為「Scene 1 Shot 1」，上方是可播放的預覽，下方寫鏡頭類型與機位（Full Shot • Eye Level）及鏡頭描述。。Source: Saga (CyberFilmAI) (https://writeonsaga.com/), accessed 2026-11-02
  - `img/saga-create-shot.jpg`：Saga Create Shot：下拉選 Shot Type、Camera Level、Style、Size（16:9），輸入 Shot Description 後一次產生 4 張候選圖；右側 Shot Info 可上傳自己的圖、填 Scene/Shot 編號與 Notes。。Source: Saga (CyberFilmAI) (https://writeonsaga.com/), accessed 2026-11-02
  - `img/saga-beats-tabs.jpg`：Saga 專案頂部分頁：Plot → Characters → Acts → Beats → Script → Storyboards，目前在 Beats，逐段填寫並可按 Generate。。Source: Saga (CyberFilmAI) (https://writeonsaga.com/), accessed 2026-11-02

#### Katalist
- **定位** [來源]：從 AI 分鏡轉型為給代理商與成效團隊的 AI 廣告影片變體工具，強調多客戶與「客戶要改就一句 prompt」。定位與 Remake 最像，值得追蹤。
- **涵蓋流程**：腳本匯入、分鏡、AI 影片、變體
- **電影感** [推論]：3/5
- **定價入口** [來源 https://www.katalist.ai/，accessed 2026-11-02]：未能確認（官網無價目頁，寫「免費點數起步」）
- **可借** [推論]：
  - 多選幾格 → 對 AI 助理說要改什麼 → 鏡頭規劃批次修改
  - Present 簡報模式讓客戶逐格看
- **截圖**：
  - `img/katalist-storyboard-characters.jpg`：Katalist 分鏡專案：分鏡格以兩欄排列，每格下有場景描述與角色/地點標籤，右側為角色清單（Knight、Jack、Marvin）並有 INVITE TO WORKSPACE、PRESENT 按鈕。。Source: Katalist (https://www.katalist.ai/advertising-video-production), accessed 2026-11-02
  - `img/katalist-ai-assistant-edit.jpg`：Katalist Editor Assistant：勾選幾格分鏡後，在右側對話框用文字描述要改什麼，AI 直接重生選取的畫格。。Source: Katalist (https://www.katalist.ai/advertising-video-production), accessed 2026-11-02

#### Higgsfield
- **定位** [來源]：AI 影像與影片生成平台。Cinema Studio 4.0 主打攝影機、鏡位、色盤、打光控制；Popcorn 用一個 prompt 生成一組一致的分鏡圖。
- **涵蓋流程**：分鏡（Popcorn）、AI 生成鏡頭
- **電影感** [推論]：4/5
- **定價入口** [來源 https://higgsfield.ai/pricing，accessed 2026-11-02]：未能確認（定價頁由 JS 載入）
- **可借** [推論]：
  - Film setup / Camera / Color palette / Lighting 膠囊 → AI 分鏡與色盤設定
  - Generate 鍵上直接寫點數 → 生成前顯示成本
- **截圖**：
  - `img/higgsfield-cinema-studio-controls.jpg`：Cinema Studio 4.0 生成面板：上排 References、Film setup、Camera、Color palette、Lighting 五個「片場參數」膠囊，下排解析度、16:9、5s、張數 1/4，Generate 按鈕直接標點數 80。Source: Higgsfield (https://higgsfield.ai/cinema-studio), accessed 2026-11-02

#### Runway
- **定位** [來源]：AI 影片生成平台；2025 年 10 月推出節點式 Workflows，官方示範 idea → storyboard → animatic。
- **涵蓋流程**：分鏡、AI 生成鏡頭、少量剪輯
- **電影感** [推論]：3/5
- **定價入口** [來源 https://runway.com/pricing，accessed 2026-11-02]：Free（125 點）；Standard US$12/月（年繳）
- **可借** [推論]：
  - Run 鍵上顯示要花的點數 → 生成分鏡或自動剪輯前顯示成本
  - 分鏡完成即可連播成 animatic → 審核連結的「分鏡連播」
- **截圖**：
  - `img/runway-workflow-canvas.jpg`：Runway Workflows 節點畫布「My Storyboard Creator」：文字輸入節點 → Flash 2.5 Image 產生分鏡圖 → Gen-4 Video 節點，頂部有 Run all（顯示所需 credits）。。Source: Runway (official YouTube, Runway Academy, 2025-11-21) (https://www.youtube.com/watch?v=MsVl_CKu_gk), accessed 2026-11-02
  - `img/runway-storyboard-animatic-node.jpg`：Runway Academy 教學縮圖：「idea → storyboard → animatic」，畫面中為 Animatic 節點的播放器（0:00/0:05）與 Run 按鈕。。Source: Runway Academy (https://academy.runwayml.com/workflows/using-workflows), accessed 2026-11-02

#### Storyboarder (Wonder Unit)
- **定位** [來源]：免費開源的手繪分鏡桌面軟體。最後 release 是 2021-02，視為停滯；與仍活躍的 Storyboarder.ai 是不同產品。
- **涵蓋流程**：分鏡 → 匯出到剪輯軟體
- **電影感** [推論]：4/5
- **定價入口** [來源 https://wonderunit.com/storyboarder/，accessed 2026-11-02]：免費開源
- **可借** [推論]：
  - 分鏡長度直接變成剪輯時間軸佔位片段 → 自動剪輯先排 animatic 再逐鏡換 take
- **截圖**：
  - `img/storyboarder-shot-metadata.jpg`：Storyboarder 桌面版：中央畫框、右側 Shot 4A 的 Duration / Dialogue / Action / Notes 欄位，底部一排分鏡縮圖與播放控制。。Source: Wonder Unit (https://wonderunit.com/storyboarder/), accessed 2026-11-02
  - `img/storyboarder-premiere-export.jpg`：Storyboarder 匯出到 Premiere：每格分鏡變成時間軸上的片段，長度依各格 Duration。。Source: Wonder Unit (https://wonderunit.com/storyboarder/), accessed 2026-11-02

#### Autodesk Flow Studio
- **定位** [來源]：前身 Wonder Studio，把實拍人物換成 CG 角色；2026 年 9 月推出 3D Editor 與 Canvas。對 Remake 參考價值低。
- **涵蓋流程**：previs、VFX、動畫
- **電影感** [推論]：5/5
- **定價入口** [來源 https://www.autodesk.com/products/flow-studio/compare，accessed 2026-11-02]：Free / Lite US$10/月（第三方報導，官網擋爬蟲未核對）
- **可借** [推論]：
  - Canvas 把人物、場景、產出用節點連起來（參考價值低）
- **截圖**：
  - `img/flowstudio-canvas.jpg`：Autodesk Flow Studio Canvas：在無限畫布上把角色 3D 模型、地點照片、生成結果以節點連起來，頂部可切換 3D Editor / Canvas。。Source: Autodesk Media & Entertainment (official YouTube, 2026-09-03) (https://www.youtube.com/watch?v=5oEblqjwQYs), accessed 2026-11-02
  - `img/flowstudio-3d-editor.jpg`：Autodesk Flow Studio 3D Editor：3D 場景中放置角色與攝影機路徑，底部為帶彩色軌道的時間軸。。Source: Autodesk Media & Entertainment (official YouTube, 2026-09-03) (https://www.youtube.com/watch?v=5oEblqjwQYs), accessed 2026-11-02

### 前製管理

#### StudioBinder
- **定位** [來源]：All-in-one 影片製作規劃平台，從劇本、shot list、storyboard 到 call sheet。
- **涵蓋流程**：腳本、分鏡、shot list、call sheet、排程、看板
- **電影感** [推論]：5/5
- **定價入口** [來源 https://www.studiobinder.com/pricing/，accessed 2026-11-02]：未能確認（價目頁由 JS 載入；第三方數字互相矛盾）
- **可借** [推論]：
  - Shot list 可插入「Setup 結束」「Meal Break」時段橫條 → 拍攝日上傳頁分組
  - Task Board 卡片有子任務進度條 → 製作看板
  - Call sheet 用區塊拼成 → 自動產生一頁拍攝通告
- **截圖**：
  - `img/studiobinder-shotlist.jpg`：Shot List 表格：每列一個鏡頭（縮圖、場次、鏡號、描述、景別），中間可插入「Setup 結束 8:00–10:30」與「Meal Break」時段橫條。。Source: StudioBinder (https://www.studiobinder.com/), accessed 2026-11-02
  - `img/studiobinder-storyboard.jpg`：Storyboard 網格：每張卡片 = Scene/Shot 編號 + 畫格 + 三列固定欄位（描述、聲音/台詞、器材/燈光），上方 tab 切換 Mood Boards / Storyboards / Shot Lists。。Source: StudioBinder (https://www.studiobinder.com/storyboard-creator/), accessed 2026-11-02
  - `img/studiobinder-taskboard.jpg`：Task Board（看板）：卡片顯示子任務進度條（19/23・82%）、日期與負責人；點開是 checklist（Write Script / Edit Video / Motion Graphics）與附件拖放區。。Source: StudioBinder (https://www.studiobinder.com/), accessed 2026-11-02
  - `img/studiobinder-callsheet.jpg`：Call Sheet 編輯器：左側可拖曳排序的區塊（Locations、Schedule、Clients、Talent、Attachments、Department Notes），右側附件（場地地圖、拍攝腳本、Shot List PDF）。。Source: StudioBinder (https://www.studiobinder.com/), accessed 2026-11-02

#### Filmustage
- **定位** [來源]：AI 劇本拆解與前製平台：上傳劇本自動標出 cast、道具、場景，再產生排程、分鏡、call sheet。
- **涵蓋流程**：AI 劇本拆解、分鏡、排程、call sheet
- **電影感** [推論]：5/5
- **定價入口** [來源 https://filmustage.com/pricing/，accessed 2026-11-02]：Free；Director's Cut 月繳 US$49 起
- **可借** [推論]：
  - AI 分鏡卡下的 Shot Size / Camera Movement / Lighting 欄位 → 鏡頭卡的三個下拉
  - Call sheet 大字集合時間與天氣 → 手機版拍攝日頁
- **截圖**：
  - `img/filmustage-breakdown.jpg`：AI 劇本拆解：左欄場次清單依類別上色，劇本內文自動標出元素（Cast、Props、Extras…），選字可「Add Tag」。。Source: Filmustage (https://filmustage.com/), accessed 2026-11-02
  - `img/filmustage-schedule.jpg`：Stripboard 排程：每場一條色帶（日/夜、內/外不同色），夾著「End of Day 2 of 24」與「Meal Break」分隔列，可 Auto Day Breaks 與匯出。。Source: Filmustage (https://filmustage.com/), accessed 2026-11-02
  - `img/filmustage-storyboard.jpg`：Storyboard：Frame 1–6 的 AI 生成畫格，每格下方有描述與鏡頭參數欄（Shot Size、Camera Movement、Lens、Lighting、fps）。。Source: Filmustage (https://filmustage.com/), accessed 2026-11-02
  - `img/filmustage-callsheet.jpg`：Call Sheet：大字顯示集合時間 07:34 PM、天氣與日出日落、拍攝日 Day 3 of 62、當天場次表與聯絡人。。Source: Filmustage (https://filmustage.com/), accessed 2026-11-02

#### Celtx
- **定位** [來源]：雲端劇本寫作起家，延伸到 breakdown、shot list、storyboard、排程。
- **涵蓋流程**：腳本、分鏡、shot list、排程
- **電影感** [推論]：4/5
- **定價入口** [來源 https://www.celtx.com/pricing/，accessed 2026-11-02]：有 Free 方案（1 個專案）；付費金額在圖片裡，未能確認
- **可借** [推論]：
  - 分鏡格「1.1、1.2」編號 + 鏡位下拉 + 一句描述 → 鏡頭規劃卡
  - 左欄場景清單「Sync from Script」→ 腳本改了分鏡跟著改
  - 選取文字留言、連接線指回原文 → 腳本審核
- **截圖**：
  - `img/celtx-storyboard-sequences.jpg`：Storyboard：左欄 sequence/scene 清單可「Sync from Script」，右側每格編號 1.1、1.2… 帶鏡位下拉（ECU、MWS、MS、CU）與一句描述。Source: Celtx (https://www.celtx.com/product/story-development/storyboard/), accessed 2026-11-02
  - `img/celtx-script-comments.jpg`：劇本編輯器：選取一段文字後在右側 Comments 欄留言，留言用連接線指回原文位置，可 reply。。Source: Celtx (https://www.celtx.com/), accessed 2026-11-02

#### Assemble
- **定位** [來源]：給創意與行銷團隊的時間軸式專案工具，把檔案、審核與排程放在一起；訪客免費。
- **涵蓋流程**：專案排程、素材審核、免登入分享、客戶 dashboard
- **電影感** [推論]：3/5
- **定價入口** [來源 https://www.onassemble.com/pricing，accessed 2026-11-02]：Starter US$5/人/月；同頁比較表寫 US$20，互相矛盾
- **可借** [推論]：
  - 「階段 × 日期」時間軸 + V1 Due 里程碑 → 製作看板第二種檢視
  - 影片上的編號留言圖釘 → 審核連結
- **截圖**：
  - `img/assemble-phase-timeline.jpg`：Campaign 時間軸：左側依製作階段分組（Design / Concepting / Production / Finishing，各顯示檔案數），右側是膠囊狀任務條（Boards、Shoot Prep、Shoot、Editing）與「V1 Due」里程碑。。Source: Assemble (https://www.onassemble.com/), accessed 2026-11-02
  - `img/assemble-review-pins.jpg`：影片審核：畫面上有編號留言圖釘（1、2），進度條上對應的時間點標記。。Source: Assemble (https://www.onassemble.com/), accessed 2026-11-02
  - `img/assemble-task-card.jpg`：任務卡「Concept Review」：狀態 In Progress、成員頭像、素材縮圖與上傳格，下方 checklist（Review mockups、Approve rough cuts）。。Source: Assemble (https://www.onassemble.com/), accessed 2026-11-02

#### Yamdu
- **定位** [來源]：德國的影視製作管理平台，從劇本拆解、排程、call sheet 到預算與 CO₂。
- **涵蓋流程**：腳本（AV Script）、AI 拆解、排程、call sheet、預算
- **電影感** [推論]：5/5
- **定價入口** [來源 https://www.yamdu.com/en/pricing/，accessed 2026-11-02]：未能確認（價目頁動態載入）
- **可借** [推論]：
  - AV Script 雙欄（Visual｜Audio）每鏡一列 → 鏡頭規劃表格檢視
  - AI 建議逐項接受 / 拒絕 → AI 生成的台詞與分鏡逐項採用
- **截圖**：
  - `img/yamdu-av-script.jpg`：AV Script（廣告/短片常用的雙欄腳本）：每個 shot 一列，左 Visual、右 Audio，上方有 Size、Type、Movement、Equipment、FPS、Camera、Lens 欄位，底部「Add shot」。。Source: Yamdu (https://www.yamdu.com/en/for-productions/commercial/), accessed 2026-11-02
  - `img/yamdu-ai-breakdown.jpg`：AI 拆解：左側場次清單（彩色）、中間劇本、右側「Suggest elements with AI」與 Element suggestions（勾選/拒絕）。。Source: Yamdu (https://www.yamdu.com/en/ai-capabilities/), accessed 2026-11-02
  - `img/yamdu-video-comments.jpg`：影片檔預覽：左側播放器、右側留言串（含時間戳與回覆），上方有下載、分享等動作。。Source: Yamdu (https://www.yamdu.com/en/for-productions/commercial/), accessed 2026-11-02

#### Milanote
- **定位** [來源]：白板式視覺規劃工具，有大量 storyboard 模板，agency 常用。
- **涵蓋流程**：參考、腳本、分鏡
- **電影感** [推論]：2/5
- **定價入口** [來源 https://milanote.com/plans，accessed 2026-11-02]：Free；個人 US$9.99/月（年繳）
- **可借** [推論]：
  - 用真實照片或參考截圖當分鏡畫格 → 直接放參考影片截圖
  - 鏡頭卡之間用箭頭串順序 → 讓客戶看懂剪接順序
- **截圖**：
  - `img/milanote-tvc-storyboard.jpg`：TVC Storyboard 模板：Shot 1–8 的照片畫格，每格下方有畫面描述與 Narration（旁白）文字，白板式自由排列。。Source: Milanote (https://milanote.com/templates/storyboard), accessed 2026-11-02
  - `img/milanote-storyboard-flow.jpg`：Storyboard Film 模板：鏡頭卡之間用箭頭串成順序（1. Driveway → 2. Front entrance → …），每卡標註運鏡（Track、POV shot）與描述。。Source: Milanote (https://milanote.com/templates/storyboard), accessed 2026-11-02

### 審核核可

#### Frame.io
- **定位** [來源]：Adobe 旗下、影視業標準的雲端審片平台；V4 把審片、metadata 與分享整合。分享連結不需註冊即可看與留言。
- **涵蓋流程**：素材上傳、審核、版本、分享
- **電影感** [推論]：5/5
- **定價入口** [來源 https://frame.io/pricing，accessed 2026-11-02]：Free（2 人、2GB）；Pro US$15/人/月
- **可借** [推論]：
  - 右側時間碼留言 + 時間軸頭像點 + 畫面圈選 → 審核連結
  - 把新檔拖到卡上即成新版本（v4）→ 每鏡 take 上傳
  - 素材卡上的 Status 欄位 → 看板卡片
- **截圖**：
  - `img/frameio-status-grid.jpg`：Frame.io 素材卡上的 Status 欄位（Needs review / Approved），旁邊是 Metadata 選單：Status、Selects、Ratings、Assignees（行銷合成圖）。Source: Adobe (https://business.adobe.com/products/frameio-business.html), accessed 2026-11-02
  - `img/frameio-comments-annotate.jpg`：Frame.io V4 播放器：畫面上手繪標註，右側留言欄每則帶時間碼，下方時間軸有留言標記點。。Source: Frame.io (Adobe) (https://frame.io/features/review-and-approval), accessed 2026-11-02
  - `img/frameio-frame-pin-comment.jpg`：在畫面某一點釘選留言（時間碼 00:10 + 範圍框），留言框直接浮在影像上。。Source: Frame.io (Adobe) (https://frame.io/features/review-and-approval), accessed 2026-11-02
  - `img/frameio-share-presentation.jpg`：「Scene Selects」分享頁：以縮圖格狀呈現一批素材給外部審閱者。。Source: Frame.io (Adobe) (https://frame.io/features/review-and-approval), accessed 2026-11-02
  - `img/frameio-version-stack.jpg`：把新檔拖到 9×16 影片卡上即「Drop to add version」，卡片右上顯示 v4。。Source: Frame.io Help Center (https://help.frame.io/en/articles/9101068-versioning-in-frame-io), accessed 2026-11-02

#### Wipster
- **定位** [來源]：給行銷與品牌團隊的影片審核平台，客戶免登入留言。
- **涵蓋流程**：審核、版本比較
- **電影感** [推論]：3/5
- **定價入口** [來源 https://wipster.io/pricing，accessed 2026-11-02]：Light US$9.95/月（年繳）
- **可借** [推論]：
  - 卡底「0/4 審閱人 · 12 留言 · Awaiting Review」→ 看板卡片
  - 綠色「Finish Review」收尾鍵 → 審核連結
  - 兩版並排播放 → 第二輪審核
- **截圖**：
  - `img/wipster-review-player.jpg`：Wipster 審核播放器：點畫面即留言（Click to comment），右上綠色「Finish Review」按鈕，時間軸上彩色留言點。。Source: Wipster (https://wipster.io/), accessed 2026-11-02
  - `img/wipster-status-card.jpg`：影片卡：V1 標籤、0/4 審閱人已完成、12 則留言、粉紅「Awaiting Review」狀態膠囊。。Source: Wipster (https://wipster.io/features), accessed 2026-11-02
  - `img/wipster-side-by-side.jpg`：Version 2 與 Version 1 左右並排播放，各自帶留言串。。Source: Wipster (https://wipster.io/features), accessed 2026-11-02

#### Krock.io
- **定位** [來源]：給動畫與影片工作室的審核加專案管理工具，含 storyboard 與 animatic。
- **涵蓋流程**：分鏡、animatic、審核、專案排程
- **電影感** [推論]：4/5
- **定價入口** [來源 https://krock.io/pricing/，accessed 2026-11-02]：Free（1 人、2GB、不限審閱人）；Pro US$10/人
- **可借** [推論]：
  - 上方編號素材條 + Approve / Reject → 逐鏡核可
  - 卡片寫階段名 + 狀態膠囊 → 製作看板
- **截圖**：
  - `img/krock-approve-reject-player.jpg`：Krock 審核畫面：上方編號素材膠卷條（04/05/06…）、紅色 Reject 與綠色 Approve 按鈕、版本下拉 Ver.1、右側留言帶檔案編號與時間碼。。Source: Krock.io (https://krock.io/), accessed 2026-11-02
  - `img/krock-status-grid.jpg`：專案素材格：每張卡片標示階段名稱（Principal photography、Final Cut…）與狀態膠囊（Needs Review / Approved / In progress / No Status）。。Source: Krock.io (https://krock.io/), accessed 2026-11-02

#### Filestage
- **定位** [來源]：多關卡審核平台，以「審閱群組 = 關卡」為核心；審閱人不需帳號即可留言與核可。
- **涵蓋流程**：多關卡審核、版本比較
- **電影感** [推論]：2/5
- **定價入口** [來源 https://filestage.io/pricing/，accessed 2026-11-02]：Free（1 個專案）；Starter US$199/月
- **可借** [推論]：
  - 檔案 × 關卡矩陣，每格顯示核可者 → 經理 → 客戶兩關總覽
  - 「Approved by」名單 → 核可憑據
- **截圖**：
  - `img/filestage-review-steps.jpg`：審核步驟矩陣：橫軸是審核關卡（Design / Product / Compliance / Translation），縱軸是檔案，每格顯示 Approved 與審閱人頭像。。Source: Filestage (https://filestage.io/), accessed 2026-11-02
  - `img/filestage-approved-by.jpg`：點開狀態看到「Approved by」名單，每位審閱人前有綠/橘狀態點。。Source: Filestage (https://filestage.io/), accessed 2026-11-02
  - `img/filestage-version-compare.jpg`：兩個版本並排比較，兩邊各自掛留言。。Source: Filestage (https://filestage.io/video-review-software/), accessed 2026-11-02

#### Planable
- **定位** [來源]：給代理商的社群貼文協作、核可與排程發佈平台。流程最接近 Remake 的「客戶核可 → 發佈」。
- **涵蓋流程**：文案、審核、排程發佈、數據
- **電影感** [推論]：1/5
- **定價入口** [來源 https://planable.io/pricing/，accessed 2026-11-02]：Free（50 篇）；Basic US$33/workspace/月
- **可借** [推論]：
  - 核可後自動排程（功能頁原文）→ 最終核可 → 發佈
  - 內部留言與客戶留言分開 → 審核連結只給客戶看外部留言
  - 活動紀錄「Nora approved this post」→ 核可紀錄
- **截圖**：
  - `img/planable-activity-approved.jpg`：Planable 貼文 Activity 紀錄：「Nora approved this post · just now」、留言、新增貼文，每筆帶頭像與狀態小圖示。Source: Planable (https://planable.io/features/approvals/), accessed 2026-11-02
  - `img/planable-internal-vs-client-comments.jpg`：同一貼文上分內部留言（Only visible to team members）與客戶留言，可 Resolve。。Source: Planable (https://planable.io/features/approvals/), accessed 2026-11-02
  - `img/planable-calendar-approved.jpg`：月曆 + 多平台貼文預覽，下方顯示「@Jane approved your post」。。Source: Planable (https://planable.io/features/approvals/), accessed 2026-11-02

#### Ziflow
- **定位** [來源]：企業級線上 proofing，前一關的決定可觸發下一關。
- **涵蓋流程**：多階段審核
- **電影感** [推論]：1/5
- **定價入口** [來源 https://www.ziflow.com/pricing，accessed 2026-11-02]：Free（2 人、單階段）；Standard US$199/月（年繳）
- **可借** [推論]：
  - 清單上用一排小方塊表示走到第幾關 → 看板清單檢視
  - Changes required / Approved with changes 狀態詞 → 統一狀態用語
- **截圖**：
  - `img/ziflow-proof-list-status.jpg`：Proof 清單：Progress 欄是一排階段小方塊，Status 欄顯示 Changes required / Approved with changes，Decisions 欄顯示 3 of 3。。Source: Ziflow (https://www.ziflow.com/), accessed 2026-11-02

### 短影音剪輯

#### Descript
- **定位** [來源]：以逐字稿為核心的影音編輯器，像改文件一樣剪片，內建 AI 共同剪輯 Underlord。
- **涵蓋流程**：腳本、剪輯、字幕、分享留言
- **電影感** [推論]：2/5
- **定價入口** [來源 https://www.descript.com/pricing，accessed 2026-11-02]：Free；Hobbyist US$16 起（月繳 / 年繳未標明）
- **可借** [推論]：
  - 口頭禪標亮、刪字即剪片 → 自動剪輯頁
  - Underlord 用一句話回報做了什麼 → 自動剪輯結果
  - 分享影片上的時間點留言 → 審核連結
- **截圖**：
  - `img/descript-transcript-edit.jpg`：Descript 以逐字稿為主的剪輯畫面：左邊是講者分段文字，口頭禪（um、like、so）被標亮，下方是對應的影片片段時間軸。。Source: Descript (https://www.descript.com/), accessed 2026-11-02
  - `img/descript-underlord-vertical.jpg`：Underlord（AI 共同剪輯）對話框：使用者說「幫我優化成社群版」，AI 回報已轉 9:16、縮短並加字幕，可展開 Details 看改了什麼。。Source: Descript (https://www.descript.com/underlord), accessed 2026-11-02
  - `img/descript-review-comment.jpg`：Descript 分享影片上的留言：評論者頭像、留言內容，下方播放列有留言時間點標記。。Source: Descript (https://www.descript.com/), accessed 2026-11-02

#### CapCut
- **定位** [來源]：字節跳動的大眾剪輯器，模板與自動字幕強；Commerce Pro 是給電商的版本，現況未能確認。
- **涵蓋流程**：剪輯、字幕、調色濾鏡、上傳 TikTok
- **電影感** [推論]：1/5
- **定價入口** [來源 https://www.capcut.com/pricing，accessed 2026-11-02]：Free；Pro AUD 37.99/月（頁面以澳幣顯示）
- **可借** [推論]：
  - Auto captions 只有「語言 + Create」→ 字幕步驟
  - 逐句字幕清單附時間碼 → 字幕校對
  - 匯出完成直接「Upload to TikTok」→ 發佈
- **截圖**：
  - `img/capcut-auto-captions.jpg`：CapCut 網頁版編輯器：左側 Text > Auto captions 分頁，選語言後按 Create 自動產生字幕，右側即時預覽。。Source: CapCut (https://www.capcut.com/tools/auto-caption-generator), accessed 2026-11-02
  - `img/capcut-caption-styles.jpg`：CapCut 字幕樣式面板：字型、粗斜體、顏色，以及一排預覽式樣式按鈕（以「T」縮圖直接顯示效果）。。Source: CapCut (https://www.capcut.com/tools/auto-caption-generator), accessed 2026-11-02
  - `img/capcut-caption-list.jpg`：CapCut 字幕清單：每行字幕附開始/結束時間，可直接點擊修改文字，畫面同步顯示目前那句。。Source: CapCut (https://www.capcut.com/tools/auto-caption-generator), accessed 2026-11-02
  - `img/capcut-export-tiktok.jpg`：CapCut 匯出完成視窗：「Your video is ready!」直接提供 Upload to TikTok、Upload to TikTok Ads Manager、Download。。Source: CapCut (https://www.capcut.com/tools/auto-caption-generator), accessed 2026-11-02

#### Opus Clip
- **定位** [來源]：把長影片自動切成短影音，每段給「病毒潛力分數」，附品牌模板與排程發佈。
- **涵蓋流程**：自動切片、字幕、調色、排程、數據
- **電影感** [推論]：1/5
- **定價入口** [來源 https://www.opus.pro/pricing，accessed 2026-11-02]：Free；Starter US$15/月
- **可借** [推論]：
  - 99/100 總分 + Hook / Flow / Value / Trend 字母等級 → 看板卡片的預估表現
  - Calendar、Analytics、Social accounts 同一側欄 → 發佈 + 數據
  - Brand kit 配 9:16 即時預覽 → 客戶字幕與調色預設
- **截圖**：
  - `img/opusclip-virality-score.jpg`：Opus Clip 片段卡：大字 99/100 Virality Score，並拆成 Hook、Flow、Value、Trend 四項字母等級。。Source: OpusClip (https://help.opus.pro/docs/article/virality-score), accessed 2026-11-02
  - `img/opusclip-clip-grid.jpg`：Opus Clip 片段列表：直式縮圖格狀排列，每張下方有標題、分數與排程/下載/刪除圖示，右上可多選。。Source: OpusClip (https://help.opus.pro/docs/article/bulk-scheduler), accessed 2026-11-02
  - `img/opusclip-calendar.jpg`：Opus Clip 內建 Calendar：左側導覽有 Calendar、Analytics、Social accounts，月曆視圖上方有 Schedule Post 按鈕。。Source: OpusClip (https://help.opus.pro/docs/article/schedule-clips), accessed 2026-11-02
  - `img/opusclip-brand-kit.jpg`：Opus Clip Brand kit：設定 logo、字幕樣式、標題樣式、各比例版面，右側即時以 9:16 手機框預覽。。Source: OpusClip (https://help.opus.pro/docs/article/how-to-use-brand-kit), accessed 2026-11-02

#### Captions / Mirage
- **定位** [來源]：手機優先的 AI 講者影片編輯器；公司對外以 Mirage 為母品牌，產品仍叫 Captions。
- **涵蓋流程**：腳本、AI 剪輯、字幕
- **電影感** [推論]：2/5
- **定價入口** [來源 https://captions.ai/pricing，accessed 2026-11-02]：Free；Max US$24.99/月（iOS 價格）
- **可借** [推論]：
  - 時間軸用人話標出 AI 加了什麼 → 可解釋的自動剪輯
  - 處理中在預覽上顯示正在做哪一步 → 自動剪輯進度
- **截圖**：
  - `img/captions-semantic-timeline.jpg`：Captions（Mirage 旗下）可編輯時間軸：字幕以字為單位排在上方，AI 加入的元素以文字標籤顯示（Floating glass card、Blurry gradient、Upbeat fast-paced music）。。Source: Mirage (Captions) (https://mirage.app/), accessed 2026-11-02
  - `img/captions-editor-devices.jpg`：Captions 桌機版編輯器（中央預覽、下方字詞時間軸）與手機版（AI 引導對話「import media and select an edit style」）並列。。Source: Mirage (Captions) (https://mirage.app/), accessed 2026-11-02
  - `img/captions-ai-edit-vertical.jpg`：Captions AI Edit 直式畫面：影片上浮出「Add b-roll」「Applying edits…」狀態，下方為片段縮圖條。。Source: Captions (https://captions.ai/), accessed 2026-11-02

#### VEED
- **定位** [來源]：瀏覽器內的線上剪輯器，主打自動字幕、逐字稿剪輯與團隊分享審閱。
- **涵蓋流程**：腳本、剪輯、字幕、分享審閱、發佈
- **電影感** [推論]：1/5
- **定價入口** [來源 https://www.veed.io/pricing，accessed 2026-11-02]：有 Free；付費金額由 JS 載入，未能確認
- **可借** [推論]：
  - 字幕樣式卡用實際台詞預覽 → 字幕樣式選擇
  - Delete Silences（長 / 中 / 短）+ Delete Filler Words → 自動剪輯參數
  - 分享頁左影片右留言串 → 客戶審核頁
- **截圖**：
  - `img/veed-subtitle-styles.jpg`：VEED Subtitles 面板（Style / Edit 分頁）：三種字幕樣式以實際文字效果預覽，直接點選套用。。Source: VEED (https://www.veed.io/tools/auto-subtitle-generator-online), accessed 2026-11-02
  - `img/veed-edit-with-script.jpg`：VEED Edit with script：逐字稿面板可刪字剪片，並有 Delete Silences（長/中/短）與 Delete Filler Words 開關。。Source: VEED (https://www.veed.io/tools/video-editor), accessed 2026-11-02
  - `img/veed-timestamp-comments.jpg`：VEED 協作：播放列上有綠點標出留言時間，下方留言卡顯示評論者與內容（Love this intro! / Let's rearrange these clips）。。Source: VEED (https://www.veed.io/tools/video-collaboration), accessed 2026-11-02
  - `img/veed-share-review-page.jpg`：VEED 分享頁：左側影片、右側 Comments 討論串（含回覆），中間 Share Video 視窗可複製連結、寄 email、分享到社群。。Source: VEED (https://www.veed.io/tools/share-video), accessed 2026-11-02

#### Kapwing
- **定位** [來源]：瀏覽器協作影片編輯器，主打團隊工作區、AI 字幕，並推出從長片切短片的 Repurpose Studio。
- **涵蓋流程**：剪輯、字幕、時間碼留言、分享
- **電影感** [推論]：2/5
- **定價入口** [來源 https://www.kapwing.com/pricing，accessed 2026-11-02]：Free；Pro US$16（月繳或年繳未標明）
- **可借** [推論]：
  - Safe Zones 疊出各平台遮擋區 → 字幕與發佈前檢查
  - 字幕清單附起訖時間與 Chars per subtitle 滑桿 → 字幕校對
  - 留言帶時間碼、時間軸頭像點 → 審核連結
- **截圖**：
  - `img/kapwing-comments-timeline.jpg`：Kapwing 編輯器右側 Comments 面板：每則留言帶時間碼（如 02:59），時間軸上方用頭像標出留言位置，回覆可勾選「Include timestamp」。。Source: Kapwing (https://www.kapwing.com/help/how-to-use-comments-in-kapwing/), accessed 2026-11-02
  - `img/kapwing-subtitle-styles.jpg`：Kapwing 字幕樣式：右側 Text Styles 預設縮圖（Pop Art 等）＋字型/描邊/顏色，下方時間軸有一條字幕軌。。Source: Kapwing (https://www.kapwing.com/help/add-captions/), accessed 2026-11-02
  - `img/kapwing-subtitle-list.jpg`：Kapwing 字幕清單：左側逐句字幕附起訖時間、Speaker 標籤、「Chars per subtitle」滑桿與 Smart tools，右側直式預覽高亮當前字詞。。Source: Kapwing (https://www.kapwing.com/help/add-captions/), accessed 2026-11-02
  - `img/kapwing-safe-zones.jpg`：Kapwing Safe Zones：選 TikTok / YouTube / Instagram / LinkedIn / X，畫面上疊出各平台 UI 遮擋區，確認字幕不被按鈕蓋住。。Source: Kapwing (https://www.kapwing.com/help/add-captions/), accessed 2026-11-02

#### Submagic
- **定位** [來源]：上傳直式影片後自動加爆款風格字幕、B-roll、自動 zoom、剪靜音，並可排程發佈。官網圖都是行銷合成圖。
- **涵蓋流程**：剪輯、字幕、排程發佈
- **電影感** [推論]：1/5
- **定價入口** [來源 https://www.submagic.co/pricing，accessed 2026-11-02]：Starter 月繳 US$19（年繳 US$12/月）
- **可借** [推論]：
  - 自動剪輯步驟做成一列開關 → 自動剪輯頁
  - 每個平台一張開關卡 → 發佈
- **截圖**：
  - `img/submagic-caption-styles.jpg`：Submagic 行銷圖：Auto Caption 開關＋字幕樣式範本清單（HORMOZI 1、Ali…），左右為套用前後的直式影片。。Source: Submagic (https://www.submagic.co/), accessed 2026-11-02
  - `img/submagic-auto-edit-toggles.jpg`：Submagic 行銷圖：自動剪輯開關列（Cut Silences、Auto B-Rolls、Transitions、Clean Audio、AI Thumbnail、AI Translator），旁邊是可刪字的逐字稿。。Source: Submagic (https://www.submagic.co/), accessed 2026-11-02
  - `img/submagic-publish-toggles.jpg`：Submagic 行銷圖：發佈到 Instagram / TikTok / YouTube / LinkedIn 的平台開關卡片，旁邊是直式成片預覽。。Source: Submagic (https://www.submagic.co/), accessed 2026-11-02

#### Vizard
- **定位** [來源]：AI 從長影片切出社群短片，可用逐字稿剪輯並排程發佈。
- **涵蓋流程**：切片、逐字稿剪輯、字幕、排程發佈
- **電影感** [推論]：1/5
- **定價入口** [來源 https://vizard.ai/pricing，accessed 2026-11-02]：Free（每月 60 credits）；付費金額由 JS 載入，未能確認
- **可借** [推論]：
  - 逐字稿反白 → 浮出「Create clip / Delete」→ 剪輯校正
  - 字詞方塊可拖邊界 → 字幕時間微調
  - 成片旁並排各平台文案欄位與 AI 生成鍵 → 發佈
- **截圖**：
  - `img/vizard-edit-by-text.jpg`：Vizard Edit by text：在逐字稿上反白一段文字，浮出「Create clip 02:21 / Delete」工具列，直接從文字切出片段。。Source: Vizard (https://vizard.ai/), accessed 2026-11-02
  - `img/vizard-word-timeline.jpg`：Vizard 字詞級時間軸：每個字是一個方塊，可拖拉邊界微調（顯示 00:02.6），下方是音波。。Source: Vizard (https://vizard.ai/), accessed 2026-11-02
  - `img/vizard-publish-form.jpg`：Vizard 發佈表單：左側直式成片預覽，右側 YouTube 標題/描述/Tags 欄位，每欄有 AI 產生按鈕與字數計數，右上 Publish。。Source: Vizard (https://vizard.ai/), accessed 2026-11-02

#### InVideo AI
- **定位** [來源]：2026 年從「一句 prompt 生成整支片」轉成「AI Agent + 專業多軌時間軸」，可丟素材與腳本請 AI 出初剪。
- **涵蓋流程**：腳本、分鏡、多軌剪輯、字幕
- **電影感** [推論]：4/5
- **定價入口** [來源 https://invideo.io/pricing，accessed 2026-11-02]：Starter 每席月繳 US$20（年繳 US$10/月）
- **可借** [推論]：
  - Agent 逐步說明讀腳本、偵測場景、挑最佳 take → 自動剪輯結果
  - 「附上素材與腳本，請給初剪」單一入口 → 上傳 takes 之後
- **截圖**：
  - `img/invideo-agent-timeline.jpg`：invideo 2026 版：左側 Agent 對話（讀劇本、偵測場景、挑最佳 take 放上時間軸），右側是專業多軌時間軸與素材庫。。Source: invideo (https://invideo.io/), accessed 2026-11-02
  - `img/invideo-prompt-edit-scenes.jpg`：invideo AI 以文字指令改片：場景縮圖列上方輸入框，建議指令如「Add three more scenes」「Delete the second scene」。。Source: invideo (https://invideo.io/make/ai-video-generator/), accessed 2026-11-02
  - `img/invideo-first-cut-entry.jpg`：invideo Editor 入口：「Ask for a first cut, attach your media and script」，Agent / Editor 切換，選項 Start from scratch / Create a first cut / Use my Premiere Pro・DaVinci Resolve project。。Source: invideo Help Center (https://help.invideo.io/en/articles/16819946-introducing-invideo-editor), accessed 2026-11-02

#### Pictory
- **定位** [來源]：把腳本、部落格、URL 轉成配好圖庫素材與字幕的影片，以場景為單位編輯。
- **涵蓋流程**：腳本、自動分場景、剪輯、字幕
- **電影感** [推論]：2/5
- **定價入口** [來源 https://pictory.ai/pricing，accessed 2026-11-02]：14 天試用；Starter 月繳 US$29
- **可借** [推論]：
  - 腳本下方 AI 改寫工具列（縮短、改語氣）→ 台詞撰寫
  - 底部場景縮圖條 → 剪輯頁的鏡頭導覽
  - 字幕動畫用分段按鈕選逐字 / 逐句 → 字幕預設
- **截圖**：
  - `img/pictory-script-scenes.jpg`：Pictory Text to video 腳本頁：中間是腳本，底部 AI 工具列（Ask AI / Optimize / Rephrase / Shorten / Lengthen / Change tone），右側選比例 16:9/9:16/1:1 與 Scene settings（依句子/換行切場景）。。Source: Pictory Knowledge Base (https://kb.pictory.ai/en/articles/10971729-how-to-turn-your-ideas-or-script-into-a-video-with-pictory), accessed 2026-11-02
  - `img/pictory-storyboard-scenes.jpg`：Pictory Storyboard 編輯器：左側 Story/Visuals/Audio/Styles 分頁與素材庫，中間單一場景預覽，底部 Scene 3、4、5… 場景縮圖列，可在場景間插入轉場。。Source: Pictory Knowledge Base (https://kb.pictory.ai/en/articles/10683679-how-to-zoom-and-pan-background-videos-or-images), accessed 2026-11-02
  - `img/pictory-caption-animation.jpg`：Pictory Text animations 面板：進場動畫縮圖（None / Fade / Drift），速度、Writing Style（Letter/Word/Line/Box）、Future Words（Hidden/Subtle/Prominent）分段選擇。。Source: Pictory Knowledge Base (https://kb.pictory.ai/en/articles/12839800-dynamic-captions-and-decor-text), accessed 2026-11-02

## 開放問題與未驗證

- 所有截圖來自官方網站、help center、官方部落格或官方 YouTube 影片畫格；多數是行銷用示範畫面，不一定等於登入後的現行介面。圖片僅供內部參考。
- Planable 原先一張標為「多層核可」的圖，實際內容是留言收件匣，已換成活動紀錄圖。其餘圖片由各組逐張看過，我再抽查 13 張，沒有發現其他錯誤。
- Planable 的「核可後自動排程」有官方功能頁原文；「核可後鎖定」「未回覆自動提醒」未在官方頁核對到，未列為事實。
- 定價未能確認：StudioBinder、Yamdu、Celtx（金額）、VEED、Vizard（付費）、Higgsfield、Katalist。Assemble 同一頁兩組數字互相矛盾。Autodesk Flow Studio 價格來自第三方報導。
- 缺圖或圖少：Higgsfield 只取到 1 張（Playwright 截圖）；Krea、Pika、Previs Pro、Storyboarder.ai 只在筆記中簡述；CapCut Commerce Pro 沒有公開截圖。
- 「Plot」找不到對應的影片分鏡產品，需要確認指的是哪一個。
- 電影感分數與「值得借的模式」排序是推論，不是來源事實。
- Frame.io V4 的 Status 欄位（Needs review / Approved）只在 Adobe 產品頁的行銷圖看到，未在官方說明文件確認是否為預設欄位。
- Descript、VEED、Kapwing 的分享頁留言是否免登入、有沒有正式「核可」狀態，未驗證；Krock 寫「Unlimited reviewers」但沒寫是否要註冊。
- Planable 官方 help 說公開連結只能看與留言、不能核可（[來源] https://help.planable.io/hc/en-us/articles/22581435847324-How-to-get-Client-Approval-for-content-in-Planable ，經搜尋摘要，未逐字核對）；功能頁原文「Occasional approvers don’t need an account to view posts and comment」（[來源] https://planable.io/features/approvals/ ）。若屬實，Remake 的「免登入即可核可」是差異點 [推論]，但要配核可紀錄。
- Katalist 2026 年的代理商版介面、Higgsfield Popcorn 介面、CapCut Commerce Pro 的排程與成效畫面都沒有公開截圖。
- 部分截圖年份較舊：Wipster 約 2021、Saga 約 2024、InVideo 的場景指令圖可能是 2024 版介面。

## 方法

- 圖片來源：官方網站、help center、官方部落格與 changelog、官方 YouTube 影片畫格（Runway、Autodesk Flow Studio、Celtx 示範影片）。Higgsfield 與 Frame.io 狀態圖是用 Playwright 從公開頁面取得。沒有註冊、登入或付費。
- 每張圖轉成 JPG、寬度 ≤ 1400 px；全部圖片約 12 MB。各組逐張目視檢查，另抽查 13 張。
- 研究時間 2026-11-02；定價與功能可能隨時變動。
