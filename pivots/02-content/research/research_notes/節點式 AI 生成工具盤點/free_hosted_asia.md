# Free / hosted / desktop / Asian node-based AI image-video workflow tools (excluding Weavy/Weave, Krea Nodes, Flora, Freepik Spaces, Runway Workflows, and open-source repos)

Date accessed: 2026-11-03. All prices are as shown by the cited page on that date unless stated. Third-party blogs (many from affiliate/competitor sites like Wireflow) are marked "3rd-party" and conflict with official pages in places. Note on cautions: official fetches via WebFetch return a model-summarised page, so prices were read through a summariser, not verbatim.

---

## 1. Hosted ComfyUI / node-runner services (ComfyUI-style graph editor, you pay GPU time or credits)

### Takeaway
Official Comfy Cloud is now the reference: free trial only (5 runs), then $20-$100 credit plans, Partner Nodes (Nano Banana, Sora, Veo, Kling-type) draw from the same credit pool. Third-party ComfyUI hosts (RunComfy, ThinkDiffusion, RunDiffusion, ViewComfy) sell GPU hours; ComfyDeploy and ViewComfy are deploy-as-API layers rather than creative canvases. The node UI is always raw ComfyUI (technical, not a product-grade canvas).

### Cited Findings

**Comfy Cloud (official, Comfy Org) - https://comfy.org/pricing**
- Plans: Standard $20/mo ($16/mo annual, 50,400 credits/yr), Creator $35/mo ($28 annual, 88,800 credits/yr, adds import of own LoRA/models from CivitAI/HF), Pro $100/mo ($80 annual, 253,200 credits/yr, 1 hour max runtime), Team $700/mo ($630 annual, up to 50 members, shared credit pool), Enterprise custom. Standard/Creator max workflow runtime 30 min; Standard cannot import own models. — [Comfy pricing](https://comfy.org/pricing)
- Free: page says "5 free runs on real GPUs and free Comfy Agent credits for new users"; no credit number stated. A "Free plan with 2 agent tasks per person" appears only in the Agent FAQ. — [Comfy pricing](https://comfy.org/pricing)
- CONFLICT: many 3rd-party sites (Wireflow Sep 2026, Scopeful, Patreon) say a free tier of "400 monthly credits" and Standard = 4,200 credits/mo; the official page could not confirm 400 credits. Treat the 400 figure as unverified/possibly older. — [Wireflow, 2026-09-12](https://www.wireflow.ai/blog/best-comfyui-cloud-pricing-tools-in-2026); contradicted (not confirmed) by [Comfy pricing](https://comfy.org/pricing)
- Official blog dated 2026-03-04 says a free tier was "introduced earlier this week", billing is "only for active GPU time while a workflow is actually running"; building graphs and editing parameters are free; roadmap: workflow API deployment, parallel execution, team plans, custom nodes. — [Comfy blog](https://blog.comfy.org/p/comfy-cloud-is-out-of-beta-and-its)
- ~11 credits per 5s video (Comfy FAQ estimate). Partner Node (API node) costs, e.g. Nano Banana Pro, come from the same credit pool on all paid plans and also work with Comfy Desktop. — [Comfy pricing](https://comfy.org/pricing)
- Cloud API GPU rates: RTX PRO 6000 96GB $3.49/hr, H100 $6.23/hr, H200 $7.71/hr, B200 $11.23/hr; billed per second. API concurrency numbers inconsistent on the page (1/3/5 concurrent workflows for Standard/Creator/Pro in FAQ vs builds/deployments/workers table). — [Comfy pricing](https://comfy.org/pricing)
- Cloud does not let users install arbitrary custom nodes via Manager (3rd-party claim). — [Wireflow RunComfy alternatives](https://www.wireflow.ai/blog/best-runcomfy-alternatives-in-2026)
- Node UI: standard ComfyUI graph. Video: yes (Wan etc. on GPU + partner video nodes). Target: ComfyUI power users, studios, API builders.

**Comfy Desktop app (official) - https://comfy.org/download**
- Free for Windows and macOS; "full open source engine, free forever, running on your own hardware"; Partner models (Nano Banana, Grok) are optional paid API nodes that can be switched off for offline use. Credit amounts for desktop partner nodes not found (Comfy pricing page says Partner Node credits also work with Comfy Desktop). — [Comfy download](https://comfy.org/download.md); [Comfy pricing](https://comfy.org/pricing)
- Not "hosted"; needs local GPU for open models. Useful as a hybrid reference (local graph + paid hosted-model nodes).

**RunComfy - https://www.runcomfy.com/pricing**
- Pay-as-you-go (no sub) or Pro $19.99/mo billed yearly (page also shows $29.99 beside it, probably monthly). Pro: 20% off GPU, 20 free CPU hours/mo, $10 monthly credit, 200 GB storage. No free-trial credit amount on the page ("Get Started Free" button only). — [RunComfy pricing](https://www.runcomfy.com/pricing)
- GPU per hour (PAYG/Pro): T4/A4000 $0.99/$0.79; A10G $1.75/$1.39; A6000 $2.50/$1.99; A100 $4.99/$3.99; H100 $7.49/$5.99; H200 $9.59/$7.66. Billed per second. — [RunComfy pricing](https://www.runcomfy.com/pricing)
- Also sells a Model API: Wan 2.5 $0.045/s, Kling 2.5 Turbo $0.07/s, Sora 2 $0.10/s, Seedance 1.0 $0.03/s; Seedream 4.0 $0.03/img, Flux Kontext Pro $0.04/img, Nanobanana $0.04/img. Funds expire after 365 days. — [RunComfy pricing](https://www.runcomfy.com/pricing)
- Strength: lots of ready workflows/tutorial content, full custom-node support. Weakness: it's ComfyUI in a VM; paid per GPU hour.

**ThinkDiffusion - https://www.thinkdiffusion.com/pricing**
- Hobby: no sub, hourly machines; "15 minutes free with every sign-up". TD-Pro $19.99/mo yearly or $29.99/mo monthly (includes $10 monthly credit that rolls over, 200 GB, 20% off); TD-Teams $59.99/mo; machines QUICK 16GB $0.99/hr, TURBO 24GB $1.75/hr, ULTRA 48GB $2.50/hr (20% off for subs). UIs: ComfyUI, Automatic1111, Fooocus, Kohya. — [ThinkDiffusion pricing](https://www.thinkdiffusion.com/pricing)
- (Conflict: Wireflow quotes $0.59-$1.99/hr; the official page quotes $0.99-$2.50.) — [Wireflow](https://www.wireflow.ai/blog/best-comfyui-cloud-pricing-tools-in-2026)

**RunDiffusion ("Runnit") - https://www.rundiffusion.com/pricing**
- Free $0/mo with "up to 100 free daily tokens"; Runnit Hobby $8.79/mo (10,000 tokens), Runnit Pro $23.99/mo (30,000-240,000 tokens), Creators Club + Pro $41.79/mo, Team $179.99/mo (4 people); yearly rates. ComfyUI and Auto1111 included in every plan; premium video tools excluded on Free, included Hobby+. "Runnit Scenes" turns visuals into video sequences. — [RunDiffusion pricing](https://www.rundiffusion.com/pricing)
- 3rd-party older claim: 30 min/mo free, from $0.50/hr. — [Wireflow](https://www.wireflow.ai/blog/best-comfyui-cloud-pricing-tools-in-2026) (appears out of date vs the official page)

**ViewComfy - https://www.viewcomfy.com/pricing**
- Developer $0 + compute (1 app, 2 ComfyUI environments, 1 GPU concurrency, no API nodes); Team $30/mo ($24 yearly) + compute, $10 credit/mo; Studio $200/mo ($160 yearly) + compute, $30 credit; Enterprise custom. Compute: T4 $0.65/hr, L4 $1.16, A10G $2.20, L40S $3.51, A100 $4.10-$6.15, H100 $8.42, H200 $9.65, B200 $13.32; billed per active GPU second. Extra Developer seat $30/mo, Playground (run-only) seat $10/mo. — [ViewComfy pricing](https://www.viewcomfy.com/pricing)
- Product idea: wrap a ComfyUI workflow in a simple form UI / app for non-technical users + API. — [Wireflow RunComfy alternatives](https://www.wireflow.ai/blog/best-runcomfy-alternatives-in-2026) (3rd-party)

**ComfyDeploy** - Deployment layer (versioned workflow -> API, pin custom nodes by hash, self-host option); free plan exists but no price on 3rd-party source; official pricing URL (comfydeploy.com/pricing) returned 404 on 2026-11-03, so the service status/pricing is UNVERIFIED. — [Wireflow](https://www.wireflow.ai/blog/best-comfyui-cloud-pricing-tools-in-2026); [Wireflow RunComfy alternatives](https://www.wireflow.ai/blog/best-runcomfy-alternatives-in-2026)

**MimicPC** - browser cloud desktop with open-source AI apps preinstalled; you still assemble/maintain the stack. No pricing found. — [Wireflow MimicPC alternatives](https://www.wireflow.ai/blog/best-mimicpc-alternatives-in-2026) (3rd-party)

**Comfy.ICU** - not researched/found in results; status UNVERIFIED (may be shut down or rebranded; no source found).

**Shakker AI** - official wiki describes running ComfyUI workflows online in the browser with a workflow gallery and no local install; no pricing found. — [Shakker wiki](https://wiki.shakker.ai/en/comfyui)
**SeaArt AI** - 3rd-party blog: users can edit and run ComfyUI workflows online; free members can run shared workflows with one click. — [search result, topai.tools/ blog](https://topai.tools/compare/seaart-ai-vs-tensor-art)
**Tensor.art** - aggregator listings: ComfyUI integration, free daily credits, free tier personal use only. No official credit numbers found. — [topai.tools](https://topai.tools/t/tensor-art)
**OpenArt** - 3rd-party (affiliate-style) says you can import ComfyUI workflow JSON and run on OpenArt GPUs; free plan with 50 daily credits (unverified). — [1-1uh.pages.dev OpenArt](https://1-1uh.pages.dev/blog/openart/)

**Civitai** - announced 2026-07-06 "Comfy on Civitai: Full ComfyUI in Your Browser, No GPU Required" (headline only; article page returned HTTP 403 so details/Buzz cost not verified). On-site generator uses "Buzz" credits and has video engines (Veo 3, Sora 2, Vidu, WAN, Kling per 3rd-party); membership/Buzz prices conflict across sources; three-colour Buzz system since Oct 2025 due to payment processor restrictions. — [aisotools Civitai review 2026](https://aisotools.com/blog/civitai-review-2026); search snippet to [civitai.com/articles/32308](https://civitai.com/articles/32308)

### Inferences
- No hosted ComfyUI service is a product-quality "creative canvas": none has per-node versions, per-run cost display on nodes, or timeline export. They are infrastructure/hosting layers; a custom React Flow canvas that calls hosted model APIs is a different (lighter, more productised) design.
- Pricing converges on ~$1-$2.5/hr for 16-48 GB GPUs and ~$20-30/mo subscriptions with ~20% discount; for hosted-model APIs (fal, RunComfy Model API) the marginal cost model is per-second-of-video / per-image, which is what a per-run cost display needs.
- Comfy Cloud's credit-pool-for-Partner-Nodes model (one balance for GPU + API nodes) is the closest precedent to "per-run cost" in the ComfyUI world.

### Gaps
- Comfy Cloud free tier size (5 runs vs 400 credits) unresolved; official page does not state a credit number.
- ComfyDeploy, MimicPC, Comfy.ICU, Shakker, SeaArt, Tensor.art, OpenArt: no official pricing pages fetched; figures are 3rd-party or absent. Comfy.ICU status unknown.
- Civitai "Comfy on Civitai" details/pricing not verified (403).

---

## 2. Model-platform canvases / workflow builders (fal, Replicate, Civitai, Hugging Face)

### Takeaway
fal is the only model platform with a first-party visual workflow builder, but its public pricing page says nothing about it and 3rd-party reviews call it cluttered/technical. Replicate has no node editor at all. fal's per-output pricing table is the best source for a per-run cost model. Hugging Face Spaces nodes: not researched.

### Cited Findings
- fal pricing: no free-credit mention on the page; model APIs "priced per output, per model, drawn from prepaid credits"; units vary (per second, per image, per megapixel); no charge for server errors or queue wait; serverless GPU billed per second. No subscription tiers on the page; no mention of workflows. — [fal pricing](https://fal.ai/pricing)
- fal example prices: PixVerse V6 I2V $0.005/s, H3 Max Turbo I2V $0.025/s, Grok Imagine Video $0.05/s, Kling v2.5 Turbo Pro I2V $0.07/s, Kling v3 I2V Pro $0.14/s, FLUX 3 Max I2V $0.085/s; FLUX.1 schnell $0.003/MP, FLUX 2 $0.012/MP, Seedream V4.5 $0.04/img, Nano Banana 2 $0.08/img, Nano Banana Pro $0.15/img. — [fal pricing](https://fal.ai/pricing)
- fal Workflows: docs describe a workflow as a JSON definition with input node, fal-model node(s) and output node, run through a workflows/execute endpoint. — [fal custom workflow UI example](https://fal.ai/examples/integrations/custom-workflow-ui)
- Krea's roundup (published 2025-10-30, meta modified 2026-09-03) describes Fal Workflows as a visual builder with colored connection lines and hundreds of models, says running example workflows can be expensive; a competitor (Krea) author, so slanted. — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)
- 3rd-party (competitor Wireflow) says fal's editor has no image previews in nodes and is technical. Unverified. — [Wireflow vs fal](https://www.wireflow.ai/features/fal-ai-canvas-alternative)
- Replicate pricing page: usage-based, per-second hardware billing (cpu-small $0.000025/s to 8x H100 $0.0122/s); example flux-1.1-pro $0.04/img, flux-dev $0.025/img, wan-2.1-i2v-480p $0.09/s, 720p $0.25/s. No free tier or node/workflow editor mentioned on the page. — [Replicate pricing](https://replicate.com/pricing)
- Civitai: see section 1.
- Figma Weave uses fal.ai integration for hundreds of models (per Krea blog), i.e. fal is a likely backend vendor for a custom canvas. — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)

### Inferences
- fal and Replicate are best seen as supplier APIs for the BuildClub canvas rather than competitors; fal's per-second / per-image unit prices can feed a per-run cost estimate directly.

### Gaps
- fal workflow editor UI, free credits, and whether it is still actively maintained: not confirmed from fal's own docs (search found only the JSON/API example page).
- Hugging Face Spaces "node" apps: not researched (out of tool budget). Replicate free credits and any ownership change: not confirmed.

---

## 3. Free / mobile / desktop apps with node UIs

### Takeaway
Few consumer desktop/mobile apps have real node UIs. Draw Things (Apple devices) is free with an infinite canvas and video but no confirmed node editor; Pinokio is a launcher for local ComfyUI; NodeTool is the only open-source desktop node editor with BYO-key hosted models (overlaps the open-source researcher).

### Cited Findings
- Draw Things: free for iPhone/iPad/Mac, runs offline; Free Edition (local generation, infinite canvas, local LoRA training), Community (free with account, cloud compute / Lab Hours), Draw Things+ $8.99/mo (higher cloud limits, own LoRAs in cloud). Video: image-to-video supported. Official page does not mention scripting or nodes. — [drawthings.ai](https://drawthings.ai)
- Draw Things video via LTX-2/LTX-2.3 per 3rd-party; no node editor found. A ComfyUI-DrawThingsWrapper node pack drives Draw Things from ComfyUI (image only). — [stork.ai](https://www.stork.ai/en/draw-things); [comfyai.run](https://comfyai.run/custom_node/ComfyUI-DrawThingsWrapper)
- Pinokio: free open-source desktop launcher/"browser" that installs ComfyUI, A1111, Fooocus, InvokeAI with one click; one directory (Stork.ai) mislabels it paid. Needs local GPU. — [hackingpc.pages.dev guide](https://hackingpc.pages.dev/ai-tools/pinokio-ai-app-installer-guide); [thegtmdirectory](https://thegtmdirectory.com/tools/pinokio)
- NodeTool: open-source (AGPL-3.0 per current README; older PyPI said GPL3), Electron desktop app + web + React Native mobile; drag-drop canvas for text/image/audio/video; BYO keys (OpenAI, Anthropic, Gemini, Replicate) or local models; deploy to RunPod/Cloud Run/Docker; ~264 stars (SourcePulse) so small. — [GitHub nodetool-ai/nodetool](https://github.com/nodetool-ai/nodetool); [SourcePulse](https://www.sourcepulse.org/projects/1842061)
- Comfy Desktop: see section 1.
- Playbook3d (browser ComfyUI wrapper) and Invoke (node-based, Form Builder) are listed as node tools. — [Krea blog](https://www.krea.ai/blog/top-node-based-ai-workflow-apps)
- iOS/Android node-based apps: none found in searches (one App Store ID 6751235922 surfaced without detail, not opened).

### Inferences
- There is no strong free mobile/desktop node competitor with versions + cost + timeline; NodeTool is nearest and small.

### Gaps
- Draw Things "scripts"/workflow features: not confirmed from sources (my background knowledge says it supports custom JavaScript scripts, but I found no source; do not rely on it).
- No dedicated iOS/Android node-canvas apps identified.

---

## 4. Chinese / Asian market node canvases

### Takeaway
Asian players are shipping canvases fast, mostly bundled with their own models: Dreamina AI Canvas (ByteDance), Kling "灵动画布" (Kuaishou, closed beta as of 2025-07), RunningHub (ComfyUI-based, large workflow/app marketplace plus APIs), LiblibAI (ComfyUI cloud). Lovart is a design-agent product with a canvas (Singapore/Chinese-founded, global).

### Cited Findings
**Dreamina AI Canvas (ByteDance/CapCut) - https://dreamina.capcut.com/ai-video/ai-canvas**
- Infinite node-based workspace; nodes for text, images, video, audio, files, subjects. Image models listed: Seedream 5.0 Pro/Lite, Nano Banana Pro/Nano Banana, Seedream 4.5, GPT Image 2; video: Seedance 2.5, 2.0, 2.0 Mini, Sora 2, Veo 3.1; audio: Seedaudio 2.0. Generated assets can be assembled on a timeline. — [Dreamina AI Canvas](https://dreamina.capcut.com/ai-video/ai-canvas)
- Pricing: "free daily credits" (amount not stated); Basic plan shown in AUD: A$0.44 first month then A$22.90/mo with 2,215 credits/mo; a "$0.29/month 98% off" banner is inconsistent with that. — [Dreamina AI Canvas](https://dreamina.capcut.com/ai-video/ai-canvas)
- Review page notes limits: asset search only within the active canvas; multiple timelines can't be merged/linked. — [Dreamina canvas review](https://dreamina.capcut.com/ai-video/ai-canvas-review)
- Jimeng (即梦, China site jimeng.jianying.com) has "Smart Canvas" (智能画布) per a 3rd-party directory; no Chinese official doc fetched. — [aiproducthub.cn](https://aiproducthub.cn/sites/jimeng-ai-bytedance-ai-image-video-generator.html)

**Kling 灵动画布 (Kuaishou)**
- Reported 2025-07-30 (PingWest): node-style infinite canvas linking image, video, audio steps; left asset library, right creation history; revised prompts create new branches (not overwritten); global prompt input; auto-created nodes for image-to-image/video; link-sharing collaboration with cursors; each step shows cost breakdown; was in closed beta (内测) then; no prices or video model names in the article. — [PingWest](https://www.pingwest.com/a/306521); [Tencent Cloud news](https://cloud.tencent.com/developer/news/2813329)
- Current (Nov 2026) status/pricing not verified; I did not find an official Kling canvas page. Kling models appear as nodes in third-party canvases (Higgsfield, Figma Weave, SJinn, Wireflow). — [Higgsfield Canvas help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)

**RunningHub (runninghub.ai / runninghub.cn)**
- Positions as "AI Agent-Powered Content Creation Platform with ComfyUI & Model API": AI Apps (one-click workflows), ComfyUI workflows, Workflow API, Model API, LLM API, "Infinite Canvas", rhTV; invite gives 500 RH Coins each; "New User Trial / Free Daily Play"; per-second model prices from $0.008/s (Nano Banana 2.1), Vidu Q4 from $0.023/s, Seedance 2.5 from $0.036/s (subsidised). Free-credit amount and plan prices not stated on the home page. — [RunningHub](https://www.runninghub.ai)
- Invite page inconsistent (new user "500 RH coins" vs "both get 0"); a forum post claims 1,000 RH points on international sign-up; forum comment says RH coins pay for open-source ComfyUI workflows while closed models (Seedance, GPT image) bill by balance (user claim, unverified). Product Hunt launch 2024-10-12. — [RunningHub invite](https://www.runninghub.ai/invite); [NodeSeek post](https://www.nodeseek.com/post-831276-1); [Product Hunt](https://www.producthunt.com/products/runninghub/launches)

**LiblibAI (哩布哩布 / liblib.art, Beijing)**
- 3rd-party (Flowith, 2026): free plan 10 daily credits, 1 LoRA training/week, no ComfyUI Cloud; paid from ¥29/mo with 300 bonus credits and limited ComfyUI Cloud; Alipay/WeChat/UnionPay only, no international cards. Dealroom: daily free credits, member-only models, commercial rights. Official pricing not fetched. — [Flowith](https://flowith.io/blog/liblib-art-pricing-2026-free-credits-vs-paid-plans); [Dealroom](https://dealroom.co/companies/liblib/); [toolmage](https://www.toolmage.com/en/tool/liblibai/)

**Lovart (lovart.ai)**
- Design agent + canvas. Pricing page: monthly/annual, Team plan, "Get started for free"; credits reset monthly, no rollover; top-ups valid 366 days; "Unlimited Relax" queued generation on some plans; accounts limited to 2 desktop sessions. No prices fetched from the official page. 3rd-party: Starter ~$19-29 (1,500-2,000 credits), Free either 500 one-time credits or ~100/day (sources conflict); 5s 1080p video ~150 credits. — [Lovart pricing](https://lovart.ai/pricing); [Wireflow Lovart](https://www.wireflow.ai/blog/lovart-ai-pricing); [Zilliz FAQ](https://zilliz.com/ai-faq/is-lovart-ai-free-to-use)

**Vidu, Hailuo/MiniMax, Tencent**
- MiniMax: Product Hunt lists "MiniMax Hub" as a desktop workstation with agent, visual canvas, workflow view and Skills; promotional, date unclear; MiniMax Design is described by an unofficial guide as a local-first workspace with shared canvas. Hailuo 03 (MiniMax H3) is offered as a node in 3rd-party canvases (Wireflow, launched Jul 2026 per Wireflow). — [Product Hunt (hunted.space)](https://webmail.hunted.space/product/minimax); [Wireflow H3](https://www.wireflow.ai/features/minimax-h3)
- Vidu: no first-party canvas found; Vidu Q4 is sold via RunningHub API. Tencent ByteDance-scope (Hunyuan etc.): nothing found. — [RunningHub](https://www.runninghub.ai)

### Inferences
- Both Dreamina Canvas and Kling 灵动画布 validate the exact pattern in BuildClub's plan (prompt -> image -> video nodes, branch-as-version, per-step cost shown, asset library, timeline). Dreamina is the only one confirmed to have an explicit timeline step.
- RunningHub's per-second prices (Seedance 2.5 from $0.036/s) are an Asian price floor for video APIs.

### Gaps
- Official Chinese-language pages for Jimeng Smart Canvas, Kling canvas (current state), Vidu, MiniMax Hub: not fetched.
- LiblibAI/RunningHub/Lovart exact plan prices from official pages.
- Whether Kling canvas left closed beta and what it costs.

---

## 5. General automation tools (n8n, Make, Zapier) - brief

### Takeaway
They can chain fal/Replicate calls but are not canvases for creatives (no media preview, versions, or cost-per-run view); metering differs, and n8n is cheapest for long chains.

### Cited Findings
- Zapier free: 100 tasks/mo, single-step Zaps; Professional $19.99/mo annual or $29.99 monthly (750 tasks). Make free ~1,000 credits/mo; a $9/mo plan (5,000 credits annual) per one source. n8n self-hosted Community free; Cloud Starter about EUR 24 / $20 for 2,500 executions (figures vary). Zapier/Make bill per task/operation; n8n per execution. — [Cut the SaaS](https://cut-the-saas.com/guides/make-vs-zapier-vs-n8n); [lowcode.agency n8n](https://www.lowcode.agency/blog/n8n-pricing) (3rd-party blogs, figures inconsistent)
- n8n has a community fal node (n8n-nodes-fal) and an official integration page for fal. — [n8n fal integration](https://n8n.io/integrations/falai); [pkgstats](https://www.pkgstats.com/pkg:n8n-nodes-fal)

### Inferences
- Useful only as backend orchestration (e.g. scheduled generation), not as the user-facing canvas.

### Gaps
- Official pricing pages for the three tools not fetched; no AI-media-specific costs.

---

## Additional node canvases discovered (not in the other researchers' named scope)

### Takeaway
Several newer web node canvases exist that may overlap with the other researcher's scope but were found along the way; all bundle hosted models with credits.

### Cited Findings
- Wireflow (wireflow.ai): Free $0 (up to 60 starter credits, no video models, API 10/min), Starter $36/mo (2,660 credits), Professional $59/mo (4,370), Team $299/mo (22,140 shared); 48 models incl. Seedance 2.5, Kling 4.0, Veo 3.1, Hailuo 03, Wan 3.0; ~30 credits/image, ~17 credits/s video; unused credits carry over; API and MCP on all plans; video editor 0 credits. The official fetch did not describe a node canvas, though its blog pages describe one (Wireflow also runs comparison blogs that rank itself first - biased). — [Wireflow pricing](https://www.wireflow.ai/pricing)
- Higgsfield Canvas: node-based infinite board; node types: text prompt, generation, reference (image/audio), audio; every Higgsfield model as a node (Seedance, Kling); video chains; parallel runs to compare outputs; save workflow as template; real-time collaboration; autosave; building nodes is free, credits only on generation; Unlimited plan does not apply in Canvas; FigJam plugin with Canvas Nodes. Versions and timeline export not described. — [Higgsfield help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas)
- ImagineArt Workflows: image/video/audio/AI-copilot text nodes, per-node model selector (100+ models incl. Seedance 2.5, Kling 3.0 4K, Veo 3.1, Hailuo 2.3 Pro, Midjourney v7, Nano Banana Pro); per-model credit cost shown on the node; amounts not in the doc. — [ImagineArt docs](https://docs.imagine.art/workflows/ai-models.md)
- Other names surfaced (not verified): SJinn Canvas Mode (Kling 3), AI-Flow, Fuser, Flowith, TinyCommand. — [SJinn docs](https://mcp.sjinn.ai/docs/Canvas-Guide); [AI-Flow docs](https://docs.ai-flow.net/docs/intro/)

### Inferences
- "Model selector inside each node + credit cost shown on node" (ImagineArt) and "build free, pay on generate" (Higgsfield, Comfy Cloud) are common conventions worth copying.

### Gaps
- Free-tier credit counts for Higgsfield and ImagineArt not found.
- Shut-down check: no evidence found of a shut-down service in this scope; Comfy.ICU and ComfyDeploy status unverified.

---

## Quick comparison table (all items verified at least from one page; "?" = not found)

| Service | URL | Free | Paid | Node UI | Video | Target |
|---|---|---|---|---|---|---|
| Comfy Cloud | comfy.org/pricing | 5 free runs (400 credits = unverified) | $20 / $35 / $100 / $700 mo | ComfyUI graph | Yes (Wan, partner nodes) | Power users, teams, API |
| Comfy Desktop | comfy.org/download | Free app (local GPU) | Partner nodes paid | ComfyUI graph | Local models + partner | Local users |
| RunComfy | runcomfy.com/pricing | no stated credit (20 CPU h on Pro) | PAYG from $0.99/hr; Pro $19.99-29.99 | ComfyUI | Yes + Model API | ComfyUI users |
| ThinkDiffusion | thinkdiffusion.com | 15 min on sign-up | $0.99-$2.50/hr; Pro $19.99-29.99 | ComfyUI/A1111 | Via workflows | Hobby/pro |
| RunDiffusion | rundiffusion.com | 100 daily tokens | $8.79-$179.99 mo | ComfyUI/A1111 | Hobby+ | Creators |
| ViewComfy | viewcomfy.com | $0 plan + compute | $30 / $200 mo + compute | ComfyUI + form apps | Via workflows | Agencies/devs |
| ComfyDeploy | comfydeploy.com | ? (pricing 404) | ? | ComfyUI deploy | ? | Developers |
| fal | fal.ai/pricing | none stated | per-output prepaid | Visual workflows (API JSON) | Yes | Developers |
| Replicate | replicate.com/pricing | none stated | per-second/per-output | None | Yes | Developers |
| Draw Things | drawthings.ai | Free app | $8.99/mo (cloud) | Canvas, no nodes found | I2V | Apple users |
| Pinokio | pinokio | Free | - | Launcher | via ComfyUI | Local |
| NodeTool | github.com/nodetool-ai/nodetool | Free OSS | BYO keys | Node canvas | Yes | Tinkerers |
| Dreamina AI Canvas | dreamina.capcut.com | Daily credits (n/s) | A$22.90/mo (2,215 cr) | Node canvas + timeline | Seedance/Sora/Veo | Creators |
| Kling 灵动画布 | klingai.com | ? (beta 2025) | ? | Node canvas, branches | Kling | Creators |
| RunningHub | runninghub.ai | trial/daily play, 500 RH coins invite | per-second API | ComfyUI + apps | Yes | CN/global creators |
| LiblibAI | liblib.art | 10 daily credits (3rd-party) | ¥29/mo | ComfyUI cloud | ? | CN creators |
| Lovart | lovart.ai | conflicting | ~$19-199 | Agent + canvas | Yes | Designers |
| Wireflow | wireflow.ai/pricing | 60 starter credits | $36-$299 mo | Workflows/canvas | Paid | General |
| Higgsfield Canvas | higgsfield.ai | ? | credits | Node board | Yes | Video creators |
| ImagineArt Workflows | imagine.art | ? | credits | Node canvas | Yes | Creators |
