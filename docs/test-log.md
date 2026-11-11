# Test log

One row per test run, newest first. Never delete rows.
Before running a test, check here: if the same test already passed at a commit and `git log <sha>..HEAD`
shows no change to the code it covers, do not run it again.

- Mock = mock models, US$0. Paid = real provider, cost noted.
- Ports: isolated backends on 8871/8872 only.
- Issues found during demo QA live in `pivots/02-content/docs/demo-qa/issues.md`; open setup tasks in `docs/todo.md`.

| Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence |
|---|---|---|---|---|---|
| 2026-11-05 | feat/demo-team-handoff, Canvas02c5f99 + integrated demo snapshot | Full offline sandbox verify; zero-spend runner; isolated frontend npm build/lint | GREEN: backend1109 passed/2 skipped (33.23s), frontend PASS; zero-spend32 passed (0.50s); build/lint0. No network/credentials/shared writes. Initial temporary Vite cache denied; owned local cache fixed harness only. Origin/main baseline render-orphan test failed, integrated Canvas passes. No new full UI/provider/campaign acceptance | US$0 | Integration terminal output; /private/tmp/buildclub-team-frontend-8_oywgrz/*-final.log; existing Canvas/demo evidence retained |
| 2026-11-05 | Productdiff221c6446; Canvas picker theme fix | Root full/build/lint; actual1440Light/Dark served CSS; no backend restart | 1076 passed,2skipped33.72s;frontendPASS;build/lint0;white form/input/card Light;Dark themed;pageerrors=[];ownedbrowserclosed | US$0 | /tmp/buildclub-picker-theme-full.log; /tmp/buildclub-picker-theme-2026-11-05/check-served.cjs, served-results.json, served-picker-*.png |
| 2026-11-05 | Final product067e9b87 unchanged | Unknown UI actual ResultLost worker transition/reload/restart/no retry/history; root artifact verify | PASS exit0;50newhashes+old964/130unchanged;3rows/3submit;.01virtualreservation retained;cleanupempty;VP8 1440x90036.40s | US$0/mock | /tmp/buildclub-canvas-unknown-ui-2026-11-05/report.md; verify-artifacts.py |
| 2026-11-05 | Magnific authenticated owned workflow, no Run | Front operation stage capture completion plus prior back-half | OBSERVED/non-generating workflow complete;5 stepGIFs41/35/11/13/47frames+prior50;continuousvideo BLOCKED(toolonlygif_creator);realgeneration NOTRUN | US$0 | MacBook:/tmp/buildclub-magnific-recording-completion-2026-11-05/report.md; sha256.txt; root exactworker transcript |
| 2026-11-05 | Final product067e9b87 unchanged | Remaining Legacy tail, active reload, downstream stale, price-only drift, malformed graph; root artifact verifier | Five groups PASS / each exit0;130hashes;9cleanup empty;ports empty/leases released;five full1440x900VP8 clips | US$0/mock | /tmp/buildclub-canvas-gap-completion-2026-11-05/report.md; verify-artifacts.py |
| 2026-11-05 | Final product067e9b87 | Root reran frozen UI artifact verification and diff check | exit0; 964 hashes PASS; raw failures retained; all cleanup survivors={}; MP4/WebM formats PASS; git diff --check exit0. UI tail NOT RUN stays explicit | US$0 | python3 /tmp/buildclub-canvas-controls-2026-11-05/verify-ui-report.py; ui/report.md; ui/final-cleanup.json |
| 2026-11-05 | feat/canvas-generation-controls @b651e6d + final product diff 067e9b87 / unit6fd5ba6c | Root full after picker click and ReactFlow measurement fixes; isolated build/lint | 1076 passed, 2 skipped in36.13s; frontend PASS; verify GREEN; build/lint exit0 | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/final-measured-{full,build,lint}.log |
| 2026-11-05 | Final product diff067e9b87 | Original upload abort/same-node retry/reference path; measurement save/Editor-return/workspace isolation; excess API | Upload retry/ref PASS and nodes visible; measurement4 PASS, errors=[]; excess genuine422 no added generations | US$0/mock | ui/upload-excess-measurement-fix; ui/measurement-walkthrough-final; ui/excess-api-422; final ui/report.md |
| 2026-11-05 | Picker fix product e7477f52 and later measurement-only fix | Mouse picker close, smallcap/no-ref/ref preservation, active-child manual choice and history, search error clear | Picker targeted checks PASS; history2 PASS; search3 PASS; independent active UI agent provisional ACCEPT for both final fixes | US$0/mock | ui/picker-gaps; ui/history-gaps; ui/search-gaps; final ui/report.md |
| 2026-11-05 | Original integrated source731da3b7 | Main local MP4/approval/sendback/two real restarts; contrast; refs; batch chronology | main13/13; contrast16 elements per4 themes >=4.5; refs5; chronology3; mixed2; legacy-entry3 PASS; first export transient failure retained | US$0/mock | ui/renderer-diagnostic/workspace.mp4, ffprobe.json, restart evidence; ui/report.md |
| 2026-11-05 | Final product diff067e9b87 | Continuous UI screen recording through mock batch/reload/refs/Editor, visibility/workspace checks | VP8 1440x900 11.72s; partial walkthrough, not full end-to-end recording or exported MP4 | US$0/mock | ui/measurement-walkthrough-final/page@1d954e0fed90e09d9be5193ee0cbc13f.webm |
| 2026-11-05 | Same integrated product source | Navigation, saved brief/research, cached search, uncached429 alert, themes and en/zh | 21/21 PASS; pageerrors=[]; external fonts/embeds blocked intentionally; no live search | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/ui/navigation/navigation-results.json |
| 2026-11-05 | Same integrated product source; controls-v3 | Actual mock ratio/size/count SVGs, ModelPicker keyboard, saved settings/selected reload | 5 checks PASS; 5 SVGs; pageerrors=[]; cleanup survivors={}. Earlier selected mismatch was missing reconcile wait, original comparison retained | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/ui/controls-v3; selection-states.jsonl |
| 2026-11-05 | feat/canvas-generation-controls @b651e6d + reviewed dirty product diff 731da3b7 / new test 403f17b5 | Integrated offline full after bug/backend/frontend v3 patches | 1076 passed, 2 skipped in37.15s; frontend PASS; verify GREEN | US$0/mock | /tmp/buildclub-canvas-controls-2026-11-05/integrated-full.log; STATUS source hashes |
| 2026-11-05 | Same integrated product source | Build and lint in isolated deny-network temp copy, existing dependencies | build exit0; lint exit0; existing large chunk warning | US$0 | Same local directory/integrated-build.log, integrated-lint.log |
| 2026-11-05 | Same integrated product source | UI controls first attempt, actual browser runtime callable | NOT ACCEPTED: old served build showed native model select, Ratio timed out; runner finally cleanup; isolated rebuild/retest in progress | US$0/mock | Original UI agent; progress.json; final UI report pending |
| 2026-11-05 | feat/freeform-canvas @2776a19 | Final offline closing verification before PR53 | 1023 passed, 2 skipped in33.08s; frontend PASS | US$0 | Same product tree as f0; final code/visual ACCEPT |
| 2026-11-05 | feat/freeform-canvas @f0f97c9 | Full offline gate, build/lint after accepted legacy card placement | 1023 passed, 2 skipped; frontend PASS; build/lint0 | US$0 | Freeform Status |
| 2026-11-05 | @6e65cb1 + restart driver assertions | Main UI plus true server restart in approved/rejected states | 13 PASS; state/public JSON/media SHA256 unchanged; survivors={} | US$0/mock | QA main-ui-results/restart-*.json |
| 2026-11-05 | @f0f97c9 | Legacy entry/real assistant/NoShots plus card bounds | 3 PASS; overlaps=false; survivors={} | US$0/mock | QA legacy-entry-results/legacy-cards-geometry |

| 2026-11-05 | feat/freeform-canvas @4e92a14 | full offline gate; frontend build/lint | 1023 passed, 2 skipped; frontend PASS; build/lint exit0 | US$0 | Freeform Status; local-only sandbox |
| 2026-11-05 | 4e92a14 + scoped port-padding fix | Main 1440 UI, real local MP4, approval/send-back, persistence, geometry, zh-Hant | 11 PASS; cleanup survivors={} | US$0/mock | pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-* |
| 2026-11-05 | same tested product tree | Recovery/assistant/CAS/legacy kit/voice/navigation isolation | 5 groups PASS; errors=[], routeErrors=[], survivors={} | US$0/mock | same QA directory/recovery-* |
| 2026-11-05 | same tested product tree | Legacy Make the video, real local assistant, held shot PUT/NoShots recovery | 3 PASS; real responses, no fulfilled API data; survivors={} | US$0/mock | same QA directory/legacy-entry-* |

| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + unchanged local product fixes | Native in-process API: upload4 takes/3 shots → choose alternate → real sources probe → edit save/read v1 → POST edit/export202 → native worker/real Remotion → download → ffprobe/full decode; two TestClient lifespans then fresh Python process reopen same DB/media | PASS H264 1080x1920 30fps/AAC 9.024s; source/upload hashes and final download match; fresh-process edit/takes/output hash match; provider/network spy0, seven budgets0, wallet empty. No fake probe/export. Product tour only; center crop cuts landscape text, authored English captions; not human/new Canvas/campaign acceptance | US$0 | demo-qa/2026-11-05-zero-spend/native-takes-{check.py,evidence.json,proof.mp4}; temporary DB/media /tmp/buildclub-native-chain-ooc5gsg_ |
| 2026-11-05 | same local tree | Actual Playwright tabs list callable; owned context1440, readonly static8891, native MP4 full playback with remote requests aborted | PASS ended=true/currentTime9.024/error=null/muted=false; midpoint inspected. Initial about:blank media NotSupportedError, then same-origin playback passed. No subjective speech listening. Own tab closed; server cleanup checked separately | US$0 | native-takes-playback-{midpoint,ended}.png; native-takes-evidence.json |
| 2026-11-05 | same local tree | bash bin/verify-zero-spend.sh; full bin/verify.sh in env -i with seven budget env vars0 | Zero-spend 32 passed in0.40s. Full verify RED: backend92 failed/910 passed/2 skipped in25.62s; compile/load/frontend unit PASS. Focused test_frame_poll_failed_refunds expected502, got429 zero-wallet guard, 1 failed in0.17s. Remaining91 not individually diagnosed; no budget raised, historical GREEN not reused | US$0 | Test output in session; verification summary in native-takes-evidence.json; full verify resource local:buildclub:verify released |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | bash bin/verify-zero-spend.sh; bash syntax check and git diff --check | 32 passed in 0.35s, exit0. Script fails closed on local config presence, starts env -i + seven budgets0; no HTTP service or provider/network call | US$0 | bin/verify-zero-spend.sh; backend/tests/test_zero_spend.py; checks are local-branch fake coverage, not new Canvas/provider invoice acceptance |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Integrator UI takeover: actual frontend at1440, read-only static host + browser-route fake API; external requests blocked | PASS sample Picked→Plans→actual reload→plan shot edit. Confirmed Research width1473 at1440 (#2). Not real-backend persistence, new Canvas, analysis or campaign acceptance. Static POST501; owned page/server closed and lease released | US$0 | demo-qa/2026-11-05-zero-spend/{research-picked-ui,plans-visible-ui,plans-reload-ui,shot-list-edit-ui}.png; evidence.json |
| 2026-11-05 | same local tree | Existing tracked product-tour footage, three clips, actual Remotion export in env -i; ffprobe + full decode + browser full playback | PASS H264 1080x1920 30fps/AAC 9.024s; ended=true/error=null; mean -20dB/max -3dB. Authored English technical captions; not human transcription, real AI generation or target-case final | US$0 | demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4, source hash and assertions in evidence.json; job/cache in /tmp/buildclub-existing-footage-3p0g5f0q |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Zero-spend paid entry tests: env -i, seven budgets=0, in-process API, fake availability, provider/network spies | 32 passed in 0.34s; each case asserts provider/network calls=0 and no wallet charge. First run: 23 passed/1 failed because test video node did not exist; corrected fixture, not a budget leak. No HTTP listener, real credential or provider request | US$0 | backend/tests/test_zero_spend.py; no new Canvas batch/UI/provider-billing acceptance |
| 2026-11-05 | same local tree | Cached-only API hit/miss using tracked tofu pinned record; external search/spend/background calls forbidden | PASS: 200, cached=true, 12 records; miss empty/cached=false, no paid call. Historical fetchedAt, not live platform verification | US$0 | /tmp/buildclub-demo-flow-qa-cached-search-evidence.json |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + local fixes | Resume audit: test-slot full verify with independent outer log, then full verify after changing shared step log to mktemp | Both GREEN, four steps PASS each. Historical paused-worker backend RED not reproduced; its original backend error is unavailable. Shared /tmp/verify_step.log could mix parallel reports; fixed only log isolation, unchanged checks | US$0 | /tmp/buildclub-demo-flow-qa-resume-verify.qRvzPD; /tmp/buildclub-demo-flow-qa-isolated-verify.EQjZlJ; bin/verify.sh diff |
| 2026-11-05 | fix/demo-flow-qa-mainline @ e442b3a + uncommitted seven-file fix | Integrator applied reviewed P1 #1/#5 diff; test-slot full verify, build, lint, diff check | GREEN, four verify steps PASS; build/lint exit 0. Independent reviewer task_82b57e760129 accepted and ran focused 20/20. Updated one stale test comment. No UI, human footage, real reload/restart or new Canvas acceptance | US$0 | demo-qa/issues.md integration section; source diff and new unit/pickedPlans.test.mjs; local working tree, no commit/push/merge |
| 2026-11-05 | test/demo-flow-qa @ e442b3a | Session baseline `bash bin/verify.sh`; re-run after linking existing dependencies, no install | Initial RED: missing backend venv, TypeScript and @remotion/captions. Re-run GREEN: all four steps PASS. Local ignored node_modules link uses canvas-p1; backend/.venv uses w2-grade-subs-backend. No product changes, no browser flow or human-footage acceptance yet | US$0 | This worktree; `git diff --check` PASS; Playwright browser_tabs callable, about:blank only |
| 2026-11-04 | chore/demo-integrate-main-1104 @ cf5db59 | Merged the teammate's 7th branch `feature/recent-searches-ui` (Find ideas recent-searches table): `tsc -b` + build, eslint, `bash bin/verify.sh` | GREEN. Not browser-tested (no E2E covers Find ideas recent searches) | Mock | PR #49 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 20aad0d (+ e2e/lib.cjs wait fix) | After restoring the Canvas entries on the teammate's plan page / Plans cards: E2E polish A-D on 8872, each on a fresh backend; `bash bin/verify.sh` | B 76/76, C 50/50, D 54/54, A 17/18 (only the known h1, issue #9; ran with `h1, h2`), verify GREEN. First run B-D failed: after the teammate's login change the app's first library save landed after `seed()` and wiped it; fixed in `e2e/lib.cjs` login (wait for network idle) | Mock | scratchpad `e2e-20aad0d/` (not kept) |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 78c1331 | After merging the teammate's 6 branches (entry-screens-ui, find-ideas-first-visit, landing-demo-search, plan-page-polish, planning-board-navy, plans-card-trim): `bash bin/verify.sh`, `tsc -b`, eslint, build | GREEN, 0 errors. Browser E2E not re-run. Note: plan-page-polish and plans-card-trim removed the Plan page / Plans card entries into the Canvas and the production + publish panel (CutPanel); only the sidebar Canvas item remains | Mock | PR #49 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ bf55f84 | **Paid** fal smoke via the app's `FalAdapter` (no server): Seedream 4.5 text-to-image → Hailuo 2.3 Fast 6 s image-to-video from that frame | PASS. Image 2304x4096 (9:16) in 20 s; video h264 768x1364 24 fps 5.875 s in 103 s; looks good (tofu in pan, spatula flips). Real waits are longer than `typicalSeconds` (15 s / 90 s) | ~US$0.23 (fal) | script + outputs in session scratchpad `fal-smoke/` (not kept) |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | AI walk of the full flow at 1440 (Find ideas → Research → Plans → Canvas → ✦ → Run all → timeline → editor → export → send → review link), demo data | whole chain works; 0 P0, 5 P1, 4 P2 | Mock | `pivots/02-content/docs/demo-qa/issues.md`, screenshots in `demo-qa/2026-11-04-ai-pass/` |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | E2E polish A-D, each on a fresh backend | B 76/76, C 50/50, D 54/54; A aborted at nav (plan page has no h1 after teammate redesign → test issue, not a merge bug); A with `h1, h2` selector 17/18, the 1 fail is the same heading change | Mock | scratchpad `e2e-1104/` (not kept); issue #9 |
| 2026-11-04 | chore/demo-integrate-main-1104 @ 61462c7 | `bash bin/verify.sh`, `tsc --noEmit`, `npm run build` after merging origin/main (#42, #44) | GREEN | US$0 | PR #49 |
| 2026-11-04 | feat/canvas-polish-d-agent @ f9044e2/5e4f117 | unit, backend pytest, E2E `polish-a-shell`, `polish-b-nodes`, `polish-c-timeline`, `polish-d-agent` (each on a fresh backend, 1440) | unit 466/466, pytest 969 passed, A 18/18, B 76/76, C 50/50, D 54/54, verify GREEN | Mock | `docs/STATUS.md` 2026-11-04 |
| 2026-11-03 | feat/canvas-p2-5-kit @ c2d057c | verify, pytest, unit, kit E2E 8/8, layout check at 1440 | GREEN, pytest 955, unit 388/388, E2E 8/8 | Mock | `.superpowers/sdd/2026-11-03-canvas-p2-5-kit-plan/task-7-report.md` |
| 2026-11-03 | fix/canvas-ux-batch1-3 | browser re-test of each UX fix item at 1440 | all PASS | Mock | `docs/STATUS.md` |
| 2026-11-03 | fix/canvas-ux-batch4 @ 0572a70 | verify | GREEN (no browser re-test) | Mock | `docs/STATUS.md` |
| 2026-11-03 | 5e83abd | AI UX test: goal-only (layer 3) + personas Daphne/Annie (layer 4), flows F1-F4 | all 4 flows reached; Annie 3/3, Daphne 3/3; findings fixed in UX batches 1-4 | Mock | Artifact https://claude.ai/artifact/5e2daMUXKegc3gdB3T9jJ4; `.superpowers/sdd/2026-11-03-canvas-p4-plan/ux-test/` |
| 2026-11-03 | 194a6dd → 62f97ee | A1-A8: stack rehearsal #28→#32 on main, 24/48-clip perf, HEVC .mov, HDR, chain guards, whisper speech, zh export, cold export | A1-A5, A8 pass; A6/A7 failed then fixed (f191a60, ed46dfd, 35415f1); A4 HDR fixed later (8344464) | Mock | `e2e/a*.cjs`; `.superpowers/sdd/2026-11-03-canvas-p4-plan/a2-a8-report.md` |
| 2026-11-03 | feat/canvas-p4-finish @ 0c22bb5 | P4 E2E steps 1-10, clean-up on a real file, export ffprobe | pass after filler fix; 1080x1920 30fps aac | Mock | `.superpowers/sdd/2026-11-03-canvas-p4-plan/task-8-report.md` |
| 2026-11-03 | feat/canvas-p3b-editor-media | P3b E2E, render smokes, ffprobe frames | pass; one bug fixed (31b2ad7) | Mock | `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-12-report.md` |
| 2026-11-03 | feat/canvas-p3-editor | P3a E2E, Remotion export timing (cold 10.4 s / hot 10.8 s) | pass; one bug fixed (c6b2e34) | Mock | `.superpowers/sdd/2026-11-03-canvas-p3-plan/task-7-report.md` |
| 2026-11-03 | feat/canvas-p2-models @ dad12ba | verify, browser E2E 5 scenarios | GREEN, 5/5 | Mock | `docs/STATUS.md` |
| 2026-11-02 | main 4343366 | verify, tsc, lint, build, E2E at 1440 and 390 (filters, numbers source, Compare, framing, zh-Hant) | all pass | Mock | `docs/STATUS.md` 2026-11-02 |

## 2026-11-05 native-chain reproduction

Native-chain reproduction (run at repository root; no dependency installation or credential loading):

```bash
python3 /Users/tommy/.agents/skills/test-slot/scripts/test_slot.py --resource local:127.0.0.1:8892:buildclub-remotion with-command --wait 0 --timeout 300 -- env -i PATH=/opt/homebrew/bin:/usr/bin:/bin REMOTION_PORT=8892 DAILY_APIFY_USD=0 DAILY_CLAUDE_USD=0 DAILY_GEN_IMAGE_USD=0 DAILY_GEN_VIDEO_USD=0 DAILY_GEN_VOICE_USD=0 DAILY_JEV_USD=0 DAILY_SCRAPECREATORS_CREDITS=0 pivots/02-content/app/trend-finder/backend/.venv/bin/python -B pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-check.py
```

This command repeats the technical export and retains a new temporary DB/media folder. For a fresh-process read-only reopen of this run, use the same cleared environment and script with `--reopen /tmp/buildclub-native-chain-ooc5gsg_`. The actual original native-run stdout was:

```text
PASS native upload: 4 takes / 3 shots, byte hashes match repository source
PASS choose alternate: correct shot selected, original deselected
PASS real sources probe, versioned edit save/read, native export HTTP 202 -> done
PASS same DB/media across two TestClient lifespans, downloadable MP4 bytes match
PASS ffprobe H264 1080x1920 30fps / AAC / 9.024000s; full decode exit 0
PASS provider/network spy calls=0; seven budgets=0; wallet empty
```

Fresh-process reopen stdout:

```text
PASS fresh-process TestClient reopen: same DB/media, edit/takes/final MP4 hash match; provider/network spy=0, wallet empty
```

Cleanup confirmed: owned playback tab closed, static server stopped, 8891/8892 have no listeners, browser/static/render slots all held=false. Nested static-server wrapper initially caught Ctrl-C before forwarding it; inspected owned PIDs then sent SIGINT to owned static Python server only. No other Chrome or service touched.

## 2026-11-05 Canvas 本輪修改清單（未提交）

- `docs/STATUS.md`
- `docs/test-log.md`
- `pivots/02-content/app/trend-finder/backend/gen_models.json`
- `pivots/02-content/app/trend-finder/backend/gen_providers.py`
- `pivots/02-content/app/trend-finder/backend/generations.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_gen_providers.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_generations.py`
- `pivots/02-content/app/trend-finder/backend/tests/test_workspaces.py`
- `pivots/02-content/app/trend-finder/backend/workspaces.py`
- `pivots/02-content/app/trend-finder/src/App.tsx`
- `pivots/02-content/app/trend-finder/src/components/ResultsScreen.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/CanvasScreen.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/FreeformNode.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/ModelPicker.tsx`
- `pivots/02-content/app/trend-finder/src/components/canvas/freeformContext.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/api.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/graph.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/legacy.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/session.ts`
- `pivots/02-content/app/trend-finder/src/lib/canvas/types.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/freeform.ts`
- `pivots/02-content/app/trend-finder/src/lib/strings/server.ts`
- `pivots/02-content/app/trend-finder/src/styles/canvas.css`
- `pivots/02-content/app/trend-finder/src/styles/editor.css`
- `pivots/02-content/app/trend-finder/unit/searchStatus.test.mjs`
- 新增：`pivots/02-content/app/trend-finder/unit/canvasControls.test.mjs`

共 26 檔，無刪除；不含只存於 /tmp 的驗收產物。沒有 commit／push／merge。

## Never run yet (do not assume these work)

- Real models inside the app UI (Run all / ✦ on a real backend); fal Kling and Omni Flash; Gemini Nano Banana (no key yet). Only fal Seedream + Hailuo were called directly (2026-11-04)
- Real Claude for the "✦ 幫我建好" agent
- ElevenLabs voice
- Real human-speech clean-up, real iPhone HEVC/HDR footage
- Live Apify search (budget saved for demos)

## 2026-11-05 交付分支檔案清單

相對 `origin/main @ e442b3a`，含已提交Canvas前置成果；A=新增、M=修改、D=刪除。原工作區的秘密／資料／依賴／測試快取和未整理研究不包含在此清單。

```text
A	bin/freeform-e2e.py
M	bin/real-fal-backend.sh
A	bin/verify-zero-spend.sh
M	bin/verify.sh
A	bin/verify_offline.py
M	docs/STATUS.md
M	docs/test-log.md
M	pivots/02-content/app/trend-finder/backend/agent.py
M	pivots/02-content/app/trend-finder/backend/canvas.py
M	pivots/02-content/app/trend-finder/backend/channels.py
M	pivots/02-content/app/trend-finder/backend/cut_review.py
M	pivots/02-content/app/trend-finder/backend/editing.py
M	pivots/02-content/app/trend-finder/backend/gen_models.json
M	pivots/02-content/app/trend-finder/backend/gen_providers.py
M	pivots/02-content/app/trend-finder/backend/generations.py
M	pivots/02-content/app/trend-finder/backend/models.py
M	pivots/02-content/app/trend-finder/backend/renders.py
M	pivots/02-content/app/trend-finder/backend/server.py
M	pivots/02-content/app/trend-finder/backend/tests/test_channel.py
M	pivots/02-content/app/trend-finder/backend/tests/test_editing.py
M	pivots/02-content/app/trend-finder/backend/tests/test_gen_providers.py
M	pivots/02-content/app/trend-finder/backend/tests/test_generations.py
A	pivots/02-content/app/trend-finder/backend/tests/test_offline_verify.py
M	pivots/02-content/app/trend-finder/backend/tests/test_renders.py
M	pivots/02-content/app/trend-finder/backend/tests/test_server_text.py
M	pivots/02-content/app/trend-finder/backend/tests/test_store.py
A	pivots/02-content/app/trend-finder/backend/tests/test_workspaces.py
A	pivots/02-content/app/trend-finder/backend/tests/test_zero_spend.py
A	pivots/02-content/app/trend-finder/backend/workspaces.py
M	pivots/02-content/app/trend-finder/e2e/FLOWS.md
A	pivots/02-content/app/trend-finder/e2e/freeform-backend.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-isolation.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-legacy-entry.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-lifecycle.py
A	pivots/02-content/app/trend-finder/e2e/freeform-recovery.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-restart.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform-timeout.cjs
A	pivots/02-content/app/trend-finder/e2e/freeform.cjs
M	pivots/02-content/app/trend-finder/render/render-reel.mjs
M	pivots/02-content/app/trend-finder/src/App.tsx
M	pivots/02-content/app/trend-finder/src/components/CanvasPick.tsx
M	pivots/02-content/app/trend-finder/src/components/ResultsScreen.tsx
M	pivots/02-content/app/trend-finder/src/components/SharedReviewPage.tsx
M	pivots/02-content/app/trend-finder/src/components/canvas/CanvasScreen.tsx
A	pivots/02-content/app/trend-finder/src/components/canvas/FreeformNode.tsx
M	pivots/02-content/app/trend-finder/src/components/canvas/ModelPicker.tsx
A	pivots/02-content/app/trend-finder/src/components/canvas/freeformContext.ts
M	pivots/02-content/app/trend-finder/src/components/canvas/nodes/Ports.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/EditorPanel.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/ExportBar.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/ShotClips.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/tools/MusicTool.tsx
M	pivots/02-content/app/trend-finder/src/components/editor/tools/VoiceTool.tsx
M	pivots/02-content/app/trend-finder/src/lib/canvas/agent.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/api.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/freeform.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/graph.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/legacy.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/mediaReplacement.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/operations.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/placement.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/ports.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/resource.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/session.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/shell.ts
M	pivots/02-content/app/trend-finder/src/lib/canvas/types.ts
A	pivots/02-content/app/trend-finder/src/lib/canvas/voices.ts
M	pivots/02-content/app/trend-finder/src/lib/cut.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/api.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useEditProject.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useSources.ts
M	pivots/02-content/app/trend-finder/src/lib/editor/useTimelineActions.ts
M	pivots/02-content/app/trend-finder/src/lib/hooks.ts
M	pivots/02-content/app/trend-finder/src/lib/share.ts
M	pivots/02-content/app/trend-finder/src/lib/strings/canvas.ts
A	pivots/02-content/app/trend-finder/src/lib/strings/freeform.ts
M	pivots/02-content/app/trend-finder/src/lib/strings/server.ts
M	pivots/02-content/app/trend-finder/src/styles/canvas.css
M	pivots/02-content/app/trend-finder/src/styles/editor.css
M	pivots/02-content/app/trend-finder/src/types.ts
M	pivots/02-content/app/trend-finder/unit/agent.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasControls.test.mjs
M	pivots/02-content/app/trend-finder/unit/canvasEdges.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasEntry.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasFinalLifecycle.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasLegacyIntegration.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasLegacyMedia.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasPlacement.test.mjs
A	pivots/02-content/app/trend-finder/unit/canvasRecovery.test.mjs
A	pivots/02-content/app/trend-finder/unit/freeform.test.mjs
M	pivots/02-content/app/trend-finder/unit/hooks.test.mjs
A	pivots/02-content/app/trend-finder/unit/legacyVoicePair.test.mjs
A	pivots/02-content/app/trend-finder/unit/pickedPlans.test.mjs
M	pivots/02-content/app/trend-finder/unit/searchStatus.test.mjs
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-audio.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-ffprobe.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-output-frame.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/backend-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/changed-files.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-01-direct-editor-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-02-assistant-applied-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-02-assistant-reloaded-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-03-auto-recovered-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-03-held-put-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-legacy-cards-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/legacy-entry-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-01-empty-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-02-connected-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-03-review-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-04-editor-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-05-zh-Hant-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-06-inspector-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-canvas-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-connected-header-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-ffprobe.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-output-frame.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-port-styles.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-approved.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-audit.jsonl
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-restart-rejected.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-timeline-geometry.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/main-ui-voice-volume.txt
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-assistant-preview-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-drag-targets.jsonl
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-filtered-create-menu-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-recovery-final-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/recovery-recovery-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/restart-deadline-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/restart-invalid-marker-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/tested-product-sources.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-cleanup-audit.json
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-failure-1440.png
A	pivots/02-content/docs/demo-qa/2026-11-05-freeform/ui-results.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/evidence.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/existing-footage-proof.mp4
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/frame-4s.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-check.py
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-evidence.json
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-playback-ended.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-playback-midpoint.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/native-takes-proof.mp4
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-reload-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/plans-visible-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/research-picked-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/shot-list-edit-ui.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-ended.png
A	pivots/02-content/docs/demo-qa/2026-11-05-zero-spend/video-playback-midpoint.png
M	pivots/02-content/docs/demo-qa/issues.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-plan.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-status.md
A	pivots/02-content/docs/plans/2026-11-05-freeform-canvas-tasks.md
A	pivots/02-content/docs/plans/2026-11-05-saturday-demo-plan.md
```


## 2026-11-06：六鏡雙路線／隔離真匯出（進行中）

- 整合樹 six-shot-ai-flow／feat/six-shot-real-export；基準是 origin/main 2c069a8＋已凍結426檔原guided增量。開工full1109passed／2skipped＋frontendPASS，原展示樹不修改。
- 新來源/parent hash與媒體decode：六鏡各來源、輸出、可用父圖核對，315frames／10.5sec；S1/S19 ledger parentRequestId/bytes吻合text-onlyimage；舊兩筆截斷路徑錯誤留在候選，lead-asset-review記精確來源。
- 新後端測試先ModuleNotFound RED；完成app後共用fixture alias導致Path JSON RED，改為JSON隔離複製後GREEN。原native handler重用；5focused tests涵蓋session/route/version/restart、202/poll/download/stale、重新提交、resetbusy及隔離、changed-source拒絕、default-media不污染。
- frontend Runtime13與fresh2 focused PASS，後補abort/init及刪鏡Use恢復測試，共17focused PASS；最小quoteNode body回歸PASS。原tour測試因新增video/camera子步RED，依雙路需求更新預期後all frontend712PASS，後續新增回歸亦PASS。TS與isolatedVite build exit0；lint exit0。
- 第一次整合full RED：11failed／1102passed／2skipped。原因：jobs_factory=RenderJobs定義時捕捉破壞既有monkeypatch；guided factory改全域_media_dir污染原生suite。改為late-bound optional factory、guided不註冊defaultmedia、router stale使用自己的closure。獨立review接受。重跑full GREEN：1114passed／2skipped in34.28s＋frontendPASS。
- 真native API smoke：smoke-result.json，1080x1920／30fps／10.300sec；UI待驗，這輪由API改英文文字與首鏡out1.2後真Remotion匯出。完整decode、首幀文字實看PASS；own server PID59009→60247重啟後版本與SHA5ea36821fc8ae1c04a4dc75027dc29fe534c2548f230999c5725569425f7f435相同；ownserver停止與lease釋放。
- 原Orca writer兩任務回報failed且未交付程式；native唯讀proposal/review後由lead唯一寫作。模型要求Terra與終端實際Luna不符已披露；未將launch receipt當resolved證據。
- 真UI雙路與錄影目前由sole ui_verification agent執行，frozen465source/108dist；首attempt在進導覽前因harness共用normal auth storage無landing按鈕而FAIL，已清自有backend/browser，非產品通過。結果待回。
- 全部本輪證據 /tmp/buildclub-six-real-export-20261106/，implementation-manifest.json列48個task delta檔；無付費、安裝、commit/push。Goal尚未完成。


## 2026-11-06：六鏡雙路線最後驗收

- 真UI捕捉ChromiumHTTP1 streaming PUT失敗ERR_ALPN_NEGOTIATION_FAILED；runtime改成讀取request.arrayBuffer後以明確method/headers/body/signal/credentials/cache/redirect轉送。Nodefocused17PASS、TS0；真UIDelete PUTv2五clips→Use PUTv3六clips→trim PUTv4六clips，無回退或ALPN。
- QA script共用normal auth、Skip commit時序、舊Saved狀態、文字tab locator等失敗皆保留；沒有為測試放寬產品gate。最終attempt-c18b25db走完雙路並4次真匯出10.3s，兩路 revised文字實看；真重啟40392→54209，DB/media與下載SHA相同，3支完整錄影decodePASS。
- 原最後networkassert FAIL26!=0不改寫；逐筆audit配26blocked route/26ERR_BLOCKED_BY_CLIENT failure，成功外連0，真provider/search transport0；12local404精確分類為root原生auth/health bootstrap，guided editor4040。Lead親跑audit.py：auditPASS，exports4，recordings3，465source/122dist凍結hash，ports8996/8997不監聽，leasefalse。
- 最後full GREEN1114passed／2skipped40.52s＋frontendPASS；lint/TS/build0。另lead兩路default真render各315frames10.5s完整decode，AI結尾CTA影格親看。原10本ledgerSHA全未變；無付費生成、安裝、commit/push。
- 早期bundler默認enableCaching=true會寫共享node_modules/.cache/webpack；本輪localcache模式改enableCaching=false，未刪既有cache或修改套件。UI凍結與最後真輸出均用修正版。
