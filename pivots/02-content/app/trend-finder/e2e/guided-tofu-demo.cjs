// Deterministic prepared-demo checks. Starts no server and never writes API data.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help') return { help: true }
    assert(['--base-url', '--route', '--output'].includes(argv[i]), 'Unknown argument')
    assert(argv[i + 1] && !argv[i + 1].startsWith('--'), 'Missing argument value')
    assert(!Object.hasOwn(args, argv[i]), 'Duplicate argument')
    const flag = argv[i]
    args[flag] = argv[++i]
  }
  const url = new URL(args['--base-url'])
  assert(['http:', 'https:'].includes(url.protocol), 'HTTP(S) is required')
  assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Loopback URL required')
  assert(!url.username && !url.password && !url.search && !url.hash && url.pathname === '/', 'Bare origin required')
  assert(!['8811', '8805', '8850', '8787', '5195'].includes(url.port), 'Protected project port')
  assert(['shoot', 'ai'].includes(args['--route']), 'Route must be shoot or ai')
  return { base: url.origin, route: args['--route'], output: path.resolve(args['--output'] || `/tmp/buildclub-guided-demo/e2e-${args['--route']}-${Date.now()}`) }
}

const SESSION = 'buildclub:demo:session:v1'
const DRAFT = 'buildclub:demo:draft:v1'
const PREFIX = 'buildclub:demo:'
const LOCAL_SENTINELS = { 'remake.lang': 'en', 'buildclub:e2e:formal-sentinel': 'unchanged' }
const SESSION_SENTINELS = { 'buildclub:e2e:session-sentinel': 'unchanged' }
const mainChecks = ['reference metadata', 'breakdown reveal', 'script reload', 'route guard', 'canvas reveal', 'full canvas 21 shots', 'material selection', 'native editor playback', 'timeline edit reload', 'result ended', 'download bytes', 'other route', 'reset isolation']

async function run(options) {
  const { chromium } = require(process.env.PW_CORE || '/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core')
  assert(fs.existsSync(chromium.executablePath()), 'Existing Playwright Chromium binary required; nothing installed')
  fs.mkdirSync(options.output, { recursive: true })
  const result = { status: 'running', route: options.route, baseUrl: options.base, checks: mainChecks.map(name => ({ name, status: 'pending', actual: 'Not reached' })), requests: [], errors: [], consoleErrors: [], cleanup: [], recordings: [], pendingContracts: [] }
  let browser
  const owned = []
  const cleanMessage = value => String(value).replace(/https?:\/\/[^\s"'<>]+/g, text => {
    try { const u = new URL(text); return u.origin + u.pathname } catch { return '[URL]' }
  }).slice(0, 1200)
  async function check(name, action) {
    const entry = result.checks.find(item => item.name === name) || { name }
    if (!result.checks.includes(entry)) result.checks.push(entry)
    try { entry.actual = await action(); entry.status = 'pass'; console.log('PASS', name) }
    catch (error) { entry.status = 'fail'; entry.actual = cleanMessage(error.message); throw error }
  }
  async function context(label) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: path.join(options.output, label), size: { width: 1440, height: 900 } }, acceptDownloads: true, serviceWorkers: 'block' })
    const item = { ctx, label, page: null }
    owned.push(item)
    await ctx.addInitScript(({ local, session, base }) => {
      if (location.origin !== base) return
      if (localStorage.length === 0 && sessionStorage.length === 0) {
        for (const [key, value] of Object.entries(local)) localStorage.setItem(key, value)
        for (const [key, value] of Object.entries(session)) sessionStorage.setItem(key, value)
      }
    }, { local: LOCAL_SENTINELS, session: SESSION_SENTINELS, base: options.base })
    await ctx.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), method = request.method()
      const write = /^(POST|PUT|PATCH|DELETE)$/.test(method) && (url.pathname === '/api' || url.pathname.startsWith('/api/'))
      const external = url.origin !== options.base
      result.requests.push({ context: label, method, origin: url.origin, path: url.pathname, blocked: write ? 'api-write' : external ? 'external' : null })
      if (write || external) await route.abort('blockedbyclient')
      else await route.continue()
    })
    if (typeof ctx.routeWebSocket === 'function') {
      await ctx.routeWebSocket('**/*', socket => {
        result.requests.push({ context: label, method: 'WEBSOCKET', path: new URL(socket.url()).pathname, blocked: 'websocket' })
        socket.close()
      })
    }
    const page = await ctx.newPage()
    item.page = page
    page.setDefaultTimeout(15000)
    page.setDefaultNavigationTimeout(30000)
    page.on('pageerror', error => result.errors.push({ context: label, message: cleanMessage(error.message) }))
    page.on('console', message => { if (message.type() === 'error') result.consoleErrors.push({ context: label, message: cleanMessage(message.text()) }) })
    page.on('response', response => {
      const url = new URL(response.url())
      if (url.origin === options.base && url.pathname.startsWith('/demo-assets/')) result.requests.push({ context: label, method: 'MEDIA_RESPONSE', path: url.pathname, status: response.status(), contentType: response.headers()['content-type'] || '' })
    })
    return page
  }
  async function step(page, id) {
    await page.locator(`.guided-demo[data-step="${id}"]`).waitFor()
    await page.waitForFunction(({ key, id }) => JSON.parse(sessionStorage.getItem(key))?.stepId === id, { key: SESSION, id })
    await page.waitForFunction(() => document.documentElement.scrollWidth <= 1440)
    return id
  }
  async function click(locator) {
    await locator.waitFor({ state: 'visible' })
    await locator.scrollIntoViewIfNeeded()
    const target = await locator.evaluate(element => {
      const r = element.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return { hit: !!hit && (element === hit || element.contains(hit)), disabled: element.matches(':disabled'), width: r.width, height: r.height }
    })
    assert(target.hit && !target.disabled && target.width > 0 && target.height > 0, 'Target is disabled or obscured, including by the guide')
    await locator.click()
  }
  const next = page => click(page.locator('.demo-guide').getByRole('button', { name: 'Next', exact: true }))
  async function screenshot(page, name) {
    // Capture only the demo, never a login or unrelated workspace.
    if (await page.locator('.guided-demo').isVisible()) await page.screenshot({ path: path.join(options.output, `${name}.png`) })
  }
  async function metadata(video) {
    await video.waitFor({ state: 'attached' })
    await video.evaluate(element => {
      if (element.readyState >= 1 && Number.isFinite(element.duration) && element.videoWidth > 0) return
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { cleanup(); reject(new Error('Media metadata timeout')) }, 20000)
        function cleanup() { clearTimeout(timer); element.removeEventListener('loadedmetadata', loaded); element.removeEventListener('error', failed) }
        function loaded() { cleanup(); resolve() }
        function failed() { cleanup(); reject(new Error('Media metadata failed')) }
        element.addEventListener('loadedmetadata', loaded); element.addEventListener('error', failed)
      })
    })
    const observed = await video.evaluate(element => ({ duration: element.duration, width: element.videoWidth, height: element.videoHeight, path: new URL(element.currentSrc).pathname }))
    assert(observed.duration > 0 && observed.width > 0 && observed.height > 0, 'Invalid actual metadata')
    return observed
  }
  async function isolation(page) {
    const observed = await page.evaluate(prefix => ({
      local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
      session: Object.fromEntries(Object.keys(sessionStorage).filter(key => !key.startsWith(prefix)).sort().map(key => [key, sessionStorage.getItem(key)])),
    }), PREFIX)
    // Assertions deliberately omit storage values from errors and artifacts.
    assert(JSON.stringify(observed.local) === JSON.stringify(Object.fromEntries(Object.entries(LOCAL_SENTINELS).sort())), 'Formal localStorage changed')
    assert(JSON.stringify(observed.session) === JSON.stringify(SESSION_SENTINELS), 'Non-demo sessionStorage changed')
    return { localStorageExact: true, nonDemoSessionStorageExact: true }
  }
  const readSession = page => page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), SESSION)
  try {
    browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true })
    const page = await context('primary')
    try {
      await page.goto(`${options.base}/demo/tofu`, { waitUntil: 'domcontentloaded' })
      await step(page, 'research')
      await check('reference metadata', async () => {
        const observed = await metadata(page.locator('.guided-demo__research video'))
        assert.equal(observed.path, '/demo-assets/source.mp4')
        await page.getByText(/Live popularity metrics are not available/).waitFor()
        await screenshot(page, '01-research')
        return observed
      })
      await next(page); await step(page, 'breakdown')
      await check('breakdown reveal', async () => {
        await click(page.getByRole('button', { name: 'Show content breakdown', exact: true }))
        await page.getByRole('heading', { name: 'Words and sound', exact: true }).waitFor()
        assert.equal(await page.locator('.guided-demo__cards article').count(), 3)
        await screenshot(page, '02-breakdown')
        return { cards: 3, noSpokenNarration: await page.getByText(/no spoken cooking narration/).isVisible() }
      })
      await next(page); await step(page, 'script')
      await check('script reload', async () => {
        const text = 'Silken tofu, crispy possibilities. Demo draft.'
        await page.locator('textarea').first().fill(text)
        await page.waitForFunction(({ key, text }) => JSON.parse(sessionStorage.getItem(key))?.script?.preparation === text, { key: DRAFT, text })
        await page.reload({ waitUntil: 'domcontentloaded' }); await step(page, 'script')
        assert.equal(await page.locator('textarea').first().inputValue(), text)
        await screenshot(page, '03-script')
        return { editedTextRestored: true }
      })
      await next(page); await step(page, 'route')
      await check('route guard', async () => {
        assert(await page.locator('.demo-guide').getByRole('button', { name: 'Next', exact: true }).isDisabled())
        await click(page.getByRole('button', { name: options.route === 'shoot' ? /Plan a shoot/ : /Create an AI ad/ }))
        await page.waitForFunction(({ key, route }) => JSON.parse(sessionStorage.getItem(key))?.route === route, { key: SESSION, route: options.route })
        assert.equal((await readSession(page)).route, options.route)
        return { unselectedNextDisabled: true, selectedRoute: options.route }
      })
      await next(page); await step(page, 'canvas')
      const canvas = page.getByTestId('demo-canvas')
      await check('canvas reveal', async () => {
        try { await canvas.waitFor() } catch (error) { result.pendingContracts.push('Missing live data-testid=demo-canvas'); throw error }
        await click(canvas.getByRole('button', { name: 'Show prepared frames', exact: true }))
        await page.waitForFunction(({ key, count }) => JSON.parse(sessionStorage.getItem(key))?.revealedAssetIds.filter(id => id.startsWith('image-s') || /^shoot-.*-image$/.test(id)).length === count, { key: SESSION, count: options.route === 'ai' ? 21 : 2 })
        await canvas.getByRole('button', { name: 'Show prepared frames', exact: true }).waitFor()
        for (const detail of await canvas.locator('details').all()) if (await detail.getAttribute('open') === null) await click(detail.locator('summary'))
        const images = canvas.locator('img')
        const count = await images.count()
        assert.equal(count, options.route === 'ai' ? 21 : 2)
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded()
          await image.evaluate(element => {
            if (element.complete && element.naturalWidth > 0) return
            return new Promise((resolve, reject) => {
              const timer = setTimeout(() => { cleanup(); reject(new Error('Image timeout')) }, 15000)
              function cleanup() { clearTimeout(timer); element.removeEventListener('load', loaded); element.removeEventListener('error', failed) }
              function loaded() { cleanup(); element.naturalWidth ? resolve() : reject(new Error('Image empty')) }
              function failed() { cleanup(); reject(new Error('Image failed')) }
              element.addEventListener('load', loaded); element.addEventListener('error', failed)
            })
          })
        }
        await click(canvas.getByRole('button', { name: 'Show prepared motion', exact: true }))
        await page.waitForFunction(({ key, count }) => JSON.parse(sessionStorage.getItem(key))?.revealedAssetIds.filter(id => /^shoot-.*-video$/.test(id) || id === 'prepared-source-derived-cut').length === count, { key: SESSION, count: options.route === 'shoot' ? 2 : 1 })
        await page.waitForFunction(() => !document.querySelector('[data-testid="demo-canvas"] button')?.disabled)
        const videos = canvas.locator('figure video')
        assert.equal(await videos.count(), options.route === 'shoot' ? 2 : 1)
        for (const video of await videos.all()) await metadata(video)
        await screenshot(page, '04-canvas-preview')
        return { imagesLoaded: count, videosLoaded: await videos.count() }
      })
      await check('full canvas 21 shots', async () => {
        await click(canvas.getByRole('button', { name: 'Full Canvas', exact: true }))
        await canvas.locator('.react-flow').waitFor()
        const select = canvas.getByLabel('Go to shot', { exact: true })
        assert.equal(await select.locator('option').count(), 22)
        const reached = []
        for (let i = 1; i <= 21; i++) {
          await select.selectOption(`demo_s${i}`)
          await page.waitForFunction(id => {
            const node = document.querySelector(`.react-flow__node[data-id="${id}"]`), flow = document.querySelector('.demo-native__flow')
            if (!node || !flow) return false
            const n = node.getBoundingClientRect(), f = flow.getBoundingClientRect()
            return n.left >= f.left && n.right <= f.right && n.top >= f.top && n.bottom <= f.bottom
          }, `demo_s${i}`)
          reached.push(`s${i}`)
        }
        await screenshot(page, '05-full-canvas')
        await click(canvas.getByRole('button', { name: 'Layout preview', exact: true }))
        await canvas.getByRole('heading', { name: 'Layout preview · five story sections', exact: true }).waitFor()
        return { reached, reactFlow: true, returnedToPreview: true }
      })
      let selectedPath
      await check('material selection', async () => {
        const suffix = options.route === 'shoot' ? '/photographer/low-macro.mp4' : '/ever-green-ai-recreation.mp4'
        const figure = canvas.locator('figure').filter({ has: page.locator(`video[src$="${suffix}"]`) })
        await click(figure.getByRole('button', { name: /^(Use this video|Selected for edit)$/ }))
        assert.equal(await figure.getByRole('button').getAttribute('aria-pressed'), 'true')
        selectedPath = await figure.locator('video').getAttribute('src')
        return { path: selectedPath, selected: true }
      })
      await click(canvas.getByRole('button', { name: 'Open Editor', exact: true })); await step(page, 'edit')
      const editor = page.getByTestId('demo-editor')
      await check('native editor playback', async () => {
        try { await editor.waitFor() } catch (error) { result.pendingContracts.push('Missing live data-testid=demo-editor'); throw error }
        await editor.locator('.cv-ed-timeline .cv-ed-clip').first().waitFor()
        await click(editor.locator('.demo-native__player').getByRole('button', { name: 'Play video', exact: true }))
        await page.waitForFunction(() => Number(document.querySelector('.cv-ed-ruler')?.getAttribute('aria-valuenow')) >= 0.3)
        const frame = await editor.locator('.cv-ed-ruler').getAttribute('aria-valuenow')
        const video = editor.locator('.demo-native__player video').first()
        await metadata(video)
        assert(await video.evaluate(element => element.currentTime > 0), 'Player video did not advance')
        await click(editor.locator('.demo-native__player').getByRole('button', { name: 'Pause video', exact: true }))
        return { nativeTimeline: true, playheadSeconds: Number(frame), actualVideoAdvanced: true }
      })
      await check('timeline edit reload', async () => {
        await click(editor.locator('.cv-ed-timeline .cv-ed-clip').first())
        await click(editor.getByRole('button', { name: 'Mute selected clip', exact: true }))
        const key = `buildclub:demo:edit:${options.route}:v1`
        await page.waitForFunction(key => JSON.parse(sessionStorage.getItem(key))?.project?.clips?.[0]?.muted === true, key)
        const before = await page.evaluate(key => sessionStorage.getItem(key), key)
        await page.reload({ waitUntil: 'domcontentloaded' }); await step(page, 'edit')
        await editor.locator('.cv-ed-timeline .cv-ed-clip').first().waitFor()
        await click(editor.locator('.cv-ed-timeline .cv-ed-clip').first())
        await editor.getByRole('button', { name: 'Unmute selected clip', exact: true }).waitFor()
        assert.equal(await page.evaluate(key => sessionStorage.getItem(key), key), before)
        await screenshot(page, '06-editor')
        return { firstClipMuted: true, exactDraftRestored: true }
      })
      await next(page); await step(page, 'result')
      await check('result ended', async () => {
        const video = page.locator('.guided-demo__result video')
        const observed = await metadata(video)
        assert.equal(observed.path, selectedPath)
        await video.evaluate(async element => {
          element.muted = true
          let timer
          try { await Promise.race([element.play(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Playback start timeout')), 15000) })]) }
          finally { clearTimeout(timer) }
        })
        await page.waitForFunction(() => document.querySelector('.guided-demo__result video')?.ended, null, { timeout: 30000 })
        await screenshot(page, '07-result')
        return { ...observed, ended: true }
      })
      await check('download bytes', async () => {
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 20000 }),
          click(page.getByRole('link', { name: 'Download prepared MP4', exact: true })),
        ])
        assert.equal(await download.failure(), null)
        const file = path.join(options.output, 'prepared-result.mp4')
        await download.saveAs(file)
        const bytes = fs.readFileSync(file)
        assert(bytes.length > 1024 && bytes.subarray(4, 8).toString('ascii') === 'ftyp', 'Downloaded bytes are not an MP4')
        const response = result.requests.findLast(r => r.method === 'MEDIA_RESPONSE' && r.path === selectedPath && r.status >= 200 && r.status < 300)
        assert(response && /video\/mp4|application\/octet-stream/i.test(response.contentType), 'No successful MP4 HTTP header observed')
        return { bytes: bytes.length, ftyp: true, contentType: response.contentType, sha256: crypto.createHash('sha256').update(bytes).digest('hex') }
      })
      await check('other route', async () => {
        await click(page.getByRole('button', { name: 'Explore the other route', exact: true })); await step(page, 'route')
        const other = options.route === 'shoot' ? 'ai' : 'shoot'
        await click(page.getByRole('button', { name: other === 'shoot' ? /Plan a shoot/ : /Create an AI ad/ }))
        await next(page); await step(page, 'canvas'); await canvas.waitFor()
        assert.equal((await readSession(page)).route, other)
        return { returnedToBranch: true, selectedOtherRoute: other }
      })
      await check('reset isolation', async () => {
        await click(page.locator('.demo-guide').getByRole('button', { name: 'Restart', exact: true })); await step(page, 'research')
        const session = await readSession(page)
        assert(session.route === null && session.revealedAssetIds.length === 0 && session.active)
        const draft = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), DRAFT)
        assert.deepEqual(draft.script, {})
        assert.equal(draft.selection.shoot, 'shoot-high-angle-video')
        assert.equal(draft.selection.ai, 'prepared-source-derived-cut')
        assert(await page.evaluate(() => ['shoot', 'ai'].every(route => sessionStorage.getItem(`buildclub:demo:edit:${route}:v1`) === null)))
        return { reset: true, ...await isolation(page) }
      })
    } catch (error) {
      result.errors.push({ context: 'primary-flow', message: cleanMessage(error.message) })
      await screenshot(page, 'failure-primary').catch(() => {})
    }
    await check('formal storage after main', () => isolation(page)).catch(() => {})
    // An independent context keeps the primary recording intact.
    try {
      const secondary = await context('language-exit')
      await secondary.goto(`${options.base}/demo/tofu`, { waitUntil: 'domcontentloaded' }); await step(secondary, 'research')
      await check('EN and zh-Hant, exit and return, idle', async () => {
        assert.equal(await secondary.locator('html').getAttribute('lang'), 'en')
        await secondary.getByLabel('Language', { exact: true }).selectOption('zh-Hant')
        await secondary.waitForFunction(() => document.documentElement.lang === 'zh-Hant')
        await secondary.locator('.demo-guide').getByRole('button', { name: '下一步', exact: true }).waitFor()
        await click(secondary.locator('.demo-guide').getByRole('button', { name: '退出導覽', exact: true }))
        await secondary.waitForFunction(key => JSON.parse(sessionStorage.getItem(key))?.active === false, SESSION)
        assert.equal((await readSession(secondary)).active, false)
        await click(secondary.getByRole('button', { name: '開始豆腐示範', exact: true })); await step(secondary, 'research')
        await secondary.waitForFunction(key => JSON.parse(sessionStorage.getItem(key))?.active === true, SESSION)
        const idle = await secondary.evaluate(async key => {
          const before = sessionStorage.getItem(key)
          // A bounded observation window measures idle stability, not readiness.
          await new Promise(resolve => setTimeout(resolve, 700))
          return { unchanged: before === sessionStorage.getItem(key), observationMs: 700 }
        }, SESSION)
        assert(idle.unchanged, 'Demo advanced while idle')
        await screenshot(secondary, '08-zh-return')
        await secondary.getByLabel('語言', { exact: true }).selectOption('en')
        await secondary.waitForFunction(() => document.documentElement.lang === 'en')
        return { bothLanguagesObserved: true, exitInactive: true, returnedToResearch: true, ...idle, ...await isolation(secondary) }
      })
    } catch (error) { result.errors.push({ context: 'secondary-flow', message: cleanMessage(error.message) }) }
  } catch (error) { result.errors.push({ context: 'setup', message: cleanMessage(error.message) }) }
  finally {
    for (const { ctx, page, label } of owned) {
      try { await ctx.close(); result.cleanup.push({ context: label, closed: true }); if (page?.video()) result.recordings.push(await page.video().path()) }
      catch (error) { result.cleanup.push({ context: label, closed: false, message: cleanMessage(error.message) }) }
    }
    if (browser) {
      try { await browser.close(); result.cleanup.push({ browser: 'owned-chromium', closed: true }) }
      catch (error) { result.cleanup.push({ browser: 'owned-chromium', closed: false, message: cleanMessage(error.message) }) }
    }
    const writes = result.requests.filter(r => r.blocked === 'api-write')
    result.checks.push({ name: 'zero API write attempts', status: writes.length ? 'fail' : result.requests.length ? 'pass' : 'pending', actual: { attemptedAndBlocked: writes.length } })
    const failures = result.checks.some(c => c.status !== 'pass') || result.errors.length || result.consoleErrors.length || result.cleanup.some(c => !c.closed)
    result.status = failures ? 'FAIL' : 'PASS'
    fs.writeFileSync(path.join(options.output, 'result.json'), JSON.stringify(result, null, 2) + '\n')
    fs.writeFileSync(path.join(options.output, 'report.txt'), [result.status, ...result.checks.map(c => `${c.status.toUpperCase()} ${c.name}: ${JSON.stringify(c.actual)}`), `Errors: ${result.errors.length}; console errors: ${result.consoleErrors.length}`, 'MP4 ffprobe and full recording decode remain with the lead.', ...result.cleanup.map(c => `Cleanup: ${JSON.stringify(c)}`)].join('\n') + '\n')
    console.log(result.status, options.output)
  }
  return result.status === 'PASS' ? 0 : 1
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2))
    if (options.help) console.log('node e2e/guided-tofu-demo.cjs --base-url http://127.0.0.1:PORT --route shoot|ai [--output /tmp/path]')
    else run(options).then(code => { process.exitCode = code }).catch(error => { console.error(error.message); process.exitCode = 1 })
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
module.exports = { parseArgs }
