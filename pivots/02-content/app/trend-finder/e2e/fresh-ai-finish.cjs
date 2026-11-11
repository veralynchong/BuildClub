/* Prepared live AI assets -> native UI final cut; NO GENERATION in this runner.
 * node fresh-ai-finish.cjs --out NEW_ABSOLUTE_DIR [--state ABSOLUTE_STATE]
 * Default state is the approved fresh-ai-state-20261106; loopback ports only.
 * A supervisor owns server + test-slot. This module's exports are pure-testable.
 */
'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const cp = require('node:child_process');
const IDEA = 'evergreen-fresh-ai-21', CLIENT = 'evergreen-fresh-ai';
const PREFIX = '/api/ideas/' + IDEA, BASE = 'http://127.0.0.1:8978';
const STATE = '/Users/tommy/Downloads/buildclub-demo-reference/fresh-ai-state-20261106';
const APP = '/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder';
const PLAN_HASH = '032cd86a787f32e19ae26dd62d9696b5485e7cec12f95cae99c2508668136908';
const IMAGE = 'fal-ai/bytedance/seedream/v4.5/text-to-image';
const HAILUO = 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video', VEO = 'google/veo-3.1-lite';
const DISCLOSURE = 'Prepared AI assets reused: all image/video generations completed earlier; this recording shows real editing/export/review, not live generation. Costs with actualUsd=null remain unknown. Final human review stays waiting.';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function canonical(value) {
  const sorted = v => Array.isArray(v) ? v.map(sorted) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, sorted(v[k])])) : v;
  return JSON.stringify(sorted(value)).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
}
const digest = value => sha(canonical(value));
function allowed(url) {
  const u = new URL(url);
  return u.protocol === 'http:' && u.hostname === '127.0.0.1' && ['8978', '8979', '8980'].includes(u.port) && !u.username && !u.password;
}
function routeAllowed(method, url) {
  if (!allowed(url)) return false;
  const p = new URL(url).pathname;
  if (/\/gen(?:\/|$)/.test(p) && method !== 'GET') return false;
  if (/\/decide(?:\/|$)/.test(p)) return false;
  if (['GET', 'HEAD'].includes(method)) return true;
  if (method === 'PUT') return [PREFIX + '/edit', PREFIX + '/canvas'].includes(p);
  return method === 'POST' && ['/api/auth/login', '/api/auth/logout', '/api/share', PREFIX + '/edit/export', PREFIX + '/cut/review'].includes(p);
}
function staffCutVersion(cut) {
  assert.ok(cut.output?.url, 'native staff output URL required');
  const url = new URL(cut.output.url, BASE);
  assert.ok(allowed(url)); assert.equal(url.pathname, PREFIX + '/cut/file');
  const versions = url.searchParams.getAll('v');
  assert.equal(versions.length, 1); assert.match(versions[0], /^[1-9][0-9]*$/);
  // Filesystem nanoseconds exceed Number's integer precision: retain the URL string.
  return versions[0];
}
function verifyPublicCutVersion(staffCut, publicCut) {
  const version = staffCutVersion(staffCut);
  assert.equal(typeof publicCut.version, 'string'); assert.equal(publicCut.version, version);
  const url = new URL(publicCut.url, BASE); assert.ok(allowed(url));
  assert.equal(url.searchParams.getAll('v').length, 1);
  assert.equal(url.searchParams.get('v'), version);
  return version;
}
function validatePlan(plan) {
  assert.equal(plan.fps, 30); assert.equal(plan.timelineFrames, 315); assert.equal(plan.shots.length, 21);
  assert.deepEqual(plan.caps, {fal: 4, openrouter: 3, total: 7});
  assert.equal(plan.shots.reduce((n, s) => n + s.timelineFrames, 0), 315);
  plan.shots.forEach((s, i) => {
    assert.equal(s.shotId, 's' + (i + 1));
    assert.ok(Number.isInteger(s.timelineFrames) && s.timelineFrames >= 6);
    assert.equal(s.imageProvider, 'fal'); assert.equal(s.imageModel, IMAGE); assert.deepEqual(s.imageInputs, []);
    assert.equal(s.videoProvider, i < 12 ? 'fal' : 'openrouter');
    assert.equal(s.videoModel, i < 12 ? HAILUO : VEO); assert.equal(s.duration, i < 12 ? 6 : 4);
    assert.ok(s.timelineFrames <= s.duration * 30);
    assert.ok(typeof s.imagePrompt === 'string' && s.imagePrompt.length > 0);
    assert.ok(typeof s.videoPrompt === 'string' && s.videoPrompt.length > 0);
  });
}
function textSegments(plan, idea) {
  assert.equal(idea.id, IDEA); assert.equal(idea.shots.length, 21); assert.equal(idea.script.lines.length, 21);
  const words = ['Turn tofu into...', 'Healthy & high protein okonomiyaki', 'Want the full recipe? Comment "RECIPE" below!'];
  const segments = []; let cursor = 0;
  plan.shots.forEach((s, i) => {
    assert.equal(idea.shots[i].id, s.shotId); assert.equal(idea.shots[i].line, '');
    assert.equal(idea.script.lines[i].say, '');
    const text = words[i < 13 ? 0 : i < 18 ? 1 : 2];
    assert.equal(idea.script.lines[i].onScreen, text, 'seeded English onScreen script changed');
    const previous = segments.at(-1);
    if (previous?.text === text) previous.end = (cursor + s.timelineFrames) / 30;
    else segments.push({text, start: cursor / 30, end: (cursor + s.timelineFrames) / 30, position: 'top', color: 'white'});
    cursor += s.timelineFrames;
  });
  return segments;
}
function verifyProvenance({plan, ledger, canvas, rows, bindings, state, readFile}) {
  validatePlan(plan);
  assert.equal(ledger.mode, 'live'); assert.equal(ledger.policy, 'seedream-fal4-openrouter3'); assert.equal(ledger.halted, false);
  assert.deepEqual(ledger.caps, {fal: '4.00', openrouter: '3.00'});
  for (const provider of ['fal', 'openrouter']) assert.ok(Number(ledger.reserved[provider]) >= 0 && Number(ledger.reserved[provider]) <= Number(ledger.caps[provider]));
  assert.equal(ledger.requests.length, 42, 'need exactly 21 image + 21 video requests');
  assert.equal(rows.length, 42); assert.equal(bindings.length, 42); assert.equal(canvas.generations.length, 42);
  assert.equal(Object.keys(ledger.assets).length, 42);
  assert.equal(new Set(ledger.requests.map(r => r.providerRequestId)).size, 42);
  const scope = digest([plan, path.join(state, 'engine'), path.join(state, 'media')]);
  const selected = [];
  for (const s of plan.shots) {
    const found = {};
    for (const kind of ['image', 'video']) {
      const requests = ledger.requests.filter(r => r.shot === s.shotId && r.kind === kind);
      assert.equal(requests.length, 1); const r = requests[0], a = ledger.assets[r.asset];
      assert.equal(r.state, 'done'); assert.equal(r.offlineSimulation, false); assert.ok(a);
      assert.ok(/^[A-Za-z0-9_.:-]{1,128}$/.test(r.providerRequestId));
      assert.equal(r.provider, s[kind + 'Provider']); assert.equal(r.model, s[kind + 'Model']);
      assert.equal(r.providerReceipt?.providerRequestId, r.providerRequestId);
      assert.equal(r.providerReceipt?.model, r.model);
      assert.equal(a.offlineSimulation, false); assert.equal(a.providerRequestId, r.providerRequestId);
      assert.equal(a.requestFingerprint, r.fingerprint); assert.equal(a.shot, s.shotId); assert.equal(a.kind, kind); assert.equal(a.model, r.model);
      assert.equal(a.path, 'media/' + r.asset + (kind === 'image' ? '.png' : '.mp4'));
      assert.equal(r.asset, r.fingerprint); assert.equal(a.sha256, r.outputSha256);
      assert.equal(sha(readFile(path.join(state, 'engine', a.path))), a.sha256);
      const matches = bindings.filter(b => b.asset === r.asset); assert.equal(matches.length, 1); const b = matches[0];
      assert.equal(b.idea_id, IDEA); assert.equal(b.shot, s.shotId); assert.equal(b.kind, kind); assert.equal(b.scope, scope);
      assert.equal(b.outputHash, a.sha256);
      const g = rows.find(g => g.id === b.gid); assert.ok(g); const raw = JSON.parse(g.inputs);
      assert.equal(g.idea_id, IDEA); assert.equal(g.node_id, b.node_id); assert.equal(g.status, 'done');
      assert.equal(g.source_url, null); assert.equal(g.kind, kind); assert.equal(g.model, b.model);
      const expectedModel = kind === 'image' ? 'seedream-4.5' : s.videoProvider === 'fal' ? 'hailuo-2.3-fast' : 'veo-lite-openrouter';
      assert.equal(b.model, expectedModel);
      assert.equal(b.identityHash, digest([IDEA, b.node_id, kind, b.model, raw, s.shotId]));
      const ui = canvas.generations.find(x => x.id === g.id); assert.ok(ui);
      assert.equal(ui.status, 'done'); assert.equal(ui.nodeId, g.node_id); assert.equal(ui.model, g.model); assert.equal(ui.kind, kind);
      assert.deepEqual(ui.inputs, raw);
      const node = canvas.doc.nodes.find(n => n.id === b.node_id); assert.ok(node);
      assert.equal(node.shotId, s.shotId); assert.equal(node.type, kind === 'image' ? 'storyboard' : 'video');
      assert.equal(node.data.selected, g.id); assert.equal(node.data.model, expectedModel);
      assert.equal(raw.prompt, s[kind + 'Prompt']); assert.equal(raw.sentPrompt ?? raw.prompt, raw.prompt);
      assert.equal(raw.count ?? 1, 1); assert.equal(raw.aspectRatio ?? '9:16', '9:16');
      for (const field of ['references', 'reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages']) {
        const value = raw[field];
        assert.ok(!value || (typeof value === 'object' && Object.keys(value).length === 0), 'nonempty reference/kit forbidden');
      }
      assert.ok(g.file && path.basename(g.file) === g.file);
      assert.equal(sha(readFile(path.join(state, 'media', IDEA, 'gen', g.file))), a.sha256);
      let body = {model: s[kind + 'Model'], prompt: s[kind + 'Prompt']};
      if (kind === 'image') {
        assert.equal(r.textOnly, true); assert.equal(a.textOnly, true); assert.equal(r.imageInput, null);
        assert.ok(raw.startFrame == null); assert.ok(raw.duration == null);
        body = {...body, num_images: 1, max_images: 1, image_size: 'portrait_16_9', enable_safety_checker: true};
      } else {
        assert.equal(raw.startFrame, found.image.generationId); assert.equal(raw.duration, s.duration);
        assert.deepEqual(r.imageInput, {asset: found.image.asset, sha256: found.image.sha256, parentRequestId: found.image.requestId});
        assert.ok(canvas.doc.edges.some(e => e.source === found.image.nodeId && e.target === b.node_id && e.targetHandle === 'in:start'));
        body.firstImage = found.image.asset;
        Object.assign(body, s.videoProvider === 'fal' ? {duration: '6', prompt_optimizer: false, enable_safety_checker: true} : {duration: 4, resolution: '1080p', aspect_ratio: '9:16', generate_audio: false});
      }
      assert.equal(b.inputHash, digest(body)); assert.equal(r.fingerprint, digest([r.provider, kind, body]));
      if (kind === 'image') {
        assert.ok(r.normalization && typeof r.normalization === 'object' && !Array.isArray(r.normalization), 'image raw normalization proof required');
        assert.deepEqual(a.normalization, r.normalization, 'asset/request normalization metadata mismatch');
        assert.equal(r.normalization.rawPath, 'provider-originals/' + r.fingerprint + '.bin');
        assert.equal(readFile(path.join(state, 'engine', r.normalization.rawPath)).length, r.normalization.rawBytes);
        assert.equal(readFile(path.join(state, 'engine', a.path)).length, r.normalization.outputBytes);
      }
      if (r.normalization) {
        assert.equal(r.normalization.outputSha256, a.sha256);
        assert.equal(r.normalization.providerRequestId, r.providerRequestId);
        const original = readFile(path.join(state, 'engine', r.normalization.rawPath));
        assert.equal(sha(original), r.normalization.rawSha256);
      }
      found[kind] = {generationId: g.id, nodeId: b.node_id, model: b.model, endpoint: r.model, provider: r.provider,
        requestId: r.providerRequestId, asset: r.asset, sha256: a.sha256, file: g.file, url: ui.url,
        actualUsd: r.actualUsd, billingEstimateUsd: r.billingEstimateUsd ?? null, reservationUsd: r.reservationUsd,
        nativeReportedActualUsd: ui.actualUsd ?? null, nativeEstimatedUsd: ui.estUsd ?? null,
        nativeCostDisclosure: 'Native actualUsd can contain an estimate fallback; only engine actualUsd is treated as confirmed billing',
        imageInput: r.imageInput, textOnly: r.textOnly, normalization: r.normalization ?? null};
      assert.ok(Object.hasOwn(r, 'actualUsd'), 'actual billing field must remain explicit');
    }
    selected.push({shotId: s.shotId, timelineFrames: s.timelineFrames, ...found});
  }
  const costs = ledger.requests.map(r => ({requestId: r.providerRequestId, provider: r.provider, kind: r.kind, shotId: r.shot,
    actualUsd: r.actualUsd, billingEstimateUsd: r.billingEstimateUsd ?? null, reservationUsd: r.reservationUsd}));
  const known = costs.filter(r => r.actualUsd !== null);
  known.forEach(r => assert.ok(Number.isFinite(Number(r.actualUsd)) && Number(r.actualUsd) >= 0));
  return {disclosure: DISCLOSURE, mode: 'live', planHash: PLAN_HASH, selected, costs,
    reserved: ledger.reserved, caps: ledger.caps, actualKnownSubtotalUsd: known.reduce((n, r) => n + Number(r.actualUsd), 0),
    actualUnknownCount: costs.length - known.length, actualTotalUsd: known.length === costs.length ? known.reduce((n, r) => n + Number(r.actualUsd), 0) : null};
}
function verifyProject(project, manifest, segments, sources) {
  assert.equal(project.fps, 30); assert.equal(project.width, 1080); assert.equal(project.height, 1920);
  assert.equal(project.clips.length, 21); assert.equal(project.captions.enabled, false);
  assert.equal(project.music, null); assert.equal(project.voiceover.length, 0);
  project.clips.forEach((clip, i) => {
    const row = manifest.selected[i];
    assert.equal(clip.source.kind, 'generation'); assert.equal(clip.source.id, row.video.generationId);
    assert.equal(clip.source.nodeId, row.video.nodeId); assert.equal(clip.source.shotId, row.shotId);
    assert.equal(clip.in, 0); assert.equal(Math.round((clip.out - clip.in) * 30), row.timelineFrames);
    const source = sources.find(s => s.id === clip.source.id); assert.ok(source);
    assert.ok(clip.muted || source.hasAudio === false, 'audio must be silent or explicitly muted');
    assert.ok(clip.caption === undefined || clip.caption === '', 'no per-shot caption overrides');
  });
  assert.equal(project.clips.reduce((n, c) => n + Math.round((c.out - c.in) * 30), 0), 315);
  assert.deepEqual(project.texts.map(({id, ...rest}) => rest), segments);
}
function editorMode(project, manifest, segments, sources) {
  if (project.clips.length === 0 && project.texts.length === 0 && project.music === null && project.voiceover.length === 0 && Object.keys(project.primaries || {}).length === 0) return 'empty';
  verifyProject(project, manifest, segments, sources); return 'exact-existing';
}
function localFile(state, filename) {
  const absolute = path.resolve(filename); assert.ok(absolute.startsWith(state + path.sep), 'file outside isolated state');
  for (let p = absolute; p !== state; p = path.dirname(p)) assert.ok(!fs.lstatSync(p).isSymbolicLink(), 'symlink refused');
  return fs.readFileSync(absolute);
}
function databaseRows(state, env) {
  const python = APP + '/backend/.venv/bin/python';
  const code = "import json,sqlite3,sys\nc=sqlite3.connect('file:'+sys.argv[1]+'?mode=ro',uri=True)\nc.row_factory=sqlite3.Row\nc.execute('BEGIN')\nprint(json.dumps({k:[dict(r) for r in c.execute(q,('evergreen-fresh-ai-21',))] for k,q in [('rows','SELECT * FROM generations WHERE idea_id=?'),('bindings','SELECT * FROM batch_bindings WHERE idea_id=?')]}))\nc.close()";
  return JSON.parse(cp.execFileSync(python, ['-B', '-c', code, path.join(state, 'data.db')], {env, encoding: 'utf8', maxBuffer: 5 * 1024 * 1024}));
}
async function main() {
  let out, state, ctx, browser, page, api, stage = 'arguments', manifest, ledgerHash;
  const result = {status: 'FAIL', disclosure: DISCLOSURE, checks: [], errors: [], versions: {}, sourceIDs: [], recordings: [], forbiddenRequests: []};
  const save = () => {if (out) fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify({...result, stage}, null, 2));};
  const write = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
  const pass = name => {result.checks.push(name); save(); console.log('PASS', name);};
  const until = async (read, test, timeout = 60000) => {const start = Date.now(); while (Date.now() - start < timeout) {const d = await read(); if (test(d)) return d; await new Promise(r => setTimeout(r, 300));} throw Error('Timeout at ' + stage);};
  const call = async (method, suffix, data) => {
    const url = new URL(suffix, BASE).href; assert.ok(routeAllowed(method, url));
    assert.ok(method === 'GET' || (method === 'POST' && suffix === '/api/share'), 'API writes limited to local share setup');
    const r = await api.fetch(url, {method, data, maxRedirects: 0, timeout: 30000});
    assert.ok(r.ok(), method + ' ' + suffix + ' HTTP ' + r.status()); return r;
  };
  const read = async suffix => (await call('GET', suffix)).json();
  const plans = async () => page.getByRole('button', {name: /^Plans(?:\s|$)/}).first().click();
  const play = async selector => {
    const player = page.locator(selector); await player.waitFor(); assert.equal(await player.count(), 1);
    await player.evaluate(v => {v.muted = true; v.currentTime = 0; return v.play();});
    await page.waitForFunction(sel => {const v = document.querySelector(sel); return v && v.ended && v.duration > 0 && v.currentTime >= v.duration - .1;}, selector, {timeout: 30000});
    return player.evaluate(v => ({ended: v.ended, currentTime: v.currentTime, duration: v.duration, readyState: v.readyState}));
  };
  try {
    const args = {}; const argv = process.argv.slice(2); assert.equal(argv.length % 2, 0);
    for (let i = 0; i < argv.length; i += 2) {assert.ok(['--out', '--state'].includes(argv[i])); assert.ok(!args[argv[i]]); args[argv[i]] = argv[i + 1];}
    assert.ok(args['--out'] && path.isAbsolute(args['--out']), '--out NEW absolute directory required');
    out = args['--out']; fs.mkdirSync(out); save();
    state = fs.realpathSync(args['--state'] || STATE); result.state = state;
    const env = {PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME: state, TMPDIR: path.join(state, 'tmp'), BUILDCLUB_OFFLINE_VERIFY: '1', PYTHONDONTWRITEBYTECODE: '1'};
    const planBytes = localFile(state, path.join(state, 'frozen-plan.json')); assert.equal(sha(planBytes), PLAN_HASH);
    const plan = JSON.parse(planBytes); validatePlan(plan);
    const {chromium, request} = require('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core');
    api = await request.newContext(); stage = 'live completed-batch gate'; save();
    const status = await read('/api/batch/status'); assert.equal(status.mode, 'live'); assert.equal(status.ledger.halted, false); assert.equal(status.requests, 42);
    const ledgerBytes = localFile(state, path.join(state, 'engine/runtime-ledger.json')); ledgerHash = sha(ledgerBytes);
    const ledger = JSON.parse(ledgerBytes); assert.equal(ledger.mode, 'live'); assert.equal(ledger.halted, false);
    assert.equal(ledger.requests.length, 42); assert.ok(ledger.requests.every(r => r.state === 'done'));
    const browsers = fs.readdirSync(APP + '/node_modules/.remotion/chrome-headless-shell/mac-arm64');
    const executablePath = browsers.map(n => path.join(APP, 'node_modules/.remotion/chrome-headless-shell/mac-arm64', n, 'chrome-headless-shell')).find(p => fs.existsSync(p));
    assert.ok(executablePath, 'existing Remotion browser required; never download');
    browser = await chromium.launch({executablePath, headless: true, env});
    ctx = await browser.newContext({viewport: {width: 1440, height: 900}, serviceWorkers: 'block', acceptDownloads: true,
      recordVideo: {dir: path.join(out, 'recording'), size: {width: 1440, height: 900}}});
    await ctx.route('**/*', route => {
      const req = route.request();
      if (routeAllowed(req.method(), req.url())) return route.continue();
      result.forbiddenRequests.push({method: req.method(), url: req.url()});
      return route.abort('blockedbyclient');
    });
    await ctx.routeWebSocket('**/*', socket => socket.close());
    await ctx.addInitScript(disclosure => {
      document.addEventListener('DOMContentLoaded', () => {const b = document.createElement('div'); b.textContent = disclosure;
        b.style.cssText = 'position:fixed;bottom:8px;right:8px;max-width:400px;z-index:100000;background:#14231feb;color:white;padding:8px;font:12px sans-serif;pointer-events:none'; document.body.append(b);});
    }, DISCLOSURE);
    page = await ctx.newPage(); page.setDefaultTimeout(20000);
    stage = 'synthetic QA login'; save(); await page.goto(BASE);
    if (!await page.locator('#login-email').isVisible()) await page.getByRole('button', {name: /^Log in/}).first().click();
    await page.locator('#login-email').fill('test@example.com'); await page.locator('#login-password').fill('pw-for-e2e');
    const login = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/login');
    await page.getByRole('button', {name: /^Log in/}).last().click(); assert.equal((await login).status(), 200);
    await page.getByText('Client dashboard', {exact: true}).first().waitFor();
    await page.getByRole('button', {name: 'Ever Green', exact: true}).first().click();
    await page.getByRole('button', {name: /^Plans(?:\s|$)/}).first().waitFor();
    await api.dispose(); api = ctx.request;
    const canvas = await read(PREFIX + '/canvas'), snapshot = databaseRows(state, env);
    manifest = verifyProvenance({plan, ledger, canvas, ...snapshot, state, readFile: filename => localFile(state, filename)});
    manifest.ledgerSha256 = ledgerHash; manifest.generatedEarlier = true; manifest.recordingScope = 'Prepared asset reuse; no generation submitted in this run';
    write('provenance-cost-manifest.json', manifest); result.sourceIDs = manifest.selected.map(s => ({shotId: s.shotId, image: s.image.generationId, video: s.video.generationId}));
    result.versions.canvas = canvas.version;
    const idea = (await read('/api/ideas')).find(i => i.id === IDEA); const ideaBefore = canonical(idea);
    const segments = textSegments(plan, idea); result.textSegments = segments;
    const sources = (await read(PREFIX + '/edit/sources')).sources;
    for (const row of manifest.selected) {
      const source = sources.find(s => s.id === row.video.generationId); assert.ok(source);
      assert.equal(source.nodeId, row.video.nodeId); assert.ok(source.duration * 30 >= row.timelineFrames);
      const response = await call('GET', source.url); assert.equal(sha(await response.body()), row.video.sha256);
    }
    pass('42 live receipts, bindings, plan/source/output hashes, 12 Hailuo + 9 Veo, null billing preserved');
    stage = 'real Canvas prepared assets overview'; save();
    await plans(); await page.getByRole('button', {name: 'Open plan', exact: true}).click();
    await page.getByRole('button', {name: 'Open the canvas', exact: true}).click(); await page.locator('.react-flow').waitFor();
    await page.getByRole('button', {name: 'Fit to screen', exact: true}).click();
    await page.screenshot({path: path.join(out, 'canvas-21-shot-overview.png')});
    await page.getByRole('button', {name: /History/}).click(); await page.locator('.fc-history').last().waitFor();
    assert.equal(await page.locator('.fc-history').count(), 42);
    await page.screenshot({path: path.join(out, 'canvas-history-42-prepared-generations.png')});
    await page.getByRole('button', {name: /History/}).click(); pass('true Canvas overview and 42-entry History; generation completed earlier');
    stage = 'native Editor 21-shot edit'; save(); await plans();
    await page.getByRole('button', {name: 'Make the video', exact: true}).click(); await page.locator('.cv-ed').waitFor();
    let edit = await read(PREFIX + '/edit'); result.reentry = editorMode(edit.project, manifest, segments, sources);
    if (result.reentry === 'empty') {
      for (let i = 0; i < 21; i++) {
        stage = 'UI add/trim ' + plan.shots[i].shotId; save();
        const row = page.locator('.cv-ed-shot').nth(i);
        await row.getByRole('button', {name: 'Put in timeline', exact: true}).click();
        await until(() => read(PREFIX + '/edit'), d => d.project.clips.length === i + 1);
        await row.getByRole('button', {name: '✓ On timeline', exact: true}).click();
        const length = page.getByRole('spinbutton', {name: 'Length (seconds)', exact: true});
        assert.equal(await length.getAttribute('min'), '0.2', 'trim UI contract changed; stop, never bypass');
        await length.fill(String(plan.shots[i].timelineFrames / 30)); await length.press('Tab');
        await until(() => read(PREFIX + '/edit'), d => Math.round((d.project.clips[i].out - d.project.clips[i].in) * 30) === plan.shots[i].timelineFrames);
      }
      const audioRows = page.locator('.cv-ed-audio-row'); assert.equal(await audioRows.count(), 21);
      for (let i = 0; i < 21; i++) {
        const source = sources.find(s => s.id === manifest.selected[i].video.generationId);
        if (source.hasAudio) await audioRows.nth(i).getByRole('button', {name: 'Mute', exact: true}).click();
      }
      await page.getByRole('tab', {name: 'Captions', exact: true}).click();
      await page.getByRole('checkbox', {name: 'Show captions in the video', exact: true}).uncheck();
      await page.getByRole('tab', {name: 'Text', exact: true}).click();
      for (const text of segments) {
        await page.getByRole('button', {name: 'Add text at the playhead', exact: true}).click();
        await page.getByRole('textbox', {name: 'Words', exact: true}).fill(text.text);
        await page.getByRole('button', {name: 'Top', exact: true}).click(); await page.getByRole('button', {name: 'White', exact: true}).click();
        for (const [label, value] of [['Starts at (s)', text.start], ['Ends at (s)', text.end]]) {
          const input = page.getByRole('spinbutton', {name: label, exact: true}); await input.fill(String(value)); await input.press('Tab');
        }
      }
    }
    edit = await until(() => read(PREFIX + '/edit'), d => {try {verifyProject(d.project, manifest, segments, sources); return true;} catch {return false;}});
    verifyProject(edit.project, manifest, segments, sources); result.versions.edit = edit.version; write('verified-native-edit.json', edit);
    pass('UI native 21 clips in shot order, 315 frames, 3 English text segments, silent/no music');
    stage = 'native export'; save(); await page.getByRole('button', {name: 'Export and send', exact: true}).click();
    let cut = await read(PREFIX + '/cut');
    if (cut.review?.status && cut.review.status !== 'waiting') throw Error('Existing human review decision; do not replace');
    if (cut.status !== 'done' || cut.source !== 'editor' || cut.stale || !cut.output) {
      assert.ok(!cut.review?.status, 'Do not replace a waiting output');
      assert.ok(!['queued', 'running'].includes(cut.status), 'Existing export active; stop');
      const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/edit/export');
      await page.getByRole('button', {name: 'Export the video', exact: true}).click(); assert.ok((await response).ok());
      cut = await until(() => read(PREFIX + '/cut'), c => {if (c.status === 'failed') throw Error('Native export failed: ' + c.error); return c.status === 'done';}, 180000);
    } else {result.reusedExistingExport = true;}
    assert.equal(cut.source, 'editor'); assert.equal(cut.stale, false); assert.ok(cut.output);
    const downloadEvent = page.waitForEvent('download'); await page.getByRole('link', {name: 'Download', exact: true}).click();
    const download = await downloadEvent, file = path.join(out, 'ever-green-fresh-ai-21.mp4'); await download.saveAs(file); assert.equal(await download.failure(), null);
    const probe = JSON.parse(cp.execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file], {env, encoding: 'utf8'}));
    const v = probe.streams.find(s => s.codec_type === 'video'); assert.ok(v); assert.equal(v.codec_name, 'h264'); assert.equal(v.width, 1080); assert.equal(v.height, 1920);
    assert.equal(v.r_frame_rate, '30/1'); assert.equal(Number(v.nb_read_frames), 315); assert.ok(Math.abs(Number(probe.format.duration) - 10.5) < .05);
    cp.execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-'], {env, timeout: 60000});
    const audio = probe.streams.filter(s => s.codec_type === 'audio');
    if (audio.length) {
      const pcm = cp.execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 's16le', '-ac', '1', '-ar', '8000', 'pipe:1'], {env, maxBuffer: 1024 * 1024});
      assert.ok(pcm.every(b => b === 0), 'export audio is not silent');
    }
    result.output = {file, sha256: sha(fs.readFileSync(file)), probe, decode: 'PASS', nativeOutput: cut.output};
    result.staffPlayback = await play('.cv-ed-export-video'); pass('native export/download: h264 1080x1920/30fps, 315 frames, full decode, staff ended');
    stage = 'UI send waiting'; save();
    const share = await (await call('POST', '/api/share', {clientId: CLIENT})).json(); assert.ok(allowed(share.url));
    if (cut.review?.status !== 'waiting') {
      const sent = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/cut/review');
      await page.getByRole('button', {name: /^Send to .+ for approval$/}).click(); assert.ok((await sent).ok());
    }
    cut = await read(PREFIX + '/cut'); assert.equal(cut.review.status, 'waiting'); result.versions.review = staffCutVersion(cut);
    await page.screenshot({path: path.join(out, 'native-export-waiting.png')});
    await page.reload();
    const restored = await read(PREFIX + '/edit'); assert.deepEqual(restored.project, edit.project);
    const reloaded = await read(PREFIX + '/cut'); assert.equal(reloaded.review.status, 'waiting'); assert.equal(reloaded.output.url, cut.output.url); assert.equal(staffCutVersion(reloaded), result.versions.review);
    assert.equal(canonical((await read('/api/ideas')).find(i => i.id === IDEA)), ideaBefore, 'Shot.line or script changed');
    assert.equal(sha(localFile(state, path.join(state, 'engine/runtime-ledger.json'))), ledgerHash, 'generation ledger changed during finish');
    result.versions.reloadedEdit = restored.version; pass('waiting review + exact edit/output reload persistence; source script and ledger unchanged');
    stage = 'same-page sign out and anonymous review'; save(); await plans();
    const logout = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/logout');
    await page.getByRole('button', {name: 'Sign out', exact: true}).click(); assert.ok((await logout).ok());
    await ctx.clearCookies(); assert.deepEqual(await ctx.cookies(), []);
    await page.goto(share.url); assert.deepEqual(await ctx.cookies(), []);
    result.publicPlayback = await play('video'); assert.deepEqual(await ctx.cookies(), []);
    await page.reload(); assert.deepEqual(await ctx.cookies(), []);
    const review = await read('/api/review/' + share.token);
    assert.equal(review.cuts.length, 1); assert.equal(verifyPublicCutVersion(cut, review.cuts[0].cut), result.versions.review);
    const publicBytes = await (await call('GET', review.cuts[0].cut.url)).body(); assert.equal(sha(publicBytes), result.output.sha256);
    assert.equal(sha(localFile(state, path.join(state, 'engine/runtime-ledger.json'))), ledgerHash, 'ledger changed after anonymous playback');
    result.reviewUrl = share.url; result.reviewStatus = 'waiting'; result.recordingScope = 'One page/context: login -> prepared Canvas -> native Editor -> export -> waiting -> actual sign out -> cookie-empty public ended';
    pass('one continuous same-page recording through signed-out cookie-empty public playback; no approval');
    assert.ok(!result.forbiddenRequests.some(r => r.method !== 'GET' && /\/gen(?:\/|$)/.test(new URL(r.url).pathname)), 'attempted generation was blocked');
    result.status = 'PASS'; stage = 'complete';
  } catch (error) {
    result.errors.push(String(error.stack || error)); process.exitCode = 1;
    if (page && out) await page.screenshot({path: path.join(out, 'failure.png'), fullPage: true}).catch(() => {});
  } finally {
    if (ctx) {
      const videos = ctx.pages().map(p => p.video()).filter(Boolean);
      await ctx.close().catch(e => {result.errors.push('context close: ' + e); process.exitCode = 1;});
      for (const video of videos) result.recordings.push(await video.path().catch(() => 'unavailable'));
    } else if (api) await api.dispose().catch(() => {});
    if (browser) await browser.close().catch(e => {result.errors.push('browser close: ' + e); process.exitCode = 1;});
    if (result.errors.length) result.status = 'FAIL';
    if (manifest) {manifest.output = result.output ?? null; manifest.reviewStatus = result.reviewStatus ?? null; manifest.versions = result.versions; manifest.recordings = result.recordings; write('provenance-cost-manifest.json', manifest);}
    save(); console.log(result.status, stage, out || '(no evidence directory)');
  }
}
module.exports = {staffCutVersion, verifyPublicCutVersion, canonical, digest, sha, allowed, routeAllowed, validatePlan, textSegments, verifyProvenance, verifyProject, editorMode, PLAN_HASH};
if (require.main === module) main().catch(error => {console.error(error); process.exitCode = 1;});
