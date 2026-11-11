# C2: Open-source building blocks for a lightweight in-browser short-video editor (Remake)

Access date for everything below: 2026-11-02 (stars, licence, last release, npm versions checked that day via GitHub API / npm registry / official docs). Items marked "UNVERIFIED" were not confirmed from a primary source.

## Q1. Per-library survey: licence, stars, last release, React 19 fit, what it gives, browser support, performance

### Takeaway
No single open-source library gives a ready, permissively licensed, React-19 "CapCut-lite" editor (timeline UI + player + export). The practical reusable parts are: a low-level media engine (mediabunny, MPL-2.0), a player/composition layer (Remotion, source-available with a company licence; or Revideo, MIT but low activity), and a timeline UI (build it, or use the MIT `@xzdarcy/react-timeline-editor`). Most "CapCut clone" repos carry licences that are unsuitable or unclear for a commercial SaaS (Remotion-style, Sustainable Use, PolyForm Shield, GPL-3.0, PolyForm Noncommercial).

### Cited Findings

**Remotion (remotion-dev/remotion)**
- 69,900 stars; latest release v4.0.540 published 2026-11-02 (very active); licence shows as NOASSERTION/"SEE LICENSE IN LICENSE.md" (custom, not OSI) — [GitHub repo](https://github.com/remotion-dev/remotion), [npm remotion](https://www.npmjs.com/package/remotion) (checked via API 2026-11-02).
- Licence: Free for individuals, for-profit orgs with up to 3 employees, non-profits, and evaluators; everyone else needs a Company License. Free licence forbids copying/modifying Remotion code to sell/rent/license your own derivative. "The license will change slightly in Remotion 5.0." — [Remotion LICENSE.md](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md), accessed 2026-11-02.
- Pricing/categories: official FAQ says "building video editors, prompt-to-video tools, automated video pipelines" fall under the Automators plan; `<Player>` use puts an organisation under Automators; Lambda/Cloud Run/Vercel render calls count as automation; "$0.01 per render, with a minimum spend of $100/month"; 1 render = one successfully generated video/audio/GIF/still/image sequence; previews in Studio/Player do not count as renders; users may render their own personalised video from your template and may edit Remotion code you generated, but you may not let users upload their own Remotion code — [Remotion License FAQ](https://www.remotion.dev/docs/license/faq), accessed 2026-11-02.
- A search-result summary of the official pricing/terms pages lists "Remotion for Creators" at $25 per seat per month and Enterprise at a $500/month minimum, with the combined minimum spend of $100/month if both Creators and Automators apply; it also notes older pages used a "Developer Seats" model — [Remotion pricing (search result)](https://www.remotion.dev/docs/license/pricing), [terms](https://www.remotion.dev/docs/terms). The pricing page itself did not render in my fetch, so exact figures are UNVERIFIED against the live page; re-check before budgeting.
- `@remotion/player` peer deps `react >=16.8.0` (so React 19 OK); `@remotion/captions` is MIT (npm, checked 2026-11-02); `@remotion/media-parser` carries the Remotion License.
- Remotion Editor Starter: $600 one-time price (individuals/small companies); larger companies (headcount 4+) must hold the Company License; included free with the Enterprise licence; source may not be redistributed (including inside an open-source project); stack is React Router 7 + TypeScript + Tailwind, assumes React 19; state is JSON-serialisable; features: timeline, interactive canvas, font picker (Google Fonts), asset upload (S3), Whisper captioning, 80+ feature flags; rendering default = Remotion Lambda, client-side WebCodecs render supported but disabled by default, server-side render via SSR APIs also possible; "meant as a starting point, not a finished video editor", and features are not guaranteed — [Editor Starter docs](https://www.remotion.dev/docs/editor-starter), [FAQ](https://www.remotion.dev/docs/editor-starter/faq), [vs Studio](https://www.remotion.dev/docs/editor-starter/vs-studio), [search summary of buy page](https://www.remotion.dev/docs/editor-starter/buy), accessed 2026-11-02.
- Client-side rendering: `@remotion/web-renderer` / `renderMediaOnWeb()` "stable from v4.0.491"; needs WebCodecs: Chrome 94+, Firefox 130+, Safari 26+; encodes with Mediabunny rather than FFmpeg; "Limited to a subset of HTML elements"; telemetry sent on every render even without a licence key; server-side renderer (FFmpeg, Node, Lambda) is not restricted that way — [Remotion client-side rendering docs](https://www.remotion.dev/docs/client-side-rendering), accessed 2026-11-02. Old `@remotion/webcodecs` package is deprecated: "We are phasing out Remotion WebCodecs and are moving to Mediabunny" — [Remotion WebCodecs docs](https://www.remotion.dev/docs/webcodecs).

**Revideo (midrender/revideo; formerly redotvideo/revideo)**
- 4,165 stars; MIT; last push 2026-07-15; npm `@revideo/core` and `@revideo/player-react` both 0.11.0, last modified 2026-07-10; GitHub Releases list is empty (tag v0.11.0 exists) — [GitHub](https://github.com/midrender/revideo), [npm @revideo/core](https://www.npmjs.com/package/@revideo/core), checked 2026-11-02.
- Scenes written in TSX/TypeScript (Motion Canvas lineage; see Motion Canvas below), React `<Player/>` for browser preview, headless `renderVideo()` on Node + headless browser, parallel rendering; repo is now under the Midrender org described as "the engine behind Midrender" — [README](https://github.com/midrender/revideo).
- No built-in timeline editor UI or end-user editing model.

**Motion Canvas (motion-canvas/motion-canvas)**
- 19,642 stars; MIT; latest release v3.17.2 dated 2024-12-14 (last push 2026-07-02) — [GitHub](https://github.com/motion-canvas/motion-canvas), checked 2026-11-02. It is a code-driven animation editor (developer authors scenes), not an end-user editor.

**Etro (etro-js/etro)**
- 1,154 stars; GPL-3.0 (npm etro 0.14.1, 2026-08-12); browser-only compositing; JSON session serialisation; export is real-time only ("offline rendering coming soon") via `movie.record()`; no commercial exception mentioned — [GitHub](https://github.com/etro-js/etro), accessed 2026-11-02. GPL-3.0 is a poor fit for closed-source SaaS frontends (my reading; get legal advice).

**Diffusion Studio Core (diffusionstudio/core)**
- 1,252 stars; MPL-2.0; GitHub last push 2025-11-18; npm `@diffusionstudio/core` 4.0.3 modified 2025-11-30 (no 2026 updates seen); built on Mediabunny and WebCodecs; compositing, captions, keyframes, transitions, silence removal; requires COOP/COEP (`credentialless`) headers; "Free to use if the 'Made with Diffusion Studio' watermark stays on rendered output. Removing it requires a one-time purchased license key"; framework-agnostic, no React bindings — [GitHub](https://github.com/diffusionstudio/core), [npm](https://www.npmjs.com/package/@diffusionstudio/core), accessed 2026-11-02.

**ffmpeg.wasm (ffmpegwasm/ffmpeg.wasm)**
- 17,939 stars; wrapper `@ffmpeg/ffmpeg` 0.12.15 (MIT), core `@ffmpeg/core` 0.12.10 licence GPL-2.0-or-later per npm; last release v12.15 on 2025-01-07, npm modified 2025-04-07 (slow cadence); single-thread and multi-thread (`core-mt`) builds — [GitHub](https://github.com/ffmpegwasm/ffmpeg.wasm), [npm @ffmpeg/core](https://www.npmjs.com/package/@ffmpeg/core), checked 2026-11-02.
- Official benchmark (one machine, Chrome 116, webm→mp4): native 5.2 s; single-thread 128.8 s (0.04x, ~25x slower); multi-thread 60.4 s (~12x slower) — [ffmpeg.wasm performance docs](https://ffmpegwasm.netlify.app/docs/performance).

**Mediabunny (Vanilagy/mediabunny)**
- 7,420 stars; MPL-2.0; v1.65.0 released 2026-10-30; very active; zero-dependency TypeScript; read/write/convert MP4, MOV, WebM, MKV, HLS, MP3, Ogg, FLAC etc.; hardware acceleration via WebCodecs; Conversion API does transmux, transcode, resize, rotate, crop, resample, trim; `CanvasSource` feeds canvas frames to an output; streaming I/O; ~5 kB gzipped minimum; Node/Bun/Deno via `@mediabunny/server`; relies on sponsorship, no separate commercial licence mentioned — [GitHub](https://github.com/Vanilagy/mediabunny), accessed 2026-11-02. It is the engine under Remotion's web renderer and Diffusion Studio.
- MPL-2.0 is file-level weak copyleft: modifications to MPL files must be published, but using it unmodified in a closed-source app is allowed (as summarised on the repo page).

**Twick (ncounterspecialist/twick)**
- 546 stars; licence "Sustainable Use License v1.0" (custom, NOASSERTION); latest release v0.15.31 on 2026-03-18; `@twick/studio` peer deps React `^18 || ^19` — [GitHub](https://github.com/ncounterspecialist/twick), [npm @twick/studio](https://www.npmjs.com/package/@twick/studio).
- Packages: studio UI, Fabric.js canvas, timeline model with undo/redo, live player, browser-render (WebCodecs + FFmpeg.wasm for muxing; Chrome/Edge only), render-server (Node + Puppeteer + FFmpeg; Node 20+, Linux/macOS), AWS Lambda export, Gemini/Vertex AI caption generation; JSON project format `{properties:{width,height,fps}, tracks:[{elements:[{id,type,s,e,props}]}]}`; docs recommend server export for long/production videos — [Twick README](https://github.com/ncounterspecialist/twick).
- Licence text: allows commercial use, bundling into a larger application you provide to customers, and self-hosting; forbids "Provide the Software or backend functions as a hosted service, platform, or SaaS without a commercial agreement" and requires a separate licence to "Offer the Software as a hosted service or SaaS platform" or "Generate substantial revenue from the Software's functionality" — [Twick LICENSE.md](https://github.com/ncounterspecialist/twick/blob/main/LICENSE.md) (read via GitHub API 2026-11-02). The clauses conflict with each other for an editor SaaS; needs written clarification from the maintainer.

**openvideodev/react-video-editor (formerly designcombo/react-video-editor) and OpenVideo**
- 1,829 stars; licence NOASSERTION; last push 2026-06-30; no releases. Repo description: "Online react video editor using remotion. Capcut and canva clone." — [GitHub](https://github.com/openvideodev/react-video-editor).
- Its LICENSE is a copy of the Remotion-style model: free for individuals, for-profit orgs up to 3 employees, non-profits; others need a Company License (contact for pricing); forbids deriving a product to sell/relicense — LICENSE read via GitHub API 2026-11-02. A sibling repo `openvideodev/video-editor` (51 stars, "Browser side rendering") also exists. Whether the current code still depends on Remotion: UNVERIFIED.

**OpenCut (OpenCut-app/OpenCut)**
- ~97,100 stars; MIT; latest release v0.3.0 on 2026-04-15; last push 2026-09-24 — [GitHub](https://github.com/OpenCut-app/OpenCut).
- README says "OpenCut is being rewritten from the ground up" (new.opencut.app), the older "opencut-classic" is "the one to reach for today", and "We're not set up to take outside contributions yet while the architecture is being designed"; roadmap mentions Rust core, desktop app, editor API, plugins, MCP server, headless mode (plans, not shipped). Export method and React version not stated on the README page. A poor fork base while the architecture is in flux (my inference).

**Omniclip (omni-media/omniclip)**
- 1,468 stars; MIT; last push 2026-10-31; no GitHub releases; README: "Omniclip 2.0 is in development!"; features trim, split, text/audio/video/image, undo/redo, transitions, filters, WebRTC collaboration, render up to 4k via WebCodecs; "Speech to text" and "Audio editing" listed under "To be added"; may not work on older browsers — [GitHub README](https://github.com/omni-media/omniclip).

**FreeCut (walterlow/freecut)**
- 2,304 stars; MIT; last push 2026-10-29; browser multi-track editor using WebGPU, WebCodecs, Web Workers, OPFS, File System Access API; has transcription, keyframes; projects stored as plain files in a user-chosen folder — [GitHub README](https://github.com/walterlow/freecut). Maturity and React version not verified; heavy desktop-class architecture (multi-track, WebGPU), more than Remake needs.

**Shotstack Studio SDK (shotstack/shotstack-studio-sdk)**
- 60 stars; PolyForm Shield 1.0.0 with "Licensor Line of Business: Shotstack cloud video editing platform, including its APIs, Studio, the Studio SDK and the template library"; v2.31.0 released 2026-10-31 (very active); npm `@shotstack/shotstack-studio`; plain JS core, React template available; timeline (drag/resize/snap), canvas preview, undo/redo, template merge fields, in-browser MP4 export (rejects edits over 5 min or 75 s at 4K, `html5` clips, some filters); captions not mentioned; Shotstack API key requirement for export not stated — [GitHub](https://github.com/shotstack/shotstack-studio-sdk), [npm](https://www.npmjs.com/package/@shotstack/shotstack-studio), LICENSE read via API 2026-11-02.
- PolyForm Shield forbids using the software to provide a product that competes with the licensor's line of business. A video-editing SaaS may be read as competing (my inference; not legal advice).

**IMG.LY CE.SDK (commercial)**
- Pricing is quote-based; no public tiers; licensed per platform (Web, iOS, Android, desktop separately) and per app identifier; 30-day free trial; monthly or yearly subscriptions; OEM/reseller terms exist — [IMG.LY pricing](https://img.ly/pricing), accessed 2026-11-02. Video-specific price, React 19 fit, and render model were not verified (UNVERIFIED).

**Timeline / canvas building blocks**
- `@xzdarcy/react-timeline-editor`: 801 stars, MIT, v1.0.0 modified 2026-01-25 — [GitHub](https://github.com/xzdarcy/react-timeline-editor), npm check 2026-11-02. React 19 compatibility UNVERIFIED.
- Fabric.js: 31,537 stars, MIT, v7.4.0 (2026-10-31); Konva: 14,915 stars, npm licence MIT (GitHub licence field shows NOASSERTION), v10.9.1 (2026-10-31) — [fabric.js](https://github.com/fabricjs/fabric.js), [konva](https://github.com/konvajs/konva), npm checked 2026-11-02.

**WebCodecs browser support (general)**
- MDN: codec support varies by device/browser; H.264 "most widely supported"; H.265 "significant gaps outside Apple platforms"; MP3 not available as a WebCodecs encoder; Opus recommended for audio; runtime `isConfigSupported()` checks advised — [MDN WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API). Remotion states Chrome 94+, Firefox 130+, Safari 26+ for its web renderer (see above). Twick says its browser export is Chrome/Edge only.

### Inferences
- Licence ranking for a commercial SaaS that embeds an editor: MIT / MPL-2.0 pieces (mediabunny, Revideo, Fabric, Konva, `@remotion/captions`, react-timeline-editor, Omniclip, FreeCut, OpenCut) are safest; Remotion is usable but costs money and needs the Automators/Enterprise reading confirmed in writing; Twick, Shotstack SDK, OpenVideo, Etro (GPL-3.0) are risky or unsuitable.
- The ecosystem has converged on Mediabunny + WebCodecs for in-browser encode (Remotion web renderer, Diffusion Studio), and Remotion is deprecating its own WebCodecs package, so betting on Mediabunny for any client-side work is low risk.
- Many repos are explicitly mid-rewrite (OpenCut, Omniclip 2.0), so forking them means owning an unstable base.

### Gaps
- Exact current Remotion Company License prices (live pricing page did not render); whether an end-user video-editor SaaS built on Remotion Player + Lambda is fully covered by Automators needs written confirmation from Remotion.
- CE.SDK video pricing and technical details; Etro/Omniclip/FreeCut React 19 fit; whether OpenVideo/react-video-editor really depends on Remotion; Revideo roadmap (npm 0.11.0 is four months old; no releases on GitHub).
- No Hacker News/Reddit sentiment or real-world performance benchmarks on mid-range phones were collected (not searched).

---

## Q2. Trade-off: browser preview + server ffmpeg render vs full in-browser render

### Takeaway
For Remake, which already renders with server-side ffmpeg, the lowest-risk design is browser preview (cheap, approximate) plus server ffmpeg export from a shared JSON edit. Full in-browser rendering is viable in Chromium but is limited by WebCodecs codec variance, HTML-subset rendering, memory, and tab-open requirements; ffmpeg.wasm is too slow to be the main renderer.

### Cited Findings
- ffmpeg.wasm is 12-25x slower than native in the vendor's own benchmark (see Q1) — [ffmpeg.wasm performance](https://ffmpegwasm.netlify.app/docs/performance).
- Twick's own docs: browser export "suits short clips"; server export recommended for longer/production videos; browser export is Chrome/Edge only — [Twick README](https://github.com/ncounterspecialist/twick).
- Remotion's browser renderer supports only "a subset of HTML elements", and server renderer is the unrestricted path (FFmpeg on Node/Lambda) — [Remotion client-side rendering](https://www.remotion.dev/docs/client-side-rendering).
- Remotion Editor Starter defaults to Lambda rendering and keeps client-side WebCodecs rendering disabled by default — [Editor Starter FAQ](https://www.remotion.dev/docs/editor-starter/faq).
- Shotstack's in-browser exporter refuses edits over 5 minutes (75 s at 4K) and unsupported filters/clip types — [Shotstack Studio SDK](https://github.com/shotstack/shotstack-studio-sdk).
- Omniclip warns WebCodecs-based rendering "may not work properly on older browsers or devices" — [Omniclip README](https://github.com/omni-media/omniclip).
- Etro renders in real time only (no offline render) — [Etro README](https://github.com/etro-js/etro).
- Mediabunny + WebCodecs offers hardware-accelerated in-browser encode and microsecond-accurate trimming/muxing — [Mediabunny](https://github.com/Vanilagy/mediabunny).

### Inferences
- Two renderers (browser preview and server ffmpeg) will drift (fonts, kerning, subtitle wrapping, colour, audio mix). Mitigation: keep the JSON schema tiny, render captions/text in one place (burned ASS/PNG overlay on server; same text layout rules in preview), and run a golden-frame comparison test on a few fixtures.
- Server render keeps results deterministic for the final MP4, works on any user browser including Safari/iOS, and reuses the existing ffmpeg + whisper.cpp pipeline. Cost: server CPU per export and upload of source files (already needed for transcription).
- Optional later win: use Mediabunny/WebCodecs in-browser export as a "fast draft" or fallback, not the primary path.

### Gaps
- No measured numbers for a 60 s 1080x1920 export on WebCodecs (mid-range laptop/phone); no data on Safari/iOS export reliability.
- No cost comparison for server ffmpeg vs Remotion Lambda at Remake's volume.

---

## Q3. JSON timeline / edit-decision formats renderable both in browser preview and by server ffmpeg

### Takeaway
No standard format is natively "both". Practical choices: define a small Remake-specific JSON (Shotstack-like tracks/clips) and write two thin interpreters (a preview player and an ffmpeg filtergraph builder). Editly's declarative spec is the nearest open reference for JSON-to-ffmpeg, but it is stale. OpenTimelineIO is an interchange format, not a renderer.

### Cited Findings
- Shotstack edit JSON: `timeline.tracks[].clips[]` each with `asset` (type, src/text), `start`, `length` in seconds, optional `trim`, `volume`, `transition`, `filter`, `effect`; `output` sets format/resolution; merge fields enable templates — [Shotstack core concepts](https://shotstack.io/docs/guide/getting-started/core-concepts/). The format is documented, but the renderer is Shotstack's proprietary cloud API; the licence on the schema itself was not stated on that page.
- Editly: MIT, 5,576 stars, "declarative NLE using Node.js and ffmpeg", supports clips with `cutFrom`/`cutTo`, text and subtitle overlays, transitions, audio mixing/ducking, picture-in-picture, any output aspect ratio incl. 9:16, JSON5 specs; npm 0.14.2 (2025-01-19); last GitHub release v0.15.0-rc.1 (2025-01-19); last push 2025-05-12 — [GitHub](https://github.com/mifi/editly), [npm](https://www.npmjs.com/package/editly). Editly is Node, and uses node-canvas/headless GL; usable only as a reference or sidecar for a Python backend.
- Remotion Editor Starter state is "JSON-serializable state" rendered by Remotion compositions (React code) both in the Player and in Lambda/SSR — [Editor Starter vs Studio](https://www.remotion.dev/docs/editor-starter/vs-studio). This gives one renderer definition for both previews and final render, at the cost of the Remotion licence and a Node/Chromium render server instead of plain ffmpeg.
- Twick project JSON `{properties, tracks:[{elements:[{id,type,s,e,props}]}]}` is previewed in the browser and rendered by its Puppeteer+FFmpeg server — [Twick README](https://github.com/ncounterspecialist/twick).
- Etro serialises sessions to JSON — [Etro README](https://github.com/etro-js/etro).
- OpenTimelineIO (Academy Software Foundation): 2,052 stars, Apache-2.0, release v0.18.1 on 2025-11-09; described as "Open Source API and interchange format for editorial timeline information" — [GitHub](https://github.com/AcademySoftwareFoundation/OpenTimelineIO). It models clips/tracks/time ranges only; no text overlay, caption styling, or rendering. Its relevance to Remake is limited to export to NLEs (UNVERIFIED beyond the repo description).

### Inferences
- A minimal custom schema is likely best: `{width,height,fps, clips:[{src,in,out}], overlays:[{type:text|logo,start,end,x,y,style}], captions:[{words:[{w,s,e}]}], audio:[{src,start,volume,duck}]}`. Word timestamps from whisper.cpp already fit the captions array. Each field must be implementable in both the preview and the ffmpeg builder, so features not in the schema are not offered in the UI.
- Using Remotion as the single definition removes drift but trades the existing ffmpeg render for Chromium rendering and a licence; this is the main "reuse vs build" fork.

### Gaps
- No evidence found of a maintained open-source JSON-to-ffmpeg-filtergraph library in Python; editly (Node, stale) is the closest found. Not searched: json2video, creatomate, moviepy-based specs.
- OTIO JS/WASM viewers or ffmpeg exporters not investigated.

---

## Q4. Caption editing UI patterns with word timestamps (open-source examples)

### Takeaway
There is no maintained, permissively licensed React caption editor to adopt wholesale. Rescript is the best reference for the "delete words in transcript to cut media" pattern but is non-commercial-licensed; the BBC component is MIT but old (React 16). Remotion's `@remotion/captions` (MIT) supplies the caption data shape and TikTok-style page grouping that can sit under a custom editor.

### Cited Findings
- Rescript (wassgha/rescript): 1,023 stars; PolyForm-Noncommercial-1.0.0 (cannot be reused commercially); Next 16.2 / React 19.2.4; transcribed locally with per-word timestamps and speaker labels; "Delete words in the transcript and the corresponding clip is cut from the media" — [GitHub](https://github.com/wassgha/rescript), package.json and LICENSE read via GitHub API 2026-11-02.
- BBC react-transcript-editor: 624 stars; MIT in package.json/LICENSE (GitHub shows "Other"); v1.4.4; React `^16.6.0`; last push 2026-10-27; "A React component to make correcting automated transcriptions of audio and video easier" — [GitHub](https://github.com/bbc/react-transcript-editor). Age of the core and React 19 compatibility UNVERIFIED.
- FreeCut stores transcripts as plain files and runs transcription in the browser — [FreeCut README](https://github.com/walterlow/freecut). Omniclip lists "Speech to text" as not yet built — [Omniclip](https://github.com/omni-media/omniclip).
- Twick generates captions via Vertex AI/Gemini JSON — [Twick](https://github.com/ncounterspecialist/twick); Remotion Editor Starter includes Whisper-based captioning — [Editor Starter](https://www.remotion.dev/docs/editor-starter/buy). Editing UIs inside those products were not examined.
- `@remotion/captions` is MIT (npm 4.0.540) — [npm](https://www.npmjs.com/package/@remotion/captions). The Remotion captions overview page did not describe the Caption type in my fetch, so type shape, `createTikTokStyleCaptions`, SRT helpers were not verified from the docs (UNVERIFIED).
- Whisper word timestamps context (stable-ts, WhisperX alignment, Transformers.js port) — [search results](https://pypi.org/project/stable-ts/2.1.2/), [Fora Soft article](https://www.forasoft.com/learn/ai-for-video-engineering/articles-ai/whisperx-diarization-word-level-timestamps); these are tooling for better timestamps, not UI.

### Inferences
- Recommended UI pattern (derived from Rescript and Descript-style tools): a text pane showing words as spans bound to `{start,end}`; click word to seek; highlight current word on `timeupdate`; edit text in place keeping timing (edit re-times by redistributing time across the edited span); delete word to add a cut range and to remove the word from captions; split/merge lines into caption "pages" with max chars and max duration per page (the same logic as TikTok-style grouping). This is a few hundred lines of React, so building it is cheaper than adopting a stale component.
- Remake already has filler-word cutting from word timestamps, so the transcript-to-cuts mapping exists server-side; the UI only needs to emit cut ranges and edited words.

### Gaps
- No open-source example with a commercial-friendly licence for word-level caption styling UI (per-word highlight colours) was found; not exhaustively searched (several GitHub topic searches returned nothing).
- No UX research or HN/Reddit evidence on what users expect from caption editors.

---

## Q5. Recommended architecture for a small team: build vs reuse

### Takeaway
Recommended: React 19 frontend with a self-built thin editor (JSON state + Zustand/Immer undo + custom timeline, player, text/caption panels), HTML `<video>`/canvas for preview, Mediabunny for client-side helpers (thumbnails, waveform, optional trim/draft export), and the existing FastAPI + ffmpeg pipeline for the authoritative export from the same JSON. Avoid adopting a CapCut-clone repo; consider Remotion only if the team prefers one React-based renderer and accepts the company licence and Chromium render infra.

### Cited Findings
(Supporting facts are cited in Q1-Q4; consolidated here.)
- Safe licences for components: Mediabunny MPL-2.0 ([repo](https://github.com/Vanilagy/mediabunny)), Fabric.js MIT ([repo](https://github.com/fabricjs/fabric.js)), Konva MIT on npm ([npm](https://www.npmjs.com/package/konva)), `@xzdarcy/react-timeline-editor` MIT ([repo](https://github.com/xzdarcy/react-timeline-editor)), `@remotion/captions` MIT ([npm](https://www.npmjs.com/package/@remotion/captions)).
- Remotion path: Company licence required for for-profit orgs above 3 employees; editors count as Automators at $0.01/render with $100/month minimum; Editor Starter $600 one-time (non-redistributable) with Lambda default and optional server/client rendering — [Remotion License FAQ](https://www.remotion.dev/docs/license/faq), [Editor Starter FAQ](https://www.remotion.dev/docs/editor-starter/faq).
- Commercial buy path: IMG.LY CE.SDK is quote-based and per-platform — [IMG.LY pricing](https://img.ly/pricing).

### Inferences
- Build (small): JSON schema + validator shared as TypeScript types and Pydantic models; timeline (clip sequence with trim handles, one overlay lane, one music lane); preview player syncing a `<video>` plus overlay DOM/canvas and `<audio>`; text-overlay and logo placement on a 9:16 canvas (Konva or plain DOM/CSS transforms); caption editor (Q4); export button posting JSON to FastAPI; ffmpeg filtergraph builder (concat/trim, drawtext or ASS subtitles, overlay, amix/sidechain ducking) — the team already does ffmpeg render and subtitle burning.
- Reuse: Mediabunny (thumbnails/waveform/metadata, optional draft export), react-timeline-editor or dnd-kit for timeline interactions (evaluate React 19), `@remotion/captions` types/helpers (MIT), Fabric/Konva only if free-form drag/rotate of overlays is needed.
- Do not reuse: Twick, Shotstack SDK, OpenVideo editor, Etro, Rescript (licences); OpenCut/Omniclip (in rewrite); ffmpeg.wasm as renderer (speed, GPL-2.0-or-later core).
- Decision to make with legal/finance: Remotion vs custom. Remotion costs: licence (UNVERIFIED exact amount) + per-render fees (e.g. 10,000 renders = $100/month at $0.01 each, per the FAQ's rate) + Chromium render hosting or Lambda, and the product is coupled to Remotion pricing changes ("licence will change slightly in Remotion 5.0"). Custom costs engineering time on timeline UX, but keeps ffmpeg as the single renderer.
- Sequencing: ship v1 as "edit decisions only" (cuts, captions text edits, text overlay, logo, music) with server render; add features only when both preview and ffmpeg builder support them.

### Gaps
- No team-size/time estimates sourced; no evidence about maintenance burden of building a timeline UI beyond general reasoning.
- Legal read of each licence (Remotion Automators scope, Twick SUL, PolyForm Shield "competing" clause, MPL-2.0 file-level obligations) was not obtained from counsel; the licence interpretations above are mine.
- Safari/iOS behaviour of the recommended preview approach (`<video>` seeking accuracy, audio sync) not tested.
