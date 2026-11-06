## 2026-11-07：本次展示 review 的最新適用範圍

- 使用者決定：語音不重要，本次不以 Gemini／ElevenLabs key 或語音生成作為阻擋。
- prepared 固定案例、兩條操作錄影和真本機編輯／匯出已有驗收證據，見最新 STATUS／test-log；下方舊「生成 demo footage」未勾選不能解讀成沒有影片。即時 provider 與真人拍攝仍須分別標示，不能由 prepared 證據推論通過。
- [ ] Tommy／Veralyn 看完最新成品並確認內容、外觀及展示說法。
- [ ] 在實際 MacBook 開啟固定版本，核對播放、互動、備援錄影與離線播放；兩條錄影都沒有音軌，語音不列阻擋。
- [ ] 按最新展示範圍重核 issues.md 的舊 P0/P1；歷史 open 不直接代表目前重現，也不自動勾完成。
- [ ] 兩次正式彩排與週六展示 smoke 的驗收證據；已有兩條路線錄影，不等同兩次真人彩排。
- [ ] 討論展示後優先事項：真素材／真 provider 的品質與等待、保存／跨裝置需求；先討論，不開始新增功能。

# To do

Open tasks that are not code: keys, decisions, things only Tommy can do. Tick `[x]` with the date when done.
AI sessions: read this at the start; remind the user of any open item in "Tommy needs to do" that blocks the current task.

## Tommy needs to do
- [ ] Add `GEMINI_API_KEY` to `pivots/02-content/app/trend-finder/.env` (Nano Banana 2 / Pro image models)
- [ ] Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to `.env` (AI voiceover; set `DAILY_GEN_VOICE_USD` budget)
- [ ] Decide: real Claude for the "✦ 幫我建好" agent at the demo? (needs the Anthropic key, paid)
- [x] `FAL_KEY` in `.env` (2026-11-04, confirmed by the paid smoke test in `docs/test-log.md`)

## Before Demo Night (Sat 2026-11-07)
- [x] PR #49 merged to main after the teammate's design merge and E2E (2026-11-04, Tommy said merge)
- [x] fal smoke test, Seedream + Hailuo, ~US$0.23 (2026-11-04)
- [ ] Fix P1 issues in `pivots/02-content/docs/demo-qa/issues.md` (Research→Plans demo row, Plans status after send, table overflow, title casing; board vs canvas entry needs a call with the teammate)
- [ ] Generate the demo footage with real models (quote first, cap ~US$2-4, needs Tommy's OK)
- [ ] Tommy walks the full flow, screenshots into `pivots/02-content/docs/demo-qa/`
- [ ] Fix all P0 in `pivots/02-content/docs/demo-qa/issues.md`
- [ ] Update the Figma flow map on Friday after the fixes settle
- [ ] Demo rehearsal Friday

## After the demo
- [ ] Close #28-#48 once #49 is merged
- [ ] Clean up stale worktrees (list first, remove only approved ones)
- [ ] Decide on untracked `pivots/02-content/docs/retros/` and `research/reports/`, `research/research_notes/`
