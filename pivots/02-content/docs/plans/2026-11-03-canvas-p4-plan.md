# Remake 節點畫布 P4（收尾）執行計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal：** 剪輯器成為產生 `media/<ideaId>/cut/final.mp4` 的唯一途徑（移除舊「Make the video」），舊管線的「剪口頭禪 / 停頓」改成實拍 take 上的「整理」動作（產生一支新 take，可進剪輯器），畫布 / 剪輯器 / plan 頁成片區的文字全部走 `t()`（含後端回來的錯誤句），加一支免費報價的 demo 素材腳本（付費實跑另外由使用者核准），最後用 mock 模型跑完整條 E2E。

**Architecture：**
- **舊 Make the video 拆兩刀。** 前端先拆（Task 1）：plan 頁的 `CutPanel` 只留「成片」區（看片、下載、送審、審閱狀態），做片的控制（速度、調色、燒字幕、音樂、Make）拿掉，改成一個「到畫布開剪輯器」按鈕。後端再拆（Task 2）：`POST /api/ideas/{id}/cut`、`renders.run_pipeline`、`cutting.render_cut` 與只有它用的函式、`grading.py`、字幕 cue / 燒字的路由與函式。**保留**：`GET /cut`、`/cut/file`、`/cut/review`、`/cut/music`（剪輯器的 MusicTool 在用）、`renders` 表與 `out_source`、`is_stale` 的 `auto` 分支（舊列照樣能看、送審、過期判斷、發布）、`recover`、`cut_review.py`、`publishing.py`。
- **整理 take（Task 3–4）。** 新模組 `backend/cleaning.py`：一支 take → whisper 逐字 + `silencedetect` → `cutting.keep_intervals`（沿用舊規則：口頭禪整段剪、超過 0.4 秒的停頓剪到兩側各留 0.12 秒）→ ffmpeg 輸出一支新 mp4，存成同一個 shot 的新 take（`takes.cleaned_from` 指向原 take），並設為選用。只對 take，生成影片（AI 片段）沒有這個路由。剪輯器把「原 take 有整理版」當成「有新版本，套用？」，套用時換成整段整理版。
- **後端英文句的翻譯（Task 5）。** 前端 `serverText()` 用「完整英文句 → key」對照表翻譯後端錯誤與進度字；pytest 用 `ast` 把相關後端模組的錯誤句全部抽出來，和對照表雙向比對，後端改了句子或加了新句子都會紅。另一支 node 測試用 TypeScript 編譯器 API 掃畫布 / 剪輯器 / `CutPanel` 的 JSX，有字面文案就紅。
- **demo 素材（Task 7）。** `backend/demo_assets.py`：`quote` 模式離線算價（用 `generations.estimate_usd` 和 `gen_models.json`，同一個價格來源），印出每 shot、每模型、總額和每日錢包上限警告就結束；`run` 模式要 `--yes` 和 `--cap`，透過 HTTP 走現有的「整條跑完」API。本計畫只用 mock 測，**不實跑付費**。

**Tech Stack：** FastAPI、SQLite、ffmpeg / ffprobe、whisper.cpp（現有、本機、免費）、pytest、React 19、TypeScript（含 `typescript` 編譯器 API 做文案檢查，已是 devDependency）、`node --test`、Remotion 4.0.537（現有）、headless playwright-core。

**Spec：** `pivots/02-content/docs/specs/2026-11-02-node-canvas-editor-design.md`（本計畫實作 §10 的 P4 列；引用 §2 反目標、§8 最後一條、§11.5 #1、§3 i18n）。前一階段：`pivots/02-content/docs/plans/2026-11-03-canvas-p3-plan.md`（決定 8：take 剪口頭禪延到 P4）。

## Global Constraints

- 路徑相對於 `pivots/02-content/app/trend-finder`，除非寫明 repo 根目錄。
- **分支：** `feat/canvas-p4-finish`（疊在 `feat/canvas-p3b-editor-media`，PR #31，未合併）。PR 開到 `veralynchong/BuildClub`，**base = `feat/canvas-p3b-editor-media`**。合併順序 #28 → #29 → #30 → #31 → P4。不 force-push、不 push main。**PR 開好就停：只有使用者對該 PR 明說「merge」才合併。**
- **不新增依賴（npm 或 pip）。** Remotion 五個套件固定 4.0.537，已安裝。不動 `requirements.txt`、`package.json`。
- **Port：** 測試 8871，Remotion 8872（`REMOTION_PORT`）。**絕不用 8811、8805、8850**（8850 是客戶 demo）。
- **只做 1440 桌面**，不做手機版。所有文案走 `t()`（en + zhHant）。樣式只用既有 token，class 前綴 `cv-` / `cv-ed-`。
- **不花錢。** 任何地方都不呼叫付費 API（只用 mock 模型；ElevenLabs / fal / Gemini 一律不呼叫）。不打 live Apify。whisper.cpp 和 ffmpeg 是本機運算，不花錢。
- **不讀 `.env`**、不 source `api-keys.fish`、不設 `FAL_KEY` / `GEMINI_API_KEY` / `ELEVENLABS_API_KEY`。
- 每個 task 結束：repo 根目錄 `bash bin/verify.sh` → `verify: GREEN`（前後 `mcp__flow__test_slot` acquire / release）；動前端的 task 再跑 `npm run build`、`npx eslint . --ignore-pattern "render/experiment/**"`、`npx tsc -b`（tsc 前 acquire `kind=typecheck`），都無錯。
- 後端錯誤訊息照慣例寫英文一句話；ffmpeg / whisper 的 stderr 只印 server log，回前端前用 `editing.PATH_RE` 拿掉路徑、截 200 字。
- commit：`<type>(trend-finder): <英文描述>`，結尾 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。每個 task 一個 commit（Task 8 另有 docs commit）。
- **不刪資料：** 舊 DB 的 `cut_options` 表、舊 plan 資料夾裡的 `trims.json`、`subtitles.json` 留著不動（沒有程式再讀）。

## Review Focus

1. **舊管線做的成片（`out_source = 'auto'`）在移除後仍要照常運作。** 看得到、能下載、能送審、審閱連結能核准、核准後能發布；換了選用 take 或音樂後照舊標過期、送審被擋。測試：Task 2 `test_legacy_auto_cut_is_served_and_sendable`、`test_legacy_auto_cut_goes_stale_when_takes_change`、`test_approved_legacy_auto_cut_can_be_published`。
2. **整理一支沒有人聲的 take（B-roll、只有環境音、沒有音軌）。** 回一句清楚的話（「沒有找到人聲」/「沒有聲音」），原 take 不變、不多一列、不留檔案或 `.clean-*` 暫存資料夾。測試：Task 3 `test_no_speech_422_and_nothing_saved`、`test_no_audio_422`。
3. **連點兩次「整理」、或整理到一半 plan 被 Edit 重開。** 不會出現兩支整理版；重開時新檔刪掉、不寫列、回 409。測試：Task 3 `test_clean_while_cleaning_409`、`test_second_clean_of_same_take_409`、`test_plan_reopened_during_clean_keeps_nothing`。
4. **中文介面遇到後端句子。** 已知句子（含帶數字的樣板句）顯示中文且數字帶進去；對照表沒有的新句子原樣顯示英文，不是空白也不是 key。測試：Task 5 `serverText` 單元測試、`test_every_canvas_and_editor_server_sentence_is_translated`。
5. **demo 素材腳本的花費防線。** 沒有 `--yes`、總額超過 `--cap`、伺服器報價和本機報價不同 → 一個生成都不送出；中途一個 shot 失敗就停，不再送下一個。測試：Task 7 `test_run_refuses_without_yes_or_over_cap_and_sends_nothing`、`test_run_aborts_when_server_quote_differs`、`test_run_stops_at_first_failure`。

---

## 執行順序

```
Task 0  Manager：基線（分支、verify、node_modules 是本 worktree 的實體資料夾）
Task 1  前端：plan 頁移除 Make the video，CutPanel 只留成片區；刪掉孤兒元件 / lib / 文案
Task 2  後端：移除 POST /cut、自動剪片管線、調色、字幕 cue / 燒字；舊成片照常運作；測試改寫
Task 3  後端：整理 take（cleaning.py、takes.cleaned_from、路由、真 ffmpeg 測試）
Task 4  前端：畫布實拍節點「整理」、已整理標記、剪輯器「有新版本」改用整理版
Task 5  i18n：serverText 對照表 + 兩支釘住的測試（後端句雙向比對、JSX 無字面文案）
Task 6  小修：DELETE 旁白進 edit_lock、TextTool 數字欄草稿、品牌色在 change 事件存
Task 7  demo 素材腳本（quote 免費；run 只用 mock 測）
Task 8  整條 E2E（mock，8871 / 8872，1440×900）+ STATUS + PR
Task 9  〔使用者，付費，不在本計畫執行範圍〕demo 素材實跑
```

依賴：Task 2 在 Task 1 之後（前端先停止呼叫）。Task 5 在 Task 3、4 之後（要收 `cleaning.py` 的句子）。Task 6、7 獨立。Task 8 最後。

---

### Task 0：基線（Manager）

- [ ] `git status -sb` → `## feat/canvas-p4-finish`；`git log --oneline -1 feat/canvas-p3b-editor-media` 是本分支的祖先（`git merge-base --is-ancestor feat/canvas-p3b-editor-media HEAD`）。
- [ ] `test -d node_modules && ! test -L node_modules`（P3 已拆 symlink 並 `npm ci`；若又是 symlink，停下回報，不要裝東西）。`test -d node_modules/@remotion/renderer`。
- [ ] repo 根 `bash bin/verify.sh` → GREEN；`npm run build`、eslint、`npx tsc -b` 無錯。記下 pytest 與 unit 數量到 `.superpowers/sdd/2026-11-03-canvas-p4-plan/progress.md`。不 commit。

### Task 1：前端移除 Make the video

**Files：** Modify `src/components/CutPanel.tsx`、`src/components/PlanScreen.tsx`（把 `onOpenCanvas` 傳給 `CutPanel`）、`src/components/cut/CutVideo.tsx`（只剩 `url`）、`src/lib/cut.ts`、`src/lib/strings/cut.ts`、`unit/cut.test.mjs`；Delete `src/components/cut/AutoCutNote.tsx`、`CueEditor.tsx`、`GradePicker.tsx`、`SafeZones.tsx`、`SubtitleControls.tsx`、`SubtitleOverlay.tsx`、`useCues.ts`；`src/lib/grading.ts`、`unit/grading.test.mjs`、`src/styles/grading.css`（各自在 grep 確認沒有其他使用者後才刪；`grading.css` 也要從 import 它的地方拿掉）。

**Interfaces：**
- `CutPanel` props：`{ ideaId, status, shotCount, shotsDone, takesRevision?, onOpenCanvas: () => void }`（`shotsDone` 若刪完後沒用到就拿掉，`PlanScreen` 一起改）。
- `CutPanel` 行為：已核可且沒有成片 → 一行 `cut.panel.useEditor` + 按鈕 `t('canvas.open')` 呼叫 `onOpenCanvas`；有成片 → `CutVideo`、下載、送審（同現在的 `canSend` 規則）、`cut.panel.stale`、`reviewLine`、`cut.panel.editorMade`（`source === 'editor'` 時）、退回理由；`active` 時顯示進度（剪輯器出片中，plan 頁也看得到）。不再有速度、調色、燒字幕、音樂、Make、重試。
- `lib/cut.ts`：刪 `startCut`、`SPEEDS`、`canStartCut`，以及只有被刪檔案用的型別欄位（`CutState.options`、`CutState.autoCut`）；`getCut`、`pollCut`、`sendCutForReview`、`reviewLine`、`formatDuration`、`putMusic`、`deleteMusic`、`checkMusic` 保留（剪輯器、PublishPanel、SharedReviewPage 在用）。
- 文案：新增 `cut.panel.useEditor` en `"Make the video in the editor: open the canvas, then Open editor."` / zhHant `「影片改在剪輯器裡做：開啟畫布，再按「開啟剪輯」。」`（`Open editor` / 「開啟剪輯」要和 `canvas.ts` 裡開抽屜按鈕的實際文字一致，以檔案為準）。`cut.panel.stale` 改為 en `"The footage or music changed after this was made. Export it again in the editor."` / zhHant `「做好之後素材或音樂改過了，請在剪輯器重新出片。」`。只被刪掉的元件使用的 `cut.*` key 一併刪（逐個 `grep -rn "'<key>'" src` 確認）。

- [ ] 先改 `unit/cut.test.mjs`：刪掉測 `startCut` / `canStartCut` / `SPEEDS` 的案例；跑 `node --test unit/` → 因為 import 不到被刪函式而 FAIL 的只剩預期的那幾個。
- [ ] 實作上面的刪改。
- [ ] 檢查：`grep -rnE "startCut|canStartCut|GradePicker|SubtitleControls|CueEditor|AutoCutNote|useCues|SafeZone|SubtitleOverlay|lib/grading" src unit` 無輸出。
- [ ] verify GREEN、build / eslint / tsc 無錯。commit `refactor(trend-finder): drop Make the video from the plan page`。

### Task 2：後端移除舊管線

**Files：** Modify `backend/renders.py`、`backend/cutting.py`、`backend/subtitles.py`、`backend/server.py`（拿掉 `grading` 的 SCHEMA、router 與 `subtitles.make_router`）、`backend/tests/test_renders.py`、`backend/tests/test_cut_review.py`、`backend/tests/test_subtitles.py`、`backend/tests/test_cutting.py`、`backend/tests/test_cutting_media.py`、`backend/tests/test_takes.py`（1 處）、`backend/tests/test_publish_flow.py`；Delete `backend/grading.py`、`backend/tests/test_grading.py`。

**Interfaces：**
- `renders.py` 刪：`CutRequest`、`start_cut` 路由、`run_pipeline`、`RenderJobs._run` 的 auto 分支（`_run` 讀列後直接 `_run_editor`；`source` 不是 `editor` 的列標 `failed`、`error = GENERIC`）、`BAD_SPEED`、`SPEEDS`、只有被刪程式用的 import。`state_of` 不再回 `options`、`autoCut`；其他欄位（含 `speed`、`source`、`music`、`review`、`stale`）形狀不變。`_run_editor` 裡刪 `trims.json` / cues 檔的兩行拿掉。模組 docstring 改成「剪輯器出片的工作列與成片路由；`out_source='auto'` 是 P4 前舊管線留下的列，仍可看、送審、判斷過期」。
- **保留** `signature`、`chosen_ids`、`music_row`、`shot_count`、`is_stale`（兩個分支）、`recover`、`RenderJobs`、`get_cut`、`get_music_file`、`get_file`、`send_for_review`、`put_music`、`delete_music`、`export_edit`、`STALE_CUT`、`EDIT_STALE`、`NO_DISK`、`BUSY`、`DEFAULT_SPEED`。
- `cutting.py`：刪 `render_cut`、`build_join_graph`、`build_cut_graph`、`atempo_chain`、`output_duration`、`parse_loudnorm`、`measure_loudness`、`parse_progress`、`_render_pass`、`wordless_spans`、`LOUDNORM`、`MAX_INPUT_SEC` —— **每一個刪之前** `grep -rn "<name>" backend render bin` 確認除了它自己和它的測試沒有呼叫者；有呼叫者就留著並在 report 寫明。**一定保留**（Task 3 要用）：`num`、`parse_words`、`is_filler`、`_effective_ends`、`keep_intervals`、`describe_trims`、`parse_silences`、`missing_tools`、`CutError`、`run`、`_ffmpeg`、`probe`、`transcribe_words`、`FILLERS`、`MIN_FRAGMENT`、`FADE`、`NO_FFMPEG`、`NO_WHISPER`、`WHISPER_TIMEOUT`、`FFMPEG_TIMEOUT`。docstring 改成「ffmpeg / whisper 的小工具與剪停頓規則（整理 take 用）」。
- `subtitles.py`：刪 `make_router` 與 cue / SRT / 燒字相關（`BurnStyle`、`Cue`、`remap_words`、`group_cues`、`build_cues`、`srt_time`、`to_srt`、`find_font`、`_pillow`、`wrap_lines`、`render_cue_png`、`write_overlay`、`overlay_graph`、`cues_path`、`save_cues`、`load_cues`、`reusable_cues`）；保留 `is_cjk`、`width_units`（`generations.py`、`gen_providers.py` 在用）及它們需要的東西。同樣逐個 grep。
- 測試輔助（`test_renders.py`）：
  - `fake_export` fixture = 現在 `editor` fixture 的設定 + `fake_editor_ok`；`finished_cut(client)` 改成：上傳一個 take、`put_project`、`export`、`wait_for`，回 state。原本吃 `fake_pipeline` 的測試改吃 `fake_export`。`test_cut_review.py` 的 `sent` fixture 跟著改。
  - `legacy_cut(idea_id="ia", take_ids=(), music_id=None, shots=1) -> Path`：寫 `final.mp4`（`FINAL` bytes）+ 一筆 `renders` 列：`status='done'`、`source='auto'`、`out_source='auto'`、`out_size=len(FINAL)`、`out_duration=12.5`、`out_speed=1.1`、`out_shots=shots`、`out_signature=renders.signature(list(take_ids), 1.1, music_id)`；回 cut 資料夾。
- 測試去留：
  - **刪**（主題就是被刪的路由或管線）：`test_cut_needs_a_chosen_take_for_every_shot`、`test_not_approved_409`、`test_bad_request_bodies_422`、`test_missing_tools_503`、`test_cut_runs_and_reports_progress`、`test_progress_is_visible_while_running`、`test_failure_is_reported_and_work_dir_removed`、`test_unexpected_error_gets_a_generic_sentence`、`test_one_active_cut_per_plan_409`、`test_rerun_replaces_old_output`、`test_output_url_changes_after_every_successful_run`、`test_failed_rerun_keeps_old_output`、`test_music_is_passed_to_the_pipeline`、`test_total_input_over_10_minutes_409`、`test_not_enough_disk_409`、`test_two_starts_cannot_both_pass`、`test_auto_cut_summary_is_served_and_old_videos_have_none`、`test_export_busy_with_auto_cut`、`test_cut_busy_with_editor_export`；`test_grading.py` 全部；`test_subtitles.py` 裡測被刪函式與 `/cut/subtitles` 的；`test_cutting.py` / `test_cutting_media.py` 裡測被刪函式的（`keep_intervals`、`parse_silences`、`describe_trims`、`parse_words` 的測試留著）。
  - **改用 `legacy_cut`**（測舊列的過期規則）：`test_stale_after_choosing_another_take`、`test_stale_after_music_change_but_not_speed`、`test_stale_ignores_takes_beyond_the_shot_count`、`test_stale_when_the_number_of_picked_shots_changes`、`test_send_stale_cut_409`、`test_send_stale_shot_count_409`。
  - **改用 `fake_export` / 新 `finished_cut`**：其餘用到 `start(...)` 或 `fake_pipeline` 的（下載、重啟、登入、審閱連結、重開、送審系列、重出清掉審閱等），斷言不變。`test_restart_marks_running_failed` 直接插 `status='running'` 的列，不經路由。
  - 刪完後 `grep -rn "fake_pipeline\|slow_pipeline\|run_pipeline\|start(client" backend/tests` 無輸出。

- [ ] 新測試（先寫，跑 → FAIL）：
  - `test_old_cut_route_is_gone`：`client.post("/api/ideas/ia/cut", json={"shotCount": 1, "speed": 1.1}).status_code == 405`。
  - `test_grade_and_cue_routes_are_gone`：`GET /api/cut/grades`、`GET /api/ideas/ia/cut/subtitles`、`GET /api/ideas/ia/cut/subtitles.srt` 都 404。
  - `test_cut_state_has_no_grade_or_autocut`：`finished_cut` 後 `GET /cut` 的 keys 不含 `options`、`autoCut`。
  - `test_legacy_auto_cut_is_served_and_sendable`：選用 take `t1`、`legacy_cut(take_ids=[t1])`、開審閱連結 → `GET /cut` 為 `status 'done'`、`source 'auto'`、`stale False`、有 `output.url`；`/cut/file` 200；送審 200 且 `review.status == 'waiting'`。
  - `test_legacy_auto_cut_goes_stale_when_takes_change`：同上，再上傳並選另一支 take → `stale True`；送審 409，訊息 `renders.STALE_CUT`。
  - `test_editor_export_replaces_legacy_auto_cut`：`legacy_cut` + 已送審 → `export` 完成後 `out_source == 'editor'`、`cut_reviews` 沒有該 plan 的列。
  - `test_approved_legacy_auto_cut_can_be_published`（`test_publish_flow.py`）：`legacy_cut` + `cut_reviews` 核准該版本 → `publishing.approved_cut(conn, server.load, root, "ia")` 回 `final.mp4` 路徑；之後換選用 take → 回 `None`。
- [ ] 實作刪除；跑 → PASS。`backend/.venv/bin/python -c "import sys; sys.path.insert(0,'backend'); import server"` 能載入。
- [ ] verify GREEN。commit `refactor(trend-finder): remove the old auto-cut pipeline; the editor makes the video`。

### Task 3：整理 take（後端）

**Files：** Create `backend/cleaning.py`、`backend/tests/test_cleaning.py`；Modify `backend/takes.py`、`backend/cutting.py`（加 `build_clean_graph`）、`backend/server.py`（`include_router`、`takes.migrate` 已在呼叫的地方不用動）、`backend/tests/test_cutting_media.py`（真 ffmpeg 一支）。

**Interfaces：**
- `takes.py`：`migrate` 加 `cleaned_from TEXT` 欄；`COLUMNS` 末尾加 `cleaned_from`（index 9，既有 index 不動）；`SCHEMA` 的 `CREATE TABLE` 同步加欄；`to_json` 多 `"cleanedFrom": row[9]`（舊列 `None`）；`upload` 的 INSERT 給 `None`。
- `cutting.build_clean_graph(keeps: list[tuple[float, float]]) -> str`：輸入 0 是 take 本身；每段 `[0:v]trim=start=a:end=b,setpts=PTS-STARTPTS[v{i}]`、`[0:a]atrim=...,asetpts=PTS-STARTPTS,afade=t=in:d=FADE,afade=t=out:st=(len-FADE):d=FADE[a{i}]`，最後 `concat=n=N:v=1:a=1[v][a]`。不縮放、不改 fps（剪輯器 composition 會填滿 1080×1920）。
- `cleaning.py` 常數：`MAX_CLEAN_S = 180`；
  `NO_AUDIO = "This take has no sound, so there is nothing to clean."`、
  `NO_SPEECH = "No speech was found in this take, so nothing was cut."`、
  `NOTHING = "This take has no fillers or long pauses to cut."`、
  `TOO_SHORT = "Less than a second would be left after cleaning, so nothing was made."`、
  `TOO_LONG = f"This take is longer than {MAX_CLEAN_S // 60} minutes, so it can't be cleaned."`、
  `ALREADY_CLEAN = "This take is already cleaned."`、`HAS_CLEAN = "This take already has a cleaned copy."`、`CLEANING = "This take is already being cleaned."`。
- `cleaning.words_fn = cutting.transcribe_words`（模組層，呼叫時才查，測試可換）。
- `clean_take(src: Path, work: Path, out: Path) -> dict`：`probe` → 無音軌 `CutError(NO_AUDIO)`；長度 > `MAX_CLEAN_S` → `TOO_LONG`；抽 16 kHz 單聲道 wav；`words_fn(wav, work)` 空 → `NO_SPEECH`；`silencedetect=n=-35dB:d=0.15`；`keeps = keep_intervals(words, silences, total)`；剪掉 < 0.1 秒 → `NOTHING`；留下 < 1.0 秒 → `TOO_SHORT`；graph 寫進 `work/clean.txt`，`_ffmpeg([-i src, -/filter_complex, clean.txt, -map [v], -map [a], -c:v libx264, -crf 18, -preset veryfast, -pix_fmt yuv420p, -c:a aac, -b:a 192k, -ar 48000, -movflags +faststart, out.with_suffix('.part')])` → `os.replace` 到 `out`。回 `{"originalSec": total, "cleanSec": probe(out).duration, "trims": [{"kind", "start", "end"}]}`（`describe_trims(keeps, words, [total], total)` 去掉 `shot`）。
- `make_router(db, load, media_dir) -> APIRouter`：`POST /api/ideas/{idea_id}/takes/{take_id}/clean`（async；重活用 `run_in_threadpool(clean_take, ...)`）。順序：plan 不存在 404 `"That plan doesn't exist."`；不是 approved 409 `"Only an approved plan can take footage."`；take 不屬於此 plan 404 `"That take doesn't exist."`；`cleaned_from` 非空 409 `ALREADY_CLEAN`；已有 `cleaned_from = take_id` 的列 409 `HAS_CLEAN`；該 shot 已有 `takes.MAX_TAKES_PER_SHOT` 支 → 409 同 `takes.upload` 的句子；`cutting.missing_tools()` → 503；take id 已在模組層 `_cleaning: set[str]`（配一把 `threading.Lock`）→ 409 `CLEANING`。工作資料夾 `<media>/<idea>/.clean-<take_id>/`，`finally` 刪掉並把 id 移出 `_cleaning`。輸出 `<media>/<idea>/<新 id>.mp4`。寫入在 `takes.takes_lock` 內：重查 plan 仍 approved（否則刪新檔、409 同上）、原 take 仍在（否則刪新檔、404）、shot 未滿；INSERT（`name` = 原 take 的 name、`ext 'mp4'`、`shot` / `shot_id` 同原 take、`cleaned_from = take_id`、`chosen 1`），同 shot 其他 take `chosen = 0`。成功回 **201** `{"take": to_json(新列), "takes": 該 plan 全部 take（同 GET /takes）, "originalSec", "cleanSec", "trims"}`。`CutError`：上面五個內容錯誤回 422 原句；其他（ffmpeg 失敗、whisper 失敗）回 422 `PATH_RE` 處理過、≤ 200 字的句子；`NO_WHISPER` / `NO_FFMPEG` 回 503。
- 刪原 take 不影響整理版（它是一支獨立的 take）。

- [ ] 測試（`test_cleaning.py`；用 `test_cutting_media.make_clip` 做真檔、沒有 ffmpeg 就 skip；`words_fn` 用 monkeypatch 換成假字；`cutting.missing_tools` 換成 `lambda: None`）：
  - `test_clean_take_makes_a_chosen_cleaned_copy`：`GAP_CLIP`（3.5 秒、1.0–2.5 秒無聲）+ `FAKE_WORDS` → 201；新 take `cleanedFrom == 原 id`、`chosen True`，原 take `chosen False`；`cleanSec <= originalSec - 0.9` 且 `>= 1.0`；`trims` 恰一段 `kind 'pause'`；新檔存在；資料夾沒有 `.clean-*` 與 `*.part`。
  - `test_filler_is_cut`：字裡有 `(1.0, 1.4, "um")` → `trims` 有 `kind 'filler'`。
  - `test_no_audio_422`（`with_audio=False`）、`test_no_speech_422_and_nothing_saved`（字 `[]`）：422 原句；take 數不變、資料夾檔案清單不變。
  - `test_nothing_to_clean_422`：字連續蓋滿整段 → 422 `NOTHING`。
  - `test_cleaned_take_cannot_be_cleaned_again_409`、`test_second_clean_of_same_take_409`。
  - `test_clean_while_cleaning_409`：`words_fn` 等一個 `threading.Event`，背景執行緒送第一個請求，第二個請求 409 `CLEANING`；放行後第一個 201。
  - `test_plan_reopened_during_clean_keeps_nothing`：`words_fn` 裡把 plan 改成 `waiting`（`store_ideas`）→ 409；沒有新列、沒有新 mp4。
  - `test_clean_needs_tools_503`、`test_clean_needs_approved_plan_409`、`test_clean_unknown_take_404`、`test_clean_route_needs_sign_in`（登出後 401，照 `test_cut_routes_need_sign_in` 的做法）。
  - `test_clean_take_shot_full_409`：該 shot 已 10 支。
  - `test_cleaned_take_is_an_editor_source`：整理後 `GET /edit/sources` 有 `take:<新 id>`，`shotId` 同原 take。
  - `test_takes_list_has_cleaned_from`：一般上傳的 take `cleanedFrom is None`；舊資料庫（沒有該欄）`migrate` 後讀得到 `None`。
  - `test_cutting_media.py::test_build_clean_graph_cuts_the_gap`：真 ffmpeg 跑 `build_clean_graph([(0, 1.12), (2.38, 3.5)])` → 長度 2.24 ± 0.05 秒、有 aac。
- [ ] 跑 → FAIL；實作；跑 → PASS。verify GREEN。commit `feat(trend-finder): clean a take by cutting fillers and long pauses`。

### Task 4：整理 take（前端）

**Files：** Modify `src/lib/takes.ts`、`src/components/canvas/nodes/FootageNode.tsx`、`src/components/canvas/nodes/ctx.ts`、`src/components/canvas/CanvasScreen.tsx`、`src/components/ShotChecklist.tsx`（只加標記）、`src/lib/editor/timeline.ts`、`src/lib/editor/useTimelineActions.ts`、`src/lib/strings/canvas.ts`、`src/styles/canvas.css`（需要時）；Test `unit/takes.test.mjs`、`unit/editor.test.mjs`。

**Interfaces：**
- `Take` 加 `cleanedFrom: string | null`。
- `cleanTake(ideaId: string, takeId: string): Promise<CleanResult>`；`CleanResult = { take: Take; takes: Take[]; originalSec: number; cleanSec: number; trims: { kind: 'pause' | 'filler'; start: number; end: number }[] }`；錯誤丟 `Error(body.error ?? t('canvas.footage.cleanFailed'))`（Task 5 再套 `serverText`）。
- `canClean(take: Take, all: Take[]): boolean`：自己不是整理版，且沒有任何 `x.cleanedFrom === take.id`。
- ctx 加 `cleanTake: (nodeId: string, takeId: string) => void`；CanvasScreen 用現有的 `working(nodeId, run, fallback)` 包，成功後 `setTakes(res.takes)`，並用現有的提示機制顯示 `canvas.footage.cleanDone`（`{sec}` = `(originalSec - cleanSec).toFixed(1)`）。忙碌狀態沿用 `uploading(nodeId)`（整理中整個節點的按鈕 disabled）。
- FootageNode 每列 take：`canClean` 且非 `readOnly` / `gone` → 按鈕 `canvas.footage.clean`（`title` = `canvas.footage.cleanHint`）；整理版顯示徽章 `canvas.footage.cleanedBadge`。整理中預覽區顯示 `canvas.footage.cleaning`（同 uploading 的 spinner 樣式）。ShotChecklist 的 take 列在 `cleanedFrom` 非空時顯示同一個徽章（用 `canvas.footage.cleanedBadge`）。
- 文案（en / zhHant）：`canvas.footage.clean` `"Clean up"` / 「整理」；`canvas.footage.cleanHint` `"Cuts long pauses and filler words from this take. The original stays."` / 「剪掉這支 take 的長停頓和口頭禪，原檔保留。」；`canvas.footage.cleaning` `"Cleaning…"` / 「整理中…」；`canvas.footage.cleanedBadge` `"Cleaned"` / 「已整理」；`canvas.footage.cleanDone` `"Cut {sec} s of pauses and fillers."` / 「剪掉了 {sec} 秒的停頓和口頭禪。」；`canvas.footage.cleanFailed` `"The take couldn't be cleaned."` / 「這支 take 整理失敗。」。
- `clipStatus(clip, doc, gens, takes)`：take 片段、原 take 還在、且有 `cleanedFrom === src.id` 的 take → `{ state: 'newer', source: { kind: 'take', id: <最新 createdAt 的那支>, shotId: src.shotId } }`；片段已經指向整理版 → `ok`。（拿掉現在那行「a take is never a newer version」註解，改說明整理版例外。）
- `applyNewer(p, clipId, source, duration, whole = false)`：`whole` 時 `in = 0`、`out = floorFrames(duration)`；套用後 `totalLength > MAX_TOTAL` → 回原 `p`（不變）。`useTimelineActions.applyNewer` 在 `src.kind === 'take'` 時傳 `whole = true`。

- [ ] 單元測試：`canClean` 三種（原 take 無整理版 true、整理版 false、原 take 已有整理版 false）；`clipStatus` 三種（有整理版 → newer 指向它；兩支整理版取 createdAt 較新；片段已在整理版 → ok）；`applyNewer(p, 'c1', src, 5.4, true)` → `in 0`、`out 5.4`；總長會超過 180 → 回同一個物件（`===`）；`whole` 預設 false 時行為與現在相同（現有測試不改）。
- [ ] 跑 → FAIL；實作；跑 → PASS。verify GREEN、build / eslint / tsc。commit `feat(trend-finder): clean up a take from the canvas footage node`。

### Task 5：i18n 補齊

**Files：** Create `src/lib/serverText.ts`、`src/lib/strings/server.ts`、`unit/copy.test.mjs`、`backend/tests/test_server_text.py`；Modify `src/lib/i18n.ts`（`areas` 加 `server`、`AllEn` 加 `typeof server.en`）、`src/lib/canvas/api.ts`、`src/lib/canvas/upload.ts`、`src/lib/editor/api.ts`、`src/lib/cut.ts`、`src/lib/takes.ts`、以及顯示 `cut.step` / `cut.error` / 生成列 `error` 的元件（以 `grep -rnE "\.step\b|\.error\b" src/components/canvas src/components/editor src/components/CutPanel.tsx` 找）。

**Interfaces：**
- `strings/server.ts`：`export const en = { 'server.<module>.<slug>': "<後端原句>", ... }`、`export const zhHant = {...}`，**每個值單行、雙引號或單引號字串**（pytest 用 regex 讀）。後端 f-string 的 `{運算式}` 在這裡寫成具名佔位 `{name}`（如 `{minutes}`、`{left}`、`{detail}`）。
- `serverText(text: string | null | undefined): string`：`null` / `undefined` → `''`；英文介面 → 原句；先找完全相同的 en 值，再找樣板（en 值 escape 後把 `{name}` 換成 `(.+?)`、頭尾錨定），找到就 `t(key, 擷取到的值)`；都找不到 → 原句。
- 套用：上列 lib 的 `throw new Error(body?.error ?? fallback)` 改成 `throw new Error(serverText(body?.error) || fallback)`；元件顯示 `cut.step`、`cut.error`、生成的 `error` 時包 `serverText(...)`。
- **pytest 抽句規則**（`ast`）：在模組清單裡收集 (a) 呼叫名為 `error`、`CutError`、`step` 的第一個字串參數（`step` 取第二個參數）、keyword `step=` 的值；(b) 模組層全大寫名稱、值是開頭大寫且以 `.` 或 `?` 結尾的字串。`JoinedStr` 的 `FormattedValue` 一律正規化成 `{}`；`server.ts` 的 `{name}` 也正規化成 `{}` 再比。模組清單：`canvas.py`、`generations.py`、`gen_providers.py`、`editing.py`、`brand.py`、`takes.py`、`renders.py`、`cleaning.py`、`cutting.py`。`server.py` 不在清單（太大、大部分是搜尋頁），但它的生成錢包 429 句要手動加進表裡。

- [ ] 測試：
  - `backend/tests/test_server_text.py::test_every_canvas_and_editor_server_sentence_is_translated`：清單模組的句子 − 表 = 空集合（失敗訊息列出缺的句子）。
  - `test_every_translation_still_matches_backend`：表 − 全部 `backend/*.py` 的句子（同規則抽）= 空集合。
  - `unit/copy.test.mjs`：
    - `canvas, editor and the plan cut panel have no literal copy`：用 `typescript` 的 `createSourceFile` 解析 `src/components/canvas/**/*.tsx`、`src/components/editor/**/*.tsx`、`src/components/CutPanel.tsx`；`JsxText` 含 `[A-Za-z一-鿿]` → 失敗；屬性 `aria-label` / `title` / `placeholder` / `alt` / `label` 的值是含字母的字串常值 → 失敗；JSX 子節點是 `{'字串'}` 且含字母 → 失敗。失敗訊息 `檔案:行`。
    - `serverText translates known sentences and keeps unknown ones`：`setActiveLang('zh-Hant')`；`serverText(editing 的 MISSING_SOURCE 原句)` 符合 `/[一-鿿]/`；`serverText("This take is longer than 3 minutes, so it can't be cleaned.")` 含 `3` 且含中文；`serverText('Something new happened.') === 'Something new happened.'`；`serverText(null) === ''`；切回 `en` 後原句不變。
    - `export progress words are translated`：zh 下 `serverText('Exporting')`、`serverText('Waiting to start')` 含中文。
- [ ] 跑 → FAIL（pytest 列出缺的句子，就是要翻的清單）；寫表（zhHant 用自然的繁中，術語沿用 `canvas.ts` / `editor.ts`：take、分鏡圖、剪輯器、出片、送審）；套用；跑 → PASS。現有 `i18n.test.mjs` 的 key 對稱 / 佔位一致檢查自動涵蓋 `server`。
- [ ] verify GREEN、build / eslint / tsc。commit `feat(trend-finder): show server messages in the chosen language on the canvas and editor`。

### Task 6：小修（P3 停車的三項）

**Files：** Modify `backend/editing.py`（`delete_voice`）、`backend/tests/test_editing.py`、`src/components/editor/tools/TextTool.tsx`、`src/components/editor/tools/BrandTool.tsx`、`src/lib/editor/timeline.ts`；Test `unit/editor.test.mjs`。

**Interfaces：**
- `delete_voice`：讀專案、檢查 in-use、`unlink` 三步都在 `with edit_lock:` 內（`gate` 與找檔在鎖外）。
- `parseSeconds(raw: string): number | null`（`timeline.ts`）：去頭尾空白後空字串、非有限數、負數 → `null`；其他 → `Number(raw)`。
- TextTool 起 / 訖欄：各自的字串草稿 state；`onChange` 只改草稿；`onBlur` 與 Enter 時 `parseSeconds` 非 null 才 `patch`，否則草稿回到 `round1(item.start/end)`。
- BrandTool 主色：用 ref 綁原生 `change` 事件（選色器關閉時觸發）存色；`onBlur` 保留當後備；同一個值不重存（現有 `next !== color` 判斷）。

- [ ] 測試：`test_delete_voice_takes_the_edit_lock`：測試執行緒先拿 `editing.edit_lock`，背景執行緒送 DELETE，0.3 秒後仍未回應；放開鎖後回 200、檔案已刪。`parseSeconds`：`'1.5' → 1.5`、`' 2 ' → 2`、`'' → null`、`'abc' → null`、`'-1' → null`、`'0' → 0`。
- [ ] 跑 → FAIL；實作；跑 → PASS。verify GREEN、build / eslint / tsc。commit `fix(trend-finder): voice delete under the edit lock, text timing drafts, brand colour on change`。

### Task 7：demo 素材腳本（只做免費部分）

**Files：** Create `backend/demo_assets.py`、`backend/tests/test_demo_assets.py`。

**Interfaces：**
- CLI（從 app 目錄跑）：
  - `backend/.venv/bin/python backend/demo_assets.py quote --idea <id> --image-model <id> --video-model <id> [--duration <秒>] [--db backend/data.db]`
  - `backend/.venv/bin/python backend/demo_assets.py run --idea <id> --image-model <id> --video-model <id> [--duration <秒>] --base http://127.0.0.1:<port> --email <email> --password-stdin --cap <USD> --yes`
- `pick_duration(model: dict, duration: Optional[int]) -> int`：給了就必須在 `model["durations"]` 內（否則 exit 2）；沒給取最短的那個。
- `plan_items(shots: list[dict], image_model: dict, video_model: dict, seconds: int) -> list[dict]`：每 shot 一項 `{"shot": 1起算, "shotId", "imageModel", "imageUsd", "videoModel", "seconds", "videoUsd"}`，價格用 `generations.estimate_usd`。
- `quote(items) -> dict`：`{"items", "byModel": {model_id: usd}, "total"}`（`round(..., 4)`）。
- `format_quote(q: dict, caps: dict) -> str`：每 shot 一行、每模型小計、`Total US$x.xx`（兩位小數）；`caps = {"image": float, "video": float}` 來自 `DAILY_GEN_IMAGE_USD` / `DAILY_GEN_VIDEO_USD`（預設 0.50 / 1.00，與 server 同源讀法），任一錢包需求超過上限 → 加一行 `Needs US$a of the daily <kind> budget, but the cap is US$b. Raise DAILY_GEN_<KIND>_USD for the run.`。
- quote 模式：只讀 SQLite（`file:<db>?mode=ro` URI），從 `store` 的 `ideas` 找 plan；plan 不存在、不是 approved、沒有 shots、模型不存在或 kind 不對 → stderr 一句、exit 2。印完 exit 0。**不連網、不讀金鑰。**
- `Api = Callable[[str, str, Optional[dict]], tuple[int, dict]]`；`http_api(base: str) -> Api`（`urllib` + cookie jar，不新增依賴）。
- `run(api: Api, idea_id, image_model, video_model, seconds, cap: float, yes: bool, email, password, out=print) -> int`：
  1. 本機報價；`not yes` → exit 3；`total > cap` → exit 3。這一步之前**不送任何請求**。
  2. 登入 `POST /api/auth/login`。讀 `GET /api/ideas/{id}/canvas`；每個 shot 確保有一個 storyboard 節點和一個 video 節點、且有 storyboard → video `in:start` 的連線（缺的照 `src/lib/canvas/graph.ts` `addNode` 與 `canvas.py` 驗證規則的形狀補上，一次 `PUT`，帶版本號）。
  3. 每個 shot 先 `POST /api/ideas/{id}/gen/chain`（`confirm: false`）取伺服器報價；所有 shot 的伺服器總額與本機總額差 > 0.005 → exit 4，**不送任何 confirm**。
  4. 逐 shot：`confirm: true` → 兩個節點 `data.awaiting` 設成回傳的 image / video id（`PUT` canvas，版本衝突就重讀再設一次）→ 輪詢 `GET /api/ideas/{id}/gen/{gen_id}` 到 `done` / `failed` / `unknown`（逾時用 `generations.GEN_TIMEOUT_S`）。任一不是 `done` → 印出原因、exit 5，**不再送下一個 shot**。
  5. 全部完成印每 shot 的 gen id 與實際價、exit 0。
- 腳本不讀 `.env`、不設金鑰；金鑰與錢包上限是伺服器那邊的事。

- [ ] 測試（全部 mock，不連外網；`urllib.request.urlopen` monkeypatch 成丟例外以證明 quote 不連網）：
  - `test_quote_prices_each_shot_and_model`：3 shots、`seedream-4.5` + `hailuo-2.3-fast`、6 秒 → 每 shot `imageUsd 0.04`、`videoUsd 0.192`，`total == 0.696`，輸出含 `Total US$0.70`。
  - `test_quote_mock_models_is_free`：`mock-image` + `mock-video` → `total == 0`、`Total US$0.00`。
  - `test_quote_warns_over_daily_caps`：6 shots、`hailuo-2.3-fast` 6 秒（1.152 > 1.00）→ 輸出含 `DAILY_GEN_VIDEO_USD`。
  - `test_quote_rejects_bad_input`：未知模型、影片模型放在 `--image-model`、`--duration 7` 不在清單、plan 不是 approved → exit 2。
  - `test_run_refuses_without_yes_or_over_cap_and_sends_nothing`：假 `Api` 記錄呼叫 → 兩種情況都 exit 3 且呼叫清單為空。
  - `test_run_aborts_when_server_quote_differs`：假 `Api` 的 chain 報價多 0.01 → exit 4，沒有任何 `confirm: true` 的呼叫。
  - `test_run_stops_at_first_failure`：假 `Api` 讓第一個 shot 的 video 變 `failed` → exit 5，第二個 shot 沒有 confirm。
  - `test_run_with_mock_models_fills_every_shot`：`TestClient` 包成 `Api`、approved plan 2 shots、mock 模型、`cap 0`、`yes` → exit 0；每個 shot 的 storyboard 與 video 節點各有一筆 `done` 的生成，節點 `awaiting` 是那兩個 id。
- [ ] 跑 → FAIL；實作；跑 → PASS。另外手動跑一次 quote（mock 模型、用測試建的暫存 DB），貼輸出到 report。verify GREEN。commit `feat(trend-finder): demo asset script with a free quote mode`。

### Task 8：整條 E2E（mock）+ STATUS + PR

- [ ] 準備（scratchpad 內）：
  - 有口頭禪的實拍 take：`say -o speech.aiff "Hello um this is a test of the um video tool"`，前後加 0.5 秒、中間插 1.5 秒無聲，配 `testsrc2=s=1080x1920:r=30` 畫面，H.264 + AAC 的 `speech-take.mp4`。
  - 無人聲 take：mock 規格（`testsrc2` + `sine`）4 秒 `tone-take.mp4`。音樂：30 秒 `sine` mp3。
- [ ] `npm run build`；repo 根 `bash bin/isolated-backend.sh 8871 --demo-data --user <e2e 帳號>:<密碼>`（背景，記 pid；`REMOTION_PORT` 用預設 8872）。用 API 建 client 與一個 approved plan（3 個 shot，每個有台詞）。
- [ ] headless playwright-core（`/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core`，`channel: 'chrome'`），1440×900，每步截圖到 scratchpad：
  1. 登入 → plan 頁：**沒有** Make the video、速度、調色、燒字幕控制；成片區顯示 `cut.panel.useEditor` 與「開啟畫布」按鈕，按下進畫布。
  2. 畫布 shot 1：「整條跑完」用 `mock-image` + `mock-video` → 確認框 US$0.00 → 兩個節點都出現版本。shot 2：分鏡圖、影片分別按生成（mock）。
  3. shot 3 實拍節點上傳 `speech-take.mp4` → 按「整理」→ 出現「已整理」take 且為選用、提示「剪掉了 x 秒」；`ffprobe` 整理版比原檔短 ≥ 1.0 秒；用 whisper 轉整理版，沒有 `um`。整理版那列沒有「整理」按鈕。再上傳 `tone-take.mp4` 按「整理」→ 顯示「沒有找到人聲」那句，take 數不變。
  4. 開剪輯 → 「全部依 shot 順序放入」→ 3 段，shot 3 是整理版。另外把原 take 拖進時間軸 → 顯示「有新版本，套用？」→ 套用後該段換成整段整理版。
  5. 文字（「三天學會剪輯」上方）、TextTool 起點欄打 `1.` 再打成 `1.5`、離開欄位 → 專案存 1.5（Task 6）；字幕開（台詞）；音樂上傳（勾授權）40%；旁白 `mock-voice` 確認 US$0.00；品牌主色用選色器改（對 input 設值並送 `change` 事件）→ 伺服器存到新色（Task 6）。
  6. 出片 → done；`ffprobe` 1080×1920、`r_frame_rate 30/1`、有 aac、長度 = 時間軸總長 ± 0.1 秒。
  7. 送審 → 另開無 cookie 的 context 開審閱連結 → 影片可播、按核准 → plan 頁顯示已核准。
  8. plan 頁 PublishPanel 發布（`PUBLISHER=fake`）→ 顯示已發布。
  9. 切繁體中文，走一遍 plan 成片區、畫布、剪輯器各分頁；對 `canvas`、`editor`、`cut`、`server` 四個 area 每個三個字以上的 en 值，斷言 `document.body.innerText` 不含它（截圖存證）；觸發一個後端錯誤（例如對已整理的 take 直接 `fetch` 整理路由的結果顯示在畫面上，或時間軸空時按出片）→ 顯示中文。
  10. 關 browser、kill backend（`kill <pid>`，確認 8871 沒有在聽）。
- [ ] `node render/smoke.mjs`、`node render/smoke-p3b.mjs` OK；repo 根 `bash bin/verify.sh` GREEN；build / eslint / tsc 無錯。
- [ ] `docs/STATUS.md` 加 P4 段（日期、做了什麼、E2E 結果與 report 路徑、Not verified、下一步含 Task 9）。commit `docs(status): P4 finish acceptance`。
- [ ] push `feat/canvas-p4-finish`；`gh pr create --repo veralynchong/BuildClub --base feat/canvas-p3b-editor-media`，`## Verification` 的 Not verified：真人中文語音的口頭禪（`FILLERS` 只有英文）、真 iPhone HEVC .mov take、demo 素材付費實跑（Task 9 未做）、任何真模型。**不合併。**

### Task 9：demo 素材付費實跑〔使用者核准後才做，不在本計畫執行範圍〕

本計畫的 agent 不執行這一步。使用者決定 plan 與模型後：(1) 在**非 8850** 的 demo 用後端上跑 Task 7 的 `quote`，把輸出給使用者；(2) 使用者明確核准金額上限；(3) 使用者自己在該後端放金鑰並調整 `DAILY_GEN_IMAGE_USD` / `DAILY_GEN_VIDEO_USD`；(4) 用 `run --cap <核准金額> --yes` 實跑；(5) 實際花費與檔案記進 `docs/STATUS.md`。

---

## 給使用者的決定

1. **舊的調色、燒字幕、字幕 cue 編輯一起刪**（`grading.py`、`subtitles.py` 的 cue / 燒字部分、對應前端元件；git 歷史可找回）。替代：只拿掉按鈕、程式留著不接。建議刪：剪輯器的字幕在 Remotion 畫，這些只服務舊按鈕。
2. **整理後的 take 自動設為選用**，剪輯器把它當成原 take 的「新版本，套用？」，套用時換成整段整理版（不沿用原 take 上的修剪點，因為時間對不上）。原 take 保留。
3. **口頭禪只認英文**（um、uh、er、hm…，沿用舊規則）；中文「嗯 / 呃」沒加，因為沒有真人中文語音測過。停頓剪除不分語言都有效。
4. **demo 素材：用哪個 plan、哪兩個模型、每支幾秒。** 建議 Nano Banana 2 + Hailuo 2.3 Fast、6 秒，先 quote（約每 shot US$0.26）；付費實跑要你另外核准（Task 9）。
5. **後端英文錯誤句在前端用「整句對照」翻譯**，不改後端加錯誤代碼。對照表由 pytest 和後端雙向釘住；審閱連結頁（給客戶看）照舊英文。
6. **plan 頁保留「成片」區**（看片、下載、送審、審閱狀態），加「開啟畫布」按鈕；音樂只在剪輯器裡換。
7. **整理 take 上限 3 分鐘**；舊 DB 的 `cut_options` 表和舊檔案（`trims.json`、`subtitles.json`）不刪。

## 範圍外（列出，不做）

- 實拍 take 的調色（spec §11.5 #1 原本就「先不套」）。
- 舊的 `cutting.py` / `renders.py` 以外的死碼（例如 `requirements.txt` 裡只剩燒字幕用的 Pillow 是否還需要）：只回報，不動。
- P3 停車的其他小項：`import_generated` 的 ext / `.part` 殘留、voice 模式過度判斷過期、`kill_orphan` pid 重用、refund 記在退款日（M1）。

## Self-review 紀錄

- **Spec 覆蓋：** §10 P4「移除舊 Make the video」→ Task 1、2；「i18n 補齊」→ Task 5（含後端句）＋ Task 4 新文案；「demo 預先生成素材（先報價）」→ Task 7（免費）＋ Task 9（付費，使用者）；「整條 E2E」→ Task 8。§8 最後一條「ffmpeg 管線只清理 take、轉錄」→ Task 3、4。§11.5 #1「成片只有一支、口頭禪只套實拍、AI 不套」→ Task 2（唯一出片路徑）、Task 3（路由只收 take）。§2 反目標「悄悄花錢」→ Task 7 的 `--yes` / `--cap` / 報價比對。§3「新文案走 t()」→ Task 5 的 JSX 掃描。P3 決定 8 → Task 3、4。
- **型別一致：** `Take.cleanedFrom`（前端）↔ `to_json` 的 `cleanedFrom`（後端）；`CleanResult` 欄位 = 路由 201 回應；`applyNewer(..., whole)` 在 Task 4 定義、`useTimelineActions` 使用；`serverText` 在 Task 5 定義、Task 4 的 `cleanTake` 錯誤在 Task 5 統一套用；`legacy_cut` / `fake_export` / `finished_cut` 在 Task 2 定義、`test_cut_review.py`、`test_publish_flow.py` 使用；`demo_assets.run` 的 exit code 3 / 4 / 5 與測試一致。
- **比例：** 以介面、常數原句、測試名與斷言為主；沒有寫函式本體（`build_clean_graph` 只寫濾鏡形狀，因為那是 ffmpeg 字串的規格）。
