# Canvas Product Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Remake node canvas look and behave like a finished product (Flora-style shell, shot frames, thin state-coloured lines, a Timeline node with a full-screen editor, fixed break points, and a minimal "build this shot" AI agent), without losing versions, stale marks, the kit, footage nodes or daily caps.

**Architecture:** Four phases, one PR each, stacked: A shell → B frames/lines/nodes → C timeline → D agent. All new logic lives in pure, unit-tested modules under `src/lib/canvas/` and `src/lib/editor/`; components only wire them. The saved canvas format does not change: a shot node stays in the document and is *rendered* as a React Flow parent ("frame"); the Timeline node and its lines are virtual (built on screen, never saved). The only backend changes are `typicalSeconds` in `gen_models.json`, one error sentence in `renders.py`, and a new `backend/agent.py` route.

**Tech Stack:** React 19 + TypeScript + Vite, `@xyflow/react` 12.12.0 (parent nodes, `MiniMap`, `useReactFlow`), Remotion 4.0.537 `@remotion/player`, FastAPI + Pydantic + SQLite, Anthropic SDK (already a dependency). Tests: `node --test unit/` (Node 26 runs `.ts` imports directly), pytest, Playwright-core E2E scripts in `e2e/*.cjs`.

**Spec:** `pivots/02-content/docs/specs/2026-11-03-canvas-product-polish-design.md` (§12.5 is binding and wins over earlier sections). It overrides §4.2, §4.3 and §5 of `pivots/02-content/docs/specs/2026-11-02-node-canvas-editor-design.md`; kit behaviour stays per `pivots/02-content/docs/specs/2026-11-03-consistency-kit-design.md` §5.

Paths are relative to `pivots/02-content/app/trend-finder/` unless they start with `pivots/`, `docs/` or `bin/` (repo root).

**Working directories:** app commands (`node --test`, `npx tsc`, `npm run build`, `npx eslint`, `backend/.venv/bin/python -m pytest`, `node e2e/...`) run from `pivots/02-content/app/trend-finder`. Repo-root scripts always run in a subshell from the repo root: `VERIFY` below means `(cd "$(git rev-parse --show-toplevel)" && bash bin/verify.sh)`, and the isolated backend is `(cd "$(git rev-parse --show-toplevel)" && REMOTION_PORT=8872 bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e)`. `TYPECHECK` means `npx tsc -p tsconfig.app.json --noEmit` with a `mcp__flow__test_slot` kind `typecheck` slot held (acquire before, release with the result after).

## Global Constraints

- No new npm or pip dependency (spec §12). If a task seems to need one, stop and ask the user.
- Light theme only; desktop 1440×900 only, no 390-wide work (spec §2, project memory).
- Colours, radii and motion times come from `src/styles/tokens.css` / `src/styles/theme-remake.css` tokens, never literals (`pivots/02-content/docs/design-system.md` §0). Animations respect `prefers-reduced-motion` (dashed-line flow off).
- Every UI string goes through `t()`, with an `en` and a `zhHant` entry in `src/lib/strings/<area>.ts` (`unit/i18n.test.mjs` and `unit/copy.test.mjs` enforce this). Video/prompt content the AI writes is English.
- Backend sentences that reach the canvas or editor are added to `src/lib/strings/server.ts` (both languages); `backend/tests/test_server_text.py` pins them.
- The saved canvas document format does not change (spec §12.5.1): shot nodes stay in the doc (`backend/canvas.py check_doc` refuses a doc without them), and no new node type is saved.
- Keep: versions, stale marks, the kit, footage nodes, daily caps (spec §2 anti-goals). Nothing that costs money starts without a price shown first.
- Verification uses mock models only: isolated backend from `bin/isolated-backend.sh` on port 8871. Never touch ports 8805, 8811, 8850, 8787, 5195. No paid API call, no real Claude call.
- Each task ends with `VERIFY` GREEN. Every task that touches `src/` (A1–A4, B1–B7, C1–C5, D2, D3) also runs `TYPECHECK` with exit 0, and the tree compiles at the end of every task: an export is removed only in the task that edits its last consumer.
- Every test the plan names has concrete assertions (no empty or comment-only body); a reviewer rejects a task whose test body is empty.
- `shotId` always means the plan Shot's id (`Shot.id`, the `shotId` field on canvas nodes), never the shot node id. The shot node id is reached only through `shotNodeOf(doc, shotId)` (B1).
- Phase-ending tasks also run `npm run build` and `npx eslint .` with zero errors.
- Commits: per-task commit steps apply under the user's standing BuildClub rule (commit and push verified work). Branches and PRs go to `veralynchong/BuildClub`; never merge without the user saying "merge".
- Branches: Phase A starts from `feat/canvas-p2-5-kit` (or `main` if `docs/STATUS.md` says the kit PR has merged). Branch names: `feat/canvas-polish-a-shell`, `feat/canvas-polish-b-nodes`, `feat/canvas-polish-c-timeline`, `feat/canvas-polish-d-agent`, each stacked on the previous one.

### Fixed copy (English / 繁中)

| Key | en | zhHant |
|---|---|---|
| `canvas.toolbar.total` | `{n} shots · ≈ US${usd}` | `{n} 個鏡頭 · ≈ US${usd}` |
| `canvas.toolbar.runAll` | `Run all` | `全部生成` |
| `canvas.toolbar.send` | `Send for approval` | `送審` |
| `canvas.toolbar.canvas` / `.timeline` | `Canvas` / `Timeline` | `畫布` / `時間軸` |
| `canvas.queue.running` | `● {n} running · about {eta}` | `● {n} 個生成中 · 約 {eta}` |
| `canvas.time.sec` / `.min` | `{n} s` / `{n} min` | `{n} 秒` / `{n} 分鐘` |
| `canvas.gen.go` | `Generate` | `生成` |
| `canvas.gen.regenerate` | `Regenerate (v{n})` | `重新生成（v{n}）` |
| `canvas.gen.retry` | `Try again` | `再試一次` |
| `canvas.status.version` | `v{n} / {total}` | `v{n} / {total}` |
| `canvas.status.running` | `Generating · about {eta}` | `生成中 · 約 {eta}` |
| `canvas.status.elapsed` | `Generating · {eta}` | `生成中 · {eta}` |
| `canvas.status.waitFor` | `Waiting for {node}` | `等 {node}` |
| `canvas.status.none` | `Not generated` | `還沒生成` |
| `canvas.status.stale` | `Out of date` | `過期` |
| `canvas.status.failed` | `Failed` | `失敗` |
| `canvas.gen.shotText` | `Uses Shot {n}'s text` | `用 Shot {n} 的文字` |
| `canvas.tier.cheap` / `.balanced` / `.best` | `Cheap` / `Balanced` / `Best` | `便宜` / `平衡` / `最好` |
| `canvas.frame.removed` | `Removed from the plan` | `已從計畫刪除` |
| `canvas.clip.put` | `Put in timeline` | `放進時間軸` |
| `canvas.clip.on` | `✓ On timeline` | `✓ 在時間軸` |
| `canvas.clip.main` | `✓ main clip` | `✓ main clip` |
| `canvas.timeline.placed` | `Put in the timeline` + action `Open editing` | `已放進時間軸` + `開啟剪接` |
| `canvas.timeline.trimmed` | `This edit had more than one clip per shot. Kept one per shot.` | `這個剪輯有的鏡頭不只一段，已每個鏡頭只留一段。` |
| `editor.export.needFirst` | `Export the video first to send it.` | `先匯出成片才能送審。` |
| `canvas.agent.build` | `✦ Build this shot` | `✦ 幫我建好` |
| `canvas.agent.approve` / `.create` / `.cancel` | `Approve and run` / `Create only` / `Cancel` | `核准並執行` / `只建立不執行` / `取消` |
| `canvas.agent.planCost` | `Planning cost about US${usd}` | `這次規劃花了約 US${usd}` |

## Review Focus

1. **A canvas saved before this change** (shot nodes at x=0 with `in:text` lines, kit wired to every storyboard, footage nodes): it should load with every node inside its shot's frame, no Text lines, the kit still wired, and the first save must pass the backend check (shot nodes kept, absolute positions). → Task B1 `migrateDoc on a P2.5 doc` + `toFlow/fromFlow round-trips absolute positions`; Task B8 E2E steps "legacy doc" and "new shot after migration" (the backend still writes shot `in:text` lines for new shots, so `migrateDoc` runs on every load).
2. **A shot deleted from the plan that still has generated nodes**: the frame greys out with "Removed from the plan", its nodes and versions stay, Run all and the toolbar total skip it, and "Build this shot" is not offered. → Task B7 `runScope skips removed shots` and `scopeTotal sums per shot`; Task D4 E2E step "removed shot" (`polish-d-agent.cjs`: the removed frame shows `canvas.frame.removed`, has no ✦ and no `+`, and is absent from the Run all dialog).
3. **Pressing F or Esc while typing in a prompt, or with a dialog open**: F types an "f" and does not enter full screen; Esc closes the dialog first and leaves full screen only when nothing else is open. → Task A2 `shellKey ignores typing and yields Esc to dialogs`.
4. **A video that belongs to no shot** (a free-area video node or upload): "Put in timeline" is not offered and the timeline does not change; footage of a shot replaces that shot's one clip. → Task C1 `placeShotClip ignores a source without a shot`.
5. **The agent returns a model that is not on the menu, a length the model can't do, or the user cancels**: the server answers 502 and the canvas is untouched; Cancel leaves the doc byte-for-byte the same. → Task D1 `test_agent_rejects_unknown_model` / `test_agent_rejects_bad_duration`; Task D2 `applyAgentPlan keeps versions and returns the same doc when the plan matches`; Task D4 E2E step "Cancel" (canvas `GET` before and after Cancel are byte-for-byte equal, no generation started).

---

## Phase A: Shell and entry (PR 1)

Ends with: compact sidebar on the canvas, full-screen mode (button, `F`, `Esc`, remembered), top toolbar with plan title and client, left tool rail, bottom-left queue, bottom-right zoom + minimap, fitView on every entry, picker cards with counts. Spec §4, §10.1.

### Task A1: Typical wait times in the model list

**Files:**
- Modify: `backend/gen_models.json` (add `typicalSeconds` to every model)
- Modify: `backend/generations.py:97-110` (`validate_models`)
- Modify: `src/lib/canvas/types.ts` (`GenModel`)
- Test: `backend/tests/test_generations.py`

**Interfaces:**
- Produces: `GenModel.typicalSeconds?: number` (seconds a job usually takes; the UI always says "about").

- [ ] **Step 1: Write the failing tests**

```python
def test_models_have_typical_seconds():
    for m in generations.load_models():
        assert isinstance(m.get("typicalSeconds"), (int, float)) and m["typicalSeconds"] > 0, m["id"]

def test_validate_models_rejects_bad_typical_seconds():
    ok = {"id": "a", "kind": "image", "provider": "mock", "aspects": ["9:16"]}
    assert generations.validate_models([{**ok, "typicalSeconds": 0}]) == ["a: typicalSeconds must be a positive number"]
    assert generations.validate_models([{**ok, "typicalSeconds": "fast"}]) == ["a: typicalSeconds must be a positive number"]
```

- [ ] **Step 2: Run them to see them fail**

Run: `backend/.venv/bin/python -m pytest -q backend/tests/test_generations.py -k typical`
Expected: 2 FAIL.

- [ ] **Step 3: Add the field and the check**

Values (first estimate, unverified, spec §12.5.7): mock-image 2, mock-video 2, mock-voice 2 (the default `MOCK_GEN_DELAY_S`), seedream-4.5 15, nano-banana-2 20, nano-banana-pro 40, hailuo-2.3-fast 90, kling-2.6-pro 120, omni-flash-1.1 90, elevenlabs-multilingual-v2 10. Absent field stays valid (missing means "no data": show elapsed time only).

- [ ] **Step 4: Run backend tests**

Run: `backend/.venv/bin/python -m pytest -q backend/tests/test_generations.py`, then `TYPECHECK` (types.ts changed), then `VERIFY`
Expected: PASS (including the existing `test_models_file_valid`), exit 0, GREEN.

- [ ] **Step 5: Commit**

```bash
git add backend/gen_models.json backend/generations.py backend/tests/test_generations.py src/lib/canvas/types.ts
git commit -m "feat(trend-finder): typical wait time per generation model"
```

### Task A2: Shell helpers (full screen, keys, queue, ETA)

**Files:**
- Create: `src/lib/canvas/shell.ts`
- Modify: `src/lib/strings/canvas.ts` (`canvas.time.*`, `canvas.queue.running`)
- Test: `unit/canvasShell.test.mjs`

**Interfaces:**
- Consumes: `GenModel.typicalSeconds` (A1), `pendingGen`, `versionsOf` from `src/lib/canvas/graph.ts`.
- Produces:
  - `FULLSCREEN_KEY = 'remake.canvas.fullscreen'`
  - `readFullscreen(store?: Pick<Storage, 'getItem'> | null): boolean` (false when the store throws or is null)
  - `writeFullscreen(on: boolean, store?: Pick<Storage, 'setItem'> | null): void` (never throws)
  - `shellKey(e: { key: string; typing: boolean; dialogOpen: boolean; editorOpen: boolean }, fullscreen: boolean): 'enter' | 'leave' | null`
  - `aboutTime(seconds: number): { key: 'canvas.time.sec' | 'canvas.time.min'; n: number }` (under 60 → seconds rounded up to 5; else minutes rounded up)
  - `etaOf(g: Generation, model: Pick<GenModel, 'typicalSeconds'> | undefined, now: number): { elapsed: number; left: number | null }` (seconds; `left` is null without `typicalSeconds` or while `waiting`)
  - `interface QueueItem { nodeId: string; genId: string; kind: 'image' | 'video'; shotNumber: number | null; elapsed: number; left: number | null }`
  - `runningQueue(doc: CanvasDoc, gens: Generation[], models: GenModel[], shots: Shot[], now: number): QueueItem[]` (queued, waiting or running, oldest first)
  - `queueLeft(items: QueueItem[]): number | null` (largest `left`, null when none known)

- [ ] **Step 1: Write the failing tests** (`unit/canvasShell.test.mjs`)

```js
test('readFullscreen / writeFullscreen survive a throwing store', () => {
  const m = new Map(); const store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }
  assert.equal(readFullscreen(store), false); writeFullscreen(true, store); assert.equal(readFullscreen(store), true)
  const bad = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') } }
  assert.equal(readFullscreen(bad), false); assert.doesNotThrow(() => writeFullscreen(true, bad))
})
test('shellKey ignores typing and yields Esc to dialogs', () => {
  assert.equal(shellKey({ key: 'f', typing: false, dialogOpen: false, editorOpen: false }, false), 'enter')
  assert.equal(shellKey({ key: 'F', typing: false, dialogOpen: false, editorOpen: false }, false), 'enter')
  assert.equal(shellKey({ key: 'f', typing: true, dialogOpen: false, editorOpen: false }, false), null)
  assert.equal(shellKey({ key: 'f', typing: false, dialogOpen: false, editorOpen: false }, true), null)
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: false, editorOpen: false }, true), 'leave')
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: true, editorOpen: false }, true), null)
  assert.equal(shellKey({ key: 'Escape', typing: false, dialogOpen: false, editorOpen: true }, true), null)
})
test('aboutTime rounds up', () => {
  assert.deepEqual(aboutTime(12), { key: 'canvas.time.sec', n: 15 })
  assert.deepEqual(aboutTime(61), { key: 'canvas.time.min', n: 2 })
})
test('etaOf: left from typicalSeconds, null without it or while waiting', () => {
  const g = { status: 'running', createdAt: 10_000 }
  assert.deepEqual(etaOf(g, { typicalSeconds: 90 }, 40_000), { elapsed: 30, left: 60 })
  assert.deepEqual(etaOf(g, { typicalSeconds: 10 }, 40_000), { elapsed: 30, left: 0 })
  assert.equal(etaOf(g, {}, 40_000).left, null)
  assert.equal(etaOf({ ...g, status: 'waiting' }, { typicalSeconds: 90 }, 40_000).left, null)
})
test('runningQueue lists open jobs with their shot number, queueLeft is the longest', () => {
  // doc: n_sb_s2 (storyboard, shotId 's2'), n_vid_s1 (video, shotId 's1'); shots [{ id: 's1' }, { id: 's2' }]
  const gens = [{ id: 'g1', nodeId: 'n_sb_s2', kind: 'image', model: 'mock-image', status: 'running', createdAt: 10_000 },
                { id: 'g2', nodeId: 'n_vid_s1', kind: 'video', model: 'mock-video', status: 'done', createdAt: 5_000 }]
  const items = runningQueue(doc, gens, [{ id: 'mock-image', kind: 'image', typicalSeconds: 90 }], shots, 40_000)
  assert.deepEqual(items, [{ nodeId: 'n_sb_s2', genId: 'g1', kind: 'image', shotNumber: 2, elapsed: 30, left: 60 }])
  assert.equal(queueLeft(items), 60)
  assert.equal(queueLeft([{ ...items[0], left: null }]), null)
  assert.deepEqual(runningQueue(doc, [gens[1]], [], shots, 40_000), [])
})
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test unit/canvasShell.test.mjs`
Expected: FAIL, cannot find module `shell.ts`.

- [ ] **Step 3: Implement `src/lib/canvas/shell.ts`** with the signatures above. `typing` is computed by the caller from the event target (input, textarea, select, contenteditable).

- [ ] **Step 4: Run tests**

Run: `node --test unit/canvasShell.test.mjs`, then `TYPECHECK`, then `VERIFY`
Expected: PASS, exit 0, `verify: GREEN`.

- [ ] **Step 5: Commit** `feat(trend-finder): canvas shell helpers for full screen, keys and queue`

### Task A3: App frame: compact sidebar, full screen, title, picker counts

**Files:**
- Modify: `src/App.tsx:1336-1352` (Sidebar props, `shell` class), `src/App.tsx:1623-1634` (CanvasScreen props)
- Modify: `src/components/Sidebar.tsx` (prop `compact`)
- Modify: `src/styles/layout.css` (`.shell.is-compact`, `.shell.is-full`)
- Modify: `src/components/CanvasPick.tsx`, `src/lib/canvasPick.ts`
- Modify: `src/lib/strings/shell.ts` (`shell.canvasPick.counts`: `{shots} shots · {ready} ready` / `{shots} 個鏡頭 · {ready} 個已有分鏡圖`)
- Test: `unit/canvasPick.test.mjs`

**Interfaces:**
- Consumes: `readFullscreen`, `writeFullscreen` (A2); `planName(video, format)` from `src/components/plans/moves`.
- Produces:
  - `Sidebar` prop `compact?: boolean` (icons only, about 44px, each item keeps its label as `title` and `aria-label`)
  - `CanvasScreen` Props add `title: string`, `clientName: string`, `fullscreen: boolean`, `onFullscreen: (on: boolean) => void`
  - `planProgress(idea: SavedIdea, shotList: Shot[]): { shots: number; ready: number }` in `src/lib/canvasPick.ts` (`ready` = shots with a `frameImage`; see Spec gaps)

- [ ] **Step 1: Write the failing test**

```js
test('planProgress counts the shots and those with a storyboard frame', () => {
  const idea = { shots: [{ id: 'a', time: '0-3s', shot: 'x', frameImage: '/f' }, { id: 'b', time: '3-6s', shot: 'y' }] }
  assert.deepEqual(planProgress(idea, []), { shots: 2, ready: 1 })
  assert.deepEqual(planProgress({}, [{ time: '1s', shot: 'z' }]), { shots: 1, ready: 0 })
})
```

- [ ] **Step 2: Run to see it fail** — `node --test unit/canvasPick.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** App keeps `const [canvasFull, setCanvasFull] = useState(readFullscreen)` and writes through `writeFullscreen`. When `view === 'canvas'`: shell gets `is-compact`; with `canvasFull` it also gets `is-full`, which hides the Sidebar and `.mobile-bar` entirely. Leaving the canvas view restores the normal sidebar. CanvasScreen receives `title={planName(planVideo, planFormat)}` and `clientName={planClient.name}`. CanvasPick cards add one muted line from `planProgress`.
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): compact sidebar and full-screen frame for the canvas`

### Task A4: Canvas toolbar, tool rail, queue, zoom and minimap, fitView

**Files:**
- Create: `src/components/canvas/CanvasToolbar.tsx`, `src/components/canvas/ToolRail.tsx`, `src/components/canvas/QueuePill.tsx`, `src/components/canvas/ZoomBar.tsx`
- Modify: `src/components/canvas/CanvasScreen.tsx:99-103,160-171,808-881` (header replaced, `Controls` replaced, `fit` always true, key handler)
- Modify: `src/lib/canvas/flow.ts` (remove `isDefaultViewport`, orphaned) and `unit/canvas.test.mjs:212-219` (its test)
- Modify: `src/styles/canvas.css`, `src/lib/strings/canvas.ts`
- Modify: `e2e/lib.cjs` (`openEditor` clicks the toolbar "Timeline" switch)

**Interfaces:**
- Consumes: A2 helpers, A3 props, existing `AddNodeMenu`, `showEditor`.
- Produces:
  - `CanvasToolbar` props `{ title: string; clientName: string; onBack: () => void; mode: 'canvas' | 'timeline'; onMode: (m: 'canvas' | 'timeline') => void; fullscreen: boolean; onFullscreen: (on: boolean) => void; saveText: string; children?: React.ReactNode }` (`children` = the right-side slot; B7 puts the total and Run all there, C5 the Send button)
  - `ToolRail` props `{ mode: 'select' | 'pan'; onMode: (m: 'select' | 'pan') => void; addKinds: NodeKind[]; disabledKinds?: NodeKind[]; onAdd: (k: NodeKind) => void; readOnly: boolean; onAgent?: () => void }` (the ✦ button renders only when `onAgent` is set; Phase D sets it)
  - `QueuePill` props `{ items: QueueItem[]; onJump: (nodeId: string) => void }` (hidden when empty; click opens a list; a row click selects and centres the node)
  - `ZoomBar` (uses `useReactFlow` and `useViewport`: −, percent, +, fit) next to `<MiniMap pannable zoomable />`

- [ ] **Step 1: Implement the components and wire them.** The board always fits on mount (`fitView` prop true, padding 0.2); the saved viewport is still saved but no longer restored on entry; the return-from-editor restore (`beforeEditor`) stays. The h1 is the plan `title` (spec §4.2). `F`/`Esc` handler on `window` uses `shellKey` with `dialogOpen = !!ask` and `editorOpen = editing`. Pan mode: `panOnDrag` true, `selectionOnDrag` false; select mode: `panOnDrag={[1, 2]}`, `selectionOnDrag`. Queue items come from `runningQueue(doc, gens, models, shots, now)` with `now` ticking every second only while items exist.
- [ ] **Step 2: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 3: Commit** `feat(trend-finder): canvas toolbar, tool rail, queue and minimap`

### Task A5: Phase A acceptance

**Files:**
- Create: `e2e/polish-a-shell.cjs`
- Modify: `eslint.config.js:8` (add `'render/experiment'` to `ignores`: the 216 baseline errors are all in those git-ignored bundles)

- [ ] **Step 1: Write the E2E script** (mock only, `L.open()`, `L.login`, `L.seed`, 1440×900). Checks, each with a screenshot into `<out_dir>`:
  - sidebar Canvas entry: the board fits (every `.react-flow__node` is inside the viewport box), the h1 equals the plan name, the sidebar is about 44px wide;
  - full-screen button hides the sidebar; `F` (focus on the board) enters, `Esc` leaves; reload keeps the last choice; typing `f` in a node textarea does not enter;
  - start a mock generation: the queue reads "● 1 running", disappears when done;
  - zoom +/− changes the percent; the minimap is visible.
- [ ] **Step 2: Run it**

Run (from the app dir): `npm run build`; the isolated backend (see Working directories) in the background; `PW_CORE=... node e2e/polish-a-shell.cjs <out_dir>`
Expected: every line `PASS`, exit 0.

- [ ] **Step 3: Phase gate** — `VERIFY` GREEN, `npm run build` OK, `npx eslint .` 0 errors, `TYPECHECK` exit 0.
- [ ] **Step 4: Commit, push, open PR 1** (base: the kit branch or main). PR body lists §10.1 as covered.

---

## Phase B: Frames, lines and nodes (PR 2)

Ends with: shots drawn as frames holding their nodes, no Text lines, thin grey lines with focus/running/idle states, dot ports with hover names, drop-on-empty menu, auto Start-frame wiring, new node cards, right parameter panel with model picker and version thumbnails, "Regenerate (vN)", toolbar total, Run all and the first-paid-generate confirm. Spec §5, §6, §8.2, §8.3, §10.2–§10.6, §10.11.

### Task B1: Frame layout and the load/save conversion

**Files:**
- Create: `src/lib/canvas/frames.ts`
- Modify: `src/lib/canvas/flow.ts` (`FlowNode`, `toFlow`, `fromFlow`, new `reframe`)
- Modify: `unit/canvas.test.mjs:188` (the existing `toFlow / fromFlow keep the saved node data…` test, for relative member positions)
- Test: `unit/canvasFrames.test.mjs`
- Not modified: `src/components/canvas/CanvasScreen.tsx` still compiles (the new `FlowNode` fields and `sizes` are optional); it is wired to frames in B4.

**Interfaces:**
- Produces:
  - `FRAME_PAD = 16`, `FRAME_HEAD = 64`, `NODE_SIZE = { w: 200, h: 300 }`, `MIN_FRAME = { w: 280, h: 220 }`, `KIT_GAP = 80`
  - `type Box = { x: number; y: number; w: number; h: number }`
  - `shotNodeOf(doc: CanvasDoc, shotId: string): string | null` — the one Shot id → shot node id mapping (the `type: 'shot'` node whose `shotId` is `shotId`); null when the shot has no node. Every later task that holds a Shot id and needs a frame (B2 `addNode`, B7 `runScope`, D2 `applyAgentPlan`, D3) calls this; nothing else builds or parses `n_shot_` ids.
  - `frameOf(doc: CanvasDoc, node: CanvasNode): string | null` — the shot node id of the frame a non-shot node belongs to (`shotNodeOf(doc, node.shotId)`, spec §12.5.1); null for shot, kit and free nodes
  - `frameBoxes(doc: CanvasDoc, sizes?: Map<string, { w: number; h: number }>): Map<string, Box>` — keyed by shot node id: the members' bounding box plus `FRAME_PAD` and `FRAME_HEAD`, at least `MIN_FRAME`; an empty frame sits at the shot node's position
  - `slotInFrame(doc: CanvasDoc, shotNodeId: string, sizes?): { x: number; y: number }` — takes the shot node id (callers holding a Shot id pass `shotNodeOf(doc, shotId)`); absolute; x = rightmost member's x + its width + 40, on the first member's row; an empty frame gives the shot node's position + (`FRAME_PAD`, `FRAME_HEAD`)
  - `kitSpot(boxes: Map<string, Box>): { x: number; y: number }` — `KIT_GAP` left of the leftmost frame, level with the top one (spec §12.5.2)
  - `migrateDoc(doc: CanvasDoc): CanvasDoc` — drops every edge whose source is a shot node; returns the same object when there is none. It runs on every load, not only for legacy docs: the backend (`backend/canvas.py` `reconcile`/`_row`) keeps writing a shot → storyboard/footage `in:text` line for each newly added shot, and that stays (spec §12.5.1, format unchanged)
  - `FlowNode` gains `parentId?: string; extent?: 'parent'; expandParent?: boolean; style?: { width: number; height: number }; draggable?: boolean; dragHandle?: string; measured?: { width?: number; height?: number }`
  - `toFlow(doc: CanvasDoc, sizes?)` — frames first (type `shot`, `style` from `frameBoxes`, `dragHandle: '.cv-frame-head'`), members with `parentId`, `extent: 'parent'`, `expandParent: true` and positions relative to their frame; the kit node at `kitSpot`, `draggable: false`
  - `fromFlow(nodes, edges, viewport)` — members back to absolute (`parent.position + position`); a shot node is saved at its frame's top-left
  - `reframe(nodes: FlowNode[]): FlowNode[]` — recomputes every frame box from the current absolute member positions and `measured` sizes, and re-bases members; used after a node is added

- [ ] **Step 1: Write the failing tests**

```js
// fixture `doc`: n_shot_s1 (shot, shotId 's1') at (0, 0), n_shot_s2 (shotId 's2') at (0, 480), n_sb_s1 (storyboard, 's1') at (360, 0),
// n_vid_s1 (video, 's1') at (720, 0), n_kit (kit) at (-400, 0), n_p (prompt, no shotId) at (2000, 0); `node(id)` finds a node
test('shotNodeOf maps a Shot id to its shot node id', () => {
  assert.equal(shotNodeOf(doc, 's1'), 'n_shot_s1')
  assert.equal(shotNodeOf(doc, 'nope'), null)
})
test('frameOf uses shotId; kit and free nodes have no frame', () => {
  assert.equal(frameOf(doc, node('n_sb_s1')), 'n_shot_s1')
  assert.equal(frameOf(doc, node('n_kit')), null)
  assert.equal(frameOf(doc, node('n_p')), null)
  assert.equal(frameOf(doc, node('n_shot_s1')), null)
})
test('frameBoxes wraps the members with padding and header; an empty frame sits at the shot node', () => {
  const boxes = frameBoxes(doc)
  assert.deepEqual(boxes.get('n_shot_s1'), { x: 344, y: -64, w: 200 + 360 + 32, h: 300 + 64 + 16 })
  assert.deepEqual(boxes.get('n_shot_s2'), { x: 0, y: 480, w: MIN_FRAME.w, h: MIN_FRAME.h })
  assert.equal(boxes.has('n_kit'), false)
})
test('slotInFrame is right of the rightmost member on the first row', () => {
  assert.deepEqual(slotInFrame(doc, 'n_shot_s1'), { x: 720 + 200 + 40, y: 0 }) // NODE_W gap as freeSpot uses
  assert.deepEqual(slotInFrame(doc, 'n_shot_s2'), { x: FRAME_PAD, y: 480 + FRAME_HEAD })
})
test('migrateDoc on a P2.5 doc drops only the shot text lines and keeps kit and start lines', () => {
  // legacy: e_t1 n_shot_s1->n_sb_s1 in:text, e_t2 n_shot_s1->n_ft_s1 in:text, e_k n_kit->n_sb_s1 in:kit, e_s n_sb_s1->n_vid_s1 in:start
  const out = migrateDoc(legacy)
  assert.deepEqual(out.edges.map((e) => e.id), ['e_k', 'e_s'])
  assert.deepEqual(out.nodes, legacy.nodes)
  assert.equal(migrateDoc(out), out)
})
test('toFlow/fromFlow round-trips absolute positions', () => {
  const flow = toFlow(doc)
  const m = flow.nodes.find((n) => n.id === 'n_sb_s1')
  assert.equal(m.parentId, 'n_shot_s1')
  assert.deepEqual(m.position, { x: 360 - 344, y: 0 + 64 })
  const back = fromFlow(flow.nodes, flow.edges, { x: 1.4, y: 2.6, zoom: 1.23456 })
  assert.deepEqual(back.nodes.find((n) => n.id === 'n_sb_s1').position, { x: 360, y: 0 })
  assert.deepEqual(back.nodes.find((n) => n.id === 'n_shot_s1').position, { x: 344, y: -64 })
  assert.deepEqual(back.viewport, { x: 1, y: 3, zoom: 1.235 })
  assert.deepEqual(back.edges, doc.edges)
})
test('toFlow puts frames before their members and gives members extent parent', () => {
  const ids = toFlow(doc).nodes.map((n) => n.id)
  assert.ok(ids.indexOf('n_shot_s1') < ids.indexOf('n_sb_s1'))
  const m = toFlow(doc).nodes.find((n) => n.id === 'n_vid_s1')
  assert.equal(m.extent, 'parent'); assert.equal(m.expandParent, true)
  const f = toFlow(doc).nodes.find((n) => n.id === 'n_shot_s1')
  assert.equal(f.dragHandle, '.cv-frame-head'); assert.deepEqual(f.style, { width: 592, height: 380 })
  assert.equal(toFlow(doc).nodes.find((n) => n.id === 'n_kit').draggable, false)
})
test('reframe grows a frame to hold a member added to its right', () => {
  const ns = toFlow(doc).nodes
  const moved = ns.map((n) => (n.id === 'n_vid_s1' ? { ...n, position: { x: n.position.x + 400, y: n.position.y } } : n))
  const out = reframe(moved)
  assert.equal(out.find((n) => n.id === 'n_shot_s1').style.width, 592 + 400)
  assert.deepEqual(out.find((n) => n.id === 'n_shot_s2'), ns.find((n) => n.id === 'n_shot_s2'))
})
test('kitSpot is left of the leftmost frame', () => {
  const boxes = new Map([['a', { x: 100, y: 50, w: 300, h: 300 }], ['b', { x: 40, y: 600, w: 300, h: 300 }]])
  assert.deepEqual(kitSpot(boxes), { x: 40 - KIT_GAP - NODE_SIZE.w, y: 50 })
})
```

- [ ] **Step 2: Run** `node --test unit/canvasFrames.test.mjs` → FAIL (no module).
- [ ] **Step 3: Implement** `frames.ts` and the `flow.ts` changes. Update the existing `toFlow / fromFlow keep the saved node data…` test in `unit/canvas.test.mjs:188`: members of a frame now get positions relative to it; saved data and edges still round-trip unchanged.
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): shot frame layout and load/save conversion`

### Task B2: Implicit shot text, and only the pressed node gets a version

**Files:**
- Modify: `src/lib/canvas/graph.ts` (`textFrom` folded into the new exported `shotTextSource`, which `genRequest` now calls; `addNode`; new `reuseSettings`). `roomBelow` stays until B4, which edits its last consumer (`CanvasScreen.tsx:766`).
- Modify: `src/lib/canvas/types.ts` (`NodeData.shotTextOff?: boolean`)
- Modify: `unit/canvas.test.mjs` (see Step 3)
- Test: `unit/canvas.test.mjs`, `backend/tests/test_generations.py`

**Interfaces:**
- Consumes: `shotNodeOf`, `slotInFrame` (B1).
- Produces:
  - Prompt order (spec §12.5.3): `node.data.prompt` when non-blank → a Prompt node on `in:text` (its text, following empty Prompt nodes up) → the shot's `line`, else its `shot`, when the node is a storyboard or video with a `shotId` whose shot node exists, and `shotTextOff` is not true → `''`. An `in:text` line whose source is a shot node is ignored (`migrateDoc` removes them; the shot text comes from `shotId`). Kit prefix and `MAX_PROMPT` stay in the backend (`with_prefix`, `backend/generations.py:210`).
  - `shotTextSource(doc: CanvasDoc, nodeId: string, shots: Shot[]): { text: string; from: 'own' | 'prompt' | 'shot' | 'none'; shotNumber?: number }` — the only place that applies the order above (spec §12.5.3); `genRequest(...).prompt` is `shotTextSource(...).text`, and the B6 panel hint reads `from`/`shotNumber` (`shotNumber` = 1-based index of the shot in `shots`, set only for `from: 'shot'`)
  - `addNode(doc, kind, at, shotId?)` — `shotId` is a Shot id; no longer adds an `in:text` line; with `shotId` it places at `slotInFrame(doc, shotNodeOf(doc, shotId)!)`; footage still throws without a shot node
  - `reuseSettings(g: Generation): Partial<NodeData>` — `{ model, prompt: g.inputs.prompt ?? '', duration }` (duration only when a number)

- [ ] **Step 1: Write the failing tests** (`unit/canvas.test.mjs`, existing `docWith`, `node`, `edge`, `shots` fixtures; `migrated = { ...docWith(), edges: docWith().edges.filter((e) => e.source !== 'n_shot_s1') }`)

```js
test('genRequest uses the shot text with no text line, and the own prompt over it', () => {
  assert.equal(genRequest(migrated, 'n_sb_s1', shots, []).prompt, 'Welcome in')
  const own = structuredClone(migrated); own.nodes[1].data.prompt = 'Mine'
  assert.equal(genRequest(own, 'n_sb_s1', shots, []).prompt, 'Mine')
  const off = structuredClone(migrated); off.nodes[1].data.shotTextOff = true
  assert.equal(genRequest(off, 'n_sb_s1', shots, []).prompt, '')
  assert.equal(genRequest(migrated, 'n_sb_s1', [{ ...shots[0], line: undefined }], []).prompt, 'Wide shot of the cafe')
})
test('a Prompt node line replaces the shot text', () => {
  const d = { ...migrated, nodes: [...migrated.nodes, node('n_p', 'prompt', { text: 'From prompt' })], edges: [...migrated.edges, edge('n_p', 'n_sb_s1')] }
  assert.equal(genRequest(d, 'n_sb_s1', shots, []).prompt, 'From prompt')
})
test('free nodes (no shotId) get no shot text', () => {
  assert.equal(genRequest(migrated, 'n_vid', shots, []).prompt, '')
  assert.equal(shotTextSource(migrated, 'n_vid', shots).from, 'none')
})
test('shotTextSource says where the text comes from', () => {
  assert.deepEqual(shotTextSource(migrated, 'n_sb_s1', shots), { text: 'Welcome in', from: 'shot', shotNumber: 1 })
  const own = structuredClone(migrated); own.nodes[1].data.prompt = 'Mine'
  assert.deepEqual(shotTextSource(own, 'n_sb_s1', shots), { text: 'Mine', from: 'own' })
  const d = { ...migrated, nodes: [...migrated.nodes, node('n_p', 'prompt', { text: 'P' })], edges: [...migrated.edges, edge('n_p', 'n_vid')] }
  assert.deepEqual(shotTextSource(d, 'n_vid', shots), { text: 'P', from: 'prompt' })
  assert.deepEqual(shotTextSource(migrated, 'n_vid2', shots), { text: '', from: 'none' })
})
test('addNode in a frame adds no text line and lands right of the last member', () => {
  const d = addNode(migrated, 'video', { x: 9999, y: 9999 }, 's1')
  const v = d.nodes[d.nodes.length - 1]
  assert.equal(v.shotId, 's1')
  assert.equal(d.edges.length, migrated.edges.length)
  assert.deepEqual(v.position, slotInFrame(migrated, 'n_shot_s1'))
  assert.throws(() => addNode(migrated, 'footage', { x: 0, y: 0 }, 'nope'), /shot/i)
})
test('reuseSettings copies model, prompt and duration', () => {
  assert.deepEqual(reuseSettings({ model: 'mock-video', inputs: { prompt: 'move', duration: 4 } }), { model: 'mock-video', prompt: 'move', duration: 4 })
  assert.deepEqual(reuseSettings({ model: 'mock-image', inputs: { duration: null } }), { model: 'mock-image', prompt: '' })
})
```

```python
def test_generate_adds_a_version_only_to_that_node(gen):
    # spec §8.3: a Generate on the video node must not add a storyboard version.
    # `gen` builds the canvases of ia/ib/iw and runs jobs inline with no mock delay.
    client = gen
    assert post(client).status_code == 200  # n_sb_s1 already has a version before the video runs
    c = client.get("/api/ideas/ia/canvas").json()
    c["doc"]["nodes"].append({"id": "n_vid_s1", "type": "video", "shotId": "s1", "position": {"x": 720, "y": 0}, "data": {}})
    c["doc"]["edges"].append({"id": "e_sb_vid", "source": "n_sb_s1", "sourceHandle": "out", "target": "n_vid_s1", "targetHandle": "in:start"})
    assert client.put("/api/ideas/ia/canvas", json={"version": c["version"], "doc": c["doc"]}).status_code == 200

    def counts():
        return Counter(g["nodeId"] for g in client.get("/api/ideas/ia/gen").json())  # the route returns a list

    before = counts()
    assert post(client, nodeId="n_vid_s1", model="mock-video", prompt="move", duration=4).status_code == 200
    after = counts()
    assert after["n_vid_s1"] == before["n_vid_s1"] + 1
    assert after - Counter({"n_vid_s1": after["n_vid_s1"]}) == before - Counter({"n_vid_s1": before["n_vid_s1"]})  # every other node: same count
    assert after["n_sb_s1"] == before["n_sb_s1"] >= 1
```

- [ ] **Step 2: Run** `node --test unit/canvas.test.mjs` and `backend/.venv/bin/python -m pytest -q backend/tests/test_generations.py -k only_to_that_node` → the new unit tests FAIL; the backend test is expected to PASS already (it pins the behaviour; if it fails, stop and report it as the §8.3 bug). Add `from collections import Counter` to the test file's imports.
- [ ] **Step 3: Implement.** Existing tests in `unit/canvas.test.mjs` that change: `genRequest prefers the node prompt, then the shot line` (`:102`) keeps its assertions (the shot text now comes from `shotId`); `missingInput says what is needed` (`:121`) gets its `needText` case from `shotTextOff: true` instead of `doc.edges = []`; `addNode for a shot links the shot to the new node…` (`:245`) asserts no `in:text` line is added (`d.edges.length === docWith().edges.length`) and keeps the footage-needs-a-shot throws; `addNode with a shot moves right to a free spot…` (`:257`) asserts `slotInFrame` placement instead. `kit.test.mjs` must still pass unchanged.
- [ ] **Step 4: Run** `node --test unit/`, `backend/.venv/bin/python -m pytest -q backend/tests/test_generations.py`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): storyboard and video use the shot text without a line`

### Task B3: Line looks, compatible kinds, auto Start frame

**Files:**
- Create: `src/lib/canvas/edges.ts`
- Modify: `src/lib/canvas/ports.ts` (new `compatibleKinds`). `edgeLabel` stays until B4, which edits its last consumer (`CanvasScreen.tsx:804`).
- Modify: `src/lib/canvas/graph.ts` (new `wireStart`)
- Test: `unit/canvasEdges.test.mjs`

**Interfaces:**
- Consumes: `downstream`, `selectedGen`, `pendingGen`, `frameOf`, `canConnect`, `PORTS`, `outMedia`.
- Produces:
  - `hasResult(node: CanvasNode, gens: Generation[], takes: Take[] = []): boolean` — the one "has a result" rule: storyboard/video: a selected done version (`selectedGen`); upload: an image version or a `takeId`; footage: a take whose `shotId` is the node's `shotId`; prompt: non-blank text; kit: true. Reused by `nodeStatus` (B5), `runScope` (B7) and the Timeline lines (C3); none of them re-derives it.
  - `focusSet(doc: CanvasDoc, selected: string[]): Set<string>` — the selected nodes plus everything upstream and downstream of them
  - `edgeLook(edge: CanvasEdge, doc: CanvasDoc, gens: Generation[], takes: Take[], focus: ReadonlySet<string>, kitSelected: boolean, opts?: { targetKind?: 'timeline' }): { className: string; animated: boolean }` — always `cv-edge`; `is-kit` for a kit line (plus `is-kit-on` when `kitSelected`); `is-running` + `animated` when the target has a pending generation; `is-idle` when the source has no result (`hasResult`); `is-focus` when both ends are in `focus`. With `targetKind: 'timeline'` (C3's virtual `e_tl_` lines) the target is not looked up in `doc`: never running, and `is-focus` needs only the source in `focus`.
  - `compatibleKinds(doc: CanvasDoc, sourceId: string, models: GenModel[]): { kind: NodeKind; handle: string }[]` — kinds a new node can be, with the input the line goes into, in this order: image → storyboard `in:ref`, video `in:start`; text → prompt, storyboard, video on `in:text`, plus footage on `in:text` only when the text source is in a frame; kit → storyboard `in:kit`; video output → none (Timeline arrives in C)
  - `wireStart(doc: CanvasDoc, videoNodeId: string, models: GenModel[]): CanvasDoc` — connects the newest storyboard of the same frame (last in `doc.nodes` order) to `in:start` when that port is free and the video's model takes a start frame; same doc otherwise (spec §5.4)

- [ ] **Step 1: Write the failing tests**

```js
// fixture `doc`: n_shot_s1 (shot 's1'), n_sb_s1 (storyboard 's1'), n_vid_s1 (video 's1', model mock-video), n_kit (kit), n_p (prompt, text 'x', free),
// n_p1 (prompt, text 'y', shotId 's1'); edges e_k n_kit->n_sb_s1 in:kit, e_s n_sb_s1->n_vid_s1 in:start, e_t n_p->n_sb_s1 in:text
// models: mock-image, mock-video (inputs.startFrame 'optional'); `e(id)` finds an edge; done = [{ id: 'g1', nodeId: 'n_sb_s1', status: 'done', createdAt: 1 }]
test('hasResult per node kind', () => {
  assert.equal(hasResult(node('n_sb_s1'), []), false)
  assert.equal(hasResult(node('n_sb_s1'), done), true)
  assert.equal(hasResult(node('n_sb_s1'), [{ ...done[0], status: 'failed' }]), false)
  assert.equal(hasResult({ id: 'q', type: 'prompt', data: { text: '  ' } }, []), false)
  assert.equal(hasResult(node('n_p'), []), true)
  assert.equal(hasResult(node('n_kit'), []), true)
  assert.equal(hasResult({ id: 'u', type: 'upload', data: { takeId: 't1' } }, []), true)
  assert.equal(hasResult({ id: 'f', type: 'footage', shotId: 's1', data: {} }, [], [{ id: 't1', shotId: 's1' }]), true)
  assert.equal(hasResult({ id: 'f', type: 'footage', shotId: 's1', data: {} }, [], [{ id: 't1', shotId: 's2' }]), false)
})
test('edgeLook: idle, running, focus and kit states', () => {
  assert.deepEqual(edgeLook(e('e_s'), doc, [], [], new Set(), false), { className: 'cv-edge is-idle', animated: false })
  const run = [...done, { id: 'g2', nodeId: 'n_vid_s1', status: 'running', createdAt: 2 }]
  const r = edgeLook(e('e_s'), doc, run, [], new Set(), false)
  assert.deepEqual(r, { className: 'cv-edge is-running', animated: true })
  assert.equal(edgeLook(e('e_s'), doc, done, [], new Set(['n_sb_s1', 'n_vid_s1']), false).className, 'cv-edge is-focus')
  assert.equal(edgeLook(e('e_s'), doc, done, [], new Set(['n_sb_s1']), false).className, 'cv-edge')
  assert.equal(edgeLook(e('e_k'), doc, done, [], new Set(), false).className, 'cv-edge is-kit')
  assert.equal(edgeLook(e('e_k'), doc, done, [], new Set(), true).className, 'cv-edge is-kit is-kit-on')
})
test('edgeLook with a timeline target override never looks the target up', () => {
  const tl = { id: 'e_tl_n_vid_s1', source: 'n_vid_s1', sourceHandle: 'out', target: 'n_timeline', targetHandle: 'in:clips' }
  const vidDone = [{ id: 'g3', nodeId: 'n_vid_s1', status: 'done', createdAt: 3 }]
  assert.deepEqual(edgeLook(tl, doc, [], [], new Set(), false, { targetKind: 'timeline' }), { className: 'cv-edge is-idle', animated: false })
  assert.deepEqual(edgeLook(tl, doc, vidDone, [], new Set(['n_vid_s1']), false, { targetKind: 'timeline' }), { className: 'cv-edge is-focus', animated: false })
})
test('focusSet walks both ways from the selection', () => {
  assert.deepEqual([...focusSet(doc, ['n_sb_s1'])].sort(), ['n_kit', 'n_p', 'n_sb_s1', 'n_vid_s1'])
  assert.deepEqual([...focusSet(doc, ['n_vid_s1'])].sort(), ['n_kit', 'n_p', 'n_sb_s1', 'n_vid_s1'])
  assert.equal(focusSet(doc, []).size, 0)
})
test('compatibleKinds from a storyboard offers storyboard ref and video start, from a prompt the text inputs', () => {
  assert.deepEqual(compatibleKinds(doc, 'n_sb_s1', models), [{ kind: 'storyboard', handle: 'in:ref' }, { kind: 'video', handle: 'in:start' }])
  assert.deepEqual(compatibleKinds(doc, 'n_p', models), [{ kind: 'prompt', handle: 'in:text' }, { kind: 'storyboard', handle: 'in:text' }, { kind: 'video', handle: 'in:text' }])
  assert.deepEqual(compatibleKinds(doc, 'n_p1', models).at(-1), { kind: 'footage', handle: 'in:text' })
  assert.deepEqual(compatibleKinds(doc, 'n_kit', models), [{ kind: 'storyboard', handle: 'in:kit' }])
  assert.deepEqual(compatibleKinds(doc, 'n_vid_s1', models), [])
})
test('wireStart picks the newest storyboard of the frame and leaves a taken port alone', () => {
  const two = { ...doc, nodes: [...doc.nodes, { id: 'n_sb2_s1', type: 'storyboard', shotId: 's1', position: { x: 0, y: 0 }, data: {} }] }
  const free = { ...two, edges: two.edges.filter((x) => x.id !== 'e_s') }
  const out = wireStart(free, 'n_vid_s1', models)
  assert.deepEqual(out.edges.filter((x) => x.target === 'n_vid_s1').map((x) => [x.source, x.targetHandle]), [['n_sb2_s1', 'in:start']])
  assert.equal(wireStart(two, 'n_vid_s1', models), two)
  const noSb = { ...free, nodes: free.nodes.filter((n) => n.type !== 'storyboard') }
  assert.equal(wireStart(noSb, 'n_vid_s1', models), noSb)
  const noStart = models.map((m) => (m.kind === 'video' ? { ...m, inputs: { ...m.inputs, startFrame: 'none' } } : m))
  assert.equal(wireStart(free, 'n_vid_s1', noStart), free)
})
```

- [ ] **Step 2: Run** `node --test unit/canvasEdges.test.mjs` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): line states, compatible node kinds and auto start frame`

### Task B4: Frames, ports and lines on the board

**Files:**
- Modify: `src/components/canvas/nodes/ShotNode.tsx` (becomes the frame), `src/components/canvas/nodes/Ports.tsx` (10px dots, label via `data-label` + CSS hover; `PortLabels` stays exported until B5, which edits its consumers `GenNode`, `PromptNode`, `FootageNode`), `src/components/canvas/nodes/ctx.ts`
- Modify: `src/components/canvas/CanvasScreen.tsx` (`first = toFlow(migrateDoc(initial.doc))` on every load, `place` runs `reframe`, `shownEdges` from `edgeLook`, `onConnectEnd` drop menu, `addAfterShot` uses `addNode(..., shotId)` (which places via `shotNodeOf` + `slotInFrame`) + `wireStart`; remove `MEDIA_COLOR`)
- Modify: `src/lib/canvas/graph.ts` (remove `roomBelow`, orphaned by `addAfterShot`), `src/lib/canvas/ports.ts` (remove `edgeLabel`, orphaned by `shownEdges`), `unit/canvas.test.mjs` (delete the `roomBelow…` test at `:275`, the `edgeLabel` assertions at `:37-39`, and both imports)
- Create: `src/components/canvas/DropMenu.tsx`
- Modify: `src/styles/canvas.css`, `src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes: B1–B3.
- Produces:
  - Frame header (spec §5.1): "Shot N", chip `shotChip(shot)` ("Hook · 3s"), the line or shot text on one line with `title` = full text, a status slot (C fills "✓ main clip"), the `+` menu (`['prompt', 'storyboard', 'video', 'upload', 'footage']`), and a slot for ✦ (D). A removed shot: grey frame, `canvas.frame.removed`, no `+`.
  - `shotChip(shot: Shot): string | null` in `src/lib/canvas/frames.ts` — purpose label (`plan.sb.purpose.*`) and length from a `"a-bs"` time; either part may be missing; null when both are
  - `DropMenu` props `{ at: { x: number; y: number }; options: { kind: NodeKind; handle: string }[]; onPick: (o) => void; onClose: () => void }`
  - Ports: 10px dots; media type shown only by the dot's border colour; compatible inputs light up while dragging (existing `acceptsDrop`)

- [ ] **Step 1: Write the failing test** for `shotChip` in `unit/canvasFrames.test.mjs`:

```js
test('shotChip joins purpose and length', () => {
  assert.equal(shotChip({ time: '0-3s', shot: '', purpose: 'hook' }), 'Hook · 3s')
  assert.equal(shotChip({ time: '3-8s', shot: '' }), '5s')
  assert.equal(shotChip({ time: '', shot: '', purpose: 'hook' }), 'Hook')
  assert.equal(shotChip({ time: '1s', shot: '' }), null)
})
```

  Run `node --test unit/canvasFrames.test.mjs` → FAIL (`shotChip` not exported).

- [ ] **Step 2: Implement the board changes.** A drop on empty canvas (`cs.toNode` null, from a source handle) opens `DropMenu` at the pointer with `compatibleKinds`; a pick adds the node at that point (in the source's frame when the source has one), connects it, runs `reframe`, and for a video also `wireStart`. A new storyboard still goes through `wireKit`.
- [ ] **Step 3: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN; `grep -rn "roomBelow\|edgeLabel" src unit` → no output.
- [ ] **Step 4: Commit** `feat(trend-finder): shot frames, dot ports and thin state lines on the canvas`

### Task B5: Node cards and the single status

**Files:**
- Create: `src/lib/canvas/status.ts`
- Modify: `src/components/canvas/nodes/GenNode.tsx` (results and summary only; controls move to B6), `PromptNode.tsx`, `UploadNode.tsx`, `FootageNode.tsx`, `KitNode.tsx` (same card shell)
- Modify: `src/components/canvas/nodes/Ports.tsx` (remove `PortLabels`; its last consumers `GenNode`, `PromptNode`, `FootageNode` drop the import in this task)
- Modify: `src/styles/canvas.css`, `src/lib/strings/canvas.ts`
- Test: `unit/canvasStatus.test.mjs`

**Interfaces:**
- Consumes: `etaOf`, `aboutTime` (A2), `hasResult` (B3), `missingInput`, `versionsOf`, `selectedGen`, `failedGen`, `pendingGen`, `chainPair`.
- Produces:
  - `type NodeStatus = { key: Key; vars?: Vars; tone: 'busy' | 'bad' | 'wait' | 'stale' | 'ok' | 'none' }`
  - `nodeStatus(doc: CanvasDoc, nodeId: string, gens: Generation[], models: GenModel[], shots: Shot[], now: number): NodeStatus` — exactly one, in this order: pending → `canvas.status.running` (or `.elapsed` without an ETA; waiting → `canvas.status.waitFor`); newest failed/unknown → `canvas.status.failed`; a required input that `missingInput` reports and whose upstream node fails `hasResult` → `canvas.status.waitFor` `{ node: t('canvas.node.storyboard') }`; `stale` → `canvas.status.stale`; a shown version → `canvas.status.version` `{ n, total }` (`total` = done versions, `n` = the shown one's place among them, same as the version strip); else `canvas.status.none`. `vars.eta` is the translated `aboutTime` text (e.g. `10 s`).
  - `genButton(node: CanvasNode, gens: Generation[]): { key: 'canvas.gen.go' | 'canvas.gen.regenerate' | 'canvas.gen.retry'; vars?: { n: number } }` — retry when the newest version failed; regenerate with `n` = number of done versions + 1 once a version is done (failed and unknown attempts are not counted, matching the version strip and `canvas.status.version`); else go

- [ ] **Step 1: Write the failing tests**

```js
// fixture `doc`: n_sb_s1 (storyboard 's1', model mock-image), n_vid_s1 (video 's1', model mock-video), e_s n_sb_s1->n_vid_s1 in:start;
// `staleDoc` = doc with n_sb_s1 data.stale true; shots [{ id: 's1', line: 'Hi' }]; models mock-image { typicalSeconds: 20 }, mock-video (startFrame optional)
// g(id, nodeId, status, createdAt) builds a generation with the node's model
test('nodeStatus shows one status, running first', () => {
  const gens = [g('a', 'n_sb_s1', 'failed', 1), g('b', 'n_sb_s1', 'running', 2_000)]
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', gens, models, shots, 12_000), { key: 'canvas.status.running', vars: { eta: '10 s' }, tone: 'busy' })
  const noEta = models.map((m) => ({ ...m, typicalSeconds: undefined }))
  assert.equal(nodeStatus(staleDoc, 'n_sb_s1', gens, noEta, shots, 12_000).key, 'canvas.status.elapsed')
})
test('nodeStatus: failed beats stale; stale beats version; empty is none', () => {
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', [g('a', 'n_sb_s1', 'done', 1), g('b', 'n_sb_s1', 'failed', 2)], models, shots, 0), { key: 'canvas.status.failed', tone: 'bad' })
  assert.deepEqual(nodeStatus(staleDoc, 'n_sb_s1', [g('a', 'n_sb_s1', 'done', 1)], models, shots, 0), { key: 'canvas.status.stale', tone: 'stale' })
  const three = [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2), g('c', 'n_sb_s1', 'done', 3)]
  assert.deepEqual(nodeStatus(doc, 'n_sb_s1', three, models, shots, 0), { key: 'canvas.status.version', vars: { n: 2, total: 2 }, tone: 'ok' })
  assert.deepEqual(nodeStatus(doc, 'n_sb_s1', [], models, shots, 0), { key: 'canvas.status.none', tone: 'none' })
})
test('nodeStatus waits for a storyboard without a result', () => {
  const need = models.map((m) => (m.kind === 'video' ? { ...m, inputs: { ...m.inputs, startFrame: 'required' } } : m))
  assert.deepEqual(nodeStatus(doc, 'n_vid_s1', [], need, shots, 0), { key: 'canvas.status.waitFor', vars: { node: 'Storyboard' }, tone: 'wait' })
  assert.equal(nodeStatus(doc, 'n_vid_s1', [g('a', 'n_sb_s1', 'done', 1)], need, shots, 0).key, 'canvas.status.none')
})
test('genButton: Generate, then Regenerate (v2), Try again after a failure', () => {
  const sb = doc.nodes.find((n) => n.id === 'n_sb_s1')
  assert.deepEqual(genButton(sb, []), { key: 'canvas.gen.go' })
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1)]), { key: 'canvas.gen.regenerate', vars: { n: 2 } })
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2), g('c', 'n_sb_s1', 'done', 3)]), { key: 'canvas.gen.regenerate', vars: { n: 3 } }) // the failed attempt is not a version
  assert.deepEqual(genButton(sb, [g('a', 'n_sb_s1', 'done', 1), g('f', 'n_sb_s1', 'failed', 2)]), { key: 'canvas.gen.retry' })
})
```

- [ ] **Step 2: Run** `node --test unit/canvasStatus.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `status.ts` and the cards: header (type + status text), result area (image / playable video / soft placeholder / striped while running; click opens a larger view), footer (model short label, "≈ $0.52"), main button from `genButton`. The failure message itself moves to the panel (B6). Card width about 180px, wide enough that model name and price are not cut (check at 1440×900 in B8).
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN; `grep -rn PortLabels src` → no output.
- [ ] **Step 5: Commit** `feat(trend-finder): node cards with one status and Regenerate (vN)`

### Task B6: Right parameter panel and model picker

**Files:**
- Create: `src/components/canvas/NodePanel.tsx`, `src/components/canvas/ModelPicker.tsx`
- Modify: `src/components/canvas/VersionStrip.tsx` (thumbnails; `title` = created time and model), `src/components/canvas/CanvasScreen.tsx` (panel shows when exactly one storyboard or video node is selected; closes otherwise)
- Modify: `src/styles/canvas.css`, `src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes: `shotTextSource`, `reuseSettings` (B2), `priceOf`, `budgetLeft`, `isRetired`, `etaOf`/`aboutTime`, kit context (`kitView`, `kitSent`, `setKitOff`), `genButton`.
- Produces:
  - `NodePanel` props `{ nodeId: string; onClose: () => void }` (everything else from `useCanvas()`): title "Video · Shot 1"; model; length (video); start frame source ("Storyboard · v2"); prompt textarea with the `canvas.gen.shotText` hint and a switch that sets `shotTextOff`; kit checkboxes and drop notices (storyboard, as today); "≈ US$0.52 · about 2 min"; failure message; version thumbnails + "Reuse these settings" (`updateData(id, reuseSettings(g))` then `edited(id)`); main button (`genButton`); Run the whole shot (still calls the existing `onChain` here; B7 routes it through `runScope`)
  - `ModelPicker` props `{ models: GenModel[]; kind: 'image' | 'video'; value: string | undefined; seconds: number | undefined; refuses: (m: GenModel) => string | null; disabled: boolean; onPick: (id: string) => void }` — a listbox (keyboard: arrows, Enter, Esc); each row: full label, ≈US$, about-wait, tier badge `canvas.tier.<tier>`; unavailable or refused rows disabled with the reason

- [ ] **Step 1: Implement.** The model, duration, prompt and kit controls are removed from `GenNode` (they now live only here). Changing the model clears a duration the new model can't do (existing rule in `GenNode.tsx`).
- [ ] **Step 2: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 3: Commit** `feat(trend-finder): right parameter panel with model picker and version thumbnails`

### Task B7: Prices, Run all, first paid Generate

**Files:**
- Create: `src/lib/canvas/run.ts`
- Modify: `src/components/canvas/CanvasScreen.tsx` (toolbar total + Run all; `onGenerate` asks once per session for a paid model; the chain modal generalised to a list of shots; `onChain`'s body building moves to `chainBody`, and `onChain(nodeId)` is replaced by `onRunScope(opts)`)
- Modify: `src/components/canvas/NodePanel.tsx` ("Run the whole shot" calls `onRunScope({ shotId: node.shotId, includeStale: true })`), `src/components/canvas/nodes/ctx.ts` (`onChain` → `onRunScope`)
- Modify: `src/lib/strings/canvas.ts`
- Test: `unit/canvasRun.test.mjs`

**Interfaces:**
- Consumes: `shotNodeOf` (B1), `hasResult` (B3), `genRequest`, `missingInput`, `pendingGen`, `isRetired`, `priceOf`, `chainPair`, `startGen`, `quoteChain`, `startChain`.
- Produces:
  - `interface RunItem { shotId: string; nodeId: string; kind: 'image' | 'video'; model: string; usd: number }` — `shotId` is the Shot id
  - `runScope(doc: CanvasDoc, shots: Shot[], gens: Generation[], models: GenModel[], opts: { shotId?: string; includeStale: boolean }): RunItem[]` — storyboard and video nodes whose `shotId` has a shot node (`shotNodeOf`) not marked `removed`, limited to `opts.shotId` (a Shot id) when given; skips nodes with a pending job, an unavailable or retired model, or a result (`hasResult`), unless `includeStale` and the node is stale; skips a node `missingInput` blocks, except when the missing input is `canvas.gen.needStart` and the storyboard on its `in:start` is itself in the scope. Items are in shot order, then `doc.nodes` order.
  - `type RunBatch = { chain: { imageNodeId: string; videoNodeId: string } } | { single: string }`
  - `runBatches(doc: CanvasDoc, items: RunItem[]): RunBatch[]` — a storyboard and the video on its `in:start` (`chainPair`) that are both in scope become one chain; everything else single; chains and storyboards before videos
  - `chainBody(doc: CanvasDoc, pair: { imageNodeId: string; videoNodeId: string }, models: GenModel[], shots: Shot[], gens: Generation[], kit: Kit | null): { body: ChainBody } | { error: Key }` — the checks and body that `onChain` builds today (`canvas.chain.noKey`, `canvas.chain.missing`, `canvas.chain.noRef`), moved out unchanged so the whole-shot button and Run all share one path to `quoteChain`/`startChain`
  - `scopeTotal(items: RunItem[]): { total: number; perShot: { shotId: string; usd: number }[] }` — rounded to 4 decimals; `perShot` in item order, only shots with an item
  - `paidConfirmNeeded(usd: number, confirmedThisSession: boolean): boolean` — true only for usd > 0 and not yet confirmed
- Decisions in this task (spec §6.4 + §12.5.5, ruling P6/P7): the toolbar total is `scopeTotal(runScope(..., { includeStale: true }))`, the same scope as Run all (no result or stale, removed shots skipped), so the number on the toolbar and in the Run all dialog are the same (Spec gaps 1). The Run all dialog always shows before anything starts; it lists, per shot, only the items with `usd > 0` and their subtotal, then the total (with no paid item it shows only the US$0.00 total). "Run the whole shot" is Run all limited to that shot: done, fresh nodes are skipped (Regenerate on a node reruns it). The confirmed-this-session flag is a module-level variable in `CanvasScreen.tsx` (resets on page reload).

- [ ] **Step 1: Write the failing tests**

```js
// fixture `doc`: shot nodes n_shot_s1, n_shot_s2, n_shot_s3 (data.removed true); n_sb_s1 + n_vid_s1 (e_s1 in:start), n_sb_s2 + n_vid_s2 (e_s2 in:start),
// n_sb_s3 (shot s3), n_old_s2 (storyboard s2, model 'gone'), n_free (storyboard, no shotId); shots [s1, s2, s3] with lines
// models: mock-image { kind image, price { per: 'image', usd: 0.04 }, available true }, mock-video { kind video, price { per: 'second', usd: 0.08 }, durations [4], available true, startFrame required }
// every video node has duration 4 (0.32); doneSb2 = [g('d', 'n_sb_s2', 'done', 1)]
const ids = (items) => items.map((i) => i.nodeId)
test('runScope skips done, running, removed and retired nodes; includeStale adds stale ones', () => {
  assert.deepEqual(ids(runScope(doc, shots, doneSb2, models, { includeStale: false })), ['n_sb_s1', 'n_vid_s1', 'n_vid_s2'])
  const running = [...doneSb2, g('r', 'n_sb_s1', 'running', 2)]
  assert.deepEqual(ids(runScope(doc, shots, running, models, { includeStale: false })), ['n_vid_s2'])
  const stale = structuredClone(doc); stale.nodes.find((n) => n.id === 'n_sb_s2').data.stale = true
  assert.deepEqual(ids(runScope(stale, shots, doneSb2, models, { includeStale: false })), ['n_sb_s1', 'n_vid_s1', 'n_vid_s2'])
  assert.deepEqual(ids(runScope(stale, shots, doneSb2, models, { includeStale: true })), ['n_sb_s1', 'n_vid_s1', 'n_sb_s2', 'n_vid_s2'])
  assert.deepEqual(runScope(doc, shots, doneSb2, models, { includeStale: false })[0], { shotId: 's1', nodeId: 'n_sb_s1', kind: 'image', model: 'mock-image', usd: 0.04 })
})
test('runScope skips removed shots', () => {
  assert.ok(!ids(runScope(doc, shots, [], models, { includeStale: true })).includes('n_sb_s3'))
  assert.deepEqual(runScope(doc, shots, [], models, { shotId: 's3', includeStale: true }), [])
  assert.ok(!ids(runScope(doc, shots, [], models, { includeStale: true })).includes('n_free'))
})
test('runScope keeps a video whose start frame comes from a storyboard in scope', () => {
  assert.deepEqual(ids(runScope(doc, shots, [], models, { shotId: 's1', includeStale: false })), ['n_sb_s1', 'n_vid_s1'])
  const cut = { ...doc, edges: doc.edges.filter((e) => e.id !== 'e_s1') }
  assert.deepEqual(ids(runScope(cut, shots, [], models, { shotId: 's1', includeStale: false })), ['n_sb_s1']) // start frame required, nothing makes it
})
test('runBatches chains a storyboard with its video and puts singles after', () => {
  const items = runScope(doc, shots, doneSb2, models, { includeStale: false })
  assert.deepEqual(runBatches(doc, items), [{ chain: { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' } }, { single: 'n_vid_s2' }])
})
test('chainBody builds the same body onChain sent, or the reason it can not', () => {
  const r = chainBody(doc, { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' }, models, shots, [], null)
  assert.deepEqual(r, { body: { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1', imageModel: 'mock-image', videoModel: 'mock-video', prompt: shots[0].line, videoPrompt: shots[0].line, duration: 4 } })
  const off = models.map((m) => ({ ...m, available: false }))
  assert.deepEqual(chainBody(doc, { imageNodeId: 'n_sb_s1', videoNodeId: 'n_vid_s1' }, off, shots, [], null), { error: 'canvas.chain.noKey' })
})
test('scopeTotal sums per shot', () => {
  const items = [{ shotId: 's1', usd: 0.04 }, { shotId: 's1', usd: 0.32 }, { shotId: 's2', usd: 0.04 }]
  assert.deepEqual(scopeTotal(items), { total: 0.4, perShot: [{ shotId: 's1', usd: 0.36 }, { shotId: 's2', usd: 0.04 }] })
  assert.deepEqual(scopeTotal([]), { total: 0, perShot: [] })
})
test('paidConfirmNeeded only for a paid first run', () => {
  assert.equal(paidConfirmNeeded(0, false), false); assert.equal(paidConfirmNeeded(0.04, false), true); assert.equal(paidConfirmNeeded(0.04, true), false)
})
```

- [ ] **Step 2: Run** `node --test unit/canvasRun.test.mjs` → FAIL.
- [ ] **Step 3: Implement** `run.ts`, then wire: toolbar shows `canvas.toolbar.total` with a `title` listing per-shot subtotals and "left today" from `budgetLeft`; Run all and Run the whole shot both go through `onRunScope(opts)`: save first (same as `onChain` today), show the dialog, then run batches in order (a chain through `chainBody` → `quoteChain`/`startChain`, a single through `startGen`) with the existing double-start guards (`starting`, `chainStarting`); a batch that fails shows its message and the rest continue. The existing `onChain` tests in `unit/canvas.test.mjs` (`chainPair`, `chainBusy`) stay.
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): canvas total, Run all and first paid Generate confirm`

### Task B8: Phase B acceptance

**Files:**
- Create: `e2e/polish-b-nodes.cjs`
- Modify: `e2e/a5-chain-guards.cjs` header (note that its node-select selectors predate B6; not a merge gate)

- [ ] **Step 1: Write the E2E script** covering spec §10.2–§10.6 and §10.11, with screenshots:
  - 3 shots are frames; no `.react-flow__node-shot` has handles; no edge has `in:text`; edges are `cv-edge`; selecting a storyboard makes its lines `is-focus`;
  - legacy doc: PUT a P2.5-style doc (shot→storyboard `in:text`, kit wired) through the API, reload, every member is inside its frame box, the first save returns 200;
  - new shot after migration: after that first save, add a shot to the plan through the API (the backend `reconcile` writes its shot node, storyboard and a shot→storyboard `in:text` line), reload: the new shot is a frame holding its storyboard, no edge has `in:text` from a shot node, and the next save returns 200;
  - in an empty frame (delete its storyboard), add a video → no start line; in a frame with a storyboard, add a video → `in:start` line from it;
  - drag from a storyboard's output to empty space → the menu lists only Storyboard and Video;
  - generate (mock, `MOCK_GEN_DELAY_S=4`): line `is-running`, node shows "Generating", queue count 1; `#fail` prompt → the node shows only "Failed";
  - after a result the button reads "Regenerate (v2)"; panel thumbnails switch the shown version;
  - kit node: new card look, still wired to every storyboard, faint until selected.
- [ ] **Step 2: Run** (build, isolated backend on 8871, `node e2e/polish-b-nodes.cjs <out_dir>`) → all PASS.
- [ ] **Step 3: Phase gate** — `VERIFY` GREEN, build OK, eslint 0 errors, `TYPECHECK` exit 0.
- [ ] **Step 4: Commit, push, open PR 2** (base `feat/canvas-polish-a-shell`).

---

## Phase C: Timeline node and full-screen editor (PR 3)

Ends with: one clip per shot ("Put in timeline" replaces Add + Main clip), a toast instead of a page jump, "✓ On timeline", a Timeline node on the canvas, the editor reworked (tabs with honest ticks, named clips, jump back to the node, export panel not covering the tabs), and send-for-approval that works the first time. Spec §7, §8.1, §12.5.4, §12.5.6, §10.7–§10.9.

### Task C1: One clip per shot, timeline summary, clip names

**Files:**
- Modify: `src/lib/editor/timeline.ts` (keep it free of canvas and i18n imports; the Remotion bundle loads it)
- Modify: `src/components/editor/clipName.ts`
- Test: `unit/editor.test.mjs`, `unit/timelineNode.test.mjs` (new)

**Interfaces:**
- Produces:
  - `placeShotClip(p: EditProject, src: ClipSource, duration: number, shotOrder: string[], id: string): EditProject` — `src.shotId` must be in `shotOrder`, else `p`; replaces that shot's clip (whole source, `in` 0) or inserts it after the clips of earlier shots; sets `primaries[shotId] = src`; returns `p` when the 180 s limit leaves no room
  - `oneClipPerShot(p: EditProject): { project: EditProject; removed: number }` — per shot keeps the clip matching its primary, else its first clip; clips without a shot stay
  - `timelineSummary(p: EditProject | null, shotOrder: string[]): { seconds: number; ready: number; total: number }` — `ready` = shots in `shotOrder` with a clip
  - `clipLabel(src: ClipSource, shots: Shot[], gens: Generation[], takes: Take[]): string` in `clipName.ts` — "Shot 1 · v3" (version number = place among the node's done versions, as in B5), "Shot 2 · Take 1" (take order within the shot), else `editor.clip.generic`; new keys `editor.clip.shotVersion` `Shot {n} · v{v}` / `Shot {n} · v{v}`, `editor.clip.shotTake` `Shot {n} · Take {k}` / `Shot {n} · 實拍 {k}`

- [ ] **Step 1: Write the failing tests**

```js
// `proj(clips, primaries = {})` builds an EditProject; `src(kind, id, shotId, nodeId)` a ClipSource; `clip(id, source, out)` a Clip with in 0, volume 1
// shotOrder = ['s1', 's2', 's3']; g1 = src('generation', 'g1', 's1', 'n_vid_s1'), g2 = src('generation', 'g2', 's2', 'n_vid_s2'), g2b = src('generation', 'g2b', 's2', 'n_vid_s2'), g3 = src('generation', 'g3', 's3', 'n_vid_s3')
test('placeShotClip replaces the shot clip and keeps shot order', () => {
  const p = proj([clip('c1', g1, 3), clip('c3', g3, 3)])
  const a = placeShotClip(p, g2, 4, shotOrder, 'c2')
  assert.deepEqual(a.clips.map((c) => c.source.id), ['g1', 'g2', 'g3'])
  assert.deepEqual([a.clips[1].in, a.clips[1].out], [0, 4])
  assert.deepEqual(a.primaries.s2, g2)
  const b = placeShotClip(a, g2b, 5, shotOrder, 'c4')
  assert.deepEqual(b.clips.map((c) => c.source.id), ['g1', 'g2b', 'g3'])
  assert.equal(b.clips[1].out, 5)
  assert.deepEqual(b.primaries.s2, g2b)
})
test('placeShotClip ignores a source without a shot', () => {
  const p = proj([clip('c1', g1, 3)])
  assert.equal(placeShotClip(p, src('generation', 'gx', undefined, 'n_free'), 4, shotOrder, 'c2'), p)
  assert.equal(placeShotClip(p, src('generation', 'gy', 'gone', 'n_x'), 4, shotOrder, 'c2'), p)
})
test('placeShotClip returns the same project when full', () => {
  const p = proj([clip('c1', g1, 178)])
  assert.equal(placeShotClip(p, g2, 4, shotOrder, 'c2'), p)
  assert.equal(placeShotClip(p, src('generation', 'g1b', 's1', 'n_vid_s1'), 180, shotOrder, 'c2').clips[0].source.id, 'g1b') // a swap only needs room for the difference
})
test('oneClipPerShot keeps the primary, else the first, and counts the rest', () => {
  const a1 = src('generation', 'a1', 's1'), a2 = src('generation', 'a2', 's1'), a3 = src('generation', 'a3', 's1'), free = src('take', 't9')
  const r = oneClipPerShot(proj([clip('x1', a1, 2), clip('x2', a2, 2), clip('x3', a3, 2), clip('x4', free, 2), clip('y1', g2, 2), clip('y2', g2b, 2)], { s1: a2 }))
  assert.deepEqual(r.project.clips.map((c) => c.id), ['x2', 'x4', 'y1'])
  assert.equal(r.removed, 3)
  const one = proj([clip('c1', g1, 3)])
  assert.deepEqual(oneClipPerShot(one), { project: one, removed: 0 })
})
test('timelineSummary counts ready shots and seconds', () => {
  assert.deepEqual(timelineSummary(proj([clip('c1', g1, 3), clip('c3', g3, 4.5)]), shotOrder), { seconds: 7.5, ready: 2, total: 3 })
  assert.deepEqual(timelineSummary(null, shotOrder), { seconds: 0, ready: 0, total: 3 })
})
test('clipLabel names shot and version or take', () => {
  // shots [{ id: 's1' }, { id: 's2' }]; gens on n_vid_s1: v1 'g0' done, failed 'gf', v2 'g1' done; takes of s2: 't1' then 't2' (createdAt order)
  assert.equal(clipLabel(g1, shots, gens, takes), 'Shot 1 · v2')
  assert.equal(clipLabel(src('take', 't2', 's2'), shots, gens, takes), 'Shot 2 · Take 2')
  assert.equal(clipLabel(src('generation', 'gx'), shots, gens, takes), 'Clip')
})
```

- [ ] **Step 2: Run** `node --test unit/editor.test.mjs unit/timelineNode.test.mjs` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): one timeline clip per shot`

### Task C2: "Put in timeline" from the canvas, toast, badge

**Files:**
- Modify: `src/lib/editor/useTimelineActions.ts` (remove `addClip`, `setPrimary`, `isPrimary` and the `openDrawer` input; add `useForShot`, `isInTimeline`, `onPlaced` input)
- Modify: `src/components/canvas/nodes/ClipActions.tsx` (one button; `ClipGrip` removed with the drawer drag), `src/components/canvas/nodes/ctx.ts`, `src/components/canvas/nodes/GenNode.tsx`, `FootageNode.tsx`, `UploadNode.tsx`
- Modify: `src/components/editor/Timeline.tsx:81-91` (a drop calls `useForShot`), `src/components/editor/EditorPanel.tsx` (sources list button calls `useForShot`)
- Modify: `src/components/canvas/CanvasScreen.tsx` (note state gains an action; legacy trim on first project load)
- Modify: `src/lib/editor/timeline.ts` (delete `isPrimaryPin`, orphaned once `isPrimary` goes), `unit/editor.test.mjs` (drop the `isPrimaryPin` import and its assertions in `isPrimaryPin / withPrimary` at `:311`, keep the `withPrimary` ones), `src/lib/strings/canvas.ts` (delete `canvas.clip.add`, `canvas.clip.primary`, `canvas.clip.isPrimary`, `canvas.clip.drag` in `en` and `zhHant`, orphaned with the old `ClipActions` buttons and `ClipGrip`)

**Interfaces:**
- Consumes: `placeShotClip`, `oneClipPerShot` (C1).
- Produces:
  - `TimelineActions.useForShot: (src: ClipSource) => Promise<boolean>` — true when placed
  - `TimelineActions.isInTimeline: (src: ClipSource) => boolean`
  - `useTimelineActions` input `onPlaced: (shotId: string) => void` (replaces `openDrawer`)
  - Canvas note state `{ key?: Key; vars?: Vars; text?: string; info?: boolean; action?: { label: Key; run: () => void } }`; `onPlaced` shows `canvas.timeline.placed` with action "Open editing" (`showEditor`)
  - Legacy: once `edit.project` first loads and the board is not read-only, `oneClipPerShot`; when `removed > 0`, `edit.update` and show `canvas.timeline.trimmed` once
  - Node footer: `canvas.clip.on` badge when `isInTimeline(src)`; frame header status `canvas.clip.main` when the shot has a clip

- [ ] **Step 1: Implement.** The button is not shown for a source without `shotId` (Review Focus 4). Pressing it on another version or node of the same shot swaps that shot's clip.
- [ ] **Step 2: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN; `grep -rn "isPrimaryPin\|canvas\.clip\.\(add\|primary\|isPrimary\|drag\)['\"]" src unit` → no output.
- [ ] **Step 3: Commit** `feat(trend-finder): put in timeline replaces add and main clip, with a toast`

### Task C3: Timeline node on the canvas

**Files:**
- Create: `src/lib/canvas/timelineNode.ts`, `src/components/canvas/nodes/TimelineNode.tsx`, `src/lib/editor/preview.ts`
- Modify: `src/components/canvas/nodes/index.ts`, `src/lib/canvas/flow.ts` (`fromFlow` drops virtual nodes and lines), `src/components/canvas/CanvasScreen.tsx`
- Modify: `src/components/editor/EditorPanel.tsx` (`inputProps` (`:185-204`) is built by `reelInput`; `FONT_URL` and the `lines` map move to `preview.ts`)
- Test: `unit/timelineNode.test.mjs`

**Interfaces:**
- Consumes: `frameBoxes` (B1), `timelineSummary`, `clipLabel` (C1), `hasResult`, `edgeLook` with `{ targetKind: 'timeline' }` (B3).
- Produces:
  - `TIMELINE_NODE_ID = 'n_timeline'`
  - `isVirtual(id: string): boolean` — the Timeline node and lines into it (`e_tl_` prefix)
  - `timelineFlow(doc: CanvasDoc, project: EditProject | null, boxes: Map<string, Box>): { node: FlowNode; edges: FlowEdge[] }` — node right of the rightmost frame (gap 120), level with the top frame, `deletable: false`, `draggable: false`; one line `e_tl_<nodeId>` from each clip's canvas node (the video node for a generation, the shot's footage node for a take) into `in:clips`
  - In `src/lib/editor/preview.ts` (one builder for the editor and the Timeline node, ruling P9/P11):
    - `FONT_URL = '/fonts/NotoSansTC-VF.ttf'` (moved from `EditorPanel.tsx:41`)
    - `shotLines(shots: Shot[]): Record<string, string>` — shot id → its non-blank `line` (what `EditorPanel.tsx:185` builds today)
    - `reelInput(a: { project: EditProject; urls: Record<string, string>; shots: Shot[]; musicUrl: string | null; voice: ReelInput['voice']; brand: ReelInput['brand'] }): ReelInput` — every `ReelInput` field: `project`, `urls`, `lines: shotLines(shots)`, `musicUrl`, `voice`, `brand`, `fontUrl: FONT_URL`; `EditorPanel`'s `inputProps` is `reelInput({...})`
    - `previewInput(project: EditProject, urls: Record<string, string>, shots: Shot[], brand: ReelInput['brand']): ReelInput` — `reelInput` with `musicUrl: null`, `voice: []` (music and voiceover need their own loads; the full editor plays them)
  - `TimelineNode`: 9:16 `Player` of `Reel` with `previewInput`, a strip of clip blocks labelled by `clipLabel` (striped block for a shot without a clip), a captions row, title `Timeline · {sec}s` and `{ready} / {total} ready`, footer "⤢ Open editing" (`showEditor`) and "Export ▾" (opens the editor with the export panel)

- [ ] **Step 1: Write the failing tests**

```js
// fixture: `doc` with frames for s1 (n_vid_s1) and s2 (n_ft_s2 footage); boxes = new Map([['n_shot_s1', { x: 0, y: 100, w: 600, h: 400 }], ['n_shot_s2', { x: 0, y: 600, w: 900, h: 400 }]])
// project clips: c1 generation g1 (nodeId 'n_vid_s1', shotId 's1'), c2 take t1 (shotId 's2')
test('timelineFlow places the node right of the frames and draws a line per clip', () => {
  const { node, edges } = timelineFlow(doc, project, boxes)
  assert.equal(node.id, TIMELINE_NODE_ID)
  assert.deepEqual(node.position, { x: 900 + 120, y: 100 })
  assert.equal(node.deletable, false); assert.equal(node.draggable, false)
  assert.deepEqual(edges.map((e) => [e.id, e.source, e.target, e.targetHandle]), [['e_tl_n_vid_s1', 'n_vid_s1', 'n_timeline', 'in:clips'], ['e_tl_n_ft_s2', 'n_ft_s2', 'n_timeline', 'in:clips']])
  assert.deepEqual(timelineFlow(doc, null, boxes).edges, [])
})
test('isVirtual marks the Timeline node and its lines only', () => {
  assert.equal(isVirtual('n_timeline'), true); assert.equal(isVirtual('e_tl_n_vid_s1'), true)
  assert.equal(isVirtual('n_vid_s1'), false); assert.equal(isVirtual('e_s1'), false)
})
test('fromFlow never saves the Timeline node or its lines', () => {
  const flow = toFlow(doc)
  const tl = timelineFlow(doc, project, boxes)
  const back = fromFlow([...flow.nodes, tl.node], [...flow.edges, ...tl.edges], undefined)
  assert.ok(!back.nodes.some((n) => n.id === 'n_timeline'))
  assert.ok(!back.edges.some((e) => e.id.startsWith('e_tl_')))
  assert.deepEqual(back.nodes.map((n) => n.id), doc.nodes.map((n) => n.id))
})
test('previewInput has every ReelInput field and leaves out music and voice', () => {
  const brand = { font: 'Inter', color: '#123456', logoUrl: null }
  const shots = [{ id: 's1', time: '0-3s', shot: 'x', line: 'Hello' }, { id: 's2', time: '3-6s', shot: 'y', line: '  ' }]
  const r = previewInput(project, { g1: '/u/g1' }, shots, brand)
  assert.deepEqual(Object.keys(r).sort(), ['brand', 'fontUrl', 'lines', 'musicUrl', 'project', 'urls', 'voice'])
  assert.deepEqual(r.lines, { s1: 'Hello' })
  assert.equal(r.musicUrl, null); assert.deepEqual(r.voice, [])
  assert.equal(r.fontUrl, FONT_URL)
  assert.deepEqual(reelInput({ project, urls: {}, shots, musicUrl: '/m.mp3', voice: [], brand }).musicUrl, '/m.mp3')
})
```

- [ ] **Step 2: Run** `node --test unit/timelineNode.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** The Timeline lines get their look from `edgeLook(edge, doc, gens, takes, focus, kitSelected, { targetKind: 'timeline' })` (idle when the clip's node has no result; `n_timeline` is never looked up in `doc`).
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): timeline node on the canvas`

### Task C4: Full-screen editor rework

**Files:**
- Modify: `src/components/editor/EditorPanel.tsx` (layout; StepBar removed; props), `src/components/editor/ToolTabs.tsx` (ticks), `src/components/editor/Timeline.tsx` (labels, right-click "Show on canvas")
- Delete: `src/components/editor/StepBar.tsx`
- Create: `src/components/editor/ShotClips.tsx` (left column), `src/components/editor/ClipSettings.tsx` (Clips tab content for the selected clip)
- Modify: `src/lib/editor/steps.ts` (new `tabsDone`; `EDITOR_STEPS`/`STEP_LABEL` removed if nothing else uses them), `unit/editorSteps.test.mjs`
- Modify: `src/components/canvas/CanvasScreen.tsx` (`onJumpToNode`), `src/styles/editor*.css` or `canvas.css` (whichever holds `.cv-ed-*`), `src/lib/strings/editor.ts`

**Interfaces:**
- Consumes: `clipLabel`, `useForShot`, `stepsDone`.
- Produces:
  - `EditorPanel` props add `onJumpToNode: (nodeId: string) => void` and `focus?: 'export' | 'send' | null` (opens the export panel and focuses that control)
  - `tabsDone(facts: StepFacts & { texts: number; voices: number; music: boolean }, visited: ReadonlySet<Tool>): Partial<Record<Tool, boolean>>` — a tab is ticked only after it was opened this session and its condition holds (clips: a clip; captions: on; music: set; brand: logo shown and the client has one; text: a text; voice: a voiceover); spec §7.2 "no ticks in advance"
  - `ToolTabs` prop `done: Partial<Record<Tool, boolean>>`
  - Layout: left `ShotClips` (each shot: its candidate footage with `clipLabel`, "Use" calls `useForShot`), centre player, right tabs (Clips tab = `ClipSettings`: length, per-shot caption on/off via `setShotCaption`, "↗ Show on canvas"), bottom timeline. The export popover is anchored over the centre column so it never covers the right tabs.
  - Jump: `onJumpToNode` closes the editor, selects the node and `fitView({ nodes: [{ id }], maxZoom: getZoom(), duration: 300 })`; this replaces the viewport restore for that one return

- [ ] **Step 1: Write the failing test** in `unit/editorSteps.test.mjs`:

```js
test('tabsDone ticks only visited tabs whose step is done', () => {
  const facts = { project: { clips: [], captions: { enabled: true }, showLogo: true }, clientHasLogo: true, cut: null, texts: 0, voices: 0, music: false }
  assert.equal(tabsDone(facts, new Set()).captions, false) // on by default, not visited: no tick in advance
  assert.equal(tabsDone(facts, new Set(['captions'])).captions, true)
  assert.equal(tabsDone(facts, new Set(['clips'])).clips, false) // visited, no clip
  assert.equal(tabsDone({ ...facts, project: { ...facts.project, clips: [{}] } }, new Set(['clips'])).clips, true)
  assert.equal(tabsDone({ ...facts, clientHasLogo: false }, new Set(['brand'])).brand, false)
  assert.equal(tabsDone({ ...facts, texts: 1, voices: 1, music: true }, new Set(['text', 'voice', 'music'])).voice, true)
  assert.equal(tabsDone({ ...facts, texts: 1 }, new Set(['voice'])).text, false)
})
```

- [ ] **Step 2: Run** `node --test unit/editorSteps.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** No transition control (see Spec gaps: the edit project has no transitions).
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): full-screen editor with shot clips, tabs and jump to node`

### Task C5: Send for approval works the first time

**Files:**
- Modify: `src/lib/cut.ts` (new `sendWithLink`, `NoLinkError`), `src/components/editor/ExportBar.tsx` (prop `clientId`; "Create link" button), `src/components/editor/EditorPanel.tsx` (passes `clientId`; `focus`)
- Modify: `backend/renders.py:66` (`NO_LINK`), `backend/tests/test_renders.py:373`, `src/lib/strings/server.ts` (en + zh entries for the new sentence, old one removed), `src/lib/strings/cut.ts` (`cut.err.link`: `Couldn't turn on the review link.` / `無法開啟審閱連結。`, `cut.panel.makeLink`: `Create link` / `建立連結`)
- Modify: `src/components/canvas/CanvasScreen.tsx` (toolbar Send for approval)
- Test: `unit/cut.test.mjs`, `backend/tests/test_renders.py`

**Interfaces:**
- Consumes: `createShareLink` (`src/lib/share.ts`, idempotent: returns the client's existing link), `sendCutForReview`.
- Produces:
  - `class NoLinkError extends Error {}`
  - `sendWithLink(ideaId: string, clientId: string, deps?: { link?: (clientId: string) => Promise<unknown>; send?: (ideaId: string) => Promise<CutState> }): Promise<CutState>` — turns the link on first (throws `NoLinkError` when that fails), then sends
  - `NO_LINK = "This client's review link is turned off. Use Get review link on the Plans board, then try again."` (no "Shortlist"; spec §8.1)
  - Toolbar "Send for approval" (spec §12.5.4): always enabled when not read-only; opens the editor with `focus: 'send'`; with no exported video the export panel shows `editor.export.needFirst` beside Export

- [ ] **Step 1: Write the failing tests**

```js
test('sendWithLink turns the link on, then sends', async () => {
  const calls = []
  const cut = await sendWithLink('i1', 'c1', { link: async (c) => calls.push(['link', c]), send: async (i) => (calls.push(['send', i]), { status: 'done' }) })
  assert.deepEqual(calls, [['link', 'c1'], ['send', 'i1']]); assert.equal(cut.status, 'done')
})
test('sendWithLink throws NoLinkError and does not send when the link fails', async () => {
  let sent = false
  await assert.rejects(sendWithLink('i1', 'c1', { link: async () => { throw new Error('403') }, send: async () => { sent = true; return { status: 'done' } } }), NoLinkError)
  assert.equal(sent, false)
})
test('sendWithLink passes a send error through unchanged', async () => {
  const boom = new Error('Wait for the cut to finish before sending it.')
  await assert.rejects(sendWithLink('i1', 'c1', { link: async () => ({}), send: async () => { throw boom } }), (e) => e === boom)
})
```

```python
def test_send_needs_review_link_409(client, fake_export):
    finished_cut(client)  # existing helpers in test_renders.py; no review link made
    r = send(client)
    assert r.status_code == 409
    assert r.json()["error"] == renders.NO_LINK == "This client's review link is turned off. Use Get review link on the Plans board, then try again."
    assert "Shortlist" not in r.json()["error"]
```

- [ ] **Step 2: Run** `node --test unit/cut.test.mjs` and `pytest -q backend/tests/test_renders.py backend/tests/test_server_text.py` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test unit/`, `backend/.venv/bin/python -m pytest -q backend/tests/test_renders.py backend/tests/test_server_text.py`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `fix(trend-finder): send for approval turns the review link on first`

### Task C6: Phase C acceptance

**Files:**
- Create: `e2e/polish-c-timeline.cjs`

- [ ] **Step 1: Write the E2E script** for spec §10.7–§10.9 (mock, 1440×900, screenshots):
  - "Put in timeline" on a finished video: toast shown, URL and screen unchanged (no editor), node shows "✓ On timeline", Timeline node shows one more block and "1 / 3 ready", frame shows "✓ main clip";
  - another version of the same shot: still one block for that shot;
  - legacy project with two clips of s1 (PUT through `L.putProject`): after load one clip, the trim toast once;
  - Open editing: clip names read "Shot 1 · v…"; right-click "Show on canvas" returns, that node is selected and inside the viewport;
  - Export (mock render), then Send for approval with the client's link turned off first (`DELETE /api/share?clientId=evergreen`): review status becomes waiting in one click;
  - toolbar Send for approval before any export: the editor opens with "Export the video first to send it.".
- [ ] **Step 2: Run** → all PASS.
- [ ] **Step 3: Phase gate** — `VERIFY` GREEN, build OK, eslint 0 errors, `TYPECHECK` exit 0, `node render/smoke.mjs` OK.
- [ ] **Step 4: Commit, push, open PR 3** (base `feat/canvas-polish-b-nodes`).

---

## Phase D: Minimal AI agent (PR 4)

Ends with: "✦ Build this shot" on a frame (and from the rail), a plan of node cards with prices in the right panel, Approve and run / Create only / Cancel; a mock plan without a key. Spec §9, §10.10, then the full §10 pass.

### Task D1: Backend planning route

**Files:**
- Create: `backend/agent.py`
- Modify: `backend/server.py:928` (`import agent`; `app.include_router(agent.make_router(load, storyboard_budget))`)
- Modify: `backend/assist.py:1` (header: these helpers only describe real videos; writing prompts for the canvas is `agent.py`'s job, spec §9.1)
- Modify: `backend/tests/test_server_text.py` (`MODULES` adds `"agent"`), `src/lib/strings/server.ts`
- Test: `backend/tests/test_agent.py`

**Interfaces:**
- Consumes: `generations.menu_models()` (called through the module, so tests can patch it), `storyboard.use_claude()`, `assist.CHEAP_MODEL` (`claude-haiku-5-5`), the server's `storyboard_budget("claude", usd)` (charges `DAILY_CLAUDE_USD`).
- Produces:
  - `AGENT_USD = 0.01`, `AGENT_MAX_TOKENS = 1500`, `MAX_AGENT_PROMPT = 1000`
  - `class AgentRequest(BaseModel): shotId: str`
  - `class AgentOut(BaseModel): storyboardPrompt: str (1..MAX_AGENT_PROMPT); storyboardModel: str; videoPrompt: str (1..MAX_AGENT_PROMPT); videoModel: str; duration: int`
  - `sample_plan(shot: dict, menu: list[dict]) -> AgentOut` — prompts built from the shot's line or description; `mock-image`, `mock-video`, the video model's first duration
  - `ask_claude(context: dict, menu: list[dict]) -> AgentOut` — one call shaped like `shotlist.ask_claude` (`anthropic.Anthropic().beta.messages.parse(..., output_format=AgentOut)`) with `model=assist.CHEAP_MODEL`; the system prompt lists the available menu models (id, kind, tier, price, durations, whether it takes a start frame); refusal or `max_tokens` raises
  - `check_plan(out: AgentOut, menu: list[dict]) -> Optional[str]` — storyboard model must be an available image model; video model an available video model whose `inputs.startFrame` is not `none`; duration in its `durations`
  - `make_router(load, budget) -> APIRouter`: `POST /api/ideas/{idea_id}/agent/plan` → `{"source": "demo" | "claude", "shotId", "storyboard": {"prompt", "model"}, "video": {"prompt", "model", "duration"}, "planUsd"}` (`planUsd` = `AGENT_USD` for Claude, 0 for demo). Context sent: the shot (purpose, time, line, shot), the other shots' lines, and the client's kit item names and kinds. Never writes the canvas.
  - Errors (English, added to `server.ts`): 404 `That plan doesn't exist.` / `That shot isn't in this plan.`; 409 `Approve the plan before building shots.`; 502 `Couldn't plan this shot. Try again.`; budget 429 from the wallet as today

- [ ] **Step 1: Write the failing tests** (`backend/tests/test_agent.py`, fixtures from `test_shotlist.py`: `demo_mode` and `claude_on` patterns, `store_ideas`/`plan` from `test_takes`/`test_canvas`)

```python
# helpers: store_ideas(plan("ia"), plan("iw", "waiting")) with shot s1 line "Fresh tofu daily"; plan_for(client, shot="s1") posts
# /api/ideas/ia/agent/plan; claude_on(monkeypatch, answer) sets the key and replaces agent.ask_claude, returning its call list;
# spent("claude") reads server.load(f"spend:{server.today()}") as test_storyboard.py:238 does; good = AgentOut(storyboardPrompt="a", storyboardModel="mock-image", videoPrompt="b", videoModel="mock-video", duration=4)
def test_agent_demo_plan_without_key(client):
    r = plan_for(client)
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "demo" and body["shotId"] == "s1" and body["planUsd"] == 0
    assert body["storyboard"]["model"] == "mock-image" and body["video"]["model"] == "mock-video" and body["video"]["duration"] == 4

def test_agent_uses_shot_line_in_demo_prompts(client):
    body = plan_for(client).json()
    assert "Fresh tofu daily" in body["storyboard"]["prompt"] and "Fresh tofu daily" in body["video"]["prompt"]

def test_agent_claude_plan_charges_the_wallet(client, monkeypatch):
    calls = claude_on(monkeypatch, good)
    before = spent("claude")
    body = plan_for(client).json()
    assert body["source"] == "claude" and body["planUsd"] == agent.AGENT_USD and len(calls) == 1
    assert spent("claude") == pytest.approx(before + agent.AGENT_USD)

def test_agent_rejects_unknown_model(client, monkeypatch):
    claude_on(monkeypatch, good.model_copy(update={"videoModel": "gpt-x"}))
    v = client.get("/api/ideas/ia/canvas").json()["version"]
    r = plan_for(client)
    assert r.status_code == 502 and r.json()["error"] == "Couldn't plan this shot. Try again."
    assert client.get("/api/ideas/ia/canvas").json()["version"] == v

def test_agent_rejects_bad_duration(client, monkeypatch):
    claude_on(monkeypatch, good.model_copy(update={"duration": 7}))
    assert plan_for(client).status_code == 502

def test_agent_rejects_video_model_without_start_frame(client, monkeypatch):
    menu = [{**m, "inputs": {**m["inputs"], "startFrame": "none"}} if m["kind"] == "video" else m for m in generations.menu_models()]
    monkeypatch.setattr(generations, "menu_models", lambda: menu)
    claude_on(monkeypatch, good)
    assert plan_for(client).status_code == 502
    assert agent.check_plan(good, generations.menu_models()) is not None

def test_agent_over_budget_429_no_call(client, monkeypatch):
    calls = claude_on(monkeypatch, good)
    monkeypatch.setattr(server, "DAILY_CLAUDE_USD", 0.0)
    assert plan_for(client).status_code == 429 and calls == []

def test_agent_missing_plan_or_shot_404(client):
    r = client.post("/api/ideas/nope/agent/plan", json={"shotId": "s1"})
    assert r.status_code == 404 and r.json()["error"] == "That plan doesn't exist."
    r = plan_for(client, shot="s9")
    assert r.status_code == 404 and r.json()["error"] == "That shot isn't in this plan."

def test_agent_not_approved_409(client):
    r = client.post("/api/ideas/iw/agent/plan", json={"shotId": "s1"})
    assert r.status_code == 409 and r.json()["error"] == "Approve the plan before building shots."

def test_agent_never_writes_the_canvas(client, monkeypatch):
    before = client.get("/api/ideas/ia/canvas").json()
    assert plan_for(client).status_code == 200
    claude_on(monkeypatch, good)
    assert plan_for(client).status_code == 200
    assert client.get("/api/ideas/ia/canvas").json() == before
```

- [ ] **Step 2: Run** `backend/.venv/bin/python -m pytest -q backend/tests/test_agent.py` → FAIL (no module).
- [ ] **Step 3: Implement.** No test reaches Claude (`ask_claude` is replaced in every test).
- [ ] **Step 4: Run** `backend/.venv/bin/python -m pytest -q backend/tests/test_agent.py backend/tests/test_server_text.py`, then `VERIFY` → PASS, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): agent route that plans one shot's nodes`

### Task D2: Agent client and plan applying

**Files:**
- Create: `src/lib/canvas/agent.ts`
- Test: `unit/agent.test.mjs`

**Interfaces:**
- Consumes: `shotNodeOf`, `frameOf` (B1), `addNode`, `wireStart` (B2, B3), `wireKit`, `chainPair`, `priceOf`.
- Produces:
  - `interface AgentPlan { source: 'demo' | 'claude'; shotId: string; storyboard: { prompt: string; model: string }; video: { prompt: string; model: string; duration: number }; planUsd: number }`
  - `askAgent(ideaId: string, shotId: string): Promise<AgentPlan>` (`shotId` is the Shot id; POSTs `{ shotId }`; server sentence through `serverText` on error)
  - `applyAgentPlan(doc: CanvasDoc, shotId: string, plan: AgentPlan, models: GenModel[]): { doc: CanvasDoc; storyboardId: string; videoId: string; changed: string[] }` — `shotId` is the Shot id; the frame is `shotNodeOf(doc, shotId)` and its members are the nodes with that `shotId`; throws when the shot has no node; reuses the frame's primary storyboard (else its newest) and the video on that storyboard's `in:start` (else the frame's newest video); creates what is missing (`addNode` + `wireStart` + `wireKit`); sets `model`, `prompt` and, for the video, `duration`; `changed` lists already-existing nodes whose settings changed, never newly created ones (the caller marks them stale; results are never removed, spec §9.2.5); same doc when nothing changes
  - `planCost(plan: AgentPlan, models: GenModel[]): { storyboard: number; video: number; total: number }`

- [ ] **Step 1: Write the failing tests**

```js
// fixture: `empty` = n_shot_s1 + n_kit (wired kit rule as kit.test.mjs), no members; `full` = n_shot_s1, n_sb_s1 (primary), n_vid_s1 with e_s in:start;
// plan = { source: 'demo', shotId: 's1', storyboard: { prompt: 'A', model: 'mock-image' }, video: { prompt: 'B', model: 'mock-video', duration: 6 }, planUsd: 0 }
// models: mock-image price { per: 'image', usd: 0.04 }, mock-video price { per: 'second', usd: 0.05 }, durations [4, 6], startFrame optional
test('applyAgentPlan builds a storyboard and a wired video in an empty frame', () => {
  const r = applyAgentPlan(empty, 's1', plan, models)
  const sb = r.doc.nodes.find((n) => n.id === r.storyboardId), vid = r.doc.nodes.find((n) => n.id === r.videoId)
  assert.deepEqual([sb.type, sb.shotId, sb.data.model, sb.data.prompt], ['storyboard', 's1', 'mock-image', 'A'])
  assert.deepEqual([vid.type, vid.shotId, vid.data.model, vid.data.prompt, vid.data.duration], ['video', 's1', 'mock-video', 'B', 6])
  assert.ok(r.doc.edges.some((e) => e.source === r.storyboardId && e.target === r.videoId && e.targetHandle === 'in:start'))
  assert.ok(r.doc.edges.some((e) => e.source === 'n_kit' && e.target === r.storyboardId && e.targetHandle === 'in:kit'))
  assert.deepEqual(r.changed, [])
  assert.throws(() => applyAgentPlan(empty, 'nope', plan, models))
})
test('applyAgentPlan updates the existing nodes instead of adding a second set', () => {
  const r = applyAgentPlan(full, 's1', plan, models)
  assert.equal(r.doc.nodes.length, full.nodes.length)
  assert.deepEqual([r.storyboardId, r.videoId], ['n_sb_s1', 'n_vid_s1'])
  assert.deepEqual(r.changed, ['n_sb_s1', 'n_vid_s1'])
  assert.equal(r.doc.nodes.find((n) => n.id === 'n_vid_s1').data.duration, 6)
})
test('applyAgentPlan keeps versions and returns the same doc when the plan matches', () => {
  const once = applyAgentPlan(full, 's1', plan, models).doc
  once.nodes.find((n) => n.id === 'n_sb_s1').data.selected = 'g1'
  const again = applyAgentPlan(once, 's1', plan, models)
  assert.equal(again.doc, once)
  assert.deepEqual(again.changed, [])
  assert.equal(again.doc.nodes.find((n) => n.id === 'n_sb_s1').data.selected, 'g1')
})
test('planCost uses the video length', () => {
  assert.deepEqual(planCost(plan, models), { storyboard: 0.04, video: 0.3, total: 0.34 })
  assert.deepEqual(planCost({ ...plan, video: { ...plan.video, duration: 4 } }, models).video, 0.2)
})
test('askAgent posts the shot id and throws the server sentence', async () => {
  const seen = []
  globalThis.fetch = async (url, init) => (seen.push([url, init.method, JSON.parse(init.body)]), { ok: true, status: 200, json: async () => plan }) // same stub shape as canvas.test.mjs:141
  assert.deepEqual(await askAgent('ia', 's1'), plan)
  assert.deepEqual(seen, [['/api/ideas/ia/agent/plan', 'POST', { shotId: 's1' }]])
  globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({ error: "Couldn't plan this shot. Try again." }) })
  await assert.rejects(askAgent('ia', 's1'), { message: "Couldn't plan this shot. Try again." })
})
```

- [ ] **Step 2: Run** `node --test unit/agent.test.mjs` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN.
- [ ] **Step 5: Commit** `feat(trend-finder): apply an agent plan to a shot frame`

### Task D3: Agent panel and entry points

**Files:**
- Create: `src/components/canvas/AgentPanel.tsx`
- Modify: `src/components/canvas/nodes/ShotNode.tsx` (✦ button; hidden for removed shots and read-only), `src/components/canvas/ToolRail.tsx` (`onAgent` opens a shot list), `src/components/canvas/CanvasScreen.tsx`, `src/lib/strings/canvas.ts`

**Interfaces:**
- Consumes: `askAgent`, `applyAgentPlan`, `planCost` (D2), `ModelPicker` (B6), `runScope`/`runBatches` and the Run all dialog (B7).
- Produces:
  - `AgentPanel` props `{ shotId: string; plan: AgentPlan | null; loading: boolean; error: string | null; onChange: (p: AgentPlan) => void; onApprove: () => void; onCreate: () => void; onCancel: () => void }` — `shotId` is the Shot id (the frame's ✦ passes its shot node's `shotId`; the rail's shot list passes `Shot.id`); two cards (storyboard: prompt + model; video: prompt + model + length), price per card, total, `canvas.agent.planCost`
  - Approve and run: `applyAgentPlan` → `adopt` → `markFrom` for `changed` → `runScope(..., { shotId, includeStale: false })` → the B7 dialog → batches. Create only: apply without running. Cancel: drop the plan, doc unchanged. The panel replaces the node panel while open.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Run** `node --test unit/`, `TYPECHECK`, `VERIFY` → PASS, exit 0, GREEN. The ✦ hiding and Cancel behaviour are checked by D4's E2E steps "removed shot" and "Cancel".
- [ ] **Step 3: Commit** `feat(trend-finder): build this shot with the canvas agent`

### Task D4: Phase D and full acceptance

**Files:**
- Modify: `docs/STATUS.md`
- Create: `e2e/polish-d-agent.cjs`

- [ ] **Step 1: Check the decision log**: the 3 Nov 2026 entry "Canvas redesign modelled on Flora; AI may now write content on the canvas" in `docs/decision-log.md` (repo root) was written when the spec was approved. Do not add a second entry; only correct it if the build changed what it says.
- [ ] **Step 2: Write the E2E script** for §10.10 (mock, 1440×900, screenshots), each check printing `PASS`/`FAIL`:
  - "✦ Build this shot" on an empty frame shows two cards and a total;
  - Cancel: the `GET /api/ideas/idea1/canvas` body before and after is byte-for-byte equal, and `GET /api/ideas/idea1/gen` has the same rows (no generation started);
  - again, Approve and run → storyboard and video exist, start line drawn, both generations started and finish;
  - removed shot (Review Focus 2): remove a shot that has a generated storyboard from the plan through the API, reload: its frame shows "Removed from the plan", has no ✦ and no `+`, its node and versions are still there, the rail's ✦ shot list does not offer it, and the Run all dialog and the toolbar total leave it out.
- [ ] **Step 3: Run the full §10 pass**: `polish-a-shell.cjs`, `polish-b-nodes.cjs`, `polish-c-timeline.cjs`, `polish-d-agent.cjs` on one fresh isolated backend → all PASS; `VERIFY` GREEN; `npm run build` OK; `npx eslint .` 0 errors; `TYPECHECK` exit 0.
- [ ] **Step 4: Update `docs/STATUS.md`** (status line, verification with date, open items: real model wait times unverified, line/node fine-tuning after the user test).
- [ ] **Step 5: Commit, push, open PR 4** (base `feat/canvas-polish-c-timeline`).

---

## Spec gaps and decisions made in this plan

1. §6.4 says the toolbar total is "nodes without a result"; §12.5.5 says Run all also runs stale nodes. Decided (preflight ruling P7, the user saw this item): the toolbar total uses exactly the Run all scope — nodes with no result or a stale one, removed shots skipped (`runScope(..., { includeStale: true })`) — so the toolbar and the Run all dialog show the same amount (B7). If this is wrong, the only effect is a total slightly higher than "no result only". The Run all dialog lists only items that cost money (§12.5.5, ruling P6). The agent's run uses "no result only" (§9.2.5).
2. §7.2 lists "transition" in the clip settings, but the edit project and `Reel` have no transitions. Left out (C4); adding it needs a data-model and render change.
3. §4.2 picker card "1 ready" is undefined. The plan counts shots with a storyboard frame (A3), which the page already has without loading every canvas.
4. The Timeline node can't be saved (backend `NODE_TYPES` has no `timeline`, and §12.5.1 keeps the format), so it is virtual and not draggable (C3).
5. §8.1 auto-turning-on the review link also re-enables a link someone turned off on purpose. Done as specified (`createShareLink` reuses an existing link).
6. §6.5 cancel: no provider adapter has a cancel call (`backend/gen_providers.py` `Adapter` has only `submit`/`poll`), so no cancel button.
7. The editor keeps manual clip reordering; new clips are placed in shot order (C1).
8. "Planning cost about US$x" shows the fixed amount charged to the wallet (`AGENT_USD`), the same way `shotlist.py` charges, not a metered token cost.
9. The spec's `docs/design-system.md` is at `pivots/02-content/docs/design-system.md`.
10. Existing `e2e/a5-chain-guards.cjs` and the `e2e/lib.cjs` helpers `gotoCanvas` / `openEditor` depend on the old canvas UI; A4 updates `openEditor`, B8 marks a5 as outdated.
11. Baseline `npx eslint .` is red (216 errors, all in git-ignored `render/experiment/bundle-*`); A5 adds the ignore so §10.12 can pass.

## Self-review

- **Spec coverage:** §4 → A2–A5; §5 → B1–B4; §6 → B5–B7; §7 → C1–C4; §8.1 → C5, §8.2 → B3 (`wireStart`), §8.3 → B2 backend test; §9 → D1–D4 (assist.py header in D1, decision log in D4); §10.1–§10.12 → A5, B8, C6, D4; §12.5.1–§12.5.7 → B1, B1 (`kitSpot`), B2, C5, B7, C1/C2, A1.
- **Step scan:** every task has a test step, a run-to-fail step (except pure wiring tasks A4, B6, C2, D3, which are covered by the phase E2E), implementation, a green run and a commit. Every named test has concrete assertions. Every task touching `src/` runs `TYPECHECK`; every task ends with `VERIFY` from the repo root. Each removal (`roomBelow`, `edgeLabel` → B4; `PortLabels` → B5; `isPrimaryPin`, `canvas.clip.add/primary/isPrimary/drag` → C2) sits in the task that edits the last consumer, so every task compiles.
- **Type consistency:** `Box`, `FlowNode` fields, `QueueItem`, `RunItem`, `RunBatch`, `NodeStatus`, `AgentPlan` are defined once and only consumed afterwards; `useForShot` replaces `addClip`/`openDrawer` in every consumer (`EditorPanel`, `Timeline`, `ClipActions`). `shotId` is always the Shot id (`addNode`, `RunItem`, `runScope`, `AgentRequest`, `askAgent`, `applyAgentPlan`, `AgentPanel`); shot node ids appear only as frame keys (`frameOf`, `frameBoxes`, `slotInFrame`) and come from `shotNodeOf` (B1).
- **Shared helpers (no second copy):** prompt order → `shotTextSource` (B2, used by `genRequest` and the panel); "has a result" → `hasResult` (B3, used by `edgeLook`, `nodeStatus`, `runScope`, the Timeline lines); Reel props → `reelInput` (C3, used by `EditorPanel` and `previewInput`); the whole-shot run → `runScope({ shotId })` + `chainBody` (B7, shared with Run all).
- **Review focus:** all five items have a test in the task that owns the behaviour (A2, B1 + B8, B7 + D4 E2E, C1, D1/D2 + D4 E2E).
- **Proportion:** signatures, test names and assertions only; no function bodies.
