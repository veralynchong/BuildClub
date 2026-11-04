// Shared helpers for the e2e/*.cjs checks. Not run on its own.
// Needs: an isolated backend (bash bin/isolated-backend.sh 8871 --user test@example.com:pw-for-e2e) and
// a playwright-core install (PW_CORE, default: the one under ~/.hermes/hermes-agent) with Google Chrome.
const fs = require('fs')
const path = require('path')
const { chromium } = require(process.env.PW_CORE || '/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core')

const BASE = process.env.BASE || 'http://127.0.0.1:8871'
if (/:(8811|8805|8850|8787|5195)(\/|$)/.test(BASE)) throw new Error('refusing to talk to a demo/client port')
const EMAIL = 'test@example.com'
const PASSWORD = 'pw-for-e2e'
const SEED_LIB = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-library.json'), 'utf8'))
const LINES = ['今天教你三天學會剪輯，真的很簡單', '只要三個步驟就能完成一支短影片，從選片到出片', '最後加上字幕和音樂，發布給客戶審閱']

const results = []
const ok = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(pass ? 'PASS' : 'FAIL', name, '|', detail) }

async function open({ headless = true, args = [] } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless, args })
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await ctx.newPage()
  const errs = []
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
  return { browser, ctx, page, errs }
}

async function login(page) {
  await page.goto(BASE + '/')
  await page.getByText('Log in', { exact: true }).first().click()
  await page.locator('#login-email').fill(EMAIL)
  await page.locator('#login-password').fill(PASSWORD)
  await page.keyboard.press('Enter')
  await page.waitForSelector('text=Client dashboard')
  // let the app finish its first saves, or one can land after seed() and wipe the seeded library
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
}

// fetch from inside the page (cookies included): { status, body }
const api = (page, p, init) => page.evaluate(async ({ p, init }) => {
  const r = await fetch(p, init)
  return { status: r.status, body: await r.json().catch(() => null) }
}, { p, init })

// Same from node with the page's cookies, for binary uploads. body is a Buffer.
async function apiNode(ctx, p, init = {}) {
  const cookie = (await ctx.cookies(BASE)).map((c) => `${c.name}=${c.value}`).join('; ')
  const r = await fetch(BASE + p, { ...init, headers: { cookie, ...(init.headers || {}) } })
  const text = await r.text()
  let body = null; try { body = JSON.parse(text) } catch { body = text }
  return { status: r.status, body }
}

const MIME = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.wav': 'audio/wav', '.mp3': 'audio/mpeg' }
const uploadTake = (ctx, ideaId, shot, file) => apiNode(ctx, `/api/ideas/${ideaId}/shots/${shot}/takes`, {
  method: 'POST', headers: { 'content-type': MIME[path.extname(file)], 'x-filename': encodeURIComponent(path.basename(file)) }, body: fs.readFileSync(file),
})
const uploadVoice = (ctx, ideaId, file, source = 'upload') => apiNode(ctx, `/api/ideas/${ideaId}/edit/voice?source=${source}`, {
  method: 'PUT', headers: { 'content-type': MIME[path.extname(file)] }, body: fs.readFileSync(file),
})

// Library, client and one approved plan "idea1" with three shots (lines in Chinese so caption paging is visible).
async function seed(page, { ideaId = 'idea1' } = {}) {
  return page.evaluate(async ({ lib, lines, ideaId }) => {
    const put = (u, b) => fetch(u, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) })
    await put('/api/library', lib)
    await put('/api/clients', [{ id: 'evergreen', name: 'Evergreen Foods', niche: 'Food', audience: 'students', monthlyTarget: 8, examples: [], cannot: [] }])
    const r = await put('/api/ideas', [{ id: ideaId, videoId: 'link-t4', clientId: 'evergreen', status: 'approved', dueDate: '2026-12-01', notes: '',
      shots: [1, 2, 3].map((i) => ({ time: i + 's', shot: 'Shot ' + i, text: 'text ' + i, line: lines[i - 1] })) }])
    return r.status
  }, { lib: SEED_LIB, lines: LINES, ideaId })
}

// Open the canvas of the seeded plan from the dashboard.
async function gotoCanvas(p) {
  await p.goto(BASE + '/')
  await p.waitForTimeout(1500)
  if (!(await p.getByText('Plans', { exact: true }).first().isVisible().catch(() => false))) await p.getByText('Evergreen Foods').first().click()
  await p.getByText('Plans', { exact: true }).first().click()
  await p.getByText('Open plan').first().click()
  await p.getByText('Open the canvas').first().click()
  await p.waitForSelector('.react-flow__node', { timeout: 20000 })
  await p.waitForTimeout(800)
}

async function openEditor(p) {
  if (!(await p.locator('.cv-ed').count())) await p.getByRole('button', { name: 'Timeline', exact: true }).click()
  await p.waitForSelector('.cv-ed-timeline', { timeout: 10000 })
  await p.waitForTimeout(800)
}

const sh = (cmd) => require('child_process').execSync(cmd, { encoding: 'utf8' }).trim()
const probe = (file) => JSON.parse(sh(`ffprobe -v error -show_streams -show_format -of json '${file}'`))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

module.exports = { BASE, LINES, results, ok, open, login, api, apiNode, uploadTake, uploadVoice, seed, gotoCanvas, openEditor, sh, probe, sleep }

// ---- editor/export helpers (API level) ----
const clip = (id, src, i, o, extra = {}) => ({ id, source: { kind: 'take', id: src }, in: i, out: o, volume: 1, muted: false, ...extra })
async function putProject(page, ideaId, mutate) {
  const cur = (await api(page, `/api/ideas/${ideaId}/edit`)).body
  const project = mutate(cur.project)
  const r = await api(page, `/api/ideas/${ideaId}/edit`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ version: cur.version, project }) })
  return r
}
// Start an export and wait for it to finish; returns { sec, state }.
async function exportAndWait(page, ideaId, timeoutMs = 240000) {
  const t0 = Date.now()
  const start = await api(page, `/api/ideas/${ideaId}/edit/export`, { method: 'POST' })
  if (start.status !== 202) return { sec: 0, state: start }
  for (;;) {
    const s = (await api(page, `/api/ideas/${ideaId}/cut`)).body
    const st = s.status || (s.render && s.render.status)
    if (st === 'done' || st === 'failed' || st === 'error') return { sec: (Date.now() - t0) / 1000, state: s }
    if (Date.now() - t0 > timeoutMs) return { sec: (Date.now() - t0) / 1000, state: { timeout: true, s } }
    await sleep(500)
  }
}
async function download(ctx, p, file) {
  const cookie = (await ctx.cookies(BASE)).map((c) => `${c.name}=${c.value}`).join('; ')
  const r = await fetch(BASE + p, { headers: { cookie } })
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()))
  return r.status
}
Object.assign(module.exports, { clip, putProject, exportAndWait, download })
