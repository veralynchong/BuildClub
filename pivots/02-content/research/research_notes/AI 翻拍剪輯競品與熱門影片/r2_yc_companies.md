# YC companies in short-form video trend discovery, AI remixing, AI UGC ads, AI clipping, and creator/agency tooling

All sources accessed 2026-10-30. Evidence labels used on each claim:
- [checked original page] = I fetched the page itself (WebFetch returns a model-written summary of the page, so quotes are paraphrase-grade, not verbatim).
- [search snippet only] = seen only in a search-result summary, page not opened.
- [vendor claim] = a number or statement the company makes about itself (YC profile, its own site, its own job post); not independently verified.

Scope caveat: the YC directory pages for "video" (72 companies), "marketing" (140), "content" (79) and "creator economy" (31) lazy-load. WebFetch saw only the first 50 rows of the video, marketing and content lists, which are sorted newest-batch first. Older-batch companies (roughly pre-2021) deeper in those lists were not seen. Treat the company list as strong for F26–S22 and incomplete for older batches. The batch codes the directory uses are W, S, F and P (Spring 2025/2026 is "P").

Social handles: I found NO TikTok or Instagram handles for any company in this list. YC profiles list only LinkedIn and X. All TikTok/IG handles are therefore "not found / unverified". X and LinkedIn handles are given where the YC page listed them.

---

## Which YC companies are closest to a "find outlier videos -> group into formats -> turn into an editable shot list/script" product, and who pivoted into or out of this space?

### Takeaway
No YC company I found does the full find -> format -> shot-list -> client-approval loop for small agencies. The nearest are Bluma (F25: clones competitors' viral videos end to end, but aimed at in-house marketing and ad teams, not agency approval workflows) and Syncly (W23: video-first social listening for large CPG brands, no remix or shot-list step). Most of the YC field sits in "produce" (AI UGC, avatars, editing agents) and in creator-marketing ops; "find" is thin, and the one pure trend-analytics YC company (Trendpop, W21) was acquired in 2022. Pivots into the space are common: Craze (HR/payroll to AI video), Gooseworks (Athina AI LLM tooling to AI ad creative), and, with weaker evidence, Knowlify.

### Cited Findings

Coverage key: FIND = trend/outlier/competitor discovery; FORMAT = grouping into reusable formats/templates; REMIX = recreating/cloning an existing video; PRODUCE = generating or editing the video; DISTRIBUTE/OPS = posting, creator outreach, campaign mgmt.

#### Tier A: closest to Trend Finder (find and/or remix of existing viral content)

| Company | Batch | One-liner | Covers | Target customer | Traction / funding (label) | Website | X / LinkedIn (YC page) | TikTok / IG |
|---|---|---|---|---|---|---|---|---|
| Bluma | F25 | "First AI short form content engine"; automates consumer marketing by cloning competitors' viral videos end to end; "Canva for short-form video ads" | FIND (competitor reference), REMIX, PRODUCE | Not stated on YC page; implied marketing/growth teams on organic + paid short-form [checked original page] | Team of 2; no metrics; beta, "no waitlist or paywall" at launch [checked original page]. Bluma's own site names "source video reference" -> "new variants" but does not mention trend discovery or cloning by name, and shows no pricing/customers [checked original page: getbluma.com] | getbluma.com | x.com/getbluma; linkedin.com/company/bluma-ai | not found |
| Syncly | W23 | "Social listening for the video era"; AI-native social intelligence: Syncly Social (brand/competitor listening across video platforms), Syncly Creator (creator discovery + campaign tracking), Syncly VOC | FIND (analysis of video incl. audio, on-screen text), DISTRIBUTE/OPS (creator discovery) | Large CPG brands, brand marketers and agencies (Tiffany, Clorox named on YC page; LG, Neuro testimonials on site) [checked original page] | "$2.1M ARR, 2x in 6 months, 4x in 12 months, 142% NDR" [vendor claim on YC page]; $3.3M seed announced Nov 2023, investors incl. YC, SoftBank [vendor claim, linked from YC page]; team 15 | syncly.app | x.com/synclyhq; linkedin.com/company/synclyhq | not found |
| Trendpop | W21 (acquired Jan 2022 by Collab) | "Leading analytics and insights platform for short-form video marketing" | FIND, FORMAT (analysis of what drives virality) | Music labels (TikTok marketing), brands, creators | Engine analyzed "over a billion social video posts"; profitable within 12 months; used by "hundreds of brands and creators" [vendor claim on YC page]; acquisition by Collab Jan 2022 [checked original page] | trendpop.com | x.com/usetrendpop; linkedin.com/company/usetrendpop | not found |
| Kuli | P26 (Spring 2026) | "AI coworker for marketing teams at the largest consumer brands"; per directory, analyzes social videos to find creators and inform campaigns | FIND, DISTRIBUTE/OPS | Influencer and social marketing teams at big consumer brands (Disney, Nivea, PostHog named) | Team 1 on profile; "largest Fortune 100 entertainment brand now ships 3x more campaigns on Kuli" [vendor claim]; no pricing | kuli.one | linkedin.com/company/kuliai | not found |
| Grocalo | S26 | "AI brain for creators that runs their social content"; personalizes and distributes content using video understanding and platform analytics | FIND/DISTRIBUTE (analytics-driven), PRODUCE (partial) | Creators, esp. entertainers/comedians; "we run content for top entertainers" | "2B views and 4M followers for our creators in the last 2 months" [vendor claim]; team 2; one founder previously sold Onederful (YC W18) | grocalo.com | none listed | not found |
| Knowlify | S25 | Done-for-you video ad agency for paid social: AI UGC ads, Pixar-style animated ads, AI commercials, Meta campaign management | PRODUCE (human-QA'd), DISTRIBUTE/OPS | B2B and B2C companies running paid social | ~25 finished ads/week on monthly plan; first batch 5 days after first call; creative direction within 48h [vendor claim]; no customers named; team 6; pricing "agreed in your proposal", media spend billed separately | knowlify.com | x.com/knowlifyai; linkedin.com/company/knowlify | not found |
| Tell if AI | F25 | AI-run performance marketing agency; autonomous agents on real phones create, post and grow content on YouTube, TikTok, IG, X, Reddit | PRODUCE, DISTRIBUTE | Brands wanting growth; first partner a telehealth clinic | "Hundreds of accounts in parallel", "dozens of channels" for the clinic [vendor claim]; paid on revenue share; team 2 | tellif.ai | none listed | not found |
| InstaAgent | P26 (Spring 2026) | One campaign scaled across hundreds of audiences on Meta and TikTok; personalized creatives from one brief, distributed via paid channels and niche social accounts | PRODUCE, DISTRIBUTE | B2C companies scaling on Meta/TikTok; focus CPG, health, apps | "$1M ARR in 10 months" [vendor claim on YC page]; team 10 | instaagent.com | x.com/InstaAgentAI; linkedin.com/company/instaagent | not found |

#### Tier B: AI UGC / avatar / ad-video generation (PRODUCE)

| Company | Batch | One-liner | Covers | Target customer | Traction / funding (label) | Website | X / LinkedIn | TikTok / IG |
|---|---|---|---|---|---|---|---|---|
| Argil | S24 | "Video generation engine for the creator economy": clone yourself from ~2 min of video or pick an avatar, script in, edited video with subtitles out; API | PRODUCE (avatars, UGC-style ads) | Businesses and creators: branding, education, lead gen, UGC-style product ads | Team 8; YouTuber Kwebblekop (15M subs) reportedly generates "1000 shorts/month" via API [vendor claim]; pricing not on YC page, access via onboarding code at launch; pricing page did not load for me | argil.ai | x.com/argildotai; linkedin.com/company/argilai | not found |
| Gooseworks | W23 | "Self-improving marketing harness"; indexes a brand's videos, product shots, testimonials and ad performance so agents create ads, pages, emails, social | PRODUCE, FORMAT (brand context) | Marketing teams/advertisers (implied, not stated) | A job post (search snippet) claims 200+ paying users and 30,000+ ad creatives in 2 months [vendor claim, search snippet only]; YC page gives no company metrics; team 5 | gooseworks.ai | x.com/GooseworksAI; linkedin.com/company/gooseworks-ai | not found |
| Craze | S22 | AI video platform with creative agent, multi-model access (video, image, music), timeline editor, MCP integration | PRODUCE | Brands, creators, agencies, studios | No traction stated. Consumer pricing $19/mo incl. $19 credits, human editor support, avatars (per third-party profile, dated 2026-07-31) [search/secondary source; not verified on craze.ai] | craze.ai | x.com/crazedotai; linkedin.com/company/crazedotai | not found |
| VideoGen | S24 | Prompts, scripts or articles to copyright-free videos; API | PRODUCE | Creators, businesses, educators | Batch listing via YC video directory [checked original page]; its own site markets a "UGC ad maker" [search snippet only]. No metrics found | videogen.io | not checked | not found |
| Magic Hour | W24 | Browser platform + API to generate/edit video, image, audio ("100+ tools") | PRODUCE | Creators / developers | Team 2 on directory; no metrics found | magichour.ai (not fetched) | not checked | not found |
| Yarn | W24 | "Video product for agentic GTM teams": launch videos, custom demos, explainers, ABM | PRODUCE | B2B founders, sales, marketers | Customers named: DriverAI, Replo, Forge; no metrics; team 6; demo-led, no pricing | yarn.so | x.com/yarn_so; linkedin.com/company/yarn-so | not found |
| Absurd | F25 | Online whiteboard for filmmakers working with AI; used for its own video and ad work | PRODUCE | Filmmakers; also AI brand/performance ads (second hand) | "400K+ organic views" on its own videos [vendor claim, YC directory]; the "brand and performance ads" framing is [search snippet only] | not fetched | not checked | not found |
| tday.com | P26 | Turns a software product into on-brand launch videos, social graphics, ads; then publishes and measures | PRODUCE, DISTRIBUTE | Software companies (implied) | [checked original page: directory row only]; no detail page available (404) | tday.com | not checked | not found |
| Claybird | unknown (2026) | Studio-quality video ads in under 72h for large brands (Coca-Cola, Walmart named) | PRODUCE | Large brands | [search snippet only]; batch and claims unverified | not fetched | not checked | not found |

#### Tier C: AI editing / clipping agents (PRODUCE, partial overlap with "turn into a shot list")

| Company | Batch | One-liner | Covers | Target customer | Traction (label) | Website | X / LinkedIn | TikTok / IG |
|---|---|---|---|---|---|---|---|---|
| Mosaic | W25 | Node-based agentic video editor; tiles for Rough Cut, Montage, Clips, Motion Graphics; exports XML to Resolve/Premiere/Final Cut; API | PRODUCE (clip repurposing) | Creators, podcasters, social marketers, documentary/travel creators | Launch HN had 148 points / 134 comments; free sign-up, node runs paywalled; moderator flagged a cluster of positive low-karma comments [checked original page]; commenters said manual editing still beat the demo output | usemosaic (not fetched) | not checked | not found |
| Overlap | S24 | Multimodal agents that find moments, generate clips, analyze video libraries | FIND (moments within a video), PRODUCE | Media companies (implied: "what takes media companies thousands of hours, we do in seconds") | No metrics; team 6 | overlap.ai | x.com/JoinOverlap; linkedin.com/company/joinoverlap | not found |
| Kestroll | S25 | AI video editing agent (card says podcast production and short clips; launch post says media-asset management) | PRODUCE | Filmmakers, sports-team creatives, studios, agencies (list in launch post) | None; team 2 | kestroll.com | none listed | not found |
| Vyra | F26 | "Personal video editing agent for shortform content": upload footage + text description, no timeline | PRODUCE | Short-form creators (inferred) | None; team 2; co-founder is a freelance editor, other founder is a creator with 80k+ followers | usevyra.com | linkedin.com/company/vyravideo | not found |
| Narrative | F25 | AI video editor for production studios; scene search, timeline generation, terabyte-scale footage | PRODUCE | Studios, pro editors | Public beta [secondary review, thecreatorsai.com, 2025-10-16] | not fetched | not checked | not found |
| Palmier, Diffusion Studio, Voyager (F26) | S24 / F24 / F26 | Editors that AI coding agents can drive; Voyager drives Blender/DaVinci/After Effects | PRODUCE (infra/agent-native) | Developers / creative pros | directory row only | not fetched | not checked | not found |

#### Tier D: creator-marketing and influencer ops (DISTRIBUTE/OPS; relevant if agencies buy creator sourcing)

| Company | Batch | One-liner | Target customer | Traction (label) |
|---|---|---|---|---|
| Reacher | S25 | AI platform for creator discovery, outreach, campaign mgmt on TikTok Shop, IG, YouTube | Ecommerce agencies, DTC and enterprise brands; "book a demo" | No metrics; team 10 [checked original page]. reacherapp.com; x.com/ReacherApp |
| 1stCollab | W23 | Automated influencer marketing: outreach, contracts, payments, tracking | Startups doing first campaigns up to brands scaling to thousands of creators | "Hundreds of startups" launched first campaigns; Framer, Locket, Gamma, SnapCalorie case studies; claims competitors cost >$30k/yr [vendor claim]; team 11. 1stcollab.com |
| Beluga | P25 | Fully managed creator marketing campaigns with attributable results | Brands | Directory row only [checked original page] |
| TryNearby | S26 | Matches local restaurants with nearby creators who film/post reviews; AI handles matching and booking | Local restaurants | Directory + search snippet only; team 5 |
| Ad Army | S22 | Model-agnostic AI creative tool keeping characters/products consistent across ad assets | Brands | Directory row only |
| Wondercraft | S22 | Creates video via natural-language conversation | Not stated | Directory row only |

#### Pivots into / out of the space (verified vs not)
- Craze (S22): shut its HR/payroll/compliance product for Indian startups around April 2025 ("Craze is officially dead", per the founder's post as reported by a third-party profile), then relaunched as Craze AI, first a general agent layer, then AI video. YC page shows the company now as AI video, based in Mumbai. The profile's motive for the shutdown is the author's inference, not a founder statement. [secondary source: yespress.io, dated 2026-07-31; YC page confirms current AI-video positioning]
- Gooseworks (W23): YC page shows founders previously ran Athina AI (LLM observability/eval, W23) and now lead AI marketing/ad creative with the same two founders. The YC page does not call it a pivot; I infer the move from the founders' histories. [checked original page]
- Syncly (W23): co-founders previously started Sualab (video AI); stayed in video-analysis. Not a pivot.
- Knowlify (S25): from memory I believed it started as an AI explainer-video product; I could NOT verify this on the YC pages (neither mentions a pivot). Do not cite as a pivot without checking.
- Trendpop (W21): exited by acquisition to Collab (Jan 2022), not a pivot.
- Mindbase (W22): a search snippet says it runs AI avatar influencers on IG/YouTube with brands paying $1,000-$4,000/month per AI influencer [search snippet only; vendor claim]; the YC company page returned 404 so status is unknown.
- Affogato (Launch YC post "Affogato Video Agent: Create Viral TikTok/IG videos with AI"): YC launch page does not give a batch; claims "1.5 million creators and businesses" use it; affogato.ai. Batch and YC status unverified. [checked original page; vendor claim]

### Inferences
- The "find" layer (outlier detection plus format grouping) is the empty quadrant in YC. Syncly and Kuli do video analysis but for large-brand listening and creator sourcing, not for agencies picking a format to film. Bluma comes closest on "remix" but is a generation tool, not a client-approval/shot-list workflow.
- A YC-backed company with the exact Trend Finder wedge (small agencies, client approval, editor shot list) was not found. Absence in my sample is not proof: directory lists were truncated (see scope caveat), and F26 batch companies appeared in the lists while descriptions for some are thin.
- Most-likely direct competitors for a buyer's attention: Bluma (remix), Syncly (listening), Knowlify and Tell if AI (done-for-you agencies that could be competitors or channel partners for small agencies).
- Several new entrants are "agency-as-software" (Knowlify, Tell if AI, InstaAgent): they sell outcomes, not tools, which competes with small marketing agencies rather than serving them.

### Gaps
- No TikTok/IG handles found for any company; YC pages list only X and LinkedIn. A manual check on each company's site footer is needed.
- Could not confirm YC status or batch for Creatify (not found in YC directory; the YC URL returned 404; search found Series A coverage but no YC link), Affogato, Mindbase, Claybird, Absurd's ad business.
- Directory lists were truncated (50 of 72 / 140 / 79 rows), so older-batch companies in video/marketing/content are not covered. Not seen: whatever sits in rows 51+ of each list.
- No pricing numbers for any YC company except Craze ($19/mo, secondary source). Argil's pricing page did not render.
- Opus Clip, Captions, HeyGen, Arcads, Submagic etc. are not YC per my searches (not confirmed in the directory); excluded.

---

## What pricing and go-to-market do these companies use (self-serve creator vs agency vs enterprise brand)?

### Takeaway
Pricing is mostly undisclosed; GTM splits into three: (1) self-serve credits-based tools for creators and SMB (Craze $19/mo, Mosaic free sign-up with paid node runs, Argil credits), (2) done-for-you or revenue-share services (Knowlify proposal-based, Tell if AI revenue share), (3) demo-led enterprise/CPG (Syncly, Kuli, Reacher, Yarn). Freemium hooks on the discovery layer (Syncly Creator "start for free", 1stCollab free creator sourcing) are used to pull in the mid-market.

### Cited Findings
- Craze: $19/month including $19 of credits, human editor support, avatars, unlimited exports — [yespress.io profile](https://yespress.io/craze-yc-s22), dated 2026-07-31, accessed 2026-10-30 [secondary source; not checked on craze.ai].
- Mosaic: free sign-up; node runs paywalled to cover model cost; a "Creator plan" mentioned by a commenter without price; 20GB / 90-minute per-file limit — [Launch HN: Mosaic (YC W25)](https://news.ycombinator.com/item?id=45980760), accessed 2026-10-30 [checked original page].
- Knowlify: no published price, "pricing agreed in your proposal", ad spend billed separately; about 25 finished ads/week on a monthly plan; human QC on every ad — [YC: Knowlify](https://www.ycombinator.com/companies/knowlify), accessed 2026-10-30 [checked original page; vendor claim].
- Tell if AI: revenue-share compensation, no fixed price — [YC: Tell if AI](https://www.ycombinator.com/companies/tell-if-ai), accessed 2026-10-30 [checked original page].
- Syncly: no pricing; "Get a demo" plus "Start for free" for Syncly Creator; customers named include LG; sells to large CPG (Tiffany, Clorox) — [syncly.app](https://syncly.app/) and [YC: Syncly](https://www.ycombinator.com/companies/syncly), accessed 2026-10-30 [checked original page; vendor claim].
- 1stCollab: creator sourcing "free to try"; page says competing platforms cost more than $30k/year (no own price given) — [YC: 1stCollab](https://www.ycombinator.com/companies/1stcollab), accessed 2026-10-30 [checked original page; vendor claim].
- Reacher: no pricing; "book a demo"; targets ecommerce agencies, DTC and enterprise brands — [YC: Reacher](https://www.ycombinator.com/companies/reacher), accessed 2026-10-30 [checked original page].
- Argil: at YC launch, access via onboarding-code form; targets creators and businesses; API offered; Kwebblekop (15M subscribers) cited as API-driven user — [YC: Argil](https://www.ycombinator.com/companies/argil), accessed 2026-10-30 [checked original page; vendor claim]. Pricing page did not render: [argil.ai/pricing](https://www.argil.ai/pricing).
- Bluma: no waitlist or paywall at launch (beta); its site shows no pricing — [YC: Bluma](https://www.ycombinator.com/companies/bluma), [getbluma.com](https://www.getbluma.com), accessed 2026-10-30 [checked original page].
- Kuli: no pricing; the page contrasts the product with a "$50K/month agency" and says some clients cut agency fees — [YC: Kuli](https://www.ycombinator.com/companies/kuli), accessed 2026-10-30 [checked original page; vendor claim].
- Yarn: demo-led (15-minute demo), no pricing — [YC: Yarn](https://www.ycombinator.com/companies/yarn-2), accessed 2026-10-30 [checked original page].
- Mindbase (W22): brands reportedly pay $1,000–$4,000/month per AI influencer — [search snippet (ycombinator.com search)](https://www.ycombinator.com/companies/industry/marketing), accessed 2026-10-30 [search snippet only; vendor claim]; company page 404.

### Inferences
- Nobody in this set publishes agency-tier pricing. A $19/mo credit tool (Craze) and $1k–4k/mo managed services (Mindbase) bracket the range; a small-agency per-seat price would land between them. This is an inference, not a sourced number.
- "Free creator discovery" as a funnel (Syncly Creator, 1stCollab) suggests the discovery layer is treated as a lead-in, not the monetized product.

### Gaps
- No actual price lists found for Argil, Bluma, Syncly, Kuli, Reacher, Yarn, Magic Hour, VideoGen. Next step: check each company's live pricing page in a browser.
- No data on contract sizes or agency vs brand revenue splits.

---

## Did any YC companies in this space fail or shut down, and why?

### Takeaway
Two clear exits: Reforged Labs (YC-backed AI video ads for game studios) wound down in Aug 2026 saying the market was too small and models closed the gap; Trendpop (W21) was acquired in Jan 2022. Craze shut its original product and pivoted into AI video. I found no postmortem from a YC short-form trend-discovery company.

### Cited Findings
- Reforged Labs wound down after about three years; CEO Robert Huynh: "The market is small", "The models became so capable that we rewrote major parts of our own product around them", "The gap we were selling into is closing"; best customers signed six-figure contracts but few studios were at that scale; expansion beyond gaming "didn't work well enough". $3.9M seed in 2024 led by DCM; YC listed among investors, batch not stated in the article — [PocketGamer.biz, 2026-08-03](https://pocketgamer.biz/reforged-labs-shuts-down-as-ceo-says-ai-is-closing-its-market-opportunity/), accessed 2026-10-30 [checked original page]. A search snippet gave a different co-founder surname and shutdown date (conflicting; the PocketGamer article gives no exact date).
- Trendpop (W21) acquired by Collab, Jan 2022; reported by Mobile Marketing Magazine 2022-02-16 per YC page — [YC: Trendpop](https://www.ycombinator.com/companies/trendpop), accessed 2026-10-30 [checked original page]. Reason for the sale not stated.
- Craze (S22) closed its HR/payroll product ~April 2025 and rebuilt around AI video — [yespress.io](https://yespress.io/craze-yc-s22), accessed 2026-10-30 [secondary source; motive is the author's inference].
- The YC directory shows other media-adjacent exits (Vidpresso W14 acquired by Facebook 2018; Loom W12 acquired) but these are old and not short-form trend tools — [YC media directory](https://www.ycombinator.com/companies/industry/media), accessed 2026-10-30 [checked original page].
- A Hacker News "Show HN" thread titled "The Content Repurposing Fallacy: AI Clips Underperform" argues auto-clipped content underperforms platform-native content — [HN item 47230750](https://news.ycombinator.com/item?id=47230750), accessed 2026-10-30 [search snippet only; the author's own claim, not a YC company].

### Inferences
- The Reforged lesson (vertical niche too small; foundation models absorb the "gap") applies to any thin-wrapper video-generation play. A workflow product (trend research plus client approval) is less exposed to model improvements than a pure generation product, but that is an inference.
- Only one data point (Trendpop) on trend analytics as a standalone business: it was profitable early and sold small. No evidence of a venture-scale outcome in this layer.

### Gaps
- No postmortems found for Trendpop's acquisition terms or reasoning.
- Did not search for inactive/dead companies deep in the YC directory (the status filter was not used). A search of the directory for "Inactive" with video/social tags would surface more.

---

## What does YC itself signal (Requests for Startups, partner talks) about AI video, content and creator tools?

### Takeaway
The current RFS page lists nothing on video, content or creators. The signal from YC is behavioral instead: a large cohort of video, ad-creative and creator-marketing companies in every recent batch (F25 through F26), with partner-attributed ones including Gooseworks (Brad Flora) and Vyra (Aaron Epstein). I found no partner talk or Lightcone episode specifically about AI viral video or creator tools.

### Cited Findings
- The current YC Requests for Startups page lists 11 items, all W27 batch: Space access, "$15-an-Hour Expert", Robots Made in America, "LLMs That Write Well" (Jared Friedman), Plaid for Government Benefits, Wall Street for the Physical Buildout, Vertical Foundation Models, AI for City Hall, Data Center Supply Chain, AI for the Air-Gapped Economy, Own Your Intelligence. None mention video, content, creator, marketing, advertising or social. "LLMs That Write Well" is the nearest thematic neighbour (writing voice and style) — [YC RFS](https://www.ycombinator.com/rfs), accessed 2026-10-30 [checked original page]. The page has no explicit date; footer says 2026 and W27 is the newest batch.
- A Creators' AI newsletter claimed YC's Fall 2025 RFS "outlined their vision and backs founders building tools and platforms for a video-first future" — search-engine summary of [Creators' AI](https://thecreatorsai.com/p/yc-ai-startup-f25-batch-review), accessed 2026-10-30. When I fetched that article, it was a F25 batch review, not the RFS text, and I could not verify the quote. [search snippet only, unverified]
- The Creators' AI Summer 2025 RFS article is paywalled after its "full-stack AI" section; no video/content mention in the visible text — [Creators' AI, 2025-05-08](https://thecreatorsai.com/p/ai-startups-ideas-by-yc-summer-25), accessed 2026-10-30 [checked original page, partial].
- YC directory volume: Creator Economy tag lists 31 companies (28 active), including F26 (Yam), S26 (Grocalo, TryNearby), F25 (Flick, Koyal), S25 (Reacher), P25 (Beluga) — [YC Creator Economy](https://www.ycombinator.com/companies/industry/Creator%20Economy), accessed 2026-10-30 [checked original page]. Video tag lists 72 companies — [YC Video](https://www.ycombinator.com/companies/industry/video), accessed 2026-10-30 [checked original page].
- Partner attributions on YC pages: Gooseworks lists Brad Flora as primary partner; Vyra lists Aaron Epstein — [YC: Gooseworks](https://www.ycombinator.com/companies/gooseworks), [YC: Vyra](https://www.ycombinator.com/companies/vyra), accessed 2026-10-30 [checked original page]. These show partner interest, not a public statement.
- Lightcone coverage found: an episode on Sora and building foundation models, and "Consumer is back" / "Better AI Models, Better Startups"; none specific to short-form video or creators — search results, accessed 2026-10-30 [search snippet only].
- Garry Tan recent public remarks found concern AI-native small teams, "Own Your Intelligence", and distillation; nothing on video or creators — [search results incl. YouTube](https://www.youtube.com/watch?v=eRrc1pUY5oU), accessed 2026-10-30 [search snippet only].

### Inferences
- Absence from the current RFS suggests YC's partners are not actively soliciting AI-video/creator startups, while the directory shows founders keep arriving anyway (many F25–F26 companies). The directory is the better signal for "who is building"; the RFS is the better signal for "what YC wants".
- Several current-batch pitches sell outcomes (agency-as-software), consistent with YC's broader "AI-native services" theme, but I did not verify that theme in the current RFS text.

### Gaps
- Could not retrieve past RFS pages (Fall 2025, Spring 2026) from ycombinator.com; the "video-first future" quote is unverified.
- No YC partner talk, blog post, or Lightcone episode specifically on short-form video, viral content, or creator tools was found. A targeted YouTube transcript search of Lightcone/YC channels is the next step.
- Launch HN coverage: only Mosaic (W25) found as relevant; Bloomy (S26) is unrelated. No Launch HN for Bluma, Syncly, Kuli, or Grocalo was found (not exhaustively searched).
