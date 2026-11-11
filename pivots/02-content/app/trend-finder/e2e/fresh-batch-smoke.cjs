/* OFFLINE ENGINEERING TEST ONLY. No provider, fixture response interception, or final approval.
 * CLI: node fresh-batch-smoke.cjs --state NEW_BOOTSTRAP_STATE --out NEW_EVIDENCE_DIR
 * Optional --base http://127.0.0.1:8978. Supervisor owns server/test-slot separately.
 * Selectors come from demo-readiness Full Canvas + native Editor source; not runtime-validated.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const {chromium, request} = require('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core');
const APP = '/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder';
const IDEA = 'evergreen-fresh-ai-21';
const PREFIX = '/api/ideas/' + IDEA;
const disclosure = 'OFFLINE ENGINEERING TEST: local ffmpeg testsrc, $0, not fresh AI advertising; synthetic QA only; final review stays waiting.';
let ctx, anonymous, browser, page, api, out, stage = 'arguments';
const checks = [], errors = [], sourceIDs = {}, versions = {}, recordings = [];
const result = {status: 'FAIL', disclosure, checks, errors, sourceIDs, versions, recordings};
const save = () => { if (out) fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({...result, stage}, null, 2)); };
const pass = name => { checks.push(name); save(); console.log('PASS', name); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function allowed(url) {
  const u = new URL(url);
  return u.protocol === 'http:' && u.hostname === '127.0.0.1' && ['8978', '8979', '8980'].includes(u.port) && !u.username && !u.password;
}
async function call(method, suffix, data) {
  const url = new URL(suffix, result.base).href;
  assert.ok(allowed(url), 'STOP: forbidden API destination');
  const r = await api.fetch(url, {method, data, maxRedirects: 0, timeout: 30000});
  assert.ok(r.ok(), method + ' ' + suffix + ' HTTP ' + r.status() + ': ' + (await r.text()).slice(0, 500));
  return r;
}
const read = async suffix => (await call('GET', suffix)).json();
async function until(readValue, predicate, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = await readValue();
    if (predicate(value)) return value;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error('Timed out at ' + stage);
}
async function plans() {
  await page.getByRole('button', {name: /^Plans(?:\s|$)/}).first().click();
}
async function canvas() {
  await plans();
  await page.getByRole('button', {name: 'Open plan', exact: true}).click();
  await page.getByRole('button', {name: 'Open the canvas', exact: true}).click();
  await page.locator('.react-flow').waitFor();
}
async function safeMedia(url) {
  assert.ok(url && allowed(new URL(url, result.base).href), 'media must be local');
  return (await call('GET', url)).body();
}
async function generate(kind, nodeId, model, expectedSource) {
  stage = 'UI generate ' + kind; save();
  const node = page.locator('.react-flow__node[data-id="' + nodeId + '"]');
  await node.waitFor();
  await node.getByRole('button', {name: 'Run', exact: true}).last().click();
  const dialog = page.getByRole('dialog', {name: 'Confirm generation', exact: true});
  await dialog.waitFor();
  const quote = await dialog.innerText();
  assert.ok(quote.includes('OFFLINE TEST'), 'STOP: catalog must disclose synthetic engine');
  const values = [...quote.matchAll(/US\$([0-9.]+)/g)];
  assert.ok(values.length && Number(values[0][1]) <= (kind === 'image' ? 0.04 : 0.20));
  const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/gen');
  await dialog.getByRole('button', {name: 'Confirm and run', exact: true}).click();
  const response = await responsePromise;
  const submitted = await response.json();
  assert.equal(response.status(), 201);
  assert.equal(submitted.kind, kind);
  assert.equal(submitted.nodeId, nodeId);
  assert.equal(submitted.model, model);
  if (expectedSource) assert.equal(submitted.inputs.startFrame, expectedSource);
  sourceIDs[kind] = submitted.id; save();
  const done = await until(() => read(PREFIX + '/gen/' + submitted.id), g => {
    if (['failed', 'unknown'].includes(g.status)) throw Error(kind + ': ' + g.status + ' ' + g.error);
    return g.status === 'done';
  });
  const bytes = await safeMedia(done.url);
  fs.writeFileSync(path.join(out, kind + (kind === 'image' ? '.png' : '.mp4')), bytes);
  result[kind] = {id: done.id, nodeId, model, shotId: 's1', sha256: hash(bytes), quote, status: done.status};
  stage = 'History Use ' + kind; save();
  await page.getByRole('button', {name: /History/}).click();
  const history = page.locator('.fc-history').filter({hasText: model});
  await history.getByRole('button', {name: 'Use this version', exact: true}).click();
  await until(() => read(PREFIX + '/canvas'), c => c.doc.nodes.find(n => n.id === nodeId)?.data.selected === done.id);
  await page.getByRole('button', {name: /History/}).click();
  pass(kind + ' real UI POST 201 -> done -> History/Use');
  return done;
}
async function playToEnd(target, ownerPage) {
  await target.waitFor();
  // The native HTML player is real; no media, events, or readyState are fabricated.
  await target.evaluate(v => {v.muted = true; v.currentTime = 0; return v.play();});
  await ownerPage.waitForFunction(selector => {
    const v = document.querySelector(selector); return v && v.ended && v.duration > 0 && v.currentTime >= v.duration - 0.1;
  }, await target.getAttribute('class') === 'cv-ed-export-video' ? '.cv-ed-export-video' : 'video', {timeout: 30000});
  return target.evaluate(v => ({ended: v.ended, duration: v.duration, currentTime: v.currentTime, readyState: v.readyState}));
}
async function main() {
  try {
    const argv = process.argv.slice(2), args = {};
    assert.equal(argv.length % 2, 0, 'CLI needs --state PATH --out PATH [--base URL]');
    for (let i = 0; i < argv.length; i += 2) {
      assert.ok(['--state', '--out', '--base'].includes(argv[i]), 'unknown argument');
      assert.ok(!args[argv[i]], 'duplicate argument'); args[argv[i]] = argv[i + 1];
    }
    assert.ok(args['--out'], '--out required');
    out = path.resolve(args['--out']);
    fs.mkdirSync(out, {recursive: false}); save();
    result.base = args['--base'] || 'http://127.0.0.1:8978';
    assert.equal(new URL(result.base).origin, 'http://127.0.0.1:8978');
    api = await request.newContext();
    stage = 'offline safety gate'; save();
    // First HTTP operation, before login, canvas writes, or any browser launch.
    const status = await read('/api/batch/status');
    assert.equal(status.mode, 'offline', 'STOP: live or unknown mode');
    assert.equal(status.generationEnabled, true, 'STOP: generation is locked');
    assert.equal(status.keys?.fal, false); assert.equal(status.keys?.openrouter, false);
    assert.equal(status.requests, 0, 'Use new isolated state; do not reuse partial runs');
    result.preflight = status; pass('offline generation gate; no inherited provider keys');
    assert.ok(args['--state'], '--state required');
    const state = path.resolve(args['--state']);
    const marker = JSON.parse(fs.readFileSync(path.join(state, 'OFFLINE-TEST.json')));
    assert.equal(marker.mode, 'offline'); assert.equal(marker.paidUsd, 0);
    const plan = JSON.parse(fs.readFileSync(path.join(state, 'frozen-plan.json')));
    assert.equal(plan.shots.length, 21);
    const executablePath = marker.browser;
    assert.ok(executablePath.startsWith(APP + '/node_modules/.remotion/chrome-headless-shell/'));
    assert.ok(fs.statSync(executablePath).isFile());
    stage = 'browser login'; save();
    const childEnv = {PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME: state, TMPDIR: path.join(state, 'tmp'), PLAYWRIGHT_BROWSERS_PATH: '/Users/tommy/Library/Caches/ms-playwright'};
    browser = await chromium.launch({executablePath, headless: true, env: childEnv});
    async function context() {
      const c = await browser.newContext({viewport: {width: 1440, height: 900}, recordVideo: {dir: path.join(out, 'recording'), size: {width: 1440, height: 900}}, serviceWorkers: 'block', acceptDownloads: true});
      await c.route('**/*', route => allowed(route.request().url()) ? route.continue() : route.abort('blockedbyclient'));
      // This app needs no WebSockets; prevent them from escaping HTTP routing.
      assert.equal(typeof c.routeWebSocket, 'function', 'existing Playwright must support WebSocket blocking');
      await c.routeWebSocket('**/*', socket => socket.close());
      return c;
    }
    ctx = await context(); page = await ctx.newPage(); page.setDefaultTimeout(20000);
    page.on('websocket', socket => { if (!allowed(socket.url())) errors.push('Unexpected websocket: ' + socket.url()); });
    await page.goto(result.base);
    if (!await page.locator('#login-email').isVisible()) await page.getByRole('button', {name: /^Log in/}).first().click();
    await page.locator('#login-email').fill('test@example.com');
    await page.locator('#login-password').fill('pw-for-e2e');
    await page.getByRole('button', {name: /^Log in/}).last().click();
    // API setup shares the authenticated browser cookie jar, and never follows redirects.
    await api.dispose(); api = ctx.request;
    await read('/api/auth/me'); pass('synthetic QA login through UI');
    stage = 'versioned canvas setup'; save();
    const initial = await read(PREFIX + '/canvas');
    assert.equal(initial.generations.length, 0);
    versions.initialCanvas = initial.version;
    const doc = initial.doc;
    for (const s of plan.shots) {
      const sb = doc.nodes.find(n => n.type === 'storyboard' && n.shotId === s.shotId);
      assert.ok(sb, 'server must seed each storyboard');
      sb.data = {...sb.data, model: 'seedream-4.5', prompt: s.imagePrompt, aspectRatio: '9:16', count: 1, shotTextOff: true};
      sb.position = {x: 100, y: (Number(s.shotId.slice(1)) - 1) * 1400};
      const header = doc.nodes.find(n => n.type === 'shot' && n.shotId === s.shotId);
      assert.ok(header); header.position = {x: -500, y: sb.position.y};
      const id = 'n_smoke_video_' + s.shotId;
      assert.ok(!doc.nodes.some(n => n.id === id));
      doc.nodes.push({id, type: 'video', shotId: s.shotId, position: {x: 600, y: sb.position.y}, data: {
        model: s.videoProvider === 'fal' ? 'hailuo-2.3-fast' : 'veo-lite-openrouter', prompt: s.videoPrompt,
        duration: s.duration, aspectRatio: '9:16', shotTextOff: true, selected: null}});
      doc.edges.push({id: 'e_smoke_' + s.shotId, source: sb.id, sourceHandle: 'out', target: id, targetHandle: 'in:start'});
    }
    doc.viewport = {x: 40, y: 100, zoom: 0.85};
    const put = await (await call('PUT', PREFIX + '/canvas', {version: initial.version, doc})).json();
    versions.preparedCanvas = put.version;
    await canvas();
    const imageNode = doc.nodes.find(n => n.type === 'storyboard' && n.shotId === 's1').id;
    const image = await generate('image', imageNode, 'seedream-4.5');
    const video = await generate('video', 'n_smoke_video_s1', 'hailuo-2.3-fast', image.id);
    assert.equal(video.inputs.duration, 6);
    const finalCanvas = await read(PREFIX + '/canvas');
    versions.selectedCanvas = finalCanvas.version;
    for (const g of [image, video]) {
      const n = finalCanvas.doc.nodes.find(n => n.id === g.nodeId);
      assert.equal(n.shotId, 's1'); assert.equal(n.data.selected, g.id);
    }
    const sources = (await read(PREFIX + '/edit/sources')).sources;
    assert.ok(Array.isArray(sources));
    const source = sources.find(s => s.id === video.id);
    assert.ok(source && source.nodeId === video.nodeId);
    // Generation sources expose nodeId; the real canvas supplies the shot mapping.
    assert.equal(finalCanvas.doc.nodes.find(n => n.id === source.nodeId)?.shotId, 's1');
    const sourceBytes = await safeMedia(source.url);
    assert.equal(hash(sourceBytes), result.video.sha256); pass('selected s1 video bytes/hash reach native edit sources');
    // Cross-check bridge provenance and byte identities without inserting or altering DB rows.
    const ledger = JSON.parse(fs.readFileSync(path.join(state, 'engine/runtime-ledger.json')));
    assert.equal(ledger.mode, 'offline'); assert.equal(ledger.requests.length, 2);
    for (const kind of ['image', 'video']) {
      const receipt = ledger.requests.find(r => r.kind === kind);
      assert.equal(receipt.state, 'done'); assert.equal(receipt.shot, 's1');
      assert.equal(receipt.offlineSimulation, true); assert.equal(receipt.actualUsd, 0);
      assert.equal(receipt.outputSha256, result[kind].sha256);
      result[kind].engineAsset = receipt.asset;
    }
    assert.equal(ledger.requests.find(r => r.kind === 'video').imageInput.asset, result.image.engineAsset);
    pass('offline ledger provenance: s1 image -> s1 video; real files; actualUsd zero');
    stage = 'native editor UI'; save();
    await plans(); await page.getByRole('button', {name: 'Make the video', exact: true}).click();
    await page.locator('.cv-ed').waitFor();
    let edit = await read(PREFIX + '/edit'); assert.equal(edit.project.clips.length, 0);
    await page.locator('.cv-ed-shot').first().getByRole('button', {name: 'Put in timeline', exact: true}).click();
    await until(() => read(PREFIX + '/edit'), d => d.project.clips.length === 1);
    await page.locator('.cv-ed-shot').first().getByRole('button', {name: '✓ On timeline', exact: true}).click();
    const length = page.getByRole('spinbutton', {name: 'Length (seconds)', exact: true});
    await length.fill('2'); await length.press('Tab');
    edit = await until(() => read(PREFIX + '/edit'), d => d.project.clips.length === 1 && Math.abs(d.project.clips[0].out - d.project.clips[0].in - 2) < 0.01);
    assert.equal(edit.project.clips[0].source.id, video.id); assert.equal(edit.project.clips[0].source.shotId, 's1');
    versions.edit = edit.version; pass('UI adds s1 and trims to legal 2 seconds');
    stage = 'native export and download'; save();
    await page.getByRole('button', {name: 'Export and send', exact: true}).click();
    const exportResponse = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/edit/export');
    await page.getByRole('button', {name: 'Export the video', exact: true}).click();
    assert.ok((await exportResponse).ok());
    const cut = await until(() => read(PREFIX + '/cut'), c => {
      if (c.status === 'failed') throw Error('Render failed: ' + c.error);
      return c.status === 'done';
    }, 180000);
    assert.equal(cut.source, 'editor'); assert.ok(cut.output); result.output = cut.output;
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('link', {name: 'Download', exact: true}).click();
    const download = await downloadEvent, file = path.join(out, 'OFFLINE-TEST-export.mp4');
    await download.saveAs(file); assert.equal(await download.failure(), null);
    const probe = JSON.parse(cp.execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {encoding: 'utf8', env: childEnv}));
    const stream = probe.streams.find(s => s.codec_type === 'video');
    assert.equal(stream.codec_name, 'h264'); assert.equal(stream.width, 1080); assert.equal(stream.height, 1920);
    assert.equal(stream.r_frame_rate, '30/1'); assert.ok(Math.abs(Number(probe.format.duration) - 2) < 0.1);
    cp.execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], {env: childEnv, timeout: 60000});
    result.export = {file, sha256: hash(fs.readFileSync(file)), probe, decode: 'PASS'};
    result.staffPlayback = await playToEnd(page.locator('.cv-ed-export-video'), page);
    pass('native UI export/download, ffprobe, full decode and browser ended');
    stage = 'send synthetic cut for approval'; save();
    const share = await (await call('POST', '/api/share', {clientId: 'evergreen-fresh-ai'})).json();
    assert.ok(allowed(share.url));
    const sendResponse = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/cut/review');
    await page.getByRole('button', {name: /^Send to .+ for approval$/}).click();
    assert.ok((await sendResponse).ok());
    const sent = await read(PREFIX + '/cut'); assert.equal(sent.review.status, 'waiting');
    versions.review = sent.review.version; pass('UI send; review remains waiting');
    stage = 'anonymous public playback'; save();
    anonymous = await context();
    assert.equal((await anonymous.cookies()).length, 0);
    const publicPage = await anonymous.newPage();
    await publicPage.goto(share.url);
    assert.equal((await anonymous.cookies()).length, 0);
    const publicVideo = publicPage.locator('video'); await publicVideo.waitFor(); assert.equal(await publicVideo.count(), 1);
    result.publicPlayback = await playToEnd(publicVideo, publicPage);
    pass('anonymous review link plays real export to ended, without approving');
    await page.reload();
    const restored = await read(PREFIX + '/edit'); assert.deepEqual(restored.project, edit.project);
    const stillWaiting = await read(PREFIX + '/cut'); assert.equal(stillWaiting.review.status, 'waiting');
    assert.equal(stillWaiting.output.url, cut.output.url); versions.reloadedEdit = restored.version;
    pass('reload keeps edit/export and waiting review');
    result.reviewUrl = share.url;
    assert.equal(errors.length, 0); result.status = 'PASS'; stage = 'complete';
  } catch (error) {
    errors.push(String(error.stack || error));
    if (page && out) await page.screenshot({path: path.join(out, 'failure.png'), fullPage: true}).catch(() => {});
    process.exitCode = 1;
  } finally {
    // Closing only contexts/browser created above finalizes raw continuous recordings.
    for (const c of [anonymous, ctx]) {
      if (!c) continue;
      const videos = c.pages().map(p => p.video()).filter(Boolean);
      await c.close().catch(e => {errors.push('context close: ' + e); process.exitCode = 1;});
      for (const v of videos) recordings.push(await v.path().catch(() => 'unavailable'));
    }
    if (browser) await browser.close().catch(e => {errors.push('browser close: ' + e); process.exitCode = 1;});
    if (api && !ctx) await api.dispose().catch(() => {});
    if (errors.length) result.status = 'FAIL'; save();
    console.log(result.status, stage, out || '(no output directory)');
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
