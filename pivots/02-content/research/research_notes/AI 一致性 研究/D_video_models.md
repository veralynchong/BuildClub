# D. Video models for consistency (fal.ai + Google) - research notes
Date of research: 2026-11-03. Tags: [checked]=opened via WebFetch; [snippet]=search result only; [official]=vendor/fal page; [third-party].
All fal facts were read from fal.ai/models/<id>/llms.txt (fal's own page text) = [checked][official] unless noted. fal prices change; re-check before launch.

## BIG PICTURE (read first)
1. Veo 3.1 on Gemini API: preview ids (veo-3.1-generate-preview, -fast-generate-preview, -lite-generate-preview) were SHUT DOWN 2026-10-22; Google's replacement is gemini-omni-1.1-flash (Interactions API, released 2026-08-27). Veo 3.1 GA ids (veo-3.1-generate-001, veo-3.1-fast-generate-001) exist ONLY on Vertex / "Gemini Enterprise Agent Platform" (renamed Vertex AI), not listed in Gemini API deprecations page. Source: https://ai.google.dev/gemini-api/docs/deprecations [checked][official]; https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate [checked][official].
2. fal's fal-ai/veo3.1/reference-to-video /api page says "This endpoint will be deprecated on November 17, 2026" [checked][official] (llms.txt of same endpoint shows NO deprecation notice - the two fal views disagree; treat as deprecating). Vertex GA Veo ids also list "Nov 17, 2026 or later" retirement.  => Do not build on Veo 3.1 ref-to-video; use Gemini Omni Flash 1.1 (fal: google/gemini-omni-flash/v1.1/*) instead.
3. Landscape has moved far past the question list: Kling 3.0/O3 (fal v3/o3), Kling 4.0 (launched 2026-10-15, fal kling/v4/*), MiniMax H3 / H3 Max (open weights, fal minimax/h3*, with LoRA trainers), Seedance 2.0/2.5, Wan 2.7/3.0 are all on fal. Veo 4 = no evidence it exists (aireiter, third-party).
4. Best fits for 9:16 + same character/product/location across shots (in my reading): Kling O3 / v4 reference-to-video (elements + @Element binding), MiniMax H3 Max reference-to-video (9 refs, 9:16), Seedance 2.0/2.5 ref-to-video (9 / 30 refs, 9:16), Gemini Omni Flash ref-to-video (9:16, cheap $0.10/s). No independent consistency benchmark found (see section 7).

## SUMMARY TABLE
(price = fal list price per second of output unless stated; "9:16" = explicit aspect_ratio enum or canvas follows input image)

| Model / mode | fal endpoint id | Inputs | 9:16? | Durations | $/s | Sources |
|---|---|---|---|---|---|---|
| Veo 3.1 reference-to-video | fal-ai/veo3.1/reference-to-video | image_urls (list; no max on fal page; Google/Vertex: up to 3 "asset" imgs) | yes (16:9, 9:16) | 8s only (fal default "8s", Vertex: ref-image only 8s) | 720/1080p: 0.20 no audio / 0.40 audio; 4k 0.40/0.60. DEPRECATED 2026-11-17 | fal llms.txt, /api; Vertex ref-images doc |
| Veo 3.1 Fast reference-to-video | fal-ai/veo3.1/fast/reference-to-video | image_urls | yes | 8s | 0.10 no audio / 0.15 audio (page only mentions 2 rates) | fal llms.txt |
| Veo 3.1 image-to-video | fal-ai/veo3.1/image-to-video | image_url (start) | auto/16:9/9:16 | 4s,6s,8s | same as ref-to-video (0.20/0.40; 4k 0.40/0.60) | fal llms.txt |
| Veo 3.1 Fast i2v | fal-ai/veo3.1/fast/image-to-video | image_url | auto/16:9/9:16 | 4/6/8s | 0.10/0.15; 4k 0.30/0.35 | fal llms.txt |
| Veo 3.1 first-last-frame | fal-ai/veo3.1/first-last-frame-to-video (+ /fast/...) | first_frame_url, last_frame_url | auto/16:9/9:16 | 4/6/8s | std 0.20/0.40; fast 0.10/0.15 | fal llms.txt |
| Veo 3.1 extend | fal-ai/veo3.1/extend-video | video_url (Veo-made video) | 16:9, 9:16 | default 7s, up to 30s total | 0.20/0.40 | fal llms.txt |
| Gemini Omni Flash 1.1 reference-to-video (Veo successor) | google/gemini-omni-flash/v1.1/reference-to-video | image_urls (no max stated; Google example shows 6) + up to 3 ref videos (<=3s each) | yes (9:16, 16:9) | whole seconds, default 8; Google: 3-10 s | 360p 0.03; 720p 0.10; 1080p 0.15; 4k 0.30 (fal guide) | fal learn guide [checked]; ai.google.dev/gemini-api/docs/omni [checked] |
| Gemini Omni Flash 1.1 image-to-video | google/gemini-omni-flash/v1.1/image-to-video | image_url + optional end_image_url | yes | default 8 | same | fal learn guide |
| Kling O3 Pro reference-to-video | fal-ai/kling-video/o3/pro/reference-to-video | start_image_url, end_image_url, image_urls (@ImageN), elements (@ElementN; each frontal_image_url + 1-3 reference_image_urls, or video) ; cap 4 (elements+images) when using video | yes (16:9, 9:16, 1:1) | 3-15s | 0.112 audio off / 0.14 audio on | fal llms.txt |
| Kling O3 Standard reference-to-video | fal-ai/kling-video/o3/standard/reference-to-video | same | yes | 3-15s | 0.084 / 0.112 | fal llms.txt |
| Kling O3 Pro image-to-video | fal-ai/kling-video/o3/pro/image-to-video | image_url, end_image_url, multi_prompt | no aspect field (follows image - inferred, not stated) | 3-15s | 0.112 / 0.14 | fal llms.txt |
| Kling v3 Pro image-to-video | fal-ai/kling-video/v3/pro/image-to-video | start_image_url, end_image_url, elements (frontal + 1-3 ref imgs, @Element1..; max 1 video element), multi_prompt, voice_id | no aspect field (output follows start image - NOT stated) | 3-15s (string) | 0.112 off / 0.168 audio / 0.196 audio+voice | fal llms.txt + /api |
| Kling v3 Standard i2v | fal-ai/kling-video/v3/standard/image-to-video | same | same | 3-15s | 0.084 / 0.126 / 0.154 | fal llms.txt |
| Kling O1 reference-to-video | fal-ai/kling-video/o1/reference-to-video | image_urls, elements; "max 7 total (elements + ref images + start image)" | yes (16:9, 9:16, 1:1) | 3-10s | 0.112 | fal llms.txt |
| Kling O1 image-to-video | fal-ai/kling-video/o1/image-to-video | start_image_url, end_image_url (via @Image1/@Image2 in prompt) | no aspect field; start img ratio 0.40-2.50 | 3-10s | 0.112 | fal llms.txt |
| Kling 2.6 Pro i2v | fal-ai/kling-video/v2.6/pro/image-to-video | start_image_url, end_image_url, no elements | no aspect field | 5 or 10 | 0.07 off / 0.14 audio / 0.168 voice | fal llms.txt |
| Kling 1.6 Pro Elements (legacy) | fal-ai/kling-video/v1.6/pro/elements | input_image_urls max 4 | yes (16:9, 9:16, 1:1) | 5 or 10 | 0.098 | fal llms.txt (may be legacy) |
| Kling 4.0 reference-to-video | kling/v4/reference-to-video | start/middle(<=8)/end image, image_urls (<=10), video_urls (<=5), elements (<=7; <=3 video; <=3 voice) | yes (auto,16:9,9:16,1:1,21:9) | 3-30s | 720p 0.157; 1080p 0.235; with video refs 0.094 / 0.141 (billed on input+output sec, min 2x output) | fal llms.txt; launch 2026-10-15 per aireiter [third-party] |
| Kling 4.0 image-to-video | kling/v4/image-to-video | start_image_url, end_image_url, middle_image_urls(<=8); no elements listed | no aspect field | 3-30s | 0.157 / 0.235 | fal llms.txt |
| MiniMax H3 Max reference-to-video | minimax/h3-max/reference-to-video | reference_image_urls (<=9), reference_video_urls (<=3), audio (<=3), total <=12 files; plus image_url/middle_image_url/end_image_url | yes (adaptive,21:9,16:9,4:3,1:1,3:4,9:16) | 0.92-15s | 480p 0.05; 768p 0.08; 1080p 0.16 (std from 2026-11-16; Nov 1-15 = 30% off); +$0.02/1k ref tokens beyond 4096 | fal llms.txt |
| MiniMax H3 reference-to-video (base, open weights) | minimax/h3/reference-to-video | same, 9 imgs | yes | 5-15s | 480p 0.05; 768p 0.06; 2K 0.13; 4K 0.16; first 5 ref images free then $0.08 each | fal llms.txt |
| MiniMax H3 / H3 Max image-to-video | minimax/h3/image-to-video ; minimax/h3-max/image-to-video | image_url, end_image_url (first-last frame) (H3 Max also middle frame via ref endpoint) | canvas follows input image | H3 5-15s; H3 Max 0.92-15 | H3: 0.05/0.06/0.13/0.16; H3 Max: 0.05/0.08 (promo till Nov 15) | fal llms.txt |
| MiniMax H3 LoRA i2v | minimax/h3/image-to-video/lora | loras[{path,scale}] | follows image | - | 480p 0.0625; 768p 0.075; 2K 0.1625; 4K 0.20 | fal llms.txt |
| Hailuo 2.3 Pro i2v | fal-ai/minimax/hailuo-2.3/pro/image-to-video | image_url (first frame only) | no aspect field | not in schema | $0.49 / video (1080p) | fal llms.txt |
| Hailuo 2.3 Standard i2v | fal-ai/minimax/hailuo-2.3/standard/image-to-video | image_url only, no end frame | no aspect field | 6 or 10 | $0.28/6s, $0.56/10s (768p) | fal llms.txt |
| Hailuo 2.3 Fast Pro i2v | fal-ai/minimax/hailuo-2.3-fast/pro/image-to-video | image_url | no | n/a | $0.33 / video | fal llms.txt |
| Hailuo 02 Standard i2v | fal-ai/minimax/hailuo-02/standard/image-to-video | image_url + end_image_url | no aspect field | 6 or 10 (10s not at 1080p) | 768P 0.045/s; 512P ~0.017/s | fal llms.txt |
| Hailuo 02 Pro i2v | fal-ai/minimax/hailuo-02/pro/image-to-video | image_url + end_image_url | no | n/a | 0.08/s (1080p) | fal llms.txt |
| MiniMax video-01 subject reference (S2V-01, legacy) | fal-ai/minimax/video-01-subject-reference | subject_reference_image_url (single face/subject) | not specified | not specified | $0.50 / video | fal llms.txt (old model; likely 2025) |
| Seedance 2.0 reference-to-video | bytedance/seedance-2.0/reference-to-video | images <=9, videos <=3, audio <=3, total <=12 | yes (auto,21:9,16:9,4:3,1:1,3:4,9:16) | auto or 4-15s | token-billed $0.014/1k tok; 720p ~$0.3034/s, 1080p ~$0.682/s (from the i2v page) ; 0.6x with video refs | fal llms.txt |
| Seedance 2.0 image-to-video | bytedance/seedance-2.0/image-to-video | image_url + end_image_url | yes (auto from image) | 4-15 | 720p $0.3034/s; 1080p $0.682/s | fal llms.txt |
| Seedance 2.5 (US) reference-to-video | bytedance/seedance-2.5/us/reference-to-video | images <=30, videos <=10, audio <=10, total <=50 | yes | auto or 4-30s | ~0.2205 (480p) / 0.4730 (720p) / 1.164 (1080p) per s; $0.0214/1k tokens | fal llms.txt |
| Seedance 1 Lite reference-to-video | fal-ai/bytedance/seedance/v1/lite/reference-to-video | 1-4 images | yes | 2-12s | DEPRECATED, rerouted to Grok Imagine Video | fal llms.txt |
| Vidu Q2 Pro reference-to-video | fal-ai/vidu/q2/reference-to-video/pro | <=7 images (<=4 if also videos), <=2 videos | yes (auto,16:9,9:16,1:1,W:H) | 1-8s | page inconsistent (~0.30/s 720p? unclear) | fal llms.txt |
| Vidu Q1 reference-to-video | fal-ai/vidu/q1/reference-to-video | <=7 images | yes (16:9,9:16,1:1) | ~5s | $0.40 / 5s clip | fal llms.txt |
| Wan 2.7 reference-to-video | fal-ai/wan/v2.7/reference-to-video | reference_image_urls (no max stated), reference_video_urls | yes (16:9,9:16,1:1,4:3,3:4) | 2-10s | 0.10 (video inputs billed input+output sec) | fal llms.txt |
| Wan 3.0 reference-to-video | alibaba/wan-3.0/reference-to-video | images <=10, videos <=5, audio <=5 | yes (adaptive,16:9,4:3,1:1,3:4,9:16) | 2-30s | 480p 0.05; 720p 0.10; 1080p 0.20 | fal llms.txt |
| Wan 2.2 A14B i2v + LoRA | fal-ai/wan/v2.2-a14b/image-to-video/lora | image_url, end_image_url, loras | yes (auto,16:9,9:16,1:1) | 17-161 frames @4-60fps (~5s default) | 0.10 | fal llms.txt |

## DETAILED NOTES

### 1. Veo 3.1
- Gemini API deprecations page: preview ids shut down 2026-10-22, replacement gemini-omni-1.1-flash; veo-3.0 GA + veo-2.0 shut down 2026-06-30; page does NOT list veo-3.1-generate-001. https://ai.google.dev/gemini-api/docs/deprecations [checked][official]
- Gemini API pricing page has no Veo at all; only Gemini Omni Flash: input $1.50/1M tok, video output $17.50/1M tok, 5,792 tokens per second of 720p video => ~$0.10/s. https://ai.google.dev/gemini-api/docs/pricing [checked][official]
- Vertex/"Gemini Enterprise Agent Platform" GA ids: veo-3.1-generate-001, veo-3.1-fast-generate-001 (GA 2025-11-17); veo-3.1-lite-generate-001 is Preview (2026-04-02), no reference images. Aspect 9:16 & 16:9; durations 4/6/8s; output 720p/1080p/4K (Fast no 4K); reference images ("Asset images") supported on Generate and Fast; first/last frame and extension supported; "reference image to video only supports 8 seconds" for Generate; consumption = Provisioned Throughput or fixed quota (no pay-as-you-go listed). Retirement "Nov 17, 2026 or later". https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate [checked][official]
- Vertex reference-images page: Veo 3.1 uses subject images with referenceType "asset", up to 3 (console 1-3); aspect 16:9 (default) and 9:16; duration 4/6/8 in console, but veo-3.1-generate-001 returns only 8s with subject images; 4k only for -generate-001; PNG/JPEG only; no style reference mentioned. Gemini Omni Flash (`gemini-omni-1.1-flash-preview` in that doc) also takes reference images/videos, 3-10s, 9:16, 360p-4k. https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/use-reference-images-to-guide-video-generation [checked][official]
- Google blog 2026-01-13: Ingredients to Video now supports native 9:16; 1080p/4K upscaling available in Flow, Gemini API, Vertex. Claims identity stable across settings (vendor claim). https://blog.google/innovation-and-ai/technology/ai/veo-3-1-ingredients-to-video/ [checked][official]
- fal Veo 3.1 prices (per second): std 720p/1080p $0.20 no-audio / $0.40 audio; 4k $0.40/$0.60. Fast: $0.10/$0.15 (720p/1080p), 4k $0.30/$0.35. Pages: fal.ai/models/fal-ai/veo3.1/{reference-to-video,image-to-video,first-last-frame-to-video,fast/image-to-video,fast/first-last-frame-to-video,fast/reference-to-video,extend-video}/llms.txt [checked][official]
- fal ref-to-video schema: image_urls required (example 3 imgs, each <=8MB, no max count stated), aspect 16:9|9:16 (NO auto), duration default "8s" (no other options listed), resolution 720p|1080p|4k, generate_audio, auto_fix, safety_tolerance. No negative_prompt/seed on ref-to-video. [checked]
- fal image-to-video: aspect auto|16:9|9:16 (auto crops non-16:9/9:16 images), image >=720p. [checked]
- fal extend-video: input must be Veo-created video 720p/1080p, 16:9 or 9:16; extends up to 30s total per header; default 7s. [checked]
- Gemini Omni docs (ai.google.dev/gemini-api/docs/omni) [checked][official]: ref images no max stated (example 6, IMAGE_REF_0..5), up to 3 ref videos <=3s, aspect 16:9 & 9:16, res 360p/720p/1080p(upscaled)/4K(upscaled), <FIRST_FRAME>/<LAST_FRAME> supported, extension 3-10s per turn up to 40s, SynthID watermark, extension/editing of uploaded videos unavailable in EEA/CH/UK.
- fal Gemini Omni guide (https://fal.ai/learn/tools/how-to-use-gemini-omni-flash-1-1) [checked][official]: endpoints google/gemini-omni-flash/v1.1/{text-to-video,image-to-video,edit,reference-to-video}; 360p $0.03/s, 720p $0.10, 1080p $0.15, 4k $0.30; same across endpoints; no separate audio charge.
- Veo 4: no evidence (aireiter 2026, third-party, says Google has not announced). [checked][third-party]
- Quality note: Artificial Analysis I2V board lists Gemini Omni Flash 1.1 at Elo 1046, rank 14 (see section 7).

### 2. Kling
- Kling v3 elements (fal-ai/kling-video/v3/{pro,standard}/image-to-video): elements = list of KlingV3ComboElementInput {frontal_image_url, reference_image_urls (1-3, >=1 required), video_url (only ONE video element per request), voice_id}; referenced in prompt as @Element1, @Element2... No stated max element count. [checked][official] https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api
- v3 i2v schema has NO aspect_ratio field; output ratio presumably follows start_image_url but fal pages do not say so. [checked; inference]. Start image constraints for O1/v4: min 300x300, ratio 0.40-2.50 (so 9:16 = 0.5625 is inside). 
- Kling O3 reference-to-video: image_urls (@ImageN style/appearance), elements (@ElementN), start/end image, aspect 16:9/9:16/1:1, duration 3-15, "combined total of elements plus reference images is capped at 4 when using video". Pro $0.112 off/$0.14 on; Standard $0.084/$0.112. [checked][official]
- Kling O1 reference-to-video: "Maximum 7 total (elements + reference images + start image)"; 3-10s; aspect 16:9/9:16/1:1; $0.112/s. O1 i2v: prompt refs @Image1 start frame, @Image2 end frame. [checked][official]
- Kling 4.0 (launch 2026-10-15; fal API opened staged from 2026-10-21 per aireiter [third-party]): fal kling/v4/reference-to-video [checked][official]: image_urls <=10, video_urls <=5, elements <=7 (<=3 video elements, <=3 voices), middle_image_urls <=8, 3-30s, 720p/1080p (default 1080p!), aspect auto/16:9/9:16/1:1/21:9; $0.157/s 720p, $0.235/s 1080p; video refs $0.094/$0.141 billed input+output (min 2x output). kling/v4/image-to-video: start/middle/end images, no elements/aspect field listed.
- Kling 1.6 elements legacy: up to 4 input_image_urls, 5/10s, 16:9|9:16|1:1, $0.098/s. [checked][official]
- Kling 2.6 Pro i2v has end_image_url but no elements; 5/10s; $0.07/s no audio, $0.14 audio. [checked][official]
- Official Kling API docs (kling.ai/document-api) are JS-rendered; WebFetch returned empty. Search snippet [snippet][third-party/mirror]: image_tail <=10MB, min 300px; Kling 3.0 image-generation takes up to 4 subject reference images; Omni endpoint up to 7 ref images with @image_N syntax. Not verified against official.

### 3. MiniMax Hailuo
- Hailuo 02 Std/Pro i2v support end_image_url; Std durations 6|10 s, 512P|768P. Hailuo 2.3 (released 2025-10-28 per fal blog) Std/Pro/Fast i2v: first frame only (no end frame field), Std 6|10s. None of the Hailuo 02/2.3 fal schemas expose aspect_ratio => output follows input image (inferred; not stated). [checked][official] blog: https://blog.fal.ai/minimax-hailuo-2-3-is-now-available-on-fal/
- S2V-01 successor: fal-ai/minimax/video-01-subject-reference (single subject_reference_image_url, $0.50/video) is the old (video-01) generation; no 2.x equivalent found. [checked][official]
- "Hailuo 3 / H3" DOES exist: fal learn page dated 2026-09-01 says MiniMax H3 (open weights; base) and H3 Max (post-trained by fal Research from H3 base; 480P & 768P native) both on fal, T2V/I2V/R2V endpoints. 24 FPS, native audio, 5-15 s (H3), commercial use allowed per fal terms. https://fal.ai/learn/devs/minimax-h3-vs-minimax-h3-max [checked][official]. Release July 2026 [third-party: gradually.ai; unverified].
- H3 Max ref-to-video: up to 9 ref images, 3 ref videos (2-15s each, <=15s combined), 3 audio, total <=12 files; first/middle/end frame fields; aspect adaptive/21:9/16:9/4:3/1:1/3:4/9:16; duration 0.92-15 s; res 480P/768P/1080P(refined from 768P); prompt_expansion_mode required. Price $0.05/0.08/0.16 per s; reference tokens: 4096 included, +$0.02/1k; square 1024^2 image = 1024 tokens. fal.ai/models/minimax/h3-max/reference-to-video/llms.txt [checked][official]. (H3 Max Turbo: minimax/h3-max-turbo/reference-to-video, $0.05/0.08/0.16 and $0.016/1k tokens per its page - listed "New".)
- H3 Max i2v price promo: through Oct 31 35% off, Nov 1-15 30% off, from Nov 16 standard ($0.05/$0.08/$0.16). [checked][official]
- Scenario says "H3 Max caps at 768P" and "all Hailuo models limited to 10 s" - contradicts fal's 15 s; treat Scenario as stale/different provider. [checked][third-party]

### 4. Other fal models
- Seedance 2.0 ref-to-video: 9 imgs/3 vids/3 audio, total 12, 9:16 yes, 4-15 s; token billing (tokens = H*W*dur*24/1024; $0.014/1k); per-second quoted on the i2v page: 720p $0.3034, 1080p $0.682. [checked][official]. Seedance 2.5 US: 30 imgs/10 vids/10 audio (50 total), 4-30 s, ~$0.47/s 720p. [checked][official] Third-party (Segmind blog) alleges fal charges ~95% more per token than Segmind [snippet].
- Vidu Q2 Pro ref-to-video: <=7 images (4 if videos), 1-8 s, 540/720/1080p, 9:16 ok; page's price list inconsistent. Vidu Q1: 7 imgs, $0.40/5s. [checked][official]. Third-party review (neural4d/higgsfield) says Vidu identity drift appears within 5 s on multi-shot [snippet, vendor, low weight].
- Wan 2.7 ref-to-video: fal page markets character consistency; $0.10/s; 2-10s; 9:16; no max ref count stated. Wan 3.0: 10 imgs, 5 vids; $0.05/0.10/0.20 per s at 480/720/1080p, up to 30 s. [checked][official]
- Wan 2.2 A14B i2v LoRA endpoint: `loras` param, end_image_url, 9:16, $0.10/s. [checked][official]
- Seedance 1 Lite ref-to-video is deprecated (rerouted to Grok Imagine Video). [checked]

### 5. Video LoRA training on fal
- Wan trainer fal-ai/wan-trainer: $0.005/step, default 400 steps (~$2), 100-20,000 steps; dataset zip of images AND/OR videos (>=10 files); time not stated. [checked][official]
- Wan 2.2 trainer fal-ai/wan-22-trainer: $0.004/step (min 100 steps), default 400 steps (~$1.60); images/videos. [checked][official]
- Hunyuan video LoRA trainer: could not fetch (llms.txt 404; id may differ) - UNVERIFIED.
- MiniMax H3 LoRA trainers: minimax/h3/t2v/trainer (~$0.005/step per search snippet [snippet]), minimax/h3/i2v/trainer ($0.01/step, default 2000 steps => $20), minimax/h3/ref2va/trainer ($0.015/step => $30 at 2000), minimax/h3/flf2v/trainer (price not fetched). Videos ONLY in dataset (images or mixed rejected), >=10 clips, best 50-200 clips, 3-15 s, exactly 24 fps; time ~1.5 h (2000 steps t2v) to 2.5 h (5000 steps); inference via minimax/h3/{text-to-video,image-to-video}/lora ($0.0625-0.20/s). Guide's examples focus on style adapters, not character identity. https://fal.ai/learn/devs/how-to-train-a-lora-for-minimax-h3 + trainer llms.txt [checked][official]
- Implication: a character LoRA for video would need video clips of the character (we only have AI storyboard stills) - Wan trainers accept images, H3 trainers do not.

### 6. First/last-frame chaining
- Vendor/third-party only. invideo FAQs (marketing) say last-frame chaining gives the model one still so camera/lighting/layout drift; recommend reference-to-video with locked character+location refs instead; HackerNoon article: errors compound because extension feeds the model its own generated frame; export last frame at full resolution, generate 2-3 variants and pick closest to reference sheet. Sogni docs describe start/end frames as helping smoother transitions/identity. [snippet][third-party] URLs: https://invideo.io/faq/how-do-you-fix-character-drift-when-chaining-ai-video/ ; https://hackernoon.com/how-to-extend-an-ai-generated-video-clip-past-its-length-limit-without-the-drift ; https://docs.sogni.ai/sogni-studio/creating-videos/video-create-mode/start-and-end-frames
- No official guidance found from fal/Google/Kling. Our product's design (each shot = i2v from its own storyboard image) already avoids chaining; end_image_url (Kling v3/O3/v4, Veo FLF, H3, Seedance 2.0, Gemini Omni) can pin the next shot's storyboard frame as the end frame if continuous motion is wanted.

### 7. Independent quality evidence
- Artificial Analysis I2V leaderboard (AA-Video-I2V v2.1, with audio, undated "Updated"; page opened 2026-11-03): 1 Seedance 2.5 (1153), 2 Utopai X, 3 Seedance 2.0 (1136), 4 MiniMax H3 768p (1128), 5 Hyperflow H3, 8 MiniMax H3 Max (1117), 9 Wan 3.0 (1111), 14 Gemini Omni Flash 1.1 (1046). Kling 3.0 1080p Pro is the fixed 1000 anchor; CI ~ +/-16-19. Kling 3.0 Pro is not shown in the top 15 (anchor=1000, so below #15 at 1037 by definition). Veo 3.1 not in top 15. Measures overall preference only - NOT identity/consistency. https://artificialanalysis.ai/video/leaderboard/image-to-video [checked][third-party]
- No controlled head-to-head of subject consistency across Veo/Kling/Hailuo/Seedance found. Only vendor-affiliated blogs (Higgsfield, Atlas Cloud, Neural4D) with unsourced numbers (e.g. "Kling 3.0 identity drift <10% vs Kling 2.6 >50%") - do not rely. [snippet][third-party]
- Google & fal pages claim identity consistency for Ingredients-to-Video and Gemini Omni reference mode; these are vendor claims. [checked][official]

## GAPS / UNVERIFIED
- Official Kling dev docs (kling.ai/document-api) not readable; whether Kling v3/O3 i2v output follows the start image aspect (9:16) is inferred (no aspect field in fal schema). Needs a 1-call test or the fal OpenAPI schema (https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=...).
- Hailuo 02/2.3 aspect ratio behavior likewise inferred; 2.3 Pro/Fast Pro durations not in fal schema.
- fal Veo ref-to-video deprecation (2026-11-17): llms.txt and /api pages disagree; confirm replacement/behavior.
- Veo 3.1 max reference image count on fal not stated (Google: 3). Seedance 2.0 per-second price derived from fal i2v page figures; ref-to-video page gives only tokens.
- fal Veo 3.1 Fast ref-to-video page lists only no-audio/audio rates for all resolutions; 4k rate for that endpoint unstated.
- Vidu Q2 price inconsistent; Vidu Q3, Seedance 2.5 non-US endpoint, Kling O3 4k etc. not checked.
- Hunyuan video LoRA trainer on fal not found; H3 flf2v trainer price not fetched.
- Kling 4.0 launch date from a single third-party blog (aireiter) - but fal endpoints kling/v4/* exist and were read directly.
- Gemini Omni on Gemini API: model id in Vertex doc is `gemini-omni-1.1-flash-preview` vs Gemini API `gemini-omni-1.1-flash`; doc inconsistent.
- Quality/consistency ranking: no independent evidence; recommend a small internal A/B (same 3 refs, 5 shots, 9:16) on Kling O3, H3 Max, Seedance 2.0, Omni Flash.
