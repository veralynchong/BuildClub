# Community research: AI storyboards / scripts, remake workflows, node canvases (Reddit)

Accessed: 2026-11-02. Window: ~2025-11 to 2026-11. Free sources only, no paid APIs.
Scope (per coordinator): Reddit is the evidence base. The X half is left to the Grok prompt run by the user; the lead will cross-check. X items below are only web-search snippets, labelled UNVERIFIED, and carry no engagement numbers.

## How the Reddit data was collected (limits every claim)

- reddit.com is blocked for WebSearch/WebFetch and login-walled in the browser. Used (a) Reddit public RSS "top of year" lists (rank order only, no scores) for r/UGCcreators, r/TikTokMarketing, r/socialmedia, r/comfyui, r/aivideo, then (b) the Arctic Shift archive for body, score and top comments of 24 threads.
- Arctic Shift title/keyword search timed out or was rate-limited on nearly every query, so keyword search of Reddit did NOT work. Coverage is limited to threads that surfaced in those five top-100 lists. r/UGCcreators' top-100 is almost all paid-job ads. Scores are archive snapshots and may lag.
- Not covered: r/ClaudeAI, r/ChatGPT, r/marketing, r/Entrepreneur, r/advertising (one thread only via a mirror). Sandcastles, Virlo, Format Finder, CapCut templates, Notion shot lists: no Reddit discussion surfaced.
- Raw data: `raw/reddit-top-year.json` (500 ranked titles), `raw/reddit-threads.json` (bodies + top comments).

Labels: [R] Reddit evidence. [X-UNVERIFIED] web-search snippet of an X post, not Grok, not checked.

---

## Reddit views

### 1. Raw AI copy is detectable; AI is fine for drafts and structure, human voice and rewrite matter [R]

- r/socialmedia, "We need to talk about the 'AI Voice' in comments. It's killing brand personality." 2026-02-03, 29 pts, 9 comments (an agency auditor). https://www.reddit.com/r/socialmedia/comments/1quuxmw/
  - Top comment (8): "I use AI in two places: triage... and rough drafts... But I never paste a suggested reply raw." Another (2): "AI is fine for drafting, but if you post it raw..." OP's test: told the community manager to write "like they were texting a friend", lowercase, short, no repeating the user's point. Caveat: this is about comment replies, not scripts. Adjacent evidence.
- r/socialmedia, "AI content has completely killed my trust in creators..." 2026-04-29, 16 pts, 18 comments. https://www.reddit.com/r/socialmedia/comments/1sypdt4/
  - Comment (7), from someone in marketing: "the hook lands but nothing after it does"; you "feel the difference even when you can't prove it. too clean. too structured."
  - OP claim: "AI content often performs better. better hooks, better structure." This contradicts our interview finding (AI scripts got fewer views). OP opinion, no data.
- r/UGCcreators, "Goodbye AI UGC?!?! Sora is shutting down" 2026-03-24, 59 pts. https://www.reddit.com/r/UGCcreators/comments/1s2sj27/
  - Top comment (20): "Content should never be replaced with complete AI copy and paste." Creator-side bias (their income is threatened).
- No Reddit source quantifies views for AI-written vs human-written scripts.

### 2. Formulaic AI-style hooks get recognized and tuned out [R, thin]

- r/socialmedia, "I analyzed 1000+ viral hooks..." 2026-03-25, 46 pts. https://www.reddit.com/r/socialmedia/comments/1s3df4h/ . Poster built an AI hook tool (self-promo). Comment (2): "I think they're over done, people recognize them instantly and it trips their advertising alarm."
- r/TikTokMarketing, hook-breakdown threads: "I broke down 100 top-performing TikTok app install ads by hook type" 2026-04-03, 4 pts (https://www.reddit.com/r/TikTokMarketing/comments/1sbnmjk/) and "I analyzed 50 viral TikTok business accounts" 2026-04-14, 6 pts (https://www.reddit.com/r/TikTokMarketing/comments/1sl86o0/). Low engagement; weak evidence that people want to break down viral videos by hook, not evidence about remaking.

### 3. AI UGC: Reddit creators are skeptical; value is fast testing, not replacing creators [R]

- r/UGCcreators Sora thread (view 1): complains that X and LinkedIn are "flooded with 'unlimited UGC at scale'" posts.
- r/advertising Creatify review, ~Feb 2025 (outside window; read via a snapshot mirror; 1 pt; low weight): "the big win wasn't 'AI ads magically outperform everything'"; faster testing, would not rely on it instead of good creators. https://reddit.sentinel-team.org/posts/1puqgtr/snapshots/2025-12-26T11%3A00%3A47.364265Z
- r/comfyui, "The real skill in AI video is picking the right reference TYPE per shot" 2026-07-02, 366 pts. https://www.reddit.com/r/comfyui/comments/1ul9iei/ . Credibility warning: top comments call it promo: (68) "Seedance really wants to get more people with all their ads lmao", (54) "Wow its almost like if you put enough human effort into creating something it add some value to the output?"

### 4. Real footage + AI is the credible hybrid [R]

- r/comfyui, "Live action + AI might be the most practical future for filmmaking" 2026-09-03, 476 pts. https://www.reddit.com/r/comfyui/comments/1w62m2b/ . Top comment (46): useful for smaller filmmakers if you do real staging, direction, lighting; (9) quoting an article: "If the film is engaging enough, you can't really detect the AI. Once people know it is AI, they go looking for it." Supports building on the client's real footage. Different domain (film), not short-form ads.

### 5. Cheap per-unit regenerate beats "one-click" [R]

- r/comfyui, "The part of AI filmmaking nobody shows you: I generate around sixteen takes and keep two" 2026-06-29, 358 pts. https://www.reddit.com/r/comfyui/comments/1uigo98/ . Top comment (70): "the real issue is the cost per re-run... it turns a slot machine into a tool." Another (13): "14 fails with seedance 2, that's expensive." Matches per-scene regenerate with cheap re-runs.

### 6. Node canvases: power users want a thin app over the graph [R, one strong thread]

- r/comfyui, "ComfyUI stopped feeling comfy, so I spent a year building an open-source app on top of it" 2026-08-06, 318 pts. https://www.reddit.com/r/comfyui/comments/1vh32n7/ . Top comment (10): "Dealing with ComfyUI web is such a pain. At this point, just build a wrapper/gallery for your workflow and get an agent to code it exactly how you want it."
- Weavy, Flora, Freepik Spaces, Krea nodes: no marketer discussion surfaced. Only hit: r/UGCcreators "Weavy.ai workflow input character traits..." 2026-02-10, 1 pt, 0 comments (https://www.reddit.com/r/UGCcreators/comments/1r0x6fh/).
- Cards/doc-style vs canvas preference among marketers: NOT found on Reddit. Unknown either way.

### 7. Remake-a-viral-video workflows [not found on Reddit]

No Reddit thread about recreating a viral video, shot lists, or the named tools surfaced (limited by the search failure above). Treat as a gap, not as absence.

---

## X items (web-search snippets only; UNVERIFIED, not Grok, no engagement figures)

For the lead's Grok cross-check, these are candidates, not findings:
- [X-UNVERIFIED] Nate Curtiss: "we found a way to write YouTube scripts that don't sound like AI, using AI. it takes a brain dump..." https://x.com/natecurtiss_yt/status/2098542992411807918 (lead-magnet style promo).
- [X-UNVERIFIED] Mayank Vora: Claude "mega prompt" for Shorts scripts with a fixed 0-3s hook formula. https://x.com/aiwithmayank/status/2026974589210022069 (templated prompt-pack genre).
- [X-UNVERIFIED] Mike Futia: AI UGC workflow, "One prompt -> five completely different characters... Hook, bridge, and CTA scripts" https://x.com/mikefutia/status/2024627468750246166 ; Kling 3.0 UGC variant https://x.com/mikefutia/status/2021979641687552419 .
- [X-UNVERIFIED] abxxai: "nobody explains how these AI UGC ads get this realistic... here's the entire workflow with prompts" https://x.com/abxxai/status/2095179656802844727 .
- [X-UNVERIFIED] Andrew Bolis: tool that "decodes the 'Viral DNA' of top videos. It extracts the hook and pacing to rebuild it for you." https://x.com/AndrewBolis/status/2024865464908976434 .
- [X-UNVERIFIED] Krea Node Agent / prompt-to-workflow https://x.com/krea_ai/status/2034642297485140143 ; FLORA FAUNA agent https://x.com/floraai/status/2039010265459732754 ; FLORA Techniques ("on the canvas or as a standalone app") https://x.com/weberwongwong/status/2033657578928980447 . Inference only: canvas vendors are adding agent/app layers, which may signal hand-wiring is a barrier for non-builders.
- [X-UNVERIFIED] Weavy user posts: https://x.com/Ror_Fly/status/2062218333852758291 , https://x.com/genue/status/2014310615628603810 ; open-source alternative "Node Banana" https://x.com/ReflctWillie/status/2019376029509513437 .
- No X post found calling Weavy/Flora/Spaces "too complicated". Web reviews outside Reddit/X (Chase Jarvis, Curious Refuge) say steep learning curve, "best for agencies and professionals", worth it only for processes repeated 5+ times: https://chasejarvis.com/blog/what-the-heck-is-weavy-the-100-honest-review-after-the-figma-acqusition/ , https://curiousrefuge.com/blog/which-node-based-ai-platform-is-the-best (web, not community).

## Credibility flags

- r/comfyui 1ul9iei is a thinly veiled Seedance promo (its own top comments say so). r/socialmedia 1s3df4h is a tool-builder's self-promo. r/UGCcreators top-100 is mostly job ads.
- OP claim "AI content often performs better" (1sypdt4) vs our interview ("too robotic, fewer views"): unresolved.

## Which product is the "mascara" node canvas?

Not found: I could not locate the specific viral post of a mascara UGC node workflow; web searches for mascara/beauty with Weavy, Flora, Spaces, Krea returned no match, and Reddit has nothing.

Best inference, about 75-80% Weavy / Figma Weave (web-only basis):
- The sibling note `ux-patterns.md` compared official public product images (Figma blog) and found Weave is a near-black canvas with grey rounded cards, "Prompt" text nodes, thin teal curves for images and pink-purple curves for text; it rated Flora (light), Krea Nodes (light cards), Freepik Spaces (white dot grid) and ComfyUI (yellow wires) as poor matches. I did not independently verify those images.
- Freepik Spaces specifically: a UGC template screenshot I saw in a web-search-linked X post was light-themed with colored group frames, so it does not fit "dark". [X-UNVERIFIED]
- Other dark canvases with UGC templates exist (Higgsfield, Arcads, Melius, Wireflow, Picsart Flow per vendor pages); not visually compared.
- To close it: get the original image and check for a left vertical icon rail, bottom-center toolbar, top-right credits + Share, and pink text wires (all Weave traits).
