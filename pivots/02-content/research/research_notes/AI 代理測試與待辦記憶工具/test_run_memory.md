# Durable test-run memory for AI coding agents: skip tests that already passed at an unchanged content hash

Research date: 2026-11-04. Searcher: Sonnet 5.5 (WebSearch/WebFetch, about 20 calls). Labels: [FETCHED] = read on the page; [SEARCH-ONLY] = from a search-result snippet, page not read; [KNOWLEDGE] = from training knowledge, not checked this session, treat as unverified.

## Repo context (read-only look, local files)

Facts about the BuildClub test setup, from `pivots/02-content/app/trend-finder/` and `bin/verify.sh` (there is no top-level `app/` directory in this worktree; the app is at `pivots/02-content/app/trend-finder`):
- Python backend tests: pytest, 51 files in `backend/tests/` (`requirements-dev.txt` lists pytest and httpx). `bin/verify.sh` runs `python -m pytest -q -p no:cacheprovider backend/tests`.
- Frontend unit tests: plain `node --test unit/` (`.test.mjs` files). No Jest or Vitest in `package.json`.
- E2E: hand-written `e2e/*.cjs` scripts using `playwright-core` (path set by `PW_CORE`, default `~/.hermes/hermes-agent/node_modules/playwright-core`) driving Google Chrome against an isolated backend on ports 8871/8872 (`bin/isolated-backend.sh`). `@playwright/test` is not used, so there is no Playwright test runner, `--only-changed`, `--last-failed` or JSON reporter.
- `bin/verify.sh` is a plain bash `run_step` list. There is already a hand-kept ledger, `docs/test-log.md`: a markdown table with Date, Branch @ sha, What ran, Result, Cost, Evidence, and the rule "if the same test passed at a commit and `git log <sha>..HEAD` shows no change to the code it covers, do not run it again".
- Consequence for the options below: `nx affected`, Turbo `--affected`, Vitest/Jest `--changed` and Playwright `--only-changed` need either a monorepo build tool or a supported runner that this repo does not have. The repo already has a manual ledger, so the question becomes how to automate it.

## 1. Test impact analysis and affected-only runners: what each records, where, and keyed by what

### Takeaway
Runner-level tools (testmon, `--lf`, Playwright `--last-failed`, Vitest cache) record state in a local cache file, not in git, and most key it on file contents or mtimes or on "last run failed". None records cost or evidence. Only pytest-testmon fits the Python half of the repo. `node --test` and the custom Playwright scripts have no built-in equivalent.

### Cited Findings
- pytest-testmon: stores a dependency map (test to executed code, collected via Coverage.py) in `.testmondata`. The first `pytest --testmon` run runs everything; later runs run only affected tests and update the database. Failed tests always re-run. Data file location overridable via `TESTMON_DATAFILE`. It works without version control because it updates its database on each execution. [FETCHED] — [testmon.org](https://testmon.org/)
- testmon tracks code in the project, environment variables, Python version and third-party package versions. It does NOT track static files (txt, xml, assets) or external services reached over the network. `--testmon-env=<STRING>` keeps separate data per environment in one file. `--tmnet` stores data in cloud storage instead of a local file. [FETCHED] — [testmon.org](https://testmon.org/)
- The testmon page does not say whether entries are keyed by file checksum or function-level fingerprint; it defers to a blog post ("Determining affected tests"). [FETCHED, gap] — [testmon.org](https://testmon.org/)
- A GitHub issue reports that an external error such as a DB connection failure can leave incomplete data in `.testmondata` after an interrupted run. [SEARCH-ONLY, single issue] — [tarpas/pytest-testmon#66](https://github.com/tarpas/pytest-testmon/issues/66)
- Nx `affected` (Nx 24 docs): git is used to find changed files; a task is selected if one of its `inputs` includes a changed file (task-based; project-based selection kept with `affected.legacy`). Default base is `main`, head is the working tree; set with `--base`/`--head` or `NX_BASE`/`NX_HEAD`. `--explain` prints why tasks are affected, as JSON with `--explain=reasons.json`. The page describes no record of past affected runs: it is a diff against a git ref, not a ledger. [FETCHED] — [nx.dev affected](https://nx.dev/docs/features/ci-features/affected)
- Turborepo `--affected`: equals `--filter=...[main...HEAD]` by default; overridable with `TURBO_SCM_BASE`/`TURBO_SCM_HEAD`. Package-level by default; task-level (using each task's `inputs` globs) only with `futureFlags.affectedUsingTaskInputs`. Shallow checkouts can make every package look changed. `--summarize` writes JSON to `.turbo/runs` with affected packages, executed tasks, timings and hashes. [FETCHED] — [turborepo.dev run reference](https://turborepo.dev/docs/reference/run)
- Vitest: `--changed [since]` runs tests affected by changed files (git-based). `--since-last-run` (Vitest 5.1.0+) records per-test dependencies and selects tests whose dependencies have a newer mtime than the last run; it needs the cache enabled. The `cache` option (default true) stores results so failed and slower files run first; `--last-failed` reads failures from that cache. Reporters include `json` and `junit`. [FETCHED] — [vitest.dev CLI](https://vitest.dev/guide/cli)
- Playwright Test: `--only-changed [ref]` runs test files changed between HEAD and ref (git only). `--last-failed` re-runs only the failures of the previous run, read from `<outputDir>/.last-run.json` (default under `test-results/`; path overridable via `--last-failed-file` or `PLAYWRIGHT_LAST_RUN_OUTPUT_FILE`). `--fail-on-flaky-tests` makes flaky tests fail the run. [FETCHED] — [playwright.dev test-cli](https://playwright.dev/docs/test-cli)
- Bazel (the full-hermetic model): a test result is cached when its inputs are unchanged. The `external` tag forces a test to always run regardless of `--cache_test_results`; `no-cache` disables local and remote caching; the `flaky` attribute reruns up to three times and fails only if all attempts fail. The page does not itself explain the input-hash keying. [FETCHED] — [bazel.build common-definitions](https://bazel.build/reference/be/common-definitions)
- pytest `--lf`/`--ff` store last-failed node ids in `.pytest_cache`. [KNOWLEDGE, not fetched this session]. Note that this repo's `bin/verify.sh` passes `-p no:cacheprovider`, which disables that cache, so `--lf` would do nothing there. [local file `bin/verify.sh`]
- Jest `--onlyChanged`/`--changedSince` use git/dependency graph like Vitest `--changed`. [KNOWLEDGE, not fetched; and Jest is not used in this repo]

### Inferences
- None of these keys a "passed" record to a commit or tree. They all answer "what might be affected by this diff", not "was this exact content already proven". They do not stop a paid E2E from re-running when a source file it indirectly depends on changes, and they also cannot know that a script needs live provider behaviour (testmon explicitly ignores network services).
- For BuildClub the only drop-in candidate is pytest-testmon for the 51 pytest files (free, local, would need `-p no:cacheprovider` left as is because testmon uses its own file). Estimated win is small because the whole suite is described as quick and free (US$0); this is an inference, not measured.

### Gaps
- Whether `node --test` has any change-based selection or cached results: not checked this session. [KNOWLEDGE only: I believe it has no result cache]
- testmon internals (checksum vs. fingerprint) not read.
- testmon behaviour with the repo's FastAPI + SQLite fixtures and non-Python inputs (fixtures JSON under `tests/fixtures/`): the docs say static files are not tracked, so a fixture edit would not invalidate tests that read it. That is a documented limitation, not tested here.

## 2. Content-hash caching of arbitrary commands: can a paid E2E command be skipped by input hash?

### Takeaway
Yes in principle: Turborepo, Nx and Bazel can cache any script by hashing declared inputs, and `git-test` caches pass/fail by git tree in git notes. But all of them hash only what you declare (and for build tools, assume determinism), so a paid E2E that depends on a live provider is only safe to skip if "inputs unchanged" is an acceptable proxy for "result unchanged". Of the options, `git-test` is the closest to "skip if passed at this tree" with the least setup, and it is a plain shell command that Claude Code and Codex can both call.

### Cited Findings
- Turborepo hashes a task's declared inputs (default: all non-gitignored files in the package) into a fingerprint; same fingerprint means the task body is skipped, outputs are restored and logs replayed. `inputs` narrows the hash; arguments after `--` are part of the hash. [FETCHED/SEARCH] — [turborepo.dev caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- Turborepo: "assumes that your tasks are deterministic"; the page does not address tasks calling external services. `"cache": false` / `--no-cache` disables writing; `--force` skips reading but still writes. `globalEnv` values feed the global hash, so changing a listed variable invalidates every task; `.env` files only count if added to `globalDependencies`. [FETCHED] — [turborepo.dev caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- Turborepo's pages did not say whether failed task runs are cached. [FETCHED, gap] — [turborepo.dev caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- Nx: a cache hit happens when a task's inputs match an existing entry; on a miss, Nx runs the task and stores terminal output and configured output files. Inputs can include env var values, runtime commands and external dependencies. Caching is enabled per target via `"cache": true` in `nx.json` `targetDefaults`. `--skip-nx-cache` ignores the cache for reads and writes. Whether non-zero exits are cached is not stated. [SEARCH-ONLY] — [nx.dev how caching works](https://nx.dev/docs/concepts/how-caching-works), [nx.dev inputs](https://nx.dev/docs/reference/inputs)
- Nx's run-commands cache guide URL I tried returned 404, so arbitrary-script caching specifics for Nx are unverified. [FETCHED, 404]
- `git-test` (Michael Haggerty): `git test add "<cmd>"` defines a test (stored in git config, runs under `sh -c`, exit 0 = pass); `git test run` tests HEAD or a range. Results, pass and fail, are saved permanently as git notes, keyed by the TREE that was tested, not the commit, so rewording or rebasing without changing content keeps results. Already-tested trees report the stored result unless `--retest`/`-f`; `--forget` drops a result; multiple named tests via `--test=<name>`. If the working copy is dirty the test runs but the result is NOT recorded. `prune` is listed as a future enhancement, not implemented. [FETCHED] — [github.com/mhagger/git-test](https://github.com/mhagger/git-test); announced on the Git mailing list January 2017 [SEARCH-ONLY] — [lore.kernel.org announce](https://lore.kernel.org/all/1341c01a-aca7-699c-c53a-28d048614bfe@alum.mit.edu/T/)
- A search snippet says git-test notes live under `refs/notes/test/<name>`; the README itself does not name the ref. [SEARCH-ONLY, conflicts in sourcing] — [awesome.ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Fmhagger%2Fgit-test)
- Latest activity of git-test: the search surfaced nothing newer than 2017 announcements; maintenance status unknown. [SEARCH-ONLY]
- Make/`just` stamps: the standard pattern is a stamp file whose mtime or content hash gates re-running. [KNOWLEDGE, no source fetched]. Stamp files are local (not shared across worktrees or machines) unless committed, and mtime-based stamps are fooled by branch switches and `git checkout`.

### Inferences
- `git-test` matches the "skip if already passed for this exact tree" requirement directly, with no config beyond one `git test add` per named test, and the tree key survives rebase/squash/amend. Its gaps for this repo: it records only pass/fail (no cost, no screenshot, no evidence URL), refuses to record from a dirty tree (agents often test before committing), tests the whole tree rather than only code each script depends on (any unrelated doc edit in the tree changes the tree hash and forces a re-run), and testing HEAD may check it out into a different working directory/detached HEAD for ranges. These last points are from the README's wording and my reasoning, not run.
- A narrower key is possible by hashing only the relevant paths (for example `git rev-parse HEAD:pivots/02-content/app/trend-finder/backend` or `git ls-tree` of a path subset), instead of the whole tree. This is the approach that would stop `docs/` edits invalidating a paid E2E. This is design inference; no source describes it for this use case.
- Build-tool caches (Turbo/Nx) would need a root `package.json` + `turbo.json`/`nx.json` added to a repo that has none for the e2e scripts, and would require declaring `inputs` for each e2e script. More setup than a ~30-line wrapper. Note too that they cache exit success plus declared outputs, not cost; real E2E that needs ports 8871/8872 and an isolated backend is a poor fit for "restore outputs from cache".

### Gaps
- Whether Turbo/Nx cache failed runs: not found. This matters for flaky or paid-failure cases.
- Whether git-test works well with linked worktrees (the repo uses worktrees) and Orca worktrees: untested.
- No evidence found of anyone using Turbo/Nx caching to skip paid external-API E2E specifically.

## 3. Recording results per commit: git notes, reports, dashboards, and what an agent can read from the CLI

### Takeaway
Git notes are the only per-commit store that lives in the repo, is readable offline with plain `git`, and is free. Notes are not pushed or fetched by default and not copied on rebase unless `notes.rewriteRef` is configured, so they must be set up deliberately. JUnit/JSON reporters give per-test detail but not commit binding. GitHub commit statuses/check runs give a commit-bound, `gh`-readable, shareable record but need a push and a network.

### Cited Findings
- Git notes default to `refs/notes/commits`; each change creates a commit on the notes ref (history inspectable with `git log -p notes/commits`). A custom namespace is chosen with `--ref=<name>` (a bare name gets `refs/notes/` prefixed); `GIT_NOTES_REF` or `core.notesRef` change the default. Notes are stored in the notes tree, so the annotated commit is not modified. [FETCHED] — [git-scm.com git-notes](https://git-scm.com/docs/git-notes)
- Rewrite behaviour: `notes.rewrite.<command>` (amend, rebase) defaults to true, BUT `notes.rewriteRef` has no default and must be set (e.g. `git config notes.rewriteRef refs/notes/commits`) or notes are not copied. `notes.rewriteMode` defaults to `concatenate`. [FETCHED] — [git-scm.com git-notes](https://git-scm.com/docs/git-notes)
- Merge strategies for notes: `manual` (default), `ours`, `theirs`, `union`, `cat_sort_uniq`; `cat_sort_uniq` suits an append-only log with one line per run. [FETCHED] — [git-scm.com git-notes](https://git-scm.com/docs/git-notes)
- Pushing/fetching notes is not covered by the manual page. The commands `git push origin refs/notes/<ref>` and `git fetch origin 'refs/notes/*:refs/notes/*'` came back from the fetch tool's own summary, labelled as general Git behaviour, not from the page. [FETCHED tool summary, not on the page; treat as KNOWLEDGE]
- Squash merges via a GitHub PR create a new commit with a new tree, so a notes entry on a branch commit would not attach to the squashed commit; with tree-keyed notes the tree may be identical if the PR diff is the whole difference, but this is my reasoning, not a sourced fact.
- Playwright/Vitest reporters: Vitest supports `json` and `junit` reporters with `outputFile` [FETCHED] — [vitest.dev CLI](https://vitest.dev/guide/cli). Playwright has a JSON reporter and `.last-run.json` [FETCHED for `.last-run.json`; JSON reporter itself KNOWLEDGE] — [playwright.dev test-cli](https://playwright.dev/docs/test-cli). `node --test` can emit TAP/JUnit/spec reporters [KNOWLEDGE, not fetched].
- Turborepo `--summarize` JSON in `.turbo/runs` includes hashes and timings, a ready-made machine-readable run record if Turbo were used. [FETCHED] — [turborepo.dev run reference](https://turborepo.dev/docs/reference/run)
- GitHub check runs: write access via the REST API is only available to GitHub Apps; OAuth apps and normal users can read but not create them. Check runs carry title, summary, details and annotations. [SEARCH-ONLY, GitHub docs snippet] — [docs.github.com check runs](https://docs.github.com/de/rest/checks/runs)
- Commit statuses (context label, optional target URL, description, several per commit with different contexts) are the simpler alternative; the endpoint parameters were confirmed only via a third-party doc and the permission model is not confirmed in sources found. [SEARCH-ONLY, third-party] — [agpt.co statuses](https://agpt.co/docs/integrations/block-integrations/statuses)
- Allure and other dashboards: not researched this session; they are results-viewing UIs, not skip-decision stores. [GAP]

### Inferences
- A tiny namespaced notes ref (for example `refs/notes/tests`) with one JSON line per run (test name, tree/path-hash, result, cost USD, evidence path/URL) plus `notes.<name>.mergeStrategy=cat_sort_uniq` would be readable by Claude Code and Codex with `git notes --ref=tests show <sha>`. The repo's rule is "do not commit or push unless asked", so a notes ref that stays local is consistent, but then the record is lost on another machine unless pushed. That is a policy decision for the owner.
- GitHub commit statuses require a push and a token, so they are not a fit for local free/paid test memory in this repo's current no-auto-push policy, though they are good if CI ever runs the free tests. Reasoning, not sourced.

### Gaps
- GitHub official commit-status docs not read (only third-party).
- No fetched source on notes behaviour across GitHub squash/rebase merges.
- Allure, ReportPortal and similar dashboards not examined.

## 4. AI-agent-specific tooling: hooks, MCP servers, "verification ledger" projects

### Takeaway
Claude Code and Codex both have PostToolUse-style hooks that can log every Bash test command; the hook payloads differ in how they expose exit code, so a hook must be tested per tool. A few brand-new (2026) community projects (ProofRun, claimstamp, AgentOps) bind a test result to a commit hash, but all are small, unverified in maturity, and I could not confirm any provides "skip rerun when receipt valid". A ~30-line hook + shell wrapper is the lowest-risk approach.

### Cited Findings
- Claude Code hooks: PostToolUse runs after a tool succeeds; PostToolUseFailure runs when a tool that started executing fails. Matchers accept an exact tool name or a list (`Bash`, `Edit|Write`) or a JS regex. An `if` field uses permission-rule syntax such as `Bash(npm test *)` so a hook only runs for matching commands. Hook types: command, http, mcp_tool, prompt, agent. [FETCHED] — [code.claude.com hooks](https://code.claude.com/docs/en/hooks)
- Claude Code PostToolUse input includes `tool_name`, `tool_input` (for Bash: `command`, `description`, `timeout`), `tool_use_id`, `session_id`, `cwd`, `duration_ms`. The documented Bash `tool_response` is an object with `stdout`, `stderr`, `interrupted`, `isImage` — no exit code field is documented. [FETCHED] — [code.claude.com hooks](https://code.claude.com/docs/en/hooks)
- Claude Code PostToolUseFailure example for Bash `npm test` exiting 1: input has `error: "Exit code 1\n..."`, `is_interrupt`, `duration_ms`, and no `tool_response`. The doc says to key on the `Exit code N` first line. Whether a non-zero Bash exit goes to PostToolUseFailure is implied by that example but not stated outright. [FETCHED] — [code.claude.com hooks](https://code.claude.com/docs/en/hooks)
- Codex hooks (docs reachable via redirect from developers.openai.com): events include PreToolUse, PostToolUse, SessionStart, Stop and others; shell commands are matched as `Bash` for PreToolUse/PostToolUse; PostToolUse "also runs for Bash commands that exit with a non-zero status"; config in `~/.codex/hooks.json`, `~/.codex/config.toml`, `<repo>/.codex/hooks.json` or `<repo>/.codex/config.toml` (project hooks only load when the project is trusted); non-managed hooks must be reviewed/trusted via `/hooks` before they run. `tool_response` is "tool-specific output" with no documented exit-code field. Hooks are on by default (`codex_hooks` flag is a deprecated alias). The page warns hooks are "a useful guardrail, not a complete enforcement boundary". [FETCHED] — [learn.chatgpt.com/docs/hooks](https://learn.chatgpt.com/docs/hooks) (redirected from developers.openai.com/codex/hooks)
- An earlier April 2026 third-party guide described Codex hooks as experimental behind a `codex_hooks` feature flag. This conflicts with the official page saying hooks are on by default; the official page is newer in design and primary. [SEARCH-ONLY] — [codex.danielvaughan.com](https://codex.danielvaughan.com/2026/04/15/codex-cli-hooks-complete-guide-events-policy-patterns/)
- A user issue report claims Claude Code PostToolUse hooks in settings.json were not reliably invoked for Bash calls (trace file empty). Single report, unconfirmed, issue date not shown. [SEARCH-ONLY] — [claudeissues.com #36310](https://claudeissues.com/issue/36310-posttooluse-hooks-not-invoked-for-bash-tool-calls)
- ProofRun: binds a command's result (such as a test suite) to a git commit hash plus a hash of uncommitted changes; status flips to STALE when the code changes; no LLM calls, offline, compares argv exactly; MIT; repo `github.com/yebiguo/ProofRun`; posted August 16, 2026. Storage location, CLI and any skip-if-valid behaviour were NOT stated on the page. [FETCHED, third-party summary page] — [zeli.app ProofRun](https://zeli.app/en/story/49316605); repo [yebiguo/ProofRun](https://github.com/yebiguo/ProofRun) not read
- claimstamp (PyPI 0.1.0): logs each verification command in a local hash-chained file with exit code and output hashes; tamper-evident only; agents are told to run verification through its wrapper and cite the stamp. [SEARCH-ONLY, my fetch of the PyPI page failed] — [pypi.org/project/claimstamp](https://pypi.org/project/claimstamp/0.1.0/)
- AgentOps (boshu2/agentops): appends reviewer verdicts to a hash-chained ledger in the repo; a change without a verdict counts as not done. [SEARCH-ONLY] — [github.com/boshu2/agentops wiki](https://github.com/boshu2/agentops/wiki)
- agentless-mcp: an MCP server whose SQLite cache is keyed by a git `tree_oid` generation stamp ("cache only what a hash can invalidate"); read-only code navigation, test execution happens CLI-side. It is the nearest design to the need but is not a test-result cache. [SEARCH-ONLY] — [pypi.org agentless-mcp 0.3.0](https://pypi.org/project/agentless-mcp/0.3.0/)
- test-unslop-mcp `run_tests` auto-detects runners, treats "exit 0 but zero tests executed" as FAIL; no caching. omni-dev-fusion's smart test runner skips tests for docs-only changes, not hash-based. [SEARCH-ONLY] — [glama.ai test-unslop-mcp](https://glama.ai/mcp/servers/fikrifirmanf/test-unslop-mcp/tree), [skills.sh testing_protocol](https://skills.sh/tao3k/omni-dev-fusion/testing_protocol)
- A search for a mainstream MCP server or Claude Code skill that implements "skip tests already passed at this tree hash" found none. [SEARCH-ONLY, negative result]

### Inferences
- Hooks are an audit trail, not a gate. They log what ran, but they cannot make the agent consult the log before running. The "skip" has to come from a wrapper command the agent is told (via AGENTS.md/CLAUDE.md) to use, or from a PreToolUse hook that blocks a paid command when a valid record exists. Both Claude Code and Codex support PreToolUse on Bash, so one shell script can serve both; the stdin JSON fields differ slightly so the script should read only `tool_input.command` (present in both, per the docs fetched).
- Because neither doc defines an exit code for the success path, logging results reliably from a hook is shakier than wrapping the command: a wrapper such as `bin/tested.sh <name> -- <cmd>` knows the real exit code, cost it reads from the script's output, and the tree hash, and works identically in Claude Code, Codex, a human terminal and CI. This is design reasoning.
- The three community ledgers are less than three months old (ProofRun Aug 2026) and unaudited by me; for a 1-person project a local script is likely safer than depending on them. Judgement, not sourced.

### Gaps
- ProofRun repo, claimstamp PyPI page and AgentOps README were not read directly; their features are second-hand.
- Exact Codex `tool_response` schema (the page points to schemas in the Codex GitHub repo).
- Claude Code hook behaviour for backgrounded Bash commands (`run_in_background`) was not checked; long E2E runs may be run that way.
- No fetched evidence of a Claude Code skill that implements a test ledger.

## 5. Recording cost and evidence alongside results

### Takeaway
No tool researched has a native "cost" or "evidence" field; they record pass/fail, exit code, timings and (Turbo) hashes. Cost and evidence therefore have to be written by the test script itself and stored in the same record as the result. The repo's `docs/test-log.md` already has Cost and Evidence columns, which is the right shape.

### Cited Findings
- git-test stores only pass/fail per tree per named test. [FETCHED] — [github.com/mhagger/git-test](https://github.com/mhagger/git-test)
- Git notes can hold arbitrary text or a blob (the manual's example stores a build artifact as a note via `git notes --ref=built add --allow-empty -C "$blob" HEAD`), so a JSON line with cost and evidence paths can be attached. [FETCHED] — [git-scm.com git-notes](https://git-scm.com/docs/git-notes)
- Turborepo `--summarize` records hashes, timings and cached files per task; no cost field. [FETCHED] — [turborepo.dev run reference](https://turborepo.dev/docs/reference/run)
- Check runs support title, summary, details and annotations; commit statuses support a `target_url`; both can point at an Artifact or log URL. [SEARCH-ONLY] — [docs.github.com check runs](https://docs.github.com/de/rest/checks/runs)
- claimstamp records the exit code and hashes of command output (hash of the output, not the output itself). ProofRun's receipt binds to commit + dirty-diff hash. Neither is documented with cost fields. [SEARCH-ONLY / FETCHED third-party] — see section 4
- Local: `docs/test-log.md` in this repo already records Date, Branch @ sha, What ran, Result, Cost (Mock / US$ amounts) and Evidence (PR number, report path, Artifact URL). [local file]

### Inferences
- Suggested minimum record per run (my design, not sourced): `{name, tree_or_path_hash, head_sha, dirty:false, result, cost_usd, provider_calls, started_at, evidence:[paths/URLs], runner_version}`, with screenshots stored under a gitignored folder and referenced by path, and only a small pointer (path or Artifact URL) in git. Keep large artifacts out of notes.
- Tying evidence paths to the hash lets a later session verify the file still exists before trusting the record.

### Gaps
- No source found on a convention for storing screenshot/video evidence next to a test record in git notes.
- No source on provider-side cost reporting that could be read back automatically (fal, Gemini, Apify billing APIs were not researched, and calling them would be paid/auth'd).

## 6. Ranking for BuildClub, shared Claude Code / Codex use, and pitfalls

### Takeaway
Ranked by fit (least setup, works from plain shell for both agents): (1) a thin wrapper script plus tree/path-hash-keyed record, either via `git-test` or a ~30-line `bin/tested.sh` that writes git notes or a local JSONL; (2) pytest-testmon for the free pytest half only; (3) hooks as an audit log layered on top; (4) Turbo/Nx/Bazel only if the project becomes a real monorepo; (5) community ledgers (ProofRun, claimstamp, AgentOps) as optional, unvetted. The conclusion is an inference from the findings above, not a sourced fact.

### Cited Findings
- Ranking inputs (all cited above): git-test gives tree-keyed pass/fail caching from one `git test add` + `git test run`, but not for dirty trees and with no cost/evidence field [FETCHED] — [github.com/mhagger/git-test](https://github.com/mhagger/git-test).
- Both Claude Code and Codex can run PostToolUse/PreToolUse hooks matching `Bash`, and both expose `tool_input.command` [FETCHED] — [code.claude.com hooks](https://code.claude.com/docs/en/hooks), [learn.chatgpt.com/docs/hooks](https://learn.chatgpt.com/docs/hooks).
- Pitfall, false skips from undeclared inputs: Turbo hashes only declared inputs/env and assumes determinism [FETCHED] — [turborepo.dev caching](https://turborepo.dev/docs/crafting-your-repository/caching); testmon does not track static files or network services [FETCHED] — [testmon.org](https://testmon.org/).
- Pitfall, dirty tree: git-test runs but does not record results from a dirty working copy [FETCHED] — [github.com/mhagger/git-test](https://github.com/mhagger/git-test); ProofRun handles it by also hashing uncommitted changes [FETCHED, third-party] — [zeli.app ProofRun](https://zeli.app/en/story/49316605).
- Pitfall, flakiness: Bazel's `flaky` retries up to 3 times and its docs advise against relying on it; Playwright offers `--fail-on-flaky-tests` [FETCHED] — [bazel.build](https://bazel.build/reference/be/common-definitions), [playwright.dev](https://playwright.dev/docs/test-cli). Caching a flaky pass freezes a lucky pass; this is an inference.
- Pitfall, hook reliability: one unconfirmed report of PostToolUse not firing for Bash; Codex docs say hooks are not a complete enforcement boundary and non-managed hooks need trusting before they run [SEARCH-ONLY / FETCHED] — [claudeissues.com #36310](https://claudeissues.com/issue/36310-posttooluse-hooks-not-invoked-for-bash-tool-calls), [learn.chatgpt.com/docs/hooks](https://learn.chatgpt.com/docs/hooks).
- Pitfall, shallow clones make affected-only tools treat everything as changed [FETCHED] — [turborepo.dev run reference](https://turborepo.dev/docs/reference/run).
- Pitfall, git notes do not travel or survive rebase by default (`notes.rewriteRef` has no default) [FETCHED] — [git-scm.com git-notes](https://git-scm.com/docs/git-notes).

### Inferences
- False-skip risks specific to BuildClub paid E2E (reasoning from the repo's setup): (a) the result depends on the provider's live behaviour (fal/Gemini model or API change), which no content hash sees, so the record should carry an expiry (for example re-run paid tests if older than N days or when `gen_models.json` / provider SDK version changes) and the key should include `gen_models.json`, `requirements.txt`, `package-lock.json`, relevant env var NAMES (never values) and the test script itself; (b) E2E depends on fixtures, `seed-library.json` and the Chrome / `playwright-core` version outside the repo (`PW_CORE` defaults to a path under `~/.hermes`), so include the playwright-core version in the key; (c) a mock-mode pass must never satisfy a paid-mode requirement, so record mode (Mock vs Paid) as part of the key, as `docs/test-log.md` already distinguishes them; (d) cache only PASS for paid tests, never FAIL, so a failure is always retried after a fix; (e) the runner must refuse to skip when the tree is dirty in covered paths.
- Same-for-both-agents design: a bash wrapper in `bin/` called as `bin/tested.sh <name> -- <command>` that computes a path-scoped hash, checks the ledger, prints "SKIP (passed at <hash> on <date>, cost <x>, evidence <y>)" or runs the command and appends the result. Agents just run shell commands, so the same file works under Claude Code, Codex and by hand; hooks are optional extras.
- Using `git-test` as-is is the fastest start, but would need the path-scoped variant if unrelated edits (docs/, research/) should not invalidate E2E.

### Gaps
- Not measured: how long the repo's free tests actually take, so the value of testmon vs. just running everything is not quantified.
- Not tested: any of the above in this repo; no commands were run (per instructions: no tests run, no installs, no paid calls, ports 8871/8872 untouched).
- Nx run-commands cache doc page was unreachable, Allure not researched, GitHub official commit-status docs not read.
