# Node-based AI generation canvases (SaaS): UX and product design, as of late 2026

Researcher notes for "Remake" (shot list -> node canvas -> AI image / AI video / real footage nodes, with a collapsible CapCut-level editor panel). All sources accessed 2026-11-02 unless stated. "Pub." = date published as shown on the page; where a page showed two conflicting dates, both are noted. Many reviews are written by competitors (Krea, Wireflow, Melius, Raelume, Morphic) or by the vendor itself (Higgsfield "geo." pages, ltx.studio) and are flagged as such. Products covered: Figma Weave, Runway Workflows, Krea Nodes, Freepik Spaces, Flora, Higgsfield Canvas, Adobe Firefly Boards, LTX Studio, Visual Electric (defunct), ElevenLabs Flows (extra), ComfyUI (only via comparison pages).

## 1. What node types does each product offer, and how are inputs/outputs typed and connected?

### Takeaway
All the node products converge on the same skeleton: input/upload and text-prompt nodes on the left, one "model" node per generator (image, video, audio), LLM/assistant nodes for prompt writing, and utility nodes (upscale, crop, trim, stitch, composite). Inputs sit on the left of a node and outputs on the right. Runway and Krea enforce typed ports (text / image / video / audio) with color coding. Higgsfield and Flora are looser (connection is "reference", with the prompt carrying the semantics). Firefly Boards and LTX Studio are not typed-node graphs at all.

### Cited Findings

**Figma Weave (formerly Weavy)**
- Weave is Figma's AI-native creation platform (image, video, animation, motion design, VFX) on a node-based canvas; each step is visible and can be inspected, branched and remixed. — [Figma blog, "Connecting Figma and Weave"](https://www.figma.com/blog/connecting-figma-and-weave/) (pub. 2026-06-24)
- Figma announced the Weavy acquisition in late October 2025 (first acquisition since Figma's IPO; terms undisclosed; ~20 Weavy employees joined). — [Figma blog, "Welcome Weavy to Figma"](https://www.figma.com/blog/welcome-weavy-to-figma/) as summarised in search results; [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps) also says Oct 2025 (the ">$200M" price estimate seen in press is an unconfirmed industry guess)
- Node types seen in a hands-on review: Prompt (text), Image/Reference, Model (per-node model choice), Output node; nodes are created by right-click on canvas, wired by dragging, run with a "Run" button; a library of 20+ prebuilt workflows. — [Banani, "Figma Weave Review"](https://www.banani.co/blog/figma-weave-review) (byline 2026-06-26; page metadata says 2026-10-22 — treat as June 2026)
- Another review lists: Prompt; image generators (Nano Banana, Flux, Higgsfield, Stable Diffusion); video generators (Veo, Kling, Runway, WAN); image control (levels, masking, crop, blur); workflow nodes (routing, combining prompts, file import). Re-running a single step while keeping the base image is possible. — [Chase Jarvis, "What the heck is Weavy"](https://chasejarvis.com/blog/what-the-heck-is-weavy-the-100-honest-review-after-the-figma-acqusition/) (undated; written shortly after the acquisition, so late 2025 / early 2026)
- Weave can turn a workflow into an "app mode" interface (claim made by competitor Krea). — [Krea blog, "Node-based AI workflow apps"](https://www.krea.ai/blog/top-node-based-ai-workflow-apps) (pub. 2025-10-30, modified 2026-09-03; competitor-authored)
- A "Figma node" (paste a Figma frame onto the Weave canvas; edits in Figma update the workflow live) was announced as "coming later this summer" (2026) — not confirmed shipped. — [Figma blog](https://www.figma.com/blog/connecting-figma-and-weave/) (2026-06-24)
- 20+ "Weave tools" (prebuilt workflows with simple pick-tool / add-input / generate UI, no free-form prompt) appear in Figma Design's left panel. — same Figma blog

**Runway Workflows**
- Node categories: Input (text, image, video, audio), Model (one image/video/audio model each), LLM (writes/rewrites prompts), Utility (frame extraction, clip stitching, add audio, JSON parsing). Outputs connect only to inputs of the same type. No conditions or loops in the graph. — [Runway API docs, Workflows](https://docs.dev.runwayml.com/workflows/)
- In-app editor: inputs on the left of a node, outputs on the right, links connect them; color coding: orange = text, pink = image, green = video. — [AlternativeTo news, 2025-10-24](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines); in-app description via [Runway help article](https://help.runwayml.com/hc/en-us/articles/45763528999699) (could not be fetched directly: 403; only the search-result summary was seen)
- Changelog: Workflows launched 2025-10-24 (paid plans); audio nodes and video upscaling nodes 2025-11-21; workflows publishable as apps and shared with the workspace 2025-12-04; Agent can build and run whole Workflows from a plain-language description, nodes remain editable (2026-07-23, all plans); compositing nodes for blending image and video (2026-08-18, all plans); Workflow support in Runway MCP (2026-08-20). — [Runway changelog](https://runway.com/en/changelog)

**Krea Nodes**
- Node types: Generate Image, Generate Video (start/end frames, camera control, audio, duration options), Edit Image (inpaint/outpaint/prompt edit), Enhance Image/Video (upscalers), Generate 3D, Motion Transfer, Lipsync, Audio, plus Utility nodes: Text (LLM Call, Line Splitter, Concat Text, Text Overlay), Image (Crop, Compositor, Remove Background, Hue & Saturation), Video (Trim, Stitch Videos, Video Speed, Get Video Frame). Most utility nodes need Pro. — [Krea docs, Nodes](https://www.krea.ai/docs/user-guide/features/nodes.md) (undated; page content partly refers to model lists that "rotate quarterly")
- Connection rules: inputs left, parameters inside the node, outputs right; handles are color-coded by data type (image/text/video); dragging from a handle shows compatible nodes; max 10 outgoing connections per node; type must match, and when it does not the Node Agent fixes the connection or inserts a conversion node. — same Krea docs
- Over 50 models across image/video/audio/3D (Oct 2025 claim). — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)
- Note: the Krea docs page mentions "Display Any from rgthree", a ComfyUI custom node, which suggests the docs were partly templated from ComfyUI-style language — treat that line as low-reliability.

**Freepik Spaces**
- Node types: Upload (image/video from desktop), Text (prompts/notes/team comments), Assistant (generate/transform text), Image Generator (with model choice), Video Generator, Image Upscaler (Creative or Precision mode), Image editor, and a List node. — [Kingy AI review](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/) (pub. 2026-03-18, last modified 2026-10-22)
- List node: define variable sets (headlines, languages, overlay phrases); the workflow runs across all combinations in one pass (example: 1 character x 5 headlines x 4 CTAs = 20 ads); an Assistant node can generate the list itself. — same Kingy AI review
- Freepik's own docs pages ([nodes-and-connections](https://www.freepik.com/ai/docs/nodes-and-connections)) returned HTTP 403, so connection typing rules for Spaces were not verified from the primary source.

**Flora (florafauna.ai)**
- Node-based infinite canvas: each generation is a node; text, image and video nodes can be chained and re-run with different inputs; chains can be saved as shareable "Techniques". FAUNA is an in-app creative agent that picks models, writes prompts and can create nodes. — [MakerStack, "Flora Review (2026)"](https://makerstack.co/reviews/flora-review/) (pub. 2026-07-20)
- Hands-on: Image nodes created by double-click, Field nodes (grouping style refs, "F" key), Reference nodes from the project library; annotations, labels, layer editor, inpaint/outpaint/crop. Connecting assets to generation nodes is reported as confusing. — [Banani, "Flora AI image review"](https://www.banani.co/blog/flora-ai-review) (byline 2026-06-12; metadata 2026-10-22)
- "Actions" (launched 2026-05-07): 21+ on-canvas editing tools, placeable as nodes or invoked via FAUNA. Video: stitch, split, extract frames, colour grade, reverse, speed, watermark, background removal. Image: colour grade, aspect-ratio change, rotate, blur, filters, duplicate, Ken Burns. Text: split, find-and-replace, concatenate. — [IT Brief NZ](https://itbrief.co.nz/story/flora-launches-on-canvas-tools-dollar-usage-pools) (pub. 2026-05-07)
- Conflict: one Raelume-hosted comparison says Flora is "not a node-graph interface" ([DEV Community, 2026-02-07](https://dev.to/alexmercer_creatives/best-ai-creative-workflow-platforms-in-2026-a-hands-on-comparison-51e8), vendor-conflicted); MakerStack, IT Brief, Banani and Melius all describe it as a node canvas.

**Higgsfield Canvas**
- Node types: Text Prompt node; Generation node (one per model — every Higgsfield model is available as a node); Reference nodes (upload images/audio or pull from Assets); Audio nodes that attach to video generation nodes. — [Higgsfield help center, "How do I use Canvas"](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- Connection semantics are model-specific: with Seedance, connected images are references and the prompt must state each reference's role (visual connection alone is not enough); with Kling, a connected image becomes the start frame, not a character reference (use "@element-name" in the prompt for elements). — same help article. This is a UX hazard: the same edge means different things per model.
- Date of the Canvas launch could not be confirmed from a primary source; a third-party blog URL is dated 2026-05-01 ([vo3ai](https://www.vo3ai.com/blog/3-ways-higgsfield-just-raised-the-bar-for-ai-video-direction-2026-05-01)) — marketing-oriented.

**Adobe Firefly Boards**
- An infinite canvas for generate / organise / edit / connect images and clips in one workspace; real photos and video sit beside generated ones; a generated asset can be loaded back into the prompt bar for targeted edits. It is a moodboard-style board, not a typed-port node graph (no sources describe typed ports). — [CineD, NAB 2026 coverage](https://www.cined.com/adobe-firefly-at-nab-2026-from-location-scout-to-premiere-timeline-with-ai/) (pub. 2026-04-25)
- Features at global launch: Presets (one-click styles, e.g. Product and Character, Virtual Try On), Generative Text Edit (beta), Describe Image (image -> editable prompt). — [Adobe blog, 2025-09-24](https://blog.adobe.com/en/publish/2025/09/24/firefly-boards-launches-globally-now-with-runway-aleph-moonvalley-marey-models-new-powerful-ideation-features-flexible-offers)

**LTX Studio**
- Not a node graph. Project-structured: Storyboard, Timeline, Gen Space, Pitch Deck tabs; pasting a script auto-generates scenes, storyboard thumbnails and suggested camera framing; per-shot controls (camera angle, model swap, character appearance, sound design), Persistent Character Profiles, camera keyframes. — [Dupple review](https://dupple.com/reviews/ltx-studio) (updated May 2026; secondary review) and [search-result summary of toolsforhumans/stacksheriff reviews]

**Visual Electric**
- Infinite-canvas image/video tool; acquired by Perplexity (reported 2025-10-02), team moved to Perplexity "Agent Experiences", standalone product reported shut down (acqui-hire). So it is not a 2026 reference product. — [TechCrunch, 2025-10-02](https://techcrunch.com/2025/10/02/perplexity-acquires-the-team-behind-sequioa-backed-ai-design-startup-visual-electric/) and [Built In, 2025-10-02](https://builtin.com/articles/perplexity-acquires-visual-electric-20251002)

**ComfyUI (UX reference only)**
- Per a Melius comparison: full control over models/parameters, free/open-source, steepest learning curve, users maintain models and hardware, minimal collaboration; Comfy Cloud is the hosted option. — [Melius blog, "Best AI creative canvases"](https://www.melius.com/blog/best-ai-creative-canvases-image-generation) (pub. 2026-09-05; Melius is a competing canvas vendor)

### Inferences
- A shared grammar is emerging that Remake can copy without risk: left = inputs, right = outputs, typed + color-coded ports, "drag from handle -> list of compatible nodes" (Krea) and an agent that repairs type mismatches.
- Typing by media kind (text/image/video/audio) is table stakes, but the Higgsfield docs show it is insufficient: whether an image edge means "start frame", "style reference" or "character reference" depends on the model. For Remake, make the edge role explicit (a small label or dropdown on the edge, e.g. "start frame / end frame / reference") instead of burying it in the prompt.
- Because Remake nodes are shots, a "shot node" that bundles prompt + reference + generated image + generated video + real footage slot is a higher-level object than what these generic canvases have; none of them offers a shot-typed node (inference from absence in sources).

### Gaps
- Primary-source docs for Freepik Spaces node typing (403), Runway help center in-app article (403), Weave help center (403) could not be fetched; connection-type rules for those rest on secondary sources.
- Firefly Boards: no source described whether nodes/edges exist; treated as a board, not a graph.
- Weave: complete node list from official docs not obtained.

## 2. How are generation results shown on the canvas (thumbnails, versions/variants, history)? How are cost/credits and running state shown?

### Takeaway
Results land directly in/under the generating node (Weave, Flora, Freepik) and downstream nodes can consume them. Cost visibility is uneven: Weave shows an estimate before each run (praised as accurate); Krea's Node Agent shows per-node compute cost before anything runs and requires approval; Flora shows dollar costs and a usage-percentage bar; Higgsfield shows no meter in its docs. Running state: Runway has an "Active Runs" menu; Krea shows queued -> running -> done to all collaborators.

### Cited Findings
- Weave: approximate credit cost shown before each run; the reviewer says actual cost matched the estimate "unlike Freepik's approximate figures"; observed costs 0.4 credits (Flux Fast) to 21 (Higgsfield) per run; outputs appear as nodes and parallel flows can run side by side; no separate history/version panel described. — [Banani](https://www.banani.co/blog/figma-weave-review) (June 2026). Chase Jarvis reports Nano Banana Pro = 15 credits, Veo = 120, Flux = 5, Wan = 24 per generation. — [Chase Jarvis review](https://chasejarvis.com/blog/what-the-heck-is-weavy-the-100-honest-review-after-the-figma-acqusition/) (undated, possibly outdated)
- Weave canvas: dark theme, vertical navigation sidebar, project settings / credits / sharing controls. — [Figma blog](https://www.figma.com/blog/connecting-figma-and-weave/) (2026-06-24)
- Weave: users can run several flows in parallel and return later ("seven flows" quote). — same
- Runway: you can run multiple nodes or node groups concurrently, which opens an Active Runs menu to track and cancel runs; run whole workflows or single nodes. — [Runway help article](https://help.runwayml.com/hc/en-us/articles/45763528999699) (via search summary, direct fetch 403) and [AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines) (2025-10-24)
- Runway published-workflow behaviour: publishing creates a versioned endpoint with its own ID; later edits require republishing (new ID); a run is an "invocation" you poll. — [Runway API docs](https://docs.dev.runwayml.com/workflows/)
- Krea: Node Agent shows compute cost per node before anything runs; nothing runs until approved; editing an early node reruns only downstream nodes, and cached outputs avoid redundant work. — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md) (the per-node-cost-before-run claim comes from the agent flow; whether a manual run shows a cost estimate is not stated)
- Krea runs are shown as queued -> running -> done on every collaborator's screen; the person who starts a run is billed; the chain keeps running if that user switches tabs (the submitting tab sends each next step). — [Krea blog, "Multiplayer nodes"](https://www.krea.ai/blog/multiplayer-nodes) (pub. 2026-10-22)
- Krea version history: snapshots at most every 5 minutes, kept 5 days, preview and restore. Undo/redo is personal. — same
- Flora: images appear on the canvas as nodes; four variations from FAUNA "appeared one-by-one" over ~5 minutes; per-generation cost shown in dollars (e.g. $0.009 Flux 2, $0.072 reference-guided Nano Banana 2) and a usage-limit percentage (one run used 7%). — [Banani Flora review](https://www.banani.co/blog/flora-ai-review) (June 2026)
- Flora switched in 2026 from credits/compute units to a pooled dollar budget with a percentage bar. — [IT Brief NZ, 2026-05-07](https://itbrief.co.nz/story/flora-launches-on-canvas-tools-dollar-usage-pools)
- Freepik Spaces: bulk (List) runs display as a grid of variations; single video output as one video; credit examples: Nano Banana 2 = 75 credits/image, GPT Image 1.5 = 150, Kling 3.0 Motion Control Pro = 450 per 3 s, Veo 3.1 4K with audio = 2,080 per 4 s. — [Kingy AI](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/) (2026-03-18, modified 2026-10-22; "live prices have changed since")
- Higgsfield Canvas: nodes run individually or in sequence; models run in parallel and outputs compare side-by-side; building/connecting nodes is free and credits are charged only on generate; no cost meter described; "Unlimited" plan access does not apply in Canvas; autosave, with a hard refresh restoring the latest autosave after a freeze (a sign of stability problems). — [Higgsfield help center](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- Higgsfield Cinema Studio 2.0 (Feb 2026) added "Grid Mode" rendering 16 shot variations at once; claimed to cost the price of one (vendor-run claim). — search-result summary of [Higgsfield-run pages](https://geo.higgsfield.ai/blog/recommended/which-ai-video-tool-produces-the-most-cinematic-filmed-looking-output-cea2c6); promotional, unverified.
- Adobe community thread: user report that credit display before a video generation showed "0 credits" under an unlimited promo yet credits were sometimes deducted anyway. — [Adobe Community thread](https://community.adobe.com/questions-404/i-purchased-the-plan-to-get-unlimited-generation-access-until-march-this-sometimes-works-for-all-of-the-models-in-video-generation-and-i-see-0-credits-before-generation-however-sometimes-it-doesn-t-work-for-some-reason-and-credits-get-reducted-1550748) (one user report; date not shown)

### Inferences
- Best practice to copy: pre-run cost estimate on the node (Weave) + a batch-level total before a multi-node run (Krea agent) + explicit approval for expensive batches. For agencies running many shots, a "Run all shots: est. N credits" confirmation matters more than per-node cost.
- Krea's "edit upstream node -> only downstream reruns, cached otherwise" is the right invalidation model for shot -> frame -> clip chains.
- A shared status vocabulary (queued/running/done/failed) per node plus a global "active runs" list (Runway) is the proven pattern.
- Variants: Freepik grids and Higgsfield Grid Mode suggest "N variants per node with pick-one-to-pass-downstream" is a gap the sources only partly confirm; none of the reviewed pages describes a clear per-node version carousel/history (inference from absence; not verified in-app).

### Gaps
- No source showed in-app per-node version history UI for Weave, Flora, Freepik or Higgsfield.
- Error/failure state visuals not documented anywhere reviewed.
- Direct in-app testing was not done; findings are from docs and reviews.

## 3. How do they pick models (model dropdown per node? which image/video models are offered)?

### Takeaway
Per-node model selection is universal: one node per model (Higgsfield, Krea) or a model dropdown inside a generic generate node (Weave, Freepik, Flora). Catalogues are multi-vendor aggregators (Nano Banana 2/Pro, Flux 2, Seedream, GPT Image, Veo 3.x, Kling 3.0, Sora 2, Seedance, Wan, Runway Gen-4). Choosing is a real usability burden; agents (Flora FAUNA, Krea Node Agent, Runway Agent) are the 2026 answer.

### Cited Findings
- Krea: model nodes list their own limits; e.g. max image references from 1 (Z Image, Ideogram 3.0) to 15 (Nano Banana Pro, ChatGPT Image 1.5); image models include Krea 1, Flux 2, Nano Banana Pro, Imagen 4, Seedream 4.5; models can be chosen manually or by the Node Agent. — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md)
- Weave: model chosen per node; reviewer lists Flux Fast, Qwen Image Edit Plus, Flux Canny Pro, Imagen 4, GPT Images 2.0, Mystic, Recraft V3, SD 3.5, Higgsfield, Flux Kontext Multi Image, Runway Gen-4 Image; says model choice is "a learning task in itself", too many options for beginners, wrong choice wastes credits. — [Banani](https://www.banani.co/blog/figma-weave-review)
- Weave video models seen: Veo, Kling, Runway, Wan, Sora (via Higgsfield). — [Chase Jarvis](https://chasejarvis.com/blog/what-the-heck-is-weavy-the-100-honest-review-after-the-figma-acqusition/)
- Flora: "Auto" or specific model per node, with quality and aspect ratio settings; FAUNA can run one prompt across several models. Models named: FLUX, Nano Banana 2/Pro, Gemini 3 Pro, Veo 3, Sora 2, Kling 3.0, Recraft V4, Seedance 1.5, Pika, Runway Gen-4; reviewed set: Nano Banana 2, GPT Image 2, Flux 2/2 Max, Seedream 5.0 Lite. — [Banani Flora](https://www.banani.co/blog/flora-ai-review), [MakerStack](https://makerstack.co/reviews/flora-review/)
- Freepik: image and video generation nodes with models such as Kling 3.0 and Grok Imagine (via a Raelume-hosted comparison, vendor-conflicted); Nano Banana 2, GPT Image 1.5, Kling 3.0 Motion Control, Veo 3.1 named in the Kingy review. — [DEV Community](https://dev.to/alexmercer_creatives/best-ai-creative-workflow-platforms-in-2026-a-hands-on-comparison-51e8); [Kingy AI](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)
- Firefly Boards: Firefly Image Model 4, Runway Aleph and Gen-4, Moonvalley Marey, Luma Ray3/Ray2, Nano Banana, Veo 3, Pika 2.2, Flux.1 Kontext. — [Adobe blog, 2025-09-24](https://blog.adobe.com/en/publish/2025/09/24/firefly-boards-launches-globally-now-with-runway-aleph-moonvalley-marey-models-new-powerful-ideation-features-flexible-offers) (model list may have changed by late 2026)
- LTX Studio: primarily Lightricks' own LTX-2 family (free tier LTX-2 only), plus model swap per shot; shot lengths 3-20 s depending on model. — [Dupple](https://dupple.com/reviews/ltx-studio)
- Runway: Runway's own models plus partners; "Ruby" model available in Workflows for Max+ (2026-08-20). — [Runway changelog](https://runway.com/en/changelog)

### Inferences
- Remake should not expose 50 models. The target user (agency staff remaking trends) benefits from 3-5 curated presets per node ("Fast draft / Best quality / Consistent character") backed by specific models, with "advanced: choose model" behind a toggle. This answers the documented "model choice is guesswork" complaint.
- Show per-model capability facts on the model chip (max references, start/end frame support, duration, audio) as Krea does, because they decide which input ports are valid.

### Gaps
- Exact current model line-ups drift quarterly; every list above can be out of date by weeks.
- Weave's official model catalogue was not retrieved.

## 4. Do any combine the canvas with timeline/editing, or a shot/scene sequence (storyboard -> video)? How is final assembly/export done?

### Takeaway
Yes, and it is the key differentiator in 2026. Flora has a multi-track Timeline Editor on the canvas whose output returns as a video node; ElevenLabs separates Flows (canvas) and Studio (timeline) with an "export to Studio" handoff; Firefly Boards hands off to Premiere and has a separate lightweight web video editor; LTX Studio has storyboard -> timeline in one project and exports to Premiere/DaVinci. Most pure node tools (Weave, Krea, Runway, Freepik) assemble via utility nodes (stitch/trim) and leave real editing to other tools.

### Cited Findings
- Flora Timeline Editor: described by Flora staff as a multi-track editor (trim, split, fades, captions, audio, layers) sitting on the canvas next to generated clips; the finished cut flows back into the canvas as a normal video output node usable for further steps. Stated limits: no colour grading, no VFX finishing, no multi-hour timelines (yet). — Flora LinkedIn announcement, only visible through [search-result summary of a LinkedIn profile page](https://ar.linkedin.com/in/katherinelecuna) (direct fetch failed with HTTP 999). Date not shown; unverified against Flora's own site. Competitor Morphic claims Flora lacks a timeline editor ([Morphic](https://morphic.com/de/resources/alternatives/flora-ai-alternatives)) but that page is rival marketing and may predate the launch.
- Flora Actions (stitch, split, speed, etc.) is an earlier, node-based path to assembly (2026-05-07). — [IT Brief NZ](https://itbrief.co.nz/story/flora-launches-on-canvas-tools-dollar-usage-pools)
- Melius says Flora's "Flows" structure work along a narrative arc and suit storyboards/sequences, but graphs reportedly slow as they grow (competitor claim). — [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation) (2026-09-05)
- ElevenLabs: Flows = node canvas for chaining generation; Studio = linear timeline editor with video/audio/music/caption tracks; Flows comes first, then "export to Studio". Mechanism of the handoff is not described. — [ElevenLabs help center](https://elevenlabs.io/docs/help-center/product/flows-image-video/flows/how-does-flows-differ-from-studio.md) (undated)
- Firefly Boards: NAB 2026 demo generated location-scouting frames from one prompt, chained them into rough animatics with video generation on the same board, and offers "direct handoff to Premiere". — [CineD](https://www.cined.com/adobe-firefly-at-nab-2026-from-location-scout-to-premiere-timeline-with-ai/) (2026-04-25). Adobe also launched a public beta of a Firefly web video editor with a lightweight multi-track timeline and text-based editing on 2025-12-16, and Boards got upscaling to 4K (Topaz). — [Digital Camera World](https://www.digitalcameraworld.com/tech/software/fireflys-generative-video-is-no-longer-just-about-the-prompts-adobe-now-has-a-web-based-firefly-video-editor-and-the-ability-to-upscale-to-4k) (via search summary; page body was not retrievable)
- LTX Studio: script -> auto scenes -> storyboard thumbnails -> per-shot generation -> Timeline tab (combine shots, transitions, voiceover, music, captions) -> export individual shots, sequences, or raw assets for Premiere/DaVinci, up to 4K at 50 fps; rollback of individual scenes; team members can work on different scenes at once (Standard/Pro). — [Dupple review](https://dupple.com/reviews/ltx-studio) (May 2026). Stacksheriff says it is "not a full non-linear editor"; Curious Refuge scored LTX-2 motion 5.8/10 and temporal consistency 5.6/10 (via search-result summary; unverified). — [Stacksheriff](https://stacksheriff.com/ai-tools/ltx-studio-review/)
- Higgsfield Cinema Studio: workflow of visual reference -> camera rig (body/lens/focal length) -> preview shots -> "anchor" -> bridge to video -> camera motion -> final video; v2.0 (Feb 2026) Grid Mode, v4.0 (Aug 2026, vendor-run pages) native 4K, up to ~1-minute generations, reusable locations. Canvas help page does not describe timeline or export. — [Higgsfield blog on previs](https://higgsfield.ai/blog/ai-previsualization-tools) and [Canvas help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas); all vendor-authored, treat as promotional; version numbering is inconsistent across sources.
- Runway: utility nodes stitch clips and add audio; compositing nodes (2026-08-18). No timeline reported. — [Runway docs](https://docs.dev.runwayml.com/workflows/), [changelog](https://runway.com/en/changelog)
- Krea utility nodes: Trim, Stitch Videos, Video Speed, Get Video Frame, Text Overlay. — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md)
- Weave export to Figma: Weave tools inside Figma Design; workflows can be published to Figma Community. No timeline mentioned. — [Figma blog](https://www.figma.com/blog/connecting-figma-and-weave/)

### Inferences
- Nobody found combines (a) shot-list-driven node structure and (b) an editor panel on the same screen with live two-way sync. Flora's "cut returns to canvas as a node" is the closest and a good model: the editor result becomes a node, so the graph stays the single source of truth.
- The Flows/Studio split at ElevenLabs and the LTX Storyboard/Timeline tabs show that users accept two modes; Remake's same-screen collapsible panel is a stronger variant. Risk to design out: two ordering sources (canvas order vs timeline order). A simple rule is that the shot list defines default timeline order and the panel can override without mutating the shot list.
- Honest limit disclosure (Flora: "no colour grading, no VFX") is a useful positioning pattern for a "CapCut-lite" panel.

### Gaps
- The Flora Timeline Editor claim relies on a single social post seen through a search summary; date and exact UI not verified.
- Weave and Freepik timeline/video-editor capabilities not found in reviewed sources.
- Export formats (MP4 resolution presets, aspect ratios for TikTok/Reels) are only documented for LTX Studio.

## 5. Pricing model and target user

### Takeaway
Everyone sells subscriptions with a metered generation currency (credits) except Flora (pooled dollar budget plus seat fee). Targets split: pro creative teams and agencies (Flora, Weave Team, Freepik Spaces/Lists, Higgsfield, Runway Enterprise), designers inside Figma (Weave), filmmakers/previs (LTX, Higgsfield Cinema Studio). Collaboration and API are paywalled upward.

### Cited Findings
- Weave (official pricing page): Free $0, 150 credits/mo, 5 workflows, commercial licence listed; Starter $24/mo, 1,500 credits, unlimited workflows, top-ups $10 per 1,000; Professional $45/mo, 4,000 credits, 3-month rollover; Max $100/mo, 10,000 credits; Team $42/user/mo, 4,500 credits per user, shared pool; Enterprise custom (own API keys, run workflows through API). Approx equivalents listed: 1,500 credits ~ 7 min of video. — [weave.figma.com/pricing](https://weave.figma.com/pricing) (accessed 2026-11-02). Older figures differ (Starter $19, Pro $36, Team $48 in a [Medium post](https://medium.com/@alexdev82/figma-weave-the-ai-media-platform-that-wants-to-replace-your-entire-toolkit-e12cabe41b4f) and Chase Jarvis), so those are outdated.
- Weave tools in Figma Design are free during open beta; later they use Figma AI credits. — [Figma blog](https://www.figma.com/blog/connecting-figma-and-weave/) (2026-06-24)
- Runway: Workflows launched for paid plans (2025-10-24); Agent Workflows and compositing nodes now "all plans" per changelog (2026-07/08). Free plan = one-time 125 credits; Standard = 625 credits/mo; the "Unlimited" plan was replaced by Max (existing subscribers moved 2026-09-01); self-serve Team plan announced 2026-09-04. — [Runway changelog](https://runway.com/en/changelog) and search-result summaries of [Runway news](https://runway.com/news/company-news/working-smarter-with-runway-unified-pricing) / third-party pricing guides (secondary; verify). Early access was Creative Partners and Enterprise only. — [AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines)
- Krea: Pro about $30/mo, Max $105/mo with 60,000 compute units and unlimited concurrency, Business up to 50 seats; most utility nodes need Pro; free tier 100 compute units/day (per Melius). — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md); [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation). Multiplayer editing and live presence require Krea Enterprise; view sharing on every plan. — [Krea blog](https://www.krea.ai/blog/multiplayer-nodes) (2026-10-22)
- Freepik: plans in credits (July table: Essential $7.50/mo, Premium $14.50, Premium+ $33.75, Pro $210; "live prices have changed"); free plan limited to three Spaces; credits don't roll over monthly; "unlimited" on selected models for Premium+/Pro up to 1,000/5,000 images per rolling 30 days then relaxed queue. Audience: agencies doing bulk creative production (headline: List node). — [Kingy AI](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)
- Flora: Free $0 (1 seat, 3 projects, ~17 lifetime generations, text/image models); Starter $18/seat/mo (up to 8 seats, video models, API and MCP); Pro $50/seat/mo (shared assets, caps, analytics); Max $200/seat/mo; seat fee plus metered generations from a pooled workspace budget; FAUNA free and unmetered. Customers named: Nike, Netflix, Pentagram (agency/brand teams). — [MakerStack](https://makerstack.co/reviews/flora-review/) (2026-07-20); [IT Brief NZ](https://itbrief.co.nz/story/flora-launches-on-canvas-tools-dollar-usage-pools) (2026-05-07)
- Higgsfield: Canvas generations always cost credits at the same rate as elsewhere; building nodes is free. — [Higgsfield help center](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- LTX Studio: Free 800 one-time credits (personal, LTX-2 only); Lite $15/mo (8,000 credits); Standard $35/mo (28,000, commercial use, 1 collaborator per project); Pro $125/mo (110,000, 3 collaborators); Enterprise custom. Credits measure compute seconds. — [Dupple](https://dupple.com/reviews/ltx-studio) (May 2026, prices unverified date)
- Firefly Boards: standard features (including Boards) unlimited on Firefly plans; video generation, partner models and bulk upscaling use premium credits; temporary unlimited Firefly video model promo ended 2026-03-16 (partner models excluded). — [Adobe Community answer / search summary](https://community.adobe.com/questions-404/i-purchased-the-plan-to-get-unlimited-generation-access-until-march-this-sometimes-works-for-all-of-the-models-in-video-generation-and-i-see-0-credits-before-generation-however-sometimes-it-doesn-t-work-for-some-reason-and-credits-get-reducted-1550748) and [Adobe blog](https://blog.adobe.com/en/publish/2025/09/24/firefly-boards-launches-globally-now-with-runway-aleph-moonvalley-marey-models-new-powerful-ideation-features-flexible-offers)
- Per-seat pricing can discourage collaboration (Melius, about Flora, Weave and itself). — [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation)

### Inferences
- The market anchor for an agency tier is roughly $40-50/seat/month plus a metered pool (Weave Team $42, Flora Pro $50, LTX Standard $35).
- Video dominates cost (Weave: ~7 min of video for 1,500 credits; Freepik Veo 3.1 4K = 2,080 credits per 4 s), so Remake's pricing should price shots (draft image first, then clip) and surface "approve storyboard frame before spending on video" as a cost-control step.

### Gaps
- No public per-seat price found for Higgsfield Canvas specifically.
- Prices are volatile (Flora reworked pricing in 2026; Freepik prices changed since July); re-verify before any competitive pricing slide.

## 6. Known UX complaints (Reddit, X, reviews)

### Takeaway
Actual Reddit/X threads could not be retrieved (search returned only blogs and snapshot mirrors). Review-based complaints are consistent: steep learning curve, model-choice paralysis, unpredictable credit burn (especially video), reliability/slowness with new models, and graph performance at scale.

### Cited Findings
- Weave: steep learning curve, node canvas can confuse beginners, model selection is guesswork, slow runs (Qwen Image Edit Plus took over 10 minutes), multi-reference blending favours one input, Weave Tools in Figma cannot build custom workflows yet; "Reddit reactions flag the learning curve and say it's overkill for solo designers" (the reviewer's characterisation, original threads not seen). — [Banani](https://www.banani.co/blog/figma-weave-review)
- Weave: "a little bit of a learning curve", top-tier models consume many credits. — [Chase Jarvis](https://chasejarvis.com/blog/what-the-heck-is-weavy-the-100-honest-review-after-the-figma-acqusition/)
- Weave free plan limited to 5 workflows; graphs are hand-built (agent absent) per a competitor. — [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation)
- Flora: steep learning curve, connecting assets to generation nodes is confusing, costs vary ~8x between models, needs multiple iterations, not good for one-shot prompting. — [Banani Flora](https://www.banani.co/blog/flora-ai-review); unpredictable metered pricing, thin free tier, pricing reworked in 2026. — [MakerStack](https://makerstack.co/reviews/flora-review/); reported slowdown as graphs grow (competitor claim). — [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation)
- Freepik Spaces: occasional slowness and generation failures especially with Kling 3.0; credits hard to predict for heavy video work; "limited for advanced pipelines" (a Reddit commenter per a secondary summary, thread not seen). — [DEV Community comparison (Raelume-hosted)](https://dev.to/alexmercer_creatives/best-ai-creative-workflow-platforms-in-2026-a-hands-on-comparison-51e8) (2026-02-07), [Wireflow](https://www.wireflow.ai/blog/freepik-spaces-alternatives) (competitor). Kingy AI's own caveats: video burns credits quickly; an error in one step propagates into every downstream variation (bulk output needs systematic review); building from a blank canvas has a learning curve. — [Kingy AI](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)
- Krea (as seen by others): weak multi-step pipelines/reuse and thin collaboration (Melius, competitor); collaboration is Enterprise-gated (Krea's own blog). — [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation), [Krea blog](https://www.krea.ai/blog/multiplayer-nodes)
- Browser canvases with very large graphs can tax browser resources (generic review statement). — via search summary of review pages, no single source.
- Higgsfield Canvas: help article documents freezes (hard refresh to restore autosave); "Unlimited" plan excluded from Canvas. — [Higgsfield help center](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- LTX Studio: free tier limited and personal-only; slow rendering at peak; steep learning curve vs simple clip generators; mechanical multi-subject motion; face morphing in transitions (ProductHunt reviewer, per search summary). — [Dupple](https://dupple.com/reviews/ltx-studio), [Stacksheriff](https://stacksheriff.com/ai-tools/ltx-studio-review/)
- Krea's own comparison of rivals (competitor claims): Weave hides advanced settings; Flora simplifies parameters; Freepik prioritises stock integration; Fal Workflows has no image previews in the node editor. — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)

### Inferences
- The recurring failure modes map to concrete Remake mitigations: guided start (shot list auto-builds the graph, so no blank canvas), curated model presets, mandatory cost preview, draft-before-video gating, and error isolation (do not propagate a bad frame downstream until approved).

### Gaps
- No primary Reddit or X posts were retrieved; Reddit-derived claims above are second-hand. A follow-up with the `reddit-x-research` skill is recommended.
- No quantitative satisfaction data except aggregator ratings (e.g. G2 4.3/5 for LTX Studio, 123 reviews; Tooldirectory 4.46/5 for Flora, 142 reviews, both via secondary pages).

## 7. Templates, reusable workflows and sharing

### Takeaway
Templates/sharing are well developed: public templates (Figma Community), shareable links that duplicate (Krea), "Techniques" (Flora), template save (Higgsfield), and publish-as-app (Runway, Krea) that hides the graph behind a form. Real-time multiplayer exists but is plan-gated in places.

### Cited Findings
- Weave: Share menu -> "Publish to Figma Community" (title, description, category, thumbnail) turns a workflow into a public template others can open and adapt; designers will later publish workflows as Weave tools in Figma for team or community; 20+ prebuilt workflows in the library. — [Figma blog](https://www.figma.com/blog/connecting-figma-and-weave/) (2026-06-24); [Banani](https://www.banani.co/blog/figma-weave-review)
- Runway: nodes can be combined into reusable templates; workflows can be published as apps and shared with the workspace (2025-12-04); published version has a fixed ID and exposes chosen inputs/outputs. — [AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines), [Runway changelog](https://runway.com/en/changelog), [Runway docs](https://docs.dev.runwayml.com/workflows/)
- Krea App Builder: build workflow -> mark parameters as inputs -> design interface -> publish; exposable inputs: text, image upload, number fields with min/max, dropdowns, toggles, sliders; intermediate nodes and error handling hidden; publish as public link, private (team-only, Business) or API; recommended 5-7 inputs. — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md)
- Krea sharing: Private / Workspace (view or edit) / public link (view); viewers can duplicate to get an editable copy, so a shared link acts as a template; viewers do not see outputs or run history. — [Krea blog](https://www.krea.ai/blog/multiplayer-nodes) (2026-10-22)
- Freepik: templates are prebuilt workflows (swap assets and prompts, run); "Welcome to Spaces" and "Mastering Spaces" tutorial templates; real-time collaborator cursors; autosave with no save button. — search-result summary of [Freepik docs](https://www.freepik.com/ai/docs/your-first-space) (primary page not fetched; 403)
- Flora: workflows saved as shareable "Techniques"; shared assets on Pro. — [MakerStack](https://makerstack.co/reviews/flora-review/)
- Higgsfield: save a finished workflow as a template; multi-user editing with real-time outputs; share via canvas settings. — [Higgsfield help center](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- Raelume (competitor) markets Figma-style multiplayer cursors, shared project library and on-canvas comments; Melius markets an agent that builds the graph from a brief. — [DEV Community](https://dev.to/alexmercer_creatives/best-ai-creative-workflow-platforms-in-2026-a-hands-on-comparison-51e8); [Melius](https://www.melius.com/blog/best-ai-creative-canvases-image-generation) (vendor claims)

### Inferences
- For Remake, "shot-list template = canvas template" is natural: a reusable "trend format" (e.g. hook / reveal / CTA, with nodes pre-wired) that agencies can apply to a new brand by swapping the product image and script. Publish-as-app (Krea/Runway) suggests a client-facing simplified form (upload product + script -> run) for non-expert agency staff.

### Gaps
- No source quantified template library sizes or adoption.
- Comment/approval flows (client review) are mentioned only by Raelume and Krea (viewer sharing); no first-party detail on in-canvas review workflows.

## 8. Concrete UX patterns Remake could adopt (synthesis of sections above; the inference label applies to every bullet)

### Takeaway
Copy the shared node grammar, add a shot-typed node, borrow Krea's cost-approval and downstream-only rerun, Flora's cut-returns-as-node, Weave's pre-run estimate, and Runway's Active Runs list; avoid Higgsfield's model-dependent edge semantics, blank canvases, and unbounded model menus.

### Cited Findings
- Typed, color-coded ports with "drag from handle shows compatible nodes" and automatic type-fix by an agent — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md); colors orange/pink/green — [AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines)
- Pre-run credit estimate on the node, reported accurate — [Banani](https://www.banani.co/blog/figma-weave-review)
- Per-node cost breakdown and approval before a batch runs; downstream-only rerun with caching — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md)
- Active Runs menu for concurrent runs with cancel — [Runway help](https://help.runwayml.com/hc/en-us/articles/45763528999699) (via search summary)
- Timeline cut returns to the canvas as a video node — Flora Timeline Editor post (see section 4; single unverified source)
- Bulk variants through a List/variable node, shown as grid — [Kingy AI](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/)
- Agent builds/edits the graph from natural language, remaining human-editable — [Runway changelog](https://runway.com/en/changelog) (2026-07-23), [Krea blog](https://www.krea.ai/blog/multiplayer-nodes) (Node Agent, 2026-03-18 post referenced there)
- Publish workflow as a simplified app/form — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes.md), [Runway changelog](https://runway.com/en/changelog)
- Personal undo, live cursors, snapshot history (5 min / 5 days) — [Krea blog](https://www.krea.ai/blog/multiplayer-nodes)

### Inferences
1. Auto-generate the graph from the shot list (one shot node per shot, pre-wired reference -> image -> video) so no one meets a blank canvas; this directly addresses the "steep learning curve / blank canvas" complaints across Weave, Flora and Freepik.
2. Make the shot the unit: a collapsed shot node shows one thumbnail + status + cost; expand to see the internal image -> video chain and the real-footage slot.
3. Explicit edge roles (start frame / end frame / reference / audio) shown on the edge, because Higgsfield documents that edge meaning depends on model.
4. Cost UX: node-level estimate, "run selected / run all" batch total with confirm, a workspace budget bar (Flora), and gating "generate video" behind an approved storyboard image.
5. Editor panel: shot list order drives timeline; the exported cut appears as an output node; state clearly what the editor does not do (colour grading/VFX), as Flora does.
6. Run state: per-node queued/running/done/failed + global active-runs tray; keep chains running if the tab is closed server-side (Krea's chain depends on the submitting tab, which is a weakness).
7. Bulk/variant mode for agencies (List node idea): same shot template across brands/languages/hooks, shown as a grid with pick-and-promote.

### Gaps
- None of this was validated with users; it is a design hypothesis derived from documentation and reviews, not from hands-on testing of the products' UIs.

---

## Source reliability notes (for the report writer)
- Highest confidence (first-party, dated): Figma blog (2026-06-24), Runway changelog and API docs, Krea docs and multiplayer blog (2026-10-22), Weave pricing page (2026-11-02), Higgsfield help center, Adobe blog (2025-09-24), IT Brief (2026-05-07), CineD (2026-04-25).
- Medium confidence (independent reviews): Banani (Weave/Flora, June 2026), MakerStack (2026-07-20), Kingy AI (2026-03-18, updated 2026-10-22), Chase Jarvis (undated), Dupple (May 2026).
- Low confidence / conflicted: Melius, Wireflow, Raelume (DEV Community), Morphic, Krea's competitor comparison, all `geo.higgsfield.ai` pages, ltx.studio own pages, search-result-only summaries (LinkedIn Flora Timeline Editor, Runway help center, Freepik docs, Digital Camera World).
- Several fetches returned 403 (help.runwayml.com, help.weavy.ai, freepik.com/ai/docs); a page body could be fetched for some review sites only through a small model's summary, so quoted figures there are second-hand.
- Banani pages show two dates each (byline June 2026 vs metadata 2026-10-22); the byline date is used.
