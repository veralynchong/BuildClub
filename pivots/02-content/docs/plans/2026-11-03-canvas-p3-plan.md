# Remake 節點畫布 P3（剪輯器）執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 畫布右側抽屜變成真的剪輯器：Remotion Player 預覽、單軌時間軸（從畫布拖影片節點進來、修剪、分割、刪除、排序、每段音量 / 靜音）、出片寫到現有的 `media/<ideaId>/cut/final.mp4`（同一筆 cut 紀錄，審閱連結和發布不用改）；再加上文字、字幕（預設用 shot 台詞，有旁白後跟 whisper 逐字）、音樂、品牌、旁白（錄音 / 上傳 / ElevenLabs，ElevenLabs 只做 adapter + mock）。

**本計畫分兩段，同一個檔案〔我的決定，可推翻〕：**
- **P3a（Task 0–7）：** 出片管線 + 時間軸 + 片段 + 出片接審閱連結。單獨可出貨：只有片段的成片也能送審、發布。
- **P3b（Task 8–12）：** 文字、字幕、音樂、品牌、旁白。疊在 P3a 上。
理由：全部 13 個 task，超過約 10 個的門檻；P3a 本身已經是 demo 那條路（選 shot → 分鏡圖 → 影片 → 拖進時間軸 → 出片）。

**Architecture：**
- **一份 composition 兩處用。** `src/remotion/Reel.tsx` 是唯一的畫面定義：抽屜裡的 `@remotion/player` 直接用它預覽；伺服器出片時 `render/render-reel.mjs`（Node）用 `@remotion/bundler` 打包 `src/remotion/index.ts`、`@remotion/renderer` 的 `renderMedia` 出片。所有「時間軸 → 畫面」的計算（片段起點、字幕分頁、台詞平均分配）都是 `src/lib/editor/*.ts` 的純函式，composition 從 input props 自己算，Python 不重算，所以預覽和成片一致。
- **剪輯專案 JSON** 每個 plan 一份，存 SQLite `edit_projects`（帶版本號，照 canvas 的 409 模式），由新模組 `backend/editing.py` 驗證、解析素材、算簽章、組 render input、跑子程序。
- **出片走現有的 `renders` 列與 `RenderJobs` 單一 worker 執行緒**（不在 request thread 上），列多一欄 `source`（`auto` = 舊 Make the video，`editor` = 新剪輯器）。成功才 `os.replace` 到 `final.mp4`。`is_stale` 依 `out_source` 分流，所以 `cut_review.py`、`publishing.py` 的呼叫點不用改。前端進度沿用 `lib/cut.ts` 的 `pollCut`。
- 旁白的 ElevenLabs 走 P2 的 `gen_providers` adapter 介面與 `generations` 工作表（新 kind `voice`、新錢包 `gen_voice`）。

**Tech Stack：** FastAPI、SQLite、ffmpeg / ffprobe、whisper.cpp（現有）、Pillow（現有，只在 fallback 用）、pytest、React 19、TypeScript、Remotion（`remotion`、`@remotion/player`、`@remotion/captions`、`@remotion/renderer`、`@remotion/bundler`〔待使用者同意，見 Task 0〕）、`node --test`、headless playwright-core。

**Spec：** `pivots/02-content/docs/specs/2026-11-02-node-canvas-editor-design.md`（本計畫實作 §10 的 P3 列；引用 §8、§9、§11、§11.5 第 1、2、6、9、10 條、§11.6、§13）。前一階段：`pivots/02-content/docs/plans/2026-11-03-canvas-p2-plan.md`。

## Global Constraints

- 路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明 repo 根目錄。
- **分支：** P3a 在 `feat/canvas-p3-editor`（疊在 `feat/canvas-p2-models`，PR #29，未合併）；PR 開到 `veralynchong/BuildClub`，**base = `feat/canvas-p2-models`**。P3b 從 P3a 的 head 開 `feat/canvas-p3b-editor-media`，PR base = `feat/canvas-p3-editor`〔我的決定〕。不 force-push、不 push main。**PR 開好就停：只有使用者對該 PR 明說「merge」才合併。**
- **不花錢（spec §10：P3「不花」）。** 不讀 `.env`、不 source `api-keys.fish`、不設 `ELEVENLABS_API_KEY` / `FAL_KEY` / `GEMINI_API_KEY`。ElevenLabs adapter 只用假 HTTP 測；瀏覽器檢查只用 mock 模型與 mock 旁白。Remotion 出片是本機運算，不花錢。
- **依賴（使用者 2026-11-03 同意）：** `remotion`、`@remotion/player`、`@remotion/captions`，計時實驗選伺服器出片時加 `@remotion/renderer`。全部用 `--save-exact`、**同一個 Remotion 版本**、該版本發佈日 ≤ 2026-10-20（至少兩週）。`@remotion/bundler` 不在同意清單內但伺服器出片必須用 → Task 0 先問使用者（見 Task 0）。不加 `zustand` / `zundo` / 其他 npm 套件；不加 pip 套件。`@remotion/renderer` 第一次出片會下載 Chrome Headless Shell（約 100 MB，放在 `node_modules` 底下）。
- **`node_modules` 是 symlink 到 blenny worktree（`/Users/tommy/orca/workspaces/BuildClub/blenny/...`）。** 任何安裝都不能寫進 blenny。拆 symlink 只用 `unlink node_modules`（**絕對不要 `rm -rf node_modules/`**，結尾斜線會刪到 blenny 的內容）。`backend/.venv` symlink 不動。
- **Remotion 授權：** 個人與 3 人以下公司免費，更大的公司要買公司授權。記在「給使用者的決定」，不擋工作。
- **機器：** 這台 Mac mini（demo 機），Node v26。計時門檻（spec §11.5 #9）：30 秒 9:16 出片 2 分鐘內完成，Noto Sans TC 中文字與聲音正確。本計畫**假設伺服器出片**；不過門檻時照文末「Fallback」改。
- **成片規格：** 1080×1920、30fps、H.264（yuv420p）+ AAC 48 kHz，一律有音軌（`enforceAudioTrack`）。任何來源（不同尺寸、fps、有無聲音、.mov）都由 composition 以 `objectFit: cover` 填滿 1080×1920。
- **成片只有一支（§11.5 #1）：** 寫 `media/<ideaId>/cut/final.mp4`，同一筆 `renders` 列。舊「Make the video」P3 保留，兩者共用 `RenderJobs` 佇列與 `BUSY` 檢查，後寫的算數；P4 移除舊的。舊管線的剪口頭禪、調色不套在新剪輯器的片段上。
- **上限〔我的決定，可推翻〕：** 時間軸總長 ≤ 180 秒、片段 ≤ 100、文字 ≤ 30 段（每段 ≤ 120 字）、旁白 ≤ 20 段（每段 ≤ 120 秒、≤ 20 MB）、最短片段 0.2 秒、片段音量 0–2（1 = 原音）、出片逾時 600 秒。
- **錢包：** 新 `gen_voice`，環境變數 `DAILY_GEN_VOICE_USD`，預設 **0.30**〔我的決定，可推翻〕。`bin/isolated-backend.sh` 設 0。金鑰環境變數名 `ELEVENLABS_API_KEY`。
- 文案走 `t()`：新檔 `src/lib/strings/editor.ts`（在 `src/lib/i18n.ts` 註冊），key 以 `editor.` 開頭，en + zhHant；畫布節點上的新按鈕用 `canvas.` key 放 `canvas.ts`。樣式只用既有 token，新檔 `src/styles/editor.css`，class 前綴 `cv-ed-*`。**只做 1440 桌面**（使用者已免 390）。
- 後端錯誤訊息照慣例寫英文一句話；子程序的 stderr 只印 server log（最後 200 字放進 `CutError` 前要先過濾路徑），不把整段 stack 回前端。
- **Port：** 測試只用 8871。不碰 8811、8805、8850（8850 是客戶 demo）。瀏覽器 E2E 用 headless playwright-core（`/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core`，`channel: 'chrome'`），只用 mock。
- 每個 task 結束：repo 根目錄 `bash bin/verify.sh` → `verify: GREEN`；動前端的 task 再跑 `npm run build`、`npm run lint`、`npx tsc -b` 無錯（tsc 前 `mcp__flow__test_slot acquire kind=typecheck`，verify 前 acquire test slot，跑完 release）。
- commit：`feat(trend-finder): <英文描述>`，結尾 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。每個 task 一個 commit。

## Review Focus

1. **時間軸引用的素材被刪或換了版本。** take 被刪 → 片段顯示「素材已刪除」，出片被後端 409 擋下（"A clip's video was deleted. Remove it from the timeline first."），不是出一支少一段的片；節點換了選用版本 → 片段顯示「有新版本，套用？」，套用後 `out` 夾到新素材長度。測試：Task 3 `test_export_refuses_missing_source`、Task 5 `clipStatus` 三種結果與 `applyNewer` 夾長度。
2. **有聲片段和無聲片段混在一起；不同尺寸 / fps 的模型片段。** 成片一律 1080×1920、30fps、有 AAC 音軌，長度 = 片段長度總和 ±0.1 秒，靜音片段那段是無聲不是錯位。測試：Task 2 的真實出片 smoke（1280×720 25fps 無聲 + 1080×1920 30fps 有聲 + 720×1280 60fps 有聲），用 ffprobe 斷言。
3. **出片失敗或伺服器在出片中重啟。** 舊的 `final.mp4` 一個 byte 都不變、不留 `.part` / `work/`、列標 `failed`；重啟後 `recover` 把 `editor` 列也標 failed。子程序逾時要被殺掉。測試：Task 3 `test_failed_editor_render_keeps_old_final`、`test_render_timeout_kills_process`、`test_recover_fails_running_editor_render`。
4. **長時間出片不能卡 API。** `POST .../edit/export` 立刻回 202，出片在 `RenderJobs` 執行緒跑，`GET /cut` 期間照常回進度；同一 plan 舊 Make the video 和新出片不能同時跑。測試：Task 3 `test_export_returns_202_while_render_blocks`、`test_export_busy_with_auto_cut`。
5. **中文文字與字幕。** 文字、字幕用打包進來的 Noto Sans TC，字型載入完才出畫格（`delayRender`），不會出現豆腐字或後備字型；CJK 逐字切、不在中文字中間插空白；長句自動換行不超出 940 px 寬。測試：Task 11 `captions` 單元測試（CJK token、無空白拼接），Task 10 / 12 抽一格成片畫面用眼睛核對。
6. **剪輯後才改的東西讓已送審的成片過期。** 出片後再改時間軸、換素材、換音樂、改品牌 → `stale: true`，送審被擋（新訊息 "The edit changed after this was exported. Export it again before sending it."），審閱連結不給舊片看到新的決定。測試：Task 3 `test_editor_cut_goes_stale_after_project_change`、Task 8 `test_brand_change_makes_editor_cut_stale`。
7. **品牌被舊的客戶表單洗掉。** 現有 `PUT /api/clients` 整包覆蓋；前端舊表單送的 client 沒有 `brand` 時，伺服器要保留已存的 `brand`。測試：Task 8 `test_put_clients_keeps_brand`。

---

## 執行順序

```
P3a
Task 0  Manager：拆 node_modules symlink、裝 Remotion、計時實驗（決定出片方式）、字型、基線 verify
Task 1  後端：剪輯專案存檔 + 驗證 + 素材清單（editing.py）
Task 2  Remotion composition + 時間軸純函式 + render-reel.mjs + 真實出片 smoke
Task 3  後端：出片工作（renders.source、子程序、原子替換、過期判斷、recover）
Task 4  前端：抽屜剪輯器（Player、時間軸、修剪 / 分割 / 刪除 / 排序 / 音量、存檔）
Task 5  前端：畫布 → 時間軸（拖曳、加入按鈕、依 shot 順序放入、主片段、新版本 / 素材已刪）
Task 6  前端：出片鈕、進度、送審；舊 CutPanel 標示來源
Task 7  P3a 整體驗收（mock）+ PR
P3b
Task 8  後端：品牌（Client.brand、logo）+ 音樂檔路由
Task 9  後端：旁白（錄音 / 上傳、whisper 逐字、ElevenLabs adapter + mock、gen_voice、TTS 報價確認）
Task 10 composition + 前端：文字、音樂、品牌工具
Task 11 composition + 前端：字幕（台詞 / 旁白、@remotion/captions、改字）+ 旁白工具
Task 12 P3b 整體驗收（mock）+ PR
```

---

# P3a

### Task 0：依賴與計時實驗（Manager）

- [ ] **先問使用者（blocking）：** 伺服器出片需要 `@remotion/bundler`（`renderMedia` 的 `serveUrl` 只能由它打包，會帶進 webpack），不在 2026-11-03 同意清單上。選項：(1) 同意加 `@remotion/bundler`，跑伺服器出片實驗（建議）；(2) 不加，直接走 Fallback（ffmpeg 出片）。瀏覽器端出片需要 `@remotion/web-renderer`（實驗性、也未同意），不列為選項。用 `mcp__flow__ask` 問。
- [ ] `git status -sb` 確認分支 `feat/canvas-p3-editor`。`test -L node_modules && readlink node_modules`（應指向 blenny）→ `unlink node_modules` → `test ! -e node_modules`。`npm ci`（只寫本 worktree）。`readlink` 確認 blenny 的 `node_modules` 修改時間沒變。
- [ ] 版本：`npm view remotion time --json`，取發佈日 ≤ 2026-10-20 的最新穩定版 `X`；確認 `@remotion/player@X`、`@remotion/captions@X`、`@remotion/renderer@X`、`@remotion/bundler@X` 都存在且 peer 接受 React 19。`npm install --save-exact remotion@X @remotion/player@X @remotion/captions@X @remotion/renderer@X @remotion/bundler@X`（第 1 步選 (2) 則只裝前三個）。確認 `package.json` 與 `package-lock.json` 更新、`@remotion/compositor-darwin-arm64` 自動裝上。
- [ ] 字型：從 Google Fonts 的 GitHub（`google/fonts` 的 `ofl/notosanstc/`，OFL 授權）下載 Noto Sans TC 可變字型與 `OFL.txt`，放 `public/fonts/NotoSansTC-VF.ttf`、`public/fonts/OFL-NotoSansTC.txt`。記下檔案大小與來源網址、日期。
- [ ] `.gitignore`（本 app）加 `.remotion-bundle/`、`render/experiment/`。
- [ ] 計時實驗（不 commit 的 `render/experiment/`）：用 mock 規格（§11.5 #10，`testsrc2` + `sine`）做 3 支 10 秒片段；一個最小 composition（3 段 `OffthreadVideo` 依序、一行中文「三天學會剪輯」用 Noto Sans TC、一首 30 秒 `sine` mp3 的 `<Audio volume={0.4}>`）；`bundle()` → `selectComposition` → `renderMedia({codec: 'h264', audioCodec: 'aac', enforceAudioTrack: true})`。先 `ensureBrowser()`（下載 Chrome Headless Shell，不計時）。分別記：bundle 冷 / 熱時間、render 時間、總時間；`ffprobe` 輸出 1080×1920、30fps、有 AAC、長 30.0±0.1 秒；抽第 5 秒一格 PNG，用眼睛看中文字是 Noto Sans TC 不是豆腐。
- [ ] **門檻：** 熱 bundle + render ≤ 120 秒且字、聲音正確 → 伺服器出片（本計畫照寫）。否則 → 改走 Fallback，並 `npm uninstall @remotion/renderer @remotion/bundler`。結果（版本 X、時間、檔案大小、決定）寫進 `.superpowers/sdd/2026-11-03-canvas-p3-plan/progress.md` 和 `docs/STATUS.md` 的 P3 段。刪 `render/experiment/`。
- [ ] `bash bin/verify.sh` GREEN、`npm run build` / `lint` / `npx tsc -b` 無錯。commit（只含 `package.json`、`package-lock.json`、`.gitignore`、`public/fonts/*`）`chore(trend-finder): add Remotion and the Noto Sans TC font`。

### Task 1：剪輯專案存檔與素材清單

**Files：** Create `backend/editing.py`、`backend/tests/test_editing.py`；Modify `backend/server.py`（`SCHEMA` 建表、`include_router`）。

**Interfaces：**
- 表：`CREATE TABLE IF NOT EXISTS edit_projects (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, doc TEXT NOT NULL, updated_at INTEGER NOT NULL)`。
- 專案 JSON（P3a 欄位；P3b 加的欄位現在就收、給預設，驗證先放寬為「型別對就收」）：
  `{"fps": 30, "width": 1080, "height": 1920, "clips": [Clip], "texts": [], "captions": {"enabled": false}, "music": null, "voiceover": [], "primaries": {}, "showLogo": false}`；
  `Clip = {"id": str, "source": {"kind": "generation"|"take", "id": str, "nodeId"?: str, "shotId"?: str}, "in": float, "out": float, "volume": float, "muted": bool, "caption"?: str}`；`primaries: {shotId: source}`（§11.5 #6 使用者指定的主片段）。
- `empty_project() -> dict`；`check_project(doc) -> Optional[str]`（錯誤一句話；檢查型別、id 用 canvas 的 `ID_RE`、`0 <= in < out`、`out - in >= 0.2`、數字有限、音量 0–2、Global Constraints 的上限、總長 ≤ 180）。
- `source_key(src: dict) -> str`：`"generation:<id>"` / `"take:<id>"`。
- `list_sources(conn, media: Path, idea_id: str) -> list[dict]`：`done` 的 `kind='video'` generation 列 + 所有 take，每項 `{"key", "kind", "id", "nodeId"?, "shotId"?, "url", "duration", "hasAudio", "width", "height", "path"}`（`path` 只在後端用，路由回應前拿掉）。尺寸資訊用 `cutting.probe`，以 `(path, st_mtime_ns)` 做 process 內快取；probe 失敗的素材不列入。take 的 `shotId` 用 `takes.py` 現有的 shot id；generation 的 `nodeId` 用列的 `node_id`。
- `make_router(db, load, media_dir) -> APIRouter`：
  - `GET /api/ideas/{idea_id}/edit` → `{"version": int, "project": dict}`（沒有列時 version 0 + `empty_project()`）。
  - `PUT /api/ideas/{idea_id}/edit`，body `{version, project}` → 版本不符 409 `{"error": "The edit changed somewhere else. Reload it.", "version": 目前}`；`check_project` 錯 → 422；成功回 `{"version": 新}`。
  - `GET /api/ideas/{idea_id}/edit/sources` → `{"sources": [...]}`。
  - 三個路由：plan 不存在 404；plan 不是 `approved` → 409 `renders.NOT_APPROVED`（PUT 和 GET 都擋，跟畫布一致）。

- [ ] 測試：`test_get_empty_project`、`test_put_then_get_roundtrip`、`test_put_stale_version_409`、`test_check_project_rejects`（參數化：`in >= out`、片段 < 0.2 秒、音量 3、總長 181 秒、101 段、未知 source kind、`NaN`）、`test_sources_lists_done_videos_and_takes`（mock 影片列 + 一個 take，`hasAudio` 照實；`failed` 與 image 列不出現；回應沒有 `path`）、`test_edit_needs_approved_plan`。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] verify GREEN，commit `feat(trend-finder): store the edit project and list its sources`。

### Task 2：Remotion composition、時間軸純函式、出片腳本

**Files：** Create `src/lib/editor/types.ts`、`src/lib/editor/timeline.ts`、`src/remotion/Reel.tsx`、`src/remotion/Root.tsx`、`src/remotion/index.ts`、`src/remotion/font.ts`、`render/render-reel.mjs`、`render/smoke.mjs`、`unit/editor.test.mjs`。

**Interfaces：**
- `types.ts`：`ClipSource`、`Clip`、`EditProject`（同 Task 1 的 JSON）、`SourceInfo`（Task 1 `list_sources` 的項目，無 `path`）、`Word = { text: string; start: number; end: number }`（秒）、
  `ReelInput = { project: EditProject; urls: Record<string, string>; lines: Record<string, string>; musicUrl: string | null; voice: { id: string; url: string; words: Word[] | null }[]; brand: { font: string; color: string | null; logoUrl: string | null }; fontUrl: string }`（P3a 只用 `project.clips` 和 `urls`、`fontUrl`；其他欄位由 P3b 使用，P3a 一律給空值）。
- `timeline.ts`（純函式，不 import remotion）：`FPS = 30`、`MIN_CLIP = 0.2`、`MAX_TOTAL = 180`；`clipLength(c: Clip): number`；`totalLength(p: EditProject): number`；`clipStarts(p): number[]`（每段在時間軸上的起點秒）；`toFrames(sec: number): number`（`Math.round(sec * FPS)`）；`reelDurationInFrames(p): number`（至少 1）。
- `Reel.tsx`：`export function Reel(props: ReelInput)`：黑底 `AbsoluteFill`；每段 `<Sequence from={toFrames(start)} durationInFrames={toFrames(len)} premountFor={30}>` 裡一個 `<OffthreadVideo src={urls[source_key]} trimBefore={toFrames(in)} volume={muted ? 0 : volume} style={{width: '100%', height: '100%', objectFit: 'cover'}} />`（若鎖定版本仍用 `startFrom`，就用它）。`urls` 缺某段 → 該段黑畫面無聲（預覽時素材已刪的情況），不丟例外。
- `font.ts`：`useReelFont(fontUrl: string): void`：`delayRender` → `new FontFace('Noto Sans TC', url(fontUrl))` 載入、`document.fonts.add` → `continueRender`。`fontUrl` 由呼叫端給：Player 用 `/fonts/NotoSansTC-VF.ttf`，出片用 `staticFile('fonts/NotoSansTC-VF.ttf')`（bundle 時 `publicDir` 指向 app 的 `public/`）。
- `Root.tsx`：`<Composition id="Reel" component={Reel} width={1080} height={1920} fps={30} durationInFrames={1} calculateMetadata={({props}) => ({durationInFrames: reelDurationInFrames(props.project)})} defaultProps={空 ReelInput} />`；`index.ts`：`registerRoot(Root)`。**Vite app 不可 import `index.ts`**（`registerRoot` 有副作用）。
- `render/render-reel.mjs`：`node render/render-reel.mjs <job.json>`；job = `{input: ReelInput（urls 是相對檔名）, mediaDir, out, cacheDir}`。步驟：以 `src/remotion/**`、`src/lib/editor/**`、`package-lock.json` 內容雜湊當 key，`cacheDir/<hash>` 沒有就 `bundle({entryPoint: 'src/remotion/index.ts', publicDir: 'public'})` 寫進去；用 `node:http` 在 `127.0.0.1:0` 開一個只服務 `mediaDir` 的靜態伺服器（支援 Range、擋 `..`），把 `urls` 的檔名換成該伺服器網址；`selectComposition` → `renderMedia({codec: 'h264', audioCodec: 'aac', enforceAudioTrack: true, pixelFormat: 'yuv420p', outputLocation: out, onProgress})`；每次進度 stdout 印一行 `progress <0..1>`；成功 exit 0，失敗 stderr 印一行原因、exit 1。腳本不碰 `final.mp4`。另支援 `--ensure-browser`（只呼叫 `ensureBrowser()`）。
- `render/smoke.mjs`：用 ffmpeg 在暫存資料夾做三支來源（1280×720 25fps **無聲** 3 秒；1080×1920 30fps 有聲 3 秒（mock 規格）；720×1280 60fps 有聲 3 秒），寫 job（第一段 `in 0.5 out 2.5`、第三段 `muted`）、呼叫 `render-reel.mjs`、以 ffprobe 斷言，失敗 exit 1。

- [ ] 單元測試（`unit/editor.test.mjs`）：`clipLength` / `totalLength` / `clipStarts`（三段 [0–2]、[1–4]、[0.5–1] → 起點 0、2、5，總長 5.5）、`toFrames(5.5) === 165`、`reelDurationInFrames(空專案) === 1`。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] 真實出片 smoke：`node render/smoke.mjs` → 斷言 1080×1920、`r_frame_rate` 30/1、有 aac 音軌、長度 6.0±0.1 秒；抽第 1、3.5、5 秒畫格 PNG 放 scratchpad 用眼睛看（第一段填滿不變形）。**這個 smoke 不進 `verify.sh`**（要 Chrome、約 30 秒以上）〔我的決定〕，在 Task 3、7、12 再跑。
- [ ] verify GREEN、build / lint / tsc 無錯，commit `feat(trend-finder): Remotion reel composition and render script`。

### Task 3：出片工作

**Files：** Modify `backend/renders.py`、`backend/editing.py`、`backend/server.py`（`lifespan` 不變，確認 `renders.recover` 涵蓋 editor 列）、`bin/isolated-backend.sh`（repo 根）；Test `backend/tests/test_editing.py`、`backend/tests/test_renders.py`。

**Interfaces：**
- `renders` 表 migrate（啟動時欄位不存在才加）：`source TEXT NOT NULL DEFAULT 'auto'`、`out_source TEXT`。舊 `POST /cut` 寫 `source='auto'`，成功時 `out_source='auto'`。
- `editing.py`：
  - `APP_DIR = Path(os.environ.get("REMOTION_APP_DIR") or Path(__file__).resolve().parents[1])`；`NODE = os.environ.get("REMOTION_NODE") or shutil.which("node")`；`RENDER_TIMEOUT_S = 600`；`missing_render_tools() -> Optional[str]`（沒有 node → "Node.js isn't installed on this computer, so the video can't be exported."；沒有 `APP_DIR/node_modules/@remotion/renderer` → "The video export tools aren't installed. Run npm ci in the app folder."）。
  - `missing_sources(project, sources: dict[str, dict]) -> list[str]`（clip id 清單）。
  - `signature(conn, media: Path, idea: dict, project: dict) -> str`：sha1（取前 16 碼）of 排序後的專案 JSON + 每個引用素材的 `st_mtime_ns` + `cut_music` id（P3b 再加品牌、台詞、旁白檔）。
  - `render_input(conn, media: Path, idea: dict, project: dict, sources: dict) -> tuple[dict, list[Path]]`：`ReelInput`（`urls` 值是 `<key 雜湊>.<ext>` 檔名）+ 要連結進 `mediaDir` 的檔案。
  - `spawn_render(cmd: list[str], on_progress: Callable[[float], None], timeout: float) -> None`：`Popen(start_new_session=True)`，逐行讀 stdout 的 `progress x`；逾時 → `os.killpg` 整組、`CutError("The export took too long, so it was stopped.")`；非 0 結束 → `CutError("The export failed: <stderr 最後一行，去掉路徑>")`。
  - `render_project(db, media_dir, idea_id: str, work: Path, out: Path, step) -> dict`：讀專案與素材 → 有缺 → `CutError(MISSING_SOURCE)` → 在 `work/media/` 建硬連結（跨磁碟就 symlink）→ 寫 `work/job.json` → `spawn_render([NODE, APP_DIR/"render/render-reel.mjs", job], ...)`，進度對到 `step(0.05 + 0.9 * p, "Exporting")` → `cutting.probe(out)` 檢查 1080×1920、有音軌、長度 = `totalLength` ±0.2 → 回 `{"size", "durationSec", "signature", "clips"}`。
  - `MISSING_SOURCE = "A clip's video was deleted. Remove it from the timeline first."`、`EMPTY = "Put at least one clip on the timeline first."`、`EDIT_STALE = "The edit changed after this was exported. Export it again before sending it."`。
- `renders.py`：
  - `run_editor = editing.render_project`（測試可換，同 `run_pipeline`）。
  - `RenderJobs._run`：讀 `source`；`editor` → `run_editor(..., work, work/"next.mp4", step)` → `os.replace` 到 `final.mp4` → 同一 transaction 寫 `status='done'`、`out_*`（`out_shots` = 片段數、`out_speed` = 1.0、`out_signature`、`out_source='editor'`）並 `DELETE FROM cut_reviews` → 刪 `trims.json` 與舊管線的字幕 cue 檔（描述的是別支片）。失敗路徑沿用現有：`final.mp4` 不動、`work/` 刪掉。
  - `is_stale(conn, idea_id, shots=None)`：`out_source == 'editor'` → 讀專案算 `editing.signature`，與 `out_signature` 不同即過期，不看 `shots`；否則照舊。`send_for_review` 對 editor 片過期時回 `EDIT_STALE`，否則照舊 `STALE_CUT`。
  - `state_of` 多回 `"source": out_source or "auto"`。
  - `POST /api/ideas/{idea_id}/edit/export` → 檢查順序：plan 存在 / approved → `missing_render_tools()`（503）→ 專案沒片段（409 `EMPTY`）→ 缺素材（409 `MISSING_SOURCE`）→ 磁碟空間（`DISK_FACTOR` × 素材總大小）→ `render_lock` + `BEGIN IMMEDIATE` 內檢查 `is_busy`（409 `BUSY`）並 upsert `renders` 列（`source='editor'`、`status='queued'`、`shots`=片段數、`speed`=1.0）→ `jobs.submit` → 202 `state_of`。
- `bin/isolated-backend.sh`：export `REMOTION_APP_DIR` 為本 worktree 的 `$TF` 絕對路徑（後端被複製到暫存資料夾，找不到 `render/` 與 `node_modules`）；加 `DAILY_GEN_VOICE_USD=0`（Task 9 用到，先放）。

- [ ] 測試（`run_editor` 換成假函式：用 ffmpeg 寫一支 1 秒 mock 片到 `out`，或依參數丟 `CutError` / 等一個 `threading.Event`）：`test_export_writes_final_and_cut_row`（`GET /cut` → `done`、`source: "editor"`、`output.url` 存在）、`test_export_returns_202_while_render_blocks`、`test_export_busy_with_auto_cut`、`test_export_refuses_empty_project`、`test_export_refuses_missing_source`（take 刪掉後）、`test_failed_editor_render_keeps_old_final`（先放一支 `final.mp4`，失敗後 bytes 相同、`work/` 不存在）、`test_editor_cut_goes_stale_after_project_change`（PUT 專案後 `stale: true`、`POST /cut/review` 409 `EDIT_STALE`）、`test_editor_cut_review_and_publish_path`（未改動時送審成功，`cut_review.waiting` 看得到）、`test_recover_fails_running_editor_render`、`test_auto_cut_after_editor_cut_is_auto_again`（後寫的算數，`source` 回 `auto`）。
- [ ] `spawn_render` 測試用假的子程序（`[sys.executable, "-c", ...]`）：`test_spawn_render_reports_progress`、`test_render_timeout_kills_process`（timeout 0.5 秒、子程序 sleep 30 → `CutError` 且行程已不存在）、`test_spawn_render_failure_message_has_no_paths`。
- [ ] 跑 → FAIL；實作；跑 → PASS。既有 `test_renders.py`、`test_cut_review.py`、`test_publish*.py` 照過。
- [ ] 手動一次真出片（不進 verify）：`node render/smoke.mjs` 仍過。
- [ ] verify GREEN，commit `feat(trend-finder): export the edit to the plan's final video`。

### Task 4：抽屜裡的剪輯器

**Files：** Create `src/lib/editor/api.ts`、`src/components/editor/EditorPanel.tsx`、`src/components/editor/Timeline.tsx`、`src/lib/strings/editor.ts`、`src/styles/editor.css`；Modify `src/lib/editor/timeline.ts`、`src/components/canvas/EditorDrawer.tsx`（body 換成 `EditorPanel`，grip 不動）、`src/components/canvas/CanvasScreen.tsx`（傳 `ideaId`、`shots`、專案狀態）、`src/lib/i18n.ts`；Test `unit/editor.test.mjs`。

**Interfaces：**
- `api.ts`：`getProject(ideaId): Promise<{version: number; project: EditProject}>`；`putProject(ideaId, version, project): Promise<number>`（409 → `throw new StaleProject()`）；`getSources(ideaId): Promise<SourceInfo[]>`；`startExport(ideaId): Promise<CutState>`（Task 6 用；`CutState` 從 `lib/cut.ts` 來，加 `source?: 'auto' | 'editor'`）。
- `timeline.ts` 新增（全部回新物件，不改輸入）：`insertClip(p, src: ClipSource, duration: number, index: number, id: string): EditProject`（`in 0`、`out = min(duration, MAX_TOTAL - totalLength(p))`；放不下回原物件）；`trimClip(p, clipId, edge: 'in' | 'out', value: number, sourceDuration: number): EditProject`（夾在 `[0, sourceDuration]`，保持 `out - in >= MIN_CLIP`，總長不超過 `MAX_TOTAL`）；`splitAt(p, t: number, newId: string): EditProject`（播放頭在某段內且兩邊都 ≥ `MIN_CLIP` 才切，否則原物件）；`removeClip(p, clipId)`；`moveClip(p, from: number, to: number)`；`setClipAudio(p, clipId, patch: {volume?: number; muted?: boolean})`；`dropIndex(p, x: number, pxPerSec: number): number`（x 落在某段左半 → 插在它前面）；`newClipId(p): string`（`c` + 遞增數字，不重複）。
- `EditorPanel`：載入 `getProject` + `getSources`；上方 `<Player component={Reel} inputProps={...} durationInFrames={reelDurationInFrames(project)} compositionWidth={1080} compositionHeight={1920} fps={30} controls style={{width: '100%', aspectRatio: '9 / 16', maxHeight: '55vh'}} />`（`urls` = 每個 source 的 `url`；`fontUrl` = `/fonts/NotoSansTC-VF.ttf`）；播放頭用 `PlayerRef` 的 `getCurrentFrame` / `seekTo`。改動後 800 ms 去抖動 `putProject`；`StaleProject` → 顯示「剪輯在別處改了」+ 重新載入鈕（不自動覆蓋）；儲存狀態文字（儲存中 / 已儲存 / 失敗重試）。
- `Timeline`：片段方塊寬度 = 長度 × `pxPerSec`（預設 40，可縮放 20–120），顯示 shot 編號與長度；左右邊緣拖曳修剪（pointer capture）；鍵盤：選中片段後 `S` 在播放頭分割、`Delete` / `Backspace` 刪除、`←` / `→` 搭配 Alt 移動順序；拖曳排序用已有的 `@dnd-kit/core`；每段一個音量滑桿（0–200%）與靜音鈕；點時間尺 seek。

- [ ] 單元測試：`insertClip`（放到中間；超過 180 秒被截短；滿了回原物件）、`trimClip`（拖過頭被夾住、不能小於 0.2 秒、`in` 不能 < 0）、`splitAt`（在 1.0 秒切 [0–3] → [0–1]、[1–3]，新 id；在 0.1 秒不切）、`moveClip`、`setClipAudio`、`dropIndex`。
- [ ] 跑 → FAIL；實作；跑 → PASS。i18n 測試過（en / zhHant 對齊）。
- [ ] build / lint / tsc；本機 `bash bin/isolated-backend.sh 8871 --demo-data --user test@example.com:pw-for-e2e` 起來，headless 1440 開抽屜截一張圖確認 Player 與時間軸出現（此時時間軸是空的）。
- [ ] verify GREEN，commit `feat(trend-finder): timeline editor in the canvas drawer`。

### Task 5：畫布 → 時間軸

**Files：** Modify `src/lib/editor/timeline.ts`、`src/components/canvas/nodes/GenNode.tsx`（video 類）、`src/components/canvas/nodes/FootageNode.tsx`、`src/components/canvas/nodes/ctx.ts`、`src/components/canvas/CanvasScreen.tsx`、`src/components/editor/Timeline.tsx`、`src/components/editor/EditorPanel.tsx`、`src/lib/strings/canvas.ts`、`src/lib/strings/editor.ts`；Test `unit/editor.test.mjs`。

**Interfaces：**
- 拖曳資料：MIME `application/x-remake-clip`，內容 `JSON.stringify(ClipSource)`。影片節點（有 `done` 的選用版本時）和 footage 節點的每個 take 各有一個拖曳握把：`draggable`、class 加 React Flow 的 `nodrag nopan`，`onDragStart` 設資料。時間軸 `onDragOver` 顯示插入線（`dropIndex`），`onDrop` → `insertClip`；長度查 `SourceInfo`（找不到 → 先 `getSources` 重抓一次，仍沒有 → 提示「這段影片還在處理，稍後再試」）。
- 節點上另有「加到時間軸」按鈕（插在最後；抽屜關著就先打開）。影片 / footage 節點上「設為這個 shot 的主片段」按鈕（節點有 `shotId` 才顯示）→ 寫 `project.primaries[shotId]`。
- `CanvasCtx` 新增：`addToTimeline(src: ClipSource): void`、`setPrimary(shotId: string, src: ClipSource): void`、`isPrimary(shotId: string, src: ClipSource): boolean`。
- `timeline.ts` 新增：
  - `primaryClipFor(shotId, doc: CanvasDoc, gens: Generation[], takes: Take[], primaries): ClipSource | null`（§11.5 #6）：`primaries[shotId]` 指的素材還在 → 用它；否則該 shot 有 `chosen` 的 take → take；否則 `shotId` 相同的 video 節點中，選用版本 `done` 且 `finishedAt` 最新的那個 → generation；都沒有 → null。
  - `fillByShotOrder(p, shots: Shot[], doc, gens, takes, sources: SourceInfo[]): { project: EditProject; skipped: string[] }`：只在 `p.clips` 為空時用；依 shot 順序，每個 shot 一段整支；`skipped` 是沒有主片段（或素材沒有長度資訊）的 shot id。
  - `clipStatus(clip, doc, gens, takes): { state: 'ok' } | { state: 'newer'; source: ClipSource } | { state: 'missing' }`：generation 列不存在或不是 done、take 不存在 → `missing`；clip 有 `nodeId` 且該節點目前選用版本（generation）是別的 done 列 → `newer`；來自 footage（kind `take` 且有 `shotId`）且該 shot 選用的 take 換成別的 → `newer`；否則 `ok`。
  - `applyNewer(p, clipId, source: ClipSource, duration: number): EditProject`（換來源；`out = min(out, duration)`；若因此 `out - in < MIN_CLIP` → `in = 0`、`out = min(原長度, duration)`）。
- UI：時間軸空的時候顯示「全部依 shot 順序放入」鈕 → `fillByShotOrder`，有 `skipped` 時列出「第 N 鏡沒有影片，已跳過」。片段 `newer` → 黃色角標「有新版本，套用？」（套用 / 忽略；忽略只在本次載入內記住）；`missing` → 紅框「素材已刪除」+ 移除鈕，Player 該段黑畫面。

- [ ] 單元測試：`primaryClipFor` 四種（指定主片段優先、chosen take、最新 done 影片版本、沒有 → null；指定的素材已不存在 → 退回規則）、`fillByShotOrder`（3 個 shot、第 2 個沒東西 → 2 段 + `skipped` 含 s2；時間軸非空時不動）、`clipStatus` 三種（含 take 被刪、節點換版本、footage 的 chosen take 換了）、`applyNewer` 夾長度。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] build / lint / tsc；headless 1440 用 isolated backend：mock 影片節點拖進時間軸（playwright `dragTo` 走 HTML5 DnD；若 headless 不觸發 `drop`，改用「加到時間軸」鈕並在 progress 記錄），截圖。
- [ ] verify GREEN，commit `feat(trend-finder): drag canvas videos onto the timeline`。

### Task 6：出片、進度、送審

**Files：** Create `src/components/editor/ExportBar.tsx`；Modify `src/components/editor/EditorPanel.tsx`、`src/lib/cut.ts`（`CutState.source`）、`src/components/CutPanel.tsx`、`src/lib/strings/editor.ts`、`src/lib/strings/cut.ts`；Test `unit/cut.test.mjs`、`unit/editor.test.mjs`。

**Interfaces：**
- `ExportBar`：「出片」鈕 → 先等待中的 `putProject` 存完（flush）→ `startExport` → `pollCut`（現有，2 秒）顯示 `step` 與進度條；`done` → 顯示成片小預覽（`output.url`）、「下載」、「送給客戶審閱」（現有 `sendCutForReview`；錯誤照後端訊息顯示，含 `EDIT_STALE`、`NO_LINK`）、目前審閱狀態（現有 `reviewLine`）。`failed` → 顯示後端錯誤 + 重試。片段有 `missing` 時出片鈕停用並說明。抽屜重新打開時若 `GET /cut` 是 `queued` / `running`，接著輪詢。
- `exportBlocked(p, statuses): Key | null`（`timeline.ts`）：空時間軸 → `editor.export.empty`；有 `missing` → `editor.export.missing`；否則 null。
- 舊 `CutPanel`：`source === 'editor'` 時在成片下方顯示一行「這支是在剪輯器做的。在這裡按 Make the video 會蓋掉它。」；不隱藏 autoCut 區塊以外的東西（`trims.json` 已在 Task 3 刪掉，autoCut 自然不顯示）。

- [ ] 單元測試：`exportBlocked` 三種；`lib/cut.ts` 的 `getCut` 解析 `source`（fetch stub）。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] build / lint / tsc；verify GREEN，commit `feat(trend-finder): export from the editor and send it for review`。

### Task 7：P3a 整體驗收（只用 mock）+ PR

- [ ] `npm run build`；`bash bin/isolated-backend.sh 8871 --demo-data --user test@example.com:pw-for-e2e`；建一個已核可、3 個 shot 的 plan 和該 client 的審閱連結（同 P2 計畫的建資料步驟）。headless playwright-core 1440×900：
  1. 畫布上兩個 shot 用 mock 跑完整條（分鏡圖 → 影片），第三個 shot 上傳一支 1280×720 無聲 take 並選用。
  2. 開剪輯 → 「全部依 shot 順序放入」→ 3 段；修剪第 1 段、在第 2 段中間分割、刪掉後半、把第 3 段拖到最前、第 2 段靜音。
  3. 出片 → 進度出現 → done（記下秒數）；`ffprobe` `media/<id>/cut/final.mp4`：1080×1920、30fps、有 aac、長度 = 時間軸總長 ±0.2。
  4. 送審成功；用審閱連結（share token）開審閱頁，看得到這支成片並能播放。
  5. 在畫布重生第 1 個 shot 的影片 → 片段出現「有新版本，套用？」→ 套用 → 成片顯示過期、送審被擋。
  6. 刪掉第 3 段的 take → 片段「素材已刪除」、出片鈕停用。
  7. 截圖放 scratchpad。結束 kill backend。
- [ ] `node render/smoke.mjs` 過。repo 根 `bash bin/verify.sh` GREEN；`docs/STATUS.md` 寫 P3a 狀態（含 Task 0 計時結果）；push；`gh pr create --repo veralynchong/BuildClub --base feat/canvas-p2-models`，描述含 `## Verification`（Ran / Exercised / Not verified：**實拍 .mov（HEVC）沒有實測**、20 段以上的預覽效能沒測）。**不合併。**

---

# P3b

從 P3a head 開 `feat/canvas-p3b-editor-media`。

### Task 8：品牌與音樂檔路由

**Files：** Create `backend/brand.py`、`backend/tests/test_brand.py`；Modify `backend/models.py`（`Brand`、`Client.brand`）、`backend/server.py`（`put_clients` 保留 brand、`include_router`）、`backend/renders.py`（音樂檔 GET）、`backend/editing.py`（`signature`、`render_input` 加品牌）、`src/types.ts`（`Client.brand`）；Test `backend/tests/test_editing.py`。

**Interfaces：**
- `class Brand(BaseModel): logo: Optional[str] = Field(None, pattern=r"^logo-[A-Za-z0-9_-]{6,40}\.(png|jpg|webp)$"); font: Literal["Noto Sans TC"] = "Noto Sans TC"; color: Optional[Hex] = None`；`Client.brand: Optional[Brand] = None`。字型只有一個〔我的決定：成片離線出，只能用打包進來的字型；加字型 = 加 `public/fonts/` 檔 + 這個 Literal〕。
- `put_clients`：存之前，對每個 `brand is None` 的 client，若已存的同 id client 有 `brand` 就保留。
- `brand.py` `make_router(load, save, media_dir) -> APIRouter`（存放 `media/brand/<clientId>/`，client id 要在 clients 清單裡，否則 404）：
  - `PUT /api/clients/{client_id}/brand`，body `{font, color}` → 更新該 client 的 `brand`（保留 `logo`），回 `Brand`。
  - `PUT /api/clients/{client_id}/brand/logo`：原始 body，`Content-Type` image/png | image/jpeg | image/webp，≤ 5 MB，檔頭用 `generations.image_header_ok`；先寫 `.part` 再 `os.replace`，換掉舊 logo 檔；回 `Brand`。不收 SVG。
  - `GET /api/clients/{client_id}/brand/logo` → 檔案；`DELETE` 同路徑 → 移除。
- `renders.py`：`GET /api/ideas/{idea_id}/cut/music/file` → 目前音樂檔（Player 用）。
- `editing.signature` 加入：client 的 brand JSON（含 logo 檔名）、`showLogo`。`render_input` 填 `brand: {font, color, logoUrl}`（logo 一併連結進 `mediaDir`）、`musicUrl`（有 `project.music` 且有 `cut_music` 列時）。

- [ ] 測試：`test_put_clients_keeps_brand`、`test_brand_update_keeps_logo`、`test_logo_upload_rejects_svg_and_fake_png`、`test_logo_replace_removes_old_file`、`test_unknown_client_404`、`test_music_file_route`、`test_brand_change_makes_editor_cut_stale`（`test_editing.py`）。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] verify GREEN、tsc 無錯，commit `feat(trend-finder): client brand kit and music file route`。

### Task 9：旁白後端

**Files：** Modify `backend/gen_providers.py`、`backend/generations.py`、`backend/gen_models.json`、`backend/server.py`（`GEN_WALLETS`、`DAILY_GEN_VOICE_USD`）、`backend/editing.py`；Test `backend/tests/test_gen_providers.py`、`backend/tests/test_generations.py`、`backend/tests/test_budget.py`、`backend/tests/test_editing.py`。

**Interfaces：**
- 錢包：`DAILY_GEN_VOICE_USD = float(os.environ.get("DAILY_GEN_VOICE_USD", 0.30))`；`GEN_WALLETS["voice"] = ("gen_voice", "DAILY_GEN_VOICE_USD")`；`gen_cap`、`gen_remaining` 改成查表，`gen_remaining()` 多回 `voice`。
- 模型：`gen_models.json` 加 `mock-voice`（provider `mock`，`price {"per": "1k_chars", "usd": 0}`）和一個 ElevenLabs 條目（provider `elevenlabs`，`endpoint` = 官方 model id，`params.voiceId`、`price.per = "1k_chars"`、`priceCheckedAt`；**id、價格、預設中文聲音由 manager 在本 task 開始前只看 ElevenLabs 官方文件與 pricing 頁核對（免費）**，寫進 progress）。`validate_models` 接受 provider `elevenlabs`、kind `voice`（voice 不需要 9:16）。`KEY_ENV["elevenlabs"] = "ELEVENLABS_API_KEY"`。`estimate_usd`：`per == "1k_chars"` → `usd * len(text) / 1000`（新參數 `chars: int = 0`）。
- `gen_providers.py`：`MAX_BYTES["voice"] = 20 MB`；`sniff` 認 MP3（`ID3` 或 `0xFF 0xE?`）→ `("voice", "mp3")`；`MockAdapter.poll` 對 kind `voice`：ffmpeg `sine=frequency=220` 長度 `max(1, 0.25 × width_units(text))` 秒（`width_units` 用 `subtitles.width_units`），輸出 mp3；`ElevenLabsAdapter`：`submit` 同步 `POST https://api.elevenlabs.io/v1/text-to-speech/{params.voiceId}?output_format=mp3_44100_128`，header `xi-api-key`、`Content-Type: application/json`，body `{"text", "model_id": endpoint}`；回 200 且是 MP3 → 存在 adapter 內暫存 dict，`poll` 立刻 done；4xx → `ProviderError`；5xx / 網路錯誤 → `ProviderError`（同步呼叫沒有可續的 request id）。`ADAPTERS["elevenlabs"] = ElevenLabsAdapter`。
- `generations.py`：kind `voice` 不對應畫布節點：`NODE_FOR_KIND["voice"] = None`，`check` 對 voice 不查畫布，`node_id` 固定 `"editor-voice"`；`inputs = {"prompt": text}`；文字 1–1000 字。抽出 `enqueue(conn, idea_id, node_id, kind, model, inputs, est) -> dict`（`POST /gen` 與 TTS 共用）。
- `editing.py` 旁白檔：存 `media/<ideaId>/edit/voice/<vid>.<ext>`，旁邊 `<vid>.words.json`。
  - `PUT /api/ideas/{idea_id}/edit/voice?source=recording|upload`：原始 body，`Content-Type` audio/webm、audio/ogg、audio/mpeg、audio/mp4、audio/wav（MediaRecorder 在 Chrome 給 `audio/webm;codecs=opus`）；≤ 20 MB；`cutting.probe` 有音軌且 ≤ 120 秒；回 `{"id", "url", "duration", "words": [Word] | null, "wordsError"?: str}`。
  - `transcribe_voice(path: Path, work: Path) -> list[Word]`：ffmpeg 轉 16 kHz mono wav → `cutting.transcribe_words`（whisper.cpp）→ `[{text, start, end}]`。whisper 不在 → 檔案照存、`words: null`、`wordsError` = `cutting.NO_WHISPER`（字幕退回台詞模式）。這個轉錄在 sync 路由（FastAPI threadpool）裡跑，限 120 秒音檔所以有上限。
  - `POST /api/ideas/{idea_id}/edit/voice/tts`，body `{text, model, confirm}`：`confirm: false` → `{"usd", "remaining"}` 不扣錢；`confirm: true` → `budget("voice", usd)`（不夠 429，訊息含剩餘）→ `enqueue` → 201 generation。
  - `POST /api/ideas/{idea_id}/edit/voice/from-gen/{gen_id}`：done 的 voice 列 → 複製成旁白檔 + 轉錄 → 同上傳的回應。
  - `GET .../edit/voice/{vid}/file`、`DELETE .../edit/voice/{vid}`。
  - 專案 `voiceover: [{id, source: "tts"|"recording"|"upload", start: float, volume: float, edits: {pageIndex: text}}]`；`check_project` 檢查 id 存在於 voice 資料夾、start ≥ 0；`signature` 加旁白檔 mtime；`render_input` 填 `voice: [{id, url, words}]`。

- [ ] 測試：`test_elevenlabs_submit_sends_key_and_model`（假 Http）、`test_elevenlabs_4xx_is_provider_error`、`test_elevenlabs_non_mp3_rejected`、`test_mock_voice_is_mp3`、`test_voice_wallet_in_budget`、`test_tts_quote_spends_nothing`、`test_tts_over_budget_429`（cap 0）、`test_tts_mock_runs_and_imports`、`test_voice_upload_rejects_non_audio_and_long_files`、`test_voice_upload_transcribes`（`cutting.transcribe_words` monkeypatch 回固定 words）、`test_voice_upload_without_whisper_keeps_file`、`test_models_file_valid` 照過。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] verify GREEN，commit `feat(trend-finder): voiceover upload, recording and TTS jobs`。

### Task 10：文字、音樂、品牌（composition + 工具列）

**Files：** Create `src/components/editor/tools/TextTool.tsx`、`MusicTool.tsx`、`BrandTool.tsx`、`src/components/editor/ToolTabs.tsx`；Modify `src/remotion/Reel.tsx`、`src/lib/editor/types.ts`、`src/lib/editor/timeline.ts`、`src/lib/editor/api.ts`、`src/components/editor/EditorPanel.tsx`、`backend/editing.py`（`check_project` 收緊 texts / music）、`src/lib/strings/editor.ts`、`src/styles/editor.css`；Test `unit/editor.test.mjs`、`backend/tests/test_editing.py`。

**Interfaces：**
- 專案：`texts: [{id, text, start, end, position: "top"|"middle"|"bottom", color: "brand"|"white"|"black"}]`；`music: {volume: number} | null`（檔案是該 plan 的 `cut_music`，與舊 Make the video 共用一首〔我的決定〕）；`showLogo: bool`。
- `timeline.ts`：`addText(p, at: number, text: string, id: string): EditProject`（預設 2 秒、`bottom`、`white`；超出總長就夾）；`updateText(p, id, patch)`；`removeText(p, id)`；`textsAt(p, t): TextItem[]`。
- `Reel.tsx` 加圖層（由下而上）：片段 → 文字（`<Sequence>` 依 start/end；字型 `brand.font`，96 px、粗 700、白字黑描邊 6 px 或品牌色；位置 top = 上緣 220、middle = 置中、bottom = 下緣 1300；最大寬 940、置中、自動換行）→ logo（右上 48 px 邊距、寬 180，`showLogo && brand.logoUrl`）→ 音樂 `<Audio src={musicUrl} volume={music.volume}>`（不循環，總長截斷）。
- 工具列：`ToolTabs`（剪片 / 文字 / 字幕 / 音樂 / 品牌）。`TextTool`：在播放頭加一段、改字、起訖（數字輸入）、位置三選一、顏色三選一、刪除。`MusicTool`：沿用 `lib/cut.ts` 的 `putMusic` / `deleteMusic`（含授權勾選與 30 MB 上限），音量滑桿 0–100%，`music` 為 null 時不放。`BrandTool`：上傳 / 移除 logo、主色（`<input type=color>`）、字型（目前只有 Noto Sans TC，顯示為唯讀）、「顯示 logo」開關；這些存到 client，不存專案。
- `api.ts`：`putBrand(clientId, body)`、`putLogo(clientId, file)`、`deleteLogo(clientId)`。

- [ ] 單元測試：`addText`（夾在總長內）、`updateText`、`removeText`、`textsAt`。後端 `test_check_project_texts`（position 不在三選一、空字、超過 120 字、end ≤ start → 422）。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] 真出片抽格：用 `render/smoke.mjs` 的 job 加一段中文文字 + logo + 音樂跑一次，抽格 PNG 用眼睛看（Noto Sans TC、換行、logo 位置），ffprobe 有聲。
- [ ] build / lint / tsc；verify GREEN，commit `feat(trend-finder): text, music and brand in the editor`。

### Task 11：字幕與旁白工具

**Files：** Create `src/lib/editor/captions.ts`、`src/components/editor/tools/CaptionTool.tsx`、`src/components/editor/tools/VoiceTool.tsx`；Modify `src/remotion/Reel.tsx`、`src/lib/editor/types.ts`、`src/lib/editor/api.ts`、`src/components/editor/ToolTabs.tsx`、`backend/editing.py`（`signature` 加 shot 台詞；`render_input` 填 `lines`）、`src/lib/strings/editor.ts`、`src/styles/editor.css`；Test `unit/editor.test.mjs`、`backend/tests/test_editing.py`。

**Interfaces：**
- 專案：`captions: {enabled: boolean}`；`Clip.caption?: string`（覆寫這段的台詞）；`voiceover[].edits`。模式自動決定：有任何旁白段帶 `words` → `voice`，否則 `lines`（§11.6）。
- `captions.ts`（純函式；只 import `@remotion/captions`）：
  - `tokens(text: string): string[]`：CJK 字（同 `subtitles.is_cjk` 的範圍）一字一 token；連續非 CJK 字元依空白切成字，非第一個 latin 字前面帶一個空白（`@remotion/captions` 的慣例）；CJK 前不加空白。
  - `lineCaptions(p: EditProject, lines: Record<string, string>): Caption[]`：把連續、同 `shotId` 的片段視為一段 run，每個 shot 只有**第一個** run 放台詞〔我的決定〕；文字 = run 第一段的 `caption` ?? `lines[shotId]`；token 依寬度（CJK 2、其他 1）平均分配在 run 的 `[start, end]`。
  - `voiceCaptions(segs: VoiceSeg[], words: Record<string, Word[]>): Caption[]`：words 依段的 `start` 平移；超過時間軸總長的丟掉。
  - `captionPages(caps: Caption[]): TikTokPage[]`：`createTikTokStyleCaptions({captions: caps, combineTokensWithinMilliseconds: 1200})`。
  - `pagesWithEdits(...)`：`voice` 模式時，以「段 id + 該段內頁序號」套 `edits`；`lines` 模式的改字直接寫 `Clip.caption`（作用於整個 run）。
- `Reel.tsx`：字幕層在文字層之上、logo 之下：目前頁的文字，56 px、白字黑描邊、下緣 1460、最大寬 940、置中；旁白 `<Audio>` 依 `start` 放 `<Sequence>`，`volume` 套用。
- `CaptionTool`：開關；列出每頁（時間 + 可改的文字）；lines 模式改字寫回該 run 的第一個 clip 的 `caption`。
- `VoiceTool`：三個來源。錄音：`navigator.mediaDevices.getUserMedia({audio: true})` + `MediaRecorder`（`audio/webm`），停止後上傳；沒有麥克風權限 → 顯示說明。上傳：選檔。AI 配音：選 voice 模型（下拉來自 `/api/gen/models` 的 voice 類，沒金鑰 disabled，同 P2）、文字預設 = 所有 shot 台詞串接、按下先 `tts confirm:false` 顯示「約 US$x.xx · 今日剩 US$y.yy」確認框 → `confirm:true` → `pollGen` → `from-gen`。每段：起點（預設播放頭）、音量、刪除；轉錄失敗時提示「字幕會用台詞」。

- [ ] 單元測試：`tokens('3 天學會 editing fast')` → `['3', '天', '學', '會', ' editing', ' fast']`（依此規則精確斷言）、`lineCaptions`（兩段同 shot 連續 → 一個 run；同 shot 隔開出現 → 只有第一個 run 有字；`caption` 覆寫生效；token 時間單調遞增且在 run 範圍內）、`voiceCaptions`（平移、超過總長被丟）、`captionPages` 的頁文字拼起來不在中文字間插空白、`pagesWithEdits`。
- [ ] 後端：`test_signature_changes_when_shot_line_changes`。
- [ ] 跑 → FAIL；實作；跑 → PASS。
- [ ] 真出片抽格：台詞模式中文字幕一支、旁白模式（用 macOS `say -o` 產一段英文語音檔，透過上傳路由進來，whisper 轉出 words）一支；抽格看字幕位置與字型；ffprobe 有聲。
- [ ] build / lint / tsc；verify GREEN，commit `feat(trend-finder): captions from shot lines or voiceover`。

### Task 12：P3b 整體驗收（只用 mock）+ PR

- [ ] `npm run build`；isolated backend 8871（同 Task 7 的資料）。headless playwright-core 1440×900（瀏覽器開 `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream` 讓錄音可跑）：
  1. 品牌：上傳 logo、選主色、開「顯示 logo」；在舊客戶表單存一次 client → 品牌還在。
  2. 加中文文字「三天學會剪輯」在上方、品牌色。
  3. 開字幕（台詞模式）→ 每頁文字是該 shot 的台詞；改一頁的字。
  4. 上傳音樂（勾授權）、音量 40%。
  5. 旁白：錄 3 秒（假麥克風）；AI 配音用 `mock-voice` → 確認框 US$0.00 → 完成並出現在旁白層。ElevenLabs 選項 disabled（沒有金鑰）。
  6. 出片 → done；ffprobe 1080×1920、30fps、有 aac；抽 3 格 PNG 看文字、字幕、logo。
  7. 改品牌色 → 成片過期、送審被擋。截圖放 scratchpad，kill backend。
- [ ] `node render/smoke.mjs` 過；repo 根 `bash bin/verify.sh` GREEN；`docs/STATUS.md` 更新；push；`gh pr create --repo veralynchong/BuildClub --base feat/canvas-p3-editor`，`## Verification` 的 Not verified：**ElevenLabs 沒有實打**（只對照文件）、真麥克風錄音只用假裝置、whisper 只測了英文語音。**不合併。**

---

## Fallback（Task 0 門檻沒過，或使用者不同意 `@remotion/bundler`）

改成 **ffmpeg 出片**（瀏覽器端出片要 `@remotion/web-renderer`，未同意且實驗性，不採用）。預覽仍用 Remotion Player（只需 `remotion`、`@remotion/player`、`@remotion/captions`）。改動只在這些地方，其他 task 不變：
- Task 2：不寫 `render-reel.mjs` / `Root.tsx` / `index.ts`；改在 `editing.py` 寫 `render_ffmpeg(input: dict, media: Path, work: Path, out: Path, step) -> None`：每段 `trim` / `atrim` → `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1`；無聲段補 `anullsrc`（48 kHz）；`volume` / 靜音；`concat`；`smoke.mjs` 改成 pytest `test_render_ffmpeg_mixed_sources`（同三支來源、同斷言，標 `slow` 但仍跑，約 10 秒）。
- Task 3：`spawn_render` 換成 `cutting._render_pass` 的 `-progress` 模式；其他（`source` 欄、原子替換、過期、recover）不變。
- Task 10 / 11：文字、字幕用 `subtitles.render_cue_png`（Pillow + Noto Sans TC 檔）做 PNG，`overlay` 疊上（本機 ffmpeg 沒有 `drawtext`，spec §13）；音樂、旁白用 `amix`。`captions.ts` 的分頁結果要由前端隨專案送給後端（`PUT` 時附 `pages`），因為 Python 不重做 `@remotion/captions`。
- 風險：預覽與成片不是同一份程式（spec 反目標「預覽和成片長得不一樣」），驗收時要並排比對截圖。

## 給使用者的決定

1. **`@remotion/bundler` 要不要加**（Task 0 會先問；不加就走 Fallback）。
2. **Remotion 授權：** 個人與 3 人以下公司免費；更大的公司要買公司授權。學生 demo 目前適用免費條款，日後商業化要重看。
3. **字型檔進 repo：** `public/fonts/NotoSansTC-VF.ttf`（OFL，數 MB）。替代：不進 repo、改為本機路徑環境變數。
4. **`DAILY_GEN_VOICE_USD` 預設 0.30。**
5. **P3a / P3b 分兩個 PR、兩個分支。**
6. **出片後再改任何東西就算過期**，送審前要重出（和舊 Make the video「takes 改了就過期」同邏輯）。
7. **上限：** 總長 180 秒、100 段、出片逾時 10 分鐘。
8. **實拍 take 自動剪口頭禪 / 停頓不在 P3**：spec §8 說舊 ffmpeg 管線改成「只清理 take」，本計畫延到 P4（移除舊按鈕時一起做）；P3 只能手動修剪。
9. **剪輯器 P3 沒有復原 / 重做。**
10. **字幕台詞規則：** 同一個 shot 被拆成不連續的幾段時，只有第一段放台詞。
11. **真實出片 smoke 不進 `verify.sh`**（要 Chrome、30 秒以上），只在 Task 2、3、7、12 手動跑。
12. **音樂與舊 Make the video 共用同一首**（`cut_music`）；換音樂兩邊都會變。
13. **品牌字型 P3 只有 Noto Sans TC 一個。**

## Self-review 紀錄

- **Spec 覆蓋：** §8 引擎 / Player / 出片（Task 0、2、3）、單軌 + 文字層 + 音樂層（Task 4、10）、拖曳與「全部依 shot 順序放入」（Task 5）、引用不複製 + 新版本提示（Task 5）、剪片四動作（Task 4）、文字 / 字幕 / 音樂 / 品牌（Task 10、11）、出片接審閱與發布（Task 3、6）；§9 專案 JSON 每 plan 一份（Task 1），復原見決定 9；§11.5 #1（Task 3）、#2（Task 2、4）、#6（Task 5）、#9（Task 0）、#10（Task 0、2）；§11.6 全部（Task 9、11）；§13 Node + Chromium（Task 0、3 的 `missing_render_tools`）。§8「現有 ffmpeg 管線只清理 take」→ 決定 8 延到 P4。
- **型別一致：** `ClipSource` / `Clip` / `EditProject` / `SourceInfo` / `ReelInput` / `Word` 都在 Task 2 `types.ts` 定義；`source_key` 格式前後端相同（`kind:id`）；`render_project` / `run_editor` / `spawn_render` / `signature` / `render_input` 名稱在 Task 3、8、9、11 一致。
- **比例：** 計畫以介面、測試名與斷言為主，沒有寫函式本體（`tokens` 的規則以測試斷言固定）。
