# AI auto-edit SaaS for short-form vertical video (state as of 2026-11-11)

Access date for every URL below: 2026-11-11 unless noted. Method note: page contents were read through WebFetch, which summarises pages with a small model, so exact prices and plan lists can contain extraction errors. Where a pricing page was only partly captured or a third party disagreed, that is flagged. "Vendor-sourced" means the claim comes from the vendor's own marketing and is not independently tested. Prices are USD unless stated. Annual vs monthly billing is noted where the page made it clear.

Context for the reader: the user's tool is a web app for Sydney marketing agencies. Workflow is storyboard/script of shots, upload real clips per shot, AI-assisted edit, export 9:16. About 2 weeks remain, so 2-3 AI features can ship.

---

## Q1. Which AI auto-edit features exist, and which products offer each?

### Takeaway
Silence/filler/bad-take removal, auto captions with animated styles, auto B-roll, and 9:16 reframe are now commodity features shipped by nearly every product. The 2026 frontier is "agentic" chat-driven editing (prompt, brief or script in; editable timeline out) with MCP/ChatGPT/Claude connectors. Script-aware assembly of the user's own footage exists but is thin and mostly desktop or early.

### Cited Findings

**Silence / filler-word / bad-take (retake) removal**
- Descript: Underlord removes retakes, filler words and silences; the pricing page lists "Remove filler words" on all tiers (limited on Free) — [Descript video editing](https://www.descript.com/video-editing); [Descript pricing](https://www.descript.com/pricing)
- OpusClip: Starter lists speech cleanup (pauses/fillers); Pro adds bad-take removal and eye-contact correction — [OpusClip pricing](https://www.opus.pro/pricing)
- Submagic: "Smart Trim" removes silences, filler words and bad takes in Natural/Fast/Extra Fast modes — [Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor)
- Gling: auto-remove silences and "remove bad takes" listed on all plans, including Free — [Gling pricing](https://www.gling.ai/pricing)
- FireCut: silence removal unlimited on all Premiere plans; "Remove repetition" (bad takes) only on Pro/Max — [FireCut pricing](https://firecut.ai/pricing)
- Riverside: "remove silences & filler words" on Pro and above — [Riverside pricing](https://riverside.com/pricing) (page self-describes as a staging copy that may be out of date)
- Kapwing: "Smart Cut" removes silences automatically — [Kapwing pricing](https://www.kapwing.com/pricing)
- VEED: "Magic Cut" auto-removes um/uh/pauses (one third-party review; may also trim meaningful pauses) — [search result summary citing a VEED review](https://iemlabs.com/blogs/veed-io-review/) (not verified on a VEED page)
- Cutback (Premiere panel): Remove silence, Remove filler words, Remove retakes, Create shortform clips as separate Cut tools — [Cutback Auto Rough Cut help](https://intercom.help/cutback-79a5f04f05ec/en/articles/11659231-auto-rough-cut)
- invideo agent: removes filler words, silences and flubbed takes, then assembles the strongest deliveries — [invideo auto video editor](https://invideo.io/make/auto-video-editor/)

**Text/transcript-based editing**
- Descript (the originator; transcript editing plus Underlord) — [Descript video editing](https://www.descript.com/video-editing)
- Adobe Premiere: transcribes on import; rough cut by copying and pasting text; captions in 18 languages — [Adobe Premiere features](https://www.adobe.com/products/premiere/features.html)
- OpusClip Starter: "Text/timeline editing" — [OpusClip pricing](https://www.opus.pro/pricing)
- Riverside: unlimited text-based editing on Pro+ — [Riverside pricing](https://riverside.com/pricing)
- Filmora: "AI Text-Based Editing" (third-party review only) — [TechRadar search listing](https://techradar.com/computing/creative-software/wondershare-filmora-ai-video-editor-2026-review); content not fetched, treat as unverified

**Auto captions and caption styles**
- Universal. Submagic: captions in 118 languages, emoji/keyword highlights, animations, SRT export, custom fonts via Brand Kit — [Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor)
- VEED: unlimited subtitle generation on paid plans (fair-use 50 h/month); Dynamic Subtitles presets (Handwritten, Whisper, Fusion) launched 2026-02-23; Subtitle API 2026-05-18 — [VEED pricing](https://www.veed.io/pricing); [VEED changelog](https://changelog.veed.io)
- Descript: dynamic captions unlimited on all tiers — [Descript pricing](https://www.descript.com/pricing)
- Kapwing Pro: auto-subtitling up to 1,000 min/month — [Kapwing pricing](https://www.kapwing.com/pricing)
- Captions app: 100+ languages, caption templates (Free gets 1) — [Captions pricing](https://captions.ai/pricing)
- OpusClip: animated caption templates on all tiers; Free tier output is watermarked — [OpusClip pricing](https://www.opus.pro/pricing)

**Auto B-roll**
- Submagic: transcript-linked B-roll from stock library or user uploads, frequency slider; AI B-roll powered by Sora 2 added (changelog entry undated) — [Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor); [Submagic changelog](https://submagic.canny.io/changelog)
- OpusClip: Starter 3 AI image + 3 stock clips/month; Pro unlimited stock plus AI video B-roll — [OpusClip pricing](https://www.opus.pro/pricing)
- FireCut: B-roll on Pro/Max — [FireCut pricing](https://firecut.ai/pricing)
- Klap: editor with b-roll and hook titles on all plans — [Klap pricing](https://klap.app/pricing)
- Pictory: "Add B-roll" included on all plans — [Pictory pricing](https://pictory.ai/pricing)
- Riverside: AI B-roll on Pro+ — [Riverside pricing](https://riverside.com/pricing)

**Beat/music sync**
- CapCut AutoCut: Beat Sync (cuts to music beats), Speech Pause Detection, and AI Script Mode on desktop; Music Beat / Voice / Text Prompt on mobile; not supported on CapCut Web — [CapCut AutoCut help](https://www.capcut.com/help/how-to-use-auto-cut)
- invideo agent: lists beat-synced cuts and matching the pacing of a reference video — [invideo auto video editor](https://invideo.io/make/auto-video-editor/)
- Canva Magic Video: music applied automatically via templates; the official help page does not say edits align to the beat — [Canva Magic Video help](https://www.canva.com/help/magic-video/) (a third-party review lists "Beat Sync" as a Canva editor feature but I did not find an official page)

**Highlight / clip extraction from long video**
- OpusClip (clipping across spoken words; Pro adds visual objects, sound, emotion) — [OpusClip pricing](https://www.opus.pro/pricing)
- Klap: AI clipping with virality score, source video up to 3 hours — [Klap pricing](https://klap.app/pricing)
- Vizard: AI-generated clips included on Free plan — [Vizard pricing](https://www.vizard.ai/pricing)
- Submagic: Magic Clips (credit-limited) — [Submagic pricing](https://www.submagic.co/pricing)
- Riverside Magic Clips (Free and Pro+) — [Riverside pricing](https://riverside.com/pricing)
- Cutback "Create shortform clips" — [Cutback help](https://intercom.help/cutback-79a5f04f05ec/en/articles/11659231-auto-rough-cut)
- Captions app lists "turning long videos into clips" on Max — [Captions pricing](https://captions.ai/pricing)
- Mosaic "Curator Agent" (third-party review) — [MakerStack review](https://makerstack.co/reviews/mosaic-review/)

**Auto reframe to 9:16**
- Adobe Premiere Auto Reframe preserves the focal point across aspect ratios — [Adobe Premiere features](https://www.adobe.com/products/premiere/features.html)
- OpusClip: Free/Starter 9:16 only; Pro adds 1:1 and 16:9, moving-object tracking — [OpusClip pricing](https://www.opus.pro/pricing)
- Klap: active-speaker reframing on all plans — [Klap pricing](https://klap.app/pricing)
- Submagic exports 9:16, 4:5, 1:1, 16:9 or original — [Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor)
- Canva Magic Video outputs a 60-second multi-scene vertical video — [Canva Magic Video help](https://www.canva.com/help/magic-video/)

**Script/storyboard to timeline (clip matching): see Q3.**

**Take selection (best take)**
- invideo agent: "assemble the strongest deliveries" and can find a specific take — [invideo auto video editor](https://invideo.io/make/auto-video-editor/)
- DaVinci Resolve 20 Studio IntelliScript: builds timeline from best takes against a script, alternates on extra tracks (2025-04-07 public beta) — [Engadget](https://www.engadget.com/apps/davinci-resolve-20s-latest-ai-feature-can-create-an-entire-timeline-based-on-a-script-120009351.html)
- Gling: "remove bad takes" — [Gling pricing](https://www.gling.ai/pricing)

**Auto pacing / hook optimisation**
- OpusClip 4.0 "Viral Hook" applies a hook style from a template library to the first few seconds — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0)
- Submagic Pro/Business: "hook titles", auto zooms — [Submagic pricing](https://www.submagic.co/pricing)
- Klap: hook titles in editor — [Klap pricing](https://klap.app/pricing)
- invideo agent: match pacing of a reference video — [invideo auto video editor](https://invideo.io/make/auto-video-editor/)

**Brand kits / templates**
- Submagic: Brand Kit + 3 custom templates (Pro), 30 (Business) — [Submagic pricing](https://www.submagic.co/pricing)
- OpusClip: brand template 1 (Free/Starter), up to 4 (Pro) — [OpusClip pricing](https://www.opus.pro/pricing); OpusClip 4.0 adds saveable "Recipes" (reusable edit settings) — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0)
- Descript: Brand Studio (team-wide defaults) on Business only; Generative Layouts builds a layout pack from brand guidelines (article dated 2026-11-03) — [Descript pricing](https://www.descript.com/pricing); [Descript Nov 2026 updates](https://www.descript.com/blog/article/descript-updates-oct-2026)
- Kapwing: Brand Kit and custom fonts on Pro — [Kapwing pricing](https://www.kapwing.com/pricing)
- Vizard: brand kit on Business — [Vizard pricing](https://www.vizard.ai/pricing)
- Pictory: brand kits 1/5/10 by tier — [Pictory pricing](https://pictory.ai/pricing)
- CapCut: Brand kit on Teams only — [CapCut pricing](https://www.capcut.com/pricing)

**AI voiceover**
- Kapwing: text-to-speech minutes, voice clones on Business — [Kapwing pricing](https://www.kapwing.com/pricing)
- OpusClip Starter: 20 voice-overs/day — [OpusClip pricing](https://www.opus.pro/pricing)
- Eddie AI: generative voiceover, music and b-roll — [CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/)
- Runway: voice generation and voice clone on Standard/Pro+ — [Runway pricing](https://runway.com/pricing)

**Multi-client / agency workspaces and seats**
- Vizard Business: shared workspace, team invites, project sharing, brand kit — [Vizard pricing](https://www.vizard.ai/pricing)
- OpusClip Pro: team workspace, 2 seats per pack up to 4 users; Business unlimited seats with sub-teams — [OpusClip pricing](https://www.opus.pro/pricing)
- Submagic: per-member pricing; Business supports publishing from multiple accounts — [Submagic pricing](https://www.submagic.co/pricing)
- Descript: Business up to 5 seats — [Descript pricing](https://www.descript.com/pricing)
- invideo: Plus up to 10 seats plus 10 free guest seats; Max 20 plus 20 guests — [invideo pricing](https://invideo.io/pricing)
- Eddie AI: cloud workspaces with Slack/Teams/SSO — [CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/)
- I found no product advertising explicit per-client workspace separation tailored to agencies in the pages read (only generic team workspaces / sub-teams / folders).

**Approval / review links**
- Frame.io (Adobe): custom-branded shares, passphrase-protected shares, link expiry, comment attachments on Pro ($15/member/mo); external reviewers need no account; Free plan includes transcription and captions but the page describes no AI features — [Frame.io pricing](https://frame.io/pricing)
- Descript: commenting and live collaboration on all tiers (incl. Free) — [Descript pricing](https://www.descript.com/pricing)
- Eddie AI: timestamped frame-level feedback pushed to the editor — [search summary of Eddie coverage via CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/)
- VEED changelog shows no 2026 entry for review links — [VEED changelog](https://changelog.veed.io)

**Agent / MCP integrations (new category in 2026)**
- OpusClip "AI Producer" plugin for ChatGPT/Claude; MCP connector listed on Pro — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0); [OpusClip pricing](https://www.opus.pro/pricing)
- Descript MCP connector and public API (open beta May 2026) — [search summary](https://www.newsfilecorp.com/release/297461/Descript-Launches-API-in-Open-Beta-with-Editing-and-Workflow-Updates?lang=fr) (press-release site, secondary)
- VEED MCP server (2026-04-30), VEED in ChatGPT (2026-05-05) — [VEED changelog](https://changelog.veed.io)
- Eddie AI: ~100 MCP tools including assembly, b-roll, captions, NLE export — [CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/)
- Runway MCP on Pro+ — [Runway pricing](https://runway.com/pricing)

### Inferences
- Because almost every vendor ships silence/filler/bad-take removal and animated captions, those alone will not differentiate a new tool; they are table stakes agencies expect (inferred from the breadth of the lists above).
- Few products pair AI editing with agency-grade client review. Frame.io is the review standard but its pricing page describes no AI features; AI editors mostly offer generic team seats (inferred).
- Product direction in H2 2026 is chat/agent editing plus MCP exposure; a web app could treat "tool callable from Claude/ChatGPT" as an optional later layer (inferred).

### Gaps
- Official Canva beat sync/auto-cut docs not found; Canva's Magic Video help does cover own-clip input.
- Filmora, LTX Studio, AutoPod, Pictory highlights, Kapwing Repurpose Studio/Smart Cut docs: no official feature page read (Kapwing's page fetch returned no body; Filmora/LTX only via third-party search results; AutoPod only via a third-party blog). Treat their feature claims as unverified.
- Adobe's official helpx pages returned HTTP 403; Adobe claims here rely on the adobe.com features page and Adobe community post.
- Whether any tool offers an agency-style "approve/reject per shot" review step: not found.

---

## Q2. Per product: pricing, input type, target user, strengths and weaknesses

### Takeaway
Two clear groups: (a) long-video-to-clips repurposers for creators (OpusClip, Klap, Vizard, Riverside, Submagic), which take one long source; and (b) multi-clip / timeline editors with AI (Descript, VEED, Kapwing, CapCut, Premiere, invideo agent, Eddie, Canva) which accept several clips. Per-seat pricing is typically $10-$50/user/month; Eddie is pay-as-you-go credits. Nothing found is built specifically for agencies' storyboard-driven shoots.

### Cited Findings
Price notes are as printed on the vendor page on 2026-11-11 unless flagged.

| Product | Pricing (USD) | Input | Target | Strengths / weaknesses |
|---|---|---|---|---|
| Descript | Free $0 (1 media hr, 720p); Hobbyist $16 annual/$24 monthly; Creator $24/$35 (1-3 seats); Business $50/$65 (up to 5 seats); Enterprise custom. Annual-vs-monthly labelling was assumed from the page. [Pricing](https://www.descript.com/pricing) | Multiple media files, transcript-first | Creators and teams | Transcript editing, Underlord (retakes, silences, captions, templates, scenes from script), commenting on all tiers [video editing](https://www.descript.com/video-editing). Brand Studio only on Business. Credit-based AI (100 one-time on Free, 400/800/1,500 per month) |
| OpusClip | Free $0; Starter $15/mo; Pro $29/mo; Business custom. Credits not listed on page. [Pricing](https://www.opus.pro/pricing) | Long video or link; 4.0 adds raw-footage auto-edit [4.0](https://www.opus.pro/blog/opusclip-4-0) | Creators; Pro adds team workspace and API | Clipping + new full editor, MCP/API. Vendor's own "agents" page says AI Producer is built for single-speaker talking-head footage, not multi-speaker or multi-shot [vendor blog](https://www.opus.pro/blog/best-ai-video-editing-agents). Files expire (Free 3 days, Starter 29 days) |
| Submagic | Starter $12 annual/$19 monthly (15 videos or 5 Magic Clips, max 2 min); Pro $23 annual (40 videos, 5 min); Business $41 annual (100 videos, 30 min); per member. [Pricing](https://www.submagic.co/pricing) | Single uploaded video or link; own B-roll can be added [feature page](https://www.submagic.co/features/auto-video-editor) | Creators / marketers | Best-known caption styling, Smart Trim, B-roll, Brand Kit. The pricing page is internally inconsistent about which tier has silence removal. Magic Clips may be a paid add-on per two third-party reviews ($12-19/mo) — [search summary](https://ucstrategies.com/news/submagic-review-2026-pricing-features-is-it-worth-it-for-creators/); not confirmed on the vendor page |
| VEED | Per-seat; page read did not show tier prices or export limits [pricing](https://www.veed.io/pricing). Official pricing not obtained | Browser editor, multiple clips | Creators/teams | Subtitles unlimited on paid (50 h fair use), 2026 agent/MCP/ChatGPT releases [changelog](https://changelog.veed.io). Free trial only for enterprise (3+ users) |
| Kapwing | Free $0 (720p, watermark, 4-min videos); Pro $16/mo; Business $50/mo; Enterprise custom. Seat counts not stated [pricing](https://www.kapwing.com/pricing) | Browser editor, multiple clips | Creators / small teams | Smart Cut, auto-subtitles, Brand Kit and shared workspace on Pro. Credit-metered AI |
| Gling | Free $0 (1 h AI media, watermark); Plus $10 annual/$20 monthly (10 h); Pro $20/$40 (30 h); Elite $50/$100 (100 h). [Pricing](https://www.gling.ai/pricing) | Long talking-head video; XML export to Premiere/Final Cut/Resolve (page contradicts itself on whether Free includes it) | YouTubers / solo creators | Cheap, silence + bad take removal on all plans. No team features mentioned |
| CapCut | Pricing page shows AUD: Free; Pro A$37.99/mo; Ultra A$111.99/mo; Teams A$18-30/seat/mo, brand kit on Teams. Page did not mention AutoCut. [Pricing](https://www.capcut.com/pricing). A competitor's blog lists USD Pro $19.99 [OpusClip blog](https://www.opus.pro/blog/best-ai-video-editing-agents) | Clips on a timeline; music; voiceover; text prompt | Creators; Teams plan exists | AutoCut: beat sync, speech pauses, AI script mode on desktop and mobile; not on web [help](https://www.capcut.com/help/how-to-use-auto-cut). ByteDance-owned; web app lacks AutoCut, which matters for a web workflow |
| Captions (app) | Free; Max $24.99/mo (2 seats); Frontier $69.99-$279.99 (3-5 seats). Page shows iOS plans only. [Pricing](https://captions.ai/pricing) | Raw footage; style library; chat editing [AI Edit](https://captions.ai/features/edit-with-ai) | Creators, mobile-first | One-click styled edit with B-roll, zooms, SFX. Page does not say whether multiple clips are supported. Page did not confirm any Mirage rebrand |
| Adobe Premiere (desktop) | Premiere €25.99/mo (Germany, incl. VAT; includes 25 generative credits); Creative Cloud Pro €77.99/mo; Teams €33.49/license excl. VAT [features page](https://www.adobe.com/products/premiere/features.html) | Full timeline, any footage | Pros / studios | Text-based editing, Auto Reframe, Generative Extend, Enhance Speech, Media Intelligence search, Generative Media. Heavyweight desktop app, not a web tool. Renamed from "Premiere Pro" to "Premiere" in January 2026 [PetaPixel](https://petapixel.com/2026/01/20/rebranded-adobe-premiere-26-arrives-with-one-click-object-tracking) (search snippet; page returned 403) |
| Adobe Premiere iPhone | Free to download; generative features use credits [search summary](https://helpx.adobe.com/premiere/mobile/whats-new/release-notes.html) | Phone clips | Creators | One-tap export to TikTok/YouTube/Instagram. Rush discontinued 2026-09-30 per the same search summary (not seen on an Adobe page) |
| Runway | Free (125 one-time credits); Standard $12 annual/$15; Pro $28/$35; Max $76/$95. Aleph 2.0 costs 140 credits per 5 s [pricing](https://runway.com/pricing) | Generates/edits short clips; agentic collaborator accepts attached footage [vendor blog](https://www.opus.pro/blog/best-ai-video-editing-agents) | Creatives / generative | Generation-first, expensive per second of editing, not an assembly tool. Seats not specified on page |
| Riverside | Free; Pro $24 annual/$29; Grow $34/$39; Webinar $79/$99; Business custom [pricing](https://riverside.com/pricing) (staging copy, verify) | Recordings made in Riverside studio, plus uploads | Podcasters / interviewers | Magic Clips, text editing, silence removal, AI B-roll. Recording-centred, collaborative editing only on Business |
| invideo (AI + agent) | Starter $10 annual/$20; Plus $30/$60; Max $75/$150 per seat; 400/2,000/5,000 credits; guest seats on Plus/Max; plans include timeline editor and multiplayer editing [pricing](https://invideo.io/pricing) | Raw footage, script, or text brief [agent page](https://invideo.io/make/auto-video-editor/) | Creators and teams | Closest to a "brief or script in, editable cut out" flow, with OpenTimelineIO export. Agent editing is credit-metered; page states no file-size or length limits. Credits do not roll over |
| Pictory | Starter $25 annual/$29; Professional $29.50 (Black Friday annual)/$59; Teams $119/$199; 3+ users. [Pricing](https://pictory.ai/pricing) | Script, URL or article to stock-based video; own uploads up to 1 GB (Starter) or 5 GB | Content marketers | Script/URL to video using stock footage; upload of own footage not explicitly listed as a feature. Credit-limited video minutes |
| Vizard | Free (60 credits, 720p); Creator and Business paid, price not captured; credits = minutes of uploaded video [pricing](https://www.vizard.ai/pricing). Page read only 100k of 132k chars | Long video; Vizard Agent accepts raw footage, scripts, briefs [use cases](https://agent.vizard.ai/use-cases/index.html) | Creators; Business adds shared workspace and brand kit | Agent launch date 2026-08-03 appears only on a directory ([Stork](https://www.stork.ai/en/vizard-agent)), not an official source. The page says the agent cannot invent a story you never filmed |
| Klap | Basic $14.50 annual/$29 (100 clips/mo); Pro $39.50/$79 (300); Pro+ $94.50/$189 (1,000). API per-use [pricing](https://klap.app/pricing) | Long video, up to 3 hours | Creators; Pro+ marketed to teams | Reframe, captions, scheduling. No brand templates mentioned |
| Canva (video) | Video editor bundled in all plans; Magic Video included in the free plan [help](https://www.canva.com/help/magic-video/). Pro price only from third-party sources ($13-15/mo), unverified | 1-10 clips or photos, under 10 min each, optional prompt/style | Everyone | Vertical 60-second output with hourly generation limit. Cannot use Brand Kit assets in Magic Video per the help page |
| Frame.io | Free (2 members, 2 GB); Pro $15/member (up to 5); Team $25/member (up to 15); annual saves 13% [pricing](https://frame.io/pricing) | Any media for review | Studios, agencies | Review and approval standard; no AI editing |
| Cutback Selects / Premiere panel | Pricing not retrieved | Raw footage (multicam, interviews), optional script [help](https://intercom.help/cutback-79a5f04f05ec/en/articles/11659231-auto-rough-cut) | Pro editors | Outputs a timeline into Premiere/Final Cut/Resolve; only vendor sources found |
| Eddie AI | Pay-as-you-go credits, no subscription: $10/1,000, $45/5,000, $120/15,000, $350/50,000; 1,000 free credits to start (CineD, 2026-08-28) [CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/) | Raw interviews and multicam | Pro editors, workspaces with Slack/Teams/SSO | MCP tools; text of the CineD article truncated, so credit cost per operation not confirmed |
| FireCut | Premiere plugin: Starter $10 annual/$19; Pro $20/$34; Max $39/$59; Team from $34/user. FireCut Shorts web app: Free (25 videos/mo, 5 min, 720p, watermark); paid $9.50 annual/$14.50 [pricing](https://firecut.ai/pricing) | Podcasts, talking head | Editors | Browser-based "Shorts" tool plus plugins |
| AutoPod | About $29/month for Premiere Pro 2023+, 30-day trial (third party) [nemovideo blog](https://www.nemovideo.com/blog/video-tool-alternatives/autopod-premiere-pro-pricing) | Multicam podcasts | Podcast editors | Premiere plugin only; official page not read. Unverified |
| LTX Studio | Pricing conflicts between third-party sources [Dupple](https://dupple.com/reviews/ltx-studio) | Script/idea to generated shots; uploads of images only per sources | Filmmakers | Generative; no source confirmed uploading real clips. Out of scope when generation is removed |
| Mosaic | Pricing unclear and conflicting [MakerStack](https://makerstack.co/reviews/mosaic-review/) | Long video; node-based canvas | Agencies cited by reviewers | Batch variants; third-party only |
| DaVinci Resolve 20 Studio | One-off $295; base Resolve free [Engadget](https://www.engadget.com/apps/davinci-resolve-20s-latest-ai-feature-can-create-an-entire-timeline-based-on-a-script-120009351.html) | Dialogue clips + script | Pros | IntelliScript works from dialogue, desktop |

### Inferences
- For an agency running many small clients, per-seat tools in the $10-$50 range cover single editors but I found no published agency-tier with per-client brand isolation (inferred from gaps above).
- Long-video repurposers (OpusClip, Klap, Vizard) fit poorly with "one clip per storyboard shot" because their input model is one source file and their selection logic hunts for highlights (inferred).
- Free tiers watermark exports on Kapwing, OpusClip, Gling, Pictory, VEED (trial), so any competitive "try free" claim must account for that (inferred from pricing pages).

### Gaps
- VEED, Vizard, Canva Pro, Cutback, AutoPod, LTX Studio, Mosaic, Filmora: no clean official price captured (see rows).
- Credits per operation for OpusClip, Descript Underlord, Eddie: not found.
- Adobe pricing shown is German/EUR from the Adobe page the fetcher received; no US/AUD price retrieved. CapCut pricing is AUD.

---

## Q3. Which products do "script/storyboard → assemble real clips"? (closest to the user's workflow)

### Takeaway
Only a handful match a written script to the user's own footage. ClipMatch (consumer, vertical) and invideo's agent (script-aware, editable timeline) are closest in shape; Descript, Cutback and DaVinci Resolve are the more mature but less storyboard-shaped. No product found matches footage to a storyboard of shots (per-shot slots, with upload-per-shot); matching is by spoken dialogue or described content.

### Cited Findings
- ClipMatch: you upload clips, enter narration one line per row, each line is matched to the best clip with the top three options and confidence scores; low scores are flagged for review; export is 1080x1920 MP4; no timeline editing; no pricing, limits or launch date on the page; support email is a generic domain — [ClipMatch](https://clipmatch.io/script-to-video). Only vendor page found, no independent coverage; treat as an unverified early product.
- invideo agent: logs each line, moment, voice and angle of raw footage; if you supply a script it cuts against it line by line and flags anything the footage is missing; if no script it works from the brief; outputs an editable multitrack timeline, exportable to Premiere/FCP/Resolve via OpenTimelineIO or as rendered video; can request several versions (different lengths/formats); credits-based — [invideo auto video editor](https://invideo.io/make/auto-video-editor/); [invideo pricing](https://invideo.io/pricing)
- Descript Underlord: "build a first-draft or rough cut and assemble scenes from a script" — [Descript video editing](https://www.descript.com/video-editing). The page does not say whether it matches uploaded footage to script lines or generates scenes.
- Cutback (Premiere panel): "Edit according to script" — paste a script and it trims and rearranges footage to match; Strict mode follows script 100% and may drop non-matching footage, Flexible mode keeps off-script material — [Cutback Auto Rough Cut help](https://intercom.help/cutback-79a5f04f05ec/en/articles/11659231-auto-rough-cut). Runs inside Premiere; transcription uses hours. Only vendor documentation found.
- DaVinci Resolve 20 Studio IntelliScript: transcribes media, matches to script, builds timeline of best takes with alternates on extra tracks; public beta announced 2025-04-07 (older than 12 months); desktop, $295 Studio — [Engadget](https://www.engadget.com/apps/davinci-resolve-20s-latest-ai-feature-can-create-an-entire-timeline-based-on-a-script-120009351.html)
- Avid ScriptSync AI (paid option, free in MC Ultimate) syncs clips to scripts — [Media Composer overview](https://en.wikipedia.org/wiki/Media_Composer) (search result; secondary, desktop)
- Adobe Premiere AI Assistant (public beta announced 2026-06-23): builds a stringout/rough assembly, organises bins, transcribes, detects slates; scripts and other reference documents are "not yet supported," on the roadmap; English-optimised; Adobe says not for client work during beta — [Adobe community announcement](https://community.adobe.com/announcements-727/meet-your-new-assistant-editor-ai-assistant-in-premiere-pro-is-now-in-public-beta-1629317); [ProVideo Coalition](https://www.provideocoalition.com/premiere-ai-assistant/)
- CapCut AutoCut desktop lists an "AI Script Mode (text instructions, in supported versions)" — [CapCut AutoCut help](https://www.capcut.com/help/how-to-use-auto-cut); CapCut's script-to-video tools are described by third parties as assembling stock footage and AI voice — [search summary of 2026 reviews](https://pexo.ai/blog/capcut-ai-video-generator-review-4093)
- Pictory and ZinAIStudio-style tools match script to stock footage, not the user's own shoot — [Pictory pricing](https://pictory.ai/pricing)
- Vizard Agent: can start from raw footage, script or brief; use-case page describes event recaps from multiple clips; says it cannot invent a story you never filmed — [Vizard Agent use cases](https://agent.vizard.ai/use-cases/index.html)
- Canva Magic Video: arranges 1-10 uploaded clips/photos into a 60-second vertical video from an optional prompt, with no script-to-shot mapping — [Canva Magic Video help](https://www.canva.com/help/magic-video/)
- OpusClip 4.0's feature list does not include script/storyboard input; its Agent Opus product is generative — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0)

### Inferences
- Existing matching works from spoken words (IntelliScript, Cutback) or visual description (ClipMatch's "reads each scene's content"). A storyboard where each shot already has an assigned upload slot would let a tool skip the hard matching step entirely, leaving AI to do per-slot take selection and trimming. This is a design inference, not something any source states.
- "Top 3 candidates with confidence, flag low scores" (ClipMatch UX) is the only human-in-the-loop pattern found that would suit agency review (inferred).
- The market gap is a web-based, shot-list-first flow: I found no vendor offering it, but my search was keyword-based and may miss small products.

### Gaps
- No independent test or review of ClipMatch, invideo's script-cutting accuracy, or Descript's script-to-scenes with real footage.
- Whether Descript Underlord's "assemble scenes from a script" uses uploaded clips: unconfirmed.
- Cutback Selects standalone pricing and its beta "AI Storyline Generator": only vendor sources and not fetched.

---

## Q4. Recent launches and changes in 2025-2026 (with dates)

### Takeaway
2026 was dominated by agent-style editors and MCP/ChatGPT connectors: invideo Agent Two (Jul-Sep), Vizard Agent (Aug), VEED OpenEdit (Aug), Adobe Premiere AI Assistant (Jun), OpusClip 4.0 (Nov 2), Descript Underlord Skills (Nov 3), Eddie AI credit repricing (Aug).

### Cited Findings
- 2025-04-07: DaVinci Resolve 20 IntelliScript announced in public beta — [Engadget](https://www.engadget.com/apps/davinci-resolve-20s-latest-ai-feature-can-create-an-entire-timeline-based-on-a-script-120009351.html) (older than 12 months)
- 2025-08 (month only): OpusClip launches Agent Opus (end-to-end short-form creation) — [Sacra](https://sacra.com/c/opusclip/) (search summary, secondary; older than 12 months)
- 2025-09: Cutback launches Selects (date inferred from press-release URL "2025-9-1") — [Mammoth Times / ABNewswire](https://business.mammothtimes.com/mammothtimes/article/abnewswire-2025-9-1-cutback-selects-the-ai-video-trimmer-and-rough-cut-tool-built-for-pro-editors); Adobe Premiere on iPhone announced 2025-09-04 — [TechCrunch](https://techcrunch.com/2025/09/04/adobe-plans-to-bring-its-video-editing-app-premiere-to-iphones) (title only seen in search; both older than 12 months)
- 2026-01-20: Adobe Premiere 26 (rebranded from Premiere Pro) with AI Object Mask — [PetaPixel](https://petapixel.com/2026/01/20/rebranded-adobe-premiere-26-arrives-with-one-click-object-tracking) (search snippet; fetch returned 403)
- 2026-02-23: VEED Dynamic Subtitles; 2026-04-30 VEED MCP server; 2026-05-05 VEED in ChatGPT; 2026-08-03 VEED OpenEdit (agent-native video tool); 2026-07-14 Lipsync 2.0 — [VEED changelog](https://changelog.veed.io)
- 2026-04: Adobe NAB announcements — Premiere Color Mode (beta), Premiere 26.2, Firefly Video Editor adds Kling 3.0, Frame.io Drive; the article mentions no vertical-video, review or AI rough-cut features — [No Film School](https://nofilmschool.com/adobe-updates-nab-2026)
- 2026-05: Descript public API in open beta (secondary press-release source) — [Newsfile](https://www.newsfilecorp.com/release/297461/Descript-Launches-API-in-Open-Beta-with-Editing-and-Workflow-Updates?lang=fr)
- 2026-06-18/23: Adobe Premiere AI Assistant public beta — [ProVideo Coalition](https://www.provideocoalition.com/premiere-ai-assistant/); [Adobe community](https://community.adobe.com/announcements-727/meet-your-new-assistant-editor-ai-assistant-in-premiere-pro-is-now-in-public-beta-1629317)
- 2026-07-31 to 2026-09-30: invideo Agent Two components — Multi-Input Intelligence (Jul 31), Slate (Aug 4), Stock (Aug 5), invideo Editor (Sep 1), Agentic Effects (Sep 30). Dates from invideo news pages as summarised in search; one third-party review gives July 29-Aug 8 for the whole stack — [invideo Slate](https://invideo.io/news/introducing-slate-invideo-agent-two/); [invideo Editor](https://invideo.io/news/introducing-invideo-editor/)
- 2026-08-03: Vizard Agent launch, per a directory only (unverified) — [Stork](https://www.stork.ai/en/vizard-agent)
- 2026-08-28: Eddie AI moves to pay-as-you-go credits, adds MCP server, iPhone app — [CineD](https://www.cined.com/eddie-ai-overhauled-pay-as-you-go-pricing-editing-from-claude-and-chatgpt-and-an-iphone-app/)
- 2026-09-30: Premiere Rush fully discontinued (search summary of Adobe pages; not seen directly) — [Adobe Premiere iPhone release notes](https://helpx.adobe.com/premiere/mobile/whats-new/release-notes.html)
- 2026-11-02: OpusClip 4.0 (auto-edit raw footage, Recipes, Viral Hook, Motion Graphics, AI Producer plugin); page metadata dates conflict (Nov 1 publish, Nov 3 modified) — [OpusClip 4.0](https://www.opus.pro/blog/opusclip-4-0)
- 2026-11-03: Descript update post — Generative Layouts, media search, Underlord Skills, Animate Text (coming soon) — [Descript](https://www.descript.com/blog/article/descript-updates-oct-2026)
- Descript mid-2026 Underlord changes (model picker with Claude Sonnet 4.6 / Gemini 3.1 Pro in March, custom instructions, "regenerated jump cuts" in August) — [Descript changelog Aug 5](https://feedback.descript.com/changelog/release-round-upaugust-5th-2026) (search summary only; page not fetched)
- Submagic: B-Rolls 2.0, custom caption animations, AI B-Rolls powered by Sora 2 — all undated on the changelog — [Submagic changelog](https://submagic.canny.io/changelog)

### Inferences
- A 2-week build competes with vendors who already shipped agent editors in H2 2026, so a differentiated, narrow storyboard-first workflow is more defensible than a general auto-editor (inferred).

### Gaps
- Official release-note dates for CapCut AutoCut changes, Kapwing, Captions (Mirage), Klap, Filmora, Pictory 2026 updates not found.
- Several launch dates rest on search summaries, directories or third-party blogs (flagged inline).

---

## Q5. Which 2-3 features appear highest value for the user's context? (analysis for the writer, based on the findings above)

### Takeaway
Evidence supports three candidates: (1) per-shot take cleanup (silence/filler/retake trimming), (2) script-line/shot to clip assignment with confidence and top-N suggestions, and (3) captions with brand styles with 9:16 export. They are commodity-to-novel in that order of risk. An editable-timeline or NLE export and a share/review link are agency needs that no AI editor in the survey pairs well.

### Cited Findings
- Take cleanup is available at low cost on most plans and standard on Gling Free and Descript — [Gling pricing](https://www.gling.ai/pricing); [Descript pricing](https://www.descript.com/pricing)
- Captions and caption styles are universal and brand-kit-linked on Submagic, Kapwing, Pictory, Descript Business — [Submagic Auto Video Editor](https://www.submagic.co/features/auto-video-editor); [Kapwing pricing](https://www.kapwing.com/pricing)
- Script-line to clip matching with top-3 candidates and confidence is shown only by ClipMatch (early, unverified) — [ClipMatch](https://clipmatch.io/script-to-video)
- Editable timeline plus OTIO/NLE export is offered by invideo, Gling (XML), Cutback and FireCut — [invideo](https://invideo.io/make/auto-video-editor/); [Gling pricing](https://www.gling.ai/pricing)
- Review links with branding/passphrase come from Frame.io, which has no AI — [Frame.io pricing](https://frame.io/pricing)

### Inferences
- Ranking is my inference, not a sourced fact: (1) script/shot-to-clip matching is the differentiator (few competitors, closest to the stated workflow); (2) silence/filler/retake trimming is the cheapest credible AI add and expected by users; (3) auto captions with a brand style preset is table stakes and pairs with 9:16 export. Review links are non-AI but may matter to agency buyers.
- Since the app knows which shot a clip belongs to, take selection can reduce to trimming and picking among takes for that shot; no source describes this exact flow.

### Gaps
- No user research on what Sydney agencies actually value was in scope; no data on agency willingness to pay.
- No accuracy benchmarks for any vendor's AI take selection or script matching.
