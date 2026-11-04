// A5: the front-end guards of "Run the whole shot" (spend guards), with mock models only.
//  a) a reference image on the storyboard -> refused with a note, no request
//  b) double click: one quote, one dialog; double click on Confirm: one start (2 generations)
//  c) while generating the button is disabled; Generate + Run clicked in one tick start only the Generate
//  d) a model that needs a key: Generate disabled, key-less options disabled, Run refused with a note, no request
// Run: bash e2e/restart-backend.sh 8871 <log>; node e2e/a5-chain-guards.cjs <fixtures_dir> <out_dir>
// Exits 1 when a check fails.
// Out of date since Polish B6 (2026-11-03): its node-select selectors and the settings it reads on the node card
// predate the right panel, so several steps fail. Not a merge gate; e2e/polish-b-nodes.cjs and panel-backspace.cjs
// cover the current canvas.
const L = require('./lib.cjs')
const [fx, out] = process.argv.slice(2)
const IDEA = 'idea1'
const hit = (reqs, confirm) => reqs.filter((r) => { try { return !!JSON.parse(r).confirm === confirm } catch { return false } }).length

async function putDoc(page, mutate) {
  const cur = (await L.api(page, `/api/ideas/${IDEA}/canvas`)).body
  const r = await L.api(page, `/api/ideas/${IDEA}/canvas`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: cur.version, doc: mutate(JSON.parse(JSON.stringify(cur.doc))) }) })
  if (r.status !== 200) throw new Error('canvas put ' + r.status + JSON.stringify(r.body))
  return r
}
const node = (d, id) => d.nodes.find((n) => n.id === id)
function baseDoc(d, { ref = false, upSel = null } = {}) {
  d.nodes = d.nodes.filter((n) => !['n_ft_s1', 'n_vid_s1', 'n_up_s1'].includes(n.id))
  d.edges = d.edges.filter((e) => !['n_ft_s1', 'n_vid_s1', 'n_up_s1'].some((x) => e.source === x || e.target === x))
  node(d, 'n_sb_s1').data = { primary: true, model: 'mock-image', prompt: 'a pan of tofu', selected: null, stale: false }
  d.nodes.push({ id: 'n_vid_s1', type: 'video', shotId: 's1', position: { x: 720, y: 0 }, data: { model: 'mock-video', prompt: '', duration: 4, selected: null, stale: false } })
  d.edges.push({ id: 'e_s1_v', source: 'n_shot_s1', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:text' },
    { id: 'e_sb_v', source: 'n_sb_s1', sourceHandle: 'out', target: 'n_vid_s1', targetHandle: 'in:start' })
  if (ref) {
    d.nodes.push({ id: 'n_up_s1', type: 'upload', shotId: 's1', position: { x: 0, y: 200 }, data: { media: 'image', selected: upSel } })
    d.edges.push({ id: 'e_up_sb', source: 'n_up_s1', sourceHandle: 'out', target: 'n_sb_s1', targetHandle: 'in:ref' })
  }
  return d
}
;(async () => {
  const { browser, ctx, page } = await L.open()
  const posts = []
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/gen')) posts.push({ url: r.url().replace(L.BASE, ''), body: r.postData() || '' }) })
  const chainPosts = (c) => posts.filter((p) => p.url.endsWith('/gen/chain') && hit([p.body], c)).length
  const genPosts = () => posts.filter((p) => p.url.endsWith('/gen')).length
  const gens = async () => (await L.api(page, `/api/ideas/${IDEA}/gen`)).body.filter((g) => g.model !== 'upload') // the reference upload is a generation row too
  try {
    await L.login(page); await L.seed(page)
    // d) needs-key (no generations exist yet, nothing can be charged)
    await putDoc(page, (d) => { baseDoc(d); node(d, 'n_sb_s1').data.model = 'seedream-4.5'; return d })
    await L.gotoCanvas(page)
    const sb = page.locator('.react-flow__node-storyboard').first()
    const chain = page.locator('.cv-chain-btn').first()
    const before = posts.length
    L.ok('d) Generate disabled on a needs-key model', await sb.locator('.cv-gen-foot button').isDisabled(), 'disabled')
    L.ok('d) needs-key text shown', (await sb.innerText()).includes('needs a key'), '')
    const opts = await sb.locator('select').first().evaluate((s) => [...s.options].map((o) => ({ t: o.text, d: o.disabled })))
    L.ok('d) key-less options are disabled in the menu', opts.filter((o) => /needs a key/.test(o.t)).every((o) => o.d) && opts.some((o) => /needs a key/.test(o.t)), JSON.stringify(opts.map((o) => (o.d ? 'x ' : '  ') + o.t.slice(0, 28))))
    await chain.click()
    await page.waitForTimeout(600)
    L.ok('d) Run the whole shot on a needs-key model: note, no dialog, no request', (await page.locator('.cv-conn-note').innerText()).includes('needs a key') && !(await page.locator('.cv-modal-actions').count()) && posts.length === before, await page.locator('.cv-conn-note').innerText())
    await page.screenshot({ path: out + '/a5-d-needs-key.png' })

    // a) reference image
    // the upload node must exist on the saved canvas before the upload is accepted
    await putDoc(page, (d) => baseDoc(d, { ref: true }))
    const up = await L.apiNode(ctx, `/api/ideas/${IDEA}/gen/upload?nodeId=n_up_s1`, { method: 'POST', headers: { 'content-type': 'image/png' }, body: require('fs').readFileSync(fx + '/ref.png') })
    await putDoc(page, (d) => baseDoc(d, { ref: true, upSel: up.body.id }))
    await L.gotoCanvas(page)
    const n0 = posts.length
    await page.locator('.cv-chain-btn').first().click()
    await page.waitForTimeout(800)
    const note = await page.locator('.cv-conn-note').innerText()
    L.ok('a) reference + Run the whole shot: refused with a note, no dialog, no request', /reference images/.test(note) && !(await page.locator('.cv-modal-actions').count()) && posts.length === n0, note)
    await page.screenshot({ path: out + '/a5-a-reference.png' })

    // b) double click, then double click on Confirm
    await putDoc(page, (d) => baseDoc(d))
    await L.gotoCanvas(page)
    const q0 = chainPosts(false), s0 = chainPosts(true)
    await page.locator('.cv-chain-btn').first().dblclick()
    await page.waitForSelector('.cv-modal-actions')
    await page.waitForTimeout(500)
    L.ok('b) double click on Run: one quote, one dialog', chainPosts(false) - q0 === 1 && (await page.locator('.cv-modal-actions').count()) === 1, `quotes=${chainPosts(false) - q0} dialogs=${await page.locator('.cv-modal-actions').count()}`)
    await page.screenshot({ path: out + '/a5-b-dialog.png' })
    await page.getByRole('button', { name: 'Confirm' }).dblclick()
    await page.waitForTimeout(1500)
    const g = await gens()
    L.ok('b) double click on Confirm: one start (2 generations)', chainPosts(true) - s0 === 1 && g.length === 2, `starts=${chainPosts(true) - s0} generations=${g.length}`)

    // c) while generating
    const dis = await page.locator('.cv-chain-btn').first().isDisabled()
    const gdis = await sb.locator('.cv-gen-foot button').isDisabled()
    L.ok('c) Run and Generate are disabled while the shot generates', dis && gdis, `run disabled=${dis}, generate disabled=${gdis}`)
    const n1 = posts.length
    await page.locator('.cv-chain-btn').first().evaluate((b) => b.click()) // a click that bypasses the disabled look
    await page.waitForTimeout(500)
    L.ok('c) a forced click on disabled Run sends nothing', posts.length === n1, '')
    await page.screenshot({ path: out + '/a5-c-running.png' })
    // wait for the chain to finish (mock models)
    for (let i = 0; i < 60; i++) { const x = await gens(); if (x.length === 2 && x.every((y) => y.status === 'done')) break; await L.sleep(500) }
    const fin = await gens()
    L.ok('c) mock chain finished', fin.length === 2 && fin.every((y) => y.status === 'done'), fin.map((y) => y.kind + ':' + y.status + ':$' + y.estUsd).join(' '))
    // Generate and Run clicked in the same tick (before React re-renders)
    await L.gotoCanvas(page)
    const gBefore = (await gens()).length, cBefore = chainPosts(false) + chainPosts(true), gp = genPosts()
    await page.evaluate(() => {
      const gen = document.querySelector('.react-flow__node-storyboard .cv-gen-foot button')
      const run = document.querySelector('.cv-chain-btn')
      gen.click(); run.click()
    })
    await page.waitForTimeout(1500)
    const gAfter = (await gens()).length
    L.ok('c) Generate + Run in one tick: only the Generate starts', gAfter - gBefore === 1 && chainPosts(false) + chainPosts(true) === cBefore && genPosts() - gp === 1, `new generations=${gAfter - gBefore}, chain requests=${chainPosts(false) + chainPosts(true) - cBefore}, /gen posts=${genPosts() - gp}`)
    await page.screenshot({ path: out + '/a5-c-race.png' })
    console.log('all generation cost rows (usd):', (await gens()).map((y) => y.estUsd + '/' + y.actualUsd).join(' '))
  } catch (e) { L.ok('A5 script', false, String(e).slice(0, 500)); await page.screenshot({ path: out + '/a5-err.png' }).catch(() => {}) }
  await browser.close()
  process.exit(L.results.every((r) => r.pass) ? 0 : 1)
})()
