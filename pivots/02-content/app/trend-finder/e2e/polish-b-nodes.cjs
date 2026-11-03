// Polish B acceptance (spec §10.2–§10.6, §10.11): shot frames, thin lines, node cards, the right panel, Run all and the
// paid-model confirms, mock models only. The paid paths run against stubbed responses (page.route): the models list
// says one priced model is available, and every start/chain request is answered by the stub, never by the server.
// Run: (repo root) MOCK_GEN_DELAY_S=4 REMOTION_PORT=8872 bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e
//      then (app dir, after npm run build) node e2e/polish-b-nodes.cjs <out_dir>
// Exits 1 when a check fails.
const L = require('./lib.cjs')
const fs = require('fs')
const out = process.argv[2] || '.'
fs.mkdirSync(out, { recursive: true })
const IDEA = 'idea1'
const json = (b) => ({ method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })

;(async () => {
  const { browser, page, errs } = await L.open()
  const node = (id) => page.locator(`.react-flow__node[data-id="${id}"]`)
  const shot = (p) => page.screenshot({ path: `${out}/${p}.png` })
  const ids = () => page.evaluate(() => [...document.querySelectorAll('.react-flow__node')].map((e) => e.getAttribute('data-id')))
  const edges = () => page.evaluate(() => [...document.querySelectorAll('.react-flow__edge')].map((e) => ({ id: e.getAttribute('data-id') || (e.getAttribute('data-testid') || '').replace(/^rf__edge-/, ''), cls: e.getAttribute('class') || '' })))
  const status = (id) => node(id).locator('.cv-card-status').allInnerTexts()
  const getCanvas = async () => (await L.api(page, `/api/ideas/${IDEA}/canvas`)).body
  const select = async (id) => {
    await node(id).locator('.cv-card-head').first().click()
    await page.waitForTimeout(250)
  }
  const deselect = async () => {
    await page.keyboard.press('Escape')
    await page.locator('.cv-flow .react-flow__pane').click({ position: { x: 300, y: 12 } })
    await page.waitForTimeout(200)
  }
  // every PUT /canvas the page sends, with its answer
  const saves = []
  page.on('response', (r) => {
    if (r.request().method() === 'PUT' && /\/api\/ideas\/[^/]+\/canvas$/.test(r.url())) {
      saves.push(r.status())
      saveBodies.push(r.request().postDataJSON())
    }
  })
  const saveBodies = []
  // a frame's box holds each of its members (by id: n_shot_<shotId> holds the nodes whose shotId is <shotId>)
  const insideFrames = (members) => page.evaluate((members) => {
    const box = (id) => document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getBoundingClientRect()
    const bad = []
    for (const [frame, list] of Object.entries(members)) {
      const f = box(frame)
      for (const m of list) {
        const r = box(m)
        if (!f || !r || r.left < f.left - 1 || r.top < f.top - 1 || r.right > f.right + 1 || r.bottom > f.bottom + 1) bad.push(`${m} in ${frame}`)
      }
    }
    return bad
  }, members)
  const fit = async () => {
    await page.locator('.cv-zoom button').last().click()
    await page.waitForTimeout(400)
  }
  const addInFrame = async (frameId, kind) => {
    await fit()
    const before = new Set(await ids())
    await node(frameId).locator('.cv-frame-add .cv-add-plus').click()
    await page.getByRole('menuitem', { name: kind, exact: true }).click()
    await page.waitForTimeout(600)
    return (await ids()).find((i) => !before.has(i))
  }
  // drags a line from the node's output and lets go at (x, y) on the page
  const dragOut = async (id, x, y) => {
    const h = await node(id).locator('.react-flow__handle.source').first().boundingBox()
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
    await page.mouse.down()
    await page.mouse.move(x - 40, y - 20, { steps: 8 })
    await page.mouse.move(x, y, { steps: 4 })
    await page.mouse.up()
    await page.waitForTimeout(300)
  }
  const waitStatus = (id, re, timeout = 20000) =>
    page.waitForFunction(({ id, re }) => new RegExp(re).test(document.querySelector(`.react-flow__node[data-id="${id}"] .cv-card-status`)?.textContent || ''), { id, re }, { timeout }).then(() => true, () => false)

  try {
    await L.login(page)
    await L.seed(page)
    // a kit item for the client, so the kit node has something to show
    const item = await L.api(page, '/api/clients/evergreen/kit/items', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'character', name: 'Mia' }) })
    L.ok('setup: kit item created', item.status === 201, String(item.status))

    // ---- 1. frames, no shot handles, no Text lines (§10.2) ----
    saves.length = 0
    await L.gotoCanvas(page)
    await page.waitForTimeout(2500)
    L.ok('first load: no save without a user action (carry-in 5)', saves.length === 0, JSON.stringify(saves))
    L.ok('3 shots are frames', (await page.locator('.react-flow__node-shot .cv-frame').count()) === 3, '')
    L.ok('no shot frame has ports', (await page.locator('.react-flow__node-shot .react-flow__handle').count()) === 0, '')
    const e0 = await edges()
    L.ok('no line comes out of a shot (no Text lines)', !e0.some((e) => /^e_n_shot_/.test(e.id)), JSON.stringify(e0.map((e) => e.id)))
    L.ok('every member is inside its frame', (await insideFrames({ n_shot_s1: ['n_sb_s1'], n_shot_s2: ['n_sb_s2'], n_shot_s3: ['n_sb_s3'] })).length === 0, '')
    await shot('01-frames')

    // ---- 2. a video in an empty frame gets no start line; in a frame with a storyboard it does (§10.3) ----
    await select('n_sb_s3')
    await page.evaluate(() => document.activeElement?.blur())
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(400)
    L.ok('setup: the storyboard of shot 3 is deleted', (await node('n_sb_s3').count()) === 0, '')
    const v3 = await addInFrame('n_shot_s3', 'Video')
    L.ok('empty frame: the new video has no start line', !!v3 && !(await edges()).some((e) => e.id.endsWith(`_${v3}_in:start`)), String(v3))
    const v1 = await addInFrame('n_shot_s1', 'Video')
    const startLine = `e_n_sb_s1_${v1}_in:start`
    const e1 = await edges()
    L.ok('frame with a storyboard: the new video gets the start line', e1.some((e) => e.id === startLine), JSON.stringify(e1.map((e) => e.id)))
    L.ok('lines are cv-edge', e1.length > 0 && e1.every((e) => /\bcv-edge\b/.test(e.cls)), JSON.stringify(e1.map((e) => e.cls)))
    L.ok('new videos sit inside their frames', (await insideFrames({ n_shot_s1: ['n_sb_s1', v1], n_shot_s3: [v3] })).length === 0, '')
    await select('n_sb_s1')
    const focusCls = (await edges()).find((e) => e.id === startLine)?.cls || ''
    L.ok('selecting a storyboard makes its lines is-focus', /\bis-focus\b/.test(focusCls), focusCls)
    await shot('02-focus')
    await deselect()

    // ---- 3. a line let go on empty board: only Storyboard and Video (§10.4); the menu stays on the board ----
    const flow = await page.locator('.cv-flow').boundingBox()
    const s2 = await node('n_shot_s2').boundingBox()
    await dragOut('n_sb_s1', s2.x + s2.width + 80, s2.y + 30)
    const items = await page.locator('.cv-drop [role=menuitem]').allInnerTexts()
    L.ok('drop menu lists only Storyboard and Video', JSON.stringify(items) === JSON.stringify(['Storyboard', 'Video']), JSON.stringify(items))
    await shot('03-drop-menu')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    await dragOut('n_sb_s1', flow.x + flow.width - 6, flow.y + flow.height - 150)
    const menu = await page.locator('.cv-drop').boundingBox().catch(() => null)
    L.ok('drop menu near the edge stays inside the board (carry-in 2)', !!menu && menu.x + menu.width <= flow.x + flow.width + 1 && menu.y + menu.height <= flow.y + flow.height + 1, JSON.stringify({ menu, flow }))
    await shot('03b-drop-edge')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // ---- 4. generating (§10.5): the line runs, the node says Generating, the queue counts one ----
    await node(v1).locator('.cv-gen-foot button').click()
    await page.waitForTimeout(700)
    const runCls = (await edges()).find((e) => e.id === startLine)?.cls || ''
    L.ok('generating: the line into it is-running', /\bis-running\b/.test(runCls), runCls)
    const st = await status(v1)
    L.ok('generating: the node shows "Generating"', st.length === 1 && /^Generating/.test(st[0]), JSON.stringify(st))
    L.ok('queue reads "● 1 running"', /● 1 running/.test(await page.locator('.cv-queue-pill').innerText().catch(() => '')), '')
    await shot('04-running')
    L.ok('video finishes: v1 / 1', await waitStatus(v1, '^v1 / 1$'), JSON.stringify(await status(v1)))
    L.ok('after a result the button reads "Regenerate (v2)"', (await node(v1).locator('.cv-gen-foot button').innerText()).trim() === 'Regenerate (v2)', '')

    // ---- 5. versions: two storyboard results, the panel thumbnails switch the shown one (§10.6); stale card ----
    await node('n_sb_s1').locator('.cv-gen-foot button').click()
    L.ok('storyboard v1 done', await waitStatus('n_sb_s1', '^v1 / 1$'), '')
    L.ok('a downstream video with a result goes "Out of date" (card state: stale)', await waitStatus(v1, '^Out of date$', 4000), JSON.stringify(await status(v1)))
    await node('n_sb_s1').locator('.cv-gen-foot button').click()
    L.ok('storyboard v2 done', await waitStatus('n_sb_s1', '^v2 / 2$'), '')
    await select('n_sb_s1')
    const thumbs = page.locator('.cv-panel .cv-version')
    L.ok('panel shows two version thumbnails', (await thumbs.count()) === 2, String(await thumbs.count()))
    const src2 = await node('n_sb_s1').locator('.cv-card-media img').getAttribute('src')
    await thumbs.nth(0).click()
    await page.waitForTimeout(300)
    const src1 = await node('n_sb_s1').locator('.cv-card-media img').getAttribute('src')
    L.ok('clicking the v1 thumbnail shows v1 on the card', (await status('n_sb_s1'))[0] === 'v1 / 2' && src1 !== src2, `${src2} -> ${src1}`)
    await shot('05-versions')
    await thumbs.nth(1).click()
    await page.waitForTimeout(200)

    // ---- 6. the larger view (carry-in 3): focus on Close, clicks stay in it, Esc closes ----
    await deselect()
    await select(v1)
    await page.keyboard.down('Meta')
    await node('n_sb_s1').locator('.cv-card-enlarge').click()
    await page.keyboard.up('Meta')
    await page.waitForSelector('.cv-lightbox')
    const both = await page.locator('.react-flow__node.selected').count()
    const focusClose = await page.evaluate(() => document.activeElement?.classList.contains('cv-lightbox-close'))
    L.ok('larger view: the Close button has the focus', focusClose === true, '')
    await page.locator('.cv-lightbox img').click()
    await page.waitForTimeout(200)
    L.ok('larger view: a click on the image keeps it open and leaves the selection alone', (await page.locator('.cv-lightbox').count()) === 1 && (await page.locator('.react-flow__node.selected').count()) === both, `${both} selected`)
    await shot('06-lightbox')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(200)
    L.ok('larger view: Backspace does not delete the node behind it', (await node('n_sb_s1').count()) === 1 && (await node(v1).count()) === 1, '')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)
    L.ok('larger view: Esc closes it', (await page.locator('.cv-lightbox').count()) === 0, '')
    await node('n_sb_s1').locator('.cv-card-enlarge').click()
    await page.waitForSelector('.cv-lightbox')
    const sel0 = await page.locator('.react-flow__node.selected').count()
    await page.locator('.cv-lightbox').click({ position: { x: 20, y: 20 } })
    await page.waitForTimeout(200)
    L.ok('larger view: a click on the backdrop closes it and leaves the selection alone', (await page.locator('.cv-lightbox').count()) === 0 && (await page.locator('.react-flow__node.selected').count()) === sel0, `${sel0} selected`)
    await deselect()

    // ---- 7. failed: one status, the panel says why (§10.5, carry-ins 7, 8) ----
    await select('n_sb_s2')
    await page.locator('.cv-panel textarea').fill('a kitchen #fail')
    await page.locator('.cv-panel .cv-panel-head').click()
    await page.locator('.cv-panel .cv-panel-foot .btn-primary').click()
    L.ok('a #fail prompt: the card shows only "Failed"', await waitStatus('n_sb_s2', '^Failed$'), '')
    const failCard = await node('n_sb_s2').evaluate((el) => ({ statuses: el.querySelectorAll('.cv-card-status').length, extra: el.querySelectorAll('.cv-gen-error, .cv-gen-notice, .cv-gen-need, [role=alert]').length, button: el.querySelector('.cv-gen-foot button')?.textContent }))
    L.ok('failed card: one status and no other message on the card', failCard.statuses === 1 && failCard.extra === 0, JSON.stringify(failCard))
    L.ok('failed card: the button reads "Try again"', failCard.button === 'Try again', String(failCard.button))
    const notice = await page.locator('.cv-panel .cv-gen-error[role=alert]').innerText().catch(() => '')
    L.ok('panel: the failure notice says what went wrong', /^Failed: /.test(notice), notice)
    await shot('07-failed')

    // ---- 8. waiting for a storyboard (card state waitFor): run the whole shot 2 ----
    await page.locator('.cv-panel textarea').fill('a kitchen')
    await page.locator('.cv-panel .cv-panel-head').click()
    await deselect()
    const v2 = await addInFrame('n_shot_s2', 'Video')
    await select('n_sb_s2')
    await page.locator('.cv-panel .cv-chain-btn').click()
    await page.locator('.cv-run-modal').waitFor({ timeout: 8000 })
    await page.locator('.cv-run-modal .btn-primary').click()
    L.ok('chained video shows "Waiting for Storyboard"', await waitStatus(v2, '^Waiting for Storyboard$', 6000), JSON.stringify(await status(v2)))
    await shot('08-wait-storyboard')
    L.ok('chain ends with both done', (await waitStatus('n_sb_s2', '^v1 / 1$', 20000)) && (await waitStatus(v2, '^v1 / 1$', 20000)), JSON.stringify(await status(v2)))
    await deselect()

    // ---- 9. kit node (§10.11): new card look, wired to every storyboard, faint until selected ----
    await page.locator('.cv-rail-add .cv-add-plus').click()
    await page.getByRole('menuitem', { name: 'Kit', exact: true }).click()
    await page.waitForTimeout(800)
    const kit = page.locator('.react-flow__node-kit')
    L.ok('kit node has the card look', (await kit.locator('.cv-card.cv-kit-node .cv-card-head').count()) === 1, '')
    const kitId = await kit.getAttribute('data-id')
    const sbs = (await ids()).filter((i) => /^n_sb_|^n_storyboard/.test(i) || i.includes('storyboard'))
    const kitLines = (await edges()).filter((e) => e.id.startsWith(`e_${kitId}_`))
    L.ok('kit is wired to every storyboard', sbs.length > 0 && sbs.every((s) => kitLines.some((e) => e.id.includes(`_${s}_`) || e.id.endsWith(`_${s}`) || e.id.includes(`${s}_in:kit`))), JSON.stringify({ sbs, kit: kitLines.map((e) => e.id) }))
    L.ok('kit lines are faint (is-kit, not is-kit-on)', kitLines.length > 0 && kitLines.every((e) => /\bis-kit\b/.test(e.cls) && !/\bis-kit-on\b/.test(e.cls)), '')
    await kit.locator('.cv-card-head').click()
    await page.waitForTimeout(300)
    const kitOn = (await edges()).filter((e) => e.id.startsWith(`e_${kitId}_`))
    L.ok('selecting the kit makes its lines clear (is-kit-on)', kitOn.length > 0 && kitOn.every((e) => /\bis-kit-on\b/.test(e.cls)), '')
    await shot('09-kit')
    L.ok('kit card shows its item count', /1/.test((await kit.locator('.cv-card-status').innerText().catch(() => '')) || ''), '')
    await deselect()
    await select('n_sb_s1')
    L.ok('panel: the kit section lists the item', (await page.locator('.cv-panel .cv-kit-pick label', { hasText: 'Mia' }).count()) === 1, '')
    await shot('09b-panel-kit')
    await deselect()
    await page.waitForTimeout(1500)

    // ---- 10. retired model and "Waiting for Upload" (carry-ins 7, 8): a doc written through the API ----
    const cur = await getCanvas()
    const doc = cur.doc
    doc.nodes.push(
      { id: 'n_video_old', type: 'video', shotId: 's1', position: { x: 2000, y: 0 }, data: { model: 'retired-video-x', prompt: 'old' } },
      { id: 'n_upload_wait', type: 'upload', shotId: 's1', position: { x: 2000, y: 400 }, data: {} },
      { id: 'n_video_wait', type: 'video', shotId: 's1', position: { x: 2300, y: 400 }, data: { model: 'hailuo-2.3-fast', prompt: 'waits' } },
    )
    doc.edges.push({ id: 'e_n_upload_wait_n_video_wait_in:start', source: 'n_upload_wait', sourceHandle: 'out', target: 'n_video_wait', targetHandle: 'in:start' })
    const put = await L.api(page, `/api/ideas/${IDEA}/canvas`, json({ version: cur.version, doc }))
    L.ok('setup: doc with a retired model and an upload start frame saved', put.status === 200, JSON.stringify(put))
    await L.gotoCanvas(page)
    await page.waitForTimeout(1000)
    L.ok('a start frame from an empty upload: "Waiting for Upload"', (await status('n_video_wait'))[0] === 'Waiting for Upload', JSON.stringify(await status('n_video_wait')))
    await select('n_video_old')
    const retired = await page.locator('.cv-panel .cv-gen-retired[role=alert]').innerText().catch(() => '')
    L.ok('panel: a retired model shows the alert', /retired/.test(retired), retired)
    L.ok('panel: Generate is disabled for a retired model', await page.locator('.cv-panel .cv-panel-foot .btn-primary').isDisabled(), '')
    await shot('10-retired')
    await deselect()

    // ---- 11. legacy (P2.5) doc: shot nodes at x=0 with Text lines, the kit wired; reload, first save ----
    const now = await getCanvas()
    const legacy = {
      nodes: [
        ...['s1', 's2', 's3'].flatMap((s, i) => [
          { id: `n_shot_${s}`, type: 'shot', shotId: s, position: { x: 0, y: i * 480 }, data: { removed: false } },
          { id: `n_sb_${s}`, type: 'storyboard', shotId: s, position: { x: 360, y: i * 480 }, data: { primary: true, model: 'mock-image', prompt: '', selected: null, stale: false } },
        ]),
        { id: 'n_ft_s1', type: 'footage', shotId: 's1', position: { x: 720, y: 0 }, data: {} },
        { id: 'n_kit_1', type: 'kit', position: { x: -280, y: 0 }, data: { kitItems: [item.body.id ?? item.body.item?.id].filter(Boolean) } },
      ],
      edges: [
        ...['s1', 's2', 's3'].map((s) => ({ id: `e_n_shot_${s}_n_sb_${s}`, source: `n_shot_${s}`, sourceHandle: 'out', target: `n_sb_${s}`, targetHandle: 'in:text' })),
        { id: 'e_n_shot_s1_n_ft_s1', source: 'n_shot_s1', sourceHandle: 'out', target: 'n_ft_s1', targetHandle: 'in:text' },
        ...['s1', 's2', 's3'].map((s) => ({ id: `e_n_kit_1_n_sb_${s}_in:kit`, source: 'n_kit_1', sourceHandle: 'out', target: `n_sb_${s}`, targetHandle: 'in:kit' })),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    }
    const lp = await L.api(page, `/api/ideas/${IDEA}/canvas`, json({ version: now.version, doc: legacy }))
    L.ok('setup: P2.5-style doc saved through the API', lp.status === 200, JSON.stringify(lp))
    saves.length = 0
    await L.gotoCanvas(page)
    await page.waitForTimeout(2500)
    const loadSaves = saves.slice()
    const legacyMembers = { n_shot_s1: ['n_sb_s1', 'n_ft_s1'], n_shot_s2: ['n_sb_s2'], n_shot_s3: ['n_sb_s3'] }
    L.ok('legacy doc: every member is inside its frame', (await insideFrames(legacyMembers)).length === 0, JSON.stringify(await insideFrames(legacyMembers)))
    const le = await edges()
    L.ok('legacy doc: no Text line from a shot', !le.some((e) => /^e_n_shot_/.test(e.id)), JSON.stringify(le.map((e) => e.id)))
    L.ok('legacy doc: the kit is still wired to every storyboard', ['s1', 's2', 's3'].every((s) => le.some((e) => e.id === `e_n_kit_1_n_sb_${s}_in:kit`)), '')
    await shot('11-legacy')
    // the first save: a pan is a change the autosave picks up
    if (!loadSaves.length) {
      await page.mouse.move(flow.x + flow.width - 120, flow.y + 60)
      await page.mouse.down({ button: 'middle' })
      await page.mouse.move(flow.x + flow.width - 160, flow.y + 90, { steps: 5 })
      await page.mouse.up({ button: 'middle' })
      await page.waitForTimeout(2000)
    }
    L.ok('legacy doc: the first save returns 200', saves.length > 0 && saves[0] === 200, JSON.stringify({ loadSaves, saves }))
    const saved = await getCanvas()
    const savedShots = saved.doc.nodes.filter((n) => n.type === 'shot').map((n) => n.shotId).sort()
    L.ok('legacy doc: the saved copy keeps the shot nodes and drops the Text lines', JSON.stringify(savedShots) === '["s1","s2","s3"]' && !saved.doc.edges.some((e) => /^n_shot_/.test(e.source)), JSON.stringify(saved.doc.edges.map((e) => e.id)))

    // ---- 12. a new shot after the migration: the backend writes its shot node, storyboard and Text line ----
    const ideas = (await L.api(page, '/api/ideas')).body
    const idea = ideas.find((i) => i.id === IDEA)
    idea.shots = [...idea.shots, { id: 's4', time: '4s', shot: 'Shot 4', text: 'text 4', line: 'a fourth line' }]
    const ip = await L.api(page, '/api/ideas', json(ideas))
    L.ok('setup: shot 4 added to the plan', ip.status === 200, String(ip.status))
    const raw = await getCanvas()
    L.ok('setup: the backend wrote a Text line for shot 4', raw.doc.edges.some((e) => e.source === 'n_shot_s4' && e.targetHandle === 'in:text'), '')
    saves.length = 0
    saveBodies.length = 0
    await L.gotoCanvas(page)
    await page.waitForTimeout(2000)
    L.ok('new shot: 4 frames', (await page.locator('.react-flow__node-shot .cv-frame').count()) === 4, '')
    L.ok('new shot: its frame holds its storyboard', (await insideFrames({ n_shot_s4: ['n_sb_s4'] })).length === 0, '')
    L.ok('new shot: no Text line from a shot node', !(await edges()).some((e) => /^e_n_shot_/.test(e.id)), '')
    // The kit sync wires the new storyboard on load (kit spec §5), which is a real change and saves once. Beyond that
    // line nothing may differ: no member node shifted by the frame layout (a shot node is saved at its frame's corner).
    const loadSent = saveBodies[0]?.doc
    const posOf = (d, id) => JSON.stringify(d.nodes.find((n) => n.id === id)?.position)
    const shifted = loadSent ? raw.doc.nodes.filter((n) => n.type !== 'shot' && posOf(raw.doc, n.id) !== posOf(loadSent, n.id)).map((n) => n.id) : []
    const extraLines = loadSent ? loadSent.edges.map((e) => e.id).filter((id) => !raw.doc.edges.some((e) => e.id === id)) : []
    L.ok('new shot: loading it saves at most the kit line of the new storyboard, no node shifted (carry-in 5)', saves.length <= 1 && shifted.length === 0 && extraLines.every((id) => id === 'e_n_kit_1_n_sb_s4_in:kit'), JSON.stringify({ saves, shifted, extraLines }))
    await shot('12-new-shot')
    await select('n_sb_s4')
    await page.locator('.cv-panel textarea').fill('shot four')
    await page.locator('.cv-panel .cv-panel-head').click()
    await page.waitForTimeout(2000)
    L.ok('new shot: the next save returns 200', saves.length > 0 && saves.every((s) => s === 200), JSON.stringify(saves))
    await deselect()

    // ---- 13. a shot removed from the plan: grey frame, no "+", no drop menu into it (carry-in 1) ----
    const ideas2 = (await L.api(page, '/api/ideas')).body
    const idea2 = ideas2.find((i) => i.id === IDEA)
    idea2.shots = idea2.shots.filter((s) => s.id !== 's2')
    L.ok('setup: shot 2 removed from the plan', (await L.api(page, '/api/ideas', json(ideas2))).status === 200, '')
    await L.gotoCanvas(page)
    await page.waitForTimeout(1200)
    const removedFrame = node('n_shot_s2')
    L.ok('removed shot: the frame is grey and says "Removed from the plan"', (await removedFrame.locator('.cv-frame.is-removed').count()) === 1 && /Removed from the plan/.test(await removedFrame.innerText()), '')
    L.ok('removed shot: no "+" in its frame', (await removedFrame.locator('.cv-frame-add').count()) === 0, '')
    const nodesBefore = (await ids()).length
    const rf = await removedFrame.boundingBox()
    await dragOut('n_sb_s2', rf.x + rf.width - 20, rf.y + rf.height - 20)
    L.ok('removed shot: a line let go from its storyboard opens no menu', (await page.locator('.cv-drop').count()) === 0, '')
    L.ok('removed shot: a note says why, nothing is added', /removed from the plan/.test(await page.locator('.cv-conn-note').innerText()) && (await ids()).length === nodesBefore, '')
    await shot('13-removed')

    // ---- 14. paid paths with stubs (carry-in 9): first paid Generate asks once, Run all lists priced items ----
    // shot 1 gets a video whose model needs a key; shot 3's fresh storyboard (no versions yet) is the paid one
    const pc = await getCanvas()
    pc.doc.nodes.push({ id: 'n_video_key', type: 'video', shotId: 's1', position: { x: 1200, y: 0 }, data: { model: 'hailuo-2.3-fast', prompt: 'needs a key' } })
    L.ok('setup: a needs-key video saved', (await L.api(page, `/api/ideas/${IDEA}/canvas`, json({ version: pc.version, doc: pc.doc }))).status === 200, '')
    const stubbed = { gen: 0, chain: 0, leaked: [] }
    await page.route('**/api/gen/models', async (route) => {
      const res = await route.fetch()
      const body = await res.json()
      for (const m of body.models) if (m.id === 'nano-banana-2') m.available = true
      await route.fulfill({ response: res, json: body })
    })
    const fakeGen = (nodeId, id, status) => ({ id, ideaId: IDEA, nodeId, kind: 'image', model: 'nano-banana-2', inputs: { prompt: 'x' }, status, estUsd: 0.067, actualUsd: null, url: null, error: status === 'failed' ? 'stubbed' : null, createdAt: Date.now(), finishedAt: status === 'failed' ? Date.now() : null })
    // Every start, chain and generation request is answered here; nothing of the kind reaches the server.
    await page.route(/\/api\/ideas\/[^/]+\/gen(\/.*)?(\?.*)?$/, async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      if (req.method() === 'GET' && /\/gen\/stub-/.test(url.pathname)) {
        const id = url.pathname.split('/').pop()
        return route.fulfill({ json: fakeGen(id.split('--')[1], id, 'failed') })
      }
      if (req.method() === 'GET') return route.fallback() // reading versions and their files costs nothing
      if (req.method() === 'POST' && /\/gen$/.test(url.pathname)) {
        stubbed.gen++
        const body = JSON.parse(req.postData() || '{}')
        return route.fulfill({ json: fakeGen(body.nodeId, `stub-${stubbed.gen}--${body.nodeId}`, 'queued') })
      }
      if (req.method() === 'POST' && /\/gen\/chain$/.test(url.pathname)) {
        stubbed.chain++
        const body = JSON.parse(req.postData() || '{}')
        if (body.confirm) return route.fulfill({ status: 500, json: { error: 'stubbed: no chain start in this test' } })
        return route.fulfill({ json: { total: 0.067, remaining: { image: 5, video: 5 }, items: [{ nodeId: body.imageNodeId, model: body.imageModel, usd: 0.067 }] } })
      }
      stubbed.leaked.push(`${req.method()} ${url.pathname}`)
      return route.abort()
    })
    await L.gotoCanvas(page)
    await page.waitForTimeout(1000)
    await select('n_sb_s3')
    await page.locator('.cv-panel .cv-picker-btn').click()
    await page.locator('[role=listbox] [role=option]', { hasText: 'Nano Banana 2' }).first().click()
    await page.waitForTimeout(300)
    L.ok('paid: the card shows the price', /0\.07/.test(await node('n_sb_s3').locator('.cv-card-price').innerText()), await node('n_sb_s3').locator('.cv-card-price').innerText())
    await node('n_sb_s3').locator('.cv-gen-foot button').click()
    await page.locator('.cv-paid-modal').waitFor({ timeout: 4000 }).catch(() => {})
    const ask = await page.locator('.cv-paid-modal').innerText().catch(() => '')
    L.ok('paid: the first Generate asks with its price', /US\$0\.07/.test(ask) && stubbed.gen === 0, ask.replace(/\n/g, ' '))
    await shot('14-paid-confirm')
    await page.locator('.cv-paid-modal .btn-ghost').click()
    L.ok('paid: Cancel starts nothing', stubbed.gen === 0 && (await page.locator('.cv-paid-modal').count()) === 0, '')
    await node('n_sb_s3').locator('.cv-gen-foot button').click()
    await page.locator('.cv-paid-modal').waitFor({ timeout: 4000 })
    await page.locator('.cv-paid-modal .btn-primary').click()
    await page.waitForTimeout(800)
    L.ok('paid: Generate after the yes reaches the stub once', stubbed.gen === 1, String(stubbed.gen))
    await waitStatus('n_sb_s3', '^Failed$', 8000) // the stub answers "failed" on the first poll
    await node('n_sb_s3').locator('.cv-gen-foot button').click()
    await page.waitForTimeout(800)
    L.ok('paid: the next paid Generate in this session does not ask again', (await page.locator('.cv-paid-modal').count()) === 0 && stubbed.gen === 2, String(stubbed.gen))
    await waitStatus('n_sb_s3', '^Failed$', 8000)
    await deselect()
    await page.locator('.cv-runall-btn').click()
    await page.locator('.cv-run-modal').waitFor({ timeout: 8000 })
    const dlg = await page.locator('.cv-run-modal').innerText()
    const rows = await page.locator('.cv-run-modal li').allInnerTexts()
    L.ok('Run all: lists only the priced items, with the total', rows.length === 2 && /Shot 2/.test(rows[0]) && /Nano Banana 2/.test(rows[1]) && /Total ≈ US\$0\.07/.test(dlg), JSON.stringify(rows))
    L.ok('Run all: a needs-key node shows the left-out line', /1 node\(s\) left out: their model needs a key\./.test(dlg), dlg.replace(/\n/g, ' | '))
    await shot('14b-run-all')
    await page.locator('.cv-run-modal .btn-ghost').click()
    L.ok('paid: no start or chain request got past the stub', stubbed.leaked.length === 0, JSON.stringify(stubbed))
    await page.unrouteAll({ behavior: 'ignoreErrors' })

    const real = errs.filter((e) => !/401/.test(e) && !/stubbed/.test(e) && !/500 \(Internal Server Error\)/.test(e))
    L.ok('no console errors', real.length === 0, real.slice(0, 3).join(' | '))
  } catch (e) {
    L.ok('script ran to the end', false, String((e && e.stack) || e))
    await page.screenshot({ path: out + '/zz-error.png' }).catch(() => {})
  } finally {
    await browser.close()
    const bad = L.results.filter((r) => !r.pass).length
    console.log(bad ? `${bad} FAILED` : `ALL ${L.results.length} PASS`)
    process.exit(bad ? 1 : 0)
  }
})()
