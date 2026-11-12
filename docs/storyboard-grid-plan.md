# Storyboard Grid (version A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar's Canvas with a Boords-style Storyboard screen: one 9:16 card per shot in a 3/4/6-column grid, each card regenerated from its own prompt, plus a Shot list tab for the camera operator.

**Architecture:** Front-end only on top of what exists. Every plan shot already has a `storyboard` canvas node (`backend/canvas.py` reconcile) whose generations are the shot's frame versions, so the grid reads `GET /api/ideas/{id}/canvas`, writes prompts and the chosen version back with `PUT .../canvas`, and regenerates with `POST .../gen` — the same calls `CanvasScreen` makes. Camera fields live on the plan's `Shot` (two new optional fields) and save through the existing ideas save. CanvasScreen stays, reachable from the Storyboard toolbar.

**Tech Stack:** React 19 + TypeScript (Vite), FastAPI + Pydantic backend, `node --test` unit tests in `unit/`, pytest in `backend/tests/`, Playwright E2E via a subagent.

**Spec:** `research/storyboard-ui-2026-11-12.md` (research and recommendation) and the chosen mockup, version A, https://claude.ai/artifact/PZ6Qr37mkuDCZAiwCRy5Zj (source copy: `docs/design-review/storyboard-grid-mockup.html`, added in Task 1). Paths below are relative to `pivots/02-content/app/trend-finder/` unless they start with `docs/` or `bin/`.

## Decisions taken for this plan (2026-11-12, reversible)

1. **Per-shot video is not in this plan.** The card has no "make video" button yet; Canvas still makes videos.
2. **Line and description are read-only on the Storyboard.** An approved plan is locked (Plan page); only camera fields, length and prompt are edited here. A tooltip says to change the line on the Plan page.
3. **Generation needs an approved plan** (the backend rule `workspaces.editable`). An unapproved plan opens the grid read-only with a notice.
4. **Sidebar:** the "Canvas" item becomes "Storyboard". Canvas opens from a "Canvas (advanced)" button in the Storyboard toolbar; the guided tour keeps opening Canvas directly.
5. **Beta (`feat/beta-launch`) is not touched.** Work happens on `feat/storyboard-grid` off `feat/canvas-restore`; PR base `feat/canvas-restore`, draft, never merged by us.
6. **Prompt default:** an empty `node.data.prompt` means "automatic" — built from the shot each time. Typing makes it the shot's own prompt; "Reset to automatic" clears it.

## Global Constraints

- English UI copy and Chinese copy both go in `src/lib/strings/*.ts` (`en` and `zh` blocks); no hard-coded strings in components.
- Styling uses only the Remake tokens in `src/styles/theme-remake.css` (blue = the one main action, violet = active nav, pills, 12px cards, no shadow unless it floats); new CSS in a new `src/styles/storyboard-grid.css`.
- No new npm or pip dependencies.
- Every paid action shows its price on the button (`priceLabel` from `src/lib/canvas/graph.ts`) and the budget left (`getBudget`). Changing a field never spends money.
- Desktop only (no 390px work); video content English only.
- `bash bin/verify.sh` must be GREEN at the end of every task (full suite ≈ 1250 tests).
- Commits: `<type>(storyboard): ...`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **A plan whose canvas has no storyboard node for a shot** (old plan, shot added later): the card shows the shot with "No frame yet" and a disabled regenerate, never crashes. → test in Task 2 (`gridCells` with a missing node).
2. **Two tabs / a stale canvas version:** `putCanvas` throws `StaleCanvas`; the screen reloads the canvas and keeps the user's typed prompt in the textarea. → test in Task 4 (`savePrompt` retries after reload).
3. **Budget exhausted / generation fails:** the server answers 4xx or the job ends `failed`; the card shows the error and the previous version stays chosen. → tests in Task 2 (`gridCells` failed state) and Task 4.
4. **A shot removed from the plan** (`shot` node `data.removed`): it disappears from grid and shot list. → test in Task 2.
5. **Unapproved plan:** regenerate, prompt and field inputs are disabled; the board still renders. → test in Task 3 (`StoryboardGrid` readOnly) and E2E flow E4.

---

### Task 1: Shot gets `lens` and `gear`

**Files:**
- Modify: `backend/models.py:141-167` (class `Shot`)
- Modify: `src/types.ts:63-85` (interface `Shot`)
- Modify: `src/lib/shots.ts` (lists and labels next to `FRAMINGS`)
- Modify: `src/lib/strings/shots.ts` (labels)
- Create: `docs/design-review/storyboard-grid-mockup.html` (copy of the mockup source from the scratchpad `storyboard-mockups.html`)
- Test: `backend/tests/test_shot_fields.py`, `unit/shotFields.test.mjs`

**Interfaces:**
- Produces (Python): `Lens = Literal["16mm","24mm","35mm","50mm","85mm","100mm"]`, `Gear = Literal["tripod","gimbal","handheld","slider"]`; `Shot.lens: Optional[Lens] = None`, `Shot.gear: Optional[Gear] = None`.
- Produces (TS): `type Lens`, `type Gear`; `Shot.lens?: Lens`, `Shot.gear?: Gear`; in `src/lib/shots.ts`: `LENSES: Lens[]`, `GEARS: Gear[]`, `gearLabel(v: Gear): string` (lens shows as is).

- [ ] **Step 1: Write the failing tests**

```python
def test_shot_keeps_lens_and_gear():
    s = Shot(time="0-2s", shot="Loaf out of the oven", lens="50mm", gear="tripod")
    assert s.lens == "50mm" and s.gear == "tripod"
    assert Shot(**s.model_dump()).lens == "50mm"          # survives a save/load round trip

def test_shot_rejects_unknown_lens():
    with pytest.raises(ValidationError):
        Shot(time="0-2s", shot="x", lens="70mm")

def test_old_shot_without_fields_loads():
    assert Shot(time="0-2s", shot="x").lens is None
```

```js
test('lens and gear lists match the backend', () => {
  assert.deepEqual(LENSES, ['16mm', '24mm', '35mm', '50mm', '85mm', '100mm'])
  assert.deepEqual(GEARS, ['tripod', 'gimbal', 'handheld', 'slider'])
  assert.equal(typeof gearLabel('gimbal'), 'string')
})
```

- [ ] **Step 2: Run** `cd backend && ../.venv/bin/python -m pytest tests/test_shot_fields.py -q` and `node --test unit/shotFields.test.mjs` — expect FAIL (unknown field ignored / import missing).
- [ ] **Step 3: Implement** the types, fields, lists and `shots.gear.*` labels (en: Tripod, Gimbal, Handheld, Slider; zh: 腳架、穩定器、手持、滑軌).
- [ ] **Step 4: Run** both tests — PASS. Run `bash bin/verify.sh` — GREEN.
- [ ] **Step 5: Commit** `feat(storyboard): shots carry a lens and camera gear`.

---

### Task 2: Grid model (`src/lib/shotGrid.ts`)

Pure functions; no React, no fetch.

**Files:**
- Create: `src/lib/shotGrid.ts`
- Test: `unit/shotGrid.test.mjs`

**Interfaces:**
- Consumes: `CanvasDoc`, `CanvasNode`, `Generation` (`src/lib/canvas/types.ts`); `versionsOf`, `pendingGen`, `failedGen`, `selectedGen`, `genStarted`, `genFinished` (`src/lib/canvas/graph.ts`); `Shot`, `Lens`, `Gear` (Task 1).
- Produces:
  - `interface GridCell { shot: Shot; index: number; nodeId: string | null; versions: Generation[]; shown: Generation | null; pending: Generation | null; failed: Generation | null; prompt: string; auto: boolean; changed: boolean }`
  - `framePrompt(shot: Shot): string`
  - `frameNodeOf(doc: CanvasDoc, shotId: string): CanvasNode | null` — the `storyboard` node with that `shotId` and `data.primary`, else the first `storyboard` node with that `shotId`, else null.
  - `gridCells(doc: CanvasDoc, shots: Shot[], gens: Generation[]): GridCell[]` — skips shots whose `shot` node has `data.removed`; `prompt` = node's own prompt if non-blank (`auto: false`) else `framePrompt(shot)` (`auto: true`); `changed` = `shown !== null && (shown.inputs.prompt ?? '') !== prompt`.
  - `setPrompt(doc: CanvasDoc, nodeId: string, prompt: string | null): CanvasDoc` — null or blank deletes `data.prompt`.
  - `chooseVersion(doc: CanvasDoc, nodeId: string, genId: string): CanvasDoc` — sets `data.selected`.
  - `stepVersion(cell: GridCell, dir: -1 | 1): string | null` — id of the previous/next *done* version, null at the ends.
  - `patchShot(shots: Shot[], index: number, patch: Partial<Pick<Shot, 'framing' | 'angle' | 'movement' | 'lens' | 'gear' | 'time'>>): Shot[]`
  - `cameraTag(shot: Shot): string` — set parts joined with ` · ` in the order framing, angle, movement, lens, using the existing labels; `''` when none.

- [ ] **Step 1: Write the failing tests** (`unit/shotGrid.test.mjs`), each with a small inline doc of `shot` + `storyboard` nodes:
  - `framePrompt` of `{ shot: 'Hands fold dough', framing: 'close_up', angle: 'eye_level', movement: 'push_in', lens: '35mm' }` equals `'Vertical 9:16 video frame, photographic, natural light. Hands fold dough. Camera: close up, eye level, push in, 35mm lens. No text, no captions.'`; without camera fields it has no `Camera:` part.
  - `frameNodeOf` prefers the `primary` node over an earlier non-primary one; returns null for an unknown shot id.
  - `gridCells`: a shot with no storyboard node gives `nodeId: null, versions: []`; a removed shot is skipped; own prompt gives `auto: false`; a done version made with a different prompt gives `changed: true`; a newest failed version gives `failed` set and `shown` still the earlier done one; a running version gives `pending`.
  - `setPrompt(doc, id, '  ')` removes `data.prompt`; `chooseVersion` sets `selected`; neither mutates its input (`assert.notEqual` on node objects, original unchanged).
  - `stepVersion` skips failed versions and returns null past the first/last.
  - `patchShot` changes only the given index and fields; `cameraTag` of the shot above is `'Close-up · Eye level · Push-in · 35mm'` in English (use whatever the existing `shots.framing.close_up` etc. labels are — read them, assert against them).
- [ ] **Step 2: Run** `node --test unit/shotGrid.test.mjs` — FAIL (module missing).
- [ ] **Step 3: Implement** `src/lib/shotGrid.ts`.
- [ ] **Step 4: Run** the test — PASS; `bash bin/verify.sh` — GREEN.
- [ ] **Step 5: Commit** `feat(storyboard): grid model for shot frames, prompts and versions`.

---

### Task 3: `StoryboardScreen` — load, grid, cards, toolbar

**Files:**
- Create: `src/components/storyboard/StoryboardScreen.tsx` (data loading, toolbar, tabs; ≤ 250 lines)
- Create: `src/components/storyboard/GridCard.tsx` (one card)
- Create: `src/styles/storyboard-grid.css` (imported from `StoryboardScreen.tsx`)
- Create: `src/lib/strings/grid.ts`, register it in `src/lib/i18n.ts` like `shots`
- Test: `unit/gridStrings.test.mjs` (every `grid.*` key exists in both languages), component logic stays in Task 2's pure functions

**Interfaces:**
- Consumes: Task 2; `getCanvas`, `getModels`, `getBudget` (`src/lib/canvas/api.ts`); `CanvasContext` (`src/lib/canvas/resource.ts`).
- Produces:
  - `export default function StoryboardScreen(props: { context: CanvasContext; onShotsChange: (shots: Shot[]) => void; onOpenCanvas: () => void; onOpenEditor: () => void; onBack: () => void })`
  - `GridCard({ cell, selected, readOnly, onSelect, onRefine, onRegenerate, onStep, price })` — renders: 9:16 frame (`cell.shown?.url`, else a "No frame yet" placeholder), number and `shot.time` badges, status pill (`pending` → "Generating…", `changed` → "Changed · not regenerated", `failed` → its error), version row `‹ v{n} / {total} ›`, the line (or "No line"), description when the "Action" toggle is on, `cameraTag` when "Camera" is on, hover buttons "Refine" and "Regenerate {price}".
- Toolbar: tabs Storyboard / Shot list; per row 3 / 4 / 6 (default 4, kept in `localStorage` key `remake.storyboard.cols`, read in try/catch); show toggles Action / Line / Camera; "Budget left US$x.xx"; "Canvas (advanced)" → `onOpenCanvas`; primary "Next: edit video →" → `onOpenEditor`.
- Read-only (`context.readOnly`): a notice "Approve the plan to make frames." and every paid button disabled.

- [ ] **Step 1:** Write `unit/gridStrings.test.mjs` asserting each key used (`grid.tab.board`, `grid.tab.list`, `grid.cols`, `grid.show.action`, `grid.show.line`, `grid.show.camera`, `grid.budget`, `grid.canvas`, `grid.next`, `grid.noFrame`, `grid.noLine`, `grid.generating`, `grid.changed`, `grid.refine`, `grid.regenerate`, `grid.readOnly`, `grid.lineLocked`) has a non-empty `en` and `zh` value. Run — FAIL.
- [ ] **Step 2:** Implement strings, `GridCard`, `StoryboardScreen` (load with `getCanvas(context.resource)`, `getModels()`, `getBudget()` in parallel; loading and error states copy CanvasScreen's `canvas.loading` / error pattern), CSS per the mockup.
- [ ] **Step 3:** `npx tsc -b` and `npx eslint src/components/storyboard src/lib/shotGrid.ts` clean; strings test PASS; `bash bin/verify.sh` GREEN.
- [ ] **Step 4: Commit** `feat(storyboard): grid screen with cards and toolbar`.

---

### Task 4: Refine popover — prompt, camera fields, regenerate, versions

**Files:**
- Create: `src/components/storyboard/RefinePopover.tsx`
- Create: `src/lib/shotGridActions.ts`
- Modify: `src/components/storyboard/StoryboardScreen.tsx` (wire actions, polling)
- Test: `unit/shotGridActions.test.mjs`

**Interfaces:**
- Consumes: Task 2, Task 3; `putCanvas`, `startGen`, `pollGen`, `StaleCanvas`, `generationItems` (`src/lib/canvas/api.ts`); `genRequest` (`src/lib/canvas/graph.ts`) for kit references; `applyLegacyFrames` (`src/lib/canvas/legacy.ts`).
- Produces (in `src/lib/shotGridActions.ts`, all I/O injected so tests use fakes):
  - `interface GridIO { put(version: number, doc: CanvasDoc): Promise<number>; reload(): Promise<{ doc: CanvasDoc; version: number; generations: Generation[] }>; start(body: StartGenBody): Promise<Generation> }`
  - `savePrompt(io: GridIO, state: { doc: CanvasDoc; version: number }, nodeId: string, prompt: string | null): Promise<{ doc: CanvasDoc; version: number }>` — on `StaleCanvas` reloads once and re-applies the same prompt; a second failure throws.
  - `regenerate(io: GridIO, state, cell: GridCell, shots: Shot[], gens: Generation[], model: GenModel): Promise<{ doc; version; gen: Generation }>` — body `{ nodeId, model: model.id, prompt: cell.prompt, references: genRequest(...).references, aspectRatio: '9:16' }`; saves `genStarted(...)` on the node; does not save when `start` throws.
  - `finish(state, nodeId, gen: Generation): CanvasDoc` — `genFinished` on the node.
- Popover content: prompt textarea (auto prompt shown greyed with "Automatic — type to change", "Reset to automatic" when own); selects for size (`FRAMINGS`), angle, movement, lens, gear, and a text input for length (`shot.time`); "Regenerate this frame {price}" (blue); model name with the image models' price range; note "Changing fields never regenerates by itself." Field changes call `patchShot` → `onShotsChange` (and the card shows `changed` when the auto prompt moved).
- After a job ends (`pollGen`), `finish` → `putCanvas`, refresh budget, and `onShotsChange(applyLegacyFrames(doc, shots, gens))` so the Plan page sees the new frame.

- [ ] **Step 1: Write failing tests** with a fake `GridIO`:
  - `savePrompt` puts the doc with the new prompt and returns the new version; when the first `put` throws `new StaleCanvas(...)`, it calls `reload` once, re-applies the prompt on the reloaded doc and returns the second `put`'s version; a second `StaleCanvas` rejects.
  - `regenerate` sends `prompt === cell.prompt`, `aspectRatio === '9:16'`, the node id and model id; the saved node has `awaiting === gen.id`; when `start` rejects with `Error('Budget used up')`, `put` is never called and the error propagates.
  - `finish` with a `done` gen sets `selected` and clears `awaiting`; with `failed` keeps the old `selected`.
- [ ] **Step 2: Run** `node --test unit/shotGridActions.test.mjs` — FAIL.
- [ ] **Step 3: Implement** actions, popover, wiring (one poll per running gen, aborted on unmount).
- [ ] **Step 4:** tsc, eslint, tests PASS; `bash bin/verify.sh` GREEN.
- [ ] **Step 5: Commit** `feat(storyboard): refine a frame's prompt and camera, regenerate one frame`.

---

### Task 5: Shot list tab

**Files:**
- Create: `src/components/storyboard/ShotListTable.tsx`
- Modify: `src/components/storyboard/StoryboardScreen.tsx` (tab body)
- Test: `unit/shotListRows.test.mjs`

**Interfaces:**
- Produces: `shotListRows(cells: GridCell[]): { n: number; thumb: string | null; action: string; line: string; size: string; angle: string; movement: string; lens: string; gear: string; time: string }[]` in `src/lib/shotGrid.ts` (blank camera values are `'—'`); `ShotListTable({ rows, ideaId, status, shots })`.
- Columns: thumbnail, #, Action, Line, Size, Angle, Movement, Lens, Gear, Length. Below the table, the existing `ShotChecklist` (`src/components/ShotChecklist.tsx`, props `ideaId`, `status`, `shots`) for takes — reuse, do not rewrite.
- "Print" button calls `window.print()`; `storyboard-grid.css` has an `@media print` block that hides the app chrome and prints the table only.

- [ ] **Step 1:** Test `shotListRows` for a full shot and for one with no camera fields (`'—'`), numbering skipping removed shots. Run — FAIL.
- [ ] **Step 2:** Implement; tsc, eslint, test PASS; `bash bin/verify.sh` GREEN.
- [ ] **Step 3: Commit** `feat(storyboard): shot list tab for the camera operator`.

---

### Task 6: Sidebar and routing

**Files:**
- Modify: `src/components/Sidebar.tsx:249-254` (item `canvas` → `storyboard`, label `shell.side.storyboard`, active for views `storyboard`, `storyboardPick`)
- Modify: `src/App.tsx` (`View` union gains `storyboard` and `storyboardPick`; sidebar handler near `:1456`; render branch next to the `canvas` one near `:2052`; `openStoryboard(ideaId)` next to `openPlanCanvas` `:1181`)
- Modify: `src/lib/strings/shell.ts` (`shell.side.storyboard`: Storyboard / 分鏡)
- Test: `unit/storyboardEntry.test.mjs`

**Interfaces:**
- Consumes: `StoryboardScreen` (Task 3); `boardPlans` (`src/lib/canvasPick.ts`); `CanvasPick` component for the chooser (same as `canvasPick`, with its `onPick` → `openStoryboard`).
- Produces: `storyboardTarget(plans: SavedIdea[]): { open: string } | 'pick'` in `src/lib/canvasPick.ts` — one plan opens it, otherwise the chooser.
- Wiring: `onOpenCanvas` → `openPlanCanvas(id)`; `onOpenEditor` → `makeVideo(id)`; `onShotsChange` → same `setIdeas` update as the canvas branch; `onBack` → `storyboardPick`. The lazy import mirrors `CanvasScreen`.
- Saved-view restore (`:136`): `storyboard` and `storyboardPick` restore to `shortlist` like `canvas`.

- [ ] **Step 1:** Test `storyboardTarget` with 0, 1 and 2 plans. Run — FAIL.
- [ ] **Step 2:** Implement; tsc, eslint, test PASS; `unit/guidedTour.test.mjs` and `unit/canvasEntry.test.mjs` still PASS; `bash bin/verify.sh` GREEN.
- [ ] **Step 3: Commit** `feat(storyboard): sidebar opens the storyboard; canvas moves behind it`.

---

### Task 7: End-to-end check, docs, PR

**Files:**
- Modify: `docs/STATUS.md`, `docs/test-log.md`
- Create: `e2e/storyboard-grid.cjs` only if the existing `e2e/*.cjs` pattern makes it cheap; otherwise the E2E runs as a Playwright subagent and its results go in `docs/test-log.md`.

- [ ] **Step 1:** `npm run build`, start an isolated backend: `bash bin/isolated-backend.sh 8797 --user test@example.com:pw-for-e2e --state ~/.local/state/buildclub-test-8797` (restart it on the new `dist`).
- [ ] **Step 2:** Run the Testing flows below (subagent with Playwright, screenshots to `/Volumes/Huang T7/playwright-mcp`, closes its own tabs).
- [ ] **Step 3:** One paid smoke test: regenerate one frame on Seedream 4.5 (≈ US$0.04, cap US$0.20) — allowed under the BuildClub US$1 rule.
- [ ] **Step 4:** `bash bin/verify.sh` GREEN; update STATUS and test-log; push; open a **draft** PR on `veralynchong/BuildClub`, base `feat/canvas-restore`; do not merge.

## Testing

**Automated (every task):** `bash bin/verify.sh` — backend pytest + `node --test unit/`. New tests: `backend/tests/test_shot_fields.py`, `unit/shotFields`, `unit/shotGrid`, `unit/gridStrings`, `unit/shotGridActions`, `unit/shotListRows`, `unit/storyboardEntry`.

**Static:** `npx tsc -b`, `npx eslint .`, `npm run build`.

**E2E flows (Task 7, desktop 1440×900, local :8797 with demo data):**

| # | Flow | Pass when |
|---|---|---|
| E1 | Sidebar → Storyboard with one approved plan | Grid opens straight away, 4 per row, one card per shot, numbers and lengths match the plan |
| E2 | Per row 3 / 6, toggle Action / Line / Camera, reload page | Layout changes; per-row choice survives the reload |
| E3 | Card → Refine → change lens to 85mm | Card's camera tag says 85mm; "Changed · not regenerated" shows; no generation row created; Plan page shows the lens after navigating there |
| E4 | Open an unapproved plan | Notice shows; Refine fields and Regenerate disabled |
| E5 | Type an own prompt, reload | Prompt kept; "Reset to automatic" brings the automatic prompt back |
| E6 | Regenerate (demo/mock model if available, else the paid smoke test) | Card shows "Generating…", then the new frame; version count +1; ‹ › switches versions and the choice survives reload; budget figure drops |
| E7 | Shot list tab | 10 columns, same values as the cards; checklist uploads still work; Print preview shows only the table |
| E8 | "Canvas (advanced)" and "Next: edit video →" | Canvas opens on this plan; editor opens with the chosen frames |
| E9 | Two tabs: change a prompt in each | Second save reloads and keeps the typed text (no lost edit, no crash) |
| E10 | Console | No errors during E1–E9 |

**Not covered:** mobile widths (out of scope), real camera-operator use (needs Daphne/Collage feedback after Beta).
