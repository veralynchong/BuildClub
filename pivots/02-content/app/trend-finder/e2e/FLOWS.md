# User flows

<!-- The agent reads this file to know what to test. Keep each flow short and in plain language.
     Persona agents must NOT be given this file or the source code: only the persona block and the URL. -->
<!-- Written 2026-11-03 for the node canvas P1–P4 (PRs #28–#32), mock models only.
     Corrected 2026-11-03: Annie is the agency's approver (owner), not the client; the first persona runs used the wrong framing. -->

## Site
- URL (local): http://127.0.0.1:8871/ (review link: http://127.0.0.1:8871/review/<token>)
- URL (production): none for this test. Never use ports 8811, 8805 or 8850 (client demo and its tunnel).
- Start command (from the repo root, needs `npm run build` in this app first):
  `REMOTION_PORT=8872 bash bin/isolated-backend.sh 8871 --demo-data --user test@example.com:pw-for-e2e`
  No .env, every budget is 0, so only the mock models run. Nothing can spend money.
- Login: "Log in" on the landing page → `test@example.com` / `pw-for-e2e` → "Log in →". The role defaults to Manager.
- Viewport: 1440 x 900, desktop only.
- Language: English (the default). Leave it as is.

## Test entry points
- `#fail` anywhere in a generate prompt makes the mock fail ("The mock video failed. Try again.").
- `MOCK_GEN_DELAY_S` (env, default 2 s): how long a mock image or video takes.
- Seed helpers in `e2e/lib.cjs`: `login`, `seed` (client "Evergreen Foods" plus approved plan `idea1` with three shots), `uploadTake`, `uploadVoice`. They need `PW_CORE` set to a playwright-core path.
- Review link: the client's Plans board has "Get link" in the Waiting column (added 2026-11-03, fix B1). To skip the UI, `POST /api/share {"clientId":"evergreen"}` while logged in; the reply has `url`.
- Media fixtures: `bash e2e/make-fixtures.sh <dir>` (ffmpeg and macOS `say`). It makes these files:
  - `clip-1.mp4` … `clip-9.mp4`: 8 s, tone only.
  - `speech-sdr.mp4` and `speech-hevc.mov`: English speech with "um" and a 1.5 s pause. Use them for Clean up.
  - `zh-tw.wav`: Mandarin audio for the voiceover.
  - `ref.png`: a logo.
- No `?test` URL params exist.

## Starting state
- F1 starts from an empty account: the `--demo-data` sample clients only, no plans.
- F2–F4 start from the `seed` state, so a stuck point in F1 does not block them.
  - F3 and F4 also have takes `clip-1..3.mp4` uploaded, one per shot.
  - F4 also has a review link.

## Flows
<!-- Ordered from simplest to most complex. All are layer "explore": goal-only agent runs, not a merge gate. -->

### F1 Idea to a generated storyboard and video (mock)
- Goal: As a manager, turn a trending video idea into an approved plan, then make a storyboard image and a short video for one shot.
- Steps:
  1. Find ideas: search `tofu`. Only sample tofu videos exist.
  2. Open a video → "Save to Research" → "Open Research".
  3. Set the row status to "★ Picked" → open the plan ("Still planning").
  4. If the plan has no shots: "From script" → paste a short script → "Make shot list" → "Use these shots". The result is sample shots, because the AI is off.
  5. "Send for approval" → "Approve" → "Open the canvas".
  6. On a Storyboard node, pick "Mock image (free)" → "Generate".
  7. Add a Video node, pick "Mock video (free)" → "Generate".
  8. Optional: connect the storyboard "Output" to the video "Start frame" → "Run the whole shot" → check that the price dialog shows "Total ≈ US$0.00" → "Confirm".
  9. Then try a prompt with `#fail` and check the error and the retry.
- Success check: the storyboard node shows an image, and the video node shows a playable 4 s or 6 s clip. The `#fail` run shows a readable error, and the node can be run again.
- Layer: explore

### F2 Upload takes and clean up
- Goal: As a manager, add real footage for a shot, choose the best take, and cut its pauses and fillers.
- Steps:
  1. Start from `seed` and open the canvas.
  2. On a shot's "+", add a "Footage" node → "Add take" with `speech-sdr.mp4`, then `clip-1.mp4`.
  3. "Use this take" on one of them.
  4. "Clean up" on `speech-sdr.mp4`.
  5. Delete a take ("Delete this take?" → "Delete").
- Success check:
  - Both takes are listed with name and size, and the chosen one has the "Chosen" badge.
  - Clean up shows "Cut N s of pauses and fillers." and adds a "Cleaned" take, which becomes chosen. The original stays.
  - `clip-1.mp4` (no speech) gives a readable reason instead of a crash.
- Layer: explore

### F3 Edit the video
- Goal: As a manager, assemble the shots into a video with text, captions, music, a voiceover and the client's logo.
- Steps:
  1. Start from `seed` with takes, open the canvas → the "Timeline" switch.
  2. Clips tab: "Fill in shot order", "Split at playhead", "Move earlier/later", "Delete clip", mute and volume. Trimming is a drag on the clip edges.
  3. Text tab: "Add text at the playhead", then change the words, times, position and colour.
  4. Captions tab: turn on "Show captions in the video".
  5. Music tab: tick the licence box, choose a music file (any `.wav` fixture), set the volume.
  6. Voiceover tab:
     - "Upload audio" with `zh-tw.wav`.
     - Also try the AI voice "Mock voice (free)" → "See the price" → "Make the voice".
     - Do not use "Record": no microphone.
  7. Brand tab: "Upload a logo" with `ref.png` → "Show the logo in the video", then pick a brand colour.
- Success check: the preview plays and shows the text, captions and logo. The timeline order and lengths match what was set. Nothing is lost after reloading the page.
- Layer: explore

### F4 Export, send for approval, approver approves
- Goal: The team member exports the video and sends it to the agency's approver (Annie, the agency owner). Annie approves it, or sends it back, from the review link without logging in. The team then sees the decision.
- Steps:
  1. Start from `seed` with takes and a review link. The "Timeline" switch → "Fill in shot order" → "Export the video". This takes about 20 s.
  2. "Send to … for approval". The panel should show "Waiting for …'s approval".
  3. In a new browser context with no cookies, open the review link. Play the video → "Approve".
  4. Run 2: "Send back" with a reason instead of approving.
  5. Back as the manager, reopen the editor's export panel.
- Success check:
  - The review page works without logging in, and the video plays.
  - After the decision, the page says "Approved the video: …" (or "Sent back the video: …").
  - The manager sees "… approved this video · <when>" (or "sent this back", with the reason).
- Layer: explore

## Known gaps (do not report again as new)
- The review page is English only.
- Voiceover "Record" needs a microphone; the test machine has none that works.
- Whisper writes Simplified Chinese captions for Mandarin. The user chose to keep this for now.

## Personas
<!-- Used only for persona walkthroughs (layer 4). Give the agent only one block below plus the start URL,
     never the Flows section or the code. 3 runs per persona; keep findings that repeat, as hypotheses. -->

### P1 Daphne, first-time manager making a video
- Who: Account manager at a small social-media agency in Sydney. Comfortable with Instagram and Canva, never used a node canvas or a video editor timeline. Laptop, Chrome, 1440 wide, interface in English.
- Start: logged in on the client dashboard. Client "Evergreen Foods" has an approved plan with three shots. Each shot already has one filmed take.
- Goal: Make a short video for Evergreen Foods from the approved plan, with captions and the client's logo, and send it to Annie, the agency owner, for approval.
- Patience: gives up after 15 steps without visible progress toward the goal.

### P2 Annie, agency owner approving a video
- Who: Owner of the agency (the buyer, per `docs/client-workspace-nav.md`), who signs off every plan and finished video before it goes to the client. The default approver name in the app is "Annie" (`src/state.ts`). Busy, opens links between meetings. Has no account in the tool and won't make one. Laptop, Chrome, English.
- Start: the review link her team messaged her (http://127.0.0.1:8871/review/<token>), with one finished video for client Evergreen Foods waiting.
- Goal: Watch the video and either approve it, or send it back with one sentence about what to change.
- Patience: gives up after 5 steps.
