# Remake 節點畫布 P1（畫布骨架）執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 從已核可的 plan 進入一張 React Flow 節點畫布：shot 自動長出 Shot 節點和空的分鏡圖節點，節點依媒體型別連線、不相容的連線被擋並說明原因，上傳 / 實拍節點接現有 takes，用免費的 mock 模型生成圖和影片、保留版本並可切換、上游改了下游標「過期」，畫布每個 plan 存一份帶版本號的 JSON，右側剪輯抽屜先做空殼。全程不花錢。

**Architecture：**
- 後端新增兩個模組：`backend/generations.py`（模型清單設定檔、生成工作表、單一 worker thread、mock 提供商、檔案路由）和 `backend/canvas.py`（畫布 JSON 存取、版本號檢查、依 shot list 建立 / 同步節點、舊 `frameImage` 匯入）。都照 `takes.py` / `renders.py` 的 `SCHEMA` + `make_router(...)` 模式，在 `server.py` 掛上。
- Shot 穩定 id 由 `models.py` 的 `SavedIdea` validator 在每次讀 / 寫時補齊（決定性演算法，前後端同一套），所以舊 plan 不需要一次性遷移腳本。
- 前端：所有規則（埠 / 連線、過期傳播、版本選用、生成輸入、抽屜寬度）寫成 `src/lib/canvas/*.ts` 純函式，用 `node --test` 測；元件 `src/components/canvas/*` 只組裝，靠瀏覽器檢查驗收。畫布用 `React.lazy` 載入，不加大主 bundle。

**Tech Stack：** React 19、TypeScript、Vite、`@xyflow/react` 12.12.0（新依賴，Task 0 取得同意）、FastAPI、pydantic、SQLite、ffmpeg（`testsrc2` + `sine`）、pytest、`node --test`、headless playwright-core。

**Spec：** `pivots/02-content/docs/specs/2026-11-02-node-canvas-editor-design.md`（本計畫實作 §10 的 P1 列；引用 §4、§5、§6 Mock 模型、§9、§11、§11.5 第 3、4、7、10 條）。背景研究：`pivots/02-content/research/reports/AI 節點畫布與剪輯器 研究.md`（只在需要時翻）。

## Global Constraints

- 路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明 repo 根目錄。
- **Repo 與基底：`origin` = veralynchong/BuildClub 的 `main`。** 分支 `feat/canvas-p1`，off `origin/main`，push 到 `origin`，PR 開到 `veralynchong/BuildClub` 的 `main`。不 force-push、不 push main、不 push `fork`。**PR 做好就停：只有使用者對那個 PR 明確說「merge」才合併。**
- **依賴：** 只新增 Task 0 經使用者同意的 `@xyflow/react@12.12.0`（exact 版本）。不加 `zustand`（`@xyflow/react` 自己帶）、不加 `zundo`（P1 不做復原，spec §9 交給實作者）。後端不新增 pip 套件，模型清單用 JSON。其他任何 npm / pip 套件都不准加。
- **node_modules / .venv 用 symlink**（npm / pip 安裝會被 hook 擋）：`node_modules` → `/Users/tommy/orca/workspaces/BuildClub/remake-donn-prep/pivots/02-content/app/trend-finder/node_modules`；`backend/.venv` → `/Users/tommy/orca/workspaces/BuildClub/w2-grade-subs-backend/pivots/02-content/app/trend-finder/backend/.venv`。注意：目前的 `blenny` worktree **沒有** `backend/.venv`，所以 `verify.sh` 在這裡會 RED，Task 0 先補 symlink。
- **Port：** 不碰 8811、8805、8787、8801、5195、8798、5174、5175、8100、3100、8840、8841、8850、8852、8853，也不碰 demo（8850）和它的 tunnel；同時避開改版計畫線 A–D 用的 8797、8799、8861、8862。**本計畫測試 port：8871**（2026-11-02 查過沒有程式在聽）。`bin/isolated-backend.sh` 只拒絕 8787 和 5195，另外會拒絕已被佔用的 port，所以 8871 可用；被佔用時回報 Manager，不要改腳本。
- 不讀 `.env`、不 source `~/.config/fish/api-keys.fish`。**不按任何會花錢的鍵**：Write / Rewrite the script、Regenerate this shot、Make frame（`FRAME_IMAGE_PROVIDER=openai` 時）、live 搜尋、分析頻道。P1 的生成只走 mock（US$0）；isolated backend 本來就把所有預算設 0。
- **文案：** 所有新 UI 文案走 `t()`（`src/lib/i18n.ts`），英文和繁中都要加。P1 新開一個 area：`src/lib/strings/canvas.ts`，key 一律 `canvas.` 開頭，匯出 `en` 和 `zhHant: Record<keyof typeof en, string>`，並在 `i18n.ts` 的 `import`、`areas`、`AllEn` 三處登記（`unit/i18n.test.mjs` 會檢查 key 對齊和前綴）。`t()` 不能在模組頂層呼叫。後端錯誤訊息照現有慣例寫英文句子。
- **樣式：** 只用 `src/styles/tokens.css` 和 `theme-remake.css` 的 token（`--space-*`、`--radius*`、`--line`、`--surface*`、`--ink*` 等）。新檔 `src/styles/canvas.css`，在 `src/index.css` 最後那群 `@import`（`storyboard.css` 之後）加一行。class 前綴 `cv-*`。React Flow 的外觀用覆寫它的 `--xy-*` CSS 變數接到 token。媒體三色先用 `--violet`（文字）、`--blue`（圖）、`--mustard`（影片），外觀最後由 Veralyn 決定。
- 每個 task 結束前：repo 根目錄 `bash bin/verify.sh` 印出 `verify: GREEN`；動到前端的 task 再在 app 目錄跑 `npm run build` 和 `npm run lint`，都不能有錯。
- **瀏覽器檢查：** `npm run build` 後 `bash bin/isolated-backend.sh 8871 --demo-data --user test@example.com:pw-for-e2e`，用 headless playwright-core（`channel: 'chrome'`），1440×900 和 390×844 各截一張，截圖放 worker 的 scratchpad，PR 描述附路徑。不用 Playwright MCP。檢查結束 kill 掉 backend。
- **建測試資料（免費）：** Find ideas 用 sample 搜尋 → Save → Open plan → 在 Shots 手動填台詞 → Send for approval → 以 Manager 身分 Approve → 至少一鏡上傳一支 `ffmpeg -f lavfi -i testsrc=size=720x1280:rate=30 -f lavfi -i sine -t 4` 的測試片。要測舊 `frameImage` 匯入時，在**核可前**對一鏡按 Make frame（isolated backend 沒有 key，只產 SVG 佔位，免費）。
- commit 格式 `<type>(trend-finder): <英文描述>`，結尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。每個 task 一個 commit。

## Review Focus

1. **舊 plan 第一次打開畫布**：plan 沒有 shot id、有 `frameImage`、有 takes，打開畫布要看到 N 列 Shot 節點、分鏡圖節點的 v1 就是舊圖、有 takes 的 shot 多一個實拍節點列出那些 take；再打開一次不能重複匯入（v1 不能變成 v1、v2 兩張一樣的）。測試在 Task 3（`test_reconcile_is_idempotent`）。
2. **兩個分頁開同一張畫布**：舊分頁存檔要被拒（409），畫面顯示「畫布在別處改過，重新載入」，而且自動存檔停止，不能一直 409 迴圈或悄悄蓋掉新版。測試在 Task 3（`test_put_with_old_version_is_rejected`）和 Task 5 的瀏覽器檢查。
3. **生成到一半離開畫布或伺服器重啟**：回來時跑到一半的那筆要嘛完成並自動成為選用版本，要嘛標「失敗：伺服器重啟」，不能永遠轉圈。測試在 Task 2（`test_restart_fails_unfinished_jobs`）和 Task 4（`selectedGen` 單元測試）。
4. **shot list 在畫布建立後增減**：新 shot 長出新的一列；被刪的 shot 節點標「已從 shot list 移除」、它那列的生成結果都還在，不會連帶消失；穩定 id 讓插在中間的新 shot 不會把後面的節點錯位。測試在 Task 1（`fill_shot_ids` 決定性）和 Task 3（`test_removed_shot_keeps_nodes`）。
5. **390 寬手機**：畫布能看、能平移縮放，抽屜不會把畫布擠成 0 寬或讓頁面橫向捲動。測試在 Task 4（`clampDrawerWidth` 單元測試）和 Task 5 的瀏覽器檢查（`scrollWidth === 390`）。

---

## 執行順序

```
Task 0  Manager：取得依賴同意、補 symlink、確認 port、基線 verify GREEN（停下來等使用者）
Task 1  Shot 穩定 id（前後端）
Task 2  後端：模型清單 + 生成工作表 + mock 提供商
Task 3  後端：畫布存檔 + 同步 shot + 舊資料匯入
Task 4  前端：畫布純函式 + API client
Task 5  前端：畫布畫面、進入點、存檔、抽屜空殼（需要 Task 0 的依賴）
Task 6  前端：節點元件 + 連線規則 + 新增節點
Task 7  前端：生成、版本切換、過期標記、frameImage 回寫
Task 8  前端：上傳節點 + 實拍節點接 takes
Task 9  整體驗收 + 開 PR
```

一個 worker、一個 worktree、一個分支 `feat/canvas-p1`、一個 PR。Task 1–4 不需要新依賴，Task 0 等使用者回覆時可以先做。每個 task 完成後派一個新的 reviewer subagent 對照本計畫該 task 和 Review Focus 看 diff。

---

### Task 0：依賴同意與前置條件（Manager，**停下來問使用者**）

- [ ] **Step 1：向使用者要同意**，原文如下，等明確的「同意」才繼續 Task 5：

  > P1 需要新增一個 npm 套件：
  > - `@xyflow/react@12.12.0`（exact）：React Flow 節點畫布本體（節點、連線、平移縮放、埠）。12.12.0 於 2026-09-24 發布；最新的 12.12.1 是今天（2026-11-02）才發布，不到兩週，所以不用。它會帶入 `zustand ^4.4.0`、`classcat`、`@xyflow/system` 0.0.84 三個子依賴。
  > - 不加 `zustand`（直接依賴）和 `zundo`：P1 不做復原 / 重做。
  >
  > 安裝會被 hook 擋。請在另一個終端機執行：
  > `cd <worker worktree>/pivots/02-content/app/trend-finder && npm install --save-exact @xyflow/react@12.12.0`
  > 注意 worker 的 `node_modules` 是 symlink 到 `remake-donn-prep` 的共用資料夾，套件會裝進那裡（其他 worktree 也看得到，不影響它們）。完成後貼回 `npm ls @xyflow/react` 的輸出。

- [ ] **Step 2：** 在 worker worktree 補 symlink：`ln -s /Users/tommy/orca/workspaces/BuildClub/w2-grade-subs-backend/pivots/02-content/app/trend-finder/backend/.venv backend/.venv`（`node_modules` 同理，若不存在）。
- [ ] **Step 3：** `lsof -nP -iTCP:8871 -sTCP:LISTEN` 沒有輸出 → 8871 可用。
- [ ] **Step 4：** repo 根目錄 `bash bin/verify.sh` → `verify: GREEN`（基線）。RED 就停下回報，不開工。
- [ ] **Step 5：** `ffmpeg -hide_banner -filters | grep -E " testsrc2| sine "` 兩行都有；`ffmpeg -hide_banner -encoders | grep -E "libx264| aac "` 兩行都有（2026-11-02 在這台已確認）。

---

### Task 1：Shot 穩定 id（spec §11.5-3）

**Files:**
- Modify: `backend/models.py`（`Shot` 加 `id`；`SavedIdea` 加 `model_validator(mode="after")`）、`src/types.ts`（`Shot.id?`）、`src/lib/storyboard.ts`、`src/components/PlanScreen.tsx:319`（新增 shot 時給 id）
- Create: `backend/tests/test_shot_ids.py`
- Modify: `unit/storyboard.test.mjs`

**Interfaces:**
- Produces：
  - 後端 `Shot.id: Optional[str] = Field(default=None, pattern=r"^[A-Za-z0-9_-]{1,40}$")`
  - 後端 `models.fill_shot_ids(shots: list[Shot]) -> list[Shot]`；`SavedIdea` validator 對 `shots` 呼叫它
  - 前端 `fillShotIds(shots: Shot[]): Shot[]`、`newShotId(): string`（`'sh_' + 8 個 [a-z0-9]`）
  - 規則（前後端一字不差）：先收集所有已有 id；由前往後，已有 id 且未重複的保留；沒有 id 或與前面重複的，給 `s{i+1}`，若已被用就 `s{i+1}-2`、`-3`…直到沒用過。

- [ ] **Step 1：寫失敗的 pytest** `backend/tests/test_shot_ids.py`

```python
def test_old_shots_get_index_ids():
    assert [s.id for s in fill_shot_ids([Shot(time="0-3", shot="a"), Shot(time="3-6", shot="b")])] == ["s1", "s2"]

def test_existing_ids_kept_and_duplicates_renamed():
    shots = [Shot(time="", shot="a", id="s2"), Shot(time="", shot="b"), Shot(time="", shot="c", id="s2")]
    assert [s.id for s in fill_shot_ids(shots)] == ["s2", "s2-2", "s3"]

def test_ids_are_deterministic():
    shots = [Shot(time="", shot="a"), Shot(time="", shot="b", id="sh_x")]
    assert [s.id for s in fill_shot_ids(shots)] == [s.id for s in fill_shot_ids(shots)] == ["s1", "sh_x"]

def test_get_ideas_returns_ids_for_old_plans(client):
    server.save("ideas", [...])  # 一個 shots 沒有 id 的 SavedIdea，寫法照 test_takes.store_ideas
    assert [s["id"] for s in client.get("/api/ideas").json()[0]["shots"]] == ["s1", "s2"]

def test_bad_id_rejected(client):
    # PUT /api/ideas 帶 shot id "a b" → 422
```

- [ ] **Step 2：** `backend/.venv/bin/python -m pytest -q -p no:cacheprovider backend/tests/test_shot_ids.py` → FAIL。
- [ ] **Step 3：** 實作 `fill_shot_ids` 和 validator。
- [ ] **Step 4：** 同一指令 → PASS。
- [ ] **Step 5：寫失敗的 node 測試**（加在 `unit/storyboard.test.mjs`）：用和 Step 1 前三個一樣的輸入 / 期望值測 `fillShotIds`；`newShotId()` 符合 `/^sh_[a-z0-9]{8}$/` 且兩次不同；`fillShotIds` 不改原陣列。
- [ ] **Step 6：** `node --test pivots/02-content/app/trend-finder/unit/storyboard.test.mjs`（repo 根目錄）→ FAIL → 實作 → PASS。
- [ ] **Step 7：** `PlanScreen.tsx:319` 新增 shot 改成 `{ id: newShotId(), time: '', shot: '' }`。`git grep -n "shotList" src` 找出其他會產生新 shot 的地方（`format.shotList` 本身沒 id，交給 validator 補，不改）。
- [ ] **Step 8：** verify GREEN、build、lint。Commit `feat(trend-finder): stable shot ids`。

---

### Task 2：模型清單 + 生成工作表 + mock 提供商（spec §6、§7 的 P1 部分、§11.5-10）

**Files:**
- Create: `backend/gen_models.json`、`backend/generations.py`、`backend/tests/test_generations.py`
- Modify: `backend/server.py`（`db()` 的 SCHEMA 迴圈加 `generations.SCHEMA`；啟動時呼叫 `generations.fail_unfinished(db)`；`include_router(generations.make_router(db, load, lambda: MEDIA_DIR))`）

**Interfaces:**
- Produces：
  - `gen_models.json` 形狀（P2 只加項目，不改形狀）：

```json
{ "models": [
  { "id": "mock-image", "label": "Mock image (free)", "kind": "image", "provider": "mock", "tier": "cheap",
    "price": { "per": "image", "usd": 0 },
    "inputs": { "text": "required", "reference": "optional" }, "aspects": ["9:16"] },
  { "id": "mock-video", "label": "Mock video (free)", "kind": "video", "provider": "mock", "tier": "cheap",
    "price": { "per": "second", "usd": 0 },
    "inputs": { "text": "optional", "startFrame": "optional", "reference": "optional" },
    "durations": [4, 6], "aspects": ["9:16"] }
] }
```
    `kind` ∈ `image | video | voice`；`tier` ∈ `cheap | balanced | best`；`inputs.*` ∈ `required | optional | none`（沒寫等於 `none`）。
  - `generations.load_models() -> list[dict]`、`generations.estimate_usd(model: dict, duration: float | None) -> float`
  - SCHEMA：`generations (id TEXT PRIMARY KEY, idea_id TEXT NOT NULL, node_id TEXT NOT NULL, kind TEXT NOT NULL, model TEXT NOT NULL, inputs TEXT NOT NULL, input_hash TEXT NOT NULL, status TEXT NOT NULL, est_usd REAL NOT NULL, actual_usd REAL, file TEXT, source_url TEXT, error TEXT, created_at INTEGER NOT NULL, finished_at INTEGER)`，加索引 `(idea_id, node_id)`。`status` ∈ `queued | running | done | failed`。**列只增不刪**；`done` / `failed` 之後不再改。`model` 另有兩個保留值：`upload`（使用者上傳的圖，Task 8）、`imported`（舊 `frameImage`，Task 3，`source_url` 存原網址、`file` 為空）。
  - `to_json(row) -> {id, ideaId, nodeId, kind, model, inputs, status, estUsd, actualUsd, url, error, createdAt, finishedAt}`；`url` = `source_url` 或 `/api/ideas/{idea}/gen/{id}/file`，未完成時為 `null`。
  - `insert_done(conn, idea_id, node_id, kind, model, *, file=None, source_url=None) -> dict`（Task 3、8 用）
  - `fail_unfinished(db) -> None`：把 `queued`/`running` 改 `failed`，`error = "The server restarted before this finished. Try again."`
  - `class GenJobs(db, media_dir)`：`submit(gen_id)` 放進 queue；`run(gen_id)` 同步跑一筆（worker thread 和測試都呼叫它）
  - Mock：`MOCK_DELAY_S = float(os.environ.get("MOCK_GEN_DELAY_S", 2))`；prompt 含 `#fail` 時失敗，`error = "Mock failure (the prompt asked for one)."`；`MOCK_GEN_FAIL_RATE`（預設 0）以該機率隨機失敗。圖：`storyboard.placeholder_svg(...)` 寫成 `<id>.svg`。影片：

```
ffmpeg -y -f lavfi -i testsrc2=size=1080x1920:rate=30 -f lavfi -i sine=frequency=440:sample_rate=48000
  -t <duration> -c:v libx264 -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0
  -c:a aac -b:a 128k -shortest -movflags +faststart <id>.mp4
```
    （寫進 `<id>.part.mp4` 再 `os.replace`；用 `cutting.run` 呼叫，沿用它的逾時和「沒有 ffmpeg」訊息。）
  - 路由（都在 `/api/ideas/` 下，只有登入的員工到得了）：
    - `GET /api/gen/models` → `{models: [...]}`
    - `POST /api/ideas/{idea_id}/gen` body `{nodeId, model, prompt, startFrame?: genId, reference?: genId, duration?: number}` → 201 + `to_json`（`queued`）
    - `GET /api/ideas/{idea_id}/gen` → 該 plan 全部列，依 `created_at`
    - `GET /api/ideas/{idea_id}/gen/{gen_id}` → 一列（輪詢用）
    - `GET /api/ideas/{idea_id}/gen/{gen_id}/file` → 檔案，SVG 帶和 `storyboard.get_frame` 一樣的 CSP header
  - 檔案放 `media/<ideaId>/gen/`，路徑檢查照 `storyboard.frames_dir`（id 不能跳出 media 資料夾）。
  - `input_hash` = `sha256(json.dumps({model, prompt, startFrame, reference, duration}, sort_keys=True))`。

- [ ] **Step 1：寫失敗的 pytest** `backend/tests/test_generations.py`（fixture：monkeypatch `generations.MOCK_DELAY_S = 0`，把 `server.gen_jobs.submit` 換成 `server.gen_jobs.run`；plan 用 `test_takes.idea(...)` 的寫法存）

```python
def test_models_file_shape():
    for m in generations.load_models():
        assert m["kind"] in ("image", "video", "voice") and m["tier"] in ("cheap", "balanced", "best")
        assert set(m["inputs"].values()) <= {"required", "optional", "none"}
        assert "9:16" in m["aspects"]

def test_mock_image_done(client):  # POST → 201 queued；跑完 GET 一列 status done、url 結尾 .../file、estUsd 0
def test_mock_failure_on_prompt(client):  # prompt "x #fail" → status failed，error 為上面那句
def test_rows_are_append_only(client):  # 同一 node 生成兩次 → GET 回兩列，第一列內容不變
def test_unknown_model_422(client)
def test_kind_mismatch_422(client):  # node 不存在或 model 不屬於 kind → 422（node 檢查在 Task 3 接上畫布後補，這裡先只測 model）
def test_plan_not_approved_409(client):  # status "waiting" → 409 "Only an approved plan can generate."
def test_input_from_other_plan_422(client):  # startFrame 是別的 plan 的 gen id → 422
def test_restart_fails_unfinished_jobs(client):  # 直接插一列 running → fail_unfinished → failed + 重啟訊息
def test_file_path_cannot_escape(client):  # idea_id ".." → 404

@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="needs ffmpeg")
def test_mock_video_spec(client):
    # duration 4 → ffprobe：video h264 1080x1920 30/1、audio aac、時長 4±0.1 秒
```

- [ ] **Step 2：** `backend/.venv/bin/python -m pytest -q -p no:cacheprovider backend/tests/test_generations.py` → FAIL。
- [ ] **Step 3：** 實作 `generations.py` 和 `gen_models.json`，接上 `server.py`。P1 只有 `provider == "mock"`；其他 provider 的模型回 422 "This model isn't available yet."（P2 換成 adapter 分派）。`est_usd` 由 `estimate_usd` 算（mock 都是 0），P1 不呼叫 `spend()`。
- [ ] **Step 4：** 同一指令 → PASS；`bash bin/verify.sh` → GREEN。
- [ ] **Step 5：** Commit `feat(trend-finder): generation jobs with a free mock provider`。

---

### Task 3：畫布存檔 + 同步 shot + 舊資料匯入（spec §4.3、§9、§11.5-4、§11.5-7）

**Files:**
- Create: `backend/canvas.py`、`backend/tests/test_canvas.py`
- Modify: `backend/server.py`（SCHEMA、`include_router(canvas.make_router(db, load))`）、`backend/generations.py`（POST 時檢查 `nodeId` 存在於畫布且節點型別對得上 kind：`storyboard` → `image`、`video` → `video`；補 Task 2 的 `test_kind_mismatch_422`）

**Interfaces:**
- Consumes：Task 1 的 `fill_shot_ids` / `SavedIdea`；Task 2 的 `insert_done`、`to_json`；`takes` 表（`idea_id, shot` index）
- Produces：
  - SCHEMA：`canvases (idea_id TEXT PRIMARY KEY, version INTEGER NOT NULL, doc TEXT NOT NULL, updated_at INTEGER NOT NULL)`
  - 畫布 JSON（前端 `CanvasDoc` 同形狀）：

```json
{ "nodes": [ { "id": "n_shot_s1", "type": "shot", "shotId": "s1", "position": { "x": 0, "y": 0 },
               "data": { "removed": false } },
             { "id": "n_sb_s1", "type": "storyboard", "shotId": "s1", "position": { "x": 360, "y": 0 },
               "data": { "primary": true, "model": "mock-image", "prompt": "", "selected": null, "stale": false } } ],
  "edges": [ { "id": "e_n_shot_s1_n_sb_s1", "source": "n_shot_s1", "sourceHandle": "out",
               "target": "n_sb_s1", "targetHandle": "in:text" } ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 } }
```
    節點 `type` ∈ `shot | prompt | storyboard | video | upload | footage`；`shotId` 選填（`shot`、`footage` 必填）；`data` 是自由物件。
  - `canvas.LAYOUT`：列高 `ROW_H = 280`，欄 x：shot 0、storyboard 360、footage 720。
  - `canvas.reconcile(doc: dict | None, shots: list[Shot], take_shots: set[int], gens: list[dict]) -> tuple[dict, list[tuple[str, str]]]`：純函式，回傳（新 doc, 要匯入的 `(node_id, frameImage)` 清單）。規則：
    1. `doc is None` → 每個 shot 一列：Shot 節點 + `primary` 分鏡圖節點 + 一條 `out → in:text` 邊；該 shot 的 index 在 `take_shots` 裡時，再加一個 `footage` 節點和 `out → in:text` 邊。
    2. 已有 doc：每個 shot id 沒有 Shot 節點的，在最下面一列新增（同 1 的節點組）；doc 裡的 Shot 節點，id 不在 shots 的設 `data.removed = true`，回到 shots 裡的設 `false`。**永遠不刪節點、不刪邊。** 已有節點的位置不動。
    3. 有 `frameImage` 的 shot：它的 `primary` 分鏡圖節點在 `gens` 裡沒有任何一列 `url == frameImage` → 列入匯入清單，並把該節點 `data.selected` 設成 `null`（讓最新那版成為選用）。
  - `GET /api/ideas/{idea_id}/canvas` → `{version, doc, generations: [...], takes: [...]}`。在 `canvas_lock` 內：讀 plan（不存在 404；`shots` 為空回 409 `{"error": "Save the shot list first.", "code": "no-shots"}`）、`reconcile`、對匯入清單呼叫 `insert_done(..., model="imported", source_url=frameImage)`、doc 有變就 `version + 1` 存回。`takes` 用 `takes.to_json` 對 `takes` 表查出的列（和 `GET /api/ideas/{id}/takes` 同格式）。未核可的 plan 也能 GET（唯讀用）。
  - `PUT /api/ideas/{idea_id}/canvas` body `{version: int, doc}` → 版本不等於目前 → 409 `{"error": "The canvas changed somewhere else. Reload it.", "version", "doc"}`；否則驗證後存成 `version + 1`，回 `{version}`。驗證：節點 ≤ 500、邊 ≤ 1000、整份 JSON ≤ 512 KB、id 符合 `^[A-Za-z0-9_:-]{1,80}$`、邊的兩端節點存在、目前每個 shot id 都還有 Shot 節點（少了 → 422 "Shot nodes can't be deleted."）。未核可的 plan → 409 "Only an approved plan can change the canvas."

- [ ] **Step 1：寫失敗的 pytest** `backend/tests/test_canvas.py`

```python
def test_first_build_rows():  # reconcile(None, 3 shots, take_shots={1}, []) → 3 個 shot 節點 y = 0/280/560；
                               # 3 個 primary storyboard；只有 s2 有 footage；邊 4 條
def test_new_shot_appends_row():  # 先建 2 鏡，再用 [s1, sh_new, s2] reconcile → 新增 n_shot_sh_new 在 y=560，舊節點位置不變
def test_removed_shot_keeps_nodes():  # 刪 s2 → n_shot_s2.data.removed True，n_sb_s2 和邊都還在；加回來 → removed False
def test_frame_image_imported_once():  # shot 有 frameImage、gens 空 → 匯入清單一筆；gens 已有同 url → 空清單
def test_reconcile_is_idempotent():  # reconcile 兩次（第二次把第一次的匯入當 gens 傳入）→ 同一 doc、空清單
def test_get_canvas_imports_legacy_frame(client):  # GET → generations 一列 model "imported"、url == frameImage；再 GET 還是一列；version 不變
def test_get_canvas_lists_takes(client):  # 先上傳一個 take（test_takes.up）→ GET 的 takes 有它，doc 有 footage 節點
def test_put_with_old_version_is_rejected(client):  # PUT v1 成功 → v2；再 PUT version 1 → 409，回應帶 version 2 和目前 doc
def test_put_cannot_drop_shot_node(client):  # → 422
def test_put_rejects_dangling_edge(client):  # → 422
def test_put_needs_approved_plan(client):  # → 409
def test_no_shots_409(client):  # plan shots 為空 → 409 code "no-shots"
def test_gen_node_must_exist(client):  # Task 2 的 POST /gen 用不存在的 nodeId → 422；用 shot 節點 id → 422
```

- [ ] **Step 2：** `... -m pytest -q -p no:cacheprovider backend/tests/test_canvas.py backend/tests/test_generations.py` → FAIL。
- [ ] **Step 3：** 實作。節點 id 用決定性的 `n_shot_<shotId>`、`n_sb_<shotId>`、`n_ft_<shotId>`，邊 id `e_<source>_<target>`，所以兩個請求同時建立也長一樣。
- [ ] **Step 4：** 同一指令 → PASS；`bash bin/verify.sh` → GREEN。
- [ ] **Step 5：** Commit `feat(trend-finder): canvas storage synced with the shot list`。

---

### Task 4：前端畫布純函式 + API client

**Files:**
- Create: `src/lib/canvas/types.ts`、`src/lib/canvas/ports.ts`、`src/lib/canvas/graph.ts`、`src/lib/canvas/drawer.ts`、`src/lib/canvas/api.ts`、`src/lib/strings/canvas.ts`、`unit/canvas.test.mjs`
- Modify: `src/lib/i18n.ts`（登記 `canvas` area）

**Interfaces:**
- Consumes：Task 2、3 的 JSON 形狀；`Take`（`src/lib/takes.ts`）
- Produces：
  - `types.ts`：`Media = 'text' | 'image' | 'video'`；`NodeKind = 'shot' | 'prompt' | 'storyboard' | 'video' | 'upload' | 'footage'`；`CanvasNode`、`CanvasEdge`、`CanvasDoc`（Task 3 的形狀）；`Generation`（Task 2 的 `to_json`）；`GenModel`（`gen_models.json` 一項）；`InputNeed = 'required' | 'optional' | 'none'`
  - `ports.ts`：
    - `PORTS: Record<NodeKind, { inputs: { id: 'in:text' | 'in:start' | 'in:ref'; media: Media; modelInput?: 'text' | 'startFrame' | 'reference' }[] }>`，對照 spec §5：shot 無輸入；prompt `in:text`；storyboard `in:text`、`in:ref`(image)；video `in:text`、`in:start`(image)、`in:ref`(image)；upload 無輸入；footage `in:text`、`in:ref`(image)。每個節點只有一個輸出 `out`。
    - `outMedia(node: CanvasNode): Media | null`：shot / prompt → `text`；storyboard → `image`；video / footage → `video`；upload → `node.data.media ?? null`（還沒上傳是 `null`）
    - `canConnect(doc: CanvasDoc, c: { source: string; target: string; targetHandle: string }, models: GenModel[]): { ok: true } | { ok: false; reason: Key; vars?: Vars }`，依序檢查並回傳第一個不通過的 reason：`canvas.conn.self`（同一節點）、`canvas.conn.empty`（來源 upload 還沒檔案）、`canvas.conn.media`（`vars: { from, to }`，用 `canvas.media.*` 翻好的字）、`canvas.conn.taken`（該輸入埠已有一條線）、`canvas.conn.cycle`、`canvas.conn.model`（目標節點的模型對該埠是 `none`，`vars: { model }`）
    - `edgeLabel(edge: CanvasEdge): Key | null`：`in:start` → `canvas.edge.start`，`in:ref` → `canvas.edge.ref`，其他 `null`
  - `graph.ts`：
    - `downstream(doc, nodeId): string[]`（不含自己、去重）
    - `markStale(doc, nodeId): CanvasDoc`：下游的 `storyboard` / `video` 節點，**已有至少一個 done 版本的**才設 `data.stale = true`；不改原物件
    - `versionsOf(nodeId, gens): Generation[]`（依 `createdAt`）
    - `selectedGen(node, gens): Generation | null`：`data.selected` 指到的那筆若存在且 `done` 就用它，否則最新的 `done`，都沒有回 `null`
    - `pendingGen(nodeId, gens): Generation | null`（最新一筆 `queued`/`running`）
    - `genRequest(doc, nodeId, shots: Shot[], gens): { prompt: string; startFrame?: string; reference?: string; duration?: number }`：`prompt` = 節點自己的 `data.prompt`（非空時），否則 `in:text` 上游的文字（shot → `line ?? shot`；prompt 節點 → 它的 `data.text`，空的話再往上找）；`startFrame` / `reference` = 該埠上游節點的 `selectedGen(...).id`
    - `missingInput(doc, nodeId, model, shots, gens): Key | null`：模型 `required` 的輸入拿不到值 → `canvas.gen.needText` / `canvas.gen.needStart`
    - `primaryFrames(doc, shots, gens): { index: number; frameImage: string }[]`：每個 `primary` 分鏡圖節點的選用版本 url 和對應 shot 目前的 `frameImage` 不同的列表（Task 7 回寫用）
  - `drawer.ts`：`DRAWER_KEY = 'remake.canvas.drawer'`；`clampDrawerWidth(px: number, viewport: number): number`（最小 280，最大 `viewport * 0.7`；`viewport <= 860` 時回 `viewport`，因為手機上抽屜改成疊在畫布下方）；`defaultDrawerWidth(viewport) = clampDrawerWidth(viewport * 0.4, viewport)`；`readDrawer()` / `writeDrawer({ open, width })`（try/catch，照 `i18n.ts` 的 `readLang` 寫法）
  - `api.ts`：`getCanvas(ideaId): Promise<{ version; doc; generations; takes }>`（409 `no-shots` 丟 `NoShots`）；`putCanvas(ideaId, version, doc): Promise<number>`（409 丟 `StaleCanvas`，帶伺服器的 `version`、`doc`）；`getModels()`；`listGens(ideaId)`；`startGen(ideaId, body)`；`pollGen(ideaId, genId, onState, { signal, intervalMs = 2000 })`（照 `lib/cut.ts` 的 `pollCut`：`done`/`failed` 時 resolve、abort 時 resolve `null`）；`uploadImage(ideaId, nodeId, file)`（Task 8 的路由）
  - `strings/canvas.ts`：本 task 先放上面提到的 `canvas.conn.*`、`canvas.edge.*`、`canvas.media.text|image|video`、`canvas.gen.needText|needStart`；之後的 task 繼續往這個檔加。

- [ ] **Step 1：寫失敗的測試** `unit/canvas.test.mjs`（用 Task 3 `test_first_build_rows` 的 doc 當 fixture，寫成一個 `docWith(...)` helper）

```js
test('text cannot go into an image port', () => {
  const r = canConnect(doc, { source: 'n_shot_s1', target: 'n_vid', targetHandle: 'in:start' }, models)
  assert.equal(r.ok, false); assert.equal(r.reason, 'canvas.conn.media')
})
test('image into a video start frame is allowed and labelled', () => {
  assert.deepEqual(canConnect(doc, { source: 'n_sb_s1', target: 'n_vid', targetHandle: 'in:start' }, models), { ok: true })
  assert.equal(edgeLabel({ targetHandle: 'in:start' }), 'canvas.edge.start')
})
test('a port takes one line, no self or cycle, empty upload blocked', () => { /* 四個 reason 各一個 assert */ })
test('a model without reference input blocks the line', () => {
  const noRef = [{ ...models[1], inputs: { text: 'optional', startFrame: 'optional' } }]
  assert.equal(canConnect(doc, { source: 'n_sb_s1', target: 'n_vid', targetHandle: 'in:ref' }, noRef).reason, 'canvas.conn.model')
})
test('markStale only flags generated nodes downstream', () => {
  // shot → sb(有 done) → vid(有 done) → 另一個 vid(沒有版本)：markStale(doc, 'n_shot_s1') 只標 sb 和第一個 vid；原 doc 沒變
})
test('selectedGen falls back to the newest done', () => {
  // gens: v1 done, v2 failed, v3 running → selected null → v1；selected 指向 v2(failed) → v1；v3 done 後 → v3
})
test('genRequest prefers the node prompt, then the shot line', () => { /* 兩種情況 */ })
test('missingInput says what is needed', () => { /* storyboard 沒有文字 → canvas.gen.needText */ })
test('primaryFrames lists only changed shots', () => { /* 一鏡相同、一鏡不同 → 只回不同那鏡 */ })
test('drawer width clamps and goes full width on phones', () => {
  assert.equal(clampDrawerWidth(100, 1440), 280)
  assert.equal(clampDrawerWidth(1300, 1440), 1008)
  assert.equal(defaultDrawerWidth(1440), 576)
  assert.equal(clampDrawerWidth(300, 390), 390)
})
test('putCanvas throws StaleCanvas on 409', async () => { /* 換掉 globalThis.fetch，照 unit/takes.test.mjs 的 uploadTake 測法 */ })
```

- [ ] **Step 2：** `node --test pivots/02-content/app/trend-finder/unit/canvas.test.mjs` → FAIL。
- [ ] **Step 3：** 實作；`ports.ts` / `graph.ts` 不 import `@xyflow/react`（測試不需要它）。
- [ ] **Step 4：** 同一指令 → PASS；`bash bin/verify.sh` → GREEN（含 `i18n.test.mjs`）；`npm run build`、`npm run lint`。
- [ ] **Step 5：** Commit `feat(trend-finder): canvas rules and api client`。

---

### Task 5：畫布畫面、進入點、自動存檔、抽屜空殼（spec §4.1、§4.2）

**需要 Task 0 的依賴已安裝**（`npm ls @xyflow/react` 印出 12.12.0）。

**Files:**
- Create: `src/components/canvas/CanvasScreen.tsx`、`src/components/canvas/EditorDrawer.tsx`、`src/styles/canvas.css`
- Modify: `src/components/Sidebar.tsx`（`View` 加 `'canvas'`）、`src/App.tsx`（`React.lazy` 載入 `CanvasScreen`；`view === 'canvas'` 時渲染；`restoreTab` 把存下來的 `'canvas'` 和 `'plan'` 一樣退回 `'shortlist'`；`backLabel` 加 `canvas`）、`src/components/PlanScreen.tsx`（核可橫幅旁加「Open the canvas」按鈕，prop `onOpenCanvas`）、`src/index.css`、`src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes：Task 4 全部；`SavedIdea`、`Format`
- Produces：
  - `<CanvasScreen idea shots onChange={(patch: Partial<SavedIdea>) => void} onBack backLabel />`（`shots = idea.shots ?? format.shotList`，同 `PlanScreen.tsx:89`）
  - `<EditorDrawer open width onWidth onClose />`：P1 只有標題「Editor」和一句「Drag video nodes here in the next step.」的空殼
  - App 的 `openCanvas()`：`idea.shots` 不存在時先 `onChange({ shots: fillShotIds(shots) })` 再切到 `'canvas'`

- [ ] **Step 1：** `PlanScreen` 的按鈕只在 `idea.status === 'approved'` 時出現。
- [ ] **Step 2：** `CanvasScreen` 載入：`getCanvas`；`NoShots` 時顯示「Saving the shot list…」並每 2 秒重試，最多 5 次，之後顯示錯誤和重試鈕。其他錯誤顯示 `ErrorText`。把 `doc` 轉成 React Flow 的 `nodes` / `edges`（Shot 節點 `deletable: false`），用 `useNodesState` / `useEdgesState`。本 task 節點先用 React Flow 預設樣式顯示 shot 編號和型別名稱，Task 6 換成正式元件。加 `<Background />`、`<Controls />`、`<MiniMap />`（390 寬時不顯示 MiniMap）。
- [ ] **Step 3：自動存檔**：`nodes` / `edges` / viewport 變動後 800 ms debounce 呼叫 `putCanvas(version, doc)`，成功就更新 `version`。`StaleCanvas` → 頂部橫幅「The canvas changed somewhere else.」加「Reload」按鈕，**停止自動存檔**直到使用者按 Reload（重新 `getCanvas`）。離開畫面前有未存的變更就立即存一次。存檔狀態用小字顯示（Saving… / Saved）。
- [ ] **Step 4：唯讀**：`idea.status !== 'approved'`（plan 被退回編輯）時畫布照常顯示，但 `nodesDraggable`、`nodesConnectable`、`elementsSelectable` 關掉，不自動存檔，頂部說明「Approve the plan again to change the canvas.」。
- [ ] **Step 5：版面**：頁首有返回 plan 按鈕和右上「Open editor」。主區 `.cv-layout` 是 flex：畫布 `flex: 1 1 auto; min-width: 0`，抽屜寬度 `width` px，**不是 overlay**，畫布跟著縮窄。抽屜左緣是拖拉把手（pointer events，`clampDrawerWidth`，`role="separator"`、`aria-orientation="vertical"`、左右鍵每次 ±24 px），可收起，開關狀態和寬度用 `writeDrawer` 記住。`max-width: 860px` 時 `.cv-layout` 改成上下排，畫布高 `60vh`，抽屜打開時接在下面、全寬。
- [ ] **Step 6：** `canvas.css` 覆寫 `--xy-background-color`、`--xy-node-border-radius`、`--xy-edge-stroke` 等成 token；`@xyflow/react/dist/style.css` 在 `CanvasScreen.tsx` 裡 import（跟著 lazy chunk）。
- [ ] **Step 7：** verify GREEN、build、lint。
- [ ] **Step 8：瀏覽器檢查**（1440 / 390）：從已核可 plan 進入畫布，看到 N 列 shot + 分鏡圖節點；拖動一個節點、重新整理後位置還在；開 / 收 / 拖寬抽屜，畫布跟著縮放；390 寬 `document.documentElement.scrollWidth === 390`。**兩個 page 開同一張畫布**：A 拖一下存檔後，B 拖一下 → B 出現 Reload 橫幅，A 的位置沒被蓋掉。
- [ ] **Step 9：** Commit `feat(trend-finder): canvas screen with autosave and editor drawer shell`。

---

### Task 6：節點元件 + 連線規則 + 新增節點（spec §5 表格、連線）

**Files:**
- Create: `src/components/canvas/nodes/ShotNode.tsx`、`PromptNode.tsx`、`GenNode.tsx`（storyboard 和 video 共用）、`UploadNode.tsx`、`FootageNode.tsx`、`src/components/canvas/AddNodeMenu.tsx`
- Modify: `CanvasScreen.tsx`、`canvas.css`、`src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes：Task 4 的 `PORTS`、`outMedia`、`canConnect`、`edgeLabel`
- Produces：`nodeTypes` 對照表；`addNode(doc, kind: NodeKind, at: { x: number; y: number }, shotId?: string): CanvasDoc`（加在 `graph.ts`，附一個單元測試：新 id 不撞、`footage` 沒給 `shotId` 時丟錯）

- [ ] **Step 1：寫失敗的單元測試**（`addNode`），FAIL → 實作 → PASS。
- [ ] **Step 2：** 每個節點依 `PORTS` 畫 `<Handle>`：輸入在左、輸出在右，handle 和線依媒體上色（`.cv-media-text|image|video`）。`in:start` / `in:ref` 的線用 `edgeLabel` 顯示「Start frame」/「Reference」。
- [ ] **Step 3：** ShotNode 顯示 shot 編號（目前 index + 1）、台詞（截兩行）、`removed` 時整個變淡並顯示「Removed from the shot list」。PromptNode 是一個 textarea（`data.text`）。GenNode 本 task 只顯示標題、模型名、空的預覽框（Task 7 補生成）。
- [ ] **Step 4：連線規則**：`isValidConnection` 用 `canConnect`；`onConnect` 前再檢查一次，不通過時在畫布底部顯示 `t(reason, vars)` 4 秒（`role="status"`），不建立連線。拖線時不相容的 handle 變灰（`connectionLineStyle` 加 class）。
- [ ] **Step 5：新增節點**：工具列「Add」選單（prompt、storyboard、video、upload），新節點放在目前畫面中央；每個 Shot 節點右下有「+」選單，加在該列（同 `y`、往右找空位），帶 `shotId`，並從 shot 的 `out` 自動接到新節點的 `in:text`（若有）。實拍節點只能從 Shot 的「+」加（它需要 `shotId`）。Shot 以外的節點可以刪（選取後 Delete 鍵），刪節點不刪生成紀錄。
- [ ] **Step 6：** verify、build、lint。
- [ ] **Step 7：瀏覽器檢查**：把 shot 的文字線拖到 video 的 Start frame 埠 → 被擋，底部出現原因；把分鏡圖接到 video 的 Start frame → 成功，線上有「Start frame」；從 shot 的「+」加一個 prompt 節點。1440 / 390 各一張。
- [ ] **Step 8：** Commit `feat(trend-finder): canvas node types and typed connections`。

---

### Task 7：生成、版本切換、過期、frameImage 回寫（spec §5 版本、§6 模型下拉、§11.5-4）

**Files:**
- Create: `src/components/canvas/VersionStrip.tsx`
- Modify: `GenNode.tsx`、`CanvasScreen.tsx`、`src/lib/strings/canvas.ts`、`canvas.css`

**Interfaces:**
- Consumes：Task 4 的 `getModels`、`startGen`、`pollGen`、`genRequest`、`missingInput`、`selectedGen`、`pendingGen`、`versionsOf`、`markStale`、`primaryFrames`
- Produces：`CanvasScreen` 內 `gens` state 和 `onGenerate(nodeId)`、`onSelectVersion(nodeId, genId)`

- [ ] **Step 1：模型下拉**：GenNode 的 `<select>` 只列 `kind` 對得上的模型（P1 只有 mock 一個），選項文字 `label · tier`；選了寫 `data.model`。選項對目前已接的線不相容時 `disabled` 並在 `title` 寫原因（用 `canConnect` 的 reason）。按鈕旁顯示價格：`estUsd === 0` 時「Free」，否則「≈ US$x.xx」（P2 才會出現）。video 節點另有長度選單（`durations`），寫 `data.duration`。
- [ ] **Step 2：Generate**：`missingInput` 不是 `null` 時按鈕 disabled 並顯示原因。按下 → `data.selected = null` → `startGen(genRequest(...))` → 把新列加進 `gens` → `pollGen`，每次更新那列。完成（`done`）時：對該節點 `markStale(doc, nodeId)`（下游變過期），並清掉自己的 `data.stale`。失敗時節點顯示錯誤字和「Try again」。有 `pendingGen` 時按鈕顯示「Generating…」且 disabled。
- [ ] **Step 3：回來時續追**：載入畫布時，對每個有 `pendingGen` 的節點各開一個 `pollGen`；卸載時 abort 全部。
- [ ] **Step 4：VersionStrip**：節點下方一排 `v1 v2 v3…`（`versionsOf`），選用的那個 `aria-pressed="true"`，失敗的顯示 ⚠ 和錯誤 `title`，進行中顯示轉圈。點一個 done 版本 → `data.selected = genId` → 對該節點 `markStale`。預覽框顯示 `selectedGen` 的圖（`<img>`）或影片（`<video muted playsInline controls preload="metadata">`）。`model === 'imported'` 的版本標「From the plan」。
- [ ] **Step 5：過期**：`data.stale` 時節點顯示「Out of date」標籤，按鈕文字改「Regenerate」。改 prompt 節點文字或 GenNode 的 `data.prompt`（blur 時）、新增 / 刪除連到某節點輸入的線，也對那個節點呼叫 `markStale`。**不自動重跑。**
- [ ] **Step 6：frameImage 回寫**：`doc` 或 `gens` 變動後算 `primaryFrames(doc, shots, gens)`，有差異就 `onChange({ shots: shots.map(...) })` 把那幾鏡的 `frameImage` 改成選用版本的 url（走現有的 ideas 存檔，Plan 頁就會顯示同一張）。
- [ ] **Step 7：** verify、build、lint。
- [ ] **Step 8：瀏覽器檢查**（mock，`MOCK_GEN_DELAY_S` 用預設 2 秒）：分鏡圖 Generate → 轉圈 → 出現佔位圖 v1；再生成一次 → v2；點 v1 切回；接一個 video 節點（Start frame）生成 → 出現測試片可播放；回去把分鏡圖切到 v2 → video 節點出現「Out of date」，沒有自動重跑；prompt 打 `#fail` 生成 → 失敗訊息和 Try again；生成中按返回再進來 → 完成後自動選用。回到 Plan 頁，該鏡的分鏡圖等於畫布上選用的那張。1440 / 390 各一張。
- [ ] **Step 9：** Commit `feat(trend-finder): mock generation with versions and stale marking`。

---

### Task 8：上傳節點 + 實拍節點接 takes（spec §5 上傳 / 實拍、§11.5-4）

**Files:**
- Modify: `backend/generations.py`（上傳路由）、`backend/tests/test_generations.py`、`UploadNode.tsx`、`FootageNode.tsx`、`CanvasScreen.tsx`、`src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes：`uploadTake`、`chooseTake`、`listTakes`、`checkFile`（`src/lib/takes.ts`）；Task 2 的 `insert_done`；Task 4 的 `uploadImage`
- Produces：
  - `POST /api/ideas/{idea_id}/gen/upload?nodeId=<id>`，body 是圖檔本身，`content-type` ∈ `image/png | image/jpeg | image/webp`，上限 20 MB，檢查檔頭（PNG `\x89PNG`、JPEG `\xff\xd8\xff`、WebP `RIFF....WEBP`）；節點必須是畫布上的 `upload` 節點；成功 → `insert_done(kind="image", model="upload", file=...)`，回 `to_json`。未核可 → 409。
  - Upload 節點 `data.media`：`'image'`（上傳圖後）或 `'video'`（上傳影片後）；`data.takeId`（影片時）

- [ ] **Step 1：寫失敗的 pytest**：PNG 上傳成功並出現在 `GET /gen`、`model == "upload"`；`text/plain` → 415；檔頭不對 → 415；超過上限 → 413；`nodeId` 不是 upload 節點 → 422。
- [ ] **Step 2–4：** FAIL → 實作 → PASS。
- [ ] **Step 5（前端）UploadNode**：一個檔案按鈕。圖 → `uploadImage`，成功後 `data.media = 'image'`，預覽和版本同 GenNode（每次上傳是一個新版本）。影片 → 必須有 `shotId`（沒有時說明「Add this from a shot's + menu to upload footage.」）→ 用該 shot 目前的 index 呼叫 `uploadTake`，成功後 `data.media = 'video'`、`data.takeId`，同一個 take 也會出現在該 shot 的實拍節點。檔案檢查用 `checkFile` 的訊息。
- [ ] **Step 6（前端）FootageNode**：列出 `takes` 裡 `shot === 該 shotId 目前的 index` 的 take（名稱、大小、選用中標記），可上傳新 take、可「Use this take」（`chooseTake`）。shot 已被移除時唯讀並說明。輸出 `video` = 選用中的 take。
- [ ] **Step 7：** verify、build、lint。
- [ ] **Step 8：瀏覽器檢查**：有 take 的 shot 在畫布上有實拍節點並列出 take；在實拍節點上傳一支測試片 → 出現在清單，回 Plan 頁的 Shoot / ShotChecklist 也看得到；Upload 節點上傳一張 PNG → 預覽出現、可接到 video 的 Reference。1440 / 390。
- [ ] **Step 9：** Commit `feat(trend-finder): upload and footage nodes wired to takes`。

---

### Task 9：整體驗收 + 開 PR

- [ ] **Step 1：** repo 根目錄 `bash bin/verify.sh` → `verify: GREEN`；`npm run build`、`npm run lint` 無錯。貼輸出。
- [ ] **Step 2：一次跑完 Review Focus 五條**（瀏覽器，port 8871）：舊 plan（核可前做過 Make frame、有 take）第一次開畫布、再開一次 v1 沒重複；兩個 page 的 409 Reload；生成中離開再回來；在 Plan 頁中間插一鏡、刪最後一鏡後回畫布；390 寬 `scrollWidth === 390`。
- [ ] **Step 3：** 確認沒有任何會花錢的呼叫：isolated backend log 沒有 `[budget]` 行。
- [ ] **Step 4：** push `feat/canvas-p1`，開 PR 到 `veralynchong/BuildClub` `main`，描述含：做了什麼（對照 spec §10 P1）、新依賴 `@xyflow/react@12.12.0`、截圖路徑、`## Verification`（Ran / Exercised / Not verified）、已知限制（見下方「留給使用者的決定」中仍未決定的項目）。結尾 `🤖 Generated with [Claude Code](https://claude.com/claude-code)`。**開好就停，不合併。**

---

## 留給使用者的決定（spec 沒寫清楚，本計畫先用預設）

1. **takes 仍以 shot 順序（index）綁定。** `takes` 表的 `shot` 欄是 index，spec §11.5-3 說舊 API 照舊能用。P1 用「shot id 目前的 index」去對 takes；在 Plan 頁把 shot 換順序或刪掉中間一鏡時，takes 會跟著錯位（現在就有這個問題）。預設：P1 不改 takes 表，另開工作把 takes 改成 shot id。
2. **實拍節點只在已有 take 的 shot 自動長出。** spec §4.3 只說預先接好分鏡圖節點。預設：沒有 take 的 shot 從 Shot 節點的「+」加。
3. **P1 期間有兩條生圖路。** spec §11.5-4 說舊的 Make frame 要改走新生成工作，但 §10 把換掉 `gpt-image-1` 放在 P2。預設：P1 不動舊端點；Plan 頁新做的圖，下次開畫布時以「From the plan」新版本匯入。
4. **哪個分鏡圖節點代表這一鏡。** 一個 shot 可以有好幾個分鏡圖節點。預設：只有自動建立的那個（`primary`）回寫 `frameImage`。
5. **核可被撤回後的畫布。** 預設：畫布唯讀可看，不能生成、上傳、存檔，等再次核可。
6. **Upload 節點的影片。** spec 說「影片走現有 takes」。預設：影片上傳必須屬於某個 shot（從該 shot 的「+」加），存成 take；不屬於任何 shot 的 Upload 節點只能傳圖。
7. **復原 / 重做不在 P1。** 不加 `zundo`、不直接加 `zustand`；需要時另行同意。
8. **mock 的失敗模擬。** 預設：prompt 含 `#fail` 必定失敗，`MOCK_GEN_FAIL_RATE` 可設隨機失敗率（預設 0）。
9. **手機版抽屜。** spec §4.2 說抽屜不蓋住畫布，沒寫手機。預設：860 px 以下畫布在上（60vh）、抽屜在下全寬。
10. **生成在使用者離開時完成。** 自動成為選用版本，但下游節點不會因此標過期（過期只在畫布開著時計算）。預設接受，P2 可改成用 `input_hash` 比對。
