# Persistent task/todo tracking tools for AI coding agents (as of 2026-11-04)

Research date: 2026-11-04. GitHub star/release figures were pulled live via `gh api` on that date (primary source: the GitHub API for each repo). Items marked "(unverified)" came only from a search snippet or a third-party blog.

## Q1. What are the main options, how do they store data, and how mature/popular are they?

### Takeaway
Beads (`bd`), Backlog.md and Task Master are the three dedicated agent-task trackers. Beads is the most active but its storage changed from SQLite+JSONL to Dolt in 2026, so older write-ups are outdated. Backlog.md is the only one that is plain markdown-per-task in git. Task Master looks stalled since April 2026. Claude Code's native Tasks live in `~/.claude/tasks/`, not in the repo.

### Cited Findings

**Popularity snapshot (GitHub API, fetched 2026-11-04)**
- Beads (`steveyegge/beads`, now `gastownhall/beads`): 28,466 stars, created 2025-10-12, last push 2026-11-04, latest release v1.3.3 (2026-11-03), MIT, 1,609 open issues — [GitHub API](https://api.github.com/repos/steveyegge/beads); [releases](https://api.github.com/repos/steveyegge/beads/releases/latest); the repo URL resolves to `github.com/gastownhall/beads` per the API.
- Task Master (`eyaltoledano/claude-task-master`): 28,297 stars, created 2025-03-04, last push 2026-04-28, latest release `task-master-ai@0.43.1` on 2026-03-31, 215 open issues — [GitHub API](https://api.github.com/repos/eyaltoledano/claude-task-master); [releases](https://api.github.com/repos/eyaltoledano/claude-task-master/releases/latest).
- Backlog.md (`MrLesk/Backlog.md`): 7,271 stars, created 2025-06-04, last push 2026-10-29, latest release v1.55.3 (2026-10-23; v1.55.0 on 2026-10-20, so releases are near-daily), MIT, 86 open issues — [GitHub API](https://api.github.com/repos/MrLesk/Backlog.md); [releases](https://api.github.com/repos/MrLesk/Backlog.md/releases).
- Spec Kit (`github/spec-kit`): 146,700 stars, created 2025-08-21, release v1.3.0 (2026-11-03), MIT — [GitHub API](https://api.github.com/repos/github/spec-kit).
- OpenSpec (`Fission-AI/OpenSpec`): 73,835 stars, created 2025-08-05, release v1.16.0 (2026-10-30), MIT — [GitHub API](https://api.github.com/repos/Fission-AI/OpenSpec).
- Vibe Kanban (`BloopAI/vibe-kanban`): 28,582 stars, Apache-2.0, last GitHub "latest release" tag `v0.1.44-20260424091429` (2026-04-24) — [GitHub API](https://api.github.com/repos/BloopAI/vibe-kanban).

**Beads (`bd`)**
- Data model: "distributed graph issue tracker for AI coding agents, built on Dolt." Dolt is the database (version-controlled SQL, cell-level merge, branching, remotes). Default embedded mode keeps data in `.beads/embeddeddolt/` with a single writer; `bd init --server` uses an external `dolt sql-server` for multiple writers. `.beads/issues.jsonl` is "an export for viewers and interchange, not the source of truth." — [Beads README](https://github.com/steveyegge/beads)
- History: Beads and Gastown moved to Dolt as the only backend in early February 2026, replacing the SQLite+Git design. Solo users hit friction from the external server process and port config. Embedded Dolt became the default after ~120 commits of work; post dated 2026-04-02 — [DoltHub blog, 2026-04-02](https://www.dolthub.com/blog/2026-04-02-restoring-beads-classic/)
- v0.56.1 release notes list removal of JSONL plumbing, `bd sync` made a deprecated no-op, and removal of the embedded SQLite ephemeral store (as reported by a search summary) — [newreleases.io v0.56.1](https://newreleases.io/project/github/gastownhall/beads/release/v0.56.1) (unverified: not opened directly)
- Therefore the common 2025 description "SQLite cache + JSONL in git" is outdated; it is only partly right today (JSONL is export only). Contradicted: [search result summary of older blogs](https://divyavanmahajan.github.io/til/2026/01/beads-issue-tracker-for-agents) describing SQLite+JSONL; the current README says JSONL is not the source of truth.
- Dependencies/ready work: `bd dep add` creates blocking, related, parent-child links; `bd ready` lists tasks with no open blockers; hierarchical IDs like `bd-a3f8.1`; `bd update <id> --claim` atomically sets assignee and in-progress. Hash-based IDs avoid merge collisions — [Beads README](https://github.com/steveyegge/beads); [shiporskip review](https://shiporskip.io/compare/beads-bd-git-backed-task-graph-ai-agent-memory-2026-vs-beads-gastownhall-graph-issue-tracker-coding-agents-dolt-2026) (third party)
- Install: `brew install beads` or `npm install -g @beads/bd`, plus install script / `go install`; macOS, Linux, Windows, FreeBSD — [Beads README](https://github.com/steveyegge/beads)
- Known problems: 1,609 open issues; recent open bugs include CI red on main (issues #7457, #7458, #7218, Oct 2026), repeated no-op `schema: auto-migrate` commits on the Dolt backend (#4274, 2026-05-30), and a migration crash on drifted storage (#4380, 2026-06-12) — [GitHub issues](https://github.com/gastownhall/beads/issues). Roadmap for 1.4 is versioned beads/history, last updated 2026-10-05 — [ROADMAP.md](https://github.com/steveyegge/beads/blob/main/ROADMAP.md). Windows antivirus may flag the binary; HTTP backend is experimental — [README](https://github.com/steveyegge/beads).
- Reviewer criticism: Dolt is "a dependency most teams haven't heard of"; setup cost is the main objection (single third-party review site, not community) — [shiporskip.io](https://shiporskip.io/compare/beads-bd-git-backed-task-graph-ai-agent-memory-2026-vs-beads-gastownhall-graph-issue-tracker-coding-agents-dolt-2026)

**Task Master (`task-master-ai`)**
- Task fields in `tasks.json`: id, title, description, status (examples "pending", "done", "deferred"), dependencies, priority, details, testStrategy, subtasks — [docs/task-structure.md](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/task-structure.md). The README mentions a `.taskmaster/` directory for PRDs/templates; I did not find the exact `tasks.json` path stated in the README (see Gaps) — [README](https://github.com/eyaltoledano/claude-task-master)
- Workflow: `task-master parse-prd your-prd.txt` turns a PRD into tasks; `analyze-complexity` scores tasks 1-10 using AI — [README](https://github.com/eyaltoledano/claude-task-master); [task-structure.md](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/task-structure.md)
- Maintenance signal: latest release 2026-03-31; last commits 2026-04-21/23 are docs-link fixes; recent open issues/PRs (July-Oct 2026, e.g. #1733 "restore CLI fallback", #1725 "bare task-master crashes") are not shown as merged — [releases](https://api.github.com/repos/eyaltoledano/claude-task-master/releases), [commits](https://api.github.com/repos/eyaltoledano/claude-task-master/commits), [issues](https://github.com/eyaltoledano/claude-task-master/issues). The repo links to a hosted product (README links moved to `tryhamster.com/docs/taskmaster`, commit 2026-04-21), which suggests the maintainers' focus shifted (inference).
- License is ambiguous: GitHub reports NOASSERTION; the README says "MIT License with Commons Clause" (no selling/hosting); the LICENSE file header read "MIT License" — [README](https://github.com/eyaltoledano/claude-task-master); [LICENSE](https://raw.githubusercontent.com/eyaltoledano/claude-task-master/main/LICENSE)

**Backlog.md**
- Each task is a plain `.md` file in the repo, default folder `backlog/` (configurable `.backlog/` or custom), with `backlog.config.yml`; plus `drafts/`, `decisions/`, `milestones/`, `archive/`, `completed/` — [README](https://github.com/MrLesk/Backlog.md); [repo tree](https://github.com/MrLesk/Backlog.md/tree/main/backlog)
- Real frontmatter example (from the project's own tasks): `id`, `title`, `status: To Do`, `assignee: []`, `created_date`, `updated_date`, `labels`, `dependencies`, `priority`, then Description and Acceptance Criteria blocks — [sample task file](https://github.com/MrLesk/Backlog.md/blob/main/backlog/tasks/back-200%20-%20Add-Claude-Code-integration-with-workflow-commands-during-init.md)
- CLI: `backlog init`, `task create/edit/list/view/archive`, `board` (terminal Kanban), `board export`, `browser` (local web UI on 127.0.0.1), `search`, `mcp start`; `--json` on read commands — [README](https://github.com/MrLesk/Backlog.md)
- Local-first: "no server, no account, no telemetry"; remote git ops optional; cross-branch settings `checkActiveBranches`, `remoteOperations`, `activeBranchDays` — [README](https://github.com/MrLesk/Backlog.md)
- Install: `npm i -g backlog.md`, `bun add -g`, `brew install backlog-md`, or nix — [README](https://github.com/MrLesk/Backlog.md)

**Claude Code native tasks**
- The "task list" is Claude's to-do checklist. It fills only when the session has the task tools, available by default on Opus 4.7, Sonnet 4.6, Haiku 4.5 and earlier; on other models you need `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` — [Interactive mode docs](https://code.claude.com/docs/en/interactive-mode)
- Tools: `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate` (status, dependencies, details, delete). `TodoWrite` is disabled by default in favor of these; `CLAUDE_CODE_ENABLE_TASKS=0` re-enables it — [Tools reference](https://code.claude.com/docs/en/tools-reference.md)
- "Tasks persist across context compactions." To share a list across sessions, set `CLAUDE_CODE_TASK_LIST_ID` to a named directory in `~/.claude/tasks/`, e.g. `CLAUDE_CODE_TASK_LIST_ID=my-project claude` — [Interactive mode docs](https://code.claude.com/docs/en/interactive-mode)
- Introduced in v2.1.16 (2026-01-22) per a third-party FAQ — [claudelog](https://www.claudelog.com/faqs/what-are-tasks-in-claude-code/) (unverified against changelog)
- A third-party source says Beads inspired Claude Code Tasks — [morphllm.com](https://www.morphllm.com/beads-agent-memory) (title only; page returned HTTP 429 when fetched, so the claim is unverified)

**Spec-driven tools (planning, not human-aware trackers)**
- OpenSpec: `openspec/changes/<name>/` with `proposal.md`, `specs/`, `design.md`, `tasks.md` (numbered checklist marked complete during `/opsx:apply`); 30+ assistants; Codex uses `$openspec-*` commands; install via npm (Node 22.12+), brew or script — [OpenSpec README](https://github.com/Fission-AI/OpenSpec)
- Spec Kit: Python 3.11+ and uv (`uv tool install specify-cli`), SDD flow of specification, plan, tasks, implementation via `/speckit-tasks`; README does not say how tasks persist across sessions — [Spec Kit README](https://github.com/github/spec-kit)
- Vibe Kanban: Bloop shut down in April 2026 (announcement dated 2026-04-10); hosted kanban issues/comments/projects were removed after a 30-day window; open-source local use continues under community maintenance (a community release 0.1.45 is reported for September 2026 by a competitor-adjacent source) — [search summary citing vibekanban.com/blog/shutdown](https://vibekanban.com/blog/shutdown) (direct fetch failed with a TLS error; claim relies on search summaries, partly from competing products)

### Inferences
- Beads is the most capable and most active (28k stars, release the day before this research) but also the highest-churn: its storage layer was swapped in Feb 2026 and it still has a large issue backlog and red CI on main (inference from the issue list). For a 3-day demo, the risk is tooling friction rather than data loss.
- Backlog.md is the only option whose entire state is human-readable diffable markdown with no database (inference from its docs plus the sample file).
- Task Master's activity has dropped sharply since April 2026 (inference from release/commit dates).
- Spec Kit and OpenSpec are spec/plan workflows, not cross-session issue trackers; they complement rather than replace a tracker (inference).

### Gaps
- Exact on-disk format and file naming of Claude Code Tasks under `~/.claude/tasks/<id>/` was not found in official docs; only the directory is documented.
- Exact `tasks.json` path for current Task Master (likely `.taskmaster/tasks/tasks.json`) was not confirmed in the README text fetched.
- No independent Hacker News/Reddit threads on Beads/Backlog.md/Task Master were returned by search; real-world complaint evidence is thin and mostly from GitHub issues and one review site.
- Whether Vibe Kanban community maintenance is still active in Nov 2026 is unverified beyond search summaries.

## Q2. Which work with both Claude Code and Codex without per-tool glue (CLI + AGENTS.md is enough)?

### Takeaway
Agent instruction files are no longer the blocker: Claude Code reads `AGENTS.md` directly (v2.1.277+) when no `CLAUDE.md` exists, or via `@AGENTS.md` import, and Codex and OpenCode read `AGENTS.md`. Beads and Backlog.md are both plain CLIs that generate/instruct via `AGENTS.md`; Task Master is mainly MCP/editor-rule oriented; Claude native Tasks are Claude-only.

### Cited Findings
- Claude Code reads `AGENTS.md` as project instructions only if there is no `CLAUDE.md`/`CLAUDE.local.md` in the working directory or above; if both exist, it reads `CLAUDE.md` only unless `CLAUDE.md` imports `AGENTS.md`. Direct reading needs v2.1.277+ — [Claude Code memory docs](https://code.claude.com/docs/en/memory)
- Codex builds an instruction chain from `~/.codex/AGENTS.md` and `AGENTS.md` files from project root down; combined size limit `project_doc_max_bytes` defaults to 32 KiB — [Codex AGENTS.md guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- OpenCode reads `AGENTS.md` first and falls back to `CLAUDE.md`; `~/.claude/CLAUDE.md` is also read unless disabled — [OpenCode rules](https://opencode.ai/docs/rules/)
- Beads: `bd init` creates/updates `AGENTS.md` and installs Claude Code, Codex and Cursor integrations by default. `bd setup opencode` appends a section to `AGENTS.md`; `bd setup codex` installs `.agents/skills/beads/`, an `AGENTS.md` section and `.codex/` hooks; `bd setup claude` adds a SessionStart hook running `bd prime`. The docs say one `AGENTS.md` works across Factory Droid, Mux, OpenCode, Cursor, Zed, Jules — [Beads README](https://github.com/steveyegge/beads); [IDE setup doc](https://github.com/steveyegge/beads/blob/main/docs/getting-started/ide-setup.md)
- Beads' fallback for unsupported agents is a short `AGENTS.md` block telling the agent to run `bd prime`, use `bd ready`/`bd claim`/`bd close` and avoid markdown TODO lists — [Beads README](https://github.com/steveyegge/beads)
- Beads has an MCP package `beads-mcp` on PyPI, but the README gives few details — [Beads README](https://github.com/steveyegge/beads)
- Backlog.md: `backlog init` offers "CLI instructions (recommended)" that writes an instruction file telling agents to run `backlog instructions overview`; optional MCP auto-config for Claude Code, Codex, Gemini CLI, Kiro, Cursor. Manual MCP commands: `claude mcp add backlog --scope user -- backlog mcp start` and `codex mcp add backlog -- backlog mcp start`. OpenCode is not named in the README (works as "any other MCP or CLI compatible assistant") — [Backlog.md README](https://raw.githubusercontent.com/MrLesk/Backlog.md/main/README.md)
- Task Master: MCP server `npx -y task-master-ai`; Claude Code via `claude mcp add taskmaster-ai -- npx -y task-master-ai`; editors covered are Cursor, Windsurf, VS Code, Amazon Q CLI, Claude Code (Codex CLI support mentioned); `--rules` flag writes editor rule files; `TASK_MASTER_TOOLS` picks 36/15/7 tools — [Task Master README](https://github.com/eyaltoledano/claude-task-master)
- Claude native Tasks: stored in `~/.claude/tasks/`, i.e. the Claude profile, not shared with Codex — [Interactive mode docs](https://code.claude.com/docs/en/interactive-mode)
- Linear MCP: remote server `https://mcp.linear.app/mcp` (Streamable HTTP, OAuth 2.1). Claude Code: `claude mcp add --transport http linear-server https://mcp.linear.app/mcp` then `/mcp` to authenticate. Codex: `codex mcp add linear --url https://mcp.linear.app/mcp` (older docs required an `experimental_use_rmcp_client` flag; copies disagree) — [Linear MCP docs via search](https://linear.app/docs/mcp)
- GitHub: `gh` CLI needs no MCP setup and covers create/list/close issues; GitHub's hosted MCP server can be added to Claude Code over HTTP — [horadecodar.com.br comparison](https://horadecodar.com.br/claude-code-github-mcp/) (third-party Portuguese blog; Codex-specific comparison not found)

### Inferences
- "CLI + AGENTS.md" is sufficient for Beads, Backlog.md and `gh`-based GitHub Issues; Task Master and Linear need MCP registration on each tool (each person, each tool), so they carry per-tool glue.
- Given this user's global rules (project `CLAUDE.md` is an `@AGENTS.md` shim), a single `AGENTS.md` block would reach both Claude Code and Codex.

### Gaps
- I could not verify that Codex works reliably with the Beads Codex hooks in practice (docs claim support; no independent test found).
- No source found on OpenCode compatibility with Task Master.

## Q3. Which store data in git as plain text (survives machine/account switch) versus a server?

### Takeaway
Backlog.md is the clearest "plain text in git" tool. Beads stores data in a binary Dolt database in `.beads/` that syncs through a git remote (`refs/dolt/data`), with JSONL only as an export. Task Master's `tasks.json` is a plain file in the repo (under `.taskmaster/`). Claude native Tasks are local to `~/.claude/tasks/`. Linear and GitHub Issues are server-side.

### Cited Findings
- Backlog.md: Markdown per task inside the repo; works with git commits and branches; `--no-git` is possible but disables cross-branch checks — [README](https://github.com/MrLesk/Backlog.md)
- Beads: cross-machine sync uses `bd dolt push` / `bd dolt pull` against `refs/dolt/data` on a git remote. `bd init --stealth` keeps Beads local without committing to the main repo. `bd github sync` can sync with one GitHub repo. A JSONL export does not capture Dolt branches, full history, working-set state or non-issue tables — [Beads README](https://github.com/steveyegge/beads); [migration guide via search](https://leonletto.github.io/thrum/docs/guides/beads-migration-to-embedded.html)
- Beads docs also list sync integrations with GitHub, GitLab, Linear, Jira, Notion, ADO (CLI reference page names) — [Beads cli-reference](https://github.com/steveyegge/beads/tree/main/docs/cli-reference)
- Task Master: tasks live in a JSON file in the project (tags allow multiple contexts: `move --from-tag=backlog --to-tag=in-progress`) — [README](https://github.com/eyaltoledano/claude-task-master); [task-structure.md](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/task-structure.md)
- Claude native Tasks: `~/.claude/tasks/<CLAUDE_CODE_TASK_LIST_ID>/` on the local machine — [Interactive mode docs](https://code.claude.com/docs/en/interactive-mode)
- OpenSpec / Spec Kit: plain markdown files in the repo (`openspec/`, `.specify/`) — [OpenSpec README](https://github.com/Fission-AI/OpenSpec); [Spec Kit README](https://github.com/github/spec-kit)
- Linear Free plan: unlimited members, 250 issues, MCP access included — [Linear pricing](https://linear.app/pricing) (fetched 2026-11-04)

### Inferences
- Of the git-resident options, only Backlog.md, Task Master and OpenSpec/Spec Kit are readable with `cat` and reviewable in a normal PR diff. Beads' real source of truth is a Dolt database, so it needs the `bd` binary on each machine to read it (inference from README statements).
- A machine/account switch loses Claude native Tasks unless `~/.claude/tasks/` is copied; moving to another AI tool loses them entirely (inference).

### Gaps
- Not verified how large or noisy Beads' `.beads/` Dolt data is inside a normal git repo or how clean `git pull` works for a two-person team in practice.
- Whether Beads JSONL export is committed by default today was not confirmed.

## Q4. Setup time and risk for a solo dev + 1 teammate with a demo in 3 days

### Takeaway
Lowest risk: Backlog.md (one npm/brew install, no server, markdown) or just GitHub Issues via `gh` (nothing to install). Medium risk: Beads (one install, but a Dolt backend with churn and a big issue backlog). Higher risk or poor fit: Task Master (needs a model key or a CLI provider, stalled maintenance) and Vibe Kanban (company shut down).

### Cited Findings
- Beads: install is `brew install beads` or `npm install -g @beads/bd`, then `bd init`. For 2+ concurrent writers use `bd init --server` with an external `dolt sql-server`; embedded mode supports a single writer — [Beads README](https://github.com/steveyegge/beads)
- Beads roadmap says 1.4 priority areas are versioned beads and history, with features "behind a flag, off by default" — [ROADMAP.md](https://github.com/steveyegge/beads/blob/main/ROADMAP.md)
- Task Master needs at least one provider key (Anthropic, OpenAI, Google Gemini, Perplexity, xAI, OpenRouter) unless using Claude Code (`claude-code/opus`, `claude-code/sonnet`, no API key but the Claude Code CLI is required) or Codex CLI (OAuth via ChatGPT subscription) — [README](https://github.com/eyaltoledano/claude-task-master)
- Task Master's PRD-to-tasks step calls an LLM, so with API keys it is a paid call; with the CLI providers it uses subscription usage (inference from README statements).
- Backlog.md: install via npm/bun/brew, `backlog init`, web UI at `127.0.0.1` only (not reachable by the teammate); Apple Silicon Rosetta mismatch is a documented gotcha — [README](https://github.com/MrLesk/Backlog.md)
- Linear Free: 250-issue cap, unlimited members; requires OAuth login on each tool through MCP — [Linear pricing](https://linear.app/pricing); [Linear MCP docs](https://linear.app/docs/mcp)
- GitHub Issues via `gh` needs no extra install if `gh` is authenticated — [horadecodar.com.br](https://horadecodar.com.br/claude-code-github-mcp/) (third-party)

### Inferences
- With a 3-day demo, a tracker should cost under about 15 minutes to adopt; Backlog.md and `gh` meet that, Beads probably does for solo use but the two-person case may need the Dolt remote setup (inference).
- Beads' single-writer embedded default plus Dolt sync means a two-person team should expect to learn `bd dolt push/pull` (inference from README).

### Gaps
- No timing data for actual setup; estimates above are inferences.
- Did not test any tool (instructed not to install).

## Q5. How do they represent "blocked on human" / human-action items and reminders?

### Takeaway
Only Beads has first-class human handling: a `human` label with `bd human list/respond/dismiss`, and "human" gates that block workflow steps until a manual close. Everything else relies on a convention (label, assignee, status, or a dedicated issue). No tool found has real reminders that notify a person; Beads supports snooze-by-date for deferral.

### Cited Findings
- Beads `bd human`: "List human-needed beads (issues with 'human' label)", `human respond <id>` (adds comment and closes), `human dismiss <id>`, `human stats` — [bd human docs](https://github.com/steveyegge/beads/blob/main/docs/cli-reference/human.md)
- Beads gates: gate types `human` (requires manual `bd close`), `timer` (expires after timeout), `gh:run`, `gh:pr` (waits for PR merge), `bead` (waits for another bead); `bd gate list/check/resolve`. The doc labels the human type "Phase 1" and others later phases, so some may be incomplete — [bd gate docs](https://github.com/steveyegge/beads/blob/main/docs/cli-reference/gate.md)
- Beads defer: deferred issues are hidden from `bd ready` but visible in `bd list`; a defer with `--until` date is a snooze that returns to open automatically; without a date it is an indefinite icebox — [bd defer docs](https://github.com/steveyegge/beads/blob/main/docs/cli-reference/defer.md)
- Beads statuses: `open`, `in_progress`, `blocked`, `closed`; labels are free-form (e.g. `needs-review`, team ownership); assignee via `--claim` — [Beads labels doc](https://github.com/steveyegge/beads/blob/main/docs/core-concepts/labels.md)
- Backlog.md has `status`, `assignee`, `labels`, `dependencies`, `priority` in frontmatter, so a human item can be modeled as `assignee: tommy` or label `human` (no built-in "human" concept found) — [sample task](https://github.com/MrLesk/Backlog.md/blob/main/backlog/tasks/back-200%20-%20Add-Claude-Code-integration-with-workflow-commands-during-init.md); README did not document "blocked" or human tasks — [README](https://raw.githubusercontent.com/MrLesk/Backlog.md/main/README.md)
- Task Master statuses documented as "pending", "done", "deferred" plus dependencies; no human-task or assignee concept found in docs — [task-structure.md](https://github.com/eyaltoledano/claude-task-master/blob/main/docs/task-structure.md); the README fetch noted no mention of manual tasks.
- Claude native Tasks have status and dependencies (`TaskUpdate` handles "status, dependencies, details") but no assignee/label documented — [Tools reference](https://code.claude.com/docs/en/tools-reference.md)
- Linear and GitHub Issues natively provide assignee, labels, status and notifications to the assignee (general knowledge, not separately fetched; MCP access confirmed for Linear in [Linear pricing](https://linear.app/pricing))
- Claude Code has separate scheduled tasks/routines that run Claude on a schedule; this is not a human reminder — [Claude Code docs index](https://code.claude.com/docs/llms.txt)

### Inferences
- For "Tommy must add an API key" style items, a convention such as a `human` label (works natively in Beads, by convention in Backlog.md/GitHub/Linear) plus assignee is the practical path.
- Reminders to a person need a notifying system (GitHub/Linear notifications, calendar), which the repo-local trackers do not provide (inference; absence of evidence in the docs read).

### Gaps
- Did not verify whether Beads human gates actually notify a person or only show in `bd human list`.
- GitHub Issues/Projects and Linear label/assignee/notification behavior was not re-verified from official docs in this pass.
- No official source found on reminders in Task Master or Backlog.md.

## Q6. Team sharing for two people, and what an overall recommendation looks like

### Takeaway
For two people, git-native plain text (Backlog.md) or a server-backed shared tracker (GitHub Issues, Linear Free) shares most easily. Beads can be shared but via Dolt remotes and server mode. Claude native Tasks are per-machine unless the same task-list directory is shared.

### Cited Findings
- Backlog.md has no dedicated multi-user section; sharing is through normal git push/pull, with optional remote branch checks — [README](https://github.com/MrLesk/Backlog.md)
- Beads: Dolt remotes via git remote (`bd dolt push/pull`), server mode for multiple writers, `bd github sync` to mirror to one GitHub repo; the README suggests committing instruction files (`AGENTS.md`, `CLAUDE.md`) so all team members and tools get the same instructions — [Beads README](https://github.com/steveyegge/beads); [IDE setup doc](https://github.com/steveyegge/beads/blob/main/docs/getting-started/ide-setup.md)
- Task Master has a "Team Collaboration" docs link but no detail on the README page — [README](https://github.com/eyaltoledano/claude-task-master)
- Claude Tasks can be shared across sessions on one machine through a shared `CLAUDE_CODE_TASK_LIST_ID` directory — [Interactive mode docs](https://code.claude.com/docs/en/interactive-mode)
- A reported bug (resolved 2026-01-29) had task list IDs not inherited when moving from plan mode to execution in Claude Code 2.1.21 — [claudeissues.com #21807](https://claudeissues.com/issue/21807-bug-task-list-id-not-inherited-when-transitioning-from-plan-mode-to-execution) (third-party mirror; fix status unconfirmed)
- Linear Free: unlimited members, 250 issues, MCP included — [Linear pricing](https://linear.app/pricing)

### Inferences
- Candidate shortlist for the BuildClub demo (inference, not sourced fact): (1) GitHub Issues with `gh` plus a `human-action` label, zero setup; (2) Backlog.md if the team wants tasks reviewed in PR diffs and no server; (3) Beads only if the agent-dependency graph (`bd ready`) and first-class human gates are worth the Dolt learning curve.
- Avoid for the 3-day window: Task Master (stalled, key requirement, ambiguous license) and Vibe Kanban (company shut down).

### Gaps
- No evidence gathered on how two people with different AI accounts keep Claude native Tasks in sync; likely not supported.
- Beads two-person workflow friction is not documented by independent users in the sources found.
