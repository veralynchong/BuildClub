# 分鏡原型：GitHub 開源專案研究

> 查詢日期 **2026-11-02**（所有 stars / push / license 皆為該日 `gh api` 快照）。方法：`github-research` skill。
> 範圍：(a) 影片 → 鏡頭偵測 → 分鏡/shot list/腳本；(b) 有逐鏡頭重生/編輯 UI 的 AI 分鏡工具；(c) React Flow/xyflow 類節點畫布。
> 已由前一份報告涵蓋、本次不重查：PySceneDetect、yt-dlp、faster-whisper/whisperX、ViralMint、Mharis-code/videoanalyzer、zthisgood/hot-video-recreate、HUANGCHIHHUNGLeo/claude-real-video、Agent-Field/reels-af、ShortGPT、remotion。
> 標記：[V]=本次 gh/curl 實際取得；[2nd]=來自某 repo 自己的文件（第二手，未獨立驗證）；[?]=未驗證。

## 0. 一句話結論

1. **bucket (a) 沒有成熟的大型專案**。能找到的都是 2026 年才出現、stars < 200 的 agent skill / CLI（ffmpeg 抽幀 + VLM 逐鏡頭描述 → JSON），可借的是 **prompt 與 schema，不是程式碼**。其中 `huige-opc/video-mirror` 的 `analyze_shot.md` 欄位幾乎等於我們要的卡片（時間、畫面、畫面文字、字幕、口白）。
2. **bucket (b) 的大專案全是「劇本→AI 短劇」方向**（Toonflow 20k★、waoowaoo 14.7k★、ViMax 12.8k★ …），不是「參考影片→換產品」。但它們的 **shot schema、逐鏡頭重生 API、審批閘門** 非常值得借。授權是大雷區：多數是 Elastic-2.0 / AGPL / 非商用。
3. **bucket (c)：xyflow 是 MIT、但對我們是新依賴**；半天原型的分鏡卡不需要節點畫布，**橫向卡片列/網格就夠**。

## 1. Top 12 對照表

| # | 專案 | ⭐ | 最後 commit | License | 技術棧 | 桶 | 可借什麼 | 判定 |
|---|---|---:|---|---|---|---|---|---|
| 1 | [huige-opc/video-mirror](https://github.com/huige-opc/video-mirror) | 10 | 2026-08-15 (push) | MIT | Python 腳本 + prompts (PyAV, Pillow, ffmpeg) | a | `prompts/analyze_shot.md`（逐 scene JSON schema）、`apply_sop.md`（把拆出的 SOP 套到新主題，產同 schema 的逐鏡頭腳本）| **borrow（prompt+schema）** |
| 2 | [wocha-xiaoli/video-shot-analysis-feishu](https://github.com/wocha-xiaoli/video-shot-analysis-feishu) | 43 | 2026-04-25 | MIT | Python, ffmpeg skill | a | ffmpeg 切點 → `shots.json/csv` + `analysis_prompt.md`；欄位表（景別/運鏡/轉場/字幕台詞/聲音…）| borrow idea |
| 3 | [phantronggiap/deepscene](https://github.com/phantronggiap/deepscene) | 2 | 2026-05-14 | MIT | Python CLI, yt-dlp+ffmpeg+Gemini Flash | a | pipeline：ffmpeg scene-change 取幀 → 音訊分段 → Gemini 視覺 → 合成 storyboard.json；vision/audio 結果快取 | borrow idea（太新、2★）|
| 4 | [keng1304/video-breakdown](https://github.com/keng1304/video-breakdown) | 7 | 2026-04-18 | MIT | Python, TransNetV2 + RAFT + Claude Vision | a | 每鏡 JSON（shot_size, camera_motion, zh_description, 反推 prompt）；README 自報成本約 US$0.87/支 [2nd] | skip（Apple Silicon only、重）|
| 5 | [UVA-Computer-Vision-Lab/OmniShotCut](https://github.com/UVA-Computer-Vision-Lab/OmniShotCut) | 342 | 2026-11-01 | MIT | PyTorch，`pip install` | a | 神經網路鏡頭邊界偵測，聲稱可辨 dissolve/fade/wipe 轉場 | skip（要 GPU；ffmpeg/PySceneDetect 夠用）|
| 6 | [soCzech/TransNetV2](https://github.com/soCzech/TransNetV2) | 1,072 | 2023-12-04（stale） | MIT | TF/PyTorch | a | 業界 SBD 基準；僅供對照 | skip |
| 7 | [xeronsh/openOii](https://github.com/xeronsh/openOii) | 412 | 2026-11-01 | **無 LICENSE** | React 18 + @xyflow/react 12 + zustand + Vite；FastAPI | b+c | **最接近我們的樣本**：shot schema、`PUT/PATCH/approve/regenerate/delete /shots/{id}`、`preserve_ids` 增量重生、`[focus:type:id]` 選取→agent 上下文、15 階段 6 審批閘門；`docs/research/canvas-evaluation.md` 有 xyflow vs tldraw/Konva/自研的實測 | **borrow idea（無 license，不可複製碼）** |
| 8 | [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | 12,816 | 2026-09-30 | MIT | Python, LangChain, Pydantic | b | `agents/storyboard_artist.py` prompt + `interfaces/shot_description.py`（Pydantic：visual_desc / audio_desc / cam_idx；首幀/末幀/動作三段式分解）| **borrow（prompt+schema，MIT 可用）** |
| 9 | [ArcReel/ArcReel](https://github.com/ArcReel/ArcReel) | 6,037 | 2026-11-01 | **AGPL-3.0** | **React 19 + Vite + zustand + @dnd-kit**；Python | b | 技術棧最像我們；segment_id 逐段重生（`generate_storyboards(segment_ids=[…])`）、審圖子 agent；`docs/research/storyboard-to-video-industry-survey.md` | borrow idea（AGPL 不能抄碼）|
| 10 | [HBAI-Ltd/Toonflow-app](https://github.com/HBAI-Ltd/Toonflow-app) | 20,148 | 2026-10-31 | MIT | Vue + Node/TS monorepo（apps/web, server, desktop）| b+c | 「無限畫布 + 節點編輯 + 分鏡」產品形態參考（topics 含 infinite-canvas, node-based-editor, storyboarding）| borrow idea（Vue；README 未逐一核對）|
| 11 | [dramaclaw/dramaclaw](https://github.com/dramaclaw/dramaclaw) | 6,843 | 2026-10-30 | **Elastic-2.0**（license-inventory.csv）| **React 19 + @xyflow/react 12 + react-konva**；FastAPI | b+c | 現成 React19+xyflow 畫布 + `schemas/workflow/v1`（workflow JSON schema）| borrow idea（Elastic-2.0 禁止託管成服務）|
| 12 | [xyflow/xyflow](https://github.com/xyflow/xyflow) | 38,860 | 2026-10-29 | MIT | TS；React Flow v12.12.0 / Svelte Flow | c | 節點 UI 標準庫；Langflow、openOii、dramaclaw、AdCraft 都用 | **use（若真的要畫布）；半天原型 skip** |

### 也有出現（未進主表）
- [GML-MMGroup/AdCraft](https://github.com/GML-MMGroup/AdCraft) 562★ / 2026-10-31 / **「PERSONAL AND NON-COMMERCIAL LICENSE」**（LICENSE 檔首行）— 廣告影片 agent + 無限畫布，React 19 + @xyflow/react 12 + @dnd-kit。**我們是商用，不可用**，只能看 UX。其 GitHub 描述含「拉片復刻」，但 README 內文 grep 不到「拉片」[V]，功能細節未驗證。
- [waooAI/waoowaoo](https://github.com/waooAI/waoowaoo) 14,737★ / 2026-09-21 / Elastic-2.0 — 工業級 AI 影視平台，TS。
- [Forget-C/Jellyfish](https://github.com/Forget-C/Jellyfish) 7,087★ / last commit 2026-04-20 / Apache-2.0 — 短劇工作台，React 18 + FastAPI。
- [xuanyustudio/LocalMiniDrama](https://github.com/xuanyustudio/LocalMiniDrama) 2,313★ / 2026-10-30 / MIT — Electron+Vue 本地短劇。
- [869413421/ai-moive-studio](https://github.com/869413421/ai-moive-studio) 1,650★ / 2026-09-16 / Apache-2.0 — Vue + Konva 無限畫布工作流。
- [bkingfilm/lapian-notes](https://github.com/bkingfilm/lapian-notes) 740★ / 2026-10-26 / MIT — **React 19 + Vite（與我們同棧）**，電影「拉片」筆記：1 秒抽幀、打包給任意 AI、結果匯回成時間軸，播放器時間點聯動。偏電影學習，不是改編；可借「抽幀→打包→匯回」與「邊播邊編」互動。
- [SamurAIGPT/Vibe-Workflow](https://github.com/SamurAIGPT/Vibe-Workflow) 636★ / 2026-09-17 / MIT — 自稱 Weavy/Krea Nodes/Flora 開源替代品；Next 16 + React 19 + **reactflow v11**。
- [opencanvasai/OpenCanvas](https://github.com/opencanvasai/OpenCanvas) 45★ / 2026-07-16 / MIT — React 19 + @xyflow/react 12 + Vite（Higgsfield/Weavy/Comfy 替代，BYOK）。
- [king5012996533/sceneflow](https://github.com/king5012996533/sceneflow) 3★ / AGPL-3.0 — 劇本→分鏡→節點畫布，Next 16；專案太新。
- [wonderunit/storyboarder](https://github.com/wonderunit/storyboarder) 3,903★ / 2024-03-17（stale）/ GitHub 無偵測 license — 手繪分鏡 Electron app，與 LLM 改編無關。
- [HVision-NKU/StoryDiffusion](https://github.com/HVision-NKU/StoryDiffusion) 6,491★ / 2024-09-26 / Apache-2.0 — 研究碼（角色一致性生圖），非編輯 UI，skip。
- [langflow-ai/langflow](https://github.com/langflow-ai/langflow) 156,231★ / 2026-10-30 / MIT — 前端同時依賴 `@xyflow/react ^12.3.6` 與 `reactflow ^11.11.3` [V]。可作「xyflow 在大型產品可行」的佐證。
- [Comfy-Org/ComfyUI_frontend](https://github.com/Comfy-Org/ComfyUI_frontend) 2,111★ / 2026-11-02 / **GPL-3.0**，Vue 3 + 內嵌 litegraph（2025-08 起 litegraph 併入此 repo，舊 repo Comfy-Org/litegraph.js README 標示 archived）— 不可借碼（GPL + Vue）。
- [jagenjo/litegraph.js](https://github.com/jagenjo/litegraph.js) 8,176★ / last commit 2024-01-08 / MIT — Canvas2D，無 runtime deps（package.json 僅 devDependencies [V]），但已停更。
- [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) 55,542★ — **README 標示 "Flowise has been archived"**（API 的 archived 欄位為 true）[V]，不要選。
- [tldraw/tldraw](https://github.com/tldraw/tldraw) 51,183★ — license 為 tldraw 自家（非 OSI）；openOii 文件稱生產環境無 key 會在 5 秒後停止渲染 [2nd]。
- 其他：drawflow（jerosoler/Drawflow，6,169★，MIT，**Vanilla JS 無依賴**，last push 2024-10-19）、Rete.js（retejs/rete 12,300★，MIT，2026-10-25）。

## 2. 重點專案筆記

### video-mirror（最值得借的 prompt）
- 流程：下載 → 抽音訊 + ASR → `detect_scenes.py` 抽幀/切 scene → 代表幀 → shot list → SOP → 蒸餾報告。僅依賴 PyAV + Pillow + 系統 ffmpeg。
- `prompts/analyze_shot.md` 的逐 scene JSON：`scene_id, start, end, shot_type, composition, subject_action, background, on_screen_text, subtitle, voiceover, audio_cue, transition, emotion_tone, notes`。硬規則：「只描述看得見的」「看不清就寫 null」「voiceover 由 transcript 補」。
- `prompts/apply_sop.md`：輸入 sop.json + 新主題 → 輸出「與 shot_list.json 完全對齊」的逐鏡頭腳本；規則含「結構/節奏對齊、鏡頭數 ±20%、不得抄原文案」。這正是「把參考影片改編成客戶產品」的 prompt 骨架。
- 弱點：10★、2026 年新建、無社群驗證；中文 prompt；輸出品質未實測 [?]。有 `references/originality-guardrails.md`（原創性邊界，可參考版權風險措辭）。

### openOii（最接近的 React + xyflow 實作樣本）
- 授權：GitHub 偵測為無 license [V] → 預設保留所有權利，**只能學設計，不能複製碼**。README 自稱「學習/演示專案，不適合生產」。
- shot 欄位（取自 `engine/src/prompts.ts` plan prompt）：`order, scene, action, expression, camera, lighting, dialogue, sfx, duration, description, image_prompt, video_prompt, characters_in_frame, continuity`。
- 逐鏡頭操作：後端路由有 `update_shot (PUT/PATCH)`、`approve_shot`、`regenerate_shot`、`delete_shot`。增量模式用 `preserve_ids`（未列出的項目會被刪除、id=null 為新增）+ `user_feedback` 前綴 `[focus:type:id]` 把使用者選取綁定到 LLM 上下文。
- `docs/research/canvas-evaluation.md`（2026-10）實測：React Flow 57 KB gzip（含 React 18 共 103 KB），108 節點掛載約 330 ms、平移 60 fps；tldraw 599 KB；Konva 90 KB；自研 DOM 畫板 6–8 KB 但「選取/拖曳/連線/鍵盤全要自寫」[2nd，作者自測，我未重跑]。
- 弱點：412★、單人專案、中文。

### ViMax（MIT，可直接借 prompt/schema）
- `agents/storyboard_artist.py`：system prompt 含 Role/Task/Input/Output/Guidelines，規則如「一鏡一句台詞」「描述畫面中元素位置與朝向」「新鏡頭先考慮能否沿用既有 camera」。第二步 prompt 把鏡頭描述拆成 **首幀 / 末幀 / 動態**。
- `interfaces/shot_description.py`（Pydantic）：`idx, is_last, cam_idx, visual_desc, audio_desc`（另有被註解掉的 speaker/line 欄位）。
- 用 LangChain `PydanticOutputParser` + tenacity retry；我們可改用 JSON mode / tool-use 結構化輸出，不需 LangChain。
- 弱點：方向是劇本 → 影片，不是參考影片改編；agent 管線重。

### xyflow
- `@xyflow/react` 12.12.0，MIT，npm unpackedSize 約 1.2 MB（含 sourcemap 等，非 bundle 大小）[V: registry.npmjs.org]；runtime deps：`zustand ^4.4.0`、`classcat`、`@xyflow/system 0.0.83`；peer `react >=17` [V]。React 19 可用（dramaclaw、AdCraft、OpenCanvas 皆 React 19 + xyflow 12 [V: 各自 package.json]）。
- bundle 約 57 KB gzip 為 openOii 自測 [2nd]。**對 BuildClub 而言是新依賴**（目前 React 19 + Vite，無 UI 庫）；依 CLAUDE.md 全域規則需先經你核准才能加。

## 3. 對「半天分鏡原型」的建議

- **不需要節點畫布。** 分鏡卡 = 一列/網格卡片；逐卡 regenerate / 手動編輯 / 刪除 / 排序。節點畫布的價值（跨節點資料流、連線）在此用不上。若日後要「多版本分支」「素材→場景連線」再評估 xyflow。
- **Schema 起點**（合併 video-mirror 與 openOii，欄位對應你的需求）：
  `scene_id, start, end, shot_type, subject_action, on_screen_text, voiceover(口白), transition, notes` ＋ 改編後 `adapted: {subject_action, on_screen_text, voiceover}` ＋ `locked/approved`。
- **Prompt 起點**：分兩段，(1) 分析（video-mirror `analyze_shot.md` 概念，輸入代表幀 + 該段 whisper 逐字稿；規則「看不清寫 null」）；(2) 改編（`apply_sop.md` + ViMax 的 guideline；輸入 SOP/卡片 + 客戶產品資料，輸出同 schema；單卡重生時帶入前後鏡頭與 `[focus:scene_id]`，其他卡 preserve）。
- **本地管線**：ffmpeg `select='gt(scene,0.3)'` + `showinfo` 取切點與幀（deepscene、wocha-xiaoli、whaojie797-design/video-reverse-engineering 都用 ffmpeg/場景偵測抽幀；具體閾值在各自 repo 為 [?]）+ whisper.cpp 逐字稿依時間戳對進各 scene。VLM 看幀用 Claude/Gemini 皆可（付費 API 須你逐次核准，這份報告沒呼叫）。

### 零依賴節點畫布可行嗎？
- 可行，**但只在你確實要連線時才值得**。做法：容器 `div` 用 `transform: translate(x,y) scale(s)` 做 pan/zoom，節點是 `position:absolute` 的 div，連線是一層全幅 `<svg>` 內的 `<path d="M x1 y1 C …">`，端點座標由節點 `getBoundingClientRect`/state 算出。拖曳用 pointer events。粗估 100–200 行（我的估計，非來源）。
- 外部佐證：openOii 評估「自研 DOM 畫板 6–8 KB 但框選/多選/連線/鍵盤/無障礙要全自寫」[2nd]；Drawflow 是 Vanilla JS 無依賴 [V: README]，但 last push 2024-10-19 且是 imperative DOM API，與 React 19 狀態管理不好整合；litegraph.js（Canvas2D）last commit 2024-01-08。
- 結論：分鏡原型用 CSS grid 卡片即可；若一定要畫布感，先 SVG+div 自刻（<200 行），確認需求後才換 xyflow。

## 4. 授權速查（對商用 SaaS 很重要）

| 可借碼 | 僅借想法（授權/狀態限制）|
|---|---|
| MIT：ViMax、video-mirror、xyflow、Toonflow-app、lapian-notes、wocha-xiaoli、deepscene、Vibe-Workflow、OpenCanvas、langflow | 無 license：openOii、storyboarder(未偵測)；AGPL-3.0：ArcReel、sceneflow、CozyClay；Elastic-2.0：dramaclaw、waoowaoo；非商用：AdCraft（PERSONAL AND NON-COMMERCIAL）、crashtestoz/storyboard（CC BY-NC-SA）；GPL-3.0：ComfyUI_frontend、OpenShotDesigner；tldraw 自家授權；Flowise 已 archived |

## 5. 涵蓋範圍與限制

**查詢（gh search repos，皆 `--sort stars`，間隔 2 秒）**：video storyboard generator · video to storyboard · shot detection storyboard(0) · TransNetV2 · video shot list generator LLM(0) · video scene captioning VLM storyboard(0) · storyboard AI · ai storyboard editor · script to shots video AI(0) · shot list · viral video breakdown shot(0) · video analysis gemini shot by shot(0) · reference video recreate scenes LLM(0) · scenedetect storyboard llm(0) · 分镜 · 分镜 AI 视频 · storyboard · storyboarder · StoryDiffusion · ViMax · AI short drama …(0) · MoneyPrinterTurbo · Pixelle-Video · shot boundary detection · video breakdown skill · video reverse engineering shots keyframes(0) · video to script · viral video analyzer · 拉片 · video-analysis gemini · video shot analysis · shot-by-shot video · xyflow · reactflow ai …(0) · weavy · flora ai canvas(0) · ai canvas workflow · infinite canvas workflow · litegraph · ComfyUI_frontend · langflow · flowise · tldraw · node editor · 以及 `--topic storyboard`、`--topic shot-boundary-detection`；零結果的多詞英文查詢多半是 gh 搜尋對長詞組的 AND 匹配過嚴，不代表主題不存在。
**其他驗證**：`gh api repos/<r>`（metadata）、`/license`、`/readme`、`/commits?per_page=1`、`/releases`、`contents/package.json`；`curl registry.npmjs.org/@xyflow/react/latest`。

**限制 / 可能漏掉**
- 搜尋以英文+簡中為主；韓/日/西語專案、未加 topic 的專案可能漏。
- 這個領域 2026 年 stars 暴增快（Toonflow 2026-01-29 建立、20k★；waoowaoo 2026-01-22 建立、14.7k★），**強烈爆發但 forks/issues 數看來正常**（Toonflow 3,624 forks / 2 open issues；waoowaoo 3,200 forks / 145 issues）。Toonflow open issues 只有 2 偏低但未見其他洗星訊號；我不下結論，僅註記。
- bucket (a) 的小專案（<50★）都是 2026 年新建、單人維護，穩定性與輸出品質**全未實測**（我沒有執行任何一個）。
- 沒找到「開源的 Weavy / Flora 正版替代」的高星專案；最接近是 Vibe-Workflow（636★）與 OpenCanvas（45★）。
- 未讀完 Toonflow / waoowaoo / dramaclaw 的原始碼；對其前端的描述來自 package.json、topics 與 README 摘要。
- 未呼叫任何付費 API，未讀 .env，未修改既有檔案。
- 速率限制：無 403/429，未影響深度。
