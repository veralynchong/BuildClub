# A. Consistency features in AI canvas/creative tools (research notes)

Researcher: web-search subagent. Date of research: 2026-11-03.
Tags: [checked] = page opened with WebFetch; [snippet] = search result only; [vendor] = vendor page; [third-party] = review/news.
Note: WebFetch summarises pages with a small model, so "checked" = seen via that summary, not verbatim.

---------------------------------------------------------------------
## 1. Higgsfield (higgsfield.ai)

Higgsfield has FOUR separate consistency mechanisms (Soul ID, Elements, Marketing Studio avatars/product, Ads Studio brand kit). No feature literally named "Brand Studio".

### 1a. Soul ID (trained identity, real person, images)
- Steps: Soul -> "Train new character" -> upload photos -> start training -> name the character -> select it in the "Character" tab when generating. [checked][vendor] https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character (Help center; published Aug 1 2026, modified Sep 2 2026)
- Photos: 20 minimum, up to 80; include at least one full-height shot and recent photos; avoid sunglasses, heavy shadows, cropped faces, group shots. [checked][vendor] same URL
- Training time: "a few minutes". Credits cost not stated on that page. [checked][vendor] same URL
- Stored: a trained identity model (character) attached to the account, selectable by name. [checked][vendor] same URL (inference from steps: trained model)
- Reuse: image gen with Soul models -> pick in Character tab. Video: trained characters show up automatically as Elements for Seedance; type "@" or click "@ Elements" under the prompt, choose from "My Elements". Can also "Create Element" from a generated image in Assets. [checked][vendor] same URL
- CONFLICT: a third-party article (Oct 25 2026) says Soul ID = 5-20 images, ~10 min, 25 credits to train, works only with Soul 2.0 and Soul Cinema image models. Official help center says 20-80 photos and "a few minutes". Prefer the vendor page; the third-party numbers may be outdated or wrong. [checked][third-party] https://aiproductivity.ai/blog/higgsfield-consistent-ai-character/
- For invented (non-real) characters Higgsfield's guidance is: use AI Influencer studio, then train Soul ID on the portraits if identity lock is needed. [snippet][third-party-ish] search results for "Higgsfield Soul ID"
- Changelog: "Oct 2, 2026 AI Influencer: create a character from scratch, from a reference, or from your own photo" (built-in Character Builder). [checked][vendor] https://higgsfield.ai/changelog

### 1b. Elements (saved character / location / prop / outfit; images + video)
- Changelog Feb 24 2026, Elements: "characters, locations, outfits, and props are saved once and called in any prompt with @." [checked][vendor] https://higgsfield.ai/changelog
- Cinema Studio 3.0 (Mar 19 2026): characters and locations from 2.5 can be reused. Cinema Studio 3.5 (Apr 13 2026): "Characters, locations, and props are created as assets scoped to the project, reusable elsewhere"; Elements replaced Image mode. Jun 7 2026: pull characters and locations into the "Describe your scene" prompt bar. Aug 23 2026: Projects in Supercomputer, uploaded images/videos become named Elements. [checked][vendor] changelog
- Cinema Studio 4.0 (Aug 12 2026): "up to 50 [references] per generation to lock a face, product, or style." Also listed in a search result: native 4K, AI Cast, reusable locations, team collaboration. [checked (changelog)][vendor]
- Nano Banana 2.1 (Oct 5 2026): "consistency for up to 4 characters and up to 10 objects." [checked][vendor] changelog
- Kling 4.0 (Oct 21 2026): up to 15 inputs incl. images, up to 5 videos, a voice reference, and Elements. [checked][vendor] changelog
- How to create (third-party skill files, unverified vs. live UI): Elements panel -> New Element -> choose type (Character/Location/Prop) -> upload reference image(s) -> name with @tag; a single front-facing portrait can be enough as anchor; free to create. [snippet][third-party] https://skills.sh/osidemedia/higgsfield-ai-prompt-skill/higgsfield-cinema ; https://aiproductivity.ai/blog/higgsfield-consistent-ai-character/ ([checked]: "saved reusable reference from one image, no credit cost; works in image models (Nano Banana Pro) and video models (Seedance 2.0, Kling 3.0, Cinema Studio)").
- Stored: a saved reference (image(s)) with a name/@tag. Reuse: @mention in prompt, or pick from My Elements. Works for images AND video.
- Seedance 2.5 reportedly accepts up to 50 multimodal references per generation. [snippet/checked via article][vendor+third-party] https://higgsfield.ai/es/blog/seedance-2-5-on-higgsfield-2026 (snippet), aiproductivity article.
- Known limits: face carries but voice does not; likeness slips on downturned faces/hard light; props change between cuts. [checked][third-party] aiproductivity article.
- No official help-center article on Elements was found (only changelog + third-party). The Academy lesson page (https://higgsfield.ai/academy/courses/blockbuster-4k/stage-2-building-character-location-and-prop-assets) loaded but had only a title (video lesson) [checked].

### 1c. Higgsfield Canvas (node canvas)
- Help center: every Higgsfield model is a node; reference nodes = upload images/audio or pull an existing generation from Assets; audio nodes attach to video nodes. Building/connecting nodes is free; credits charged only when a node generates; Unlimited plan access does not apply in Canvas. Real-time team collaboration via Share. [checked][vendor] https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-canvas (published Aug 1 2026, modified Sep 1 2026)
- Seedance nodes use connected reference images directly; the prompt should state each reference's role (main character, location, product) at the start. Kling: a connected image is a start frame, NOT a character reference; for character refs create an Element first and cite @element-name in prompt. [checked][vendor] same URL
- Search snippet claims "Soul ID characters, uploaded products, brand references, and past generations all drop in as nodes" - NOT confirmed on the fetched page. [snippet][vendor?] same URL family
- Canvas launch: changelog "Apr 30 2026, Higgsfield Canvas: boards are shared with a team in real time." [checked][vendor] changelog
- So Canvas reuse = wire a reference node into each generation node (visual), plus Elements via @tag.

### 1d. Marketing Studio (product + avatar + brand signals; images + video ads)
- Launch: changelog "Apr 6 2026, Marketing Studio: Avatar - your own photo or one generated in the tool"; "May 7 2026 Ad Reference". Third-party launch article dated Apr 14 2026 says powered by Seedance 2.0. [checked (changelog)][vendor]; [snippet][third-party] https://www.vo3ai.com/blog/higgsfield-marketing-studio-shakes-up-ai-video-ads-seamless-product-to-commercia-2026-04-14
- UI: paste a product URL (or choose an added product) or upload product images; pick an Avatar (gallery, an AI Influencer, own avatar, or create new); choose format. "Reusing an avatar keeps the same face across variations." [checked][vendor] https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-marketing-studio-to-create-video-ads (published Aug 1 2026, modified Oct 26 2026)
- Formats: images (Product shot, Ads, Posters, Marketplace) and videos (UGC, Motion, TikTok, Product Link ads); Ad Reference recreates a reference ad structure with your product. Credits shown on button before confirming. Through MCP only a smaller set of presets. URL extraction can fail. [checked][vendor] same URL
- Blog (Aug 18 2026): 20 avatar templates; credits: 8s 720p video 47.62 credits (~$2.38), 15s 89.2, Product Shot 2K 1.5, Poster 2K 7.5; videos up to 15 s. The blog itself says nothing about a consistency mechanism. [checked][vendor] https://higgsfield.ai/blog/new-marketing-studio-higgsfield
- The help-center page does not describe a brand kit (a search snippet claimed it extracts logo/colors/fonts from URL, but the fetched page did not confirm this). [checked]. A separate snippet says the CLI page claims "brand kit loads automatically with every generation when Marketing Studio is connected to Claude/MCP". [snippet][vendor] https://higgsfield.ai/cli (not opened).

### 1e. Ads Studio (brand kit; static image ads only)  <-- closest to a "brand kit"
- Launch: blog metadata Oct 1 2026; changelog "Sep 30 2026 Ads Studio: set your logo, colors, tone of voice, audience, and selling points once." A competitor blog says October 2026. [checked][vendor] https://higgsfield.ai/blog/higgsfield-ads-studio ; https://higgsfield.ai/changelog
- Stored in brand kit: logo, color palette (main + hex codes), display & body fonts, tone of voice, target audience, aesthetics, description, selling points, social profiles. [checked][vendor] blog
- UI: paste website URL -> "Create my brand" -> review/correct; OR "Create brand kit manually". Reuse: saved kit applies to new batches; "Mention a product" in chat, say how many ads and the angle. Up to 20 ads per product per run. [checked][vendor] blog
- Static image ads ONLY, no video (pointed to Marketing Studio for video). 4 credits per ad (~$0.05/credit). [checked][vendor] blog
- Oct 6 2026 Ad Multiplier: change product, cast, location, script, hook, or CTA across variants. [checked][vendor] changelog

### 1f. Other Higgsfield items
- Soul 2.0 Moodboards, Soul Reference, Soul Hex, Soul Photodump (Feb 26 2026): style/colour/photo-set features that work with Soul ID. [checked][vendor] changelog
- Plan pricing quoted by a third-party (Oct 2026): Starter $19/270 credits, Plus $59/1200, Ultra $129/3000. [checked][third-party] aiproductivity article. Higgsfield terms reportedly allow using inputs/outputs for model training (except Enterprise) - same source, unverified.

---------------------------------------------------------------------
## 2. Runway (runwayml.com, now runway.com)

### 2a. Gen-4 Image References (the core "same character/location" feature)
- Where: Image tab in Tool mode, References toggle. Select up to 3 active References per generation. [snippet][vendor] https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References (WebFetch returned 403; details from search snippet; the article itself appears old, ~552 days per snippet, so may predate current UI)
- Uploaded images are session-only by default. Hover and use the "tag to save" option, enter a name -> saved Reference; call it with "@name" in the prompt (autocomplete). Saved refs can be shared with workspace members. [snippet][vendor] same URL
- Older Academy guidance: could also say "image 1 / image 2" by upload order; References mainly supports character and location preservation. [snippet][vendor] https://academy.runwayml.com/gen4/gen4-references (redirects to the help article above)
- Stored: reference images with a text tag (no training). Reuse: @mention. Output is images (Gen-4 Image); images can then go to image-to-video (Gen-4/4.5). Reference feature date: ~May 2025 per third-party; not verified. [snippet][third-party] search results
- Per Scenario (third-party API reseller) docs, as of Dec 2025 Gen-4 References was reachable via the API only: that is about Scenario, not Runway UI. [snippet] https://help.scenario.com/articles/6803483730-runway-gen-4-references

### 2b. 2026 changelog (checked) https://runway.com/changelog [checked][vendor]
- Brand Kits: Aug 11 2026 "Agent sessions now live inside Projects... Your Project's assets and Brand Kits are instantly accessible from inside the session"; Sep 10 2026 "Agent can now create and edit Brand Kits for you, right in the conversation"; Sep 22 2026 "Agents in Runway MCP can now find your Brand Kits and use those assets as references."
- Brand Kit setup (help): Brand section of Dashboard -> Create your first Kit -> name -> editing page; suggested contents logos, colors, fonts, backgrounds, product photos; kit types: Company brand, Product marketing, Storytelling. [snippet][vendor] https://help.runwayml.com/hc/en-us/articles/47057921993491-Brand-Kits-for-Enterprises (403 on fetch). Whether kit colors/fonts are auto-applied to generations: NOT documented in what I could see. Per changelog, kit assets are used "as references" by the agent.
- Runway Characters (Mar 9 2026): real-time conversational avatars from a single image; this is an interactive-agent product, NOT shot-to-shot consistency. [checked (changelog)] + [snippet] https://runwayml.com/news/engineering/building-runway-characters
- Reference inputs in newer models: Seedream 5.0 up to 14 refs (Jul 15 2026), Nano Banana 2 Lite up to 14 refs (Jul 10), Seedance 2.5 first/last frame and reference image (Aug 11), Wan 3.0 multi image/video/audio refs (Aug 24). Gen-4.5 image-to-video (Jan 21 2026). [checked][vendor] changelog
- Aleph 2.0 + Edit Studio (May 21 2026): video-to-video editing/restyle, not a saved-identity feature. [checked][vendor] changelog
- Workflows (node graphs; Jul-Oct 2026), App Studio (Oct 26 2026: builds apps "with Runway's models, your brand and your files"). [checked/snippet][vendor]
- Elements: no 2026 changelog mention. Act-Two: help article exists about multi-character dialogue (performance transfer, not identity library) [snippet] https://help.runwayml.com/hc/en-us/articles/41748090660499-Creating-Multi-Character-Dialogues-with-Act-Two

---------------------------------------------------------------------
## 3. Krea (krea.ai)

### 3a. Train (custom LoRA: style / character / object / brand visuals / product catalogs)
- Needs at least 3 images of the same style/character/object; 10-30 recommended. Page says trainable items include custom styles, characters, objects, brand visuals, product catalogs. [checked][vendor] https://www.krea.ai/docs/user-guide/features/training
- Reuse: each trained style gets a unique style code; apply to Flux, Edit, Enhancer outputs; usable as style reference in Flux, guidance in Edit mode, style influence in Enhancer, and "as an aesthetic for video generation". Training uses images only. [checked][vendor] same URL
- Krea 2 LoRA training (May 21 2026): krea.ai/train -> "Train new LoRA" -> add images -> choose Krea 2 Medium or Large -> Steps (default fine) -> auto-captions (editable) -> when finished, find in Train library or LoRA button in Image tool with Krea 2 selected; adjust strength; multiple LoRAs at once. Private by default. Beta for Max and Business subscribers at launch; changelog says "Krea 2 LoRAs now available to everyone" (Jun 1 2026). Price/time not stated (estimated compute shown before submit). [checked][vendor] https://www.krea.ai/blog/krea-2-lora-training ; https://www.krea.ai/docs/changelog
- Changelog notes: Oct 31 2026 no more style training on Flux Realtime (use flux_dev); Oct 24 2026 Train adds Audio (voice clone); Oct 16 2026 style references/LoRAs not yet supported for Krea 3; Oct 26 2026 Krea 3 character LoRA trainings fixed (so character LoRA training exists for Krea 3). [checked][vendor] changelog
- API: max_train_steps (example 500). [snippet][vendor] https://docs.krea.ai/developers/tutorials/train-image-style

### 3b. Elements (Seedance Studio) - Krea's closest to Higgsfield Elements
- Sep 9 2026: "Elements let you save a character, location, or object once and reuse it across generations"; each element bundles up to 8 reference images with written guidelines under one @tag; created in Seedance Studio (desktop workspace launched Aug 27 2026); "coming soon to all other Krea tools". Seedance Studio also has "Custom looks": uploaded reference image turned into reusable direction notes. [checked][vendor] https://www.krea.ai/docs/changelog
- Nodes: docs page https://www.krea.ai/docs/user-guide/features/nodes exists; I could not open it (redirect only). A search snippet says nodes table lists Veo 3.1 with reference-image support and start/end image inputs; it does not say if video nodes accept trained LoRAs. [snippet][vendor]
- No Krea feature called "Brand Studio"; changelog has no "brand" entries. [checked]

---------------------------------------------------------------------
## 4. Flora (flora.ai, formerly FloraFauna)
- Official docs: "Styles (deprecated)". Wording: "The Styles feature is currently unavailable and has been deprecated for now"; "Stay tuned for future updates with improved style features"; you can still upload LoRAs to supported models such as Flux Dev. When active: upload reference images, click Create Style, wait for notification, style appears in left toolbar and above the image node; min 8 images recommended; style LoRAs fine-tuned on Flux Dev only (other models get a text summary of the style). No date on page. [checked][vendor] https://docs.flora.ai/faqs-how-to.../styles
- Third-party reviews mention "Style DNA" (15-20 images, shareable team kits) - conflicts with official 8-image minimum, and the name appears only in third-party sources; could be a marketing label or outdated. [snippet][third-party] https://www.weshop.ai/blog/flora-ai-review-2026-the-new-standard-for-aesthetic-design ; https://hedra.com/alternatives/flora-ai
- Style reference docs page exists: https://floraai.gitbook.io/docs/how-to.../style-reference [snippet] (not opened).
- "Fields": nothing found. No brand-kit feature found. OUTDATED RISK: high; verify in the app.

---------------------------------------------------------------------
## 5. Figma Weave (formerly Weavy)
- Figma blog (Apr 9 2026), five workflows: two reference images -> Image Describer node -> editable text description; Any LLM node writes a master style description; style then applied to new subjects; "adjust the influence of each reference independently"; ran through Flux 2 and Nano Banana models to test consistency. Style is reused as a text style definition/pipeline, not a trained model. [checked][vendor] https://www.figma.com/blog/five-figma-weave-workflows/
- Consistent-character solution page: define character once (reference images, style anchors, key attributes), connect to each generation node: "consistency is structural, not accidental"; teammates add new scene inputs without rebuilding character logic. Weave offers image, video, 3D models from multiple providers; no limits section; advanced features need paid plans; says nothing specific on video consistency. [checked][vendor] https://www.figma.com/solutions/ai-consistent-character-generator/
- "Transfer style" tool described in help center. [snippet][vendor] https://help.figma.com/hc/hi/articles/40779260614935
- Weave also exposes Kling Element node (used in workflow 5). [checked][vendor] five-workflows blog
- Brand/style: no saved "brand kit" object in Weave found; brand look is carried by workflow + reference nodes + text style description. Figma MCP has weave_* tools (weave_run_model, weave_find_model, etc.) available in this environment, not explored.

---------------------------------------------------------------------
## 6. Freepik (now rebranding to Magnific per site banners)
- Custom Characters: image generator -> Character -> New character; LoRA-based fine-tune; only with Flux and Mystic models; paid plans only. [snippet][vendor] https://in.freepik.com/ai/faq/custom-characters (403 on fetch); https://www.freepik.com/blog/custom-ai (403)
- Custom Styles: LoRA fine-tune; 8-25 reference images per IBTimes (third-party). [snippet][third-party] https://www.ibtimes.co.uk/freepik-review-why-top-design-agencies-choose-this-platform-1753114
- Pricing page (magnific.com/pricing, checked): training a custom character = 3,000 credits each; capacity Premium 80 characters, Premium+ 200, Pro Starter 500; available on all 3 paid plans. Images per character not stated; custom style not mentioned. [checked][vendor] https://www.magnific.com/pricing
- Brand Kit: "launched with Magnific One... produces images that follow your brand", included in all paid plans. [checked][vendor] https://www.magnific.com/pricing. Details of what the kit stores (third-party: brand colors, typography, 10-20 reference images) [snippet][third-party] https://flowith.io/blog/freepik-pikaso-2026-faq-commercial-license-image-rights-style-controls
- Spaces: launched ~Feb 25 2026 (third-party), shared node-style canvas for workflows; included in paid plans. [snippet][third-party] https://betanews.com/article/freepik-launches-freepik-spaces-to-power-real-time-ai-visual-creation-and-collaboration ; https://www.techradar.com/pro/software-services/the-5-key-takeaways-creative-teams-need-to-know-about-freepik-spaces . No official doc tying Custom Characters to Spaces nodes found.
- Video use of trained characters: not confirmed.

---------------------------------------------------------------------
## 7. OpenArt
- "Consistent Characters": create from ONE image or a text description (no training set required); then place in scenes, pose with 3D poser, image-to-video; first character free for subscribers. Launched ~Feb 2025 (Product Hunt, date inferred). Fine-grained trait editing not available at the time. [checked][third-party-vendor post] https://www.producthunt.com/p/openart/openart-consistent-characters
- Character 2.0: third-party blog (Mar 2026) says single image -> reusable character sheet, group scenes, video transitions; its numbers ("92% consistency") are unsourced marketing. [snippet][third-party] https://selfielabstudio.com/blog/openart-character-20-multi-scene-consistency-guide-20260307
- Third-party review (Jul 2 2026) says 300 credits = 1 consistent character creation; 150 credits = 1 One-Click Story. A community note describes training from ~10 images in 5-10 min. [snippet][third-party] https://aisotools.com/openart-review ; https://coconote.app/notes/029ef286-0388-424c-b0e9-cb0adb425115
- Story: One-Click Story takes a character plus a story idea and generates connected scenes. [snippet][third-party]
- No official OpenArt docs opened. Treat as unverified.

---------------------------------------------------------------------
## 8. Products literally called "Brand Studio" (or closest)
- Stability AI "Brand Studio" (announced Apr 8 2026; image-only): Brand Central = hub for Brand ID models, Campaigns, custom workflows. Brand ID models trained on photography style, color palette, design motifs, logo placement, composition; self-service for Enterprise or via Stability's applied research team (images needed/time not stated; a LinkedIn claim of 20-100 images is unverified). Campaigns built from creative mandates/guidelines uploaded as reference images, then one-click asset creation. Core plan free to try; Enterprise via sales. Routes to Stable Diffusion and third-party models (Nano Banana, Seedream). No video mentioned. [checked][vendor] https://stability.ai/news-updates/brand-studio-by-stability-ai-creative-production-platform-for-brands (says "April 8", no year) ; [checked][third-party] https://the-decoder.com/stability-ai-launches-brand-studio-for-brand-consistent-image-generation/ (April 8, 2026)
- Pencil (trypencil.com): has a "brand library"; help article says no direct connection between brand library and other model types (image/video/voiceover). Could not fetch (SSL error); from search snippet only. [snippet][vendor] https://help.trypencil.com/en/articles/12010889-how-do-pencil-s-ai-models-use-my-brand-library
- Higgsfield: no "Brand Studio"; closest = Ads Studio brand kit (1e) and Marketing Studio.
- Runway: Brand Kits (2b). Freepik/Magnific: Brand Kit (6). Krea, Flora, Figma Weave, OpenArt: none found.
- Searches for Typeface/Creatify/Topview/Pippit/Adobe/Canva "Brand Studio" returned nothing relevant (one combined query only; individual vendor searches not done).
- HeyGen, AI Studios (DeepBrain), Invideo market "brand kit" (logo/colors/fonts) for AI video, vendor marketing pages only. [snippet][vendor]

---------------------------------------------------------------------
## Cross-product patterns (my synthesis, inferred)
1. Three storage models: (a) trained model (Higgsfield Soul ID, Krea LoRA, Freepik Custom Character/Style, Stability Brand ID, Flora Styles-deprecated); (b) saved reference bundle with @tag (Higgsfield Elements, Runway saved References, Krea Elements up to 8 images); (c) structured brand-kit record (Higgsfield Ads Studio, Runway Brand Kits, Freepik/Magnific Brand Kit).
2. Reuse mechanism: @mention in prompt (Higgsfield, Runway, Krea Elements) or wiring a reference node into each generation node (Higgsfield Canvas, Figma Weave, Flora, Krea nodes).
3. The industry direction in 2026 is "Elements" (cheap, no training, works in video) over LoRA training; training survives for real-person likeness (Soul ID) and brand style.
4. Brand kits are mostly for static ads/images (Higgsfield Ads Studio is image-only; Stability Brand Studio is image-only); video consistency relies on Elements/references.

## Gaps / unverified
- Runway help articles returned 403; References details are from search snippets and may be outdated (article ~2025). Runway Gen-4 References launch date unverified (reported ~May 2025).
- Runway: unclear how Brand Kit assets are applied (colors/fonts) in manual (non-agent) generation.
- Higgsfield: no official help page for Elements; Soul ID credit cost and training time conflict between vendor and third-party (20-80 photos vs 5-20; "few minutes" vs ~10 min/25 credits). Higgsfield CLI page claim (brand kit auto-loads via MCP) not opened. Canvas "Soul ID/products/brand references as nodes" claim only from snippet.
- Krea: nodes doc page not opened; unclear whether trained LoRAs are accepted by video nodes (docs only say style can be "aesthetic for video generation"). Price/time of training not stated.
- Flora: Styles deprecated; "Style DNA" only in third-party; no official successor found; the Flora docs page has no dates.
- Freepik/Magnific: both FAQ pages 403; number of images for Custom Characters and training time not confirmed; Spaces integration with characters not confirmed.
- OpenArt: no official docs; all details third-party.
- Figma Weave: no saved brand/style object found; limits and credits not found.
- Pencil help page SSL error; "Brand Studio" for Adobe/Canva/Typeface/Jasper/Pippit/CapCut/Topview/Creatify/Arcads not individually searched.
