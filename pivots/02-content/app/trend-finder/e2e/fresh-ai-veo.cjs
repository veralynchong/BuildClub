/* Candidate: final nine OpenRouter Veo shots only; no provider fallback or retry.
 * --state EXACT_PRODUCTION_STATE --out NEW_BATCH_EVIDENCE_DIR [--cap 1.80]
 * --self-test runs pure helpers only. All 21 images + 12 fal videos must be proven first.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const cp = require('node:child_process');
// Playwright is loaded only inside live main(), never by helper tests.
const BASE = 'http://127.0.0.1:8978';
const B = '/Users/tommy/Downloads/buildclub-demo-reference/batch-20261106-fresh-ai';
const STATE = '/Users/tommy/Downloads/buildclub-demo-reference/fresh-ai-state-20261106';
const APP = '/Users/tommy/orca/workspaces/BuildClub/demo-readiness/pivots/02-content/app/trend-finder';
const IDEA = 'evergreen-fresh-ai-21', PREFIX = '/api/ideas/' + IDEA;
const IMAGE_MODEL = 'seedream-4.5', IMAGE_ENDPOINT = 'fal-ai/bytedance/seedream/v4.5/text-to-image';
const VIDEO_MODEL = 'hailuo-2.3-fast', VIDEO_ENDPOINT = 'fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video';
const VEO_MODEL = 'veo-lite-openrouter', VEO_ENDPOINT = 'google/veo-3.1-lite';
const VEO_SHOTS = Array.from({length: 9}, (_, i) => 's' + (i + 13));
const FROZEN_SHA = '032cd86a787f32e19ae26dd62d9696b5485e7cec12f95cae99c2508668136908';
const PILOT = {
  s1: ['tKlUDgBaRCXx', '01a1ae39-9bfc-73d1-a5a1-23201d91421d', 'ceb81fcdad067969312a5aa8268cd4c7c78fb700ad1d8ca0cfaf6f1faf47d4ef'],
  s14: ['AFYbFnOKSeWh', '01a1ae46-afd5-7bd3-8ceb-da77b3ef22c2', 'fcb59f3d4e764da6abde589beb7d1344ed3590d0213fbf7551666bf52c1073c6'],
  s20: ['5rZXVJAAm43J', '01a1ae47-178e-7b10-b9c8-159e66c4c2e9', '863b76e62353726e3c1ec743e93d78484f80a61f16a1fddca3531f38c6bfaf62'],
};
const ALL = Array.from({length: 21}, (_, i) => 's' + (i + 1));
const REMAINING = ALL.filter(s => !PILOT[s]);
const FAL_VIDEO = ALL.slice(0, 12);
const config = {kind: 'video', model: VEO_MODEL, endpoint: VEO_ENDPOINT, shots: VEO_SHOTS, capCents: 180, eachCents: 20, maxPosts: 9, label: /Veo Lite - OpenRouter/};
const disclosure = 'LIVE final-nine Veo-only phase: s13-s21, 4 seconds, 1080p, portrait 9:16, audio false, same-shot proven fresh AI first frame only. At most nine new OpenRouter POSTs / US$1.80 reservation; existing proven outputs are reused. All prior fal requests/assets remain immutable. No fallback, correction run, export or final approval. Unknown actualUsd stays unknown; estimates/reservations are not invoices. The recorded s14 extra-butter visual limitation is unchanged.';
let out, api, standalone, browser, ctx, page, stage = 'arguments', armed = null, posts = 0;
let plan, before, originalDoc, preparedDoc, initialGenerations = [], initialFingerprints = [], initialReserved = 0;
let missingAtEntry = [];
const result = {status: 'FAIL', disclosure, mode: 'veo', base: BASE, state: STATE, cap: 1.80, checks: [], errors: [], outputs: [], reusedOutputs: [], sourceIDs: {}, recordings: []};
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
  return u.protocol === 'http:' && u.hostname === '127.0.0.1' && ['8978', '8979', '8980'].includes(u.port) && !u.username && !u.password;
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
if (s/'data.db').is_symlink():raise ValueError('database symlink')
c=sqlite3.connect('file:'+str(s/'data.db')+'?mode=ro',uri=True);c.row_factory=sqlite3.Row
bs=[dict(r) for r in c.execute('SELECT * FROM batch_bindings')]
gs=[dict(r) for r in c.execute('SELECT id,idea_id,node_id,kind,model,inputs,status,file,source_url FROM generations')]
for g in gs:
 raw=json.loads(g['inputs']);g['inputs']=raw
 b=next((b for b in bs if b['gid']==g['id']),None)
 if b:g['expectedIdentity']=h([g['idea_id'],g['node_id'],g['kind'],g['model'],raw,b['shot']])
expected={'image':{},'video':{}}
ledger=json.loads((s/'engine/runtime-ledger.json').read_text())
for t in p['shots']:
 body=dict(model=t['imageModel'],prompt=t['imagePrompt'],num_images=1,max_images=1,image_size='portrait_16_9',enable_safety_checker=True)
 fp=h(['fal','image',body])
 expected['image'][t['shotId']]=dict(inputHash=h(body),fingerprint=fp,payloadSha256=hashlib.sha256(json.dumps(body,sort_keys=True).encode()).hexdigest(),submitPayloadSha256=hashlib.sha256(json.dumps({k:v for k,v in body.items() if k!='model'},separators=(',',':')).encode()).hexdigest())
 if t['videoProvider'] in ('fal','openrouter'):
  body=dict(model=t['videoModel'],prompt=t['videoPrompt'],firstImage=fp)
  if t['videoProvider']=='fal':body.update(duration='6',prompt_optimizer=False,enable_safety_checker=True)
  else:body.update(duration=4,resolution='1080p',aspect_ratio='9:16',generate_audio=False)
  entry=dict(inputHash=h(body),fingerprint=h([t['videoProvider'],'video',body]))
  if any(r['kind']=='video' and r['shot']==t['shotId'] for r in ledger['requests']):
   import base64
   image=s/'engine'/'media'/(fp+'.png')
   if image.is_symlink() or image.parent.is_symlink():raise ValueError('source symlink')
   outgoing={k:v for k,v in body.items() if k!='firstImage'}
   uri='data:image/png;base64,'+base64.b64encode(image.read_bytes()).decode()
   if t['videoProvider']=='fal':outgoing['image_url']=uri
   else:outgoing['frame_images']=[dict(type='image_url',image_url=dict(url=uri),frame_type='first_frame')]
   entry['payloadSha256']=hashlib.sha256(json.dumps(outgoing,sort_keys=True).encode()).hexdigest()
   submitted={k:v for k,v in outgoing.items() if k!='model'} if t['videoProvider']=='fal' else outgoing
   entry['submitPayloadSha256']=hashlib.sha256(json.dumps(submitted,separators=(',',':')).encode()).hexdigest()
  expected['video'][t['shotId']]=entry
c.close()
print(json.dumps(dict(bindings=bs,generations=gs,expected=expected,scope=h([p,str((s/'engine').resolve()),str(s/'media')]))))
`], {encoding: 'utf8', timeout: 10000}));
  return {ledger, ...proof};
}
function gateStatus(s) {
  assert.equal(s.mode, 'live'); assert.equal(s.generationEnabled, true); assert.equal(s.keys?.fal, true); assert.equal(s.keys?.openrouter, true);
  assert.deepEqual(s.approvedCaps, {fal: 4, openrouter: 3, total: 7}); assert.equal(s.ledger?.halted, false);
}
function cents(value) {
  const n = Number(value); assert.ok(Number.isFinite(n) && n >= 0);
  assert.ok(Math.abs(n * 100 - Math.round(n * 100)) < 1e-7); return Math.round(n * 100);
}
function validateLedger(s) {
  assert.equal(s.ledger.mode, 'live'); assert.equal(s.ledger.policy, 'seedream-fal4-openrouter3');
  assert.deepEqual(s.ledger.caps, {fal: '4.00', openrouter: '3.00'}); assert.equal(s.ledger.halted, false);
  assert.ok(s.ledger.requests.length <= 42); assert.equal(s.generations.length, s.ledger.requests.length);
  assert.equal(s.bindings.length, s.generations.length); assert.equal(Object.keys(s.ledger.assets).length, s.ledger.requests.length);
  const seen = new Set(), ids = new Set(), counts = {image: 0, falVideo: 0, veo: 0};
  for (const r of s.ledger.requests) {
    assert.ok(['image', 'video'].includes(r.kind) && ALL.includes(r.shot));
    const image = r.kind === 'image', veo = !image && VEO_SHOTS.includes(r.shot);
    assert.ok(!seen.has(r.kind + ':' + r.shot)); seen.add(r.kind + ':' + r.shot);
    assert.equal(r.provider, veo ? 'openrouter' : 'fal'); assert.equal(r.model, image ? IMAGE_ENDPOINT : veo ? VEO_ENDPOINT : VIDEO_ENDPOINT);
    assert.equal(r.offlineSimulation, false); assert.equal(r.textOnly, image); assert.equal(r.state, 'done', 'Unresolved request: STOP, never resubmit');
    assert.ok(typeof r.providerRequestId === 'string' && r.providerRequestId && !ids.has(r.providerRequestId)); ids.add(r.providerRequestId);
    assert.equal(cents(r.reservationUsd), image ? 4 : 20);
    assert.ok(r.actualUsd === null || (Number.isFinite(r.actualUsd) && r.actualUsd >= 0 && r.actualUsd <= Number(r.reservationUsd)));
    const e = s.expected[r.kind][r.shot]; assert.ok(e);
    assert.equal(r.fingerprint, e.fingerprint); assert.equal(r.asset, r.fingerprint); assert.equal(r.payloadSha256, e.payloadSha256);
    if (image) assert.equal(r.imageInput, null); else sameShotSource(r, s);
    counts[image ? 'image' : veo ? 'veo' : 'falVideo']++;
  }
  assert.ok(counts.image <= 21 && counts.falVideo <= 12 && counts.veo <= 9);
  assert.equal(cents(s.ledger.reserved.fal), counts.image * 4 + counts.falVideo * 20);
  assert.equal(cents(s.ledger.reserved.openrouter), counts.veo * 20);
  assert.ok(cents(s.ledger.reserved.fal) <= 400 && cents(s.ledger.reserved.openrouter) <= 300);
  assert.ok(cents(s.ledger.reserved.fal) + cents(s.ledger.reserved.openrouter) <= 700);
  assert.equal(cents(s.ledger.categories.image), 0); assert.equal(cents(s.ledger.categories.video), counts.veo * 20);
  return counts;
}
function sameShotSource(r, s) {
  const image = s.ledger.requests.find(i => i.kind === 'image' && i.shot === r.shot);
  assert.ok(image && image.state === 'done' && image.textOnly === true && image.offlineSimulation === false);
  const a = s.ledger.assets[image.asset]; assert.ok(a);
  assert.equal(a.shot, r.shot); assert.equal(a.kind, 'image'); assert.equal(a.textOnly, true); assert.equal(a.offlineSimulation, false);
  assert.equal(r.imageInput?.asset, image.asset); assert.equal(r.imageInput?.sha256, image.outputSha256);
  assert.equal(a.sha256, image.outputSha256); assert.equal(r.imageInput?.parentRequestId, image.providerRequestId);
  return image;
}
function validateEntry(s) {
  const counts = validateLedger(s); assert.equal(counts.image, 21); assert.equal(counts.falVideo, 12);
  const done = VEO_SHOTS.filter(shot => s.ledger.requests.some(r => r.kind === 'video' && r.shot === shot));
  assert.deepEqual(done, VEO_SHOTS.slice(0, done.length), 'completed Veo subset must be a safe prefix');
  return VEO_SHOTS.filter(shot => !done.includes(shot));
}
function audit(s) {
  validateLedger(s);
  const added = s.ledger.requests.filter(r => !initialFingerprints.includes(r.fingerprint));
  assert.equal(added.length, posts, 'global request count drift');
  for (const r of before.ledger.requests) {
    assert.deepEqual(s.ledger.requests.find(x => x.fingerprint === r.fingerprint), r, 'prior request changed');
    assert.deepEqual(s.ledger.assets[r.asset], before.ledger.assets[r.asset], 'prior asset changed');
  }
  assert.ok(added.every(r => r.kind === 'video' && r.provider === 'openrouter' && missingAtEntry.includes(r.shot)));
  assert.ok(posts <= missingAtEntry.length && posts <= 9);
  assert.equal(cents(s.ledger.reserved.fal), cents(before.ledger.reserved.fal));
  assert.equal(cents(s.ledger.reserved.openrouter) - initialReserved, posts * 20);
  assert.ok(cents(s.ledger.reserved.openrouter) - initialReserved <= 180);
}
function emptyReferenceValue(v) {
  return v == null || (Array.isArray(v) && v.length === 0) ||
    (typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).length === 0);
}
function validateIdeaSave(items, s) {
  assert.ok(Array.isArray(items)); assert.equal(items.length, 1);
  const idea = items[0]; assert.equal(idea.id, IDEA); assert.equal(idea.clientId, 'evergreen-fresh-ai');
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
function proof(g, shot, nodeId, s, frozen = plan, readBytes = file => localFile(file, STATE)) {
  validateLedger(s);
  const kind = g.kind, image = kind === 'image', veo = !image && VEO_SHOTS.includes(shot), model = image ? IMAGE_MODEL : veo ? VEO_MODEL : VIDEO_MODEL;
  assert.equal(g.status, 'done'); assert.ok(image || kind === 'video'); assert.equal(g.nodeId, nodeId); assert.equal(g.model, model);
  const b = s.bindings.find(b => b.gid === g.id), db = s.generations.find(d => d.id === g.id);
  assert.ok(b && db); assert.equal(b.idea_id, IDEA); assert.equal(db.idea_id, IDEA);
  assert.equal(b.shot, shot); assert.equal(b.node_id, nodeId); assert.equal(db.node_id, nodeId);
  assert.equal(db.status, 'done'); assert.equal(db.source_url, null);
  assert.equal(b.model, model); assert.equal(b.kind, kind); assert.equal(db.kind, kind); assert.equal(db.model, model);
  assert.equal(b.scope, s.scope); assert.equal(b.identityHash, db.expectedIdentity);
  assert.equal(b.inputHash, s.expected[kind][shot].inputHash); assert.equal(b.asset, s.expected[kind][shot].fingerprint);
  const r = s.ledger.requests.find(r => r.asset === b.asset), a = s.ledger.assets[b.asset];
  assert.ok(r && a && r.providerRequestId); assert.equal(a.providerRequestId, r.providerRequestId);
  assert.equal(r.providerReceipt?.providerRequestId, r.providerRequestId); assert.equal(r.providerReceipt?.model, r.model);
  assert.equal(r.providerReceipt?.requestPayloadSha256, s.expected[kind][shot].submitPayloadSha256);
  if (veo) {
    assert.equal(r.providerReceipt?.submitEndpoint, 'https://openrouter.ai/api/v1/videos');
    assert.equal(r.providerReceipt?.pollUrl, 'https://openrouter.ai/api/v1/videos/' + r.providerRequestId);
  } else {
    assert.equal(r.providerReceipt?.submitEndpoint, 'https://queue.fal.run/' + r.model);
    const poll = new URL(r.providerReceipt.pollUrl); assert.equal(poll.protocol, 'https:'); assert.equal(poll.hostname, 'queue.fal.run');
    assert.ok(!poll.username && !poll.password && !poll.search && !poll.hash && (!poll.port || poll.port === '443'));
    assert.ok(poll.pathname.endsWith('/requests/' + r.providerRequestId + '/status'));
  }
  assert.equal(a.requestFingerprint, b.asset); assert.equal(a.model, image ? IMAGE_ENDPOINT : veo ? VEO_ENDPOINT : VIDEO_ENDPOINT); assert.equal(a.shot, shot);
  assert.equal(a.kind, kind); assert.equal(a.textOnly, image); assert.equal(a.offlineSimulation, false);
  assert.equal(db.inputs.prompt, frozen.shots.find(s => s.shotId === shot)[kind + 'Prompt']);
  assert.deepEqual(g.inputs, db.inputs);
  for (const inputs of [g.inputs, db.inputs]) {
    assert.equal(inputs.sentPrompt ?? inputs.prompt, db.inputs.prompt); assert.deepEqual(inputs.references ?? [], []);
    for (const k of ['reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages']) assert.ok(emptyReferenceValue(inputs[k]), 'Nonempty reference metadata: ' + k);
    assert.equal(inputs.count ?? 1, 1); assert.equal(inputs.aspectRatio ?? '9:16', '9:16');
    assert.equal(inputs.duration ?? null, image ? null : veo ? 4 : 6);
    if (veo) { assert.equal(inputs.resolution ?? '1080p', '1080p'); assert.equal(inputs.generate_audio ?? false, false); }
    if (image) assert.equal(inputs.startFrame ?? null, null);
    else {
      const source = sameShotSource(r, s), sourceBinding = s.bindings.find(b => b.asset === source.asset);
      assert.ok(sourceBinding); assert.equal(sourceBinding.shot, shot); assert.equal(sourceBinding.kind, 'image');
      assert.equal(inputs.startFrame, sourceBinding.gid);
    }
  }
  const ext = image ? '.png' : '.mp4'; assert.equal(path.dirname(a.path), 'media'); assert.equal(path.basename(a.path), b.asset + ext);
  const bytes = readBytes(STATE + '/engine/' + a.path);
  assert.equal(image ? bytes.subarray(0, 8).toString('hex') : bytes.subarray(4, 8).toString(), image ? '89504e470d0a1a0a' : 'ftyp');
  assert.equal(hash(bytes), a.sha256); assert.equal(a.sha256, r.outputSha256); assert.equal(b.outputHash, a.sha256);
  if (image) {
    assert.ok(r.normalization, 'every production image must retain normalized/raw provenance');
    assert.deepEqual(a.normalization, r.normalization); assert.equal(r.normalization.providerRequestId, r.providerRequestId);
    assert.equal(r.normalization.outputSha256, a.sha256); assert.equal(r.normalization.rawPath, 'provider-originals/' + r.fingerprint + '.bin');
    assert.equal(hash(readBytes(STATE + '/engine/' + r.normalization.rawPath)), r.normalization.rawSha256);
  }
  assert.equal(path.basename(db.file), db.file); assert.equal(db.file, g.id + ext);
  assert.equal(hash(readBytes(STATE + '/media/' + IDEA + '/gen/' + db.file)), a.sha256);
  return {binding: b, receipt: r, asset: a, sha256: a.sha256};
}
function assertPilot(s) {
  for (const [shot, [gid, rid, sha]] of Object.entries(PILOT)) {
    const b = s.bindings.find(b => b.gid === gid), r = s.ledger.requests.find(r => r.providerRequestId === rid);
    assert.ok(b && r); assert.equal(b.shot, shot); assert.equal(r.shot, shot); assert.equal(r.outputSha256, sha); assert.equal(b.outputHash, sha);
  }
}
function validatePost(body, armedNode, shot, cfg, frozen, sourceGid) {
  assert.ok(cfg.shots.includes(shot)); assert.equal(body.nodeId, armedNode); assert.equal(body.model, cfg.model);
  assert.equal(body.kind ?? cfg.kind, cfg.kind); assert.equal(body.confirm, true);
  assert.equal(body.prompt, frozen.shots.find(s => s.shotId === shot)[cfg.kind + 'Prompt']);
  assert.deepEqual(body.references ?? [], []); assert.equal(body.count ?? 1, 1); assert.equal(body.aspectRatio ?? '9:16', '9:16');
  assert.equal(body.startFrame ?? null, cfg.kind === 'image' ? null : sourceGid);
  assert.equal(body.duration, 4); assert.equal(body.resolution ?? '1080p', '1080p');
  assert.equal(body.generate_audio ?? false, false); assert.equal(body.generateAudio ?? false, false);
  for (const k of ['reference', 'kit', 'kitStamp', 'kitRefs', 'kitImages']) assert.ok(emptyReferenceValue(body[k]));
}
function quoteValue(text, strong, cfg) {
  assert.ok(!/OFFLINE/i.test(text)); assert.match(text, cfg.label);
  if (cfg.kind === 'image') assert.match(text, /×\s*1/);
  const price = Number(strong.match(/^US\$\s*([0-9.]+)$/)?.[1]);
  assert.ok(Number.isFinite(price) && price > 0 && price <= cfg.eachCents / 100);
  if (cfg.kind === 'image') assert.equal(price, .04);
  return price;
}
function prepareVideos(doc, frozen, generations) {
  const next = structuredClone(doc);
  for (const shot of VEO_SHOTS) {
    const f = frozen.shots.find(s => s.shotId === shot); assert.equal(f.videoProvider, 'openrouter'); assert.equal(f.videoModel, VEO_ENDPOINT); assert.equal(f.duration, 4);
    const images = next.nodes.filter(n => n.type === 'storyboard' && n.shotId === shot); assert.equal(images.length, 1);
    const source = images[0]; assert.ok(source.data.selected);
    const nodes = next.nodes.filter(n => n.type === 'video' && n.shotId === shot); assert.ok(nodes.length <= 1);
    let n = nodes[0];
    const settings = {model: VEO_MODEL, prompt: f.videoPrompt, duration: 4, resolution: '1080p', aspectRatio: '9:16', shotTextOff: true};
    if (!n) {
      assert.equal(generations.filter(g => g.model === VEO_MODEL).length, 0, 'never add missing node during partial video run');
      const id = 'n_fresh_veo_' + shot; assert.ok(!next.nodes.some(n => n.id === id));
      n = {id, type: 'video', shotId: shot, position: {x: source.position.x + 650, y: source.position.y}, data: {...settings, selected: null}};
      next.nodes.push(n);
    } else if (!generations.some(g => g.model === VEO_MODEL)) n.data = {...n.data, ...settings};
    for (const [k, v] of Object.entries(settings)) assert.equal(n.data[k], v);
    const inputs = next.edges.filter(e => e.target === n.id);
    assert.ok(inputs.every(e => e.targetHandle === 'in:start' && e.source === source.id), 'foreign video input edge');
    assert.ok(inputs.length <= 1);
    if (!inputs.length) {
      assert.equal(generations.filter(g => g.model === VEO_MODEL).length, 0);
      const id = 'e_fresh_veo_start_' + shot; assert.ok(!next.edges.some(e => e.id === id));
      next.edges.push({id, source: source.id, sourceHandle: 'out', target: n.id, targetHandle: 'in:start'});
    }
  }
  return next;
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
  assert.equal(await row.locator('strong').innerText(), g.model);
  if (g.kind === 'image') assert.equal(new URL(await row.locator('img').getAttribute('src'), BASE).pathname, new URL(g.url, BASE).pathname);
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
    assert.equal(args['--state'], STATE); assert.equal(args['--cap'] ?? (config.capCents / 100).toFixed(2), (config.capCents / 100).toFixed(2)); assert.ok(args['--out']);
    const {chromium, request} = require('/Users/tommy/.hermes/hermes-agent/node_modules/playwright-core');
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
    for (const s of plan.shots) { assert.equal(s.imageModel, IMAGE_ENDPOINT); assert.equal(s.imageProvider, 'fal'); assert.deepEqual(s.imageInputs, []); }
    result.frozenPlanSha256 = hash(localFile(STATE + '/frozen-plan.json', STATE)); assert.equal(result.frozenPlanSha256, FROZEN_SHA);
    assert.deepEqual(plan.shots.map(s => s.shotId), ALL);
    assert.deepEqual(plan.shots.filter(s => s.videoProvider === 'fal').map(s => s.shotId), FAL_VIDEO);
    assert.deepEqual(plan.shots.filter(s => s.videoProvider === 'openrouter').map(s => s.shotId), VEO_SHOTS);
    for (const f of plan.shots.filter(s => s.videoProvider === 'openrouter')) { assert.equal(f.videoModel, VEO_ENDPOINT); assert.equal(f.duration, 4); }
    before = snapshot(); write('ledger-before.json', before);
    initialFingerprints = before.ledger.requests.map(r => r.fingerprint); initialReserved = cents(before.ledger.reserved.openrouter);
    missingAtEntry = validateEntry(before); assertPilot(before); initialGenerations = before.generations.map(g => g.id);
    audit(before); assert.equal(status.requests, before.ledger.requests.length); result.missingAtEntry = missingAtEntry;
    result.reusedAtEntry = before.ledger.requests.length; pass('live gate, frozen plan, bounded completed-prefix reentry');
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
            assert.ok(armed && posts < config.maxPosts && posts < missingAtEntry.length, 'Unarmed/duplicate generation POST');
            assert.ok(missingAtEntry.includes(result.activeShot));
            validatePost(req.postDataJSON(), armed.nodeId, result.activeShot, config, plan, armed.sourceGid);
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
    // Every existing generation is proven before any preparation or new POST.
    for (const db of before.generations) {
      const g = c.generations.find(g => g.id === db.id), b = before.bindings.find(b => b.gid === db.id);
      assert.ok(g && b); const p = proof(g, b.shot, b.node_id, before);
      const node = c.doc.nodes.find(n => n.id === b.node_id); assert.ok(node); assert.equal(node.shotId, b.shot);
      assert.equal(node.data.selected, g.id, 'entry outputs must be selected natively');
      result.reusedOutputs.push({id: g.id, shotId: b.shot, kind: g.kind, sha256: p.sha256, providerRequestId: p.receipt.providerRequestId, actualUsd: p.receipt.actualUsd, rawSha256: p.receipt.normalization?.rawSha256 ?? p.sha256});
    }
    for (const f of plan.shots) {
      const n = c.doc.nodes.find(n => n.type === 'storyboard' && n.shotId === f.shotId); assert.ok(n);
      for (const [k, v] of Object.entries({model: IMAGE_MODEL, prompt: f.imagePrompt, aspectRatio: '9:16', count: 1, shotTextOff: true})) assert.equal(n.data[k], v);
    }
    {
      const doc = prepareVideos(c.doc, plan, c.generations);
      if (JSON.stringify(doc) !== JSON.stringify(c.doc)) await call('PUT', PREFIX + '/canvas', {version: c.version, doc});
      c = await read(PREFIX + '/canvas');
    }
    preparedDoc = structuredClone(c.doc); pass('all prior output bytes and same-shot native selections proven; graph preserved');
    for (const shot of config.shots) {
      result.activeShot = shot; stage = shot + ' focus'; save();
      const live = await read('/api/batch/status'); gateStatus(live);
      const observed = snapshot(); audit(observed); assert.equal(live.requests, observed.ledger.requests.length); assert.equal(result.errors.length, 0);
      assert.equal(hash(localFile(STATE + '/frozen-plan.json', STATE)), FROZEN_SHA);
      c = await read(PREFIX + '/canvas'); const nodes = c.doc.nodes.filter(n => n.type === (config.kind === 'image' ? 'storyboard' : 'video') && n.shotId === shot); assert.equal(nodes.length, 1); const n = nodes[0];
      let sourceGid;
      if (config.kind === 'video') {
        const source = c.doc.nodes.find(n => n.type === 'storyboard' && n.shotId === shot);
        sourceGid = source.data.selected; const sourceG = c.generations.find(g => g.id === sourceGid); assert.ok(sourceG); proof(sourceG, shot, source.id, observed);
        assert.equal(n.data.model, VEO_MODEL); assert.equal(n.data.prompt, plan.shots.find(s => s.shotId === shot).videoPrompt); assert.equal(n.data.duration, 4); assert.equal(n.data.resolution, '1080p'); assert.equal(n.data.shotTextOff, true);
        const edges = c.doc.edges.filter(e => e.target === n.id); assert.equal(edges.length, 1); assert.equal(edges[0].source, source.id); assert.equal(edges[0].targetHandle, 'in:start');
      }
      const target = await focusNode(n.id); let g = c.generations.find(g => g.nodeId === n.id), quote = null;
      if (!g) {
        assert.ok(missingAtEntry.includes(shot)); stage = shot + ' quote'; save();
        await target.getByRole('button', {name: 'Run', exact: true}).last().click();
        const dialog = page.getByRole('dialog', {name: 'Confirm generation', exact: true}); await dialog.waitFor();
        quote = await dialog.innerText(); const quoteUsd = quoteValue(quote, await dialog.locator('strong').innerText(), config);
        console.log(JSON.stringify({shot, model: config.model, account: '已繼承 OpenRouter 帳戶', quoteUsd, capUsd: config.eachCents / 100, modeCapUsd: config.capCents / 100}));
        await page.screenshot({path: path.join(out, shot + '-quote.png')}); write(shot + '-quote.json', {shot, nodeId: n.id, quote, quoteUsd, at: new Date().toISOString()});
        audit(snapshot()); assert.equal(result.errors.length, 0);
        stage = shot + ' confirm once'; armed = {nodeId: n.id, sourceGid}; save();
        const responsePromise = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === PREFIX + '/gen');
        await dialog.getByRole('button', {name: 'Confirm and run', exact: true}).click();
        const response = await responsePromise; assert.equal(response.status(), 201); g = await response.json();
        assert.ok(g.id); assert.equal(g.nodeId, n.id); assert.equal(g.kind, config.kind); assert.equal(g.model, config.model);
        result.sourceIDs[shot] = g.id; write(shot + '-submitted.json', {g, at: new Date().toISOString()}); save();
        stage = shot + ' GET polling only'; save();
        g = await until(() => read(PREFIX + '/gen/' + g.id), v => {
          if (['failed', 'unknown'].includes(v.status)) throw Error('STOP: ' + v.status + ', no retry');
          return v.status === 'done';
        }, 900000);
      }
      result.sourceIDs[shot] = g.id;
      const s = snapshot(); audit(s); const p = proof(g, shot, n.id, s);
      const bytes = await (await call('GET', g.url)).body(); assert.equal(hash(bytes), p.sha256);
      fs.writeFileSync(path.join(out, shot + (config.kind === 'image' ? '.png' : '.mp4')), bytes);
      write(shot + '-proof.json', {g, rawInputs: g.inputs, quote, ...p, at: new Date().toISOString(), reused: initialGenerations.includes(g.id)});
      result.outputs.push({shotId: shot, kind: g.kind, nodeId: n.id, id: g.id, sha256: p.sha256, providerRequestId: p.receipt.providerRequestId,
        imageInput: p.receipt.imageInput, normalization: p.receipt.normalization ?? null, rawSha256: p.receipt.normalization?.rawSha256 ?? p.sha256,
        actualUsd: p.receipt.actualUsd, reservationUsd: p.receipt.reservationUsd, billingEstimateUsd: p.receipt.billingEstimateUsd ?? null, reused: initialGenerations.includes(g.id)});
      stage = shot + ' UI History Use'; save(); await select(g); write('ledger-after-' + shot + '.json', snapshot());
      pass(shot + ' proven ' + config.kind + ', downloaded and selected through UI');
    }
    stage = 'final audit'; const after = snapshot(); audit(after); write('ledger-after.json', after);
    assert.equal(after.ledger.requests.length, 42); assert.equal(posts, missingAtEntry.length);
    assert.deepEqual(validateEntry(after), []);
    await page.reload(); await openCanvas(); c = await read(PREFIX + '/canvas'); write('canvas-after.json', c);
    assert.deepEqual(c.doc.nodes.map(n => n.id).sort(), preparedDoc.nodes.map(n => n.id).sort());
    assert.deepEqual(c.doc.edges, preparedDoc.edges);
    for (const e of originalDoc.edges) assert.deepEqual(c.doc.edges.find(x => x.id === e.id), e);
    for (const n of originalDoc.nodes) {
      assert.deepEqual(c.doc.nodes.find(x => x.id === n.id).position, n.position);
      if (!result.outputs.some(i => i.nodeId === n.id)) assert.equal(c.doc.nodes.find(x => x.id === n.id).data.selected, n.data.selected);
    }
    for (const image of result.outputs) {
      assert.equal(c.doc.nodes.find(n => n.id === image.nodeId)?.data.selected, image.id);
      proof(c.generations.find(g => g.id === image.id), image.shotId, image.nodeId, after);
    }
    for (const db of after.generations) {
      const b = after.bindings.find(b => b.gid === db.id), g = c.generations.find(g => g.id === db.id);
      proof(g, b.shot, b.node_id, after);
    }
    assert.equal(result.errors.length, 0); result.status = 'PASS'; stage = 'Veo phase complete (no export or final approval)'; save();
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
function selfTest() {
  let checks = 0;
  const test = (name, fn) => { fn(); checks++; console.log('PASS', name); };
  function fixture(veoShots = []) {
    const imageShots = ALL, videoShots = [...FAL_VIDEO, ...veoShots];
    const s = {scope: 'fixture-scope', bindings: [], generations: [], expected: {image: {}, video: {}},
      ledger: {mode: 'live', policy: 'seedream-fal4-openrouter3', caps: {fal: '4.00', openrouter: '3.00'}, halted: false,
        requests: [], assets: {}, reserved: {fal: '3.24', openrouter: (veoShots.length * .20).toFixed(2)}, categories: {image: '0.00', video: (veoShots.length * .20).toFixed(2)}}};
    const frozen = {shots: ALL.map(shotId => ({shotId, imagePrompt: 'image ' + shotId, videoPrompt: 'video ' + shotId,
      videoProvider: FAL_VIDEO.includes(shotId) ? 'fal' : 'openrouter', videoModel: FAL_VIDEO.includes(shotId) ? VIDEO_ENDPOINT : 'google/veo-3.1-lite', duration: FAL_VIDEO.includes(shotId) ? 6 : 4}))};
    const blobs = new Map(), apiGenerations = [];
    for (const [kind, shots] of [['image', imageShots], ['video', videoShots]]) for (const shot of shots) {
      const image = kind === 'image', veo = !image && VEO_SHOTS.includes(shot), id = 'gid-' + kind + '-' + shot, asset = 'asset-' + kind + '-' + shot;
      const node = (image ? 'sb-' : 'vid-') + shot, rid = 'request-' + kind + '-' + shot, ext = image ? '.png' : '.mp4';
      const bytes = image ? Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from(shot)]) : Buffer.from('0000ftypfixture' + shot);
      const raw = Buffer.from('raw-jpeg-fixture-' + shot), sha = hash(bytes), normalization = image ? {
        providerRequestId: rid, outputSha256: sha, rawPath: 'provider-originals/' + asset + '.bin', rawSha256: hash(raw)} : undefined;
      const inputs = {prompt: kind + ' ' + shot, references: [], kitStamp: {}, count: 1, aspectRatio: '9:16', duration: image ? null : veo ? 4 : 6, startFrame: image ? null : 'gid-image-' + shot};
      const r = {kind, shot, provider: veo ? 'openrouter' : 'fal', model: image ? IMAGE_ENDPOINT : veo ? VEO_ENDPOINT : VIDEO_ENDPOINT, state: 'done', providerRequestId: rid,
        offlineSimulation: false, textOnly: image, reservationUsd: image ? '0.04' : '0.20', actualUsd: null,
        fingerprint: asset, asset, payloadSha256: 'payload-' + asset, outputSha256: sha,
        imageInput: image ? null : {asset: 'asset-image-' + shot, sha256: s.ledger.assets['asset-image-' + shot].sha256, parentRequestId: 'request-image-' + shot},
        providerReceipt: {providerRequestId: rid, model: image ? IMAGE_ENDPOINT : veo ? VEO_ENDPOINT : VIDEO_ENDPOINT, requestPayloadSha256: 'submit-' + asset, submitEndpoint: veo ? 'https://openrouter.ai/api/v1/videos' : 'https://queue.fal.run/' + (image ? IMAGE_ENDPOINT : VIDEO_ENDPOINT), pollUrl: veo ? 'https://openrouter.ai/api/v1/videos/' + rid : 'https://queue.fal.run/fixture/requests/' + rid + '/status'},
        ...(image ? {normalization} : {})};
      s.ledger.requests.push(r);
      s.ledger.assets[asset] = {path: 'media/' + asset + ext, sha256: sha, providerRequestId: rid, requestFingerprint: asset,
        kind, shot, model: r.model, textOnly: image, offlineSimulation: false, ...(image ? {normalization} : {})};
      s.expected[kind][shot] = {inputHash: 'body-' + asset, fingerprint: asset, payloadSha256: r.payloadSha256, submitPayloadSha256: 'submit-' + asset};
      s.bindings.push({gid: id, idea_id: IDEA, node_id: node, shot, kind, model: image ? IMAGE_MODEL : veo ? VEO_MODEL : VIDEO_MODEL,
        scope: s.scope, identityHash: 'identity-' + asset, inputHash: 'body-' + asset, asset, outputHash: sha});
      s.generations.push({id, idea_id: IDEA, node_id: node, kind, model: image ? IMAGE_MODEL : veo ? VEO_MODEL : VIDEO_MODEL, inputs,
        expectedIdentity: 'identity-' + asset, status: 'done', source_url: null, file: id + ext});
      apiGenerations.push({id, nodeId: node, kind, model: image ? IMAGE_MODEL : veo ? VEO_MODEL : VIDEO_MODEL, status: 'done', inputs});
      blobs.set(STATE + '/engine/media/' + asset + ext, bytes);
      blobs.set(STATE + '/media/' + IDEA + '/gen/' + id + ext, bytes);
      if (image) blobs.set(STATE + '/engine/' + normalization.rawPath, raw);
    }
    return {s, frozen, apiGenerations, readBytes: file => { assert.ok(blobs.has(file)); return blobs.get(file); }, blobs};
  }

  test('exact 21 fresh images and 12 fal videos precede all nine Veo shots', () => {
    assert.equal(validateEntry(fixture().s).length, 9);
    assert.equal(validateEntry(fixture(VEO_SHOTS.slice(0, 3)).s).length, 6);
    assert.throws(() => validateEntry(fixture(['s14']).s));
    const f = fixture(); f.s.ledger.requests.pop(); assert.throws(() => validateEntry(f.s));
  });
  test('42 total requests keep fal 3.24 and OpenRouter 1.80, independently capped', () => {
    const f = fixture(VEO_SHOTS); assert.deepEqual(validateLedger(f.s), {image: 21, falVideo: 12, veo: 9});
    assert.deepEqual(validateEntry(f.s), []);
    f.s.ledger.reserved.fal = '3.44'; assert.throws(() => validateLedger(f.s));
  });
  test('unresolved, wrong provider/model, offline, altered receipts/payload are rejected', () => {
    for (const state of ['unknown', 'running', 'reserved', 'failed']) { const f = fixture(['s13']); f.s.ledger.requests.at(-1).state = state; assert.throws(() => validateEntry(f.s)); }
    for (const delta of [{provider: 'fal'}, {model: VIDEO_ENDPOINT}, {payloadSha256: 'foreign'}, {offlineSimulation: true}, {reservationUsd: '.40'}]) {
      const f = fixture(['s13']); Object.assign(f.s.ledger.requests.at(-1), delta); assert.throws(() => validateLedger(f.s));
    }
  });
  test('Veo source must be this shot freshly generated fal PNG with matching bytes and parent ID', () => {
    const f = fixture(['s13']), r = f.s.ledger.requests.at(-1); sameShotSource(r, f.s);
    for (const delta of [{asset: 'asset-image-s1'}, {sha256: 'foreign'}, {parentRequestId: 'another-request'}]) {
      const x = fixture(['s13']); Object.assign(x.s.ledger.requests.at(-1).imageInput, delta); assert.throws(() => validateLedger(x.s));
    }
  });
  test('all media proofs bind native/engine bytes, normalized raw image, payload and OR receipt', () => {
    const f = fixture(['s13']);
    for (const i of [0, 21, 33]) {
      const g = f.apiGenerations[i], b = f.s.bindings[i]; proof(g, b.shot, b.node_id, f.s, f.frozen, f.readBytes);
    }
    for (const change of [x => {x.s.ledger.requests.at(-1).providerReceipt.pollUrl += '/wrong';},
      x => {x.s.ledger.requests.at(-1).providerReceipt.requestPayloadSha256 = 'foreign';},
      x => {x.s.generations.at(-1).inputs.startFrame = 'gid-image-s1';},
      x => {x.s.generations.at(-1).inputs.duration = 6;},
      x => {x.s.bindings.at(-1).identityHash = 'foreign';},
      x => {x.s.generations.at(-1).source_url = 'https://old.example/video';}]) {
      const x = fixture(['s13']); change(x); const g = x.apiGenerations.at(-1); assert.throws(() => proof(g, 's13', g.nodeId, x.s, x.frozen, x.readBytes));
    }
  });
  test('POST boundary fixes Veo 4 seconds 1080p 9:16 audio false and source gid', () => {
    const f = fixture(), body = {nodeId: 'v', model: VEO_MODEL, prompt: 'video s13', confirm: true, duration: 4, resolution: '1080p', aspectRatio: '9:16', startFrame: 'gid-image-s13', references: [], generate_audio: false};
    validatePost(body, 'v', 's13', config, f.frozen, 'gid-image-s13');
    for (const delta of [{duration: 6}, {resolution: '720p'}, {aspectRatio: '16:9'}, {generate_audio: true}, {generateAudio: true}, {model: VIDEO_MODEL}, {startFrame: 'gid-image-s1'}, {references: [{}]}, {count: 2}]) assert.throws(() => validatePost({...body, ...delta}, 'v', 's13', config, f.frozen, 'gid-image-s13'));
    assert.throws(() => validatePost(body, 'v', 's1', config, f.frozen, 'gid-image-s13'));
  });
  test('quote is real Veo, numerical and no greater than 0.20', () => {
    assert.equal(quoteValue('Veo Lite - OpenRouter', 'US$0.20', config), .2);
    for (const text of ['US$0.21', 'US$NaN', 'US$0', '$0.20']) assert.throws(() => quoteValue('Veo Lite - OpenRouter', text, config));
    assert.throws(() => quoteValue('OFFLINE Veo Lite - OpenRouter', 'US$0.20', config));
  });
  test('prepare appends nine Veo nodes/edges and preserves all prior fal nodes/selections', () => {
    const f = fixture(), doc = {nodes: ALL.map((shot, i) => ({id: 'sb-' + shot, type: 'storyboard', shotId: shot, position: {x: 100, y: i * 1000}, data: {selected: 'gid-image-' + shot}})), edges: []};
    for (const shot of FAL_VIDEO) doc.nodes.push({id: 'fal-' + shot, type: 'video', shotId: shot, position: {x: 700, y: 0}, data: {model: VIDEO_MODEL, selected: 'gid-video-' + shot}});
    const original = structuredClone(doc), prepared = prepareVideos(doc, f.frozen, f.s.generations);
    assert.deepEqual(doc, original); assert.deepEqual(prepared.nodes.slice(0, 33), original.nodes); assert.equal(prepared.nodes.length, 42); assert.equal(prepared.edges.length, 9);
    assert.deepEqual(prepareVideos(prepared, f.frozen, f.s.generations), prepared);
    const bad = structuredClone(prepared); bad.edges[0].source = 'sb-s1'; assert.throws(() => prepareVideos(bad, f.frozen, f.s.generations));
    assert.throws(() => prepareVideos(doc, f.frozen, [{model: VEO_MODEL}]));
  });
  console.log('PASS offline Veo provenance/boundary checks:', checks, '(no browser, network, keys or production reads/writes)');
}
module.exports = {emptyReferenceValue, validateIdeaSave, validateLedger, validateEntry, sameShotSource, proof, validatePost, quoteValue, prepareVideos, cents};
if (require.main === module) {
  if (process.argv.length === 3 && process.argv[2] === '--self-test') selfTest();
  else main().catch(e => { console.error(e); process.exitCode = 1; });
}
