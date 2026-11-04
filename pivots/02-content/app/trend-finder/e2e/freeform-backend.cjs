// Real local HTTP/media integration; use bin/freeform-e2e.py, never a normal backend.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')
const { request } = require(process.env.PW_CORE)
const BASE = process.env.BASE, evidence = process.env.FREEFORM_EVIDENCE_DIR
assert.ok(BASE && evidence && process.env.FREEFORM_WORK_DIR, 'isolated runner required')
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function main() {
  const staff = await request.newContext({ baseURL: BASE })
  const publicClient = await request.newContext({ baseURL: BASE })
  const results = []
  const api = async (url, method = 'GET', data, headers) => {
    const response = await staff.fetch(url, { method, ...(data === undefined ? {} : { data }), headers })
    const body = await response.json()
    assert.ok(response.ok(), `${method} ${url}: ${response.status()} ${JSON.stringify(body)}`)
    return body
  }
  const poll = async (name, read, timeout = 120000) => {
    const end = Date.now() + timeout
    while (Date.now() < end) { const value = await read(); if (value) return value; await sleep(100) }
    throw new Error('Timed out: ' + name)
  }
  const ok = name => { results.push(name); console.log('PASS', name) }
  try {
    await api('/api/auth/login', 'POST', { email: 'test@example.com', password: 'pw-for-e2e' })
    await api('/api/clients', 'PUT', [{ id: 'api-client', name: 'HTTP Test Studio', niche: 'Food', audience: 'Sydney', monthlyTarget: 8, examples: [], cannot: [] }])
    const created = await api('/api/workspaces', 'POST', { clientId: 'api-client', title: 'HTTP workspace proof' })
    const id = created.workspace.id, base = `/api/workspaces/${id}`
    assert.deepEqual(created.doc.nodes, []); assert.deepEqual(created.doc.edges, [])
    assert.equal((await api('/api/ideas') ?? []).length, 0)
    ok('authenticated HTTP workspace is empty and has no fabricated plan')
    let state = created
    const save = async mutate => { state = await api(base); const doc = structuredClone(state.doc); mutate(doc); state = await api(base, 'PUT', { version: state.version, doc }); return state }
    const node = (id, type, x, data = {}) => ({ id, type, position: { x, y: 0 }, data })
    const edge = (source, target, targetHandle) => ({ id: `e_${source}_${target}_${targetHandle.replace(':', '_')}`, source, sourceHandle: 'out', target, targetHandle })
    const text = 'A red ceramic cup in an Australian cafe.'
    await save(doc => { doc.nodes = [node('p', 'prompt', 0, { text }), node('i', 'storyboard', 400, { model: 'mock-image', prompt: '' }), node('v', 'video', 800, { model: 'mock-video', prompt: '', duration: 4 }), node('a', 'voice', 1200, { model: 'mock-voice', prompt: '' }), node('u', 'upload', 1600, { media: 'video' }), node('n_editor', 'editor', 2000)]; doc.edges = [edge('p', 'i', 'in:text'), edge('i', 'v', 'in:start'), edge('p', 'v', 'in:text'), edge('p', 'a', 'in:text')] })
    const generate = async (nodeId, voice = false) => {
      state = await api(base)
      const url = base + (voice ? '/edit/voice/tts' : '/gen')
      const quote = await api(url, 'POST', { nodeId, canvasVersion: state.version, confirm: false })
      assert.equal(quote.usd ?? quote.total, 0)
      const started = await api(url, 'POST', { nodeId, canvasVersion: quote.canvasVersion, inputStamp: quote.inputStamp, confirm: true })
      const done = await poll('generation ' + nodeId, async () => { const g = await api(base + '/gen/' + started.id); if (g.status === 'failed' || g.status === 'unknown') throw new Error(g.error); return g.status === 'done' && g })
      let imported
      if (voice) imported = await api(base + '/edit/voice/from-gen/' + done.id + '?nodeId=' + nodeId, 'POST')
      await save(doc => { const n = doc.nodes.find(n => n.id === nodeId); n.data.selected = done.id; if (imported) n.data.voiceId = imported.id })
      return { generation: done, voice: imported }
    }
    const image = await generate('i')
    const video = await generate('v')
    const voice = await generate('a', true)
    assert.equal(image.generation.inputs.prompt, text)
    assert.equal(video.generation.inputs.prompt, text)
    assert.equal(video.generation.inputs.startFrame, image.generation.id)
    assert.equal(voice.generation.inputs.prompt, text)
    ok('real queued mock adapters consume saved graph prompt/image and create/import voice')
    const fixture = path.join(process.env.FREEFORM_WORK_DIR, 'api-upload.mp4')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=30:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', fixture])
    const uploaded = await api(base + '/gen/upload?nodeId=u', 'POST', fs.readFileSync(fixture), { 'content-type': 'video/mp4', 'x-filename': 'api-upload.mp4' })
    await save(doc => { doc.nodes.find(n => n.id === 'u').data.selected = uploaded.id })
    assert.deepEqual((await api(base)).takes, [])
    const sources = (await api(base + '/edit/sources')).sources
    const project = await api(base + '/edit')
    const clips = [video.generation.id, uploaded.id].map((id, i) => ({ id: 'c' + i, source: { kind: 'generation', id }, in: 0, out: Math.min(2, sources.find(s => s.id === id).duration), volume: 1, muted: true }))
    await api(base + '/edit', 'PUT', { version: project.version, project: { ...project.project, clips, voiceover: [{ id: voice.voice.id, source: 'tts', start: 0, volume: 1, edits: {} }] } })
    await api(base + '/edit/export', 'POST')
    const cut = await poll('real Remotion export', async () => { const cut = await api(base + '/cut'); if (cut.status === 'failed') throw new Error(cut.error); return cut.status === 'done' && cut.output && cut }, 240000)
    const file = await staff.get(cut.output.url)
    assert.equal(file.status(), 200)
    const output = path.join(evidence, 'backend-workspace.mp4')
    fs.writeFileSync(output, await file.body())
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output], { encoding: 'utf8' }))
    const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio')
    assert.equal(v.width, 1080); assert.equal(v.height, 1920); assert.equal(a.codec_name, 'aac')
    assert.ok(Math.abs(Number(probe.format.duration) - clips.reduce((n, c) => n + c.out - c.in, 0)) < 0.15)
    fs.writeFileSync(path.join(evidence, 'backend-ffprobe.json'), JSON.stringify(probe, null, 2))
    const volume = spawnSync('ffmpeg', ['-hide_banner', '-i', output, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    const mean = /mean_volume: (-?[\d.]+) dB/.exec(volume)
    assert.ok(mean && Number(mean[1]) > -50, 'connected voice audible while visual clips are muted')
    fs.writeFileSync(path.join(evidence, 'backend-voice-volume.txt'), volume)
    ok('actual local HTTP export creates timeline-length 1080x1920 AAC MP4 with connected voice audible')
    const link = await api('/api/share', 'POST', { clientId: 'api-client' })
    await api(base + '/cut/review', 'POST')
    const token = link.token || new URL(link.url, BASE).pathname.split('/').pop()
    const listing = await publicClient.get('/api/review/' + token)
    const item = (await listing.json()).cuts.find(c => c.workspace?.id === id)
    assert.ok(item); assert.equal(item.workspace.title, 'HTTP workspace proof')
    const decision = await publicClient.post(`/api/review/${token}/cuts/${id}/decide`, { data: { decision: 'approved', version: item.cut.version } })
    assert.equal(decision.status(), 200)
    assert.equal((await api(base + '/cut')).review.status, 'approved')
    assert.equal((await api('/api/ideas') ?? []).length, 0)
    ok('signed-out token approves the real workspace export without any plan')
    fs.writeFileSync(path.join(evidence, 'backend-results.json'), JSON.stringify({ passed: results, workspaceId: id }, null, 2))
  } finally { await staff.dispose(); await publicClient.dispose() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
