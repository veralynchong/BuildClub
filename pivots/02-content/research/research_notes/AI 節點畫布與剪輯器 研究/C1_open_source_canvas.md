# C1: Open-source building blocks and reference projects for a node-based AI generation canvas (React 19 + Vite + FastAPI)

All GitHub/npm figures were checked on **2026-11-02** (date accessed) via the GitHub REST API (`gh api repos/<owner>/<repo>`, `/releases/latest`) and `npm view`. Web pages were fetched the same day. "Stars" = stargazers_count on that date. GitHub reports `NOASSERTION` as licence when the licence file is non-standard; for those I give the npm/LICENSE-file reading instead. Items marked **[UNVERIFIED]** could not be confirmed from a source I read.

## Q1. Canvas / graph libraries: licence, activity, React 19, fit for media-heavy nodes

### Takeaway
React Flow (`@xyflow/react`, MIT, 38.9k stars, released the same day I checked) is the clear default for a node-and-edge canvas in React 19 + Vite: free core, active, and it is the library under nearly every AI-canvas repo I found. tldraw is excellent but its SDK is not open source and needs a paid licence key in production; Rete.js, Flume, JointJS and Konva are either less active, heavier to integrate, or lower-level than needed.

### Cited Findings
**React Flow / xyflow**
- `xyflow/xyflow`: 38,864 stars, MIT, last push 2026-11-02; latest `@xyflow/react@12.12.1` published 2026-11-02 (checked 2026-11-02) — [GitHub repo](https://github.com/xyflow/xyflow), [releases](https://github.com/xyflow/xyflow/releases)
- npm `@xyflow/react` 12.12.1, licence MIT, `peerDependencies.react: ">=17"` (so React 19 is within range) — [npm @xyflow/react](https://www.npmjs.com/package/@xyflow/react) (checked via `npm view`, 2026-11-02)
- React 19 issues were reported in early 2025 (#4893 "Conflict dependency React 19", #5095 zustand bump, #5229 "React 19 not supported"); all three are closed (closed 2025-03-18 to 2025-04-22) — [xyflow issue search](https://github.com/xyflow/xyflow/issues?q=React+19)
- Real-world evidence of React 19 + React Flow 12: Langflow's frontend declares `@xyflow/react ^12.3.6` with `react ^19.2.1` (it also still lists legacy `reactflow ^11.11.3`); node-banana v2.3.0 uses `@xyflow/react 12.11.2` with `react ^19.2.0` — [langflow package.json](https://github.com/langflow-ai/langflow/blob/main/src/frontend/package.json), [node-banana package.json](https://github.com/shrimbly/node-banana/blob/main/package.json)
- Core is "open-source MIT-licensed software, and it will be forever." Pro tiers: Starter $169/month (Pro Examples and Templates, 1 team member), Professional $289/month (5 members, up to 1 hour support/month), Enterprise custom. Free access for students, educators and non-commercial open-source — [React Flow Pro](https://reactflow.dev/pro) (accessed 2026-11-02)
- Pro Examples (source code, not a runtime library): Auto Layout (dagre/d3-hierarchy/elkjs), **Collaborative (React Flow + yjs)**, Copy and Paste, Dynamic Layouting, Edge Routing (libavoid), Editable Edge, Expand and Collapse, Force Layout, Freehand Draw, Helper Lines, Node Position Animation, Parent Child Relation, Selection Grouping, Server Side Image Creation (Puppeteer), Shapes, **Undo and Redo**. Pro Templates: **Workflow Editor Template** and **AI Workflow Template**. The page says examples can be used "anywhere" and "forever" with a subscription; formal licence text not shown on the page — [React Flow Pro Examples](https://reactflow.dev/pro/examples) (accessed 2026-11-02)
- Performance guidance from the official docs: memoize custom nodes/edges (`React.memo`), memoize callbacks and object props, don't read full `nodes`/`edges` arrays in components (use selectors), keep derived state (e.g. selected IDs) separate, collapse large trees via `hidden`, simplify CSS (animations/shadows/gradients). The page does not discuss media-heavy nodes specifically — [React Flow Performance](https://reactflow.dev/learn/advanced-use/performance) (accessed 2026-11-02)

**tldraw**
- `tldraw/tldraw`: 51,196 stars, GitHub licence `NOASSERTION`, latest release v5.6.0 on 2026-10-28; npm `tldraw` 5.6.0 licence "SEE LICENSE IN LICENSE.md", peer `react ^18.2.0 || ^19.2.1` — [GitHub](https://github.com/tldraw/tldraw), [npm tldraw](https://www.npmjs.com/package/tldraw) (checked 2026-11-02)
- Licence file: development use permitted; "Not to use the Software in Production Environments" without a trial or commercial licence; must not disable licence-key enforcement; may collect and transmit usage data for compliance; not redistributable as a standalone product — [tldraw LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md) (read 2026-11-02)
- Official statement: SDK is "source available but not permissively licensed, so it doesn't qualify as open source"; production needs trial (free 100 days, one per business unit), commercial, or hobby licence (non-commercial, watermark required) — [tldraw licence page](https://tldraw.dev/community/license) (accessed 2026-11-02)
- Commercial price is not published: "Value-based pricing", "Talk to sales", "Discounted pricing is available for new companies" — [tldraw pricing](https://tldraw.dev/pricing) (accessed 2026-11-02). **Price: unverified/not public.**
- tldraw ships starter kits including **workflow**, **image-pipeline**, **branching-chat**, **agent**, plus sync templates (`sync-cloudflare`, `socketio-server-example`) in the monorepo `templates/` folder — [tldraw templates](https://github.com/tldraw/tldraw/tree/main/templates) (checked 2026-11-02); [Workflow kit](https://tldraw.dev/starter-kits/workflow)

**Rete.js**
- `retejs/rete`: 12,301 stars, MIT, repo pushed 2026-10-25, but latest release v2.0.6 is 2025-06-30 (about 16 months old) — [GitHub](https://github.com/retejs/rete). `rete-react-plugin` 2.1.2 peers `react ^16.8.6 || ^17 || ^18 || ^19` and requires `styled-components` — [npm rete-react-plugin](https://www.npmjs.com/package/rete-react-plugin) (checked 2026-11-02)
- Rete is a framework with its own dataflow/control-flow engines and plugin architecture (area, connection, render plugins). **[UNVERIFIED in this session: dataflow-engine details; from prior knowledge only.]**

**LiteGraph.js / ComfyUI frontend**
- ComfyUI frontend `Comfy-Org/ComfyUI_frontend`: 2,111 stars, **GPL-3.0-only**, v1.60.0 (2026-10-26), depends on **Vue** — [GitHub](https://github.com/Comfy-Org/ComfyUI_frontend), [package.json](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/package.json)
- Comfy's fork `Comfy-Org/litegraph.js`: 256 stars, MIT, last release v0.17.2 (2025-08-06), last push 2026-01-14; npm `@comfyorg/litegraph` 0.17.2 MIT, modified 2026-11-01 — [GitHub](https://github.com/Comfy-Org/litegraph.js), [npm](https://www.npmjs.com/package/@comfyorg/litegraph). Original `jagenjo/litegraph.js`: 8,175 stars, MIT, last push 2024-08-01 (effectively dormant) — [GitHub](https://github.com/jagenjo/litegraph.js)
- LiteGraph renders on a plain `<canvas>` (not DOM). **[UNVERIFIED here]** — implication is that embedding `<video>`/React previews inside nodes is awkward compared with React Flow's DOM nodes.

**Excalidraw**
- `excalidraw/excalidraw`: 135,016 stars, MIT, last push 2026-11-01; latest release v0.18.1 on 2026-04-21; npm `@excalidraw/excalidraw` 0.18.1 peers `react ^17 || ^18 || ^19` — [GitHub](https://github.com/excalidraw/excalidraw), [npm](https://www.npmjs.com/package/@excalidraw/excalidraw) (checked 2026-11-02)
- It is a whiteboard/drawing tool, not a node/port graph editor; no port/edge-binding model. **[Inference; not sourced]**

**Konva / react-konva**
- `konvajs/konva`: 14,915 stars, GitHub shows NOASSERTION but npm `konva` 10.9.1 says MIT; released 2026-10-31. npm `react-konva` 19.3.2 (MIT) peers `react ^19.3.0` — [GitHub](https://github.com/konvajs/konva), [npm konva](https://www.npmjs.com/package/konva), [npm react-konva](https://www.npmjs.com/package/react-konva) (checked 2026-11-02)
- Konva is a 2D canvas primitive library; node-banana uses it only for an annotation node, on top of React Flow — [node-banana README](https://github.com/shrimbly/node-banana)

**JointJS / others**
- `clientIO/joint`: 5,396 stars, **MPL-2.0**, pushed 2026-10-29; npm `@joint/core` 4.3.4 and `@joint/react` 4.3.7 (both MPL-2.0; `@joint/react` peers react >=18) — [GitHub](https://github.com/clientIO/joint), [npm @joint/react](https://www.npmjs.com/package/@joint/react) (checked 2026-11-02). Commercial JointJS+ tier existence/pricing **[UNVERIFIED in this session]**.
- Flume (`chrisjpatty/flume`): 1,627 stars, MIT, v1.1.0 (2025-03-23), npm latest 1.2.0 (modified 2025-11-05) with peers `react ^18.2.0` only — i.e. no declared React 19 support — [GitHub](https://github.com/chrisjpatty/flume), [npm flume](https://www.npmjs.com/package/flume)
- Other: AntV X6 (`antvis/X6`): 6,750 stars, MIT, v3.1.7 (2026-03-18) — [GitHub](https://github.com/antvis/X6); Vue Flow is Vue-only (6,929 stars, MIT) so irrelevant — [GitHub](https://github.com/bcakmakoglu/vue-flow). Auto-layout helpers: `@dagrejs/dagre` 3.1.3 (MIT); `elkjs` 0.12.1 is **EPL-2.0 OR GPL-3.0-or-later** (npm, checked 2026-11-02).

### Inferences
- For "each shot is a node with inline image/video previews", DOM-based nodes (React Flow) are a better match than canvas-rendered nodes (LiteGraph, Konva-only) because `<video>`, `<img>`, and React components drop in directly. Not benchmarked; no source I read tests media-heavy performance.
- Media-heavy performance will depend on app discipline (memoized nodes, thumbnails/posters instead of autoplaying every video, lazy-loading when off-screen, selectors). The React Flow docs support the first two techniques in general terms only.
- tldraw is the only candidate that adds real cost and lock-in: price unknown, client-side licence-key checks and usage pings. It is a viable alternative only if you want a freeform whiteboard (drawing, free-placed images) around the nodes.
- Rete.js is credible but has 5–10x fewer stars than React Flow, no release since 2025-06, and a smaller ecosystem of AI-canvas examples.

### Gaps
- No benchmark found for N media nodes on React Flow vs alternatives; no official "onlyRenderVisibleElements" guidance on the performance page I read.
- tldraw commercial price not published; Rete engine details and JointJS+ commercial terms not verified.
- Whether React Flow's Pro example licence permits resale of a SaaS built from template code was not stated on the pages I could read ("anywhere", "forever" only); read the Pro FAQ/terms before subscribing.

---

## Q2. Open-source AI node-canvas clones / reference implementations, and ComfyUI as a backend

### Takeaway
There are working MIT-licensed React Flow image/video canvases to study, led by `shrimbly/node-banana` (1,657 stars, MIT, v2.3.0 on 2026-10-23); most others are tiny, Next.js-based, or AGPL. Flowise (the "pattern" repo) was archived on 2026-08-13; Langflow is MIT, active, and React 19 + React Flow, but it is an LLM-agent builder not a media canvas. ComfyUI is GPL-3.0 but is run as a separate server; Comfy Cloud exposes a paid API.

### Cited Findings
**Reference AI canvases (all checked 2026-11-02)**
- **shrimbly/node-banana**: 1,657 stars, MIT, v2.3.0 (2026-10-23), last push 2026-10-30. Next.js 16 + React 19 + `@xyflow/react 12.11.2` + Konva + Zustand 5. Nodes: Image/Audio Input, Prompt, Prompt Constructor, Array; Generate (image), Generate Video, Generate Audio, Generate 3D, LLM; Annotation, Split Grid, Edit Video, Video Trim, Frame Grab, Image Compare, Ease Curve; Router, Switch, Conditional Switch; GLB Viewer, Output, Output Gallery. Providers: Gemini, Replicate, fal.ai, Kie.ai, WaveSpeed, ComfyUI, OpenAI (LLM), Anthropic. Workflows are portable JSON, autosave, generated media goes to an asset library; "Group Locking" skips locked groups on run; batch runs N times — [README](https://github.com/shrimbly/node-banana), [package.json](https://github.com/shrimbly/node-banana/blob/main/package.json). Note: `jinwyp/node-banana` is a 1-star mirror/fork; use `shrimbly`.
- **maxlibin/bananaflow**: 1 star, **AGPL-3.0**, pushed 2026-09-29. Next.js + React Flow + Postgres/Drizzle; provider adapters; async jobs (Veo/Sora) polled by an in-process scheduler; finalizer stores assets (local or S3); screenplay editor, "Break into shots" to keyframes and videos — directly relevant to a shot-per-node product, but AGPL and tiny — [README](https://github.com/maxlibin/bananaflow)
- **gaoruitech/genrelay-loomcanvas**: 1 star, **AGPL-3.0**, pushed 2026-10-28; self-hosted node canvas, Docker Compose, BYO keys, cost estimates, team spaces — [GitHub](https://github.com/gaoruitech/genrelay-loomcanvas)
- **raph651/open-source-canvas**: 114 stars, MIT, pushed 2026-11-01; React Flow + Zustand, runs ComfyUI workflows on a local server (README: LTX-Video 2B needs ~24 GB at default size per search summary) — [GitHub](https://github.com/raph651/open-source-canvas)
- **MiaoMint/vision-flow**: 53 stars, licence NOASSERTION, v0.0.5 (2026-01-17), React 19 + TypeScript + ReactFlow with Text/Image/Video/Audio/Group nodes — [GitHub](https://github.com/MiaoMint/vision-flow). Licence unverified.
- **crisng95/flowboard**: 492 stars, **no licence**, v1.3.0 (2026-09-18); depends on Google Flow subscription via Chrome extension — not suitable (no licence, ToS-fragile) — [GitHub](https://github.com/crisng95/flowboard)
- Search for more via `gh search repos` ("reactflow yjs", "xyflow image generation workflow") returned almost nothing else of note (only `synergycodes/reactflow-yjs-integration`, 10 stars, no licence, pushed 2026-01-12) — [GitHub](https://github.com/synergycodes/reactflow-yjs-integration)

**Pattern repos (LLM workflow builders)**
- **Langflow** `langflow-ai/langflow`: 156,251 stars, MIT, v1.13.0 (2026-10-22), pushed 2026-11-02; frontend on React 19 + `@xyflow/react` + Zustand 4 — [GitHub](https://github.com/langflow-ai/langflow), [frontend package.json](https://github.com/langflow-ai/langflow/blob/main/src/frontend/package.json)
- **Flowise** `FlowiseAI/Flowise`: 55,543 stars; README says source is Apache 2.0 (GitHub shows NOASSERTION; the README does not mention an enterprise licence, so no mixed-licence confirmation); **archived by owner on 2026-08-13**, last release flowise@3.1.4 (2026-07-29), pointing to discussion "Future of Flowise" #6727 (reason not read) — [GitHub](https://github.com/FlowiseAI/Flowise), [discussion #6727](https://github.com/FlowiseAI/Flowise/discussions/6727)
- **n8n** (209,342 stars) shows NOASSERTION (its "Sustainable Use" licence is source-available) — [GitHub](https://github.com/n8n-io/n8n); licence text not read this session. **[Treat as not reusable for a SaaS; UNVERIFIED]**

**Commercial products being cloned**
- Figma acquired Weavy (Tel Aviv, founded 2024, ~20 employees, price undisclosed) and rebranded it Figma Weave; it chains multiple AI image/video models with editing tools, outputs can be branched and remixed. Dates differ between sources (September vs October 2025) — [Figma Weave FAQ](https://help.figma.com/hc/en-us/articles/35965787376919), [TechRadar](https://www.techradar.com/pro/software-services/figma-boosts-its-ai-editing-tools-as-it-combines-forces-with-popular-ai-platform-weavy). No open-source Weavy clone surfaced; Krea and Flora feature details: **no source found**.

**ComfyUI as a backend**
- `Comfy-Org/ComfyUI`: 144,581 stars, **GPL-3.0**, v0.43.0 (2026-10-27), pushed 2026-11-02 — [GitHub](https://github.com/Comfy-Org/ComfyUI), [LICENSE](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE)
- Server API: `POST /prompt` (submit API-format workflow; returns prompt ID and queue position; per-node errors on failure), `/ws` WebSocket (status, execution_start, execution_cached, executing, progress, executed), `/history`, `/queue`, `/upload/image`, `/upload/mask`, `/view`, `/interrupt`, `/free`, `/object_info` — [ComfyUI server routes](https://docs.comfy.org/development/comfyui-server/comms_routes) (accessed 2026-11-02)
- Comfy Cloud API: base URL `https://cloud.comfy.org`, `X-API-Key` header, `POST /api/prompt` mirrors local ComfyUI; **paid tiers only** (Standard, Creator, Pro; not Free); some OSS fields (e.g. `front`, priority `number`) are ignored; per-user fair queue; Assets API recommended over legacy file endpoints — [Comfy Cloud API docs](https://docs.comfy.org/development/cloud/overview.md) (via search summary, accessed 2026-11-02)
- Partner Nodes (ComfyUI nodes that call third-party paid models) bill in Comfy Credits: 211 credits = US$1; Standard plan US$20/month with 4,200 credits (dated 2026-06-12) — [Partner Nodes pricing](https://support.comfy.org/articles/1982697177-partner-nodes-pricing). Whether Comfy Cloud's API terms permit reselling generations inside a third-party SaaS: **not verified**.
- Hosted model APIs as an alternative to running GPUs: `fal-ai/fal-js` 188 stars, MIT, `@fal-ai/client` 1.10.1 (2026-05-04 release tag, npm modified 2026-10-23) — [GitHub](https://github.com/fal-ai/fal-js); `replicate/replicate-javascript` 598 stars, Apache-2.0, v1.4.0 (2025-11-17) — [GitHub](https://github.com/replicate/replicate-javascript). Your Python backend would more likely use the Python SDKs (not checked).

### Inferences
- Because your backend is FastAPI, the pragmatic path is: your canvas JSON + your FastAPI job runner calling hosted model APIs (fal/Replicate/Google etc.), optionally ComfyUI later via its HTTP API. Pros of ComfyUI: huge model/workflow ecosystem, graph already topological with caching, WS progress. Cons: you must host GPU workers or pay Comfy Cloud (paid-tier API), workflow-JSON-to-API-format mapping is a second graph model to maintain, and node/model versions drift. (Pros/cons are my synthesis from the sources above, not a single sourced statement.)
- ComfyUI GPL-3.0 does not by itself reach a separate SaaS that talks to it over HTTP (GPL is triggered by distribution; unlike AGPL it has no network clause) — this is general licence knowledge, **not sourced here**; confirm with counsel. The ComfyUI **frontend** (GPL, Vue) cannot be copied into a proprietary React app if distributed.
- The best codebase to read for patterns is node-banana (MIT, same stack minus Next.js). Copying code from the AGPL repos (bananaflow, loomcanvas) into a closed SaaS would be risky; reading them for ideas is fine.

### Gaps
- Could not read the "Future of Flowise" discussion (why archived).
- No Krea/Flora info; no open-source Weavy clone with real traction found; GitHub search is limited so smaller/new repos may be missed.
- Comfy Cloud reselling terms and rate limits not read.

---

## Q3. Execution models: topological run, per-node run, caching, versioning

### Takeaway
Everyone does dependency-ordered execution; the differences are caching and re-run semantics. ComfyUI has the most mature model (topological sort, lazy evaluation, output caching); tldraw's image-pipeline kit documents a DAG with parallel branches and node caching; node-banana runs in dependency order with per-group locking and batch runs. I found no off-the-shelf repo with output versioning/history beyond "run history" in bananaflow and asset libraries.

### Cited Findings
- ComfyUI: engine moved from back-to-front recursion to **front-to-back topological sort** (PR #2666); lazy evaluation lets an input and its ancestors run only if needed; execution order beyond graph structure "is non-deterministic"; dynamic graphs expand nodes into subgraphs (loops via tail recursion). The guide does not describe cache keying — [ComfyUI execution model inversion guide](https://docs.comfy.org/development/comfyui-server/execution_model_inversion_guide). The WebSocket emits an `execution_cached` message type, confirming output caching exists — [ComfyUI server routes](https://docs.comfy.org/development/comfyui-server/comms_routes)
- tldraw **Image pipeline kit**: builds a DAG from connections and resolves dependencies, independent branches run in parallel, nodes cache results, 17 node types, six port data types (image, text, model, number, latent, any), nodes show loading state; without a backend the Generate node returns placeholder SVGs — [tldraw image pipeline kit](https://tldraw.dev/starter-kits/image-pipeline). **Workflow kit**: node/connection shapes, port bindings, minimal replaceable engine in `src/execution/ExecutionGraph.tsx` — [tldraw workflow kit](https://tldraw.dev/starter-kits/workflow)
- node-banana: "call AI APIs in dependency order"; Group Locking; batch runs N times with outputs tagged per run; per-node run and caching not described in README — [README](https://github.com/shrimbly/node-banana)
- bananaflow: board graph in client store; each generation via provider adapter; API route validates, reserves quota, starts task; sync providers return inline; long jobs (Veo, Sora) polled by in-process scheduler; finalizer stores asset; run history, re-run, variations; `{a|b|c}` wildcard prompts for bulk — [README](https://github.com/maxlibin/bananaflow)
- Langflow/Flowise internal executors: **not read** in this session (a directory lookup returned 404).

### Inferences
- A sensible pattern for Remake: node `status` + `inputHash` (hash of prompt/params/upstream asset IDs); a run only re-executes nodes whose hash changed (ComfyUI-style caching); per-node "Run" button calls the same executor with `target=nodeId` and runs only its stale ancestors; "Run all" is a topological sort. Each generation stored as an immutable `generation` row (asset URL, params, cost), with the node pointing at a selected generation — this gives "versions" cheaply. This design is my synthesis; no single source prescribes it.
- Since the executor lives in FastAPI, server-side jobs (queue + WS/SSE progress) should own execution; the browser only edits the graph. For long-running video jobs, the bananaflow poll-and-finalize pattern is relevant.

### Gaps
- No source detailing cache invalidation rules in ComfyUI (only that caching exists).
- Langflow/Flowise/n8n execution internals unverified.
- No repo found with first-class per-node output versioning UI.

---

## Q4. Persistence (JSON schema), undo/redo, multiplayer (Yjs)

### Takeaway
React Flow's native model (`{nodes, edges, viewport}` via `toObject()`) is trivially JSON-serialisable and is what node-banana saves as portable JSON files. Undo/redo and multiplayer are mostly *not* in the free library: React Flow provides them as paid Pro examples; free options are `zundo` (single-user undo) and Yjs (collaboration) that you wire yourself; Liveblocks and tldraw sync are hosted/commercial routes.

### Cited Findings
- React Flow Pro Examples include **Undo and Redo** and **Collaborative (React Flow + yjs)** (source code behind the paywall) — [React Flow Pro Examples](https://reactflow.dev/pro/examples)
- node-banana saves workflows as portable JSON (drag onto canvas, autosave, Cmd/Ctrl+S); the README does not mention undo/redo — [README](https://github.com/shrimbly/node-banana)
- `zundo` 2.3.0 (MIT, npm modified 2024-11-17): undo/redo middleware for Zustand; single-user local snapshots, does not coordinate across collaborators — [npm zundo](https://www.npmjs.com/package/zundo), [search summary](https://npmjs.com/package/zundo)
- Yjs `yjs/yjs`: 23,014 stars, npm licence MIT, v13.6.33 (2026-09-23) — [GitHub](https://github.com/yjs/yjs). Providers: `y-websocket` 3.1.0 MIT (715 stars, 2026-08-06) — [GitHub](https://github.com/yjs/y-websocket); `hocuspocus` v4.7.1 MIT (2,643 stars, 2026-10-12) — [GitHub](https://github.com/ueberdosis/hocuspocus); `y-indexeddb` 9.0.12 last modified 2023-11-02 (stable but untouched) — [npm](https://www.npmjs.com/package/y-indexeddb). Automerge: MIT, 6,707 stars, js 3.5.0 (2026-09-16) — [GitHub](https://github.com/automerge/automerge)
- Liveblocks has `@liveblocks/react-flow` (npm 3.24.5, Apache-2.0 package): `useLiveblocksFlow` for nodes/edges, presence (`useOthers`, `Cursors`), multiplayer undo/redo via `useUndo`/`useRedo`; it is powered by Liveblocks Storage (a hosted service; self-hosting not stated; pricing not stated in the post); the repo's GitHub licence shows "Other" — [Liveblocks blog (Apr 2026 per image path, year not stated)](https://liveblocks.io/blog/multiplayer-sdk-for-react-flow-realtime-collaboration-between-humans-and-agents), [GitHub](https://github.com/liveblocks/liveblocks)
- tldraw has built-in sync (`@tldraw/sync`, `sync-cloudflare` and `socketio-server-example` templates) but is under the tldraw SDK licence — [tldraw templates](https://github.com/tldraw/tldraw/tree/main/templates)
- Open-source React Flow + Yjs integration repos found are tiny/unlicensed (`synergycodes/reactflow-yjs-integration`: 10 stars, no licence, 2026-01-12) — [GitHub](https://github.com/synergycodes/reactflow-yjs-integration)
- Best-practice for combining Yjs with Zustand undo was **not confirmed from a source**: the summary I got says Yjs UndoManager as source of truth is "common" but flagged unverified.

### Inferences
- MVP schema suggestion (my synthesis): `{ version, nodes:[{id,type,position,data:{prompt,params,selectedGenerationId,status}}], edges:[{id,source,sourceHandle,target,targetHandle}], viewport }` stored as a JSON column in SQLite; large media referenced by asset URL/ID, never inlined. Include `version` for migrations.
- Undo/redo for MVP: `zundo` on a Zustand store (temporal, with `partialize` to exclude transient run status), or hand-rolled; ~1–2 days.
- Multiplayer is not an MVP need; if later, Yjs (`Y.Map` for nodes/edges) + `y-websocket`/hocuspocus served from a Python-compatible endpoint would require a Node sidecar (hocuspocus) or a Python Yjs server — **[Python Yjs server options not researched]**. Expect 1–2 weeks to harden.

### Gaps
- No verified off-the-shelf free React Flow + Yjs package with undo; no JSON schema standard for AI canvases (ComfyUI has its own workflow JSON and API-format JSON; schemas not examined here).
- Liveblocks pricing/self-host not confirmed.

---

## Q5. Licence risks for commercial SaaS

### Takeaway
Safe to build on: React Flow, Konva, Excalidraw, Rete, Yjs, zustand/zundo, fal/Replicate clients (all MIT/Apache per npm/GitHub). Pay attention to: tldraw (not open source; licence key required in production), AGPL-3.0 canvases (bananaflow, loomcanvas, drawdb) which must not be copied into a closed SaaS, GPL-3.0 ComfyUI and its frontend, and `elkjs`'s EPL/GPL dual licence.

### Cited Findings
| Component | Licence | Source (checked 2026-11-02) |
|---|---|---|
| @xyflow/react | MIT (Pro examples paid separately) | [reactflow.dev/pro](https://reactflow.dev/pro) |
| tldraw SDK | Custom; no production use without trial/commercial/hobby licence key | [LICENSE.md](https://github.com/tldraw/tldraw/blob/main/LICENSE.md) |
| Rete.js | MIT | [GitHub](https://github.com/retejs/rete) |
| Excalidraw | MIT | [GitHub](https://github.com/excalidraw/excalidraw) |
| Konva / react-konva | MIT (npm) | [npm konva](https://www.npmjs.com/package/konva) |
| JointJS core / @joint/react | MPL-2.0 (file-level copyleft) | [npm @joint/react](https://www.npmjs.com/package/@joint/react) |
| Flume | MIT | [GitHub](https://github.com/chrisjpatty/flume) |
| ComfyUI | GPL-3.0 | [LICENSE](https://github.com/Comfy-Org/ComfyUI/blob/master/LICENSE) |
| ComfyUI frontend | GPL-3.0-only | [package.json](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/package.json) |
| litegraph (Comfy fork / original) | MIT | [npm](https://www.npmjs.com/package/@comfyorg/litegraph) |
| bananaflow, genrelay-loomcanvas | AGPL-3.0 (bananaflow has a CLA allowing relicensing for its hosted version) | [bananaflow](https://github.com/maxlibin/bananaflow), [loomcanvas](https://github.com/gaoruitech/genrelay-loomcanvas) |
| node-banana (shrimbly) | MIT | [GitHub](https://github.com/shrimbly/node-banana) |
| Langflow | MIT | [GitHub](https://github.com/langflow-ai/langflow) |
| Flowise | Apache-2.0 per README; repo archived | [GitHub](https://github.com/FlowiseAI/Flowise) |
| Yjs, y-websocket, hocuspocus | MIT | [npm yjs](https://www.npmjs.com/package/yjs) |
| elkjs | EPL-2.0 OR GPL-3.0-or-later (pick EPL-2.0) | npm `elkjs` |
| flowboard (crisng95) | No licence file (all rights reserved by default) | [GitHub](https://github.com/crisng95/flowboard) |

### Inferences
- "AGPL" repos: using their code or modified versions in a SaaS would require releasing your source; reference-only reading is fine. "No licence" repos (flowboard) cannot be reused at all.
- Run ComfyUI (if used) as a separate process behind your API; do not embed its Python code or frontend in your product without legal review (general licence reasoning, not sourced here).
- tldraw cost is a negotiated, per-company price, so budget uncertainty is the real risk; React Flow Pro is optional and fixed-price ($169–$289/month).

### Gaps
- No legal advice; MPL-2.0 and EPL-2.0 obligations only summarised from general knowledge.
- Licences of n8n and VisionFlow not read.

---

## Q6. Shortlist, fit, and effort estimate

### Takeaway
Build on **React Flow (MIT) + Zustand (+ zundo)** with your own FastAPI executor; use **node-banana (MIT)** as the primary reference and the React Flow Pro AI Workflow / Workflow Editor templates only if you want paid shortcuts. Treat tldraw as plan B and ComfyUI as an optional later backend.

### Cited Findings (summary table; effort figures are my estimates, not sourced)
| Rank | Option | Licence | Stars / last release (2026-11-02) | React 19 | Fit | Effort for Remake MVP |
|---|---|---|---|---|---|---|
| 1 | **@xyflow/react** + zustand 5 + zundo | MIT | 38.9k / 12.12.1 on 2026-11-02 | yes (peer >=17; used by Langflow, node-banana) | Shot-per-node with DOM previews | Canvas + 5 custom node types + ports ~1–2 weeks |
| 2 | **shrimbly/node-banana** (reference) | MIT | 1.7k / v2.3.0 2026-10-23 | yes (React 19.2) | Closest feature match (prompt, image, video, output nodes, JSON save) | Read/borrow patterns; code can be reused under MIT but is Next.js-coupled |
| 3 | React Flow Pro (Workflow Editor + AI Workflow templates; Undo/Redo, Collaborative examples) | Paid subscription $169–$289/mo | n/a | yes | Saves ~3–5 days on undo, layout, copy-paste | Optional |
| 4 | **tldraw** + Image pipeline kit | Custom, paid for production | 51.2k / v5.6.0 2026-10-28 | yes | Good if a freeform whiteboard is wanted; built-in sync | ~1 week to adapt; price unknown |
| 5 | Rete.js | MIT | 12.3k / v2.0.6 2025-06-30 | plugin peers include 19 | Powerful but fewer examples | 2+ weeks |
| 6 | ComfyUI (backend only) | GPL-3.0 | 144.6k / v0.43.0 2026-10-27 | n/a | Optional model/workflow backend via `/prompt`, WS | GPU hosting or Comfy Cloud (paid API); 1–2 weeks to integrate |
| 7 | Langflow (patterns only) | MIT | 156k / v1.13.0 2026-10-22 | yes | Not media-focused; large codebase | Read-only reference |
| – | Excalidraw, Konva, Flume, JointJS | MIT/MPL | see Q1 | varies (Flume React 18 only) | Not node-graph fits | Not recommended |
| – | bananaflow, loomcanvas | AGPL-3.0 | 1 star each | – | Good concept reference (shots, screenplay) | Read-only; do not copy code |

### Inferences
- Effort estimates assume one engineer already comfortable with React; they are guesses, not from sources.
- Biggest build items regardless of library: executor + job queue + progress streaming in FastAPI, asset storage, input hashing/caching, node UI polish, and cost tracking.

### Gaps
- Not hands-on tested: no prototype run of any library; no frame-rate measurements.
- Krea/Flora behaviour and any open-source Flora/Krea clones: not found.
