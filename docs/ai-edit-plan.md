# AI auto-edit plan (editor only)

Date: 2026-11-12. Branch: `feat/editor-real-footage` (from origin/main 2c069a8).
Research behind it: `research/reports/AI 短影音自動剪輯調查.md`.

## Scope

- Change only the editor (`src/components/editor/*`, `EditorPanel`, `ExportBar`, `src/remotion/*`, editor styles) and the backend it needs.
- Do NOT touch the freeform Canvas (`src/components/canvas/*`), the planning board (`src/components/board/*`), Plan page layout, or AI generation code. No generation on/off switch.
- Real footage only. AI suggests, a person accepts; every AI edit can be undone.
- Paid LLM calls: fake adapter in tests; one live smoke run under US$1 only if a key is already configured.

## Phases

| Phase | Editor (frontend) | Backend |
|---|---|---|
| 0 Foundation | Upload per shot inside the editor (multi-file, drag and drop); clip setting Fit / Fill (blurred background); hide "Send to {manager}" in the export popover | Transcode HEVC/HDR/odd containers to an H.264 proxy on upload; Reel renders `fit` with blurred fill |
| 1 Media understanding | Per-clip analysis status | On upload, background job: whisper-cli word timestamps, silence map (ffmpeg silencedetect), shot cuts (ffmpeg scdet), loudness, filmstrip thumbnails; stored in SQLite |
| 2 AI edit suggestions | "AI suggestions" tab: captions from speech, clean-cut list (silence / filler / retake, padding slider), script alignment (in/out, missing line), take ranking (top 3) | Endpoints for the four features |
| 3 Auto first cut | "Auto first cut" button with a reason per cut; export platform presets, safe-zone warnings, EDL download | Assemble first cut, music ducking under speech, loudness normalise to -14 LUFS, EDL/OTIO export |
| 4 LLM + agency | Hook check, caption rewrite, title + hashtags; client timed comments turned into edit tasks in the editor | LLM adapter (Claude), fake in tests |

## Rules for each phase

1. Worker implements; lead reads the diff.
2. `bash bin/verify.sh full` GREEN, plus a 1440 browser pass on the isolated backend.
3. Commit, push the branch, keep one PR open against main. Never merge.
4. Red verify or two failures in a row: stop and record the blocker in `docs/STATUS.md`.
