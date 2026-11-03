// A2: editor preview and timeline performance with many clips (3 as the baseline, then 24 and 48).
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a2-timeline-perf.cjs <fixtures_dir> <out_dir> [counts e.g. 3,24,48]
// Measure only while nothing else heavy runs (check mcp__flow__test_slot status and `uptime` first).
// Nine 8 s takes (clip-1..9.mp4) are cut into N clips of 1.5 s each; the page is headless Chrome 1440x900 (software GPU).
const L = require('./lib.cjs')
const [fx, out, counts = '3,24,48'] = process.argv.slice(2)
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0 }
const startProbe = (page) => page.evaluate(() => {
  const m = (window.__m = { gaps: [], long: [], last: performance.now(), on: true })
  const tick = (t) => { if (!m.on) return; m.gaps.push(t - m.last); m.last = t; requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => m.long.push(e.duration))).observe({ entryTypes: ['longtask'] }) } catch {}
})
const stopProbe = (page) => page.evaluate(() => { window.__m.on = false; const g = window.__m.gaps.slice(1); return { gaps: g, long: window.__m.long } })
const summarize = (r, ms) => ({ frames: r.gaps.length, fps: +(r.gaps.length / (ms / 1000)).toFixed(1), gapP50: +pct(r.gaps, 0.5).toFixed(1), gapP95: +pct(r.gaps, 0.95).toFixed(1), gapMax: +Math.max(0, ...r.gaps).toFixed(0), gaps_gt50ms: r.gaps.filter((g) => g > 50).length, longTasks: r.long.length, longTaskMs: +r.long.reduce((a, b) => a + b, 0).toFixed(0), longestTask: +Math.max(0, ...r.long).toFixed(0) })
const playhead = (page) => page.locator('.cv-ed-ruler').getAttribute('aria-valuenow').then(Number)

;(async () => {
  const { browser, ctx, page } = await L.open()
  const rows = []
  try {
    await L.login(page); await L.seed(page)
    const takes = []
    for (let i = 1; i <= 9; i++) takes.push((await L.uploadTake(ctx, 'idea1', Math.floor((i - 1) / 3), `${fx}/clip-${i}.mp4`)).body)
    for (const n of counts.split(',').map(Number)) {
      await L.putProject(page, 'idea1', (p) => ({ ...p, clips: Array.from({ length: n }, (_, k) => { const t = takes[k % 9]; return L.clip(`c${k}`, t.id, (k * 0.7) % 6, (k * 0.7) % 6 + 1.5, { source: { kind: 'take', id: t.id, shotId: t.shotId } }) }) }))
      const row = { clips: n }
      const t0 = Date.now()
      await L.gotoCanvas(page)
      await page.getByRole('button', { name: 'Timeline', exact: true }).click()
      await page.waitForSelector('.cv-ed-clip', { timeout: 30000 })
      await page.waitForFunction((n) => document.querySelectorAll('.cv-ed-clip').length === n, n, { timeout: 30000 })
      row.openEditorMs = Date.now() - t0
      await page.waitForTimeout(1500)
      row.dom = await page.evaluate(() => ({ clipEls: document.querySelectorAll('.cv-ed-clip').length, videos: document.querySelectorAll('video').length, audios: document.querySelectorAll('audio').length, nodes: document.getElementsByTagName('*').length, heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(0) : null }))
      row.total = await page.locator('.cv-ed-total').innerText()
      // playback: 8 s of wall clock
      await startProbe(page)
      const p0 = await playhead(page); const tp = Date.now()
      await page.locator('.cv-ed-player button[aria-label="Play video"], .cv-ed-player button[aria-label="Play"]').first().click()
      const totalSec = Number(await page.locator('.cv-ed-ruler').getAttribute('aria-valuemax'))
      await page.waitForTimeout(Math.min(8, totalSec - 1) * 1000)
      const p1 = await playhead(page); const dt = (Date.now() - tp) / 1000
      await page.locator('.cv-ed-player button[aria-label="Pause video"], .cv-ed-player button[aria-label="Pause"]').first().click().catch(() => {})
      const r = await stopProbe(page)
      row.play = { ...summarize(r, dt * 1000), playheadAdvance: +(p1 - p0).toFixed(1), wallSec: +dt.toFixed(1), speedRatio: +((p1 - p0) / dt).toFixed(2) }
      await page.screenshot({ path: `${out}/a2-${n}-playing.png` })
      // seek: click the ruler at 60 % of its width, time until the playhead moves
      const box = await page.locator('.cv-ed-ruler').boundingBox()
      const before = await playhead(page); const ts = Date.now()
      await page.locator('.cv-ed-ruler').click({ position: { x: box.width * (before > totalSec / 2 ? 0.2 : 0.7), y: 8 } })
      await page.waitForFunction((b) => Math.abs(Number(document.querySelector('.cv-ed-ruler').getAttribute('aria-valuenow')) - b) > 0.3, before, { timeout: 5000 }).catch(() => {})
      row.seekMs = Date.now() - ts
      // drag a clip (reorder) and a trim handle, with the probe running
      const clips = page.locator('.cv-ed-clip'); const mid = await clips.nth(Math.min(n - 1, 1)).boundingBox()
      await startProbe(page); const td = Date.now()
      await page.mouse.move(mid.x + mid.width / 2, mid.y + mid.height / 2); await page.mouse.down()
      for (let i = 1; i <= 30; i++) await page.mouse.move(mid.x + mid.width / 2 + i * 8, mid.y + mid.height / 2, { steps: 1 })
      await page.mouse.up(); await page.waitForTimeout(300)
      row.dragReorder = summarize(await stopProbe(page), Date.now() - td)
      const edge = await page.locator('.cv-ed-clip').nth(Math.min(n - 1, 2)).locator('.cv-ed-edge-out').boundingBox()
      await startProbe(page); const te = Date.now()
      await page.mouse.move(edge.x + edge.width / 2, edge.y + edge.height / 2); await page.mouse.down()
      for (let i = 1; i <= 30; i++) await page.mouse.move(edge.x + edge.width / 2 - i * 2, edge.y + edge.height / 2, { steps: 1 })
      await page.mouse.up(); await page.waitForTimeout(300)
      row.dragTrim = summarize(await stopProbe(page), Date.now() - te)
      await page.screenshot({ path: `${out}/a2-${n}-after-drag.png` })
      rows.push(row)
      console.log(JSON.stringify(row))
      await page.getByRole('button', { name: /Close editor/ }).click().catch(() => {})
    }
  } catch (e) { console.log('ERR', e) }
  require('fs').writeFileSync(out + '/a2-results.json', JSON.stringify(rows, null, 1))
  await browser.close()
})()
