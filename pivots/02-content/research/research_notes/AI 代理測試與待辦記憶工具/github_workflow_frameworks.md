# AI coding agent workflow framework / harness / multi-session coordination (open-source GitHub landscape, Nov 2026)

Snapshot date: **2026-11-04** (AEDT). Every star count, push date, license, release and open-issue number below was fetched this run with `gh search repos` / `gh api repos/<owner>/<repo>` (GitHub API, free). README claims were read from `gh api repos/<owner>/<repo>/readme` the same day. "Stars" are as reported by GitHub; see star-signal caveats at the end of Q1. Where I infer which of the 8 problems a tool addresses, that is my reading of its README (labelled Inference), not something the maintainers claim or I tested. I installed and ran nothing.

Problem key used throughout: (1) progress/plan loss, (2) standing decisions/budgets, (3) unverified "tested/done" claims, (4) git/worktree/branch mistakes, (5) parallel sessions and teammate changes, (6) handoff drift, (7) human-only todos/reminders, (8) test-run + cost memory with skip-if-passed.

Commands run (for coverage): `gh search repos` with the keyword variants "agent harness", "context engineering claude code", "spec-driven development", "claude code workflow", "session handoff claude", "session continuity agent" (0 hits), "multi-agent git worktree", "parallel agents worktree", "agent orchestration claude code", "AGENTS.md tooling", "agent verification evidence", "decision log agent", "agent ledger", "agent evidence verify", "agent claim files", "claude code multi session"; topic searches `--topic` for claude-code-workflow, ai-coding-agents, agent-orchestration, git-worktree, agents-md, context-engineering, session-handoff, agent-harness, coding-agent, spec-driven-development; named searches for ~35 known candidates; `gh api` metadata for ~45 repos; README reads for ~30. Seven gap-hunting queries on "test ledger / skip if passed / stop hook verify / human todo reminders" returned zero repos (see Q3 gaps). I did not run the OSS Insight collections sweep or an awesome-list README harvest (beyond noting `andyrewlee/awesome-agent-orchestrators` and `ai-boost/awesome-harness-engineering` exist), so the long tail of small repos is under-covered.

---

## Q1. Which popular, active open-source projects exist in this category, and how do they compare (stars, activity, license, agents supported)?

### Takeaway
The space has three well-separated layers, each with huge star counts: (A) methodology/skill frameworks that impose a ritual (Superpowers, Spec Kit, OpenSpec, BMAD, GSD Core, planning-with-files, Trellis); (B) worktree/session managers that run many agents at once (Worktrunk, Claude Squad, Vibe Kanban, Herdr, Emdash, Agent of Empires, Crystal); (C) state/coordination substrates (Beads, Gas Town, MCP Agent Mail, claude-mem, OpenRig). Almost everything now claims to support Claude Code + Codex + OpenCode; the differentiator is where state lives and whether anything is actually enforced rather than prompted.

### Cited Findings

**Layer A: methodology / ritual frameworks** (all counts 2026-11-04)

| Project | Stars | Last push | Latest release | License | Agents (per README) | Category |
|---|---:|---|---|---|---|---|
| [obra/superpowers](https://github.com/obra/superpowers) | 311,938 | 2026-11-03 | v7.0.2 (2026-11-03) | MIT | Claude Code, Codex (app+CLI), OpenCode, Cursor, Gemini CLI, Copilot CLI, Factory Droid, Qwen, Pi, Hermes and more | skill/agent plugin |
| [github/spec-kit](https://github.com/github/spec-kit) | 146,739 | 2026-11-03 | v1.3.0 (2026-11-03) | MIT | many via "Integration" mechanism (README) | tool/library |
| [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) | 73,841 | 2026-11-04 | v1.16.0 (2026-10-30) | MIT | "AI coding assistants" (slash commands `/opsx:*`) | tool/library |
| [bmad-code-org/BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) | 54,962 | 2026-11-03 | v6.12.4 (2026-10-14); V7 alpha, ETA "mid-November 2026" per README | NOASSERTION ("other") | tool-agnostic installer | tool/library |
| [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) | 64,166 | 2026-05-31 | v1.42.3 (2026-05-16) | MIT | ARCHIVED; README says it moved to open-gsd/gsd-core | superseded |
| [open-gsd/gsd-core](https://github.com/open-gsd/gsd-core) (successor) | 11,212 | 2026-11-03 | v1.20.0 (2026-11-03) | MIT | Claude Code, OpenCode, Codex, Copilot, Cursor, Windsurf, Antigravity, Kimi, Kilo | tool/library |
| [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files) | 27,861 | 2026-11-03 | v3.28.0 (2026-11-03) | MIT | "19+ platforms" (README) | skill/agent plugin |
| [mindfold-ai/Trellis](https://github.com/mindfold-ai/Trellis) | 15,094 | 2026-09-29 | no GitHub release | AGPL-3.0 | 22 platforms incl. Claude Code, Codex, OpenCode, Cursor | tool/library |
| [automazeio/ccpm](https://github.com/automazeio/ccpm) | 8,428 | 2026-10-19 | no GitHub release | MIT | any Agent-Skills harness: Claude Code, Codex, OpenCode, Cursor, Amp... | skill/agent plugin |
| [buildermethods/agent-os](https://github.com/buildermethods/agent-os) | 5,575 | 2026-10-07 | v3.0.0 (2026-01-20) | MIT | Claude Code, Cursor, Antigravity "and other AI tools" | skill/agent plugin |
| [gotalab/cc-sdd](https://github.com/gotalab/cc-sdd) | 3,750 | 2026-10-22 | v3.1.0 (2026-09-23) | MIT | not verified in detail | tool/library |
| [GWUDCAP/cc-sessions](https://github.com/GWUDCAP/cc-sessions) | 1,540 | 2025-12-17 | v0.3.6 (2025-10-17) | MIT | Claude Code only (hooks in `.claude`) | skill/agent plugin; looks stale (issue "Is this being maintained?" [#92](https://github.com/GWUDCAP/cc-sessions/issues/92)) |
| [spec-kitty/spec-kitty](https://github.com/spec-kitty/spec-kitty) | 1,711 | 2026-11-04 | v3.2.7 (2026-09-09); 4.x RC2 prerelease | MIT | Claude Code, Codex, Cursor, Gemini, Copilot, Windsurf, OpenCode | tool/library |

**Layer B: parallel-session / worktree managers**

| Project | Stars | Last push | Latest release | License | Agents | Category |
|---|---:|---|---|---|---|---|
| [herdrdev/herdr](https://github.com/herdrdev/herdr) | 47,904 | 2026-11-03 | v0.9.5 (2026-10-14) | Apache-2.0 | "the runtime your coding agents live on" (README not read in detail) | platform/app |
| [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban) | 28,584 | 2026-11-03 | v0.1.44 (2026-04-24) | Apache-2.0 | 10+ agents incl. Claude Code, Codex, OpenCode, Gemini, Copilot, Amp, Cursor | platform/app |
| [ParadevAI/Paradev](https://github.com/ParadevAI/Paradev) (formerly Superset, per its description) | 15,887 | 2026-11-04 | desktop-v2.0.3 (2026-11-01) | NOASSERTION | "100+ coding agents in parallel" | platform/app |
| [max-sixty/worktrunk](https://github.com/max-sixty/worktrunk) | 10,577 | 2026-11-04 | v0.81.0 (2026-10-20) | NOASSERTION | agent-agnostic CLI | tool/library |
| [smtg-ai/claude-squad](https://github.com/smtg-ai/claude-squad) | 8,728 | 2026-08-20 | v1.0.20 (2026-08-20) | AGPL-3.0 | Claude Code, Codex, OpenCode, Amp, Gemini, Aider | tool/library |
| [generalaction/emdash](https://github.com/generalaction/emdash) | 6,178 | 2026-11-02 | v1.2.10 (2026-10-30) | Apache-2.0 | multi-agent dev environment (YC W26 per README) | platform/app |
| [agent-of-empires/agent-of-empires](https://github.com/agent-of-empires/agent-of-empires) | 3,434 | 2026-11-04 | v1.21.0 (2026-10-21) | MIT | Claude Code, OpenCode | tool/library |
| [stravu/crystal](https://github.com/stravu/crystal) | 3,130 | 2026-02-26 | v0.3.5 (2026-02-26) | MIT | Claude Code / Codex worktree manager; no push in ~8 months | platform/app, stale |
| [kbwo/ccmanager](https://github.com/kbwo/ccmanager) | 1,277 | 2026-10-27 | not fetched | MIT | Claude Code, Gemini, Codex, Cursor, Copilot | tool/library |
| Conductor (Melty) | not found | - | - | - | `gh search` for "conductor melty" returned nothing; I found only a sandbox repo and Google's `gemini-cli-extensions/conductor` (3,779 stars, a spec-driven plugin, different product) | unverified |

**Layer C: state / coordination substrates**

| Project | Stars | Last push | Latest release | License | Agents | Category |
|---|---:|---|---|---|---|---|
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | 112,060 | 2026-11-04 | v15.9.0 (2026-11-02) | Apache-2.0 | Claude Code plus others via hooks/worker; hosted "CMEM Pro" is the default for some hosts per README | skill/agent plugin |
| [gastownhall/beads](https://github.com/gastownhall/beads) (was steveyegge/beads; `gh search` returned only forks, direct API resolved the new owner) | 28,466 | 2026-11-04 | v1.3.3 (2026-11-03) | MIT | `bd setup claude/codex/factory/cursor/mux` | tool/library |
| [gastownhall/gastown](https://github.com/gastownhall/gastown) | 18,687 | 2026-10-28 | v1.2.1 (2026-06-06) | MIT | Claude Code, Copilot, Codex, Gemini | tool/library |
| [mvschwarz/openrig](https://github.com/mvschwarz/openrig) | 8,592 | 2026-11-04 | v0.7.7 (2026-11-02) | Apache-2.0 | Claude Code, Codex (YAML "rigs", tmux) | platform/app |
| [humanlayer/humanlayer](https://github.com/humanlayer/humanlayer) | 12,781 | 2026-11-02 | pro-0.20.0 (2025-12-23) | Apache-2.0 | Claude Code, Codex, OpenCode, Pi (daemon + Postgres/Electric sync + web/desktop apps) | platform/app |
| [sno-ai/sno-station](https://github.com/sno-ai/sno-station) | 1,094 | 2026-11-04 | v1.7.3 (2026-11-02) | Apache-2.0 | Codex, Claude Code, Hermes, Cursor, OpenClaw | platform/app |
| [Dicklesworthstone/mcp_agent_mail_rust](https://github.com/Dicklesworthstone/mcp_agent_mail_rust) (replaces deprecated Python repo, 2,230 stars) | 231 | 2026-11-04 | v0.3.40 (2026-11-01) | NOASSERTION | any MCP client | tool/library |
| [FailproofAI/failproofai](https://github.com/FailproofAI/failproofai) | 7,779 | 2026-11-03 | v1.0.13 (2026-11-02) | NOASSERTION | 12 harnesses incl. Claude Code, Codex | tool/library |

**Loop / autonomy and governance (adjacent)**
- [frankbria/ralph-claude-code](https://github.com/frankbria/ralph-claude-code): 9,721 stars, pushed 2026-11-04, MIT, no GitHub release, v0.11.5 per README, Claude Code only — [README](https://github.com/frankbria/ralph-claude-code).
- [Keesan12/martin-loop](https://github.com/Keesan12/martin-loop): 394 stars, pushed 2026-11-03, Apache-2.0, v0.9.0 — governed agent loop with budget ceiling and verifier evidence — [README](https://github.com/Keesan12/martin-loop).
- [loopx-project/loopx](https://github.com/loopx-project/loopx): 6,547 stars, 2026-11-04, Apache-2.0, v2.2.0 — "goals, decisions, ownership and evidence durable"; Codex, Claude Code — [README](https://github.com/loopx-project/loopx).
- [sipyourdrink-ltd/bernstein](https://github.com/sipyourdrink-ltd/bernstein) 1,283 stars (governance layer, Apache-2.0, v3.23.0); [ai-sdlc-framework/ai-sdlc](https://github.com/ai-sdlc-framework/ai-sdlc) 431 stars (Apache-2.0); [eyaltoledano/claude-task-master](https://github.com/eyaltoledano/claude-task-master) 28,298 stars but last push 2026-04-28 and license NOASSERTION (older task-list tool, quieter now).
- Big "harness" umbrella repos that matched keywords but are broader (config bundles, runtimes, or full agents rather than session rituals): [affaan-m/ECC](https://github.com/affaan-m/ECC) 296,613 stars (skills/instincts/memory, MIT, pushed 2026-11-02), [ruvnet/ruflo](https://github.com/ruvnet/ruflo) 80,808, [shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice) 68,515, [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) 57,201 (awesome-list), [andyrewlee/awesome-agent-orchestrators](https://github.com/andyrewlee/awesome-agent-orchestrators) 2,343 (awesome-list).

**Official/primary pattern (not a repo)**
- OpenAI Cookbook "Using PLANS.md for multi-hour problem solving": an ExecPlan is a design document the agent follows; PLANS.md defines it; it must contain and maintain Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective sections ("These are not optional"), and must be self-contained so work can restart "from _only_ the ExecPlan"; AGENTS.md tells the agent when to use it — [OpenAI developers cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans). The page shows no date and says the recipe is archived and may reference outdated models. Third-party "7-hour / 25-hour session" claims are from blogs ([example](https://codex.danielvaughan.com/2026/04/19/the-execplan-pattern-structuring-long-codex-sessions-with-plans-md/)), not OpenAI; treat as unverified.

**Star-signal caveats (flag only, not an accusation)**
- Superpowers: 311,938 stars within ~13 months of creation (2025-10-09), 27,744 forks, 329 open issues; ECC: 296,613 stars within ~9.5 months (created 2026-01-18), 43,862 forks, pushed 2026-11-02. These are extraordinarily high absolute numbers; I did not check star-history spikes, so I can't say whether it is organic. Both have active releases and many issues/forks, which argues against empty farming. Several small repos also carry marketing-style READMEs ("Star this repo", utm links). Use stars as "known/maintained", not as quality.
- cc-sessions (1,540 stars) and Claude Task Master (28,298 stars) have had no push for 11 and 6 months respectively, despite high stars.

### Inferences
- If the target is "Claude Code + Codex + OpenCode behaving consistently", the most direct fit is the group with a cross-harness installer (Superpowers, GSD Core, Trellis, OpenSpec, Spec Kit, planning-with-files, Spec Kitty). cc-sessions is Claude-only and looks unmaintained.
- Superpowers is already present in Tommy's environment (the available-skills list shows `superpowers:*` skills), so adopting its habits costs nothing; the open question is the layers it does not provide (Q2).
- GSD's high star count (64k) is on an archived repo; its live line is `open-gsd/gsd-core` (11k). Anyone reading older comparison posts will see the old repo.

### Gaps
- Stars-over-time and fork-to-star sanity were not checked (the OSS Insight route is documented as unreliable since 2026-03).
- Conductor (Melty), Claude Squad alternatives like `superset`/Paradev, and Herdr were only metadata-checked; I did not read Herdr's README.
- Non-English and unlabeled repos are under-sampled (Chinese-language handoff/workflow repos such as `runesleo/claude-code-workflow`, 710 stars, "QuietHarness" appear in results but were not read).

---

## Q2. Which of the 8 problems does each project address, and what exactly do they do about it?

### Takeaway
Problems (1) plan loss, (4) worktree isolation and (6) handoff are well covered by many tools. (2) standing decisions is partly covered (Trellis specs, ExecPlan Decision Log, AXME, OpenSpec). (3) unverified "done" is addressed by prompts in Superpowers/Trellis and by real evidence gating in only a few small tools (Martin Loop, ThreadPort, LoopX). (5) is split between "isolate by worktree" (most) and "coordinate by leases/mail" (Agent Mail, Gas Town). (7) human-only todos and (8) test-run + cost memory with skip-if-passed are essentially uncovered by any popular project.

### Cited Findings

Coverage matrix below. "Y" = README states a feature aimed at it; "p" = partial or prompt-only; blank = not found in README. This is my reading of READMEs (Inference-level), cited to each README.

| Project | 1 plan | 2 decisions/budget | 3 verify claims | 4 git/worktree | 5 parallel/team | 6 handoff | 7 human todos | 8 test+cost memory |
|---|---|---|---|---|---|---|---|---|
| Superpowers | Y plans | p (design docs) | p (verification-before-completion skill, TDD, two-stage review) | Y (using-git-worktrees, finishing-a-development-branch) | p (parallel subagents) | p | | |
| Spec Kit | Y | Y (constitution/spec) | p (recorded verification in bug-fix process) | | | p | | |
| OpenSpec | Y (`changes/` + `archive/`) | Y (specs updated on archive) | | | | p | | |
| GSD Core | Y (phase loop, archive) | Y (Discuss step captures decisions) | Y (Verify step walks through built work) | | Y (parallel waves, fresh contexts) | p | | |
| planning-with-files | Y (task_plan/findings/progress.md) | p (findings.md) | p (progress.md holds test results) | | p (`.planning/<date>-slug/` per parallel task) | Y (resume after /clear) | | |
| Trellis | Y (`.trellis/tasks/`) | Y (`.trellis/spec/`, `trellis-update-spec`) | Y (`trellis-check` runs lint/type-check/tests) | | p (per-dev journals) | Y (journals, `/trellis:finish-work`) | | |
| ccpm | Y (PRD to epic to GitHub issues) | p (PRD) | | Y (worktree per epic) | Y (parallel agents, issues as shared state) | Y (issue handoff to human) | p (GitHub issues are visible to humans) | |
| cc-sessions | Y (task md w/ frontmatter) | Y (approved todo list is locked; DAIC blocks Edit/Write until approval) | | Y (auto branch per task, blocks commits on wrong branch) | | Y (context reload on task restart) | | |
| Agent OS | p | Y (discover/deploy standards) | | | | | | |
| Agent Handoff Kit (16 stars) | Y | Y (decisions with reasons archived) | | | | Y | Y ("keeps explicit user requests for later") | |
| AXME Code (14 stars) | | Y ("architectural decision enforcement") | | p (blocks `git push --force` via hooks) | | Y | | |
| Beads | Y (dependency graph issue tracker) | p (`bd remember`) | | p (worktree skill by third party) | Y (claim/ready, Dolt push/pull between machines/agents) | Y | | |
| Gas Town | Y (Beads ledger) | | | Y (git worktree hooks) | Y (Mayor, mailboxes, 20-30 agents) | Y | | |
| MCP Agent Mail | | | | Y (pre-commit guard for reservations) | Y (advisory file leases, inbox/outbox, Git-backed archive) | p | | |
| Worktrunk / Claude Squad / Vibe Kanban / Emdash / Herdr / Agent of Empires | | | | Y | Y (run N agents) | | | |
| Sno Station | p | Y (findings filed once with human-set status; nightly memory) | p (reviewer is always the other vendor) | | p | Y (auto switch when one agent hits quota) | | |
| ThreadPort | | Y (Capsule records decisions) | Y (records commands, tests, git identity, dirty-diff hash as evidence) | Y (git state in capsule) | | Y | | p (tests listed in capsule) |
| Martin Loop | | Y (`--budget-usd`, `--max-iterations`) | Y ("completion requires fresh verifier evidence bound to the active run and workspace"; `martin dossier`, `runs verify`) | | | | | p (spend audit; no skip-if-passed found) |
| Ralph (frankbria) | p (PRD import) | Y (rate limit 100 calls/hr, circuit breaker) | p (dual-condition exit: completion indicators + explicit EXIT_SIGNAL) | p (`--backup` git branches, `--rollback`) | | p (`--resume`) | | p (`ralph-stats` JSON Lines per loop) |
| LoopX | Y | Y | Y ("evidence") | | | | | |
| Failproofai | | Y (40 policies) | p (turn-end gates on 8 of 12 harnesses) | p (blocks dangerous tool calls) | | | | p (session history) |
| claude-mem | | p | | | | Y (auto memory across sessions) | | |
| humanlayer | Y (Research-Plan-Implement) | | | | Y (team steering, Postgres sync) | Y | p | |

Primary README sources: [Superpowers README](https://github.com/obra/superpowers), [Trellis](https://github.com/mindfold-ai/Trellis), [cc-sessions](https://github.com/GWUDCAP/cc-sessions), [ccpm](https://github.com/automazeio/ccpm), [planning-with-files](https://github.com/OthmanAdi/planning-with-files), [GSD Core](https://github.com/open-gsd/gsd-core), [Agent Handoff Kit](https://github.com/Adamchanadam/agent-handoff-kit), [AXME Code](https://github.com/AxmeAI/axme-code), [Beads](https://github.com/gastownhall/beads), [Gas Town](https://github.com/gastownhall/gastown), [Agent Mail](https://github.com/Dicklesworthstone/mcp_agent_mail_rust), [Sno Station](https://github.com/sno-ai/sno-station), [ThreadPort](https://github.com/Frankie-Xu/threadport), [Martin Loop](https://github.com/Keesan12/martin-loop), [Ralph](https://github.com/frankbria/ralph-claude-code), [Failproofai](https://github.com/FailproofAI/failproofai), [Spec Kitty](https://github.com/spec-kitty/spec-kitty).

Specific quotes / facts backing the matrix:
- Superpowers workflow: brainstorming, then using-git-worktrees ("verifies clean test baseline"), writing-plans (2-5 minute tasks with "verification steps"), subagent-driven-development or executing-plans, TDD, requesting-code-review, finishing-a-development-branch ("verifies tests, presents options (merge/PR/keep/discard), cleans up worktree"); README says "Mandatory workflows, not suggestions" — [Superpowers README](https://github.com/obra/superpowers). It has a `verification-before-completion` skill ("Ensure it's actually fixed") and a `diagnosing-superpowers` skill that exports a scrubbed bundle for bug reports.
- Trellis: "persists specs, tasks, and memory into your repo"; 4-phase loop Plan/Implement/Verify/Finish; `trellis-check` "reviews the diff against specs and runs lint, type-check, and tests"; `trellis-update-spec` promotes learnings back into specs; journals under `.trellis/workspace/` — [Trellis README](https://github.com/mindfold-ai/Trellis).
- cc-sessions DAIC: Edit/Write/MultiEdit are "completely blocked" until the human approves todos with a trigger phrase; approved todos are locked and "the system detects it and throws him back to discussion mode"; auto-creates matching git branches and "enforces branch discipline (no committing to wrong branches or editing files off branch)" — [cc-sessions README](https://github.com/GWUDCAP/cc-sessions). This is the only popular tool I found that enforces (3)/(4) via hooks rather than prose, but it is Claude-only and its last push is 2025-12-17.
- ccpm: GitHub Issues as source of truth, worktree per epic, "Seamless handoffs — an agent can start a task, a human can finish it"; the same org ships a `proof` repo for visual proof of work — [ccpm README](https://github.com/automazeio/ccpm). Open bugs include "sync creates empty issue bodies; next.sh ignores closed dependencies" [#1027](https://github.com/automazeio/ccpm/issues/1027).
- planning-with-files: three files `task_plan.md`, `findings.md`, `progress.md`; "Plain markdown, gitignored by default, no runtime state anywhere else"; parallel tasks get `.planning/YYYY-MM-DD-slug/` selected via `.active_plan`. Its own benchmark: 96.7% vs 6.7% pass rate on 30 assertions, but the README states it "measures file-pattern fidelity ... not goal-drift over long autonomous runs" and is author-run — [planning-with-files README](https://github.com/OthmanAdi/planning-with-files).
- Agent Handoff Kit (Traditional-Chinese README): saves goal, user corrections, key decisions with reasons, done/not-done, document map and "habits you said to keep long-term"; commands `handoff-kit-start` / `handoff-kit-onboard`; "not a cloud sync tool and won't carry unsaved conversation"; needs Node 18+; 16 stars, v0.4.4 2026-10-18, MIT, 0 open issues — [Agent Handoff Kit](https://github.com/Adamchanadam/agent-handoff-kit). Closest in spirit to Tommy's own STATUS.md + handoff ritual, but tiny and young (created 2026-05-17).
- Martin Loop: "completion requires fresh verifier evidence bound to the active run and workspace"; "`VERIFIED` is not a claim that the code is bug-free"; `--budget-usd` hard ceiling; `martin run` with objective, verifier, budget and iteration cap; receipts via `martin dossier --latest`; local-first with optional hosted sync; `audit` command estimates "API-equivalent Claude Code spend went into fix-and-retry loops" — [Martin Loop README](https://github.com/Keesan12/martin-loop). Closest thing found to problem (3)+(8) combined, but 394 stars, single maintainer, requires adopting its `martin run` wrapper; no "skip tests that already passed on this sha" feature found in the README.
- ThreadPort Capsule v1 "records observable work state — objective, decisions, files, commands, tests, Git identity, evidence, and the next action", includes a "dirty-diff hash" and secret redaction; adapters for Claude, Codex, Cursor, Gemini; README says "Real Agent/platform certification and external user validation remain pending" and npm publication pending (install via GitHub asset) — [ThreadPort README](https://github.com/Frankie-Xu/threadport). 103 stars, v0.2.1 (2026-09-23), Apache-2.0.
- MCP Agent Mail: "advisory file reservations (leases)" on file globs, pre-commit guard, Git-backed archive with SQLite index, 45 MCP tools; the original Python repo is flagged "Deprecated: superseded by mcp_agent_mail_rust" — [Agent Mail Rust README](https://github.com/Dicklesworthstone/mcp_agent_mail_rust). License NOASSERTION (check manually before adopting).
- Sno Station: when one agent hits its limit another continues "from the same memory"; "reviewer is always a different agent"; "Every finding is filed once, with a status only a human sets. A finding raised again updates its row" (a decision-ledger idea); memory encrypted locally; nightly "REM" consolidation and self-learning that proposes skill changes ("nothing changes until you say yes"); the README table is labelled "real complaint[s] from r/ClaudeCode, r/codex or r/ClaudeAI in the week of October 20, 2026" (vendor's own framing, not independently checked) — [Sno Station README](https://github.com/sno-ai/sno-station).
- Ralph: "Dual-condition exit gate: Requires BOTH completion indicators AND explicit EXIT_SIGNAL", circuit breaker, 100 calls/hour rate limit, 5-hour API-limit handling, per-loop metrics JSON Lines, git backup branches with rollback; "784 tests, 100% pass rate" is the project's own claim — [Ralph README](https://github.com/frankbria/ralph-claude-code).
- Gas Town: "Work state stored in Beads ledger", "git-backed hooks", Mayor coordinator, "Scale comfortably to 20-30 agents" (README claim) — [Gas Town README](https://github.com/gastownhall/gastown).
- GSD Core loop: Discuss, Plan, Execute (parallel waves, "each executor starts with a clean 200k-token context"), Verify, Ship (PR + archive) — [GSD Core README](https://github.com/open-gsd/gsd-core).
- Worktrunk: "most popular git worktree manager" (maintainer's own note, November 2026); core is branch-addressed worktrees with hooks and copy-on-write build caches, aimed at "5-10+ in parallel" agents — [Worktrunk README](https://github.com/max-sixty/worktrunk).

### Inferences
- No single project covers all eight. A realistic composition: Superpowers-style skills (ritual) + repo files for state (planning-with-files / Trellis / ExecPlan shape) + Worktrunk or a hook (worktree hygiene) + a hook-enforced gate (cc-sessions DAIC idea, Failproofai) + something custom for (7) and (8).
- Problem (3) is the weakest everywhere: popular tools tell the agent to verify (prompt text), and the only tools that bind "done" to fresh evidence (Martin Loop, ThreadPort, LoopX) are small. A hook that refuses "done" without a recorded verify run is a gap the ecosystem leaves open.
- Problem (7) (human-only todos/reminders) is a gap: closest are ccpm (GitHub issues a human can pick up), Agent Handoff Kit (keeps explicit user requests) and humanlayer's human-in-the-loop approvals, but none is a dedicated "things only the human can do" list with reminders.
- Problem (8): the closest is Martin Loop's spend audit and Ralph's per-loop stats; neither caches "tests passed on sha X, skip rerun".

### Gaps
- I did not run or install any tool, so every "Y" is a documented feature, not verified behaviour.
- Herdr, Emdash, Paradev, OpenRig, Spec Kit's Bug-fixing extension and LoopX were read only at intro level; their per-problem coverage may be understated.
- No repo named "test ledger" or doing skip-if-passed was found (seven free-text queries returned zero; this may reflect GitHub search's all-words matching rather than true absence).

---

## Q3. Where does each tool keep its state (repo files vs local DB vs server)?

### Takeaway
Repo-file state is the norm for the ritual frameworks (Trellis, OpenSpec, Spec Kit, planning-with-files, cc-sessions, Spec Kitty, ExecPlans). Local databases appear in the coordination substrates (Beads/Dolt, Agent Mail SQLite+Git, claude-mem worker). Servers/cloud sync appear in the "team" platforms (humanlayer, Vibe Kanban optional self-host, Martin Loop optional dashboard, claude-mem's hosted CMEM Pro).

### Cited Findings
- Repo files: Trellis `.trellis/spec|tasks|workspace/` — [README](https://github.com/mindfold-ai/Trellis); OpenSpec `openspec/changes/<name>/` with proposal.md, specs/, design.md, tasks.md, archived by date — [README](https://github.com/Fission-AI/OpenSpec); planning-with-files three markdown files, "gitignored by default" — [README](https://github.com/OthmanAdi/planning-with-files); cc-sessions `sessions/` dir with `sessions-state.json`, `sessions-config.json`, task markdown, runtime files gitignored — [README](https://github.com/GWUDCAP/cc-sessions); Spec Kitty "specs, plans, work packages, acceptance criteria, review state, and merge decisions in your repository" — [README](https://github.com/spec-kitty/spec-kitty).
- Local DB / git-backed store: Beads on Dolt ("distributed graph issue tracker", `bd dolt push/pull`) — [README](https://github.com/gastownhall/beads); Agent Mail "Git-backed archive, SQLite indexing" — [README](https://github.com/Dicklesworthstone/mcp_agent_mail_rust); Gas Town state in Beads ledger and git-backed hooks — [README](https://github.com/gastownhall/gastown); Sno Station memory local and encrypted, "No account, no server, no daemon" — [README](https://github.com/sno-ai/sno-station); ThreadPort local-only, reads agent session logs — [README](https://github.com/Frankie-Xu/threadport).
- Server/cloud involvement: humanlayer monorepo includes Postgres + Electric sync, AWS Lambda jobs, cloud admin app — [README](https://github.com/humanlayer/humanlayer); claude-mem runs a local worker and for some hosts defaults to hosted "CMEM Pro" — [README](https://github.com/thedotmack/claude-mem); Martin Loop is local-first with optional hosted sync via `MARTIN_API_TOKEN` — [README](https://github.com/Keesan12/martin-loop); Vibe Kanban supports self-hosting — [README](https://github.com/BloopAI/vibe-kanban); ccpm uses GitHub Issues as source of truth, i.e. GitHub is the server — [README](https://github.com/automazeio/ccpm).
- Standard shape for "restart from file only": ExecPlan must let you "restart from _only_ the ExecPlan and no other work" — [OpenAI cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans).

### Inferences
- For a repo-centric workflow like Tommy's (docs/STATUS.md, verify.sh, handoff outside repo), the compatible models are Trellis/OpenSpec/planning-with-files/ExecPlans: plain files, reviewable in git, no daemon. Beads and Agent Mail add a DB/daemon and 1,608 open issues on Beads ([repo](https://github.com/gastownhall/beads)) suggest heavy churn.
- Handoff outside the repo (Tommy's `~/.claude/handoffs/<repo>.md`) is unusual; most tools put it in-repo (gitignored or committed). ThreadPort and catchup-style tools instead reconstruct it from local session logs.

### Gaps
- Exact on-disk schema for Beads/Dolt and claude-mem storage was not checked.
- Whether Trellis/OpenSpec files are committed by default vs gitignored was not verified for all tools.

---

## Q4. What real-world complaints or maintenance problems are visible?

### Takeaway
Complaints are mostly about ceremony and cost (Superpowers brainstorming annoyance, slowness), staleness/maintenance (cc-sessions, Crystal, GSD archive), and sync bugs in the more complex systems (ccpm, Gas Town, Beads CI red). I found no independent token-cost benchmark; evidence here is from GitHub issues (primary) and review sites (secondary, mostly promotional).

### Cited Findings
- Superpowers top open issues by comment count: "v7's brainstorm questions are rather annoying" (29 comments, 2026-10-16) [#2530](https://github.com/obra/superpowers/issues/2530); "I'm seeing slowness in responses since using the skill" (27 comments, 2026-03-15) [#743](https://github.com/obra/superpowers/issues/743); request for Claude Code Agent Teams support [#429](https://github.com/obra/superpowers/issues/429).
- cc-sessions: "Hooks errors" [#67](https://github.com/GWUDCAP/cc-sessions/issues/67); "Is this being maintained?" [#92](https://github.com/GWUDCAP/cc-sessions/issues/92) (2025-11-25); no push since 2025-12-17.
- ccpm: open reports "sync creates empty issue bodies; next.sh ignores closed dependencies (+4 more)" [#1027](https://github.com/automazeio/ccpm/issues/1027) (2026-10-12) and a `gh issue create --json` regression [#1024](https://github.com/automazeio/ccpm/issues/1024); GitLab support request [#588](https://github.com/automazeio/ccpm/issues/588).
- Gas Town: "Deacon patrol can fast-loop fake cycles without executing formula steps" [#2386](https://github.com/gastownhall/gastown/issues/2386); "Handle rate limit resets" [#1066](https://github.com/gastownhall/gastown/issues/1066); failed brew release of 1.2.0/1.2.1 [#4179](https://github.com/gastownhall/gastown/issues/4179); Gas Town has 503 open issues ([repo](https://github.com/gastownhall/gastown)).
- Beads: 1,608 open issues; "CI is red on main" (31 comments, 2026-10-27) [#7914](https://github.com/gastownhall/beads/issues/7914); large design threads "Proposal: Memory Beads" (131 comments) [#5877](https://github.com/gastownhall/beads/issues/5877).
- planning-with-files: issue "For multi-step / complex tasks, how should this skill be used properly?" (27 comments) [#19](https://github.com/OthmanAdi/planning-with-files/issues/19), suggesting usage confusion; the README's own benchmark is author-run and measures file-pattern fidelity only — [README](https://github.com/OthmanAdi/planning-with-files).
- Maintainer-side admission of stale/moved projects: GSD repo archived with redirect to `open-gsd/gsd-core` — [archived README](https://github.com/gsd-build/get-shit-done); Agent Mail Python repo "Deprecated" — [repo](https://github.com/Dicklesworthstone/mcp_agent_mail); Cavekit "Frozen" — [repo](https://github.com/JuliusBrussee/cavekit).
- Comparison pages note Spec Kit's upfront cost for small tasks and that Superpowers' subagent dispatch can multiply token use, but "I found no source quantifying that"; the pages are largely promotional review-site content — [DEV Community comparison](https://dev.to/truongpx396/spec-kit-vs-superpowers-a-comprehensive-comparison-practical-guide-to-combining-both-52jj), [shiporskip GSD vs Superpowers](https://shiporskip.io/compare/get-shit-done-gsd-meta-prompting-context-engineering-claude-code-2026-vs-superpowers-obra-agentic-coding-framework-2026). Treat as low-confidence.
- Sno Station's README table lists user complaints it attributes to Reddit (5-hour limit exhaustion; reviewing large agent PRs; "is that reason stored anywhere Codex reads next time?") — vendor-curated and not independently verified — [Sno Station README](https://github.com/sno-ai/sno-station).

### Inferences
- The recurring failure modes match Tommy's list: ritual overhead annoys users (v7 brainstorm), stateful trackers drift or break on sync (ccpm, Gas Town), and projects churn or go stale quickly (GSD, cc-sessions, Crystal) — so a thin, file-based, self-owned ritual has lower adoption risk than depending on a fast-changing framework.

### Gaps
- No Reddit/X sentiment was gathered (outside this task's free GitHub/web scope); no quantified token-cost comparison exists in what I found.
- Open-issue counts mix bugs, features and noise; they are a rough activity signal only.

---

## Q5. What does this imply for Tommy's rituals (opening/closing, verify.sh, STATUS.md, handoff, worktrees)? What is the shortlist to look at further?

### Takeaway
Tommy's existing design (STATUS.md + verify.sh + external handoff + worktrees + decision/budget memory) already matches the shape of Trellis, planning-with-files, Agent Handoff Kit and the OpenAI ExecPlan standard; none of them adds the two things he seems to miss most — enforced "done needs fresh evidence" and test-run + cost memory with skip-if-passed — so those remain build-it-yourself, ideally as hooks plus a small ledger file.

### Cited Findings (shortlist to inspect, all data 2026-11-04)
1. Steal ideas from: **cc-sessions DAIC** (hook-blocking edits until approval; branch discipline) — [repo](https://github.com/GWUDCAP/cc-sessions); **OpenAI ExecPlan** (Progress, Surprises, Decision Log, Outcomes; restartable from file alone) — [cookbook](https://developers.openai.com/cookbook/articles/codex_exec_plans); **Martin Loop** (verifier-bound completion, budget ceiling, receipts) — [repo](https://github.com/Keesan12/martin-loop); **ThreadPort Capsule** (tests/commands/git identity/dirty-diff hash as handoff evidence) — [repo](https://github.com/Frankie-Xu/threadport); **Sno Station** (findings filed once, status only a human sets) — [repo](https://github.com/sno-ai/sno-station); **Agent Mail** (file leases + pre-commit guard for parallel sessions) — [repo](https://github.com/Dicklesworthstone/mcp_agent_mail_rust).
2. Candidates to adopt as-is: **Superpowers** (ritual; already available), **Worktrunk** (worktree hygiene; GitHub API reports license NOASSERTION, read LICENSE manually), **Trellis** (if a full in-repo spec/task/journal layer is wanted; note AGPL-3.0) — [Trellis](https://github.com/mindfold-ai/Trellis).
3. Watch only: Agent Handoff Kit (closest to Tommy's rituals but 16 stars), AXME Code (14 stars; decision enforcement + safety hooks), Failproofai (hook-level policy across 12 harnesses; license NOASSERTION).

### Inferences
- Licensing flags to check before adopting: Trellis AGPL-3.0; Claude Squad AGPL-3.0; BMAD, Worktrunk, Agent Mail, Failproofai, Paradev, claude-task-master report NOASSERTION/"other" in the GitHub API (README or LICENSE must be read manually).
- Because Tommy's ritual already is "files + verify.sh", the cheapest path to closing gaps (3), (7), (8) is a small repo-side ledger (e.g. a verify-result file keyed by git sha and test command, plus a human-todos file) read by the opening ritual and written by `bin/verify.sh` — a pattern no popular tool above provides out of the box. This is an inference from the coverage matrix, not a sourced fact.

### Gaps
- No evidence that any tool survives a Claude Code to Codex to OpenCode switch in practice; cross-harness support is as claimed in READMEs only.
- I did not test any tool; adoption cost (install footprint, hook conflicts with Tommy's existing `guard-git-push.sh`, `protect-secrets.sh`) is unknown.
