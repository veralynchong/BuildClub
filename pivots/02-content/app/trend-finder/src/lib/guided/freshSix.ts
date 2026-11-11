import { OPENING_MODEL, OPENING_NODE, OPENING_VERSIONS, openingVersion } from './shootOpening.ts'
import { FULL_AI_ASSETS, fullCutMode } from './fullAssets.ts'
import { createSixShotData } from './prepared.ts'
import { SIX_SHOTS } from './sixShot.ts'
import { FRESH_ASSETS } from './freshAssets.ts'
import { GUIDED_IDS, type GuidedRoute, type PreparedData } from './contracts.ts'
import type { StartGenBody } from '../canvas/api.ts'
import { genRequest } from '../canvas/graph.ts'
import type { CanvasDoc, Generation, GenModel } from '../canvas/types.ts'
import type { SavedIdea } from '../../types.ts'
import { placeShotClip, isOnTimeline, newClipId } from '../editor/timeline.ts'
import type { EditProject, ClipSource } from '../editor/types.ts'

export const SHOOT_OPENING_V2 = '/demo-assets/fresh-six/ai-s1-parent.png'

export const freshRoute = (id: string): GuidedRoute | null => id === GUIDED_IDS.plans.ai ? 'ai' : id === GUIDED_IDS.plans.shoot ? 'shoot' : null
export const freshNodes = (index: number) => ({ shot: `n_shot_s${index + 1}`, prompt: `n_six_prompt_s${index + 1}`, image: `n_six_image_s${index + 1}`, video: `n_six_video_s${index + 1}` })
const isI2V = (i: number) => i === 0 || i === 4
const hasMotion = (i: number) => [0, 3, 4].includes(i)
const assetsFor = (route: GuidedRoute, full: boolean) => route === 'ai' && full ? FULL_AI_ASSETS : FRESH_ASSETS
export const freshPrompt = (i: number, route: GuidedRoute, full = fullCutMode()) => route === 'ai' && full ? `Part ${i + 1}: ${SIX_SHOTS[i].title}. Original 21-shot AI master, continuous frames ${FULL_AI_ASSETS[i].startFrame}–${FULL_AI_ASSETS[i].endFrame - 1}. Replay existing film; no new generation.` : `${SIX_SHOTS[i].title}. ${SIX_SHOTS[i].copy} ${route === 'shoot' ? 'Storyboard reference for filming; not filmed footage.' : 'Prepared AI material replay; no new provider call.'}`
export function freshTemplate(route: GuidedRoute, full = fullCutMode()): CanvasDoc {
  full = full && route === 'ai'
  const assets = assetsFor(route, full)
  const nodes: CanvasDoc['nodes'] = []
  const edges: CanvasDoc['edges'] = []
  SIX_SHOTS.forEach((shot, i) => {
    const ids = freshNodes(i), x = i * 1200
    nodes.push({ id: ids.shot, type: 'shot', shotId: shot.id, position: { x, y: 0 }, data: full ? { model: 'prepared-full-cut' } : {} },
      { id: ids.prompt, type: 'prompt', shotId: shot.id, position: { x, y: 260 }, data: { text: freshPrompt(i, route, full) } },
      { id: ids.image, type: 'storyboard', shotId: shot.id, position: { x: x + 420, y: 260 }, data: { model: full ? 'prepared-full-frame' : 'prepared-image', selected: null, primary: true } })
    edges.push({ id: `fresh-${route}-${shot.id}-prompt-image`, source: ids.prompt, sourceHandle: 'out', target: ids.image, targetHandle: 'in:text' })
    if (route === 'shoot' && i === 0) {
      nodes.push({ id: ids.video, type: 'video', shotId: shot.id, position: { x: x + 420, y: 1000 }, data: { model: OPENING_MODEL, prompt: OPENING_VERSIONS[0].prompt, duration: 1.4, selected: null } })
    }
    if (route === 'ai' && (full || hasMotion(i))) {
      nodes.push({ id: ids.video, type: 'video', shotId: shot.id, position: { x: x + 420, y: 1000 }, data: { model: full ? 'prepared-full-cut' : isI2V(i) ? 'prepared-i2v' : 'prepared-video', duration: assets[i].duration, selected: null } })
      edges.push({ id: `fresh-ai-${shot.id}-prompt-video`, source: ids.prompt, sourceHandle: 'out', target: ids.video, targetHandle: 'in:text' })
      if (!full && isI2V(i)) edges.push({ id: `fresh-ai-${shot.id}-image-video`, source: ids.image, sourceHandle: 'out', target: ids.video, targetHandle: 'in:start' })
    }
  })
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 0.8 } }
}
export function materializeFresh(doc: CanvasDoc, requested: readonly string[], route: GuidedRoute): CanvasDoc {
  const template = freshTemplate(route, doc.nodes.some(n => n.data.model === 'prepared-full-cut'))
  const additions = template.nodes.filter(n => requested.includes(n.id) && !doc.nodes.some(old => old.id === n.id))
  if (!additions.length) return doc
  const nodes = [...doc.nodes, ...additions]
  return { ...doc, nodes, edges: [...doc.edges, ...template.edges.filter(e => nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target) && !doc.edges.some(old => old.id === e.id))] }
}
function mediaFor(route: GuidedRoute, index: number, kind: 'image' | 'video', full = false) {
  if (route === 'ai' && full) return kind === 'video' ? FULL_AI_ASSETS[index].videoUrl : FULL_AI_ASSETS[index].imageUrl
  const asset = FRESH_ASSETS[index]
  if (kind === 'video') return asset.videoUrl
  if (route === 'shoot') return SIX_SHOTS[index].asset.relativePath
  return isI2V(index) && 'parentUrl' in asset ? asset.parentUrl : asset.imageUrl
}
export function freshThumbnail(route: GuidedRoute, index: number, full = false): string | undefined {
  return index >= 0 && index < SIX_SHOTS.length ? mediaFor(route, index, 'image', full) : undefined
}
export function freshSourceFor(route: GuidedRoute, gen: Generation): ClipSource | null {
  if (route === 'shoot' && gen.nodeId === OPENING_NODE && gen.model === OPENING_MODEL && gen.kind === 'video' && gen.status === 'done') {
    const version = openingVersion(gen.inputs.prompt)
    return version && gen.url === version.url ? { kind: 'generation', id: version.sourceId, shotId: 's1', nodeId: OPENING_NODE } : null
  }

  const index = SIX_SHOTS.findIndex((_, i) => gen.nodeId === freshNodes(i).image || gen.nodeId === freshNodes(i).video)
  if (index < 0 || gen.status !== 'done' || !gen.url) return null
  const full = route === 'ai' && gen.model.startsWith('prepared-full-')
  const requiredKind = route === 'ai' && (full || hasMotion(index)) ? 'video' : 'image'
  const variant = route === 'shoot' && index === 0 && gen.kind === 'image' && gen.url === SHOOT_OPENING_V2
  if (gen.kind !== requiredKind || !variant && gen.url !== mediaFor(route, index, requiredKind, full)) return null
  return { kind: 'generation', id: `${route}-s${index + 1}${variant ? '-v2' : ''}`, shotId: `s${index + 1}`, nodeId: requiredKind === 'video' ? freshNodes(index).video : freshNodes(index).image }
}
export function placeFreshSource(project: EditProject, source: ClipSource, duration: number): EditProject {
  if (isOnTimeline(project, source)) return project
  const next = placeShotClip(project, source, duration, SIX_SHOTS.map(shot => shot.id), newClipId(project))
  return next === project ? project : { ...next, primaries: {}, clips: next.clips.map(clip => clip.source.id === source.id ? { ...clip, muted: true, volume: 0 } : clip) }
}
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
export function createFreshSixData(local: Storage, session: Storage, now: () => number = Date.now, full = false): PreparedData {
  const base = createSixShotData(local, session)
  const bootstrap = structuredClone(base.bootstrap)
  const originals = bootstrap.local['trend-finder.ideas.v6'] as SavedIdea[]
  let ideas = originals.map(idea => {
    const route = freshRoute(idea.id)!
    const assets = assetsFor(route, full)
    let cursor = 0
    const shots = idea.shots!.map((shot, index) => {
      const start = cursor; cursor = Math.round((cursor + assets[index].duration) * 30) / 30
      return { ...shot, time: `${start.toFixed(2)}-${cursor.toFixed(2)}s`, shot: freshPrompt(index, route, full), tip: route === 'shoot' ? 'Plan framing, hands, props and lighting. Preview is a reference animatic, not filmed footage.' : assets[index].provenance }
    })
    return { ...idea, notes: route === 'ai' ? full ? 'Original 21-shot AI master split into six continuous parts. Original captions are baked in; original audio is silent. No new generation.' : 'Prepared real AI material. Local edits and export are real; no new provider call or human approval.' : 'Six-shot filming plan and source-derived reference animatic; no filmed take.', shots, script: idea.script ? { ...idea.script, lines: SIX_SHOTS.map(shot => ({ say: shot.copy, onScreen: shot.copy })), basedOn: JSON.stringify(shots.map(shot => [shot.shot, '', ''])) } : idea.script }
  })
  const ideasKey = full ? 'full-ai-six-ideas.v1' : 'fresh-six-ideas.v1'
  try { const saved = JSON.parse(local.getItem(ideasKey) ?? 'null'); if (Array.isArray(saved) && saved.length === 2 && saved.every(idea => freshRoute(idea.id) && idea.shots?.length === 6)) ideas = saved } catch { /* Scoped demo draft only. */ }
  const scriptPrefillKey = `${ideasKey}:script-prefill.v1`
  if (!local.getItem(scriptPrefillKey)) {
    ideas = ideas.map(idea => {
      const script = idea.script
      const emptyDefault = script && !script.edited && Array.isArray(script.lines) && script.lines.length === SIX_SHOTS.length && script.lines.every((line, i) => typeof line?.say === 'string' && typeof line.onScreen === 'string' && !line.say.trim() && (!line.onScreen.trim() || line.onScreen === `Adapted copy: ${SIX_SHOTS[i].copy}`))
      return emptyDefault ? { ...idea, script: { ...script, lines: SIX_SHOTS.map(shot => ({ say: shot.copy, onScreen: shot.copy })) } } : idea
    })
    local.setItem(ideasKey, JSON.stringify(ideas))
    local.setItem(scriptPrefillKey, 'true')
  }
  bootstrap.local['trend-finder.ideas.v6'] = ideas

  const models: GenModel[] = [
    { id: OPENING_MODEL, kind: 'video', label: 'Prepared prompt demo · no live generation', available: true, inputs: { text: 'required' }, durations: [1.4], typicalSeconds: 1, usdPerRun: 0 },
    { id: 'prepared-image', kind: 'image', label: 'Prepared image replay · no provider', available: true, inputs: { text: 'required' }, aspects: ['9:16'], resolutions: ['1K'], maxCount: 1, typicalSeconds: 1, usdPerRun: 0 },
    { id: 'prepared-video', kind: 'video', label: 'Prepared T2V / imported motion', available: true, inputs: { text: 'required' }, aspects: ['9:16'], resolutions: ['1K'], durations: [1.4, 1.5, 2.8], typicalSeconds: 1, usdPerRun: 0 },
    { id: 'prepared-i2v', kind: 'video', label: 'Prepared I2V · exact original parent', available: true, inputs: { text: 'required', startFrame: 'required' }, aspects: ['9:16'], resolutions: ['1K'], durations: [1.4, 2.8], typicalSeconds: 1, usdPerRun: 0 },
    ...(full ? [{ id: 'prepared-full-frame', kind: 'image', label: 'Original-cut frame replay · no generation', available: true, inputs: { text: 'required' }, aspects: ['9:16'], resolutions: ['1K'], maxCount: 1, typicalSeconds: 1, usdPerRun: 0 }, { id: 'prepared-full-cut', kind: 'video', label: 'Original-cut part replay · no generation', available: true, inputs: { text: 'required' }, aspects: ['9:16'], resolutions: ['1K'], durations: FULL_AI_ASSETS.map(asset => asset.duration), typicalSeconds: 1, usdPerRun: 0 }] : []),
  ].map(model => ({ ...model, provider: 'prepared', endpoint: '', tier: 'demo', price: { per: 'run', usd: 0 }, priceCheckedAt: '2026-11-06' })) as GenModel[]
  type RouteState = { version: number; doc: CanvasDoc; generations: Generation[]; jobs: { id: string; started: number; url: string }[] }
  const empty = (route: GuidedRoute): RouteState => { const template = freshTemplate(route, full); return { version: 1, doc: { ...template, nodes: template.nodes.filter(n => n.type === 'shot'), edges: [] }, generations: [], jobs: [] } }
  const key = full ? 'full-ai-six.v1' : 'fresh-six.v1'
  let state: { sequence: number; ai: RouteState; shoot: RouteState } = { sequence: 0, ai: empty('ai'), shoot: empty('shoot') }
  try { const saved = JSON.parse(local.getItem(key) ?? 'null'); if (saved && Number.isInteger(saved.sequence) && saved.ai?.doc && saved.shoot?.doc) state = saved } catch { /* A malformed scoped draft starts empty. */ }
  const persist = () => local.setItem(key, JSON.stringify(state))
  function refresh(route: GuidedRoute) {
    for (const job of state[route].jobs) {
      const gen = state[route].generations.find(g => g.id === job.id)!
      gen.status = now() - job.started >= 1500 ? 'done' : now() - job.started >= 300 ? 'running' : 'queued'
      if (gen.status === 'done') { gen.url = job.url; gen.finishedAt = job.started + 1500; gen.actualUsd = 0 }
    }
    persist()
  }
  return { bootstrap, reset: () => base.reset(), request: async request => {
    const url = new URL(request.url)
    if (url.pathname === '/api/ideas') {
      if (request.method === 'GET') return response(ideas)
      if (request.method === 'PUT') {
        const body = await request.json().catch(() => null)
        if (!Array.isArray(body) || body.length !== 2 || new Set(body.map(idea => idea.id)).size !== 2 || body.some(idea => !freshRoute(idea.id) || idea.shots?.length !== 6 || idea.shots.some((shot: { id: string }, index: number) => shot.id !== `s${index + 1}`))) return response({ error: 'Only this six-shot example can be saved.' }, 422)
        ideas = body; local.setItem(ideasKey, JSON.stringify(ideas)); return response(ideas)
      }
    }
    if (url.pathname === '/api/gen/models') return response({ models })
    const match = /^\/api\/ideas\/(guided-tofu-ai|guided-tofu-shoot)\/(canvas|gen(?:\/[^/]+)?)$/.exec(url.pathname)
    if (!match) return base.request(request)
    const route = freshRoute(match[1])!, action = match[2], current = state[route]
    refresh(route)
    if (request.method === 'GET') {
      if (action === 'canvas') return response({ version: current.version, doc: current.doc, generations: current.generations, takes: [] })
      if (action === 'gen') return response(current.generations)
      const gen = current.generations.find(g => action === `gen/${g.id}`)
      return gen ? response(gen) : response({ error: 'Unknown replay.' }, 404)
    }
    let body: Partial<StartGenBody> & { version?: number; doc?: CanvasDoc }
    try {
      const parsed: unknown = await request.json()
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return response({ error: 'Invalid replay request.' }, 422)
      body = parsed as typeof body
    } catch { return response({ error: 'Invalid replay request.' }, 422) }
    if (action === 'canvas' && request.method === 'PUT') {
      if (body.version !== current.version) return response({ error: 'Canvas changed. Reload it.', version: current.version, doc: current.doc }, 409)
      const template = freshTemplate(route, full)
      const doc = body.doc as CanvasDoc
      if (!doc || !Array.isArray(doc.nodes) || !Array.isArray(doc.edges) || new Set(doc.nodes.map(n => n.id)).size !== doc.nodes.length || doc.nodes.some(n => !template.nodes.some(t => t.id === n.id && t.type === n.type && t.shotId === n.shotId) || n.data.selected && !current.generations.some(g => g.id === n.data.selected && g.nodeId === n.id)) || doc.edges.some(e => !template.edges.some(t => JSON.stringify(t) === JSON.stringify(e)))) return response({ error: 'Unknown prepared node, edge or selection.' }, 422)
      current.doc = doc; current.version++; persist(); return response({ version: current.version })
    }
    if (action !== 'gen' || request.method !== 'POST') return response({ error: 'Unsupported prepared action.' }, 405)
    const index = SIX_SHOTS.findIndex((_, i) => body.nodeId === freshNodes(i).image || body.nodeId === freshNodes(i).video)
    const node = current.doc.nodes.find(n => n.id === body.nodeId)
    if (index < 0 || !node || !['storyboard', 'video'].includes(node.type)) return response({ error: 'Unknown prepared result.' }, 422)
    const kind = node.type === 'video' ? 'video' : 'image'
    const opening = route === 'shoot' && node.id === OPENING_NODE
    const imageOpening = route === 'shoot' && node.id === freshNodes(0).image ? openingVersion(node.data.prompt) : undefined
    const chosen = opening ? openingVersion(node.data.prompt) : undefined
    if (opening && !chosen) return response({ error: 'This prepared demo supports the two sample prompts shown on the card. Choose a sample prompt; no live generation is available.' }, 422)
    const prompt = chosen?.prompt ?? imageOpening?.prompt ?? freshPrompt(index, route, full), model = node.data.model
    const expected = freshTemplate(route, full).nodes.find(n => n.id === node.id)!
    if (model !== expected.data.model) return response({ error: 'This prepared model cannot change.' }, 422)
    if (body.confirm === false) {
      const actual = genRequest(current.doc, node.id, [], current.generations, null, models.find(m => m.id === model))
      body = { ...actual, ...body }
    }
    if (body.duration !== undefined && (kind !== 'video' || body.duration !== assetsFor(route, full)[index].duration)) return response({ error: 'Unsupported prepared duration.' }, 422)
    if (body.canvasVersion !== undefined && body.canvasVersion !== current.version) return response({ error: 'Canvas changed.', version: current.version }, 409)
    if (body.prompt !== undefined && body.prompt !== prompt || body.model !== undefined && body.model !== model || body.references?.length || body.count !== undefined && body.count !== 1 || body.aspectRatio !== undefined && body.aspectRatio !== '9:16' || body.resolution !== undefined && body.resolution !== '1K') return response({ error: 'Only this exact prepared input can replay.' }, 422)
    const parent = current.generations.find(g => g.id === body.startFrame)
    const needsParent = route === 'ai' && kind === 'video' && !full && isI2V(index)
    if (needsParent && (!parent || parent.nodeId !== freshNodes(index).image || parent.status !== 'done' || parent.url !== mediaFor(route, index, 'image') || current.doc.nodes.find(n => n.id === parent.nodeId)?.data.selected !== parent.id || !current.doc.edges.some(e => e.source === parent.nodeId && e.target === node.id && e.targetHandle === 'in:start'))) return response({ error: 'Select this shot’s exact original parent image first.' }, 422)
    if (!needsParent && body.startFrame) return response({ error: 'This replay has no image-to-video parent.' }, 422)
    const stamp = JSON.stringify([route, node.id, prompt, model, body.startFrame ?? null])
    const quote = `fresh:${current.version}:${node.id}`
    if (body.confirm === false) return response({ total: 0, unitUsd: 0, count: 1, remaining: { image: 0, video: 0, voice: 0 }, items: [{ nodeId: node.id, model, usd: 0 }], inputStamp: stamp, quoteStamp: quote, canvasVersion: current.version })
    if (body.inputStamp !== stamp || body.quoteStamp !== quote) return response({ error: 'Quote changed. Confirm again.' }, 409)
    const pending = current.generations.find(g => g.nodeId === node.id && g.status !== 'done')
    if (pending) return response(pending)
    const gen: Generation = { id: `fresh-${route}-${++state.sequence}`, ideaId: match[1], nodeId: node.id, kind, model: model!, inputs: { prompt, sentPrompt: prompt, references: [], ...(needsParent ? { startFrame: parent!.id } : {}), ...(kind === 'video' ? { duration: assetsFor(route, full)[index].duration } : {}) }, status: 'queued', estUsd: 0, actualUsd: null, url: null, error: null, createdAt: now(), finishedAt: null }
    const alternate = route === 'shoot' && index === 0 && kind === 'image' && current.generations.filter(g => g.nodeId === node.id && g.status === 'done').length % 2 === 1
    current.generations.push(gen); current.jobs.push({ id: gen.id, started: now(), url: chosen?.url ?? (imageOpening ? (imageOpening === OPENING_VERSIONS[0] ? SIX_SHOTS[0].asset.relativePath : SHOOT_OPENING_V2) : alternate ? SHOOT_OPENING_V2 : mediaFor(route, index, kind, full)) }); persist(); return response(gen)
  } }
}
