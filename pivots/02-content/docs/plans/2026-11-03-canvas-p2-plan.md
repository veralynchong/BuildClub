# Remake 節點畫布 P2（接真的 AI 模型）執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 畫布上的分鏡圖和 AI 影片節點可以用真的模型生成（fal、Gemini），送出前看得到價格、扣每日錢包、失敗退款、結果下載回本機；新增「整條跑完」（一個 shot 從分鏡圖到影片，先報總價再確認）；舊分鏡圖端點的 `gpt-image-1` 換成同一套模型清單；實拍 take 改成依 shot id 對應。

**Architecture：**
- 新模組 `backend/gen_providers.py`：一個共用介面（`submit` → `poll`），三個 adapter（`mock`、`fal`、`gemini`）。HTTP 只用 `urllib`，透過可替換的 `http` 函式呼叫，測試全部用假的 HTTP 回應，**不打真 API**。
- `backend/generations.py` 的 worker 改成透過 adapter 跑；工作表加欄位（`provider_request_id`、`after`）和新狀態（`waiting`、`unknown`）。花錢走 `server.py` 的 `spend()` 加新的 `refund()`，以 `budget` callable 傳進 router（照 `storyboard.make_router` 的模式）。
- `gen_models.json` 加真模型與欄位（`endpoint`、`priceCheckedAt`、`retired`），前端 `GenModel` 型別同步。
- 前端只加：整條跑完的確認框、預算顯示、新狀態文案、下架模型提示。

**Tech Stack：** FastAPI、SQLite、urllib、pytest、React 19、TypeScript、`node --test`、headless playwright-core。**不新增任何 npm / pip 套件。**

**Spec：** `pivots/02-content/docs/specs/2026-11-02-node-canvas-editor-design.md`（本計畫實作 §10 的 P2 列；引用 §5 成本顯示、§6、§7、§11.5 第 4、5、7、8 條）。背景：研究報告 1C 段（`blenny/pivots/02-content/research/reports/AI 節點畫布與剪輯器 研究.md`，未追蹤檔，只讀）。P1 擱置清單：`.superpowers/sdd/2026-11-02-canvas-p1-plan/progress.md`。

## Global Constraints

- 路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明 repo 根目錄。
- **分支：** `feat/canvas-p2-models`，從 `feat/node-canvas-p1`（7db7614）開；PR 開到 `veralynchong/BuildClub`，**base = `feat/node-canvas-p1`**（P1 PR #28 未合併）。不 force-push、不 push main。**PR 開好就停：只有使用者對該 PR 明說「merge」才合併。**
- **不花錢（使用者 2026-11-03 決定：今晚不跑付費實測）。** 不讀 `.env`、不 source `api-keys.fish`、不設定 `FAL_KEY` / `GEMINI_API_KEY` 去打真 API。fal / Gemini adapter 只用假 HTTP 測。瀏覽器檢查只用 mock 模型。
- **依賴：** 不新增任何套件。`node_modules`、`backend/.venv` 是 symlink（已在 worktree）。
- **Port：** 測試 port 8871。不碰 8811、8805、8850（demo + tunnel）及 P1 計畫列的其他 port。
- 錢包：新錢包 `gen_image`、`gen_video`，環境變數 `DAILY_GEN_IMAGE_USD`（預設 0.50）、`DAILY_GEN_VIDEO_USD`（預設 1.00）〔我的決定，可推翻〕。`bin/isolated-backend.sh` 要把兩個都設 0（mock 價格 0，仍可跑）。
- 金鑰環境變數名：`FAL_KEY`、`GEMINI_API_KEY`。沒有 key 時該提供商的模型在 `/api/gen/models` 標 `available: false`，前端下拉顯示但不能選，原因「這個模型還沒設定金鑰」。
- 文案走 `t()`，`src/lib/strings/canvas.ts`，en + zhHant，key 以 `canvas.` 開頭。樣式只用 token，class 前綴 `cv-*`。只做 1440 桌面。
- 後端錯誤訊息照現有慣例寫英文句子；提供商回的原始錯誤只印到 server log，不回給前端。
- 每個 task 結束：repo 根目錄 `bash bin/verify.sh` → `verify: GREEN`；動前端的 task 再跑 `npm run build`、`npm run lint`、`npx tsc -b` 無錯（tsc 前 `mcp__flow__test_slot acquire kind=typecheck`，verify 前 acquire test slot，跑完 release）。
- commit：`<type>(trend-finder): <英文描述>`，結尾 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。每個 task 一個 commit。

## Review Focus

1. **提供商收了錢但我們不知道結果**（輪詢逾時、伺服器重啟時正在跑）：不能退款、不能標成普通失敗；要標 `unknown`，畫面顯示「可能已收費」。重啟時有 `provider_request_id` 的 `running` 列要**繼續輪詢**，不是直接判失敗。測試在 Task 4（`test_poll_timeout_marks_unknown_no_refund`、`test_restart_resumes_polling_rows_with_request_id`）。
2. **整條跑完到一半撞錯**：分鏡圖失敗時，等著的影片列變 `failed`（原因「起始畫面沒有做出來」）並退影片的錢；兩筆總額超過剩餘額度時一筆都不開始，回 429 並說剩多少。測試在 Task 5。
3. **換模型後舊連線不相容**：節點已接參考圖，使用者換成不吃參考圖的模型，按生成要被後端 422 擋下並說明，不能默默丟掉輸入；`startFrame: required` 的模型沒接起始畫面也要擋。測試在 Task 4（`test_model_input_rules_enforced`），前端 Task 7 顯示訊息。
4. **提供商回的檔案不對**（不是圖片 / 影片、超過大小、網址 404、HTML 錯誤頁）：列標 `failed` 並退款，`gen/` 資料夾不留半個檔案。測試在 Task 3（`test_fal_download_rejects_non_media`）和 Task 4。
5. **模型下架**：`gen_models.json` 標 `retired: true` 的模型不出現在新選單，但用它做出的舊版本照常顯示；節點目前選的是下架模型時提示換一個。測試在 Task 2（`test_retired_model_hidden_but_rows_still_load`）和 Task 7。

---

## 執行順序

```
Task 0  Manager：核對模型端點 / 價格 / 9:16（只看官方頁，免費），寫進設定檔草稿；基線 verify
Task 1  後端：錢包 refund + gen_image / gen_video 預算 callable
Task 2  後端：模型清單新欄位、可用性、下架
Task 3  後端：提供商 adapter（mock / fal / gemini）+ 下載
Task 4  後端：worker 接 adapter、扣款退款、unknown、重啟續跑、輸入規則
Task 5  後端：整條跑完（報價 + 確認 + 依賴列）+ 預算查詢
Task 6  後端：舊分鏡圖端點改走模型清單；take 依 shot id
Task 7  前端：價格 / 預算 / 整條跑完確認 / 新狀態 / 下架提示
Task 8  整體驗收（mock）+ 開 PR
```

---

### Task 0：模型核對（Manager，免費）

- [ ] 對每個候選模型打開**官方**頁（fal 的模型頁和 pricing、`ai.google.dev` 的 models / pricing），記下：端點 id、每張 / 每秒價格、是否支援 9:16、可選長度、是否吃起始畫面 / 參考圖、日期。候選：圖片 Nano Banana 2、Nano Banana Pro（Gemini 直連）、Seedream 4.5（fal）；影片 MiniMax Hailuo（fal）、Kling（fal）、Veo 3.1 Fast（fal）。
- [ ] 不支援 9:16 或找不到官方價格的模型不放（spec §11.5 第 5 條）。結果寫成 Task 2 要用的 JSON 條目，貼進 progress 檔。
- [ ] `bash bin/verify.sh` GREEN。

### Task 1：錢包退款與生成預算

**Files：** Modify `backend/server.py`（`spend` 附近、`gen_router` 建立處）、`bin/isolated-backend.sh`（repo 根）；Test `backend/tests/test_budget.py`（新）。

**Interfaces：**
- Produces：`refund(wallet: str, usd: float) -> None`（當日金額扣回，最低 0）；`remaining(wallet: str, cap: float) -> float`；`gen_budget(kind: str, usd: float) -> Optional[JSONResponse]`（kind ∈ image/video → 錢包 `gen_image` / `gen_video`，None 表示可花；否則 429，訊息含剩餘額度）；`gen_refund(kind: str, usd: float) -> None`；`gen_remaining() -> dict`（`{"image": {"spent", "cap"}, "video": {...}}`）。`generations.make_router(db, load, media_dir, budget=gen_budget, refund=gen_refund, remaining=gen_remaining)`，三個參數預設為「永遠允許 / 不做事 / 全 0」，讓既有測試不用改。

- [ ] 測試：`test_refund_floors_at_zero`、`test_spend_then_refund_restores`、`test_gen_budget_429_mentions_remaining`（cap 0.10、已花 0.08、要 0.05 → 429，訊息含 `0.02`）、`test_zero_cost_allowed_at_zero_cap`。
- [ ] 跑 → FAIL；實作；跑 → PASS。`isolated-backend.sh` 加 `DAILY_GEN_IMAGE_USD=0 DAILY_GEN_VIDEO_USD=0`。
- [ ] verify GREEN，commit `feat(trend-finder): gen wallets with refund`。

### Task 2：模型清單欄位、可用性、下架

**Files：** Modify `backend/gen_models.json`、`backend/generations.py`（`load_models`、`/api/gen/models`）、`src/lib/canvas/types.ts`；Test `backend/tests/test_generations.py`。

**Interfaces：**
- 每個模型新增：`endpoint: str`（提供商的模型 id，mock 為 `""`）、`priceCheckedAt: "YYYY-MM-DD"`、`retired?: bool`。`price.per` 允許 `image` / `second`。
- Produces：`load_models() -> list[dict]`（全部，含下架，供舊列查找）；`menu_models() -> list[dict]`（去掉 retired，加 `available: bool` 依金鑰是否存在：provider `fal` 看 `FAL_KEY`、`gemini` 看 `GEMINI_API_KEY`、`mock` 恆真）。`GET /api/gen/models` 回 `menu_models()`。`validate_models(models) -> list[str]`（錯誤清單：video 模型沒有 `9:16`、id 重複、provider 不在 {mock, fal, gemini}）。
- 前端 `GenModel` 加 `endpoint`、`priceCheckedAt`、`available`。

- [ ] 測試：`test_models_file_valid`（`validate_models(load_models()) == []`）、`test_retired_model_hidden_but_rows_still_load`（monkeypatch 清單：下架模型不在 `/api/gen/models`，但用它的舊列 `GET /gen/{id}` 仍 200）、`test_available_follows_keys`（monkeypatch env 有/無 `FAL_KEY`）、`test_create_rejects_unavailable_model`（無 key → 422 "This model isn't set up yet."）。
- [ ] 實作；把 Task 0 核對過的模型加進 JSON（保留 mock 兩個）。
- [ ] verify GREEN、tsc 無錯，commit `feat(trend-finder): real models in the model list`。

### Task 3：提供商 adapter

**Files：** Create `backend/gen_providers.py`、`backend/tests/test_gen_providers.py`；Modify `backend/generations.py`（mock 生成搬進 adapter）。

**Interfaces：**
- `Http = Callable[[str, str, dict, Optional[bytes]], tuple[int, dict, bytes]]`（method, url, headers, body → status, headers, body）；預設實作用 `urllib`，timeout 60 秒。
- `@dataclass Job: model: dict; prompt: str; start: Optional[Path]; references: list[Path]; duration: Optional[int]`（references 用 list，為之後的一致性參考圖留路）。
- `@dataclass Poll: state: Literal["running", "done", "failed"]; data: Optional[bytes] = None; ext: Optional[str] = None; error: Optional[str] = None`。
- `class Adapter(Protocol): def submit(self, job: Job) -> str  # request id` ； `def poll(self, job: Job, request_id: str) -> Poll`。
- `adapter_for(provider: str, http: Http = default_http) -> Adapter`。`ProviderError(Exception)`：提供商明確拒絕（4xx、回報失敗）→ 可退款。網路錯誤 / 5xx 在 poll 時視為「還在跑」，在 submit 時視為 `ProviderError`。
- **mock**：`submit` 回 `mock-<uuid>`；`poll` 照 P1 行為產生 SVG / ffmpeg 測試片（延遲、`#fail`、`MOCK_GEN_FAIL_RATE` 都保留）。
- **fal**（queue API）：`POST https://queue.fal.run/{endpoint}`，header `Authorization: Key $FAL_KEY`，body：`prompt`、`aspect_ratio: "9:16"`、影片加 `duration`、起始畫面放 `image_url`、參考圖放 `image_urls`（都用 `data:` URI，base64）。`poll`：GET 回應裡的 `status_url`（`IN_QUEUE` / `IN_PROGRESS` → running，`COMPLETED` → GET `response_url` 取 `images[0].url` 或 `video.url` 並下載）。實際欄位名以 Task 0 核對的模型頁為準，寫在模型條目的 `params` 對照（例如 `{"start": "image_url"}`），adapter 不寫死。
- **gemini**（圖片，同步）：`submit` 直接呼叫 `POST https://generativelanguage.googleapis.com/v1beta/models/{endpoint}:generateContent`（header `x-goog-api-key`），prompt + 參考圖用 `inline_data`，`imageConfig.aspectRatio: "9:16"`；結果存在 adapter 內的暫存 dict，`poll` 立刻回 done。
- 下載共用 `fetch_media(http, url, kind) -> tuple[bytes, str]`：上限圖片 20 MB、影片 200 MB；用檔頭判斷（PNG/JPEG/WebP，MP4 的 `ftyp`），不是就 `ProviderError("The model returned something that isn't an image/video.")`。

- [ ] 測試（全用假 `Http`，記錄送出的請求）：`test_fal_submit_sends_key_aspect_and_data_uri`、`test_fal_poll_states`（IN_QUEUE→running、COMPLETED→done 並下載）、`test_fal_4xx_is_provider_error`、`test_fal_5xx_while_polling_is_running`、`test_fal_download_rejects_non_media`（回 HTML）、`test_fal_download_size_cap`、`test_gemini_image_inline_data`、`test_gemini_refusal_is_provider_error`（無圖片 part）、`test_mock_adapter_keeps_p1_behaviour`（`#fail`、影片規格沿用 P1 測試）。
- [ ] 實作；P1 的 `test_mock_*` 全數照過。
- [ ] verify GREEN，commit `feat(trend-finder): provider adapters for fal and Gemini`。

### Task 4：worker 接 adapter、扣款與退款、unknown、續跑

**Files：** Modify `backend/generations.py`；Test `backend/tests/test_generations.py`。

**Interfaces：**
- Consumes：Task 1 的 `budget/refund`、Task 3 的 `adapter_for`、`Job`、`Poll`、`ProviderError`。
- 表格：`ALTER TABLE generations ADD COLUMN provider_request_id TEXT`、`ADD COLUMN after TEXT`（啟動時欄位不存在才加；`SCHEMA` 的 CREATE 也加上）。狀態：`waiting`（等上游，Task 5 用）、`queued`、`running`、`done`、`failed`、`unknown`。`to_json` 多回 `"after"`。
- `create`：驗證後、寫列前呼叫 `budget(kind, est)`，不准就回該 429，不寫列。
- `run(gen_id)`：`submit` 後立刻存 `provider_request_id`；之後每 `GEN_POLL_S`（預設 5，mock 0.2）`poll`，直到 done / failed 或超過 `GEN_TIMEOUT_S`（圖片 180、影片 900）。done → 檔案寫成 `<gen_id>.<ext>`（先寫 `.part` 再 `os.replace`），`actual_usd = est_usd`。`ProviderError` → failed + `refund`。逾時 → `unknown`，error「The provider didn't answer in time. It may have charged.」，**不退款**。
- 輸入規則（P1 擱置 m4）：模型 `inputs.startFrame == "required"` 而沒送 → 422 "This model needs a start frame."；送了模型為 `none` 的輸入 → 422 "This model doesn't take {a start frame|a reference image}."。
- `fail_unfinished` 改名 `recover(db, jobs)`：`queued` 和沒有 request id 的 `running` → failed + 退款；有 request id 的 `running` → 重新排進 worker 繼續 poll。

- [ ] 測試：`test_create_spends_estimate`、`test_over_budget_429_writes_no_row`、`test_provider_error_fails_and_refunds`、`test_poll_timeout_marks_unknown_no_refund`、`test_restart_resumes_polling_rows_with_request_id`、`test_restart_fails_and_refunds_unsubmitted`、`test_model_input_rules_enforced`、`test_done_writes_file_atomically`（poll 丟例外時 `gen/` 沒有殘檔）。用假 adapter（monkeypatch `adapter_for`）。
- [ ] 實作；P1 測試照過（`test_restart_fails_unfinished_jobs` 依新行為更新）。
- [ ] verify GREEN，commit `feat(trend-finder): run real generations with spend and refunds`。

### Task 5：整條跑完與預算查詢

**Files：** Modify `backend/generations.py`；Test `backend/tests/test_generations.py`。

**Interfaces：**
- `POST /api/ideas/{idea_id}/gen/chain`，body `{imageNodeId, videoNodeId, imageModel, videoModel, prompt, videoPrompt?, duration?, confirm: bool}`。兩個節點都要在畫布上、類型對（storyboard / video），且畫布上有 `imageNodeId → videoNodeId` 接在 `in:start` 的連線（沒有就 422 "Connect the storyboard to the video's start frame first."）。
- `confirm: false` → 200 `{"total": float, "items": [{"nodeId", "model", "usd"}], "remaining": {"image": float, "video": float}}`，不扣錢、不寫列。
- `confirm: true` → 先檢查兩個錢包都夠（任一不夠 → 429，訊息含剩餘，**都不扣**），再扣兩筆；寫圖片列（`queued`）和影片列（`waiting`，`after = 圖片 gen id`，`inputs.startFrame = 圖片 gen id`）；回 201 `{"image": gen, "video": gen}`。
- worker 完成一筆時：有 `after == 此 id` 的 `waiting` 列 → done 則改 `queued` 並排入；failed / unknown 則改 `failed`（"The start frame wasn't made, so the video didn't run."）並退影片的錢。`recover` 也處理孤兒 `waiting` 列（上游已結束）。
- `GET /api/gen/budget` → `gen_remaining()`。

- [ ] 測試：`test_chain_quote_spends_nothing`、`test_chain_needs_start_edge`、`test_chain_over_budget_starts_nothing`、`test_chain_runs_video_after_image`、`test_chain_image_failure_fails_and_refunds_video`、`test_recover_handles_orphan_waiting`、`test_budget_endpoint`。
- [ ] 實作，verify GREEN，commit `feat(trend-finder): run a whole shot with one confirmed price`。

### Task 6：舊分鏡圖端點換模型；take 依 shot id

**Files：** Modify `backend/storyboard.py`、`backend/server.py`（`storyboard_budget`）、`backend/takes.py`、`backend/canvas.py`；Test `backend/tests/test_storyboard.py`、`test_takes*.py`、`test_canvas.py`。

**決定〔我的決定，可推翻〕：** spec §11.5 第 4 條說舊端點要走新的生成工作；但 Make frame 在**核可前**也能按，那時沒有畫布節點，工作表需要 node id。所以舊端點改成**同步**呼叫同一套 adapter 和模型清單、扣 `gen_image` 錢包，不寫工作表；核可後畫布照 P1 匯入 `frameImage` 成 v1。

- `storyboard.py`：刪 `openai_image`、`OPENAI_URL`、`FRAME_IMAGE_PROVIDER`；新環境變數 `FRAME_IMAGE_MODEL`（模型 id，預設空 = 免費 SVG）。設了且模型 available → `budget("image", 價格)` → adapter `submit` + 輪詢（timeout 120 秒）→ 存 `frames/`；`ProviderError` / 逾時 → 502 且 ProviderError 時退款。回應的 `provider` 欄位改回模型 id 或 `"fake"`。
- takes：表加 `shot_id TEXT`；上傳時依目前 shot list 由 `{shot}` 索引取 shot id 存入；讀取時舊列（`shot_id` 為空）用索引補上並存回；`to_json` 的 `shot` = 該 shot id 在**目前** shot list 的索引（shot 已從清單刪除 → `null`），另回 `shotId`。後端用到 take 索引的地方（`renders.py`、`cutting.py` 等，先 grep `["shot"]` 和 `.shot`）改成用目前索引，`null` 的 take 跳過；前端 footage 節點改用 `shotId` 對應。canvas `reconcile` 的 `take_shots` 改用 shot id。
- [ ] 測試：`test_frame_uses_frame_image_model`（假 adapter）、`test_frame_default_is_free_svg`、`test_frame_provider_error_refunds`、`test_take_keeps_shot_after_reorder`（上傳到第 2 鏡 → 在前面插一鏡 → take 的 `shotId` 不變、`shot` 變 2）、`test_legacy_take_backfills_shot_id`、`test_canvas_footage_follows_shot_id`。
- [ ] 實作；更新被改到行為的既有測試（說明在 commit）。
- [ ] verify GREEN，commit `feat(trend-finder): frames on the model list, takes keyed by shot id`。

### Task 7：前端

**Files：** Modify `src/lib/canvas/api.ts`、`types.ts`、`graph.ts`、`src/components/canvas/nodes/GenNode.tsx`、`CanvasScreen.tsx`、`src/lib/strings/canvas.ts`、`src/styles/canvas.css`；Test `unit/canvas.test.mjs`。

**Interfaces：**
- api：`getBudget(): Promise<Budget>`、`quoteChain(id, body): Promise<Quote>`、`startChain(id, body): Promise<{image: Generation; video: Generation}>`。`Generation.status` 加 `'waiting' | 'unknown'`，加 `after?: string`。
- graph 純函式：`chainPair(doc, nodeId): { imageNodeId: string; videoNodeId: string } | null`（從 storyboard 節點找它 `in:start` 接到的 video 節點，或反向）；`priceOf(model, seconds) -> number`（從 `GenNode` 的 `price` 搬出，共用）。
- UI：
  - 模型下拉：`available: false` 的選項 disabled，後綴「需要金鑰」；每個選項顯示 tier 和約價（P1 已有，保留）。
  - 生成鈕旁顯示「約 US$x.xx · 今日剩 US$y.yy」（`getBudget`，生成後重新取）。
  - storyboard 節點有 `chainPair` 時多一個「整條跑完」按鈕 → `quoteChain` → 確認框（每項模型與價格、總額、剩餘額度；確定 / 取消）→ `startChain`；兩個節點都進 pending。
  - 狀態文案：`waiting`「等分鏡圖完成」、`unknown`「提供商沒有回應，可能已收費」（不給重試按鈕之外的動作）、429 直接顯示後端訊息。
  - 節點選到 retired / 不在選單的模型：提示「這個模型已下架，請換一個」，生成鈕停用。
  - 後端 422 輸入規則錯誤照現有錯誤顯示路徑顯示。
- [ ] 單元測試：`chainPair` 兩方向與無連線、`priceOf` 每張 / 每秒、`versionsOf` / `pendingGen` 把 `waiting` 當進行中。
- [ ] 實作；i18n 測試過（en / zhHant 對齊）。
- [ ] verify GREEN、build / lint / tsc 無錯，commit `feat(trend-finder): prices, budget and run-the-whole-shot on the canvas`。

### Task 8：整體驗收（只用 mock）+ PR

- [ ] `npm run build`；`bash bin/isolated-backend.sh 8871 --demo-data --user test@example.com:pw-for-e2e`；建一個已核可 plan（同 P1 計畫的建資料步驟）。headless playwright-core 1440×900：
  1. 下拉看得到真模型但 disabled（沒有 key），mock 可選；價格與「今日剩」顯示。
  2. storyboard → video 接 `in:start` 後「整條跑完」→ 確認框 US$0.00 → 圖完成後影片自動開始 → 兩個都 done。
  3. prompt 含 `#fail` 跑整條：圖 failed、影片 failed 並顯示原因。
  4. 截圖放 scratchpad，PR 描述附路徑。結束 kill backend。
- [ ] repo 根 `bash bin/verify.sh` GREEN；push；`gh pr create --repo veralynchong/BuildClub --base feat/node-canvas-p1`，描述含 `## Verification`（Ran / Exercised / Not verified：**真模型沒有實測**、fal / Gemini 欄位只對照文件）。**不合併。**
