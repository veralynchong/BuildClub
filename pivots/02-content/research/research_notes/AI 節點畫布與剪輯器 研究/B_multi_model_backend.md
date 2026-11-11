# Multi-model AI image/video backend: direct APIs vs aggregators (as of 2026-11-02)

Date accessed for ALL sources and prices below: 2026-11-02, unless noted. Currency USD. Many numbers come from third-party trackers/aggregator blogs (marked "3rd-party") and the fetch tool summarised pages with a small model, so exact figures should be re-checked on the vendor page before they go into a budget. Roughly 22 tool calls were used; coverage is uneven (see Gaps).

## 1. Aggregators / inference platforms: catalog, pricing, rate limits, queue/webhook API

### Takeaway
fal.ai, Replicate, WaveSpeedAI and OpenRouter (which now has an async video endpoint) all expose image + video models behind one key with async queues. Per-second video prices on aggregators are in the same range as, or only slightly above, direct vendor rates; the main differentiators are catalog breadth/speed (fal), catalog size (Replicate), price floor (WaveSpeed), and OpenAI-compatible routing (OpenRouter). Output files on aggregators are short-lived, so you must copy them to your own storage.

### Cited Findings

**fal.ai (pricing page, accessed 2026-11-02)**
- Video, per second: Kling v3 and O3 (Pro and Standard) $0.14/s; Kling v2.6 Pro $0.07/s; Kling v2.5 Turbo Pro I2V $0.07/s; MiniMax H3 Max $0.05/s; MiniMax H3 Max Turbo $0.025/s; Grok Imagine Video $0.05/s; PixVerse V6 $0.005/s; FLUX 3 Max video $0.085/s — [fal.ai Pricing](https://fal.ai/pricing)
- Seedance is billed per token on fal, not per second: Seedance 2.0 Fast $0.0112 per 1,000 tokens (= $11.2/M); Seedance 2.0 Mini $0.007 per 1k; Seedance V1.5 Pro $1.20/M tokens; V1 Pro Fast $1.00/M — [fal.ai Pricing](https://fal.ai/pricing)
- The fetched pricing page did not list Veo, Hailuo, Wan, LTX or Sora (may exist on per-model pages; the page points to `https://fal.ai/models/<endpoint-id>/llms.txt` for per-model pricing) — [fal.ai Pricing](https://fal.ai/pricing)
- Images: Nano Banana (2.5) $0.0398/img; Nano Banana 2 $0.08/img; Nano Banana Pro $0.15/img; Seedream V4.5 $0.04/img; Seedream 5.0 Pro $0.0675 per unit; FLUX.1 dev $0.025/MP; FLUX.1 schnell $0.003/MP; FLUX 2 $0.012/MP; FLUX 2 Flash $0.005/MP; FLUX 3 Image edit $0.048/MP; GPT Image 2 listed as "$1 per unit" (unit undefined on the page, treat as unclear) — [fal.ai Pricing](https://fal.ai/pricing)
- Rate limits are not published on the pricing page; fal directs to sales/support — [fal.ai Pricing](https://fal.ai/pricing)
- Queue/webhook: submit returns `request_id`; pass `webhook_url` to get a POST on completion; payload has `request_id`, `gateway_request_id`, `status` (OK/ERROR), `payload`. Endpoint must return 2xx; first attempt timeout 15 s, retries 120 s; up to 31 retries with backoff; the same request_id may be delivered more than once (make handler idempotent). Retries stop when stored result expires: about 1 hour after completion, about 6 minutes for results of 10 KB or more (per the doc text). Signatures use ED25519 with a public JWKS at `rest.fal.ai/.well-known/jwks.json`, headers `X-Fal-Webhook-*`, 300 s timestamp tolerance; IP allowlist via `api.fal.ai/v1/meta` — [fal Docs: Webhooks](https://fal.ai/docs/model-apis/model-endpoints/webhooks)
- Figma Weave (ex-Weavy) integration: users paste a fal Model Gallery URL into an "Import Model" node to run "any" fal model on the Weave canvas; fal describes its library as "hundreds" of models. Post dated August 2025 by fal, names no specific model — [Powering Creative Workflows with Figma Weave and fal (fal blog)](https://fal.ai/blog/powering-creative-workflows-with-weavy-x-fal)

**Replicate (pricing page, accessed 2026-11-02)**
- Images per output: flux-1.1-pro $0.04; flux-dev $0.025; flux-schnell ~$0.003; ideogram-v3-quality $0.09; recraft-v3 $0.04 — [Replicate Pricing](https://replicate.com/pricing)
- Video: wan-2.1 I2V 480p $0.09/s, 720p $0.25/s (the page's own listing; these are older Wan 2.1 and look pricey vs fal's current models). Most public models billed by run time on hardware, so per-second price varies; private models billed for setup/idle/active — [Replicate Pricing](https://replicate.com/pricing)
- Rate limit: 600 prediction-creates/min, 3,000/min for other endpoints, bursts allowed; 429 with ~30 s reset; accounts with low credit and no payment method are throttled to 1 req/s and 6/min; auto-reload recommended to stay above $20 balance — [Replicate Rate limits](https://replicate.com/docs/topics/predictions/rate-limits)
- Input and output files of API-created predictions are auto-deleted after one hour; webhooks fire on create/update/finish so you can save files — [Replicate Webhooks](https://replicate.com/docs/topics/webhooks)

**WaveSpeedAI (pricing page, accessed 2026-11-02)**
- Starting prices (lowest res/quality): Z-Image Turbo $0.005/img; GPT Image 2 $0.01/img; Seedream 5.0 Flash $0.027/img; Nano Banana Pro $0.14/img; video MiniMax H3 $0.04/s; Wan 3.0 $0.05/s; Kling 3.0 Std $0.084/s; Seedance 2.5 $0.18/s. Pay-as-you-go, $1 free credit, tiers Bronze/Silver/Gold/Ultra by top-up size; enterprise has SLA and higher limits. Rate limits and commercial-use terms are not on the page — [WaveSpeedAI Pricing](https://wavespeed.ai/pricing)
- Note: WaveSpeed's own blog comparisons are vendor marketing (claims of 10-20% faster than fal on Wan 2.1 come from a third-party review, unverified) — [search result summary: WaveSpeed review](https://oversite.pages.dev/tools/wavespeed-review)

**OpenRouter (docs, accessed 2026-11-02)**
- OpenRouter now has an async video generation API: `POST /api/v1/videos` (202 + job id), `GET /api/v1/videos/{jobId}` (status pending/in_progress/completed/failed), `GET .../content?index=0`, `GET /api/v1/videos/models`. Example models `google/veo-3.1`, `alibaba/wan-2.7`, `minimax/hailuo-3`. Params: duration, resolution, aspect_ratio, `frame_images` (I2V first/last frame), `input_references`, `generate_audio`, `seed`, `callback_url`. Webhooks with HMAC-SHA256 `X-OpenRouter-Signature`; events completed/failed/cancelled/expired. Pricing is per SKU, e.g. `google/veo-3.1` $0.50 per video second, $0.75 at 1080p; response reports `usage.cost`. Suggested polling ~30 s. Video is not eligible for Zero Data Retention — [OpenRouter Video Generation docs](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)
- Image output is supported on OpenRouter for models with image output (GPT Image 2, Gemini image/Nano Banana, Seedream 4.5 mentioned); exact endpoint shape was inconsistent across secondary sources — [OpenRouter Multimodal Capabilities](https://openrouter.ai/docs/guides/overview/multimodal/overview)
- Note: OpenRouter Veo 3.1 at $0.50/s is higher than the Gemini API third-party figure of $0.40/s (see section 2), suggesting some markup (inference).

**Other aggregators (Together AI, Runware, Segmind, AIML API, Eachlabs, Kie.ai)**
- Not directly researched. Third-party notes only: Kie.ai and Vercel AI Gateway are reported to carry Seedream 5.0 Pro — [Seedream 5.0 access summary (search result)](https://invideo.io/faq/where-can-you-access-seedream-50-pro-platforms-apis-and/). A 3rd-party comparison of Replicate/fal/Runware/Novita/Atlas Cloud exists but is SEO/vendor content — [Best AI inference platforms 2026 (apidog)](https://apidog.com/blog/best-ai-inference-platform-guide-2026)

**Third-party fal vs Replicate remarks (low reliability)**
- One comparison puts Wan 2.6 at about $0.05/s on fal vs $0.09-$0.25 on Replicate; another says Replicate has the broader catalog (audio/music/multimodal) while fal is faster for curated models — [fal.ai vs Replicate (WaveSpeed blog, vendor-authored)](https://wavespeed.ai/blog/competitor-comparison/fal-ai-vs-replicate-video-api-production/); [Replicate vs fal (metavert)](https://metavert.io/compare/replicate-vs-fal)

### Inferences
- For a small team, fal (widest hosted-model coverage with webhooks + signed callbacks) as primary and OpenRouter or Replicate as a second route is a defensible pairing; none of the sources benchmarked reliability/uptime, so this is judgement, not data.
- Aggregator Kling v3 at $0.14/s on fal vs Kling's own listed $0.084/s for 720p no-audio (section 2) suggests either a markup of up to ~65% or a different tier (Pro/1080p); not like-for-like, so the markup number is unverified.
- The one-hour (Replicate) and ~1-hour/6-minute (fal webhook retry window) retention means the app must download to its own object storage on completion, never store provider URLs.

### Gaps
- No pricing/rate-limit data fetched for Together AI, Runware, Segmind, AIML API, Eachlabs, Kie.ai.
- fal rate limits/concurrency per account tier not found; fal Veo/Hailuo/Wan/LTX prices not on the fetched page.
- Commercial-use terms for aggregators not verified (WaveSpeed page silent). Reliability/uptime data not found.
- Markup vs direct can only be compared for a few models, and several figures are 3rd-party.

## 2. Direct provider APIs: pricing, access hurdles, policy

### Takeaway
Direct APIs are cheaper or equal per second for the headline models, but each has its own billing, SDK, async pattern and lifecycle risk. Two big warnings: OpenAI has shut down the Sora/Videos API (Sept 24, 2026) and is retiring older gpt-image models; Google has already shut down Veo 3.1 *preview* IDs (Oct 22, 2026). Model IDs churn quickly, which argues for a swappable abstraction.

### Cited Findings

**OpenAI**
- Videos API and all Sora 2 aliases/snapshots (`sora-2`, `sora-2-pro`, dated snapshots) were announced for removal Mar 24, 2026, with shutdown Sept 24, 2026; no replacement listed — [OpenAI API Deprecations](https://developers.openai.com/api/docs/deprecations)
- Sora consumer app shut down April 26, 2026 (3rd-party reports) and pre-shutdown pricing was reported at $0.10/s (sora-2 720p), $0.30/s (Pro 720p), $0.50/s (Pro 1024p); these come from blogs, not OpenAI pages — [Sora API shut down (laozhang blog)](https://blog.laozhang.ai/en/posts/sora-2-api-discontinued.md); [Sora 2 pricing (magichour)](https://magichour.ai/blog/sora-2-pricing). Treat as historical only.
- Image: `gpt-image-1-mini`, `gpt-image-1.5`, `chatgpt-image-latest` deprecated June 2, 2026, shutdown Dec 1, 2026; `gpt-image-1` shutdown Oct 23, 2026; recommended replacements `gpt-image-2.5-sunburst` / `gpt-image-2.5-flare`; DALL-E 2/3 shut down May 12, 2026. `gpt-image-2` exists (aggregators list it) — [OpenAI API Deprecations](https://developers.openai.com/api/docs/deprecations)
- Direct GPT Image pricing not found; WaveSpeed lists GPT Image 2 from $0.01/img (lowest quality) — [WaveSpeedAI Pricing](https://wavespeed.ai/pricing)

**Google (Gemini API / Vertex)**
- Nano Banana prices on the Gemini API (paid tier, per image): Nano Banana 2.1 $0.0336 (1K) / $0.0504 (2K) / $0.113 (4K); Nano Banana 2 $0.067 (1K) / $0.101 (2K) / $0.151 (4K); Nano Banana 2 Lite $0.0336 (1K); Nano Banana Pro $0.134 (1K/2K), $0.24 (4K); original Nano Banana (2.5 Flash Image) $0.039, deprecated with shutdown Mar 15, 2027. Batch is ~50% off. No per-model RPM published on that page — [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Gemini Omni Flash (video generation + conversational editing, `gemini-omni-1.1-flash`) priced $17.50 per 1M video output tokens, "approximately $0.10 per second" at 720p — [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- Veo 3.1 *Preview* model IDs (`veo-3.1-generate-preview`, `-fast-`, `-lite-`) were shut down Oct 22, 2026; Google recommends Gemini Omni Flash or GA Veo on "Gemini Enterprise Agent Platform" (Vertex successor) — [Gemini API: Video](https://ai.google.dev/gemini-api/docs/video)
- Veo 3.1 per-second rates (3rd-party, conflicting, unverified): $0.40/s (720p-1080p) and $0.60/s (4K), Fast $0.10/s, Lite $0.05/s per an Aug 2026 guide; other sources say $0.75/s for Veo 3.1 on Vertex — [Veo 3.1 pricing search results (llmreference / veo3gen)](https://www.llmreference.com/model/veo-3.1-generate-001/gcp-vertex-ai); [Google Veo 3 Pricing 2026 (WaveSpeed blog)](https://wavespeed.ai/blog/cost-and-billing/google-veo-3-pricing/)
- Imagen: not found in Gemini pricing page fetch (Imagen status in late 2026 unverified).

**Runway API (accessed 2026-11-02)**
- Credits cost $0.01 each. Video credits/sec: Gen-4.5 12 ($0.12/s); Gen-4 Turbo 5 ($0.05/s); Aleph 2.0 28 (min 56 credits); Veo 3.1 with audio 40 ($0.40/s), without audio 20; Veo 3.1 Fast with audio 15 ($0.15/s), without 10 ($0.10/s). Images: Gen-4 Image 5 credits 720p / 8 credits 1080p; Gen-4 Image Turbo 2; Seedream 5 Flash 2, Lite 4, Pro 5 (1K); Nano Banana 2.1 4 (1K)/6 (2K)/12 (4K) credits — [Runway API pricing](https://docs.dev.runwayml.com/guides/pricing/)
- Notable: Runway's API itself resells Veo 3.1 and Seedream/Nano Banana, i.e. Runway is also a multi-model gateway. Usage tier/rate-limit details not retrieved.

**Kling (official developer pricing; mostly via 3rd-party trackers)**
- Billed per second of generated video; reported official baseline $0.084/s for 720p Kling 3.0 without native audio; $0.140/s for 1080p with native audio; range reported $0.06-$0.42/s across modes (Aug 2026 snapshot). A 5 s 1080p Omni clip with sound ~ $0.70; failed generations not billed. Sources disagree; klingai.com page could not be opened — [Kling API Pricing (aireiter)](https://aireiter.com/blog/kling-api-pricing); [Kling API pricing tracker (costbench)](https://www.costbench.com/software/ai-media-apis/kling-api/); [Kling AI video pricing breakdown (dev.to)](https://dev.to/evan-dong/kling-ai-video-generation-pricing-complete-cost-breakdown-for-developers-2026-3fnp)

**ByteDance (BytePlus ModelArk): Seedance / Seedream**
- Seedance 2.0 is billed per token. Reported rates (reseller-compiled, inconsistent): 720p $4.30/M tokens with video input, $7.00/M without; 1080p $4.70 / $7.70; another source $6.40 dropping to ~$3.90 with video reference; resource packs $4.30/M standard and $3.30/M fast. Seedance 2.5 listed $10.70/M (no video input) / $6.40 (with) — [Seedance 2.0 API pricing sources (search results)](https://www.nxcode.io/resources/news/seedance-2-0-api-guide-pricing-setup-2026); [ByteDance announces API pricing for Seedance 2.0 (CnTechPost)](https://cntechpost.com/2026/03/04/bytedance-announces-api-pricing-seedance-2-0)
- Seedream 5.0 Lite reportedly $0.035/img; Seedream 5.0 Pro on ModelArk (id `seedream-5-0-pro-260628`, launched July 8, 2026), price unconfirmed. Access via ModelArk console/API keys — [Seedream 5.0 (opper.ai)](https://opper.ai/bytedance/seedream-5); [Using Seedream 5.0 Pro on BytePlus](https://www.llmreference.com/provider/byteplus/seedream-v5-pro)

**MiniMax Hailuo**
- Per-video (older): Hailuo 2.3 Fast $0.19 (768P, 6 s), Hailuo 2.3 $0.28 (768P, 6 s), Hailuo 02 $0.10 (512P, 6 s). Newer H3 per second: 768P $0.08/s, 2K $0.13/s (guide dated 30 Oct 2026). Another host lists Hailuo 2.3 at $0.067/s — [Hailuo 2.3 Cost Guide (Akool)](https://akool.com/blog-posts/minimax-hailuo-2-3-cost-guide); [MiniMax H3 Max API pricing (pixazo)](https://www.pixazo.ai/blog/minimax-h3-max-api-pricing); [MiniMax H3 pricing per second (WaveSpeed blog)](https://wavespeed.ai/blog/minimax-h3/minimax-h3-api-pricing-per-second/). On fal, MiniMax H3 Max is $0.05/s and H3 Max Turbo $0.025/s (section 1), i.e. cheaper than the reported MiniMax-direct 768P figure; unreconciled.

**Luma**
- Luma Agents API prices Ray 3.2 per generation: ~$0.30 for 720p 5 s and ~$1.20 for 1080p (3rd-party summary of docs.agents.lumalabs.ai); a different listing says Ray 3 at $1.10 per video. Roughly $0.10-$0.30/s equivalent — [Luma Agents API pricing](https://docs.agents.lumalabs.ai/guides/pricing/); [Ray 3 pricing (anotherwrapper)](https://anotherwrapper.com/tools/llm-pricing/video-models/ray-3)

**Access hurdles / content policy**
- Not systematically found. Only datapoints: OpenRouter video excluded from Zero Data Retention (above); Kling doesn't bill failed jobs (3rd-party). No data on waitlists, region limits, or per-vendor content-policy refusals.

### Inferences
- Direct lifecycle risk is real: within 2026 OpenAI killed Sora and several gpt-image IDs, Google killed Veo 3.1 preview IDs and the original Nano Banana will go away in March 2027. A model-ID registry that is data, not code, is warranted.
- Runway's API reselling Veo/Seedream/Nano Banana, and OpenRouter/fal reselling Kling/Veo, shows that "direct" vs "aggregator" is a spectrum; one vendor key can already cover several models.
- Direct is likely cheapest for Gemini image models ($0.034-$0.15) and Kling (if the $0.084/s figure holds), but requires separate accounts, billing and webhooks per vendor.

### Gaps
- Official Veo 3.1 GA price; Imagen status; Vertex vs Gemini API pricing difference.
- Official Kling developer page, official Luma and MiniMax pages not opened; Pika, LTX, Wan official APIs, Ideogram direct, Flux (BFL) direct pricing not researched.
- Access hurdles (waitlist, enterprise-only, region), and content-policy details not covered.

## 3. Typical costs: one 5-10 s clip, and a 3-shot storyboard

### Takeaway
Using prices above, a 5 s clip costs roughly $0.12-$0.70 on mid-tier models and $2.00-$3.75 on top-tier Veo 3.1 (full); 10 s doubles it. A 3-shot storyboard (3 stills) costs about $0.10-$0.45; animating all 3 shots adds ~$0.75-$2.10 mid-tier or ~$6-$11 top-tier.

### Cited Findings (price inputs, with arithmetic as inference below)
- Mid-tier per-second inputs: Kling v2.6 Pro $0.07/s (fal); MiniMax H3 Max $0.05/s (fal); Runway Gen-4 Turbo $0.05/s, Gen-4.5 $0.12/s; Kling 3.0 Std $0.084/s (WaveSpeed; also reported official 720p); Wan 3.0 $0.05/s (WaveSpeed); Veo 3.1 Fast $0.10/s (Runway, 3rd-party Gemini API) with audio $0.15/s on Runway — sources in sections 1-2.
- Top-tier inputs: Kling v3 $0.14/s (fal); Veo 3.1 with audio $0.40/s (Runway; 3rd-party Gemini API figure same), $0.50-$0.75/s (OpenRouter) — sources in sections 1-2.
- Image inputs: Seedream V4.5 $0.04 (fal); Nano Banana 2 $0.067 (Google, 1K); Nano Banana Pro $0.134 (Google) / $0.15 (fal); FLUX 1.1 pro $0.04 (Replicate); Ideogram v3 quality $0.09 (Replicate); schnell ~$0.003.

### Inferences (calculated by me from the cited prices; not published figures)
- 5 s clip: Gen-4 Turbo $0.25; MiniMax H3 Max (fal) $0.25; Kling 2.6 Pro (fal) $0.35; Kling 3.0 720p (official reported) $0.42; Veo 3.1 Fast $0.50; Gen-4.5 $0.60; Kling v3 (fal) $0.70; Veo 3.1 full via Runway $2.00; via OpenRouter $2.50-$3.75. 10 s doubles each.
- 3-shot storyboard stills: $0.12 (Seedream 4.5 x3) to $0.20 (Nano Banana 2) to ~$0.40-$0.45 (Nano Banana Pro). With one re-roll per shot, double.
- Animating the 3 shots (5 s each): $0.75-$2.10 mid-tier; ~$6-$7.50 on Veo 3.1 full. Typical "storyboard + animated preview" cost per user session therefore about $1-$3 mid-tier, $6-$8 top-tier, before retries. Users re-rolling 2-4x multiplies cost, so cost caps matter.

### Gaps
- All figures are list prices; no real-world retry rates, audio surcharges across all providers, or resolution multipliers modelled.

## 4. Engineering patterns

### Takeaway
All platforms studied use "submit job, get id, then webhook or poll" and expire outputs within roughly an hour, so the backend needs its own job table, signed-webhook endpoint, idempotent handler, storage copy, and a credit ledger. For model routing, no single drop-in library for media was confirmed; plan on your own thin adapter layer (one schema per node type) with provider SDKs underneath.

### Cited Findings
- Webhooks vs polling: fal and OpenRouter both give signed webhooks and also a status endpoint; OpenRouter suggests ~30 s polling; Replicate webhooks fire on create/update/finish — [fal Docs: Webhooks](https://fal.ai/docs/model-apis/model-endpoints/webhooks); [OpenRouter Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation); [Replicate Webhooks](https://replicate.com/docs/topics/webhooks)
- Idempotency: fal explicitly warns the same `request_id` can be delivered more than once, and `gateway_request_id` changes on retry — [fal Docs: Webhooks](https://fal.ai/docs/model-apis/model-endpoints/webhooks)
- Output expiry: Replicate 1 hour; fal stored result ~1 hour (about 6 min for larger results per doc text) — sources above. Must copy to own bucket.
- Webhook security: fal ED25519+JWKS, 300 s clock skew, raw-body hashing; OpenRouter HMAC-SHA256 with 5 min window — sources above.
- Rate limits to design around: Replicate 600 create/min with 429 and ~30 s reset — [Replicate Rate limits](https://replicate.com/docs/topics/predictions/rate-limits)
- Spend control: OpenRouter returns `usage.cost` per video job (usable for reconciling the credit ledger); Runway uses prepaid credits at $0.01; Replicate throttles low-balance accounts — sources above.
- Model-routing libraries: LiteLLM docs list image-generation providers OpenAI, Azure, Google AI Studio, Vertex AI, Bedrock, Black Forest Labs, Recraft, OpenRouter, Xinference, Nscale; its nav lists a `/videos` endpoint and a Veo video page but I could not read details. A Rust port reports Veo and Sora video support. fal/Replicate/Runway/Kling not listed as LiteLLM image providers on the page fetched — [LiteLLM Image Generation docs](https://docs.litellm.ai/docs/image_generation); [litellm-rust README](https://docs.rs/crate/litellm-rust/0.1.1)
- OpenRouter now offers a unified `/videos` + `/models?output_modalities=video` schema with `frame_images`, `input_references`, `duration`, `resolution`, `aspect_ratio`, which is a ready-made reference for a unified video-node schema — [OpenRouter Video Generation](https://openrouter.ai/docs/guides/overview/multimodal/video-generation)

### Inferences
- Suggested architecture (my design suggestion, not from sources): table `jobs(id, user_id, node_id, provider, model_key, params_json, idempotency_key, status, provider_request_id, cost_estimate, cost_actual, output_asset_id)`; reserve credits on submit, settle on completion, refund on failure; webhook handler dedupes on provider_request_id; a reconciler task polls jobs stuck >N min (webhooks can fail); worker downloads output to S3/R2 immediately and serves signed URLs; per-user daily caps checked before submit; model registry in DB/YAML mapping `model_key` to provider adapter + price formula + param mapping so swapping a model is a config change.
- With SQLite, avoid heavy write concurrency from webhooks; use a single writer queue or move jobs to Postgres early (judgement).
- Because LiteLLM's media support is unconfirmed for the models you want (Kling, Seedance, Runway), writing ~100 lines per provider adapter around fal-client/replicate is probably less risky than depending on LiteLLM for media (judgement).

### Gaps
- Not verified: fal and Replicate Python SDK quality (async support, typing); openly available media-routing libs beyond LiteLLM; credit-system implementation write-ups; official fal rate/concurrency limits; whether Runware/Together expose webhooks.

## 5. How node-canvas products source models

### Takeaway
Only one public statement was found: fal says Figma Weave runs fal models via an Import Model node. For Krea, Freepik and Flora, public evidence shows they offer many third-party models but not whether they call vendors/aggregators; no primary-source statements found.

### Cited Findings
- fal blog: Weavy/Figma Weave lets users import any fal model into the canvas by URL; post dated Aug 2025 (before the Oct 2025 Figma acquisition; the date looked inconsistent to the searcher) — [Powering Creative Workflows with Figma Weave and fal](https://fal.ai/blog/powering-creative-workflows-with-weavy-x-fal)
- Figma acquired Weavy (reported Oct 30, 2025) and relaunched it as Figma Weave; coverage names Veo, Sora, Flux, Nano Banana among available models — [Connecting Figma and Weave (Figma blog)](https://www.figma.com/blog/connecting-figma-and-weave/); [TechRadar](https://www.techradar.com/pro/software-services/figma-boosts-its-ai-editing-tools-as-it-combines-forces-with-popular-ai-platform-weavy)
- Figma's own MCP server exposes `weave_run_model`, `weave_find_model`, `weave_run_tool` tools (observed in this environment's tool list; no public statement on hosting).
- Krea's API offers 40+ image/video models (Veo 3, Kling, Wan 2.5) behind one endpoint and positions itself against Replicate/fal; it does not say what serves them. Krea co-developed FLUX.1 Krea [dev], hosted on fal — [Krea API](https://forge.krea.ai/features/api); [fal FLUX Krea LoRA](https://modelgrep.com/media/models/fal-ai/flux-krea-lora)
- Freepik aggregates third-party engines (Kling, Veo, Runway) plus its own Mystic; Flora lists 60+ models under one credit pool (Veo 3.1, Sora 2, Kling, Flux) — third-party listings, not company disclosures — [Freepik AI](https://freeapihub.com/ai-tools/freepik-ai); [fal vs Flora AI (scopeful)](https://www.scopeful.org/compare/fal-vs-flora-ai)

### Inferences
- A product with 60+ models including closed ones (Veo, Sora, Kling) cannot self-host those, so it must call vendor APIs or resellers; the open models (Flux, Wan, LTX) could be self-hosted. This is logic, not a sourced disclosure.
- Flora listing Sora 2 means its model list changes with API shutdowns (Sora API ended Sept 24, 2026) - likely they have since removed it; unverified.

### Gaps
- No primary statements from Krea, Freepik or Flora on aggregator vs own infra; no engineering blogs/HN/Reddit discussions found (Reddit/HN were not searched in this pass).

## Overall caveats for the report writer
- Several results come from search-tool summaries of pages that were not directly readable; per-model prices on vendor pages for Kling, Luma, MiniMax, BytePlus, Veo were not verified at source.
- Model names in this period (Nano Banana 2.1, Seedance 2.5, Kling v3, MiniMax H3, Wan 3.0, GPT Image 2.5) are as reported by the pages fetched on 2026-11-02; I could not independently confirm release details.
- Token-based billing (Seedance, Gemini Omni, Gemini image tokens) means a per-second price is an approximation; the cost estimator must support token, per-second, per-megapixel and per-image formulas.
