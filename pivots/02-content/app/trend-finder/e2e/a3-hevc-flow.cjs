// A3: synthetic HEVC .mov (hvc1) through upload -> Clean up -> editor -> export, in the real UI.
// Run: bash e2e/restart-backend.sh 8871 <log>; bash e2e/make-fixtures.sh <fx>;
//      node e2e/a3-hevc-flow.cjs <fixtures_dir> <out_dir>
// Needs the isolated backend on 8871 (see lib.cjs). Writes screenshots, final.mp4 and ffprobe.json to <out_dir>.
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
;(async () => {
  const { browser, ctx, page, errs } = await L.open()
  try {
    await L.login(page)
    await L.seed(page)
    await L.gotoCanvas(page)
    // add a Footage node after shot 1
    await page.locator('.react-flow__node-shot').first().getByRole('button', { name: 'Add after this shot' }).click()
    await page.getByRole('menuitem', { name: 'Footage' }).click()
    await page.waitForSelector('.react-flow__node-footage')
    await page.waitForTimeout(500)
    const node = page.locator('.react-flow__node-footage').first()
    await node.locator('input[type=file]').setInputFiles(fx + '/speech-hevc.mov')
    await page.waitForSelector('.cv-takes li', { timeout: 30000 })
    await page.screenshot({ path: out + '/01-uploaded.png' })
    L.ok('A3 upload .mov (hvc1)', (await L.api(page, '/api/ideas/idea1/takes')).body.length === 1, 'takes=1')
    await node.getByRole('button', { name: 'Clean up' }).click()
    await page.waitForSelector('.cv-takes li .cv-badge:text("Cleaned")', { timeout: 60000 })
    await page.waitForTimeout(500)
    await page.screenshot({ path: out + '/02-cleaned.png' })
    const takes = (await L.api(page, '/api/ideas/idea1/takes')).body
    const cleaned = takes.find((t) => t.cleanedFrom)
    L.ok('A3 clean up', !!cleaned && cleaned.chosen, 'cleaned take chosen=' + (cleaned && cleaned.chosen))
    await L.download(ctx, cleaned.url, out + '/cleaned.mp4')
    const cp = L.probe(out + '/cleaned.mp4'); const cv = cp.streams.find((s) => s.codec_type === 'video')
    console.log('cleaned', cv.codec_name, cv.width + 'x' + cv.height, cv.pix_fmt, cp.format.duration)
    await page.getByRole('button', { name: /Open editor/ }).click()
    await L.openEditor(page)
    await page.getByRole('button', { name: 'Fill in shot order' }).click()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: out + '/03-editor.png' })
    const proj = (await L.api(page, '/api/ideas/idea1/edit')).body.project
    L.ok('A3 timeline filled with cleaned take', proj.clips.length === 1 && proj.clips[0].source.id === cleaned.id, JSON.stringify(proj.clips.map((c) => [c.source.id, c.in, c.out])))
    const t0 = Date.now()
    await page.getByRole('button', { name: 'Export the video' }).click()
    await page.waitForSelector('.cv-ed-export-video', { timeout: 180000 })
    const sec = (Date.now() - t0) / 1000
    await page.screenshot({ path: out + '/04-exported.png' })
    const st = (await L.api(page, '/api/ideas/idea1/cut')).body
    await L.download(ctx, '/api/ideas/idea1/cut/file', out + '/final.mp4')
    const p = L.probe(out + '/final.mp4')
    require('fs').writeFileSync(out + '/ffprobe.json', JSON.stringify(p, null, 1))
    const v = p.streams.find((s) => s.codec_type === 'video'), a = p.streams.find((s) => s.codec_type === 'audio')
    const line = `${v.codec_name} ${v.width}x${v.height} ${v.r_frame_rate} ${v.pix_fmt}; ${a && a.codec_name} dur ${p.format.duration}; export ${sec.toFixed(1)}s`
    L.ok('A3 export ffprobe', v.codec_name === 'h264' && v.width === 1080 && v.height === 1920 && v.r_frame_rate === '30/1' && a && a.codec_name === 'aac', line)
    console.log('cut state', JSON.stringify(st).slice(0, 300))
  } catch (e) { L.ok('A3 script', false, String(e).slice(0, 400)); await page.screenshot({ path: out + '/err.png' }).catch(() => {}) }
  console.log('console errors:', JSON.stringify(errs.slice(0, 8)))
  await browser.close()
})()
