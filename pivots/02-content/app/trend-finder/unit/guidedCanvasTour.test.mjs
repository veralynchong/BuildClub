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
  assert.deepEqual(GUIDED_STEPS.map(s => guidedMainProgress(s.id)), [1, 1, 2, 3, 4, 5, 6, 7].map(current => ({ current, total: 7 })))
  assert.match(render(), /guided-tour__count">5\/7</)
  assert.match(render(), /aria-valuemax="7" aria-valuenow="5"/)
})

test('six-shot tour expands prompts and images in order, gates manual replay and keeps native docks', () => {
  const { CANVAS_TOURS, canvasStepFor, canvasProgress, nextCanvasStepId } = load('src/lib/guided/canvasTour.ts')
  const expectedByRoute = { ai: ['shots','prompt-s1','image-s1','video-s1','history-s1','prompt-s2','image-s2','history-s2','image-s3','video-s4','image-s5','video-s5','image-s6','versions'], shoot: ['shots','prompt-s1','image-s1','rewrite-s1','image-s1-v2','versions'] }
  for (const route of ['ai','shoot']) {
    const steps = CANVAS_TOURS[route]
    const expected = expectedByRoute[route]
    assert.deepEqual(steps.map(s => s.id),expected)
    assert.equal(steps.filter(s => s.generation).length,route === 'ai' ? 8 : 0)
    for (const [i,step] of steps.entries()) {
      for (const lang of ['en','zh-Hant']) assert.ok(step[lang].title && step[lang].description)
      assert.equal(nextCanvasStepId(route,step.id,'next'),expected[i+1] ?? null)
      assert.equal(nextCanvasStepId(route,step.id,'previous'),expected[i-1] ?? null)
      assert.deepEqual(canvasProgress({...state,route,canvasStep:step.id}),{current:i+1,total:expected.length})
      const html = render({state:{...state,route,canvasStep:step.id},canContinue:false,onSkip(){}})
      if (step.generation) {
        assert.match(button(html,'Next'),/disabled/)
        assert.doesNotMatch(button(html,'Skip this replay'),/disabled/)
        assert.equal(step.focus.dock,'inspect')
        assert.equal(step.focus.revealNodeIds.length,route === 'shoot' ? 1 : 2)
      } else assert.doesNotMatch(html,/Skip this replay/)
      assert.match(button(render({state:{...state,route,canvasStep:step.id},busy:true}),'Next'),/disabled/)
    }
  }
  assert.equal(canvasStepFor(state).id,'shots')
  assert.equal(canvasStepFor({...state,stepId:'edit'}),null)
  assert.match(render({state:{...state,canvasStep:'prompt-s1'}}),/visual intention/)
  assert.match(render({state:{...state,canvasStep:'image-s1'}}),/no live generation/)
  assert.match(render({state:{...state,canvasStep:'image-s1'},lang:'zh-Hant'}),/無即時生成/)
  assert.match(render(),/Local editing and export are real/)
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
  const frames = new Map(); let nextFrame = 0
  const slots = [], listeners = new Map(), observers = [], captures = new Set()
  let cursor = 0, tree, effects = [], height = 300, currentProps = { ...props, ...overrides }
  const priorWindow = globalThis.window, priorObserver = globalThis.ResizeObserver
  globalThis.window = { requestAnimationFrame: fn => { frames.set(++nextFrame, fn); return nextFrame }, cancelAnimationFrame: id => frames.delete(id), innerWidth: 1440, innerHeight: 900, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) }
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
  const position = () => tree.props.style?.transform?.match(/translate3d\(([-.\d]+)px, ([-.\d]+)px, 0\)/)?.slice(1).map(Number)
  const card = { getBoundingClientRect: () => ({ left: position()?.[0] ?? (tree.props['data-placement'] !== 'right' ? 72 : window.innerWidth - (tree.props['data-collapsed'] ? 220 : 300) - 20), top: position()?.[1] ?? (tree.props['data-collapsed'] ? 16 : tree.props['data-placement'] === 'bottom-left' ? window.innerHeight - height - 20 : 80), width: tree.props['data-collapsed'] ? 220 : 300, height: tree.props['data-collapsed'] ? 44 : height }) }
  const target = { setPointerCapture: id => captures.add(id), hasPointerCapture: id => captures.has(id), releasePointerCapture: id => captures.delete(id), focus() {} }
  const renderTree = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); cursor = 0; tree = Component(currentProps); if (tree.props.ref) tree.props.ref.current = card; const pending = effects; effects = []; pending.forEach(fn => fn()); return tree }
  renderTree()
  return {
    render: () => { const result = renderTree(); const xy = position(); return { ...result, props: { ...result.props, style: xy ? { left: xy[0], top: xy[1], right: 'auto' } : result.props.style } } },
    find: className => walk(tree).find(node => node.props?.className?.split(' ').includes(className)),
    event: patch => ({ pointerType: 'mouse', button: 0, pointerId: 4, clientX: 1130, clientY: 90, currentTarget: target, preventDefault() { this.prevented = true }, ...patch }),
    captures, listeners, observers,
    updateProps(patch) { currentProps = { ...currentProps, ...patch }; renderTree() },
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

test('Exit guide remains available while the guide is busy', () => {
 assert.doesNotMatch(button(render({busy:true}),'Exit guide'),/disabled/)
})


test('guide leaves the active analysis, editing and canvas side panels unobstructed', () => {
  for (const stepId of ['search', 'results', 'research']) assert.match(render({ state: { ...state, stepId } }), /data-placement="right"/)
  for (const stepId of ['script', 'route', 'edit', 'result']) assert.match(render({ state: { ...state, stepId } }), /data-placement="left"/)
  for (const route of ['ai', 'shoot']) {
    for (const canvasStep of (route === 'ai' ? ['image-s1', 'history-s1', 'versions'] : ['prompt-s1','image-s1','rewrite-s1','image-s1-v2','versions'])) assert.match(render({ state: { ...state, route, canvasStep } }), /data-placement="bottom-left"/)
    for (const canvasStep of (route === 'ai' ? ['shots', 'prompt-s1'] : ['shots'])) assert.match(render({ state: { ...state, route, canvasStep } }), /data-placement="right"/)
  }
})


test('manual placement stays within a step, resets on navigation and cancels an in-flight drag', () => {
  const h = floatingHarness()
  try {
    h.find('guided-tour__drag').props.onKeyDown(h.event({ key: 'ArrowLeft' }))
    assert.equal(h.render().props.style.left, 1104)
    h.updateProps({ busy: true })
    assert.equal(h.render().props.style.left, 1104)
    h.updateProps({ state: { ...state, canvasStep: 'image-s1' } })
    assert.equal(h.render().props['data-placement'], 'bottom-left')
    assert.equal(h.render().props.style, undefined)
    const handle = h.find('guided-tour__drag')
    handle.props.onPointerDown(h.event({ clientX: 82, clientY: 590 }))
    handle.props.onPointerMove(h.event({ clientX: 650, clientY: 150 }))
    h.updateProps({ state: { ...state, stepId: 'edit' } })
    assert.equal(h.render().props['data-placement'], 'left')
    assert.equal(h.render().props.style, undefined)
    handle.props.onPointerMove(h.event({ clientX: 500, clientY: 500 }))
    assert.equal(h.render().props.style, undefined)
    h.updateProps({ state })
    assert.equal(h.render().props['data-placement'], 'right')
    assert.equal(h.render().props.style, undefined)
  } finally { h.close() }
})


test('Plan a shoot is the direct Canvas action without a second Next button', () => {
 const html=render({state:{...state,stepId:'route',route:null}})
 assert.equal(button(html,'Next'),undefined)
 assert.doesNotMatch(button(html,'Plan a shoot'),/disabled/)
 let chosen=null
 const h=floatingHarness({state:{...state,stepId:'route',route:null},onRoute:route=>{chosen=route}})
 try {h.find('guided-tour__route').props.onClick();assert.equal(chosen,'shoot')}finally{h.close()}
})
