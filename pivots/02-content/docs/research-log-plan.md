# Research tab (reference-video sheet) + Plans board: plan

_Agreed with the founder on 2 Nov 2026. Branch: `feature/research-log` (from `feature/port-founder-design`). Front end only: rows are kept in the browser; the backend is the teammate's area._

## Why

Daphene (Mercif) keeps her research by hand in an Excel sheet: account, platform, keywords, followers, views and the viral video link for each reference video. Her "1-to-10" rule (lots of views on a small account) is how she qualifies a video. See `research/interviews/2026-10-21-daphene-summary.md`. A newer interview (this week) isn't in the repo yet.

## Two tabs, two jobs

| Tab | Job | Holds |
| --- | --- | --- |
| **Research** | Decide *what* to make | Every reference video worth noting, per client (many rows) |
| **Plans** | *Make* it | Only what the team decided to make: Still planning → Waiting for approval → Approved, then In production |

Sidebar (per client): Home · Find ideas · **Research** · **Plans**. Each client (picked from the dropdown) has its own Research and its own Plans.

## Flow

1. **Find ideas:** search (e.g. "tofu"), press **Save to Research** on the videos worth keeping.
2. **Research:** compare the rows, press **Plan it** on the one to copy. This makes a plan in Still planning and opens it.
3. **Plans:** write the shots, due date and note to the manager, send for approval, then film, edit and post.

Rows not planned stay in Research as "Not planned".

## The Research sheet

- **Grouped by video:** one group per video the client is paying for ("Video 1 · Best tofu recipe"), closed by default. Closed, a group shows only its number, title, due date and a × to remove it. Column titles show only inside an open group. **+ Add video** adds one with its number, title, due date and any reference links.
- **Columns:** Account (opens the video), Platform, Followers, Views, Keywords, Hook, Other info, Status. (Views ÷ followers and "Move to" were dropped on 2 Nov 2026 to keep the sheet simple; the CSV matches.)
- Filled in automatically when saved from Find ideas. Numbers are a copy from the day the video was logged.
- **Editable in the cell:** Keywords, Hook, Other info.
- **Status is a dropdown:** Not picked / Backup / ★ Picked (agreed 2 Nov 2026). Picking makes the plan in Still planning without leaving the page and moves the row to the top of its video; the plan's stage shows beside it and opens the plan. Picking another row in the same video, or un-picking, deletes that plan and asks first. Once a plan is sent for approval the dropdown locks: approval and later stages still happen only on Plans, with the manager.
- Sort by any column; filter by platform and status; search.
- **Add from link:** for videos found outside the app (e.g. on a phone). Paste a URL and type the numbers.
- **Export CSV.**
- On phones the table becomes a list of cards.
- Every existing plan gets a row, so the sheet always includes what the team is making.
- Sample data: made-up rows per sample client. No Excel import yet.

## Elsewhere

- Find ideas (and the Dashboard's "What should … film next?") save to **Research**, not Plans.
- Plans board: unchanged, plus a small "From research" link on cards.

## Build (subagents)

Shared contract written first: `src/lib/research.ts` (type + helpers), `src/state.ts` `useResearch`, `src/components/research/ResearchScreen.tsx` (props), `src/lib/strings/research.ts`, `src/styles/research.css`, `src/data/sampleResearch.ts`.

| Agent | Owns | Work |
| --- | --- | --- |
| A: Data | `lib/research.ts`, `data/sampleResearch.ts`, `unit/research.test.mjs` | Sample rows, helpers, tests |
| B: Research tab | `components/research/*`, `styles/research.css`, `lib/strings/research.ts` | The sheet UI |
| C: Wiring | `App.tsx`, `Sidebar.tsx`, Find ideas, Dashboard, Plans card, shell/find/home/plan strings | Tab, buttons, actions |
| D: Figma | Remake UI file | Mirror the Research tab, after B |

Then: merge, code review, browser check, founder review before any commit.
