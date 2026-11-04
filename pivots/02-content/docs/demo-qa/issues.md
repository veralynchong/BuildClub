# Demo QA issues (Demo Night, Sat 2026-11-07)

P0 = breaks a live demo · P1 = looks bad / confuses · P2 = minor.
Status: `open`, `fixed @sha`, `wontfix (why)`. Screenshots sit in the dated folders next to this file.
Branch under test: `chore/demo-integrate-main-1104` (PR #49).

| # | P | Page | Problem | Screenshot | Suspected file | Status |
|---|---|---|---|---|---|---|
| 1 | P1 | Research → Plans | Picking a demo-data row ("★ Picked") creates the idea but Plans stays empty: `shownIdeas` hides ideas whose video is not live, and demo rows use sample ids. Only live-search rows appear. A demo that picks a pre-filled row looks broken. | 2026-11-04-ai-pass/03-plans-picked-demo-row-never-appears.png | src/App.tsx:896 | open |
| 2 | P1 | Research | Expanding a row makes the table wider than the screen (page 1477 px at 1440); Status select and due date clipped, "Not picked" control needs side-scroll. | 2026-11-04-ai-pass/01-research-expanded-row-clipped-right.png | `.rs-table-wrap` CSS | open |
| 3 | P1 | Plans after send | After "Send to Annie" the plan card stays "Approved, ready to film"; "Waiting for approval" shows 0. Editor gives no link to where the review lives. | 2026-11-04-ai-pass/08-plans-cut-sent-but-card-still-ready-to-film.png | Plans board status mapping | open |
| 4 | P1 | Plan page | Three overlapping entries: teammate's "Open planning board" (shot graph), our "Open the canvas", and "Make the video". Planning board has a stub edge not reaching node 2; "Change the board" panel shown though board is view-only. | 2026-11-04-ai-pass/05-planning-board-duplicates-canvas-and-broken-edge.png | PlanScreen.tsx, board/ | open — needs a product call with the teammate |
| 5 | P1 | Plan / Canvas / export | Video with no caption is titled "TikTok video"; hook becomes "Did you know tikTok video could look like this?", and that casing flows into canvas prompts and the exported caption. | 2026-11-04-ai-pass/04-plan-placeholder-title-and-hook-casing.png | hook template / title fallback | open |
| 6 | P2 | Find ideas | "SEARCHES THAT FIT BUSY MUMS…" label squeezed into a narrow column; "SEARCHING FOR" chip shows "tofu" for query "tofu recipe". | 2026-11-04-ai-pass/02-find-ideas-section-label-squeezed.png | find/ | open |
| 7 | P2 | Canvas Run all | Canvas disappears behind the price dialog (blank backdrop); dialog shows only a total. | 2026-11-04-ai-pass/06-canvas-runall-dialog-blank-backdrop.png | canvas Run all dialog | open |
| 8 | P2 | Editor | Canvas toast "Put in the timeline · Open editing" stays and covers the Clip sound slider; "Shot 1" wraps to two lines. | 2026-11-04-ai-pass/07-editor-stale-toast-over-clip-sound.png | toast / editor.css | open |
| 9 | P2 | Plan page | No h1 on the plan page (title is not a heading) — accessibility, and breaks `e2e/polish-a-shell.cjs`. | 2026-11-04-ai-pass (a-shell zz-error in scratchpad) | PlanScreen.tsx | open |
| 10 | P1 | Canvas | "核准並執行" on nodes that already have results only marks them stale and says "沒有要跑的" — reads as "nothing happened". Known since 2026-11-04 (spec §9.2.5). | — | canvas agent approve | open |
