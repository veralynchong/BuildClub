import { SIX_SHOTS, sixShotFixtures } from './sixShot.ts'
import { GUIDED_IDS as ids, GUIDED_CANVAS_IDS as c } from './contracts.ts'
import type { PreparedData } from './contracts.ts'
import { preparedAssets, preparedAt, preparedCacheFetchedAt, preparedFixtures, preparedModels, preparedSearchResult, preparedSearchResults, preparedTikTokSearchResult, preparedTutorialPrompt, preparedSupplementFormats } from './fixtures.ts'
import { tofuCase } from '../demo/tofuCase.ts'
import { hasScore, outlierScore } from '../metrics.ts'
import { genRequest } from '../canvas/graph.ts'
import type { CanvasDoc, Generation } from '../canvas/types.ts'
import type { EditProject } from '../editor/types.ts'

type State = ReturnType<typeof preparedFixtures>
type Obj = Record<string, unknown>
function boundAsset(planId: string, nodeId: string): string | null {
  const six = SIX_SHOTS.find(s => s.nodes.image === nodeId)
  if (six && Object.values(ids.plans).includes(planId as typeof ids.plans.ai)) return six.asset.id
  if (planId === ids.plans.ai && /^n_sb_s([1-9]|1[0-9]|2[01])$/.test(nodeId)) return `image-${nodeId.slice(5)}`
  if (nodeId === c.nodes.image) return 'shoot-high-angle-image'
  if (nodeId === c.nodes.video) return 'shoot-high-angle-video'
  if (planId === ids.plans.shoot) {
    const match = /^n_(high-angle|low-macro)_(image|video)$/.exec(nodeId)
    if (match) return `shoot-${match[1]}-${match[2]}`
  }
  return null
}
const object = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const exact = (v: Obj, keys: string[]) => Object.keys(v).every((k) => keys.includes(k))
const copy = <T>(v: T): T => structuredClone(v)
const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } })
const error = (message = 'This action is unavailable in prepared playback. No provider was called.', status = 422) => json({ error: message, prepared: true }, status)
const normalizedQuery = (value: string) => value.trim().replace(/\s+/g,' ').toLowerCase()
const fixedQuery = (value: string) => ['tofu','tofu recipe'].includes(normalizedQuery(value))
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

// The caller supplies a namespaced store. This factory never accesses native storage, fetch or an SDK.
export function createPreparedData(local: Storage, session: Storage): PreparedData {
  return createPreparedDataWithClock(local, session, Date.now)
}
export function createSixShotData(local: Storage, session: Storage): PreparedData {
  return createPreparedDataWithClock(local, session, Date.now, true)
}
export function createPreparedDataWithClock(local: Storage, _session: Storage, now: () => number, six = false): PreparedData {
  const fixture = () => six ? sixShotFixtures(true) : preparedFixtures()
  const key = six ? 'prepared-six-shot.v2' : 'prepared-data.v1'
  let epoch = 0
  let state = six ? sixShotFixtures() : preparedFixtures()
  try {
    const raw = local.getItem(key)
    if (raw) {
      const saved = JSON.parse(raw) as { version: number; state: State }
      // Restore only this fixed fixture version; request validation still guards every mutation.
      if (saved.version === 1) {
        const migrated = six ? saved.state : migrateSample(saved.state)
        if (validState(migrated, fixture())) {
          state = migrated
          // Only previously validated prepared receipts may lose the workspace-reserved marker.
          for (const job of state.jobs) {
            delete job.generation.inputs.inputStamp
            const row = state.canvases[job.generation.ideaId].generations.find((g) => g.id === job.generation.id)!
            delete row.inputs.inputStamp
          }
        }
      }
    }
  } catch { /* Invalid local data starts a fresh, isolated prepared sample. */ }
  // Older scoped samples already reference these files; add only the missing import identities.
  for (const [id, canvas] of Object.entries(fixture().canvases)) {
    state.canvases[id].generations.unshift(...canvas.generations.filter((g) => !state.canvases[id].generations.some((row) => row.id === g.id)))
  }
  function persist() { local.setItem(key, JSON.stringify({ version: 1, state })) }
  function refresh() {
    for (const job of state.jobs) {
      const gen = job.generation
      if (gen.status === 'done') continue
      const age = now() - job.started
      gen.status = age >= (six ? 3200 : 750) ? 'done' : age >= (six ? 500 : 250) ? 'running' : 'queued'
      if (gen.status === 'done') {
        gen.url = preparedAssets.find((a) => a.id === job.assetId)!.relativePath
        gen.finishedAt = job.started + (six ? 3200 : 750)
        gen.actualUsd = 0
      }
      const canvas = state.canvases[gen.ideaId]
      const i = canvas.generations.findIndex((g) => g.id === gen.id)
      if (i >= 0) canvas.generations[i] = copy(gen)
    }
    persist()
  }
  const seed = fixture()
  const bootstrap = {
    local: {
      'trend-finder.signed-in': true,
      'trend-finder.clients.v3': seed.clients,
      'remake.agency.v1': { agencyName: 'Prepared sample workspace', managerName: 'Annie' },
      'remake.role.v2': 'member', 'trend-finder.workspace.v2': ids.clientId,
      'remake.last-client.v1': ids.clientId, 'trend-finder.ideas.v6': state.ideas,
      'trend-finder.live-store.v1': seed.library, 'trend-finder.pulse.v1': {}, 'trend-finder.searches.v1': [],
      'trend-finder.research.v4': [{ id: ids.researchId, clientId: ids.clientId, videoId: ids.videoId, account: seed.library.videos[0].handle, platform: 'instagram', followers: 0, views: 0, url: tofuCase.sourceUrl, keywords: ['tofu', 'okonomiyaki'], hook: tofuCase.title, title: tofuCase.title, notes: 'Prepared source reference. Popularity not available; 0 is the native missing-number sentinel.', loggedAt: preparedAt, source: 'sample', slotId: ids.slotId }],
      'trend-finder.research-slots.v2': [{ id: ids.slotId, clientId: ids.clientId, number: 1, topic: 'Prepared tofu okonomiyaki', createdAt: preparedAt }],
    },
    session: { 'remake.view.v1': 'search' },
  }
  async function request(request: Request): Promise<Response> {
    if (request.signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    const requestEpoch = epoch
    const url = new URL(request.url), path = url.pathname, method = request.method
    // Runtime only hands same-origin /api requests to this adapter. No arbitrary host/path fallback exists.
    if (!path.startsWith('/api/') || url.username || url.password) return error('Unknown prepared route.', 404)
    const queryKeys = [...url.searchParams.keys()]
    if (queryKeys.some((k) => !(['/api/search','/api/search/types'].includes(path) && ['q','platform'].includes(k) || path === '/api/suggest' && k === 'q' || path.endsWith('/cut') && k === 'shots'))) return error('Unknown prepared query.')
    const takeUpload = /^\/api\/ideas\/([^/]+)\/shots\/\d+\/takes$/.exec(path)
    if (method === 'POST' && takeUpload && Object.values(ids.plans).includes(takeUpload[1] as typeof ids.plans.ai)) return error('Prepared footage is view-only. Uploads and real filmed takes are unavailable in this demo.')
    let body: unknown
    if (!['GET', 'HEAD'].includes(method)) {
      const text = await request.text()
      if (text) { try { body = JSON.parse(text) } catch { return error('Expected a prepared JSON request.') } }
    }
    if (request.signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
    if (requestEpoch !== epoch) return error('This prepared session was reset.',409)
    refresh()
    if (['/api/search','/api/search/types'].includes(path)) {
      if (method !== 'GET' || request.body !== null || url.searchParams.getAll('q').length !== 1 || url.searchParams.getAll('platform').length !== 1 || !fixedQuery(url.searchParams.get('q')!) || !Object.prototype.hasOwnProperty.call(preparedSearchResults,url.searchParams.get('platform')!)) return error('Prepared search only supports Tofu Recipe on Instagram and TikTok. No provider was called.')
      return json(path === '/api/search/types' ? { types: {} } : preparedSearchResults[url.searchParams.get('platform') as keyof typeof preparedSearchResults])
    }
    if (path === '/api/suggest') {
      const q = url.searchParams.get('q')
      if (method !== 'GET' || url.searchParams.getAll('q').length !== 1 || !q || !normalizedQuery(q) || !'tofu recipe'.startsWith(normalizedQuery(q))) return error('Only the fixed prepared search suggestion is available.')
      return json({ queries: ['Tofu Recipe'] })
    }
    if (path === '/api/answer' && method === 'POST') {
      const rows = object(body) && Array.isArray(body.videos) ? body.videos : []
      const expected = seed.library.videos.map((v) => ({ id: v.id, platform: v.platform, hook: v.hook, views: v.views, ...(hasScore(v) ? { outlier: outlierScore(v) } : {}), hashtags: v.hashtags!.slice(0,30).map((h) => Array.from(h).slice(0,60).join('')), music: Array.from(v.music ?? '').slice(0,200).join('') }))
      if (!object(body) || !exact(body,['query','videos']) || typeof body.query !== 'string' || !fixedQuery(body.query) || rows.length < 1 || rows.length > expected.length || new Set(rows.map((row) => object(row) ? row.id : null)).size !== rows.length || rows.some((row) => !expected.some((known) => JSON.stringify(row) === JSON.stringify(known)))) return error('Only the allowlisted cached references have a prepared search summary.')
      return json({ lines: [`Prepared search: ${rows.length} saved tofu cooking and recipe references. Only the Ever Green reference has a local breakdown and adapted plan.`], basis: 'Prepared local sample. Instagram cards show a 2 Nov 2026 snapshot; TikTok cards show a 27 Oct 2026 snapshot, not live metrics. Ever Green popularity is unavailable. No provider call.' })
    }
    if (method === 'GET') {
      if (path === '/api/health') return json({ live: true, demo: true, platforms: ['instagram','tiktok'], platformCounts: { instagram: preparedSearchResult.videos.length, tiktok: preparedTikTokSearchResult.videos.length }, resultsPerSearch: seed.library.videos.length, prepared: true })
      if (path === '/api/auth/me') return json({ users: false })
      if (path === '/api/auth/config') return json({ google: false })
      if (path === '/api/clients') return json(state.clients)
      if (path === '/api/ideas') return json(state.ideas, 200, { ETag: `"${state.rev}"` })
      if (path === '/api/library') return json(state.library)
      if (path === `/api/clients/${ids.clientId}/kit`) return json({ items: [] })
      if (path === '/api/gen/models') return json({ models: preparedModels })
      if (path === '/api/gen/budget') return json({ image: { spent: 0, cap: 0 }, video: { spent: 0, cap: 0 }, voice: { spent: 0, cap: 0 } })
      if (path === '/api/production') return json({ ideas: Object.fromEntries(Object.values(ids.plans).map((id) => [id, { cut: true, published: false, activityAt: preparedAt }])) })
    }
    if (method === 'PUT' && path === '/api/ideas') {
      if (!validIdeas(body, seed)) return error('Only the fixed prepared plans may be saved.')
      if (request.headers.has('If-Match') && request.headers.get('If-Match')!.trim().replace(/^W\//,'').replace(/^"|"$/g,'') !== String(state.rev)) return json({ ideas: state.ideas }, 409, { ETag: `"${state.rev}"` })
      state.ideas = copy(body) as State['ideas']; state.rev++; persist()
      return json(state.ideas, 200, { ETag: `"${state.rev}"` })
    }
    if (method === 'PUT' && (path === '/api/clients' || path === '/api/library')) {
      if (path === '/api/library') return validPreparedLibrary(body) ? json(seed.library) : error('Only exact allowlisted cached records and the target breakdown may be saved.')
      if (JSON.stringify(body) !== JSON.stringify(seed.clients)) return error('The prepared case identity cannot be replaced.')
      return json(seed.clients)
    }
    if (path === '/api/analyze' && method === 'POST') {
      if (object(body) && seed.library.videos.slice(1).some((item) => item.url === body.url)) return error('This cached search reference has no local analysis or transcript in the guided demo. Its original source remains available.')
      if (!object(body) || !exact(body, ['url', 'force']) || body.url !== tofuCase.sourceUrl || (body.force !== undefined && typeof body.force !== 'boolean')) return error('Only the fixed reference URL has a prepared analysis.')
      if (state.analyzeStarted === null) { state.analyzeStarted = now(); state.analyzeId = `prepared-tofu-analysis-${++state.sequence}` }
      persist(); return json({ job: state.analyzeId })
    }
    if (state.analyzeId !== null && path === `/api/analyze/${state.analyzeId}` && method === 'GET') {
      if (state.analyzeStarted === null) return error('No prepared analysis was started.', 404)
      const age = now() - state.analyzeStarted, f = seed.library.formats[0]
      return json({ job: state.analyzeId, status: age >= 750 ? 'done' : age >= 250 ? 'running' : 'queued', progress: age >= 750 ? 1 : 0.5, step: 'Loading prepared reference analysis (no provider)', ...(age >= 750 ? { result: { shotList: f.shotList, why: f.why, props: f.props, editorNotes: f.editorNotes, lines: f.lines, needs: f.needs } } : {}) })
    }
    const route = /^\/api\/ideas\/([^/]+)\/(.+)$/.exec(path)
    if (!route || !Object.values(ids.plans).includes(route[1] as typeof ids.plans.ai)) return error('Unknown prepared route or plan.', 404)
    const [, id, action] = route, canvas = state.canvases[id]
    if (action === 'takes' && method === 'GET') return json([])
    if (action === 'canvas') {
      if (method === 'GET') return json(canvas)
      if (method === 'PUT') {
        if (!object(body) || !exact(body, ['version', 'doc']) || !validCanvas(body.doc, id, state, seed)) return error('Invalid prepared canvas or foreign selection.')
        if (body.version !== canvas.version) return json({ error: 'The canvas changed somewhere else. Reload it.', version: canvas.version, doc: canvas.doc }, 409)
        canvas.doc = copy(body.doc); for (const n of canvas.doc.nodes) if ((n.id === c.nodes.image || n.id === c.nodes.video) && n.data.prompt === preparedTutorialPrompt) delete n.data.prompt; canvas.doc.edges = canvas.doc.edges.map((edge) => copy(allowedEdge(edge,id,seed)!)); canvas.version++; persist(); return json({ version: canvas.version })
      }
    }
    if (action === 'gen' && method === 'GET') return json(canvas.generations)
    if (action.startsWith('gen/') && method === 'GET') {
      const generation = canvas.generations.find((g) => action === `gen/${g.id}`)
      return generation ? json(generation) : error('Unknown prepared generation.', 404)
    }
    if (action === 'gen' && method === 'POST') {
      if (!object(body) || !exact(body, ['nodeId','model','prompt','startFrame','references','duration','aspectRatio','resolution','count','canvasVersion','confirm','inputStamp','quoteStamp'])) return error('Unsupported prepared generation parameters.')
      const node = seed.canvases[id].doc.nodes.find((n) => n.id === body.nodeId)
      if (!node || !['storyboard','video'].includes(node.type)) return error('Unknown prepared generation node.')
      const currentNode = canvas.doc.nodes.find((n) => n.id === node.id)
      const kind = node.type === 'video' ? 'video' : 'image'
      const model = node.data.model!
      const prompt = SIX_SHOTS.find(s => s.nodes.image === node.id)?.prompt ?? (node.id === c.nodes.image || node.id === c.nodes.video ? preparedTutorialPrompt : node.data.prompt!)
      const actual = genRequest(canvas.doc,node.id,seed.ideas.find((i) => i.id === id)!.shots!,canvas.generations,null,preparedModels.find((m) => m.id === model))
      if (actual.prompt !== prompt || currentNode?.data.model !== model || (node.id === c.nodes.image || node.id === c.nodes.video) && !!currentNode?.data.prompt?.trim()) return error('Changed prompts or models have no prepared result.')
      const assetId = boundAsset(id, node.id)
      if (!assetId || node.id.startsWith('n_low-macro_')) return error(kind === 'video' ? 'No prepared single-shot motion exists for this shot. The imported full cut is not a generated shot.' : 'No prepared image exists for this route.')
      if (body.canvasVersion !== undefined && body.canvasVersion !== canvas.version) return json({ error: 'The canvas changed somewhere else. Reload it.', version: canvas.version, doc: canvas.doc },409)
      const quoting = body.confirm === false
      if (body.confirm !== undefined && typeof body.confirm !== 'boolean') return error()
      if ((!quoting || body.model !== undefined) && body.model !== model) return error('Only the Prepared playback model is available.')
      if ((!quoting || body.prompt !== undefined) && body.prompt !== prompt) return error('Changed prompts have no prepared result.')
      const startFrame = node.id === c.nodes.video ? actual.startFrame : undefined
      if (node.id === c.nodes.video && (!validFrame(state,id,startFrame) || canvas.doc.nodes.find((n) => n.id === c.nodes.image)?.data.selected !== startFrame)) return error('Choose the prepared S19 image on its connected node before replaying I2V.')
      if ((!quoting && body.startFrame !== startFrame || quoting && body.startFrame !== undefined && body.startFrame !== startFrame) || body.references !== undefined && (!Array.isArray(body.references) || body.references.length !== 0) || body.count !== undefined && body.count !== 1 || body.aspectRatio !== undefined && body.aspectRatio !== '9:16' || body.resolution !== undefined && body.resolution !== '1K' || body.duration !== undefined && (kind !== 'video' || body.duration !== 6)) return error('Foreign references or unsupported prepared inputs.')
      const inputStamp = JSON.stringify([id, node.id, model, prompt, assetId, ...(startFrame ? [startFrame, preparedAssets.find((a) => a.id === 'shoot-high-angle-image')!.sha256] : [])])
      const quoteStamp = `prepared:${canvas.version}:${node.id}`
      if (quoting) return json({ total: 0, unitUsd: 0, count: 1, remaining: { image: 0, video: 0, voice: 0 }, items: [{ nodeId: node.id, model, usd: 0 }], inputStamp, quoteStamp, canvasVersion: canvas.version })
      if (body.inputStamp !== undefined && body.inputStamp !== inputStamp || body.quoteStamp !== undefined && body.quoteStamp !== quoteStamp) return error('The prepared quote changed.',409)
      const existing = state.jobs.find((j) => j.fingerprint === inputStamp && j.generation.status !== 'done')
      if (existing) return json(existing.generation)
      const asset = preparedAssets.find((a) => a.id === assetId)!
      const generation: Generation = { id: `prepared-gen-${++state.sequence}`, ideaId: id, nodeId: node.id, kind, model, inputs: { prompt, references: [], ...(startFrame ? { startFrame } : {}), sentPrompt: `${asset.label}: ${prompt}`, ...(kind === 'video' ? { duration: 6 } : {}) }, status: 'queued', estUsd: 0, actualUsd: null, url: null, error: null, createdAt: now(), finishedAt: null }
      state.jobs.push({ fingerprint: inputStamp, assetId, generation, started: now() }); canvas.generations.push(copy(generation)); persist(); return json(generation)
    }
    if (action === 'edit' && method === 'GET') return json(state.projects[id])
    if (action === 'edit' && method === 'PUT') {
      if (!object(body) || !exact(body,['version','project']) || !validProject(body.project, allSources(state,id), six ? 6 : 21)) return error('Invalid prepared project or unknown source.')
      const edit = state.projects[id]
      if (body.version !== edit.version) return json({ error: 'The edit changed somewhere else. Reload it.', version: edit.version },409)
      edit.project = copy(body.project); edit.version++; state.cuts[id].stale = true; persist(); return json({ version: edit.version })
    }
    if (action === 'edit/sources' && method === 'GET') return json({ sources: allSources(state,id) })
    if (action === 'edit/voice' && method === 'GET') return json({ voices: [] })
    if (action === 'edit/voice/pending' && method === 'GET') return json({ pending: [] })
    if (action === 'edit/export' && method === 'POST') return error('Prepared playback cannot render a new export. The existing file does not include your edits.',409)
    if (action === 'cut' && method === 'GET') return json(state.cuts[id])
    if (action === 'cut/music/file' && method === 'GET') return error('There is no music for this plan.',404)
    if (action === 'cut/review' && method === 'POST') return state.cuts[id].stale ? error('This prepared cut is stale; edits cannot be rendered in playback.',409) : json(state.cuts[id])
    const frame = /^shots\/(\d+)\/frame$/.exec(action)
    if (frame && method === 'POST') {
      const index = Number(frame[1]), shot = seed.ideas.find((i) => i.id === id)!.shots![index]
      if (id !== ids.plans.ai || !shot || !object(body) || !exact(body,['line','purpose']) || body.line !== undefined && body.line !== '' || body.purpose !== undefined && body.purpose !== shot.purpose) return error('Only the fixed prepared image draft can be replayed.')
      return json({ index, frameImage: (six ? SIX_SHOTS.find(s => s.id === shot.id)!.asset : preparedAssets.find((a) => a.id === `image-${shot.id}`)!).relativePath })
    }
    if ((action === 'script' || /^shots\/\d+\/script$/.test(action)) && method === 'POST') {
      if (!object(body) || !exact(body,['force']) || typeof body.force !== 'boolean') return error()
      const shots = seed.ideas.find((i) => i.id === id)!.shots!
      const index = action === 'script' ? null : Number(action.split('/')[1])
      if (index !== null && !shots[index]) return error('Unknown prepared shot.')
      if (!body.force && state.ideas.find((i) => i.id === id)!.shots?.some((s) => s.edited)) return error('The line was edited. Confirm replacement.',409)
      const written = shots.map((s) => ({ line: '', purpose: s.purpose, options: [] }))
      return json(index === null ? { source: 'prepared (no spoken narration)', shots: written } : { source: 'prepared (no spoken narration)', index, ...written[index] })
    }
    return error('Unknown or unsupported prepared action. No provider was called.',404)
  }
  persist()
  return { get bootstrap() { return copy({ ...bootstrap, local: { ...bootstrap.local, 'trend-finder.ideas.v6': state.ideas } }) }, request, reset: () => { const sequence = state.sequence; epoch++; state = six ? sixShotFixtures() : preparedFixtures(); state.sequence = sequence; persist() } }
}

function validCanvas(raw: unknown, id: string, state: State, fixture = preparedFixtures()): raw is CanvasDoc {
  if (!object(raw) || !exact(raw,['nodes','edges','viewport']) || !Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) return false
  const seed = fixture.canvases[id].doc
  const rawNodes = raw.nodes
  const progressive = seed.nodes.some(n => n.id.startsWith('n_six_'))
  if ((!progressive && raw.nodes.length !== seed.nodes.length) || raw.nodes.length > seed.nodes.length || raw.edges.length > seed.edges.length || seed.nodes.some(n => n.type === 'shot' && !rawNodes.some((r: unknown) => object(r) && r.id === n.id))) return false
  const edgeIds = new Set<string>()
  for (const edge of raw.edges) {
    const known = allowedEdge(edge,id,fixture)
    if (!known || edgeIds.has(known.id)) return false
    edgeIds.add(known.id)
  }
  const seen = new Set<string>()
  for (const node of raw.nodes) {
    if (!object(node) || typeof node.id !== 'string' || seen.has(node.id)) return false
    seen.add(node.id)
    const known = seed.nodes.find((n) => n.id === node.id)
    if (!known || node.type !== known.type || node.shotId !== known.shotId || !object(node.position) || !finite(node.position.x) || !finite(node.position.y) || !object(node.data)) return false
    for (const field of ['selected','awaiting']) {
      const genId = node.data[field]
      if (genId !== undefined && genId !== null && !state.canvases[id].generations.some((g) => g.id === genId && g.nodeId === node.id)) return false
    }
    if (node.data.awaitingBatch !== undefined && (!Array.isArray(node.data.awaitingBatch) || node.data.awaitingBatch.some((genId) => !state.canvases[id].generations.some((g) => g.id === genId && g.nodeId === node.id)))) return false
  }
  return raw.viewport === undefined || object(raw.viewport) && finite(raw.viewport.x) && finite(raw.viewport.y) && finite(raw.viewport.zoom) && raw.viewport.zoom > 0
}
function validProject(raw: unknown, sources: State['sources'][string], shotCount = 21): raw is EditProject {
  if (!object(raw) || !exact(raw,['fps','width','height','clips','texts','captions','music','voiceover','primaries','showLogo','logoSize','logoCorner']) || raw.fps !== 30 || raw.width !== 1080 || raw.height !== 1920 || !Array.isArray(raw.clips) || !Array.isArray(raw.texts) || !Array.isArray(raw.voiceover) || raw.voiceover.length !== 0 || raw.music !== null || !object(raw.primaries) || !object(raw.captions) || typeof raw.captions.enabled !== 'boolean' || typeof raw.showLogo !== 'boolean' || !['small','medium','large'].includes(String(raw.logoSize)) || !['top-left','top-right','bottom-left','bottom-right'].includes(String(raw.logoCorner))) return false
  const validSource = (src: unknown) => object(src) && exact(src,['kind','id','nodeId','shotId']) && sources.some((s) => src.kind === s.kind && src.id === s.id && (src.nodeId === undefined || src.nodeId === s.nodeId) && (src.shotId === undefined || src.shotId === s.shotId || s.id === 'prepared-source-derived-cut' && /^s([1-9]|1[0-9]|2[01])$/.test(String(src.shotId)) && Number(String(src.shotId).slice(1)) <= shotCount))
  let total = 0
  const seen = new Set()
  for (const clip of raw.clips) {
    if (!object(clip) || !exact(clip,['id','source','in','out','volume','muted','caption']) || typeof clip.id !== 'string' || seen.has(clip.id) || !validSource(clip.source) || !finite(clip.in) || !finite(clip.out) || !finite(clip.volume) || clip.in < 0 || clip.out - clip.in < 0.2 - 1e-9 || clip.volume < 0 || clip.volume > 2 || typeof clip.muted !== 'boolean') return false
    const src = clip.source as Obj
    if (clip.out > sources.find((s) => s.id === src.id)!.duration) return false
    seen.add(clip.id); total += clip.out - clip.in
  }
  if (total > 180 || Object.values(raw.primaries).some((s) => !validSource(s))) return false
  return raw.texts.every((t) => object(t) && exact(t,['id','text','start','end','position','color']) && typeof t.id === 'string' && typeof t.text === 'string' && finite(t.start) && finite(t.end) && t.start >= 0 && t.end > t.start && ['top','middle','bottom'].includes(String(t.position)) && ['brand','white','black'].includes(String(t.color)))
}
function validState(value: unknown, seed = preparedFixtures()): value is State {
  if (!object(value)) return false
  const s = value as State
  try {
    if (JSON.stringify(s.clients) !== JSON.stringify(seed.clients) || JSON.stringify(s.library) !== JSON.stringify(seed.library) || JSON.stringify(s.sources) !== JSON.stringify(seed.sources) || !Number.isInteger(s.rev) || !Number.isInteger(s.sequence) || !Array.isArray(s.jobs) || !validIdeas(s.ideas, seed)) return false
    if (new Set(s.jobs.map((job) => job.generation.id)).size !== s.jobs.length) return false
    for (const id of Object.values(ids.plans)) {
      if (new Set(s.canvases[id].generations.map((g) => g.id)).size !== s.canvases[id].generations.length) return false
      if (!s.canvases[id] || !validCanvas(s.canvases[id].doc,id,s,seed) || !Number.isInteger(s.canvases[id].version) || !validProject(s.projects[id].project,allSources(s,id),seed.ideas.find(idea => idea.id === id)!.shots!.length)) return false
      if (s.cuts[id].output?.url !== seed.cuts[id].output?.url || s.cuts[id].review?.status !== 'waiting') return false
      if (s.canvases[id].generations.some((g) => {
        const imported = seed.canvases[id].generations.find((row) => row.id === g.id)
        return imported ? JSON.stringify(g) !== JSON.stringify(imported) : !s.jobs.some((j) => j.generation.id === g.id && j.generation.ideaId === id && JSON.stringify(j.generation) === JSON.stringify(g))
      })) return false
    }
    return s.jobs.every((j) => {
      const g = j.generation
      const node = seed.canvases[g.ideaId]?.doc.nodes.find((n) => n.id === g.nodeId)
      const asset = preparedAssets.find((a) => a.id === j.assetId)
      const tutorial = g.nodeId === c.nodes.image || g.nodeId === c.nodes.video
      const prompt = SIX_SHOTS.find(s => s.nodes.image === g.nodeId)?.prompt ?? (tutorial ? preparedTutorialPrompt : node?.data.prompt)
      const legacyPrompt = `Prepared S19 ${g.nodeId.includes('low-macro') ? 'low-macro' : 'high-angle'} alternative`
      const legacy = tutorial && g.inputs.prompt === legacyPrompt && !g.inputs.startFrame && g.model === `prepared-${g.kind}`
      const expectedPrompt = legacy ? legacyPrompt : prompt
      const expectedModel = legacy ? `prepared-${g.kind}` : node?.data.model
      const stamp = JSON.stringify([g.ideaId, g.nodeId, expectedModel, expectedPrompt, asset?.id, ...(g.inputs.startFrame ? [g.inputs.startFrame, preparedAssets.find((a) => a.id === 'shoot-high-angle-image')!.sha256] : [])])
      return !!node && !!asset && asset.id === boundAsset(g.ideaId,g.nodeId) && j.fingerprint === stamp && (g.inputs.inputStamp === undefined || g.inputs.inputStamp === stamp) && g.inputs.prompt === expectedPrompt && g.kind === asset.kind && JSON.stringify(g.inputs.references ?? []) === '[]' && g.inputs.sentPrompt === `${asset.label}: ${expectedPrompt}` && (g.kind === 'video' ? g.inputs.duration === 6 : g.inputs.duration === undefined) && g.model === expectedModel && (g.inputs.startFrame ? validFrame(s,g.ideaId,g.inputs.startFrame) : legacy || g.nodeId !== c.nodes.video) && (g.url === null || g.url === asset.relativePath) && finite(j.started) && g.estUsd === 0 && (g.actualUsd === 0 || g.actualUsd === null) && ['queued','running','done'].includes(g.status) && JSON.stringify(s.canvases[g.ideaId].generations.find((row) => row.id === g.id)) === JSON.stringify(g)
    })
  } catch { return false }
}

function validIdeas(value: unknown, seed = preparedFixtures()): value is State['ideas'] {
  return Array.isArray(value) && value.length === 2 && value.every((idea, i) => {
    if (!object(idea) || idea.id !== seed.ideas[i].id || idea.clientId !== ids.clientId || idea.videoId !== ids.videoId || idea.status !== 'approved' || !Array.isArray(idea.shots) || idea.shots.length !== seed.ideas[i].shots!.length) return false
    return idea.shots.every((shot, index) => {
      if (!object(shot)) return false
      const { frameImage, palette, ...base } = shot
      const expected = seed.ideas[i].shots![index]
      return JSON.stringify(base) === JSON.stringify(expected) && (frameImage === undefined || frameImage === (seed.ideas[i].shots!.length === 6 ? SIX_SHOTS.find(s => s.id === expected.id)?.asset : preparedAssets.find((a) => a.id === `image-${expected.id}`))?.relativePath) && (palette === undefined || Array.isArray(palette) && palette.every((color) => typeof color === 'string' && /^#[a-f0-9]{6}$/i.test(color)))
    }) && (idea.script === undefined || object(idea.script) && Array.isArray(idea.script.lines) && idea.script.lines.length === seed.ideas[i].shots!.length && idea.script.lines.every((line) => object(line) && line.say === '' && typeof line.onScreen === 'string'))
  })
}

function allSources(state: State, id: string): State['sources'][string] {
  return [...state.sources[id], ...state.canvases[id].generations.filter((g) => g.kind === 'video' && g.status === 'done' && g.model !== 'imported').flatMap((g) => {
    const asset = preparedAssets.find((a) => a.id === boundAsset(id,g.nodeId))
    if (!asset || g.url !== asset.relativePath) return []
    return [{ key: `generation:${g.id}`, kind: 'generation' as const, id: g.id, url: asset.relativePath, duration: 5.875, hasAudio: false, width: 768, height: 1364, nodeId: g.nodeId, shotId: 's19' }]
  })]
}

function validFrame(state: State, id: string, frame: unknown): boolean {
  const asset = preparedAssets.find((a) => a.id === 'shoot-high-angle-image')!
  return typeof frame === 'string' && state.canvases[id].generations.some((g) => g.id === frame && g.ideaId === id && g.nodeId === c.nodes.image && g.kind === 'image' && g.status === 'done' && g.url === asset.relativePath && g.model === 'prepared-image')
}

function migrateSample(saved: State): State {
  const state = copy(saved), seed = preparedFixtures()
  const legacyLibrary = copy(state.library)
  for (const video of legacyLibrary.videos) if (video.platform === 'instagram' && video.id !== ids.videoId && seed.library.videos.some((known) => known.id === video.id) && video.fetchedAt === preparedAt) video.fetchedAt = preparedCacheFetchedAt
  if (validPreparedLibrary(legacyLibrary)) state.library = copy(seed.library)
  for (const id of Object.values(ids.plans)) {
    const canvas = state.canvases[id], expected = seed.canvases[id]
    const legacy = !canvas.doc.nodes.some((n) => n.id === c.nodes.prompt)
    if (legacy && canvas.doc.edges.length) return state
    for (const node of expected.doc.nodes) if (!canvas.doc.nodes.some((n) => n.id === node.id)) canvas.doc.nodes.push(copy(node))
    if (legacy) {
      canvas.doc.edges = copy(expected.doc.edges)
      for (const node of canvas.doc.nodes) if (node.id === c.nodes.image || node.id === c.nodes.video) {
        if (node.data.prompt === 'Prepared S19 high-angle alternative') delete node.data.prompt
        if (node.data.model === 'prepared-video') node.data.model = 'prepared-i2v'
      }
    }
    for (const imported of expected.generations) {
      const row = canvas.generations.find((g) => g.id === imported.id)
      if (!row) canvas.generations.unshift(copy(imported))
      else if (legacy && row.model === 'imported' && ['n_high-angle_video','n_low-macro_video'].includes(row.nodeId)) row.nodeId = imported.nodeId
    }
    const normalizeSource = (source: State['sources'][string][number]) => {
      const known = seed.sources[id].find((s) => s.id === source.id)
      return known && ['n_high-angle_video','n_low-macro_video'].includes(source.nodeId ?? '') ? { ...source, nodeId: known.nodeId } : source
    }
    if (!state.sources[id].every((source) => seed.sources[id].some((known) => JSON.stringify(normalizeSource(source)) === JSON.stringify(known)))) return state
    state.sources[id] = copy(seed.sources[id])
    const project = state.projects[id].project
    for (const source of Object.values(project.primaries)) if (id === ids.plans.shoot && ['shoot-high-angle-video','shoot-low-macro-video'].includes(source.id) && ['n_high-angle_video','n_low-macro_video'].includes(source.nodeId ?? '')) source.nodeId = c.nodes.footage
    for (const clip of project.clips) {
      if (clip.source.id === 'prepared-source-derived-cut' && !clip.source.shotId) {
        const shot = /^prepared-clip-(s([1-9]|1[0-9]|2[01]))$/.exec(clip.id)
        if (shot) clip.source.shotId = shot[1]
      }
      if (id === ids.plans.shoot && ['shoot-high-angle-video','shoot-low-macro-video'].includes(clip.source.id) && ['n_high-angle_video','n_low-macro_video'].includes(clip.source.nodeId ?? '')) clip.source.nodeId = c.nodes.footage
    }
  }
  return state
}

function allowedEdge(edge: unknown, id: string, fixture = preparedFixtures()) {
  if (!object(edge) || !exact(edge,['id','source','sourceHandle','target','targetHandle'])) return undefined
  return fixture.canvases[id].doc.edges.find((known) => (edge.id === known.id || edge.id === `e_${known.source}_${known.target}_${known.targetHandle}`) && ['source','sourceHandle','target','targetHandle'].every((key) => edge[key] === known[key as keyof typeof known]))
}

function validPreparedLibrary(raw: unknown): boolean {
  const seed = preparedFixtures().library
  if (!object(raw) || !exact(raw,['videos','formats']) || !Array.isArray(raw.videos) || !Array.isArray(raw.formats) || raw.videos.length < 1 || raw.videos.length > seed.videos.length || raw.formats.length !== raw.videos.length) return false
  const videoIds = new Set(), formatIds = new Set()
  for (const video of raw.videos) {
    if (!object(video) || typeof video.id !== 'string' || videoIds.has(video.id) || !Array.isArray(video.keywords) || video.keywords.length !== 1 || typeof video.keywords[0] !== 'string' || !fixedQuery(video.keywords[0])) return false
    const known = seed.videos.find((v) => v.id === video.id)
    // Canonical cache rows retain age at capture; accept only the exact native current publication age as well.
    const source = preparedTikTokSearchResult.videos.find((item) => `tt-${item.id}` === video.id)
    const nativeAge = source ? Math.max(0,Math.round((Date.now() - Date.parse(source.createTime)) / 86400000)) : undefined
    if (!known || JSON.stringify({ ...video, ...(source && video.daysAgo === nativeAge ? { daysAgo: known.daysAgo } : {}), keywords: ['tofu'] }) !== JSON.stringify(known)) return false
    videoIds.add(video.id); formatIds.add(known.formatId)
  }
  const allowedFormats = [...seed.formats, ...preparedSupplementFormats('zh-Hant')], seen = new Set()
  for (const format of raw.formats) {
    if (!object(format) || seen.has(format.id) || !formatIds.has(format.id) || !allowedFormats.some((known) => JSON.stringify(known) === JSON.stringify(format))) return false
    seen.add(format.id)
  }
  return true
}
