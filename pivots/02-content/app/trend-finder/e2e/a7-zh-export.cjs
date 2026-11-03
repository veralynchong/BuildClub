// A7 (export part): a Mandarin voiceover with captions on, exported; frames are cut before/in/after the 1.4 s pause.
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a7-zh-export.cjs <fixtures_dir> <out_dir>
// The captions in the video come from whisper's word times of zh.wav (see a6-a7-speech.cjs for the words and pages).
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
;(async () => {
  const { browser, ctx, page } = await L.open()
  try {
    await L.login(page); await L.seed(page)
    const a = (await L.uploadTake(ctx, 'idea1', 0, fx + '/clip-1.mp4')).body, b = (await L.uploadTake(ctx, 'idea1', 1, fx + '/clip-2.mp4')).body
    const v = (await L.uploadVoice(ctx, 'idea1', fx + '/zh.wav')).body
    console.log('voice', v.id, v.duration, 'words', v.words.length)
    const r = await L.putProject(page, 'idea1', (p) => ({ ...p, captions: { enabled: true },
      clips: [L.clip('c1', a.id, 0, 8, { source: { kind: 'take', id: a.id, shotId: a.shotId } }), L.clip('c2', b.id, 0, 8, { source: { kind: 'take', id: b.id, shotId: b.shotId } })],
      voiceover: [{ id: v.id, source: 'upload', start: 0, volume: 1, edits: {} }] }))
    console.log('put', r.status, JSON.stringify(r.body).slice(0, 200))
    const ex = await L.exportAndWait(page, 'idea1')
    console.log('export', ex.sec.toFixed(1) + 's', ex.state.status, ex.state.error || '')
    await L.download(ctx, '/api/ideas/idea1/cut/file', out + '/zh-export.mp4')
    for (const t of [0.3, 1.7, 3.0, 5.4, 7.5, 8.9, 10.9, 13.0, 14.1]) L.sh(`ffmpeg -v error -y -ss ${t} -i ${out}/zh-export.mp4 -frames:v 1 -vf "crop=1080:420:0:1280" ${out}/zh-f${t}.png`)
    console.log(L.sh(`ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate:format=duration -of compact ${out}/zh-export.mp4`))
  } catch (e) { console.log('ERR', e) }
  await browser.close()
})()
