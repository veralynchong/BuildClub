// Run through bin/demo-readiness.py: genuine HTTP, owned persistent state, no live providers.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createHash, randomUUID } = require('node:crypto')
const childProcess = require('node:child_process')
const spawn = childProcess.spawn
// Only our wrapper: it stays in the tracked Node group until Python atomically
// registers its new session under the launch fence, then executes Chrome.
childProcess.spawn = (file, args, options) => spawn(file, args,
  file === process.env.READINESS_BROWSER ? { ...options, detached: false } : options)
const { chromium } = require(process.env.PW_CORE)
const { BASE, READINESS_STATE: stateDir, READINESS_EVIDENCE: evidence } = process.env
assert.equal(BASE, 'http://127.0.0.1:8972')
const checks = [], errors = [], traffic = [], fixture = []
const pending = ['Search error presentation: API only, no UI error assertion',
  'Theme: screenshots and editable text field only, no computed contrast assertion',
  'Script to Canvas prompt/caption synchronization not tested',
  'Board footage metadata is not a server take or a playable persistent upload',
  'Old unscoped legacy video nodes are not migrated; original artifacts retained',
  'Real-human footage quality, real providers and final rendered cut not tested']
const sleep = ms => new Promise(r => setTimeout(r, ms))
const write = (name, value) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2))
const owned = {}
let cleanupPromise
function cleanupResources(injectContextError = false) {
  if (cleanupPromise) return cleanupPromise
  cleanupPromise = (async () => {
    const result = { contextClosed: !owned.context, browserClosed: !owned.browser, errors: [] }
    for (const name of ['context', 'browser']) {
      if (!owned[name]) continue
      let timer
      try {
        if (name === 'context' && injectContextError) throw new Error('controlled context.close failure')
        await Promise.race([owned[name].close(), new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(name + '.close timeout')), 5000)
        })])
        result[name + 'Closed'] = true
      } catch (error) { result.errors.push(name + ': ' + String(error)) }
      finally { clearTimeout(timer) }
    }
    return result
  })()
  return cleanupPromise
}
async function cleanupProbe() {
  const mode = process.env.READINESS_CLEANUP_PROBE
  owned.browser = await chromium.launch({ executablePath: process.env.READINESS_BROWSER, headless: true, handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false })
  owned.context = await owned.browser.newContext()
  await owned.context.newPage()
  process.on('SIGTERM', async () => {
    if (mode === 'ignore-term') return
    const result = await cleanupResources(mode === 'context-close-error')
    write(`cleanup-node-${mode}.json`, result)
    process.exit(143)
  })
  fs.writeFileSync(path.join(stateDir, 'probe-ready'), mode)
  await new Promise(() => {})
}
async function until(label, read, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { const value = await read(); if (value) return value; await sleep(100) }
  throw new Error('Timed out: ' + label)
}
async function main() {
  let browser, context, page, active = 'launch'
  const onTerm = async () => {
    const result = await cleanupResources()
    write('cleanup-termination.json', result)
    process.exit(143)
  }
  process.once('SIGTERM', onTerm)
  try {
    browser = await chromium.launch({ executablePath: process.env.READINESS_BROWSER, headless: true, handleSIGTERM: false, handleSIGINT: false, handleSIGHUP: false })
    owned.browser = browser
    context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    owned.context = context
    await context.route('**/*', route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort())
    page = await context.newPage()
    page.setDefaultTimeout(12000)
    page.on('pageerror', e => errors.push(e.message))
    page.on('request', r => { if (r.url().startsWith(BASE + '/api/')) traffic.push({ method: r.method(), url: r.url(), body: r.postData() }) })
    const api = async (url, method = 'GET', data) => {
      const r = await context.request.fetch(BASE + url, { method, ...(data === undefined ? {} : { data }) })
      const body = await r.json()
      assert.ok(r.ok(), `${method} ${url} ${r.status()} ${JSON.stringify(body)}`)
      return body
    }
    const pass = name => { checks.push(name); console.log('PASS', name) }
    const shot = name => page.screenshot({ path: path.join(evidence, name + '.png') })
    const login = async () => {
      await page.goto(BASE)
      await page.getByText('Log in', { exact: true }).first().click()
      await page.locator('#login-email').fill('test@example.com')
      await page.locator('#login-password').fill('pw-for-e2e')
      await page.keyboard.press('Enter')
      await page.getByText('Client dashboard', { exact: true }).first().waitFor()
      await page.waitForLoadState('networkidle')
    }
    await login()
    active = 'research picked'
    const client = { id: 'readiness-b-' + Date.now(), name: 'Synthetic Readiness Studio', niche: 'Food', audience: 'QA', monthlyTarget: 3, examples: [], cannot: [] }
    await api('/api/clients', 'PUT', [client])
    await api('/api/ideas', 'PUT', [])
    const library = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-library.json')))
    library.videos[0].hook = 'SYNTHETIC QA reference — crispy tofu'
    await api('/api/library', 'PUT', library)
    fixture.push('API: client and labelled synthetic library; browser storage: one research row, no plan')
    const research = { id: client.id + '-link-t4', clientId: client.id, videoId: 'link-t4', account: '@synthetic.qa', platform: 'tiktok', followers: 100, views: 900, keywords: ['synthetic'], hook: library.videos[0].hook, notes: 'Synthetic engineering fixture, not real research', loggedAt: Date.now(), source: 'sample' }
    await page.evaluate(row => {
      localStorage.setItem('trend-finder.research.v4', JSON.stringify([row]))
      localStorage.setItem('trend-finder.research-slots.v2', '[]')
    }, research)
    await page.reload()
    await page.getByRole('button', { name: client.name, exact: true }).first().click()
    await page.getByRole('button', { name: /^Research(?:\s|$)/ }).first().click()
    await page.locator('.rs-s-group button[aria-expanded="false"]').first().click()
    await page.getByRole('button', { name: 'Send @synthetic.qa to Plans for this video', exact: true }).click()
    const idea = await until('UI picked creates corresponding plan', async () => (await api('/api/ideas') || []).find(i => i.id === research.id))
    assert.equal(idea.clientId, client.id); assert.equal(idea.videoId, research.videoId)
    await shot('01-research-picked-1440')
    await page.reload()
    assert.ok((await api('/api/ideas')).some(i => i.id === research.id))
    pass('UI Research picked creates plan with matching row/client/source IDs; reload retains it')
    const shots = [1, 2, 3].map(i => ({ id: `readiness-shot-${i}`, time: `${i}s`, shot: `Synthetic shot ${i}`, text: `QA ${i}`, line: `Synthetic spoken line ${i}.` }))
    await api('/api/ideas', 'PUT', [{ ...idea, status: 'saved', shots }])
    active = 'positive script persistence'
    await page.goto(BASE)
    await page.locator('.switcher-btn').click()
    await page.getByRole('menuitem').filter({ hasText: client.name }).click()
    await page.getByRole('button', { name: /^Plans(?:\s|$)/ }).first().click()
    await page.getByRole('button', { name: 'Open plan', exact: true }).first().click()
    const scriptPut = page.waitForResponse(r => r.url() === BASE + '/api/ideas' && r.request().method() === 'PUT')
    await page.getByRole('button', { name: 'Write the script', exact: true }).click()
    const scriptResponse = await scriptPut
    const scriptRequest = scriptResponse.request().postDataJSON()
    const scriptReply = await scriptResponse.json()
    const scriptGet = await api('/api/ideas')
    const sent = scriptRequest.find(i => i.id === idea.id)
    assert.ok(sent.script?.lines?.length === 3, 'UI really submitted a script')
    for (const response of [scriptReply, scriptGet]) {
      const saved = response.find(i => i.id === idea.id).script
      assert.ok(saved, 'script must be preserved by PUT response and GET')
      assert.deepEqual(saved.lines, sent.script.lines)
      assert.equal(saved.basedOn, sent.script.basedOn)
      assert.equal(saved.writtenAt, sent.script.writtenAt)
    }
    const editScript = async (label, value, field) => {
      const saved = page.waitForResponse(r => r.url() === BASE + '/api/ideas' && r.request().method() === 'PUT' &&
        r.request().postDataJSON().some(i => i.id === idea.id && i.script?.lines?.[0]?.[field] === value))
      await page.getByRole('textbox', { name: label, exact: true }).fill(value)
      const response = await saved
      assert.equal(response.status(), 200)
      const body = await response.json()
      assert.equal(body.find(i => i.id === idea.id).script.lines[0][field], value)
    }
    await editScript('What is said in shot 1', 'EDITED SCRIPT SAY: persisted independently', 'say')
    await editScript('Words on screen in shot 1', 'EDITED SCRIPT SCREEN', 'onScreen')
    const editedPlan = (await api('/api/ideas')).find(i => i.id === idea.id)
    assert.equal(editedPlan.script.edited, true)
    assert.equal(editedPlan.shots[0].line, shots[0].line, 'script edit does not synchronize shots.line')
    const metadataShots = shots.map((s, i) => ({ ...s, ...(i === 0 ? { footage: { key: 'qa-image', kind: 'image', name: 'synthetic.svg', src: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E', deviceOnly: false } } : i === 1 ? { footage: { key: 'qa-device-video', kind: 'video', name: 'device-only-fixture.mp4', deviceOnly: true } } : {}) }))
    const boardLayout = [{ x: -42.5, y: 15.25 }, { x: 400, y: 16 }, { x: 800, y: 16 }]
    const approvedPlan = { ...editedPlan, status: 'approved', shots: metadataShots, boardLayout }
    const metadataReply = await api('/api/ideas', 'PUT', [approvedPlan])
    const assertMetadata = list => {
      const plan = list.find(i => i.id === idea.id)
      assert.deepEqual(plan.script, editedPlan.script)
      assert.deepEqual(plan.boardLayout, boardLayout)
      assert.deepEqual(plan.shots.map(s => s.footage ?? null), metadataShots.map(s => s.footage ?? null))
    }
    assertMetadata(metadataReply); assertMetadata(await api('/api/ideas'))
    await page.reload()
    assertMetadata(await api('/api/ideas'))
    write('script-metadata-roundtrip.json', { request: scriptRequest, status: scriptResponse.status(), response: scriptReply, get: scriptGet, editedPlan, metadataRequest: approvedPlan, metadataReply, note: 'Positive persistence assertions; script edits remain separate from shots.line/captions' })
    await shot('script-after-save-1440')
    pass('UI script creation/edit survives PUT response and GET; script/layout/footage metadata survive reload')
    fixture.push('API: approved plan with three explicit shot IDs, scripted lines and durations; no AI breakdown or automatic reference frames')
    const base = '/api/ideas/' + idea.id
    const canvas = base + '/canvas'
    const graph = () => api(canvas)
    const edit = () => api(base + '/edit')
    const home = async () => {
      await page.goto(BASE)
      await page.locator('.switcher-btn').click()
      await page.getByRole('menuitem').filter({ hasText: client.name }).click()
    }
    const openCanvas = async () => {
      await home()
      await page.getByRole('button', { name: /^Plans(?:\s|$)/ }).first().click()
      await page.getByRole('button', { name: 'Open plan', exact: true }).first().click()
      await page.getByRole('button', { name: 'Open the canvas', exact: true }).click()
      await page.locator('.fc-screen').waitFor()
    }
    active = 'canvas'
    await openCanvas()
    const before = await graph()
    fixture.push('API: boardLayout plus image/deviceOnly footage metadata; not a take upload')
    write('plan-canvas-contract.json', { research, idea: await api('/api/ideas'), graph: before })
    const flow = id => page.locator(`.react-flow__node[data-id=${JSON.stringify(id)}]`)
    const fit = async () => {
      await page.getByRole('button', { name: 'Fit to screen', exact: true }).click()
      let old, stable = 0
      await until('fit settles', async () => { const now = await page.locator('.react-flow__viewport').getAttribute('style'); stable = now === old ? stable + 1 : 0; old = now; return stable >= 3 })
    }
    const add = async (type, label) => {
      const ids = new Set((await graph()).doc.nodes.map(n => n.id))
      await page.getByRole('button', { name: label, exact: true }).first().click()
      return until('add ' + type, async () => (await graph()).doc.nodes.find(n => n.type === type && !ids.has(n.id)))
    }
    const wire = async (a, b, handle) => {
      await fit()
      const from = await flow(a).locator('.react-flow__handle.source[data-handleid="out"]').boundingBox()
      const to = await flow(b).locator(`.react-flow__handle.target[data-handleid=${JSON.stringify(handle)}]`).boundingBox()
      assert.ok(from && to)
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down()
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 16 }); await page.mouse.up()
      await until('wire ' + handle, async () => handle === 'in:clips' ? (await edit()).project.clips.length : (await graph()).doc.edges.some(e => e.source === a && e.target === b && e.targetHandle === handle))
    }
    await fit()
    const emptyPoint = await page.locator('.react-flow__pane').evaluate(el => {
      const r = el.getBoundingClientRect()
      for (let y = r.y + 100; y < r.bottom - 100; y += 100) for (let x = r.x + 200; x < r.right - 100; x += 100) {
        if (document.elementFromPoint(x, y) === el) return { x, y }
      }
    })
    assert.ok(emptyPoint, 'a visible blank pane location')
    await page.mouse.click(emptyPoint.x, emptyPoint.y)
    await until('no selected nodes', () => page.locator('.fc-node.is-selected').count().then(n => n === 0))
    await page.getByRole('button', { name: 'Video generator', exact: true }).first().click()
    await page.getByText('Choose a shot…', { exact: true }).waitFor()
    assert.equal((await graph()).doc.nodes.length, before.doc.nodes.length, 'unselected toolbar must not create a node')
    await flow('n_shot_' + shots[1].id).locator('.fc-node-title').click()
    const video = await add('video', 'Video generator')
    assert.equal(video.shotId, shots[1].id)
    assert.deepEqual((await graph()).doc.edges, before.doc.edges, 'toolbar inheritance must not add an implicit edge')
    pass('legacy UI rejects unselected toolbar add; selecting shot 2 creates video scoped to shot 2 without implicit edge')
    const prompt = await add('prompt', 'Prompt')
    await flow(prompt.id).getByRole('textbox', { name: 'Prompt', exact: true }).fill('SYNTHETIC QA cup on a table')
    await until('prompt saved', async () => (await graph()).doc.nodes.find(n => n.id === prompt.id).data.text === 'SYNTHETIC QA cup on a table')
    await wire(prompt.id, video.id, 'in:text')
    await flow(video.id).getByRole('button', { name: 'Run', exact: true }).last().click()
    const generated = await until('mock generated selected', async () => {
      const s = await graph(), n = s.doc.nodes.find(n => n.id === video.id)
      return s.generations.find(g => g.id === n.data.selected && g.status === 'done')
    }, 60000)
    assert.equal(generated.model, 'mock-video')
    await flow(prompt.id).getByRole('textbox', { name: 'Prompt', exact: true }).fill('SYNTHETIC QA second successful version')
    await until('second prompt saved', async () => (await graph()).doc.nodes.find(n => n.id === prompt.id).data.text.includes('second successful'))
    await flow(video.id).getByRole('button', { name: 'Run', exact: true }).last().click()
    const second = await until('second success selected', async () => {
      const s = await graph(), n = s.doc.nodes.find(n => n.id === video.id)
      return s.generations.find(g => g.id === n.data.selected && g.status === 'done' && g.id !== generated.id)
    })
    await page.getByRole('button', { name: /History/ }).click()
    await page.locator('.fc-history').getByRole('button', { name: 'Use this version', exact: true }).last().click()
    await until('manual older version selected', async () => (await graph()).doc.nodes.find(n => n.id === video.id).data.selected === generated.id)
    await shot('history-manual-old-version-1440')
    await page.locator('.fc-dock').getByRole('button', { name: 'Close', exact: true }).click()
    await page.reload(); await openCanvas(); await fit()
    assert.equal((await graph()).doc.nodes.find(n => n.id === video.id).data.selected, generated.id)
    pass('manual successful History selection survives reload/reopen and is not replaced by newest success')
    const beforeFailure = (await graph()).generations.length
    await flow(prompt.id).getByRole('textbox', { name: 'Prompt', exact: true }).fill('SYNTHETIC QA #fail')
    await until('failure prompt saved', async () => (await graph()).doc.nodes.find(n => n.id === prompt.id).data.text.includes('#fail'))
    await flow(video.id).getByRole('button', { name: 'Run', exact: true }).last().click()
    const failed = await until('new mock failure', async () => {
      const s = await graph()
      return s.generations.length > beforeFailure && s.generations.find(g => g.nodeId === video.id && g.status === 'failed')
    })
    assert.ok(failed.error)
    assert.equal((await graph()).doc.nodes.find(n => n.id === video.id).data.selected, generated.id)
    await page.getByText(failed.error, { exact: false }).first().waitFor()
    await shot('current-failure-old-result-retained-1440')
    pass('new mock failure is visibly reported; selected previous successful output is retained')
    const zero = await context.request.get(BASE + '/api/search?q=uncached-readiness&platform=tiktok&fresh=1')
    const miss = await context.request.get(BASE + '/api/search?q=uncached-readiness&platform=youtube&cachedOnly=1')
    assert.equal(zero.status(), 503); assert.equal(miss.status(), 200)
    const missed = await miss.json()
    assert.deepEqual(missed.videos, []); assert.equal(missed.cached, false)
    write('zero-budget-http.json', { freshStatus: zero.status(), freshBody: await zero.json(), cachedStatus: miss.status(), cachedBody: missed, note: 'No credentials: 503 before wallet; 429/provider-call-count=0 separately covered by zero-spend spy suite' })
    pass('real HTTP refuses credential-free live search; cached-only YouTube miss returns empty uncached result')
    const editor = await add('editor', 'Editor & output')
    await wire(video.id, editor.id, 'in:clips')
    assert.equal((await edit()).project.clips[0].source.shotId, shots[1].id)
    assert.equal((await edit()).project.clips[0].source.id, generated.id)
    write('toolbar-history-contract.json', { video, first: generated, second, project: (await edit()).project })
    pass('true toolbar shot-2 mock output connects to Editor with source.shotId=shot2')
    const originalViewport = (await graph()).doc.viewport
    await page.mouse.move(1100, 260)
    await page.mouse.wheel(0, -180)
    await until('UI zoom saves a changed viewport', async () => (await graph()).doc.viewport.zoom !== originalViewport.zoom)
    await shot('02-canvas-1440')
    const savedGraph = (await graph()).doc
    await page.reload(); await openCanvas()
    assert.deepEqual((await graph()).doc, savedGraph)
    await until('saved viewport rendered', () => page.locator('.react-flow__viewport').evaluate((el, saved) => {
      const matrix = new DOMMatrix(getComputedStyle(el).transform)
      return Math.abs(matrix.a - saved.zoom) < .01 && Math.abs(matrix.e - saved.x) < 1 && Math.abs(matrix.f - saved.y) < 1
    }, savedGraph.viewport))
    pass('UI Canvas prompt/nodes/edges/mock selected output/viewport survive reload and reopen')
    active = 'editor'
    await fit()
    await flow(editor.id).getByRole('button', { name: /Open editor/ }).click()
    await page.locator('.cv-ed-clip').first().click()
    await page.getByRole('spinbutton', { name: 'Length (seconds)', exact: true }).fill('2')
    await page.getByRole('spinbutton', { name: 'Length (seconds)', exact: true }).press('Enter')
    await until('trim', async () => (await edit()).project.clips[0].out === 2)
    const ruler = page.getByRole('slider', { name: 'Time ruler. Click to move the playhead.', exact: true })
    const box = await ruler.boundingBox()
    const tick = await ruler.locator('.cv-ed-tick').nth(1).evaluate(el => parseFloat(el.style.left))
    await page.mouse.click(box.x + tick, box.y + box.height / 2)
    await page.getByRole('button', { name: 'Split at playhead', exact: true }).click()
    await until('split', async () => (await edit()).project.clips.length === 2)
    const split = (await edit()).project.clips.map(c => c.id)
    await page.locator('.cv-ed-clip').last().click()
    await page.getByRole('button', { name: 'Move earlier', exact: true }).click()
    await until('reorder', async () => (await edit()).project.clips[0].id === split[1])
    await page.locator('#cv-ed-tab-text').click()
    await page.getByRole('button', { name: 'Add text at the playhead', exact: true }).click()
    await page.getByRole('textbox', { name: 'Words', exact: true }).fill('Synthetic QA persisted text')
    await until('text', async () => (await edit()).project.texts.some(t => t.text === 'Synthetic QA persisted text'))
    await page.locator('#cv-ed-tab-captions').click()
    const captionSwitch = page.getByRole('checkbox', { name: 'Show captions in the video', exact: true })
    await captionSwitch.uncheck()
    await until('captions off saved', async () => !(await edit()).project.captions.enabled)
    await captionSwitch.check()
    await until('captions on saved', async () => (await edit()).project.captions.enabled)
    await page.getByRole('textbox', { name: 'Caption of shot 2', exact: true }).fill('CUSTOM CAPTION FOR SHOT TWO')
    await until('custom caption saved', async () => (await edit()).project.clips.some(c => c.source.shotId === shots[1].id && c.caption === 'CUSTOM CAPTION FOR SHOT TWO'))
    const syntheticMedia = await context.request.get(BASE + generated.url)
    const syntheticBytes = await syntheticMedia.body()
    const uploadResponse = await context.request.post(BASE + base + '/shots/0/takes', {
      headers: { 'content-type': 'video/mp4', 'x-filename': 'synthetic-authorized-mock-fixture.mp4' }, data: syntheticBytes })
    assert.ok(uploadResponse.ok())
    const take = await uploadResponse.json()
    assert.equal(take.shotId, shots[0].id)
    fixture.push('True take API upload uses authorized synthetic mock MP4 bytes, not human footage; Editor placement is UI')
    await page.reload(); await home()
    await page.getByRole('button', { name: /^Plans(?:\s|$)/ }).first().click()
    await page.getByRole('button', { name: 'Make the video', exact: true }).click()
    await page.locator('.cv-ed-shot').first().getByRole('button', { name: 'Put in timeline', exact: true }).click()
    await until('true take in editor', async () => (await edit()).project.clips.some(c => c.source.kind === 'take' && c.source.id === take.id && c.source.shotId === shots[0].id))
    const takeReply = await context.request.get(BASE + take.url)
    assert.equal(createHash('sha256').update(await takeReply.body()).digest('hex'), createHash('sha256').update(syntheticBytes).digest('hex'))
    write('take-upload.json', { take, sha256: createHash('sha256').update(syntheticBytes).digest('hex'), project: (await edit()).project })
    pass('caption toggle/custom text persists reload; real synthetic take upload enters Editor through UI')
    await shot('03-editor-en-light-1440')
    const savedEdit = await edit(), finalGraph = await graph()
    write('before-restart.json', { graph: finalGraph, edit: savedEdit })
    const media = await context.request.get(BASE + generated.url)
    assert.ok(media.ok()); const hash = createHash('sha256').update(await media.body()).digest('hex')
    const count = finalGraph.generations.length
    const submissions = () => traffic.filter(r => r.method === 'POST' && r.url === BASE + base + '/gen').length
    const submitsBefore = submissions()
    const token = randomUUID()
    fs.writeFileSync(path.join(stateDir, 'restart-request'), token)
    await until('actual HTTP restart', async () => fs.existsSync(path.join(stateDir, 'restart-done')) && JSON.parse(fs.readFileSync(path.join(stateDir, 'restart-done'))).token === token)
    assert.deepEqual(await graph(), finalGraph); assert.deepEqual(await edit(), savedEdit)
    assertMetadata(await api('/api/ideas'))
    assert.equal((await edit()).project.captions.enabled, true)
    assert.ok((await edit()).project.clips.some(c => c.source.shotId === shots[1].id && c.caption === 'CUSTOM CAPTION FOR SHOT TWO'))
    const restartedTake = await context.request.get(BASE + take.url)
    assert.equal(createHash('sha256').update(await restartedTake.body()).digest('hex'), createHash('sha256').update(syntheticBytes).digest('hex'))
    write('metadata-after-http-restart.json', (await api('/api/ideas')).find(i => i.id === idea.id))
    const afterMedia = await context.request.get(BASE + generated.url)
    assert.equal(createHash('sha256').update(await afterMedia.body()).digest('hex'), hash)
    assert.equal((await graph()).generations.length, count)
    write('media-hash.json', { url: generated.url, sha256: hash })
    pass('real backend PID restart preserves script/layout/footage, exact DB/media hashes, graph/edit and generation count')
    // The real canvas back button still exposes the standalone workspace picker.
    await page.getByRole('button', { name: 'Back to canvas', exact: false }).click()
    await page.locator('.fc-back').click()
    await page.locator('#canvas-name').fill('UI workspace regression')
    await page.getByRole('button', { name: /Create canvas/ }).click()
    await page.locator('.fc-screen').waitFor()
    const spaces = await api('/api/workspaces?clientId=' + client.id)
    const workspace = spaces.workspaces.find(w => w.title === 'UI workspace regression')
    assert.ok(workspace)
    await page.getByRole('button', { name: 'Video generator', exact: true }).first().click()
    const workspaceGraph = await until('workspace free video saves', async () => {
      const s = await api('/api/workspaces/' + workspace.id)
      return s.doc.nodes.some(n => n.type === 'video') && s
    })
    assert.ok(workspaceGraph.doc.nodes.filter(n => n.type === 'video').every(n => !n.shotId))
    write('workspace-free-video.json', workspaceGraph)
    pass('UI standalone workspace still creates a free video without a shot')
    active = 'reopened editor playback and themes'
    for (const [lang, theme] of [['en', 'light'], ['en', 'dark'], ['zh-Hant', 'light'], ['zh-Hant', 'dark']]) {
      await page.evaluate(({ lang, theme }) => { localStorage.setItem('remake.lang', lang); localStorage.setItem('remake.theme', theme) }, { lang, theme })
      await page.reload()
      await page.locator('.switcher-btn').click()
      await page.getByRole('menuitem').filter({ hasText: client.name }).click()
      // Stable CSS entry points; the translated labels remain visible in screenshots.
      await page.locator('.side-nav button').count().then(n => assert.ok(n, 'sidebar available'))
      const plans = page.getByRole('button', { name: lang === 'en' ? /^Plans(?:\s|$)/ : /^企劃(?:\s|$)/ }).first()
      await plans.click()
      await page.getByRole('button', { name: lang === 'en' ? 'Make the video' : '製作影片', exact: true }).click()
      await page.locator('.fc-editor .cv-ed-full').waitFor()
      assert.deepEqual(await edit(), savedEdit)
      await page.locator('#cv-ed-tab-text').click()
      assert.ok(await page.locator('.cv-ed-tool textarea').isEditable())
      await shot(`editor-${lang}-${theme}-1440`)
    }
    pass('Editor trim/order/text survive HTTP restart and EN/zh-Hant light/dark reopen')
    const videoElement = page.locator('video').first()
    await videoElement.evaluate(async el => { el.muted = true; await el.play() })
    await until('media actually playing', () => videoElement.evaluate(el => el.currentTime > .2 && !el.error))
    pass('persisted mock video actually plays after restart')
    assert.equal(submissions(), submitsBefore, 'reload/restart must not resubmit generation')
    write('generation-audit.json', { generationRows: count, browserSubmitCountBeforeRestart: submitsBefore, browserSubmitCountAfterRestart: submissions(), actualProvider: 'mock', note: 'Zero-budget refusal provider spies are in zero-spend.log; no live provider tested' })
    assert.deepEqual(errors, [])
  } catch (e) {
    if (page) { await page.screenshot({ path: path.join(evidence, 'failure.png') }).catch(() => {}); fs.writeFileSync(path.join(evidence, 'failure-dom.txt'), await page.locator('body').innerText().catch(() => '')) }
    write('failure.json', { active, error: String(e), stack: e.stack }); throw e
  } finally {
    const cleanup = await cleanupResources()
    process.off('SIGTERM', onTerm)
    write('ui-results.json', { active, scope: 'Positive persistence, true toolbar shot association, history, captions, synthetic take and owned HTTP restart',
      priorDiagnostics: { artifacts: '/tmp/buildclub-readiness-b/attempt-4', base: '2c069a84569cd9ed2a70c4d284626057e5118e36', note: 'Original toolbar failure; not a hardcoded current product assertion' },
      checks, fixture, errors, traffic, notRun: pending, cleanup })
    if (cleanup.errors.length) throw new Error('UI cleanup failed: ' + cleanup.errors.join('; '))
  }
}
;(process.env.READINESS_CLEANUP_PROBE ? cleanupProbe() : main()).catch(e => { console.error(e); process.exitCode = 1 })
