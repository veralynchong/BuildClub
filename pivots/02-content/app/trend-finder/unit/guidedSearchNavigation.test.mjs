import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { GUIDED_IDS } from '../src/lib/guided/contracts.ts'

const source = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(node) {
  if (ts.isBinaryExpression(node) && node.left.getText(source) === 'guideNavigate.current') return node.right
  return ts.forEachChild(node, find)
}
const handler = find(source)
assert.ok(handler, 'Exercise the actual App guided navigation handler')
function fixture(allow = true, currentView = 'search') {
  let query = { keyword: 'Tofu Recipe', platforms: ['instagram'], days: 3650, maxLength: 0 }
  let error = 'Unsupported search'
  let view = 'results'
  const calls = []
  const state = { stepId: 'search', route: null }
  const scope = {
    GUIDED_IDS, view: currentView, searching: null, guideState: state, query, liveResults: [{ id: GUIDED_IDS.videoId }],
    enterClient: async (id, next) => {
      calls.push(['enter', id, next])
      if (!allow) return false
      view = next
      query = { ...query, keyword: '' }
      return true
    },
    setQuery: update => { query = update(query) },
    setSearchError: value => { error = value },
    runSearch: (...args) => calls.push(['search', ...args]),
  }
  const compiled = ts.transpileModule(`exports.navigate = ${handler.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', ...Object.keys(scope), compiled)(output, ...Object.values(scope))
  return { state, navigate: output.navigate, query: () => query, error: () => error, view: () => view, calls }
}

test('fresh guided Search restores the visible case query after original enterClient clears it without running search', async () => {
  const app = fixture()
  assert.equal(await app.navigate({ stepId: 'search', route: null }), true)
  assert.equal(app.query().keyword, 'Tofu Recipe')
  assert.deepEqual(app.query().platforms, ['instagram', 'tiktok'])
  assert.equal(app.calls.some(call => call[0] === 'search'), false)
})

test('Previous after a failed native search reaches an operable Search and clears the stale search error', async () => {
  const app = fixture()
  assert.equal(await app.navigate({ stepId: 'search', route: null }), true)
  assert.equal(app.view(), 'search')
  assert.equal(app.error(), null)
})

test('a denied original leave guard preserves query and error without declaring Search ready', async () => {
  const app = fixture(false)
  assert.equal(await app.navigate({ stepId: 'search', route: null }), false)
  assert.equal(app.view(), 'results')
  assert.equal(app.error(), 'Unsupported search')
  assert.equal(app.query().keyword, 'Tofu Recipe')
})

test('guided Next uses the original search callback once and fills the native visible input', async () => {
  const app = fixture()
  assert.equal(await app.navigate({ stepId: 'results', route: null }), true)
  assert.equal(app.query().keyword, 'Tofu Recipe')
  assert.deepEqual(app.calls.filter(call => call[0] === 'search'), [['search', 'Tofu Recipe', ['instagram', 'tiktok']]])
})


test('initial guide startup never rewinds native results submitted before its first observation', async () => {
  const app = fixture(true, 'results')
  assert.equal(await app.navigate(app.state), true)
  assert.deepEqual(app.calls, [])
  assert.equal(app.query().keyword, 'Tofu Recipe')
})

test('already-on-results fast completion publishes the exact target even if busy true/false updates batch away', async () => {
  function effect(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'useEffect' && node.arguments[0]?.getText(source).includes('guideNavigate.current(guideTarget)')) return node.arguments[0]
    return ts.forEachChild(node, effect)
  }
  const callback = effect(source)
  assert.ok(callback)
  const target = { stepId: 'results', route: null }
  let completed = null
  let busy = false
  const scope = {
    guideTarget: target, guideReady: true, guideNavigationDone: { current: null },
    guideNavigate: { current: async () => true },
    setGuideNavigationDone: value => { completed = value },
    setGuideNavigating: value => { busy = value }, setGuideError: () => {}, setGuideTarget: () => {},
  }
  const js = ts.transpileModule(`exports.effect = ${callback.getText(source)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', ...Object.keys(scope), js)(output, ...Object.values(scope))
  output.effect()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(busy, false, 'Busy may end at the same value as before navigation')
  assert.equal(completed, target, 'Completion must independently notify the exact target observation')
})
