# OpenCode durable memory for todos and test runs, plus the BuildClub plain-file baseline

Notes written 2026-11-04. Repo state read: branch `chore/demo-integrate-main-1104` at 61462c7. "Verified" means I read the primary source (repo file at a tagged release, or the official docs page) in this session. "Unverified" means a third-party page or a single secondary source.

## Q1. What is the repo's current plain-file approach, and where does it hurt? (Part A)

### Takeaway
BuildClub keeps agent memory in four hand-written files: a long chronological `docs/STATUS.md`, a one-row-per-run `docs/test-log.md`, a checkbox `docs/todo.md`, and an out-of-repo five-section handoff at `~/.claude/handoffs/BuildClub.md`. It works because each file has a clear job and a stated read order, but the facts overlap between files, nothing is machine-checkable, and at least two entries already contradict git or each other.

### Cited Findings (all read directly from the files, 2026-11-04)
- `docs/STATUS.md` — 184 lines, 12 `##` sections, mostly newest-first by date ("Current (2026-11-04)", then 11-03, 11-02, then per-phase sections for 10-31 to 11-01), then "Next-day environment (port 8805)", "Known issues", "Next steps" at the bottom. Lines are very long (max about 1,567 characters; top "Current" paragraph is about 1,000 characters), so a single bullet packs several facts: branch, PR numbers, test counts, what is not verified. Line 3 says "Read first: `docs/todo.md` ... and `docs/test-log.md`" and states the skip rule. It is uncommitted (`M` in git status). Source: `/Users/tommy/orca/workspaces/BuildClub/canvas-p1/docs/STATUS.md`.
- `docs/test-log.md` — 31 lines. Header rules: "One row per test run, newest first. Never delete rows." and "if the same test already passed at a commit and `git log <sha>..HEAD` shows no change to the code it covers, do not run it again." Definitions: Mock = mock models, US$0; Paid = real provider with cost; isolated backends on ports 8871/8872 only. Table columns: `Date (AEDT) | Branch @ sha | What ran | Result | Cost | Evidence`. 13 rows (2026-11-02 to 2026-11-04). Ends with a "Never run yet (do not assume these work)" list: real image/video models, real Claude for the agent, ElevenLabs, real human speech and iPhone HEVC/HDR footage, live Apify search. Untracked in git. Source: `docs/test-log.md`.
- `docs/todo.md` — 24 lines, three sections: "Tommy needs to do" (4 items), "Before Demo Night (Sat 2026-11-07)" (7 items), "After the demo" (3 items). Convention: tick `[x]` with the date; "AI sessions: read this at the start; remind the user of any open item ... that blocks the current task." Non-code tasks only (keys, decisions). Untracked in git. Source: `docs/todo.md`.
- Handoff `~/.claude/handoffs/BuildClub.md` — 58 lines, written 2026-11-04 10:05 AEDT, five Chinese-headed sections (目標, 限制, 狀態, 下一步, 不要碰) exactly as the global CLAUDE.md prescribes. Has a baseline line "feat/canvas-polish-d-agent @ 5e4f117 (next session: `git log 5e4f117..HEAD` shows what changed since)". It carries hard constraints (no merge, no spend, ports 8871/8872 only, E2E needs a fresh backend each). It lives outside the repo, so it is private and not versioned with the code. Source: `/Users/tommy/.claude/handoffs/BuildClub.md`.
- Good conventions already present: a stated read order; "never delete rows"; an explicit "not verified" list; a sha plus date on most claims; a baseline sha in the handoff so the next session can run `git log <sha>..HEAD`; constraints and do-not-touch lists kept separate from state.
- Duplication: the same numbers (unit 466/466, pytest 969, polish-a 18/18, polish-b 76/76, polish-c 50/50, polish-d 54/54, verify GREEN) appear in STATUS.md "Current", test-log.md row 2 and the handoff "狀態". Open-PR facts (#46-#49, merge order, "do not merge") appear in all of STATUS.md, todo.md and the handoff.
- Contradiction 1 (within the files): `docs/todo.md` ticks `FAL_KEY` as "confirmed by the smoke test row in `docs/test-log.md`", but `docs/test-log.md` has no fal smoke-test row (the only "smoke" match is "render smokes" in a P3b row), and the same todo file still lists "fal smoke test (~US$0.25, cap US$1)" as an open item under Before Demo Night. Either the row was never written or the tick is wrong.
- Contradiction 2 (vs git): the handoff baseline is 5e4f117, while HEAD is 61462c7 ("merge: origin/main ... into the canvas polish stack"). The handoff's "下一步" is about running a redesign user test and does not mention PR #49 or Demo Night on 2026-11-07, which `docs/todo.md` and STATUS.md treat as the current focus. So the handoff is behind the other two files.
- Stale entries inside STATUS.md: "Next steps" at the bottom still says "User testing on the 8805 environment" and "Next: 2b plan after 2a merges", which date from 2026-10-31 and are long superseded (Phase 2 is merged). "Known issues" mixes open items with entries marked FIXED. The "Next-day environment (port 8805)" section holds a personal email and says the password was given in chat, and tells the reader to start a server on 8805, which the handoff lists as a port never to use. I did not copy the email here.
- Fuzzy keys in test-log: several rows have no full sha ("fix/canvas-ux-batch1-3" has none; "5e83abd"; "194a6dd → 62f97ee" is a range). The skip rule needs "the code it covers" to be unchanged, but no column records which paths a test covers, so an agent must judge this by hand each time. "Result" is free text.
- Agent re-check burden: before trusting any line an agent must run `git log`/`git status`, `gh pr view` for each of #46-#49, and re-run `bash bin/verify.sh`. The global CLAUDE.md already requires this for the handoff ("git wins").
- Durability gap: `docs/test-log.md` and `docs/todo.md` are untracked and `docs/STATUS.md` is modified, so none of the baseline reaches another machine until committed (the repo CLAUDE.md says do not commit unless asked).

### Inferences
- The biggest recurring cost is reconciliation, not storage: one fact (a PR's state, a test count) lives in three files and drifts. A structured single source for "test run at sha X, covered paths P, result R" plus derived views would remove most of it.
- A machine-readable test ledger (sha, command, paths covered, result, cost) would make the "skip if unchanged" rule enforceable with one `git diff --stat <sha>..HEAD -- <paths>` instead of human judgement. This is my inference; no tool I found does it for you.
- Todos split in two kinds: human-only items (keys, decisions; `docs/todo.md`) and agent working steps (the handoff's numbered next steps). Tools with a built-in todo list only cover the second kind.

### Gaps
- I did not read the middle of STATUS.md (lines about 12-165) line by line; the stale-entry findings come from the top block, the section headings and the bottom three sections.
- I did not run `gh pr view` to check PR states, so "PR #49 draft" is as written in the files, not re-verified.

## Q2. Does OpenCode have a built-in todo tool, and is it persisted across sessions?

### Takeaway
Yes: `todowrite`, which replaces the whole list on each call and is scoped to one session. In the 1.x line (verified at tag v1.19.5, 2026-10-28) the list is stored in a SQLite `todo` table keyed by `session_id`, so it survives restart but is not shared across sessions. In the 2.x line (verified at v2.2.5, 2026-10-30) the tool became opt-in (`experimental.todo`) and I found no todo table in the session SQL, so persistence there is unclear (inference below). There is no `todoread` tool in either tagged tree.

### Cited Findings
- The docs describe `todowrite` as "Creates and updates task lists to track progress during complex operations", enabled by default with permission `"todowrite": "allow"`, and disabled for the General subagent by default. The page mentions no `todoread` and does not say whether the list persists. — [OpenCode docs: Tools](https://opencode.ai/docs/tools/) (fetched 2026-11-04)
- The agents page says General is a subagent "with full tool access except `todowrite`". — [OpenCode docs: Agents](https://opencode.ai/docs/agents/) (2026-11-04)
- v1.19.5 source: `SessionTodo.update` runs one transaction that deletes all rows for the session then inserts the new items with a `position` index and publishes an update event; `get` selects by `session_id` ordered by `position`. — [packages/core/src/session/todo.ts @ v1.19.5](https://github.com/anomalyco/opencode/blob/v1.19.5/packages/core/src/session/todo.ts)
- v1.19.5 schema: table `todo` with columns `session_id` (foreign key to session, `onDelete: cascade`), `content`, `status`, `priority`, `position`, plus timestamps; primary key `(session_id, position)`. So todos are deleted when their session is deleted. — [packages/core/src/session/sql.ts @ v1.19.5](https://github.com/anomalyco/opencode/blob/v1.19.5/packages/core/src/session/sql.ts)
- The tool prompt text says "Create and update a todo list for the current session. The user sees it as your working plan ... Send the full list on every call; it replaces the previous one." Statuses: pending, in_progress, completed, cancelled. — [packages/core/src/tool/todowrite.txt @ dev](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/tool/todowrite.txt)
- At v2.2.5 the todo tool lives at `packages/core/src/tool/plugin/todo.ts` and is only added when `experimental.todo === true`; its `execute` returns the todos as output and metadata and does not call a database service. `packages/core/src/session/sql.ts` at v2.2.5 lists no `TodoTable`, and `packages/core/src/session/todo.ts` does not exist in that tree. — [todo.ts @ v2.2.5](https://github.com/anomalyco/opencode/blob/v2.2.5/packages/core/src/tool/plugin/todo.ts); [sql.ts @ v2.2.5](https://github.com/anomalyco/opencode/blob/v2.2.5/packages/core/src/session/sql.ts)
- Release notes v2.2.0 (2026-10-27): "Restored the Todo tool in desktop via opt-in" and "Show todowrite tasks above the composer"; v2.2.2 redesigned the active todo pill. — [Release v2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0), [v2.2.2](https://github.com/anomalyco/opencode/releases/tag/v2.2.2)
- Plugin events include `todo.updated`, so a plugin can react when the list changes. — [OpenCode docs: Plugins](https://opencode.ai/docs/plugins/) (2026-11-04)
- Repo facts: `anomalyco/opencode`, MIT, about 224k stars, pushed 2026-11-04 (GitHub API, 2026-11-04). Latest tags seen: v2.2.5 (2026-10-30) and v1.19.5 (2026-10-28).

### Inferences
- In 1.x the todo list is "durable per session, not across sessions". Resuming the same session (`opencode run --continue` or `--session`) would show the old list; a new session starts empty. This follows from the table keyed by `session_id`; I did not run it.
- In 2.x the list is probably only reconstructable from the tool-call part stored in the session message history, not from a dedicated table. This is inferred from the missing table and the output/metadata return. Unverified by running it.
- The docs page ("enabled by default") may describe 1.x behaviour while the 2.x line makes it opt-in; the docs and code disagree, so check which version the user runs.
- Either way a todo is a within-task plan for the model. It does not hold human-only items (keys, decisions) or test results.

### Gaps
- I could not confirm whether `todoread` ever existed in OpenCode; the string is absent from the v1.19.5 tree listing (0 matches) and from the docs. Other agents (not OpenCode) have it, per search results, so the user's memory of "todoread" may be from another tool or an older version.
- I did not install or run OpenCode, so I did not observe the `todo` table contents or the 2.x behaviour first-hand.

## Q3. Sessions, sharing, compaction, plan mode, AGENTS.md, commands, plugins

### Takeaway
OpenCode persists all sessions in a local SQLite database (history, resume, fork, export/import), compacts context automatically through a hidden agent, reads `AGENTS.md` and falls back to Claude Code's `CLAUDE.md`, has a restricted Plan agent, markdown custom commands that can inject shell output, and a plugin API with session/todo/tool events plus a hook that can add context at compaction. None of it provides a durable cross-session task or test ledger out of the box.

### Cited Findings
- Session persistence and CLI: `opencode run --continue/-c` resumes the last session, `--session/-s` a given ID, `--fork` forks; `opencode session list|delete`, `opencode export [id]` (JSON, `--sanitize`), `opencode import <file>`, `opencode stats`, `opencode db [query]` and `opencode db path`; DB path overridable with `OPENCODE_DB`; `OPENCODE_DISABLE_PRUNE` turns off pruning of old data. — [OpenCode docs: CLI](https://opencode.ai/docs/cli/) (2026-11-04)
- DB location: a search result states `~/.local/share/opencode/opencode.db`; an older JSON layout under `~/.local/share/opencode/storage` existed before the SQLite move. — [third-party schema page](https://nirvaxstiel.github.io/Tachikoma-Agent-Skills/internals/opencode-database.html) and [session viewer](https://github.com/WHYBBE/opencode-session-viewer) (secondary sources; the official CLI page confirms `opencode db path` exists but not the literal path)
- Compaction: config `compaction.auto` (default true, "Automatically compact the session when context is full"), `compaction.prune` (default false, removes old tool outputs), `compaction.reserved`. A hidden system agent does the compaction. Plugin event `session.compacted` and hook `experimental.session.compacting` exist. — [Config docs](https://opencode.ai/docs/config/), [Agents docs](https://opencode.ai/docs/agents/), [Plugins docs](https://opencode.ai/docs/plugins/) (2026-11-04)
- Plan mode: the Plan agent denies edits, writes and patches except Markdown plan files in `.opencode/plans/` (or `plans/` under the data directory); saving plan files requires `OPENCODE_EXPERIMENTAL_PLAN_MODE`; `bash` is not restricted. — [Agents docs](https://opencode.ai/docs/agents/)
- AGENTS.md and rules: project `AGENTS.md` searched upward from the cwd, global `~/.config/opencode/AGENTS.md`, `/init` creates one. Fallback: `CLAUDE.md` is used only if no `AGENTS.md` exists; `~/.claude/CLAUDE.md` is used only if the global OpenCode file is absent; `OPENCODE_DISABLE_CLAUDE_CODE=1` turns this off. The `instructions` config field accepts file paths, globs (example `.cursor/rules/*.md`) and URLs (5 s timeout). — [OpenCode docs: Rules](https://opencode.ai/docs/rules/)
- Skills: the `skill` tool loads a `SKILL.md`; env flag `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS` disables reading `.claude/skills`, which implies OpenCode reads Claude-format skills by default. — [Tools docs](https://opencode.ai/docs/tools/), [Rules docs](https://opencode.ai/docs/rules/)
- Custom commands: markdown files in `.opencode/commands/` or `~/.config/opencode/commands/`; frontmatter `description`, `agent`, `subtask`, `model`; `$ARGUMENTS`, `$1..`; !`cmd` injects shell output into the prompt; `@path` injects file contents. — [OpenCode docs: Commands](https://opencode.ai/docs/commands/)
- Plugins: loaded from `.opencode/plugins/`, `~/.config/opencode/plugins/` or the `plugin` array in `opencode.json`; hooks include `tool.execute.before/after`, `shell.env`, `experimental.session.compacting`, and a catch-all `event`; events include `session.created/idle/updated/compacted`, `todo.updated`, `file.edited`, `command.executed`. The page says nothing about plugin state storage. — [Plugins docs](https://opencode.ai/docs/plugins/)
- v2.2.0 (2026-10-27) added: "Plugins can now attach and update keyed session instructions with ctx.session.instructions.entry.put/list/remove ... The entries also survive compaction and reverts". — [Release v2.2.0](https://github.com/anomalyco/opencode/releases/tag/v2.2.0)
- MCP: custom tools and MCP servers extend the tool set. — [Tools docs](https://opencode.ai/docs/tools/)

### Inferences
- A plugin on `tool.execute.after` (filter on bash commands that look like test runs) could append rows to a file in the repo, and one on `experimental.session.compacting` could re-inject that file at compaction. The hooks exist; I found no published plugin that does this, so it is a design idea, not a fact.
- The keyed session-instructions API from v2.2.0 is the closest built-in primitive to "pinned state that survives compaction", but it is plugin-written and session-scoped as far as I can tell (unverified).

### Gaps
- Session sharing (`/share`, manual/auto/disabled): every docs URL I tried (`/docs/share/`, `/docs/share`, `/docs/sharing/`) returned 404, and the config page does not cover it. A repo tree listing shows `infra/share.ts` and `packages/core/src/share/sql.ts`, so a share feature exists in the code, but I could not read its behaviour. Unverified.
- Exact location and format of the 2.x DB were not checked in code.

## Q4. Any OpenCode feature or plugin for remembering test results or skipping passed tests, and any memory plugins?

### Takeaway
I found no OpenCode feature or plugin that records test results or skips already-passed tests; a targeted search returned nothing relevant. There is a healthy set of general memory plugins (conversation or fact memory), the most popular being Supermemory's, but they remember facts and context, not "test X passed at sha Y".

### Cited Findings
- Search "opencode plugin test results cache skip passing tests" returned only unrelated projects (Go test caching, a kernel test-runner). — WebSearch, 2026-11-04 (negative result, not proof of absence)
- [supermemoryai/opencode-supermemory](https://github.com/supermemoryai/opencode-supermemory) — about 1,654 stars, pushed 2026-11-02 (GitHub API); injects context and saves session summaries at compaction; needs a Supermemory account or key (per search summary; README not opened).
- [ApplauseLab/opencode-plugin-simple-memory](https://github.com/ApplauseLab/opencode-plugin-simple-memory) — about 148 stars, MIT, pushed 2026-09-22; daily logfmt files in `.opencode/memory/` with store/recall/update tools; local only (search summary).
- [plastic-labs/opencode-honcho](https://github.com/plastic-labs/opencode-honcho) — about 61 stars, MIT, pushed 2026-10-05; Honcho cloud or self-hosted, sessions scoped per directory, repo, branch or global (search summary).
- [csuwl/opencode-memory-plugin](https://github.com/csuwl/opencode-memory-plugin) — 12 stars, MIT, pushed 2026-03-11; daily logs, long-term memory files, local vector search via sqlite-vec.
- [jdormit/opencode-memsearch](https://github.com/jdormit/opencode-memsearch) — 2 stars, MIT, pushed 2026-10-15; stores each turn in a local vector DB.
- [kykiles/opencode-mem](https://github.com/kykiles/opencode-mem) — 0 stars, last push 2026-07-11; compresses tool-usage observations with AI.
- Star counts and push dates come from the GitHub API on 2026-11-04. Feature descriptions come from a single search summary, not from reading each README. Some READMEs reportedly note OpenCode does not auto-update plugins and the cached package must be cleared (search summary, unverified).

### Inferences
- Memory plugins (vector or summary) are a poor fit for the "skip passed tests" need: retrieval is fuzzy, but the rule needs exact (sha, test, covered paths) matches. The plain-file approach in the repo is stronger on that point than any plugin found.
- `opencode-plugin-simple-memory` (files in `.opencode/memory/`, human-readable) is the closest in spirit to the repo's plain files, but it holds free-form notes.

### Gaps
- I did not read the README of any plugin, so none of the descriptions above are first-hand. I did not look at awesome-opencode lists, so a test-result plugin could exist under another name.
- No data on plugin quality or on whether they work with OpenCode 2.x.

## Q5. Does OpenCode share formats with Claude Code or Codex that make cross-tool memory possible?

### Takeaway
Yes, at the instruction layer: `AGENTS.md` is read by OpenCode, Codex and Cursor, OpenCode also falls back to `CLAUDE.md` and `.claude/skills`, and MCP servers are supported by all of them. The session stores and todo/plan state are tool-specific and not interchangeable, so cross-tool memory has to live in plain files in the repo.

### Cited Findings
- OpenCode reads `AGENTS.md` first and `CLAUDE.md` as fallback, plus `~/.claude/CLAUDE.md` and `.claude/skills`, unless disabled by env flags. — [OpenCode Rules](https://opencode.ai/docs/rules/)
- Cursor: "Cursor supports AGENTS.md in the project root and subdirectories"; rule types are Project (`.cursor/rules`), User, Team and AGENTS.md. — [Cursor Rules docs](https://cursor.com/docs/context/rules) (2026-11-04)
- Codex: Memories are a recall layer, not a source of rules; the docs advise keeping required team guidance in `AGENTS.md` or checked-in docs. — [Codex Memories docs](https://learn.chatgpt.com/docs/customization/memories?surface=app) (redirected from developers.openai.com/codex/memories, 2026-11-04)
- OpenCode's `instructions` field can pull in other tools' rule files by glob (`.cursor/rules/*.md` is the docs' own example). — [OpenCode Rules](https://opencode.ai/docs/rules/)
- Session formats differ: OpenCode uses SQLite plus `opencode export` JSON; Codex stores rollouts as JSONL under `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` (multiple third-party sources). — [CLI docs](https://opencode.ai/docs/cli/); Codex path from [Verdent guide](https://www.verdent.ai/guides/codex-cli-resume-continue-save-chat) and others (unverified, secondary)

### Inferences
- The shared surface is "files the repo owns": `AGENTS.md`, skills, MCP config. A STATUS/test-log/todo set referenced from `AGENTS.md` is readable by all three tools with zero adapters; this is what the repo already does (the global rule says `AGENTS.md` carries the content and `CLAUDE.md` is a one-line import).
- Because OpenCode reads `~/.claude/CLAUDE.md` as a fallback, the user's global rules would be seen by OpenCode too, unless a `~/.config/opencode/AGENTS.md` exists (then the Claude file is ignored). Worth knowing before trying OpenCode.

### Gaps
- I did not verify MCP config compatibility between the tools (file locations and schema differ). Not researched.
- I did not check whether OpenCode can import Claude Code or Codex transcripts. No evidence found either way.

## Q6. Codex CLI and Cursor equivalents as of 2026

### Takeaway
Codex has `AGENTS.md`, an `update_plan` checklist that is reportedly now opt-in, JSONL session resume, and an opt-in local Memories feature that summarises past chats into `~/.codex/memories*`. Cursor relies on rules and `AGENTS.md`; its beta Memories (June 2025) were reportedly removed in late 2025, and I found no Cursor todo feature in the sources.

### Cited Findings
- Codex Memories: "Local Codex memories are off by default"; enable in Settings > Personalization or `[features] memories = true` in `config.toml`; stored under `$CODEX_HOME/memories_v2/` in a fresh home (or the older `memories/` if it exists); generated in the background from eligible prior chats, skipping active or short-lived sessions, with secrets redacted. The page carries no dates. — [Codex Memories docs](https://learn.chatgpt.com/docs/customization/memories?surface=app) (fetched 2026-11-04)
- Memory file names (MEMORY.md, memory_summary.md, raw_memories.md, rollout_summaries/) and an EEA/UK/Switzerland launch limit come from a vendor blog; the official page says nothing on regions. — [mem0 blog](https://mem0.ai/blog/how-memory-works-in-codex-cli) (secondary, unverified)
- Codex memory commits in the openai/codex repo dated late February 2026 (#12653, #12635, #12309), seen via a mirror. — mirror pages in WebSearch results (secondary)
- Codex `update_plan`: a third-party blog says a PR merged 2026-08-31 made it opt-in via `[tools.update_plan]` in `.codex/config.toml`, and that disabling it removes the TUI plan panel. — [codex.danielvaughan.com](https://codex.danielvaughan.com/2026/08/31/codex-cli-update-plan-tool-opt-in-external-planning-competing-surfaces/) (single secondary source, unverified)
- Codex session resume: `codex resume`, `--last`, `--all`; sessions as JSONL under `~/.codex/sessions/`. — [Verdent guide](https://www.verdent.ai/guides/codex-cli-resume-continue-save-chat), [inventivehq](https://inventivehq.com/knowledge-base/openai/how-to-resume-sessions) (secondary)
- Codex PLANS.md / ExecPlans pattern for multi-hour work is a community convention. — [codex.danielvaughan.com, 2026-05-30](https://codex.danielvaughan.com/2026/05/30/codex-cli-execplans-plans-md-multi-hour-autonomous-sessions/) (secondary)
- Cursor Memories: official docs page (docs.cursor.com/context/memories) describes them as auto-generated rules from Chat, beta introduced in Cursor 1.0 (2025-06-04). — [docs.cursor.com](https://docs.cursor.com/context/memories), [AlternativeTo](https://alternativeto.net/news/2025/6/cursor-1-0-adds-bugbot-code-reviews-project-memories--and-background-agent)
- A vendor blog says Cursor removed Memories in version 2.1 (November 2025) but users still saw old memories in January 2026. I could not confirm this on an official changelog. — [memoryplugin blog](https://blog.memoryplugin.com/cursor-memory/) (vendor, unverified)
- The current Cursor Rules page lists no Memories, todos or plans feature. — [Cursor Rules docs](https://cursor.com/docs/context/rules) (2026-11-04)
- Cursor 3 launched a new multi-agent interface on 2026-04-02 (single secondary source). — [youngju.dev guide](https://www.youngju.dev/blog/ai-platform/2026-04-12-cursor-practical-guide.en) (unverified)

### Inferences
- All three tools converge on two layers: a rules file the human maintains (AGENTS.md or equivalent) and an optional, automatic, summary-style memory that is off by default or beta. None of them offers a structured test-run ledger. Codex's own docs explicitly tell users not to put must-follow rules in memories, which supports keeping the baseline files as the source of truth.
- Auto memories (Codex, Cursor's former one, Supermemory) are summaries of chat, so they inherit the staleness problem in Q1 and add one the user cannot easily inspect.

### Gaps
- I did not find the official Codex changelog or GitHub release notes for `update_plan` or memories; those details rest on third-party pages.
- Cursor's official changelog was not retrieved, so the Memories removal date and any todo feature are unconfirmed. I searched once for Cursor todos and found nothing, which is weak evidence of absence.
- What the user "remembers OpenCode doing": the best candidates I verified are (1) the `todowrite` list stored per session in SQLite (1.x) and shown in the TUI/desktop todo pill, (2) session resume/fork/export, (3) the compaction agent, and (4) the Plan agent writing Markdown plans to `.opencode/plans/`. I found no OpenCode feature about remembering test runs, so that part of the memory is probably from a plugin, another tool, or the user's own files. Needs the user to confirm which.
