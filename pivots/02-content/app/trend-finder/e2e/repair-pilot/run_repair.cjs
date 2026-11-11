/* Three authorized text-only repair images only; root-operated after review. No automatic promotion. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const {chromium, request} = require('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core');
const BASE = 'http://127.0.0.1:8990';
const B = '/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai';
const STATE = '/Users/tommy/Downloads/buildclub-demo-reference/fresh-ai-repair-pilot-20261106';
const PARENT = '/Users/tommy/Downloads/buildclub-demo-reference/fresh-ai-state-20261106';
const MANIFEST_SHA = '45f701de5023c504bc4ac0fc68c45e5b2334847d3bc59ce1a08c9f30af098b86';
const manifestBytes = fs.readFileSync(path.join(__dirname, 'manifest.json'));
assert.equal(crypto.createHash('sha256').update(manifestBytes).digest('hex'), MANIFEST_SHA);
const manifest = JSON.parse(manifestBytes);
assert.equal(manifest.repairState, STATE); assert.equal(manifest.baseState, PARENT);
const APP = '/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder';
const IDEA = 'evergreen-repair-pilot-3', PREFIX = '/api/ideas/' + IDEA;
const MODEL = 'seedream-4.5', ENDPOINT = 'fal-ai/bytedance/seedream/v4.5/text-to-image';
const SHOTS = ['s2', 's13', 's16'];
const disclosure = 'LIVE three-image repair pilot s2/s13/s16 only; text-only Seedream 4.5, at most 3 new POST / US$0.12. Parent 31-request QUALITY_HOLD remains immutable; combined reservation <=2.96 fal within original4, OpenRouter0, combined images<=24. No higher cap, videos, automatic retry, approval or promotion. Outputs require visual QA and explicit verified lineage before later promotion; actualUsd unknown is not an invoice.';
let out, api, standalone, browser, ctx, page, stage = 'arguments', armed = null, posts = 0;
let plan, before, originalDoc, initialGenerations = [], initialFingerprints = [], initialReserved = 0;
const result = {status: 'FAIL', disclosure, base: BASE, state: STATE, cap: .12, manifestSha256: MANIFEST_SHA, parentLedgerSha256: manifest.baseLedgerSha256, repairPlanSha256: manifest.repairPlanSha256, promotionStatus: 'not promoted; visual QA and explicit verified lineage required', checks: [], errors: [], images: [], sourceIDs: {}, recordings: []};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function write(name, value) { if (out) fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2)); }
function save() { write('result.json', {...result, stage, newGenerationPosts: posts}); }
function pass(name) { result.checks.push(name); save(); console.log('PASS', name); }
function localFile(file, root) {
  assert.ok(file.startsWith(root + '/'));
  for (let p = file; p !== root; p = path.dirname(p)) assert.ok(!fs.lstatSync(p).isSymbolicLink(), 'symlink forbidden: ' + p);
  assert.ok(!fs.lstatSync(root).isSymbolicLink());
  return fs.readFileSync(file);
}
function allowed(url) {
  const u = new URL(url);
  return u.protocol === 'http:' && u.hostname === '127.0.0.1' && ['8990', '8991', '8992'].includes(u.port) && !u.username && !u.password;
}
async function call(method, suffix, data) {
  const url = new URL(suffix, BASE);
  assert.equal(url.origin, BASE, 'API/media must stay on production origin');
  assert.ok(['GET', 'PUT'].includes(method), 'No API generation or direct selection');
  if (method === 'PUT') assert.equal(url.pathname, PREFIX + '/canvas');
  const r = await api.fetch(url.href, {method, data, maxRedirects: 0, timeout: 30000});
  assert.ok(r.ok(), method + ' ' + url.pathname + ' HTTP ' + r.status());
  return r;
}
const read = async p => (await call('GET', p)).json();
async function until(fn, predicate, timeout = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const v = await fn(); if (predicate(v)) return v;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw Error('Pending timeout; STOP without retry: ' + stage);
}
const cleanEnv = {PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin', HOME: STATE, TMPDIR: '/tmp', PLAYWRIGHT_BROWSERS_PATH: '/Users/tommy/Library/Caches/ms-playwright', PYTHONDONTWRITEBYTECODE: '1'};
// Read only generation/binding evidence, never authentication tables or environment keys.
function snapshot() {
  const ledger = JSON.parse(localFile(STATE + '/engine/runtime-ledger.json', STATE));
  const proof = JSON.parse(cp.execFileSync('/usr/bin/env', ['-i', ...Object.entries(cleanEnv).map(([k, v]) => k + '=' + v), 'python3', '-I', '-c', `
import sqlite3,json,hashlib,pathlib
s=pathlib.Path(${JSON.stringify(STATE)})
enc=lambda v:json.dumps(v,sort_keys=True,separators=(',',':')).encode()
h=lambda v:hashlib.sha256(enc(v)).hexdigest()
p=json.loads((s/'frozen-plan.json').read_text())
c=sqlite3.connect('file:'+str(s/'data.db')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
bs=[dict(r) for r in c.execute('SELECT * FROM batch_bindings')]
gs=[dict(r) for r in c.execute('SELECT id,idea_id,node_id,kind,model,inputs,status,file,source_url FROM generations')]
for g in gs:
 raw=json.loads(g['inputs']);g['inputs']=raw
 b=next((b for b in bs if b['gid']==g['id']),None)
 if b:g['expectedIdentity']=h([g['idea_id'],g['node_id'],g['kind'],g['model'],raw,b['shot']])
expected={}
for t in p['shots']:
 body=dict(model=t['imageModel'],prompt=t['imagePrompt'],num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
 expected[t['shotId']]=dict(inputHash=h(body),fingerprint=h(['fal','image',body]),payloadSha256=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest())
print(json.dumps(dict(bindings=bs,generations=gs,expected=expected,scope=h([p,str((s/'engine').resolve()),str(s/'media')]))))
`], {encoding: 'utf8', timeout: 10000}));
  return {ledger, ...proof};
}
function gateStatus(s) {
  assert.equal(s.mode, 'live'); assert.equal(s.generationEnabled, true); assert.equal(s.keys?.fal, true);
  assert.deepEqual(s.approvedCaps, {fal: 4, openrouter: 3, total: 7}); assert.equal(s.ledger?.halted, false);
}
function parentGate() {
  const bytes = localFile(PARENT + '/engine/runtime-ledger.json', PARENT);
  assert.equal(hash(bytes), manifest.baseLedgerSha256);
  const p = JSON.parse(bytes); assert.equal(p.halted, true); assert.equal(p.requests.length, 31);
  assert.ok(p.requests.every(r => r.state === 'done')); assert.deepEqual(p.requests, manifest.baseRequests);
  assert.deepEqual(p.reserved, {fal: '2.84', openrouter: '0.00'});
  assert.equal(hash(localFile(PARENT + '/frozen-plan.json', PARENT)), manifest.baseFrozenSha256);
}
function audit(s) {
  parentGate(); assert.equal(s.ledger.mode, 'live'); assert.equal(s.ledger.policy, 'seedream-repair-pilot-3'); assert.equal(s.ledger.halted, false);
  assert.ok(s.ledger.requests.length <= 3); assert.equal(s.generations.length, s.ledger.requests.length); assert.equal(s.bindings.length, s.generations.length);
  assert.equal(s.ledger.repairLineage?.baseLedgerSha256, manifest.baseLedgerSha256); assert.equal(s.ledger.repairLineage?.repairPlanSha256, manifest.repairPlanSha256);
  assert.equal(s.ledger.repairLineage?.baseRequestCount, 31); assert.equal(Object.keys(s.ledger.assets).length, s.ledger.requests.length);
  const seen = new Set();
  for (const r of s.ledger.requests) {
    assert.ok(SHOTS.includes(r.shot) && !seen.has(r.shot)); seen.add(r.shot);
    assert.equal(r.kind, 'image'); assert.equal(r.provider, 'fal'); assert.equal(r.model, ENDPOINT);
    assert.equal(r.textOnly, true); assert.equal(r.imageInput, null); assert.equal(r.offlineSimulation, false); assert.equal(r.state, 'done', 'unresolved repair: STOP without retry');
    assert.equal(Number(r.reservationUsd), .04); const e = s.expected[r.shot];
    assert.equal(r.fingerprint, e.fingerprint); assert.equal(r.payloadSha256, e.payloadSha256);
  }
  assert.equal(Number(s.ledger.reserved.fal), Number((s.ledger.requests.length * .04).toFixed(2))); assert.equal(Number(s.ledger.reserved.openrouter), 0);
  assert.ok(2.84 + Number(s.ledger.reserved.fal) <= 2.96 + 1e-9); assert.ok(21 + s.ledger.requests.length <= 24);
  assert.equal(s.ledger.funding.length, s.ledger.requests.length);
  s.ledger.funding.forEach((f, i) => { assert.equal(f.baseLedgerSha256, manifest.baseLedgerSha256); assert.equal(f.combinedImageCount, 22 + i); assert.equal(f.parentReceiptCount, 31); });
  assert.equal(s.ledger.requests.filter(r => !initialFingerprints.includes(r.fingerprint)).length, posts);
  assert.ok(Number(s.ledger.reserved.fal) - initialReserved <= .12 + 1e-9);
}
function emptyReferenceValue(v) {
  return v == null || (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).length === 0);
}
function validateIdeaSave(items, s) {
  assert.ok(Array.isArray(items)); assert.equal(items.length, 1);
  const idea = items[0]; assert.equal(idea.id, IDEA); assert.equal(idea.clientId, 'evergreen-repair-pilot');
  assert.equal(idea.shots.length, 21);
  assert.deepEqual(idea.shots.map(t => t.id).sort(), Array.from({length: 21}, (_, i) => 's' + (i + 1)).sort());
  for (const shot of idea.shots) {
    if (!shot.frameImage) continue;
    const u = new URL(shot.frameImage, BASE);
    assert.equal(u.origin, BASE); assert.equal(u.search, ''); assert.equal(u.hash, '');
    const binding = s.bindings.find(b => b.idea_id === IDEA && b.shot === shot.id && b.kind === 'image' &&
      u.pathname === PREFIX + '/gen/' + b.gid + '/file');
    assert.ok(binding, 'Selected image must belong to this fresh shot');
    const g = s.generations.find(g => g.id === binding.gid), a = s.ledger.assets[binding.asset];
    assert.ok(g && a); assert.equal(g.status, 'done'); assert.equal(g.source_url, null);
    assert.equal(a.shot, shot.id); assert.equal(a.kind, 'image'); assert.equal(a.textOnly, true); assert.equal(a.offlineSimulation, false);
  }
}
function proof(g, shot, nodeId, s) {
  audit(s);
  assert.equal(g.status, 'done'); assert.equal(g.kind, 'image'); assert.equal(g.nodeId, nodeId); assert.equal(g.model, MODEL);
  const b = s.bindings.find(b => b.gid === g.id), db = s.generations.find(d => d.id === g.id);
  assert.ok(b && db); assert.equal(b.idea_id, IDEA); assert.equal(db.idea_id, IDEA);
  assert.equal(b.shot, shot); assert.equal(b.node_id, nodeId); assert.equal(db.node_id, nodeId);
  assert.equal(db.status, 'done'); assert.equal(db.source_url, null);
  assert.equal(b.model, MODEL); assert.equal(b.kind, 'image'); assert.equal(db.kind, 'image'); assert.equal(db.model, MODEL);
  assert.equal(b.scope, s.scope); assert.equal(b.identityHash, db.expectedIdentity);
  assert.equal(b.inputHash, s.expected[shot].inputHash); assert.equal(b.asset, s.expected[shot].fingerprint);
  const r = s.ledger.requests.find(r => r.asset === b.asset), a = s.ledger.assets[b.asset];
  assert.ok(r && a && r.providerRequestId); assert.equal(r.providerReceipt?.providerRequestId, r.providerRequestId); assert.equal(r.providerReceipt?.model, ENDPOINT); assert.equal(a.providerRequestId, r.providerRequestId);
  assert.equal(a.requestFingerprint, b.asset); assert.equal(a.model, ENDPOINT); assert.equal(a.shot, shot);
  assert.equal(a.kind, 'image'); assert.equal(a.textOnly, true); assert.equal(a.offlineSimulation, false);
  assert.equal(db.inputs.prompt, plan.shots.find(s => s.shotId === shot).imagePrompt);
  assert.equal(g.inputs.prompt, db.inputs.prompt); assert.equal(g.inputs.sentPrompt ?? g.inputs.prompt, db.inputs.prompt);
  for (const inputs of [g.inputs, db.inputs]) {
    assert.equal(inputs.startFrame ?? null, null); assert.deepEqual(inputs.references ?? [], []);
    for (const k of ['reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages']) assert.ok(emptyReferenceValue(inputs[k]), 'Nonempty reference metadata: ' + k);
    assert.equal(inputs.count ?? 1, 1); assert.equal(inputs.aspectRatio ?? '9:16', '9:16');
  }
  assert.equal(path.dirname(a.path), 'media'); assert.equal(path.basename(a.path), b.asset + '.png');
  const bytes = localFile(STATE + '/engine/' + a.path, STATE);
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(hash(bytes), a.sha256); assert.equal(a.sha256, r.outputSha256); assert.equal(b.outputHash, a.sha256);
  if (r.normalization) {
    assert.deepEqual(a.normalization, r.normalization);
    assert.equal(r.normalization.providerRequestId, r.providerRequestId);
    assert.equal(r.normalization.outputSha256, a.sha256);
    assert.equal(r.normalization.rawPath, 'provider-originals/' + r.fingerprint + '.bin');
    assert.equal(hash(localFile(STATE + '/engine/' + r.normalization.rawPath, STATE)), r.normalization.rawSha256);
  }
  assert.equal(path.basename(db.file), db.file);
  assert.equal(hash(localFile(STATE + '/media/' + IDEA + '/gen/' + db.file, STATE)), a.sha256);
  return {binding: b, receipt: r, asset: a, sha256: a.sha256};
}
async function openCanvas() {
  await until(async () => ({flow: await page.locator('.react-flow').isVisible(), plans: await page.getByRole('button', {name: /^Plans(?:\s|$)/}).first().isVisible()}), v => v.flow || v.plans, 20000);
  if (await page.locator('.react-flow').isVisible()) return;
  await page.getByRole('button', {name: /^Plans(?:\s|$)/}).first().click();
  await page.getByRole('button', {name: 'Open plan', exact: true}).click();
  await page.getByRole('button', {name: 'Open the canvas', exact: true}).click();
  await page.locator('.react-flow').waitFor();
}
async function focusNode(nodeId) {
  const c = await read(PREFIX + '/canvas'), n = c.doc.nodes.find(n => n.id === nodeId);
  assert.ok(n); const doc = structuredClone(c.doc);
  doc.viewport = {x: 280 - n.position.x * .75, y: 150 - n.position.y * .75, zoom: .75};
  await call('PUT', PREFIX + '/canvas', {version: c.version, doc});
  await page.reload(); await openCanvas();
  const target = page.locator('.react-flow__node[data-id=' + JSON.stringify(nodeId) + ']');
  await target.waitFor();
  // Zoom/pan only from observed geometry; Playwright trial clicks also reject occlusion.
  for (let i = 0; i < 16; i++) {
    const title = target.locator('.fc-node-title'), run = target.getByRole('button', {name: 'Run', exact: true}).last();
    const boxes = await Promise.all([title.boundingBox(), run.boundingBox(), page.locator('.react-flow').boundingBox()]);
    const [t, r, f] = boxes; assert.ok(t && r && f);
    write('geometry-' + nodeId + '.json', boxes);
    try { await title.click({trial: true, timeout: 700}); await run.click({trial: true, timeout: 700}); return target; } catch (_) { /* bounded geometry recovery */ }
    if (Math.max(t.width, r.width) > f.width - 100 || Math.abs(r.y - t.y) > f.height - 180) {
      await page.getByRole('button', {name: 'Zoom out', exact: true}).click(); continue;
    }
    const dx = Math.max(-180, Math.min(180, 320 - t.x)), dy = Math.max(-180, Math.min(180, 170 - t.y));
    const point = await page.evaluate(({f, dx, dy}) => {
      for (let y = f.y + 100; y < Math.min(f.y + f.height - 30, 850); y += 40)
        for (let x = f.x + 30; x < f.x + f.width - 30; x += 50) {
          if (x + dx < f.x || x + dx > f.x + f.width || y + dy < f.y || y + dy > f.y + f.height) continue;
          if (document.elementFromPoint(x, y)?.classList.contains('react-flow__pane')) return {x, y};
        }
      return null;
    }, {f, dx, dy});
    assert.ok(point, 'No observed blank pan surface');
    await page.mouse.move(point.x, point.y); await page.mouse.down({button: 'middle'});
    await page.mouse.move(point.x + dx, point.y + dy, {steps: 12}); await page.mouse.up({button: 'middle'});
  }
  throw Error('Cannot expose node title and Run safely: ' + nodeId);
}
async function select(g) {
  await page.getByRole('button', {name: /History/}).click();
  const c = await read(PREFIX + '/canvas'), index = [...c.generations].reverse().findIndex(x => x.id === g.id);
  assert.ok(index >= 0); const row = page.locator('.fc-history').nth(index);
  assert.equal(await row.locator('strong').innerText(), MODEL);
  assert.equal(new URL(await row.locator('img').getAttribute('src'), BASE).pathname, new URL(g.url, BASE).pathname);
  await row.getByRole('button', {name: 'Use this version', exact: true}).click();
  await until(() => read(PREFIX + '/canvas'), c => {
    const n = c.doc.nodes.find(n => n.id === g.nodeId);
    assert.equal(n?.shotId, result.activeShot); return n.data.selected === g.id;
  });
  await page.screenshot({path: path.join(out, result.activeShot + '-selected.png')});
  await page.getByRole('button', {name: /History/}).click();
}
async function main() {
  try {
    const args = {}, argv = process.argv.slice(2); assert.equal(argv.length % 2, 0);
    for (let i = 0; i < argv.length; i += 2) {
      assert.ok(['--state', '--out', '--cap'].includes(argv[i])); assert.ok(!Object.hasOwn(args, argv[i])); args[argv[i]] = argv[i + 1];
    }
    assert.equal(args['--state'], STATE); assert.equal(args['--cap'] ?? '0.12', '0.12'); assert.ok(args['--out']);
    const candidate = path.resolve(args['--out']), evidence = fs.realpathSync(B + '/evidence');
    assert.equal(path.dirname(candidate), evidence, '--out must be a new direct child of batch evidence');
    fs.mkdirSync(candidate, {recursive: false}); out = candidate; save();
    fs.writeFileSync(path.join(out, 'disclosure.txt'), disclosure + '\n');
    assert.equal(fs.realpathSync(STATE), STATE);
    standalone = await request.newContext(); api = standalone;
    stage = 'first HTTP: live status'; save();
    const status = await read('/api/batch/status'); gateStatus(status); result.preflight = status;
    plan = JSON.parse(localFile(STATE + '/frozen-plan.json', STATE)); assert.equal(plan.shots.length, 21);
    assert.deepEqual(plan.caps, {fal: 4, openrouter: 3, total: 7});
    for (const s of plan.shots) { assert.equal(s.imageModel, ENDPOINT); assert.equal(s.imageProvider, 'fal'); assert.deepEqual(s.imageInputs, []); }
    result.frozenPlanSha256 = hash(localFile(STATE + '/frozen-plan.json', STATE)); assert.equal(result.frozenPlanSha256, manifest.repairPlanSha256);
    parentGate();
    before = snapshot(); write('ledger-before.json', before);
    initialFingerprints = before.ledger.requests.map(r => r.fingerprint); initialReserved = Number(before.ledger.reserved.fal);
    initialGenerations = before.generations.map(g => g.id); audit(before); assert.equal(status.requests, before.ledger.requests.length);
    const doneShots = SHOTS.filter(shot => before.ledger.requests.some(r => r.shot === shot));
    assert.deepEqual(doneShots, SHOTS.slice(0, doneShots.length), 'only proven completed prefix can resume');
    result.reused = before.ledger.requests.length === 3; result.initialDone = before.ledger.requests.length;
    pass('repair parent QUALITY_HOLD, original caps/quota and owned ledger entry gate');
    stage = 'owned browser login'; save();
    const executablePath = APP + '/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell';
    assert.ok(fs.statSync(executablePath).isFile());
    browser = await chromium.launch({executablePath, headless: true, env: cleanEnv});
    ctx = await browser.newContext({viewport: {width: 1440, height: 900}, recordVideo: {dir: path.join(out, 'recording'), size: {width: 1440, height: 900}}, serviceWorkers: 'block'});
    assert.equal(typeof ctx.routeWebSocket, 'function'); await ctx.routeWebSocket('**/*', socket => socket.close());
    await ctx.route('**/*', async route => {
      const req = route.request(), u = new URL(req.url());
      try {
        if (!allowed(u.href)) {
          (result.blockedDestinations ??= []).push(u.origin); save();
          await route.abort('blockedbyclient'); return;
        }
        if (!['GET', 'HEAD'].includes(req.method())) {
          assert.equal(u.origin, BASE);
          if (req.method() === 'POST' && u.pathname === PREFIX + '/gen') {
            assert.ok(armed && posts < 3 - result.initialDone && !result.reused, 'Unarmed/duplicate generation POST');
            assert.ok(!before.ledger.requests.some(r => r.shot === result.activeShot), 'completed repair cannot be resubmitted');
            const body = req.postDataJSON(); assert.equal(body.nodeId, armed.nodeId); assert.equal(body.model, MODEL);
            // Quote and binding validate final inputs; no other shot or kind is allowed out.
            assert.equal(body.kind ?? 'image', 'image'); assert.equal(body.confirm, true);
            assert.equal(body.prompt, plan.shots.find(s => s.shotId === result.activeShot).imagePrompt);
            assert.equal(body.startFrame ?? null, null); assert.deepEqual(body.references ?? [], []);
            assert.equal(body.count, 1); assert.equal(body.aspectRatio, '9:16');
            assert.equal(body.duration ?? null, null);
            posts++; armed = null; save();
          } else if (req.method() === 'PUT' && u.pathname === '/api/ideas') {
            validateIdeaSave(req.postDataJSON(), snapshot());
          } else assert.ok((req.method() === 'POST' && u.pathname === '/api/auth/login') ||
            (req.method() === 'PUT' && u.pathname === PREFIX + '/canvas'), 'Unapproved mutation: ' + req.method() + ' ' + u.pathname);
        }
        await route.continue();
      } catch (e) { result.errors.push(String(e)); save(); await route.abort('blockedbyclient'); }
    });
    page = await ctx.newPage(); page.setDefaultTimeout(20000);
    page.on('pageerror', e => { result.errors.push(String(e)); save(); });
    await page.goto(BASE);
    if (!await page.locator('#login-email').isVisible()) await page.getByRole('button', {name: /^Log in/}).first().click();
    await page.locator('#login-email').fill('test@example.com'); await page.locator('#login-password').fill('pw-for-e2e');
    const login = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/login');
    await page.getByRole('button', {name: /^Log in/}).last().click(); assert.equal((await login).status(), 200);
    await page.getByText('Client dashboard', {exact: true}).first().waitFor();
    await page.getByRole('button', {name: 'Ever Green', exact: true}).first().click();
    api = ctx.request; await standalone.dispose(); standalone = null;
    let c = await read(PREFIX + '/canvas'); originalDoc = structuredClone(c.doc); write('canvas-before.json', c);
    assert.deepEqual(c.generations.map(g => g.id).sort(), initialGenerations.slice().sort());
    assert.equal(c.doc.nodes.filter(n => n.type === 'shot').length, 21);
    assert.deepEqual(c.doc.nodes.filter(n => n.type === 'storyboard').map(n => n.shotId).sort(), SHOTS.slice().sort());
    assert.ok(c.doc.nodes.every(n => ['shot', 'storyboard'].includes(n.type)));
    for (const shot of SHOTS) {
      const n = c.doc.nodes.find(n => n.type === 'storyboard' && n.shotId === shot); assert.ok(n);
      const f = plan.shots.find(f => f.shotId === shot);
      for (const [k, v] of Object.entries({model: MODEL, prompt: f.imagePrompt, aspectRatio: '9:16', count: 1, shotTextOff: true})) assert.equal(n.data[k], v);
    }
    for (const db of before.generations) {
      const b = before.bindings.find(b => b.gid === db.id), g = c.generations.find(g => g.id === db.id);
      proof(g, b.shot, b.node_id, before); assert.equal(c.doc.nodes.find(n => n.id === b.node_id)?.data.selected, g.id);
    }
    pass('21 native shot skeleton, only three fixed repair slots, prior outputs proven');
    for (const shot of SHOTS) {
      result.activeShot = shot; stage = shot + ' focus'; save();
      gateStatus(await read('/api/batch/status')); audit(snapshot()); assert.equal(result.errors.length, 0);
      assert.equal(hash(localFile(STATE + '/frozen-plan.json', STATE)), result.frozenPlanSha256);
      c = await read(PREFIX + '/canvas'); const n = c.doc.nodes.find(n => n.type === 'storyboard' && n.shotId === shot);
      const target = await focusNode(n.id); let g = c.generations.find(g => g.nodeId === n.id), quote = null;
      if (!g) {
        assert.ok(!result.reused); stage = shot + ' quote'; save();
        await target.getByRole('button', {name: 'Run', exact: true}).last().click();
        const dialog = page.getByRole('dialog', {name: 'Confirm generation', exact: true}); await dialog.waitFor();
        quote = await dialog.innerText(); assert.ok(!/OFFLINE/i.test(quote)); assert.match(quote, /Seedream 4\.5/);
        assert.match(quote, /×\s*1/); const prices = [...quote.matchAll(/US\$\s*([0-9.]+)/g)];
        assert.ok(prices.length); assert.equal(Number(prices[0][1]), .04);
        assert.equal(Number((await dialog.locator('strong').innerText()).match(/^US\$\s*([0-9.]+)$/)?.[1]), .04);
        console.log(JSON.stringify({shot, model: MODEL, account: '既有 fal 預付帳戶', quoteUsd: .04, capUsd: .04, pilotCapUsd: .12, combinedFalMaximumUsd: 2.96, parentQualityHold: true}));
        await page.screenshot({path: path.join(out, shot + '-quote.png')}); write(shot + '-quote.json', {shot, nodeId: n.id, quote, at: new Date().toISOString()});
        audit(snapshot()); assert.equal(result.errors.length, 0);
        stage = shot + ' confirm once'; armed = {nodeId: n.id}; save();
        const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/gen');
        await dialog.getByRole('button', {name: 'Confirm and run', exact: true}).click();
        const response = await responsePromise; assert.equal(response.status(), 201); g = await response.json();
        assert.ok(g.id); assert.equal(g.nodeId, n.id); assert.equal(g.kind, 'image'); assert.equal(g.model, MODEL);
        result.sourceIDs[shot] = g.id; write(shot + '-submitted.json', {g, at: new Date().toISOString()}); save();
        stage = shot + ' GET polling only'; save();
        g = await until(() => read(PREFIX + '/gen/' + g.id), v => {
          if (['failed', 'unknown'].includes(v.status)) throw Error('STOP: ' + v.status + ', no retry');
          return v.status === 'done';
        }, 900000);
      }
      result.sourceIDs[shot] = g.id;
      const s = snapshot(), p = proof(g, shot, n.id, s);
      const bytes = await (await call('GET', g.url)).body(); assert.equal(hash(bytes), p.sha256);
      fs.writeFileSync(path.join(out, shot + '.png'), bytes);
      write(shot + '-proof.json', {g, rawInputs: g.inputs, quote, ...p, at: new Date().toISOString(), reused: initialGenerations.includes(g.id)});
      result.images.push({shotId: shot, nodeId: n.id, id: g.id, sha256: p.sha256, providerRequestId: p.receipt.providerRequestId,
        rawSha256: p.receipt.normalization?.rawSha256 ?? null, parentLedgerSha256: manifest.baseLedgerSha256, requiresVisualQA: true, actualUsd: p.receipt.actualUsd, reservationUsd: p.receipt.reservationUsd, billingEstimateUsd: p.receipt.billingEstimateUsd ?? null, reused: initialGenerations.includes(g.id)});
      stage = shot + ' UI History Use'; save(); await select(g); write('ledger-after-' + shot + '.json', snapshot());
      pass(shot + ' proven text-only output, downloaded and selected through UI');
    }
    stage = 'final audit'; const after = snapshot(); audit(after); write('ledger-after.json', after);
    assert.equal(after.ledger.requests.length, 3); assert.equal(posts, 3 - result.initialDone);
    await page.reload(); await openCanvas(); c = await read(PREFIX + '/canvas'); write('canvas-after.json', c);
    assert.deepEqual(c.doc.nodes.map(n => n.id).sort(), originalDoc.nodes.map(n => n.id).sort());
    assert.deepEqual(c.doc.edges, originalDoc.edges);
    for (const n of originalDoc.nodes) {
      assert.deepEqual(c.doc.nodes.find(x => x.id === n.id).position, n.position);
      if (!result.images.some(i => i.nodeId === n.id)) assert.equal(c.doc.nodes.find(x => x.id === n.id).data.selected, n.data.selected);
    }
    for (const image of result.images) {
      assert.equal(c.doc.nodes.find(n => n.id === image.nodeId)?.data.selected, image.id);
      proof(c.generations.find(g => g.id === image.id), image.shotId, image.nodeId, after);
    }
    assert.equal(result.errors.length, 0); result.status = 'PASS'; stage = 'repair pilot complete, visual QA and promotion still pending'; save();
  } catch (e) {
    result.errors.push(String(e.stack || e)); process.exitCode = 1;
    if (page && out) await page.screenshot({path: path.join(out, 'failure.png'), fullPage: true}).catch(() => {});
  } finally {
    armed = null;
    if (out) { try { write('ledger-final-observed.json', snapshot()); } catch (e) { result.errors.push('final observation: ' + e); } }
    if (ctx) {
      const videos = ctx.pages().map(p => p.video()).filter(Boolean);
      await ctx.close().catch(e => result.errors.push('owned context close: ' + e));
      for (const video of videos) result.recordings.push(await video.path().catch(() => 'unavailable'));
    }
    if (browser) await browser.close().catch(e => result.errors.push('owned browser close: ' + e));
    if (standalone) await standalone.dispose().catch(() => {});
    if (result.errors.length) { result.status = 'FAIL'; process.exitCode = 1; }
    save(); console.log(result.status, stage, out || '(no evidence directory)');
  }
}
module.exports = {emptyReferenceValue, validateIdeaSave};
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
