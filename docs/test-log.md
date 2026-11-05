# Test log

One row per test run, newest first. Never delete rows.
Before running a test, check here: if the same test already passed at a commit and `git log <sha>..HEAD`
shows no change to the code it covers, do not run it again.

- Mock = mock models, US$0. Paid = real provider, cost noted.
- Ports: isolated backends on 8871/8872 only.
- Issues found during demo QA live in `pivots/02-content/docs/demo-qa/issues.md`; open setup tasks in `docs/todo.md`.

| Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence |
|---|---|---|---|---|---|
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
