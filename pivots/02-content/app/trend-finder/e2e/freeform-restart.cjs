// HTTP durability check; run only through bin/freeform-e2e.py --script <this file>.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { randomBytes } = require('node:crypto')
const { BASE, FREEFORM_WORK_DIR: work, FREEFORM_EVIDENCE_DIR: evidence,
  FREEFORM_RESTART_REQUEST: request, FREEFORM_RESTART_DONE: done } = process.env
assert.equal(BASE, 'http://127.0.0.1:8872', 'use the owned isolated runner')
assert.ok(work && evidence && request && done, 'restart supervisor is required')
assert.equal(path.dirname(request), work)
assert.equal(path.dirname(done), work)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const checks = [], restarts = []
let cookie
const ok = message => { checks.push(message); console.log('PASS', message) }
async function api(url, method = 'GET', data) {
  const response = await fetch(BASE + url, { method, redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: { ...(cookie ? { Cookie: cookie } : {}), 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
  const body = await response.json()
  assert.ok(response.ok, `${method} ${url}: ${response.status} ${JSON.stringify(body)}`)
  if (url === '/api/auth/login') {
    cookie = response.headers.get('set-cookie')?.split(';')[0]
    assert.ok(cookie?.startsWith('tf_session='), 'real session cookie')
  }
  return body
}
async function restart() {
  const token = randomBytes(16).toString('hex')
  const pending = request + '.tmp'
  fs.writeFileSync(pending, token)
  fs.renameSync(pending, request)
  const deadline = Date.now() + 45000
  while (Date.now() < deadline) {
    if (fs.existsSync(done)) {
      const ack = JSON.parse(fs.readFileSync(done, 'utf8'))
      if (ack.token === token) {
        assert.ok(Number.isInteger(ack.oldPid) && Number.isInteger(ack.newPid))
        assert.notEqual(ack.oldPid, ack.newPid, 'backend must actually be replaced')
        assert.ok([0, -15].includes(ack.oldExit), 'old uvicorn terminated and was waited; no forced kill')
        if (restarts.length) assert.equal(ack.oldPid, restarts.at(-1).newPid)
        restarts.push(ack)
        return
      }
    }
    await sleep(50)
  }
  throw new Error('Owned backend restart acknowledgement timed out')
}
async function main() {
  try {
    await api('/api/auth/login', 'POST', { email: 'test@example.com', password: 'pw-for-e2e' })
    const identity = await api('/api/auth/me')
    assert.equal(identity.email, 'test@example.com')
    const clients = (await api('/api/clients')) || []
    const client = { id: 'restart-e2e', name: 'Restart Studio', niche: 'Food',
      audience: 'Sydney creators', monthlyTarget: 8, examples: [], cannot: [] }
    await api('/api/clients', 'PUT', [...clients, client])
    const created = await api('/api/workspaces', 'POST', { clientId: client.id, title: 'Restart durability' })
    const base = '/api/workspaces/' + created.workspace.id
    const doc = { nodes: [
      { id: 'prompt', type: 'prompt', position: { x: 48, y: 96 }, data: { text: '重啟後仍保留的 prompt' } },
      { id: 'image', type: 'storyboard', position: { x: 440, y: 96 }, data: { prompt: 'A red bicycle' } },
      { id: 'n_editor', type: 'editor', position: { x: 800, y: 96 }, data: {} },
    ], edges: [{ id: 'prompt-image', source: 'prompt', target: 'image', sourceHandle: 'out', targetHandle: 'in:text' }],
    viewport: { x: -32, y: 17, zoom: 0.8 } }
    await api(base, 'PUT', { version: created.version, doc })
    let editor = await api(base + '/edit')
    editor.project.texts = [{ id: 'title', text: 'Persistent editor title', start: 0, end: 2, position: 'top', color: 'white' }]
    await api(base + '/edit', 'PUT', editor)
    ok('real login, workspace create, graph PUT and editor PUT succeeded')
    for (let round = 1; round <= 2; round++) {
      const graph = await api(base)
      const edit = await api(base + '/edit')
      const listing = await api('/api/workspaces?clientId=' + client.id)
      await restart()
      assert.deepEqual(await api('/api/auth/me'), identity, 'same session survives backend restart')
      assert.deepEqual(await api(base), graph, 'graph, version and workspace metadata survive')
      assert.deepEqual(await api(base + '/edit'), edit, 'editor project and version survive')
      assert.deepEqual(await api('/api/workspaces?clientId=' + client.id), listing)
      ok(`actual backend restart ${round}: session, workspace graph and editor state unchanged`)
      if (round === 1) {
        graph.doc.nodes[0].data.text = 'Second persisted revision'
        await api(base, 'PUT', { version: graph.version, doc: graph.doc, title: 'Updated after restart' })
        edit.project.texts[0].text = 'Second editor revision'
        await api(base + '/edit', 'PUT', edit)
        ok('persisted graph and editor updates using original session after first restart')
      }
    }
  } finally {
    fs.writeFileSync(path.join(evidence, 'restart-results.json'), JSON.stringify({ checks, restarts }, null, 2))
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
