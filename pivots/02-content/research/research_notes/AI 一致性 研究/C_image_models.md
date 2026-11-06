# C. Image models for consistency (research date 2026-11-03)
Tags: [checked]=opened via WebFetch (note: WebFetch summarises via small model, so numbers are "as reported by fetch tool"); [snippet]=search result only; [official]/[third-party].
IMPORTANT: the model lineup has moved on. Google now has "Nano Banana 2.1" (gemini-nano-banana-2.1, Oct 2026) as the recommended default; the task's "Nano Banana 2" = gemini-3.1-flash-image.

## Summary table
| model | endpoint id | max refs | 9:16? | price/output img | price per input ref | seed? | LoRA? | sources |
|---|---|---|---|---|---|---|---|---|
| Nano Banana 2.1 (Google, new default) | gemini-nano-banana-2.1 (Gemini API) | up to 14 total; 10 objects + 4 characters | yes (768x1376 1K; 1536x2752 2K; 3072x5504 4K) | $0.0336 1K / $0.0504 2K / $0.113 4K (batch half) | input $1.50/1M tok (image tokens; ~560-1120 tok/img est.) | `seed` exists in generationConfig; unverified for image models | no (no doc) | G1,G2,G3 |
| Nano Banana 2 | gemini-3.1-flash-image (Gemini API, Stable) | up to 14 total; 10 objects + 4 characters | yes (384x688 0.5K / 768x1376 1K / 1536x2752 2K / 3072x5504 4K) | $0.045 0.5K / $0.067 1K / $0.101 2K / $0.151 4K | input $0.50/1M tok (~$0.0003 per 560-tok img est.) | same as above | no | G1,G2,G3 |
| Nano Banana Pro | gemini-3-pro-image (Gemini API, Stable) | up to 14 total; 6 objects + 5 humans + 3 style (Vertex: 14 total, 10 may be URL) | yes | $0.134 1K/2K, $0.24 4K (batch $0.067/$0.12) | $0.0011 per input image (560 tok x $2/1M) | same as above | no | G1,G2,G4 |
| Nano Banana 2 Lite | gemini-3.1-flash-lite-image | up to 14 objects, no char refs | yes | $0.0336 1K only | $0.25/1M tok | ? | no | G1,G2 |
| Seedream 4.5 on fal (edit) | fal-ai/bytedance/seedream/v4.5/edit | 10 on fal (last 10 used); inputs+outputs <=15; BytePlus/3rd-party say 14 | yes: enum portrait_16_9 or custom e.g. 1440x2560 (min 2560x1440 px total) | $0.04/image flat | none stated (flat) | `seed` in schema (but BytePlus 4.x/5.x reportedly ignores seed - unverified) | no | F1,F2,B1 |
| Seedream 4.5 t2i on fal | fal-ai/bytedance/seedream/v4.5/text-to-image | n/a | custom size | $0.04 | n/a | seed in schema | no | F3 |
| Seedream 5.0 Pro edit (fal) | bytedance/seedream/v5/pro/edit | 10 | image_size auto_2K or custom (ratio 1:16..16:1, 0.92-4.6MP) | $0.0675 (<=1536^2) / $0.135 (<=2048^2) "tentative" | +$0.0045 per extra input (1st free) | no seed param in schema | no | F4 |
| Seedream 5.0 Lite edit (fal) | fal-ai/bytedance/seedream/v5/lite/edit | 10 (refs+outputs <=15) | custom, ratio 1:16..16:1 | $0.035 | n/a | seed only in output | no | F5 |
| FLUX.2 [dev] edit | fal-ai/flux-2/edit | 4 | custom 512-2048 px | $0.012/MP (in+out; inputs resized to 1MP) | counted as MP | yes | not on this endpoint; fal-ai/flux-2/lora is separate t2i | F6 |
| FLUX.2 [pro] edit | fal-ai/flux-2-pro/edit | not stated (BFL: up to 10 refs) | custom/auto | $0.03 first MP + $0.015 each extra MP | $0.015/MP | yes | no | F7, S6 |
| FLUX.1 Kontext multi | fal-ai/flux-pro/kontext/multi | not stated (examples 2) | yes (aspect_ratio 9:16) | $0.04 | n/a | yes (deterministic claim) | no (kontext-lora is single image) | F8 |
| Qwen Image Edit Plus | fal-ai/qwen-image-edit-plus | not stated (examples 3) | image_size enum/custom | $0.03/MP | n/a | yes | no | F9 |

## 1. Gemini image models
- Current model ids (Gemini API): gemini-nano-banana-2.1 ("New Stable", recommended default); gemini-3.1-flash-image (Nano Banana 2, Stable); gemini-3.1-flash-lite-image (Nano Banana 2 Lite); gemini-3-pro-image (Nano Banana Pro, Stable); gemini-2.5-flash-image (legacy, to be shut down 2027-03-15). Sources: https://ai.google.dev/gemini-api/docs/image-generation [checked][official], https://ai.google.dev/gemini-api/docs/models [checked][official], https://ai.google.dev/gemini-api/docs/pricing [checked][official]. No date visible on pages; third-party snippet says 2.1 launched 2026-10-06 [snippet][third-party, creati/unifically].
- Reference limits (image-generation doc [checked][official]): Flash Lite: up to 14 object images, no character/style. 2.1 and 3.1 Flash: up to 10 object + up to 4 character images. 3 Pro: up to 6 object + up to 5 character + up to 3 style. Overall mix up to 14. Limitations section: "3 Pro supports 5 [humans] with high fidelity and up to 14 total; 2.1 and 3.1 Flash up to 4 characters and 10 objects"; 2.5 Flash works best with up to 3.
- Vertex doc for gemini-3-pro-image [checked][official] https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/gemini/3-pro-image : 14 images/prompt (only 10 may be HTTP URLs, rest GCS URI or inline); 560 tokens per input image; output tokens 1120 (1K), 1120 (2K), 2000 (4K); max input tokens 65,536; image 7MB inline/30MB GCS; temp default 1.0, topP 0.95. Seed/latency not stated there.
- Aspect ratios (API ref ImageConfig [checked][official] https://ai.google.dev/api/generate-content): 1:1,1:4,4:1,1:8,8:1,2:3,3:2,3:4,4:3,4:5,5:4,9:16,16:9,21:9. imageSize: 512,1K,2K,4K (default 1K; uppercase K). If aspectRatio unspecified, model picks from reference images. 9:16 pixel sizes from the docs: 1K 768x1376, 2K 1536x2752, 4K 3072x5504. 0.5K (384x688) only on 3.1 Flash; 2.1 has no 512. Flash Lite 1K only.
- Output tokens per image: 2.1 and 3.1 Flash: 1120 (1K)/1680 (2K)/2520 (4K), 747 at 0.5K; Pro: 1120/1120/2000.
- Pricing [checked][official] ai.google.dev/gemini-api/docs/pricing (paid tier, no free tier for image models):
  - Nano Banana 2.1: in $1.50/1M (batch 0.75), out img $30/1M; per image 1K $0.0336, 2K $0.0504, 4K $0.113 (batch 0.0168/0.0252/0.0567).
  - Nano Banana 2: in $0.50/1M; per image 0.5K $0.045, 1K $0.067, 2K $0.101, 4K $0.151 (batch ~half).
  - Nano Banana Pro: text in $2/1M; image input $0.0011 per image (batch $0.0006); out $0.134 1K/2K, $0.24 4K (batch $0.067/0.067/0.12).
  - Nano Banana 2 Lite: $0.0336 1K. Legacy 2.5 Flash Image: $0.039.
  - Thinking tokens are billed; up to two interim "thought images" not charged.
  - Input-image cost therefore tiny vs output (Pro $0.0011/img; Flash est. 560-1120 tok x $0.50/1M = ~$0.0003-0.0006; my arithmetic, assumes 560 tok/input image holds for Flash models - [unverified]).
  - Note: image-gen doc table labels the Pro row "3.1 Pro Image" while ids/pricing say gemini-3-pro-image; treat as doc inconsistency.
- Latency (no official figure). Third-party benchmark snippets [snippet][third-party]: Magic Hour 15-run test, 1K: NB2 mean 15.5s, Pro 30.8s; DevX 13-15s vs 25-35s; Puter.js 7.7s vs 17.0s; apiyi July 2026 ~30s avg for both. NB2 Lite ~3-4s. No 2.1 latency found. URLs: https://magichour.ai/blog/nano-banana-2-vs-nano-banana-pro-we-benchmarked-both-on-the-same-5-prompts , https://developer.puter.com/blog/nano-banana-2-lite-puter-js/
- Multi-turn: image-gen doc [checked]: multi-turn editing via `previous_interaction_id` (Interactions API stateful mode); 2.1 "improves multi-turn consistency"; Flash Lite not optimised for it. Thinking always on for Gemini 3 image models, cannot be disabled; levels: 2.1 minimal/medium/high (default medium), 3.1 Flash minimal/high (default minimal).
- Thought signatures [checked][official] https://ai.google.dev/gemini-api/docs/thinking : stateful mode (store:true + previous_interaction_id) server manages them; stateless mode you must resend all thought blocks unmodified. Nothing image-specific found in the fetched text (older docs said chat SDK handles signatures automatically for image editing - not verified here).
- SynthID: all generated images carry SynthID watermark [checked][official]. Unknown whether any visible watermark on API outputs.
- Official best practices for consistency [checked][official]: image-gen doc "Character consistency (360 view)": generate multiple angles iteratively; include previously generated images in later prompts; for complex poses include a reference image of the pose. General: be specific, one change per follow-up, positive phrasing, camera terms. Google blog https://blog.google/products/gemini/prompting-tips-nano-banana-pro/ [checked][official]: assign each reference image a role in the prompt ("Image A for pose, Image B for style, Image C for background"); "character consistency across edits may vary"; up to 6-14 images "varies by surface".
- Third-party consistency guide (Runware, NB2) [checked][third-party] https://runware.ai/docs/models/google-nano-banana-2/guides/character-consistency : refer to subject by name ("the same woman"), don't redescribe appearance, name features to keep (face, hair, logo), use clean sharp references, add a reference for every view needed (unseen back of garment gets hallucinated), identity lives in face/hair not clothing.
- Reported drift [snippet][third-party, Topview]: NB2.1 redraws the whole frame each edit so unedited parts can slowly shift across long chains - prefer re-anchoring on the original reference each shot rather than chaining edits.
- Gemini via fal (not needed but for reference): fal-ai/nano-banana-pro/edit [checked][third-party-hosted] https://fal.ai/models/fal-ai/nano-banana-pro/edit/llms.txt : seed param exists, aspect_ratio incl 9:16, resolution 1K/2K/4K, $0.15 (1K/2K), $0.30 (4K), +$0.015 web search; 14-reference total limit.
- Seed: Gemini API GenerationConfig has `seed` ("Optional. Seed used in decoding. If not set, the request uses a randomly generated seed.") [checked][official] https://ai.google.dev/api/generate-content . Not mentioned in image-generation doc or Vertex 3-pro-image page. A Chinese gateway example puts seed in generationConfig for gemini-3-pro-image-preview [snippet]. Forum thread: seed does not guarantee determinism even on gemini-2.5-pro [snippet] https://discuss.ai.google.dev/ . Conclusion: field accepted at API level; effect on image models undocumented -> do not rely on it. Fal's wrapper does expose seed for Nano Banana Pro.

## 2. Seedream
- fal v4.5 edit [checked][third-party host, official schema] https://fal.ai/models/fal-ai/bytedance/seedream/v4.5/edit/llms.txt and /api: image_urls up to 10 (last 10 used); image_size enum: square_hd, square, portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, auto_2K, auto_4K, or {width,height} each 1920-4096 or total pixels 2560x1440..4096x4096 (so 1440x2560 portrait is allowed by total-pixel rule; verify actual pixels of portrait_16_9 enum - not stated); num_images 1-6 (separate runs); max_images 1-6 (>1 enables multi-image/sequential generation; inputs+outputs <= 15); seed int; sync_mode; safety checker. Price $0.04/image. Output `images[].url`.
- fal v4.5 text-to-image [checked]: same minus image_urls; $0.04.
- Sequential/group generation: the fal "max_images" is the BytePlus sequential_image_generation=auto + sequential_image_generation_options.max_images [snippet][third-party DataCamp https://www.datacamp.com/tutorial/seedream-4-5 ; BytePlus model id seedream-4-5-251128 on https://ark.ap-southeast.bytepluses.com/api/v3 per docs.byteplus.com/en/docs/ModelArk/1399008 snippet]. In auto mode the model decides how many images (up to max) - you do not get exact count guaranteed [inference, unverified].
- BytePlus official: docs.byteplus.com pages fetched were nav-only (no body) [checked, failed]. Multi-ref "up to 14" appears in third-party sources (Invoke docs https://invoke-ai.github.io/InvokeAI-7/users-guide/models/external-models/seedream/ [checked][third-party]: up to 14 refs, batch limit 15, native 2K, ratios incl 9:16; seed and guidance not accepted by 4.x/5.x). MindStudio says 10 [snippet]. fal enforces 10. So on fal assume 10.
- BytePlus price: product page $0.04/image for 4.5 [snippet] https://www.byteplus.com/product/Seedream ; OpenRouter $0.04/img; Replicate $0.06; fal $0.04 [snippet].
- Seedream 5.0 on fal: Pro launched 2026-07-08 [snippet, natlawreview press release]; edit endpoint bytedance/seedream/v5/pro/edit [checked] 10 refs, $0.0675/$0.135 per image "tentative" + $0.0045 per extra input (first free); Lite edit fal-ai/bytedance/seedream/v5/lite/edit [checked] $0.035, max_images 1-15 sequential, refs+outputs <=15. 5.0 pages show no seed input.
- Seed on fal Seedream 4.5 edit: parameter present in schema, but BytePlus upstream reportedly does not accept seed for 4.x/5.x [third-party Invoke]. Likely no-op or loosely honoured; unverified. Don't rely.

## 3. Other cheap options on fal [checked llms.txt pages]
- FLUX.2 [dev] edit fal-ai/flux-2/edit: max 4 images, 512-2048px, $0.012/MP counting input+output (inputs resized to 1MP), seed, returns seed.
- FLUX.2 [pro] edit fal-ai/flux-2-pro/edit: $0.03 first MP + $0.015/extra MP, plus $0.015/MP input; image_urls max not stated (BFL/fal marketing: up to 10 refs [snippet, fal.ai/flux-2]); seed yes. FLUX.2 [flex] $0.05/MP, [max] $0.07/MP [snippet].
- FLUX.1 Kontext multi fal-ai/flux-pro/kontext/multi: $0.04/img, aspect_ratio incl 9:16, seed (same seed+prompt => same image), max refs not stated.
- flux-kontext-lora: single image only, $0.035/MP, loras param.
- Qwen Image Edit Plus fal-ai/qwen-image-edit-plus: $0.03/MP, multi-image (examples 3), seed; no LoRA mention.

## 4. LoRA training on fal [checked llms.txt]
- fal-ai/flux-lora-fast-training: $2 per run (scales linearly with steps), steps 1-10000 (example 1000), >=4 images recommended (more better), zip with optional same-name .txt captions, params trigger_word/is_style/create_masks (face masks for people); output diffusers_lora_file URL + config_file. Time not on page; third-party video says "<5 min" for ~$2 [snippet] https://rosetta.to/u/1littlecoder/... (low quality).
- fal-ai/flux-kontext-trainer: $2.5 per 1000 steps (min 500 steps $1.25), default 1000 steps, training data = image PAIRS ROOT_start/ROOT_end (+ optional txt instruction), default_caption required if no txt; output LoRA URL. Use with flux-kontext-lora (single-image edit) $0.035/MP.
- fal-ai/flux-2-trainer: $0.0064/step (1000 steps = $6.40), steps 100-10000, >=10 images recommended; output LoRA URL. Inference: fal-ai/flux-2/lora [checked]: $0.021/MP, up to 3 LoRAs (URL / HF id), size multiplier for LoRAs >2GB, max 5GB, image_size 512-2048, seed. (flux-2/lora/edit not confirmed.)
- fal-ai/flux-lora (t2i inference): $0.035/MP, loras list merged, seed deterministic.
- fal-ai/qwen-image-trainer: $0.002/step (min 250 steps), default 1000 (page text also says 4000 - conflict), >=10 images with caption .txt, output lora_file URL. Inference price/endpoint not on page.
- Video LoRA: fal-ai/wan-22-trainer: $0.004/step (min 100), default 400 steps, range 100-20000, >=10 images/videos, output lora_file; training time not stated.
- Training time: not stated by fal on any trainer page I could fetch.
- LoRA with Nano Banana / Seedream: no official support found. Third-party WaveSpeed comparison table lists LoRA "No" for Nano Banana Pro and Seedream 5.0 [snippet]. Seedream 4.5 not explicitly stated; no ByteDance doc found. Treat as not supported; consistency for these two = reference images only. Google Vertex fine-tuning for Gemini image models: not found (unverified).

## 5. Seeds / determinism
- Gemini: seed field exists in generic GenerationConfig; undocumented for image output; determinism not guaranteed even for text models (forum). Practically: use reference images + same prompt skeleton, not seed.
- Seedream on fal 4.5: seed accepted in schema; upstream BytePlus reportedly ignores seed on 4.x/5.x (third-party). 5.0 fal pages have no seed input.
- FLUX.2 / Kontext / Qwen on fal: seed documented as deterministic for same prompt + model version.
- Does seed help consistency? Seed fixes noise only; it does not carry identity across different prompts. Runware guide recommends seed only to reproduce a result then vary one element at a time. No evidence found that seed improves cross-shot character consistency. [inference]

## 6. Independent evidence
- Arena (formerly LMArena) Single Image Edit, as of 2026-10-23 [checked][third-party-independent] https://arena.ai/leaderboard/image-edit : NB2.1 rank 7, 1427 (preliminary, 12,956 votes); Seedream 5.0 Pro 1390; Nano Banana Pro 1390 (2K variant) / 1385; NB2 (3.1 Flash) 1387; Seedream 4.5 1303 (rank 27, 1.36M votes); Seedream 5.0 Lite 1294. Top: GPT-Image-2.5 Sunburst 1517. This is general edit preference, NOT character consistency.
- Artificial Analysis image editing arena (undated page, models through Oct 2026) [checked] https://artificialanalysis.ai/image/leaderboard/editing : NB2.1 1151 (rank 6); Seedream 5.0 Pro 1131 (9); NB2 1123 (13); Nano Banana Pro 1108 (18); Seedream 5.0 Lite 1062 (33); Seedream 4.5 1043 (39). Elo scale differs from the Aug 2026 snapshots cited elsewhere [snippet] (NB2 1250, SD5 Pro 1248, NBPro 1246), so the arena has been re-baselined; ordering is what matters. Seedream 4.5 is clearly weaker than the Nano Banana family on both arenas.
- Google's own model-card numbers via Unifically [snippet][vendor-reported, unverified]: multi-character consistency score NB2.1 thinking 1106, NB2.1 no thinking 1068, NB2 978, Nano Banana Pro 1011.
- Head-to-head NB Pro vs Seedream 4.5 for consistency: only vendor/blog pieces, conflicting (invideo.io claims Seedream more consistent over anime series; Dzine rates NB Pro "Excellent" vs Seedream "Very Good"; X-Design: both strong) [snippet]. No reproducible multi-shot test found.

## Gaps / unverified
- BytePlus official Seedream 4.5 doc body (refs 14 vs fal 10, seed, sequential mode semantics) - pages returned nav only.
- Exact pixel dims of fal portrait_16_9 enum for Seedream 4.5 (use custom 1440x2560 to be safe; 9:16 at 2K = 1536x2752 for Gemini).
- Whether Gemini image models honour `seed`. Test empirically (two calls, same seed) if wanted - costs money.
- Input-image token cost for Flash models (only Pro's 560 tok/img confirmed).
- Gemini latency official; NB2.1 latency; fal LoRA training durations; Qwen/FLUX.2 LoRA inference price for edit variants.
- Thought-signature handling in generateContent chat for image models (docs fetched only covered Interactions API stateful vs stateless).
- Whether Google offers any fine-tuning for Gemini image models.
- Model ids/prices change quickly (2.1 only ~4 weeks old, "preliminary" Arena score); recheck before shipping.
