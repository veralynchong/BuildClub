# Open-source node-based AI image/video generation tools (state as of 2026-11-03)

Method note: repo metadata (stars, SPDX license, last push, archived flag, language) was pulled live from the GitHub REST API (`gh api repos/<owner>/<repo>`) on **2026-11-03**; stars are "as of 2026-11-03". README/package.json claims were read from the repos' default branch the same day. GitHub search was rate-limited partway through (search API 403), and several multi-word queries returned nothing, so the long tail below is **not exhaustive**. License = GitHub-detected SPDX id; "NOASSERTION" means GitHub could not classify it (custom/fair-code license) and must be read by hand.

## Q1. Which projects are mature and actively maintained, and how close is each to a Prompt -> image -> video -> timeline pipeline?

### Takeaway
The mature, heavily maintained platforms (ComfyUI, InvokeAI, n8n, Langflow) are local-GPU- or agent/text-oriented and are not close to a hosted-API Prompt/Shot/Storyboard/Video canvas. The closest references are small-to-mid, very recent, React Flow-based projects: **Node Banana** (1.7k stars, MIT, fal/Replicate/Gemini/Kie/WaveSpeed, has a video-edit timeline node) and **NodeTool** (agent-first, storyboard + multi-track timeline, AGPL). Most "Weavy/Flora alternative" repos are small (<1k stars) and young.

### Cited Findings

#### A. Closest to our pipeline (hosted APIs + canvas + video)
| Project | Stars (2026-11-03) | License | Last push | Stack | Models | Video | Timeline/editing | Closeness |
|---|---|---|---|---|---|---|---|---|
| [shrimbly/node-banana](https://github.com/shrimbly/node-banana) | 1,661 | MIT | 2026-10-30 (v2.3.0 released 2026-10-23); created 2025-12-03 | Next.js 16 + `@xyflow/react` 12.11.2; Mac/Windows desktop app | API only, BYOK: Gemini, Replicate, fal.ai, Kie.ai, WaveSpeed, Comfy Router (Seedream, Nano Banana, Kling, Veo, Runway, LTX) | Yes (plus image, 3D, audio) | Yes: "Edit Video" node with timeline (trim, split, stack, audio clips, volume curves), Video Trim; typed handles; dependency-order execution; batch runs; asset library tracking which workflow made each output; in-app agent builds workflows | Highest. Same stack (xyflow), same provider set (fal), MIT so code is reusable |
| [nodetool-ai/nodetool](https://github.com/nodetool-ai/nodetool) | 607 | AGPL-3.0 | 2026-11-03 (release v0.8.10 on 2026-11-01); created 2024-03-25 | TypeScript web app + `@xyflow/react` ~12.11.2, React 19; Python core (nodetool-core AGPL) | Local + cloud via own keys (README cites Seedream 5 Lite on Kie.ai $0.03/still, Seedance 2 $1.03/5 s, "list prices via genspend.io, August 2026"); ChatGPT/Gemini plan sign-in | Yes | Yes: storyboard (shot cards with action/camera/motion/duration), entities (character/location/style descriptors pasted into prompts), "approve stills before spending on video", multi-track timeline, clip bound to a workflow that goes "stale" when params change, script/voice editor, sketch editor, MP4 export, MCP | Very high conceptually (Prompt -> still -> clip -> timeline, cost-aware). AGPL means study the design, do not copy code |
| [SankaiAI/TwitCanva-Video-Workflow](https://github.com/SankaiAI/TwitCanva-Video-Workflow) | 292 | Apache-2.0 | 2026-07-09 | Vite + React 19 + Express backend proxy, `@fal-ai/client`; **no xyflow/reactflow found in package.json** (custom canvas) | GPT Image, Gemini, Kling V1-2.6, Hailuo 2.3/O2, Veo 3.1, fal.ai; optional local SD | Yes | Storyboard feature, frame-to-frame video, type-aware connection validation (IMAGE->VIDEO, TEXT->IMAGE); no timeline found in README | Good feature-set match (Hailuo, fal, storyboard); different canvas tech |
| [SamurAIGPT/Vibe-Workflow](https://github.com/SamurAIGPT/Vibe-Workflow) | 637 | MIT | 2026-09-17 | Next.js 16 client + `reactflow` ^11.11.4 + shared `packages/workflow-builder` + FastAPI server | Hosted only, via MuAPI (Vadoo) -- one vendor, not fal/Replicate | Yes (image + video) | No timeline found | README markets itself as open alternative to Weavy/Krea Nodes/Freepik Spaces/Flora; vendor-tied (hosted muapi.ai upsell); marketing-heavy README |
| [dav-niu474/onetake](https://github.com/dav-niu474/onetake) | 12 | none stated | 2026-08-30 | Next.js 16 + `@xyflow/react` 12.11.5, bun, Prisma-style `db:push` | OpenAI-compatible endpoints; TTS | Yes: prompt expansion -> text-to-image -> image-to-video -> TTS -> ffmpeg concat/final cut; 12 templates incl. "three-act storyboard" | ffmpeg stitching node | Very close in pipeline shape; tiny, no license (cannot legally reuse) |
| [opencanvasai/OpenCanvas](https://github.com/opencanvasai/OpenCanvas) | 45 | MIT | 2026-07-22 | `@xyflow/react` ^12.10, React 19, desktop app | BYOK, "any model" | Yes (claimed) | Not found | "Hackathon build" per README; small |
| [oshtz/noder](https://github.com/oshtz/noder) | 3 | MIT | 2026-11-01 | Tauri 2 + `reactflow` 11 | Mainly Replicate | Yes | -- | Tiny |
| Others (all tiny, <25 stars, mostly unlicensed): [YusufAlper17/Nexa-Canvas](https://github.com/YusufAlper17/Nexa-Canvas) (2 stars, built with React per description), [icezone/icezone-studio](https://github.com/icezone/icezone-studio) (1, storyboard), [keitaro81/node-canvas-ai](https://github.com/keitaro81/node-canvas-ai) ("Flora AI inspired", 0, 2026-11-02), [tony-uppercat/aycb-studio](https://github.com/tony-uppercat/aycb-studio) (0), [gaoruitech/genrelay-loomcanvas](https://github.com/gaoruitech/genrelay-loomcanvas) (1, AGPL-3.0, Vue), [onunbeai/OnunSpace](https://github.com/onunbeai/OnunSpace) (2, MIT, "Freepik Spaces alt"), [za01br/koubou](https://github.com/za01br/koubou) (23, MIT, BYOK image canvas, React Konva per web search), [canisminor1990/kitchen-comfyui](https://github.com/canisminor1990/kitchen-comfyui) (240, MIT, reactflow-based ComfyUI front-end, **stale: last push 2024-12-21**) | | | | | | | |

Sources for the table: repo pages and READMEs linked in each row (read 2026-11-03); Node Banana provider table and Edit Video row from its [README](https://github.com/shrimbly/node-banana); NodeTool storyboard/timeline/pricing text from its [README](https://github.com/nodetool-ai/nodetool); Vibe-Workflow structure from its [README](https://github.com/SamurAIGPT/Vibe-Workflow).

#### B. ComfyUI ecosystem (mature, local-GPU-first)
- **ComfyUI** (now `Comfy-Org/ComfyUI`): 144,779 stars, GPL-3.0, pushed 2026-11-03, latest release v0.43.0 (2026-10-27), Python backend. — [repo](https://github.com/Comfy-Org/ComfyUI)
- **ComfyUI_frontend**: 2,116 stars, GPL-3.0, pushed 2026-11-03; TypeScript + **Vue** (package.json lists vue) with a **Litegraph**-based canvas (changelog lines say "Litegraph ..."). Not React Flow. — [repo](https://github.com/Comfy-Org/ComfyUI_frontend)
- **litegraph.js fork** `Comfy-Org/litegraph.js`: 256 stars, MIT, last push 2026-01-14 (appears to have been folded into the frontend repo; treat as dormant). — [repo](https://github.com/Comfy-Org/litegraph.js)
- **Partner / API nodes (closed models) are built into core**: `comfy_api_nodes/` contains `nodes_bytedance.py` (Seedream/Seedance), `nodes_gemini.py`, `nodes_minimax.py` (Hailuo), `nodes_kling.py`, `nodes_veo2.py`, `nodes_runway.py`, `nodes_luma.py`, `nodes_ltxv.py`, `nodes_wan.py`, `nodes_vidu.py`, `nodes_pixverse.py`, `nodes_higgsfield.py`, `nodes_krea.py`, `nodes_bfl.py`, `nodes_openai.py`, `nodes_elevenlabs.py`, `nodes_wavespeed.py` and more. — [directory listing](https://github.com/Comfy-Org/ComfyUI/tree/master/comfy_api_nodes). Billing is via Comfy Credits and, per Comfy's support article, bring-your-own provider key is not possible at present; can be disabled with `--disable-api-nodes`. — [Comfy support](https://support.comfy.org/articles/7491061879-what-are-partner-nodes), [Comfy blog](https://blog.comfy.org/p/comfyui-native-api-nodes). These node files are a handy catalogue of how each closed API (params, pricing hooks) is shaped.
- **fal in ComfyUI**: `gokayfem/ComfyUI-fal-API` 228 stars, Apache-2.0, pushed 2026-09-23, "custom nodes for 1,400+ fal.ai models, auto-updated". — [repo](https://github.com/gokayfem/ComfyUI-fal-API)
- **Video node packs**: `kijai/ComfyUI-WanVideoWrapper` 6,804 stars, Apache-2.0, last push 2026-05-24 (quiet for ~5 months) — [repo](https://github.com/kijai/ComfyUI-WanVideoWrapper); `Lightricks/ComfyUI-LTXVideo` 4,238 stars, license NOASSERTION, pushed 2026-10-20 — [repo](https://github.com/Lightricks/ComfyUI-LTXVideo); `kijai/ComfyUI-HunyuanVideoWrapper` 2,592 stars, no license, **last push 2025-08-20 (stale)** — [repo](https://github.com/kijai/ComfyUI-HunyuanVideoWrapper); `Kosinkadink/ComfyUI-VideoHelperSuite` 1,909, GPL-3.0, pushed 2026-09-02 — [repo](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite); `Kosinkadink/ComfyUI-AnimateDiff-Evolved` 3,565, Apache-2.0, pushed 2026-07-28 — [repo](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved). Underlying model repos: Wan2.2 18,336 stars Apache-2.0 (2026-09-21) [repo](https://github.com/Wan-Video/Wan2.2); LTX-Video 11,288 Apache-2.0 (2026-11-02) [repo](https://github.com/Lightricks/LTX-Video); HunyuanVideo 12,715 NOASSERTION [repo](https://github.com/Tencent-Hunyuan/HunyuanVideo).
- **Other ecosystem**: ComfyUI-Manager 16,708 stars GPL-3.0 (2026-11-02) [repo](https://github.com/Comfy-Org/ComfyUI-Manager); rgthree-comfy 3,644 MIT [repo](https://github.com/rgthree/rgthree-comfy); ComfyUI-KJNodes 3,448 GPL-3.0 [repo](https://github.com/kijai/ComfyUI-KJNodes); ComfyUI_examples 4,667 [repo](https://github.com/comfyanonymous/ComfyUI_examples); `MontagenAI/ComfyUI-Montagen` ("ComfyUI Video Studio with Node-Controlled Timelines"), 34 stars, AGPL-3.0, **last push 2025-05-29 (stale)** [repo](https://github.com/MontagenAI/ComfyUI-Montagen); `kitchen-comfyui` (above, stale). Curated list: [neverbiasu/Awesome-ComfyUI-Video](https://github.com/neverbiasu/Awesome-ComfyUI-Video) (28 stars, MIT, updated 2026-11-03).
- Product context (Web search summary): React Flow maintainers posted that Weavy is built with React Flow and that they acquired Weavy, to be renamed Figma Weave -- from a search-result summary of a social post, not verified at the original source. — [WebSearch result page: nitter xyflowdev](https://nitter-canary.kareem.one/xyflowdev/search)

#### C. Other node-editor AI platforms
| Project | Stars (2026-11-03) | License | Last push | Stack | Image/video? |
|---|---|---|---|---|---|
| [invoke-ai/InvokeAI](https://github.com/invoke-ai/InvokeAI) | 28,970 | Apache-2.0 | 2026-11-03 (release v6.14.4, 2026-11-03) | Python backend; frontend `invokeai/frontend/webv1` and `webv2` both depend on **`@xyflow/react` ^12.10/^12.12 with React 19** (a v2 rewrite is in-tree) | Local diffusion; workflow editor is React Flow; images strongly, video not a focus (not verified) |
| [chaiNNer-org/chaiNNer](https://github.com/chaiNNer-org/chaiNNer) | 6,130 | GPL-3.0 | 2026-11-02 | Python backend, node GUI | Image upscaling/processing, local |
| [vladmandic/sdnext](https://github.com/vladmandic/sdnext) (SD.Next) | 7,365 | Apache-2.0 | 2026-11-02 | Python, form UI | Not node-based as primary UI (not verified further) |
| [mcmonkeyprojects/SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI) | 4,739 | MIT | 2026-11-02 | C# server, ComfyUI backend, simple UI + embedded Comfy workflow tab | Local, via Comfy |
| [lllyasviel/Fooocus](https://github.com/lllyasviel/Fooocus) | 53,808 | GPL-3.0 | **2025-12-01 (effectively in limited maintenance; stale ~11 months)** | Python/Gradio | **Not node-based** (form UI), as expected |
| [AUTOMATIC1111/stable-diffusion-webui](https://github.com/AUTOMATIC1111/stable-diffusion-webui) | 165,235 | AGPL-3.0 | 2026-03-02 (stale ~8 months) | Gradio | Not node-based |
| [griptape-ai/griptape-nodes](https://github.com/griptape-ai/griptape-nodes) | 86 | Apache-2.0 | 2026-11-03; created 2025-03-21 | Python **engine only** in this repo; visual editor is the **cloud-hosted Griptape Nodes IDE** (README); workflows export as Python files | Yes via libraries; editor not open source |
| [Ironclad/rivet](https://github.com/Ironclad/rivet) | 4,719 | MIT | 2026-08-26 (not archived) | TypeScript visual LLM-graph IDE | Text/LLM focus, not media (not verified in detail) |
| [langflow-ai/langflow](https://github.com/langflow-ai/langflow) | 156,284 | MIT | 2026-11-03 | Python + React (README mentions no media nodes in the part I read) | LLM/agent focus; no image/video evidence found this session |
| [FlowiseAI/Flowise](https://github.com/FlowiseAI/Flowise) | 55,547 | NOASSERTION (custom "Other") | 2026-08-13; **API reports `archived: true`**; latest release flowise@3.1.4 (2026-07-29) | TypeScript | LLM/agent focus; **flag: archived/read-only per GitHub API** |
| [n8n-io/n8n](https://github.com/n8n-io/n8n) | 209,428 | NOASSERTION (fair-code "Sustainable Use" license; LICENSE.md says "Portions ... licensed as follows") | 2026-11-03 | TypeScript; Vue-based editor (not verified this session) | Generic automation; media only via HTTP/fal/Replicate community nodes (not verified) |
| [langgenius/dify](https://github.com/langgenius/dify) | 160,313 | NOASSERTION | 2026-11-03 | -- | LLM workflows |
| [node-red/node-red](https://github.com/node-red/node-red) | 23,806 | Apache-2.0 | 2026-10-26 | JS | Generic flow tool |

Sources: each linked repo page, GitHub API metadata read 2026-11-03; Griptape README, Flowise archived flag from `gh api repos/FlowiseAI/Flowise`; InvokeAI package.json at `invokeai/frontend/webv1` and `webv2`.

#### D. Libraries and example/building-block repos
- **xyflow/xyflow**: 38,881 stars, MIT, pushed 2026-11-03. — [repo](https://github.com/xyflow/xyflow)
- **vercel/ai-elements**: 2,506 stars, pushed 2026-10-14; LICENSE file is Apache-2.0 (GitHub shows NOASSERTION); depends on `@xyflow/react` ^12.10; includes a React Flow "Canvas" component for node UIs. — [repo](https://github.com/vercel/ai-elements), [Canvas docs](https://ai-sdk.dev/elements/components/canvas). This is chat/agent oriented, not a media pipeline, but a ready node/edge styling kit.
- **fal-ai/fal-js**: 188 stars, MIT, pushed 2026-10-30. — [repo](https://github.com/fal-ai/fal-js). **replicate/replicate-javascript**: 597, Apache-2.0, last push 2025-11-17 (slow). — [repo](https://github.com/replicate/replicate-javascript). **fal-ai-community/fal-demos** is model-hosting examples (22 stars), not a canvas. — [repo](https://github.com/fal-ai-community/fal-demos)
- Hosted/closed (not open source, for contrast): Blooming (Show HN, Next.js + React Flow, Replicate + OpenRouter) — [HN mirror](https://hnews-reader.vercel.app/new/43811454); Wireflow (commercial, fal/Replicate-backed) — [vendor blog](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives).
- Also named in a web search but not inspected: `oshtz/noder` (inspected above), "AI Media Flow Studio" (React Flow canvas with live cost estimation per its page; license unverified) — [site](https://ai-media-flow-studio-frontend.pages.dev/); `mattwoodco/react-flow-video-generation` (0 stars, no license) — [repo](https://github.com/mattwoodco/react-flow-video-generation).

### Inferences
- Maintenance ranking: ComfyUI, InvokeAI, n8n, Langflow, Dify are clearly alive (pushes in the last week). Node Banana and NodeTool are also very active (push within 4 days; Node Banana only 11 months old). Flowise (archived), Fooocus, A1111, kitchen-comfyui, ComfyUI-Montagen, HunyuanVideoWrapper are stale or frozen.
- Star counts for niche "Weavy/Flora alternative" repos (Vibe-Workflow 637 is the highest) show no dominant open-source clone; Node Banana (1.7k) looks like the de-facto community leader for hosted-API node canvases.
- NodeTool is the only project found that combines storyboard -> approve stills -> animate -> multi-track timeline with stale tracking, which maps to our Shot/Storyboard/Video/timeline model; Node Banana is the one with a directly reusable licence and stack.

### Gaps
- GitHub search was rate-limited; searches such as "weavy alternative", "flora ai nodes", "xyflow ai" returned few or no hits, so smaller repos are likely missing. No exhaustive crawl of the GitHub topics `ai-workflow-builder`, `reactflow` + `video-generation` was done.
- Not verified: whether Flowise's archived status is permanent or a mirror move (API says archived; reason unknown); n8n's and Langflow's actual image/video node support; SD.Next/SwarmUI details beyond metadata; chaiNNer video support; Rivet media support.
- Reddit r/StableDiffusion, r/comfyui and Hacker News were reached only via a web-search summary; no thread-level evidence collected. No awesome-comfyui list was crawled (only Awesome-ComfyUI-Video seen).
- Whether Hailuo/Seedream/Nano Banana are present as first-class nodes in Node Banana beyond the "Comfy Router" row and fal/Replicate providers was not verified in code.

## Q2. Which use React Flow / xyflow (directly comparable to our stack)?

### Takeaway
Directly comparable (React Flow v12, `@xyflow/react`): Node Banana, NodeTool, InvokeAI frontend, OneTake, OpenCanvas, Vercel AI Elements. Older `reactflow` v11 package: Vibe-Workflow, noder. ComfyUI uses Litegraph + Vue, so its UI code is not directly portable; TwitCanva uses a custom canvas.

### Cited Findings
- `@xyflow/react` 12.x: Node Banana 12.11.2 ([package.json](https://github.com/shrimbly/node-banana/blob/main/package.json)); NodeTool web ~12.11.2 with React 19.2 ([web/package.json](https://github.com/nodetool-ai/nodetool/blob/main/web/package.json)); InvokeAI webv1 ^12.10 and webv2 ^12.12, React 19 ([webv2 package.json](https://github.com/invoke-ai/InvokeAI/blob/main/invokeai/frontend/webv2/package.json)); OneTake 12.11.5 ([package.json](https://github.com/dav-niu474/onetake/blob/main/package.json)); OpenCanvas ^12.10 ([package.json](https://github.com/opencanvasai/OpenCanvas/blob/main/package.json)); ai-elements ^12.10.
- Legacy `reactflow` ^11.11.4: Vibe-Workflow client ([client/package.json](https://github.com/SamurAIGPT/Vibe-Workflow/blob/main/client/package.json)); noder ([package.json](https://github.com/oshtz/noder/blob/main/package.json)).
- Litegraph + Vue: ComfyUI_frontend ([package.json](https://github.com/Comfy-Org/ComfyUI_frontend/blob/main/package.json)).
- Next.js 16 is the shared app shell in Node Banana, Vibe-Workflow and OneTake.

### Inferences
- InvokeAI's in-tree React Flow editor (Apache-2.0) is the most mature large-scale React Flow graph editor to study (typed connections, execution, validation), even though it is local-diffusion oriented.
- Best "read-the-code" list for our stack: Node Banana (MIT, copyable) > InvokeAI (Apache-2.0, copyable but large) > NodeTool (AGPL, ideas only) > OneTake (no license, ideas only).

### Gaps
- Node Banana's/NodeTool's internal structure (execution engine, node registry, store layout) was not inspected beyond package.json and README.

## Q3. Which support hosted APIs (fal, Replicate) rather than only local GPU?

### Takeaway
Node Banana (fal, Replicate, Gemini, Kie, WaveSpeed, Comfy Router), TwitCanva (fal, Kling, Hailuo, Veo, Gemini, OpenAI), NodeTool (BYOK cloud providers incl. Kie.ai; local also), noder (Replicate), Vibe-Workflow (MuAPI only), and ComfyUI via built-in Partner Nodes (Comfy Credits, no BYOK) or the fal custom node pack. InvokeAI, chaiNNer, SD.Next, SwarmUI, Fooocus are local-GPU first.

### Cited Findings
- Node Banana provider table (Gemini fully supported; Replicate, fal.ai, Kie.ai, WaveSpeed supported; ComfyUI Comfy Router exposes Flux, GPT Image, Nano Banana, Seedream, Kling, Veo, Runway, LTX; OpenAI LLM only). Keys encrypted at rest; workflows/media stay on disk. — [README](https://github.com/shrimbly/node-banana)
- TwitCanva: GPT Image 1.5, Gemini Pro, Kling V1-2.6, Veo 3.1, Hailuo 2.3/O2, `@fal-ai/client`, Express proxy keeps keys server-side. — [README](https://github.com/SankaiAI/TwitCanva-Video-Workflow)
- NodeTool: "Run local models or connect cloud providers with your own API keys. NodeTool calls the provider with your key, at their price, with no billing unit in between." — [README](https://github.com/nodetool-ai/nodetool)
- ComfyUI Partner Nodes: Comfy Credits billing, no external keys, cannot bring own key (as of Comfy support article). — [Comfy support](https://support.comfy.org/articles/7491061879-what-are-partner-nodes)
- ComfyUI fal pack: 1,400+ fal models. — [ComfyUI-fal-API](https://github.com/gokayfem/ComfyUI-fal-API)
- Vibe-Workflow video/image through MuAPI (Vadoo AI) only; hosted version at muapi.ai/workflow. — [README](https://github.com/SamurAIGPT/Vibe-Workflow)

### Inferences
- Node Banana and TwitCanva are the only found projects whose provider layer closely mirrors ours (fal/Gemini/Replicate; Hailuo in TwitCanva). Node Banana's "Comfy Router" row indicates a pattern of one aggregator behind many closed models.
- Per-run cost: only NodeTool's README discusses concrete per-asset prices (Seedream 5 Lite $0.03, Seedance 2 $1.03 per 5 s via Kie.ai, Aug 2026 list prices) and a "cheap stages first" flow; AI Media Flow Studio advertises live cost estimation. I did not confirm per-run cost ledgers or per-node version pinning in any repo.

### Gaps
- Whether Node Banana, NodeTool or TwitCanva persist per-run cost, model version, or parameter snapshots (the "versions and per-run cost" requirement) was not checked in source. This is the key follow-up (grep for cost/price/usage in their stores).
- Hailuo support in Node Banana and Seedream/Nano Banana IDs in TwitCanva were not confirmed in code.

## Q4. License implications for reuse

### Takeaway
Safe to copy/adapt code: MIT (Node Banana, xyflow, OpenCanvas, Vibe-Workflow, noder, Rivet, SwarmUI, Langflow, fal-js) and Apache-2.0 (InvokeAI, TwitCanva, SD.Next, ai-elements, ComfyUI-fal-API, Wan2.2). Copyleft that would taint a closed SaaS: GPL-3.0 (ComfyUI, ComfyUI_frontend, chaiNNer, Fooocus), AGPL-3.0 (NodeTool, A1111, ComfyUI-Montagen, loomcanvas). Unlicensed repos (OneTake, Nexa-Canvas, HunyuanVideoWrapper, many small clones) default to "all rights reserved".

### Cited Findings
- SPDX ids per repo are listed in the tables in Q1 and come from the GitHub API as of 2026-11-03: e.g., NodeTool AGPL-3.0 (README badge also AGPL v3) — [LICENSE badge in README](https://github.com/nodetool-ai/nodetool); Node Banana MIT — [repo](https://github.com/shrimbly/node-banana); ComfyUI GPL-3.0 — [repo](https://github.com/Comfy-Org/ComfyUI); InvokeAI Apache-2.0 — [repo](https://github.com/invoke-ai/InvokeAI).
- Custom/fair-code licenses reported as NOASSERTION: n8n (LICENSE.md: "Portions of this software are licensed as follows ...") — [LICENSE](https://github.com/n8n-io/n8n/blob/master/LICENSE.md); Flowise; Dify; Lightricks ComfyUI-LTXVideo and LTX-2; HunyuanVideo; ai-elements shows Apache-2.0 text in LICENSE.
- ComfyUI custom node packs vary: Apache-2.0 (WanVideoWrapper, AnimateDiff-Evolved, fal-API, GGUF), GPL-3.0 (VideoHelperSuite, KJNodes, Advanced-ControlNet), MIT (rgthree).

### Inferences
- If we want to reuse code (not only ideas) in a closed hosted product: Node Banana (MIT), InvokeAI (Apache-2.0) and TwitCanva (Apache-2.0) are the viable sources. Treat NodeTool as design reference only unless we accept AGPL obligations.
- Using ComfyUI as a separate backend process behind an API is a different question from copying its code; that legal analysis was not done here and should be reviewed by a lawyer if pursued.

### Gaps
- NOASSERTION licenses (LTXVideo, n8n, Dify) were not read in full; their commercial terms are unknown to me.
- Model weights have licenses separate from code (Wan, LTX, Hunyuan); not examined.
