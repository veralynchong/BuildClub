// Polish B6 fix: Backspace/Delete inside the right panel must not delete the selected node (the panel root has `nokey`).
// Run: bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e (repo root); node e2e/panel-backspace.cjs <out_dir>
// Exits 1 when a check fails. Mock models only.
const L = require('./lib.cjs')
const fs = require('fs')
const out = process.argv[2] || '.'
fs.mkdirSync(out, { recursive: true })

;(async () => {
  const { browser, page, errs } = await L.open()
  try {
    await L.login(page); await L.seed(page); await L.gotoCanvas(page)
    const sb = page.locator('.react-flow__node-storyboard').first()
    await sb.locator('.cv-card, .cv-node').first().click({ position: { x: 20, y: 12 } })
    await page.waitForSelector('.cv-panel')
    const count = () => page.locator('.react-flow__node').count()
    const before = await count()
    await page.locator('.cv-panel .cv-picker-btn, .cv-panel button[aria-haspopup="listbox"]').first().focus()
    await page.keyboard.press('Backspace'); await page.keyboard.press('Delete'); await page.waitForTimeout(300)
    L.ok('Backspace/Delete on the model picker keeps the node', (await count()) === before && (await page.locator('.cv-panel').count()) === 1, `${before} -> ${await count()}`)
    await page.keyboard.press('ArrowDown'); await page.waitForSelector('[role=listbox]')
    await page.keyboard.press('Backspace'); await page.keyboard.press('Delete'); await page.waitForTimeout(300)
    L.ok('Backspace/Delete in the open list keeps the node', (await count()) === before, `${before} -> ${await count()}`)
    await page.screenshot({ path: out + '/fix1-backspace.png' })
    await page.keyboard.press('Escape')
    await page.locator('.cv-panel .btn-primary').first().focus() // a plain panel button
    await page.keyboard.press('Backspace'); await page.keyboard.press('Delete'); await page.waitForTimeout(300)
    L.ok('Backspace/Delete on a panel button keeps the node', (await count()) === before, `${before} -> ${await count()}`)
    // control: the same key with focus outside the panel does delete, so the checks above can fail
    await page.evaluate(() => document.activeElement.blur())
    await page.keyboard.press('Backspace'); await page.waitForTimeout(300)
    L.ok('control: Backspace outside the panel deletes the selected node', (await count()) === before - 1, `${before} -> ${await count()}`)
    const bad = errs.filter((e) => !/401/.test(e)) // the 401 is the signed-out probe before login
    L.ok('no console errors', bad.length === 0, bad.join(' | '))
  } finally { await browser.close() }
  process.exit(L.results.some((r) => !r.pass) ? 1 : 0)
})()
