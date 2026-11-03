// Polish C acceptance (spec §10.7–§10.9): Put in timeline (one clip per shot), the Timeline node, the full-screen editor
// (clip names, the left column, split, Show on canvas), export with the local render and Send for approval with the
// review link turned off. Mock models only; the one stubbed request (a refused POST /api/share) never reaches a paid path.
// Run: (repo root) MOCK_GEN_DELAY_S=2 REMOTION_PORT=8872 bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e
//      then (app dir, after npm run build) node e2e/polish-c-timeline.cjs <out_dir>
// Exits 1 when a check fails.
const L = require('./lib.cjs')
const fs = require('fs')
const out = process.argv[2] || '.'
fs.mkdirSync(out, { recursive: true })
const IDEA = 'idea1'
const json = (b, method = 'PUT') => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
const EXPORT_MS = 240000

;(async () => {
  const { browser, page, errs } = await L.open()
  const node = (id) => page.locator(`.react-flow__node[data-id="${id}"]`)
  const shot = (p) => page.screenshot({ path: `${out}/${p}.png` })
  const ids = () => page.evaluate(() => [...document.querySelectorAll('.react-flow__node')].map((e) => e.getAttribute('data-id')))
  const tlNode = page.locator('.react-flow__node[data-id="n_timeline"]')
  const tlBlocks = () => tlNode.locator('.cv-tl-strip .cv-tl-clip:not(.is-empty)').allInnerTexts()
  const tlStatus = () => tlNode.locator('.cv-card-head .cv-card-status').innerText()
  const editorOpen = async () => (await page.locator('.cv-editor-full').count()) === 1
  const project = async () => (await L.api(page, `/api/ideas/${IDEA}/edit`)).body.project
  const cut = async () => (await L.api(page, `/api/ideas/${IDEA}/cut`)).body
  const gensOf = async (nodeId) => (await L.api(page, `/api/ideas/${IDEA}/gen`)).body.filter((g) => g.nodeId === nodeId && g.status === 'done')
  const note = () => page.locator('.cv-conn-note').first().innerText().catch(() => '')
  // every text a canvas note showed since this page load (a note may come and go between two looks)
  await page.addInitScript(() => {
    window.__notes = []
    new MutationObserver(() => {
      for (const n of document.querySelectorAll('.cv-conn-note')) {
        const t = n.textContent || ''
        if (t && window.__notes[window.__notes.length - 1] !== t) window.__notes.push(t)
      }
    }).observe(document, { subtree: true, childList: true, characterData: true })
  })
  // true when a canvas note has said `re` since the page loaded, waiting up to `ms`
  const noteSays = (re, ms) =>
    page.waitForFunction((re) => (window.__notes || []).some((t) => new RegExp(re).test(t)), re, { timeout: ms }).then(() => true, () => false)
  const noteCount = (re) => page.evaluate((re) => (window.__notes || []).filter((t) => new RegExp(re).test(t)).length, re)
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
  const waitStatus = (id, re, timeout = 20000) =>
    page.waitForFunction(({ id, re }) => new RegExp(re).test(document.querySelector(`.react-flow__node[data-id="${id}"] .cv-card-status`)?.textContent || ''), { id, re }, { timeout }).then(() => true, () => false)
  const backToCanvas = async () => {
    await page.locator('.cv-ed-top .link-btn').click()
    await page.waitForTimeout(600)
  }
  const openEditing = async () => {
    await fit()
    await tlNode.getByRole('button', { name: '⤢ Open editing' }).click()
    await page.waitForSelector('.cv-ed-timeline', { timeout: 10000 })
    await page.waitForTimeout(800)
  }
  // the edit is saved (the editor's status says so, or the server has the same clips as the screen)
  const waitSaved = () => page.waitForFunction(() => /Saved/.test(document.querySelector('.cv-ed-status')?.textContent || ''), null, { timeout: 8000 }).then(() => true, () => false)
  const sourceRow = (shotIdx, label) => page.locator('.cv-ed-shots .cv-ed-shot').nth(shotIdx).locator('.cv-ed-source-list li', { hasText: `${label} ·` })
  const reviewPosts = []
  page.on('request', (r) => {
    if (r.method() === 'POST' && /\/api\/ideas\/[^/]+\/cut\/review$/.test(r.url())) reviewPosts.push(Date.now())
  })

  try {
    await L.login(page)
    await L.seed(page)

    // ---- setup: a mock video in shot 1 and shot 2, one version each ----
    await L.gotoCanvas(page)
    const v1 = await addInFrame('n_shot_s1', 'Video')
    const v2 = await addInFrame('n_shot_s2', 'Video')
    L.ok('setup: a video node in shots 1 and 2', !!v1 && !!v2, `${v1} ${v2}`)
    await node(v1).locator('.cv-gen-foot button').click()
    const done1 = await waitStatus(v1, '^v1 / 1$', 30000)
    await fit()
    await node(v2).locator('.cv-gen-foot button').click()
    L.ok('setup: both mock videos finish (v1 / 1)', done1 && (await waitStatus(v2, '^v1 / 1$', 30000)), JSON.stringify([await node(v1).locator('.cv-card-status').allInnerTexts(), await node(v2).locator('.cv-card-status').allInnerTexts()]))
    await page.waitForTimeout(800)

    // ---- 1. the toolbar's Send for approval before any export: the editor opens and says to export first ----
    await page.locator('.cv-send-btn').click()
    await page.waitForSelector('.cv-ed-timeline', { timeout: 10000 })
    await page.waitForTimeout(600)
    const need = await page.locator('#cv-ed-export [role=status]', { hasText: 'Export the video first to send it.' }).count()
    L.ok('toolbar Send before an export: the editor opens with "Export the video first to send it."', (await editorOpen()) && need === 1, '')
    await shot('01-send-before-export')
    await backToCanvas()

    // ---- 2. Put in timeline (§10.7): toast, no page change, badge, one more block, "1 / 3 ready", main clip ----
    await fit()
    L.ok('before: the Timeline node shows no clip and "0 / 3 ready"', (await tlBlocks()).length === 0 && (await tlStatus()) === '0 / 3 ready', await tlStatus())
    const url0 = page.url()
    await node(v1).getByRole('button', { name: 'Put in timeline' }).click()
    await page.waitForTimeout(500)
    const toast = await note()
    L.ok('Put in timeline: the toast says "Put in the timeline" with "Open editing"', /Put in the timeline/.test(toast) && (await page.locator('.cv-conn-note-action', { hasText: 'Open editing' }).count()) === 1, toast)
    L.ok('Put in timeline: the URL and the screen stay (no editor)', page.url() === url0 && !(await editorOpen()), page.url())
    L.ok('Put in timeline: the node shows "✓ On timeline"', (await node(v1).locator('.cv-clip-actions').innerText()).trim() === '✓ On timeline', '')
    const b1 = await tlBlocks()
    L.ok('Put in timeline: the Timeline node shows one more block and "1 / 3 ready"', b1.length === 1 && (await tlStatus()) === '1 / 3 ready', JSON.stringify(b1))
    L.ok('Put in timeline: the frame shows "✓ main clip"', (await node('n_shot_s1').locator('.cv-frame-status').innerText()).trim() === '✓ main clip', '')
    await shot('02-put-in-timeline')

    // ---- 3. another version of the same shot: still one block for that shot ----
    await node(v1).locator('.cv-gen-foot button').click()
    L.ok('setup: shot 1 video v2 done', await waitStatus(v1, '^v2 / 2$', 30000), '')
    await page.waitForTimeout(600)
    await node(v1).getByRole('button', { name: 'Put in timeline' }).click()
    await page.waitForTimeout(600)
    const b2 = await tlBlocks()
    L.ok('another version: still one block for shot 1, now v2', b2.length === 1 && b2[0] === 'Shot 1 · v2', JSON.stringify(b2))
    await node(v2).getByRole('button', { name: 'Put in timeline' }).click()
    await page.waitForTimeout(600)
    L.ok('shot 2 placed: "2 / 3 ready"', (await tlStatus()) === '2 / 3 ready' && (await tlBlocks()).length === 2, await tlStatus())
    await page.waitForTimeout(1500)
    const p3 = await project()
    L.ok('saved edit: one clip per shot', p3.clips.length === 2 && p3.clips.filter((c) => c.source.shotId === 's1').length === 1, JSON.stringify(p3.clips.map((c) => [c.source.shotId, c.source.id])))
    await shot('03-another-version')

    // ---- 4. Open editing (§10.8): clip names; the left column swaps the shot's clip (carry-in 1) ----
    await openEditing()
    const names = await page.locator('.cv-ed-clip .cv-ed-clip-name').allInnerTexts()
    L.ok('editor: clip names read "Shot n · v…"', names.length === 2 && names[0] === 'Shot 1 · v2' && /^Shot 2 · v\d+$/.test(names[1]), JSON.stringify(names))
    L.ok('left column: the placed source shows "✓ On timeline"', (await sourceRow(0, 'Shot 1 · v2').locator('.cv-ed-on').innerText()).trim() === '✓ On timeline', '')
    // the canvas toast from the placements above runs out first, so a new one would show
    await page.waitForFunction(() => !(document.querySelector('.cv-editor-full .cv-conn-note')?.textContent || ''), null, { timeout: 10000 }).catch(() => {})
    await sourceRow(0, 'Shot 1 · v1').getByRole('button', { name: 'Put in timeline' }).click()
    await page.waitForTimeout(600)
    const swapped = await page.locator('.cv-ed-clip .cv-ed-clip-name').allInnerTexts()
    const v1Gens = await gensOf(v1)
    L.ok('left column: Put in timeline on the other take swaps the shot\'s clip', JSON.stringify(swapped) === JSON.stringify(['Shot 1 · v1', names[1]]), JSON.stringify(swapped))
    L.ok('left column: v1 now shows "✓ On timeline", v2 the button', (await sourceRow(0, 'Shot 1 · v1').locator('.cv-ed-on').count()) === 1 && (await sourceRow(0, 'Shot 1 · v2').getByRole('button', { name: 'Put in timeline' }).count()) === 1, '')
    L.ok('left column: no canvas toast inside the editor for a placement', !/Put in the timeline/.test(await page.locator('.cv-editor-full .cv-conn-note').innerText().catch(() => '')), '')
    await shot('04-editor-swap')

    // ---- 5. split with S (carry-in 3) ----
    const c1 = page.locator('.cv-ed-clip').first()
    const cb = await c1.boundingBox()
    await page.locator('.cv-ed-ruler').click({ position: { x: cb.x + cb.width / 2 - (await page.locator('.cv-ed-ruler').boundingBox()).x, y: 6 } })
    await page.waitForTimeout(300)
    await c1.click()
    await page.keyboard.press('s')
    await page.waitForTimeout(400)
    const afterSplit = await page.locator('.cv-ed-clip .cv-ed-clip-name').allInnerTexts()
    L.ok('S splits the shot 1 clip into two pieces', afterSplit.length === 3 && afterSplit[0] === 'Shot 1 · v1' && afterSplit[1] === 'Shot 1 · v1', JSON.stringify(afterSplit))
    L.ok('split: the edit is saved', await waitSaved(), '')
    await shot('05-split')

    // ---- 6. right-click "Show on canvas" (§10.8): back on the board, that node selected and in view ----
    await page.locator('.cv-ed-clip').nth(2).click({ button: 'right' })
    await page.getByRole('menuitem', { name: '↗ Show on canvas' }).click()
    await page.waitForTimeout(1200)
    const sel = await page.evaluate(() => [...document.querySelectorAll('.react-flow__node.selected')].map((e) => e.getAttribute('data-id')))
    const inView = await page.evaluate((id) => {
      const f = document.querySelector('.cv-flow')?.getBoundingClientRect()
      const r = document.querySelector(`.react-flow__node[data-id="${id}"]`)?.getBoundingClientRect()
      return !!f && !!r && r.left >= f.left && r.top >= f.top && r.right <= f.right && r.bottom <= f.bottom
    }, v2)
    L.ok('Show on canvas: the editor closes', !(await editorOpen()), '')
    L.ok('Show on canvas: that node is the selected one', sel.length === 1 && sel[0] === v2, JSON.stringify(sel))
    L.ok('Show on canvas: that node is inside the viewport', inView, '')
    await shot('06-show-on-canvas')

    // ---- 7. split pieces survive a reload, with no trim toast (carry-in 3) ----
    await L.gotoCanvas(page)
    const trimOnSplit = await noteSays('more than one clip per shot', 3000)
    const p7 = await project()
    L.ok('reload: still two pieces of shot 1', p7.clips.filter((c) => c.source.shotId === 's1').length === 2 && p7.clips.length === 3, JSON.stringify(p7.clips.map((c) => [c.source.shotId, c.in, c.out])))
    L.ok('reload: no trim toast for split pieces', !trimOnSplit, '')
    await fit()
    L.ok('reload: the Timeline node shows both pieces', (await tlBlocks()).length === 3, JSON.stringify(await tlBlocks()))
    await shot('07-split-reload')

    // ---- 8. export with the local render (§10.9) ----
    await fit()
    await tlNode.getByRole('button', { name: 'Export ▾' }).click()
    await page.waitForSelector('#cv-ed-export [data-step=export]', { timeout: 10000 })
    await page.waitForTimeout(800)
    await page.locator('#cv-ed-export [data-step=export]').click()
    await page.waitForSelector('.cv-ed-export-video', { timeout: EXPORT_MS })
    const c8 = await cut()
    L.ok('export: done from the editor', c8.status === 'done' && c8.source === 'editor' && !!c8.output, JSON.stringify({ status: c8.status, source: c8.source }))
    await shot('08-exported')
    await backToCanvas()

    // ---- 9. the Send focus (fix 7): no focus steal while the user is elsewhere; Send focused otherwise ----
    let release
    const held = new Promise((r) => { release = r })
    await page.route(new RegExp(`/api/ideas/${IDEA}/cut$`), async (route) => {
      if (route.request().method() !== 'GET') return route.fallback()
      await held
      return route.fallback()
    })
    await page.locator('.cv-send-btn').click()
    await page.waitForSelector('.cv-ed-timeline', { timeout: 10000 })
    const exportFocused = await page.waitForFunction(() => document.activeElement?.getAttribute('data-step') === 'export', null, { timeout: 6000 }).then(() => true, () => false)
    await page.locator('.cv-ed-zoom input').focus()
    release()
    await page.waitForSelector('#cv-ed-export [data-step=send]', { timeout: 10000 })
    await page.waitForTimeout(500)
    const focused9 = await page.evaluate(() => (document.activeElement?.closest('.cv-ed-zoom') ? 'zoom' : document.activeElement?.getAttribute('data-step') || document.activeElement?.tagName))
    L.ok('Send focus: the editor focuses Export while the export state loads', exportFocused, '')
    L.ok('Send focus: Send does not take the focus from another control (fix 7)', focused9 === 'zoom', String(focused9))
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await backToCanvas()
    await page.locator('.cv-send-btn').click()
    await page.waitForSelector('#cv-ed-export [data-step=send]', { timeout: 10000 })
    const sendFocused = await page.waitForFunction(() => document.activeElement?.getAttribute('data-step') === 'send', null, { timeout: 4000 }).then(() => true, () => false)
    L.ok('Send focus: opened from the toolbar, Send has the focus', sendFocused, '')
    await shot('09-send-focused')

    // ---- 10. turning the link on fails: "Create link", then Send works; two clicks send once (carry-in 4, fixes 6, 8) ----
    L.ok('setup: the client\'s review link is turned off', (await L.api(page, '/api/share?clientId=evergreen', { method: 'DELETE' })).status === 204, '')
    let refuse = 1
    await page.route('**/api/share', (route) => {
      if (route.request().method() === 'POST' && refuse > 0) {
        refuse--
        return route.fulfill({ status: 403, json: { error: 'stubbed' } })
      }
      return route.fallback()
    })
    await page.locator('#cv-ed-export [data-step=send]').click()
    await page.getByRole('button', { name: 'Create link', exact: true }).waitFor({ timeout: 6000 }).catch(() => {})
    const err10 = await page.locator('#cv-ed-export [role=alert]').allInnerTexts()
    L.ok('link refused: "Create link" shows with the reason, nothing sent', (await page.getByRole('button', { name: 'Create link', exact: true }).count()) === 1 && err10.some((e) => /Couldn't turn on the review link\./.test(e)) && reviewPosts.length === 0 && (await cut()).review === null, JSON.stringify({ err10, posts: reviewPosts.length }))
    await shot('10-create-link')
    await page.getByRole('button', { name: 'Create link', exact: true }).click()
    const made = await page.locator('#cv-ed-export [role=status]', { hasText: 'The review link is on.' }).waitFor({ timeout: 6000 }).then(() => true, () => false)
    L.ok('Create link: a short confirmation shows (fix 8)', made && (await page.getByRole('button', { name: 'Create link', exact: true }).count()) === 0, '')
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.evaluate(() => {
      const b = document.querySelector('#cv-ed-export [data-step=send]')
      b.click()
      b.click()
    })
    const waiting10 = await page.locator('.cut-review-line', { hasText: 'Waiting for' }).waitFor({ timeout: 8000 }).then(() => true, () => false)
    await page.waitForTimeout(500)
    L.ok('Create link then Send: the review is waiting', waiting10 && (await cut()).review?.status === 'waiting', '')
    L.ok('two clicks in one tick send once (fix 6)', reviewPosts.length === 1, String(reviewPosts.length))
    await shot('10b-sent')

    // ---- 11. a new export, the link turned off first: Send for approval works in one click (§10.9) ----
    await page.locator('#cv-ed-export [data-step=export]').click()
    await page.waitForSelector('#cv-ed-export [data-step=send]', { timeout: EXPORT_MS })
    L.ok('re-export: the new video is not sent yet', (await cut()).review === null, '')
    L.ok('setup: the review link is turned off again', (await L.api(page, '/api/share?clientId=evergreen', { method: 'DELETE' })).status === 204, '')
    const posts0 = reviewPosts.length
    await page.locator('#cv-ed-export [data-step=send]').click()
    const waiting11 = await page.locator('.cut-review-line', { hasText: 'Waiting for' }).waitFor({ timeout: 8000 }).then(() => true, () => false)
    const c11 = await cut()
    L.ok('link off: one click on Send makes the review waiting', waiting11 && c11.review?.status === 'waiting' && reviewPosts.length === posts0 + 1, JSON.stringify(c11.review))
    await shot('11-sent-link-off')
    await backToCanvas()

    // ---- 12. a note that can't place shows over the editor (carry-in 2): the reel is full ----
    const g1 = v1Gens.sort((a, b) => a.createdAt - b.createdAt)
    const fill = await L.putProject(page, IDEA, (p) => ({ ...p, primaries: {}, clips: Array.from({ length: 45 }, (_, i) => L.clip(`full${i}`, g1[0].id, 0, 4, { source: { kind: 'generation', id: g1[0].id } })) }))
    L.ok('setup: a 180 s reel of free clips saved', fill.status === 200, JSON.stringify(fill))
    await L.gotoCanvas(page)
    await openEditing()
    await sourceRow(0, 'Shot 1 · v2').getByRole('button', { name: 'Put in timeline' }).click()
    await page.waitForTimeout(500)
    const fullNote = await page.locator('.cv-editor-full .cv-conn-note').innerText().catch(() => '')
    L.ok('full reel: the note "The reel is full" is visible over the editor', /The reel is full/.test(fullNote) && (await page.locator('.cv-editor-full .cv-conn-note').isVisible()), fullNote)
    await shot('12-full-note')
    await backToCanvas()

    // ---- 13. a legacy edit with two clips of shot 1 (§10.7): one clip after load, the trim toast once ----
    const legacy = await L.putProject(page, IDEA, (p) => ({
      ...p,
      primaries: {},
      clips: [
        L.clip('lg1', g1[0].id, 0, 4, { source: { kind: 'generation', id: g1[0].id, nodeId: v1, shotId: 's1' } }),
        L.clip('lg2', g1[1].id, 0, 4, { source: { kind: 'generation', id: g1[1].id, nodeId: v1, shotId: 's1' } }),
      ],
    }))
    L.ok('setup: a legacy edit with two clips of shot 1 saved', legacy.status === 200, JSON.stringify(legacy))
    await L.gotoCanvas(page)
    const trimSeen = await noteSays('more than one clip per shot', 5000)
    await page.waitForTimeout(2500)
    L.ok('legacy edit: the trim toast shows, once in this load', trimSeen && (await noteCount('more than one clip per shot')) === 1, JSON.stringify(await page.evaluate(() => window.__notes)))
    await shot('13-legacy-trim')
    const p13 = await project()
    L.ok('legacy edit: one clip of shot 1 is left and saved', p13.clips.length === 1 && p13.clips[0].source.shotId === 's1', JSON.stringify(p13.clips.map((c) => c.id)))
    await fit()
    L.ok('legacy edit: the Timeline node shows one block', (await tlBlocks()).length === 1, JSON.stringify(await tlBlocks()))
    await L.gotoCanvas(page)
    L.ok('legacy edit: no trim toast on the next load (once)', !(await noteSays('more than one clip per shot', 3000)), '')

    // ---- 14. read-only board: the Timeline node's Open editing still opens the editor (carry-in 5) ----
    const ideas = (await L.api(page, '/api/ideas')).body
    ideas.find((i) => i.id === IDEA).status = 'waiting'
    L.ok('setup: the plan is waiting (read-only)', (await L.api(page, '/api/ideas', json(ideas))).status === 200, '')
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await page.waitForFunction(() => !document.querySelector('.cv-runall-btn'), null, { timeout: 8000 }).catch(() => {})
    L.ok('read-only: Run all and Send are gone', (await page.locator('.cv-runall-btn').count()) === 0 && (await page.locator('.cv-send-btn').count()) === 0, '')
    await openEditing()
    L.ok('read-only: "⤢ Open editing" opens the editor', await editorOpen(), '')
    await shot('14-read-only-editor')

    // pre-login 401s; the stubbed 403; the 409s a read-only plan answers (voice, edit)
    const real = errs.filter((e) => !/401/.test(e) && !/403/.test(e) && !/409/.test(e))
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
