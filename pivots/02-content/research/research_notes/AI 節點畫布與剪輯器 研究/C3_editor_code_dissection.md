# C3: Source-level dissection of open-source CapCut-style browser video editors (for Remake's lightweight editor panel)

Date checked: 2026-11-02. Method: shallow clones (`--depth 1`, no install, no code run) into the session scratchpad `.../scratchpad/clones/`, plus `gh api`, plus the Remotion docs source (`packages/docs/docs/**` in remotion-dev/remotion). Licence ignored per brief (non-commercial student demo); licence notes are given only where they change what is technically obtainable.

Commits inspected (short sha, commit date): OpenCut main `e668010` (2026-09-24); opencut-classic `cf5e79e` (2026-05-17); openvideodev/react-video-editor `9a8c529` (2026-06-29); ncounterspecialist/twick `3044c23` (2026-05-07); omni-media/omniclip `cbe581a` (2025-08-07); wassgha/rescript `167c7b3` (2026-10-29); diffusionstudio/core `4e784a7` (2025-11-18); midrender/revideo `b5de67a` (2026-07-15); walterlow/freecut `5ceeeb3` (2026-10-29); Augani/openreel-video (cloned, only top-level looked at).

Name corrections found while verifying (the brief's repo names are partly stale):
- `designcombo/react-video-editor` now resolves to **`openvideodev/react-video-editor`** (GitHub API returns that full_name). Its GitHub description still says "using remotion", but its README/package.json say PixiJS v8 + WebCodecs via `@openvideo/*` packages. The Remotion claim is outdated.
- Omniclip is **`omni-media/omniclip`** (`omniclip/omniclip` is 404).
- Rescript is **`wassgha/rescript`** (`rescript-app/rescript` is 404).
- Revideo is now **`midrender/revideo`** (was `redotvideo/revideo`).
- Twick is `ncounterspecialist/twick`.

---

## 1. Stack and key dependencies (framework, state store, timeline component, canvas/render engine)

### Takeaway
Only OpenCut classic, FreeCut and Rescript are React + Zustand codebases with a hand-rolled timeline; the others are either engine libraries (Diffusion, Revideo), a different UI framework (Omniclip, Lit-style), or depend on closed/paid parts (Remotion Editor Starter, OpenVideo engine). For a React 19 + Vite app, the most reusable reference stacks are OpenCut classic (Next, but UI is plain React + Zustand + mediabunny) and Rescript (React 19 + Zustand + ffmpeg.wasm).

### Cited Findings
- **OpenCut (main branch) was rewritten and no longer contains the editor engine.** README: "OpenCut is being rewritten from the ground up", planned Editor API, plugins, Rust core, MCP server, headless mode; the previous version lives at `opencut-app/opencut-classic` and opencut.app still runs classic. Root `Cargo.toml` has only `apps/desktop` (gpui 0.2.2) as a workspace member; `apps/web` is a TanStack Start + Vite 8 + React 19 + shadcn shell with only `routes/{__root,editor,index}.tsx` (about 8.3k TS/Rust lines total). 97,117 stars, 386 open issues, MIT, last push 2026-09-24. — [OpenCut README](https://github.com/OpenCut-app/OpenCut/blob/main/README.md), [Cargo.toml](https://github.com/OpenCut-app/OpenCut/blob/main/Cargo.toml), [apps/web/package.json](https://github.com/OpenCut-app/OpenCut/blob/main/apps/web/package.json); local clone `OpenCut-app_OpenCut/`
- **OpenCut architecture history (old vs new):**
  - July 2025 snapshot (commit `33d8caf`, found via `gh api commits?until=2025-07-20`): Next.js 15, React 18, Zustand 5, `@ffmpeg/ffmpeg` 0.12 (ffmpeg.wasm) — [apps/web/package.json @33d8caf](https://github.com/OpenCut-app/OpenCut/blob/33d8caf65ca33fec731edcae84f43105b55245c6/apps/web/package.json).
  - Classic (May 2026, `opencut-classic`): Next 16.1.3 + React 19 + Zustand 5 + **mediabunny** 1.29 + `opencut-wasm` (Rust compiled to WASM) + wavesurfer.js + `@huggingface/transformers` (in-browser Whisper) + soundtouchjs; `AGENTS.md` states "An ongoing migration is moving all business logic into `rust/`... Each app under `apps/` is a UI shell" (web = Next.js, desktop = GPUI). About 91k TS/TSX lines in `apps/web/src` (includes blog/site/changelog code) plus about 4.3k Rust lines in `rust/` (crates: bridge, compositor, effects, gpu, masks, time). 293 stars, MIT. — [opencut-classic](https://github.com/opencut-app/opencut-classic), [apps/web/package.json](https://github.com/opencut-app/opencut-classic/blob/main/apps/web/package.json), [AGENTS.md](https://github.com/opencut-app/opencut-classic/blob/main/AGENTS.md)
  - New (Sept 2026 main): Rust/GPUI desktop + thin TanStack Start web shell; editor logic not yet in the repo.
- **OpenCut classic engine layout:** `core/managers/` has playback, timeline (935 lines), project, scenes, audio (700 lines), renderer, save, selection, clipboard, commands (undo/redo); `services/renderer/` has `scene-builder.ts`, `canvas-renderer.ts`, `gpu-renderer.ts`, `scene-exporter.ts` with per-element render nodes (video/image/text/sticker/graphic/color/blur-background/effect-layer). — local `opencut-classic/apps/web/src/core/managers/*.ts`, `.../services/renderer/*`
- **openvideodev/react-video-editor ("OpenVideo Editor")**: Next.js 16.2.6 + React 19.2, Zustand 5, Tailwind 4, Radix/shadcn, PixiJS 8.14, `@openvideo/core|engine-pixi|timeline` 1.3.1 (the engine/timeline are npm packages, not in this repo), mediabunny 1.26, `opfs-tools`, Deepgram SDK (transcription), Cloudflare R2 / S3 uploads. About 44.5k TS/TSX lines. 1,829 stars, 21 open issues, last push 2026-06-30. The engine repo `openvideodev/openvideo` returns 404 from the API (could not locate source). — [README](https://github.com/openvideodev/react-video-editor/blob/main/README.md), [package.json](https://github.com/openvideodev/react-video-editor/blob/main/package.json); local `openvideodev_react-video-editor/`
- **Twick** (`ncounterspecialist/twick`): pnpm/turbo monorepo of about 45.6k TS lines. Packages: `timeline`, `canvas` (**fabric 6.6**), `live-player` (wraps `@twick/player-react`/`@twick/core`, i.e. a Motion-Canvas-derived engine), `video-editor`, `studio` (React 18/19), `browser-render` (mediabunny + mp4-wasm + mp4box, WebCodecs), `ffmpeg-web` (@ffmpeg/ffmpeg), `render-server` (`@twick/2d|core|renderer|ffmpeg|ui` — headless server render), `cloud-functions`, `workflow`, `ai-models`. 546 stars, 11 open issues, last push 2026-06-04. — [packages/*/package.json](https://github.com/ncounterspecialist/twick/tree/main/packages); local `ncounterspecialist_twick/packages/`
- **Omniclip** (`omni-media/omniclip`): Not React. Uses the `@benev/slate`/`@benev/construct` web-component framework (Lit-like), PixiJS 7.4, mp4box, `@ffmpeg/ffmpeg` 0.12, WebRTC collaboration, `coi-serviceworker`. About 45.1k TS lines in `s/`. 1,468 stars, 25 open issues; last commit in the clone is 2025-08-07 though the API shows a push on 2026-10-31. README: "Omniclip 2.0 is in development"; features include trim, split, text/audio/video/image, undo/redo, transitions, filters, up to 4K render, WebRTC collaboration; "To be added: speech to text". — [README](https://github.com/omni-media/omniclip/blob/main/README.md), [package.json](https://github.com/omni-media/omniclip/blob/main/package.json), [s/context/types.ts](https://github.com/omni-media/omniclip/blob/main/s/context/types.ts)
- **Rescript** (`wassgha/rescript`): Next.js 16 + React 19.2 + Zustand 5 + Tailwind 4; `@huggingface/transformers` 4.2 running `whisper-base_timestamped` / `whisper-small_timestamped` plus `pyannote-segmentation-3.0` ONNX diarization; `parakeet.js`; **ffmpeg.wasm** (`@ffmpeg/core-mt`) for audio extraction and export; Electron wrapper (native ffmpeg in desktop). About 30.5k TS lines (incl. Electron/tests). 1,023 stars; last push 2026-10-29; licence PolyForm-Noncommercial-1.0.0 (fits a non-commercial student demo). — [README](https://github.com/wassgha/rescript/blob/main/README.md), [package.json](https://github.com/wassgha/rescript/blob/main/package.json)
- **Diffusion Studio core** (`diffusionstudio/core`): the GitHub repo contains **only** `playground/`, `docs/` (a Next.js docs site) and `public/` samples; the engine itself is consumed from npm (`@diffusionstudio/core` / `core-v4` in playground imports). README: written in TypeScript, "built on top of Mediabunny", "architecture is inspired by Pixi.js but built from scratch"; requires COOP `same-origin` + COEP `credentialless` headers; free use requires keeping the "Made with Diffusion Studio" watermark on rendered video. 1,252 stars; repo MPL-2.0 but engine source not present. — [README](https://github.com/diffusionstudio/core/blob/main/README.md), [playground/composition.ts](https://github.com/diffusionstudio/core/blob/main/playground/composition.ts)
- **Revideo** (`midrender/revideo`): "a rendering engine for creating videos in code"; scenes are TypeScript generator functions (`makeScene2D`); ships a headless `renderVideo()` API and a React/web-component **player** (`@revideo/player`, `@revideo/player-react`) — **not a timeline editor**. `packages/ui` is the Motion-Canvas-derived dev editor for authoring scenes (not an end-user NLE). Server export goes through `packages/ffmpeg` (fluent-ffmpeg + `@ffmpeg-installer/ffmpeg`, frame images piped in). MIT, 4,165 stars, 63 open issues, last push 2026-07-15. About 45.5k TS lines. — [README](https://github.com/midrender/revideo/blob/main/README.md), [packages/ffmpeg](https://github.com/midrender/revideo/tree/main/packages/ffmpeg)
- **Remotion Editor Starter**: paid template ("Purchase for $600"; includes GitHub repo, no NPM package), React 19 + Remotion + React Router 7 + Tailwind 4; state via plain `useState/useContext` (explicitly **not** Zustand); default render on Remotion Lambda, optional client-side render via `@remotion/web-renderer`; "80+ feature flags"; source is private (docs and a demo at editor-starter.remotion.dev are public). — [remotion.pro/editor-starter](https://www.remotion.pro/editor-starter), [docs: dependencies.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/dependencies.mdx), [state-management.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/state-management.mdx)
- **Other well-known projects found (extra):**
  - **FreeCut** (`walterlow/freecut`, MIT, 2,304 stars, pushed 2026-10-29): React 19.2 + Zustand 5 + Vite (vite-plus) + Tailwind 4 + mediabunny 1.54 + `@huggingface/transformers` + WebGPU + OPFS; multi-track NLE with keyframes, masks, Lottie, compound clips. About **530k** TS/TSX lines (all of `src/`) — far too large to copy; useful as a reference only. — [README](https://github.com/walterlow/freecut/blob/main/README.md), `src/types/timeline.ts`
  - **OpenReel Video** (`Augani/openreel-video`, MIT, 5,553 stars, pushed 2026-10-17): pnpm monorepo (`apps/web`, `desktop`, `studio`, `packages/core|agent|ui|...`), React 19 + Zustand 4, mediabunny; includes an AI-assistant "reversible timeline edits" feature. About 460k TS lines (including everything) — pro-NLE scale. — [README](https://github.com/Augani/openreel-video/blob/main/README.md). Internals not inspected beyond top level.
  - **Remotion core** (`remotion-dev/remotion`, 69.9k stars, 190 open issues, pushed 2026-11-02; the `@remotion/player` and `@remotion/captions` packages are what matter here) — see Q3/Q5.

### Inferences
- A two-to-four-week student build cannot clone 300k+ line NLEs (FreeCut, OpenReel). The practical "copy" sources are the data-model files and a few algorithms (about 100–600 lines each), not whole apps.
- Everything that exports in-browser (OpenCut, OpenVideo, Diffusion, Twick browser-render, Remotion web-renderer) converges on **mediabunny + WebCodecs**. That is the dominant 2026 pattern, but Remake already has a server ffmpeg pipeline, so that pattern is optional, not required.

### Gaps
- Could not read the `@openvideo/*` engine/timeline source (npm packages; `openvideodev/openvideo` repo not found by API) or the Diffusion Studio engine source (not in repo). Statements about their internals come from README/playground/usage code only.
- Remotion Editor Starter source is paid/private; only the public docs were read. Did not inspect `remotion-dev/editor-starter` (likely private).
- Did not read Omniclip's timeline UI components or OpenReel/FreeCut internals beyond type files.

---

## 2. Data model: how the timeline/project is represented (JSON shape)

### Takeaway
Two families: (a) **track -> elements** with start/duration/trim (OpenCut, FreeCut, Twick, Remotion Editor Starter), and (b) **flat clip list with absolute display ranges** (OpenVideo/Studio, Omniclip effects array). For a CapCut-lite panel with one main video sequence plus overlay lanes, OpenCut classic's `SceneTracks { overlay[], main, audio[] }` plus `trimStart/trimEnd/startTime/duration` is the cleanest model to copy; Rescript's `Word{deleted}` plus derived keep-ranges is the cleanest model for word-based cutting.

### Cited Findings
- **OpenCut classic** — `apps/web/src/timeline/types.ts` (TypeScript, tick-based `MediaTime`):
  ```ts
  export interface SceneTracks { overlay: OverlayTrack[]; main: VideoTrack; audio: AudioTrack[]; }
  export interface VideoTrack extends BaseTrack { type:"video"; elements:(VideoElement|ImageElement)[]; muted:boolean; hidden:boolean; }
  interface BaseTimelineElement { id:string; name:string; duration:MediaTime; startTime:MediaTime;
    trimStart:MediaTime; trimEnd:MediaTime; sourceDuration?:MediaTime; animations?; params:ParamValues; }
  export interface VideoElement extends BaseTimelineElement { type:"video"; mediaId:string; isSourceAudioEnabled?:boolean; retime?:{rate:number;maintainPitch?:boolean}; effects?:Effect[]; masks?:Mask[]; }
  export interface TextElement extends BaseTimelineElement { type:"text"; hidden?:boolean; effects?:Effect[]; }   // text content/style live in `params`
  export type AudioElement = UploadAudioElement /*mediaId*/ | LibraryAudioElement /*sourceUrl*/;
  ```
  Track types: video | text | audio | graphic | effect. A project has multiple `TScene`s (`isMain`, `tracks`, `bookmarks`). — [timeline/types.ts](https://github.com/opencut-app/opencut-classic/blob/main/apps/web/src/timeline/types.ts)
- **OpenVideo Editor** — project exported with `studio.exportToJSON()`; the repo's `convertSchemaToExported()` shows the shape: a flat `clips` list, times in **microseconds**:
  ```ts
  { type:"Video", src, timing:{ display:{from:fromUs,to:toUs}, playbackRate:1, duration:durationUs },
    transform:{ x:0,y:0,width:0,height:0,angle:0,zIndex:0,opacity:1,flip:null }, audio:true }
  ```
  The sample input schema (`src/components/schema.ts`) is an AI-script style "segments[] each with clips[]" where `clip.display.{from,to}` are ms, `speechToText.src` points at a caption JSON and `caption:{name:"Modern",size:"medium",position:"bottom"}`. — [src/utils/schema-converter.ts](https://github.com/openvideodev/react-video-editor/blob/main/src/utils/schema-converter.ts), [src/components/schema.ts](https://github.com/openvideodev/react-video-editor/blob/main/src/components/schema.ts), [hooks/use-export.ts](https://github.com/openvideodev/react-video-editor/blob/main/src/components/editor/hooks/use-export.ts)
- **Twick** — `ProjectJSON` in `packages/timeline/src/types.ts` (short keys `s`/`e`):
  ```ts
  ElementJSON { id; type; s:number /*start*/; e:number /*end*/; t?:string /*text*/; position?; rotation?; opacity?; transition?; metadata?; [key:string]:any }
  TrackJSON  { id; name; type?; language?; props?; elements: ElementJSON[] }
  ProjectJSON{ watermark?; backgroundColor?; metadata?; assets?: Record<string,ProjectAssetJSON>; tracks: TrackJSON[]; version:number }
  ```
  `CaptionElement(t, start, end)` is a text segment element (no per-word timing in the class). Element classes: audio, video, image, text, caption, rect, circle, arrow, line, icon, emoji, effect, placeholder. — [timeline/src/types.ts](https://github.com/ncounterspecialist/twick/blob/main/packages/timeline/src/types.ts), [caption.element.ts](https://github.com/ncounterspecialist/twick/blob/main/packages/timeline/src/core/elements/caption.element.ts)
- **Omniclip** — historical state: `{ projectName, projectId, effects: AnyEffect[], tracks: XTrack[], filters, animations, transitions }`; every effect has `{id, start_at_position, duration, start, end, track}` (start/end = trim into source; `start_at_position` = timeline offset, ms); kinds video/audio/image/text with Pixi text style fields. Non-undoable UI state kept separately (`timecode, zoom, timebase, fps, is_playing, export_progress...`). — [s/context/types.ts](https://github.com/omni-media/omniclip/blob/main/s/context/types.ts)
- **Remotion Editor Starter** — documented state: `UndoableState { tracks: TrackType[]; assets: Record<string,EditorStarterAsset>; items: Record<string,EditorStarterItem>; fps; compositionWidth; compositionHeight; deletedAssets }`. Rules: an item refers to at most one asset, belongs to one track, items in a track may not overlap; items: Image, Text, Video, Gif, Solid, Audio, Captions; "the last [tracks] are the ones rendered in the back". Undo is built into the state split (undoable vs non-undoable). — [tracks-items-assets.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/tracks-items-assets.mdx), [state-management.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/state-management.mdx)
- **Diffusion Studio core** — code-defined, not JSON: `Composition` -> `Layer({mode:'SEQUENTIAL'})` -> `VideoClip(source,{range:[2,8]})`; clips take `range`, `delay`, `position`, `animations:[{key,frames:[{time,value}]}]`, `effects`, `mask`, `transition:{duration,type:'dissolve'}`. — [README](https://github.com/diffusionstudio/core/blob/main/README.md)
- **Rescript** — the edit is a *word list plus cut regions*, not clips; `lib/types.ts`:
  ```ts
  interface Word { id:number; text:string; start:number; end:number; speaker:number; deleted:boolean }   // seconds
  interface ManualCut { id:number; start:number; end:number }
  interface EditSnapshot { words:Word[]; manualCuts:ManualCut[]; sceneBoundaries:SceneBoundary[]; speakers:SpeakerInfo[] }
  interface ClipSegment { id:string; start:number; end:number; index:number }   // kept segments
  ```
  `lib/edits.ts` (572 lines) derives cut ranges from deleted words (`getWordCutRanges`, `mergeCutRanges` with `MERGE_GAP = 0.35`, `MIN_CLIP_DURATION = 0.05`, `SPLIT_EPSILON = 0.04`). — [lib/types.ts](https://github.com/wassgha/rescript/blob/main/lib/types.ts), [lib/edits.ts](https://github.com/wassgha/rescript/blob/main/lib/edits.ts)
- **FreeCut** — `TimelineTrack { id,name,kind,height,locked,visible,muted,solo,volume,order,items:TimelineItem[], parentTrackId?... }`; `TimelineItem = Video|Audio|Text|Image|Lottie|Shape|Adjustment|Controller|Composition|SubtitleSegment` item. — `src/types/timeline.ts` in local clone [walterlow/freecut](https://github.com/walterlow/freecut/blob/main/src/types/timeline.ts)

### Inferences
- The shared invariants across all track/element models: `startTime` (position on timeline), `duration`, and `trimStart/trimEnd` (or `start/end` into the source) — i.e. the classic NLE triple. Splitting a clip = clone element, adjust trimEnd of A and trimStart of B, set B.startTime = A.end. That is only a few dozen lines and maps one-to-one onto ffmpeg `trim`/`atrim` filters.
- Time units differ (OpenVideo microseconds, OpenCut integer ticks, Twick/Rescript seconds floats, Remotion frames/ms). For ffmpeg export, **seconds as float or integer milliseconds** is the lowest-friction choice; avoid frames.

### Gaps
- OpenVideo `@openvideo/timeline` internal schema (beyond the exported JSON shown) not read.
- OpenCut classic's `params` object (where text content/style lives) and the exact ParamValues schema not read in detail.

---

## 3. Preview: how playback works and how time is synced

### Takeaway
Two approaches. Engines that composite every frame on a canvas (OpenCut classic, OpenVideo/Pixi, Omniclip/Pixi, Diffusion) are the high-effort path. The cheap path, used by Remotion Player and visible in Rescript's "playback skips your cuts", drives a master clock and lets DOM/HTML `<video>` elements follow it. For Remake, an HTML `<video>` sequence plus DOM/CSS overlays is the lowest-effort preview.

### Cited Findings
- **OpenCut classic**: a `PlaybackManager` keeps `currentTime` in the editor core and advances it from `performance.now()` wall-clock deltas (`playbackStartWallTime`, `playbackStartTime`; `notifySeek`, seek events); a `scene-builder.ts` converts tracks to a node tree (`VideoNode`, `TextNode`, ...), `CanvasRenderer` paints it each frame; video frames are fetched through `services/video-cache` using mediabunny's `Input` + **`CanvasSink`**; a separate `audio-manager.ts` (700 lines) handles audio. Changelog 0.3.0 (2026-04-15): "Playback performance is dramatically better. The editor used to slow to a crawl during playback, and audio would stutter..." — local `opencut-classic/apps/web/src/core/managers/playback-manager.ts`, `services/renderer/scene-builder.ts`, `services/video-cache/service.ts`; [changelog/0.3.0.md](https://github.com/OpenCut-app/OpenCut/blob/main/changelog/0.3.0.md)
- **OpenVideo editor**: `Studio` object from `@openvideo/engine-pixi` held in a Zustand store (`stores/studio-store.ts`: `{studio, selectedClips}`), exposes `studio.getIsPlaying()`, `pause()`, `suspendRendering()`, `exportToJSON()`; PixiJS v8 renders the interactive canvas (drag, resize, rotate). — [stores/studio-store.ts](https://github.com/openvideodev/react-video-editor/blob/main/src/stores/studio-store.ts)
- **Omniclip**: compositor runs in a worker (`context/controllers/compositor/{controller.ts,worker.ts}`) with Pixi; timeline controller separate from video-export controller. — local clone `s/context/controllers/`
- **Remotion Player** (React component, runs the user's React composition in the browser): props `component`, `durationInFrames`, `fps`, `compositionWidth`, `compositionHeight`, `inputProps`, `inFrame/outFrame`, `controls`; ref API `play()/pause()/seekTo(frame)/getCurrentFrame()`; events `frameupdate` (every frame), `timeupdate` (throttled to 250 ms), `seeked`. Media tags cannot play in reverse; `<Html5Audio>` may not play on iOS Safari; syncing outside components "requires special considerations". — [Remotion Player API](https://www.remotion.dev/docs/player/api) (fetched 2026-11-02; summarised by the fetch tool, not read from raw source)
- **Rescript**: README says "Live preview — playback skips your cuts in real time"; timeline has waveform, wordbar with draggable handles, playhead. (Preview skipping logic lives in the component layer; `lib/mediaEngine.ts` is 129 lines. Not read in detail.) — [README](https://github.com/wassgha/rescript/blob/main/README.md)
- **Twick**: `live-player` wraps the Motion-Canvas-derived player (`@twick/player-react`) for preview and `canvas` (fabric.js) for on-canvas selection/transform. — `packages/live-player/package.json`, `packages/canvas/package.json`
- **Diffusion**: `new core.Composition()` is the playback/render surface; the playground wires `controls.ts` (58 lines) to it. Engine internals not available.

### Inferences
- A Remotion-Player-style design (React components + a single frame counter, `<Sequence>`-like start offsets per clip) is the simplest way to keep text overlays, captions, logo and video in sync and to share the *same React components* between preview and any later client-side render. But the Player uses HTML media elements, so it is not frame-exact at cut points; acceptable for a preview.
- For the student demo, a minimal custom player is realistic: one master clock (`requestAnimationFrame` + `performance.now`, same as OpenCut's PlaybackManager), a single hidden/visible `<video>` per main-track clip that is swapped at clip boundaries, an `<audio>` for music, and absolutely-positioned DOM overlays for text/captions/logo. Seeking = set `video.currentTime = trimStart + (t - startTime)`. (This is an inference from the sources, not something I found shipped as-is.)

### Gaps
- Did not read the full Remotion "current time"/sync guide or `@remotion/media` implementation; sync accuracy numbers not verified.
- No measurement of actual A/V drift in HTML-video-based approaches.
- OpenVideo/Pixi frame-accuracy and seek latency unverified (engine source not read).

---

## 4. Export: in-browser (WebCodecs / ffmpeg.wasm / mediabunny) vs server; limits noted in issues

### Takeaway
All modern engines export in-browser via mediabunny/WebCodecs (Chrome/Edge only in practice), and their open issues are dominated by export failures (stuck progress, no audio, hangs). Rescript's export is the only one that is directly ffmpeg-graph-based and it is a ready-made pattern for Remake's server ffmpeg: `keepRanges -> trim/atrim -> concat`.

### Cited Findings
- **OpenCut classic** `services/renderer/scene-exporter.ts` (171 lines): `Output` + `Mp4OutputFormat|WebMOutputFormat` + `CanvasSource` + `AudioBufferSource` from mediabunny; quality presets `QUALITY_LOW..VERY_HIGH`; event-emitter progress/complete/cancelled; audio is mixed into a single `AudioBuffer` first. Open issues in main repo (export-related, checked 2026-11-02): #914 "Video stuck at 5% exporting" (2026-10-18), #915/#912 "Sound export issue" (2026-10), #832 "EXPORT ERROR" (2026-07-09). — local `opencut-classic/.../scene-exporter.ts`; `gh search issues --repo OpenCut-app/OpenCut` (links: [#914](https://github.com/OpenCut-app/OpenCut/issues/914), [#915](https://github.com/OpenCut-app/OpenCut/issues/915), [#832](https://github.com/OpenCut-app/OpenCut/issues/832))
- **OpenVideo editor** `export-modal.tsx`/`use-export.ts`: `Compositor` from `@openvideo/engine-pixi`, WebCodecs, codec list lifted from mediabunny (`avc1.640033` H.264, `hvc1...` H.265, `vp09...` VP9), presets by resolution/bitrate/fps; requires a "webcodecs-unsupported" modal fallback. README: "zero server rendering costs". Old issue #6 (2024) "Download/export to mp4 isn't working"; #29 (2025-11) licence/pricing clarification for SaaS. — [export-modal.tsx](https://github.com/openvideodev/react-video-editor/blob/main/src/components/editor/export-modal.tsx), [issues](https://github.com/openvideodev/react-video-editor/issues)
- **Twick**: two paths — browser (`@twick/browser-render`, mediabunny + mp4-wasm + mp4box, plus ffmpeg.wasm for audio muxing; README says browser MP4 export needs WebCodecs and "Firefox / Safari are not supported") and server (`@twick/render-server`, headless Motion-Canvas-style renderer with `@twick/ffmpeg`). Open issue #248 (2026-09-18): "Audio muxing hangs indefinitely in muxAudioVideo (@twick/browser-render) — audio buffer reads 0 byte". — [README](https://github.com/ncounterspecialist/twick/blob/main/README.md), [issue #248](https://github.com/ncounterspecialist/twick/issues/248)
- **Omniclip**: `video-export/parts/encoder.ts` uses WebCodecs `VideoEncoder/AudioEncoder`; `helpers/FFmpegHelper/helper.ts` uses ffmpeg.wasm (needs SharedArrayBuffer via `coi-serviceworker`). Issues: #28 "Save Video button does not work after exporting (Brave Browser Shields off)", #20 animated GIF missing in preview and export, #11 WebKit support. — local `s/context/controllers/video-export/`; [issues](https://github.com/omni-media/omniclip/issues)
- **Remotion web-renderer**: `renderMediaOnWeb()`; "Encodes with WebCodecs using Mediabunny instead of FFmpeg"; "Limited to a subset of tags and CSS properties"; API marked stable from v4.0.491. Limits listed in docs: CSS `perspective`, `transform-style`, `object-position`, `writing-mode` unsupported; only linear-gradient backgrounds; text supported incl. stroke/shadow. Editor Starter docs: default render is **Remotion Lambda**; client-side render is a flag (`ENABLE_CLIENT_SIDE_RENDERING`); tradeoffs listed: user can't leave the page, WebCodecs required, page may be less responsive, fewer codecs (no ProRes), output is a temporary blob URL. — [web-renderer index](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/web-renderer/index.mdx), [limitations](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/client-side-rendering/limitations.mdx), [editor-starter/client-side-rendering.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/client-side-rendering.mdx)
- **Diffusion Studio**: `new core.Encoder(composition,{video:{fps}})`, `encoder.render(fileHandle)` with `showSaveFilePicker` (Chromium File System Access API), progress callback; watermark unless licensed. — [playground/render.ts](https://github.com/diffusionstudio/core/blob/main/playground/render.ts)
- **Revideo**: server export via `@revideo/ffmpeg` exporter that streams frame images into ffmpeg; open issue #401 (2026-07-28) "No way to control audio/video encode quality (bitrate, CRF) in FFmpeg exporter"; #345 exporter should fail on empty video; #279 gradients pixelated when exporting with wasm. — [revideo issues](https://github.com/midrender/revideo/issues)
- **Rescript export (most relevant to Remake)** `lib/exportArgs.ts` (383 lines) builds an ffmpeg command: keep only `keepRanges` and concatenate:
  ```
  [0:v]trim=start=${s}:end=${e},setpts=PTS-STARTPTS[v${i}]
  [0:a]atrim=start=${s}:end=${e},asetpts=PTS-STARTPTS[a${i}]
  ...${labels}concat=n=${keepRanges.length}:v=1:a=1 ...  -c:v libx264 -preset ultrafast -crf 22
  ```
  Comments note the wasm core is single-threaded and memory-bound so it uses `ultrafast`; desktop can use `h264_videotoolbox`. Has unit tests (`tests/export-args-test.ts`). Also exports SRT/VTT/JSON, and NLE timelines (Resolve/Premiere XML, FCPXML, AAF, Reaper). — [lib/exportArgs.ts](https://github.com/wassgha/rescript/blob/main/lib/exportArgs.ts)

### Inferences
- In-browser export is gated by WebCodecs support (Chrome/Edge) and shows recurring failure modes in the issue trackers (stuck progress, missing audio mux). With Remake's existing FastAPI+ffmpeg pipeline, server export removes that whole class of problems, at the cost of upload/download time and server CPU. This inference is supported by the issue lists above, not by a benchmark.
- Rescript's `exportArgs.ts` demonstrates that a flat "EDL -> one filter_complex" translation is enough for trim/split/concat; text and logo fit into the same graph with `drawtext`/`overlay`, and music with `amix`/`volume` (standard ffmpeg features, not verified in these repos).

### Gaps
- No quantitative export speed numbers (fps, minutes per minute of video) were found in issues or docs for any project; "speed/limits" is therefore qualitative only.
- Did not verify Twick's server renderer being ffmpeg-timeline-based vs frame-capture-based (assumed Motion-Canvas-style frame render; not read).
- Remotion Lambda cost/speed not looked at (irrelevant to Remake's ffmpeg backend).

---

## 5. Captions / text: editing, styling, word-level timing

### Takeaway
Only three codebases treat per-word timing as first-class: Rescript (word list with delete/drag-timing), Remotion (`Caption` token + `createTikTokStyleCaptions` pages, editable per token in Editor Starter) and OpenVideo (word chunks with `isKeyWord`). OpenCut classic and Twick downgrade whisper output to chunk-level text elements. Remake already has whisper.cpp word timestamps, so the Remotion `Caption` shape and the "pages" algorithm are the right target format.

### Cited Findings
- **Remotion `Caption`** type: `{ text:string (whitespace-sensitive, leading space per word), startMs, endMs, timestampMs:number|null (t_dtw with whisper.cpp), confidence:number|null, pageBreakAfter?:boolean }`. `createTikTokStyleCaptions({captions, combineTokensWithinMilliseconds})` returns `pages:[{text, startMs, durationMs, tokens:[{text, fromMs, toMs}]}]`; works in browser, Node and Bun. Helpers: `parseSrt`, `parseVtt`, `serializeSrt`; transcribers: `@remotion/install-whisper-cpp` (Node server), `@remotion/openai-whisper`, `@remotion/elevenlabs`, `@remotion/whisper-webgpu` (browser). — [captions/caption.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/captions/caption.mdx), [create-tiktok-style-captions.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/captions/create-tiktok-style-captions.mdx)
- **Remotion Editor Starter captions**: first-class `CaptionsItem` on the timeline; "Generate Captions" extracts audio client-side, POSTs to `/api/captions`, OpenAI Whisper API (25 MB limit, about 13.4 min mono at 16 kHz); inspector edits individual tokens, font, text colour, highlight-word colour, opacity, stroke, page duration, and individual word timings; auto page split via `createTikTokStyleCaptions`. — [editor-starter/captioning.mdx](https://github.com/remotion-dev/remotion/blob/main/packages/docs/docs/editor-starter/captioning.mdx)
- **OpenVideo editor**: `lib/caption-generator.ts` (144 lines) `generateCaptionClips({videoWidth, videoHeight, words, fontSize=80, fontFamily, mode:"single"|"multiple", style})`: mode "single" = one chunk per word (word pop), else `groupWordsByWidth(words, 0.8*videoWidth, fontSize, fontFamily, maxLines)` (canvas `measureText` to wrap); each chunk has `words:[{text, from, to, isKeyWord, paragraphIndex}]` so the active word can be highlighted. Transcription via Deepgram (`lib/transcribe/deepgram-to-combo.ts`). — [lib/caption-generator.ts](https://github.com/openvideodev/react-video-editor/blob/main/src/lib/caption-generator.ts)
- **OpenCut classic**: in-browser Whisper (transformers.js worker, `pipeline("automatic-speech-recognition", modelId, ...)` with `return_timestamps: true`, `chunk_length_s`; model choices whisper-tiny/small/medium/large-v3-turbo). Returned timestamps are **segment/chunk level**; `transcription/caption.ts` (49 lines, `buildCaptionChunks`) splits each segment into N-word chunks (`DEFAULT_WORDS_PER_CAPTION`) and interpolates time evenly by word count — not true word timing. Each chunk becomes a normal `TextElement` via `subtitles/build-subtitle-text-element.ts`; also SRT/ASS import (`subtitles/{srt,ass,parse}.ts`). Style overrides: `SubtitleStyleOverrides {fontSize, fontFamily, color, background, textAlign, fontWeight, ...}`. — local `opencut-classic/apps/web/src/{transcription,subtitles,services/transcription}/`
- **Rescript**: whisper `*_timestamped` ONNX models give per-word timestamps; UI shows words as editable text; delete = cut; "drag a word's edges when ASR alignment is off"; filler-word removal (`lib/fillers.ts`, `disfluencies.ts`), silence removal (`silences.ts`, VAD `vad.ts`, >= 0.3 s), forced alignment (`forcedAlign.ts`, `align.ts`), hallucination filter (`hallucinations.ts`), diarization, import SRT/VTT/JSON (`parseTranscript.ts`), serialise (`serializeTranscript.ts`). — [README](https://github.com/wassgha/rescript/blob/main/README.md), `lib/` listing
- **Diffusion Studio**: `CaptionClip(source)` over `CaptionSource` JSON — sample `public/captions.json` is `[{ text, words:[{text,start,end}] }]` (seconds); `audioClip.removeSilences()` exists; "createCaptions() from transcript" (v2->v3 migration docs). — [playground/composition.ts](https://github.com/diffusionstudio/core/blob/main/playground/composition.ts), `public/captions.json`
- **Twick**: AI caption generation uses Google Vertex AI (Gemini) per README, producing timed caption tracks (segment level via `CaptionElement(t, start, end)`). — [README](https://github.com/ncounterspecialist/twick/blob/main/README.md)

### Inferences
- A single normalised caption format `[{text, startMs, endMs}]` (Remotion `Caption`) maps directly from whisper.cpp `-ojf`/word output; grouping into 1–2 line "pages" is ~100 lines (OpenVideo's `groupWordsByWidth` or Remotion's `createTikTokStyleCaptions`, MIT-style logic that can be re-implemented).
- Caption *editing* for a student demo = edit token text + drag/nudge word start/end + choose style preset (font, colour, highlight colour, position). That is exactly what Remotion Editor Starter's inspector exposes; no source needed to copy the feature list.
- Burning in on the server: the existing ffmpeg/whisper.cpp pipeline can render captions as ASS (karaoke `\k` tags or per-page events) or drawtext; OpenCut's `subtitles/ass.ts` parser is evidence ASS is a workable interchange. Whether the existing Remake pipeline already outputs ASS is unknown to me.

### Gaps
- Did not read Remotion Editor Starter's caption inspector source (private).
- OpenVideo caption styling presets ("Modern", etc.) definition not read.
- Whether OpenCut classic's Whisper chunks ever expose word-level timestamps (`return_timestamps: "word"`) — the code uses `true` (segment level); I did not test.

---

## 6. Effort / complexity signals (LOC, open issues, bugs)

### Takeaway
Real, working editors are 30k–45k lines of TS for the "lean" ones (Rescript 30k, Omniclip 45k, Twick 46k, OpenVideo editor 44k plus a closed engine) and 460k–530k lines for the full NLEs (FreeCut, OpenReel). A student build must target roughly 3–6k lines.

### Cited Findings (counts from local `wc -l` on `.ts/.tsx/.rs`, excluding node_modules; approximate)
| Project | Stars / open issues (2026-11-02) | Last push | TS lines | Notes |
|---|---|---|---|---|
| OpenCut main | 97,117 / 386 | 2026-09-24 | ~8.3k | rewrite shell, no editor engine |
| opencut-classic | 293 / 0 listed (issues live in main) | 2026-05-17 | ~91k web src + 4.3k Rust | includes site/blog code |
| openvideodev/react-video-editor | 1,829 / 21 | 2026-06-30 | ~44.5k | engine closed/npm |
| Twick | 546 / 11 | 2026-06-04 | ~45.6k | 18 packages |
| Omniclip | 1,468 / 25 | 2026-10-31 (clone: 2025-08) | ~45.1k | web-components, Pixi 7 |
| Rescript | 1,023 / n/a | 2026-10-29 | ~30.5k | + Electron |
| Diffusion core | 1,252 / 7 | 2025-11-18 | engine not in repo | playground 450 lines |
| Revideo | 4,165 / 63 | 2026-07-15 | ~45.5k | code-based, not an editor |
| FreeCut | 2,304 / 12 | 2026-10-29 | ~530k | pro NLE |
| OpenReel | 5,553 / 26 | 2026-10-17 | ~460k | pro NLE |
| Remotion | 69,901 / 190 | 2026-11-02 | (4.4 GB repo) | engine/library, not an editor |

Source: `gh api repos/<repo>` (stars, open_issues_count incl. PRs, pushed_at), local line counts.
- Key size anchors inside projects: OpenCut classic `timeline-manager.ts` 935 lines, `audio-manager.ts` 700, `playback-manager.ts` 257, `scene-exporter.ts` 171, `transcription/caption.ts` 49; Rescript `edits.ts` 572, `exportArgs.ts` 383, `ffmpeg.ts` 500, `store.ts` 1,089; OpenVideo `caption-generator.ts` 144.
- Issue themes seen: export stuck / no audio (OpenCut, Twick, Omniclip), browser support (Omniclip #11 WebKit; Twick: Chrome/Edge only), project liveness questions (OpenVideo #5 "Is this project active?", 2024), quality controls missing in ffmpeg exporter (Revideo #401). OpenCut's own changelog admits earlier playback "slow to a crawl" (fixed in 0.3.0).

### Inferences
- The Rescript pipeline (a word list, derived keep-ranges and one ffmpeg graph; 30k lines mostly UI/Electron/i18n) is the closest-in-scope project; its *core logic* (edits.ts + exportArgs.ts + serializeTimeline.ts) is under 1.5k lines.
- Star counts are not a quality signal (OpenCut main has 97k stars but no editor code in the repo now).

### Gaps
- Line counts are rough (`wc -l` over all TS in the tree; includes generated/test/site code in some). Open issue counts include PRs (GitHub API `open_issues_count`).
- No reliable crash/performance-bug rate metric; only sampled issue titles.

---

## 7. What can be copied or run as-is in React 19 + Vite, and what must adapt to the ffmpeg backend

### Takeaway
Nothing here is a drop-in for "React 19 + Vite + FastAPI ffmpeg", because every full editor assumes its own renderer. The pieces that transplant are: the **data model + split/trim logic** (OpenCut classic / Rescript), the **word-edit -> keep-ranges -> ffmpeg graph** pattern (Rescript), the **Caption format + page grouping** (Remotion `@remotion/captions`, installable as an npm package), and optionally **Remotion Player** for preview.

### Cited Findings
- **Directly installable, framework-agnostic**: `@remotion/captions` (Caption type, `createTikTokStyleCaptions`, `parseSrt`, `serializeSrt`; "safe to use in the browser, Node.js and Bun"). `@remotion/player` is a React component that works in any React app (examples use React Router; Vite fine) — Remotion licence terms for companies exist (not verified for students; not needed per the brief). — [captions docs](https://www.remotion.dev/docs/captions), [Player docs](https://www.remotion.dev/docs/player/api)
- **Vite compatibility**: OpenCut classic (Next 16), Rescript (Next 16, static export via `STATIC_EXPORT=1`), OpenVideo editor (Next 16) are Next apps — their UI components import `next/*` in places and need porting; OpenCut main's new web shell is TanStack Start/Vite 8 but empty; FreeCut is Vite + TanStack Router (`tsr.config.json`, `vite.config.ts`) with React 19.2 — the only large Vite+React19 editor found. Twick packages are libraries (`@twick/studio` peer `react ^18 || ^19`) and can be dropped into Vite, but they bring a fabric+Motion-Canvas-derived player and their render path is not ffmpeg-timeline-based (see Gaps).
- **Needs headers**: ffmpeg.wasm multi-thread, Diffusion Studio require COOP/COEP (`Cross-Origin-Embedder-Policy: credentialless`) — extra Vite dev-server config; unnecessary if export is server-side.
- **ffmpeg-backend adaptation points** (what Remake's server must accept): a serialised project JSON (tracks, elements with `src`, `startTime`, `trimStart/trimEnd`, text overlays with style, captions with words, music with volume, logo with position/size) and a function that emits a `filter_complex`. Rescript's `exportArgs.ts` is the template for the video/audio trim+concat part.
- **Licence notes that affect access, not legality**: OpenVideo editor LICENSE is a two-tier custom licence (free for individuals/small companies); Twick uses "Sustainable Use License v1.0" (personal/educational/research/commercial allowed; hosting as a service without agreement restricted); Rescript PolyForm-Noncommercial-1.0.0; Remotion Editor Starter $600; Diffusion Studio engine free with watermark; OpenCut, Revideo, FreeCut, OpenReel, Omniclip: MIT (Omniclip package.json says ISC, repo badge MIT — minor conflict). Per the brief licence does not matter; listed only so the team knows which sources are readable.

### Inferences
- Most efficient reuse is *conceptual* copying of small, well-understood modules, not vendoring an editor.
- Preview/export parity is the main hidden risk: whichever engine draws the preview (browser fonts, canvas text layout) will not match ffmpeg `drawtext`/ASS output pixel-for-pixel. Mitigation (inference): use the same font files and the same normalised coordinates (percent of frame, font size relative to frame height — OpenCut's ASS import does exactly this with `fontSizeRatioOfPlayHeight`) in both preview and backend.

### Gaps
- Did not test running any of these projects (instructions forbid executing their code).
- Remotion Player's licence status for a student project not checked; npm package pinning and React 19 compatibility not verified beyond the docs' use of React 19 in Editor Starter.
- Did not verify how Twick's server renderer (Motion-Canvas-derived) would map to a pre-existing ffmpeg pipeline.

---

## 8. Recommended "learn from X, copy Y, build Z" plan (2–4 weeks)

### Takeaway
Build a **lean custom editor** around a single JSON "EDL" that the existing FastAPI/ffmpeg pipeline renders; use HTML `<video>` + DOM overlays (or optionally the Remotion Player) for preview. Do not adopt a full NLE.

### Cited Findings
(Plan elements are recommendations; underlying evidence is in Q1–Q7.)

**Learn from (read, don't vendor):**
- **OpenCut classic** `timeline/types.ts` + `core/managers/{timeline,playback}-manager.ts` — track/element model, split/trim semantics, master-clock playback, command-based undo (`core/managers/commands.ts`, 154 lines).
- **Remotion Editor Starter docs** (tracks/items/assets; state-management; captioning) — state split between undoable (`tracks`, `items`, `assets`, `fps`, size) and UI state; caption inspector feature list; non-overlapping items per track rule.
- **Rescript** — `lib/edits.ts`, `lib/exportArgs.ts`, `lib/serializeTimeline.ts`, `lib/silences.ts` — word-based cutting and the ffmpeg graph.

**Copy (small modules, adapt to TypeScript/Vite):**
1. Remotion `Caption` shape and `createTikTokStyleCaptions` (`npm i @remotion/captions`, or re-implement ~100 lines) — whisper.cpp word timestamps -> pages with per-word tokens.
2. Rescript `getWordCutRanges` / `mergeCutRanges` and the `trim=...,setpts=PTS-STARTPTS` + `atrim` + `concat` filter generation — port to Python on the FastAPI side (or keep as TS and send final `keepRanges` to the server).
3. OpenCut classic `ElementRef`, `SceneTracks { overlay, main, audio }`, `startTime/duration/trimStart/trimEnd` element base, `getVisibleSortedElements` ordering rule.
4. OpenVideo `groupWordsByWidth` idea (canvas `measureText` word-wrap at 80% width; `isKeyWord` for highlighted active word).
5. Optional: Remotion `<Player>` for preview, if the team is comfortable writing overlays as React components with frame-based timing.

**Build (the Remake-specific part):**
- Week 1: Project JSON schema (zod) with `mainTrack: Clip[]` (src, trimStart, trimEnd), `overlays: Text[]`, `captions: {words[], style}`, `music: {src, volume, startTime}`, `logo: {src, x, y, scale}`; Zustand store + undo (snapshot or command stack); preview player (master clock + `<video>` swap + DOM overlays); wire to existing upload/asset URLs.
- Week 2: timeline UI (single main lane + overlay lanes, drag/trim handles, split at playhead, snap), text overlay inspector (text, font, colour, position, start/end), keep it DOM/CSS (no canvas).
- Week 3: caption panel (word list, edit text, nudge word timings, style presets, page grouping from `@remotion/captions`), optional "delete word -> cut" (Rescript logic), music + logo controls; FastAPI endpoint `POST /render` that accepts the project JSON and builds the ffmpeg graph (trim/concat, `overlay` logo, `amix` music, captions burned via ASS or drawtext), with progress polling.
- Week 4: preview/export parity pass (shared fonts, normalised coordinates), error states, tests on the graph generator (Rescript has `export-args-test.ts` as a model), demo script. Stretch: client-side export with mediabunny only if server export is a blocker.

### Inferences
- Risk ranking: (1) preview/export visual mismatch for text/captions, (2) timeline drag/trim UX polish (largest UI time sink), (3) ffmpeg graph correctness for variable-frame-rate sources and audio sync after trims (Rescript uses `setpts/asetpts` resets and a minimum clip length constant, 0.05 s, for this reason).
- If time shrinks to 2 weeks: drop the free-form timeline; use a clip list (reorder, trim handles, split), text overlays, caption editor, music/logo toggles, server render. That covers every required feature of the brief.

### Gaps
- Effort estimates are judgement, not measured; team size and React/ffmpeg familiarity unknown.
- The existing Remake backend's current ffmpeg command structure and caption burn-in method (ASS vs drawtext) were not inspected (outside scope).
