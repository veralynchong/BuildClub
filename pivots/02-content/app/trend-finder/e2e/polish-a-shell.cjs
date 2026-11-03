// Polish A: the app shell around the canvas (compact sidebar, toolbar, full screen, queue, zoom, minimap), mock models only.
// Run: bash e2e/restart-backend.sh 8871 <log>; PW_CORE=<playwright-core> node e2e/polish-a-shell.cjs <out_dir>
// Exits 1 when a check fails.
const L = require('./lib.cjs')
const fs = require('fs')
const out = process.argv[2] || '.'
fs.mkdirSync(out, { recursive: true })
const shell = (p) => p.locator('.shell').evaluate((el) => el.className)
const inside = (p) => p.evaluate(() => {
  const box = document.querySelector('.cv-flow').getBoundingClientRect()
  const nodes = [...document.querySelectorAll('.react-flow__node')]
  return { n: nodes.length, out: nodes.filter((e) => { const r = e.getBoundingClientRect(); return r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1 }).length, box: [Math.round(box.width), Math.round(box.height), Math.round(box.bottom)] }
})

;(async () => {
  const { browser, page, errs } = await L.open()
  try {
    await L.login(page); await L.seed(page)
    // open the plan, remember its name, then the canvas
    await page.goto(L.BASE + '/'); await page.waitForTimeout(1500)
    if (!(await page.getByText('Plans', { exact: true }).first().isVisible().catch(() => false))) await page.getByText('Evergreen Foods').first().click()
    await page.getByText('Plans', { exact: true }).first().click()
    await page.getByText('Open plan').first().click()
    await page.getByText('Open the canvas').first().waitFor()
    const planTitle = (await page.locator('h1').first().innerText()).trim()
    await page.getByText('Open the canvas').first().click()
    await page.waitForSelector('.react-flow__node', { timeout: 20000 })
    await page.waitForTimeout(1200)
    await page.evaluate(() => localStorage.removeItem('remake.canvas.fullscreen'))

    // 1. sidebar entry, fit, title, 44px sidebar
    const h1 = (await page.locator('.cv-bar h1').innerText()).trim()
    L.ok('h1 equals the plan name', !!h1 && h1 === planTitle, `${h1} | ${planTitle}`)
    const sw = await page.locator('.sidebar').evaluate((e) => Math.round(e.getBoundingClientRect().width))
    L.ok('compact sidebar is about 44px', sw >= 42 && sw <= 48, sw + 'px')
    const fit = await inside(page)
    L.ok('every node is inside the board', fit.n > 0 && fit.out === 0, JSON.stringify(fit))
    L.ok('the board fills the window height', fit.box[2] >= 900 - 40, 'bottom ' + fit.box[2])
    await page.screenshot({ path: out + '/01-canvas.png' })
    L.ok('canvas entry is in the sidebar', (await page.locator('.sidebar .side-link[aria-current="page"]').count()) === 1, '')

    // 2. zoom + minimap, no overlap
    const pct = async () => parseInt(await page.locator('.cv-zoom-pct').innerText(), 10)
    const p0 = await pct()
    await page.getByRole('button', { name: 'Zoom in' }).click(); await page.waitForTimeout(400)
    const p1 = await pct()
    await page.getByRole('button', { name: 'Zoom out' }).click(); await page.getByRole('button', { name: 'Zoom out' }).click(); await page.waitForTimeout(400)
    const p2 = await pct()
    L.ok('zoom + / - change the percent', p1 > p0 && p2 < p1, `${p0} -> ${p1} -> ${p2}`)
    const mm = await page.locator('.react-flow__minimap').boundingBox()
    const zb = await page.locator('.cv-zoom').boundingBox()
    L.ok('minimap is visible and does not overlap the zoom bar', !!mm && mm.width > 100 && zb.y + zb.height <= mm.y, JSON.stringify({ mm, zb }))
    await page.screenshot({ path: out + '/02-zoom.png' })

    // 3. typing f in a textarea does not enter full screen
    await page.locator('.react-flow__node-storyboard .cv-card-head').first().click() // the prompt lives in the right panel (B6)
    await page.locator('.cv-panel textarea').first().click()
    await page.keyboard.type('f')
    await page.waitForTimeout(300)
    L.ok('typing f in the panel textarea stays out of full screen', !/is-full/.test(await shell(page)) && (await page.locator('.sidebar').isVisible()), '')

    // 4. F enters, Esc leaves, reload keeps the choice
    await page.locator('.cv-flow .react-flow__pane').click({ position: { x: 700, y: 40 } })
    await page.keyboard.press('f'); await page.waitForTimeout(400)
    L.ok('F enters full screen (sidebar hidden)', /is-full/.test(await shell(page)) && !(await page.locator('.sidebar').isVisible()), '')
    const fitF = await inside(page)
    L.ok('full screen: board fills the screen', fitF.box[2] >= 900 - 20 && fitF.box[0] >= 1440 - 80, JSON.stringify(fitF))
    await page.waitForTimeout(300)
    await page.screenshot({ path: out + '/03-fullscreen.png' })
    await L.gotoCanvas(page)
    L.ok('reload keeps full screen', /is-full/.test(await shell(page)), '')
    await page.keyboard.press('Escape'); await page.waitForTimeout(400)
    L.ok('Esc leaves full screen', !/is-full/.test(await shell(page)) && (await page.locator('.sidebar').isVisible()), '')
    await L.gotoCanvas(page)
    L.ok('reload keeps the normal view', !/is-full/.test(await shell(page)), '')
    await page.getByRole('button', { name: 'Full screen' }).click(); await page.waitForTimeout(300)
    L.ok('full-screen button hides the sidebar', !(await page.locator('.sidebar').isVisible()), '')
    await page.getByRole('button', { name: 'Exit full screen' }).click(); await page.waitForTimeout(300)
    L.ok('exit button brings it back', await page.locator('.sidebar').isVisible(), '')

    // 5. queue pill during a mock generation
    const sb = page.locator('.react-flow__node-storyboard').first()
    await sb.locator('.cv-gen-foot button').first().click()
    await page.getByText('● 1 running').first().waitFor({ timeout: 8000 }).then(() => L.ok('queue reads "● 1 running"', true, ''), () => L.ok('queue reads "● 1 running"', false, 'not seen'))
    await page.screenshot({ path: out + '/04-queue.png' })
    await page.waitForFunction(() => !document.querySelector('.cv-queue-pill'), null, { timeout: 30000 }).then(() => L.ok('queue disappears when done', true, ''), () => L.ok('queue disappears when done', false, 'still there'))
    await page.screenshot({ path: out + '/05-done.png' })
    const real = errs.filter((e) => !/401/.test(e)) // the signed-out check before login answers 401
    L.ok('no console errors', real.length === 0, real.slice(0, 3).join(' | '))
  } catch (e) {
    L.ok('script ran to the end', false, String(e && e.stack || e))
    await page.screenshot({ path: out + '/zz-error.png' }).catch(() => {})
  } finally {
    await browser.close()
    const bad = L.results.filter((r) => !r.pass).length
    console.log(bad ? `${bad} FAILED` : `ALL ${L.results.length} PASS`)
    process.exit(bad ? 1 : 0)
  }
})()
