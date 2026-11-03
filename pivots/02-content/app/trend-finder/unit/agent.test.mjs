import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyAgentPlan, askAgent, planCost } from '../src/lib/canvas/agent.ts'

const node = (id, type, shotId, data = {}) => ({ id, type, ...(shotId ? { shotId } : {}), position: { x: 0, y: 0 }, data })
const empty = {
  nodes: [node('n_shot_s1', 'shot', 's1'), node('n_kit', 'kit', undefined, { kitItems: [] })],
  edges: [],
}
const full = {
  nodes: [...empty.nodes, node('n_sb_s1', 'storyboard', 's1', { primary: true }), node('n_vid_s1', 'video', 's1')],
  edges: [{ id: 'e_s', source: 'n_sb_s1', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:start' }],
}
const plan = { source: 'demo', shotId: 's1', storyboard: { prompt: 'A', model: 'mock-image' }, video: { prompt: 'B', model: 'mock-video', duration: 6 }, planUsd: 0 }
const models = [
  { id: 'mock-image', kind: 'image', available: true, inputs: { text: 'required' }, price: { per: 'image', usd: 0.04 } },
  { id: 'mock-video', kind: 'video', available: true, inputs: { text: 'required', startFrame: 'optional' }, price: { per: 'second', usd: 0.05 }, durations: [4, 6] },
]

test('applyAgentPlan builds a storyboard and a wired video in an empty frame', () => {
  const r = applyAgentPlan(empty, 's1', plan, models)
  const sb = r.doc.nodes.find((n) => n.id === r.storyboardId), vid = r.doc.nodes.find((n) => n.id === r.videoId)
  assert.deepEqual([sb.type, sb.shotId, sb.data.model, sb.data.prompt], ['storyboard', 's1', 'mock-image', 'A'])
  assert.deepEqual([vid.type, vid.shotId, vid.data.model, vid.data.prompt, vid.data.duration], ['video', 's1', 'mock-video', 'B', 6])
  assert.ok(r.doc.edges.some((e) => e.source === r.storyboardId && e.target === r.videoId && e.targetHandle === 'in:start'))
  assert.ok(r.doc.edges.some((e) => e.source === 'n_kit' && e.target === r.storyboardId && e.targetHandle === 'in:kit'))
  assert.deepEqual(r.changed, [])
  assert.throws(() => applyAgentPlan(empty, 'nope', plan, models))
})
test('applyAgentPlan updates the existing nodes instead of adding a second set', () => {
  const r = applyAgentPlan(full, 's1', plan, models)
  assert.equal(r.doc.nodes.length, full.nodes.length)
  assert.deepEqual([r.storyboardId, r.videoId], ['n_sb_s1', 'n_vid_s1'])
  assert.deepEqual(r.changed, ['n_sb_s1', 'n_vid_s1'])
  assert.equal(r.doc.nodes.find((n) => n.id === 'n_vid_s1').data.duration, 6)
})
test('applyAgentPlan keeps versions and returns the same doc when the plan matches', () => {
  const once = applyAgentPlan(full, 's1', plan, models).doc
  once.nodes.find((n) => n.id === 'n_sb_s1').data.selected = 'g1'
  const again = applyAgentPlan(once, 's1', plan, models)
  assert.equal(again.doc, once)
  assert.deepEqual(again.changed, [])
  assert.equal(again.doc.nodes.find((n) => n.id === 'n_sb_s1').data.selected, 'g1')
})
test('planCost uses the video length', () => {
  assert.deepEqual(planCost(plan, models), { storyboard: 0.04, video: 0.3, total: 0.34 })
  assert.deepEqual(planCost({ ...plan, video: { ...plan.video, duration: 4 } }, models).video, 0.2)
})
test('askAgent posts the shot id and throws the server sentence', async () => {
  const seen = []
  globalThis.fetch = async (url, init) => (seen.push([url, init.method, JSON.parse(init.body)]), { ok: true, status: 200, json: async () => plan })
  assert.deepEqual(await askAgent('ia', 's1'), plan)
  assert.deepEqual(seen, [['/api/ideas/ia/agent/plan', 'POST', { shotId: 's1' }]])
  globalThis.fetch = async () => ({ ok: false, status: 502, json: async () => ({ error: "Couldn't plan this shot. Try again." }) })
  await assert.rejects(askAgent('ia', 's1'), { message: "Couldn't plan this shot. Try again." })
})
