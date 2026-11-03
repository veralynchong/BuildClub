// A4: a 10-bit HDR10 (BT.2020/PQ) take through Clean up and export, next to an 8-bit SDR twin with the same pixels.
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a4-hdr.cjs <fixtures_dir> <out_dir>
// Prints the stream tags at each stage and the mean RGB of a frame from the originals and from the exports.
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
const tags = (f) => { const v = L.probe(f).streams.find((s) => s.codec_type === 'video'); return `${v.codec_name} ${v.pix_fmt} prim=${v.color_primaries} trc=${v.color_transfer} space=${v.color_space} range=${v.color_range} ${v.width}x${v.height}` }
const mean = (f, t) => L.sh(`ffmpeg -v error -ss ${t} -i '${f}' -frames:v 1 -vf "scale=1:1:flags=area,format=rgb24" -f rawvideo - | xxd -p`).replace(/(..)(..)(..)/, (_, r, g, b) => `R${parseInt(r, 16)} G${parseInt(g, 16)} B${parseInt(b, 16)}`)
;(async () => {
  const { browser, ctx, page } = await L.open()
  try {
    await L.login(page); await L.seed(page)
    const rows = {}
    for (const [name, file, shot] of [['hdr', 'speech-hdr10.mp4', 0], ['sdr', 'speech-sdr.mp4', 1]]) {
      const up = await L.uploadTake(ctx, 'idea1', shot, `${fx}/${file}`)
      const cl = await L.apiNode(ctx, `/api/ideas/idea1/takes/${up.body.id}/clean`, { method: 'POST' })
      console.log(name, 'clean', cl.status, cl.body.error || `${cl.body.originalSec}s -> ${cl.body.cleanSec}s`)
      const f = `${out}/${name}-cleaned.mp4`
      await L.download(ctx, cl.body.take.url, f)
      rows[name] = { orig: `${fx}/${file}`, cleaned: f, takeId: cl.body.take.id }
      console.log(name, 'original   :', tags(rows[name].orig))
      console.log(name, 'cleaned    :', tags(f))
    }
    // export both: one clip each, whole cleaned take
    const r = await L.putProject(page, 'idea1', (p) => ({ ...p, clips: [L.clip('c1', rows.hdr.takeId, 0, 1.5, { source: { kind: 'take', id: rows.hdr.takeId } })] }))
    console.log('put hdr project', r.status)
    let ex = await L.exportAndWait(page, 'idea1'); console.log('export hdr', ex.sec.toFixed(1) + 's', ex.state.status)
    await L.download(ctx, '/api/ideas/idea1/cut/file', `${out}/hdr-export.mp4`)
    await L.putProject(page, 'idea1', (p) => ({ ...p, clips: [L.clip('c2', rows.sdr.takeId, 0, 1.5)] }))
    ex = await L.exportAndWait(page, 'idea1'); console.log('export sdr', ex.sec.toFixed(1) + 's', ex.state.status)
    await L.download(ctx, '/api/ideas/idea1/cut/file', `${out}/sdr-export.mp4`)
    console.log('hdr export tags:', tags(`${out}/hdr-export.mp4`)); console.log('sdr export tags:', tags(`${out}/sdr-export.mp4`))
    for (const t of [0.5, 1.2]) {
      console.log(`mean @${t}s  hdr orig(decoded naive) ${mean(rows.hdr.orig, t)} | hdr cleaned ${mean(rows.hdr.cleaned, t)} | hdr export ${mean(out + '/hdr-export.mp4', t)}`)
      console.log(`mean @${t}s  sdr orig ${mean(rows.sdr.orig, t)} | sdr cleaned ${mean(rows.sdr.cleaned, t)} | sdr export ${mean(out + '/sdr-export.mp4', t)}`)
    }
    for (const n of ['hdr', 'sdr']) L.sh(`ffmpeg -v error -y -ss 1.2 -i ${out}/${n}-export.mp4 -frames:v 1 ${out}/${n}-export-f.png`)
    L.sh(`ffmpeg -v error -y -ss 1.2 -i ${out}/hdr-cleaned.mp4 -frames:v 1 ${out}/hdr-cleaned-f.png`)
  } catch (e) { console.log('ERR', e) }
  await browser.close()
})()
