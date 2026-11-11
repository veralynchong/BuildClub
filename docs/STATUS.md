# STATUS

## 2026-11-05：原生 takes → edit → 真 MP4 驗收（本輪最新）

- 接手核對：`fix/demo-flow-qa-mainline @ e442b3a`，15項既有dirty與專用交接一致，完整保留。本輪未改產品、Canvas、其他工作區、設定或共享handoff；未commit／push／merge，沒有重開workers。
- 親跑 `bash bin/verify-zero-spend.sh`：`32 passed in 0.40s`，exit0。全程env -i、七項paid budgets0、無付費憑證；原生鏈及新程序重開provider/network spy均0，wallet空。
- **完成（工程驗收）**：in-process真API、自己的臨時DB／media，repo產品導覽片上傳4個takes至3個shots；第2鏡切換alternate、原take取消選取；真ffprobe sources、edit version1保存／讀回；`POST /edit/export` 202→done，走原生worker及真Remotion，下載bytes與final.mp4一致，沒有fake probe／renderer／成品。`native-takes-proof.mp4`為H264 1080×1920、30fps、AAC、9.024s，全片decode exit0。先通過兩次TestClient lifespan，再用全新Python程序讀同一DB／media，edit／takes／成品hash均一致；不是HTTP服務重啟／真前端驗收。
- 瀏覽器實際完整播放：1440×900、ended=true、error=null、muted=false，抽查中段截圖；不是逐句聽驗。原生Reel用cover將橫片置中裁成直式，導覽文字遭裁切；字幕為英文自寫技術標籤，**不是同案例正式成品、真人Clean up或新Canvas驗收**。舊9秒工程片保留不覆寫。
- **驗證RED**：本輪完整verify在env -i＋七項budget0下，backend `92 failed, 910 passed, 2 skipped in 25.62s`；compile、load、frontend unit PASS。聚焦 `test_frame_poll_failed_refunds` 重現為預期fake provider 502、實際零預算先回429（`1 failed in 0.17s`）；其餘91項未逐一分類，不全歸同因。不提高預算、不拿歷史GREEN冒充本輪；產品沒有新增修改。
- 證據：`pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-{check.py,evidence.json,proof.mp4,playback-midpoint.png,playback-ended.png}`。臨時持久資料保留 `/tmp/buildclub-native-chain-ooc5gsg_`，可用check.py的`--reopen`重驗；完整命令在test-log。首次Chromium路徑前檢少一層已修正，未下載；首次about:blank播放失敗，改same-origin靜態頁後通過，歷史不隱去。
- **未測／依賴**：同案例有權真人或既有真AI素材及真拆解／參考畫面路徑已異步詢問，尚未收到；Canvas固定交付仍待其擁有人提供。真前端＋後端保存／重啟、正式畫音字幕品質、真人Clean up仍未驗。既有backend副本操作仍未批准，未重試或繞過；paid US$0，任何新生成禁止。
- 下一步：取得素材及Canvas固定交付後，才做同案例真前端接入與正式成品。完整verify零預算相容性需另行決定如何以fake測試涵蓋，不能調高paid budgets求綠燈。

## 2026-11-05：週六 demo QA 起跑與 P1 修正
- 恢復執行：使用者已確認核心為找熱門影片 → shot list／storyboard → Canvas 改編 → AI 或真人素材 → 剪輯 → 真 MP4；本機三天計畫已合入權威範圍並保留原增量。至少一素材路完整跑通，另一條展示接入；送審／全站支線不阻擋，手動發布貼連結，成效可明示示範數據，不做產品內發布或真平台授權。
- 當前驗證：暫停期間 worker 的 RED 原始後端錯誤未保留、未能重現；恢復後 test-slot＋獨立完整日誌兩次 verify 四項 PASS／GREEN（第二次包含 bin/verify.sh 改為每輪 mktemp 日誌，避免跨工作區共用輸出）。不是用歷史 GREEN 替代現況。詳見 test-log。
- 本工作區 `test/demo-flow-qa @ e442b3a` 與 fetch 後的 `origin/main` 相同；沒有 upstream，`git pull` 明確失敗，未將它視為同步成功。工作區沒有 `AGENTS.md`，本 session 遵循使用者提供的指示與交接。
- 最近驗證：2026-11-05 `bash bin/verify.sh` GREEN（四項 PASS）、`git diff --check` PASS。首次 RED 為 setup skip 後缺依賴；只建立本機 ignored 連結：`node_modules` → `canvas-p1` 的既有完整依賴，`backend/.venv` → `w2-grade-subs-backend` 的既有 venv。未安裝或修改共享套件，未改產品。
- 原 UI worker 已實際恢復並交付核心靜態矩陣，之後以動態 QA 未完成回報 failed／exited；不是 UI PASS。沒有 active worker 任務，不為通知重啟 finished workers。非主線全站與送審延後。
- 未驗／依賴：真人英文素材使用權與路徑待 Tommy 提供；第一支影片、Clean up、完整送審與持久重啟尚未通過本輪驗收。新版 Canvas 仍由另一 agent 負責，不用本版測試冒充其驗收。
- 整合驗證：2026-11-05 在以下未提交修正樹親跑 test-slot 完整 verify 四項 PASS／GREEN，build、lint、diff check 均 exit 0；獨立 reviewer 聚焦 20/20。UI、真人與持久重啟仍未驗。
- 程式進度：已在本機 `fix/demo-flow-qa-mainline` 套用經獨立覆核接受的 P1 #1／#5 七檔差異，仍是未提交工作樹（base e442b3a）；per-plan optional savedInLive、既有計畫恢復及 TikTok 大小寫。不是 UI 通過，整合驗證另見 test-log。
- 下一步：整合者接回免費核心查核；隔離副本操作仍被 hook 擋下，未批准、不繞過。取得有權素材與 Canvas 固定交付後驗主線。付費批准 US$0，不做產品內發布，沒有 commit／push／merge 授權。

## 2026-11-05：整合者接回 UI 與既有素材真 MP4（最新）

- 重跑零支出驗證：`bash bin/verify-zero-spend.sh`，2026-11-05親跑輸出 `32 passed in 0.35s`，exit0；腳本先拒絕已存在的本機設定，再以env -i與七項預算0啟動測試。新增腳本／測試與日誌隔離修正未另行獨立review，舊P1七檔review接受範圍不擴大冒用。
- 本機證據目錄：`pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/`，9檔（MP4、7張截圖、evidence.json）。真匯出使用已追蹤 `public/media/remake-tour.mp4` 的0–3、8–11、16–19秒；先 letterbox 保留橫式全畫面，經現有 Remotion Reel 匯出，加英文技術標籤／字幕。不是新 AI 生成、真人素材或正式 tofu 案例。
- 親驗：ffprobe H264 1080×1920 30/1、AAC 48kHz stereo、9.024s（時間線9s，含AAC padding）；全片 ffmpeg decode exit0；mean -20dB／max -3dB；Playwright 播放至 ended=true、error=null、muted=false，並抽查畫面。未完成主觀人聲逐句聽驗，字幕是自寫技術標籤、非轉錄。
- 原 failed UI 任務已由整合者接回一部分：真瀏覽器1440下實際選 Research sample→Plans 出現→真 reload 仍在，per-plan savedInLive 與 library 保存正確；shot list 編輯亦經 fake API 保存。這是實際前端＋瀏覽器內 fake API，不是真後端／新 Canvas／跨程序持久驗收。原 dispatch 的 failed 歷史不改寫為通過。
- UI 安全方案沒有建立被擋的後端副本：只啟 env -i 的 Python 唯讀靜態檔案服務，127.0.0.1:8891，實測 POST 501；所有 /api 回應由瀏覽器 route fake，外部字型等請求 abort，無付費後端、憑證或 provider 呼叫。預期的 mock429／字型阻擋 console 訊息已註明，不宣稱console全綠。
- Research 展開後 scrollWidth1473／viewport1440，舊 issue #2 已實機重現，未修。自己的頁已關、靜態服務正常停止、profile lease釋放，Remotion正常退出，8891／8892無listener。其他人的瀏覽器／服務與freeform-canvas未修改。

## 2026-11-05：原任務交付核對與零支出政策（最新）

| 原任務 | Patch／review／整合證據 | 狀態與缺口 |
|---|---|---|
| 接線盤點 task_eb358747b731 | 唯讀矩陣已存 demo-qa/issues.md；獨立 task_6a6c14d68b61 核對成因 | 靜態完成；不是 UI PASS |
| P1 #1／#5 task_5dc84402da84、task_b49dd821aaa5 | /tmp/buildclub-demo-p1-review-ctx1156.patch 七檔；首次 review task_57050706d8f2 拒絕兩個反例，補修後 task_82b57e760129 接受、聚焦20/20；已套用本工作區並親跑 verify／build／lint | 程式整合完成，未提交；UI 保存／reload 未驗。保留 worker 舊 RED 為歷史，不重開 worker 重跑 |
| 原 UI dispatch ctx_5412d8a8ceb6 | 已讀 exact transcript 與 msg_bf0b6c0e10e7、msg_b7286ea927f8；恢復後實際讀路由、算指標、核對 Canvas，再交付矩陣 | failed／exited：靜態交付完成；副本 hook 阻擋，UI／MP4／重啟未跑，未啟服務/context，不能列 PASS |
| 暫停 RED 診斷 | 恢復後受控重跑 GREEN；bin/verify.sh 改每輪 mktemp log，四項檢查未刪減；獨立日誌在 test-log | 原後端錯誤未留存、未重現，不能聲稱已知根因；日誌混用缺陷已修，該 shell 改動未另派獨立 reviewer |
| Canvas 前後端／bug workers | 使用者回報 done；本次僅讀 freeform-canvas Git／STATUS，HEAD b651e6d 仍有產品 dirty 增量 | 不重派、不修改、不操作服務；本 session 尚未拿到固定交付樹或驗其新版 UI，舊 STATUS 證據不可冒充現 dirty 通過 |
| 找熱門影片核心查核 | 自有 pinned tofu 保存記錄；in-process GET /api/search hit 12筆 cached=true，miss 空結果，外部搜尋／spend spy 不允許呼叫 | API 完成；11/2歷史指標，非即時平台核對；無同案例真 breakdown cache |
| 付費入口零支出回歸 | 新 backend/tests/test_zero_spend.py；env -i、七項預算0，程序內 TestClient、32 passed，逐案 provider/network spy=0、無 wallet 扣額 | 本 QA 分支 fake 驗證完成；此新測試未另獨立覆核，不代表新版 Canvas batch／外部服務或 provider 帳單限制已驗 |
| 核心最終成品 | 已新增既有 repo 素材→真 Remotion MP4 技術匯出（9.024s）及完整瀏覽器播放證據；不是同案例真人／AI 成品 | 正式案例未完成；素材／固定版本／真後端 UI 環境為依賴，送審與 analytics 不阻擋 |

付費批准額為 **US$0（含 credits／預付餘額）**。本 session 不發任何付費搜尋、分析、助手、圖片、影片、配音呼叫；未知結果不重送，不載入付費憑證、不改 key／預算／共享設定。新政策已合入本機三天計畫。自己的測試只用清空環境、七項零預算、fake／spy、臨時資料，不開外部可寫 HTTP listener。單獨 literal existence check 確認本工作區設定檔不存在，未讀內容；混合檢查命令被 hook 擋下的歷史保留。

預算稽核：程式預設每日 image US$0.50／video US$1.00／voice US$0.30／Claude US$1.00／Apify US$2.00／Jev US$0.50／ScrapeCreators 20 credits 是原始碼預設，**不是執行中服務實際值或本次批准額**。一般生成前按估價預扣、同 row CAS claim、unknown 不退款不重送；新版 workspace confirm 有鎖／交易，但未證實所有 POST 有一次性 idempotency。OpenRouter n=1、fallback=false、單次 submit，不明結果保留扣額；usage.cost 若無回傳會用估價填 actualUsd，wallet 仍估價，token／解析度估價不是帳單硬上限。Anthropic 拆解使用預設 SDK retry=2，不能聲稱所有 LLM 都不重試；實際重複收費未驗。provider key 限額、本次 demo provider 硬總額、外部既有任務與帳單狀態均未知，沒有發帶 key 查詢；不能以停本機宣稱取消外部扣款。

以下為既有歷史進度，與 Git 或上方最新核對矛盾時以上方為準。

Read first: `docs/todo.md` (open keys and tasks) and `docs/test-log.md` (every test run; skip a test that already passed at an unchanged commit). Demo branch: `chore/demo-integrate-main-1104`, PR #49 (draft, do not merge yet).

Current (2026-11-04 AEDT): canvas product polish A-D is done and stacked as PRs #46 (B), #47 (C), #48 (D, on `feat/canvas-polish-d-agent`); none is merged. A whole-branch review and one fix wave followed: a price dialog now locks the side panels and Confirm re-quotes, asking again if anything changed. Final checks with mock models only: unit 466/466, backend pytest 969 passed, `polish-a-shell` 18/18, `polish-b-nodes` 76/76, `polish-c-timeline` 50/50, `polish-d-agent` 54/54 (each on a fresh isolated backend at 1440x900), `bash bin/verify.sh` GREEN, build OK, eslint 0 errors, tsc exit 0 (2026-11-04). Open: real model wait times are unverified (the agent route ran its sample plan, no Claude call; no real image or video model ran); line and node fine-tuning waits for the user test; polish-a and polish-b must not share one backend (B fails 4 checks after A, from leftover state), so run each on a fresh backend. Decision log entry of 3 Nov updated from "nothing built yet".

Current (2026-11-03 AEDT): node canvas P1 (#28), P2 (#29), P3a (#30), P3b (#31) and P4 finish (#32, base feat/canvas-p3b-editor-media) are built and verified with mock models only; none is merged. Before that (2026-11-02 AEDT): fork main is at 6fe1772 with PRs #19-#25 merged (storyboard, publish, grade and subtitles UI, Settings, Chinese UI); `bash bin/verify.sh` GREEN at #25 head 7166ca5; client demo for Mercif is up (details in the private handoff).

Earlier: remake phase 1 (PR #4) and 2a stage board (PR #5) are merged into fork main (2026-10-31). Phase 2b (shot checklist and real-footage takes) is merged (PR #6, 4277192, 2026-10-31). Phase 2c (edit to a publishable MP4, then Annie's approval) is split into 2c-1 and 2c-2. 2c-1 ("Make the video") is merged (PR #7, 359791c, 2026-11-01). 2c-2 (Annie approves the finished video on the no-login review link) is merged (PR #8, 27496cb, 2026-11-01) after an e2e re-run at 1440 and 390 (35/35 each). Phase 2 (2a-2c) is done. `bash bin/verify.sh` GREEN on the merged tree (2026-11-01).

## 2026-11-03 (AEDT): node canvas P1 + P2 (real AI models)
- P1 (canvas skeleton, mock models only) is PR #28 to veralynchong/BuildClub (branch `feat/node-canvas-p1`, head 7db7614). It is open and not merged; it waits for the user to say merge.
- P2 (real models, plan `pivots/02-content/docs/plans/2026-11-03-canvas-p2-plan.md`) is on branch `feat/canvas-p2-models`, with a PR stacked on `feat/node-canvas-p1`. Not merged.
  - Providers: mock, fal (Seedream 4.5, Hailuo 2.3 Fast, Kling 2.6 Pro, Veo 3.1 Fast), Gemini (Nano Banana 2 / Pro). Daily wallets `DAILY_GEN_IMAGE_USD` 0.50 and `DAILY_GEN_VIDEO_USD` 1.00. Refunds happen only when nothing was sent or the provider reported failure; a lost result is `unknown` with no refund.
  - Run-the-whole-shot (storyboard image, then video from it) has a quote-and-confirm step. Takes are now keyed by shot id. The storyboard "Make frame" uses `FRAME_IMAGE_MODEL`, and the gpt-image-1 path is removed.
- Last verification (2026-11-03): `bash bin/verify.sh` GREEN at dad12ba. Mock-only browser E2E at 1440 on port 8871 passed 5/5 scenarios: real models disabled without keys, the chain US$0.00, `#fail`, a click straight after connecting, and the button disabled while running.
- Not verified: no real model has been called (no keys in .env, and the user chose no spend on 2026-11-03). fal/Gemini request fields, 9:16 support on Hailuo/Kling, Seedream portrait size, fal data-URI inputs and the Kling price are checked against docs only.
- P3 (Remotion editor, branch `feat/canvas-p3-editor`): Task 0 timing experiment passed on 2026-11-03 with Remotion 4.0.537. A 30 s 1080x1920 server render took 22 s hot (threshold 120 s), with AAC audio and correct Noto Sans TC Chinese text, so the plan uses server render (`@remotion/renderer` + `@remotion/bundler`). Font file `public/fonts/NotoSansTC-VF.ttf` (11.9 MB, OFL) is in the repo.
- P3a editor (branch `feat/canvas-p3-editor`, acceptance 2026-11-03): built the Remotion editor drawer on the canvas. It has a timeline (fill in shot order, trim, split, delete, reorder, mute and volume), drag-from-canvas, "new version, apply?" and "footage deleted" alerts, export through a server-side Remotion render, a bundle pre-warm at server start, and send for approval on the review link. Mock-only browser E2E at 1440 on port 8871 passed on 2026-11-03 (all steps in `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-7-report.md`); `node render/smoke.mjs` OK and `bash bin/verify.sh` GREEN. Export times: Task 0 render 30 s clip, about 22 s hot; this run, 10-second reel, cold (bundle cache cleared) 10.4 s and hot 10.8 s. The E2E found one bug: the export panel did not show "out of date" after applying a newer version; fixed in c6b2e34.
- P3a known gaps: a real HEVC .mov take was not tested, and preview performance with 20+ clips was not tested. Speech takes are not auto-captioned and filler/pause trim is deferred to P4.
- P3b editor media (branch `feat/canvas-p3b-editor-media`, acceptance 2026-11-03): the editor drawer gained text overlays (position, brand colour, start and end), captions (shot lines by default, voiceover words once a voiceover is present, one editable caption per shot), music with a licence tick and volume, voiceover (record, upload, AI voice with a price confirm), and a per-client brand kit (logo, colour, shown-logo switch) that survives the old client form. All of it renders through the same Remotion export with Noto Sans TC. Mock-only browser E2E at 1440 on port 8871 passed on 2026-11-03 (every step in `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-12-report.md`): ffprobe 1080x1920, 30/1, aac, 13.000 s against a 13 s timeline, text, caption and logo checked on extracted frames. `node render/smoke.mjs`, `node render/smoke-p3b.mjs` OK and `bash bin/verify.sh` GREEN. The E2E found one bug: after a brand change the export panel still offered send (the server refused it); fixed in 31b2ad7.
- P3b known gaps: ElevenLabs was never called for real (checked against its docs only); voiceover recording was tested with a fake device only (Chrome's fake audio device never answered on this Mac mini, so a WebAudio oscillator stream stood in, through the app's real MediaRecorder path); whisper was tested only with English speech (it heard "Thank you" in the mock tone); no real HEVC .mov take was tested.
- P3 PRs (2026-11-03, open, not merged): #30 P3a (base `feat/canvas-p2-models`), #31 P3b (base `feat/canvas-p3-editor`). Merge order #28 → #29 → #30 → #31. Both final whole-branch reviews' fixes are in (9784d18, a9a27d7); `bash bin/verify.sh` GREEN at 6a79b38.
- P3b needs from the user: an `ELEVENLABS_VOICE_ID` env var for a Mandarin voice, plus the ElevenLabs key (`DAILY_GEN_VOICE_USD` budget), before any paid voice is used.
- P4 finish (branch `feat/canvas-p4-finish`, stacked on #31, plan `pivots/02-content/docs/plans/2026-11-03-canvas-p4-plan.md`, acceptance 2026-11-03): the old "Make the video" pipeline is gone (front and back; grading, subtitle burn and cue editing deleted); the editor is the only way to make `final.mp4`, and old `auto` cuts still play, go stale, get approved and publish. Real takes have a "Clean up" action (cuts English fillers and pauses over 0.4 s into a new, chosen take; the editor offers it as a new version). Backend sentences on the canvas, editor and plan video area show in Chinese through `serverText`, pinned by a pytest and a JSX copy scan. Three P3 leftovers fixed (voice delete under the edit lock, TextTool timing drafts, brand colour on change). New `backend/demo_assets.py`: `quote` is offline and free; `run` needs `--yes`, a `--cap`, a matching server quote and enough daily wallet, and was only run against fakes.
- P4 whisper change: whisper.cpp 1.9.5 silently turns DTW off when flash attention is on, so word times drifted after pauses and fillers were not cut. Whisper now runs with `-dtw large.v3.turbo -nfa` (falls back without them on an older build), and word starts are moved past the pause they swallowed, for both clean-up and voiceover captions (27f0f70, 36c4951).
- P4 verification (2026-11-03): mock-only browser E2E at 1440 on 8871 passed steps 1-10 (`.superpowers/sdd/2026-11-03-canvas-p4-plan/task-8-report.md`); the one failure (fillers left in) was fixed afterwards and re-checked on the real file: 5.584 s to 2.760 s, whisper hears "Hello this is a test of the video tool". Export 1080x1920, 30/1, aac, 11.776 s against 11.77 s. `bash bin/verify.sh` GREEN at 0c22bb5; both render smokes OK.
- P4 not verified: real human speech for clean-up (only macOS `say` voices; Chinese fillers are not detected by design), real iPhone HEVC .mov, any real model, and the paid demo-asset run (plan Task 9: needs the user to pick plan, models and cap, then approve the spend).
- A1-A8 mock verification (2026-11-03, retro section 5): A1 stack rehearsal merged #28 -> #32 onto origin/main d68b94e on a throwaway branch with no conflicts, verify GREEN and both render smokes OK at every step. A2 (24 and 48 clips: 60 fps playback, ~30 ms seek), A3 (synthetic hvc1 .mov through clean-up and export), A5 (11 chain-guard checks) and A8 (cold export of a 30 s clip 21.7-22.7 s, warm 17-18 s) pass. A6 (whisper hallucinating "Thank you." on silence or noise) and A7 (Mandarin voiceover timed as one word) failed and are fixed in f191a60, ed46dfd, 35415f1. A4 confirmed the known limit: clean-up turns HDR10 into 8-bit with no tone mapping. Scripts are in `pivots/02-content/app/trend-finder/e2e/` (194a6dd); report `.superpowers/sdd/2026-11-03-canvas-p4-plan/a2-a8-report.md`. `bash bin/verify.sh` GREEN at 194a6dd.
- Open from A1-A8: whisper writes Simplified Chinese even for a zh_TW voice (product decision); the clean-up success note shows in the red error bubble; HDR tone mapping; `isolated-backend.sh` cannot pass `REMOTION_PORT`; `e2e/lib.cjs` defaults to a local playwright-core path (override with `PW_CORE`).
- Follow-ups fixed (2026-11-03): clean-up result shows as a neutral note (7f52568); HDR (PQ/HLG) takes are tone-mapped to bt709 during clean-up with an ffmpeg that has zscale, from `FFMPEG_HDR_BIN` or the Homebrew `ffmpeg-full` keg, otherwise unchanged with one log line (8344464; a deploy machine needs such an ffmpeg; HLG only unit-tested); `isolated-backend.sh` passes `REMOTION_PORT` (62f97ee). Simplified-Chinese captions: user chose to leave as is for now. `bash bin/verify.sh` GREEN at 62f97ee.
- AI UX test (2026-11-03): `pivots/02-content/app/trend-finder/e2e/FLOWS.md` (5e83abd) defines F1-F4 and personas Daphne and Annie. Layer 3 ran goal-only and layer 4 ran persona walkthroughs. Both used mock models only, at 1440, on 8871/8872. All four flows were reached, as were 3/3 Annie runs and 3/3 Daphne runs (after the Annie correction below). Report: Artifact https://claude.ai/artifact/5e2daMUXKegc3gdB3T9jJ4. Raw notes and screenshots are local in `.superpowers/sdd/2026-11-03-canvas-p4-plan/ux-test/`.
  - Top items:
    - B1: no UI creates the review link, so "Send for approval" returns 409.
    - B2 withdrawn: Annie is the agency owner/approver (default `managerName`, src/state.ts), not the client. The first persona brief framed her wrongly; FLOWS.md and the report (v2) are corrected. Left over: the UI never says who Annie is.
    - A1-A3: on the client review page the buttons are below the fold and there is no "who got it" message.
    - D1-D4: the canvas is hard to find as the way into the editor; the editor drawer is cramped; captions and logo are off by default; export gives little feedback.
  - Fix batch 1 (B1 review-link UI on the Plans board, A1-A3 review page, B4 "★ Picked" copy, B5 canvas error note stays until dismissed) is on `fix/canvas-ux-batch1`, base `feat/canvas-p4-finish`. verify GREEN and a browser re-test at 1440 passed every item (2026-11-03). PR #33, not merged.
  - Fix batch 2 (B3 video send-back shown on the Plans card and client home, D3 captions on for new edits and logo shown after upload, D4 export expectation line and scroll to result, D6 one-click logo upload, B2 approver hint) is on `fix/canvas-ux-batch2`, base `fix/canvas-ux-batch1`. verify GREEN and a browser re-test at 1440 passed every item (2026-11-03). Backend change: `/api/production` adds `cutSentBack`. PR #34, not merged.
  - Fix batch 3 (user picked the designs): D1 "Make the video" button on the plan page and the approved card, plus a 5-step bar (Clips, Captions, Logo, Export, Send) in the editor; D2 full-screen editor with "Back to canvas" (keeps the canvas viewport) and Export and send in a top-bar popover, replacing the side drawer; B6 nodes added from a shot's "+" go to a free row and are fitted into view; B7 logo size (small/medium/large) and corner, defaults equal the old look. On `fix/canvas-ux-batch3`, base `fix/canvas-ux-batch2`. verify GREEN, browser re-test at 1440 passed (2026-11-03). Every item in the UX report's suggested order is now done.
  - Fix batch 4 (B8) on `fix/canvas-ux-batch4`, base `fix/canvas-ux-batch3`, PR #36, not merged (2026-11-03): a sent-back video cannot be sent again until re-exported (backend 409 `SENT_BACK` + UI line); cache-only `/api/search` and `/api/search/types` misses return empty 200 instead of 404; a plan made from a Research row starts with its client video's due date (user's choice), else today + 14. verify GREEN at 0572a70; no browser re-test yet. `npm run lint` errors only in untracked `render/experiment/`.
  - Real-person test script for D1/D2 (2026-11-03, not run yet): https://claude.ai/artifact/47VyReWUgStxBAkUPddq2x. User chose: no merge of #28-#36 for now.
- Veo 3.1 replaced by Gemini Omni Flash 1.1 (PR #39, branch `fix/replace-veo-with-omni-flash`, 2026-11-03). Not merged.
- P2.5 consistency kit (branch `feat/canvas-p2-5-kit`, base `fix/replace-veo-with-omni-flash`, spec `pivots/02-content/docs/specs/2026-11-03-consistency-kit-design.md`, plan `.../plans/2026-11-03-canvas-p2-5-kit-plan.md`, 2026-11-03):
  - Built: per-client kit (character, product, place, style; note plus 0-4 images) and a kit node on the canvas that auto-wires to every storyboard. Each shot has picks. Generations send N references plus an English prefix, trimmed to the model's `maxRefs`. Kit images are shrunk to 1536 px on the long edge before sending. Changes mark nodes stale and nothing re-runs automatically. Video nodes do not take the kit.
  - Verification (2026-11-03): `bash bin/verify.sh` GREEN at c2d057c; backend pytest 955 passed; `node --test unit/` 388/388. Mock browser E2E at 1440 passed 8/8 (`.superpowers/sdd/2026-11-03-canvas-p2-5-kit-plan/task-7-report.md`). The final whole-branch review's 9 fixes are in (99143c0, c2d057c).
  - Layout fixes checked in a browser at 1440 with mock models (2026-11-03, `fix-visual-check.md`), all PASS: storyboard nodes no longer overlap (about 63 px gap), kit edges are dashed when unselected and solid when selected, and "Yes, delete" in the kit drawer uses the primary style.
  - Not verified: the paid real test (Seedream 4.5 12 images plus Omni Flash 2 × 4 s, about US$1.28, cap US$1.50, `FAL_KEY`) is not run: the user chose on 2026-11-03 not to do a paid test, so no real provider has received multiple references yet.
- Next steps:
  1. The user adds `FAL_KEY` and `GEMINI_API_KEY` to .env, then a paid smoke test (about US$0.45, cap US$1).
  2. Decide on the consistency research proposals (Artifact https://claude.ai/artifact/GcK6aCdw7L3XUn5fsAbMUu): replace Veo 3.1 with Gemini Omni Flash 1.1 (the fal Veo reference endpoint retires 2026-11-17), add Nano Banana 2.1, and P2.5 "consistency kit" node.
  3. Merge PR #28, then the P2 PR (user's call).
  4. Parked from review: refund counted on the refund day, not the spend day (M1); stale docs (spec §3, README, .env.example, decision-log gpt-image-1).

## 2026-11-02 (AEDT): phase 3 from Mercif feedback
PRs merged into veralynchong/BuildClub main (#18-#26):
- #18 phase 3 plan doc (docs/phase3 feedback plan).
- #19 results filter panel (recency, length, content type, sort; 1M+ views default chip).
- #20 hook and emotion fields in the video breakdown.
- #21 research reports: Instagram algorithm 2026 and competitor USPs.
- #22 content types: type tag on cards and a Content type filter group with counts.
- #23 Compare videos page.
- #24 shot framing (framing, angle, movement) and script to shot list.
- #25 verifiable numbers: "Where these numbers come from" (source, fetched time, link, score formula) and a free yt-dlp re-check.
- #26 real re-analyse (force re-run, behind auth and the daily Claude budget; a failed re-run keeps the saved breakdown) and the Open plan aria fix.

Last verification (2026-11-02): `bash bin/verify.sh` GREEN (compile, backend load, backend tests, frontend unit tests) on the #26 head 3d83da0, which already contained origin/main, so its tree equals merged main 4343366; `npx tsc -b`, `npm run lint`, `npm run build` all exit 0.

E2E on merged main 4343366 (isolated backend, port 8960, `--demo-data`, no paid calls, no Apify), 1440 and 390, no horizontal scroll at either width:
- Find, search tofu recipe: filter panel opens, "Views: 1M+" chip, Content type group with counts (Recipe / cooking 8, Review / taste test 2, Tutorial / tips 2, Other 3), type tag and "followers · views" line on cards: pass / pass.
- "Where these numbers come from": source, fetched time, original post link, score formula (Re-check not clicked): pass / pass.
- Breakdown panel shows an enabled Re-analyse button for a saved breakdown (not run; budget is 0 in isolated mode): pass / pass.
- Compare videos page renders with link box and shortlist picker (no run started): pass / pass.
- Plan page shows "From script" and Framing / Angle / Movement selects; Plans board "Open plan" is enabled: pass / pass.
- Language set to Traditional Chinese: Find, filter panel (內容類型), Compare page show no raw i18n keys: pass / pass.

Not verified: zh-Hant visuals beyond the key check above; real AI output for street-interview or Chinese scripts; ShotChecklist framing tags after approval; live Apify searches; YouTube and X re-check; Compare from the shortlist picker.

Open items:
- 1c research table waits for teammates (layout decision).
- 2d Mercif one-week trial.
- 3c notifications deferred.
- Product suggestions from the research: share rate before comment rate, originality check, Trial Reels.
- Consider raising RESULTS_PER_SEARCH (about 100) once Apify is upgraded (cost check first).

## Teammate UI integration (2026-11-02 AEDT, branch feat/integrate-teammate-ui-1102)
- Merged origin/main (b3f8737: design system, client Home, Find ideas, drag Plans board, copy) and fix/instagram-followers (PR #11). Look and copy from the teammate; login, persistence, review link, stages, takes and cuts kept on our backend.
- Score rule changed (user decision 2026-11-02): views ÷ followers on every platform; usual views only when followers are unknown or 0 (Reddit). Usual-views multiple stays as secondary info in the breakdown and the evidence chip.
- Only a signed-in manager approves in the app (plan page, Home, board drag); team members send to the manager, who answers on the review link.
- New dependency from the teammate's lockfile: @dnd-kit/core 6.3.1 (Plans board drag).
- `bash bin/verify.sh` GREEN (unit 88). E2E on 8811 (`--demo-data --user`), real sign-in as team member: client, tofu search (TikTok + Instagram pins), ranking order, shortlist, shots, send, signed-out review link, approve, board and Home: 19/19 at 1440 and 19/19 at 390.

## 2026-11-02 (AEDT): Settings, Chinese UI, client demo
- Merged into fork main today:
  - #19 storyboard UI, #20 publish UI, #21 grade + subtitles UI, #22 landing product tour video.
  - #23 Settings screen: gear at the sidebar bottom; Appearance (System / Light / Dark) moved there; signed-in name and agency come from /api/auth/me; approver name "Annie" kept.
  - #24 Language setting, English / 繁體中文: hand-written dictionary `src/lib/i18n.ts` plus `src/lib/strings/*`, no new dependencies. Landing, login and the client review link stay English. The 390px sidebar shadow is fixed.
  - #25 i18n follow-ups: zh label 「開啟」 on the Home client table; the default "why it fits" note is always saved in English so the review link has no Chinese; existing Chinese notes are not migrated.
- Last verification (2026-11-02): at PR #25 head 7166ca5, `bash bin/verify.sh` GREEN (pytest 547 passed, 1 skipped; unit 166); `tsc -b`, `npm run lint`, `npm run build` exit 0. Each PR was verified independently at its head sha before merge.
- Client demo for Mercif (Daphne): port 8850 behind a Cloudflare quick tunnel, serving fork main (6fe1772 or later), `--demo-data`, two seeded clients. Demo URL and accounts are in the private handoff.
- Known problems / not verified:
  - Storyboard generation, take upload, video cut and subtitle burn-in were checked only in idle states in zh-Hant.
  - Backend-generated text (shot descriptions, AI breakdowns, server errors) stays English.
  - Home "after publishing" cards read like dev notes ("decide before building"); the copy belongs to Veralyn.
  - The approver name still defaults to "Annie".
- Next steps:
  1. Align the UI redesign with Veralyn (a separate discussion session is comparing Editing and Storyboard against real products; nothing implemented).
  2. Send the demo to Daphne.
  3. Worktree cleanup.

## Last verification (2026-11-01)
- feat/remake-rough-cut @ 678b5a5: `bash bin/verify.sh` GREEN (backend 410 passed, 1 skipped; unit 78); `npm run build` and `npm run lint` exit 0. Final Opus review: With fixes, all fixed and re-reviewed clean.
- `bash bin/verify.sh`: GREEN after every merge and at the final commit 47b27d8; `npm run build` and `npm run lint` exit 0.
- End-to-end test (login, client search, shortlist, plan, batch send, signed-out review link, send-back, resend, approve, double-approve guard, client memory, turn off link) passed at 1440 and 390 widths, against a fresh backend with `--demo-data`.

## Review fixes (2026-10-31)
- `bash bin/verify.sh` GREEN at the fix commits. `npm run build` and `npm run lint` were clean after each merge. The end-to-end test passed 12/12 at both 1440 and 390, in demo mode.
- Checked in a real browser:
  - Real mode with an empty account shows "No clients yet" with no page errors, and sample clients are not saved.
  - A plan edit made while the session was expired is kept through a page refresh and saved after signing in again.
  - "Preview as Annie" is read-only: the decide buttons are hidden and the server status does not change.
- Not checked in a browser:
  - The Google sign-in error messages (unit tests only).
  - The "via review link" label on comments.
  - Comment seeking in a real TikTok player.

## Phase 2a stage board (2026-10-31, branch feat/remake-stage-board)
- Plan: `docs/phase2-2a-plan.md`. Approved plans move Ready to film → Filming → Editing → Posted (board row "In production", stage select on cards and the plan page, "N posted this month").
- The backend keeps a stage only on approved plans; the review link never shows it.
- Also fixed (phase 1): `approvedAt`, `managerNote`, `shotComments` were dropped on every save; a new review-link decision now clears an old "approve with changes" note.
- `bash bin/verify.sh` GREEN (backend 296, unit 57); `npm run build`, `npm run lint` exit 0.
- End-to-end on a demo backend (8811) passed at 1440 and 390: stage survives reload, review link has no stage, Edit clears the stage and keeps approvedAt, no horizontal overflow on the board or plan page at 390.

## Phase 2b shot checklist and takes (2026-10-31, branch feat/remake-shot-takes)
- Plan: `docs/phase2-2b-plan.md`. An approved plan's page has a "Shot checklist": upload .mp4/.mov takes per shot (200 MB cap, `ftyp` check, 10 per shot), watch them, choose one, delete. Rows in the SQLite `takes` table, files in `backend/media/<ideaId>/` (git-ignored). Edit reopens the plan and leaves the takes read-only. The review link never shows takes.
- `bash bin/verify.sh` GREEN (backend 320, unit 65); `npm run build`, `npm run lint` exit 0.
- Opus whole-branch review: 0 Critical, 3 Important (plus 2 re-graded from Minor), all fixed: reopen during an upload, `..` idea id leaving the media folder (both with tests that failed first), stale list after a long upload, one busy flag for all shots, checklist not reset between plans.
- End-to-end on a demo backend (8812) at 1440 and 390 passed 9/9 (upload, choose, reload, delete, fake .mp4 rejected, no overflow at 390, read-only after Edit, no takes on the review link); after the fixes, concurrent uploads and delete-during-upload passed.
- Deferred minors: blocking writes inside the async upload handler; an orphan file if the INSERT fails; a non-integer shot gets FastAPI's `{"detail"}` shape; the progress copy "have a take" counts chosen takes; no retry after the takes list fails to load; an upload error stays visible after Edit.

## Phase 2c-1 make the video (2026-11-01 AEDT, branch feat/remake-rough-cut)
- Plan: `docs/phase2-2c1-plan.md`. An approved plan with a chosen take on every shot gets "Make the video": speed 1x / 1.1x / 1.25x, optional own music (licence tick required), progress steps, preview, Download. Output in `backend/media/<ideaId>/cut/final.mp4`; the old output stays until a new one succeeds.
- End-to-end on a demo backend (8813) with real ffmpeg and real whisper.cpp (large-v3-turbo-q5_0), synthetic takes (testsrc plus 440 Hz tone with 1.5 s silence, a landscape take, a macOS `say` take with two "um").
- 1440 wide, checks 1-8: pass 1 (disabled, "0 of 2" then "1 of 2"), 2 (steps Checking the takes, Listening for words, Rendering), 3, 5, 7, 8. FAIL 4 (stale notice only after a reload), FAIL 6 (new output not shown until reload).
- 390 wide, checks 1-9: pass 1, 2, 3 (file checked once, see below), 5, 7, 8, 9 (scrollWidth 390 on the plan page); FAIL 4 and 6 for the same two reasons. Check 10 (missing-tool errors) is pytest-only by design.
- Check 3 detail: played in the page, downloaded via the Download link (`remake-<id>.mp4`), ffprobe: h264 High, yuv420p, 1080x1920, 30/1 fps, aac LC 48 kHz stereo 192 kbps, loudness -13.0 / -13.1 LUFS (LRA 2.4-2.6 LU for the tone; target -13).
- Cut time (queued to done, tiny 6-10 s inputs): 6.6 s, 3.7 s, 4.7 s, 5.5 s. Long footage is still unmeasured. Backend suite (2026-11-01): 410 passed, 1 skipped in 21.6 s.
- Real whisper: the `say` take was transcribed as "Hello UM this is a test of the UM video cutting tool"; both "um" were cut (3.11 s take plus a 4 s tone take became 2.37 s at 1.25x and 2.90 s at 1x). The pure-tone takes returned no words: with no words at all the whole video is kept (R6; whisper hallucinations on B-roll noise can leave a silent take unprotected) (9.13 s at 1.1x). `-l auto` worked on this English clip.
- Not verified: a real iPhone HDR clip (10-bit HLG/HEVC; no tone mapping, so it may look washed out), a real human-speech clip end to end, real human speech (breath, cough, background noise), long or large takes, disk use, non-English, Instagram/TikTok upload limits, missing ffmpeg/whisper (pytest only), the review page overflow at 390, restart recovery in a browser.
- Known issues found (items 1-3 fixed; E2E recheck passed at 1440 and 390 widths, 2026-11-01):
  1. After choosing another take, the "The takes changed after this was made" notice only appears after a reload (CutPanel does not refetch when the takes change). The backend `stale` flag is correct. FIXED in a2813b7.
  2. After a re-cut finishes, the preview `<video>` keeps playing the old file until a reload (same src URL, browser keeps the old file; seen at 1440 and 390: shown 9.13 s / 2.90 s while the new file was 2.37 s / 2.67 s). The size/length text beside Download updates. FIXED in 9001b4d.
  3. A take with no speech next to takes with speech is cut away completely (gaps over 0.4 s are removed), e.g. a silent B-roll shot disappears. FIXED in 8c7dc49 (R6: a take with no transcribed words is kept whole).
  4. The Edit button asks "Continue?" in a modal; not a bug, but automation must click Continue.

## Phase 2c-2 cut approval (2026-11-01 AEDT, branch feat/remake-cut-approval)
- Final whole-branch review (Opus): one Important fixed in 6211817 — a reopened or stale cut is now hidden from the approver, and CutPanel says "Hidden from <manager> while the plan is reopened."; plus three minors (shot-count staleness on send, cut-specific "no longer waiting" notice, re-cut hint while waiting). At 6211817: `bash bin/verify.sh` GREEN (backend 440 passed, 1 skipped), `npm run build` and `npm run lint` exit 0. The first e2e ran before this fix; it was re-run after the fix (see the 2026-11-01 re-run bullet below).
- Plan: `docs/phase2-2c2-plan.md`. After "Make the video", the team sends the finished video to the manager from the plan page ("Send to <manager> for approval"). The approver sees it on the no-login review link under "Videos to approve" (played in the page, no download link) and approves it or sends it back with a required reason. The CutPanel shows waiting / approved / sent back with the reason. Making the video again clears the approval and the approver's card; a video replaced while the approver is watching returns "This video was replaced while you were watching. Here is the new one." Reopening the plan with Edit hides the card.
- End-to-end on a demo backend (8814) with real ffmpeg and whisper.cpp, synthetic takes (testsrc 720x1280 plus 440 Hz tone, 4 s each, 2 shots), headless Chrome (playwright-core) with a separate no-cookie context for the approver (the Playwright MCP browser was held by another session). The plan and ideas were seeded through `PUT /api/ideas` (the video was shortlisted once in the UI so it is in the library); takes were uploaded through the API; making the video, sending, the review page and every decision went through the UI.
- 1440 wide, 16 of 16 pass. 390 wide, 16 of 16 pass. Checks: (1) send with no review link -> "This client's review link is turned off. Make a new one on the Shortlist first."; (2) after Get review link, send -> "Waiting for Annie's approval · sent 1 Nov", still there after a reload; (3) the review page shows "2 to review" (plan + video), one `<video>` that plays (currentTime 1.15 s of 7.33 s), no download link and no "Download" text, signed-out `GET /api/ideas/<id>/cut/file` -> 401, approver file route 200 with no Content-Disposition even with `?download=1`; (4) Send back button disabled with an empty box, enabled after typing, card disappears, CutPanel shows "Annie sent this back · 1 Nov" plus the quoted reason; (5) resend, Approve -> "Annie approved this video · 1 Nov" after a reload, with "Making it again clears Annie's approval."; (6) making the video again -> approval gone, approver page has no video card; (7) approver page open on the old video while the team re-cuts and resends, Approve -> replaced text, `<video>` src changes from `?v=...029` to `?v=...926`; (8) Edit then Continue -> `cuts` is empty on `GET /api/review/<token>`, no video card; (9) scrollWidth 1440 at 1440 and 390 at 390 on the review page (with a 200-char unbreakable URL in the plan's "Note to approver" and both card types shown) and on the plan page.
- Not verified: restarting the server and keeping the data (`isolated-backend.sh` uses a fresh temp dir on every start, so only a reload was checked; pytest covers recover); the TikTok iframe on the review page was not the cause of the 390 overflow but its own 403/429 console noise was not checked; "can't download" is the interface only (anyone who can see the `<video>` can still save the file); a real iPhone clip, long or large takes and real speech (see 2c-1); two browser tabs deciding at the same moment (pytest `test_second_decision_404_not_waiting` only); the review link has no expiry (phase 1 design).
- Cut time was not measured separately in this run.
- E2E re-run after 6211817 (HEAD 32ffa4e, 2026-11-01 AEDT): demo backend on 8816 (stopped), real ffmpeg and whisper.cpp, 4 s synthetic takes (testsrc 720x1280 plus tone; 3 takes for 2 shots), headless Chrome via playwright-core with a separate no-cookie context for the approver; seeding through the API (shortlist once in the UI, plan sent and approved through the review API, takes uploaded through the API), everything else through the UI. 1440 wide: 35 of 35 checks pass. 390 wide: 35 of 35 pass. The 16 regression checks (groups 1-9) all pass at both widths, including scrollWidth equal to the viewport on the review page (plan and video cards, 200-char URL note) and the plan page. B1: with a video waiting, Edit then Continue shows exactly "Hidden from Annie while the plan is reopened." and `GET /api/review/<token>` cuts is [], with no video card. B2: re-approving without touching takes brings the waiting card back ("Waiting for Annie's approval · sent 1 Nov"). B3: after the chosen take changed and the plan was approved again, the approver's cuts is [], the team sees "The takes or music changed after this was made. Make it again." with no Send button, and POST /cut/review returns 409 "The takes or music changed after this was made. Make it again before sending it.". B4: while waiting the panel shows "Making it again takes it off Annie's list until you send it again.". B5: an approver page open on a cut that stopped waiting shows "This video is no longer waiting for you. Here is what is still waiting." and not "That plan was already reviewed.".
- Re-run caveats / not verified: B3 as worded (change the chosen take while the plan is reopened) cannot happen, the server refuses with 409 "Only an approved plan can take footage."; the take was changed after re-approving, and the cut was hidden and stale from then on. The review link was made with `POST /api/share` rather than the Shortlist button, and Annie's plan decisions in the re-run went through the review API (the review-page buttons were used for the video decisions). Still not verified from the first run: server restart keeping data, two tabs deciding at once, real clips.

## Next-day environment (port 8805, real mode, no demo data)
- Account: tommycat997@gmail.com, password given in chat.
- Start (from the worktree root, detached): `nohup bash bin/isolated-backend.sh 8805 > /tmp/env-8805.log 2>&1 &`
- Stop: `kill $(lsof -nP -tiTCP:8805 -sTCP:LISTEN)`
- It runs from a throwaway temp dir (printed in the start log, `temp dir:`), with a fresh `backend/data.db` and the pinned searches copied from `backend/pinned`. The temp dir is deleted when the script stops, so the database and the account are lost on stop; start again and re-run `add-user`.
- Budgets are all 0, so no paid call can run (analyse channel, shot list and refresh trends will be rejected).
- Health check: `curl -s http://127.0.0.1:8805/api/health`

## Known issues
- Staff can only turn off a review link while a plan is waiting for approval; after the last approval there is no way to close it.
- Closed-link and already-reviewed messages are in English ("This link has been closed", "That plan was already reviewed"), not Chinese as the plan quotes.
- Console noise in tests: 403/429 from TikTok embeds and one unexplained 404; not investigated.
- No separate horizontal-overflow check at 390 width.
- FIXED in 2c-2 (dd04914): the approver's review page (`/review/<token>`) overflowed at 390 (scrollWidth 1200, measured 2026-10-31). Cause: grid tracks sized to the content (a long unbreakable string such as a URL in a note widened them); fixed with `minmax(0,1fr)` tracks, `min-width:0` and `overflow-wrap:anywhere` under `.shared-review`. Rechecked 2026-11-01 with a 200-char URL in a note, plan and video cards both shown: scrollWidth 390 at 390, 1440 at 1440.
- The team's plan page overflows with a long unbreakable "Note to approver" (a 200-char URL gave scrollWidth 2447 at 1440, seen once on 2026-11-01 while the plan waited); not investigated, not part of 2c-2, so the 2c-2 e2e used a short note on the plan page.

## Next steps
1. User testing on the 8805 environment.
2. Phase 2 inventory done (2026-10-31): see `docs/phase2-scope.md`. User approved scope 2a-2c (stage board, shot checklist + real-footage upload, ffmpeg rough cut), real footage only. 2a stage board done on `feat/remake-stage-board` (PR to the fork, base `feat/remake-e2e`), waiting for review. Next: 2b plan after 2a merges. Still open: rough cut vs finished cut, Annie approving the cut, video storage location.

## 本工作區本輪修改／新增檔案（未提交）

- `bin/verify.sh`
- `docs/STATUS.md`
- `docs/test-log.md`
- `pivots/02-content/app/trend-finder/backend/models.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_store.py`
- `pivots/02-content/app/trend-finder/src/App.tsx`
- `pivots/02-content/app/trend-finder/src/lib/hooks.ts`
- `pivots/02-content/app/trend-finder/src/types.ts`
- `pivots/02-content/app/trend-finder/unit/hooks.test.mjs`
- `pivots/02-content/docs/demo-qa/issues.md`
- `bin/verify-zero-spend.sh`
- `pivots/02-content/app/trend-finder/backend/tests/test_zero_spend.py`
- `pivots/02-content/app/trend-finder/unit/pickedPlans.test.mjs`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/evidence.json`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/frame-4s.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-reload-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-visible-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/research-picked-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/shot-list-edit-ui.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-ended.png`
- `pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-midpoint.png`
- `pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md`

另有ignored本機依賴連結（node_modules、backend/.venv）、build產生的dist與其中qa-existing-footage-proof.mp4連結；只指向既有依賴／本輪證據，不安裝或改共享套件。
