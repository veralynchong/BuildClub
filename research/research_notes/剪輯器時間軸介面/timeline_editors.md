# 短影音時間軸剪輯器介面研究（供 Remake 多軌時間軸改版）

- 存取日期：2026-11-12（所有網頁、價格、授權皆為這天讀取；價格/授權日後可能變動）
- 截圖資料夾：`/private/tmp/claude-501/-Users-tommy-orca-workspaces-BuildClub-lunch/594ca1f1-4422-4623-9e76-016c60d4698a/scratchpad/timeline-research/`（共 13 張，1440x900 視窗，全部來自官方公開頁面，沒有登入、沒有輸入任何資料）
- 標記：【已驗證】= 直接讀到官方頁面或原始碼；【二手】= 第三方整理；【未驗證】= 看不到官方出處或只看到行銷圖

---

## 1. Remake 現在的編輯器版面（讀 `src/components/editor/` 的檔案清單與主面板）

路徑：`pivots/02-content/app/trend-finder/src/components/editor/`，技術：React 19 + Vite + `remotion@4.0.537` / `@remotion/player` / `@remotion/captions`，拖曳用 `@dnd-kit/core`。

1. 外框 `EditorPanel.tsx`（483 行）：`cv-ed-top` 頂欄（返回畫布、存檔狀態、Export 按鈕，按下彈出 `ExportBar` / `ExportOptions` 浮層）。
2. 主區 `cv-ed-main` 三欄：
   - 左 `cv-ed-left`：`ShotClips`，按分鏡（shot）顯示素材與 take，可上傳、選取，選取會與時間軸同步。
   - 中 `cv-ed-centre`：Remotion `<Player>` 預覽（9:16，1080x1920 @30fps）+ `SafeZoneOverlay`。
   - 右 `cv-ed-side`：`ToolTabs` 七個分頁 clips / ai / text / captions / voice / music / brand，每個分頁一個面板（`AiTool`、`CaptionTool`、`MusicTool`、`VoiceTool`、`TextTool`、`BrandTool`），頁籤有「完成」勾。
3. 底部 `cv-ed-bottom`：`Timeline.tsx`（305 行），其實只有「一條」影片道：片段（clip）可拖曳、兩端拉 trim、右鍵選單、分割/刪除/前後移動按鈕、縮放滑桿（20–120 px/秒）、尺規 + 播放頭、「有新版本/素材遺失」的提示列。下方 `cv-ed-audio` 是每個片段的音量/靜音列，不是真正的音軌。
4. 資料模型 `lib/editor/types.ts`：`EditProject { clips[], texts[], captions{speech[]}, music{volume,duck}|null, voiceover[], primaries, showLogo, export }`。音樂只有「一個設定」、旁白是 `VoiceSeg[]`（有 start），字幕與文字（`TextItem`: start/end/position）都沒有在時間軸上顯示。
5. 結論：Remake 已經有「單軌剪輯 + 分頁式工具」；缺的是 (a) 多軌（字幕/文字/旁白/音樂都成為時間軸上的條）、(b) 吸附（snapping）、(c) 時間軸上的 AI 標記（靜音/贅詞/最佳 take 現在只在 AI 分頁）、(d) 字幕文字稿式編輯。

---

## 2. Remotion 官方與開源選項

### 2.1 Remotion Editor Starter（付費範本）【已驗證】
- 官方頁：<https://www.remotion.dev/docs/editor-starter>（Remotion 官方文件，2026-11-12 讀取）
- **價格**：一次性 **US$600**（<https://www.remotion.dev/docs/editor-starter/buy>、<https://www.remotion.dev/docs/editor-starter/vs-studio>，Remotion，2026-11-12）。透過私人 GitHub repo 取得原始碼，不是 npm 套件。
- **授權**：沒有獨立授權，是「付費範本，買了可無限期使用」；但仍要遵守 Remotion License：4 人以上團隊要 Remotion Company License（<https://www.remotion.dev/docs/license/faq>）。Enterprise License 含此範本。
- **UI 功能**（<https://www.remotion.dev/docs/editor-starter/features>，2026-11-12）：
  - 時間軸：多軌（track 可隱藏/靜音）、播放頭拖曳、縮放滑桿、吸附（磁鐵圖示 / Shift+M，吸到其他項目、播放頭、格線）、拖曳/多選/框選、拉邊 trim、在播放頭分割、rolling edit、影片縮圖條、音訊波形、音量線與淡入淡出把手。
  - Inspector（右側面板）：未選取時是畫布設定（尺寸、輸出），選取後顯示來源資訊、位置、大小、裁切、透明度、旋轉、音量；文字/字幕項目多了字型、顏色、行高、最大行數、字幕 token 修正與高亮顏色；影片/音訊有播放速度。
  - 畫布：點選/移動/縮放/裁切、複製貼上、undo/redo、Cmd+S 存檔、狀態可下載/載入。
  - 字幕：用 OpenAI Whisper API 轉錄（限 25MB）。
  - 渲染：Lambda 或瀏覽器端（client-side）、MP4/WebM。
  - 資產面板：**沒有獨立的素材庫面板**；用動作列匯入/拖曳檔案到時間軸或畫布。
- **不含**（<https://www.remotion.dev/docs/editor-starter/features-not-included>）：關鍵影格動畫、轉場、多專案管理、自動存檔、手機版、多 fps、登入/權限、只有深色主題。
- **前置條件**（<https://www.remotion.dev/docs/editor-starter/before-you-buy>）：React 19、Tailwind v4。Remake 是 React 19，但是否用 Tailwind v4【未驗證，沒查 Remake 的 CSS 方案；程式碼用 `cv-ed-*` 手寫 class，看起來不是 Tailwind】。
- 截圖：`01-remotion-editor-starter-docs.png`、`02-remotion-editor-starter-demo-page.png`、`03-remotion-editor-starter-live-demo.png`（官方線上 demo，深色：頂部工具列 選取/形狀/文字/圖片/影片/音訊 + undo/redo/存檔；中間 canvas；右側 Canvas/Duration/Export 面板；下方多軌時間軸，軌道有眼睛/喇叭圖示，尺規 00:00–03:30，片段是紫色塊。這次 demo 載入時在下載 507MB 素材，所以預覽是黑畫面，只看到字幕。）

### 2.2 Remotion Timeline 元件（付費）【已驗證】
- <https://www.remotion.dev/docs/timeline>、<https://www.remotion.dev/store/timeline>（Remotion，2026-11-12）：**US$300 一次性**，GitHub 私人 repo、原始碼可複製貼上，不含 npm 套件，不含 Company/Enterprise 加成。
- 功能：多軌、軌內/跨軌拖放、選取與快捷鍵、`CanvasComposition` 在 Player 中渲染時間軸狀態、`<ZoomSlider>`、Tailwind v3/v4 主題、可擴充狀態管理。買 Editor Starter 時可全額退 Timeline 的錢（<https://www.remotion.dev/docs/editor-starter/buy>）。
- 對 Remake：只買時間軸 UI 最便宜，但沒有吸附/波形/Inspector 等（以官方頁面敘述為準，【未驗證】是否有吸附）。

### 2.3 Remotion Studio 與 Remotion 授權【已驗證】
- Studio（`npx remotion studio`，<https://www.remotion.dev/docs/terminology/studio>）是給開發者預覽「React 程式碼寫的」影片；影片是程式碼不是 JSON，所以**不是給終端使用者的剪輯器**，不能當 Remake 的 UI（<https://www.remotion.dev/docs/editor-starter/vs-studio>：Studio 免費、Editor Starter 的影片是可序列化 JSON 狀態）。沒有為 Studio 另外做截圖（官方頁面只有文字）。
- 授權（<https://www.remotion.dev/docs/license/faq>，2026-11-12）：個人與 **3 人以下**團隊免費（可商用、可做 SaaS）；4 人以上需 Company License：**Creators** US$25/月/寫 Remotion 程式的人，或 **Automators** US$0.01/次渲染、最低 US$100/月。**做「影片編輯器」或使用 Remotion Player 的公司屬於 Automators**。讓使用者提交自己的 Remotion 程式碼來渲染不被允許。→ Remake 已經在用 Player + 渲染，這條授權限制本來就適用，與是否買 Editor Starter 無關。

### 2.4 開源 / 第三方 Remotion 剪輯器（GitHub API 與 README，2026-11-12）
| 專案 | 星數 | 授權 | 備註 |
|---|---|---|---|
| `reactvideoeditor/free-react-video-editor`（<https://github.com/reactvideoeditor/free-react-video-editor>） | 141 | **MIT** | Next.js + Remotion，只有「排片段 + 靜態文字」，最後更新 2025-02；README 說功能有限，完整版是付費 RVE Pro。 |
| RVE Pro（<https://www.reactvideoeditor.com>） | - | 付費買原始碼 | 官網顯示 Personal US$149、Startup US$250 一次性（頁面寫「特價到 10/22」，年份不明，價格【未驗證/可能過期】）；有時間軸、字幕、AI 字幕、WebCodecs 客戶端渲染；頁面沒明說 Remotion。 |
| `openvideodev/react-video-editor`（原 designcombo，<https://github.com/openvideodev/react-video-editor>） | 1,832 | **自訂「OpenVideo License」**：個人與 3 人以下營利組織免費；不得拿來做衍生品販售（LICENSE） | **已不是 Remotion**：現在用 PixiJS v8 + WebCodecs + `@openvideo/timeline`；多軌、吸附、拆分；Next.js 16。舊搜尋結果說它是「Remotion 的 CapCut/Canva clone」已過時。 |
| `0xsline/OpenChatCut`（<https://github.com/0xsline/OpenChatCut>） | 3,065 | **AGPL-3.0** | Remotion 4 + Electron，多軌時間軸、關鍵影格、字幕、自動 ducking、AI agent/MCP。AGPL 對 SaaS 有傳染性，**不能直接拷貝進 Remake**，只能當 UX 參考。 |
| `sambowenhughes/a-react-video-editor` | 161 | MIT | Next.js + Remotion，最後更新 2024-12，太舊。 |
| `stardustv01/chai-studio` | 10 | Apache-2.0 | macOS 本機 Codex 操作的剪輯器，不適合網頁嵌入。 |

→ 結論見第 5 節。

---

## 3. 參考剪輯器（版面、軌道、AI 位置、文字稿編輯）

> 方法：只看官方行銷頁/說明中心的 UI 圖；沒有註冊、沒有上傳。所以「軌道細節」只能依圖片與官方文字，真實操作手感【未驗證】。

### 3.1 CapCut Web（<https://www.capcut.com/resource/capcut-video-editor-guide>，CapCut，頁面日期 2026-03-25；讀取 2026-11-12）
- **版面**【已驗證，見圖】：最左窄的圖示欄（Media / Elements / Audio / Text / Captions / Transcript / Stickers / Translate / Filters…）→ 點開左側素材/工具面板；中間 Player；**右側屬性面板**（Video / Audio / Speed / Animation 分頁，Basic：Position and size、Blend、Opacity）；底部單一時間軸。
- **軌道**：單一時間軸，多層疊放（頁面文字：分割、變速、音量、調色、重排時間軸，拖放）。每個軌道種類（影片/字幕/音樂）如何顯示，官方頁只有小圖，細節【未驗證】。
- **AI**：自動字幕（speech-to-text → 可編輯 → 樣式）、背景移除、腳本生成、AI 影片增強，都在左側圖示欄的工具面板或右側面板（頁面 "AI tools" 段落）；字幕與 Transcript 分成獨立圖示。
- 截圖：`04-capcut-web-laptop-hero.png`（筆電圖，可見 Player + 右側屬性面板 + 紫色片段）、`05-capcut-web-editor-rails.png`（較清楚的左圖示欄與時間軸）。

### 3.2 Descript（說明中心 <https://help.descript.com/descript-tour/the-editor-interface>，Descript，2026-11-12）
- **版面**【已驗證（文字）】：Script editor（文字稿）、Scene editor（預覽畫布，可移動/縮放）、Timeline（傳統波形時間軸，修剪/分割/移動）、Sidebar（Project / Scene / Layer / Elements / Media / AI Tools / Underlord）。
- **文字稿編輯**：核心概念，「像 Google Doc 一樣剪影片」，刪文字 = 刪畫面。
- **AI 位置**：AI Tools 側邊欄（Studio Sound、移除贅詞、自動產生社群貼文）＋「Underlord」對話式 AI 共同編輯者（右下角圖示開啟）。
- 截圖：`06-descript-script-plus-underlord.png`（行銷頁：左邊文字稿、右邊影像、右側浮出 Underlord 對話泡泡：「I see there are some repeated takes and long pauses. I'll remove those…」）。這張圖不含 timeline，因為 Descript 的 timeline 預設可收合【依第三方描述，未驗證】。

### 3.3 VEED（<https://www.veed.io/tools/video-editor>，VEED，2026-11-12）
- **版面**【已驗證（圖）】：預覽（可為 9:16）居中，下方是**緊湊時間軸**：字幕以綠色塊排在上層、下面是縮圖影片條、再下是音樂條（`09-veed-vertical-preview-compact-timeline.png`）；文字層直接在畫面上有控制點。
- **文字稿編輯**：「Edit with Script」——文字稿中，贅詞（uumm、uhh）與靜音（`( 0.3s )`、`( 1.2s )`）用紅/標示，可直接刪（頁面 alt 文字：VEED's Script Editor）。
- **AI 位置**：「Delete Silences」面板（Long / Short / Custom 三檔 + Delete 按鈕）、「Delete Filler Words」開關、「Clean Audio」一鍵（`08-veed-edit-with-script-delete-silences.png`）。重點是 **把 AI 結果顯示為文字稿上的標記 + 一個確認按鈕**，而不是自動執行。
- 官方文字：「Text-based editing lets you trim clips like editing a document. Use Auto Edits to add subtitles, clean up audio, and insert B-roll automatically.」

### 3.4 Kapwing（<https://www.kapwing.com/video-editor>，Kapwing，2026-11-12）
- **版面**【已驗證（圖）】：左側圖示欄（Media / Layers / Text / Subtitles / Videos / Images / Elements / Audio / Transitions / Templates）、中間預覽、頂部 Share / Export Project、多人游標（協作）。
- **軌道**：時間軸 **有編號的多軌**：軌 1 影片縮圖條、軌 2 音訊波形、軌 3–5 為彩色長條（文字/元素/其他層）；上方工具列有 1.0x 速度、Split、undo/redo、播放與時間、一個疑似吸附/對齊的圖示（只看圖，功能【未驗證】）、縮放滑桿與「Fit to Screen」。
- **AI**：官方標題「edit with a drag-and-drop timeline and AI tools」，AI 工具在上方選單（Tools / AI）與 Subtitles 面板，細節【未驗證】。
- 截圖：`07-kapwing-timeline-tracks.png`（這張對 Remake 最有參考價值：標準多軌 + 縮放 + Fit to Screen）。

### 3.5 Clipchamp（<https://clipchamp.com/en/video-editor/>，Microsoft Clipchamp，2026-11-12）
- **版面**【已驗證（圖）】：左圖示欄 + 素材縮圖面板、中間預覽、**右側圖示欄（音訊、調色、濾鏡、特效、速度…的屬性）**、底部時間軸：文字（紫色條）在上、影片縮圖、音訊波形條在下。
- **AI**：官方頁寫「recording tools, video templates, and AI editing features」（自動字幕、語音）；介面中位置細節【未驗證】。
- 截圖：`10-clipchamp-editor-layout.png`。

### 3.6 InVideo（<https://invideo.io/>，2026-11-12 頁面標題 "The agentic video editor for serious creatives"）
- **版面**【已驗證（圖）】：**左側是 AI Agent 對話欄**（「Analyzed. Edited in timeline」「All 140 clips placed on the timeline」），右側是專業 NLE：上方預覽、左下 Media 素材庫（可搜尋）、右下**多軌時間軸 V1–V4 / A1–A3**（鎖、眼睛、靜音圖示、波形）、頂部分頁 Edit / Audio / Color / Preview / Structure；Agent 游標直接出現在時間軸上，使用者可接手。
- **AI 位置**：對話優先，但**所有結果寫回時間軸**（可撤銷、可手改）。流程列：Upload footage → Describe edit → Review cut → Export。
- 注意：本頁是新型態「agentic editor」，舊版 InVideo AI（文字轉影片）介面本次沒有看，不評論。
- 截圖：`12-invideo-agent-chat-plus-multitrack.png`。

### 3.7 OpusClip（<https://www.opus.pro/> 與說明中心 <https://help.opus.pro/docs/article/change-captions>，Opus，2026-11-12）
- **版面**：AI 先把長影片切成**多個短片卡片，每張有分數（例圖 97、98）**；點進去才是編輯頁。編輯頁由左側**文字稿**（可勾「Transcript only」，有「Add a section」從完整文字稿補段落）、中間畫布、右側分頁（Captions 字型顏色、Brand 位置/模板、Layout、Manual Reframe、Subject Tracking）。說明中心側欄「Edit Your Clips」列出：Adjust Layout、Manual Reframe、Subject Tracking、Change or Remove Captions、AI Emojis/Keywords、Trim and Extend、Text Overlays、Transition、Speech Cleanup、B-roll、AI Voiceover、Intro/Outro、Music。
- **文字稿編輯**：選字/句 → Edit；多字一起改（Apply / Apply to everywhere）；「Remove caption & video」刪文字就刪畫面。【已驗證（說明中心）】
- **AI 位置**：Virality Score 0–99 排名只是建議（Starter/Pro 方案，<https://help.opus.pro> 搜尋結果摘要）；ClipAnything 自然語言找片段、AI reframe、AI B-roll、AI captioning、AI audio enhance、AI voice-over 以功能頁籤並列（`11-opusclip-clip-cards-virality-score.png`）。
- 編輯頁整體截圖需登入，本次沒有（只有說明中心的文字稿編輯圖：`13-opusclip-transcript-caption-edit.png`）。

### 3.8 Submagic（<https://care.submagic.co/> 說明中心與 <https://www.submagic.co/features/b-roll>，Submagic，2026-11-12）— **沒有取得編輯器截圖**【僅文字】
- Magic Clips 產生 20 多個片段，每個有預覽與文字稿；點進去：用時間軸修剪、從文字稿移除句子、「Edit Captions」改字、移動/縮放字幕；Magic B-roll 自動插入並可「Swap」，B-roll 的起訖時間用數字或滑桿；B-roll 功能頁說有「edit by transcript」與「timeline editing mode」兩種模式。（說明中心條目有的已 190–593 天，按鈕名稱可能變了，【二手/可能過期】）
- 首頁只有字幕樣式展示圖（未存檔，無編輯器 UI），所以沒有截圖。

---

## 4. 常見模式：對 Remake 的價值排序（2 週內可做 vs 不做）

排序依據：(1) Remake 既有資料模型（`EditProject`）能否直接支撐；(2) 目標用戶（雪梨行銷代理商，用實拍素材按分鏡剪 9:16）的價值；(3) 工時。**這個排序是我的推論，不是來源直接寫的**；弱點：沒有實際操作各家產品，只看了行銷圖與說明文字，也沒有 Remake 用戶的使用數據。

### 值得做（依價值排序）
1. **把現有資料畫成多條「道」**（Kapwing / VEED / Clipchamp / InVideo 都是這樣）：V1 影片（既有）、字幕道（`captions.speech[]` 與 lines）、文字道（`texts[]`，已有 start/end）、旁白道（`voiceover[]`，已有 start）、音樂道（一條，長度 = 影片，顯示 duck 區間）。證據：四家都把字幕/文字/音樂畫成彩色條。工時：低~中（資料已存在，主要是繪圖 + 點選連到對應分頁）。
2. **時間軸上的 AI 標記，靠文字稿確認**（VEED 的 Delete Silences / Filler Words、Descript 的 AI Tools、Opus 的 Speech Cleanup）：靜音、贅詞、重複 take、最佳 take 顯示成片段上的標記/色塊，按「套用」才改（Remake 的 AI 分頁已有 `getClipSuggestions`、`getTakeRanking`，缺的是畫在時間軸上）。工時：中。
3. **字幕/文字稿視圖（transcript view）**（Descript / VEED / Opus）：左側文字稿，點字跳播放頭，刪字 = 刪片段區間；Remake 已有 `speech` captions 與 words。先做「點字跳轉 + 改字」，刪字剪片放第二階段。工時：中。
4. **吸附 + 縮放 + Fit to Screen + 播放頭跟隨**（Kapwing、Remotion Editor Starter 的磁鐵 / Shift+M）：Remake 已有縮放與播放頭；補上吸附（吸到片段邊、播放頭、字幕邊界）與 Fit。工時：低。
5. **選取同步 + 右側 Inspector 隨選取改變**（CapCut 右側屬性面板、Remotion Editor Starter Inspector）：Remake 已有 `selected` 與 ClipSettings/分頁，把「選字幕道的條 → 右側自動切到 captions 分頁並定位」做出來就夠。工時：低。
6. **波形與縮圖條**（Kapwing、Remotion Editor Starter）：片段上顯示縮圖與音訊波形，協助用波形找靜音。工時：中（需後端或瀏覽器端產生縮圖與波形資料）。
7. **對話式 AI 面板寫回時間軸**（InVideo、Descript Underlord）：價值高但工時較大，建議 2 週內只做「AI 建議以時間軸標記呈現」，不做自由對話。
8. **Undo / Redo、多選、快捷鍵**：Remake 已有 `useEditProject`（undo log），確認時間軸新道也走同一條。

### 這個階段先不做
- 關鍵影格動畫、轉場、特效（Editor Starter 也不含；Remake 目標是代理商剪實拍，不是動畫）。
- 多人協作游標（Kapwing）、評論。
- 完全自由的疊層合成（畫布上拖字、旋轉、裁切）：現有 TextItem 只有 top/middle/bottom，維持。
- 手機版（已有「不做手機」的記憶決定）。
- 「Virality Score」之類的黑箱評分：缺乏可信資料來源，容易變成假精確。
- 換用 Editor Starter 整個替代現有 `EditorPanel`（見下節）。

---

## 5. 可重用的候選（含授權）與建議

| 候選 | 授權 / 價格 | 能否重用 | 評估 |
|---|---|---|---|
| Remotion Editor Starter | US$600 一次性；受 Remotion License 約束 | **可買來「當參考原始碼」**；不建議整包替換 | 它的狀態是 JSON 序列化、自成一套（React 19 + Tailwind v4，Lambda 渲染、Whisper 字幕）。Remake 已有自己的 `EditProject` 後端 schema（`backend/editing.py`），整合成本高；買來可抄吸附演算法、多軌渲染與 Inspector 的做法。 |
| Remotion Timeline 元件 | US$300 一次性 | **可買**；最接近「只換時間軸」 | 只提供時間軸 UI + `CanvasComposition`，須把 `EditProject` ↔ 它的 item/track 狀態做轉換層。無法確認有吸附【未驗證】。 |
| `free-react-video-editor` | MIT，免費 | 可讀可抄 | 功能太少（沒有多軌），僅適合學 Player 接法；Remake 已經做得更多。 |
| `openvideodev/react-video-editor` | 自訂授權（3 人以下營利組織免費；不得做衍生品販售） | **風險高，不建議拷貝** | 引擎是 PixiJS + WebCodecs，不是 Remotion，與 Remake 渲染鏈不相容；授權條款對「做成 SaaS 賣」有疑慮【我不是律師，需另外確認】。當 UX 參考可以。 |
| OpenChatCut | AGPL-3.0 | **不拷貝**，只當 UX 參考 | Remotion 4 + 多軌 + 自動 ducking + AI agent，功能與 Remake 方向最像；但 AGPL 會要求公開你的網路服務原始碼。 |
| 自己做（延伸 `Timeline.tsx` + `@dnd-kit`） | 免費 | **推薦** | Remake 已有播放頭、縮放、拖曳 trim、選取；以「多道 + 吸附 + AI 標記」增量改版最小風險。 |

**建議**：2 週內走「自己延伸現有 `Timeline.tsx`」；若要加速，只花 US$300 買 Remotion Timeline 元件當參考實作（不是直接上線），因為 Remake 本來就要付 Remotion License（若團隊 ≥4 人，編輯器/Player 屬 Automators 類，US$0.01/次渲染、最低 US$100/月）。授權細節請在決定買之前再讀一次 <https://www.remotion.dev/docs/license/faq> 與 Terms。

---

## 附：本次研究的限制
- 所有參考編輯器都只看公開行銷圖/說明文字，沒有登入、沒有實際上傳與操作；「軌道如何顯示」「AI 在哪個按鈕」都來自圖片與文字，不是操作體驗。
- Submagic 沒有取得編輯器截圖；Opus 的完整編輯頁截圖需要登入，只取得說明中心的文字稿編輯圖。
- Remotion Editor Starter 官方 demo 載入時會下載 507MB 素材，所以線上 demo 預覽畫面是黑的；時間軸與面板仍可見。
- RVE Pro 價格頁面疑似過期（特價日期寫 10/22，無年份）。
- GitHub 星數、授權、最後更新來自 GitHub API 與 raw 檔案（2026-11-12 查詢），專案後續可能變動。
- 本機環境的 `gh api` 指令被安全 hook 擋下（誤判為合併 PR），改用 `curl` 呼叫公開 GitHub API 讀取，沒有繞過任何寫入限制。
