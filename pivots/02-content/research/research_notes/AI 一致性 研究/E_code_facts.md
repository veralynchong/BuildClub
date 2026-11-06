# E. Remake code facts relevant to consistency (read 2026-11-03, branch feat/canvas-p2-models @ 7db7614)

Paths relative to `pivots/02-content/app/trend-finder/`.

- `backend/gen_models.json`: only `mock-image` and `mock-video`. `inputs` keys: `text`, `reference`, `startFrame` with values required/optional; `aspects: ["9:16"]`; video `durations: [4, 6]`. No field for max number of references, no end frame, no reference *kind* (character/style/product).
- `src/lib/canvas/ports.ts`: port ids `in:text`, `in:start`, `in:ref`. storyboard = [TEXT, REF]; video = [TEXT, START, REF]; footage = [text, ref]. `canConnect` refuses a second edge into the same handle (`canvas.conn.taken`) -> today a node can take ONE reference image only. It also blocks a port when the selected model's `inputs[...]` is `none`.
- `src/lib/canvas/graph.ts` `GenRequest { prompt; startFrame?; reference?: string; duration? }` -> single reference id (a generation id of the upstream node's selected version).
- `backend/generations.py`: `input_hash(model, prompt, start, ref, duration)`; inputs stored as `{"prompt","startFrame","reference","duration"}`; resolves `start` and `ref` to stored generations of the same idea (`one(idea_id, ref_id)`) -> a reference must currently be a generation/upload inside the same idea (plan); there is no cross-plan / per-client asset.
- `src/types.ts` `Client` has id, name, niche, audience, monthlyTarget, examples, topics, cannot, memory. No brand / asset fields yet. Spec §8 says brand (logo, font, colour) will live "on the client's Brief" in P3.
- `Shot.palette?: string[]` exists: hex colours read from the frame in the browser (could seed a style palette).
- Spec §11.5 #5: unsupported inputs are blocked at connect time with a reason; only 9:16-capable video models are listed.

Implication: P2 adapters and GenRequest must change from `reference?: string` to `references?: {id, role}[]` to support any multi-reference consistency.
