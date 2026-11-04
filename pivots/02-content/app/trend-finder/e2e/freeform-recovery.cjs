// Run through bin/freeform-e2e.py --script <this file>; never against a shared backend.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require(process.env.PW_CORE)
const BASE = process.env.BASE
const evidence = process.env.FREEFORM_EVIDENCE_DIR
assert.ok(BASE && evidence && process.env.FREEFORM_WORK_DIR && process.env.REMOTION_BROWSER_EXECUTABLE, 'use the isolated runner')
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'loopback only')
const checks = [], errors = [], gates = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const ok = name => { checks.push(name); console.log('PASS', name) }
async function until(name, read, timeout = 30000) {
  const deadline = Date.now() + timeout
  let last
  while (Date.now() < deadline) {
    try { const value = await read(); if (value) return value } catch (error) { last = error }
    await sleep(100)
  }
  throw new Error(`Timed out: ${name}${last ? ': ' + last.message : ''}`)
}
// Delay real requests, then continue them unchanged. No response is fulfilled by this test.
async function gate(page, matches) {
  let release, entered = 0, open = false
  const wait = new Promise(resolve => { release = () => { open = true; resolve() } })
  const handler = async route => {
    if (!matches(route.request())) return route.fallback()
    entered++
    await wait
    try { await route.continue() } catch (error) {
      if (!page.isClosed() && !/closed|cancel|abort|Target/i.test(error.message)) throw error
    }
  }
  await page.route('**/*', handler)
  const control = { release, entered: () => entered, open: () => open, remove: async () => { release(); await page.unroute('**/*', handler) } }
  gates.push(control)
  return control
}
async function main() {
  let browser, context
  const pages = [], spaces = []
  let active = 'setup'
  const result = () => ({ passed: checks, errors, workspaces: spaces, active })
  try {
    browser = await chromium.launch({ executablePath: process.env.REMOTION_BROWSER_EXECUTABLE, headless: true })
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(BASE).origin ? route.continue() : route.abort())
    const newPage = async () => {
      const p = await context.newPage()
      p.on('pageerror', error => errors.push({ page: pages.indexOf(p), message: error.message }))
      pages.push(p)
      return p
    }
    const page = await newPage()
    await page.goto(BASE)
    await page.getByText('Log in', { exact: true }).first().click()
    await page.locator('#login-email').fill('test@example.com')
    await page.locator('#login-password').fill('pw-for-e2e')
    await page.keyboard.press('Enter')
    await page.getByText('Client dashboard', { exact: true }).first().waitFor()
    await page.waitForLoadState('networkidle')
    const api = async (url, method = 'GET', data) => {
      const r = await context.request.fetch(BASE + url, { method, ...(data === undefined ? {} : { data }) })
      const body = await r.json()
      assert.ok(r.ok(), `${method} ${url}: ${r.status()} ${JSON.stringify(body)}`)
      return body
    }
    const client = { id: 'recovery-e2e', name: 'Recovery Studio', niche: 'Food', audience: 'Sydney creators', monthlyTarget: 8, examples: [], cannot: [] }
    const clients = await api('/api/clients')
    await api('/api/clients', 'PUT', [...clients, client])
    const home = async p => {
      await p.goto(BASE)
      await p.getByRole('button', { name: client.name, exact: true }).first().click()
      await p.getByRole('button', { name: 'Canvas', exact: true }).first().click()
      await p.locator('.fc-picker').waitFor()
    }
    const reopen = async (p, title) => {
      await home(p)
      await p.getByText(title, { exact: true }).first().click()
      await p.locator('.fc-screen').waitFor()
    }
    const create = async title => {
      await home(page)
      await page.locator('#canvas-name').fill(title)
      await page.getByRole('button', { name: /Create canvas/ }).click()
      await page.locator('.fc-screen').waitFor()
      const w = (await api('/api/workspaces?clientId=' + client.id)).workspaces.find(w => w.title === title)
      assert.ok(w); spaces.push(w.id)
      return `/api/workspaces/${w.id}`
    }
    const node = (p, id) => p.locator(`.react-flow__node[data-id=${JSON.stringify(id)}]`)
    const fit = async p => {
      await p.getByRole('button', { name: 'Fit to screen', exact: true }).click()
      await sleep(250) // ZoomBar animates fitView for 200 ms; measure handles after it settles.
    }
    const add = async (p, base, kind, label) => {
      const before = new Set((await api(base)).doc.nodes.map(n => n.id))
      await p.getByRole('button', { name: label, exact: true }).first().click()
      return until('save new ' + kind, async () => (await api(base)).doc.nodes.find(n => n.type === kind && !before.has(n.id)))
    }
    const input = (p, n) => node(p, n.id).getByRole('textbox', { name: 'Prompt', exact: true })
    const text = async (p, base, n, value) => {
      await fit(p)
      await input(p, n).fill(value)
      await until('save prompt ' + value, async () => {
        const data = (await api(base)).doc.nodes.find(x => x.id === n.id).data
        return (n.type === 'prompt' ? data.text : data.prompt) === value
      })
    }
    const drag = async (p, from, target) => {
      await fit(p)
      const a = await node(p, from).locator('.react-flow__handle-source[data-handleid="out"]').boundingBox()
      const b = typeof target === 'function' ? await target() : await target.boundingBox()
      assert.ok(a && b, 'visible drag endpoints')
      await p.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
      await p.mouse.down()
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 20 })
      await p.mouse.up()
    }
    const run = async (p, n) => {
      await fit(p)
      await node(p, n.id).getByRole('button', { name: 'Run', exact: true }).last().click()
    }
    const selected = (base, n) => until('selected real done ' + n.type, async () => {
      const s = await api(base), current = s.doc.nodes.find(x => x.id === n.id)
      const g = s.generations.find(g => g.id === current.data.selected && g.status === 'done')
      return g && !current.data.awaiting && (n.type !== 'voice' || current.data.voiceId) && { node: current, generation: g }
    }, 90000)

    active = 'assistant, compatible menu and invalid connection'
    const title = 'Recovery graph'
    const base = await create(title)
    const prompt = await add(page, base, 'prompt', 'Prompt')
    await text(page, base, prompt, 'A handmade red cup on a cafe table.')
    const before = await api(base)
    await node(page, prompt.id).locator('.fc-node-title').click()
    await page.getByRole('button', { name: /Assistant/ }).click()
    const planned = page.waitForResponse(r => r.url() === BASE + base + '/agent/plan' && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Preview plan', exact: true }).click()
    const response = await planned
    assert.equal(response.status(), 200)
    const plan = await response.json()
    assert.equal(plan.source, 'demo')
    await page.getByText('Demo plan · no AI call', { exact: true }).waitFor()
    assert.deepEqual((await api(base)).doc, before.doc)
    assert.deepEqual((await api(base)).generations, before.generations)
    await page.getByRole('button', { name: 'Apply to canvas', exact: true }).click()
    const applied = await until('assistant graph saved', async () => { const s = await api(base); return s.doc.nodes.length === 3 && s })
    assert.deepEqual(applied.doc.nodes.find(n => n.id === prompt.id), before.doc.nodes[0])
    const image = applied.doc.nodes.find(n => n.type === 'storyboard'), video = applied.doc.nodes.find(n => n.type === 'video')
    assert.equal(image.data.prompt, plan.storyboard.prompt); assert.equal(image.data.model, plan.storyboard.model)
    assert.equal(video.data.prompt, plan.video.prompt); assert.equal(video.data.model, plan.video.model); assert.equal(video.data.duration, plan.video.duration)
    assert.deepEqual(applied.doc.edges.map(e => [e.source, e.target, e.targetHandle]).sort(), [[prompt.id, image.id, 'in:text'], [prompt.id, video.id, 'in:text'], [image.id, video.id, 'in:start']].sort())
    assert.deepEqual(applied.generations, before.generations)
    await drag(page, prompt.id, async () => {
      const b = await page.locator('.fc-flow').boundingBox()
      // Find an actual empty pane point, avoiding nodes, rail and minimap.
      for (let y = b.y + b.height - 180; y > b.y + 80; y -= 50) {
        for (let x = b.x + b.width - 240; x > b.x + 150; x -= 60) {
          if (await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('.react-flow__pane'), { x, y })) return { x, y, width: 1, height: 1 }
        }
      }
      throw new Error('No empty pane drag endpoint')
    })
    const menu = page.locator('.fc-create-menu')
    await menu.waitFor()
    assert.deepEqual((await menu.getByRole('button').evaluateAll(buttons => buttons.map(button => [...button.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim()))).sort(), ['Prompt', 'Image generator', 'Video generator', 'Voiceover'].sort())
    await menu.getByRole('button', { name: /Voiceover/ }).click()
    const voice = await until('menu creates voice and autoedge', async () => {
      const s = await api(base), v = s.doc.nodes.find(n => n.type === 'voice')
      return v && s.doc.edges.some(e => e.source === prompt.id && e.target === v.id && e.targetHandle === 'in:text') && v
    })
    const stable = await api(base)
    await drag(page, voice.id, node(page, image.id).locator('.react-flow__handle-target[data-handleid="in:ref"]'))
    await page.locator('.fc-notice').getByText('These ports cannot connect.', { exact: true }).waitFor()
    const refused = await api(base)
    assert.deepEqual(refused.doc, stable.doc)
    assert.equal(refused.version, stable.version)
    ok('demo preview does not generate; Apply preserves prompt and adds exact graph; empty drag filters compatible kinds and autoedges; invalid edge is visibly rejected')

    active = 'failed job, retry and awaiting recovery'
    await text(page, base, image, '#fail')
    await run(page, image)
    const failed = await until('real failed mock job', async () => (await api(base)).generations.find(g => g.nodeId === image.id && g.status === 'failed'), 90000)
    await node(page, image.id).locator('.fc-node-error').waitFor()
    await text(page, base, image, 'A repaired red cup photograph.')
    await run(page, image)
    const repaired = await selected(base, image)
    assert.notEqual(repaired.generation.id, failed.id)
    assert.equal(repaired.generation.inputs.prompt, 'A repaired red cup photograph.')
    assert.ok((await api(base)).generations.some(g => g.id === failed.id && g.status === 'failed'))
    await page.getByRole('button', { name: /History/ }).click()
    assert.ok(await page.locator('.fc-history').count() >= 2)
    await page.getByRole('button', { name: /History/ }).click()
    const polls = await gate(page, r => r.method() === 'GET' && new URL(r.url()).pathname.startsWith(base + '/gen/'))
    await run(page, voice)
    const awaiting = await until('awaiting is really persisted', async () => {
      const s = await api(base), v = s.doc.nodes.find(n => n.id === voice.id)
      return v.data.awaiting && s.generations.some(g => g.id === v.data.awaiting) && v.data.awaiting
    })
    await until('real poll held', () => polls.entered())
    await page.getByRole('button', { name: 'Back to canvases', exact: true }).click()
    await page.locator('.fc-picker').waitFor()
    await polls.remove()
    await until('real voice finishes while away', async () => (await api(base)).generations.find(g => g.id === awaiting && g.status === 'done'), 90000)
    await page.getByText(title, { exact: true }).first().click()
    await page.locator('.fc-screen').waitFor()
    const recovered = await selected(base, voice)
    assert.equal(recovered.generation.id, awaiting)
    const owned = (await api(base + '/edit/voice')).voices.filter(v => v.genId === awaiting && v.nodeId === voice.id)
    assert.equal(owned.length, 1); assert.equal(owned[0].id, recovered.node.data.voiceId)
    assert.equal((await context.request.get(BASE + recovered.generation.url)).status(), 200)
    await node(page, voice.id).locator('audio').evaluate(async audio => { audio.muted = true; await audio.play() })
    await until('recovered audio actually plays', () => node(page, voice.id).locator('audio').evaluate(audio => audio.currentTime > 0.1))
    await page.getByRole('button', { name: 'Reload', exact: true }).click()
    await selected(base, voice)
    assert.equal((await api(base + '/edit/voice')).voices.filter(v => v.genId === awaiting).length, 1)
    ok('failed mock job retains history after prompt repair; navigation/reopen recovers actual completed awaiting voice and imports once')

    active = 'two tab CAS restore and discard'
    const tab = await newPage()
    await reopen(tab, title)
    assert.notEqual(await page.evaluate(() => sessionStorage.getItem('remake.canvas.tab')), await tab.evaluate(() => sessionStorage.getItem('remake.canvas.tab')))
    await text(page, base, prompt, 'Server A')
    const conflict = tab.waitForResponse(r => r.url() === BASE + base && r.request().method() === 'PUT' && r.status() === 409)
    await input(tab, prompt).fill('Draft B')
    await conflict
    await tab.locator('.fc-banner').getByText('This canvas changed elsewhere. Reload to continue.', { exact: true }).waitFor()
    assert.equal((await api(base)).doc.nodes.find(n => n.id === prompt.id).data.text, 'Server A')
    const draftText = p => p.evaluate(id => {
      const tab = sessionStorage.getItem('remake.canvas.tab')
      const raw = localStorage.getItem(`remake.canvas.draft:workspace:${id}:${tab}`)
      return raw && JSON.parse(raw).doc.nodes.find(n => n.type === 'prompt').data.text
    }, spaces[0])
    assert.equal(await draftText(tab), 'Draft B')
    await tab.locator('.fc-banner').getByRole('button', { name: 'Reload', exact: true }).click()
    await tab.getByRole('button', { name: 'Keep draft and reload', exact: true }).click()
    await tab.getByRole('dialog', { name: 'Recover local canvas edits?', exact: true }).waitFor()
    assert.equal((await api(base)).doc.nodes.find(n => n.id === prompt.id).data.text, 'Server A')
    await tab.getByRole('button', { name: 'Restore draft', exact: true }).click()
    await until('restored B committed', async () => (await api(base)).doc.nodes.find(n => n.id === prompt.id).data.text === 'Draft B')
    assert.equal(await draftText(tab), null)
    const conflict2 = page.waitForResponse(r => r.url() === BASE + base && r.request().method() === 'PUT' && r.status() === 409)
    await input(page, prompt).fill('Discard this draft')
    await conflict2
    assert.equal(await draftText(page), 'Discard this draft')
    await page.locator('.fc-banner').getByRole('button', { name: 'Reload', exact: true }).click()
    await page.getByRole('button', { name: 'Discard local draft', exact: true }).click()
    await until('discard loads B', () => input(page, prompt).inputValue().then(v => v === 'Draft B'))
    assert.equal(await draftText(page), null)
    assert.equal((await api(base)).doc.nodes.find(n => n.id === prompt.id).data.text, 'Draft B')
    await tab.close()
    ok('real 409 preserves server A and tab-local B; Keep/reload/Restore commits B; discard keeps server B and removes only losing draft')

    active = 'legacy fixture, kit and voice ownership'
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-library.json'), 'utf8'))
    const library = await api('/api/library')
    const merged = { ...library }
    for (const [key, value] of Object.entries(seed)) {
      merged[key] = Array.isArray(value) ? [...(library[key] ?? []), ...value.filter(item => !(library[key] ?? []).some(old => old.id === item.id))] : (library[key] ?? value)
    }
    await api('/api/library', 'PUT', merged)
    const ideaId = 'recovery-legacy', legacyBase = `/api/ideas/${ideaId}`, canvas = legacyBase + '/canvas'
    const ideas = await api('/api/ideas')
    await api('/api/ideas', 'PUT', [...ideas, {
      id: ideaId, videoId: 'link-t4', clientId: client.id, status: 'approved', dueDate: '2026-12-01', notes: '',
      shots: [1, 2, 3].map(i => ({ time: i + 's', shot: 'Shot ' + i, text: 'text ' + i, line: 'A simple cafe story, scene ' + i })),
    }])
    // The six-kind rail does not create kit nodes. Supply one as part of the legacy fixture,
    // then test the real controls, generation inputs and stale behavior through the UI.
    const legacyInitial = await api(canvas)
    assert.ok(!legacyInitial.doc.nodes.some(n => n.type === 'kit'))
    const kitNode = { id: 'n_recovery_kit', type: 'kit', position: { x: -360, y: 0 }, data: { kitItems: [] } }
    await api(canvas, 'PUT', { version: legacyInitial.version, doc: { ...legacyInitial.doc, nodes: [...legacyInitial.doc.nodes, kitNode] } })
    const openLegacy = async p => {
      await home(p)
      await p.locator('.fc-workspace.is-legacy').click()
      await p.locator('.fc-screen').waitFor()
    }
    await openLegacy(page)
    const legacyState = () => api(canvas)
    const legacyVoice = await add(page, canvas, 'voice', 'Voiceover')
    await text(page, canvas, legacyVoice, 'First narration for the cafe.')
    await run(page, legacyVoice)
    const firstVoice = await selected(canvas, legacyVoice)
    await text(page, canvas, legacyVoice, 'Second narration for the cafe.')
    await run(page, legacyVoice)
    const secondVoice = await selected(canvas, legacyVoice)
    assert.notEqual(firstVoice.generation.id, secondVoice.generation.id)
    await page.getByRole('button', { name: /History/ }).click()
    // History is reverse chronological. Select the first job, then repeat it to verify idempotency.
    await page.locator('.fc-history').last().getByRole('button', { name: 'Use this version', exact: true }).click()
    await until('history selects older voice', async () => (await legacyState()).doc.nodes.find(n => n.id === legacyVoice.id).data.selected === firstVoice.generation.id)
    await page.locator('.fc-history').last().getByRole('button', { name: 'Use this version', exact: true }).click()
    await until('older voice stays selected', async () => (await legacyState()).doc.nodes.find(n => n.id === legacyVoice.id).data.voiceId === firstVoice.node.data.voiceId)
    await page.getByRole('button', { name: /History/ }).click()
    const editor = await add(page, canvas, 'editor', 'Editor & output')
    await drag(page, legacyVoice.id, node(page, editor.id).locator('.react-flow__handle-target[data-handleid="in:audio"]'))
    await until('legacy audio enters real project', async () => (await api(legacyBase + '/edit')).project.voiceover.some(v => v.id === firstVoice.node.data.voiceId))
    const voices = (await api(legacyBase + '/edit/voice')).voices
    assert.equal(voices.filter(v => v.genId === firstVoice.generation.id && v.nodeId === legacyVoice.id).length, 1)
    assert.equal(voices.filter(v => v.genId === secondVoice.generation.id && v.nodeId === legacyVoice.id).length, 1)
    const ownedNode = (await legacyState()).doc.nodes.find(n => n.id === legacyVoice.id)
    assert.equal(ownedNode.data.voiceSources[firstVoice.generation.id], firstVoice.node.data.voiceId)
    assert.equal(ownedNode.data.voiceSources[secondVoice.generation.id], secondVoice.node.data.voiceId)
    await openLegacy(page)
    await until('legacy ownership survives reopen', async () => (await legacyState()).doc.nodes.find(n => n.id === legacyVoice.id).data.voiceId === firstVoice.node.data.voiceId)
    assert.equal((await api(legacyBase + '/edit/voice')).voices.length, voices.length)
    assert.equal((await api(legacyBase + '/edit')).project.voiceover[0].id, firstVoice.node.data.voiceId)
    await fit(page)
    await node(page, kitNode.id).getByRole('button', { name: 'Settings', exact: true }).last().click()
    const kitPanel = page.locator('.cv-kit')
    await kitPanel.locator('.cv-kit-add input[aria-label="Name"]').fill('Cafe cup')
    await kitPanel.getByRole('button', { name: 'Add item', exact: true }).click()
    const item = await until('real kit item saved', async () => (await api(`/api/clients/${client.id}/kit`)).items.find(i => i.name === 'Cafe cup'))
    await kitPanel.locator('.cv-kit-item .cv-kit-name').fill('Red cafe cup')
    await kitPanel.locator('.cv-kit-item .cv-kit-name').press('Tab')
    await until('kit rename saved on blur', async () => (await api(`/api/clients/${client.id}/kit`)).items.some(i => i.id === item.id && i.name === 'Red cafe cup'))
    await kitPanel.locator('.cv-kit-use input[type=checkbox]').check()
    await until('kit selected on graph', async () => (await legacyState()).doc.nodes.find(n => n.id === kitNode.id).data.kitItems.includes(item.id))
    await page.locator('.fc-dock > header').getByRole('button', { name: 'Close', exact: true }).click()
    const legacyImage = (await legacyState()).doc.nodes.find(n => n.type === 'storyboard')
    await until('kit wired to legacy image', async () => (await legacyState()).doc.edges.some(e => e.source === kitNode.id && e.target === legacyImage.id && e.targetHandle === 'in:kit'))
    await run(page, legacyImage)
    const kitResult = await selected(canvas, legacyImage)
    assert.ok(kitResult.generation.inputs.references.some(r => r.source === 'kit' && r.itemId === item.id))
    assert.ok(Object.hasOwn(kitResult.generation.inputs.kitStamp, item.id))
    await until('legacy frame written back', async () => (await api('/api/ideas')).find(i => i.id === ideaId).shots.some(s => s.frameImage === kitResult.generation.url))
    await fit(page)
    await node(page, kitNode.id).getByRole('button', { name: 'Settings', exact: true }).last().click()
    const note = kitPanel.locator('.cv-kit-item').getByRole('textbox', { name: 'Note', exact: true })
    await note.fill('Keep the cup red and the handle visible.')
    await note.press('Tab')
    await until('kit note marks generated input stale', async () => (await legacyState()).doc.nodes.find(n => n.id === legacyImage.id).data.stale)
    await node(page, legacyImage.id).locator('.fc-stale').waitFor()
    await page.locator('.fc-dock > header').getByRole('button', { name: 'Close', exact: true }).click()
    ok('approved legacy fixture merges existing data; voice history preserves ownership with one import per job; kit UI saves, supplies real references, writes shot frame and marks changed inputs stale')

    active = 'critical media and edit PUT navigation gates'
    const otherTitle = 'Recovery isolation target'
    const otherBase = await create(otherTitle)
    const otherBefore = await api(otherBase), otherEditBefore = await api(otherBase + '/edit')
    await openLegacy(page)
    const upload = await add(page, canvas, 'upload', 'Upload media')
    const audioFile = path.join(process.env.FREEFORM_WORK_DIR, 'recovery.wav')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', audioFile])
    const mediaGate = await gate(page, r => r.method() === 'PUT' && new URL(r.url()).pathname === legacyBase + '/edit/voice')
    await fit(page)
    await node(page, upload.id).locator('input[type=file]').setInputFiles(audioFile)
    await until('real media PUT is held', () => mediaGate.entered())
    // The navigation click must reach the leave guard while the critical operation owns the queue.
    await page.getByRole('button', { name: 'Plans', exact: true }).first().click()
    await sleep(350)
    assert.equal(await page.locator('.fc-screen').count(), 1)
    assert.equal(await page.locator('.fc-picker').count(), 0)
    assert.equal(mediaGate.open(), false)
    mediaGate.release()
    await page.locator('.fc-screen').waitFor({ state: 'detached' })
    await mediaGate.remove()
    const uploadedVoice = await until('media ownership persisted before leave', async () => {
      const n = (await legacyState()).doc.nodes.find(n => n.id === upload.id)
      return n.data.voiceId && n
    })
    assert.ok((await api(legacyBase + '/edit/voice')).voices.some(v => v.id === uploadedVoice.data.voiceId && v.nodeId === upload.id))
    await openLegacy(page)
    const editGate = await gate(page, r => r.method() === 'PUT' && new URL(r.url()).pathname === legacyBase + '/edit')
    await drag(page, upload.id, node(page, editor.id).locator('.react-flow__handle-target[data-handleid="in:audio"]'))
    await until('real edit PUT is held', () => editGate.entered())
    await page.getByRole('button', { name: 'Back to canvases', exact: true }).click()
    await sleep(350)
    assert.equal(await page.locator('.fc-screen').count(), 1)
    assert.equal(await page.locator('.fc-picker').count(), 0)
    assert.equal(editGate.open(), false)
    editGate.release()
    await page.locator('.fc-picker').waitFor()
    await editGate.remove()
    const legacyEdit = await api(legacyBase + '/edit')
    assert.ok(legacyEdit.project.voiceover.some(v => v.id === uploadedVoice.data.voiceId))
    assert.ok(legacyEdit.project.voiceover.some(v => v.id === firstVoice.node.data.voiceId))
    await page.getByText(otherTitle, { exact: true }).first().click()
    await page.locator('.fc-screen').waitFor()
    assert.deepEqual((await api(otherBase)).doc, otherBefore.doc)
    assert.deepEqual((await api(otherBase)).generations, otherBefore.generations)
    assert.deepEqual((await api(otherBase + '/edit')).project, otherEditBefore.project)
    await openLegacy(page)
    assert.equal((await legacyState()).doc.nodes.find(n => n.id === upload.id).data.voiceId, uploadedVoice.data.voiceId)
    assert.deepEqual((await api(legacyBase + '/edit')).project, legacyEdit.project)
    assert.ok((await api('/api/ideas')).find(i => i.id === ideaId).shots.some(s => s.frameImage === kitResult.generation.url))
    assert.deepEqual((await api(base)).doc.nodes.find(n => n.id === prompt.id).data.text, 'Draft B')
    ok('navigation waits for actual media/edit PUT release; legacy graph, editor audio and shot frame persist without contaminating either workspace')
    await page.screenshot({ path: path.join(evidence, 'recovery-final-1440.png') })
    assert.deepEqual(errors, [])
    active = 'complete'
    fs.writeFileSync(path.join(evidence, 'recovery-results.json'), JSON.stringify(result(), null, 2))
  } catch (error) {
    for (const [i, p] of pages.entries()) {
      if (!p.isClosed()) await p.screenshot({ path: path.join(evidence, `recovery-failure-${i}-1440.png`) }).catch(() => {})
    }
    fs.writeFileSync(path.join(evidence, 'recovery-results.json'), JSON.stringify({ ...result(), error: error.stack }, null, 2))
    throw error
  } finally {
    for (const g of gates) g.release()
    try { if (context) await context.close() }
    finally { if (browser) await browser.close() }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
