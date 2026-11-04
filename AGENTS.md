# AGENTS.md

Project-specific instructions for working in the BuildClub repo.
Shared by every AI tool: Codex reads this file directly, and `CLAUDE.md` imports it for Claude Code.

## Before you start

- Read `PROJECT_CONTEXT.md` before doing any work. It is the source of truth for what BuildClub is and where it stands.

## Where things go

| Content | Location |
| --- | --- |
| Research (competitors, user research, market notes) | `research/` |
| Product decisions and documentation (PRD, scope, decision log) | `docs/` |
| Application code | `app/` |

- Avoid creating files in the repo root. Only add a root-level file when it is truly project-wide (e.g. config that tools expect at the root).
- Prefer adding to an existing file over creating a new one when the content fits.

## Editing existing content

- Preserve useful existing content. Revise or extend rather than overwrite or delete.
- Before changing a major product decision (for example in `docs/PRD.md`, `docs/mvp-scope.md`, or `docs/decision-log.md`), flag any contradictions with existing docs or `PROJECT_CONTEXT.md` and confirm with me first.

## Research standards

- Use current sources, and note the date accessed or published.
- Cite sources for every research claim (link plus title or publisher).
- Call out when information may be outdated or unverified.

## Git

- Do not commit or push unless I explicitly ask.
- Before any commit, show `git status` and summarize the changes.

## Repo and pull requests

- Work happens in `veralynchong/BuildClub` (`origin`). Branch off `origin/main`, push the branch there, and open the PR against `origin/main`. The `minchiaHuang/BuildClub` fork is no longer the working repo.
- Never push directly to `main` and never force-push.
- Open the PR, then stop. Merge only when the user explicitly says "merge" for that PR. "Finish the PR" means get it ready (updated, verified), not merged.
- Appearance and design changes still need alignment with Veralyn.

## Product scope

- Remake: desktop only (1440 wide). Do not add mobile or 390px work, phone screenshots, or mobile checks unless the user asks. If a plan still lists a mobile check, mark it waived, not failed.
- The product targets the Australian market in English. Video content (spoken takes, captions, AI voiceover) only needs English; pick an English (Australian if available) voice. Chinese matters only as the zh-Hant UI language, which must keep working.
- "Figma" in this project means the Remake full-flow-map file: https://www.figma.com/design/3qLG6XMnJ4kxKT6sWQFH0v (node 96:2).

## Paid services

Quote the cost and a cap before every paid run, and report what it spent afterwards.

- Apify: the free quota is nearly used up until it resets on the 26th of each month (11:00 Sydney). Use sample or cached data (`server/cache/`, `--demo-data`) for development and debugging; run live searches only for real tests or demos, and ask first. One search makes 2–3 runs at about US$0.13 each.
- fal.ai: prepaid credit, small balance. Keep per-run caps tight (server caps: image 0.12, video 0.20) and mention the remaining balance after runs. Storyboard images use Seedream 4.5 on fal.
- Gemini: free tier only. Do not use or test it until the user says billing is on.

## Browser testing

- Close every tab and browser context you opened before finishing (`await ctx.close()` in a `finally` block), and stop any backend you started.
- Never close another session's browser.
- Give UI testing to as few agents as possible; backend-only tasks never open a browser.
