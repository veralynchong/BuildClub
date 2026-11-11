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

test('six-shot tour expands prompts and images in order, gates manual replay and keeps native docks', () => {
  const { CANVAS_TOURS, canvasStepFor, canvasProgress, nextCanvasStepId } = load('src/lib/guided/canvasTour.ts')
  const expected = ['shots','prompt-s1','image-s1','history-s1','prompt-s2','image-s2','history-s2','image-s3','image-s4','image-s5','image-s6','versions']
  for (const route of ['ai','shoot']) {
    const steps = CANVAS_TOURS[route]
    assert.deepEqual(steps.map(s => s.id),expected)
    assert.equal(steps.filter(s => s.generation).length,6)
    for (const [i,step] of steps.entries()) {
      for (const lang of ['en','zh-Hant']) assert.ok(step[lang].title && step[lang].description)
      assert.equal(nextCanvasStepId(route,step.id,'next'),expected[i+1] ?? null)
      assert.equal(nextCanvasStepId(route,step.id,'previous'),expected[i-1] ?? null)
      assert.deepEqual(canvasProgress({...state,route,canvasStep:step.id}),{current:i+1,total:12})
      const html = render({state:{...state,route,canvasStep:step.id},canContinue:false,onSkip(){}})
      if (step.generation) {
        assert.match(button(html,'Next'),/disabled/)
        assert.doesNotMatch(button(html,'Skip this replay'),/disabled/)
        assert.equal(step.focus.dock,'inspect')
        assert.equal(step.focus.revealNodeIds.length,2)
      } else assert.doesNotMatch(html,/Skip this replay/)
      assert.match(button(render({state:{...state,route,canvasStep:step.id},busy:true}),'Next'),/disabled/)
    }
  }
  assert.equal(canvasStepFor(state).id,'shots')
  assert.equal(canvasStepFor({...state,stepId:'edit'}),null)
  assert.match(render({state:{...state,canvasStep:'prompt-s1'}}),/six-shot adapted script/)
  assert.match(render({state:{...state,canvasStep:'image-s1'}}),/not live AI/)
  assert.match(render({state:{...state,canvasStep:'image-s1'},lang:'zh-Hant'}),/並非即時 AI/)
  assert.match(render(),/excludes draft edits/)
  let calls=0
  render({onNext(){calls++},onSkip(){calls++}})
  assert.equal(calls,0)
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
