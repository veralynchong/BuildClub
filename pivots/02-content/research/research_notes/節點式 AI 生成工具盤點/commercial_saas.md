# Commercial SaaS: node-based / infinite-canvas AI image and video generation (state as of 2026-11-03)

Method note: ~35 searches/fetches on 2026-11-03. Many roundups (Wireflow, Vilva, Martini, Morphic, PlugNode, Dreamina) are written by competitors of the tools they rank, so I treat them as weak evidence and mark them. Official pages that returned 403 (Runway help, Betanews) could not be read. Prices conflict widely between sources; the most authoritative page found is named in each case.

## Q1. Which real, currently operating SaaS products have a node/graph UI for AI image/video generation (and is the UI truly wired)?

### Takeaway
At least 14 commercial products have a genuine wired-node canvas with video: Figma Weave (ex-Weavy), Flora, Krea Nodes, Freepik/Magnific Spaces, Runway Workflows, Higgsfield Canvas, ImagineArt Workflows, Picsart Flow, Adobe Firefly Graph, Martini/Astorie (verify rename), Scenario, TapNow (Tapflow), Zeemo, Fuser. Several others are board/chat canvases without wires (Lovart, Leonardo Blueprints/Flow State, OpenArt Suite, Canva, Morphic by its own claim). Three products went away or pivoted: Visual Electric (shut down after Perplexity deal), Invoke hosted (shut down after Adobe deal), Glif (builder possibly replaced by chat agent, unverified).

### Cited Findings

#### A. Wired-node products (verified from official docs or at least one primary-ish source)

**Figma Weave (formerly Weavy)** — weave.figma.com / weavy.ai
- Company: Weavy, Tel Aviv, founded 2024; $4M seed in June 2025 led by Entree Capital; acquired by Figma, reported 2025-10-30; Figma has not disclosed price, 20 people joined — [TechCrunch via search](https://techcrunch.com/2025/10/30/figma-acquires-ai-powered-media-generation-company-weavy), [AlternativeTo summary](https://alternativeto.net/news/2025/11/figma-acquires-ai-content-platform-weavy-launching-node-based-image-and-video-editing-tool/), [Dataconomy](https://dataconomy.com/2025/10/30/figma-buys-ai-design-startup-weavy-and-launches-new-brand-figma-weave). Calcalist headline claims the deal exceeded $200M; I could not confirm elsewhere — [Calcalist](https://www.calcalist.co.il/calcalistech/article/rym0rywk11x) (unverified).
- Node UI: node graph mixing generative nodes with compositing tools (Curves, Levels); "App Mode" publishes a graph as a simplified UI — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/).
- Models: third-party via fal.ai (Seedance, Sora, Veo, Flux, Ideogram, Nano Banana, Seedream per press) — [AlternativeTo](https://alternativeto.net/news/2025/11/figma-acquires-ai-content-platform-weavy-launching-node-based-image-and-video-editing-tool/), [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps).
- Figma status: still a separate product with separate billing and separate credit pool from Figma; Weave tools can be published into Figma Design; "more updates over the next year" — [Figma Help](https://help.figma.com/hc/en-us/articles/35965787376919).
- Collaboration: Team plan has workspace file sharing, shared credit pool — [Weave pricing](https://weave.figma.com/pricing). Real-time co-editing not confirmed in official sources.
- API: Enterprise only (API workflow runs, own API keys) — [Weave pricing](https://weave.figma.com/pricing).
- Timeline/editor export: not described on official pricing/help pages; a motionbox roundup lists "editable motion timelines" as something people look for elsewhere, implying Weave lacks one — [Motionbox](https://motionbox.io/blog/best-figma-weave-alternatives-2026) (competitor, weak).
- Complaints: learning curve for non-node users, fewer advanced parameters than ComfyUI, browser slowdown on big graphs — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/). Credit "surprises" and billing separate from Figma — [Motionbox](https://motionbox.io/blog/best-figma-weave-alternatives-2026).

**Flora (formerly FloraFauna; flora.ai)**
- Company: Flora; reported $42M Series A led by Redpoint, $52M total. Round date unclear: one source implies Apr 2025, SiliconANGLE dated 2026-01-27 — [Dealroom news](https://ai-startups.dealroom.co/news/feed/node-based-design-tool-flora-raises-42m-from-redpoint-ventures-2), [SiliconANGLE](https://siliconangle.com/?p=729193). Clients reportedly Nike, Netflix, Pentagram, Lionsgate (single roundup, weak) — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).
- Node UI: infinite canvas, nodes chain; "visual genealogy" branch/version history; AI agent FAUNA builds node workflows (launched ~2026-03-31, one source) — [TestingCatalog](https://www.testingcatalog.com/flora-launches-fauna-ai-design-agent-for-teams), [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders). Chase Jarvis describes it as "Miro-like" with prebuilt "Flows" (fashion, architecture, filmmaking), and "Story Analysis" that turns a script into shot sequences — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/).
- Models: 50+ third-party models (Veo 3.1, Sora 2 Pro, Flux, Kling named) — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders), [Stork summary of official site](https://www.stork.ai/en/flora-ai). Another roundup says 200+ — [Alignify](https://alignify.co/tools/canvas-video) (conflict; official count unverified).
- Collaboration: real-time multiplayer, live cursors, version history — [Wireflow](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives) (competitor), [Alignify](https://alignify.co/tools/canvas-video).
- Timeline: a LinkedIn post claims a real multi-track timeline editor sitting on the canvas where finished cuts return as a video node; only source, affiliation unconfirmed — [LinkedIn via search](https://ar.linkedin.com/in/katherinelecuna). Morphic's competitor pages say Flora has no timeline — [Morphic](https://morphic.com/de/resources/alternatives/flora-ai-alternatives). CONFLICT, unresolved.
- Complaints: opaque credits especially for video; video "basic", lacks granular camera control; hard to justify for solo users; API in beta limited to prebuilt recipes — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/), [Wireflow](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives), [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).

**Krea Nodes (krea.ai)**
- Official docs: infinite canvas; nodes have inputs left, params, outputs right; handles colour-coded by type; up to 10 outgoing connections per node. Node types include Generate Image/Video/3D, Edit, Enhance, Motion Transfer, Lipsync, Audio; utilities such as Trim Video, Stitch Videos (most utilities need Pro) — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes).
- Video models via nodes: Veo, Sora, Kling, Wan, Hailuo, Seedance, LTX-2, with start/end image options. Providers: Google, OpenAI, Black Forest Labs, ByteDance, Alibaba, Kling. Krea says models rotate quarterly — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes).
- Node Agent (builds graphs from text; announced 2026-03-18) and Prompt-to-Workflow (2026-02-10) — [search summary of Krea changelog](https://www.krea.ai/docs/tr/user-guide/features/nodes). A price tracker says "Access to Nodes Agent" disappeared from the plan comparison table on 2026-10-20/21 — [PricingSaaS](https://pricingsaas.com/companies/krea/diffs/2026D294) (single source, unverified).
- Node App Builder: publish a workflow as a simple app with chosen inputs; run via API endpoint. Business plan: up to 50 seats, collaborative canvas editing — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes).
- No documented timeline editor or canvas export (only Trim/Stitch utility nodes) — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes).
- Original launch date of Krea Nodes: not found (Krea's own Oct 30 2025 roundup already lists it) — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps).
- Complaints: credits burn fast on real-time video; weaker API/collab than workflow-first tools — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/), [Motionbox](https://motionbox.io/blog/best-figma-weave-alternatives-2026).

**Freepik Spaces, now Magnific Spaces (magnific.com/spaces)**
- Freepik rebranded as Magnific on 2026-04-28; Spaces moved to magnific.com/spaces; Essential tier removed, Pro replaced by Pro Starter — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces), rebrand date from [search summary of DEV/Wikipedia/Wireflow](https://en.wikipedia.org/wiki/Magnific) (secondary; date not confirmed from a primary release).
- Launch: Freepik Spaces launched with real-time collaboration (BetaNews article; exact date unreadable, 403). A search summary says November 2025, but a Hackceleration review and others imply earlier; treat launch date as unverified — [BetaNews](https://betanews.com/article/freepik-launches-freepik-spaces-to-power-real-time-ai-visual-creation-and-collaboration).
- Node UI: "each step is a box you wire to the next"; nodes: Upload, Media, Text, image and video generators, Assistant, upscaler, three audio nodes, Panel, List; no loops, no conditional logic, no external triggering — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces).
- Models: Nano Banana Pro, Seedream, Flux.2 Pro, Recraft (images); Veo 3.1, Kling 3.0 Motion Control Pro, Wan 2.5 (video) — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces), [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/).
- Collaboration: real-time multiplayer with live cursors — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).
- Export: manual; no API/connectors — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces). No timeline.
- Complaints: a workflow burned 41,000 credits without warning; dashboard vs in-Spaces balances differ; unlimited-model list shrank; refunds refused; slow support — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces). Chase Jarvis also notes video queue times and library lock-in.

**Runway Workflows (runwayml.com)**
- Launched October 2025, initially to Creative Partners and Enterprise; node types: Input (text/media), Media model (image/video), LLM nodes — [AlternativeTo](https://alternativeto.net/news/2025/10/runway-launches-node-based-workflows-for-building-custom-ai-creative-pipelines).
- Now in paid tiers (Standard and above per aggregators); "Workflows" later became "Apps" (shareable pipeline as one-click app) and Runway Agent can build/edit workflows by natural language — [Digg summary](https://digg.com/ai/epc6m2rq), [Jerrod Lew newsletter](https://jerrodlew.beehiiv.com/p/runway-s-platform-power-play), [Creatify price guide](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay) (plan placement conflicts across aggregators).
- Models: Runway's own Gen-4/Gen-4.5 plus third-party image/video models on Standard+ — [Creatify](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay).
- Sharing: only input assets shareable via link, node outputs cannot be shared — [Runway Help via search](https://help.runwayml.com/hc/en-us/articles/45763528999699).
- Runway's help page itself returned 403; details above are from secondary summaries.

**Higgsfield Canvas (higgsfield.ai/canvas-intro)**
- Node-based board: Text Prompt node, generation nodes (each with a chosen model), reference nodes (image/audio/Assets); wire by dragging output to input; run per node or in sequence; autosave; save as reusable template; real-time multi-user editing; Share invites — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas).
- Models inside the graph: Soul 2.0 (own), Seedance 2.0, Kling 3.0, Wan 2.7, Veo 3.1, Nano Banana Pro, GPT Image 2.0 — [Higgsfield canvas intro via search](https://higgsfield.ai/canvas-intro).
- Launch: a third-party post dated 2026-05-01 describes it as newly rolled out; no official launch announcement found — [VO3 AI blog](https://www.vo3ai.com/blog/3-ways-higgsfield-just-raised-the-bar-for-ai-video-direction-2026-05-01) (promotional, weak).
- Credits: building/connecting nodes is free; credits spent only on generation; Unlimited plan does not apply in Canvas — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas).
- FigJam plugin includes "Canvas Nodes" drawing on plan balance — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas).
- Not documented: timeline, export, per-run cost display, funding (not researched).

**Adobe Firefly Graph (Adobe)**
- Node graph: each action is a node, drawn connections, list outputs (double line), subgraphs, Run button on AI nodes, generative credits consumed — [Adobe Help](https://helpx.adobe.com/firefly/web/work-with-enterprise-features/creative-production/build-custom-workflows.html).
- Availability: article dated 2026-06-17: available to Creative Cloud for Enterprise; Teams in public beta; 300+ node types; Adobe's own models plus Google and OpenAI third-party models; video generation and editing nodes — [Computerworld](https://www.computerworld.com/article/4186410/adobe-new-firefly-graph-can-turn-creative-workflows-into-reusable-assets.html).
- Pricing: custom per-seat enterprise agreements, credits included — [Computerworld](https://www.computerworld.com/article/4186410/adobe-new-firefly-graph-can-turn-creative-workflows-into-reusable-assets.html).
- Firefly Boards (separate Adobe moodboard product): I found no evidence of wires; not verified.

**ImagineArt Workflows (formerly "Imagine Flow"; Vyro)**
- Docs: wire from output handle to input handle; type-safe connections (image handle only to image handle); Image/Video/Audio/Text nodes plus Ad Maker; Prompt node, Copilot node, Section grouping; per-node model choice, set runs per execution; Run / Run Selected / Ctrl+Enter; docs say nothing about cost display — [ImagineArt docs](https://docs.imagine.art/workflows/canvas-interface.md).
- Credits: Basic $9/mo with 2,000 or 3,000 credits (conflict); free tier ~100 daily credits; unresolved whether Workflows is gated by plan — [ToolQuestor/Flowith via search](https://flowith.io/blog/imagineart-pricing-free-credits-vs-pro-what-you-get). Launch date not found.
- PlugNode roundup: curated hosted models, video "limited", lighter automation than rivals — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders) (weak).

**Picsart Flow (Picsart)**
- No-code workflow builder; models, inputs, outputs as nodes on a zoomable canvas; Motion Graphics node (prompt to up to 10-minute motion graphics video); AI Copilot in Flow that wires nodes announced 2026-03-13 via Business Wire; Veo 3.1 Fast and Kling 3.0 listed; earlier Flows release press 2025-11-20 — [Picsart](https://picsart.com/magic-workflow), [Business Wire](https://www.businesswire.com/news/home/20260313163797/en/Picsart-Unveils-AI-Copilot-in-Flow-Turning-Every-Creator-into-Their-Own-Creative-Director), [Picsart blog](https://picsart.com/blog/?p=249042). Original launch date not established. Pricing not found.

**Martini (martini.art), apparently redirecting to Astorie (astorie.ai), StoryFlow AI Inc.**
- martini.art/en/features/... 301-redirects to astorie.ai, copyright "StoryFlow AI, Inc." Earlier search said Martini is built by Storyflow AI Inc. Rename is inferred from the redirect, not announced anywhere I found — [Astorie page](https://astorie.ai/features/ai-video-workflow), [Martini search result](https://martini.art/en/features).
- Nodes: Text, Image, Video, Audio; Video node behaviour depends on what is wired in (text = T2V, one image = I2V, many images = multi-reference, video = editing). Models: Runway Gen4, Wan, Sora 2, Seedance 2, Hailuo, Veo, Vidu, Kling 3; Midjourney v7, GPT Image 2, FLUX.2; ElevenLabs, Fish Audio. Final timeline cutting is deferred to an external NLE (DaVinci/Premiere) with an "AI Video NLE Export" page; credits by model; per-run cost display not mentioned — [Astorie page](https://astorie.ai/features/ai-video-workflow).
- Funding: VCBacked lists a March 2026 pre-seed with Y Combinator named, amount unknown; a Dealroom $125k seed may be a different "Martini" — [VCBacked](https://www.vcbacked.co/company/martini), [Dealroom](https://app.dealroom.co/companies/martini).

**Scenario (scenario.com), game-asset focus**
- Wires between colour-coded nodes; Prompt Builder, If-Else branching, Group Assets; claims 500 models from 50 providers incl. image/video/3D/audio and custom-trained models; Node Agent; publish workflow as App — [Scenario help](https://help.scenario.com/en/articles/introduction-to-workflows), [Scenario Node Agent](https://www.scenario.com/features/node-agent). Third-party listing pricing Starter $15 / Pro $45 / Max $75 (possibly outdated) — [TopAI](https://topai.tools/t/scenario-com).

**TapNow / Tapflow (company not identified)**
- Browser agentic canvas; nodes hold prompts, images, audio, video; storyboard planning from uploaded footage (AI agent splits into scenes) and sketch/script to scenes; Kling, Runway, Veo, Luma, Flux named; 200 free "Tappies" at signup — [Filmora review via search](https://filmora.wondershare.com/video-editor-review/tapnow-ai-review.html), [Dreamina review](https://dreamina.capcut.com/ai-video/tapnow-ai-review). TapTV community with 120K+ public workflows (one roundup) — [Alignify](https://alignify.co/tools/canvas-video). All reviews are marketing-adjacent.

**Zeemo AI Video Studio (zeemo.ai)**
- Official docs: infinite canvas (10-200% zoom), four node types (Text, Image, Video, Audio), image node usable as video reference frame; docs present canvas as alternative to a timeline — [Zeemo docs](https://docs.zeemo.ai/docs/canvas-interface), [Zeemo node overview](https://docs.zeemo.ai/docs/node-overview). Pro about $10 with 300 credits (third-party listing, currency/period unclear) — [Techjockey](https://www.techjockey.com/us/detail/zeemo).

**Fuser (fuser.studio)**
- Browser node canvas chaining image/video/audio/3D/LLM; credit-based with plan credits plus top-ups; costs calculated from actual parameters (duration, resolution) and documented per endpoint; Slashdot lists from $5/month with a free version (data possibly 2025) — [Fuser llms.txt](https://fuser.studio/llms.txt), [Slashdot](https://slashdot.org/software/p/Fuser/). Company and funding not found.

#### B. Timeline-plus-canvas products (relevant to our "push to timeline" feature)

- **Dreamina AI Canvas (ByteDance/CapCut)**: Dreamina review dated 2026-10-13 describes an infinite board where Seedream 5.0 Pro, Seedance 2.5, Seedaudio 2.0 run together plus a built-in timeline to arrange connected clips; whether links between nodes are visible wires is not stated in what I read. The source is Dreamina's own marketing — [Dreamina AI Canvas review](https://dreamina.capcut.com/es-es/ai-video/ai-canvas-review), [Dreamina best-canvas list](https://dreamina.capcut.com/ai-video/best-ai-canvas). Seedance 2.5 launched on Dreamina 2026-07-31 — [Dreamina launch post](https://dreamina.capcut.com/resource/seedance-2-5-launch).
- **VidMuse Freeform Canvas**: node canvas with a Timeline component appearing at the bottom for sequencing, audio sync, export — [VidMuse via search](https://vidmuse.ai/blog/vidmuse-freeform-canvas-guide) (page 403'd on fetch; relying on search snippet).
- **Morphic (morphic.com)**: "Canvas" for generating and organising assets plus "Compose" timeline editor; claims canvas is free-form with no node configuration, while another Morphic page says models "connected as nodes" (self-contradictory marketing) — [Morphic glossary](https://morphic.com/de/ai-glossary/canvas), [Morphic vs Flora](https://morphic.com/resources/alternatives/flora-ai-alternatives). Treat as board, not wires.
- **Renoise** (canvas + desktop-only timeline) — [Renoise docs via search](https://renoise.ai/docs/canvas-guide); not examined further.
- **Mosaic (mosaic.so, YC W25)**: node canvas of "Tiles" for agentic video editing; founders say it exports XML to DaVinci Resolve, Final Cut Pro, Premiere; free tier plus $25/mo or $500/yr (one review site); $3.8M seed reported by Filmora review, unconfirmed — [HN launch](https://hn.svelte.dev/item/45980760), [MakerStack](https://makerstack.co/reviews/mosaic-review/). It is an editor, not an image/video generator in the first place.
- **OpenCreator (opencreator.io)**: one roundup claims node canvas, built-in timeline, Sora 2/Veo 3.1/Kling 2.1 Pro — [Alignify](https://alignify.co/tools/canvas-video). My own search found opencreator.io described as an AI video studio with a Storyboard Builder and no node canvas or timeline evidence — [OpenCreator](https://opencreator.io/template-storyboard-builder). CONFLICT; unverified.
- **Beeble Canvas** (launched 2026-05-19): node-graph compositing for VFX with AI nodes (matte, depth, video gen) — [Beeble](https://beeble.ai/updates/2026-05-19-introducing-canvas). Niche (VFX), not examined.

#### C. Board/chat canvases without confirmed wires, or unverified

- **Lovart (ChatCanvas)**: SF company; global launch July 2025 after beta with 800,000+ users; infinite canvas controlled by an AI design agent; outputs include video. Wires not evidenced. Funding conflicting ($441M / $2B valuation on Caplight, unconfirmed; TechCrunch sponsored piece says undisclosed) — [TechCrunch sponsored](https://techcrunch.com/sponsor/resonate-international-lnc/lovart-is-building-ai-design-agent-that-augments-creative-teams-with-single-platform/), [Caplight](https://www.caplight.com/company/lovart).
- **Leonardo.Ai**: Blueprints launched Nov 2025, 50+ prebuilt workflows; API docs say Blueprints are node-based under the hood (inputs addressed by nodeId), but user-facing it is preset templates (Chase Jarvis calls them "static presets"). Flow State is described inconsistently (ideation vs pipeline constructor) — [Leonardo docs](https://docs.leonardo.ai/docs/blueprints-guide.md), [Mediaweek](https://www.mediaweek.com.au/leonardo-ai-launches-blueprints-to-streamline-professional-ai-workflows), [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/). Not a wired canvas as far as I can verify.
- **OpenArt**: launched OpenArt Suite (2026-03), unified workspace, not node-based; Martini's competitor blog says OpenArt treats models as launchable tools, not wired nodes — [OpenArt](https://openart.ai/blog/openart-suite-unified-ai-workspace/), [Martini blog](https://martini.art/en/blog/openart-vs-martini-workflows). I found no OpenArt node editor.
- **Canva**: Dreamina roundup says template-driven design canvas, not connected generation nodes — [Dreamina](https://dreamina.capcut.com/ai-video/best-ai-canvas). Not checked directly.
- **Pollo AI**: no node canvas found; has "Pollo Agent" workflows — [search results](https://pollo.ai/m/golpo). Not verified either way.
- **Recraft, Kling canvas, Hailuo, Rubbrband, Dreamina wires**: Rubbrband returned no results (possible misspelling or defunct); Recraft and Kling not searched. Treat as unverified.

#### D. Adjacent / adjacent-commercial (brief)

- **Google Opal** (Google Labs): no-code app builder, visual node editor with input/generate/output nodes using Gemini, Imagen, Veo; US availability at launch — [DataCamp tutorial](https://www.datacamp.com/ja/tutorial/google-opal-tutorial), [TMCnet](https://blog.tmcnet.com/blog/rich-tehrani/ai/google-tests-opal-a-no-code-vibe-coding-app-for-ai-mini-app-creation.html). Not an image/video-first tool; status in Nov 2026 not re-checked.
- **Wireflow (wireflow.ai)**: node canvas using fal.ai/Replicate/custom endpoints; freemium usage-based; positions on API and batch execution; its own blog posts are the main source of "alternatives" lists — [Wireflow](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives). Company/funding not found.
- **PlugNode**: node pipeline using your own API keys, no platform markup — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).
- **Vilva**: agent-built node board, 200 free credits; author is the vendor — [Vilva](https://vilva.ai/blog/best-node-based-ai-workflow-tools-2026-ranked).
- **fal Workflows**: visual builder with coloured lines; described as cluttered/technical, no image previews in node editor, expensive example runs — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps).
- **Commercial cloud ComfyUI wrappers**: RunDiffusion (hourly GPU), Playbook3d (3D passes), Comfy Cloud, ViewComfy — [Wireflow](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives), [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps). Open-source core is another researcher's scope.
- **Glif**: June 2026 directory still describes a visual node builder; an API-provider profile says Glif 2.0 relaunched March 2026 as a chat agent with 100+ tools, REST APIs deprecated 2026-05-20, and a $17.5M seed from a16z/USV in April 2026 — [Tool Directory](https://tooldirectory.ai/tools/glif), [APIs.io](https://apis.io/providers/glif-app/). Conflict; single secondary source for the pivot and funding.

#### E. Gone / shut down

- **Visual Electric**: acquired by Perplexity (team) 2025-10-02; product wound down over 90 days; subscribers offered refunds and export — [TechCrunch](https://techcrunch.com/2025/10/02/perplexity-acquires-the-team-behind-sequioa-backed-ai-design-startup-visual-electric/), [Built In](https://builtin.com/articles/perplexity-acquires-visual-electric-20251002). Exact shutdown date not confirmed. Note: it was a canvas, not shown to have wires.
- **Invoke (commercial hosted)**: team joined Adobe (AI Foundry); hosted service discontinued October 2025 (31 Oct per one write-up); open-source continues; $3.8M figure only from aggregators — [Invoke app page](https://app.invoke.ai), [Dealroom news](https://app.dealroom.co/news/feed/adobe-acquires-invoke-ai-for-3-8m), [The Letter Two](https://thelettertwo.com/2025/10/20/adobe-ai-foundry-custom-generative-models/).

### Inferences
- The wired-node-plus-video category consolidated fast in H2 2025 to H1 2026: acquirers are Figma (Weavy), Adobe (Invoke team, then Firefly Graph), Perplexity (Visual Electric team); incumbents with big model libraries launched their own (Freepik/Magnific, Runway, Higgsfield, Picsart, ImagineArt, Krea).
- Third-party model aggregation is the universal pattern: Weave, Flora, Krea, Spaces, Higgsfield, Astorie all list overlapping Seedance/Kling/Veo/Wan/Nano Banana/Seedream. Model access is not a differentiator for BuildClub; workflow shape is.
- Many of these products' differences lie in agent builders (Krea Node Agent, FAUNA, Scenario Node Agent, Picsart Copilot, Runway Agent, Zeemo/Vilva). "Describe it and the graph appears" is becoming table stakes.

### Gaps
- No primary launch dates for Krea Nodes, Freepik Spaces, ImagineArt Workflows, Picsart Flow, Higgsfield Canvas, Martini, TapNow, Fuser.
- Runway help page and BetaNews Freepik launch page returned HTTP 403, so details come from search summaries.
- Rubbrband: no search results at all. Pollo, Recraft, Kling, Hailuo, Canva, Firefly Boards, Dreamina wires not verified directly.
- Company, funding for TapNow, Fuser, Zeemo, Wireflow, ImagineArt/Vyro not found.
- No Reddit/X threads were returned by search (only blogs/review sites); user-complaint evidence is blog- and review-site-based.

## Q2. Which products are closest to a Prompt -> Storyboard image -> Video -> timeline pipeline?

### Takeaway
Closest matches by documented features: Dreamina AI Canvas (node canvas + built-in timeline, own Seedream/Seedance models, ByteDance), Flora (script-to-shot "Story Analysis", branching versions, possible new timeline editor), Astorie/Martini (shot generation/comparison with NLE export handoff), VidMuse, Morphic (canvas + Compose timeline, no wires), Zeemo/TapNow (canvas with storyboard generation), and Mosaic (XML export into Premiere/Resolve/FCP but editing-first). None of the majors (Weave, Krea, Spaces, Higgsfield, Runway) documents a native timeline.

### Cited Findings
- Dreamina AI Canvas: Seedream 5.0 Pro, Seedance 2.5, Seedaudio 2.0 on one board with a built-in timeline for arranging connected video clips; review dated 2026-10-13 — [Dreamina](https://dreamina.capcut.com/es-es/ai-video/ai-canvas-review) (vendor).
- Flora: Story Analysis generates sequences of shots from a script — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/); timeline editor claimed by one LinkedIn post, denied by competitor pages — see Q1.
- Astorie/Martini: canvas handles "shot generation, comparison, and organization"; final cutting in external NLE (Resolve/Premiere); "AI Video NLE Export" page exists — [Astorie](https://astorie.ai/features/ai-video-workflow).
- VidMuse: node canvas plus a timeline for sequencing and export after first video — [VidMuse](https://vidmuse.ai/blog/vidmuse-freeform-canvas-guide) (snippet only).
- Morphic: Canvas for assets, Compose timeline for sequences; storyboard, generation and timeline on one surface (self-description) — [Morphic](https://morphic.com/resources/alternatives/runway-alternatives).
- TapNow: AI chat agent breaks uploaded footage into structured scenes; sketch/script to scenes — [Filmora review](https://filmora.wondershare.com/video-editor-review/tapnow-ai-review.html).
- Zeemo: official docs frame the node canvas as an alternative to a timeline; storyboard claims only from third-party listings — [Zeemo docs](https://docs.zeemo.ai/docs/canvas-interface), [SimilarLabs](https://similarlabs.com/p/zeemo-ai).
- Freepik Spaces: storyboard frames can be animated through a Kling video node ("Panel" node exists); export is manual — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces).
- Higgsfield Canvas: reference/prompt/video chain, Kling treats connected image as start frame, Seedance uses reference images — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas). No timeline documented.
- Mosaic: XML export to Resolve/FCP/Premiere — [HN launch](https://hn.svelte.dev/item/45980760).

### Inferences
- The precise combination BuildClub wants (wired Prompt/Shot/Storyboard/Video nodes + versions v1/v2 + per-node cost + push to timeline) is not cleanly delivered by any single verified product. Closest overlaps: Flora (storyboard + version genealogy), Dreamina (timeline), Astorie (NLE handoff).
- Most competitors choose "export to external NLE" over building a timeline; a bundled timeline editor is a rare differentiator, with Dreamina the best-resourced example.

### Gaps
- Could not test any product hands-on (no accounts); claims about timeline are from docs/reviews only.
- Flora timeline editor and Dreamina wire/timeline details need direct verification.

## Q3. Pricing and how each shows per-run cost

### Takeaway
All are credit-based, almost all have a free tier (Flora free has no video; Weave 150 credits; Freepik/Magnific daily cap; Krea daily units). Per-run cost visibility ranges from explicit dollars on every Run button (Flora, optional) and credit cost shown before processing (Weave, per one review; Krea Node Agent and App runs) to opaque or approximate (Freepik Spaces, Flora default). Prices below conflict across sources; official pages used where possible.

### Cited Findings
- **Figma Weave** (official, annual-billed prices, page lists per-model credit table): Free $0 / 150 credits (~375 images), 5 workflows; Starter $24/mo 1,500 credits; Professional $45/mo 4,000; Max $100/mo 10,000; Team $42/user/mo 4,500 credits per user with shared pool; Enterprise custom with API; top-ups $10 per 1,000 (Starter) or 1,200 (higher) credits, roll over 12 months; annual billing saves 30% — [Weave pricing](https://weave.figma.com/pricing). Different aggregators list other numbers (e.g. $19 Starter, Team $48/$60) from older snapshots — [Wireflow](https://www.wireflow.ai/blog/figma-weave-pricing). Per-run cost: one review says Weavy shows the credit cost before processing, unlike Freepik's approximations — [search summary of Banani/Chase Jarvis reviews](https://www.banani.co/blog/figma-weave-review) (secondhand).
- **Flora** (official docs): Free (text/image only, limited free generations, 1 seat); Starter $18/mo = $18 usage budget; Pro $50/mo = $50; Max $200/mo = $200; each up to 8 seats; Enterprise custom; billed monthly, quarterly (10% off) or yearly (20% off). Usage is a dollar-denominated pool, shared or per-user capped, resets monthly, optional capped overage. FAUNA agent free on all plans. Video from Starter up. Per-run cost: default is a percentage usage bar; toggling "Show generation costs in dollars" shows exact dollars on each model and Run button; Usage History per generation/project/member — [Flora docs](https://docs.flora.ai/plans-and-billing/pricing.md). This is the closest competitor design to BuildClub's "cost per run" requirement.
- **Krea**: pricing conflicts: $9 Basic up to $200 (CostBench), Pro $35/mo with 20,000 units (ToolQuestor), Pro $20/mo (Alignify), $10-$100 with credits expiring after 90 days (PlugNode). Official pricing page not readable. Per-run cost: Node Agent shows compute cost per node before a build and runs only after approval; Node App runs show cost before execution — [Krea docs](https://www.krea.ai/docs/user-guide/features/nodes), [CostBench](https://costbench.com/software/ai-image-generators/krea/), [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).
- **Magnific/Freepik Spaces** (Hackceleration, 2026): Free (3 Spaces, daily cap, no commercial license); Premium $20/mo ($14.50 yearly) 240,000 credits/year; Premium+ $45 ($33.75 yearly) 600,000/year; Pro Starter $110 ($82.50) 1.5M/year; credits valid one year. Example costs: 4 s Veo 3.1 4K with audio = 2,080 credits; 3 s Kling 3.0 Motion Control Pro = 450. No clear pre-run cost warning; balances differ between dashboard and Spaces — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces). Older sources list $5.75 to $158.33 (PlugNode, pre-rebrand).
- **Runway**: Free 125 one-time credits; Standard $12-15/user/mo 625 credits with Workflows; Pro $28/user/mo (annual) 2,250 credits with Apps and Workflows; Max replaced Unlimited in 2026; web and Dev credits shareable per a 2026-09-18 Runway post (conflicting guide) — [Creatify](https://creatify.ai/blog/runway-pricing-(2026)-plans-credits-and-what-you-ll-actually-pay), [Runway unified pricing](https://runway.com/news/company-news/working-smarter-with-runway-unified-pricing). Per-run display not confirmed.
- **Higgsfield Canvas**: building nodes is free, credits charged per generation; plan tiers not found — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas).
- **Adobe Firefly Graph**: enterprise seat deals, credits included; AI nodes show a Run button and use generative credits — [Computerworld](https://www.computerworld.com/article/4186410/adobe-new-firefly-graph-can-turn-creative-workflows-into-reusable-assets.html), [Adobe Help](https://helpx.adobe.com/firefly/web/work-with-enterprise-features/creative-production/build-custom-workflows.html).
- **ImagineArt**: Basic $9/mo, 2,000-3,000 credits (conflict); free about 100 daily credits — [Flowith](https://flowith.io/blog/imagineart-pricing-free-credits-vs-pro-what-you-get). Docs don't describe cost display — [ImagineArt docs](https://docs.imagine.art/workflows/canvas-interface.md).
- **Fuser**: from $5/mo (2025 listing), credits never expire, costs derived from parameters — [Slashdot](https://slashdot.org/software/p/Fuser/), [Fuser](https://fuser.studio/llms.txt).
- **Mosaic**: $25/mo or $500/yr; AI processing paywalled — [MakerStack](https://makerstack.co/reviews/mosaic-review/).
- **Scenario**: Starter $15, Pro $45, Max $75 (third-party, may be stale) — [TopAI](https://topai.tools/t/scenario-com).
- **PlugNode**: bring-your-own API keys, no markup — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders).
- **Dreamina**: "from $0.29/month" promo banner (vendor) — [Dreamina](https://dreamina.capcut.com/ai-video/best-ai-canvas).
- **Typical cost benchmark**: about $10-40 of hosted generation credit per usable finished minute (single blog estimate) — [flux-1.ai](https://flux-1.ai/best-node-based-video-generation-tools-in-2026/) (weak).

### Inferences
- Flora's dollar-denominated pool and optional dollar display on the Run button is the most transparent design found; Weave shows credits before the run; Spaces is the cautionary tale (user complaints about surprise burn). Putting cost on each node/run (BuildClub's plan) matches the best practice and addresses the top complaint category across the market.
- Free tiers consistently exclude or severely limit video (Flora Free has no video; Higgsfield charges credits even on build-free canvas), so free-tier video is not expected by users.

### Gaps
- Official pricing pages for Krea, Runway, ImagineArt, Higgsfield, TapNow, Zeemo, Picsart Flow not read directly; numbers are from aggregators and conflict.
- Whether Weave/Runway/ImagineArt show per-run cost on the node itself was not confirmed from official docs.

## Q4. Funding, acquisitions, status risks, and recurring user complaints

### Takeaway
Funded or backed: Flora ($52M total, Redpoint), Weavy ($4M seed, then Figma), Glif ($17.5M seed reported), Mosaic (YC W25), Martini/Astorie (YC listed pre-seed), Lovart (conflicting claims). Shut down or absorbed: Visual Electric, Invoke hosted. Recurring complaints: opaque/burning credits, learning curve and browser performance on large graphs, weak API, shallow video control, no native timeline.

### Cited Findings
- Weavy: $4M seed June 2025 (Entree); acquired by Figma Oct 2025; operating separately — [Dataconomy](https://dataconomy.com/2025/10/30/figma-buys-ai-design-startup-weavy-and-launches-new-brand-figma-weave), [Figma Help](https://help.figma.com/hc/en-us/articles/35965787376919).
- Flora: $42M Series A (Redpoint), $52M total — [Dealroom news](https://ai-startups.dealroom.co/news/feed/node-based-design-tool-flora-raises-42m-from-redpoint-ventures-2).
- Freepik: rebranded to Magnific 2026-04-28; claims of 1M+ paid subscribers and $230M ARR attributed to CEO via Fortune, unconfirmed against a primary source — [Yespress](https://yespress.io/magnific).
- Visual Electric and Invoke: see Q1-E.
- Glif: $17.5M seed (April 2026) reported by a single profile — [APIs.io](https://apis.io/providers/glif-app/).
- Complaint themes with sources: surprise credit burn and vanishing credits (Spaces) — [Hackceleration](https://hackceleration.com/labs/review/freepik-spaces); opaque video credits (Flora) — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/); Krea realtime video burns credits and lacks API/collab depth — same source plus [Motionbox](https://motionbox.io/blog/best-figma-weave-alternatives-2026); Weave: learning curve, browser slowdown, billing separate from Figma, no self-host, API only on Enterprise — [Chase Jarvis](https://chasejarvis.com/blog/best-generative-ai-canvas-apps/), [Wireflow](https://www.wireflow.ai/blog/top-8-ai-weavy-alternatives); Flora and Spaces both lack triggerable APIs for full workflows — [PlugNode](https://plugnode.ai/blog/top-node-based-ai-workflow-builders); Krea flows can't be scheduled or batch-run — same.

### Inferences
- A product wanting to differentiate can credibly claim: visible per-run cost before spend, versioning (v1/v2), and a native timeline hand-off, since each is a documented gap in at least one major competitor.
- The "model wrapper plus canvas" moat is thin; platforms with own models (Higgsfield Soul, Dreamina Seedance/Seedream, Runway Gen-4.5, Adobe Firefly) can subsidise cost.

### Gaps
- No Reddit/X primary threads retrieved; no verified user counts or revenue except vendor-claimed figures.
- Shutdown status of Rubbrband, Tapflow-owner, and smaller canvases unknown.
- Weavy $200M+ price (Calcalist headline) unconfirmed.
