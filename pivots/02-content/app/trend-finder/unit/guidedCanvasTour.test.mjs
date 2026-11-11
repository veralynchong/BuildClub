import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { GUIDED_CANVAS_IDS as ids } from '../src/lib/guided/contracts.ts'
import { GUIDED_STEPS, guidedMainProgress } from '../src/lib/guided/tour.ts'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = fileURLToPath(new URL('../', import.meta.url))
function load(relative, collapsed = false, hooks) {
  const file = path.resolve(root, relative)
  const source = readFileSync(file, 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const localRequire = spec => {
    if (spec.endsWith('.css')) return {}
    // Render both disclosure states without a browser or changing the component contract.
    if (spec === 'react' && hooks) return hooks
    if (spec === 'react' && collapsed) return { ...React, useState: initial => typeof initial === 'boolean' ? [true, () => {}] : React.useState(initial) }
    if (spec.startsWith('.')) {
      const absolute = path.resolve(path.dirname(file), spec)
      return load(path.relative(root, /\.tsx?$/.test(absolute) ? absolute : `${absolute}.ts`), collapsed, hooks)
    }
    return require(spec)
  }
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports)
  return module.exports
}
const state = { version: 1, active: true, stepId: 'canvas', route: 'ai' }
const props = { state, lang: 'en', busy: false, onNext() {}, onPrevious() {}, onReset() {}, onExit() {}, onRoute() {} }
const render = (overrides = {}, collapsed = false) => renderToStaticMarkup(React.createElement(load('src/components/demo/GuidedTour.tsx', collapsed).GuidedTour, { ...props, ...overrides }))
const button = (html, label) => html.match(new RegExp(`<button\\b([^>]*)>${label}</button>`))?.[1]

test('nine native screens stay grouped into seven main stages', () => {
  assert.deepEqual(GUIDED_STEPS.map(s => guidedMainProgress(s.id)), [1, 1, 2, 2, 3, 4, 5, 6, 7].map(current => ({ current, total: 7 })))
  assert.match(render(), /guided-tour__count">5\/7</)
  assert.match(render(), /aria-valuemax="7" aria-valuenow="5"/)
})

test('AI has six ordered canvas steps and shoot has four, in both languages', () => {
  const { CANVAS_TOURS } = load('src/lib/guided/canvasTour.ts')
  assert.deepEqual(CANVAS_TOURS.ai.map(s => s.id), ['shots', 'prompt', 'image', 'connect', 'video', 'versions'])
  assert.deepEqual(CANVAS_TOURS.shoot.map(s => s.id), ['shots', 'prompt', 'footage', 'versions'])
  for (const steps of Object.values(CANVAS_TOURS)) for (const step of steps) for (const lang of ['en', 'zh-Hant']) {
    assert.ok(step[lang].title)
    assert.ok(step[lang].description)
  }
})

test('all focus targets bind to real Shot 19 contract IDs and native docks', () => {
  const { CANVAS_TOURS } = load('src/lib/guided/canvasTour.ts')
  const focus = route => Object.fromEntries(CANVAS_TOURS[route].map(s => [s.id, s.focus]))
  assert.equal(ids.shotNumber, 19)
  for (const route of ['ai', 'shoot']) {
    assert.deepEqual(focus(route).shots, { nodeIds: [ids.nodes.shot], dock: null })
    assert.deepEqual(focus(route).prompt, { nodeIds: [ids.nodes.prompt], dock: null })
  }
  assert.deepEqual(focus('ai').image, { nodeIds: [ids.nodes.image], dock: 'inspect' })
  assert.deepEqual(focus('ai').connect, { nodeIds: [ids.nodes.image, ids.nodes.video], edgeIds: [ids.edges.imageVideo], dock: null })
  assert.deepEqual(focus('ai').video, { nodeIds: [ids.nodes.video], dock: 'inspect' })
  assert.deepEqual(focus('ai').versions, { nodeIds: [ids.nodes.video], dock: 'history' })
  assert.deepEqual(focus('shoot').footage, { nodeIds: [ids.nodes.footage], dock: null })
  assert.deepEqual(focus('shoot').versions, { nodeIds: [ids.nodes.footage], dock: 'history' })
})

test('canvas lookup and progress default to first route step without mutating state', () => {
  const { canvasStepFor, canvasProgress } = load('src/lib/guided/canvasTour.ts')
  const input = Object.freeze({ ...state, canvasStep: 'video', skippedCanvasSteps: Object.freeze(['image']) })
  assert.equal(canvasStepFor(input).id, 'video')
  assert.deepEqual(canvasProgress(input), { current: 5, total: 6 })
  assert.deepEqual(canvasProgress({ ...state, route: 'shoot', canvasStep: 'versions' }), { current: 4, total: 4 })
  assert.equal(canvasStepFor({ ...state, route: 'shoot', canvasStep: 'image' }).id, 'shots')
  assert.equal(canvasStepFor(state).id, 'shots')
  assert.equal(canvasStepFor({ ...state, stepId: 'edit' }), null)
  assert.equal(canvasStepFor({ ...state, route: null }), null)
  assert.equal(canvasProgress({ ...state, stepId: 'edit' }), null)
  assert.equal(input.canvasStep, 'video')
  assert.deepEqual(input.skippedCanvasSteps, ['image'])
})

test('next/previous follow each route, with null at native screen boundaries', () => {
  const { CANVAS_TOURS, nextCanvasStepId } = load('src/lib/guided/canvasTour.ts')
  for (const route of ['ai', 'shoot']) {
    const steps = CANVAS_TOURS[route]
    for (let i = 0; i < steps.length; i++) {
      assert.equal(nextCanvasStepId(route, steps[i].id, 'next'), steps[i + 1]?.id ?? null)
      assert.equal(nextCanvasStepId(route, steps[i].id, 'previous'), steps[i - 1]?.id ?? null)
    }
    assert.equal(nextCanvasStepId(route, undefined, 'next'), 'prompt')
    assert.equal(nextCanvasStepId(route, undefined, 'previous'), null)
  }
})

test('image/video replay requires manual native Run; optional Skip is generation-only', () => {
  for (const canvasStep of ['image', 'video']) {
    const html = render({ state: { ...state, canvasStep }, canContinue: false, onSkip() {} })
    assert.match(button(html, 'Next'), /disabled/)
    assert.doesNotMatch(button(html, 'Skip this replay'), /disabled/)
    assert.match(html, /Run \(Generate\)/)
    assert.match(html, /Canvas [35]\/6/)
    assert.doesNotMatch(render({ state: { ...state, canvasStep }, canContinue: false }), /Skip this replay/)
    assert.doesNotMatch(button(render({ state: { ...state, canvasStep } }), 'Next'), /disabled/)
  }
  for (const canvasStep of ['shots', 'prompt', 'connect', 'versions']) {
    const html = render({ state: { ...state, canvasStep }, canContinue: false, onSkip() {} })
    assert.doesNotMatch(html, /Skip this replay/)
    assert.doesNotMatch(button(html, 'Next'), /disabled/)
  }
})

test('rendering a generation step never triggers navigation or replay callbacks', () => {
  let calls = 0
  const action = () => { calls++ }
  render({ state: { ...state, canvasStep: 'image' }, onNext: action, onPrevious: action, onReset: action, onExit: action, onRoute: action, onSkip: action })
  assert.equal(calls, 0)
})

test('busy guards all actions except disclosure, and retains error and route gates', () => {
  const html = render({ state: { ...state, canvasStep: 'image' }, busy: true, onSkip() {}, error: 'Prepared replay unavailable' })
  for (const label of ['Next', 'Previous', 'Skip this replay', 'Restart guide', 'Exit guide']) assert.match(button(html, label), /disabled/)
  assert.match(html, /role="alert">Prepared replay unavailable/)
  assert.doesNotMatch(html.match(/<button[^>]*aria-label="Collapse guide"[^>]*>/)[0], /disabled/)
  assert.match(button(render({ state: { ...state, stepId: 'route', route: null } }), 'Next'), /disabled/)
  assert.equal(render({ state: { ...state, active: false } }), '')
})

test('prompt and footage copy are honest, bilingual and tied to the script', () => {
  const prompt = render({ state: { ...state, canvasStep: 'prompt' } })
  assert.match(prompt, /Shot 19 script/)
  assert.match(prompt, /only the fixed prepared prompt/)
  const footage = render({ state: { ...state, route: 'shoot', canvasStep: 'footage' } })
  assert.match(footage, /formal project/i)
  assert.match(footage, /not filmed footage/)
  assert.match(footage, /Canvas 3\/4/)
  const zh = render({ state: { ...state, route: 'shoot', canvasStep: 'footage' }, lang: 'zh-Hant' })
  assert.match(zh, /並非實拍/)
  assert.match(zh, /畫布 3\/4/)
  assert.match(render({ state: { ...state, canvasStep: 'video' } }), /fresh AI ad pending/)
})

test('header-only collapse hides the entire body, preserving compact top-right CSS', () => {
  const html = render({ busy: true }, true)
  assert.match(html, /data-collapsed="true"/)
  assert.match(html, /id="guided-tour-details" hidden=""/)
  assert.match(html, /aria-label="Expand guide" aria-expanded="false"/)
  const css = readFileSync(path.join(root, 'src/components/demo/guided-tour.css'), 'utf8')
  assert.match(css, /position: fixed;/)
  assert.match(css, /max-height: calc\(100vh - 16px\);/)
  assert.match(css, /top: 80px;/)
  assert.match(css, /right: 20px;/)
  assert.match(css, /width: 300px;/)
  assert.match(css, /\[data-collapsed="true"\] \{ top: 16px; width: 220px; padding: 8px 10px; \}/)
  assert.doesNotMatch(html, /Move guide|Generate now/)
})

// Exercise real component handlers/effects with controlled viewport measurements; no browser or business-state mocks.
function floatingHarness(overrides = {}) {
  const slots = [], listeners = new Map(), observers = [], captures = new Set()
  let cursor = 0, tree, effects = [], height = 300
  const priorWindow = globalThis.window, priorObserver = globalThis.ResizeObserver
  globalThis.window = { innerWidth: 1440, innerHeight: 900, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
  globalThis.ResizeObserver = class {
    constructor(fn) { this.fn = fn; observers.push(this) }
    observe() {}
    disconnect() { this.disconnected = true }
  }
  const hooks = {
    ...React,
    useState(initial) {
      const i = cursor++
      slots[i] ??= { value: initial }
      return [slots[i].value, next => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next }]
    },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i] },
    useLayoutEffect(fn, deps) {
      const i = cursor++, old = slots[i]
      if (!old || deps.some((value, n) => value !== old.deps[n])) effects.push(() => { old?.cleanup?.(); slots[i] = { deps, cleanup: fn() } })
    },
  }
  const Component = load('src/components/demo/GuidedTour.tsx', false, hooks).GuidedTour
  const walk = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)]
  const card = { getBoundingClientRect: () => ({ left: tree.props.style?.left ?? (window.innerWidth - (tree.props['data-collapsed'] ? 220 : 300) - 20), top: tree.props.style?.top ?? (tree.props['data-collapsed'] ? 16 : 80), width: tree.props['data-collapsed'] ? 220 : 300, height: tree.props['data-collapsed'] ? 44 : height }) }
  const target = { setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id), focus() {} }
  const renderTree = () => { cursor = 0; tree = Component({ ...props, ...overrides }); if (tree.props.ref) tree.props.ref.current = card; const pending = effects; effects = []; pending.forEach(fn => fn()); return tree }
  renderTree()
  return {
    render: renderTree,
    find: className => walk(tree).find(node => node.props?.className?.split(' ').includes(className)),
    event: patch => ({ pointerType: 'mouse', button: 0, pointerId: 4, clientX: 1130, clientY: 90, currentTarget: target, preventDefault() { this.prevented = true }, ...patch }),
    captures, listeners, observers,
    resize(width, h) { window.innerWidth = width; window.innerHeight = h; listeners.get('resize')?.(); renderTree() },
    grow(h) { height = h; observers.at(-1).fn(); renderTree() },
    close() { slots.forEach(slot => slot?.cleanup?.()); globalThis.window = priorWindow; globalThis.ResizeObserver = priorObserver },
  }
}

test('dedicated bilingual drag handle does not attach dragging to header, text or navigation', () => {
  const en = render(), zh = render({ lang: 'zh-Hant', busy: true })
  assert.match(en, /aria-label="Drag guide; use arrow keys to move"/)
  assert.match(zh, /aria-label="拖曳導覽；或使用方向鍵移動"/)
  let next = 0, previous = 0
  const h = floatingHarness({ onNext: () => next++, onPrevious: () => previous++ })
  try {
    assert.equal(h.find('guided-tour__header').props.onPointerDown, undefined)
    assert.equal(h.find('guided-tour__next').props.onPointerDown, undefined)
    h.find('guided-tour__next').props.onClick(); h.find('guided-tour__previous').props.onClick()
    assert.deepEqual([next, previous], [1, 1])
  } finally { h.close() }
})

test('mouse drag captures pointer, clamps all edges and ends on release/cancel/lost capture', () => {
  const h = floatingHarness()
  try {
    const handle = h.find('guided-tour__drag')
    assert.ok(handle)
    handle.props.onPointerDown(h.event({ button: 2 })); assert.equal(h.captures.size, 0)
    handle.props.onPointerDown(h.event({ pointerType: 'touch' })); assert.equal(h.captures.size, 0)
    handle.props.onPointerDown(h.event()); assert.equal(h.captures.has(4), true)
    handle.props.onPointerMove(h.event({ clientX: -1000, clientY: 2000 })); assert.deepEqual(h.render().props.style, { left: 8, top: 592, right: 'auto' })
    handle.props.onPointerMove(h.event({ clientX: 9999, clientY: -9999 })); assert.deepEqual(h.render().props.style, { left: 1132, top: 8, right: 'auto' })
    handle.props.onPointerUp(h.event()); assert.equal(h.captures.size, 0)
    handle.props.onPointerMove(h.event({ clientX: 500, clientY: 500 })); assert.equal(h.render().props.style.top, 8)
    for (const ending of ['onPointerCancel', 'onLostPointerCapture']) {
      handle.props.onPointerDown(h.event()); handle.props[ending](h.event()); const before = h.render().props.style
      handle.props.onPointerMove(h.event({ clientX: 500, clientY: 500 })); assert.deepEqual(h.render().props.style, before)
    }
  } finally { h.close() }
})

test('collapse, expansion, viewport resize and card growth re-clamp without stores or navigation', () => {
  const h = floatingHarness({ busy: true })
  try {
    h.find('guided-tour__collapse').props.onClick(); h.render()
    const handle = h.find('guided-tour__drag')
    handle.props.onPointerDown(h.event({ clientX: 1230, clientY: 26 }))
    handle.props.onPointerMove(h.event({ clientX: 9999, clientY: 9999 })); handle.props.onPointerUp(h.event())
    assert.deepEqual(h.render().props.style, { left: 1212, top: 848, right: 'auto' })
    h.find('guided-tour__collapse').props.onClick(); h.render()
    assert.deepEqual(h.render().props.style, { left: 1132, top: 592, right: 'auto' })
    h.resize(500, 400); assert.deepEqual(h.render().props.style, { left: 192, top: 92, right: 'auto' })
    h.grow(350); assert.equal(h.render().props.style.top, 42)
  } finally { h.close() }
  assert.equal(h.listeners.size, 0)
  assert.ok(h.observers.every(observer => observer.disconnected))
})

test('keyboard arrows move and clamp while unrelated keys and navigation remain untouched', () => {
  const h = floatingHarness({ busy: true })
  try {
    const handle = h.find('guided-tour__drag'); assert.equal(handle.props.disabled, undefined)
    const arrow = h.event({ key: 'ArrowLeft' }); handle.props.onKeyDown(arrow)
    assert.equal(arrow.prevented, true); assert.equal(h.render().props.style.left, 1104)
    const enter = h.event({ key: 'Enter' }); handle.props.onKeyDown(enter); assert.equal(enter.prevented, undefined)
    h.resize(500, 400)
    for (let n = 0; n < 40; n++) { h.find('guided-tour__drag').props.onKeyDown(h.event({ key: 'ArrowUp' })); h.render() }
    assert.equal(h.render().props.style.top, 8)
  } finally { h.close() }
})
