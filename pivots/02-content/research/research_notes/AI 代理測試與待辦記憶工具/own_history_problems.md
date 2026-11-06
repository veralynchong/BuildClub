# Own-history audit: recurring "AI consistency" problems in the BuildClub project

Scope: the user's own AI-coding history on BuildClub, read-only. Question from the user (2026-11-04): "is plan + to-do + test-run memory enough, or are these not the problems we really have?"

Method and limits (read first, they affect how far the counts can be trusted):
- Corpus: Claude Code transcripts under `.../claude-profiles/0b0de81f-.../home/projects/*BuildClub*` (8 project dirs, about 1.8 GB). Dates covered: 2026-10-27 to 2026-11-04 (9 days). I extracted real user messages only (type "user", text content, no tool results): about 629 messages in 71 sessions, after dropping compaction summaries, auto-title prompts and pasted blobs. I then regex-mined assistant text for self-corrections and state claims.
- All counts below are **lower bounds from keyword regexes plus hand reading**; the user speaks Chinese with voice-dictation typos, so many frustrations are not caught by keywords. Treat "n msgs / n sessions" as order of magnitude, not a measurement. Where I hand-read, I say so.
- Codex: `/Users/tommy/.codex/sessions` has 73 session files, **zero** mention BuildClub, trend-finder or Remake. So this is a Claude-Code-only history; I cannot say anything about Codex-to-Claude handoff.
- Other inputs read: auto-memory dir (9 feedback/project memories), `/Users/tommy/.claude/handoffs/BuildClub.md` (the current one; 3 sibling BuildClub handoffs exist and were not read in full), `docs/todo.md`, `docs/test-log.md`, `docs/STATUS.md` (grep only, 36 KB), the 2026-11-03 retro `pivots/02-content/docs/retros/2026-11-03-canvas-p1-p4-retro.md`, and `git log -200` (68 `fix`, 65 `feat`, 28 `docs`, 20 `Merge`, 7 `test`; no `revert` commits).
- Privacy: people are named by role (user, teammate, client agency owner). No keys, emails or IDs are quoted. Session ids are the first 4 hex characters of the transcript file name.
- Important context: `docs/todo.md` and `docs/test-log.md` were **created on 2026-11-04** (the same morning as this question, session `3afa`). So the three buckets the user proposes are the fixes that already exist, not the pain I can measure from before then. The history shows what hurt *before* those files existed.

Volume indicators of state loss in this period (all from the transcripts):
- 71 sessions in 9 days; 26 of them were opened with a hand-written resume prompt ("繼續 BuildClub：開場 hook 已載入交接檔 ... verify 綠的就直接做下一步第 1 項").
- 38 context-compaction summaries inside 24 sessions (a session ran out of window and was continued from a summary).
- 36 git worktrees registered right now (`git worktree list`), after at least two manual clean-ups.
- 5 standing rules saved as memory files plus 4 more handoff files, all because the user asked the AI to "remember".

---

## Q1. What are the most frequent recurring consistency problems, ranked, with evidence?

### Takeaway
Ranked by how often they cost the user effort: (1) "where are we / what did the other sessions do" progress-state loss, (2) standing decisions, budgets and preferences that exist only in chat until the user says "remember this", (3) AI statements about state that were not backed by evidence (including "tested" claims), (4) git/branch/repo/worktree base confusion, (5) parallel sessions and a human teammate changing shared things (ports, browsers, Figma files, frontend) without each other knowing, (6) handoff and STATUS drift, (7) human-only to-dos (API keys, billing), (8) test/paid-run memory, (9) rules ignored. Plan/todo/test memory covers roughly (1), (6), (7), (8) and part of (2) and (3). Items (4), (5) and most of (2) and (3) are not covered by those three buckets.

### Cited Findings

Each category: frequency estimate, quoted examples, bucket. Bucket key: B1 = plan/progress state; B2 = to-do plus human-only reminders; B3 = test-run memory (including paid runs); OTHER.

**1. "Where are we?" progress-state loss and missing wrap-up. Bucket B1. Most frequent.**
- Frequency: about 25 recap requests in 18 sessions by regex (hand reading suggests more, about 30), plus about 8 requests to wrap up or tidy worktrees, plus the 38 compactions and 26 resume prompts above. Wrap-up was never reliably done: on 2026-11-04 the user found sessions without it.
- "跑到哪了？" (user, 2026-10-30, session `2f4b`); "幫我看一下目前跑到哪了" (2026-10-31, `5977`); "目前跑到哪裡啦" asked twice on 2026-11-02 (`71e9`); "想問一下我們這個計畫完成多少" (2026-11-02, `71e9`).
- "check我們從最開始的conversation到現在做了什麼事 完成了多少目標然後看一下其他Session在幹嘛" (2026-11-02, `3a0d`).
- "看一下從星期一到星期三我們做了什麼 ... 看一下每個都沒有Wrapping out" (2026-11-04, `3afa`). Earlier: "看他們的wrapping out 了吧" (2026-10-30, `2f4b`) and a request to list all worktrees, delete the finished ones and "還沒進行完的幫我全部做完wrapping out" (2026-10-30, `307d`).
- The AI itself cannot see other sessions: one AI summary said it used "git 紀錄、PR 和其他 session 留下的交接檔, 沒有讀其他 session 的對話內容, 所以有些地方只能寫「看不出來」" (2026-11-03, `93c5`). It had to message two other live sessions to ask what they did.
- Sources: `/Users/tommy/Library/Application Support/orca/claude-profiles/0b0de81f-3e35-4990-9317-8fe25a8288de/home/projects/-Users-tommy-orca-workspaces-BuildClub-*/<session>.jsonl`.

**2. Standing decisions, budgets and preferences live only in chat until the user says "remember". Bucket: partly B2/B3, mostly OTHER ("decision and constraint memory").**
- Frequency: 7 explicit "please record this locally / remember" requests in 7 sessions; each produced a memory file or doc line. Memory directory now holds 9 files, 6 of them are standing rules the user had to state: auto-commit and spend under US$1; Apify budget kept for demos; work in the teammate's repo; never merge to her main unasked; no mobile optimisation; English-only video content; fal US$10 balance and low spend.
- "你可以在本地端記錄嗎? 下次AI可以知道這件事" (2026-11-02, `6ea5`, Apify quota); "您可以在本地記住, 我們目前先不去搞手機段手機段優化" (2026-11-02, `71e9`); "fal我裡面放10美金然後今天不要花太多錢吧可以幫我記住嗎" (2026-11-03, `3159`); "你可以幫我記下來嗎" for the English-only video decision (2026-11-03, `93c5`).
- The user's own first instinct on day one: "我們在開始跑這些之前還要去寫任何文件嗎 例如local, plan, spec, prd 之類的讓AI可以更一致性" (2026-10-27, `ddd0`). The goal "AI consistency" was stated on 2026-10-27, before any of the later tooling.
- The decision *itself* can be superseded and the old docs stay: the English-only memory says earlier docs (P3b "Mandarin voice", A7 Mandarin timing) "predate this decision" (memory `buildclub-english-video-content.md`). Same for Gemini: memory says "don't use Gemini for now" after the user switched Gemini billing on, then 429s, within one day (2026-11-03, `3159`, `93c5`).
- Terminology drift: the user asked "他是誰啊 我怎麼不記得我有設定它Annie" (2026-11-03, `1674`). An AI persona test had misread who "Annie" (the agency approver) is; the finding "B2" was later withdrawn (`docs/STATUS.md` line 35). The UI "never says who Annie is".

**3. AI statements about state that were not backed by evidence. Bucket OTHER, adjacent to B3. Few cases but high impact.**
- Frequency: about 23 assistant self-corrections matched ("更正", "我說錯", "抱歉") in 15 sessions; roughly 6 were substantive state errors (list below). Retro section 4(b) lists 11 process errors; at least 3 are "claimed done / green without the check being real".
- A PR body said the model had been "已在 #38 用 fal 實測" when nobody had run it. The AI found this only because the user asked it to go and ask the other sessions: "A我記得我們今天已經跑了不是嗎 你看一下紀錄" then "去問他們付費測試的結果" (2026-11-03, `93c5`). Result: "很可能今天根本沒有人真的跑過付費測試 ... #40 那句說明可能不正確". (This is also the paid-test-memory problem B3, run in reverse: believing a paid test happened.)
- A claim about a demo: "建議保留 tofu 的釘選" followed by "要先更正我上一則回答：這個 demo 其實不能即時查" (2026-11-02, `4c94`, `isolated-backend.sh` sets dummy keys and budget 0).
- A research subagent read a stale old branch and concluded "後端是 Node"; the AI had to correct: "這是 agent 看錯了。它讀的是 blenny 這個舊分支" (2026-11-02, `3a0d`).
- Commit with red verify: `verify.sh | tail -5 && git commit` returned 0 because of `tail`, so verify was RED but committed; amended later (retro 4(b)5).
- A test that could not fail: `test_run_refuses_when_server_total_is_over_cap` was an empty test (retro 4(b)2); a scanner was bypassed rather than fixed (retro 4(b)4).
- Docs say one thing, code another: README and `.env.example` mention `FAL_KEY`/`GEMINI_API_KEY` zero times; spec still says `FRAME_IMAGE_PROVIDER=openai` (retro 4(b)8); the 2026-10-30 STATUS rows said the login email was still a placeholder after it had been set (AI on 2026-10-30: "我沒有動那幾行, 是在新加的那行註明它們已經過時", session `8916`).

**4. Git / branch / repo / worktree base confusion. Bucket OTHER. Frequency: about 8 distinct incidents, plus constant worktree clean-up.**
- A worker branched from the wrong base: "worker 從錯的版本開了分支 ... 那一版還沒有 Instagram 的程式 ... bin/verify.sh 也不在" (2026-10-27, `d198`).
- Local `fork/main` was stale, so a branch was cut from an old commit and pushed: "本地的 fork/main 是舊的, 所以分支一開始開在 eaf5550, 也推上去了" (2026-10-31, `3d8e`).
- The user did not know which repo they were on: "我剛才發現為什麼我跟我隊友是在不同的branch" (2026-11-02, `a1d8`); the AI explained it was two repos (an original repo and a fork), not two branches.
- Merge ordering and "done" ambiguity: after "PR #9做好" the AI merged 134 commits into the teammate's main; the user: "北七喔 你應該要先開branch再merch main 不是嗎 ... 我記得我設定檔已經有寫過這個問題了" (2026-11-02, `ee42`). This produced the memory `buildclub-never-merge-veralyn-main-unasked.md`, which states the AI "had promised to ask again first".
- Worktree pile-up: 36 registered now; at least three user-requested clean-ups (2026-10-30 `307d`, 2026-10-31 `b4b5`, 2026-11-04 `3afa`); the 2026-11-03 handoff-opening AI listed "目前有 33 個" (`0244`). Deleting `render/experiment` was blocked by a hook, so the AI could not clean it itself (handoff, "SDD workspace ... still on disk").

**5. Parallel sessions and a human teammate changing shared things. Bucket OTHER. Frequency: about 15 incidents across 10 sessions.**
- Teammate's frontend changes: user repeatedly asks the AI to diff what the teammate did: "隊友剛跟我說他有更新 你看一下隊友更新的什麼 他主要做frontend嗎?" (2026-11-03, `0337`); "我朋友說他把他的前端Push ... 按照他的前端為主再重新做這個影片" (2026-10-28, `b9f5`); "你確認一下它最新github 給front Design因為跟我們影片中的完全不一樣" (2026-10-28, `b9f5`); "請問這前端是teammember更新到最新的嗎?看一下Github" (2026-10-31, `5977`). About 7 such requests; the video was built on an out-of-date design more than once.
- Shared port collision: "拍到一半時, 另一個 session 也在 8871 開了 server, 把截圖 agent 的 server 換掉了" (2026-11-03, `a9c2`). The handoff now says "Ports: 8871/8872 only. Never use 8805, 8811, 8850, 8787 or 5195" and the retro notes Remotion's default port 3000 was already taken.
- Browser sprawl: "為什麼現在網站的browser怎麼看這麼多啊 可以關掉沒有在用的嗎?" (2026-10-31, `5977`); "我現在那個Chrome還是開很多". A workflow left 13 Chrome windows; memory `workflow-browser-tabs.md` written. Again 2026-11-03: "我現在有另外一個Session在跑 你看一下它有在操作那個Chrome嗎 如果沒有就幫我關掉" (`2d6d`).
- Duplicate artifacts: "哎呀 我覺得現在好像開太多figma 了 可以幫我刪掉 然後統一一個" (2026-11-02, `810c`); the AI then asked repeatedly which Figma file, "FigJam 我應該是沒有的啊你怎麼可以再問" and replied "抱歉, 不應該一直追問你" (2026-11-02, `810c`). A memory was added to say what "Figma" means (`buildclub-figma-link.md`, 2026-11-04).
- A shared-resource brief gap: a subagent searched X by default because "我交代時漏講 X 應該由你在 Grok 跑" (2026-11-02, `53be`).

**6. Handoff / STATUS drift. Bucket B1. Frequency: about 6 incidents; the handoff mechanism itself is heavily used (26 resume prompts).**
- The handoff was stale at the moment of reading: "新分頁是在交接檔寫入失敗時就開了, 我隨後重讀、寫進新版。新 session 開場時可能讀到的是舊版" (2026-11-03, `0244`).
- Handoff said two files were missing that already existed: "之前交接檔說缺這兩個檔案 (verify.sh, STATUS.md) 的問題已經不存在" (2026-11-02, `ee42`).
- Format-sensitive hook: the AI had to rewrite the handoff because "hook 只認 `## 下一步`" and it used English headings (2026-10-31, `3d8e`). A commit made after writing the handoff makes the next session treat the handoff as "possibly stale" (several AI messages: "之後如果在這個 session 再 commit, 交接檔會被當成可能過期").
- Rule re-transcription: the current handoff re-states the same constraints each time (no merge, no spend, ports 8871/8872, desktop only, don't read `.env`). Those are the standing rules of category 2, carried by copy-paste.
- STATUS.md is 36 KB; the retro says docs debt was "一路被停放" (parked) from P2 onwards.

**7. Human-only to-dos (API keys, billing, accounts). Bucket B2. Frequency: about 10 user messages in 6 sessions; about 28 AI messages in 12 sessions asking for or noting a missing key.**
- "我知道我那個11lab和那個Gemini API Key都還沒丟進去 如果想放一個提醒要做的事情您建議如何在Local端記住啊" (2026-11-04, `3afa`).
- "你跟我講一下哪些API Key需要我放進去 好 我現在要去申請去用" (2026-11-03, `3159`); "ELEVENLABS_API_KEY問一下哪些權現需要打開".
- AI side: "ElevenLabs API key。這台 mini 的環境裡沒有這把 key, key 檔有保護, 我不能自己讀" (2026-10-28, `b9f5`). Also repeated "Not verified: no real model has been called (no keys in .env ...)" in STATUS (lines 17, 48).
- Gemini billing confusion: user turned billing on and asked to retest ("Gemini billing 開好了, 測 Nano Banana" 2026-11-03 09:11), then asked at 09:16-09:17 "我之前明明可以產生影片 為什麼現在不行呢?" (Veo endpoint issue, not a key issue). Later the same day: "Gemini 先不用, 分鏡圖用 Seedream 就好".
- Multi-step human actions that a worker cannot do and that had to be tracked: "好，帳號建好跟我說", "demo 重置好了跟我說", "W8 合併好了跟我說", "網址好了跟我說" (2026-11-02, `500c`, `f6a5`); 2026-10-30 `add-user` commands pasted back and forth.

**8. Test-run and paid-run memory. Bucket B3. Frequency: about 12 messages in 8 sessions plus the cost episodes below.**
- User, explicitly asking for this on 2026-11-04: "你跑完在本地端做個紀錄這樣以後就知道不用再做跑了" and "我記得我昨天有做蠻多run test的 你先補一下" (`3afa`). The AI then built `docs/test-log.md` with a rule: do not re-run if the commit has not changed code the test covers.
- Old rule violated: "Never run yet (do not assume these work)" section in test-log shows many real-model paths were never exercised at all; STATUS repeats "Not verified: ..." in about 10 PR notes.
- Cost episodes: "我不想花太多錢在Apify測試上 我們兩天花五塊有點超乎我的預算" (2026-10-28, `2be5`); the AI's estimate for a fresh search was about US$0.30, actual US$0.68; "那天 14 次 TikTok run 實扣約 US$3.9" (same session). Quota question: "因為我看我現在好像免費快用完了 你可以看一下 ... 每月跟重置是哪時候" (2026-11-02, `6ea5`). AI also gave a wrong cap first (US$5 vs real US$10): "上限是 $10 而不是我之前說的 $5" (same session). "其實我在想你可以顯示demo嗎 ... 我不想每次都搜尋然後花錢" (2026-10-30, `8916`).
- Re-running because of environment, not memory: "關掉了，再跑一次 e2e" (2026-10-31, `6068`), "可以關掉，重跑截圖確認" (2026-10-27, `2900`). E2E scripts lived in a scratchpad and "之後無法原樣重跑" (retro 4(b)10).

**9. Rules or earlier instructions ignored or forgotten. Bucket OTHER. Frequency: low, about 4 clear cases (hand-read; regex found 6 candidates, 2 were false positives).**
- Branch-before-merge, above (`ee42`, 2026-11-02): the user thought it was written in the settings already.
- Spec detail lost: "請問這是最新的設計嗎? 我不是跟你說Canvan 左邊要顯示Button" (2026-11-03, `3159`). The same instruction was given the same morning to another session (`93c5`: "他應該要預設左邊有個畫布的Button可以點進去"); a PR (#37) then added it, but the user saw a build without it. I cannot tell from the transcript whether it was an old build or a lost instruction (see Gaps).
- A note was needed on a 8787 demo swap: "是什麼- 8787 什麼時候換, 等你決定。" (`2f4b`, 2026-10-30) - the user did not understand a deferred decision the AI was holding.
- Earlier rule not honored: "Do not edit in ~/Desktop/BuildClub" hook caught the AI after it had already changed files there (2026-10-27, `ddd0`, AI: "規則沒攔到").

**10. Tool/harness friction that also eats time. Bucket OTHER, low priority.**
- An "install hook" blocked a handoff write because the text mentioned an install command (2026-10-27, `6719`: "install hook 又誤判了一次").
- Voice-dictation: "FEMA", "Canvan", "Susationb" etc. mean Figma, Canvas, Session. The AI must carry these glossary mappings (`buildclub-figma-link.md` exists for one).

### Inferences
- From the whole history, the highest-volume pain is **not knowing what happened** (category 1) and **not trusting what the AI says happened** (category 3), not "forgetting to do the next task". The next-task part is already carried by handoff files and works (26 resume prompts, and the AI's openings do check git against the handoff).
- The three buckets proposed by the user are real but they are the *surface symptoms* of a smaller set of underlying records: (a) progress/plan (B1), (b) an obligations list for the human (B2), (c) a ledger of what ran, at what commit, at what cost (B3). Categories 2, 3, 4, 5 need other records: decisions with supersession; claim-to-evidence links; a registry of shared resources (ports, worktrees, branches, remotes, Figma files, browser windows, PRs); and an awareness feed of what other sessions and the teammate changed.
- Rough share of episodes that fit the three buckets (my hand-weighting, not a measurement): B1 about 35%, B2 about 8%, B3 about 12%, total about 55%. About 45% fall in "other": decisions/budgets about 15%, unverified claims about 8%, git/worktree about 8%, parallel/teammate/shared-resource about 12%, rules ignored about 2%. Any number here could be off by ±10 points.
- Two of the user's repeated actions are manual implementations of tools: asking "check what all the sessions did" (a cross-session recap) and asking "remember this locally" (a durable-decision store). A tool that replaces those two chores matters more than a better to-do list.

### Gaps
- No way to measure the user's actual frustration level: voice-dictated, mostly implicit. I did not read all 629 messages; I skimmed about 350 and regex-scanned the rest. Some recurring complaints may be missed.
- Assistant-side mining was regex-only on Chinese/English phrases; silent errors (AI did the wrong thing, user never noticed) cannot be found this way.
- Could not verify the "Canvas button" case (old build vs lost instruction) without reading tool results from three sessions.
- No Codex data and no sessions older than 2026-10-27 in these project dirs; so no evidence about Codex-to-Claude or cross-machine consistency, which the global rules mention as a goal.
- Did not read the other three BuildClub handoff files in full, the 24 KB plan files, or the sibling researcher notes in this folder.

---

## Q2. Are plan + to-do/human reminders + test-run memory enough, or should the tool search cover more?

### Takeaway
Not enough on their own. They address about half of the observed episodes. Recommended search scope adds: (1) a durable "decisions, constraints and budgets" record with supersession, (2) claim-vs-evidence checks on what the AI says is done or tested, (3) a registry of shared environment state (ports, worktrees, branches, remotes, browser windows, Figma files, PRs), (4) a cross-session and teammate activity feed ("what changed since I last looked"), (5) handoff freshness against git. Cost/quota tracking should be folded into the test-run ledger, not left as a side item.

### Cited Findings
- The user already hit the limit of the three-bucket idea and said so in the request itself: "我不知道我們只查完整plan to do list and test 進入這樣就夠嗎 ... 查一下這是我們目前常出現的問題嗎" (2026-11-04, `db68`). Answer to the user's follow-up questions in that message: "1. 我覺得是都有吧" (both plan/to-do and test), "2. Github Issues 團隊也有 可是目前應該是我自己有吧" (the problem is mostly personal, not team), "3. 沒有 我這個只是長期的困擾嘛 所以這關Demonight沒有差別" (long-term, not blocking the 2026-11-07 demo night).
- The things the user already built by hand to compensate (each is a candidate feature for a tool): `docs/todo.md` (human tasks; AI must read it at session start), `docs/test-log.md` (one row per run, commit, result, cost; rule "if same test passed at a commit and no code changed, do not run again"), `docs/STATUS.md` (plan and verification), `~/.claude/handoffs/BuildClub*.md` (5-section handoff), memory files (rules). Five separate stores, hand-synced.
- The AI's own wrap-up on 2026-11-03 said the information came from "git 紀錄、PR 和其他 session 留下的交接檔" and it could not read other sessions: a missing cross-session read path.
- Retro 4(c) names review-caught patterns that a "tested at commit X" ledger would not catch (money-path refunds, derived state not recomputed, empty tests). Those are code-quality issues, not consistency problems; do not expect a memory tool to fix them.

### Inferences
- Priority order for what a tool should cover, by evidence weight (my judgement):
  1. Progress and cross-session recap with automatic wrap-up (category 1; B1). Includes "what did every session and the teammate do since time T".
  2. Decision / constraint / budget ledger with "superseded by" links, injected at session start (category 2). Includes the money state: balances, quotas, caps, per-run price quotes (category 8 cost episodes).
  3. Evidence-linked claims: "tested X at commit Y with result Z, evidence path" and a check that PR text and AI summaries match the ledger (categories 3 and 8; B3). The PR "已在 #38 用 fal 實測" error is the model case.
  4. Shared-environment registry: ports in use and by whom, worktrees with merged/clean status, local remote freshness (`fork/main` stale), browser windows, Figma files (categories 4, 5).
  5. Human-only to-dos with blockers linked to tasks (B2). Needed, but the pain is smaller than 1-4 and `docs/todo.md` already works.
  6. Handoff freshness vs git, and "handoff written but commit happened after" (category 6).
- Because the problems cross worktrees and sessions, a tool that stores state in the repo only (like `docs/todo.md`) will miss ones that live outside it (ports, browser windows, `~/.claude/handoffs`, memory, remote branch freshness, other live sessions). Evidence: the stale `fork/main`, the port 8871 collision, the 13 Chrome windows.
- Most state loss happened at three points: session boundary (compaction/new session), parallel-session overlap, and human-teammate overlap. A candidate tool should be judged on those three moments.

### Gaps
- I cannot say which single category costs the most **time**; counts are of episodes, not minutes. The retro gives P1-P4 wall-clock (7h15m of commits) but no breakdown by problem type.
- The claim "personal problem, not team" is the user's statement; the history shows the teammate and the user did disagree on branch, repo and frontend ownership (category 5), which suggests a team element too. I did not resolve this.
- Not checked: how well the existing opening hook and the 5-section handoff actually work. In 26 resume sessions I saw the AI verify git against the handoff correctly in the ones I opened (`0244`, `ee42`), but I did not measure failures.

---

## Verdict (one paragraph, for the report writer)
Plan state, to-do/human reminders and test-run memory are the right first three buckets, and the user's own history supports them: they cover about half of what went wrong (recap and wrap-up loss, human-only keys and billing, and the "was this tested / how much did it cost" confusion). But about half of the evidence sits elsewhere: standing decisions and budgets that only exist after the user says "remember this" (7 times in 9 days), AI statements about state that were wrong or unverified (the fal "tested" claim, the demo "can search live" claim, the stale-branch research), git/branch/worktree base mistakes (wrong base, stale `fork/main`, 36 worktrees, merge-to-main ambiguity), and parallel sessions or a teammate changing shared things (ports, browser windows, Figma files, frontend). The tool search should therefore cover, in addition to the three: (a) decision/constraint/budget memory with supersession, (b) evidence-linked claims about what was run, (c) a shared-environment registry, (d) a cross-session and teammate "what changed" feed, and (e) handoff-vs-git freshness. Codex was not used on this project in the files available, so cross-tool handoff could not be evaluated.
