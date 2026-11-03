// Polish D acceptance (spec §10.10): the "✦ Build this shot" agent. Mock models only. The agent route answers the
// deterministic sample plan (mock-image, mock-video), so no Claude call is made. The one stub is display-only: it gives
// mock-image / mock-video a made-up price in the browser so the price dialog and totals have numbers to compare; the
// server still prices and runs them as free. The 502 in step 8 is a stubbed answer that never reaches the server.
// Run: (repo root) MOCK_GEN_DELAY_S=4 REMOTION_PORT=8872 bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e
//      then (app dir, after npm run build) node e2e/polish-d-agent.cjs <out_dir>
// Resets the plan to its three seeded shots and the canvas to bare frames, so it also runs after the other polish scripts.
// Exits 1 when a check fails.
const L = require('./lib.cjs')
const fs = require('fs')
const out = process.argv[2] || '.'
fs.mkdirSync(out, { recursive: true })
const IDEA = 'idea1'
const json = (b, method = 'PUT') => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
const FAILED = "Couldn't plan this shot. Try again."
const LEAK = 'SECRET-DETAIL-do-not-show'

;(async () => {
  const { browser, page, errs } = await L.open()
  const node = (id) => page.locator(`.react-flow__node[data-id="${id}"]`)
  const shot = (p) => page.screenshot({ path: `${out}/${p}.png` })
  const canvas = async () => (await L.api(page, `/api/ideas/${IDEA}/canvas`)).body
  const gens = async () => (await L.api(page, `/api/ideas/${IDEA}/gen`)).body
  const rowsOf = async (...ids) => (await gens()).filter((g) => ids.includes(g.nodeId)).length
  const edgeIds = () => page.evaluate(() => [...document.querySelectorAll('.react-flow__edge')].map((e) => e.getAttribute('data-id') || (e.getAttribute('data-testid') || '').replace(/^rf__edge-/, '')))
  const shell = () => page.locator('.shell').evaluate((el) => el.className)
  const frameBtn = (shotId) => node(`n_shot_${shotId}`).locator('.cv-frame-agent-btn')
  const panel = page.locator('aside.cv-agent')
  const fit = async () => {
    await page.locator('.cv-zoom button').last().click()
    await page.waitForTimeout(400)
  }
  const waitStatus = (id, re, timeout = 40000) =>
    page.waitForFunction(({ id, re }) => new RegExp(re).test(document.querySelector(`.react-flow__node[data-id="${id}"] .cv-card-status`)?.textContent || ''), { id, re }, { timeout }).then(() => true, () => false)
  const openAgent = async (shotId) => {
    await fit()
    await frameBtn(shotId).click()
    await page.locator('aside.cv-agent .cv-agent-card').first().waitFor({ timeout: 8000 })
  }
  const panelTotal = async () => (await panel.locator('.cv-panel-cost', { hasText: 'Total' }).innerText()).trim()
  const dialogTotal = async () => (await page.locator('.cv-run-modal strong').last().innerText()).trim()
  const nodesOf = (c, shotId, type) => c.doc.nodes.filter((n) => n.shotId === shotId && n.type === type)
  const settle = () => page.waitForTimeout(1600) // lets an autosave land

  // every POST that starts a generation, with its body
  const starts = []
  page.on('request', (r) => {
    if (r.method() !== 'POST') return
    const m = /\/api\/ideas\/[^/]+\/gen(\/chain)?$/.exec(new URL(r.url()).pathname)
    if (m) starts.push({ chain: !!m[1], body: JSON.parse(r.postData() || '{}') })
  })
  // every failed response, with where in the run it came
  const bad = []
  page.on('response', (r) => { if (r.status() >= 400) bad.push({ i: errs.length, status: r.status(), url: new URL(r.url()).pathname }) })
  let planPosts = 0
  page.on('request', (r) => { if (r.method() === 'POST' && /\/agent\/plan$/.test(r.url())) planPosts++ })

  try {
    await L.login(page)
    const at = { login: errs.length }
    await L.seed(page) // approved plan with s1..s3
    await page.evaluate(() => localStorage.removeItem('remake.canvas.fullscreen'))

    // display-only prices for the two mock models (see the header)
    await page.route('**/api/gen/models', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      for (const m of body.models) {
        if (m.id === 'mock-image') m.price = { per: 'image', usd: 0.04 }
        if (m.id === 'mock-video') m.price = { per: 'second', usd: 0.05 }
      }
      await route.fulfill({ response: res, json: body })
    })

    // ---- setup: bare frames, one kit item, a kit node ----
    const cur = await canvas()
    const bare = { ...cur.doc, nodes: cur.doc.nodes.filter((n) => n.type === 'shot'), edges: [] }
    L.ok('setup: canvas reset to its shot nodes', (await L.api(page, `/api/ideas/${IDEA}/canvas`, json({ version: cur.version, doc: bare }))).status === 200 && bare.nodes.length === 3, String(bare.nodes.length))
    await L.api(page, '/api/clients/evergreen/kit/items', json({ kind: 'character', name: 'Mia' }, 'POST'))
    await L.gotoCanvas(page)
    await page.locator('.cv-rail-add .cv-add-plus').click()
    await page.getByRole('menuitem', { name: 'Kit', exact: true }).click()
    await page.waitForTimeout(800)
    const kitId = await page.locator('.react-flow__node-kit').getAttribute('data-id')
    L.ok('setup: a kit node on the board', !!kitId, String(kitId))
    await settle()
    const gens0 = (await gens()).length

    // ---- 1. ✦ on an empty frame: two cards and a total (§10.10) ----
    await fit()
    L.ok('every live frame has a ✦ Build this shot button', (await page.locator('.cv-frame-agent-btn').count()) === 3 && /Build this shot/.test(await frameBtn('s1').innerText()), '')
    const before = { canvas: JSON.stringify(await canvas()), gens: JSON.stringify(await gens()) }
    await frameBtn('s1').click()
    await panel.locator('.cv-agent-card').first().waitFor({ timeout: 8000 })
    await page.waitForTimeout(300)
    const cards = await panel.locator('.cv-agent-card').count()
    const total1 = await panelTotal()
    L.ok('✦ on an empty frame: the panel shows two cards (Storyboard, Video) and a total', cards === 2 && /Total ≈ US\$0\.\d\d/.test(total1) && (await panel.locator('.cv-agent-card-title').allInnerTexts()).join('|') === 'Storyboard|Video', `${cards} ${total1}`)
    L.ok('✦ asked the server once and the plan names the mock models', planPosts === 1 && /Mock image/.test(await panel.locator('.cv-agent-card').nth(0).innerText()) && /Mock video/.test(await panel.locator('.cv-agent-card').nth(1).innerText()), String(planPosts))
    L.ok('✦ planning added nothing to the canvas yet', (await node('n_shot_s1').count()) === 1 && (await page.locator('.react-flow__node-storyboard, .react-flow__node-video').count()) === 0, '')
    await shot('01-panel')

    // ---- 2. Cancel: canvas and generations byte-for-byte the same, nothing started ----
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await settle()
    const after = { canvas: JSON.stringify(await canvas()), gens: JSON.stringify(await gens()) }
    L.ok('Cancel: GET canvas before and after are byte-for-byte equal', before.canvas === after.canvas, `${before.canvas.length} vs ${after.canvas.length}`)
    L.ok('Cancel: GET gen has the same rows and no start was sent', before.gens === after.gens && starts.length === 0, `${starts.length}`)
    L.ok('Cancel: the panel is gone and the board has no new node', (await panel.count()) === 0 && (await page.locator('.react-flow__node-storyboard, .react-flow__node-video').count()) === 0, '')

    // ---- 3. Esc with the panel open closes the panel and stays in full screen ----
    await page.locator('.cv-flow .react-flow__pane').click({ position: { x: 300, y: 12 } })
    await page.keyboard.press('f')
    await page.waitForTimeout(400)
    L.ok('F enters full screen', /is-full/.test(await shell()), '')
    await openAgent('s1')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    L.ok('Esc with the panel open closes the panel and stays in full screen', (await panel.count()) === 0 && /is-full/.test(await shell()), await shell())
    await shot('03-esc-fullscreen')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)
    L.ok('a second Esc leaves full screen', !/is-full/.test(await shell()), '')

    // ---- 4. Approve and run, double-clicked: one dialog, exactly one generation per node ----
    await openAgent('s1')
    const sbPrompt = await panel.locator('textarea').nth(0).inputValue()
    const vidPrompt = await panel.locator('textarea').nth(1).inputValue()
    const t4 = await panelTotal()
    await panel.getByRole('button', { name: 'Approve and run', exact: true }).dblclick()
    await page.locator('.cv-run-modal').waitFor({ timeout: 10000 })
    await page.waitForTimeout(1200)
    L.ok('double-click on Approve and run opens one dialog only', (await page.locator('.cv-run-modal').count()) === 1 && (await page.locator('.cv-run-modal').getAttribute('aria-label')) === 'Run the whole shot', '')
    L.ok('the dialog total equals the panel total', (await dialogTotal()) === t4, `${t4} | ${await dialogTotal()}`)
    await shot('04-approve-dialog')
    const startsBefore = starts.length
    await page.locator('.cv-run-modal .btn-primary').click()
    await page.waitForTimeout(800)
    let c = await canvas()
    const sb1 = nodesOf(c, 's1', 'storyboard'), v1 = nodesOf(c, 's1', 'video')
    L.ok('Approve: one storyboard and one video exist in shot 1', sb1.length === 1 && v1.length === 1, `${sb1.length} ${v1.length}`)
    const sbId = sb1[0]?.id, vidId = v1[0]?.id
    L.ok('Approve: the nodes carry the plan prompts and models', sb1[0]?.data.prompt === sbPrompt && v1[0]?.data.prompt === vidPrompt && sb1[0]?.data.model === 'mock-image' && v1[0]?.data.model === 'mock-video', '')
    L.ok('Approve: the storyboard is wired to the kit node (in:kit)', c.doc.edges.some((e) => e.source === kitId && e.target === sbId && e.targetHandle === 'in:kit'), '')
    L.ok('Approve: the video starts from the storyboard (in:start edge, drawn on the board)', c.doc.edges.some((e) => e.source === sbId && e.target === vidId && e.targetHandle === 'in:start') && (await edgeIds()).includes(`e_${sbId}_${vidId}_in:start`), '')
    const done4 = (await waitStatus(sbId, '^v1 / 1$')) && (await waitStatus(vidId, '^v1 / 1$'))
    L.ok('Approve: both generations finish (v1 / 1)', done4, '')
    await shot('04-approved')
    const own = starts.slice(startsBefore)
    L.ok('Approve: exactly one chain start was sent, for these two nodes', own.length === 1 && own[0].chain && own[0].body.imageNodeId === sbId && own[0].body.videoNodeId === vidId, JSON.stringify(own.map((s) => [s.chain, s.body.imageNodeId, s.body.videoNodeId])))
    L.ok('Approve: exactly one generation row per node', (await rowsOf(sbId)) === 1 && (await rowsOf(vidId)) === 1, `${await rowsOf(sbId)} ${await rowsOf(vidId)}`)

    // ---- 5. generated nodes: the plan is applied and only marks them out of date (spec §9.2.5), nothing runs ----
    await openAgent('s1')
    const NEW_SB = 'E2E storyboard prompt: rainy window, close up'
    const NEW_VID = 'E2E video prompt: slow push in on the window'
    await panel.locator('textarea').nth(0).fill(NEW_SB)
    await panel.locator('textarea').nth(1).fill(NEW_VID)
    const startsBefore5 = starts.length
    const rows5 = (await gens()).length
    await panel.getByRole('button', { name: 'Approve and run', exact: true }).click()
    const said = await page.waitForFunction(() => /Nothing to run/.test(document.querySelector('.cv-conn-note')?.textContent || ''), null, { timeout: 8000 }).then(() => true, () => false)
    await page.waitForTimeout(600)
    c = await canvas()
    L.ok('generated nodes: Approve applies the plan prompts to the same nodes (none duplicated) and says "Nothing to run"', said && c.doc.nodes.find((n) => n.id === sbId)?.data.prompt === NEW_SB && c.doc.nodes.find((n) => n.id === vidId)?.data.prompt === NEW_VID && nodesOf(c, 's1', 'storyboard').length === 1 && nodesOf(c, 's1', 'video').length === 1, String(said))
    L.ok('generated nodes: both cards are marked Out of date, no dialog, nothing started', (await node(sbId).locator('.cv-card-status').innerText()).trim() === 'Out of date' && (await node(vidId).locator('.cv-card-status').innerText()).trim() === 'Out of date' && (await page.locator('.cv-run-modal').count()) === 0 && starts.length === startsBefore5 && (await gens()).length === rows5, '')
    await shot('05-generated-stale')

    // ---- 6. existing nodes with no result yet (the D3 case): Create only, then change the plan and Approve ----
    const startsBefore6 = starts.length
    const gensBefore6 = (await gens()).length
    await openAgent('s3')
    await panel.getByRole('button', { name: 'Create only', exact: true }).click()
    await page.waitForTimeout(1500)
    c = await canvas()
    const sb3 = nodesOf(c, 's3', 'storyboard')[0]?.id, v3 = nodesOf(c, 's3', 'video')[0]?.id
    L.ok('Create only: shot 3 gets one storyboard and one video, no dialog, nothing started', !!sb3 && !!v3 && nodesOf(c, 's3', 'storyboard').length === 1 && (await page.locator('.cv-run-modal').count()) === 0 && starts.length === startsBefore6 && (await gens()).length === gensBefore6, `${sb3} ${v3}`)
    await openAgent('s3')
    const SB3 = 'E2E shot 3 storyboard: market stall at dawn'
    const VID3 = 'E2E shot 3 video: pan across the stall'
    await panel.locator('textarea').nth(0).fill(SB3)
    await panel.locator('textarea').nth(1).fill(VID3)
    const t6 = await panelTotal()
    L.ok('existing nodes: the panel total is priced from the plan (not 0)', !/US\$0\.00$/.test(t6), t6)
    await panel.getByRole('button', { name: 'Approve and run', exact: true }).click()
    await page.locator('.cv-run-modal').waitFor({ timeout: 10000 })
    await page.waitForTimeout(600)
    const items6 = await page.locator('.cv-run-modal li').allInnerTexts()
    L.ok('existing nodes: the dialog total equals the panel total', (await dialogTotal()) === t6, `${t6} | ${await dialogTotal()}`)
    L.ok('existing nodes: the dialog lists Shot 3 with its Storyboard and Video', items6.length === 3 && /^Shot 3/.test(items6[0]) && /Storyboard/.test(items6[1]) && /Video/.test(items6[2]), JSON.stringify(items6))
    await shot('06-existing-dialog')
    const startsBefore6b = starts.length
    await page.locator('.cv-run-modal .btn-primary').click()
    await page.waitForTimeout(800)
    const own6 = starts.slice(startsBefore6b)
    L.ok('existing nodes: the run is sent for the ids of the applied doc with the plan prompts', own6.length === 1 && own6[0].chain && own6[0].body.imageNodeId === sb3 && own6[0].body.videoNodeId === v3 && own6[0].body.prompt === SB3 && own6[0].body.videoPrompt === VID3, JSON.stringify(own6.map((s) => s.body)).slice(0, 300))
    L.ok('existing nodes: both finish (v1 / 1)', (await waitStatus(sb3, '^v1 / 1$')) && (await waitStatus(v3, '^v1 / 1$')), '')
    c = await canvas()
    L.ok('existing nodes: GET canvas shows the plan prompts on the same nodes, none duplicated', c.doc.nodes.find((n) => n.id === sb3)?.data.prompt === SB3 && c.doc.nodes.find((n) => n.id === v3)?.data.prompt === VID3 && nodesOf(c, 's3', 'storyboard').length === 1 && nodesOf(c, 's3', 'video').length === 1, '')
    L.ok('existing nodes: exactly one generation row per node', (await rowsOf(sb3)) === 1 && (await rowsOf(v3)) === 1, `${await rowsOf(sb3)} ${await rowsOf(v3)}`)
    await shot('06-existing-done')

    // ---- 7. a shot removed from the plan (Review Focus 2) ----
    await openAgent('s2')
    await panel.getByRole('button', { name: 'Approve and run', exact: true }).click()
    await page.locator('.cv-run-modal').waitFor({ timeout: 10000 })
    await page.locator('.cv-run-modal .btn-primary').click()
    await page.waitForTimeout(800)
    c = await canvas()
    const sb2 = nodesOf(c, 's2', 'storyboard')[0]?.id, v2 = nodesOf(c, 's2', 'video')[0]?.id
    L.ok('setup: shot 2 has a generated storyboard and video', !!sb2 && !!v2 && (await waitStatus(sb2, '^v1 / 1$')) && (await waitStatus(v2, '^v1 / 1$')), `${sb2} ${v2}`)
    // an unrun, priced storyboard in shot 2: Run all would run it if the shot were still live
    await settle()
    const cc = await canvas()
    cc.doc.nodes.push({ id: 'n_sb_extra_s2', type: 'storyboard', shotId: 's2', position: { x: 1500, y: 700 }, data: { model: 'mock-image', prompt: 'an extra, never generated' } })
    L.ok('setup: an extra unrun storyboard saved in shot 2', (await L.api(page, `/api/ideas/${IDEA}/canvas`, json({ version: cc.version, doc: cc.doc }))).status === 200, '')
    await L.gotoCanvas(page)
    await page.waitForTimeout(1200)
    const totalBefore = (await page.locator('.cv-bar-total').innerText()).trim()
    L.ok('before removal: the toolbar counts 3 shots', /^3 shots/.test(totalBefore), totalBefore)
    const ideas = (await L.api(page, '/api/ideas')).body
    ideas.find((i) => i.id === IDEA).shots = ideas.find((i) => i.id === IDEA).shots.filter((s) => s.id !== 's2')
    L.ok('setup: shot 2 removed from the plan through the API', (await L.api(page, '/api/ideas', json(ideas))).status === 200, '')
    const genRowsS2 = (await gens()).filter((g) => g.nodeId === sb2 || g.nodeId === v2).length
    await L.gotoCanvas(page)
    await page.waitForTimeout(1500)
    await fit()
    const frame2 = node('n_shot_s2')
    L.ok('removed shot: the frame shows "Removed from the plan"', (await frame2.locator('.cv-frame.is-removed').count()) === 1 && /Removed from the plan/.test(await frame2.innerText()), '')
    L.ok('removed shot: no ✦ and no + on its frame', (await frame2.locator('.cv-frame-agent-btn').count()) === 0 && (await frame2.locator('.cv-frame-add').count()) === 0, '')
    L.ok('removed shot: the other frames keep their ✦', (await frameBtn('s1').count()) === 1 && (await frameBtn('s3').count()) === 1, '')
    c = await canvas()
    L.ok('removed shot: its nodes are still saved and still show their version', !!c.doc.nodes.find((n) => n.id === sb2) && !!c.doc.nodes.find((n) => n.id === v2) && (await node(sb2).locator('.cv-card-status').innerText()).trim() === 'v1 / 1', '')
    L.ok('removed shot: its versions are still in the generation list', genRowsS2 === 2 && (await gens()).filter((g) => (g.nodeId === sb2 || g.nodeId === v2) && g.status === 'done').length === 2, String(genRowsS2))
    await shot('07-removed')
    await page.locator('.cv-agent-pick > button').click()
    const listed = await page.locator('.cv-agent-list li').allInnerTexts()
    L.ok("removed shot: the rail's ✦ list offers the two live shots and not shot 2", listed.length === 2 && listed.some((s) => s.includes(L.LINES[0])) && listed.some((s) => s.includes(L.LINES[2])) && !listed.some((s) => s.includes(L.LINES[1])), JSON.stringify(listed))
    await shot('07-rail-list')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    const totalAfter = (await page.locator('.cv-bar-total').innerText()).trim()
    L.ok('removed shot: the toolbar total counts 2 shots', /^2 shots/.test(totalAfter), totalAfter)
    await page.locator('.cv-runall-btn').click()
    await page.locator('.cv-run-modal').waitFor({ timeout: 10000 })
    const shotRows = await page.locator('.cv-run-modal .cv-run-shot').allInnerTexts()
    L.ok('removed shot: the Run all dialog lists only live shots (the unrun extra node of shot 2 is left out)', shotRows.length === 1 && /^Shot 1 /.test(shotRows[0]) && !/Shot 0/.test(await page.locator('.cv-run-modal').innerText()), JSON.stringify(shotRows))
    L.ok('removed shot: the dialog total equals the toolbar total', totalAfter.includes((await dialogTotal()).replace('Total ', '')), `${totalAfter} | ${await dialogTotal()}`)
    await shot('07-runall')
    await page.locator('.cv-run-modal .btn-ghost').click()

    // ---- 8. the 502 path: the sentence, never the detail, canvas untouched ----
    at.s8 = errs.length
    await settle()
    const before8 = JSON.stringify(await canvas())
    await page.route(/\/api\/ideas\/[^/]+\/agent\/plan$/, (route) => route.fulfill({ status: 502, json: { error: FAILED, detail: LEAK } }))
    await fit()
    await frameBtn('s1').click()
    await panel.locator('[role=alert]').waitFor({ timeout: 8000 })
    const alertText = (await panel.locator('[role=alert]').innerText()).trim()
    L.ok('502: the panel shows the sentence', alertText === FAILED, alertText)
    L.ok('502: the detail never appears on the page', !(await page.content()).includes(LEAK) && !errs.slice(at.s8).some((e) => e.includes(LEAK)), '')
    L.ok('502: no cards and Approve is disabled', (await panel.locator('.cv-agent-card').count()) === 0 && (await panel.getByRole('button', { name: 'Approve and run', exact: true }).isDisabled()), '')
    await shot('08-502')
    await panel.getByRole('button', { name: 'Cancel', exact: true }).click()
    await settle()
    L.ok('502: GET canvas is unchanged', JSON.stringify(await canvas()) === before8, '')
    at.s8end = errs.length
    await page.unroute(/\/api\/ideas\/[^/]+\/agent\/plan$/)

    // ---- 9. read-only canvas: no ✦ anywhere ----
    at.s9 = errs.length
    const ideas9 = (await L.api(page, '/api/ideas')).body
    ideas9.find((i) => i.id === IDEA).status = 'waiting'
    L.ok('setup: the plan is waiting (read-only)', (await L.api(page, '/api/ideas', json(ideas9))).status === 200, '')
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.waitForFunction(() => !document.querySelector('.cv-runall-btn'), null, { timeout: 8000 }).catch(() => {})
    L.ok('read-only: no ✦ on any frame and no ✦ in the rail', (await page.locator('.cv-frame-agent-btn').count()) === 0 && (await page.locator('.cv-agent-pick').count()) === 0 && (await page.locator('.cv-runall-btn').count()) === 0, '')
    await shot('09-read-only')

    // ---- failed responses: only the stubbed 502 and the read-only plan's 409s (and 401s before login) ----
    const allowed = (b) => (b.i < at.login && b.status === 401) || (b.i >= at.s8 && b.i <= at.s8end && b.status === 502 && /agent\/plan/.test(b.url)) || (b.i >= at.s9 && b.status === 409)
    const badLeft = bad.filter((b) => !allowed(b))
    L.ok('no unexpected 4xx or 5xx response', badLeft.length === 0, JSON.stringify(badLeft.slice(0, 3)))
    const okErr = (e, i) => (i < at.login && /401/.test(e)) || (i >= at.s8 && i <= at.s8end && /502/.test(e)) || (i >= at.s9 && /409/.test(e))
    const real = errs.filter((e, i) => !okErr(e, i))
    L.ok('no console errors', real.length === 0, real.slice(0, 3).join(' | '))
    L.ok('only the three Approve runs started a generation (the other chain requests are price quotes)', starts.filter((s) => s.chain && s.body.confirm === true).length === 3 && starts.every((s) => s.chain) && gens0 >= 0, JSON.stringify(starts.map((s) => [s.chain, s.body.nodeId || s.body.imageNodeId])))
  } catch (e) {
    L.ok('script ran to the end', false, String((e && e.stack) || e))
    await page.screenshot({ path: out + '/zz-error.png' }).catch(() => {})
  } finally {
    await page.evaluate(() => localStorage.removeItem('remake.canvas.fullscreen')).catch(() => {})
    await browser.close()
    const nbad = L.results.filter((r) => !r.pass).length
    console.log(nbad ? `${nbad} FAILED` : `ALL ${L.results.length} PASS`)
    process.exit(nbad ? 1 : 0)
  }
})()
