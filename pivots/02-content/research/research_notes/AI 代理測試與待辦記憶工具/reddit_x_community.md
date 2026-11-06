# Reddit and X community opinion: keeping AI coding agents consistent across sessions (Nov 2025 to Nov 2026)

Method and limits (read first). Free routes only. No Apify, no paid API, no Grok. Reddit data came from search.rss and top.rss rank lists (rank order only, no scores), then Arctic Shift per-thread fetches for score and top comments. Scores are Arctic Shift snapshots and may lag live numbers. www.reddit.com .json returns 403 and WebFetch/WebSearch are blocked for reddit.com, so every Reddit link below is a permalink of the form reddit.com/comments/ID that I did not open in a browser. X data came from WebSearch restricted to x.com plus oEmbed verification of author, date and text. **No X engagement counts are available anywhere in these notes.** Reddit subs covered: r/ClaudeCode, r/ClaudeAI, r/ChatGPTCoding, r/cursor, r/opencodeCLI (Arctic Shift). r/ExperiencedDevs returned nothing relevant. r/LocalLLaMA and r/programming were not searched. Dates shown are RSS post dates (YYYY-MM-DD) unless marked "date not recorded".

## Q1. Which tools and patterns get the most community traction for persistent plans, specs and task lists?

### Takeaway
Plain markdown in the repo (CLAUDE.md/AGENTS.md plus a handoff, plan or backlog file) is the strongest consensus on both platforms, with Beads the most-discussed dedicated tool and Claude Code native Tasks the thing that partly absorbed it. Heavy spec frameworks (BMAD, Spec Kit, Kiro) draw "too much overhead" replies; lighter options (OpenSpec, Matt Pocock skills, Superpowers, GSD, Backlog.md) are recommended more often.

### Cited Findings
Ranked roughly by traction (Reddit score/comments, then X mentions).

**1. Plain markdown files plus lean CLAUDE.md/AGENTS.md (highest, both platforms)**
- "My workflow I start every project with", 231 score / 71 comments, 2026-10-10. Top comment (29): "an unreadable check isn't a pass" — [r/ClaudeCode 1x2os3k](https://www.reddit.com/comments/1x2os3k)
- Governance folder of markdown files, 59/45, 2026-03-11. Comment calls the handoff-file pattern "underrated" (6) and says an ADR folder helps — [1rqiv1q](https://www.reddit.com/comments/1rqiv1q)
- The OP of the 3-month inherited-repo story keeps only a few AGENTS.md files and a backlog; the previous engineer had 309k LOC with 240k lines of docs and 1M+ lines of md logs. Post 5248/548, 2026-05-12. Top comments are jokes, not about tooling — [1tb7edc](https://www.reddit.com/comments/1tb7edc)
- Poster whose OP says Backlog.md is "the one tool that survived" and is used daily, 6/6, 2026-04-05 — [1sdgwp4](https://www.reddit.com/comments/1sdgwp4)
- File-based "memory" directory with a "when to read what" routing table in root CLAUDE.md, 33/16 (date not recorded). Replies: "this is the basic structure Claude itself recommends" (4) — [1qpe6lh](https://www.reddit.com/comments/1qpe6lh)
- In a thread asking for a senior's full setup, 188/77, top comment (55): "I keep it simple. One Terminal, One Session. No MCPs", with a clear action plan written by the human; second (34) prefers `.claude/rules/` for things that apply every session — [1seq4lc](https://www.reddit.com/comments/1seq4lc)
- In the "Todo/task tools removed" thread (see below), a commenter (7) runs Projectplan.md (hot path, 3-5 sprints), Backlog.md and a project archive — [1vp7ix8](https://www.reddit.com/comments/1vp7ix8)
- X: Addy Osmani on AGENTS.md, 2026-02-24 — [post](https://x.com/addyosmani/status/2026172457233829922)
- X: omarsar0 summarising an AGENTS.md study (human-written +4%, LLM-generated -2%, 20%+ cost), 2026-02-26 — [post](https://x.com/omarsar0/status/2027025932339278029). The underlying paper is arXiv 2602.11988; per my reading generated files scored -0.5 and -2 points (not significant) and developer-written about +2.4% on average, so the viral "0.5%" figure is a misreading (my reading of the paper, not independently re-verified).
- X: Simon Willison says he stops creating CLAUDE.md files that contain only "@AGENTS.md", 2026-09-18 — [post](https://x.com/simonw/status/2101025043098812807)
- Reddit warning on the other side: "your AGENTS.md might be hurting you", 23/16, 2026-02-24 (r/opencodeCLI) — [1rdhsd0](https://www.reddit.com/comments/1rdhsd0)

**2. Beads (bd, Steve Yegge) — most-discussed dedicated tool, polarising**
- Positive: "Update: I tried beads for 3 weeks", 56/26, 2025-11-12; solved post-compaction amnesia and Claude files discovered work — [1ov1z94](https://www.reddit.com/comments/1ov1z94)
- Positive: "Beads + Claude Code reduced my compaction regression loop", 59/36, 2025-12-29. Comments: "complicated", "will be absorbed by Claude" (9 and 5), "Absolutely love Beads" (11) — [1pyxtad](https://www.reddit.com/comments/1pyxtad)
- Positive: Beads as a private work graph for about 100 parallel sessions, 48/30, 2026-09-11 — [1wdrgz0](https://www.reddit.com/comments/1wdrgz0)
- OpenSpec plus Beads used together, 21/12, 2026-01-01 — [1q182tf](https://www.reddit.com/comments/1q182tf)
- "Beads resources?", 8/11, 2025-12-18. A comment (6): "Beads IS NOT project management software"; another (3) tried task master and BMAD, then used Beads for 3 months — [1pq2hsp](https://www.reddit.com/comments/1pq2hsp)
- Gas Town honest take, 17/14, 2026-02-03: Beads "genuinely great", Gas Town not — [1qur3qq](https://www.reddit.com/comments/1qur3qq)
- Beads vs alternatives, 17/48 (r/ClaudeAI copy) and 19/26 (r/ClaudeCode copy). A comment says Beads replaces planning markdown but is not a full memory system — [1q7mp8m](https://www.reddit.com/comments/1q7mp8m), [1q7mqx8](https://www.reddit.com/comments/1q7mqx8)
- X: Joe Devon, 2025-11-27: "solves a massive Claude Code pain... context survive /compact" — [post](https://x.com/joedevon/status/1994085664560968021)
- X: Jeffrey Emanuel (doodlestein), 2025-11-27: types "beads" 500+ times a day — [post](https://x.com/doodlestein/status/1993911933272019175)
- X: Steve Yegge, 2026-06-28: "over 650k downloads" (self-reported, unverified) — [post](https://x.com/Steve_Yegge/status/2071281322988097710)
- X: Anurag Arjun, 2026-02-27: TodoWrite is tied to one session, tried Beads — [post](https://x.com/anuragarjun/status/2027386420785230151) (only the opening text verified; the "intrusive" detail is from search-result text)
- Beads Rust port (br): Emanuel 2026-01-18 [post](https://x.com/doodlestein/status/2012972038332260744), Yegge endorses 2026-01-18 [post](https://x.com/Steve_Yegge/status/2012974366188032144) (the "300K to 20K lines" figure is search-snippet text only, unverified)
- Hacker News, outside the stated scope: Show HN "I replaced Beads with a faster, simpler Markdown-based task tracker", 84 points / 51 comments, 2026-01-04 — [HN 46487580](https://news.ycombinator.com/item?id=46487580)

**3. Claude Code native Tasks (replaced TodoWrite, about 2026-01-23)**
- "Todos are now Tasks in CC (inspired by Beads)", 124/30, 2026-01-23. A comment (8): "Guess I'll just toss out my beads implem then?" — [1qkddvz](https://www.reddit.com/comments/1qkddvz)
- "Beads vs Plan Mode", 8/37. Advice (6): "Always tell Claude to use native Tasks" — [1qup2x7](https://www.reddit.com/comments/1qup2x7)
- X: Kaxil Naik, 2026-01-23 — [post](https://x.com/kaxil/status/2014518967088361700); Aakash Gupta, 2026-01-23 — [post](https://x.com/aakashgupta/status/2014726141643522208) (date decoded from the tweet ID); Thariq, 2026-02-27 — [post](https://x.com/trq212/status/2027463795355095314) (oEmbed shows only a link; the "replaced TodoWrite with the Task Tool" text is from search-result text)
- The `CLAUDE_CODE_TASK_LIST_ID` cross-session detail comes from search snippets only (unverified).
- Reversal: a changelog-quoting thread says task tools (TaskCreate/Get/Update/List, TodoWrite) are no longer available on Opus 4.8, Sonnet 5, Fable 5, Mythos 5 and newer from 2.1.233 (14 August) unless `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` is set; 41/18, 2026-08-15. Replies: scratchpad now covers it (10), tracking was raising token use (9, unverified), Beads is a decent alternative (7) — [1vp7ix8](https://www.reddit.com/comments/1vp7ix8). The changelog quote is the poster's; I did not fetch the changelog.

**4. Spec-driven frameworks (Spec Kit, OpenSpec, Kiro, BMAD, GSD, Superpowers, Matt Pocock skills)**
- SDD choice between SpecKit, OpenSpec, BMAD or none, 31/80, 2025-12-01. OpenSpec's maker commented (9). Comments favour SpecKit for normal features and call BMAD heavy — [1pba1ud](https://www.reddit.com/comments/1pba1ud)
- "Are spec frameworks still worth it?", 48/60, 2026-05-03. Top comment (28): Superpowers is verbose and slow; Matt Pocock's skills are better — [1t2mym5](https://www.reddit.com/comments/1t2mym5)
- "Spec Driven Development", 34/33, 2026-07-05. Top comment (38): "Superpowers. Easy as that." — [1uno1bs](https://www.reddit.com/comments/1uno1bs)
- SDD vs RPI (Research-Plan-Implement), 170/25, 2025-12-12. Comments: "RPI is part of SDD" — [1pkvque](https://www.reddit.com/comments/1pkvque)
- Spec tool cost measurement, 5/20, 2026-09-19. A commenter gives OpenSpec 4 setup actions / 13 tasks / 4m26s; Spec Kit 9 / 24 / 9m40s; BMAD no task list / 36m; Kiro 84 Allow clicks / 2h+. Commenter unknown, **numbers unverified** — [1wkktmh](https://www.reddit.com/comments/1wkktmh)
- GSD "Get Shit Done": 54 and 29 across two subs; comments describe other spec tools as "death by structure" for ADHD users — [1q4yi2u](https://www.reddit.com/comments/1q4yi2u), [1q4yjo0](https://www.reddit.com/comments/1q4yjo0)
- Table of 11 workflow systems, 124/31; top comment (17): "you don't need any of these" — [1sybpya](https://www.reddit.com/comments/1sybpya)
- X: Pragmatic Engineer quoting Dex Horthy, 2026-07-24 — [post](https://x.com/Pragmatic_Eng/status/2080658383384805729); Gergely Orosz, 2026-07-25: "hasn't stuck" — [post](https://x.com/GergelyOrosz/status/2080917955404062887); Dex Horthy "spec is the new code" critique, 2026-03-16 — [post](https://x.com/dexhorthy/status/2033392483674264044); YC OpenSpec launch, 2026-03-06 — [post](https://x.com/ycombinator/status/2030067562642616622); Augment Code on spec maintenance being invisible work, 2026-02-23 — [post](https://x.com/augmentcode/status/2025993446633492725)
- Hacker News, outside scope: OpenSpec 204 points / 100 comments, 2026-09-16 [item 49734264](https://news.ycombinator.com/item?id=49734264); Spec-kit toolkit 84 / 42, 2025-11-03 [item 45798473](https://news.ycombinator.com/item?id=45798473)

**5. Handoff docs, Ralph loop, Codex ExecPlans**
- Handoff file before the usage limit, 8/13, 2026-09-17 (r/opencodeCLI). The OP discloses a student survey / sponsored-line study. Top comments: Matt Pocock handoff skill (5); compact with a cheaper model (5) — [1wipw64](https://www.reddit.com/comments/1wipw64)
- Handoff question from a student researcher, 3/35, 2026-10-13. Replies: handoff docs; split into handoff plus log — [1x4x7dd](https://www.reddit.com/comments/1x4x7dd)
- "Where do md-as-memory files break down?", 13/31, 2026-08-03. Comments: context filling up (5); layered indexes needed — [1ve7sfn](https://www.reddit.com/comments/1ve7sfn)
- A "one question before closing every session" post (`/substantial`: list things worth saving, human picks), 51/27 (date shown by RSS as 2026-10-30). The post says one candidate in five was a correction to an existing note; the stats are the author's and unverified — [1xjfize](https://www.reddit.com/comments/1xjfize)
- Ralph loop: 18/16, 63/12 ("Ralph-Ban"), 8/0, 3/1 — [1qih0no](https://www.reddit.com/comments/1qih0no), [1rnqm85](https://www.reddit.com/comments/1rnqm85), [1qlt9dp](https://www.reddit.com/comments/1qlt9dp), [1qteuza](https://www.reddit.com/comments/1qteuza)
- X: commte /handover, 2026-02-16 — [post](https://x.com/commte/status/2023231375198028049); Alex Hillman auto-handoff hook, 2026-10-03 — [post](https://x.com/alexhillman/status/2106405507556606425); Matt Pocock on the Ralph plugin vs a bash loop, 2026-01-11 — [post](https://x.com/mattpocockuk/status/2010330604123144389)
- Codex PLANS.md/ExecPlans: seen only in a search summary, no verified post (unverified).

**6. Lighter trackers and boards**
- Beans (hmans/beans), 2 — [1phgw7y](https://www.reddit.com/comments/1phgw7y)
- Kanzo, a self-hosted kanban with MCP in one Rust binary (~5k lines), 58/29. Top comment (10): "We use a regular GitHub projects kanban board for this" — [1xgbwlg](https://www.reddit.com/comments/1xgbwlg)
- Linear CLI recommended (13) as a Beads alternative in the thread below — [1r6uhgw](https://www.reddit.com/comments/1r6uhgw)
- X: Linear local-agent sessions, 2026-02-27 — [post](https://x.com/karrisaarinen/status/2027081812208693688); a warning that the Linear MCP uses personal OAuth is from search-result summaries only (unverified).
- Backlog.md on X: hub-feature article about 2026-07-11 — [article](https://x.com/u1/article/2075866060788801910); earlier posts are from 2025-07 (outside window).

**7. OpenCode scale (small)**
- "TODO.md for OpenCode", 6/0, 2026-10-31 — [1xke8zs](https://www.reddit.com/comments/1xke8zs); todo-reminder plugin, 4/1, 2026-01-09 — [1q860i5](https://www.reddit.com/comments/1q860i5); "share your AGENTS.md", 36/17 — [1uivnqq](https://www.reddit.com/comments/1uivnqq)
- r/cursor: persistent architectural memory 71/34 — top comment (31) "So you invented agents.md?" — [1qqcq3j](https://www.reddit.com/comments/1qqcq3j); 172/27 — [1p61u2m](https://www.reddit.com/comments/1p61u2m); Claude Code to Cursor handoff 3/5 — [1stt6i0](https://www.reddit.com/comments/1stt6i0)

### Inferences
- Engagement ordering (my judgement, not a metric): markdown files plus lean instruction files > Beads and native Tasks > lightweight spec skills (Superpowers, Pocock, OpenSpec) > heavy spec frameworks > boards and trackers. Reddit scores are not comparable to X posts, which have no counts here.
- Native Tasks ate part of Beads' use case in January 2026, then Anthropic turned the task tools off by default for newer models in August 2026, which pushes people back to files or Beads. This reading rests on one poster's changelog quote.
- OpenCode has no dominant planning convention at this volume; discussion borrows Claude Code patterns.

### Gaps
- No X engagement counts (likes, reposts, views) were available on the free route; ranking on X is by number of independent posts found, not engagement.
- Task Master has almost no 2026 signal (see Q2); Basic Memory and mem0 had no organic Reddit traction in what I searched.
- r/LocalLLaMA and r/programming were not searched; r/ExperiencedDevs had nothing relevant.
- Codex ExecPlans/PLANS.md claim is unverified.
- Kiro "One Year of Kiro" article date could not be verified.

## Q2. What recurring complaints appear (stale or bloated memory, Beads complexity, Task Master overhead, spec overhead)?

### Takeaway
The dominant complaint is complexity fatigue ("too complicated", "drowning in markdown files"). For Beads: invasiveness, outdated docs and agents bypassing it. For memory plugins: cost, instability, security worries, and agents trusting stale memory over code. Task Master drew almost no 2026 discussion at all.

### Cited Findings
**Complexity fatigue (both platforms)**
- "We have successfully automated the process of making things complicated", 1189/204, 2026-10-05. Top comments: "only build what you need" (147); "I don't even bother with a claude.md" (113) — [1wxzlpg](https://www.reddit.com/comments/1wxzlpg)
- "My Claude Code setup... small engineering team", 713/168, 2026-10-21. Top comment (175): "there's gotta be a more reasonable medium"; another (59): "if I've corrected the same thing twice, it becomes a hook"; another (55): "Too complicated" — [1xbxoza](https://www.reddit.com/comments/1xbxoza)
- "Every Claude Code speedrun ends with another Markdown file", 660/25, 2026-08-23. Top comment (42): "I'm drowning in markdown files" — [1vw6iek](https://www.reddit.com/comments/1vw6iek)
- "Before you complain about Opus 4.5 being nerfed", 264/140, 2026-01-28. Top comment (29): the frameworks are a rabbit hole — [1qpd4ro](https://www.reddit.com/comments/1qpd4ro)
- "How do experts avoid slop", 186/143. Top comment (234): "they don't" — [1u7aiay](https://www.reddit.com/comments/1u7aiay)
- X: pvncher, 2026-01-03: "speed run building corporate software process for agents" — [post](https://x.com/pvncher/status/2007455437772243223)

**Beads-specific**
- "Am I an idiot for using Beads rather than PROJECT.md?", 22/46, 2026-02-17. Complaints: bd gives up and the agent falls back to git; the brew version is outdated; docs out of date; a second worktree is buried in the repo and breaks normal git workflows. Counter-comments: Linear CLI (13), Beans (4), "Beads is the only thing that changed session success to near 100%" (5) — [1r6uhgw](https://www.reddit.com/comments/1r6uhgw)
- Comment "Beads really has gone downhill for me, Gas Town was a disaster", 2 — [1qj6l75](https://www.reddit.com/comments/1qj6l75)
- A comment suggests having Claude write your own beads-like tool in hours, 2/11, 2026-06-06 — [1typh5u](https://www.reddit.com/comments/1typh5u)
- X: banteg, 2026-01-03, "how to uninstall the beads virus" — [post](https://x.com/banteg/status/2007512038067908768); Joe Devon, 2026-02-06, "bloat critique was not for nothing" — [post](https://x.com/joedevon/status/2019605631351812358); Armin Ronacher, 2026-04-15, "Why do people call Gas Town and Beads malware?" — [post](https://x.com/mitsuhiko/status/2044552793873134040); Dan Luu, 2026-09-15, relaying that Yegge never built anything with Gas Town — [post](https://x.com/danluu/status/2099800154639581353); Alex Hillman, 2026-01-23, "starting to build something like this to replace beads" — [post](https://x.com/alexhillman/status/2014492152676397537)
- steipete, 2026-01-05, "This hooks deeper than most malware" — [post](https://x.com/steipete/status/2008022000695210373). The referent is unclear, so I do not count it as being about Beads.
- Search-result text only, unverified: "agents shortcut bd and edit the jsonl directly", and a June 2026 reply "slows things down".

**Memory plugins (claude-mem, Serena, others)**
- claude-mem "#1 Trending on GitHub", 132/34, 2025-12-11. Top comment (19): "I commit every time... that's my memory" — [1pjqnnk](https://www.reddit.com/comments/1pjqnnk)
- claude-mem "45,000 stars", 162/30, 2026-04-05. Top comments: "How is this different than the default memory feature" (29); "My limits are burned even faster with Claude-mem" (19) — [1scz5kk](https://www.reddit.com/comments/1scz5kk)
- Kaspersky reportedly flagged claude-mem reading credentials via PowerShell, 92/17, 2026-09-13. Top comments attack Kaspersky (46); one says "You don't really need memory tools anyway... good claude MD file" (10). **The Kaspersky claim is unverified** — [1wf53cb](https://www.reddit.com/comments/1wf53cb)
- "Need an alternative... beyond unusable", 1/9, 2026-04-23: Windows breakage, issues closed; a comment advises a session summary in CLAUDE.md (2) — [1srdpn8](https://www.reddit.com/comments/1srdpn8)
- X: Behrooz Azarkhalili, 2026-01-08, "DON'T INSTALL IT YET" — [post](https://x.com/b_azarkhalili/status/2009319370884059231) (v9.0.0 bugs and API-key issue are snippet-only); Sumanth 12.9K stars, 2026-01-10 — [post](https://x.com/Sumanth_077/status/2009991847914156338); Aakash Gupta about 50K stars, 2026-04-13 — [post](https://x.com/aakashgupta/status/2043719893217128839) (star counts unverified)
- Session-start memory injection made the agent trust memory over code, 11/28, 2026-10-27 (r/ChatGPTCoding). Comments: stale memory, confirmation bias — [1xgqsts](https://www.reddit.com/comments/1xgqsts)
- Serena: PSA about the plugin in the official marketplace, 183/47, 2026-03-11. The post is AI-written and comments complain about its style; **claim unverified** — [1rqmb3u](https://www.reddit.com/comments/1rqmb3u). Benchmark of 5 token-saving tools: Serena scored -14.8% context reduction, 22/14, 2026-08-08; a comment likes its persistent memory — [1viyokr](https://www.reddit.com/comments/1viyokr)
- SQLite/FTS5 memory system, "you probably don't need a vector DB", 91/39, 2026-02-11; top comment (23) mocks it as vibe-coded — [1r1w397](https://www.reddit.com/comments/1r1w397)
- Benchmark of 10 memory systems on BEAM, 47/14, 2026-11-02; top comment (23) says the 115k context is microscopic (**benchmark unverified**) — [1xlo7l8](https://www.reddit.com/comments/1xlo7l8)
- Landscape of 77 memory systems, 13/7 — [1um7zau](https://www.reddit.com/comments/1um7zau)
- Built-in auto memory (about Feb 2026, MEMORY.md, first 200 lines loaded): X rollout posts [meng shao](https://x.com/shao__meng/status/2027193782211617173), [Gonnector](https://x.com/Gonnector/status/2027170127595356576); Rohan Paul on auto-dream, 2026-03-24 — [post](https://x.com/rohanpaul_ai/status/2036421602049663300). Version numbers vary across sources and are unverified.

**Task Master**
- Essentially absent from top-year r/ClaudeCode and r/ClaudeAI search results. Only mentions: a commenter who tried task master and BMAD then used Beads for 3 months (3) in [1pq2hsp](https://www.reddit.com/comments/1pq2hsp); a Repomix plus codebase-digest plus taskmaster post, 2025-12-14, not fetched — [1pm23q4](https://www.reddit.com/comments/1pm23q4); a novel-writing fork, 2025-11-27, not fetched — [1p7q4mq](https://www.reddit.com/comments/1p7q4mq).
- X: only a 2026-01-19 trending post (24.9k stars, snippet-only) — [post](https://x.com/ykxventures/status/2013042581920268661). No 2026 praise or criticism of its overhead found.

**Spec overhead and drift**
- See the Q1 spec thread comments (Superpowers verbose and slow, BMAD heavy, Kiro many Allow clicks, "death by structure"). X: Gergely Orosz "hasn't stuck" and Augment on invisible spec-maintenance work (links in Q1).

**Narrative handoff vs evidence**
- A comment on "narrative handoff vs machine-checkable evidence": an agent writes "verified edge cases" without running them, 15/25 (r/ChatGPTCoding) — [1w463pn](https://www.reddit.com/comments/1w463pn)
- Rules moved from CLAUDE.md into hooks, 9/6, 2026-07-25; notes an ast-grep rule that silently stopped scanning but still reported green — [1v6aum2](https://www.reddit.com/comments/1v6aum2)
- Managing parallel sessions, 34/100, 2026-08-12. Top comment (47): "ticket tracker, guardrails, quality gates" — [1vm8u30](https://www.reddit.com/comments/1vm8u30)

### Inferences
- Complaints are about the cost of the process layer (tokens, setup, files to maintain), not about the idea of cross-session memory. Positive Beads reports and negative ones come from the same threads, which suggests fit depends on project size and discipline.
- Task Master's near-absence is consistent with it having peaked before the window (its X posts are mostly 2025), but I did not measure that.
- Memory-plugin hype threads (claude-mem 132 and 162 score) coexist with comments saying built-in memory or a good CLAUDE.md suffices; the skeptical comments are often among the top-voted.

### Gaps
- Kaspersky/credentials claim, Serena PSA claim, BEAM benchmark, spec-tool timing numbers, GitHub star counts and Yegge's download count are all unverified.
- Several X complaint details (Beads agents editing jsonl, "slows things down") exist only in search-result text.
- No count of how many Beads users vs critics; engagement is only visible on Reddit.

## Q3. Which views appear on both Reddit and X (more trustworthy) and which on only one?

### Takeaway
Seven points show up independently on both platforms. Several others are single-platform, so they are "worth trying", not consensus. X has no engagement numbers, so "both" here means an independent post was found on each, not equal weight.

### Cited Findings
Cross-platform agreement table (Reddit evidence / X evidence).

| View | Reddit | X | Platform status |
| --- | --- | --- | --- |
| Beads helps with compaction and cross-session memory | [1ov1z94](https://www.reddit.com/comments/1ov1z94) 56/26, 2025-11-12; [1pyxtad](https://www.reddit.com/comments/1pyxtad) 59/36, 2025-12-29 | [Joe Devon](https://x.com/joedevon/status/1994085664560968021), 2025-11-27; [Emanuel](https://x.com/doodlestein/status/1993911933272019175), 2025-11-27 | Both |
| Beads is heavy or invasive, lighter forks preferred | [1r6uhgw](https://www.reddit.com/comments/1r6uhgw) 22/46, 2026-02-17; [1phgw7y](https://www.reddit.com/comments/1phgw7y) (Beans) | [banteg](https://x.com/banteg/status/2007512038067908768) 2026-01-03; [Joe Devon](https://x.com/joedevon/status/2019605631351812358) 2026-02-06; br port [Emanuel](https://x.com/doodlestein/status/2012972038332260744) | Both |
| Claude Code native Tasks replaced TodoWrite and overlap Beads | [1qkddvz](https://www.reddit.com/comments/1qkddvz) 124/30, 2026-01-23 | [Kaxil](https://x.com/kaxil/status/2014518967088361700), [Aakash Gupta](https://x.com/aakashgupta/status/2014726141643522208), 2026-01-23 | Both |
| Plain markdown (CLAUDE.md/AGENTS.md, handoff, plan/backlog) beats heavy tooling; keep it lean | [1x2os3k](https://www.reddit.com/comments/1x2os3k) 231/71; [1wxzlpg](https://www.reddit.com/comments/1wxzlpg) 1189/204; [1rqiv1q](https://www.reddit.com/comments/1rqiv1q) | [Osmani](https://x.com/addyosmani/status/2026172457233829922); [omarsar0](https://x.com/omarsar0/status/2027025932339278029); [Willison](https://x.com/simonw/status/2101025043098812807) | Both |
| Heavy spec-driven frameworks are overhead; spec drift is a problem | [1t2mym5](https://www.reddit.com/comments/1t2mym5) 48/60; [1uno1bs](https://www.reddit.com/comments/1uno1bs) 34/33 | [Orosz](https://x.com/GergelyOrosz/status/2080917955404062887); [Augment](https://x.com/augmentcode/status/2025993446633492725); [Horthy](https://x.com/dexhorthy/status/2033392483674264044) | Both |
| claude-mem: big hype plus stability, cost and security complaints | [1scz5kk](https://www.reddit.com/comments/1scz5kk) 162/30; [1wf53cb](https://www.reddit.com/comments/1wf53cb) 92/17 (claim unverified) | [Azarkhalili](https://x.com/b_azarkhalili/status/2009319370884059231) 2026-01-08; [Sumanth](https://x.com/Sumanth_077/status/2009991847914156338) | Both |
| Handoff files or commands help across sessions | [1wipw64](https://www.reddit.com/comments/1wipw64); [1rqiv1q](https://www.reddit.com/comments/1rqiv1q) | [commte](https://x.com/commte/status/2023231375198028049); [Hillman](https://x.com/alexhillman/status/2106405507556606425) | Both |
| Hooks beat prose rules for enforcement | [1v6aum2](https://www.reddit.com/comments/1v6aum2); comment (59) in [1xbxoza](https://www.reddit.com/comments/1xbxoza) | Stop-hook guide, [sairahul1](https://x.com/sairahul1/status/2054820977226457301), 2026-05-14 | Both (weak on X) |

**Reddit only (worth trying, not cross-confirmed)**
- Memory injection at session start makes the agent trust memory over code — [1xgqsts](https://www.reddit.com/comments/1xgqsts)
- Matt Pocock skills and Superpowers favoured over BMAD/Spec Kit — [1t2mym5](https://www.reddit.com/comments/1t2mym5), [1uno1bs](https://www.reddit.com/comments/1uno1bs)
- GSD for ADHD users — [1q4yi2u](https://www.reddit.com/comments/1q4yi2u)
- Linear CLI instead of Linear MCP for context cost — comment in [1r6uhgw](https://www.reddit.com/comments/1r6uhgw)
- Serena PSA (unverified) — [1rqmb3u](https://www.reddit.com/comments/1rqmb3u)
- OpenCode memory plugins (deja 39/16, 2026-07-22 [1v3er46](https://www.reddit.com/comments/1v3er46); "how do you solve memory?" 11/29, 2026-07-03 [1um84nw](https://www.reddit.com/comments/1um84nw), comments mention forks with /dream and /distill, magic-context, hindsight)
- `just`/justfile as a command registry for agents, 61/21 (date not recorded) — [1pnfwtq](https://www.reddit.com/comments/1pnfwtq)

**X only (worth trying, not cross-confirmed)**
- Yegge controversy (Dan Luu, Arnav Gupta [post](https://x.com/championswimmer/status/2044061203400409539), 2026-04-14, anti-Yegge with crypto promotion)
- Codex PLANS.md/ExecPlans (unverified)
- Ralph guidance from Matt Pocock (link in Q1)
- OpenCode memory on X: Honcho 2026-04-24 [post](https://x.com/honchodotdev/status/2047674671827738955); Engram 2026-02-16 [post](https://x.com/G_Programming/status/2023452982725976269); ai-memory 2026-10-19 [post](https://x.com/alex_verem/status/2112197339066863872); Supermemory (late Dec 2025 and 2026-06-17, no verified link)
- agentmemory recommendation, Rohit Ghumare, 2026-04-13 — [post](https://x.com/ghumare64/status/2043822278480158994)

### Inferences
- Cross-platform items are mostly "lightweight beats heavy" and "files in the repo are the memory". Single-platform items are mostly specific products.
- Because X has no counts here, a "Both" label with a high Reddit score and one X post is weaker than the table suggests.

### Gaps
- X posts verified with oEmbed show author, date and text only; likes, reposts and views are unavailable. Counts in this file are Reddit only.
- Contradictions inside "Both" rows were not systematically tested; the Beads rows show one product with both praise and criticism on each platform.

## Q4. What do developers use for test-run history (so agents don't re-run passed tests) and for reminders of human-only steps?

### Takeaway
I found no dedicated, popular tool or pattern for either on Reddit or X. The nearest signals are "evidence over narrative" comments about untrustworthy agent test claims, hooks and Stop-hook gates, and one Reddit plugin that sets reminders for the user's own forgotten threads.

### Cited Findings
**Test-run history and verification**
- No Reddit thread with traction on recording test results across sessions. Closest signals:
  - "an unreadable check isn't a pass" (top comment, 29) — [1x2os3k](https://www.reddit.com/comments/1x2os3k)
  - A silently-green scanner (ast-grep rule stopped scanning but reported green) — [1v6aum2](https://www.reddit.com/comments/1v6aum2)
  - "narrative handoff vs machine-checkable evidence", agent claims "verified edge cases" without running them — [1w463pn](https://www.reddit.com/comments/1w463pn)
  - "Opus 4.8 read the same file 156 times", 30/21 — a file re-read, not a test re-run — [1tr5xt3](https://www.reddit.com/comments/1tr5xt3)
  - 97 days of autonomous agents with 5,109 quality checks, 60/32: omissions (forgetting or `// TODO` stubs) were half of all issues; four review gates; the author's own figures, unverified. Top comments (16, 14): planning stage first, Codex omits less (comment's view) — [1rkt6k6](https://www.reddit.com/comments/1rkt6k6)
  - `just` as a deterministic command layer so the agent runs exact commands instead of guessing, 61/21 — [1pnfwtq](https://www.reddit.com/comments/1pnfwtq)
- X:
  - Stop-hook guides, sairahul1, 2026-05-14 — [post](https://x.com/sairahul1/status/2054820977226457301)
  - ShengHui Wang test-gaming benchmark, 2026-09-24 — [post](https://x.com/KevinShengHui/status/2103132319183990952). The numbers (Claude Code 0/12, Codex 8/12 and 10/12) are snippet-only and unverified.
  - Tanay Mehta, 2026-10-20: the agent re-learns the project each session — [post](https://x.com/serious_mehta/status/2112476763339001919)
  - Eric Zakariasson, 2026-03-02: feature-flag red/green trick — [post](https://x.com/ericzakariasson/status/2028528842491727951)

**Reminders for human-only steps**
- Closest match: "claude-adhd" plugin that surfaces forgotten threads and sets reminders, 101/48, 2026-09-05. It targets the user's own forgetfulness, not human-only steps in an agent workflow — [1w7tb2v](https://www.reddit.com/comments/1w7tb2v)
- OpenCode todo-reminder plugin, 4/1, 2026-01-09 — [1q860i5](https://www.reddit.com/comments/1q860i5). Kanzo shared board lets the human and agents share cards, 58/29 — [1xgbwlg](https://www.reddit.com/comments/1xgbwlg)
- A closing-ritual post (`/substantial`, human picks what to save), 51/27 — [1xjfize](https://www.reddit.com/comments/1xjfize)
- X: no convention found; only generic "escalation triggers / approval gates / definition of done" advice (not cited individually).

### Inferences
- The community answers "agent says it tested" with hooks and gates, not with a test-history store. A per-session run log with commit SHA and result would be a gap in the market per this evidence, but absence on free routes is not proof of absence.
- Human-only steps most likely live inside ordinary tracker items (GitHub Issues, Linear, kanban) rather than a named pattern; this is my inference, not a cited practice.

### Gaps
- Searches for test-log or "don't re-run tests" tools may have missed niche posts because r/LocalLLaMA, r/programming were not searched and the RSS search is noisy for OR queries.
- Second batch of RSS searches (cursor and ChatGPTCoding queries on "task master" and "remind me / manual steps") returned mostly noise; I did not rely on them.
- ShengHui Wang's benchmark numbers and the 97-day harness figures are unverified.

## Q5. How reliable is this evidence?

### Takeaway
Reddit scores and comment counts are real snapshots but many top posts are AI-written, promotional or survey bait, and many highest-scoring comments dispute the post. X has no counts. Treat every star count, download count and benchmark here as unverified.

### Cited Findings
- AI-written or style-disputed: Serena PSA ([1rqmb3u](https://www.reddit.com/comments/1rqmb3u)); SQLite memory system mocked as vibe-coded ([1r1w397](https://www.reddit.com/comments/1r1w397)).
- Survey or research bait disguised as discussion: handoff posts from a student researcher and a disclosed sponsored-line study ([1x4x7dd](https://www.reddit.com/comments/1x4x7dd), [1wipw64](https://www.reddit.com/comments/1wipw64)). The `/substantial` post says it is posted on behalf of a friend whose account is too new ([1xjfize](https://www.reddit.com/comments/1xjfize)).
- Top comment debunks: "How is this different than the default memory feature" (29) under claude-mem's 45,000-star post ([1scz5kk](https://www.reddit.com/comments/1scz5kk)); "they don't" (234) under the slop thread ([1u7aiay](https://www.reddit.com/comments/1u7aiay)).
- Cross-copy of the same post across subs gives different scores (Beads vs alternatives 17/48 vs 19/26; GSD 54 vs 29), so a score is subreddit-specific.
- Skipped steps: no Apify, no Grok prompt, no logged-in browser. r/LocalLLaMA and r/programming were not searched.

### Inferences
- A view with a high Reddit score and a skeptical top comment should be read as contested, not endorsed.

### Gaps
- Live (post-snapshot) Reddit scores were not rechecked. X likes are not available. Date for several Reddit items came from RSS and Arctic Shift and was not cross-checked against the live page.
