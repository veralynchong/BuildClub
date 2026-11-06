import { test } from 'node:test'
import assert from 'node:assert/strict'
import { installGuidedRuntime, getGuidedRuntime, startGuidedDemo } from '../src/lib/guided/runtime.ts'

class MemoryStorage {
  entries = new Map()
  get length() { return this.entries.size }
  key(i) { return [...this.entries.keys()][Number(i) >>> 0] ?? null }
  getItem(k) { return this.entries.get(String(k)) ?? null }
  setItem(k, v) { this.entries.set(String(k), String(v)) }
  removeItem(k) { this.entries.delete(String(k)) }
  clear() { this.entries.clear() }
}
const id = '12345678-1234-4123-8123-123456789012'
function windowFor(search = '?guided=tofu') {
  let url = new URL(`http://example.test/${search}`)
  const local = new MemoryStorage(), session = new MemoryStorage(), requests = []
  const win = {
    location: { get href() { return url.href }, get origin() { return url.origin }, get search() { return url.search },
      assign(value) { url = new URL(value, url) }, reload() { this.reloads = (this.reloads ?? 0) + 1 } },
    history: { state: { keep: true }, replaceState(state, _, value) { this.state = state; url = new URL(value, url) } },
    crypto: { randomUUID: () => id },
    fetch: async request => { requests.push(request); return new Response('static') },
  }
  Object.defineProperty(win, 'localStorage', { configurable: true, enumerable: true, get: () => local })
  Object.defineProperty(win, 'sessionStorage', { configurable: true, enumerable: true, get: () => session })
  return { win, local, session, requests }
}
const factory = () => ({ bootstrap: { local: { clients: ['tofu'] }, session: { view: 'research' } }, request: async () => new Response('prepared'), reset() {} })

test('normal mode is completely untouched and unknown guided mode fails closed', () => {
  for (const query of ['', '?guided=other']) {
    const { win } = windowFor(query)
    const before = Object.getOwnPropertyDescriptors(win)
    if (query) assert.throws(() => installGuidedRuntime(() => assert.fail(), win))
    else assert.equal(installGuidedRuntime(() => assert.fail(), win), null)
    assert.deepEqual(Object.getOwnPropertyDescriptors(win), before)
    assert.equal(getGuidedRuntime(win), null)
  }
})

test('scoped Storage methods, named properties, enumeration and clear preserve formal and sibling data', () => {
  const { win, local, session } = windowFor()
  local.setItem('formal', 'keep'); local.setItem('remake:guided:sibling:x', 'sibling')
  session.setItem('formal', 'session')
  const runtime = installGuidedRuntime(factory, win)
  assert.equal(runtime.prefix, `remake:guided:${id}:`)
  assert.equal(win.localStorage, runtime.local)
  assert.equal(runtime.local.getItem('formal'), null)
  assert.equal(runtime.local.getItem('clients'), '["tofu"]')
  runtime.local.foo = 12
  assert.equal(runtime.local.foo, '12')
  assert.equal(runtime.local.getItem('foo'), '12')
  assert.equal(runtime.local.length, 2)
  assert.deepEqual(Object.keys(runtime.local), ['clients', 'foo'])
  assert.deepEqual({ ...runtime.local }, { clients: '["tofu"]', foo: '12' })
  assert.equal('foo' in runtime.local, true)
  assert.equal(runtime.local.key(1), 'foo')
  assert.equal(runtime.local.key(999), null)
  delete runtime.local.foo
  assert.equal(runtime.local.foo, undefined)
  Object.defineProperty(runtime.local, 'defined', { value: 'property', configurable: true, enumerable: true, writable: true })
  assert.equal(runtime.local.getItem('defined'), 'property')
  runtime.local.clear()
  assert.equal(runtime.local.length, 0)
  assert.equal(local.getItem('formal'), 'keep')
  assert.equal(local.getItem('remake:guided:sibling:x'), 'sibling')
  assert.equal(runtime.session.getItem('view'), '"research"')
  assert.equal(session.getItem('formal'), 'session')
})

test('reload retains the token and existing bootstrap values; a fresh Watch creates a new URL token', () => {
  const { win, local } = windowFor(`?guided=tofu&guideSession=${id}`)
  local.setItem(`remake:guided:${id}:clients`, '["existing"]')
  const runtime = installGuidedRuntime(factory, win)
  assert.equal(runtime.local.getItem('clients'), '["existing"]')
  assert.equal(installGuidedRuntime(factory, win), runtime)
  assert.equal(getGuidedRuntime(win), runtime)
  win.crypto.randomUUID = () => '87654321-4321-4321-8321-210987654321'
  startGuidedDemo(win)
  assert.equal(new URL(win.location.href).searchParams.get('guideSession'), '87654321-4321-4321-8321-210987654321')
})

test('API requests preserve method, body, headers and abort; static passes through, remote fetch never escapes', async () => {
  const { win, requests } = windowFor()
  const seen = []
  installGuidedRuntime(() => ({ ...factory(), request: async request => { seen.push(request); return new Response(await request.text()) } }), win)
  const controller = new AbortController()
  const response = await win.fetch('/api/ideas/demo/edit', { method: 'PUT', headers: { 'X-Test': 'yes' }, body: '{"draft":1}', signal: controller.signal })
  assert.equal(await response.text(), '{"draft":1}')
  assert.equal(seen[0].method, 'PUT')
  assert.equal(seen[0].headers.get('x-test'), 'yes')
  controller.abort()
  assert.equal(seen[0].signal.aborted, true)
  await assert.rejects(win.fetch('/api/ideas', { signal: controller.signal }), { name: 'AbortError' })
  await win.fetch('/fonts/font.ttf')
  assert.equal(requests.length, 1)
  await assert.rejects(win.fetch('https://unknown.example/api/anything'))
  assert.equal(requests.length, 1)
})

test('abort settles even when prepared handler ignores the signal; handler errors never fall through', async () => {
  const { win, requests } = windowFor()
  installGuidedRuntime(() => ({ ...factory(), request: () => new Promise(() => {}) }), win)
  const controller = new AbortController()
  const pending = win.fetch('/api/analyze', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(requests.length, 0)
  const other = windowFor()
  installGuidedRuntime(() => ({ ...factory(), request: async () => { throw new Error('unknown fixture') } }), other.win)
  await assert.rejects(other.win.fetch('/api/unknown'), /unknown fixture/)
  assert.equal(other.requests.length, 0)
})

test('failed partial install restores original descriptors, own scoped entries and URL atomically', () => {
  const { win, local } = windowFor()
  const before = Object.getOwnPropertyDescriptors(win)
  const url = win.location.href
  assert.throws(() => installGuidedRuntime((scoped) => { scoped.setItem('partial', 'bad'); throw new Error('seed failed') }, win), /seed failed/)
  assert.deepEqual(Object.getOwnPropertyDescriptors(win), before)
  assert.equal(local.length, 0)
  assert.equal(win.location.href, url)
  assert.equal(getGuidedRuntime(win), null)
  const blocked = windowFor()
  Object.defineProperty(blocked.win, 'fetch', { configurable: false, writable: false, value: blocked.win.fetch })
  const descriptors = Object.getOwnPropertyDescriptors(blocked.win)
  assert.throws(() => installGuidedRuntime(factory, blocked.win))
  assert.deepEqual(Object.getOwnPropertyDescriptors(blocked.win), descriptors)
})

test('restart opens a fresh guide identity and preserves existing edits; exit restores native window', () => {
  const { win, local } = windowFor()
  const original = win.fetch
  local.setItem('formal', 'keep')
  let resets = 0
  const runtime = installGuidedRuntime(() => ({ ...factory(), reset() { resets++ } }), win)
  runtime.local.setItem('draft', 'changed')
  const nextId = '22345678-1234-4123-8123-123456789012'
  win.crypto.randomUUID = () => nextId
  runtime.reset()
  assert.equal(resets, 0)
  assert.equal(runtime.local.getItem('draft'), 'changed')
  assert.equal(new URL(win.location.href).searchParams.get('guideSession'), nextId)
  assert.equal(win.location.reloads, undefined)
  runtime.exit()
  assert.equal(win.location.href, 'http://example.test/')
  assert.equal(win.localStorage, local)
  assert.equal(win.fetch, original)
  assert.equal(local.getItem('formal'), 'keep')
})

test('Storage preserves native required-argument errors and explicit null string conversion', () => {
  const { win } = windowFor()
  const { local } = installGuidedRuntime(factory, win)
  assert.throws(() => local.getItem(), TypeError)
  assert.throws(() => local.setItem('incomplete'), TypeError)
  assert.throws(() => local.removeItem(), TypeError)
  assert.throws(() => local.key(), TypeError)
  local.setItem(null, null)
  assert.equal(local.getItem('null'), 'null')
})

test('invalid tokens are replaced locally; bootstrap stores and preexisting scoped values roll back on seed failure', () => {
  const invalid = windowFor('?guided=tofu&guideSession=invalid')
  const runtime = installGuidedRuntime(factory, invalid.win)
  assert.equal(runtime.sessionId, id)
  assert.equal(new URL(invalid.win.location.href).searchParams.get('guideSession'), id)
  const failed = windowFor(`?guided=tofu&guideSession=${id}`)
  failed.local.setItem(`remake:guided:${id}:existing`, 'old')
  const originalSet = failed.session.setItem.bind(failed.session)
  failed.session.setItem = (key, value) => { if (key.endsWith(':explode')) throw new Error('quota'); originalSet(key, value) }
  assert.throws(() => installGuidedRuntime(local => {
    local.setItem('existing', 'changed')
    return { ...factory(), bootstrap: { local: { fresh: 1 }, session: { explode: 1 } } }
  }, failed.win), /quota/)
  assert.equal(failed.local.getItem(`remake:guided:${id}:existing`), 'old')
  assert.equal(failed.local.getItem(`remake:guided:${id}:fresh`), null)
  assert.equal(failed.win.localStorage, failed.local)
  assert.equal(getGuidedRuntime(failed.win), null)
})

test('Request inputs preserve body and headers, and duplicate guided modes cannot install', async () => {
  const { win } = windowFor()
  let received
  installGuidedRuntime(() => ({ ...factory(), request: async request => { received = request; return new Response(await request.text()) } }), win)
  const request = new Request('http://example.test/api/fixture', { method: 'POST', body: 'body', headers: { 'x-source': 'request' } })
  const response = await win.fetch(request)
  assert.equal(await response.text(), 'body')
  assert.equal(received.headers.get('x-source'), 'request')
  assert.equal(received.method, 'POST')
  const duplicate = windowFor('?guided=tofu&guided=other')
  assert.throws(() => installGuidedRuntime(factory, duplicate.win), /Unknown guided/)
})

test('encoded API aliases cannot escape to native network as static requests', async () => {
  const { win, requests } = windowFor()
  let calls = 0
  installGuidedRuntime(() => ({ ...factory(), request: async () => { calls++; return new Response('prepared') } }), win)
  await win.fetch('/%61pi/analyze')
  assert.equal(calls, 1)
  assert.equal(requests.length, 0)
})


test('local editor bridge initializes once and preserves canonical edits and exact request identity', async () => {
  const { win } = windowFor()
  const calls = []
  win.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    calls.push({ url: request.url, method: request.method, body: request.method === 'PUT' ? await request.text() : null })
    return new Response(JSON.stringify(request.method === 'PUT' ? { version: 8 } : { version: 7, project: { texts: ['saved on server'] } }), { headers: { 'content-type': 'application/json' } })
  }
  installGuidedRuntime(factory, win)
  const base = 'http://example.test/api/ideas/guided-tofu-ai'
  assert.equal((await (await win.fetch(`${base}/edit`)).json()).version, 7)
  await win.fetch(`${base}/edit`, { method: 'PUT', body: JSON.stringify({ version: 7, project: { texts: ['changed'] } }) })
  assert.equal(calls.length, 3)
  assert.equal(calls[0].method, 'POST')
  assert.match(calls[0].url, /\/api\/guided\/sessions\/[^/]+\/ai$/)
  assert.equal(calls[2].body, '{"version":7,"project":{"texts":["changed"]}}')
  assert.equal((await win.fetch(`${base}/edit?foreign=1`)).status, 422)
  assert.equal(calls.length, 3)
})

test('bridge failures never fall back to a prepared editor success', async () => {
  const { win } = windowFor()
  win.fetch = async () => new Response(JSON.stringify({ error: 'Local editor offline' }), { status: 503 })
  installGuidedRuntime(factory, win)
  await assert.rejects(win.fetch('http://example.test/api/ideas/guided-tofu-ai/edit'), /Local editor offline/)
})

test('aborting a caller settles while shared local-editor initialization remains pending', async () => {
  const { win } = windowFor()
  win.fetch = () => new Promise(() => {})
  installGuidedRuntime(factory, win)
  const controller = new AbortController()
  const pending = win.fetch('http://example.test/api/ideas/guided-tofu-ai/edit', { signal: controller.signal })
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})
