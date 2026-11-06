# Cross-session, cross-tool memory systems for AI coding agents (as of 2026-11-04)

Scope: MCP memory servers / memory layers shareable across Claude Code, Codex CLI, OpenCode, Cursor; fit for structured project state (test results, todos, human-only reminders) vs fuzzy "knowledge" memory. Research done 2026-11-04 via web search + page fetches. Numbers (stars, versions) are snapshots read from GitHub pages on that date; fetch tool summaries sometimes omitted release dates, which are marked as gaps.

## Q1. Per-tool fact sheet: storage, API-key need, client support, structured queries, team sharing, maturity, failure modes

### Takeaway
Only file-based tools (official MCP memory JSONL, Basic Memory, Serena, Cline-style memory bank, CLAUDE.md/AGENTS.md) keep the source of truth in local files you can git-track. Mem0, Graphiti, Supermemory and claude-mem are LLM-extraction/vector/graph systems that need an LLM or embedding provider and give fuzzy recall, not exact structured state. None of them has a real "query by status/date" structured store apart from Basic Memory's frontmatter/schema features.

### Cited Findings

**Official MCP "memory" server (modelcontextprotocol/servers, src/memory)**
- Storage: local knowledge graph in a JSONL file, default `memory.jsonl`, path via `MEMORY_FILE_PATH`; legacy `memory.json` auto-renamed at startup — [README](https://github.com/modelcontextprotocol/servers/tree/main/src/memory) (fetched 2026-11-04).
- Model: entities (name, type, observations), directed relations, atomic observations. Tools: create_entities, create_relations, add_observations, delete_*, read_graph, search_nodes, open_nodes; resource `memory://knowledge-graph` — same README.
- No embeddings / no API key (it is a plain graph file with name search) — inferred from README listing only the above tools and one env var; same README.
- Multi-client sharing of one file: separate processes, lock via `<file>.lock` using exclusive file creation; network filesystems that don't honour it "cannot be shared safely"; write fails after 60 s lock wait — same README.
- `create_entities` silently ignores names that already exist (observations not added; must use add_observations) — same README. This is a concrete conflict/stale-data footgun.
- Requires Node.js 24+ via npx/source; MIT license — same README. README does not state maintenance status (reference implementation); stars not collected.
- Searches describe it only as a basic reference implementation; directory listings (secondary) say it is widely adopted — [mcp.so](https://mcp.so/servers/memory?tab=config) (secondary, unverified).

**Basic Memory (basicmachines-co/basic-memory)**
- ~4.5k stars, 348 forks; AGPL-3.0; local Markdown notes + local SQLite index (Postgres supported); notes use frontmatter, typed observations in brackets, wikilink relations; a schema system (infer/validate/diff via `bm_schema`) — [GitHub README](https://github.com/basicmachines-co/basic-memory) (fetched 2026-11-04).
- Semantic search uses FastEmbed embeddings with hybrid FTS+vector; default setup page does not say an API key is needed (local embeddings); optional LiteLLM reranker needs a provider key (e.g. Cohere) — same README.
- Clients listed: Claude Desktop, Claude Code, Codex CLI, Cursor, VS Code, ChatGPT, Obsidian; OpenCode not mentioned (any MCP client should work) — same README.
- Cloud: from $15/month (regular $19; yearly $12.50/month), 7-day trial; "Basic Memory Teams" shared cloud workspace with real-time co-editing — same README. Local multi-device sync is manual (Git or Syncthing) — same README.
- Constraints: Python 3.12+, `uv`, needs `--prerelease=allow`; telemetry on by default (minimal, can be disabled) — same README.
- Version/date: the GitHub page showed no releases; an aggregator lists v0.22.1 dated 2026-06-13 while another catalog lists 0.21.5, README references v0.23 — [mcp.directory](https://mcp.directory/blog/claude-code-memory-mcp-servers-2026) and [landscape.jimmysong.io](https://landscape.jimmysong.io/projects/basic-memory/) (secondary, inconsistent; unverified).
- A Claude Code plugin adds session briefings and compaction checkpoints but requires the MCP server to be connected — [skillselion listing](https://skillselion.com/skills/basicmachines-co/basic-memory/plugins/claude-code) (secondary).

**claude-mem (thedotmack/claude-mem)**
- GitHub page (2026-11-04 fetch): ~112k stars, 9.7k forks, version badge 15.9.0, license Apache-2.0, 58 open issues; local SQLite + Chroma under `~/.claude-mem/`; optional Cloud Sync to cmem.ai — [GitHub](https://github.com/thedotmack/claude-mem).
- Memory provider choices: hosted claude-mem observer (30-day free trial), your own OpenRouter or Gemini key, or your Anthropic plan; post-trial cost not stated — same page.
- Clients: Claude Code (plugin), Codex, Gemini, Copilot, OpenCode and others; Cursor plugin directory exists but no install command shown — same page.
- Privacy: `<private>` tags exclude content; screenshots off by default; uploads only with Cloud Sync — same page. The README also references a third-party "CMEM" crypto token the maintainer endorsed; not part of the software — same page (flag as a trust/hype signal).
- CONFLICT: Augment Code articles report 72.4K stars and AGPL-3.0 — [augmentcode](https://www.augmentcode.com/learn/claude-mem-persistent-memory-claude-code) (date unknown). Star count differs by snapshot date; license conflict unresolved (check LICENSE file; unverified).
- Mechanism: hooks capture tool use and file edits, AI-compress observations, inject into later sessions; web viewer at localhost:37777 — [augmentcode](https://www.augmentcode.com/learn/claude-mem-persistent-memory-claude-code) (secondary). Hence it spends LLM tokens on every session and stores automatically-extracted summaries (fuzzy), not curated state.

**Mem0 / OpenMemory MCP**
- mem0ai/mem0: 68.4k stars, Apache-2.0; defaults to OpenAI models (gpt-5-mini LLM, text-embedding-3-small embeddings) unless reconfigured; self-hosted via docker compose or hosted Platform; coding-agent guides for Claude Code, Codex, Cursor, Windsurf, OpenCode — [GitHub](https://github.com/mem0ai/mem0) (fetched 2026-11-04; release date not shown).
- OpenMemory MCP: local-first via Docker + Postgres + Qdrant; docs list Docker and an OpenAI API key as prerequisites; dashboard generates per-client install command (Cursor, Claude Desktop, Cline, Windsurf) — [Mem0 blog](https://mem0.ai/blog/how-to-make-your-clients-more-context-aware-with-openmemory-mcp) and search summary (original date 2025, not re-verified in 2026). I could not confirm OpenMemory is still maintained as a separate product in Nov 2026 (the docs.mem0.ai page I fetched did not mention it) — unverified.
- Community variant `mcp-mem0` (PyPI) supports Ollama so no OpenAI key — [PyPI](https://pypi.org/project/mcp-mem0/) (third party).

**Zep / Graphiti**
- getzep/graphiti: 32.5k stars, Apache-2.0; needs a graph DB (Neo4j 5.26, FalkorDB, Neptune; Kuzu deprecated); defaults to OpenAI for LLM and embeddings (Gemini, Anthropic, Groq, OpenAI-compatible/Ollama optional) — [GitHub](https://github.com/getzep/graphiti) (fetched 2026-11-04).
- Its MCP server is a reference implementation with no authentication, authorization or prompt-injection protection; "should not be exposed to untrusted networks or used as a production deployment" — same page.
- Temporal knowledge graph (facts with validity intervals) is its differentiator — [Zep blog, 2026-06-23](https://www.getzep.com/blog/markdown-is-not-agent-memory/) (vendor).

**Letta**
- Letta's own benchmark: a plain-file "filesystem" agent with GPT-4o-mini scored 74.0% on LoCoMo vs Mem0's reported 68.5% graph variant; authors say the benchmark is not very meaningful and it is vendor-run — [Letta blog, 2025-08-12](https://www.letta.com/blog/benchmarking-ai-agent-memory).
- Letta is an agent platform (server + agents), not a drop-in MCP memory for Claude Code/Codex. Letta's file-based "MemFS" is cited as a markdown-memory example by Zep — [Zep blog](https://www.getzep.com/blog/markdown-is-not-agent-memory/). I did not fetch Letta Code docs: client sharing with Claude Code/Codex is unverified.

**Supermemory**
- Coding-agent plugins (Claude Code, Cursor, Codex, OpenCode, OpenClaw) are free on any account but saving/searching still consume credits; free plan reportedly $5 credits/month — [Supermemory changelog](https://supermemory.ai/changelog/every-coding-agent-plugin-is-now-free.md) and [Codex docs](https://supermemory.ai/docs/integrations/codex) (vendor; the $5 figure is from a vendor blog, unverified).
- Needs an API key (env var or browser sign-in); cloud by default; local instance option via `npx supermemory local` with `SUPERMEMORY_API_URL` — [Codex docs](https://supermemory.ai/docs/integrations/codex). Stars/license not collected.

**Serena memories (oraios/serena)**
- 31.1k stars; Serena app GPL-3.0-or-later, SolidLSP MIT; clients include Claude Code, Codex, OpenCode, Gemini-CLI, Cursor, VS Code; no API key mentioned — [GitHub](https://github.com/oraios/serena) (fetched 2026-11-04; release date not shown).
- Memories are plain Markdown at `.serena/memories/` (project) and `~/.serena/memories/global/`; the agent gets the list of memory names at startup and reads them on demand; project memories can be committed and reviewed in PRs; global ones are not versioned (docs suggest a separate git repo); `read_only_memory_patterns` and `ignored_memory_patterns` exist — [Serena docs: memories](https://oraios.github.io/serena/02-usage/045_memories.html). Memory is a side feature of a code-navigation (LSP) tool; installing Serena just for memory is heavy.

**Cline Memory Bank pattern**
- Pattern, not a server: six Markdown files (projectbrief, productContext, activeContext, systemPatterns, techContext, progress) plus instructions in `.clinerules`; activeContext is meant to reflect current state, progress records milestones — [Cline docs](https://docs.cline.bot/features/memory-bank.md) via search summary. Portable to any tool that reads a markdown instruction file (re-implemented for Claude Code/Cursor in the wild; not independently verified).

**Cursor Memories**
- Cursor staff say Memories were removed from v2.1.x (2.1.17 cited) with an "Export memories" command to `.mdc` rules; some users reported missing export / lost memories — [Cursor forum](https://forum.cursor.com/t/are-my-memories-gone/144057) and [thread](https://forum.cursor.com/t/memories-not-showing/143820). Launch date conflicts across sources (1.0 in June 2025 per a vendor blog) — [memoryplugin blog](https://blog.memoryplugin.com/cursor-memory/) (vendor).
- Current Cursor persistence = Rules (`.cursor/rules/*.mdc`, 4 apply types), User/Team Rules, and AGENTS.md at root/subdirs — [Cursor docs](https://cursor.com/docs/context/rules).

### Inferences
- Of the "memory server" options, only Basic Memory and Serena combine local plain files with an MCP interface and no mandatory paid API; the official memory server also needs no key but is a thin, flat graph with weak update semantics.
- Mem0/OpenMemory, Graphiti and (by default) claude-mem and Supermemory introduce an extra LLM/embedding dependency and a hidden extraction step, which is the opposite of what is wanted for exact test results/todos.
- Star counts are huge for claude-mem (112k) and Mem0 (68k) but popularity here mostly reflects hype; no source I found measured accuracy for coding-state use cases.

### Gaps
- Stars and last-release dates for the official memory server, Supermemory, Letta, and exact release dates for most repos (GitHub fetch summaries omitted them).
- OpenMemory current maintenance status and exact 2026 requirements.
- Letta cross-tool (Claude Code/Codex) integration details.
- claude-mem license conflict (Apache-2.0 vs AGPL-3.0) and cost of provider after trial.

## Q2. Cross-tool lowest common denominator: CLAUDE.md / AGENTS.md / Claude auto-memory / Codex memories / OpenCode / Cursor

### Takeaway
AGENTS.md in git is the one thing all four tools read (Claude Code natively since v2.1.277, or via `@AGENTS.md` import). Auto-memory features of Claude Code (`~/.claude/projects/<project>/memory/MEMORY.md`) and Codex (`~/.codex/memories`) are machine-local, tool-specific, and not shared across tools or machines.

### Cited Findings
- Claude Code auto memory: on by default locally; stored at `~/.claude/projects/<project>/memory/` with `MEMORY.md` index (first 200 lines or 25KB loaded each session) plus topic files read on demand; per-repo, shared across worktrees; "machine-local" and "not shared across machines or cloud environments"; four types (user, feedback, project, reference); excludes what is derivable from code; location configurable via `autoMemoryDirectory` — [Claude Code memory docs](https://code.claude.com/docs/en/memory) (fetched 2026-11-04).
- Claude Code docs: CLAUDE.md/memory content is "context, not enforced configuration"; use a PreToolUse hook for enforcement — same page.
- Claude Code reads `AGENTS.md` natively (v2.1.277+) only when no CLAUDE.md exists in or above the working directory; otherwise use `@AGENTS.md` import in CLAUDE.md; a `CLAUDE.local.md` makes Claude ignore AGENTS.md unless the setting `claude-md-and-agents-md` is chosen — same page.
- Codex memories: off by default (`[features] memories = true` or Settings > Personalization); stored under `$CODEX_HOME/memories_v2/` (or existing `memories/`); local to the machine; keys include `memories.generate_memories`, `memories.use_memories`, extract/consolidation models; OpenAI says keep required team guidance in AGENTS.md/checked-in docs and treat memories as a recall layer; secrets redacted but "Don't store secrets in memories" — [OpenAI Codex memories docs](https://learn.chatgpt.com/docs/customization/memories?surface=app) (redirect from developers.openai.com/codex/memories, fetched 2026-11-04).
- OpenCode: loads `AGENTS.md` first, `CLAUDE.md` as fallback (first match wins per category), global `~/.config/opencode/AGENTS.md` then `~/.claude/CLAUDE.md`; no memory feature described — [OpenCode rules docs](https://opencode.ai/docs/rules/).
- Cursor: reads AGENTS.md at root/subdirs; project rules must be `.mdc` — [Cursor docs](https://cursor.com/docs/context/rules).

### Inferences
- Because the loading rule differs (Claude: CLAUDE.md wins over AGENTS.md; OpenCode: AGENTS.md wins over CLAUDE.md), the robust pattern is AGENTS.md as the single file plus a one-line `CLAUDE.md` containing `@AGENTS.md` (matches the user's existing global convention).
- Anything stored only in Claude's MEMORY.md or Codex memories is invisible to the other tool; structured state should live in repo files (e.g. docs/STATUS.md, a todo file), not in either auto-memory.

### Gaps
- Whether Codex's `memories_v2` format is stable (new key `memories.version` hints at format churn; unverified).
- Cursor Memories official docs removal note (the rules page did not mention it).

## Q3. Fit: structured project state (test results, todos, human-only reminders) vs fuzzy knowledge memory

### Takeaway
Memory servers are designed for fuzzy, extracted, semantically-retrieved knowledge. Exact, mutable, verifiable state (test results with date, todo status) is better as plain files (Markdown or JSON) in git, ideally written by scripts, with agents reading them at session start. Anthropic's own long-running-agent harness does exactly this.

### Cited Findings
- Anthropic's harness for long-running agents uses a `claude-progress.txt` log plus git history and a feature list in JSON, because "the model is less likely to inappropriately change or overwrite JSON files" than Markdown — [Anthropic Engineering, 2025-11-26](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents). (Secondary summaries say 200+ features marked `passes: false` and Puppeteer verification; those details are from secondary blogs, not confirmed in the fetch.)
- Practitioner split: CLAUDE.md = hand-written stable project facts; memory MCP = agent-filled provisional notes (dead ends, decisions); promote verified items into CLAUDE.md only after human review — [DEV Community: CLAUDE.md vs a memory MCP](https://dev.to/wang1051992187/claudemd-vs-a-memory-mcp-what-actually-goes-where-438n) (opinion, author may build memory tools).
- Staleness applies to markdown too: AGENTS.md/CLAUDE.md/.cursorrules "are memory too" and can steer the agent after the code changed — [DEV Community, jgravelle](https://dev.to/jgravelle/your-ais-memory-is-quietly-making-it-worse-1n0c) (opinion).
- Zep (vendor) lists failure modes of file memory: errors compound (file records what, not what it replaced), concurrent agents diverge, retrieval degrades as files multiply; but concedes coding assistants with repo-local source of truth are a good fit — [Zep blog, 2026-06-23](https://www.getzep.com/blog/markdown-is-not-agent-memory/).
- Official MCP memory server cannot answer "which tests failed last run" semantically; it only stores entities/observations (see Q1). Basic Memory offers frontmatter + schema validation (`bm_schema`) which can approximate structured notes, but queries are still search-oriented — [Basic Memory README](https://github.com/basicmachines-co/basic-memory).
- Claude Code auto-memory explicitly skips things derivable from code/git and focuses on corrections/preferences/project context — [memory docs](https://code.claude.com/docs/en/memory).

### Inferences
- Recommended split (my inference, not sourced): (a) test results and todos: a script-written file in git (`docs/test-log.md`, `docs/todo.md`, or JSON for machine-checked items) with date and commit SHA per entry, so staleness is detectable against git; (b) fuzzy knowledge ("why we picked X", gotchas): AGENTS.md, plus optionally Basic Memory or Serena memories if search over many notes is needed; (c) skip claude-mem/Mem0/Graphiti/Supermemory unless a paid-LLM extraction layer is explicitly wanted.
- JSON for machine-updated state and Markdown for human prose follows the Anthropic harness finding (evidence limited to one lab's statement; no independent replication found).

### Gaps
- No controlled study comparing memory servers vs files on coding-state tasks (test results/todos).
- No source found on how Basic Memory behaves with git-conflicting concurrent edits.

## Q4. Evidence/expert opinion (2025-2026) that plain markdown in git beats memory servers for coding agents

### Takeaway
There is supporting but mostly vendor-adjacent or anecdotal evidence, no neutral benchmark. Official docs from OpenAI and Anthropic both steer required/team knowledge to checked-in markdown (AGENTS.md/CLAUDE.md); even a memory vendor (Zep) concedes markdown is a fine fit for single-agent coding assistants.

### Cited Findings
- OpenAI: keep required team guidance in AGENTS.md or checked-in docs; memories are only a local recall layer — [Codex memories docs](https://learn.chatgpt.com/docs/customization/memories?surface=app).
- Anthropic: Claude Code's own memory is itself markdown files (CLAUDE.md, MEMORY.md + topic files), not a database — [memory docs](https://code.claude.com/docs/en/memory); its long-running-agent harness uses a progress file plus git — [Anthropic Engineering, 2025-11-26](https://anthropic.com/engineering/effective-harnesses-for-long-running-agents).
- Letta (vendor) reports a file-based agent beating a specialized memory library on LoCoMo (74.0% vs 68.5%), while saying the benchmark is of limited meaning and the comparison is disputed (Mem0 didn't clarify its numbers) — [Letta blog, 2025-08-12](https://www.letta.com/blog/benchmarking-ai-agent-memory).
- Zep (vendor with a graph-memory product): markdown memory is legitimate and a "clear fit" for coding assistants that load project instruction files; breaks with scale, changing facts and concurrent agents — [Zep, 2026-06-23](https://www.getzep.com/blog/markdown-is-not-agent-memory/).
- Community pattern: many memory MCP projects keep markdown as source of truth and add only an index (SQLite FTS5) that is regenerable — e.g. [Lolaplex/agent-memory](https://github.com/Lolaplex/agent-memory), [TyposBro/agent-vault](https://github.com/TyposBro/agent-vault) (small repos, anecdotal).
- Forum/DEV opinion: plain Markdown benefits teams since everyone has the same files rather than "unique binary database" — [Q&A thread](https://yomotherboard.com/question/do-memory-mcp-servers-actually-help-with-coding-in-claude-code/) (low-quality secondary; anecdotal).

### Inferences
- The strongest, least biased evidence is behavioral: both Anthropic and OpenAI built their own memory as markdown files and tell users to put must-know rules in git. That is design evidence, not a benchmark.
- Bias note: Letta, Zep, Mem0, Supermemory, Basic Memory, claude-mem all sell or promote memory products; no neutral 2026 head-to-head found.

### Gaps
- I did not find a Hacker News thread or a peer-reviewed/neutral benchmark on files vs memory servers for coding agents (search returned DEV/forum posts only).
- Reddit/X sentiment not collected (separate skill exists).

## Q5. Reminders for humans ("you still need to do X" at session start)

### Takeaway
No memory server has a first-class "human to-do" concept. The agent-native mechanism is a SessionStart hook that prints a todo file; for tasks outside the repo, GitHub issues assigned to the human or an Apple Reminders/Calendar MCP work.

### Cited Findings
- Claude Code `SessionStart` hooks fire on `startup`, `resume`, `clear`, `compact`, `fork`; stdout from SessionStart (exit 0) is added to Claude's context; JSON `systemMessage` can surface a message to the user; `additionalContext` must be nested in `hookSpecificOutput` or it is silently ignored — [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide) (fetched 2026-11-04).
- The hooks guide itself recommends a SessionStart hook with the `compact` matcher to re-inject critical context after compaction — same page.
- Plain stdout goes to Claude, not necessarily to the human; to show the human, use `systemMessage` in the hook's JSON — same page (interpretation of "you see nothing, unless the hook's JSON surfaces something, such as `systemMessage`").
- Claude docs note a `SessionStart` hook that prints AGENTS.md is no longer needed once Claude reads AGENTS.md natively (avoid duplicate context) — [memory docs](https://code.claude.com/docs/en/memory).
- Apple Reminders MCP servers exist: [dbmcco/apple-reminders-mcp](https://github.com/dbmcco/apple-reminders-mcp), [FradSer/mcp-server-apple-events](https://github.com/FradSer/mcp-server-apple-events) (Reminders + Calendar via EventKit; alarms/recurrence read-only), [mikakoivisto/reminders-mcp](https://github.com/mikakoivisto/reminders-mcp). Small third-party projects; maturity unverified.
- Basic Memory's Claude Code plugin provides "session briefings" — [skillselum listing](https://skillselion.com/skills/basicmachines-co/basic-memory/plugins/claude-code) (secondary), i.e. a similar session-start surface.
- Codex and OpenCode: I did not verify an equivalent SessionStart hook for either.

### Inferences
- A human-only reminder list is best a file such as `docs/todo.md` ("Human TODO" section) printed by a SessionStart hook (Claude Code) and listed in AGENTS.md as "read at start and tell the user" for Codex/OpenCode/Cursor, which lack a confirmed equivalent hook. GitHub issues assigned to the human (via `gh issue list --assignee @me`) is an inference, not a documented pattern I found sourced.
- Statusline option for reminders: Claude Code supports a status line but I did not fetch its docs, so unverified.

### Gaps
- Whether Codex/OpenCode/Cursor have session-start hooks usable for this (not verified).
- Statusline documentation not checked.
- No source found describing a "GitHub issue assigned to human" reminder workflow specifically for coding agents.

## Caveats on source quality
- Many first-search summaries came from aggregator pages (mcp.directory, augmentcode, DEV, lobehub); those are marked secondary. Primary sources fetched: the modelcontextprotocol, basic-memory, claude-mem, mem0, graphiti, serena GitHub pages; code.claude.com memory + hooks docs; OpenAI Codex memories docs; OpenCode rules; Cursor rules; Anthropic Engineering blog; Letta and Zep blogs.
- WebFetch returns model summaries of pages, so exact numbers (stars, versions) could be misread; re-verify any figure that gets quoted in the final report.
