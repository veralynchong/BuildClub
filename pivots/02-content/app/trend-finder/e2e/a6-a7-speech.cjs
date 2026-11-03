// A6 (no speech: silence / weak noise, as take and as voiceover) and A7 (Mandarin voiceover -> whisper words -> caption pages).
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a6-a7-speech.cjs <fixtures_dir> <out_dir>
// Uses the real backend whisper path; the caption pages are computed by the app's own src/lib/editor/captions.ts (node strips the types).
const path = require('path')
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
const silences = (wav) => L.sh(`ffmpeg -hide_banner -i '${wav}' -af silencedetect=n=-35dB:d=0.4 -f null - 2>&1 | grep -E "silence_(start|end)" | sed 's/.*silence_//' | tr '\\n' ' '`)
;(async () => {
  const caps = await import('file://' + path.resolve(__dirname, '../src/lib/editor/captions.ts'))
  const { browser, ctx, page } = await L.open()
  try {
    await L.login(page); await L.seed(page)
    console.log('=== A6 as take (Clean up)')
    for (const [i, n] of ['silence', 'noise', 'noise-loud'].entries()) {
      const up = await L.uploadTake(ctx, 'idea1', i, `${fx}/${n}-take.mp4`)
      const cl = await L.apiNode(ctx, `/api/ideas/idea1/takes/${up.body.id}/clean`, { method: 'POST' })
      console.log(n, 'take clean ->', cl.status, JSON.stringify(cl.body.error || cl.body.trims))
    }
    console.log('=== voiceovers')
    const files = process.argv[4] ? process.argv[4].split(',') : ['silence.wav', 'noise.wav', 'noise-loud.wav', 'zh.wav', 'zh-tw.wav']
    const segs = {}
    for (const f of files) {
      const t0 = Date.now()
      const r = await L.uploadVoice(ctx, 'idea1', `${fx}/${f}`)
      console.log(`--- ${f}: status ${r.status} (${((Date.now() - t0) / 1000).toFixed(1)}s) dur=${r.body.duration} wordsError=${r.body.wordsError || '-'}`)
      if (r.body.words) {
        console.log('words:', JSON.stringify(r.body.words.map((w) => `${w.text}[${w.start.toFixed(2)}-${w.end.toFixed(2)}]`)))
        console.log('silences in file:', silences(`${fx}/${f}`))
        const seg = { id: r.body.id, source: 'upload', start: 0, volume: 1, edits: {} }
        const pages = caps.segmentPages(seg, { [seg.id]: r.body.words }, 60)
        console.log('pages:', JSON.stringify(pages.map((p) => `${(p.startMs / 1000).toFixed(2)}-${(caps.pageEnd(p) / 1000).toFixed(2)} "${p.text.trim()}"`)))
        segs[f] = { seg, words: r.body.words }
      }
    }
    require('fs').writeFileSync(out + '/voices.json', JSON.stringify(segs))
  } catch (e) { console.log('ERR', e) }
  await browser.close()
})()
