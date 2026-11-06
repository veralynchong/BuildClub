import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elapsedSeconds, isOnSearchPage } from '../src/lib/searchStatus.ts'
import { en, zhHant } from '../src/lib/strings/find.ts'

test('elapsed seconds count whole seconds and never go negative', () => {
  assert.equal(elapsedSeconds(1000, 1000), 0)
  assert.equal(elapsedSeconds(1000, 12_999), 11)
  assert.equal(elapsedSeconds(5000, 1000), 0)
})

test('a finished search shows directly only on that client\'s Find ideas or results page', () => {
  assert.equal(isOnSearchPage({ view: 'search', workspace: 'a' }, 'a'), true)
  assert.equal(isOnSearchPage({ view: 'results', workspace: 'a' }, 'a'), true)
  assert.equal(isOnSearchPage({ view: 'home', workspace: 'a' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'shortlist', workspace: 'a' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'search', workspace: 'b' }, 'a'), false)
  assert.equal(isOnSearchPage({ view: 'overview', workspace: 'all' }, 'a'), false)
})

test('background search strings exist in English and Traditional Chinese with the query placeholder', () => {
  for (const key of ['find.bg.status', 'find.bg.ready']) {
    assert.match(en[key], /\{query\}/)
    assert.match(zhHant[key], /\{query\}/)
  }
  assert.match(en['find.bg.seconds'], /\{seconds\}/)
  assert.match(zhHant['find.bg.seconds'], /\{seconds\}/)
})

// Exercise the actual result component and App search handler without HTTP or a browser.
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import React from 'react'
import * as jsx from 'react/jsx-runtime'
import { renderToStaticMarkup } from 'react-dom/server'
import * as metrics from '../src/lib/metrics.ts'
import * as filters from '../src/lib/resultFilters.ts'
import * as i18n from '../src/lib/i18n.ts'

const appSource = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(root, predicate) {
  if (predicate(root)) return root
  return ts.forEachChild(root, (child) => find(child, predicate))
}
function compile(code, scope) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const exports = {}
  new Function('exports', ...Object.keys(scope), js)(exports, ...Object.values(scope))
  return exports
}
const noop = () => {}
const child = ({ children }) => React.createElement('div', null, children)
function resultsComponent() {
  const source = readFileSync(new URL('../src/components/ResultsScreen.tsx', import.meta.url), 'utf8')
  const errorSource = readFileSync(new URL('../src/components/ErrorText.tsx', import.meta.url), 'utf8')
  const require = (name) => {
    if (name === 'react') return React
    if (name === 'react/jsx-runtime') return jsx
    if (name === '../lib/metrics') return metrics
    if (name === '../lib/resultFilters') return filters
    if (name === '../lib/i18n') return i18n
    if (name === '../lib/appContext') return { useManagerName: () => 'Annie' }
    if (name === '../lib/useShortcuts') return { useResultsShortcuts: noop, resultsShortcuts: [] }
    if (name === './ErrorText') return compile(errorSource, { require })
    if (name === './BestVideo') return { BestVideo: ({ video }) => React.createElement('div', { 'data-best': video.id }, video.hook) }
    if (name === './VideoTile') return { VideoTile: ({ video }) => React.createElement('div', { 'data-tile': video.id }, video.hook) }
    if (name === './find/words') return { platformsText: (ps) => ps.join(', '), viewsLabel: () => 'views', daysAgoWords: () => 'today', beatUsual: () => 'Usual views' }
    if (name === '../lib/motion') return { useCountUp: (value) => value }
    return new Proxy({}, { get: () => child })
  }
  return compile(source, { require }).ResultsScreen
}

test('current search failure is an alert beside retained tofu results, and clears for the next request', () => {
  const ResultsScreen = resultsComponent()
  const props = {
    query: { days: 90, maxLength: 0, platforms: ['tiktok'] },
    interp: { text: 'tofu', keywords: ['tofu'], topics: [] },
    results: [{ id: 'tofu-1', platform: 'tiktok', hook: 'Original tofu result', views: 2_000_000, followers: 1000, daysAgo: 1 }],
    trends: [], formats: [], allVideos: [], newIds: new Set(), cohorts: new Map(),
    ideaStatus: new Map(), blockedFormatIds: new Set(), inResearch: new Set(),
    failed: [], empty: [], saved: [], live: true, clientName: 'Test client',
    savedIn: () => null, onSearch: noop,
  }
  for (const lang of ['en', 'zh-Hant']) {
    i18n.setActiveLang(lang)
    const message = `${i18n.t('shell.search.failed')} Try a saved search, like "tofu".`
    const failed = renderToStaticMarkup(React.createElement(ResultsScreen, { ...props, error: message }))
    assert.match(failed, /role="alert"/)
    assert.ok(failed.includes(i18n.t('shell.search.failed')))
    assert.match(failed, /class="link-btn"/)
    assert.match(failed, /Original tofu result/)
    assert.match(failed, /tofu/)
    const cleared = renderToStaticMarkup(React.createElement(ResultsScreen, { ...props, error: null }))
    assert.doesNotMatch(cleared, /role="alert"/)
    assert.match(cleared, /Original tofu result/)
  }
  i18n.setActiveLang('en')
})

test('App passes the current error to results and a 429 preserves old results until a successful retry', async () => {
  const resultsNode = find(appSource, (n) => ts.isJsxSelfClosingElement(n) && n.tagName.getText(appSource) === 'ResultsScreen')
  const errorProp = resultsNode.attributes.properties.find((p) => p.name?.text === 'error')
  assert.ok(errorProp, 'ResultsScreen must receive the current search error')
  const error = 'HTTP 429: search budget reached'
  assert.equal(compile(`export const value = ${errorProp.initializer.expression.getText(appSource)}`, { searchError: error }).value, error)
  const run = find(appSource, (n) => ts.isVariableDeclaration(n) && n.name.getText(appSource) === 'runLiveSearch').initializer
  let release
  let searchError = error
  let results = ['old tofu result']
  let queryText = 'tofu'
  let searching = null
  const scope = {
    guidedRuntime: null,
    parseQuery: (text) => ({ keywords: [text], topics: [] }), formats: [],
    query: { platforms: ['tiktok'] }, client: { id: 'client' }, searchSeq: { current: 0 },
    setSearchError: (value) => { searchError = value }, setNotice: noop,
    setSearching: (value) => { searching = value },
    searchAll: () => new Promise((resolve, reject) => { release = { resolve, reject } }),
    failSearch: (_client, message) => { searchError = message },
    fetchContentTypes: async () => new Map(), setSearchFailed: noop, setSearchEmpty: noop,
    setLiveStore: noop, setLiveResults: (value) => { results = value }, setLiveQuery: (value) => { queryText = value },
    setLiveAnswer: noop, setInterp: noop, setQuery: noop, setPatternFilter: noop,
    setFormatFilter: noop, setLastSearches: noop, setShownSearch: noop, setToRecord: noop, setView: noop,
    here: { current: { view: 'results', workspace: 'client' } }, isOnSearchPage,
  }
  const search = compile(`export const run = ${run.getText(appSource)}`, scope).run
  const first = search('uncached query')
  assert.equal(searchError, null)
  assert.equal(searching.q, 'uncached query')
  release.reject(new Error(error))
  await first
  assert.equal(searchError, error)
  assert.deepEqual(results, ['old tofu result'])
  assert.equal(queryText, 'tofu')
  assert.equal(searching, null)
  const retry = search('retry')
  assert.equal(searchError, null)
  release.resolve({ videos: [], formats: [], failed: [], empty: [], pending: [] })
  await retry
  assert.equal(searchError, null)
  assert.deepEqual(results, [])
  assert.equal(queryText, 'retry')
})

test('guided initial filters show the prepared reference with unknown popularity while normal defaults keep their threshold', () => {
  i18n.setActiveLang('en')
  const ResultsScreen = resultsComponent()
  const props = {
    query: { days: 3650, maxLength: 0, platforms: ['instagram'] },
    interp: { text: 'Tofu Recipe', keywords: ['tofu'], topics: [] },
    results: [{ id: 'ig-DVp3xOdFaHL', platform: 'instagram', hook: 'Prepared tofu unknown reference', views: 0, followers: 0, daysAgo: 999 }],
    trends: [], formats: [], allVideos: [], newIds: new Set(), cohorts: new Map(),
    ideaStatus: new Map(), blockedFormatIds: new Set(), inResearch: new Set(),
    failed: [], empty: [], saved: [], live: true, clientName: 'Prepared sample', error: null,
    savedIn: () => null, onSearch: noop,
  }
  const normal = renderToStaticMarkup(React.createElement(ResultsScreen, props))
  assert.doesNotMatch(normal, /Prepared tofu unknown reference/)
  const guided = renderToStaticMarkup(React.createElement(ResultsScreen, { ...props, initialFilters: { ...filters.DEFAULT_FILTERS, viewsMin: 0, followersMax: 0 } }))
  assert.match(guided, /Prepared tofu unknown reference/)
  assert.equal(filters.DEFAULT_FILTERS.viewsMin, 1_000_000)
})


test('guided recommendation pins the visible fixed reference in hero and grid without changing normal ranking or metrics', () => {
  i18n.setActiveLang('en')
  const ResultsScreen = resultsComponent()
  const results = [
    { id: 'popular', platform: 'instagram', hook: 'Popular tofu', views: 6000000, followers: 1000, daysAgo: 1 },
    { id: 'target', platform: 'instagram', hook: 'Target tofu', views: 0, followers: 0, daysAgo: 999 },
  ]
  const before = structuredClone(results)
  const props = { query: { days: 3650, maxLength: 0, platforms: ['instagram'] }, interp: { text: 'Tofu Recipe', keywords: ['tofu'], topics: [] }, results, trends: [], formats: [], allVideos: [], newIds: new Set(['popular']), cohorts: new Map(), ideaStatus: new Map([['target', 'approved']]), blockedFormatIds: new Set(), inResearch: new Set(), failed: [], empty: [], saved: [], live: true, clientName: 'Prepared sample', error: null, savedIn: () => null, onSearch: noop, initialFilters: { ...filters.DEFAULT_FILTERS, viewsMin: 0, followersMax: 0 } }
  const normal = renderToStaticMarkup(React.createElement(ResultsScreen, props))
  assert.match(normal, /data-best="popular"/)
  assert.ok(normal.indexOf('data-tile="popular"') < normal.indexOf('data-tile="target"'))
  const guided = renderToStaticMarkup(React.createElement(ResultsScreen, { ...props, recommendedVideoId: 'target' }))
  assert.match(guided, /data-best="target"/)
  assert.ok(guided.indexOf('data-tile="target"') < guided.indexOf('data-tile="popular"'))
  const missing = renderToStaticMarkup(React.createElement(ResultsScreen, { ...props, recommendedVideoId: 'absent' }))
  assert.match(missing, /data-best="popular"/)
  assert.deepEqual(results, before)
  const node = find(appSource, n => ts.isJsxSelfClosingElement(n) && n.tagName.getText(appSource) === 'ResultsScreen')
  const prop = node.attributes.properties.find(p => p.name?.text === 'recommendedVideoId')
  assert.ok(prop)
  const code = `export const value = ${prop.initializer.expression.getText(appSource)}`
  assert.equal(compile(code, { guidedRuntime: null, GUIDED_IDS: { videoId: 'target' } }).value, undefined)
  assert.equal(compile(code, { guidedRuntime: {}, GUIDED_IDS: { videoId: 'target' } }).value, 'target')
})
