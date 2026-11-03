// A8: export time of a 30 s clip, run twice (the first run is cold only if the caches were removed beforehand).
// Cold cache dirs: <app>/.remotion-bundle and <app>/node_modules/.cache/webpack (both gitignored, rebuilt on demand).
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a8-cold-export.cjs <fixtures_dir> <out_dir>   (needs fx/clip-30s.mp4)
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
;(async () => {
  const { browser, ctx, page } = await L.open()
  try {
    await L.login(page); await L.seed(page)
    const t = (await L.uploadTake(ctx, 'idea1', 0, `${fx}/clip-30s.mp4`)).body
    await L.putProject(page, 'idea1', (p) => ({ ...p, clips: [L.clip('c0', t.id, 0, 30, { source: { kind: 'take', id: t.id, shotId: t.shotId } })] }))
    for (const label of ['first', 'second']) {
      const r = await L.exportAndWait(page, 'idea1')
      console.log(label, r.sec.toFixed(1), 's', JSON.stringify(r.state).slice(0, 300))
      if (label === 'first') await L.download(ctx, '/api/ideas/idea1/cut/file', `${out}/a8-final.mp4`).catch((e) => console.log('download', String(e).slice(0, 100)))
    }
  } catch (e) { console.log('ERR', e) }
  await browser.close()
})()
