import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GUIDED_IDS } from '../src/lib/guided/contracts.ts'
import { GUIDED_STEPS, createGuidedState, readGuidedState, saveGuidedState, requestedStep, matchesGuidedScreen } from '../src/lib/guided/tour.ts'
const ready = { view: 'research', workspace: GUIDED_IDS.clientId, drawerVideoId: null, planId: null, canvasId: null, editing: false, exportOpen: false, ready: true, busy: false }

test('nine native steps are bilingual and requests never commit state or skip the route gate', () => {
  assert.deepEqual(GUIDED_STEPS.map(step => step.id), ['search','results','breakdown','research','script','route','canvas','edit','result'])
  for (const step of GUIDED_STEPS) for (const lang of ['en','zh-Hant']) { assert.ok(step[lang].title); assert.ok(step[lang].description) }
  const state = Object.freeze(createGuidedState())
  assert.equal(requestedStep(state, 'previous'), 'search')
  assert.equal(requestedStep(state, 'next'), 'results')
  assert.equal(state.stepId, 'search')
  assert.equal(requestedStep({ ...state, stepId: 'route' }, 'next'), 'route')
  assert.equal(requestedStep({ ...state, stepId: 'route', route: 'shoot' }, 'next'), 'canvas')
  assert.equal(requestedStep({ ...state, stepId: 'result' }, 'next'), 'result')
  assert.equal(requestedStep({ ...state, active: false }, 'next'), 'search')
})

test('persisted progress validates schema, version, steps and route without touching unrelated keys', () => {
  const values = new Map([['other', 'keep']])
  const store = { getItem: key => values.get(key) ?? null, setItem: (key,value) => values.set(key,value) }
  assert.deepEqual(readGuidedState(store), createGuidedState())
  const state = { ...createGuidedState(), stepId: 'edit', route: 'ai' }
  saveGuidedState(store, state)
  assert.deepEqual(readGuidedState(store), state)
  assert.equal(values.get('other'), 'keep')
  for (const raw of ['{', 'null', '{}', JSON.stringify({ ...state, version: 2 }), JSON.stringify({ ...state, route: null }), JSON.stringify({ ...state, stepId: 'unknown' }), JSON.stringify({ ...state, active: 1 })]) {
    values.set('guided-progress.v1', raw)
    assert.deepEqual(readGuidedState(store), createGuidedState())
  }
})

test('matches only the original ready screen, client, drawer, plan and native canvas/editor panels', () => {
  assert.equal(matchesGuidedScreen('research', null, ready), true)
  assert.equal(matchesGuidedScreen('research', null, { ...ready, workspace: 'formal' }), false)
  assert.equal(matchesGuidedScreen('breakdown', null, { ...ready, drawerVideoId: GUIDED_IDS.videoId }), true)
  for (const route of ['shoot','ai']) {
    const plan = GUIDED_IDS.plans[route]
    const screen = { ...ready, view: 'plan', planId: plan }
    assert.equal(matchesGuidedScreen('script', route, screen), true)
    assert.equal(matchesGuidedScreen('route', route, screen), true)
    const canvas = { ...screen, view: 'canvas', canvasId: plan }
    assert.equal(matchesGuidedScreen('canvas', route, canvas), true)
    assert.equal(matchesGuidedScreen('edit', route, canvas), false)
    assert.equal(matchesGuidedScreen('edit', route, { ...canvas, editing: true }), true)
    assert.equal(matchesGuidedScreen('result', route, { ...canvas, editing: true }), false)
    assert.equal(matchesGuidedScreen('result', route, { ...canvas, editing: true, exportOpen: true }), true)
    for (const patch of [{ busy: true }, { ready: false }, { canvasId: 'other' }]) assert.equal(matchesGuidedScreen('canvas', route, { ...canvas, ...patch }), false)
  }
  assert.equal(matchesGuidedScreen('route', null, { ...ready, view: 'plan', planId: GUIDED_IDS.plans.ai }), true)
})

test('canvas, edit and result observations match exactly one stage on both routes', () => {
  const stages = ['canvas', 'edit', 'result']
  for (const route of ['shoot', 'ai']) {
    const canvas = { ...ready, view: 'canvas', planId: GUIDED_IDS.plans[route], canvasId: GUIDED_IDS.plans[route] }
    for (const [stage, flags] of [
      ['canvas', { editing: false, exportOpen: false }],
      ['edit', { editing: true, exportOpen: false }],
      ['result', { editing: true, exportOpen: true }],
    ]) {
      const observed = { ...canvas, ...flags }
      assert.deepEqual(stages.filter(candidate => matchesGuidedScreen(candidate, route, observed)), [stage])
    }
  }
})


test('native search and results require actual ready tofu results, never a loading or failed screen', () => {
  assert.equal(matchesGuidedScreen('search', null, { ...ready, view: 'search' }), true)
  const result = { ...ready, view: 'results', searchQuery: 'Tofu Recipe', resultVideoIds: [GUIDED_IDS.videoId] }
  assert.equal(matchesGuidedScreen('results', null, result), true)
  for (const patch of [{ busy: true }, { ready: false }, { resultVideoIds: [] }, { searchQuery: 'another search' }, { drawerVideoId: GUIDED_IDS.videoId }]) {
    assert.equal(matchesGuidedScreen('results', null, { ...result, ...patch }), false)
  }
  assert.equal(requestedStep({ ...createGuidedState(), stepId: 'breakdown' }, 'next'), 'research')
})

import * as guidedNavigation from '../src/lib/guided/tour.ts'

test('main progress groups the original search and reference screens into seven stages', () => {
  assert.deepEqual(GUIDED_STEPS.map(step => guidedNavigation.guidedMainProgress(step.id).current), [1, 1, 2, 2, 3, 4, 5, 6, 7])
  assert.ok(GUIDED_STEPS.every(step => guidedNavigation.guidedMainProgress(step.id).total === 7))
})

test('persisted Canvas step and explicit replay skips survive reload and reject cross-route steps', () => {
  const state = { ...createGuidedState(), stepId: 'canvas', route: 'ai', canvasStep: 'image-s2', skippedCanvasSteps: ['image-s1'] }
  const values = new Map()
  const store = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  saveGuidedState(store, state)
  assert.deepEqual(readGuidedState(store), state)
  for (const patch of [{ canvasStep: 'footage' }, { skippedCanvasSteps: ['unknown'] }, { skippedCanvasSteps: ['image-s1', 'image-s1'] }, { route: 'shoot', canvasStep: 'video' }]) {
    values.set('guided-progress.v1', JSON.stringify({ ...state, ...patch }))
    assert.deepEqual(readGuidedState(store), createGuidedState())
  }
})

test('Canvas Next and Previous stay nested and Editor returns to the last Canvas step', () => {
  for (const [route, expected] of [['ai', ['shots','prompt-s1','image-s1','video-s1','history-s1','prompt-s2','image-s2','history-s2','image-s3','video-s4','image-s5','video-s5','image-s6','versions']], ['shoot', ['shots','prompt-s1','image-s1','camera-s1','history-s1','prompt-s2','image-s2','camera-s2','history-s2','image-s3','image-s4','image-s5','image-s6','versions']]]) {
    let state = { ...createGuidedState(), stepId: 'route', route }
    state = guidedNavigation.requestedGuidedState(state, 'next')
    for (const step of expected) {
      assert.equal(state.stepId, 'canvas')
      assert.equal(state.canvasStep, step)
      state = guidedNavigation.requestedGuidedState(state, 'next')
    }
    assert.equal(state.stepId, 'edit')
    const back = guidedNavigation.requestedGuidedState(state, 'previous')
    assert.equal(back.stepId, 'canvas')
    assert.equal(back.canvasStep, 'versions')
    const first = { ...back, canvasStep: 'shots' }
    assert.equal(guidedNavigation.requestedGuidedState(first, 'previous').stepId, 'route')
    assert.deepEqual(guidedNavigation.requestedGuidedState({ ...first, active: false }, 'next'), { ...first, active: false })
  }
})
