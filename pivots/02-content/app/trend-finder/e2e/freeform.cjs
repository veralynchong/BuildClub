// Run only through bin/freeform-e2e.py: temporary state, owned browser and local-only network.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require(process.env.PW_CORE)
const BASE = process.env.BASE
const evidence = process.env.FREEFORM_EVIDENCE_DIR
assert.ok(BASE && evidence && process.env.REMOTION_BROWSER_EXECUTABLE, 'use the isolated runner')
const checks = []
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
async function localContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await context.route('**/*', route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort())
  return context
}
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.REMOTION_BROWSER_EXECUTABLE, headless: true })
  let context, approver, page
  let workspace
  const errors = []
  try {
    context = await localContext(browser)
    page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(BASE)
    await page.getByText('Log in', { exact: true }).first().click()
    await page.locator('#login-email').fill('test@example.com')
    await page.locator('#login-password').fill('pw-for-e2e')
    await page.keyboard.press('Enter')
    await page.getByText('Client dashboard', { exact: true }).first().waitFor()
    await page.waitForLoadState('networkidle')
    const api = async (url, method = 'GET', data) => {
      const response = await context.request.fetch(BASE + url, { method, ...(data === undefined ? {} : { data }) })
      const body = await response.json()
      assert.ok(response.ok(), `${method} ${url}: ${response.status()} ${JSON.stringify(body)}`)
      return body
    }
    // Account/client setup is a fixture; no plan, shot, library video or approval is seeded.
    await api('/api/clients', 'PUT', [{ id: 'freeform-e2e', name: 'Freeform Studio', niche: 'Food', audience: 'Sydney creators', monthlyTarget: 8, examples: [], cannot: [] }])
    await page.reload()
    await page.getByRole('button', { name: 'Freeform Studio', exact: true }).first().click()
    const picker = async () => {
      await page.getByRole('button', { name: 'Canvas', exact: true }).first().click()
      await page.locator('.fc-picker').waitFor()
    }
    await picker()
    await page.locator('#canvas-name').fill('Blank canvas proof')
    await page.getByRole('button', { name: /Create canvas/ }).click()
    await page.locator('.fc-screen').waitFor()
    const spaces = await api('/api/workspaces?clientId=freeform-e2e')
    workspace = spaces.workspaces.find(w => w.title === 'Blank canvas proof')
    assert.ok(workspace)
    const base = `/api/workspaces/${workspace.id}`
    const state = () => api(base)
    assert.equal(await page.locator('.fc-node').count(), 0)
    assert.deepEqual((await state()).doc.nodes, [])
    assert.deepEqual((await state()).doc.edges, [])
    assert.equal((await api('/api/ideas') ?? []).length, 0)
    const canvasBox = await page.locator('.fc-screen').boundingBox()
    assert.ok(canvasBox.x <= 45 && canvasBox.y <= 1 && canvasBox.x + canvasBox.width >= 1439 && canvasBox.y + canvasBox.height <= 901, JSON.stringify(canvasBox))
    fs.writeFileSync(path.join(evidence, 'canvas-geometry.json'), JSON.stringify(canvasBox, null, 2))
    ok('UI creates a genuinely empty workspace without a plan or approval')
    await page.screenshot({ path: path.join(evidence, '01-empty-1440.png') })
    const flowNode = id => page.locator(`.react-flow__node[data-id=${JSON.stringify(id)}]`)
    const fit = async () => {
      await page.getByRole('button', { name: 'Fit to screen', exact: true }).click()
      let previous, stable = 0
      await until('fit animation settles', async () => {
        const current = await page.locator('.react-flow__viewport').getAttribute('style')
        stable = current === previous ? stable + 1 : 0
        previous = current
        return stable >= 3
      })
    }
    const add = async (kind, label) => {
      const before = new Set((await state()).doc.nodes.map(n => n.id))
      await page.getByRole('button', { name: label, exact: true }).first().click()
      return until('save added ' + kind, async () => (await state()).doc.nodes.find(n => n.type === kind && !before.has(n.id)))
    }
    const wire = async (from, to, handle) => {
      await fit()
      const source = flowNode(from).locator('.react-flow__handle.source[data-handleid="out"]')
      const target = flowNode(to).locator(`.react-flow__handle.target[data-handleid=${JSON.stringify(handle)}]`)
      await source.waitFor(); await target.waitFor()
      const a = await source.boundingBox(), b = await target.boundingBox()
      assert.ok(a && b, 'visible typed handles')
      fs.appendFileSync(path.join(evidence, 'wire-targets.jsonl'), JSON.stringify(await page.evaluate(({ a, b }) => {
        const hit = box => { const el = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)?.closest('.react-flow__handle'); return el ? { node: el.getAttribute('data-nodeid'), handle: el.getAttribute('data-handleid'), classes: el.className } : null }
        return { source: hit(a), target: hit(b), a, b }
      }, { a, b })) + '\n')
      await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
      await page.mouse.down()
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 16 })
      await page.mouse.up()
      await until('persist connection ' + handle, async () => {
        if (handle === 'in:clips') return (await api(base + '/edit')).project.clips.length > 0
        if (handle === 'in:audio') return (await api(base + '/edit')).project.voiceover.length > 0
        return (await state()).doc.edges.some(e => e.source === from && e.target === to && e.targetHandle === handle)
      })
    }
    const run = async node => {
      await flowNode(node.id).getByRole('button', { name: 'Run', exact: true }).last().click()
      return until('generated and selected ' + node.type, async () => {
        const s = await state(), n = s.doc.nodes.find(n => n.id === node.id)
        const g = s.generations.find(g => g.id === n.data.selected && g.status === 'done')
        if (node.type === 'voice' && !n.data.voiceId) return false
        return g && { generation: g, node: n }
      }, 90000)
    }
    const prompt = await add('prompt', 'Prompt')
    const text = 'A red ceramic cup on a Sydney cafe table, soft morning light.'
    await flowNode(prompt.id).getByRole('textbox', { name: 'Prompt', exact: true }).fill(text)
    await until('save prompt', async () => (await state()).doc.nodes.find(n => n.id === prompt.id).data.text === text)
    const originalPosition = (await state()).doc.nodes.find(n => n.id === prompt.id).position
    const titleBox = await flowNode(prompt.id).locator('.fc-node-title').boundingBox()
    await page.mouse.move(titleBox.x + titleBox.width / 2, titleBox.y + titleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(titleBox.x + titleBox.width / 2 + 70, titleBox.y + titleBox.height / 2 + 45, { steps: 12 })
    await page.mouse.up()
    const movedPosition = await until('dragged node position persists', async () => {
      const position = (await state()).doc.nodes.find(n => n.id === prompt.id).position
      return (position.x !== originalPosition.x || position.y !== originalPosition.y) && position
    })
    const beforeZoom = (await state()).doc.viewport
    await page.mouse.move(1100, 260)
    await page.mouse.wheel(0, -180)
    const savedViewport = await until('user zoom viewport persists', async () => {
      const viewport = (await state()).doc.viewport
      return viewport.zoom !== beforeZoom.zoom && viewport
    })
    await page.reload()
    await picker()
    await page.getByText('Blank canvas proof', { exact: true }).first().click()
    await page.locator('.fc-screen').waitFor()
    assert.deepEqual((await state()).doc.nodes.find(n => n.id === prompt.id).position, movedPosition)
    assert.deepEqual((await state()).doc.viewport, savedViewport)
    await until('saved viewport is rendered', () => page.locator('.react-flow__viewport').evaluate((el, saved) => {
      const matrix = new DOMMatrix(getComputedStyle(el).transform)
      return Math.abs(matrix.a - saved.zoom) < 0.01 && Math.abs(matrix.e - saved.x) < 1 && Math.abs(matrix.f - saved.y) < 1
    }, savedViewport))
    ok('actual node drag and wheel zoom persist and render after reload')
    const image = await add('storyboard', 'Image generator')
    await wire(prompt.id, image.id, 'in:text')
    const imageResult = await run(image)
    assert.equal(imageResult.generation.inputs.prompt, text)
    const video = await add('video', 'Video generator')
    await wire(image.id, video.id, 'in:start')
    await wire(prompt.id, video.id, 'in:text')
    const videoResult = await run(video)
    assert.equal(videoResult.generation.inputs.prompt, text)
    assert.equal(videoResult.generation.inputs.startFrame, imageResult.generation.id)
    ok('UI typed connections actually supply saved prompt and selected image to mock generation')
    const voice = await add('voice', 'Voiceover')
    await wire(prompt.id, voice.id, 'in:text')
    const voiceResult = await run(voice)
    assert.equal(voiceResult.generation.inputs.prompt, text)
    const editor = await add('editor', 'Editor & output')
    await wire(video.id, editor.id, 'in:clips')
    await wire(voice.id, editor.id, 'in:audio')
    const editWithVoice = await api(base + '/edit')
    assert.equal(editWithVoice.project.voiceover[0].id, voiceResult.node.data.voiceId)
    assert.ok(!(await state()).doc.edges.some(e => e.target === editor.id), 'editor wires are derived, not stored twice')
    ok('generated voice is persisted and connected to the actual edit project')
    const fixture = path.join(process.env.FREEFORM_WORK_DIR, 'uploaded.mp4')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=720x1280:rate=30:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', fixture])
    const upload = await add('upload', 'Upload media')
    const imageFixture = path.join(process.env.FREEFORM_WORK_DIR, 'uploaded.png')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:size=720x1280', '-frames:v', '1', imageFixture])
    await flowNode(upload.id).locator('input[type=file]').setInputFiles(imageFixture)
    const uploadedImage = await until('real uploaded image persists', async () => {
      const s = await state(), n = s.doc.nodes.find(n => n.id === upload.id)
      return s.generations.find(g => g.id === n.data.selected && g.kind === 'image' && g.model === 'upload')
    })
    assert.equal((await context.request.get(BASE + uploadedImage.url)).status(), 200)
    await flowNode(upload.id).locator('input[type=file]').setInputFiles(fixture)
    const uploaded = await until('persist real uploaded video', async () => {
      const s = await state(), n = s.doc.nodes.find(n => n.id === upload.id)
      return s.generations.find(g => g.id === n.data.selected && g.kind === 'video' && g.model === 'upload')
    })
    assert.ok(uploaded.url.startsWith(base + '/'))
    assert.ok((await state()).generations.some(g => g.id === uploadedImage.id), 'replacing upload preserves the previous image version')
    await wire(upload.id, editor.id, 'in:clips')
    await until('both video sources in timeline', async () => (await api(base + '/edit')).project.clips.length === 2)
    assert.deepEqual((await state()).takes, [])
    ok('real video upload is durable without creating shots or takes and enters the timeline')
    await fit()
    const connectedHeader = await page.locator('.fc-top').boundingBox()
    assert.ok(connectedHeader.y >= -0.1 && connectedHeader.y <= 1 && connectedHeader.height >= 57, JSON.stringify(connectedHeader))
    fs.writeFileSync(path.join(evidence, 'connected-header-geometry.json'), JSON.stringify(connectedHeader, null, 2))
    await page.screenshot({ path: path.join(evidence, '02-connected-1440.png') })
    await flowNode(image.id).locator('.fc-node-title').click()
    await page.locator('.fc-floating').getByRole('button', { name: 'Settings', exact: true }).click()
    const inspector = page.locator('.fc-dock')
    await inspector.waitFor()
    const inspectorBox = await inspector.boundingBox()
    assert.ok(inspectorBox.x >= 44 && inspectorBox.x + inspectorBox.width <= 1441 && inspectorBox.y + inspectorBox.height <= 901, JSON.stringify(inspectorBox))
    assert.equal(await inspector.locator('h3').first().evaluate(el => getComputedStyle(el).color), 'rgb(237, 237, 237)')
    await page.screenshot({ path: path.join(evidence, '06-inspector-1440.png') })
    const portStyles = await page.locator('.fc-port').evaluateAll(els => els.map(el => {
      const css = getComputedStyle(el)
      return { node: el.getAttribute('data-nodeid'), handle: el.getAttribute('data-handleid'), width: css.width, height: css.height, minWidth: css.minWidth, minHeight: css.minHeight, padding: css.padding }
    }))
    fs.writeFileSync(path.join(evidence, 'port-styles.json'), JSON.stringify(portStyles, null, 2))
    for (const port of portStyles.filter(port => port.handle !== 'out')) { assert.equal(port.width, '13px'); assert.equal(port.height, '13px'); assert.equal(port.padding, '0px') }
    await inspector.getByRole('button', { name: 'Close', exact: true }).click()
    await page.getByRole('button', { name: /Review link/ }).click()
    const dialog = page.getByRole('dialog')
    const reviewUrl = new URL(await dialog.locator('input').inputValue(), BASE).href
    const restartWithState = async label => {
      const request = process.env.FREEFORM_RESTART_REQUEST, done = process.env.FREEFORM_RESTART_DONE
      assert.ok(request && done, 'use the owned restart supervisor')
      const graph = await state(), editBefore = await api(base + '/edit'), voicesBefore = await api(base + '/edit/voice'), cutBefore = await api(base + '/cut')
      const publicUrl = BASE + '/api/review/' + encodeURIComponent(new URL(reviewUrl).pathname.split('/').pop())
      const publicBefore = await approver.request.get(publicUrl)
      assert.equal(publicBefore.status(), 200)
      const publicData = await publicBefore.json()
      const urls = [...new Set([...graph.generations.map(g => g.url), ...voicesBefore.voices.map(v => v.url), cutBefore.output.url].filter(Boolean))]
      const mediaHashes = async () => {
        const hashes = {}
        for (const url of urls) {
          const address = new URL(url, BASE)
          assert.equal(address.origin, BASE)
          const response = await context.request.get(address.href)
          assert.equal(response.status(), 200)
          hashes[url] = require('node:crypto').createHash('sha256').update(await response.body()).digest('hex')
        }
        return hashes
      }
      const beforeHashes = await mediaHashes()
      const token = require('node:crypto').randomBytes(16).toString('hex')
      fs.writeFileSync(request + '.tmp', token)
      fs.renameSync(request + '.tmp', request)
      const acknowledgement = await until('owned backend restart ' + label, async () => {
        if (!fs.existsSync(done)) return false
        const ack = JSON.parse(fs.readFileSync(done, 'utf8'))
        return ack.token === token && ack
      }, 45000)
      assert.notEqual(acknowledgement.oldPid, acknowledgement.newPid)
      assert.ok([0, -15].includes(acknowledgement.oldExit))
      assert.deepEqual(await state(), graph)
      assert.deepEqual(await api(base + '/edit'), editBefore)
      assert.deepEqual(await api(base + '/edit/voice'), voicesBefore)
      assert.deepEqual(await api(base + '/cut'), cutBefore)
      const publicAfter = await approver.request.get(publicUrl)
      assert.equal(publicAfter.status(), 200)
      assert.deepEqual(await publicAfter.json(), publicData)
      assert.deepEqual(await mediaHashes(), beforeHashes)
      fs.writeFileSync(path.join(evidence, 'restart-' + label + '.json'), JSON.stringify({ acknowledgement, graphVersion: graph.version, editVersion: editBefore.version, review: cutBefore.review, mediaSha256: beforeHashes }, null, 2))
      ok('actual backend restart preserves ' + label + ' review, graph, generations, editor, voice and byte-identical media')
    }
    await dialog.getByRole('button', { name: 'Close', exact: true }).click()
    // Isolate the connected voice in the rendered audio, keeping both visual clips.
    const project = await api(base + '/edit')
    await api(base + '/edit', 'PUT', { version: project.version, project: { ...project.project, clips: project.project.clips.map(c => ({ ...c, muted: true })) } })
    await page.reload()
    await picker()
    await page.getByText('Blank canvas proof', { exact: true }).first().click()
    await page.locator('.fc-screen').waitFor()
    assert.equal((await state()).doc.nodes.length, 6)
    const restored = await api(base + '/edit')
    assert.equal(restored.project.clips.length, 2)
    assert.equal(restored.project.voiceover[0].id, voiceResult.node.data.voiceId)
    ok('reload/reopen preserves graph, selected outputs, clips and connected audio')
    await fit()
    await flowNode(editor.id).getByRole('button', { name: /Open editor/ }).click()
    await page.locator('.cv-ed-clip').first().click()
    await page.getByRole('spinbutton', { name: 'Length (seconds)', exact: true }).fill('1.5')
    await page.getByRole('spinbutton', { name: 'Length (seconds)', exact: true }).press('Enter')
    await until('UI trim persists', async () => { const c = (await api(base + '/edit')).project.clips[0]; return Math.abs(c.out - c.in - 1.5) < 0.05 })
    const ruler = page.getByRole('slider', { name: 'Time ruler. Click to move the playhead.', exact: true })
    const rulerBox = await ruler.boundingBox()
    const tickStep = await ruler.locator('.cv-ed-tick').nth(1).evaluate(element => parseFloat(element.style.left))
    await page.mouse.click(rulerBox.x + tickStep * 0.75, rulerBox.y + rulerBox.height / 2)
    await page.getByRole('button', { name: 'Split at playhead', exact: true }).click()
    await until('UI split persists', async () => (await api(base + '/edit')).project.clips.length === 3)
    await page.locator('.cv-ed-clip').last().click()
    await page.getByRole('button', { name: 'Move earlier', exact: true }).click()
    await until('UI reorder persists', async () => (await api(base + '/edit')).project.clips[1].source.id === uploaded.id)
    await page.locator('#cv-ed-tab-text').click()
    await page.getByRole('button', { name: 'Add text at the playhead', exact: true }).click()
    await page.getByRole('textbox', { name: 'Words', exact: true }).fill('Canvas export verified')
    await until('UI text persists', async () => (await api(base + '/edit')).project.texts.some(t => t.text === 'Canvas export verified'))
    const timelineBox = await ruler.boundingBox()
    assert.ok(timelineBox.y >= 0 && timelineBox.y + timelineBox.height <= 900, JSON.stringify(timelineBox))
    fs.writeFileSync(path.join(evidence, 'timeline-geometry.json'), JSON.stringify(timelineBox, null, 2))
    await page.screenshot({ path: path.join(evidence, '04-editor-1440.png') })
    ok('real editor UI trims, splits, reorders and saves a text overlay')
    await page.locator('[aria-controls="cv-ed-export"]').click()
    await page.locator('[data-step="export"]').click()
    const cut = await until('real export', async () => {
      const cut = await api(base + '/cut')
      if (cut.status === 'failed') throw new Error(cut.error)
      return cut.status === 'done' && cut.output && cut
    }, 240000)
    const output = await context.request.get(BASE + cut.output.url)
    assert.equal(output.status(), 200)
    const outputFile = path.join(evidence, 'workspace.mp4')
    fs.writeFileSync(outputFile, await output.body())
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', outputFile], { encoding: 'utf8' }))
    fs.writeFileSync(path.join(evidence, 'ffprobe.json'), JSON.stringify(probe, null, 2))
    const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio')
    assert.equal(v.width, 1080); assert.equal(v.height, 1920); assert.equal(a.codec_name, 'aac')
    const renderedProject = (await api(base + '/edit')).project
    const expected = renderedProject.clips.reduce((sum, c) => sum + c.out - c.in, 0)
    assert.ok(Math.abs(Number(probe.format.duration) - expected) < 0.15)
    const volume = require('node:child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', outputFile, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    fs.writeFileSync(path.join(evidence, 'voice-volume.txt'), volume)
    const mean = /mean_volume: (-?[\d.]+) dB/.exec(volume)
    assert.ok(mean && Number(mean[1]) > -50, 'connected voice audible while clip audio is muted')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '1.0', '-i', outputFile, '-frames:v', '1', path.join(evidence, 'output-frame.png')])
    ok('UI export produces real 1080x1920 AAC MP4 of timeline length with connected voice audible')
    await page.locator('[data-step="send"]').click()
    await until('waiting review', async () => (await api(base + '/cut')).review?.status === 'waiting')
    approver = await localContext(browser)
    const review = await approver.newPage()
    review.on('pageerror', error => errors.push('review: ' + error.message))
    await review.goto(reviewUrl)
    await review.getByText('Blank canvas proof', { exact: true }).first().waitFor()
    await review.locator('video').evaluate(async element => { element.muted = true; await element.play() })
    await until('review plays', () => review.locator('video').evaluate(element => element.currentTime > 0.1))
    await review.screenshot({ path: path.join(evidence, '03-review-1440.png') })
    await review.getByRole('button', { name: 'Approve', exact: true }).click()
    await until('approved persisted', async () => (await api(base + '/cut')).review?.status === 'approved')
    assert.equal((await api('/api/ideas') ?? []).length, 0)
    ok('signed-out client review plays and approves workspace export without creating or approving a plan')
    await restartWithState('approved')
    await page.locator('[data-step="export"]').click()
    await until('new export retires previous approval', async () => { const next = await api(base + '/cut'); if (next.status === 'failed') throw new Error(next.error); return next.status === 'done' && next.output?.url !== cut.output.url && !next.review }, 240000)
    await page.locator('[data-step="send"]').click()
    await until('new cut waiting', async () => (await api(base + '/cut')).review?.status === 'waiting')
    await review.reload()
    await review.getByRole('button', { name: 'Send back', exact: true }).click()
    await review.getByRole('textbox', { name: 'What should change?', exact: true }).fill('Please change the closing text.')
    await review.getByRole('button', { name: 'Send back with this note', exact: true }).click()
    await until('send-back reason persisted', async () => { const next = await api(base + '/cut'); return next.review?.status === 'rejected' && next.review.reason === 'Please change the closing text.' })
    const refused = await context.request.post(BASE + base + '/cut/review')
    assert.equal(refused.status(), 409)
    ok('new export clears old approval and signed-out send-back blocks unchanged resend')
    await page.evaluate(() => localStorage.setItem('remake.lang', 'zh-Hant'))
    await page.reload()
    await page.getByRole('button', { name: '畫布', exact: true }).first().click()
    await page.locator('.fc-picker').waitFor()
    await page.getByText('Blank canvas proof', { exact: true }).first().click()
    await page.locator('.fc-screen').waitFor()
    assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant')
    await page.getByRole('button', { name: '文字提示', exact: true }).first().waitFor()
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= 1440))
    await page.screenshot({ path: path.join(evidence, '05-zh-Hant-1440.png') })
    ok('zh-Hant workspace UI reloads existing content at 1440 without page overflow')
    await restartWithState('rejected')
    assert.deepEqual(errors, [])
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: checks, workspaceId: workspace.id, errors }, null, 2))
  } catch (error) {
    if (page) {
      await page.screenshot({ path: path.join(evidence, 'failure-1440.png') }).catch(() => {})
      fs.writeFileSync(path.join(evidence, 'failure-dom.html'), await page.content())
    }
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: checks, error: error.stack, errors }, null, 2))
    throw error
  } finally {
    if (approver) await approver.close()
    if (context) await context.close()
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
