import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { planOf, planDueDate, researchStatus, slotSummary } from '../src/lib/research.ts'
import { loadLibrary, saveLibrary } from '../src/lib/live.ts'

// Execute the actual App callbacks without mounting the UI or starting a backend.
const source = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
const compile = (body, names) => new Function(...names, ts.transpileModule(body, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText)
const saveBody = source.slice(source.indexOf('  const saveIdea = '), source.indexOf('  const hasPlan = '))
const save = compile(saveBody + ';return saveIdea;', [
  'live', 'ideas', 'client', 'videoById', 'formatById', 'setLiveStore', 'setIdeas', 'breakDown', 'inTwoWeeks',
])
const shownBody = source.match(/  const shownIdeas = .*\n/)[0]
const shown = compile(shownBody + ';return shownIdeas;', ['ideas', 'videoById', 'live', 'library', 'synced'])
const libraryBody = source.slice(source.indexOf('    const ids = new Set(ideas.map'), source.indexOf('  }, [ideas, liveStore])'))
const libraryOf = compile(libraryBody, ['ideas', 'liveStore'])

const sample = { id: 't14', formatId: 'f', hook: 'Original sample', views: 123, url: 'https://example.com/sample' }
const format = { id: 'f', editorNotes: 'Original notes', shotList: [{ shot: 'Original shot' }] }
const preset = { id: 'evergreen-t6', clientId: 'evergreen', videoId: 't6', status: 'approved' }
const videoMap = new Map([[sample.id, sample], ['t6', { id: 't6' }], ['real', { id: 'real', live: true }]])

function pick(live = true, initial = []) {
  let ideas = initial
  let store = { videos: [], formats: [] }
  const saveIdea = save(live, ideas, { id: 'evergreen' }, videoMap, new Map([['f', format]]),
    (update) => { store = update(store) }, (update) => { ideas = update(ideas) }, () => {}, () => '2099-01-01')
  const idea = saveIdea('t14')
  return { idea, ideas, store }
}

test('explicit sample pick appears live and persists through library API save/reload', async () => {
  const { idea, ideas, store } = pick()
  assert.deepEqual(store, { videos: [sample], formats: [format] })
  assert.equal(store.videos[0].live, undefined)
  const library = libraryOf(ideas, store)
  assert.deepEqual(shown(ideas, videoMap, true, library, true), [idea])
  let heldLibrary
  const previousFetch = globalThis.fetch
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, '/api/library')
      if (init?.method === 'PUT') heldLibrary = JSON.parse(init.body)
      return new Response(JSON.stringify(heldLibrary), { status: 200 })
    }
    await saveLibrary(library)
    assert.deepEqual(await loadLibrary(), library)
  } finally {
    globalThis.fetch = previousFetch
  }
  const restored = JSON.parse(JSON.stringify({ ideas, library: heldLibrary }))
  const restoredVideos = new Map([...videoMap, ...restored.library.videos.map((v) => [v.id, v])])
  assert.deepEqual(shown(restored.ideas, restoredVideos, true, restored.library, true), [idea])
  // An explicit pick may have the same id as a built-in example; provenance is the library, not its id.
  assert.equal(idea.id, 'evergreen-t14')
})

test('unselected samples stay isolated, including before server sync', () => {
  const { ideas, store } = pick(true, [preset])
  const library = libraryOf(ideas, store)
  assert.deepEqual(shown(ideas, videoMap, true, library, true).map((i) => i.videoId), ['t14'])
  assert.deepEqual(shown([preset], videoMap, true, { videos: [], formats: [] }, true), [])
  assert.deepEqual(shown(ideas, videoMap, true, library, false), [])
})

test('sample-mode picks do not enter the live library; real and link plans keep visibility', () => {
  const { ideas, store } = pick(false)
  assert.deepEqual(store, { videos: [], formats: [] })
  assert.deepEqual(shown(ideas, videoMap, true, store, true), [])
  assert.deepEqual(shown(ideas, videoMap, false, store, false), ideas)
  const real = { videoId: 'real' }, link = { videoId: 'link-mine' }
  assert.deepEqual(shown([real, link], videoMap, true, store, true), [real, link])
  assert.deepEqual(shown([real, link], videoMap, false, store, true), [link])
  assert.deepEqual(shown([real, link], videoMap, true, { videos: [], formats: [] }, true), [real, link])
})

test('a missing library format does not hide a picked sample plan', () => {
  const { idea, ideas, store } = pick()
  const library = libraryOf(ideas, { ...store, formats: [] })
  assert.deepEqual(shown(ideas, videoMap, true, library, true), [idea])
})

const pickRowBody = source.slice(source.indexOf('  const pickRow = '), source.indexOf('  // Research\'s "Add from link"'))
const callPickRow = compile(pickRowBody + ';return pickRow;', [
  'research', 'ideas', 'planOf', 'planRow', 'setIdeas', 'setResearch',
])

test('Research pick callback restores an existing hidden sample plan', () => {
  const existing = { id: 'evergreen-t14', clientId: 'evergreen', videoId: 't14', status: 'saved', notes: 'Keep me' }
  let ideas = [existing]
  let store = { videos: [], formats: [] }
  const setIdeas = (update) => { ideas = update(ideas) }
  const saveIdea = save(true, ideas, { id: 'evergreen' }, videoMap, new Map([['f', format]]),
    (update) => { store = update(store) }, setIdeas, () => {}, () => '2099-01-01')
  const row = { id: 'row', clientId: 'evergreen', videoId: 't14' }
  let planCalls = 0
  const pickRow = callPickRow([row], ideas,
    (r, list) => list.find((i) => i.clientId === r.clientId && i.videoId === r.videoId),
    () => { planCalls++; saveIdea('t14') }, setIdeas, () => {})
  pickRow('row', 'picked')
  assert.equal(planCalls, 1)
  assert.equal(ideas[0].savedInLive, true)
  assert.equal(ideas[0].notes, 'Keep me')
  assert.deepEqual(shown(ideas, videoMap, true, libraryOf(ideas, store), true), ideas)
})

test('picking the same sample video for another client cannot expose an unselected preset', () => {
  const unselected = { id: 'another-t14', clientId: 'another', videoId: 't14', status: 'saved' }
  const { idea, ideas, store } = pick(true, [unselected])
  assert.deepEqual(shown(ideas, videoMap, true, libraryOf(ideas, store), true), [idea])
})

const planNowBody = source.slice(source.indexOf('  const planNow = '), source.indexOf('  // Makes a Research row\'s plan.'))
const planRowBody = source.slice(source.indexOf('  const planRow = '), source.indexOf('  // Research\'s Status dropdown.'))
const openPlanBody = source.slice(source.indexOf('  const openPlan = '), source.indexOf('  // The canvas needs'))
const statusCallback = source.match(/statusOf=\{(\(e\) => researchStatus[^}]+)\}/)[1]
const summaryCallback = source.match(/summaryOf=\{(\(slot\) => slotSummary[^}]+)\}/)[1]
const app = compile(`
  let ideas = initialIdeas, liveStore = { videos: [], formats: [] };
  const setIdeas = (f) => { ideas = f(ideas) };
  const setLiveStore = (f) => { liveStore = f(liveStore) };
  const setResearch = () => {}, breakDown = () => {}, setOpenVideoId = () => {};
  const setPlanFrom = () => {}, setPlanIdeaId = () => {}, setView = () => {};
  const view = 'research', researchSlots = [], synced = true;
  const inResearch = new Set(research.map((r) => r.videoId));
  const inTwoWeeks = () => '2099-01-01';
  ${saveBody}
  ${openPlanBody}
  ${planNowBody}
  const hasPlan = (id) => ideas.some((i) => i.videoId === id && i.clientId === client.id);
  ${planRowBody}
  ${pickRowBody}
  return { pickRow, openPlan, ideas: () => ideas, status: (row) => {
    const library = libraryOf(ideas, liveStore);
    ${shownBody}
    return (${statusCallback})(row);
  }, summary: (slot) => {
    const library = libraryOf(ideas, liveStore);
    ${shownBody}
    return (${summaryCallback})(slot);
  }, visible: () => shown(ideas, videoById, live, libraryOf(ideas, liveStore), true) };
`, ['initialIdeas', 'research', 'client', 'live', 'videoById', 'formatById', 'planOf', 'planDueDate', 'researchStatus', 'slotSummary', 'libraryOf', 'shown'])
const makeApp = (ideas, rows, clientId = 'evergreen') => app(ideas, rows, { id: clientId }, true, videoMap,
  new Map([['f', format]]), planOf, planDueDate, researchStatus, slotSummary, libraryOf, shown)

test('Research status and real pickRow → planRow → planNow → saveIdea recover each existing status intact', () => {
  for (const status of ['saved', 'waiting', 'approved', 'rejected']) {
    const row = { id: 'row', clientId: 'evergreen', videoId: 't14' }
    const existing = { id: 'same', clientId: 'evergreen', videoId: 't14', status, notes: 'Keep',
      sentAt: 123, shots: [{ id: 's1', line: 'Keep line' }], history: [{ decision: 'approved', decidedAt: 123 }] }
    const a = makeApp([existing], [row])
    assert.equal(a.status(row), 'none')
    a.pickRow('row', 'picked')
    assert.deepEqual(a.ideas(), [{ ...existing, savedInLive: true }])
    assert.deepEqual(a.visible(), a.ideas())
    assert.notEqual(a.status(row), 'none')
  }
})

test('explicit openPlan restores the correct client plan without duplicating it', () => {
  const other = { id: 'other-plan', clientId: 'another', videoId: 't14', status: 'approved', notes: 'Other' }
  const mine = { id: 'mine', clientId: 'evergreen', videoId: 't14', status: 'saved' }
  const a = makeApp([other, mine], [])
  a.openPlan('other-plan')
  assert.deepEqual(a.ideas(), [{ ...other, savedInLive: true }, mine])
  assert.deepEqual(a.visible(), [{ ...other, savedInLive: true }])
})

test('hidden approved/waiting plans still guard another pick in the same slot', () => {
  for (const status of ['approved', 'waiting']) {
    const rows = [{ id: 'old-row', clientId: 'evergreen', videoId: 't6', slotId: 'slot' },
      { id: 'new-row', clientId: 'evergreen', videoId: 't14', slotId: 'slot' }]
    const existing = { ...preset, status }
    const a = makeApp([existing], rows)
    assert.equal(a.status(rows[0]), 'none')
    a.pickRow('new-row', 'picked')
    assert.deepEqual(a.ideas(), [existing])
  }
})

test('local migration retains a picked sample even if its id collides with a preset', () => {
  const localLine = source.match(/        const local = ideasNow.current.filter.*\n/)[0]
  const migrateLocal = compile(localLine + ';return local;', ['ideasNow', 'sampleIds'])
  const explicit = { id: 'evergreen-t14', savedInLive: true }
  const untouched = { id: 'evergreen-t6' }
  assert.deepEqual(migrateLocal({ current: [explicit, untouched] }, new Set([explicit.id, untouched.id])), [explicit])
})
