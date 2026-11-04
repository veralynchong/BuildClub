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
    ok('UI creates a genuinely empty workspace without a plan or approval')
    await page.screenshot({ path: path.join(evidence, '01-empty-1440.png') })
    const flowNode = id => page.locator(`.react-flow__node[data-id=${JSON.stringify(id)}]`)
    const fit = () => page.getByRole('button', { name: 'Fit to screen', exact: true }).click()
    const add = async (kind, label) => {
      const before = new Set((await state()).doc.nodes.map(n => n.id))
      await page.getByRole('button', { name: label, exact: true }).first().click()
      return until('save added ' + kind, async () => (await state()).doc.nodes.find(n => n.type === kind && !before.has(n.id)))
    }
    const wire = async (from, to, handle) => {
      await fit()
      const source = flowNode(from).locator('.react-flow__handle-source[data-handleid="out"]')
      const target = flowNode(to).locator(`.react-flow__handle-target[data-handleid=${JSON.stringify(handle)}]`)
      await source.waitFor(); await target.waitFor()
      const a = await source.boundingBox(), b = await target.boundingBox()
      assert.ok(a && b, 'visible typed handles')
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
    await flowNode(upload.id).locator('input[type=file]').setInputFiles(fixture)
    const uploaded = await until('persist real uploaded video', async () => {
      const s = await state(), n = s.doc.nodes.find(n => n.id === upload.id)
      return s.generations.find(g => g.id === n.data.selected && g.kind === 'video' && g.model === 'upload')
    })
    assert.ok(uploaded.url.startsWith(base + '/'))
    await wire(upload.id, editor.id, 'in:clips')
    await until('both video sources in timeline', async () => (await api(base + '/edit')).project.clips.length === 2)
    assert.deepEqual((await state()).takes, [])
    ok('real video upload is durable without creating shots or takes and enters the timeline')
    await fit()
    await page.screenshot({ path: path.join(evidence, '02-connected-1440.png') })
    await page.getByRole('button', { name: /Review link/ }).click()
    const dialog = page.getByRole('dialog')
    const reviewUrl = new URL(await dialog.locator('input').inputValue(), BASE).href
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
    const expected = restored.project.clips.reduce((sum, c) => sum + c.out - c.in, 0)
    assert.ok(Math.abs(Number(probe.format.duration) - expected) < 0.15)
    const volume = require('node:child_process').spawnSync('ffmpeg', ['-hide_banner', '-i', outputFile, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr
    fs.writeFileSync(path.join(evidence, 'voice-volume.txt'), volume)
    const mean = /mean_volume: (-?[\d.]+) dB/.exec(volume)
    assert.ok(mean && Number(mean[1]) > -50, 'connected voice audible while clip audio is muted')
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '0.5', '-i', outputFile, '-frames:v', '1', path.join(evidence, 'output-frame.png')])
    ok('UI export produces real 1080x1920 AAC MP4 of timeline length with connected voice audible')
    await page.locator('[data-step="send"]').click()
    await until('waiting review', async () => (await api(base + '/cut')).review?.status === 'waiting')
    approver = await localContext(browser)
    const review = await approver.newPage()
    await review.goto(reviewUrl)
    await review.getByText('Blank canvas proof', { exact: true }).first().waitFor()
    await review.locator('video').evaluate(async element => { element.muted = true; await element.play() })
    await until('review plays', () => review.locator('video').evaluate(element => element.currentTime > 0.1))
    await review.screenshot({ path: path.join(evidence, '03-review-1440.png') })
    await review.getByRole('button', { name: 'Approve', exact: true }).click()
    await until('approved persisted', async () => (await api(base + '/cut')).review?.status === 'approved')
    assert.equal((await api('/api/ideas') ?? []).length, 0)
    ok('signed-out client review plays and approves workspace export without creating or approving a plan')
    assert.deepEqual(errors, [])
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: checks, workspaceId: workspace.id, errors }, null, 2))
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(evidence, 'failure-1440.png') }).catch(() => {})
    fs.writeFileSync(path.join(evidence, 'results.json'), JSON.stringify({ passed: checks, error: error.stack, errors }, null, 2))
    throw error
  } finally {
    if (approver) await approver.close()
    if (context) await context.close()
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
