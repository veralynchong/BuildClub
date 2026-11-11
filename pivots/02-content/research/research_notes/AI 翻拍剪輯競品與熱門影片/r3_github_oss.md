# Open-source GitHub projects for short-video trend finding, viral analysis, AI remix, auto-editing and trend-to-post agents

Date accessed: 2026-10-30. Method: `gh api` / `gh search repos` against GitHub (star count = `stargazers_count`, last commit = date of newest commit on default branch, license = GitHub license field cross-checked against the LICENSE file or README where noted). No repo was cloned or run.
Labels: [checked original page] = I read the repo's README/LICENSE/metadata via the GitHub API on 2026-10-30. [search snippet only] = seen only in a search-result description. Anything marked "Inference" is my own judgement, not a sourced fact.
Language column = GitHub's primary language field. Stars rounded as returned.

## Q1. Which open-source repos cover each stage (scrape / analyse / remix / auto-edit / end-to-end), and which can we reuse commercially?

### Takeaway
There is a mature layer for downloading and transcribing (yt-dlp, faster-whisper, WhisperX, PySceneDetect) that is permissively licensed and actively maintained, and a crowded, mostly small-star layer of "reference video -> analysis -> new script" projects that appeared in 2026 and are best treated as prompt/schema inspiration. TikTok/Instagram scrapers are actively maintained but are unofficial and inherently fragile; the one pure TikTok scraper with 5k stars (drawrowfly/tiktok-scraper) has been dead since 2023.

### Cited Findings

Reusable = "Y" if license permits commercial use (permissive) AND last commit within ~3 months of 2026-10-30. "Learn" = copyleft/non-OSI/tiny-or-stale, read for ideas only. "?" = needs a legal check.

**Stage 1 - Scraping / collecting trending short videos and metrics**

| # | Repo (URL) | Stars | Last commit | License | Lang | What it does | Reusable? | Source label |
|---|---|---|---|---|---|---|---|---|
| 1 | [davidteather/TikTok-Api](https://github.com/davidteather/TikTok-Api) | 6,720 | 2026-08-24 | MIT | Python | Unofficial TikTok wrapper driven by Playwright; trending, user, hashtag, video info. Needs a browser-cookie `ms_token`; README lists `EmptyResponseException` = "TikTok is blocking the request and detects you're a bot". 139 open issues. | Y (MIT) but fragile; Python, not Node | [checked original page] |
| 2 | [dfreelon/pyktok](https://github.com/dfreelon/pyktok) | 467 | 2025-10-04 | BSD-3-Clause | Python | Collects video, text, metadata from TikTok by hashtag/user/"You May Like"; ~30 items per page; README points academics to the official TikTok Research API (US-based academics only). | Learn (13 months stale, tiny page limits) | [checked original page] |
| 3 | [JoeanAmier/TikTokDownloader](https://github.com/JoeanAmier/TikTokDownloader) | 17,207 | 2026-10-29 | GPL-3.0 | JavaScript (per GitHub) | Douyin/TikTok download + data-collection tool (Chinese README); author states there is no paid/commercial version and no commercial services. | Learn (GPL-3.0 copyleft) | [checked original page] |
| 4 | [Evil0ctal/Douyin_TikTok_Download_API](https://github.com/Evil0ctal/Douyin_TikTok_Download_API) | 20,987 | 2026-10-27 | Apache-2.0 | Python | Self-hosted REST + MCP + CLI service for Douyin/TikTok/Bilibili: posts, authors, comments, hashtags, trending boards, search; no-watermark download; offline speech-to-text; headless-browser identity pool; pure-Python signing (a_bogus, X-Bogus, X-Gnarly...). README admits cookies/signature algorithms change. | Y licence-wise; operational/ToS risk (?) | [checked original page] |
| 5 | [instaloader/instaloader](https://github.com/instaloader/instaloader) | 13,721 | 2026-10-26 | MIT | Python | Downloads Instagram pictures/videos with captions and metadata; uses `--login` for many functions. | Y licence-wise; account-ban/rate-limit risk | [checked original page] |
| 6 | [subzeroid/instagrapi](https://github.com/subzeroid/instagrapi) | 7,041 | 2026-10-28 | MIT (LICENSE file; GitHub API reports NOASSERTION) | Python | Instagram Private API client: reels/stories/albums up and down. README steers production users to paid HikerAPI ("a hosted provider ... may be a better fit than maintaining accounts, proxies, and challenge handling yourself"). | Y licence-wise; private-API = high ToS/ban risk | [checked original page] |
| 7 | [yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp) | 203,762 | 2026-10-29 | Unlicense | Python | Downloader and metadata extractor for YouTube (incl. Shorts), TikTok, Instagram and 1,800+ sites (site count quoted from ViralMint README, which relies on it). | Y (public domain), best maintained | [checked original page] (metadata); site count [search snippet only] |
| 8 | [apify/crawlee](https://github.com/apify/crawlee) | 26,298 | 2026-10-29 | Apache-2.0 | TypeScript | Node scraping/browser-automation library (the SDK underneath Apify Actors). Not a TikTok scraper by itself. | Y - same stack as Trend Finder (Node + Apify) | [checked original page] (metadata only) |

Also seen, not in table: [drawrowfly/tiktok-scraper](https://github.com/drawrowfly/tiktok-scraper) - 5,238 stars, last commit 2023-04-01, no license field, TypeScript - appears abandoned [checked original page: metadata]. [antiops/tiktok-trending-data](https://github.com/antiops/tiktok-trending-data) - 179 stars, active 2026-10-29, no license; scrapes TikTok's web discovery endpoint every 15 min via GitHub Actions and commits JSON diffs; its own history log notes "scrape machine broke" in 2023 and re-enabled several times [checked original page]. [Avnsh1111/Instagram-Reels-Scraper-Auto-Poster](https://github.com/Avnsh1111/Instagram-Reels-Scraper-Auto-Poster) - 314 stars, GPL-3.0, Python, last commit 2026-08-16 [search snippet only for function].

**Stage 2 - Analysing why a video went viral (transcription, hook/format extraction, scene detection, multimodal LLM)**

| # | Repo (URL) | Stars | Last commit | License | Lang | What it does | Reusable? | Source label |
|---|---|---|---|---|---|---|---|---|
| 9 | [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 26,310 | 2026-10-16 | MIT | Python | Fast Whisper transcription via CTranslate2. | Y | [checked original page] (metadata) |
| 10 | [m-bain/whisperX](https://github.com/m-bain/whisperX) | 24,937 | 2026-10-22 | BSD-2-Clause | Python | ASR with word-level timestamps and diarization (useful for hook timing / caption sync). | Y | [checked original page] (metadata) |
| 11 | [Breakthrough/PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | 5,304 | 2026-10-25 | BSD-3-Clause | Python | OpenCV-based scene cut/transition detection; library + CLI. Natural source of shot boundaries for a shot list. | Y | [checked original page] (metadata) |
| 12 | [HUANGCHIHHUNGLeo/claude-real-video](https://github.com/HUANGCHIHHUNGLeo/claude-real-video) | 2,274 | 2026-10-08 | MIT | Python | Turns a video URL into deduplicated scene-aware frames + timestamped transcript so an LLM can "watch" it; `--grid` packs frames into contact sheets. Has a paid "crv Pro" add-on sold separately. | Y (MIT, free tier) - pattern for frame sampling for multimodal LLMs | [checked original page] |
| 13 | [byjlw/video-analyzer](https://github.com/byjlw/video-analyzer) | 1,606 | 2026-04-19 | Apache-2.0 | Python | Key frames -> vision model (Llama 3.2 Vision via Ollama or OpenAI-compatible) + Whisper transcript -> description. | Y but 6 months idle | [checked original page] |
| 14 | [Mharis-code/videoanalyzer](https://github.com/Mharis-code/videoanalyzer) | 15 | 2026-06-10 | MIT | Python | Claude Code skill: TikTok/Reel/Shorts URL -> report with format breakdown, topic/angle, hook analysis (spoken + visual hook, category, "swipeable madlib template"), timestamped beat-by-beat storytelling table, CTA mechanics, "replication playbook". Uses yt-dlp. | Learn (tiny, but schema is exactly our "format" idea) | [checked original page] |
| 15 | [EricKennedy101/viralclarity-app](https://github.com/EricKennedy101/viralclarity-app) | 1 | 2026-02-01 | Apache-2.0 | TypeScript | Next.js + Supabase app: upload MP4, Whisper transcript, GPT-4o-mini analysis of hooks, retention beats, rewrites; save reusable templates; Paddle billing. Closest stack match (TS/React) but upload-only and not maintained since Feb 2026. | Learn | [checked original page] |
| 16 | [google-gemini/cookbook](https://github.com/google-gemini/cookbook) | 17,880 | 2026-10-27 | Apache-2.0 | Jupyter | Official Gemini API examples incl. video understanding patterns. Content of video notebooks not opened. | Y (examples) | [checked original page] (metadata only) |

**Stage 3 - AI remixing: reference video -> new script / storyboard**

| # | Repo (URL) | Stars | Last commit | License | Lang | What it does | Reusable? | Source label |
|---|---|---|---|---|---|---|---|---|
| 17 | [zthisgood/hot-video-recreate](https://github.com/zthisgood/hot-video-recreate) | 29 | 2026-07-18 | MIT | Python | "Reference video + product image -> your video": extracts the reference's "structure DNA" (shot composition, rhythm, motion grammar, transition logic), migrates it cross-category so output is not a copy, routes each segment to the cheapest adequate video model (Seedance supported now; Kling/Wan/Veo planned). Chinese-first README. | Learn (small, early; concept matches our "format -> shot list") | [checked original page] |
| 18 | [HKUDS/ViMax](https://github.com/HKUDS/ViMax) | 12,801 | 2026-09-30 | MIT | Python | Agentic "director/screenwriter/producer": Idea2Video and Script2Video produce scripts, storyboards, shots, finished video; v1.2.0 (2026-07-20) added a Web UI with storyboard previews. | Y (MIT); fiction-oriented, not marketing | [checked original page] |
| 19 | [Agent-Field/reels-af](https://github.com/Agent-Field/reels-af) | 122 | 2026-06-05 | Apache-2.0 | Python | Article URL or topic -> 1080x1920 reel (~80 s, ~US$0.10 claimed). 18 specialised reasoners; writes Hook -> Mechanism -> Payoff script; topic mode runs hunters -> critic -> narrators -> judge. Cost figure is the README's own claim. | Y licence-wise; Learn for script prompts | [checked original page] |

Also seen: [ATH-MaaS/Pixelle-Video](https://github.com/ATH-MaaS/Pixelle-Video) - 29,545 stars, Apache-2.0, last commit 2026-06-14, ComfyUI/RunningHub-based text-to-short-video engine [checked original page: metadata + README grep]. [linyqh/NarratoAI](https://github.com/linyqh/NarratoAI) - 11,623 stars, MIT, last commit 2026-10-24; LLM film-commentary + auto-cut; optional TwelveLabs Pegasus backend for native video understanding [checked original page]. Several 0-30-star "reference-video storyboard" agent skills exist (e.g. ninestonelee/youtube-shorts-factory, 8TrafficAI/reference-video-director, 4b2kxcgjn9-afk/video-storyboard-breakdown) [search snippet only].

**Stage 4 - AI video generation / editing pipelines for short-form**

| # | Repo (URL) | Stars | Last commit | License | Lang | What it does | Reusable? | Source label |
|---|---|---|---|---|---|---|---|---|
| 20 | [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo) | 136,345 | 2026-10-30 | MIT | Python | Topic/keyword -> script, stock footage, TTS, subtitles, HD short video; very active. Faceless-video generator. | Y (MIT) | [checked original page] (metadata, license) |
| 21 | [RayVentura/ShortGPT](https://github.com/RayVentura/ShortGPT) | 8,089 | 2025-02-10 | MIT | Python | LLM-driven shorts automation; "EditingEngine" with an Editing Markup Language/JSON editable by LLMs; MoviePy, ElevenLabs/EdgeTTS, Pexels. Self-described "experimental". | Learn (9 months idle; EML idea is relevant to editable shot lists) | [checked original page] |
| 22 | [Anil-matcha/AI-Youtube-Shorts-Generator](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator) | 5,657 | 2026-10-24 | MIT | Python | Long YouTube video -> ranked 9:16 clips via GPT-class highlight detection + Whisper + auto-crop; positioned as Opus Clip alternative. README promotes the vendor's paid MuAPI APIs. | Y (MIT); check API dependence | [checked original page] |
| 23 | [mutonby/openshorts](https://github.com/mutonby/openshorts) | 7,323 | 2026-10-29 | MIT | Python | Self-hostable Opus Clip alternative: Gemini finds 3-15 viral moments from transcript + scene boundaries; AI actors with lip-sync, b-roll, TikTok-style subtitles; direct publish to TikTok/Instagram/YouTube; claimed US$0.65-2 per video. Has hosted paid plans. | Y (MIT) | [checked original page] |
| 24 | [modelscope/FunClip](https://github.com/modelscope/FunClip) | 6,474 | 2026-10-08 | MIT | Python | FunASR transcription + subtitles + LLM-assisted clipping. | Y | [checked original page] (metadata) |
| 25 | [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 68,943 | 2026-10-29 | Custom "Remotion License" (GitHub: NOASSERTION) | TypeScript | Programmatic video in React. Free for individuals, for-profits with up to 3 employees, non-profits and evaluation; other for-profit companies need a company licence; forbidden to modify/resell a derivative of Remotion itself. See also remotion-dev/template-tiktok (297 stars, Whisper.cpp TikTok-style captions, no licence field). | ? - fits Node/React stack but licence needs review before embedding in a paid product | [checked original page] (LICENSE.md) |

Not in table: [ClipsAI/clipsai](https://github.com/ClipsAI/clipsai) - 559 stars, MIT, last commit 2024-01-17 (stale) [checked original page: metadata].

**Stage 5 - End-to-end "find trend -> make video -> post" agents**

| # | Repo (URL) | Stars | Last commit | License | Lang | What it does | Reusable? | Source label |
|---|---|---|---|---|---|---|---|---|
| 26 | [openclaw-easy/ViralMint](https://github.com/openclaw-easy/ViralMint) | 182 | 2026-10-24 | AGPL-3.0 | Python (FastAPI) + React | Local-first: Scout trends across YouTube/TikTok/Douyin with AI virality score, Google-Trends signal, view-velocity and outlier detection ("3x-20x the channel baseline"); Whisper transcript/analyse; clip long videos; script + render captioned stock-footage videos; AI-drafted title/description/tags. Agents (Planner, Scout, Download, Analyzer, Generator) + MCP server with 69 tools. Uses yt-dlp for download; YouTube Data API v3 key (10K units/day free). README says posting is "ready to post". Closest functional overlap with Trend Finder. | Learn (AGPL-3.0; do not copy code into closed product) | [checked original page] |
| 27 | [FujiwaraChoki/MoneyPrinterV2](https://github.com/FujiwaraChoki/MoneyPrinterV2) | 32,253 | 2026-09-15 | AGPL-3.0 | Python | Twitter bot, YouTube Shorts automator with cron scheduler, affiliate marketing, cold-outreach. | Learn (AGPL) | [checked original page] |
| 28 | [gitroomhq/postiz-app](https://github.com/gitroomhq/postiz-app) | 40,136 | 2026-10-28 | AGPL-3.0 | TypeScript | Agentic social-media scheduling tool (posting layer). | ? - AGPL; usable as a separately-run service, not as embedded code | [checked original page] (metadata) |
| 29 | [wkaisertexas/tiktok-uploader](https://github.com/wkaisertexas/tiktok-uploader) | 781 | 2026-02-12 | MIT | Python | Browser-automation TikTok uploader (Selenium-style cookie login, per its description "Automatically upload TikTok videos"). | Y licence-wise; UI-automation fragility; 8 months idle | [checked original page] (metadata) |
| 30 | [makiisthenes/TiktokAutoUploader](https://github.com/makiisthenes/TiktokAutoUploader) | 1,208 | 2026-10-16 | AGPL-3.0 | Python | CLI that edits videos and uploads to TikTok "with Requests not Selenium". | Learn (AGPL, private-endpoint) | [checked original page] (metadata) |

### Inferences
- Inference: for Trend Finder's stack (Node/React + Apify), the realistically reusable pieces are runtime tools called as subprocesses/services (yt-dlp, PySceneDetect, faster-whisper/WhisperX) and Apache/MIT prompt/schema ideas, not code libraries imported into the Node app.
- Inference: a gap exists. I found no maintained permissive-licensed repo that does the full "outlier detection per niche -> group into formats -> editable shot list" workflow; ViralMint is nearest but AGPL, and the format-grouping (clustering) step was not visible in its README.
- Inference: star counts in the 2026 "viral video remake" niche are mostly <200, so they signal a hot idea, not proven software.

### Gaps
- Did not search Hacker News or awesome-lists (time budget); coverage comes from GitHub search + topic queries only. Multi-word `gh search` queries often returned thin results, so repos with unconventional naming may be missed.
- Did not verify any repo's functionality by running it (instructed not to). Feature descriptions are README claims.
- Did not open google-gemini/cookbook video notebooks, Postiz internals, or ViMax/NarratoAI code.
- "Last commit" is newest commit on the default branch via API; release cadence/issue-response times were not measured except TikTok-Api open-issue count.
- Format-grouping/clustering projects for short videos: none found.

## Q2. Which 5 repos are most useful for us, and why?

### Takeaway
Highest value: PySceneDetect and yt-dlp (reuse directly), ViralMint (closest product to study, AGPL so learn only), Mharis-code/videoanalyzer (the analysis schema we want) and hot-video-recreate (the "format DNA -> new video" remix idea).

### Cited Findings
1. **Breakthrough/PySceneDetect** (BSD-3-Clause, 5,304 stars, commit 2026-10-25) - scene cut detection library/CLI; gives shot boundaries to seed an editable shot list. [PySceneDetect](https://github.com/Breakthrough/PySceneDetect) [checked original page: metadata]
2. **yt-dlp/yt-dlp** (Unlicense, 203,762 stars, commit 2026-10-29) - one tool to fetch media + metadata from YouTube/TikTok/Instagram; already the download layer in ViralMint and in the Mharis skill ("Works on any platform yt-dlp supports"). [yt-dlp](https://github.com/yt-dlp/yt-dlp), [ViralMint README](https://github.com/openclaw-easy/ViralMint), [videoanalyzer README](https://github.com/Mharis-code/videoanalyzer) [checked original page]
3. **openclaw-easy/ViralMint** (AGPL-3.0, 182 stars, commit 2026-10-24) - product benchmark: outlier detection at 3x-20x channel baseline, view-velocity, virality scoring, clip scoring on hook/flow/value/trend-fit/shareability, MCP server. Study; do not copy code. [ViralMint](https://github.com/openclaw-easy/ViralMint) [checked original page]
4. **Mharis-code/videoanalyzer** (MIT, 15 stars, commit 2026-06-10) - ready-made report structure: format breakdown, hook analysis (spoken/visual, category, madlib template), timestamped beat table, CTA, replication playbook. Adapt the schema into our own prompts. [videoanalyzer](https://github.com/Mharis-code/videoanalyzer) [checked original page]
5. **zthisgood/hot-video-recreate** (MIT, 29 stars, commit 2026-07-18) - describes extracting structure DNA (shot composition, rhythm, motion, transitions) from a reference and transferring it to a different product/category, which mirrors "format -> shot list -> remix". [hot-video-recreate](https://github.com/zthisgood/hot-video-recreate) [checked original page]

Honourable mentions: faster-whisper / WhisperX (transcripts with word timestamps), reels-af (Hook->Mechanism->Payoff script prompts, Apache-2.0), Apify/crawlee (same Node stack), claude-real-video (frame-sampling for multimodal LLMs), Remotion (if the licence fits).

### Inferences
- Inference: items 1-2 are the only two that are both commercial-friendly licensed and heavily maintained, so they are the safest "build on" picks; 3-5 are idea sources.
- Inference: the whisper-based pieces could be replaced by a hosted multimodal model (e.g. Gemini) if self-hosting Python is unwanted; not tested.

### Gaps
- No quality benchmarks were run on any of these; ranking is by fit and licence/maintenance only.

## Q3. Which scrapers break often or carry ToS/legal risk?

### Takeaway
Every unofficial TikTok/Instagram scraper depends on reverse-engineered signatures, cookies or private endpoints and is fragile by design; several maintainers say so themselves. The only sanctioned TikTok route found is the Research API, restricted to US-based academics.

### Cited Findings
- TikTok-Api README: `EmptyResponseException` means TikTok is blocking the request and detects a bot; requires your own `ms_token` from browser cookies. 2 of 139 open issues match "EmptyResponse" in GitHub issue search. — [TikTok-Api](https://github.com/davidteather/TikTok-Api)
- drawrowfly/tiktok-scraper: 5,238 stars but last commit 2023-04-01 - illustrates scraper rot. — [repo](https://github.com/drawrowfly/tiktok-scraper)
- antiops/tiktok-trending-data history log records the scrape "broke" in 2023 and was re-enabled several times. — [repo](https://github.com/antiops/tiktok-trending-data)
- Douyin_TikTok_Download_API README: "A cookie expires, a signature algorithm changes"; relies on signing algorithms (a_bogus, X-Bogus, X-Gnarly, X-Dynosaur) and a self-maintaining identity pool. — [repo](https://github.com/Evil0ctal/Douyin_TikTok_Download_API)
- pyktok README: "TikTok now offers an official research API to US-based academics"; also says cookie initialisation "may not be necessary for all users. YMMV" and TikTok does not always honour requested counts. — [pyktok](https://github.com/dfreelon/pyktok)
- instagrapi README steers production users to the paid HikerAPI because maintaining accounts, proxies and challenge handling yourself is burdensome; it is a private-API client. — [instagrapi](https://github.com/subzeroid/instagrapi)
- instaloader requires `--login` for many functions (account exposure risk). — [instaloader](https://github.com/instaloader/instaloader)
- TikTokDownloader (GPL-3.0) ships a disclaimer (免責聲明) that users must read and accept at first run, and its author states the project has no commercial offering. — [repo](https://github.com/JoeanAmier/TikTokDownloader)
- Uploaders: TiktokAutoUploader (AGPL-3.0) uses requests against non-public endpoints; tiktok-uploader automates the browser. — [TiktokAutoUploader](https://github.com/makiisthenes/TiktokAutoUploader), [tiktok-uploader](https://github.com/wkaisertexas/tiktok-uploader) [checked original page: descriptions only]

### Inferences
- Inference: platform Terms of Service almost certainly prohibit automated access and private-API use for TikTok and Instagram, and YouTube has an official Data API with quota (ViralMint cites 10K units/day free); I did not read any platform's ToS page, so treat this as unverified.
- Inference: for a commercial product, outsourcing scraping to a managed provider (Apify, which Trend Finder already uses) moves operational breakage off us but does not remove ToS/legal exposure; repos marked above should be used for learning signature/endpoint behaviour, not run in production.
- Inference: AGPL/GPL repos (ViralMint, MoneyPrinterV2, Postiz, TiktokAutoUploader, TikTokDownloader, Instagram-Reels-Scraper-Auto-Poster) should not have code copied into a closed commercial product.

### Gaps
- Did not fetch TikTok/Instagram/YouTube ToS pages or case law; legal conclusions are not sourced. Needs a legal check before launch.
- Did not measure real breakage frequency (issue timelines) beyond the TikTok-Api counts above.
