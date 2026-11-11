# How to search for most-viewed TikTok videos and Instagram Reels (Apify and native methods)

Date accessed: 2026-10-30 (all pages below fetched/searched on this date). Research only; no Apify actor was run and no paid API was called.

Evidence labels used: [checked original page] = I fetched the page and read it (via WebFetch summary of the page); [search snippet only] = only seen in search-result text or a third-party summary; [vendor claim] = statement by the actor/tool author about its own product, not independently verified.

Important caveat on price: Apify listings show a "from $X / 1,000" headline, which is normally the cheapest (highest-plan) rate. Several pages quote a different per-plan number in the README or FAQ. Free-plan rates are usually higher than the headline. Budget at the higher number.

---

## 1. Which Apify actors fit each job (IDs, inputs, output fields, price, limits)

### Takeaway
For TikTok, the actor you already use (clockworks/tiktok-scraper) can do both jobs: `profiles` + `profileSorting: popular` for brand accounts (A), and `searchQueries` or `hashtags` for topics (B). A much cheaper alternative for keyword search with a "most liked" sort is apidojo/tiktok-scraper (about US$0.30 per 1,000). For Instagram there is no sort-by-views on any official profile scraper; the cheapest route to "popular reels" is Apify's Instagram Search Scraper with search type "popular reels" (about 64 reels per keyword), and for brand accounts you must pull a window of recent reels and sort by play count yourself.

### Cited Findings

**TikTok: clockworks/tiktok-scraper (the one already in Trend Finder)**
- Pay-per-event, "from $1.70 / 1,000 results"; the page does not list per-tier prices (the pricing tab text I could fetch did not itemise them either). Date filters, popularity filters (`mostDiggs`/`leastDiggs`), `videoSearchSorting`/`videoSearchDateFilter`, video downloads, transcripts and AI summaries are charged extras. [checked original page] — [Actor page](https://apify.com/clockworks/tiktok-scraper), [pricing tab](https://apify.com/clockworks/tiktok-scraper/pricing)
- Inputs that matter: `profiles`, `profileSorting` (`latest` | `oldest` | `popular`), `hashtags`, `searchQueries`, `searchSection` (default "" = Top section; `/video` = Video tab; Profile), `resultsPerPage`, `maxProfilesPerQuery`, `excludePinnedPosts` (default false), `shouldDownloadVideos` (charged, keep false), `oldestPostDateUnified`/`newestPostDate` (charged), `postURLs`, `proxyCountryCode`. [checked original page] — [input schema](https://apify.com/clockworks/tiktok-scraper/input-schema), [Actor page](https://apify.com/clockworks/tiktok-scraper)
- `videoSearchSorting` and `videoSearchDateFilter` only work with the `/video` search section and are charged filters; only the example values `MOST_RELEVANT` and `ALL_TIME` are visible in the schema text I could read (full enum not confirmed). [checked original page] — [input schema](https://apify.com/clockworks/tiktok-scraper/input-schema)
- View field: `playCount` (views); also `diggCount` (likes), `shareCount`, `collectCount`, `commentCount`, `createTimeISO`, `webVideoUrl`, `authorMeta`. [checked original page] — [Actor page](https://apify.com/clockworks/tiktok-scraper)
- Date filters work only with Latest/Oldest profile sorting; `mostDiggs`/`leastDiggs` do not work with date filters. [checked original page] — [Actor page](https://apify.com/clockworks/tiktok-scraper)

**TikTok: clockworks/tiktok-profile-scraper (profile-only sibling)**
- Headline "from $1.00 / 1,000 results"; its FAQ says "$5 per 1,000 results ($0.005 per item)" and the page does not reconcile the two. Inputs `profiles`, `profileSorting` (Latest/Oldest/Popular), `resultsPerPage`. Output includes `playCount`. [checked original page] — [Actor page](https://apify.com/clockworks/tiktok-profile-scraper)
- A third-party listing guide quotes this family at about $2.50 / 1,000 for the profile scraper and $1.70 / 1,000 for the main TikTok Scraper. [search snippet only] — [best TikTok scrapers](https://use-apify.com/docs/best-apify-actors/best-tiktok-scrapers)

**TikTok: clockworks/tiktok-hashtag-scraper**
- Headline "from $1.00 / 1,000 videos", FAQ says $5 per 1,000; inputs `hashtags`, `resultsPerPage`, `shouldDownloadVideos`, etc.; output `playCount`, `diggCount`, etc. Page states "TikTok caps hashtag results at roughly 400 to 800 per hashtag on average" and results vary between runs. No sort option is documented for hashtags. [checked original page] — [Actor page](https://apify.com/clockworks/tiktok-hashtag-scraper)

**TikTok: apidojo/tiktok-scraper (cheaper alternative, "Pay Per Result")**
- $0.30 / 1,000 posts; no platform usage charged separately; free users get Demo Mode (5 runs/month, 10 items per run). [checked original page] — [Actor page](https://apify.com/apidojo/tiktok-scraper)
- Inputs: `startUrls` (profile, hashtag, music, location, search URLs), `keywords`, `sortType` (`RELEVANCE` default | `MOST_LIKED` | `DATE_POSTED`; applies to keyword search only, not to startUrls), `dateRange`, `location` (ISO country code), `maxItems`. Output view field is `views` (not `playCount`). Minimum 10 posts per query/startUrl. [checked original page] — [Actor page](https://apify.com/apidojo/tiktok-scraper)
- Docs do not say how a profile URL is ordered, so it cannot be assumed to return top videos. [checked original page] — same page
- Same vendor lists a profile scraper at about $0.50 / 1,000 channels. [search snippet only] — [search result](https://apify.com/apidojo)

**Instagram: apify/instagram-reel-scraper (brand profile reels)**
- "from $1.00 / 1,000 reels" headline; README gives $2.60 / 1,000 (Free), $2.30 (Starter). [checked original page] — [Actor page](https://apify.com/apify/instagram-reel-scraper)
- Inputs: `username` (usernames, profile URLs, or reel URLs), `resultsLimit` (reels per profile), `onlyPostsNewerThan`, `skipPinnedPosts` (JSON input only), `skipTrialReels`, `includeSharesCount` (paid plans only). Output has both `videoPlayCount` and `videoViewCount` (sample: view 4,073 vs play 10,977; README does not define the difference). [checked original page] — same page
- No sort-by-popularity option; README points to the Hashtag Scraper's reels option for "popular" discovery. Metrics are logged-out snapshots and can differ from what a signed-in user sees. [checked original page] — same page

**Instagram: apify/instagram-scraper (general)**
- Free $2.70 / 1,000, Starter $2.30, Scale $1.90, Business $1.50. `resultsType` (posts/reels/comments/mentions/details), `directUrls`, `resultsLimit`, `onlyPostsNewerThan`, `search` + `searchType`. Outputs `videoViewCount`, `videoPlayCount`, `likesCount` (-1 if hidden). Sees the logged-out version of pages; counts can be lower than a signed-in view. [checked original page] — [Actor page](https://apify.com/apify/instagram-scraper)
- There is an open user issue titled "Adding Sorting" on this actor; I could not read its body or any Apify reply. A search snippet quotes the requester: "when I get 50 videos they are 50 latest ones. If the most liked video will be outside of this range I won't get it." [search snippet only] — [issue page](https://apify.com/apify/instagram-scraper/issues/adding-sorting-jsVbzzxhNCW2rdL6v)

**Instagram: apify/instagram-hashtag-scraper**
- "from $1.90 / 1,000 results" (README: $2.60 Free, $2.30 Starter). Inputs `hashtags`, `keywordSearch` (true lets you use multi-word keywords), `resultsType` (posts OR reels, one per run), `resultsLimit` per hashtag. Output `videoPlayCount`, `igPlayCount`, `videoViewCount` (keyword mode), `likesCount`, `sharesCount`, `commentsCount`. [checked original page] — [Actor page](https://apify.com/apify/instagram-hashtag-scraper)
- Page describes results as "recent" posts/reels and points to the Instagram Search Scraper for popular/trending content; sort order is not documented. Free usage covers only the first page of results. Adding more keywords narrows (intersects) rather than widens results. [checked original page] — same page

**Instagram: apify/instagram-search-scraper (best fit for "most-viewed reels about a topic")**
- Headline "from $1.50 / 1,000 results"; README: $2.70 Free, $2.30 Starter, $1.90 Scale (page does not reconcile). [checked original page] — [Actor page](https://apify.com/apify/instagram-search-scraper)
- Inputs: `search` (comma-separated terms), `searchType` (places / profiles / hashtags / "Search popular reels"), `searchLimit`. The popular-reels mode returns "up to ~64 reels" per keyword with likes, comments, views and plays. Not every keyword has a popular-reels feed; those return a row with `"error": "no_items"`. You can pre-check a keyword by opening `instagram.com/popular/<keyword>` in an incognito window. [checked original page] — [Actor page](https://apify.com/apify/instagram-search-scraper), [input schema](https://apify.com/apify/instagram-search-scraper/input-schema)
- General cap: 250 results per search term regardless of settings. [checked original page] — same pages

**Instagram: third-party reels actors that advertise sort-by-plays**
- Several store actors (e.g. scrapesage, zaver.api, instaprism, orkait, foxlabs) advertise play counts and top-reels research. One lets you "Set Sort by to Plays" with server-side sorting; another says Instagram's logged-out feed exposes only the 12 most recent reels per profile with no pagination. [search snippet only] — [search results](https://apify.com/scrapesage/instagram-reels-scraper.md), [zaver.api](https://apify.com/zaver.api/instagram-reel-scraper/examples/top-reels-from-an-instagram-profile.md)
- zaver.api's "top reels from a profile" example sets a 50-reel limit and says you sort by Plays after export; it documents no sort input and no pricing. instaprism's example says it returns an account's "best reels by engagement" with a 100 limit, but documents no sort parameter or price. [checked original page] — [zaver.api example](https://apify.com/zaver.api/instagram-reel-scraper/examples/top-reels-from-an-instagram-profile.md), [instaprism example](https://apify.com/instaprism/instagram-reels-scraper/examples/top-reels-research)
- Treat all of these as unverified [vendor claim]; I did not find independent tests.

**Apify account economics**
- Free plan: US$5 monthly platform credit that does not roll over (most sources); Starter listed at US$29/month by most sources, but one history site reports a cut to US$19 in Sept 2026 and another lists US$39; none confirmed against Apify's own pricing page. [search snippet only] — [Apify pricing summary](https://use-apify.com/docs/what-is-apify/apify-pricing), [apify.com/pricing](https://apify.com/pricing)
- Pay-per-event means a fixed price per returned result, with platform usage typically bundled in (stated on the instagram-hashtag-scraper, apidojo and Instagram scraper pages above). [checked original page]

### Inferences
- With US$5 and a realistic Free-plan rate of about US$2.3-2.7 / 1,000 on Apify's own Instagram actors, you get roughly 1,850-2,100 Instagram results. On clockworks at the best-case US$1.70 headline it is about 2,900 TikTok results; the real Free-plan clockworks rate is unknown (not itemised on the pages I could read), so plan for fewer.
- apidojo at US$0.30 / 1,000 would be about 5-8x cheaper per result than clockworks, so keyword (job B) runs on TikTok are the best place to try it, but it is a different output schema (`views` not `playCount`) and the free tier is capped at 10 items/run, so you would need to confirm paid credit applies to the same account balance before relying on it.
- The cheapest Instagram "popular reels by topic" run is one `searchLimit`-free search per keyword: at most ~64 reels per keyword, so about US$0.15-0.17 per keyword at the Free rate. 10 keywords is under US$2.

### Gaps
- Exact clockworks per-event rates for the Free plan (profile, search, filters) were not retrievable; fetch the pricing tab in a browser before budgeting.
- Full enum for `videoSearchSorting` / `videoSearchDateFilter` on clockworks not retrievable (only examples seen). apidojo's `MOST_LIKED` / `DATE_POSTED` / `RELEVANCE` is confirmed and the same labels show up in a third-party API doc, but no "most viewed" sort was found anywhere.
- No independent test of any third-party Instagram "sort by plays" actor.
- Whether `videoViewCount` vs `videoPlayCount` differ in meaning (plays include replays?) is undocumented; use `videoPlayCount` consistently.

---

## 2. Does profile scraping support "sort by popular"? How many posts to find a reliable top 10?

### Takeaway
TikTok: yes, clockworks has `profileSorting: popular`, but TikTok limits that ordering to roughly 400-500 videos per profile and the sort criterion is described inconsistently (most popular vs most liked), so scrape 30-50 per brand in popular order and re-rank locally by `playCount`. Instagram: no actor I found has a verified server-side popularity sort; the official actors return newest-first, so a reliable top 10 by views needs a deep scrape of the account's reels (hundreds), or use the keyword "popular reels" route.

### Cited Findings
- TikTok `profileSorting` options: Latest, Oldest, Popular; sorting applies to the Videos section only. "Popular sorting is limited by TikTok to approximately 400–500 videos per profile," so it may return far fewer results than Latest/Oldest. [checked original page] — [clockworks/tiktok-scraper](https://apify.com/clockworks/tiktok-scraper), [clockworks/tiktok-profile-scraper](https://apify.com/clockworks/tiktok-profile-scraper)
- The definition of "popular" is not consistent: clockworks pages say "most popular videos first"; several third-party copies of the same actor say "Popular (most liked)". [checked original page] vs [search snippet only] — [clockworks profile scraper](https://apify.com/clockworks/tiktok-profile-scraper); [search results listing](https://apify.com/scrapelabsapi/tiktok-profile-scraper)
- Pinned posts appear first on profiles; `excludePinnedPosts` can drop them. [checked original page] — [input schema](https://apify.com/clockworks/tiktok-scraper/input-schema)
- Instagram `apify/instagram-reel-scraper`: no sort option; options are `resultsLimit` and `onlyPostsNewerThan`; pinned reels can't be excluded before date filtering via the UI. [checked original page] — [Actor page](https://apify.com/apify/instagram-reel-scraper)
- User complaint on Apify's own Instagram scraper: results come back as latest posts, so the most-liked item may be outside the fetched range. [search snippet only] — [issue page](https://apify.com/apify/instagram-scraper/issues/adding-sorting-jsVbzzxhNCW2rdL6v)
- Some third-party actors say logged-out Instagram shows only the 12 most recent reels per profile without pagination. [search snippet only] — [search results](https://apify.com/scrapesage/instagram-reels-scraper.md) (contradicted in practice by zaver.api/instaprism examples that fetch 50-100 reels; unresolved)
- Instagram Search Scraper sidesteps profile depth by returning Instagram's own "popular reels" feed per keyword (~64 reels). [checked original page] — [Actor page](https://apify.com/apify/instagram-search-scraper)

### Inferences
- TikTok recipe for job A (cheap): `profiles` = [brand handles], `profileSorting: "popular"`, `resultsPerPage` 30, `excludePinnedPosts: false` (a pinned video is usually a deliberate best-of, but filter it later), `shouldDownloadVideos: false`, no date filters. Then sort the dataset by `playCount` descending and take 10. 30 videos x 10 brands = 300 results, roughly US$0.5-1 (at US$1.70-3 / 1,000). Because "popular" may mean likes, a video with more views but fewer likes could sit below position 30; bump `resultsPerPage` to 50 for the most important brands. If popular sort returns far fewer than requested, fall back to `latest` with 100-200 results.
- Instagram brand accounts: to be reasonably sure of the top 10 by plays you need the whole reel history of an account (a typical brand has dozens to a few hundred reels). At the Free rate (~US$2.3-2.7 / 1,000) 200 reels costs about US$0.5; 10 brands about US$5, which is your whole credit. So for Instagram prefer (1) the 50-100 most recent reels per brand to catch recent hits, and (2) topic-level popular-reels search. Say in the UI that the Instagram "top" is "top of last N reels".
- A cheaper trick for Instagram brand reels: only the brands that post the same video on TikTok and Reels need an Instagram run at all; use the TikTok winners to prioritise.

### Gaps
- No source states how TikTok defines "popular" for profile sorting (plays vs likes vs a blend). Needs a small real test (one brand, 30 results, compare ordering to playCount) when credit allows.
- No verified Apify actor with true server-side popularity sorting for Instagram profiles.
- The size of the "logged-out" Instagram depth limit (12 vs unlimited) is contradicted across sources.

---

## 3. Native and free methods

### Takeaway
Native tools are good for spot checks and for finding hashtags, not for ranked lists of the most-viewed videos. TikTok search can sort by Most Liked (not by views). Creative Center shows ad performance (reach/CTR/likes), not organic view counts, and only for advertiser-authorised ads. Meta Ad Library lets you see a brand's currently active ads but gives no impression data for non-political ads.

### Cited Findings
- TikTok in-app search filter: Sort by Relevance / Most Liked / Newest (labels vary by version) and date posted (24 hours, this week, last 3 months, etc.). No sort by views. Unofficial extensions add sort-by-likes/date buttons on web. [search snippet only] — [TopQLearn guide, Jan 2026](https://topqlearn.com/how-to-filter-tiktok-search-results); TikTok's own help page not found.
- Third-party APIs and the apidojo actor expose the same three sort values (relevance, most liked, date posted). [checked original page] — [apidojo/tiktok-scraper](https://apify.com/apidojo/tiktok-scraper)
- TikTok Creative Center Top Ads: filters Region, Objective, Ad Language, Ad Format, Likes, a Search box and Industry; sort by For You, Reach or CTR; no date/period filter described; every ad shown was authorised by the advertiser in Ads Manager, so it is a sample, not a full library; view counts not clearly shown. [search snippet only / third-party summary] — [Relevant Audience guide](https://www.relevantaudience.com/tiktok-ads/what-is-tiktok-creative-center/)
- TikTok's own help page confirms Top Ads can be filtered by Region, Industry, Objective and others, shows a second-by-second engagement graph, and says TikTok applies performance thresholds by country; it does not mention a brand/advertiser search or time period. [checked original page] — [TikTok Top Ads help](https://ads.tiktok.com/help/article/top-ads?lang=en)
- Creative Center Trends: the (July 2026) help text mentions only trending hashtags; older guides also list songs, creators, videos, but those tabs may no longer exist. I could not load the hashtag page itself (navigation only). [search snippet only] — [Relevant Audience guide](https://www.relevantaudience.com/tiktok-ads/what-is-tiktok-creative-center/)
- Meta Ad Library: all active ads can be searched by keyword or advertiser; inactive ads are searchable only for issue/election/political ads (kept 7 years); more detail (funder, spend range, reach) is only for political/issue ads. [checked original page] — [Meta Help: Ad Library](https://www.facebook.com/help/259468828226154)
- Ad Library API: all ads have Library ID, creative, page name/ID, delivery dates, placement; spend and impression ranges only for political/issue ads. Official API needs app review/identity verification (access scope per a third-party actor doc). [search snippet only] — [Meta Ad Library API](https://www.facebook.com/ads/library/api), [jaybird actor doc](https://apify.com/jaybird/meta-ad-library-scraper.md)
- Meta's advertiser search is fuzzy and may return near matches, so check results against the intended Page. [search snippet only] — [third-party tool docs](https://apify.com/jaybird/meta-ad-library-scraper.md)
- Instagram web: hashtag pages have Top / Recent / Reels tabs per one guide; anonymous search results are reportedly capped around 24 reels per query per one API vendor, versus 50-100 per keyword claimed by other vendors; no official Instagram statement found. [search snippet only] — [search results](https://www.socialcrawl.dev/data/best-hashtags-for-instagram-reels), [Apify instagram-search-scraper page says ~64](https://apify.com/apify/instagram-search-scraper)
- Free third-party analytics: Exolyt has a limited free tier (one hashtag and one sound tracked, per a secondary source) and lists top content by likes and comments; Pentos is paid (about US$99/month per one comparison; sources conflict); TikTok's built-in analytics only cover your own account. I found nothing on Tokboard. [search snippet only] — [Exolyt guide](https://exolyt.com/guides/Exolyt-for-TikTok-analytics), [comparison](https://cotera.co/articles/tiktok-analytics-tools-comparison)

### Inferences
- For job A on a budget: Open each brand's TikTok profile in a browser, use the profile's built-in "Popular" tab (TikTok profiles have Latest / Popular / Oldest tabs; this is what `profileSorting` mirrors) and read the top few. Free, no credit. For Instagram, there is no popular tab for reels on profiles, so fall back to scanning the Reels grid or a paid scrape. (Profile tabs are from general knowledge of the app; not backed by a fetched source here.)
- Meta Ad Library is useful for job A in a different way: it shows which creatives a brand is currently pushing (a proxy for what works) with no view counts. Combine with TikTok Top Ads, which has reach/CTR ranking, for "what ads are winning".
- Use Creative Center / TikTok search only to discover hashtags, sounds and phrasing; then feed those into the paid scraper.

### Gaps
- Could not load the TikTok Creative Center hashtag/trending page content (JS-rendered), so the available periods (7/30/120 days) and metrics there are unconfirmed.
- Meta help page did not state how to search by advertiser or country coverage; unconfirmed whether inactive non-political ads are visible via API.
- No official TikTok help page for the search filter; claims come from a 2026 guide and API vendors.
- Free third-party "top videos by views" sites: no reliable free option confirmed.

---

## 4. Keyword and hashtag lists for "AI video editing / AI remix / viral video copying tools"

### Takeaway
No source ranks hashtags for this niche, so the lists below are my suggestions, to be treated as a testing plan, not validated facts. Mix brand names, tool-category phrases and use-case phrases, and use keyword (not hashtag) search for multi-word terms because hashtag scrapers merge multi-word hashtags into one tag and hashtag results are capped.

### Cited Findings
- Search for niche-specific hashtags returned only generic TikTok hashtag lists; none confirmed #aiediting, #capcut, #aivideo or #aiugc as top-performing in this niche. Advice from sources: use 3-5 relevant hashtags, match niche, not just #fyp. [search snippet only] — [Async trending hashtags 2026](https://async.com/blog/trending-tiktok-hashtags/), [Vizard TikTok hashtags](https://vizard.ai/knowledge-base/social-media-growth/tiktok-hashtags)
- On Instagram's hashtag scraper, multi-word items in hashtag mode merge into one hashtag; keyword mode supports multi-word terms; multi-word hashtags usually return fewer results. [checked original page] — [instagram-hashtag-scraper](https://apify.com/apify/instagram-hashtag-scraper), [instagram-search-scraper](https://apify.com/apify/instagram-search-scraper)
- TikTok hashtag results are capped at about 400-800 per hashtag. [checked original page] — [tiktok-hashtag-scraper](https://apify.com/clockworks/tiktok-hashtag-scraper)
- `proxyCountryCode` (clockworks) and `location` (apidojo, ISO country code) exist to control region of the search. [checked original page] — [clockworks](https://apify.com/clockworks/tiktok-scraper), [apidojo](https://apify.com/apidojo/tiktok-scraper)

### Inferences (my suggested lists; untested)
Keyword searches (use TikTok `searchQueries` with the Video section, or IG keyword mode / popular reels):
- Category/intent: `AI video editor`, `AI video editing`, `AI video editing app`, `AI video generator`, `AI video remix`, `remix video with AI`, `AI video recreate`, `recreate viral video`, `copy viral video AI`, `clone viral video`, `AI UGC`, `AI UGC ads`, `AI avatar video`, `AI talking head`, `AI video translation`, `AI dubbing`, `AI captions`, `auto captions`, `AI clips`, `long video to shorts`, `repurpose video AI`, `text to video`, `image to video`, `faceless video AI`.
- Brand terms (job B can also surface competitors): `Opus Clip`, `CapCut AI`, `CapCut template`, `Captions app`, `HeyGen`, `Submagic`, `VEED`, `Descript`, `Runway`, `Pika`, `Kling`, `Hedra`, `Arcads`, `Creatify`, `Higgsfield`, `Sora`, `Veo` (verify current competitor set first).
- Behaviour phrases people use in captions: `how I make viral videos with AI`, `steal this video idea`, `remake any video`, `this AI edits for you`, `edit videos in seconds`.

Hashtags (single tokens, TikTok `hashtags` or IG `hashtags` with keywordSearch false): `#aivideo`, `#aivideoeditor`, `#aivideoediting`, `#aiediting`, `#aitools`, `#aitoolsforcreators`, `#aiugc`, `#ugcads`, `#aiavatar`, `#aiclips`, `#capcut`, `#capcuttutorial`, `#capcutaiedit`, `#videoediting`, `#contentcreation`, `#repurposecontent`, `#viralvideo`, `#faceless`, `#facelesschannel`, `#texttovideo`, `#heygen`, `#opusclip`. Validate counts first with TikTok search or Creative Center before paying for scrapes; drop any with few videos.

Language/region effects:
- English queries return mostly English-language content but TikTok mixes regions by default; set `proxyCountryCode` (clockworks) or `location` (apidojo) to US/GB/AU as appropriate to see that region's top results (inference from the existence of those fields; no source tests the effect size).
- Brand names are language-neutral and good for multi-region; generic phrases like `AI editing` need translations (e.g. Spanish, Portuguese, Indonesian, Traditional Chinese `AI 剪輯`, `AI 翻拍`) to see non-English hits, and Chinese content is largely on Douyin, which TikTok scrapers do not cover (general knowledge, not sourced here).
- Multi-word hashtags like `#aivideoediting` sometimes have little volume; keyword search on TikTok Top/Video sections is usually richer, and IG hashtag scraper docs warn multi-word items return fewer results.

### Gaps
- No evidence on which of these tags/queries actually has high-view content; need a cheap pilot (10 results each) to check.
- No source quantifying language/region effects on result sets.

---

## 5. ToS and legal caveats on scraping public data (brief)

### Takeaway
Scraping logged-out public pages has favourable US case law, but it is not risk-free: platform ToS (TikTok's explicitly bans automated collection) can be enforced by account bans or contract claims, personal data triggers GDPR/CCPA duties, and you should not redistribute the videos themselves. This is not legal advice.

### Cited Findings
- TikTok Terms of Service (updated 1 Dec 2025) prohibit using "automated scripts to collect information from or otherwise interact with the Services" and bypassing access-restriction measures; TikTok content may not be downloaded, copied or distributed without permission. [checked original page] — [TikTok Terms of Service](https://www.tiktok.com/legal/page/row/terms-of-service/en)
- Meta v. Bright Data (N.D. Cal., 23 Jan 2024): summary judgment for Bright Data; Meta's terms did not bar logged-off scraping of public data. The ruling analysed only Meta's terms and does not cover scraping behind a login; Meta later dropped the suit. [search snippet only] — [Quinn Emanuel alert](https://www.quinnemanuel.com/the-firm/news-events/client-alert-what-does-the-meta-v-bright-data-summary-judgment-ruling-mean-for-web-scraping/), [Farella Braun](https://www.fbm.com/data-analytics/publications/major-decision-affects-law-of-scraping-and-online-data-collection-meta-platforms-v-bright-data/), [MediaPost](https://www.mediapost.com/publications/article/393996/None)
- hiQ v. LinkedIn (9th Cir., 2022): the CFAA's "without authorization" concept does not apply to public websites. [checked original page] — [Apify blog on legality](https://blog.apify.com/is-web-scraping-legal/)
- Personal data stays protected under GDPR even if public; recommends collecting minimally and keeping it short-term; clickwrap terms are generally enforceable, browsewrap generally not. [checked original page; Apify is a vendor with an interest, treat as general guidance] — [Apify blog on legality](https://blog.apify.com/is-web-scraping-legal/)
- Apify's own Instagram actors state they collect only publicly available data and see the logged-out view; the Instagram Search Scraper warns about personal data in some jurisdictions. [checked original page] — [instagram-scraper](https://apify.com/apify/instagram-scraper), [instagram-search-scraper](https://apify.com/apify/instagram-search-scraper)

### Inferences
- For Trend Finder, low-risk practice: use logged-out public data only, keep `shouldDownloadVideos` false, store metrics and links (not video files), store only creator handles needed for display, and link out to the original posts. Account-level risk is on Apify/the scraper, but the service ToS sits with whoever runs it.

### Gaps
- No Australian-law source (user is in Sydney); no source on TikTok enforcement against scraping customers; no authoritative source on how copyright applies to embedding/thumbnails of scraped videos.

---

## Suggested playbook (synthesis of the above; inference)

1. Job A, TikTok (brands): clockworks/tiktok-scraper, `profiles` = brand handles, `profileSorting: popular`, `resultsPerPage: 30-50`, downloads off; sort by `playCount` locally; keep top 10. Budget ~US$0.5-1 for 10 brands.
2. Job A, Instagram (brands): apify/instagram-reel-scraper, `resultsLimit` 50-100 per brand, sort by `videoPlayCount` locally; label as "top of last N reels". Budget ~US$1-2 for 10 brands at the Free rate. Do this only for brands that matter.
3. Job B, TikTok (topics): clockworks `searchQueries` with Top or Video section, `resultsPerPage` 30; or test apidojo `keywords` + `sortType: MOST_LIKED` at US$0.30 / 1,000; re-rank by views locally. Remember "most liked" is not "most viewed".
4. Job B, Instagram (topics): apify/instagram-search-scraper with search type "Search popular reels", one keyword per term (~64 reels each). Pre-check keywords at `instagram.com/popular/<keyword>` for free.
5. Free pre-work before spending: TikTok app/web search with Most Liked filter, TikTok profile "Popular" tab, Creative Center Top Ads for ad winners, Meta Ad Library for active brand ads.
6. Run a one-brand, 30-result pilot first to learn whether TikTok `popular` ranks by plays or likes, and what the real Free-plan clockworks per-result rate is.
