# B. Consistency features: Midjourney, Ideogram, Pika, Luma, Flow, Kling, Canva, Adobe, ad-video tools
Researched 2026-11-03. Tags: [checked] = opened with WebFetch; [snippet] = search result summary only; [vendor] official/marketing; [3p] third party.
Page failures: docs.midjourney.com (all articles) = HTTP 403; helpx.adobe.com train-custom-models = 403; canva.com/help brand-voice etc. only via search; businesswire = 403; heygen/ltx.io blog = parse error; ltx release notes = header overflow.

## Summary pattern (read first)
- GENERATION-TIME consistency (references / trained models): Midjourney (--sref, --oref/--edit, moodboards, --p), Ideogram (Character, Style ref, style codes), Pika (Scene Ingredients/Pikascenes), Luma (Ray3 character reference), Google Flow (Ingredients), Kling (Element Library + Subject Binding), Adobe Firefly Custom Models (trained), Stability Brand Studio (trained brand models), LTX Studio / Hedra (Elements incl. Brand Identity type).
- EDIT-TIME / TEMPLATE-TIME "brand kit" (logo/colour/font applied to layout, not to pixels of generated image): Canva Brand Kit, HeyGen Brand System, Creatify Brand Space, Topview brand kit; Canva is the one exception: a "Generate from photo" using a Brand Kit photo as style reference (images only, Dream Lab).
- Video-gen tools keep a subject via: reference images (Flow Ingredients, Kling Elements, Pika Ingredients, Luma char ref) or start/end frames (Flow Frames, Pikaframes, Luma keyframes, Dreamina).
- Avatar/UGC-ad tools keep an actor + product via a saved avatar in a library (Topview Product Avatar, Arcads custom actor, Creatify custom avatar, HeyGen digital twin/Avatar V), not via text.

---
## Midjourney
- Omni Reference (--oref, --ow): V7 only. Docs: "When using V8.X, use the Edit Model instead." Web: drag image into "Omni-reference" bin; Discord: --oref <url> --ow N. --ow range 0-1000, default 100; one reference image per prompt; costs ~2x GPU time; not compatible with Vary Region/Pan/Zoom Out. Announced 2025-05-01 [checked: https://updates.midjourney.com/omni-reference-oref/ "Omni-Reference --oref"; search summary of https://docs.midjourney.com/hc/en-us/articles/36285124473997 [snippet], vendor].
- Predecessor --cref (V6) replaced by --oref in V7 [snippet 3p].
- V8.1 default from 2026-06-11 (update post); post says "V7 omni-reference is available to use while we finish training the improved version for V8" and "Style references, personalization, and aesthetics remain consistent between V7 and V8.1." [checked: https://updates.midjourney.com/v8-1-is-now-the-default-model/ , vendor]
- V8.2 default 2026-07-24; V8.1 default 2026-06-10..07-23 (per guide, 3p, [checked: https://blakecrosley.com/guides/midjourney] - guide cites MJ docs/changelogs, not independently verified).
- Edit Model (--edit): opens to all 2026-08-27 [3p guide]; works on V8.1/V8.2; takes written instructions + up to 4 reference images; "replaces Omni Reference and Character Reference" [snippet of docs.midjourney.com Edit Model article; 403 on direct fetch]. Can be combined with Image Prompts, Style References, Moodboards, Personalization, --hd [snippet].
- Style reference (--sref): works V7, V8.1, V8.2; numeric style codes (legacy need --sv 4 / --sv 6 on V7); --sref random (Draft Mode adds 24 styles, 2026-06-25) [3p guide checked + docs search snippet]. Can mix with omni ref/image prompts/moodboards.
- Moodboards + Personalization (--p / --profile [id]): profile built from ratings (40 to start, ~200 stable, 2000 best) and/or moodboard images; multiple profiles; shareable code (e.g. --profile 2jrqbw6) [checked: https://updates.midjourney.com/profiles-and-moodboards/ (2024-12-16, vendor); snippet of docs "Personalization"]. V7 profiles work on V8.2; no Global V8 profile; V8 profiles not compatible with V7 [3p guide].
- Stored: image URLs / style code / profile id (preference model). No trained LoRA exposed.
- Video: V1 image-to-video launched 2025-06-18/19; 5s clips, extend +4s to 21s total; --motion low/high; HD 720p on Standard+ [3p guide; cometapi 3p]. Consistency for video = start image only. NO official doc found that --sref/--oref carry into video; one 3p claims SREF encodings keep palette (unverified).
- Limits: V8 sref/moodboard/--hd jobs were 4x cost at V8 alpha announcement (may be outdated) [snippet].

## Ideogram
- Character references (Ideogram 4.5): up to 5 reference images; reference by tag `@img_1` in prompt; "use the same reference images each time." Reference limits by model: 4.5=5; Nano Banana 2/Pro=10; GPT Image 2.0 etc=16; Ideogram 4.0/3.0=none. JPEG/PNG/WebP up to 25MB [checked: https://docs.ideogram.ai/using-ideogram/features-and-tools/reference-features , vendor].
- Style references (Ideogram 3.0): up to 10 style reference images under Advanced settings [same page checked]. (Older 2025 sources say up to 3 -> docs changed.)
- Saved Characters: Library > Characters > Create character: name + 1 image; reuse via "Use" -> opens "Ideogram 3.0 Character" app; character saved as reference; if app unavailable use 4.5 with multiple refs [checked: https://docs.ideogram.ai/organize-and-share/characters.md , vendor]. Ideogram Character first released 2025-07-29 [snippet 3p].
- Ideogram Styles: presets General/Realistic/Design/Auto + Random; each Random style has an 8-character Style code reusable in other prompts; announced 2025-09-04 [checked: https://testingcatalog.com/new-ideogram-styles-feature-brings-reusable-aesthetics-for-creators , 3p]; older Product Hunt note: turn Magic Prompt off for codes.
- Brand kit: none found. Video: none (images only).
- Model status confusion: 4.0 (2026-06-03 open weights per one 3p), 4.5 (precise edit, native 2K) [snippet 3p; conflicting].

## Pika
- No official Pika docs fetched (all via 3p). Treat as low confidence.
- Pika 2.0 (Dec 2024) "Scene Ingredients": upload images of character/object/location; Pikascenes combines multiple ingredient images; Pikaframes = keyframes (start/end, up to 5 images, chained transitions up to 25s in one 3p; 1-10s transition in others) [snippet 3p; https://dev.to/genra_ai/pika-25-complete-guide-features-pricing-honest-review-2026-56ce checked 3p].
- Cost (3p): Pikascenes ~15-25 credits/scene; Pikaframes 5 keyframes ~40-60 credits; plans Basic free 80 cr, Standard $8/700, Pro $28/2300, Fancy $76/6000.
- Same 3p article: consistent identity across separate clips "unreliable"; ok in a single clip. Video only. Pika 2.5 date not found.

## Luma Dream Machine / Ray
- Ray3 (2025-09-18) added character reference; Ray3 Modify (2025-12-18): video-to-video, character reference swaps actor look keeping performance; start/end keyframes in V2V [checked: https://techcrunch.com/2025/12/18/... (3p news); https://genra.ai/blog/luma-ray3-complete-guide-review (3p, Mar 2026)].
- Official guide [checked: https://lumalabs.ai/learning-hub/ray3-modify-user-guide , vendor]: 4 workflows (video+char ref; video+keyframes+char ref; keyframes+char ref; reference-video mode + char ref text-to-video). ONE character reference per workflow; up to 2 keyframes; input video max 10s (3p says 18s for Ray3.14 Modify); "use character" checkbox on keyframe card. Page dates conflict (Dec 12 2025 vs Aug 10 2026 metadata).
- Ray3.14 (2026-01-26): native 1080p, cheaper/faster, but does NOT support character reference or HDR/EXR (3p genra). Luma Agents 2026-03-05 (Uni-1; routes to Ray3.14, Veo 3, ElevenLabs; enterprise: Publicis, Adidas, Mazda) [3p]. "Ray3.2" mentioned in 1 snippet, unconfirmed.
- Stored: single reference image per job (no named library found). Video only. Plans: Plus $29.99 commercial use [3p].

## Google Flow (Veo / Gemini Omni)
- Ingredients to video: model menu > Video > Ingredients; add refs by drag, `@` search of project assets, or Add; describe how each should appear; plain/segmented bg recommended for subject/product; reuse = add the same images as ingredients each clip [checked: https://support.google.com/flow/answer/16353334 , vendor]. No numeric reference cap stated (3p says up to 3 subjects/locations/objects; old).
- Frames to video: first and/or last frame image; start/end frames web-only [checked: .../answer/16353334 and .../answer/16352836].
- Model matrix (checked https://support.google.com/flow/answer/16352836): Veo 3.1 Lite/Fast: Ingredients yes (8s only); Veo 3.1 Quality: ingredients NO; Gemini Omni Flash 1.1: ingredients yes, 4-10s clips, video-to-video edit up to 10s. Image models for frames/ingredients: Nano Banana Pro (default Ultra), Nano Banana 2 Lite (free default), Nano Banana 2.1.
- Assets: asset types filter includes "Characters" and "Scenes"; collections (folders) [checked: .../answer/16935308]. Save video frame as ingredient/start/end frame [checked: .../answer/16935718]. No dedicated "saved ingredients library across projects" documented.
- Scenebuilder: arrange/reorder/trim clips, download scene; Extend only for Veo-generated clips [checked: .../answer/16935718].
- Avatar: "@me" in prompt after QR-scan phone capture of own likeness (not EEA/UK/CH) [checked: .../answer/17102997]. Voice: save voice, reference `@Voice: name` (Omni Flash) .
- Dates: pages only show (c)2026; earlier Google tips post said ingredients Veo 2 only; Veo 3.1 added ingredients Oct 2025 [snippet 3p].

## Kling (consumer UI)
- Element Library (Kling Omni / Video 3.0 Omni): guide posted 2026-02-05 [checked: https://kling.ai/quickstart/klingai-element-library-3-user-guide , vendor].
  - Element types: characters, animals, props, costumes/accessories, scenes, effects, others; auto-detect on upload.
  - Create: Omni tool "Create Element", or Assets > Elements. Multi-image element = main + 1-3 extra images (2-4 total); or video character element (3-8s clip, or in-app recording). Name unique, description manual or AI Auto-Description. O1 Image model can auto-generate extra views from one image (3 free/day members, 5 credits otherwise).
  - Voice binding on character elements (5-30s audio or Voice Library) in 3.0 Omni.
  - Reuse: type `@` in Omni prompt / "Add from Element Library"; Video 3.0 start/end-frame mode: bind elements that appear in start frame, up to 3 extra bound elements.
  - Limits per generation: Video 3.0 Omni/O1 up to 7 elements+images (4 if a video is input); Image 3.0 Omni/O1 up to 10. Library size: non-member 30, Standard 50, Pro/Premier 150, Ultra 500. Creating element free. Elements cannot be shared to Explore.
  - Images AND video.
- Subject Binding (Kling 3.0): toggle "Bind Subject to Enhance Consistency"; builds "Visual DNA" (face, hair, clothing); up to 6 cuts in one 15s generation; blog 2026-06-26 [checked: https://kling.ai/blog/kling-3-subject-binding-character-consistency , vendor, performance claims unverified]. Kling 3.0 launch ~2026-02-04 [snippet 3p]. O1 (Dec 2025) introduced Element concept: 1-7 refs [snippet].

## Canva
- Brand Kit stores: logos, colours, fonts, photos/illustrations/icons/graphics, Brand Voice, brand templates, charts, guidelines pages, linked folders [checked: https://www.canva.com/help/find-and-manage-brand-assets/ , https://www.canva.com/help/brand-kit-best-practices/ , vendor]. Plans: Pro, Teams, Business, Enterprise, Education, Nonprofit.
- AI use: Canva AI references Brand Templates in the kit to generate on-brand DESIGNS (Magic Design); keeps locked template elements, keeps logos by default, follows brand colours/fonts; admin "Brand Controls" restrict to approved colours/fonts [checked: find-and-manage-brand-assets].
- On-brand images: Brand > Brand Kit > Assets > image menu > "Generate from photo" - a Brand Kit PHOTO is the style reference; up to 4 images/gen; saved back to Brand Kit; Dream Lab (Leonardo.ai) engine; counts toward monthly AI allowance; owners/admins/brand designers only in teams; IMAGES ONLY [checked: https://www.canva.com/help/create-onbrand-images-with-ai/ , vendor]. Colours/fonts not mentioned for image generation.
- Brand Voice: 500-char guideline text used by Magic Write for text [snippet of https://www.canva.com/help/brand-voice/].
- Newsroom (undated, (c)2026): "Brand system"; Canva AI generates designs reflecting colours/fonts/tone; Canva Grow scans website for brand; "Ask @Canva"; Style Match; Magic Background [checked: https://www.canva.com/newsroom/news/creative-operating-system/ , vendor]. Canva AI 2.0 launched 2026-04-16 at Canva Create (Brand Intelligence, conversational design) [snippet 3p; businesswire 403].
- Feb 2026: Canva brand kits integrated into ChatGPT and Claude [snippet 3p: mb.com.ph 2026-02-10; 403 on fetch]; newsroom confirms "Canva Design Model available inside ChatGPT and Claude" [checked].
- Conclusion: kit = edit-time/layout-level; only the photo-as-style-reference feature touches generation pixels.

## Adobe Firefly / Adobe business
- Firefly Custom Models: public beta 2026-03-19 (9to5mac) / Adobe pr 2026-03-20 (eWeek) [checked both, 3p].
  - Types: Illustration style, Photographic style, Character. Upload 10-30 JPG/PNG (>=1000px wide; training score 85+ recommended; consistent aspect ratio/palette); auto captions editable; character models need a Model Concept name in captions. Training minutes to hours, email on finish; cannot retrain (create new). 500 credits per training; 20 credits per generation. Paid individual CC plans and CC Pro/Pro Plus teams; sharing by email/link (recipients can generate, not edit); private by default; not used to train Firefly base [checked: https://www.adobe.com/gr_en/products/firefly/features/custom-models.html , vendor].
  - Images only (page does not mention video; training accepts images only).
- Enterprise: Firefly Custom Models + Firefly Foundry (Adobe builds proprietary models trained on a company's IP; image, video, audio, vector, 3D), Firefly Design Intelligence / StyleIDs co-created with Coca-Cola; announced at MAX 2025-10-28 [checked: https://www.constellationr.com/insights/news/adobe-expand-genstudio-launches-custom-firefly-models-firefly-foundry , 3p]. GenStudio for Performance Marketing: brand guidelines page not found in sources; Content Production Agent (beta).
- Style Reference / Structure Reference in Firefly (and Express eyedropper): Structure ref keeps layout (announced 2024-03-26) [snippet; Adobe blog]. Firefly "Style Kits": presets that save settings incl. style/structure refs, lockable, shareable (person/org/link) [snippet of Adobe Experience League; unconfirmed current].
- Firefly app aggregates 30+ partner models (Veo 3.1, Runway Gen-4.5, Kling 2.5 Turbo) and Image Model 5 [checked eWeek 3p].
- Adobe Express brand kit: not verified in this research.

## Stability AI "Brand Studio" (literal name match)
- Launched 2026-04-08: Brand Central (train brand-specific image models, campaign templates), Producer Mode, curated model routing, Precision Inpainting; free Core tier and paid Enterprise; no video mentioned [checked: https://the-decoder.com/stability-ai-launches-brand-studio-for-brand-consistent-image-generation/ (3p); KB https://kb.stability.ai/knowledge-base/getting-started-with-brand-studio-from-first-process-to-final-image only says Library saves settings for reuse]. Training image count/time not found.

## HeyGen
- Brand System (was Brand Kit): paste company URL -> extracts logo, typography, colours; or manual; stores logos/images/videos/fonts/colours; available in AI Studio, Templates, Video Agent; updates apply to FUTURE projects only; page does not say how avatars are handled [checked: https://www.heygen.com/academy/brand-kit/how-to-create-your-brand-kit ; https://www.heygen.com/blog/heygen-march-2026-release (March 2026, vendor)]. Brand Glossary for pronunciation/translation [checked: https://www.heygen.com/academy/brand-kit].
- Video Agent: 100+ visual styles (typography, colour, motion).
- Avatar V (Apr 2026, dates conflict 8 vs 22 Apr): digital twin built from ~15s footage; help centre says choose Avatar V when consistency is priority [snippet 3p/vendor help]. No official link between Brand System and avatar.

## LTX Studio
- Elements hub: Characters, Objects, Locations, Other; create from photo upload, text prompt or AI; tag with @ in prompts; storyboard casting extracts recurring characters [snippet, vendor blog + 3p]. Official steps/limits not retrieved (ltx.io pages errored). Images+video.

## Hedra
- Elements library: Library > Elements > Create element; upload reference images (up to 10 per Element, PNG/JPG/WebP, 10MB each); types Character, Environment, Style, Outfit, Brand Identity; stable @name reuse in prompts; no cap on element count stated [checked: https://www.hedra.com/docs/pages/app/content-creation/create-element.md , vendor]. Character-3 animates a master image (face stable, lipsync changes) [snippet vendor blog].

## Creatify
- Brand Space: stores primary/secondary logos, colour palette, fonts, optional voice/style notes; applied automatically to generated content (graphics, ad creatives); slot depends on plan; video vs image unspecified [checked: https://help.creatify.ai/en/articles/12576512-brand-spaces , vendor]. Enterprise page lists "Brand Kit".
- Custom avatar: from single image or video (help article); DYOA adds product photo + brand logo, branded clothing (Pro+); Starter 1 / Pro 3 custom avatars (3p/marketing, unverified) [checked: https://help.creatify.ai/en/articles/12619545-create-your-own-avatar ; snippets].

## Arcads
- Product in video (2026-01-06 vendor article): generate actor image holding the product using product image as reference in Image Generation tool -> click "Actor" to make talking actor; reuse image as Veo 3.1 start frame to keep actor+scene; Sora 2 Pro product-only references; Talking Actor up to ~40-60s, Veo 10s, Sora 12s [checked: https://help.arcads.ai/en/articles/13281882-how-to-show-a-product-in-a-video , vendor]. Custom actor from a headshot; Clone Yourself; custom actors private to workspace; Pro+ for custom actors [snippet vendor]. Brand kit: unconfirmed (conflicting 3p).

## Topview
- Product Avatar ("Produce Avatar"): pick gesture by product size, upload product image, drag into hands (auto bg removal or manual mask), generates 3 previews, pick one -> auto-saved to avatar library -> reuse in Video Avatar tool/Create Video [checked: https://www.topview.ai/guides/how-to-create-your-product-avatar-with-topview , vendor, age 200-600 days]. "Design My Avatar" supports a fixed "digital human IP" for brands [snippet vendor]. Brand kit stores logos/colours/fonts/voices/avatars per 3p; official detail not found.

## Pippit (ByteDance/CapCut)
- Pre-designed characters, custom avatar from uploaded image/video ("coming soon" in one FAQ vs available elsewhere), Prompt to Avatar; no brand-kit detail on the page; one blog says single brand kit when adapting per platform [checked: https://www.pippit.ai/tools/ai-character-generator , vendor; snippet 3p]. Low confidence.

## Dreamina (ByteDance) [bonus]
- Consistency page 2026-06-24: reference images, start/end frames, product photos; Seedance 2.5/2.0 models; admits logo/packaging must be checked manually; no numeric limits [checked: https://dreamina.capcut.com/ai-video/ai-video-generator-for-more-consistent-results , vendor].

## Captions / Mirage
- Captions rebranded Mirage 2025-09; AI Twin (avatar from short real footage); Avatar X (July 2026) claims recognisable likeness across scripts and outfit/background change [snippet 3p/TechCrunch]. No brand kit found.

---
## Gaps / unverified
- Midjourney: all docs.midjourney.com pages returned 403; Edit Model, V8.2 details, and "--sref/--oref in video" rely on snippets or one 3p guide (blakecrosley.com, 162k chars, only first 100k read). Whether style/omni refs influence MJ video: not documented anywhere found.
- Ideogram: style-code behaviour on 4.x unconfirmed; the style doc path 404'd; no plan limits; docs say style refs up to 10 (3.0) vs 3 in 2025 articles.
- Pika: no official source at all; Pika 2.5 date, Ingredients current status unverified.
- Luma: "Ray3.2" and any Feb-Oct 2026 character-reference updates not confirmed; Modify input limit 10s (official) vs 18s (3p). Help centre freshdesk 404.
- Flow: numeric ingredient cap not stated; "saved ingredients across projects" not documented; Scenebuilder saved state; credit costs.
- Canva: whether Brand Kit colours/fonts affect generated image pixels: no; Canva AI 2.0 official page (businesswire) 403; Magic Media/Video brand usage not confirmed.
- Adobe: Express brand kit, GenStudio for Performance Marketing brand guidelines, Foundry pricing/training sizes not verified; Style Kits only from snippet.
- HeyGen: link between Brand System and avatar looks not documented; Avatar V launch date conflict.
- LTX, Captions/Mirage, Pippit, Topview brand kit, Arcads brand kit: mostly vendor/3p marketing; limits unknown.
- Stability Brand Studio: model training image count/time/price and video support unknown.
