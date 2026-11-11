# Open-source projects for AI auto-editing of video and web video editors (as of 2026-11-11)

Method note: star counts, last-push dates, licenses, languages and latest releases were read with `gh repo view <owner/repo> --json ...` (read-only) and `gh search repos` on **2026-11-11**. "Pushed" = GitHub `pushedAt` (last push to any branch, not necessarily a release). "Stale" = no push in the last 12 months (before 2025-11-11). README claims were read with WebFetch on the same date; where a page did not state something, that is noted. Nothing was installed, cloned or run. Note: `gh api` was blocked by a local hook in this session, so I used `gh repo view` / `gh search repos` instead. Several repos have moved owners (GitHub redirects the old name): `designcombo/react-video-editor` is now `openvideodev/react-video-editor`; `SamurAIGPT/AI-Youtube-Shorts-Generator` is now `Anil-matcha/AI-Youtube-Shorts-Generator`; `hughfenghen/WebAV` is now `WebAV-Tech/WebAV`; `redotvideo/revideo` is now `midrender/revideo`.

## Q1. Auto-edit engines and libraries (silence/filler removal, captions with word timestamps, scene detection, beat sync, auto reframe, clip selection)

### Takeaway
The best reusable, permissively licensed building blocks are faster-whisper or WhisperX (word-timestamp transcripts), PySceneDetect (shot detection), librosa and Beat This (beat grid), and silero-vad (cheap silence/speech detection). auto-editor is excellent for silence/motion cutting but is a Nim CLI (public domain), so we would shell out to it or just re-implement the loudness-threshold logic with ffmpeg. There is no actively maintained, drop-in open-source "auto reframe" (AutoFlip successor) or "best-take selection" project; both would be custom work.

### Cited Findings

Verified repo metadata (checked 2026-11-11):

| Project | Stars | Last push | Latest release | License | Lang | Status |
|---|---|---|---|---|---|---|
| [WyattBlue/auto-editor](https://github.com/WyattBlue/auto-editor) | 5,846 | 2026-11-10 | 31.8.0 (2026-10-30) | Unlicense (public domain) | Nim | active |
| [Breakthrough/PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | 5,431 | 2026-11-10 | v0.7.3 (2026-11-08) | BSD-3-Clause | Python | active |
| [m-bain/whisperX](https://github.com/m-bain/whisperX) | 25,212 | 2026-10-22 | v3.8.6 (2026-05-25) | BSD-2-Clause | Python | active |
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | 26,664 | 2026-11-10 | v1.2.1 (2025-10-31) | MIT | Python | active (code), release ~12 months old |
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | 55,092 | 2026-11-10 | v1.9.5 (2026-10-06) | MIT | C++ | active |
| [openai/whisper](https://github.com/openai/whisper) | 112,449 | 2026-08-31 | v20250625 (2025-06-26) | MIT | Python | slow-moving |
| [jianfch/stable-ts](https://github.com/jianfch/stable-ts) | 2,282 | 2026-05-30 | 2.0.0 tag (2023-03-17) | MIT | Python | **archived 2026-05-30** |
| [snakers4/silero-vad](https://github.com/snakers4/silero-vad) | 10,637 | 2026-10-22 | v6.2.3 (2026-09-23) | MIT | Python | active |
| [MahmoudAshraf97/ctc-forced-aligner](https://github.com/MahmoudAshraf97/ctc-forced-aligner) | 575 | 2026-09-07 | v0.2 (2024-06-03) | BSD-2-Clause | Python | low activity |
| [pyannote/pyannote-audio](https://github.com/pyannote/pyannote-audio) | 10,781 | 2026-11-09 | 4.0.7 (2026-06-30) | MIT | Python (notebook-tagged) | active |
| [librosa/librosa](https://github.com/librosa/librosa) | 8,875 | 2026-11-11 | 1.0.0 (2026-08-11) | ISC | Python | active |
| [CPJKU/beat_this](https://github.com/CPJKU/beat_this) | 479 | 2026-05-28 | v1.1.0 (2026-04-14) | MIT (code and weights) | Python | active-ish |
| [CPJKU/madmom](https://github.com/CPJKU/madmom) | 1,738 | 2026-03-20 | v0.16.1 (2018-11-14) | BSD code + CC BY-NC-SA 4.0 models | Python | old release |
| [Zulko/moviepy](https://github.com/Zulko/moviepy) | 15,136 | 2026-08-26 | v2.2.1 (2025-05-21) | MIT | Python | active |
| [mifi/editly](https://github.com/mifi/editly) | 5,606 | **2025-05-12** | v0.15.0-rc.1 (2025-01-19) | MIT | TypeScript | **stale (>12 months)** |
| [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) (AutoFlip lives here) | 37,644 | 2026-11-11 | v1.2.2 (2026-11-03) | Apache-2.0 | C++ | active repo; AutoFlip status unverified |
| [ClipsAI/clipsai](https://github.com/ClipsAI/clipsai) | 565 | **2024-01-17** | none | MIT | Python | **stale (~34 months)** |
| [soCzech/TransNetV2](https://github.com/soCzech/TransNetV2) | 1,080 | **2023-12-04** | none | MIT | Python | **stale** |
| [modelscope/FunClip](https://github.com/modelscope/FunClip) | 6,538 | 2026-11-01 | v2.2.1 (2026-09-01) | MIT | Python | active (README not read by me) |
| [mifi/lossless-cut](https://github.com/mifi/lossless-cut) | 45,919 | 2026-11-09 | v3.70.2 (2026-10-28) | **GPL-2.0** | TypeScript | active; GPL, learn-only |
| [Vanilagy/mediabunny](https://github.com/Vanilagy/mediabunny) | 7,478 | 2026-11-11 | v1.65.2 (2026-11-04) | MPL-2.0 | TypeScript | active; browser media read/write/convert |
| [ffmpegwasm/ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm) | 17,954 | 2026-09-29 | v12.15 (2025-01-07) | MIT | C | maintained, release ~22 months old |

Feature facts from READMEs and docs:
- auto-editor: detects dead space mostly by audio loudness (thresholds e.g. `audio:-19dB`), supports `--edit motion:threshold=0.02`, `--margin` padding, combining methods with `or`, and exports to Premiere XML, DaVinci Resolve, Final Cut Pro, ShotCut, Kdenlive, CMX 3600 EDL and clip sequences; the README documents CLI use only and mentions no Python/library API; written in Nim — [auto-editor README](https://github.com/WyattBlue/auto-editor).
- PySceneDetect: ContentDetector (default), AdaptiveDetector (better with fast camera movement), ThresholdDetector (fades); Python API `detect()` / `SceneManager`; `split_video_ffmpeg` and CLI `split-video`; OpenCV-based — [PySceneDetect README](https://github.com/Breakthrough/PySceneDetect).
- WhisperX: word-level timestamps via wav2vec2 forced alignment, VAD preprocessing, optional pyannote diarization, about 70x realtime with large-v2 batched on GPU, CPU supported with int8; GPU path wants CUDA 12.8; diarization requires a Hugging Face token and accepting the pyannote model terms; numbers/currency words get no timing; alignment models are language-specific (defaults for en, fr, de, es, it) — [WhisperX README](https://github.com/m-bain/whisperX).
- stable-ts: word timestamps via cross-attention/DTW, `regroup()` caption segmentation, silence suppression (optionally Silero VAD), `align()` to time existing text (useful for script-to-audio alignment), backends faster-whisper/HF/MLX; the repo states development is "indefinitely paused" and was archived 2026-05-30 — [stable-ts README](https://github.com/jianfch/stable-ts).
- Remotion's own caption path: `@remotion/install-whisper-cpp` `transcribe()` with `tokenLevelTimestamps` (passes `--dtw`; docs say prefer `t_dtw` for accurate timing), requires 16-bit 16 kHz WAV, Node.js/Bun only (not browser), models `tiny` to `large-v3-turbo` — [Remotion transcribe docs](https://www.remotion.dev/docs/install-whisper-cpp/transcribe). Caption sources that convert into Remotion's common `Caption` type: `@remotion/install-whisper-cpp`, `@remotion/whisper-webgpu`, `@remotion/openai-whisper`, `@remotion/elevenlabs` — [Remotion captions API](https://www.remotion.dev/docs/captions/api).
- Beat This: predicts beats and downbeats without DBN post-processing (ISMIR 2024); code and weights MIT, with a caveat that some training data is copyrighted or limited-CC and the user must assess impact; needs PyTorch 2.0+ — [Beat This README](https://github.com/CPJKU/beat_this). madmom: source BSD, but model/data files are CC BY-NC-SA 4.0 and commercial users are told to contact the author — [madmom README](https://github.com/CPJKU/madmom). So librosa (ISC) is the lowest-risk beat tracker; Beat This is the more accurate option with a licensing caveat; madmom models are non-commercial.
- ClipsAI: finds clips from a transcript and resizes 16:9 to 9:16 by following the active speaker (uses pyannote diarization, needs a HF token for resizing); built for podcasts/interviews/speeches, pulls WhisperX from GitHub — [ClipsAI README](https://github.com/ClipsAI/clipsai). Last push 2024-01-17.
- AutoFlip (Google): scene change detection by color histogram, then per-shot saliency (face/object detection through MediaPipe on TFLite/CPU), chooses stationary, panning or tracking camera path — [Google Research blog](https://research.google/blog/autoflip-open-source-framework-for-intelligent-video-reframing/). A third-party mirror of the MediaPipe doc says it only works with OpenCV 3 — [mirror](https://chuoling.github.io/mediapipe/solutions/autoflip.html) (third-party, treat as a hint). I could not load the official doc page or confirm "legacy" status.
- Reframe successors found by `gh search` are all tiny: [AhmedHisham1/pyautoflip](https://pypi.org/project/pyautoflip/) (24 stars, MIT, pushed 2026-10-21; saliency crop using UNISAL and InsightFace per its PyPI description), [KazKozDev/auto-vertical-reframe](https://github.com/KazKozDev/auto-vertical-reframe) (25 stars, MIT, YOLO tracking, pushed 2026-10-04), [fralapo/FrameShift](https://github.com/fralapo/FrameShift) (15 stars, MIT, pushed 2026-06-18), [sb2702/longpipe](https://github.com/sb2702/longpipe) (18 stars, MIT, browser WebGPU/WebGL auto-reframe SDK, pushed 2026-07-17), [GrepCut/OpenClipper](https://github.com/GrepCut/OpenClipper) (18 stars, MIT, Tauri desktop Opus Clip alternative with AI highlights, captions and auto-reframing, pushed 2026-11-07). Star counts are low; treat as reference code, not dependencies.
- Beat-synced editing search results are all hobby-size: [ZiadAbdelkarim/beat-synced-edit](https://github.com/ZiadAbdelkarim/beat-synced-edit) 13 stars MIT, pushed 2026-08-08.
- MoviePy 2.x (MIT) and editly (MIT, stale) are ffmpeg-wrapping composition libraries; editly's last push was 2025-05-12 — [moviepy](https://github.com/Zulko/moviepy), [editly](https://github.com/mifi/editly).

### Inferences
- For our stack the cheapest path to silence/filler removal is: transcribe with faster-whisper or WhisperX (word timestamps) + silero-vad / ffmpeg `silencedetect`, compute keep-ranges in Python, store them as trim in/out in SQLite, and let Remotion render the cut list. auto-editor adds little beyond what that does unless we want its motion detection or XML export; a Nim binary is also an awkward dependency. This is my inference from the README feature list.
- Filler-word removal ("um", "uh") needs word timestamps plus a filler list; WhisperX alignment or faster-whisper `word_timestamps=True` provides that. Whisper tends to omit fillers unless prompted; I did not find a source in this research to verify that, so test it.
- Remotion's `install-whisper-cpp` is the lowest-friction captions path because it already outputs Remotion's `Caption` type, but it is Node-only and needs WAV input; WhisperX is better when we want forced alignment against a known script. Pick one rather than both for the 2-week window.
- PySceneDetect is mainly useful to split a long uploaded clip into takes or to find cut points; for "one clip per storyboard shot" uploads it is a secondary feature.
- Auto reframe: with real filmed footage the user likely shoots vertical already, so reframing is lowest priority; if needed, a MediaPipe/YOLO face-tracking crop written in Python (crop filter keyframes sent to Remotion) is feasible, using the small MIT repos above as references.
- Beat sync: librosa `beat_track` (ISC) generates cut points aligned to music; this is a few days of work and matches our Python backend.

### Gaps
- Official MediaPipe AutoFlip documentation page returned 404/redirect; its current maintenance status is unverified.
- No open-source project found that does "best-take selection" (choosing the best of several takes by speech quality, fluency, eye contact) or "script-to-clip matching" as a packaged feature; these would need Whisper transcripts plus text similarity or an LLM. I did not read FunClip's README, so its fit (text-driven clip selection, Chinese-oriented origin) is unconfirmed.
- Filler-word recall of Whisper models was not verified from any source.
- Benchmarks comparing WhisperX, faster-whisper and whisper.cpp on Apple Silicon were not collected.

## Q2. Web video editor UIs (React)

### Takeaway
No project is a clean, permissive, actively maintained, embeddable React timeline editor that matches our needs. OpenCut (MIT, 98k stars) is the most popular but is mid-rewrite to Rust/WASM and presented as an app, not a component. openvideodev/react-video-editor and Remotion's Editor Starter are strong references but each carries a Remotion-style "more than 3 employees needs a paid license" model. The most realistic 2-week approach is a small custom timeline built on `react-timeline-editor` (MIT) inside our existing React Flow/Remotion setup, studying the others for UX.

### Cited Findings

| Project | Stars | Last push | Release | License | Lang/stack | Notes |
|---|---|---|---|---|---|---|
| [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut) | 98,076 | 2026-09-24 | v0.3.0 (2026-04-15) | MIT | TypeScript (moving to Rust core) | app, not embeddable component |
| [openvideodev/react-video-editor](https://github.com/openvideodev/react-video-editor) (formerly designcombo) | 1,832 | 2026-06-30 | none | dual: free for individuals, non-profits, orgs up to 3 employees; company license above that | Next.js 15, PixiJS v8, WebCodecs | showcase/starter for OpenVideo engine |
| [ncounterspecialist/twick](https://github.com/ncounterspecialist/twick) | 547 | 2026-06-04 | v0.15.31 (2026-03-18) | Sustainable Use License v1.0 (GitHub says "other") | TypeScript, React, Fabric.js | SDK of packages, server render via Puppeteer+FFmpeg |
| [diffusionstudio/core](https://github.com/diffusionstudio/core) | 1,250 | 2025-11-18 | v1.1.1 (2024-10-29) | MPL-2.0 | TypeScript | WebCodecs engine, barely inside 12 months |
| [omni-media/omniclip](https://github.com/omni-media/omniclip) | 1,471 | 2026-11-09 | none | MIT | TypeScript | browser editor |
| [etro-js/etro](https://github.com/etro-js/etro) | 1,155 | 2026-11-04 | v0.14.1 (2026-08-12) | **GPL-3.0** | TypeScript | canvas video framework; copyleft |
| [xzdarcy/react-timeline-editor](https://github.com/xzdarcy/react-timeline-editor) | 801 | 2026-01-25 | v1.0.0 (2026-01-25) | MIT | TypeScript, React | timeline component only |
| [WebAV-Tech/WebAV](https://github.com/WebAV-Tech/WebAV) | 2,099 | 2026-01-10 | none | MIT | TypeScript | WebCodecs video SDK |
| [Vanilagy/mediabunny](https://github.com/Vanilagy/mediabunny) | 7,478 | 2026-11-11 | v1.65.2 | MPL-2.0 | TypeScript | media container read/write in browser |
| [AmitDigga/fabric-video-editor](https://github.com/AmitDigga/fabric-video-editor) | 575 | 2026-08-30 | none | MIT | Fabric.js, React, Next.js | timeline, text/image/video/audio layers, export with sound |
| [AIEraDev/Clypra](https://github.com/AIEraDev/Clypra) | 3,358 | 2026-11-11 | n/a | MIT (FFmpeg LGPL) | Rust/Tauri v2 + React 19 | desktop app, no AI features listed |
| [midrender/revideo](https://github.com/midrender/revideo) (formerly redotvideo) | 4,200 | 2026-07-15 | none | MIT | TypeScript | code-based video; Motion Canvas fork |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | 19,768 | 2026-07-02 | v3.17.2 (2024-12-14) | MIT | TypeScript | code animation, not an editor |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | 72,391 | 2026-11-11 | v4.0.542 (2026-11-09) | custom ("Other") source-available | TypeScript | our renderer |

Facts from READMEs and docs:
- OpenCut: described as "the open-source CapCut alternative"; the README says it is being rewritten from the ground up with a Rust core shared across web/desktop/mobile, is in design phase, is not accepting outside contributions yet, and lists plugins, an Editor API, an MCP server for AI agents and headless batch rendering as planned (roadmap, not present) — [OpenCut README](https://github.com/OpenCut-app/OpenCut). v0.3.0 notes: masks, bezier graph editor, speed with pitch preservation, custom canvas sizes, keyframes, a Rust/wgpu compositor compiled to WASM, ripple editing rebuilt, transcript import to make captions — [OpenCut v0.3.0 release](https://github.com/OpenCut-app/OpenCut/releases/tag/v0.3.0). The desktop app in the repo is early with no features yet (same page). My WebFetch of the README found no mention of a "classic" branch; a README-derived claim of "opencut-classic" could not be confirmed (the branch URL returned 404).
- openvideodev/react-video-editor: README describes it as a client-side web video editor and a starter kit for video-editing SaaS; Next.js 15, PixiJS v8 via `@openvideo/engine-pixi`, `@openvideo/core` and `@openvideo/timeline`; multi-track timeline with split/trim/snap, WebCodecs MP4 export in the browser; asset storage on R2/S3; needs `DEEPGRAM_API_KEY` for transcription and `PEXELS_API_KEY`; license is "Free for individuals, non-profits, and organizations with up to 3 employees", otherwise a Company License; 34 commits, no releases — [README](https://github.com/openvideodev/react-video-editor). GitHub's license detector labels it "other"; I could not fetch a LICENSE file (404 on `LICENSE.md`), so the exact legal text is unread.
- Twick: packages include `@twick/studio` (prebuilt editor UI), `@twick/timeline`, `@twick/canvas` (Fabric.js), `@twick/live-player`, `@twick/browser-render` (WebCodecs + FFmpeg.wasm; Chrome/Edge only), `@twick/render-server` (Puppeteer + FFmpeg), AWS Lambda export, caption generation via Google Vertex AI (Gemini), and an MCP agent; license is the Sustainable Use License v1.0, which allows commercial use, modification and self-hosting but forbids reselling or redistributing it as a standalone SDK; it does not use Remotion — [Twick README](https://github.com/ncounterspecialist/twick). macOS/Linux supported, Windows not officially tested (same page).
- Remotion Editor Starter: a paid Remotion-based template with timeline, interactive canvas, font picker, asset uploads and 80+ feature flags; one-time purchase for individuals/small companies, Company License for larger companies; source is delivered through a private GitHub repo after purchase and is governed by the Remotion License plus its own license — [Editor Starter docs](https://www.remotion.dev/docs/editor-starter). Not open source.
- Diffusion Studio core, WebAV, mediabunny and ffmpeg.wasm are engines for in-browser decode/encode; they would only matter if we want client-side preview or export, which we do not need since rendering is server-side Remotion.
- react-timeline-editor: a timeline component for React (v1.0.0, 2026-01-25, MIT) — metadata only; I did not read its README, so features (drag, resize, snapping, custom action renderers) are unverified — [repo](https://github.com/xzdarcy/react-timeline-editor).

### Inferences
- Because we already render with Remotion and must not let users upload Remotion code, the cleanest design is: edit state is a JSON edit decision list (clips, trim in/out, order, captions, music) stored in SQLite; a thin React timeline component edits that JSON; Remotion's `<Player>` previews it; the Python backend triggers the server render. This reuses almost none of the big editor repos but avoids their engines and licenses.
- openvideodev/react-video-editor and Twick are best treated as UX/architecture references. Reusing code from react-video-editor would add a second license obligation on top of Remotion's (both use the ">3 employees" model); Twick's SUL is workable for internal use but bars resale as an SDK, and its Fabric.js/WebCodecs stack differs from ours.
- OpenCut has by far the most community attention, but its architecture is in flux (Rust/WASM, `v0.3.0` on 2026-04-15) and I found no sign it is meant to be embedded. Good for UX ideas (keyframes, ripple editing, transcript-to-captions), poor as a dependency.
- Etro (GPL-3.0) and LosslessCut (GPL-2.0) cannot be embedded in a closed commercial product without copyleft implications; read-only learning is fine.
- `react-timeline-editor` (MIT) is the most plausible dependency for a timeline within two weeks, subject to reading its docs and confirming it works with React 18/19 and Vite.

### Gaps
- Exact legal text for openvideodev's dual license was not retrieved; "up to 3 employees" comes from the README.
- Did not verify whether react-timeline-editor supports multi-track clip drag between tracks, waveform rendering or snapping; did not test any component.
- Did not verify the Remotion `<Player>` and timeline examples beyond the Editor Starter page; no Remotion-published free timeline component was found in this research.
- No data on actual maintenance responsiveness (issue/PR response times) for any project.

## Q3. End-to-end AI short-video pipelines (for ideas, not reuse)

### Takeaway
MoneyPrinterTurbo is the only very active, widely used pipeline (142k stars, MIT, released 2026-11-07); it is generation-from-stock-footage rather than editing of user-shot clips, so it informs our captions/music/TTS flow but not our core use case. ShortGPT is stale; the "AI YouTube Shorts Generator" family is mostly LLM glue around Whisper and ffmpeg.

### Cited Findings
- [harry0703/MoneyPrinterTurbo](https://github.com/harry0703/MoneyPrinterTurbo): 142,264 stars, pushed 2026-11-11, release v1.3.10 (2026-11-07), MIT, Python. Pipeline per README: LLM script, TTS (Edge TTS default), stock footage from Pexels/Pixabay/Coverr or local media, generated subtitles and background music, composed with FFmpeg; 9:16 (1080x1920), 16:9 and 1:1; WebUI (Streamlit), API, CLI; subtitle modes `edge` (TTS timestamps) or `whisper` (local faster-whisper); Python 3.11+. The page is heavily sponsor-promotional.
- [RayVentura/ShortGPT](https://github.com/RayVentura/ShortGPT): 8,154 stars, MIT, Python, last push and last release both 2025-02-10 (v0.3.0). **Stale (>12 months).**
- [Anil-matcha/AI-Youtube-Shorts-Generator](https://github.com/Anil-matcha/AI-Youtube-Shorts-Generator) (formerly SamurAIGPT): 5,944 stars, MIT, Python, pushed 2026-11-10, no releases. I did not read its README, so its pipeline details are unverified.
- [GrepCut/OpenClipper](https://github.com/GrepCut/OpenClipper): 18 stars, MIT, TypeScript/Tauri, pushed 2026-11-07; self-described local-first Opus Clip alternative: AI highlights, animated captions, auto-reframing (repo description only).
- [modelscope/FunClip](https://github.com/modelscope/FunClip): 6,538 stars, MIT, pushed 2026-11-01, release v2.2.1 (2026-09-01); an ASR-based video clipping tool (metadata only; README unread).
- [ClipsAI/clipsai](https://github.com/ClipsAI/clipsai) is the closest open-source analogue to Opus Clip but is stale (see Q1).
- Several recent repos wrap Claude/agent skills around ffmpeg (e.g. [rafcopy/auto-cut-agent](https://github.com/rafcopy/auto-cut-agent), 47 stars, MIT, pushed 2026-08-06; [6missedcalls/video-editing-skill](https://github.com/6missedcalls/video-editing-skill), 52 stars) — tiny, surfaced by `gh search`; contents unread.

### Inferences
- The MoneyPrinterTurbo subtitle design (word timing from the TTS engine or from Whisper, user-selectable) is a useful pattern; for us the source is always Whisper because the audio is real filmed speech.
- None of these handle "user-uploaded clip per storyboard shot, ordered by script", so our script-to-shot alignment (match transcript segments to storyboard lines) is original work, probably text similarity plus an LLM.

### Gaps
- READMEs for Anil-matcha/AI-Youtube-Shorts-Generator, FunClip, auto-cut-agent were not read.
- No usage numbers beyond GitHub stars; stars for MoneyPrinterTurbo are unusually high and I did not verify their organic nature.

## Q4. Remotion licensing for companies (current as of 2026-11-11)

### Takeaway
Remotion is source-available, not open source. It is free for individuals, non-profits and for-profit organizations of up to 3 people; larger companies need a paid Company License. Per the license FAQ, organizations building video editors or using the Remotion Player fall under "Remotion for Automators" (per-render pricing with a monthly minimum), so BuildClub should budget for a license if it has more than 3 people.

### Cited Findings
- Free License: individuals; for-profit organizations with "up to 3 employees"; non-profits; evaluators not yet using it commercially. Others must buy a Company License, which adds prioritized support. You may not copy or modify Remotion code to sell, rent or license your own derivative. The page states the license will change slightly in Remotion 5.0 — [Remotion LICENSE.md](https://raw.githubusercontent.com/remotion-dev/remotion/main/LICENSE.md).
- FAQ: "Remotion is source-available software, but it is not open source software." Free License covers "an organization or team of individuals with up to 3 people", including single-person companies as long as headcount is 3 or less — [Remotion license FAQ](https://www.remotion.dev/docs/license/faq.md).
- FAQ pricing: "Remotion for Creators" costs $25/month per person who writes Remotion code themselves or with agentic coding tools; "Remotion for Automators" is priced per render with a minimum spend of $100/month; combined plans share a $100/month minimum; Enterprise has a $500 minimum — same FAQ. A WebSearch summary quoted $0.01 per render for Automators and noted that the Enterprise baseline price matches the Company License; I did not see the $0.01 figure on a page I fetched directly (the pricing page's table did not render), so treat that number as secondary — [Remotion pricing](https://www.remotion.dev/docs/license/pricing). Third-party sites quote different numbers ($10 per 1000 renders), which conflicts with the $0.01 figure; official page should be checked at purchase time.
- FAQ on automation: an automation is code that programmatically calls Remotion render APIs or commands (including `renderMediaOnLambda()`, `renderStillOnLambda()`, `npx remotion lambda render`); "organizations building video editors, prompt-to-video tools, automated video pipelines or using the Remotion Player will fall under Remotion for Automators"; it is not allowed to let users bring or upload their own Remotion code for rendering; letting users render personalized videos from your template is allowed — same FAQ.
- Remotion is self-hosted: "licensing gives you permission to use it, but Remotion is not a hosted service" — same FAQ.
- GitHub reports the repo license as "Other" (not an OSI license) — [remotion-dev/remotion](https://github.com/remotion-dev/remotion).
- Remotion Editor Starter is a separate paid product (one-time purchase for small, subscription for larger companies) — [Editor Starter docs](https://www.remotion.dev/docs/editor-starter).

### Inferences
- Our product (agencies editing and exporting) is a video editor using Remotion rendering and probably the Remotion Player for preview, so the FAQ language places it in "Automators"; at 2026 pricing that is a recurring cost (minimum $100/month, per-render beyond) once the team exceeds 3 people. This is my reading of the FAQ, not legal advice; confirm with Remotion.
- Alternatives that avoid this: Twick (SUL, own render path), mediabunny/WebCodecs, or ffmpeg-only compositing (MoviePy, editly stale) — but that costs the caption-styling quality Remotion gives us.

### Gaps
- Official per-render price not directly confirmed on a rendered page (JS table not captured).
- Details of the Remotion 5.0 license change are unknown; the LICENSE page only says there will be a slight change.
- No confirmation of whether the free tier headcount counts contractors or agency clients' staff.

## Q5. Ranked shortlist and fit for a 2-week build

### Takeaway
Reuse (as dependencies): faster-whisper or WhisperX, silero-vad, PySceneDetect, librosa. Learn from or lightly reuse: react-timeline-editor (MIT, timeline UI), Beat This (MIT, better beats). Learn only: OpenCut, openvideodev/react-video-editor, Twick, Remotion Editor Starter, MoneyPrinterTurbo, ClipsAI, AutoFlip.

### Cited Findings
(Evidence for all rows is in Q1-Q4; rankings below are inference.)

### Inferences
Ranked list (1 = most useful for our stack in 2 weeks):

1. **faster-whisper** ([SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper)) — 26.7k stars, pushed 2026-11-10, MIT, Python. Word timestamps for captions, filler and silence cuts, script matching input. Python backend fits directly. Effort: 1-2 days. Risk: last release 2025-10-31 (code still active).
2. **WhisperX** ([m-bain/whisperX](https://github.com/m-bain/whisperX)) — 25.2k stars, pushed 2026-10-22, BSD-2-Clause. Better word timing via forced alignment; optional diarization needs HF token; heavier deps (torch, CUDA on server). Choose if caption timing accuracy matters more than install simplicity.
3. **PySceneDetect** — 5.4k stars, v0.7.3 released 2026-11-08, BSD-3. Shot/take segmentation and thumbnails. Effort: under 1 day.
4. **silero-vad** — 10.6k stars, MIT. Reliable speech/silence segments; pairs with ffmpeg for cut lists. Effort: under 1 day.
5. **librosa** — 8.9k stars, ISC, 1.0.0 released 2026-08-11. Beat grid for music sync. Effort: 1-2 days including cut-snapping UX. **Beat This** (MIT) is an accuracy upgrade with a training-data licensing caveat; avoid madmom models (CC BY-NC-SA).
6. **Remotion captions stack** (`@remotion/captions`, `@remotion/install-whisper-cpp`) — part of Remotion, license per Q4. Use for caption rendering; Node-only transcription means either a Node worker or use Python for transcription and convert to the `Caption` shape.
7. **react-timeline-editor** — 801 stars, MIT, v1.0.0 2026-01-25. Candidate timeline UI; verify features before committing. Effort: 3-5 days to wire to edit-list JSON and Remotion Player.
8. **auto-editor** — 5.8k stars, Unlicense, Nim CLI, active. Optional: call as a subprocess for silence/motion cuts or Premiere/Resolve XML export for agencies who finish in an NLE. Effort: 0.5 day to integrate, but a non-Python dependency.
9. **OpenCut** — UX reference (keyframes, ripple, transcript-to-captions); not embeddable now.
10. **openvideodev/react-video-editor, Twick, Remotion Editor Starter** — architecture and UX references; each has commercial-license terms to check.
11. **Auto reframe** — nothing mature; write a small YOLO/MediaPipe face-track crop, referencing KazKozDev/auto-vertical-reframe (MIT, 25 stars) and AutoFlip's design. Low priority for real filmed vertical content.
12. **MoneyPrinterTurbo, ShortGPT (stale), AI-Youtube-Shorts-Generator, ClipsAI (stale)** — ideas only.

Not recommended to embed: Etro (GPL-3.0), LosslessCut (GPL-2.0), madmom models (non-commercial), stable-ts (archived), editly (stale), ClipsAI/TransNetV2 (stale).

### Gaps
- No project performed best-take selection or script-to-clip matching; these need custom logic (transcript similarity, LLM scoring, speech fluency metrics).
- I ran no benchmarks, installs or code; fit estimates are judgment from READMEs and metadata.
- Star counts and dates are a single snapshot from 2026-11-11.
