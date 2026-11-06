# Shot-based AI video pre-production pipelines (shot -> storyboard frame -> video clip -> timeline): competitor inventory and UX analysis

Research date: 2026-11-03. Method note: most findings come from web-search summaries and fetched third-party pages. Few primary vendor pages could be fetched (Freepik docs and a Freepik blog returned HTTP 403; ltx.io blog fetch errored). Where a claim rests on a vendor's own marketing, an aggregator or a competitor's blog, it is labelled. Reddit/X evidence was thin: search returned only mirror snapshots and mostly Trustpilot/G2 for complaints. Nothing here was hands-on tested. Pika, Hedra, Invideo AI, Storyboarder, Shai Creative, Pollo AI, Kling canvas, Moonvalley Marey (as a UI) and Katalist/Boords video features are only thinly covered or not covered (see Gaps).

## Q1. Product inventory: structure type (node / board / linear), consistency, models, versions, cost, timeline, export, pricing, reviews

### Takeaway
The market splits into four structures. (a) Wired-node canvases with video-model nodes: Freepik Spaces, Flora, Figma Weave (ex-Weavy), Runway Workflows, Higgsfield Canvas. (b) Free-form boards: Adobe Firefly Boards, Morphic Canvas, Luma Boards/Agents. (c) Linear storyboard-then-shots: LTX Studio, Sora storyboard cards, Kling storyboard, Google Flow Scenebuilder, Martini, Boords, Katalist. (d) Agent/chat-driven: Runway Agent, Luma Agents, Flora FAUNA. LTX Studio, Martini and Runway (Timeline Studio) are the products closest to a shot -> frame -> clip -> timeline hierarchy, but none of those three is documented as wired-node.

### Cited Findings

#### LTX Studio (ltx.studio) - linear storyboard, shot cards, timeline
- Starts from script, concept, image or video; auto-splits script into scenes and shots; per scene you set description, characters/objects, camera angle and movement, style, duration and transitions. Dev.to review posted May 8 (year not shown, "mid-2026" referenced); single-author, no hands-on data — [DEV Community review](https://dev.to/shisan_hua_b8097e577bfdc5/ltx-25-ai-video-generator-review-storyboard-to-video-features-pricing-and-how-it-compares-to-1lfn)
- Elements (characters, objects, locations) are the consistency mechanism; a March 2026 entry notes Elements and Custom Styles; LTX-2.5 with native multi-shot listed as arriving in Studio August 2026 (aggregator profile, not verified against LTX release notes) — [yespress.io LTX Studio profile](https://yespress.io/products/ltx-studio.md)
- Timeline view for trimming, layering and rearranging shots was announced as new in a Rundown workshop listing dated August 2025 — [The Rundown workshop](https://app.therundown.ai/workshops/from-storyboard-to-final-cut-mastering-ltx-studios-new-timeline-feature)
- Reviewers call the timeline more basic than a full NLE; LTX combines shots with voiceover, music, SFX, captions, dubbing and export — [search summary of Luma's competitor-leaning review](https://lumalabs.ai/news/ltx-studio-review) (Luma is a competitor; treat as biased), [CineD deep dive](https://cined.com/ltx-studio-deep-dive-the-first-ai-based-full-editing-suite)
- Retake regenerates specific 2-16 second segments within a shot rather than the whole scene (per a competitor-hosted review) — [Luma review of LTX](https://lumalabs.ai/news/ltx-studio-review)
- Morphic's roundup lists LTX Studio as "shot-by-shot breakdown ... animatic", consistency "still improving", heavier use on paid credits (undated page, mentions May 10, 2026 content) — [Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools)
- Complaints: credit burn from re-rendering ("you'll spend a ton of credits trying to get anything right"), unused credits not rolling over (Trustpilot, via search summary) — [Trustpilot LTX Studio](https://ca.trustpilot.com/review/ltx.studio); G2 reviewer says Retake "doesn't work as advertised" and the company said it would improve it — [G2 LTX Studio](https://www.g2.com/products/ltx-studio)
- Reddit (March 2026, about the open LTX-2.3 model, not the hosted Studio): "you're going to find issues with character consistency no matter what without a LoRA"; Elements is the official fix and only exists in Studio — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1sa2j6t/snapshots/2026-04-03T19%3A17%3A05.459795Z)
- Pricing: Free / Pro / Enterprise tiers; specific Pro price not stated in fetched source — [DEV Community review](https://dev.to/shisan_hua_b8097e577bfdc5/ltx-25-ai-video-generator-review-storyboard-to-video-features-pricing-and-how-it-compares-to-1lfn)

#### Runway (runwayml.com) - node Workflows + Agent + Timeline Studio + Aleph/Act-Two
- Workflows (node-based system connecting models and processing steps) released for paid plans 2025-10-24 — [Runway timeline (scriptbyai, secondary)](https://www.scriptbyai.com/runway-ai-timeline/)
- Act-Two (performance transfer) paid plans 2025-07-17; Aleph (in-context video editing) 2025-07-25, all paid plans 2025-07-31 — [scriptbyai](https://www.scriptbyai.com/runway-ai-timeline/)
- Runway Agent (conversational video workspace) 2026-05-13; Aleph 2.0 + Edit Studio 2026-05-21 (edits up to 30 s); Agent 2.0 2026-06-25; Timeline moved into Agent 2026-07-09; Runway Dev (Media Router, Recipes, Workflows, Characters) 2026-07-23; Video Editor Projects retired 2026-07-30, "Timeline Studio replaces Video Editor Projects" — [scriptbyai](https://www.scriptbyai.com/runway-ai-timeline/). Dates are from one secondary tracker; not checked against Runway's changelog.
- Edit Studio is described as "editor-first", preview-before-generate (keyframes previewed before spending credits); source is a news summary of an X post — [Runtime Wire, 2026-05-21](https://runtimewire.com/article/runway-aleph-2-edit-studio-natural-language-video-editing)
- Pricing/credit figures and clip organization not found in fetched sources.

#### Freepik Spaces (freepik.com/spaces; announced 2025-11-04) - wired nodes, no timeline found
- Node canvas; text node -> image generator nodes -> video generator node (Kling 2.3/2.5/O1/3.0, Seedance 1.5 Pro, Veo, Sora, Minimax, Wan, PixVerse, LTX Studio listed across sources); audio nodes can feed video nodes — [Freepik nodes docs (search summary; direct fetch 403)](https://www.freepik.com/ai/docs/nodes-and-connectors), [Chase Jarvis guide](https://chasejarvis.com/blog/freepik-spaces/)
- Downstream propagation: changing an image prompt updates the connected video node (creator claim) — [Chase Jarvis](https://chasejarvis.com/blog/freepik-spaces/)
- Launch press release — [BusinessWire 2025-11-04](https://www.businesswire.com/news/home/20251104023735/en/Freepik-Launches-Freepik-Spaces-to-Power-AI-Visual-Creation-and-Collaboration-in-Real-Time)
- Positioned for bulk/agency production with "Lists" (batch) — [kingy.ai review](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/); one review says it focuses on images — [Hackceleration review](https://hackceleration.com/labs/review/freepik-spaces). No timeline editor or video-sequencing node found.
- A Flora comparison (by competitor Wireflow) claims Freepik is limited to its own hosted models vs Flora 50+ — treat as biased — [Wireflow](https://www.wireflow.ai/blog/freepik-spaces-alternatives)

#### Flora (flora.ai) - wired nodes + new Timeline Editor
- Infinite canvas wiring 50+ (another source: 60+) image/video/text models; TechCrunch covered launch March 2025 — [TechCrunch](https://techcrunch.com/2025/03/02/flora-is-building-an-ai-powered-infinite-canvas-for-creative-professionals)
- Timeline Editor for in-canvas assemble/trim/export launched July 2026 (day not given); FAUNA creative agent March 2026; Techniques (reusable workflows) March 2026 — single aggregator, flagged unverified — [checkthat.ai Flora](https://checkthat.ai/brands/flora)
- Pricing switched from credits to dollar-denominated pooled usage May 2026: Free $0, Starter $18/seat, Pro $50/seat, Max $200/seat (page internally inconsistent on seat limits; unverified) — [checkthat.ai Flora](https://checkthat.ai/brands/flora)
- Video models named: Veo 3.1, Seedance 2.0, Kling — [checkthat.ai Flora](https://checkthat.ai/brands/flora)

#### Figma Weave (ex-Weavy; weave.figma.com) - wired nodes, no video timeline found
- Figma acquired Weavy October 2025, rebranded Figma Weave; node graph records each step; stated focus on image, video, animation, motion, VFX — [Unite.AI](https://www.unite.ai/figma-acquires-tel-aviv-ai-startup-weavy-for-media-generation-platform), [CoAI](https://about.getcoai.com/news/figma-acquires-weavy-rebrands-as-figma-weave-for-node-based-ai-design)
- Pricing figures conflict across sources (Figma page: Starter $24/mo billed annually, 1,500 credits/mo; others $19/$36/$48); free plan 150 credits/mo; Wireflow measured video at ~3.6 credits/sec best case and Veo 3.1 at 120-320 credits — [Figma pricing](https://weave.figma.com/pricing), [Wireflow](https://www.wireflow.ai/blog/figma-weave-pricing). Verify current prices.
- Cons from a review: steep learning curve, model-selection guesswork — [Banani review](https://www.banani.co/blog/figma-weave-review)
- No source describing a video timeline in Weave was found.

#### Higgsfield (higgsfield.ai) - Popcorn storyboard (linear grid) + Canvas (nodes) + Cinema Studio
- Popcorn: sequences of up to 8 frames with consistent identity/lighting; manual mode for per-frame subject/setting/style — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-use-popcorn) (vendor)
- Canvas: node-based workspace chaining image/video/edit/branching steps; live by 2026-05-23 (exact launch date unconfirmed); a third-party page says building the graph is free and you pay per model run — [yespress.io Higgsfield](https://yespress.io/products/higgsfield.md), [NBot digest](https://nbot.ai/curator/qjaaw5t4/highlights/higgsfield-20260313), [claudeskills.info page](https://claudeskills.info/skills/OSideMedia/higgsfield-ai-prompt-skill/higgsfield-canvas/)
- Cinema Studio 4.0 listed as released 2026-08 with native 4K and team collaboration (aggregator) — [yespress.io](https://yespress.io/products/higgsfield.md)
- "Reference Anchor"/Recast carry face, wardrobe, lighting from a storyboard frame into video (vendor claim) — [Higgsfield blog](https://higgsfield.ai/blog/ai-storyboard-higgsfield-popcorn-best-tool)
- Complaints list is on Higgsfield's own SEO blog, not independent — [Higgsfield complaints page](https://geo.higgsfield.ai/blog/higgsfield-ai-common-complaints-fixes)

#### Google Flow (labs.google/flow) - linear clips + Scenebuilder timeline
- Scenebuilder arranges generated clips on a timeline, extend/transition between shots; Frames to Video, Ingredients to Video, Extend; Veo 3.1 audio added 2025-10-15 — [Reelmind explainer (secondary)](https://reelmind.ai/blogs/google-flow-after-the-veo-3-1-update-native-audio-scenebuilder-and-camera-contro)
- One article citing Google help says the Scenebuilder timeline resets when you leave the project (clips stay saved); "strong for sequencing, weak as a full timeline editor" — [Whisk AI Labs guide (secondary)](https://whiskailabs.net/google-flow-ai-filmmaking-tool-veo-guide-2026/) (the search summary attributes this; not fetched, treat as unverified)
- A Feb 2026 "ground-up redesign" merging Flow + Whisk + ImageFX with built-in timeline editor is from a single guide, unconfirmed — [Vidau](https://www.vidau.ai/google-flow-ai-update-2026-complete-guide/)
- Credits: free users 50/day, no rollover; cost depends on model — [Google support](https://support.google.com/flow/answer/16526234)
- Complaints: failed generations, credits consumed on failures, filter strictness (2026 review); spike in 1-3 star Play reviews August 2026 (aggregator) — [saascrmreview](https://saascrmreview.com/google-flow-review/), [unstar.app](https://unstar.app/events/google-flow-android-complaints-august-2026), [Google AI forum](https://discuss.ai.google.dev/t/credit-charges-with-no-editing/178360)

#### Luma (lumalabs.ai) - Boards + Agents (canvas/agent) -> Dream Machine (video)
- Luma Agents launched 2026-03-05 on Uni-1; Boards combine Uni-1 image model with agent workflow for storyboards, character sheets; frames treated as one sequence sharing context; Dream Machine and Agents have separate credit pools — [BusinessWire 2026-03-05](https://www.businesswire.com/news/home/20260305354123/en/), [MindStudio explainer](https://www.mindstudio.ai/blog/what-is-luma-boards-agents-ai-storyboards), [Fast.io review](https://fast.io/resources/luma-ai-review-2026/)
- Ray3 Draft Mode: previews at ~5x speed / ~5x fewer credits (secondary guide, unverified); Ray3.14 reportedly lacks character references vs original Ray3 — [Genra guide](https://genra.ai/blog/luma-ray3-complete-guide-review)

#### Adobe Firefly Boards + Firefly video editor (beta) - board + timeline
- Generate clips on a board with Adobe model or partner model (Veo listed on the help page); first AND last frame image support; "Open in Firefly video editor (beta)"; multi-selected media auto-added to the timeline in selection order — [Adobe Help: Add videos to Boards](https://helpx.adobe.com/firefly/web/create-mood-boards/firefly-boards/add-videos.html)
- Workspace overview: Timeline for organizing clips into structured stories; ideation + lightweight editing — [Adobe Help: Firefly workspace](https://helpx.adobe.com/firefly/web/get-started/access-the-app/firefly-workspace-overview.html)
- Credits complaint thread on Adobe community ("AI credits is a bad joke") — [Adobe Community](https://community.adobe.com/questions-729/ai-credits-is-a-bad-joke-1418697) (about Premiere, not Boards specifically)

#### Kling (kling.ai)
- Kling 3.0 launched 2026-02-04 (per Morphic glossary); Smart Storyboard (AI splits narrative into shots) and Custom Storyboard (per-shot duration and camera); up to six cuts; Canvas Agent storyboard assistant claimed by an aggregator — [Morphic glossary](https://morphic.com/ai-glossary/kling-30), [Veed guide](https://dhl.veed.io/learn/kling-3-0-guide), [creati.ai](https://creati.ai/ai-tools/kling-3-0/). Kling's own canvas UI was not verified; model names (3.0/O1/O3) used inconsistently by sources.
- Kling's own storytelling guide mentions a multi-elements editor — [Kling blog](https://kling.ai/blog/kling-ai-video-storytelling-guide)

#### OpenAI Sora storyboard - linear timeline of cards
- Cards at time points, each with a text prompt plus optional image/video reference; card spacing controls pacing; announced ~2025-10-16 for web Pro — [Sales-Mind](https://sales-mind.ai/blog/openai-sora-video-platform-storyboard-functionality), [TechWiser](https://techwiser.com/how-to-use-the-storyboard-feature-on-sora-what-we-found/)
- Conflicting claim: one guide says OpenAI announced 2026-03-24 that the Sora app shuts down 2026-04-26 and API on 2026-09-24. Uncorroborated; no OpenAI/major-outlet source found. Verify before relying — [Shai Creative guide](https://shaicreative.ai/?p=1731) (the search result summarizer attributed the claim to "a guide dated April 2026"; exact page not confirmed)

#### Martini (martini.art; now redirects to astorie.ai for some pages)
- "Film set" for AI video: Figma-like collaborative web app, 2D/3D environments with virtual camera, timeline editor, XML export to Premiere/Resolve; free plan (public projects), paid from $15/mo, some models need extra credits; article dated 2026-07-17, based on a founder-led demo — [No Film School](https://nofilmschool.com/martini-ai-film-set)
- Vendor pages: storyboard generator with Sora 2 Pro storyboard mode, up to 10 scenes, 10/15/25 s totals, frames left-to-right in cut order (vendor) — [Martini AI storyboard](https://martini.art/en/ai-storyboard-generator), [Martini multi-shot workflow](https://martini.art/en/workflows/multi-shot-short-film)
- Note: martini.art/en/features/multi-shot-ai-video redirects to astorie.ai, suggesting a rebrand or domain change (not investigated).

#### Morphic (morphic.com)
- Free-flowing Canvas; character sheet per character and set reference per place passed into every frame; renders approved shots to video; no timeline mentioned; pricing Free (20 credits), Basic $19, Standard $24, Pro $45, Max $170 per month (annual-equivalent shown) — [Morphic roundup (self-listed)](https://morphic.com/resources/tools/best-ai-storyboard-tools)

#### Kaiber Superstudio
- Described as infinite canvas with node-like layout connecting scenes, styles, audio (Filmora, a competitor); storyboard mode chains scenes; models aggregated, full suite needs Creator/Pro; Product Hunt 4.2 from 11 reviews — [Filmora review](https://filmora.wondershare.com/video-editor-review/kaiber-ai-video-generator.html), [Product Hunt](https://www.producthunt.com/products/kaiber/reviews?page=2), [launch press release](https://www.silicon.co.uk/press-release/kaiber-launches-superstudio-a-new-creative-ai-platform-for-seamless-image-and-video-generation). Dreamina (competitor) says finishing still needs shot order, sound, titles — [Dreamina review](https://dreamina.capcut.com/resource/kaiber-review)

#### Boords, Katalist, Krock.io, StudioBinder (storyboard-first, non-wired)
- Boords: structured shot-numbered board, animatics with timing, client comments/sharing; AI frames lighter than flagship models — [Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools), [Boords AI storyboard list](https://boords.com/blog/the-6-best-ai-storyboard-generators)
- Katalist: script-to-storyboard with defined characters/locations reused across frames; image-to-video listed by a directory; narrower style range; one roundup says output can feel dated — [Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools), [topai.tools](https://topai.tools/s/text-to-video-storyboards)
- Krock.io: sequence board with annotated review and versioning, built for team feedback; AI generation not core — [Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools), [TrustRadius](https://www.trustradius.com/vendors/krock)

#### Autodesk Flow Studio (ex-Wonder Studio), Imagine.Art, Moonvalley Marey
- Flow Studio: cloud 3D toolset converting live-action to editable CG; 2026 messaging adds 3D Editor and Canvas combining third-party image/video models with CG characters and camera; Wonder 3D added March 2026 (sources disagree on launch timing) — [Autodesk Flow Studio](https://www.autodesk.com/campaigns/flow-studio), [CG Channel tag page](https://www.cgchannel.com/tag/autodesk-flow-studio/)
- Imagine.Art: positions as script -> storyboard -> generation -> editing -> export; Seedance 2.0 as main video model and Flux.2 for storyboard frames (self-published) — [Imagine.Art film tools](https://www.imagine.art/blogs/ai-tools-for-film-production)
- Moonvalley Marey: licensed-data model for studios with storyboard UI, camera controls, API (single directory description) — [G2 Moonvalley seller page](https://www.g2.com/sellers/moonvalley)

### Inferences
- The "shot -> storyboard image -> video -> timeline" hierarchy as first-class objects appears in LTX Studio and Martini (shots/scenes then timeline) and in Runway's Agent/Timeline Studio direction; node products (Freepik, Weave, Higgsfield Canvas) treat shots as just groups of nodes, with no native "shot" object found in sources.
- Aggregation of third-party models (Kling, Veo, Seedance, Sora) is now the norm in canvas products (Freepik, Flora, Kaiber, Imagine.Art, Adobe), so model choice per node is table stakes, not a differentiator.
- Several vendors changed pricing or products within the past 6 months (Flora May 2026 dollar pricing; Runway Video Editor retired July 2026; Martini domain redirect), so any comparison table needs re-checking before use.

### Gaps
- Pika, Hedra, Invideo AI, Storyboarder (open-source Wonder Unit tool), Shai Creative, Pollo AI, Imagine.Art UI detail, Moonvalley UI, Kling's own canvas: no usable primary or hands-on sources found. Pika/Hedra appear to be single-clip or talking-head tools rather than shot pipelines (comparison-site descriptions only) — [toolquestor Pika vs Hedra](https://toolquestor.com/vs/pika-vs-hedra).
- No primary vendor pricing pages were successfully fetched except via search summaries; LTX Pro price, Runway credit costs, Higgsfield Canvas credit costs not obtained.
- Boords/Katalist AI-video capabilities in 2026 unclear (roundups say "not stated").

## Q2. Which products combine a node graph with a timeline editor (closest to us)?

### Takeaway
Only Flora (Timeline Editor, July 2026, single-source) and Runway (node Workflows plus Timeline Studio and Agent, as separate surfaces) are documented as having both a node-graph tool and an in-product timeline. Adobe Firefly Boards pairs a free-form board with a timeline editor via "Open in video editor". No source shows a single canvas where a Shot node feeds Storyboard -> Video nodes and then lands on a timeline as one unit, which is your design.

### Cited Findings
- Flora: node canvas plus in-canvas Timeline Editor launched July 2026 — [checkthat.ai Flora](https://checkthat.ai/brands/flora) (single aggregator, unverified)
- Runway: Workflows (nodes, 2025-10-24) and Timeline Studio replacing Video Editor Projects (2026-07-30), timeline also inside Agent (2026-07-09) — [scriptbyai](https://www.scriptbyai.com/runway-ai-timeline/). Whether Workflow outputs push directly to the timeline was not found.
- Adobe: board -> multi-select -> timeline in selection order — [Adobe Help](https://helpx.adobe.com/firefly/web/create-mood-boards/firefly-boards/add-videos.html)
- Freepik Spaces and Figma Weave: nodes confirmed, no timeline found — see Q1 entries
- Google Flow: timeline (Scenebuilder) without node graph — see Q1
- Martini: timeline + XML export, no nodes mentioned — [No Film School](https://nofilmschool.com/martini-ai-film-set)
- LTX Studio: storyboard-then-timeline, not wired — see Q1
- Practitioner advice: pair a node tool for generation with a simpler editor for finishing — [ponpon.ai long-form pipeline](https://ponpon.ai/blog/end-to-end-long-form-ai-video-pipeline) (vendor blog)

### Inferences
- Your "Add to timeline / make this shot's main clip" step is a differentiator versus Freepik/Weave, which stop at the node output; Flora and Runway are the ones to examine hands-on because they are the closest.
- Adobe's "order of selection becomes timeline order" is a cheap precedent; your equivalent is the shot order, which is more deterministic.

### Gaps
- Could not verify Flora timeline UI (no hands-on, no Flora changelog fetched).
- Could not confirm whether Higgsfield Canvas or Weave have a timeline; Higgsfield Cinema Studio may (not confirmed).
- Runway Workflows -> Timeline Studio hand-off unverified.

## Q3. Common UX patterns: versions/takes, start/end frames, reference images, cost display, batch "run the whole shot"

### Takeaway
Patterns that recur: (1) a storyboard frame is used as the video start frame (Frames to Video in Flow, Reference Anchor in Higgsfield, Freepik image-node -> video-node wiring); (2) first AND last frame support (Adobe Boards, Google Flow); (3) reusable character/location "Elements"/sheets as the consistency layer (LTX, Morphic, Katalist, Luma Boards); (4) retake of a segment rather than rerun of everything (LTX); (5) draft/preview before full-cost render (Runway Edit Studio, Luma Ray3 Draft); (6) batch via Lists/Techniques (Freepik, Flora). Cost display practice is inconsistent and a recurring complaint.

### Cited Findings
- Start/end frames: Adobe supports first and last frame fixed points — [Adobe Help](https://helpx.adobe.com/firefly/web/create-mood-boards/firefly-boards/add-videos.html); Flow has Frames to Video — [Reelmind](https://reelmind.ai/blogs/google-flow-after-the-veo-3-1-update-native-audio-scenebuilder-and-camera-contro)
- Storyboard-frame-as-anchor: Higgsfield Reference Anchor (vendor claim) — [Higgsfield blog](https://higgsfield.ai/blog/ai-storyboard-higgsfield-popcorn-best-tool)
- Reference/consistency objects: LTX Elements — [yespress.io](https://yespress.io/products/ltx-studio.md); Morphic character sheets + set references — [Morphic](https://morphic.com/resources/tools/best-ai-storyboard-tools); Luma Boards shared sequence context — [MindStudio](https://www.mindstudio.ai/blog/what-is-luma-boards-agents-ai-storyboards)
- Preview-before-spend: Runway Edit Studio keyframe preview — [Runtime Wire](https://runtimewire.com/article/runway-aleph-2-edit-studio-natural-language-video-editing); Luma Ray3 Draft Mode — [Genra](https://genra.ai/blog/luma-ray3-complete-guide-review)
- Retake of 2-16 s segments in a shot — [Luma review of LTX](https://lumalabs.ai/news/ltx-studio-review)
- Cost variance by model: community report that an economy Kling 3.0 generation costs ~6 credits while Sora 2/Veo 3.1 can cost 40-70, Pro mode min 35 credits for 5 s, native audio pushing 50-200 (Reddit mirror; tool unspecified) — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1t47rf5/snapshots/2026-05-09T01%3A32%3A43.311857Z)
- Cost display examples: Weave publishes credits per image/video-second and model entries show per-model credit ranges — [Wireflow Weave pricing](https://www.wireflow.ai/blog/figma-weave-pricing) (competitor measurement); Higgsfield Canvas: graph free, pay per model run — [claudeskills.info](https://claudeskills.info/skills/OSideMedia/higgsfield-ai-prompt-skill/higgsfield-canvas/)
- Batch: Freepik Lists for bulk production — [kingy.ai](https://kingy.ai/news/freepik-spaces-freepik-lists-review-the-bulk-creative-production-tool-agencies-have-been-waiting-for/); Flora "Batch Techniques" improvements 2026-05-27 — [checkthat.ai Flora](https://checkthat.ai/brands/flora)
- Versions/takes in review tools: Krock.io versioning on one board — [Morphic roundup](https://morphic.com/resources/tools/best-ai-storyboard-tools). Versions UI for generated assets (v1/v2 per node) was not described in any fetched source.
- Multi-shot generation in one call: Kling 3.0 up to six cuts, Sora 2 Pro storyboard up to 10 scenes in Martini — [Morphic glossary](https://morphic.com/ai-glossary/kling-30), [Martini](https://martini.art/en/ai-storyboard-generator)

### Inferences
- Showing estimated credits per node and a total for "run whole shot" before running is not documented as standard anywhere found; given complaints on credit burn, that is a likely differentiator for agency users (inference).
- Since the cheapest vs priciest model differs by roughly 6-10x, a model selector without cost preview likely produces bill shock.

### Gaps
- No source detailing take/version UI in any of the products (v1/v2 patterns); needs hands-on product trials.
- No documented "run whole shot" (image then video chain) one-click pattern except implicit propagation in Freepik and Higgsfield Canvas.

## Q4. User complaints about node canvases and AI video (Reddit/X)

### Takeaway
Direct Reddit/X threads were hard to retrieve (only mirror snapshots). The evidence is: credit burn and unclear cost (Weavy, LTX, Flow, Adobe), character consistency still imperfect, and node graphs adding setup time and abstraction without a sequencing view. These are anecdotal, not survey data.

### Cited Findings
- Weavy node workflows drain credits quickly (Reddit mirror, May 2026) — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1t47rf5/snapshots/2026-05-09T01%3A32%3A43.311857Z)
- LTX: credits consumed re-rendering, no rollover, Retake not working as advertised — [Trustpilot](https://ca.trustpilot.com/review/ltx.studio), [G2](https://www.g2.com/products/ltx-studio)
- Flow: failed generations still consuming credits; credit log opaque — [Google AI forum](https://discuss.ai.google.dev/t/credit-charges-with-no-editing/178360), [saascrmreview](https://saascrmreview.com/google-flow-review/)
- Adobe: "AI credits is a bad joke" — [Adobe Community](https://community.adobe.com/questions-729/ai-credits-is-a-bad-joke-1418697)
- Consistency: Reddit commenter says newer models like Seedance 2.0 have gotten much better at native consistency — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1t47rf5/snapshots/2026-05-09T01%3A32%3A43.311857Z); another says LTX img2video and LoRA both fall short — [Reddit snapshot](https://reddit.sentinel-team.org/posts/1sa2j6t/snapshots/2026-04-03T19%3A17%3A05.459795Z)
- Node-canvas critique: graphs lack a sequencing timeline, feel abstract, add setup time; simple trim/caption/publish users find them overkill (blog opinion, not user data) — [search result summary of opinion pieces](https://ponpon.ai/blog/end-to-end-long-form-ai-video-pipeline)
- Weave learning curve and model-selection guesswork — [Banani](https://www.banani.co/blog/figma-weave-review)
- Pro-node view: a node canvas lets creators revise one part of a narrative without losing context; shareable reproducible workflows — [Medium review of Figma Weave](https://medium.com/@Rythmuxdesigner/turning-prompts-into-five-scalable-workflows-with-figma-weave-e56b9578b3bd)
- Generated clips still need heavy editing in a traditional NLE — same ponpon.ai source above.

### Inferences
- The consistent unmet need is cost predictability plus a timeline-level view; your shot-based structure with a main-clip choice speaks to both, but must show cost per run.
- Node complexity complaints support hiding wires behind a shot-card abstraction for non-technical agency users (inference, not user-tested).

### Gaps
- No primary Reddit or X thread links with upvote counts were obtainable (search returned mirrors); r/aivideo, r/runwayml, X sentiment about Runway Workflows, Flora, Freepik Spaces, Higgsfield Canvas not captured. Recommend a dedicated reddit-x-research pass.
- No Australian-market-specific findings (pricing in AUD, local agencies) were found.
