# Test log

One row per test run, newest first. Never delete rows.
Before running a test, check here: if the same test already passed at a commit and `git log <sha>..HEAD`
shows no change to the code it covers, do not run it again.

- Mock = mock models, US$0. Paid = real provider, cost noted.
- Ports: isolated backends on 8871/8872 only.
- Issues found during demo QA live in `pivots/02-content/docs/demo-qa/issues.md`; open setup tasks in `docs/todo.md`.

| Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence |
|---|---|---|---|---|---|
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

## Never run yet (do not assume these work)

- Real models inside the app UI (Run all / ✦ on a real backend); fal Kling and Omni Flash; Gemini Nano Banana (no key yet). Only fal Seedream + Hailuo were called directly (2026-11-04)
- Real Claude for the "✦ 幫我建好" agent
- ElevenLabs voice
- Real human-speech clean-up, real iPhone HEVC/HDR footage
- Live Apify search (budget saved for demos)
