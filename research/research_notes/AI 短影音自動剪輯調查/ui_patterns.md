# UI/UX patterns of AI-assisted video editors and storyboard-to-video tools (as of 2026-11-11)

Scope: how leading products lay out editing UI and AI features, for a small team designing a web editor for marketing agencies (script -> storyboard cards -> upload real clips per shot -> trim/order/captions/music -> 9:16 MP4 -> client approval link). AI footage generation is out of scope.

Method note: help-center pages were fetched directly where possible. Adobe helpx pages returned HTTP 403 to the fetcher, so Premiere facts come from search-result summaries and are marked as lower confidence. YouTube pages only returned titles (no upload dates or view counts), so all video dates below are "unverified". Many third-party review sites are low quality and are flagged where used.

## 1. Main editing paradigms and who uses which (with pros/cons for marketers)

### Takeaway
Products converge on a hybrid: one primary surface (text script, scene cards, or clip list) plus a secondary multi-track timeline for fine timing. Descript, OpusClip, and Premiere all put a transcript beside or above the timeline; Descript additionally has a scene/storyboard tile view; CapCut templates and Captions' AI Edit are the "one-click, template-driven" end.

### Cited Findings
- Descript's editor has three work areas plus a sidebar: Script editor (write/edit transcript "like a document", text-based editing), Scene editor (visual preview where you resize/move/arrange elements), and Timeline (traditional view with waveforms to trim, split, move clips). Sidebar tabs: Project, Scene, Layer, Elements, Media, AI Tools, Underlord (AI co-editor). — [Descript: The editor interface](https://help.descript.com/hc/en-us/articles/37585546799757-The-editor-interface) (overview screenshot: https://mintcdn.com/descript-5bf56f3f/x_o3AVZ-HKjw1TIM/images/external/descript-37585546795789-19962a2c84.png)
- Descript "scenes" = a segment of video with its own layout, footage and layers. Scene starts are marked by thumbnails in the script panel; each scene is a segment in the timeline; a Storyboard view shows scenes as tiles. Scenes are added by typing "/" in the script, right-click > Add scene, or Split in the timeline toolbar; reordered by dragging in the script; transitions and layers can span scenes. — [Descript: Scenes overview](https://help.descript.com/getting-started/scenes.md) (screenshot: https://mintcdn.com/descript-5bf56f3f/x_o3AVZ-HKjw1TIM/images/external/descript-37656774158989-3df7aedf7c.png)
- Descript Storyboard view is described as a visual grid of all scenes that replaced the older "Scene Rail"; click a tile and drag to reorder, right-click a tile > Change layout; View menu toggles between full layer timeline and scene thumbnail layout. — [Descript search summary of help pages](https://help.descript.com/getting-started/scenes) and [Manage the editor layout with the View menu](https://help.descript.com/hc/en-us/articles/37508206076429-Manage-the-editor-layout-with-the-View-menu); product page: [Descript Storyboard](https://www.descript.com/storyboard) (search-snippet only, not fetched)
- Descript editing is non-destructive: deleted media stays hidden and can be restored via "Restore removed media" on the edit boundary. — [Descript: Filler words](https://help.descript.com/hc/en-us/articles/10164806394509-Filler-words)
- Premiere Pro text-based editing: transcribe a clip in the Text panel; deleting text removes the clip segment from the sequence with automatic ripple edit; filler words and pauses can be detected and bulk-deleted from the Transcript panel; users switch to the timeline for precision. Third-party/forum-derived, Adobe page itself returned 403. — [Adobe: text-based editing](https://helpx.adobe.com/premiere-pro/using/video/text-based-editing-video.html), [Adobe: add clips to timeline using text-based editing (three-point edits)](https://helpx.adobe.com/dk/premiere/desktop/edit-projects/edit-video-using-text-based-editing/add-clips-to-the-timeline-using-text-based-editing.html), [RedShark overview](https://www.redsharknews.com/all-you-need-to-know-about-adobe-premiere-pros-text-based-editing?hs_amp=true)
- Premiere text-based editing reliability complaints from users (transcript edits not committing; captions reset to placeholder when transcript edited, around Dec 2025; lag on long sequences). Forum anecdotes, not vendor-confirmed. — [Adobe community: transcript not accepting edits](https://community.adobe.com/t5/premiere-pro-bugs/transcript-not-accepting-edits/idc-p/15212034)
- OpusClip editor combines a transcript (select text, Delete to trim) with a timeline editor (drag segment ends; drag sections to reorder). Results page lists clips with a Virality Score (0-99), sorted high to low, with Grid/List view toggle. — [Opus: Change captions](https://help.opus.pro/docs/article/change-captions.md), [Opus: Rearrange scenes in timeline](https://help.opus.pro/docs/article/can-i-drag-rearrange-sections-timeline.md), [Opus: Virality score](https://help.opus.pro/docs/article/virality-score.md)
- Canva's video editor: scenes (clips) arranged on a bottom timeline; click a scene and drag its edge to change duration; trim/split/rearrange with waveforms; "Magic Video" turns a prompt plus 1-10 uploaded clips/photos into a multi-scene vertical video. Canva states the new editor was rolling out gradually. Details are from Canva help-mirror pages and third-party summaries. — [Canva help: creating and editing videos](https://www.canva.com/help/creating-and-editing-videos/), [Canva AI video editor](https://www.canva.com/video-editor/ai/)
- CapCut: template-driven path. A template has numbered "replaceable clip" slots; user fills slots with own media (batch replace available), filters/motion graphics/audio stay locked unless the creator enables them. Creator-side setup on Web: Share > template > "Set Replaceable Clips" panel; feature on Mobile and Web since Dec 2025; Desktop cannot create them (article dated 2026-01-12). — [CapCut help: Set replaceable clips](https://www.capcut.com/help/how-to-set-replaceable-material-clips)
- Captions (Mirage) is the one-click "AI Edit" end: AI Edit V3 rebuilt Jan 2026; 2026 additions include style picker (Prism, Evo, Focus, etc.), Multi-clip AI Edit, "Chat to Edit" (Oct 2026), AI Edit projects opening in a web editor where text/images/colors/style can be adjusted (Sept 2026). — [Captions: What's new](https://captions.ai/help/whats-new)
- LTX Studio has a storyboard (scenes split into shots as cards) plus a separate timeline editor (2 video channels, up to 5 audio channels, reorder/split/trim handles/duplicate). It does not accept imported camera footage (images only), exports XML for Premiere. Article dated 2026-01-16. A TechRadar review (older) says moving/deleting shots in the timeline is reflected in the storyboard. — [CineD: LTX Studio next big step: editing](https://www.cined.com/ltx-studio-takes-its-next-big-step-editing/), [TechRadar review](https://www.techradar.com/pro/software-services/ltx-studio-ai-video-production-review)
- Boords (storyboard-first): open a storyboard, click "Animatic" in the top toolbar to see frames in sequence with playback; add an audio file (WAV/MP4, 20 MB limit per help page) and a waveform helps align frames; with audio the animatic length follows the audio; community report that adding frames after syncing audio shifts timings. — [Boords: animatic tool](https://help.boords.com/en/articles/1459425-boords-animatic-tool) (search snippet; page itself 403), [Boords community: timing change](https://community.boords.com/t/animatic-changes-timing-when-adding-new-frames/136)
- VEED: preview player on top, timeline on bottom; auto-subtitles appear as a separate timeline track and can be edited by clicking the text on the preview; "Magic Cut" removes filler words/silences in one click (paid plan per a review). Third-party sources. — [VEED tools page](https://veed.io/tools/video-editor), [SocialRevver VEED tutorial](https://www.socialrevver.com/blog/veed-video-editor-tutorial)
- Kapwing: right-sidebar "Resize project/canvas" with TikTok 1080x1920 preset and Fill-and-crop vs Fit-to-center; Smart Cut removes silences (premium per third party). — [Kapwing resize for TikTok](https://www.kapwing.com/tools/resize/tiktok)

### Pros/cons for non-editor marketers (author's inference from the above; not sourced as such)
- Multi-track timeline (Premiere, CapCut desktop): precise but many tracks, keyframes, jargon.
- Transcript editing (Descript, Premiere, Opus): intuitive for talking-head content because it feels like a doc; weak for B-roll or product footage with no speech, and Premiere's has reported reliability issues (above).
- Scene/storyboard cards (Descript Storyboard, Canva, LTX, Boords): matches how marketers think (a list of shots), easy to reorder; less precise on timing, needs a timeline fallback.
- Template/slot-driven (CapCut templates, Captions AI Edit): fastest, least control; replacements limited to slots.
- Clip-feed/highlight list (Opus): great for repurposing long videos; less suited to a scripted shot-by-shot shoot.

### Inferences
- For the BuildClub flow, the closest existing precedents are (a) Descript's script + Storyboard tiles + timeline trio, and (b) CapCut's numbered slot strip with a media panel and batch replace. A scene-card canvas as the primary surface with a collapsed timeline for fine trimming has support in both LTX (storyboard + timeline) and Descript (tiles + timeline).
- Pros/cons list above is synthesized judgment, not a cited claim.

### Gaps
- No official Canva doc on its scenes-based editor layout was fetched (only search snippets and mirrors).
- No Adobe primary page was readable (403); Premiere details are secondhand.
- No usability research found comparing paradigms for marketers specifically.

## 2. Mapping storyboard shots / script lines to clips

### Takeaway
The dominant patterns are: (1) numbered slot strip with a media panel, click slot then click media (CapCut web templates); (2) scene = unit that owns a visual, with Replace Media preserving edits (Descript, invideo, Pictory); (3) storyboard cards whose order is mirrored in a timeline (LTX, Boords). None of the researched tools has a documented "alternate takes per slot" or "AI auto-match clip to script line" UI for real footage; that appears to be an open gap.

### Cited Findings
- CapCut web template editor: numbered slots along the bottom, assembled preview in center, left panel with media and Upload; select a slot then click a photo and the preview rebuilds; "Batch replace" next to the slot row shows count of replaced clips (example 5 of 6) and imports the rest from computer/phone; cards in template list show clip count, duration, aspect ratio (example 6 clips, 19 s, 9:16). Article dated 2026-08-31, third-party-style CapCut resource article. — [CapCut: web editor template guide](https://www.capcut.com/create/capcut-web-editor-template-guide)
- CapCut replaceable-clips: creator can limit a slot (e.g. maximum duration or image-only); users see "Click to Replace" on Web. Tip: mark only one to three key clips. — [CapCut help](https://www.capcut.com/help/how-to-set-replaceable-material-clips)
- Descript Replace Media: select media layer in Scene Editor, click Replace in the toolbar, pick new media; keeps edits, captions and adjustments already applied; also available from timeline right-click and Properties panel. — [Descript: Replace media](https://help.descript.com/visuals/replace-media.md)
- Descript: scene thumbnails in the script panel mark where each scene begins, tying script text to a visual. — [Descript: Scenes overview](https://help.descript.com/getting-started/scenes.md)
- invideo: replace media by dragging a file onto the existing media on the scene and clicking "Replace" (article dated 2024-05-31, older). — [invideo help](https://help-studio.invideo.io/en/articles/9405226-how-to-replace-an-image-or-video-on-the-scene)
- Pictory: select scene on the Story tab, open Visuals tab to search stock, browse uploads, or AI Studio; API treats each scene as having one background element identified by start time. — [Pictory help](https://help.pictory.ai/portal/en/kb/articles/adjusting-scene-visuals), [Pictory API guide](https://docs.pictory.ai/guides/video-storyboard/update-storyboard-elements)
- StudioBinder shot list: attach an image to a shot card via Library or drag-drop then "Insert Image"; "Upload Shots" bulk-imports images as individual shots. Images only; no video-embed option found. — [StudioBinder: upload images to shot lists](https://support.studiobinder.com/en/articles/1507148-how-to-upload-images-to-shot-lists), [StudioBinder shot list blog](https://www.studiobinder.com/blog/film-shot-list-template/)
- LTX: any clip on the timeline can be sent back to generation space, prompt tweaked, new version approved and applied to the existing clip; shots in timeline reflect in storyboard. (generation is out of scope for BuildClub, but the "swap a version into the same slot" interaction is relevant.) — [CineD](https://www.cined.com/ltx-studio-takes-its-next-big-step-editing/)
- Boords: animatic frame durations can be stretched on the timeline; with audio, total length follows audio. — [Boords animatic tool](https://help.boords.com/en/articles/1459425-boords-animatic-tool)
- Frame.io V4 supports "version stacks" (new version uploaded in one click from Premiere panel, stacked), a precedent for alternate versions of the same item. — [Frame.io: V4 comments panel overview](http://help.frame.io/en/articles/9859849-adobe-premiere-frame-io-v4-comments-panel-overview)

### Inferences
- A shot-card with an empty slot (dashed "drop clip here" area), plus a version stack inside the card for alternate takes, would combine CapCut's slot model with Frame.io's version-stack idea. Neither product does exactly this; this is a design suggestion, not a finding.
- The CapCut "replaced N of M" counter is a good completeness indicator for "all shots filled" before export.

### Gaps
- No tool found with documented AI auto-matching of uploaded footage to script lines/shots. Not verified whether Descript/Opus/Premiere offer it; absence of evidence only.
- No documentation found on alternate-take management inside a slot.

## 3. How AI suggestions are presented and reviewed

### Takeaway
Two modes coexist: (a) conversational/agentic with checkpoints and per-response Revert (Descript Underlord, Captions Chat to Edit), and (b) tool-style with a review list before applying (Descript filler words). One-click "magic" tools (VEED Magic Cut, Captions AI Edit, Canva Magic Video) apply immediately and rely on undo; Opus uses a score to rank rather than accept/reject.

### Cited Findings
- Descript Underlord lives in the right sidebar chat; each response has an action bar with Revert, thumbs up, thumbs down. Checkpoints are saved before edits and appear in the chat; checkpoints last only the current session, after which use Version History. Also Undo (top-left, Cmd/Ctrl+Z). Help page lists three undo routes. — [Descript: Revert Underlord](https://help.descript.com/ai-assistant/revert.md) (screenshots: https://mintcdn.com/descript-5bf56f3f/NQQ8Oln3iV-r_AmP/images/external/descript-43171900848909-0fae02f076.png?fit=max&auto=format&n=NQQ8Oln3iV-r_AmP&q=85&s=517afb91960f77af5788c55135ec6e31)
- Underlord: natural-language prompts, saved repeatable instructions ("skills"), model picker (Auto plus models), no documented preview/apply step ("check its work and give feedback as you go"); labeled beta in its help page. Capabilities include captions, splitting clips, reformatting aspect ratio, animations/transitions, music/SFX. — [Descript: Underlord](https://help.descript.com/getting-started/underlord-beta-your-ai-co-editor-in-descript.md) (model picker screenshot: https://mintcdn.com/descript-5bf56f3f/qxpOFUY856zgDrds/images/external/descript-40475274188941-3fd81f8d14.png)
- Descript Filler-word removal opens a sidebar of detected words with timestamps and audio preview; per-instance options: Delete, Delete and replace with gap, Ignore (strikethrough in script, audio removed), Remove from transcript (script only). "Avoid harsh cuts" toggle skips words that cannot be removed cleanly. — [Descript: Filler words](https://help.descript.com/hc/en-us/articles/10164806394509-Filler-words)
- Descript's primer (updated 2026-07-29) says Underlord works on the transcript rather than the timeline and a "reborn Underlord" is available to anyone in Labs. — [Descript blog: Underlord primer](https://www.descript.com/blog/article/underlord-ai-video-editor-primer) (search snippet)
- Captions: Oct 2026 "Chat to Edit" builds on earlier edits (web and iOS); Nov 2026 (iOS) shows each step and its reasoning as it works; April 2026 projects can be duplicated to try a different approach; Long-to-Short "identifies strongest segments in the edit plan"; voiceover importable "from the edit plan before generation" (an edit plan is shown before generation). — [Captions: What's new](https://captions.ai/help/whats-new)
- OpusClip: Virality Score 0-99 shown next to each clip, sorted descending; four factors named (Hook, Flow, Value, Trend) but only one overall number is documented as displayed; described as a likelihood, comparable within the same video, not absolute; visible only on Pro/Starter. — [Opus: Virality score](https://help.opus.pro/docs/article/virality-score.md)
- OpusClip ClipAnything: user writes a prompt to find moments; prompt relevance also affects score. — [Opus: Virality score](https://help.opus.pro/docs/article/virality-score.md); manual: [ClipAnything prompts](https://help.opus.pro/docs/article/clip-anything-prompt-manual.md) (listed, not fetched)
- VEED "Magic Cut": official copy "click Magic Cut to remove filler words and silences in just one click" (paid plan per review). — [VEED tools](https://veed.io/tools/video-editor), [SocialRevver](https://www.socialrevver.com/blog/veed-video-editor-tutorial)
- Reviews note AI cleanup can clip emotional breaths or over-tighten speakers; human review recommended. Low-quality review sites. — [Style Factory Descript review (2026)](https://www.stylefactoryproductions.com/blog/descript-review)
- Canva Magic Video: prompt + uploaded clips -> Generate; result is a normal editable multi-scene timeline. — [Canva help: creating and editing videos](https://www.canva.com/help/creating-and-editing-videos/)

### Inferences
- For a marketer audience, the Descript filler-word review panel (list, per-item preview, bulk apply, ignore) is the most reusable accept/reject pattern; the Underlord checkpoint+Revert is the best "agentic" undo pattern. Neither shows a confidence number; Opus's score is the only quantified rating found, and its own docs caveat it.
- No confidence-level UI was found in any editing assistant; likely the pattern is "show reasoning/edit plan" rather than a percentage.

### Gaps
- No before/after (A/B toggle) UI documented for AI edits in the sources reached.
- Captions' edit plan UI not seen directly; only changelog lines.
- Premiere AI-assist (Enhance Speech, auto-reframe) review UIs not covered.

## 4. Captions editing, aspect ratio/reframe, export dialog, review/approval

### Takeaway
Caption editing is word-level on a text list plus drag-on-canvas positioning, with style presets. Reframe is mostly automatic (speaker tracking, layouts) with a manual crop override. Export dialogs are small panels with resolution and platform recommendations. Review: Frame.io is the reference (no-login share link, name+email on first comment, timestamp and range comments, drawn annotations), but approval status is not documented for V4 share links.

### Cited Findings
**Captions**
- OpusClip: select a word or sentence (multiple allowed), click Edit to correct, remove captions only, or delete captions and video; drag captions on the canvas; Captions tab for font, size, color, stroke, shadow, case; no bulk caption edit across clips; can upload own SRT. — [Opus: Change captions](https://help.opus.pro/docs/article/change-captions.md), [Opus: upload SRT](https://help.opus.pro/docs/article/upload-own-srt.md)
- Captions (app): "phrase editing in the Captions panel fully rolled out" April 2026 (web); caption background stroke June 2026; custom caption templates sync across devices June 2026. — [Captions: What's new](https://captions.ai/help/whats-new)
- Descript Underlord can add captions with styling and active-word highlighting. — [Descript: Underlord](https://help.descript.com/getting-started/underlord-beta-your-ai-co-editor-in-descript.md)
- VEED: subtitles appear as a separate timeline track; click text on preview to edit (third-party). — [SocialRevver](https://www.socialrevver.com/blog/veed-video-editor-tutorial)
- CapCut: auto-caption YouTube tutorials exist (e.g. "CapCut Auto Captions: How to Add Captions to Any Video"); CapCut official AI-features page not fetched. — [YouTube](https://www.youtube.com/watch?v=pHHY1GEZ2BU)
- A tutorial warns that Smart Crop after resizing can cut off text at the original frame edges, so check caption positions after reframing. Third-party. — [Kapwing resize](https://www.kapwing.com/tools/resize/tiktok)

**Aspect ratio / reframe**
- OpusClip layouts: Fill, Fit (4:3 crop with top/bottom padding), Split (2 speakers), Three, Four, Screenshare (screen top half, speaker bottom), Gameplay (30% speaker/70% gameplay). Layout applies to whole clip (right panel "Clip layout settings") or to a single timeline segment (Layout dropdown on canvas). Manual Reframe opens via Crop icon or double-click on video. Aspect ratios 9:16, 16:9, 1:1, 4:5 per MOV-editor page. — [Opus: Layout and reframing](https://help.opus.pro/docs/article/layout-and-reframing.md) (images listed on that page, e.g. https://mintcdn.com/opusclip-c3e48c12/2FSMdgPPp0xAqQFI/images/imgs/layout-and-reframing-2.png), [Opus: Manual reframe](https://help.opus.pro/docs/article/how-to-manually-reframe-content.md), [Opus: Change aspect ratio](https://help.opus.pro/docs/article/adjust-the-aspect-ratio.md)
- Kapwing: Resize project panel with TikTok 1080x1920 preset; choose Fill-and-crop or Fit-to-center; auto speaker-focus. — [Kapwing resize TikTok](https://www.kapwing.com/tools/resize/tiktok)
- Captions: premium AI Edit styles require 9:16 or 16:9; custom canvas sizes added on web Oct 2026. — [Captions: What's new](https://captions.ai/help/whats-new)

**Export dialog**
- CapCut web: Export button top right; panel has Share options and Download; settings: name, cover frame, quality, frame rate, resolution (360p to 1080p); labels 720p "recommended for TikTok Ads Manager" and 1080p "recommended for TikTok"; "Effects lost" warning at export. — [CapCut web template guide](https://www.capcut.com/create/capcut-web-editor-template-guide)
- OpusClip export-related help: 4K download, bulk download, cloud storage, import to Premiere/DaVinci. — [Opus help index](https://help.opus.pro/llms.txt)
- LTX exports XML for Premiere. — [CineD](https://www.cined.com/ltx-studio-takes-its-next-big-step-editing/)

**Review / approval**
- Frame.io share link (article dated 2026-09-09): viewers open without sign-in; typing a comment pauses video so it is timestamped; comments can be sent without timestamp; drag a yellow selector on the player bar for a time-range comment, loop it; unsigned-in clients are asked for name and email on first comment; paintbrush annotation tool draws on the video without changing the file; click circle on a comment to mark complete; passphrase optional; download button if enabled. The article does not describe an approval step. — [Frame.io: Share links explained for clients](https://help.frame.io/en/articles/9105242-share-links-explained-for-clients)
- Frame.io V4 Shares (dated 2026-09-09): layouts Grid, List, Reel; settings for comment toggle, download toggle, passphrase, expiry, show all versions, show transcriptions/captions, custom branding; email notifications to reviewers on invites and replies on assets they commented on; Recent Share Activity feed for owners (Opened Share Link, Viewed Asset, Commented, Download). No approve/status function for reviewers documented. — [Frame.io: Shares in Frame.io](https://help.frame.io/en/articles/9105232-shares-in-frame-io)
- Frame.io V4 player/commenting design (2024-05-28, older): comment composer supports attachments and indexed hashtags; after submit focus returns to the player for keyboard control; typing auto-pauses; anchored (pixel-point) comments easier for new reviewers to discover than timestamp comments; emoji reactions; filter comments by annotation/attachment/reaction; each comment has a direct link. — [Frame.io blog: V4 player and commenting](https://blog.frame.io/2024/05/28/frame-io-v4-features-player-and-commenting/)
- Frame.io Premiere V4 Comments panel (dated 2026-09-09): comment markers on the timeline, comment cards populate in real time, click card to move the playhead, "New Version" button uploads and version-stacks; annotations/anchored comments not supported in the panel. — [Frame.io: Premiere V4 comments panel](http://help.frame.io/en/articles/9859849-adobe-premiere-frame-io-v4-comments-panel-overview)
- Approval vocabulary appears in the Workfront integration: Approve, Approve with changes, Needs work; all assigned approvers must approve. Not V4 share-link behavior. — [Adobe Workfront: review and approve with Frame.io viewer](https://experienceleague.adobe.com/en/docs/workfront/using/review-and-approve-work/document-reviews-and-approvals/review-and-approve-documents/review-with-frame)
- Canva: share permissions Can view / Can comment / Can edit; guests must log in to comment; comments can be replied to and resolved; no video-timestamp comments found in docs. — [Canva: Set sharing permissions](https://www.canva.com/help/set-sharing-permissions-canva/), [Canva: Share and collaborate](https://www.canva.com/help/collaborate-with-anyone/)
- OpusClip sharing: only a public link (Privacy Default -> Public); no roles, comments, or approval documented. — [Opus: Share projects](https://help.opus.pro/docs/article/share-project.md)

### Inferences
- A client approval link for BuildClub can borrow Frame.io's no-login pattern (name+email prompt on first comment, pause-on-type timestamp, range comments, complete-circle) and add an explicit Approve / Request changes button, which Frame.io V4 shares (per docs reached) lack; Workfront's three-state vocabulary is a ready model.
- Offering reframe as per-shot layout presets (Opus-style Fill/Fit) with a manual crop override matches marketer needs; since BuildClub footage is filmed, a vertical-safe-zone overlay (not found in sources) would be an addition.

### Gaps
- No official source for TikTok/Reels safe-zone overlay in editors was gathered.
- Frame.io V4 reviewer-approval status on share links not documented in pages reached; may exist in UI.
- CapCut official caption-editing help and Premiere caption UI not fetched.
- Descript caption-editing help not fetched.

## 5. Onboarding / empty states for first-time users

### Takeaway
Little first-party documentation exists. Third-party teardowns suggest the winners drive to a first finished output quickly (Descript asks 3 personalization questions then pushes a generation action; CapCut and Captions start from templates/styles). Treat as low-confidence.

### Cited Findings
- Descript onboarding teardown: short signup, three personalization questions (role, use case, content type), optional team invite, dashboard pushing a first AI-generated video; activation estimated 8-12 minutes; generation steps do not always show progress clearly, whereas VEED shows a percentage. Single third-party teardown. — [SaaSUI: Descript onboarding](https://www.saasui.design/pattern/onboarding/descript)
- Descript email sequence over seven days teaching one workflow at a time. — [Sequenzy: Descript onboarding emails](https://www.sequenzy.com/email-examples/brands/descript/sequences/onboarding)
- Screen inventory for Descript (127 UI screens, onboarding flows) on Nicelydone (not viewed; may be gated). — [Nicelydone: Descript](https://nicelydone.club/apps/descript/components)
- Supademo user-flow example for Descript. — [Supademo: Descript user flow](https://supademo.com/user-flow-examples/descript)
- OpusClip help has "Introduction to OpusClip" and "Things You Should Set Up First" (Brand Kit, templates/Recipes). — [Opus: Intro](https://help.opus.pro/docs/article/introduction-to-opusclip.md), [Opus: Things to set up first](https://help.opus.pro/docs/article/things-you-should-set-up-first.md), [Opus: Brand Kit](https://help.opus.pro/docs/article/how-to-use-brand-kit.md) (listed in index; not fetched)
- CapCut web template flow starts from a Templates gallery with cards showing clips/duration/ratio/use-count, then straight into a pre-filled slot editor (the template is the empty state). — [CapCut web template guide](https://www.capcut.com/create/capcut-web-editor-template-guide)
- Captions style picker (search box added Sept 2026), projects can be duplicated to try another approach. — [Captions: What's new](https://captions.ai/help/whats-new)

### Inferences
- For BuildClub, the empty shot-card state could show "N slots to fill" and a "drop clip here" target, mirroring CapCut's pre-filled slots. This is design inference.

### Gaps
- No first-party onboarding screens captured for CapCut, Opus, Captions, Premiere. Mobbin and Page Flows were not queried (login-gated galleries).
- No data on activation or drop-off.

## 6. Link collection for designers (official/near-official screenshots, help pages, YouTube)

All dates for YouTube are unverified (fetch returned titles only); search snippets sometimes gave relative ages.

### Descript
- Editor interface (annotated screenshot): https://help.descript.com/hc/en-us/articles/37585546799757-The-editor-interface
- Scenes overview: https://help.descript.com/getting-started/scenes
- Reorder scenes: https://help.descript.com/visuals/reorder
- Properties panel: https://help.descript.com/descript-tour/properties-panel
- Timeline (new experience): https://help.descript.com/hc/en-us/articles/36492789575565-The-new-timeline-experience
- Filler words: https://help.descript.com/hc/en-us/articles/10164806394509-Filler-words
- Revert Underlord: https://help.descript.com/ai-assistant/revert
- Underlord: https://help.descript.com/hc/en-us/articles/36803785502221-Underlord-beta-Your-AI-co-editor-in-Descript
- Storyboard page: https://www.descript.com/storyboard
- YouTube: Descript Scenes and Layout Tutorial https://www.youtube.com/watch?v=PwQz-wqtmwg ; NEW Descript Underlord AI Assist Update (Full Video Editing Tutorial) https://www.youtube.com/watch?v=GQ8H-yfOHSc ; Underlord Get Started https://m.youtube.com/watch?v=HhEm_u61d9s ; Easy Vertical Video Creation Using Underlord https://www.youtube.com/watch?v=ckKaQpfQIgc ; Save scenes as templates (Short) https://www.youtube.com/shorts/Kp1B787h00g ; channel https://www.youtube.com/@Descript

### Premiere Pro / Adobe
- Text-based editing: https://helpx.adobe.com/premiere-pro/using/video/text-based-editing-video.html (403 to fetcher; open in browser)
- YouTube (2026-labelled by search results, unverified): https://www.youtube.com/watch?v=jkYiH1YbJ4I ; https://www.youtube.com/watch?v=2XReg3P0n8o ; https://www.youtube.com/watch?v=-APUIRHPY0o

### CapCut
- Replaceable clips help (2026-01-12): https://www.capcut.com/help/how-to-set-replaceable-material-clips
- Web template guide (2026-08-31): https://www.capcut.com/create/capcut-web-editor-template-guide
- Remake help: https://www.capcut.com/help/how-to-make-a-remake
- YouTube (desktop/mobile, labelled 2026): https://www.youtube.com/watch?v=EMDrgqepVhM ; auto captions https://www.youtube.com/watch?v=pHHY1GEZ2BU ; horizontal to vertical https://www.youtube.com/watch?v=SmSoEdlsAvk

### OpusClip
- Help index (all pages): https://help.opus.pro/llms.txt
- Layout and reframing (many screenshots): https://help.opus.pro/docs/article/layout-and-reframing.md
- Change captions: https://help.opus.pro/docs/article/change-captions.md
- Timeline snap editing: https://help.opus.pro/docs/article/snap-editing.md
- Virality score: https://help.opus.pro/docs/article/virality-score.md
- YouTube: OpusClip Tutorial 2026 Full Step-By-Step Beginner Guide https://www.youtube.com/watch?v=dvO5NsYovM4 ; OpusClip is NOT Just for Shorts https://www.youtube.com/watch?v=P4AO0pNt9h4 ; Complete Guide to Editing and Exporting Clips https://www.youtube.com/watch?v=OlxW8NjoJCg

### Captions (Mirage)
- What's new (2026 changelog): https://captions.ai/help/whats-new
- Feature availability by platform: https://captions.ai/help/docs/feature-availability
- Web platform: https://captions.ai/help/platforms/web

### Frame.io
- Share links explained for clients (2026-09-09): https://help.frame.io/en/articles/9105242-share-links-explained-for-clients
- Shares in Frame.io (2026-09-09): https://help.frame.io/en/articles/9105232-shares-in-frame-io
- Premiere V4 comments panel: http://help.frame.io/en/articles/9859849-adobe-premiere-frame-io-v4-comments-panel-overview
- V4 player & commenting design blog (2024-05-28, older): https://blog.frame.io/2024/05/28/frame-io-v4-features-player-and-commenting/
- YouTube: Get to Know Frame.io Version 4 https://www.youtube.com/watch?v=7V2cSoGYTTQ ; V4 Beta: Enhanced Feedback Capabilities https://www.youtube.com/watch?v=MNwNTGkNwdw ; provide feedback as client https://www.youtube.com/watch?v=5VOarkJrhFk ; Client Review and Approval Workflow https://youtube.com/watch?v=RPvetymHeCo

### Canva
- Creating and editing videos help: https://www.canva.com/help/creating-and-editing-videos/
- AI video editor: https://www.canva.com/video-editor/ai/
- Sharing permissions: https://www.canva.com/help/set-sharing-permissions-canva/

### LTX Studio / Boords / StudioBinder / Pictory
- LTX tutorial: https://ltx.studio/blog/ltx-studio-tutorial ; animatics page (redirects, fetch failed): https://ltx.io/studio/platform/animatics-software ; CineD editing article (2026-01-16): https://www.cined.com/ltx-studio-takes-its-next-big-step-editing/
- Boords animatic tool: https://help.boords.com/en/articles/1459425-boords-animatic-tool ; docs https://boords.com/docs/animatics
- StudioBinder images in shot lists: https://support.studiobinder.com/en/articles/1507148-how-to-upload-images-to-shot-lists
- Pictory storyboard docs: https://docs.pictory.ai/guides/video-storyboard

### VEED / Kapwing
- VEED editor: https://veed.io/tools/video-editor
- Kapwing resize: https://www.kapwing.com/tools/resize/tiktok

### Onboarding galleries
- SaaSUI Descript: https://www.saasui.design/pattern/onboarding/descript ; Nicelydone Descript: https://nicelydone.club/apps/descript/components ; Supademo: https://supademo.com/user-flow-examples/descript

### Gaps
- No view counts or upload dates for YouTube videos could be retrieved; "most viewed" cannot be asserted.
- Mobbin / Page Flows not accessed.
- LTX official interface docs, Kapwing and VEED official help-center pages, and Canva's video-editor help body were not read directly.
- Descript Storyboard product page and Canva help pages are referenced from search snippets only.
