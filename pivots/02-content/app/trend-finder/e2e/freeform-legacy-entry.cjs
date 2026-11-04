// Run only through bin/freeform-e2e.py --script <this file> on its clean temporary backend.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require(process.env.PW_CORE)
const BASE = process.env.BASE
const evidence = process.env.FREEFORM_EVIDENCE_DIR
assert.ok(BASE && evidence && process.env.FREEFORM_WORK_DIR && process.env.REMOTION_BROWSER_EXECUTABLE, 'use the isolated runner and cached browser wrapper')
const origin = new URL(BASE).origin
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(new URL(BASE).hostname), 'loopback only')
const checks = [], pageerrors = [], requests = [], responses = [], gates = []
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(name, read, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = await read()
    if (value) return value
    await sleep(100)
  }
  throw new Error(`Timed out: ${name}`)
}
async function holdIdeasPut(page) {
  let release, closing, entered = 0
  const pending = new Set()
  const wait = new Promise(resolve => { release = resolve })
  const handler = async route => {
    const r = route.request()
    if (new URL(r.url()).pathname !== '/api/ideas' || r.method() !== 'PUT') return route.fallback()
    entered++
    const work = (async () => { await wait; await route.continue() })()
    pending.add(work)
    try { await work } finally { pending.delete(work) }
  }
  await page.route('**/*', handler)
  const control = {
    entered: () => entered,
    release,
    close: () => {
      if (!closing) closing = (async () => {
        release()
        await Promise.all([...pending])
        await page.unroute('**/*', handler)
      })()
      return closing
    },
  }
  gates.push(control)
  return control
}
async function main() {
  let browser, context, page, active = 'setup'
  const report = () => ({ active, checks, pageerrors, requests, responses })
  const shot = (i) => ({ id: `legacy_entry_shot_${i}`, time: `${i}s`, shot: `Cafe scene ${i}`, text: `Scene ${i}`, line: `A handmade cup in cafe scene ${i}.` })
  try {
    browser = await chromium.launch({ executablePath: process.env.REMOTION_BROWSER_EXECUTABLE, headless: true })
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('pageerror', error => pageerrors.push(error.message))
    page.on('request', r => {
      if (new URL(r.url()).pathname.startsWith('/api/')) requests.push({ method: r.method(), path: new URL(r.url()).pathname, body: r.postData(), at: Date.now() })
    })
    page.on('response', r => {
      if (new URL(r.url()).pathname.startsWith('/api/')) responses.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status(), at: Date.now() })
    })
    const api = async (url, method = 'GET', data) => {
      const r = await context.request.fetch(BASE + url, { method, ...(data === undefined ? {} : { data }), timeout: 15000 })
      const body = await r.json()
      assert.ok(r.ok(), `${method} ${url}: ${r.status()} ${JSON.stringify(body)}`)
      return body
    }
    const snap = name => page.screenshot({ path: path.join(evidence, `legacy-entry-${name}-1440.png`) })
    const pass = name => { assert.deepEqual(pageerrors, []); checks.push(name); console.log('PASS', name) }
    const fit = async () => {
      await page.getByRole('button', { name: 'Fit to screen', exact: true }).click()
      await sleep(250) // fitView animates for 200 ms.
    }
    await page.goto(BASE)
    await page.getByText('Log in', { exact: true }).first().click()
    await page.locator('#login-email').fill('test@example.com')
    await page.locator('#login-password').fill('pw-for-e2e')
    await page.keyboard.press('Enter')
    await page.getByText('Client dashboard', { exact: true }).first().waitFor()
    await page.waitForLoadState('networkidle')
    const client = { id: 'legacy-entry-e2e', name: 'Legacy Entry Studio', niche: 'Food', audience: 'Sydney creators', monthlyTarget: 8, examples: [], cannot: [] }
    await api('/api/clients', 'PUT', [...await api('/api/clients'), client])
    const seed = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-library.json'), 'utf8'))
    const library = await api('/api/library'), merged = { ...library }
    for (const [key, value] of Object.entries(seed)) {
      merged[key] = Array.isArray(value) ? [...(library[key] ?? []), ...value.filter(item => !(library[key] ?? []).some(old => old.id === item.id))] : (library[key] ?? value)
    }
    await api('/api/library', 'PUT', merged)
    const idea = { id: 'legacy-entry-approved', videoId: 'link-t4', clientId: client.id, status: 'approved', dueDate: '2026-12-01', notes: '', shots: [1, 2, 3].map(shot) }
    await api('/api/ideas', 'PUT', [...await api('/api/ideas'), idea])
    const base = `/api/ideas/${idea.id}`, canvas = base + '/canvas'
    const initial = await api(canvas)
    assert.ok(initial.doc.nodes.length > 0)
    assert.ok(!initial.doc.nodes.some(n => n.type === 'editor'), 'fixture must exercise direct legacy editor entry')
    // An unrelated workspace-style prompt and legacy kit must survive Assistant Apply.
    const extra = [
      { id: 'n_legacy_entry_prompt', type: 'prompt', position: { x: -400, y: 0 }, data: { text: 'Keep this unrelated prompt.' } },
      { id: 'n_legacy_entry_kit', type: 'kit', position: { x: -400, y: 350 }, data: { kitItems: [] } },
    ]
    const kitEdges = initial.doc.nodes.filter(n => n.type === 'storyboard' && !n.data.kitCut && !initial.doc.edges.some(e => e.target === n.id && e.targetHandle === 'in:kit')).map(n => ({ id: `e_${extra[1].id}_${n.id}_in:kit`, source: extra[1].id, sourceHandle: 'out', target: n.id, targetHandle: 'in:kit' }))
    await api(canvas, 'PUT', { version: initial.version, doc: { ...initial.doc, nodes: [...initial.doc.nodes, ...extra], edges: [...initial.doc.edges, ...kitEdges] } })
    const home = async () => {
      await page.goto(BASE)
      await page.locator('.switcher-btn').click()
      await page.getByRole('menuitem').filter({ hasText: client.name }).click()
    }
    const picker = async () => {
      await home()
      await page.getByRole('button', { name: 'Canvas', exact: true }).first().click()
      await page.locator('.fc-picker').waitFor()
    }

    active = 'Plans Make the video direct legacy editor'
    const beforeEditor = await api(canvas)
    await home()
    await page.getByRole('button', { name: 'Plans', exact: true }).first().click()
    const editLoaded = page.waitForResponse(r => new URL(r.url()).pathname === base + '/edit' && r.request().method() === 'GET' && r.status() === 200)
    await page.getByRole('button', { name: 'Make the video', exact: true }).click()
    await page.locator('.fc-editor .cv-ed-full').waitFor()
    const loadedProject = await (await editLoaded).json()
    const edit = await api(base + '/edit')
    assert.deepEqual(edit.project, loadedProject.project)
    assert.equal(edit.project.fps, 30)
    assert.equal(edit.project.width, 1080)
    assert.equal(edit.project.height, 1920)
    assert.ok(Array.isArray(edit.project.clips) && Array.isArray(edit.project.voiceover))
    assert.deepEqual((await api(canvas)).doc, beforeEditor.doc)
    assert.ok(!(await api(canvas)).doc.nodes.some(n => n.type === 'editor'))
    await snap('01-direct-editor')
    await page.getByRole('button', { name: '← Back to canvas', exact: true }).click()
    await page.locator('.fc-flow').waitFor()
    assert.equal(await page.locator('.fc-editor').count(), 0)
    await fit()
    pass('Plans opens initialized legacy editor without adding a node or changing graph; Back returns to canvas')

    active = 'legacy Assistant dropdown preview and Apply'
    const savedIdea = (await api('/api/ideas')).find(i => i.id === idea.id)
    const selectedShot = savedIdea.shots[1]
    assert.ok(selectedShot.id)
    assert.notEqual(selectedShot.id, extra[0].id)
    const before = await api(canvas), kitBefore = await api(`/api/clients/${client.id}/kit`)
    const plan = {
      source: 'demo', shotId: selectedShot.id,
      storyboard: { prompt: 'Demo: a red handmade cup on a cafe table.', model: 'mock-image' },
      video: { prompt: 'Demo: slowly move around the red cup.', model: 'mock-video', duration: 4 }, planUsd: 0,
    }
    let posted
    const planHandler = async route => {
      const r = route.request()
      if (new URL(r.url()).pathname !== base + '/agent/plan' || r.method() !== 'POST') return route.fallback()
      posted = r.postDataJSON()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(plan) })
    }
    await page.route('**/*', planHandler)
    await page.getByRole('button', { name: /Assistant/ }).click()
    await page.getByRole('combobox', { name: 'Plan shot', exact: true }).selectOption(selectedShot.id)
    const preview = page.waitForResponse(r => new URL(r.url()).pathname === base + '/agent/plan' && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Preview plan', exact: true }).click()
    assert.equal((await preview).status(), 200)
    assert.deepEqual(posted, { shotId: selectedShot.id })
    assert.ok(!Object.hasOwn(posted, 'promptNodeId'))
    await page.getByText('Demo plan · no AI call', { exact: true }).waitFor()
    assert.deepEqual((await api(canvas)).doc, before.doc)
    await page.getByRole('button', { name: 'Apply to canvas', exact: true }).click()
    const applied = await until('canonical shot prompts and models saved', async () => {
      const s = await api(canvas)
      const image = s.doc.nodes.find(n => n.type === 'storyboard' && n.shotId === selectedShot.id)
      const video = s.doc.nodes.find(n => n.type === 'video' && n.shotId === selectedShot.id)
      return image?.data.prompt === plan.storyboard.prompt && video?.data.prompt === plan.video.prompt && { s, image, video }
    })
    assert.equal(applied.image.data.model, plan.storyboard.model)
    assert.equal(applied.video.data.model, plan.video.model)
    assert.equal(applied.video.data.duration, plan.video.duration)
    for (const n of before.doc.nodes.filter(n => !['storyboard', 'video'].includes(n.type) || n.shotId !== selectedShot.id)) {
      assert.deepEqual(applied.s.doc.nodes.find(x => x.id === n.id), n)
    }
    for (const e of before.doc.edges) assert.ok(applied.s.doc.edges.some(x => JSON.stringify(x) === JSON.stringify(e)), `preserve edge ${e.id}`)
    assert.deepEqual(await api(`/api/clients/${client.id}/kit`), kitBefore)
    assert.deepEqual(applied.s.generations, before.generations)
    assert.ok(!requests.some(r => r.method === 'POST' && /\/(gen|generate|run)(\/|$)/.test(r.path)), 'no generation queued')
    await fit()
    await snap('02-assistant-applied')
    await page.unroute('**/*', planHandler)
    const reloaded = page.waitForResponse(r => new URL(r.url()).pathname === canvas && r.request().method() === 'GET' && r.status() === 200)
    await page.getByRole('button', { name: 'Reload', exact: true }).click()
    await reloaded
    await page.locator('.fc-flow').waitFor()
    assert.deepEqual((await api(canvas)).doc, applied.s.doc)
    assert.deepEqual((await api(canvas)).generations, before.generations)
    await fit()
    await snap('02-assistant-reloaded')
    pass('legacy Assistant posts saved shotId, applies demo settings only to that shot and persists across reload')

    active = 'delayed App shot persistence automatically recovers NoShots'
    // A separate approved legacy fixture intentionally omits shots: App must copy the real format shotList.
    const delayedVideo = { ...seed.videos[0], id: 'legacy-entry-delayed-video', live: true, hook: 'Legacy delayed shot save' }
    const latestLibrary = await api('/api/library')
    await api('/api/library', 'PUT', { ...latestLibrary, videos: [...latestLibrary.videos, delayedVideo] })
    const delayedIdea = { id: 'legacy-entry-delayed', videoId: delayedVideo.id, clientId: client.id, status: 'approved', dueDate: '2026-12-02', notes: '' }
    await api('/api/ideas', 'PUT', [...await api('/api/ideas'), delayedIdea])
    const delayedCanvas = `/api/ideas/${delayedIdea.id}/canvas`
    await picker()
    const gate = await holdIdeasPut(page)
    const start = Date.now()
    const noShots = page.waitForResponse(r => new URL(r.url()).pathname === delayedCanvas && r.status() === 409)
    await page.locator('.fc-workspace.is-legacy').filter({ hasText: delayedVideo.hook }).click()
    await until('App ideas PUT held', () => gate.entered())
    assert.equal((await (await noShots).json()).code, 'no-shots')
    await sleep(2300)
    const attempts = responses.filter(r => r.method === 'GET' && r.path === delayedCanvas)
    assert.ok(attempts.length >= 2, 'Canvas retries after the initial NoShots response')
    assert.ok(attempts.every(r => r.status === 409), 'held PUT leaves backend without shots')
    assert.ok(attempts[1].at - attempts[0].at >= 1900, 'retry is bounded by the 2-second delay')
    assert.ok(Date.now() - start > 2000)
    assert.equal((await api('/api/ideas')).find(i => i.id === delayedIdea.id).shots, undefined)
    await snap('03-held-put')
    const held = requests.filter(r => r.method === 'PUT' && r.path === '/api/ideas').at(-1)
    assert.ok(held, 'observe actual page PUT body')
    const heldShots = JSON.parse(held.body).find(i => i.id === delayedIdea.id).shots
    assert.equal(heldShots.length, seed.formats[0].shotList.length)
    assert.ok(heldShots.every(s => s.id))
    const saved = page.waitForResponse(r => new URL(r.url()).pathname === '/api/ideas' && r.request().method() === 'PUT' && r.status() === 200)
    await gate.close()
    await saved
    await page.locator('.fc-screen .fc-flow').waitFor({ timeout: 15000 })
    assert.ok(responses.some(r => r.path === delayedCanvas && r.status === 200), 'automatic retry loads canvas without Reload')
    const persistedShots = (await api('/api/ideas')).find(i => i.id === delayedIdea.id).shots
    assert.deepEqual(persistedShots, heldShots, 'gate continues App PUT unchanged')
    assert.equal(new Set(persistedShots.map(s => s.id)).size, persistedShots.length)
    const recovered = await api(delayedCanvas)
    for (const s of persistedShots) {
      const n = recovered.doc.nodes.find(n => n.type === 'shot' && n.shotId === s.id)
      assert.ok(n, `backend graph includes saved shot ${s.id}`)
      assert.equal(await page.locator(`.react-flow__node[data-id=${JSON.stringify(n.id)}]`).count(), 1)
    }
    assert.deepEqual((await api('/api/ideas')).find(i => i.id === delayedIdea.id).shots.map(s => s.id), persistedShots.map(s => s.id))
    await fit()
    await snap('03-auto-recovered')
    pass('held App PUT produces real NoShots retries; unchanged release automatically loads stable shot graph')
    active = 'complete'
    assert.deepEqual(pageerrors, [])
    fs.writeFileSync(path.join(evidence, 'legacy-entry-results.json'), JSON.stringify(report(), null, 2))
  } catch (error) {
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(evidence, 'legacy-entry-error-1440.png') }).catch(() => {})
    fs.writeFileSync(path.join(evidence, 'legacy-entry-results.json'), JSON.stringify({ ...report(), error: error.stack }, null, 2))
    throw error
  } finally {
    // Release and await all delayed routes before closing their owning context/browser.
    for (const g of gates) g.release()
    try { await Promise.all(gates.map(g => g.close())) }
    finally {
      try { if (context) await context.close() }
      finally { if (browser) await browser.close() }
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
