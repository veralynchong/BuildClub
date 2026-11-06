# Magnific Spaces (canvas) — UI teardown for agents

- **Source:** hands-on walkthrough of Magnific Spaces (`https://www.magnific.com/app/spaces/<id>`), a logged-in account, Brave on desktop at 1550×986 CSS px.
- **Date observed:** 2026-11-05 (Sydney). Magnific ships fast ("New", "Beta" and "Early access" badges everywhere). Re-verify anything critical.
- **Method:** I clicked every visible control, hovered for tooltips, and read menu text from the DOM. I never pressed Run, Generate or Run flow, so no credits were spent. Generation results, the run queue and cost numbers after a run are therefore **unverified**.
- **Scope:** UI and interaction logic only. This file does not compare Magnific with BuildClub.
- **Assets:** screenshots are in `assets/` and referenced below as `[NN]`. The friend's name, email and avatar name have been redacted.
  - `assets/gif-01-quick-connect-node.gif`: connect menu → auto-created connected node.
  - `assets/gif-02-select-group-edge.gif`: marquee select → Group → arrange → edge disconnect.

---

## 1. Mental model

- A **Space** is an infinite canvas (Vue Flow), split into **Pages**.
- Everything on the canvas is a **node**:
  - **generator nodes** (image, video, audio, 3D, text/LLM), which have typed input and output ports and a Run button;
  - **utility nodes** (List, Router, Group, Text label, Sticky note, Sticker, Drawing);
  - **Flow nodes**, which are packaged sub-workflows shown as a card with a "Run flow" button.
- **Edges** carry typed media (text, image, video, audio, 3D, SVG) from an output port to an input port. A connected input changes the target node's UI. For example, a connected Text node turns the prompt placeholder into "Connected prompt. Use @ to add references or extra context" [41].
- Nodes are **self-contained mini-apps**: prompt plus parameter chips plus Run live *inside* the node body. A right-side **inspector** is optional (⚙) [10][41].
- An **AI agent** (Magnific Agent) can build and run the canvas. MCP tools are exposed to external agents: `spaces_create`, `spaces_create_node`, `spaces_add_connection`, `spaces_run`.

## 2. Screen layout (chrome)

| Zone | Contents |
|---|---|
| Top-left | Back `‹`, breadcrumb `Personal project › Untitled space` |
| Top-right | `Pricing`, `Run in your agent`, `⚡ Flows`, `History` (clock), `Share`, `AI Assistant` (chat icon), account avatar |
| Left vertical toolbar | Add `+` (N), Select (V), Hand (H), Cut ✂ with flyout (Connection L), Sticky ▢ with flyout (Draw P, Stickers S), Comments (C), Undo, Redo, Settings ⚙ |
| Bottom-left | `Page 1 ▾` → Pages panel [42] |
| Bottom-right | `Give feedback`, Academy (🎓), View options (👁) [37], MiniMap toggle [38], zoom `168% ▾` |
| Floating | Node toolbar above a selected node [14]; multi-select toolbar [48]; draw dock at bottom center [46] |
| Right dock | Inspector (node settings) [10][41], History [31–33], Comments [43], Flows [29], AI Assistant [34]. Only one is open at a time |

Selection-dependent chrome: a node's bottom parameter bar and toolbar show **only while it is selected**. A deselected node shows its title, body and ports only [38 vs 39].

## 3. Left toolbar — every tool

| Tool | Key | Behavior |
|---|---|---|
| Add | N | Opens the Add menu at the button. Right-click on empty canvas opens the same menu at the cursor [02] |
| Select | V | Default. Dragging on empty canvas draws a marquee multi-select [48] |
| Hand | H | Pan |
| Cut / Connection | L (flyout) | Scissors cuts edges; Connection mode draws edges |
| Sticky note | T | Click places a yellow note (author name in its footer). Toolbar: color (8: gray, red, orange, yellow, green, cyan, blue, purple), size (Small/Medium/Large/Extra Large), **B**, *I*, bullet list, numbered list, divider, duplicate, delete, ⋯ [45] |
| Draw | P (flyout) | Freehand pen. Bottom dock: pencil, eraser, shapes (filled rect, rect, triangle, circle, arrow, line), color, stroke-width slider [46] |
| Stickers | S (flyout) | Click places an emoji sticker (default 👍). Toolbar: 👍❤️🎉🔥💯 + more, duplicate, delete, ⋯ [47] |
| Comments | C | Opens the Comments panel (count "0 In this space", Filters, empty state "No comments yet"). Clicking the canvas drops an avatar pin with an "Add a comment…" box, and the camera pans to it [43][44] |
| Undo / Redo | ⌘Z / ⌘⇧Z | Undo covers edge disconnects, node creation and so on |
| Settings | — | Settings modal (§10) |

## 4. Add menu / command palette

- **Open by:** N, the `+` button, right-click on empty canvas, or **dragging an output port into empty space**. The last one opens a menu *filtered to compatible nodes*; picking one creates the node already connected [35][36].
- **Layout** [02]:
  - Search box.
  - Category chips: Image, Video, Audio, 3D, Utilities, Design (New), Flows, Templates, Library.
  - Sections:
    - MEDIA: Upload, Assets.
    - NODES.
    - AI MODELS PROVIDERS: Google 10, OpenAI 7, Kling 1, MiniMax 1.
    - FLOWS.
  - Footer hints: `N Open · ↑↓ Navigate · ↵ Insert`.
- **Hover preview card:** video thumbnail, one-line description and feature tags (e.g. "Multiple models · References · Aspect ratios") [03].
- **Typing turns it into a command palette** [04]:
  - tabs Nodes / Settings / Flows;
  - result sections NODES (each with a pin icon to favorite), FLOWS and SETTINGS (settings toggles are searchable, e.g. "Generations in list mode");
  - INSPIRATION: "Search in stock for X", "Ask the agent about X".
- **Compatible list when dragging from a Text output** (in order): Image Generator, Video Generator, Text, List, Voiceover, Sound Effects, Image Upscaler, Music Generator, Assistant, Extend video, Modify video, Move, Variations, 360 Generator, Video SFX, 3D Generator, Router, Change aspect ratio, Image Editor (Remove background, Refine), 3D Editor (Retexture, Remesh, Convert, Resize, UV unwrap, Multicolor).

### Node catalog (from the Add menu, with descriptions)

| Group | Nodes |
|---|---|
| IMAGE | Image Generator (multi-model, references, aspect ratios); Image Upscaler (up to 4K); Skin Enhancer; Variations (angles, expressions, demographics, age); Image Editor (inpaint, restyle); Sketch |
| VIDEO | Video Generator; Extend video; Modify video (New); Move (motion graphics from a brief); Video Combiner; Media Extractor (frames or clips); Video Upscaler; Video SFX; Speak (lip-sync from image/video + audio) |
| VFX | DepthMap (New) |
| AUDIO | Speech to Text; Voiceover; Sound Effects; Music Generator |
| TEXT | Text ("Write a prompt and pipe it into any node"); Assistant (LLM, prompt writing, multiple models) |
| DESIGN | Designer (images, text, shapes; Beta) |
| 3D | 3D Generator; 360 Generator; 3D Editor (retexture, remesh); 3D Animation |
| VECTOR | Image to SVG; SVG Generator |
| UTILITIES | List (batch, multi-outputs); Sticky note; Stickers; Group; Text label (New); Router (pass one input to several downstream nodes) |

## 5. Node anatomy

```
          [ floating toolbar: ▶ ▾ | ⤳ ▾ | ✎ | 🗑 | ⋯ ]      ← selected only
 [icon] Node title #N
 in●  ┌──────────────────────────────────────┐  ●out
 in●  │  preview / result area               │  ●out
 in●  │                                      │
      │  [+]  prompt textarea (inline)       │
      │  [– x1 +] [Model ▾] [Ratio ▾] [Res ▾] [⚙]  [▶] │  ← selected only
      └──────────────────────────────────────┘
```

- **Ports** are round icon buttons outside the card edges: inputs on the left, outputs on the right. Each shows its media-type icon. Hovering shows the port name ("Start image", "Reference video" and so on).
- **Count stepper** `– x1 +` sets how many generations to run (batch).
- **Title** is auto-numbered per type (`Image Generator #2`).
- **Connected inputs** show as a blue thumbnail chip inside the prompt area.
- **Zoomed out (~15%):** nodes collapse to icon plus truncated name [28][36].

### Floating node toolbar [14]

- `▶` Run, with a `▾` caret for options such as "This node only". Disabled when there is nothing to run.
- `⤳ ▾` **Connect**: lists the node's outputs (e.g. Start image, End image, Generated video, Audio) [15]. Each output has a submenu of compatible new nodes [16]:
  - Start image → Image Generator, Video Generator, Image Upscaler, Assistant, Change Camera, Create text;
  - Generated video → Video Generator, Assistant, Create text;
  - Audio → Video Generator, Assistant.
  Clicking one creates that node already wired (`gif-01`).
- `✎` Prompt editor.
- `🗑` Delete.
- `⋯` More.
- **Text node toolbar** has rich-text controls instead: run-all ▶▶, edit, color, `Paragraph ▾`, **B**, *I*, lists, divider.

### Node right-click menu [17][18]

- Run.
- Prompt editor.
- Add creation.
- Create instance (NEW).
- Options › Focus (F), Lock, Hide header.
- Copy › Copy settings, Copy link to node.
- Duplicate ⌘D.
- Delete.

### Prompt editor (modal) [19]

- Large textarea (`0/10000`).
- Right-side AI chat ("Ask me anything about your prompt"), with chips Random prompt and Auto prompt.
- "Image to prompt", extracting as Plain text or Format JSON.
- `Apply prompt`.

### Inspector (⚙ → right dock) [10][41]

- **Video Generator inspector:**
  - Model;
  - References, with Start / End image drop zones;
  - "Add media" (image, video, audio, character, elements, draw, +);
  - Prompt ("try @ to add references");
  - duration, ratio and sound chips;
  - Run.
- **Image Generator inspector:**
  - Model Auto ("Upgrade for top quality, speed, and full control");
  - References `0/8` with Style / Character / Add;
  - Prompt (shows "Prompt (connected)" when wired);
  - ratio and resolution chips;
  - Run.

## 6. Generator node parameters

### Video Generator [05–10]

- **Input ports:** prompt (Text), first-frame (Start image), last-frame (End image), video-reference (Reference video), audio (Audio input), references (References).
- **Output ports:** start-frame, end-frame, output, audio-output.
- **Model:**
  - default `Auto` [06];
  - the "All models" modal has filters All providers / Features / All resolutions / Best for / Default sort [07];
  - Auto's tags are Refs, Multi, Start/End, 1080p, Audio, with a cost range of 100–2800 credits.
- **Ratio** [08]: 1:1, 21:9, 16:9, 4:3, 3:4, 9:16, 9:21.
- **Duration** [09]: 2–4″, 5–6″, 8–10″, 10+″.
- **Resolution:** Auto.
- **Sound:** toggle.

### Image Generator [39–41]

- **Ports:** IN reference, prompt; OUT output.
- **Ratio** [40]: 1:1 Square, 16:9 Widescreen, 9:16 Social story, 2:3 Portrait, 3:4 Traditional, 1:2 Vertical, 2:1 Horizontal, 4:5 Social post, 3:2 Standard, 4:3 Classic. Each has a ratio-shaped icon.
- **Resolution** [39]: 1K / 2K / 4K.
- **Image models** (Settings › Models):
  - Featured: Auto, Magnific One (New), Google Nano Banana 2.1, GPT 2.5 (Beta), Seedream 5 Pro.
  - All: Flux.2 Max/Pro/Flex/Klein, Flux.1 Kontext Max/Pro, Flux.3, Mystic 2.5 (+Flexible/Fluid), Flux.1/1.1/Realism/Fast, Ideogram 4.5/4/P-Image, Nano Banana/Pro/2/2 Lite, Cinematic, Luma Uni-1.1, GPT 2, Seedream 4/4 4K/4.5/5 Lite/5 Flash, Runway, Classic Fast/Classic, Mystic 1.0, Qwen Image 3.0 Pro/3.0, Z-Image, Grok Imagine 2.0, Recraft V4/V4 Pro/V4.1, Krea 3/2, MAI Image 2.5.

### Media picker ("Add media" / `+`) [11–13]

- **Left nav:** History, Uploads; All references → Stock, Character, Elements, Sketch.
- **Top bar:** project filter, favorites, Layout, Filters, search.
- **Right column:** Upload media, Take photo, Record video, Record audio, Upload from phone.
- **Stock:** Image/Video; Photos / Illustrations / Designs, plus categories.
- **Characters and Elements:** tabs Library / By Magnific. Items carry `@handle`s, which are referenced in prompts with `@`. There is a `Create` button.

### Other nodes (body and ports)

| Node | IN ports | OUT ports | Body |
|---|---|---|---|
| Assistant [20–22] | attachments (Media), prompt (Text) | generated_prompt | Tabs Prompt / Result, + attach. Models: GPT-5 Mini, GPT-6 Astra, GPT-6.1 Sol, GPT-5.6 Terra/Luna, Gemini 3.5/3.8 Flash, Claude Fable 5.1, Sonnet 5.5, Haiku 4.5, Opus 5.5, Opus 5. "Export as" → Export As List / Export As Text |
| Text | image, video, text | text | Placeholder `Try "Happy dog with sunglasses and floating ring"`; rich-text toolbar |
| List [23] | texts, images, videos, audios, svgs, models-3d | output-* per type | Empty state "No elements yet" with buttons Add text / Add media |
| Router | any | output | Fan-out pass-through |
| Voiceover [24] | text | output | Text with audio tags (`[laughs]`, `[pause 0.5s]`), x1, model ElevenLabs v3, Speaker 1 / Speaker 2 |
| Video Combiner [25] | audio, videos | output, start-frame, end-frame, audio-output | "Connect your videos and run to preview the result"; download in toolbar |
| Media Extractor | video, audio | output | "No media connected"; Clips ▾ |
| Speak | image, video, audio | output | "Create a talking video" |
| Designer [26] | attachments, prompt, design | output, current-page | "No design has been created" with Create / Import; Beta |
| Text label [27] | — | — | "Write label…"; toolbar: color, font Sans, 64px, B/I/U, align, duplicate, delete, ⋯ |
| Flow node [30] | per-flow inputs (UUID-named ports) | per-flow outputs | Cover image, title, description, x1, `Run flow` |

## 7. Connections (edges)

- **Create:**
  1. drag from an output port to a compatible input port;
  2. drag from an output port into **empty space**, which opens the filtered Add menu, and the picked node is auto-wired [35][36];
  3. the toolbar `⤳ Connect` menu [15][16];
  4. Connection tool (L);
  5. shortcut ⇧L ("connect selection").
- **Style:** Bezier by default, toggled to Polyline in View options or Settings. A selected node's edges render highlighted purple; idle edges are dim [41 vs 38].
- **Hover an edge:** a pill appears at the hover point with ✂ **Disconnect** and a `▾` caret [52]. Clicking ✂ removes the edge immediately, and the target reverts to its unconnected placeholder [53]. Undo restores it.
- **Type safety:** menus list only compatible nodes. Ports are named by media type.

## 8. Selection, grouping, arrange

- **Marquee** (Select tool, drag on empty canvas) selects mixed items (notes, stickers, drawings, nodes) [48].
- **Multi-select toolbar** [48]: ▶ Run, **Group**, **Arrange ▾**, duplicate, delete, **Download**, ⋯.
- **Arrange** [49]: Grid, Moodboard, Workflow, Vertical, Horizontal.
- **Group** [50]: a rounded tinted frame around the selection.
  - Group toolbar: ▶ Run, color ▾, **Ungroup**, Arrange ▾, **Lock**, duplicate, delete, download, ⋯.
  - Group ⋯ menu [51]: **Export as Template**, Arrange ›, Ungroup, Options ›, Copy link to node, Duplicate ⌘D, Delete, Download.

## 9. Navigation and view

- **Zoom menu:** Zoom in ⌘+, Zoom out ⌘−, Zoom 100% ⌘0, Zoom to fit D, Zoom to selection F.
- **Auto-focus:** a new node pans the camera to it (setting "Auto-focus new nodes", on by default).
- **View options (👁)** [37]: Show connections ✓; Path: Bezier / Polyline.
- **MiniMap** [38]: bottom-right overview with a viewport rectangle.
- **Pages** [42]: panel listing Page 1 with `+ New`. Each row has a `⋯` menu.
- **History panel** [31–33]: tabs Credits (spend in this space, workflow runs), Assets (with Filters) and Nodes. Nodes lets you search nodes by name, grouped by page, and filter by Type (Flow, Video Generator…) and Status (Generating, Done, Failed, Cancelled).
- **Flows panel** [29]:
  - My flows / Explore, with search and template cards (Animated scene, Localize an ad, Moodboard, Retro-future, Brand check, Adapt a key visual, Product in brand, Batch watermarking, Catalog, Story carousel);
  - `Create flow`;
  - flow detail: Open Flow page, Add node to space, Personalize, Copy link to share, Use Flow as API.
- **Share:** invite link with `Can view ▾`, Copy invite link, People with access. Team collaboration needs a Teams plan.
- **AI Assistant** [34]:
  - right dock (URL gets `&agent=1`) showing "Hello, <name>" and "Early access";
  - suggestion chips: Build a brand kit from a website, Paint a picture, Start a poster page, Build a workflow for photo variations;
  - input with `+` and mic;
  - menu: New chat, Agents, Skills, Brand Kit (New), Academy, plus chat history.
- **Run in your agent** modal:
  - tabs Build a Space / Edit an existing Space / Make variations;
  - "Right here, with Magnific Agent";
  - "In your own agent": See all connectors, Add to ChatGPT, Add to Claude.

## 10. Settings modal (⚙)

- **General:**
  - Helper lines (on);
  - Rich tooltips (on);
  - Node names when zoomed out (on);
  - Experimental tools (off, disabled);
  - Dissolve effect (off);
  - Edge path type: Bezier / Polyline;
  - Video time: Seconds / Frames / Timecode;
  - When deleting a node with instances: Ask / Delete them / Keep as nodes.
- **Space:**
  - Media: Autoplay videos, Play videos with sound;
  - Navigation: Mouse wheel Pan / Zoom; Auto-focus new nodes (on);
  - Execution: Generations in list mode.
- **Models:** default model for Image / Video / Voiceover / Prompt generator, each "Not set" by default.
- **Shortcuts** (all rebindable, with Restore defaults):
  - Basics: Copy ⌘C, Cut ⌘X, Paste ⌘V, Undo ⌘Z, Redo ⌘⇧Z, Select all ⌘A, Duplicate ⌘D, Paste without connections ⌘⇧V, Duplicate without connections ⌘⇧D.
  - Control: Delete Del, Cancel Esc, Preview A, Edit sticky ↵, Compare selection ⇧C, Connect selection ⇧L, Add elements N, Run ⌘↵, Run all ⌘⇧↵, Toggle info E, Add marker (media extractor) M, Previous ←, Next →.
  - Navigation: Zoom to fit D, Zoom to selection F, Reset view ⌘0, Pan H, Cursor V, Toggle history ⇧H, Comments C, Stickers S, Sticky note T.

## 11. Design patterns worth noting (observations, not recommendations)

1. **Typed ports plus filtered creation.** Every "add next step" entry point (port drag, Connect menu, right-click) shows only nodes that accept that output type. New nodes arrive pre-wired.
2. **Inline-first parameters.** Prompt, count, model, ratio, resolution and Run all sit in the node. The inspector duplicates them for deeper settings (references, upgrade).
3. **Progressive chrome.** Toolbars and parameter bars appear only on selection. At low zoom, nodes collapse to labels.
4. **One right dock, many panels.** Inspector, History, Comments, Flows and Agent share one slot.
5. **Everything is searchable from N.** Nodes, flows, settings toggles, stock and the agent all go through one palette.
6. **Reusable units.** Group → Export as Template; Flows as packaged nodes with "Use Flow as API"; "Create instance" on nodes.
7. **Visible cost.** Credits are shown per model (cost range), with a History › Credits tab per space.

## 12. Implementation notes (from the DOM)

- **Framework:** **Vue Flow**. Selectors: `.vue-flow__node`, `.vue-flow__edge`, and `.vue-flow__handle` with `data-handleid` (e.g. `first-frame`, `generated_prompt`, `output-images`), `data-handlepos` (`left`/`right`) and `data-nodeid`.
- **Popovers and menus:** Radix-style (`[data-radix-popper-content-wrapper]`, `[role=menu]`). Tooltips are `[role=tooltip]` on hover.
- **Space URL:** `/app/spaces/<uuid>?tab=blank`. The agent panel adds `&agent=1`.

## 13. Not verified

- Behavior during and after Run: progress UI, result previews, the List-mode output, credit deduction, failure states.
- Designer editor internals; 3D nodes; Media Extractor markers; Compare selection (⇧C); Preview (A).
- Comments posting, threads and resolve; Share permission options beyond "Can view".
- Collaboration presence (multi-cursor), which needs a Teams plan.
