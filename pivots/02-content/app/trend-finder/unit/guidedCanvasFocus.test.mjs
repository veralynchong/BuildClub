import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const board = ts.createSourceFile('CanvasScreen.tsx', readFileSync(new URL('../src/components/canvas/CanvasScreen.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
function find(node, predicate) {
  if (predicate(node)) return node
  return ts.forEachChild(node, child => find(child, predicate))
}
const handler = find(board, node => ts.isBinaryExpression(node) && node.left.getText(board) === 'guideFocus.current').right
const transition = find(board, node => ts.isVariableDeclaration(node) && node.name.getText(board) === 'changeEditing').initializer
function fixture(overrides = {}) {
  const events = []
  let focused = null
  let generateCalls = 0
  const scope = {
    guideBusy: false, editing: false, mounted: { current: true },
    doc: { nodes: [{ id: 'image' }, { id: 'video' }], edges: [{ id: 'image-video' }] },
    edit: { flush: async () => true },
    setEditing: value => events.push(['editing', value]),
    setGuideEditor: value => events.push(['editor', value]),
    setGuideExport: value => events.push(['export', value]),
    setSelected: value => events.push(['nodes', value]),
    setSelectedEdges: value => events.push(['edges', value]),
    setDock: value => events.push(['dock', value]),
    requestAnimationFrame: callback => { callback(); return 1 },
    fitView: async options => { events.push(['fit', options]); return true },
    setGuideFocused: value => { focused = value },
    startGen: () => { generateCalls++ },
    ...overrides,
  }
  const js = ts.transpileModule(`const changeEditing = ${transition.getText(board)}; exports.focus = ${handler.getText(board)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', ...Object.keys(scope), js)(output, ...Object.values(scope))
  return { focus: output.focus, events, focused: () => focused, generateCalls: () => generateCalls }
}

test('native focus selects the real nodes and edge and publishes readiness only after fitView finishes', async () => {
  let release
  const app = fixture({ fitView: () => new Promise(resolve => { release = resolve }) })
  const request = { nodeIds: ['image', 'video'], edgeIds: ['image-video'], dock: 'inspect' }
  const running = app.focus(request)
  await Promise.resolve()
  assert.equal(app.focused(), null)
  release(true)
  assert.equal(await running, true)
  assert.deepEqual(app.focused(), request)
  assert.deepEqual(app.events.find(event => event[0] === 'nodes')[1], ['image', 'video'])
  assert.equal(app.generateCalls(), 0)
})

test('busy, missing targets, editor flush denial and an unmounted board cannot claim focus', async () => {
  for (const overrides of [
    { guideBusy: true },
    { doc: { nodes: [], edges: [] } },
    { editing: true, edit: { flush: async () => false } },
    { mounted: { current: false } },
    { fitView: async () => false },
  ]) {
    const app = fixture(overrides)
    assert.equal(await app.focus({ nodeIds: ['image'], dock: null }), false)
    assert.equal(app.focused(), null)
    assert.equal(app.generateCalls(), 0)
  }
  const app = fixture()
  assert.equal(await app.focus({ nodeIds: ['image'], edgeIds: ['foreign-edge'] }), false)
  assert.equal(app.events.length, 0)
})

test('nested progress requires the completed native focus and the actual Inspector or History dock', () => {
  const appSource = ts.createSourceFile('App.tsx', readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const matcher = find(appSource, node => ts.isFunctionDeclaration(node) && node.name?.text === 'matchesCanvasFocus')
  const js = ts.transpileModule(`${matcher.getText(appSource)}; exports.match = matchesCanvasFocus`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  const output = {}
  new Function('exports', js)(output)
  const desired = { nodeIds: ['image', 'video'], edgeIds: ['image-video'], dock: null }
  const observed = { focusedNodeIds: ['image', 'video'], focusedEdgeIds: ['image-video'], focusedDock: null }
  assert.equal(output.match(observed, desired), true)
  for (const patch of [{ focusedNodeIds: ['image'] }, { focusedEdgeIds: [] }, { focusedDock: 'history' }]) assert.equal(output.match({ ...observed, ...patch }, desired), false)
  assert.equal(output.match({}, desired), false)
})


test('editor transitions invalidate previous readiness before publishing the new screen', () => {
  for (const editing of [false, true]) {
    const events = []
    const output = {}
    const js = ts.transpileModule(`exports.change = ${transition.getText(board)}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
    new Function('exports', 'editing', 'setGuideEditor', 'setEditing', 'registerGuide', 'getGuidedRuntime', 'apiBase', 'resource', js)(output, editing, value => events.push(['ready', value.ready]), value => events.push(['editing', value]), true, () => ({local: {removeItem: key => events.push(['intro', key])}}), () => '/api/test', {})
    output.change(!editing)
    assert.deepEqual(events, [['ready', false], ...(!editing ? [['intro', 'editor-arrival.v1:/api/test']] : []), ['editing', !editing]])
    events.length = 0
    output.change(editing)
    assert.deepEqual(events, [['editing', editing]])
  }
})

// Exercise the actual automatic action against the prepared API, including recovery of another pending Prompt.
test('Next waits for a different pending image and only completes with the requested Prompt and source', async () => {
  const {createFreshSixData,materializeFresh,freshSourceFor} = await import('../src/lib/guided/freshSix.ts')
  const {OPENING_VERSIONS,OPENING_IMAGES} = await import('../src/lib/guided/shootOpening.ts')
  const {genRequest} = await import('../src/lib/canvas/graph.ts')
  const {selectGeneration} = await import('../src/lib/canvas/session.ts')
  const store = () => { const values=new Map(); return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)} }
  let time=0; const data=createFreshSixData(store(),store(),()=>time)
  const call=async(path,method='GET',body)=>{const res=await data.request(new Request(`http://local/api/ideas/guided-tofu-shoot/${path}`,{method,...(body?{body:JSON.stringify(body)}:{})}));const result=await res.json();assert.equal(res.status,200,JSON.stringify(result));return result}
  let initial=await call('canvas'),doc=materializeFresh(initial.doc,['n_six_prompt_s1','n_six_image_s1'],'shoot'),version=initial.version,gens=[]
  const change=next=>{doc=next}
  const flush=async()=>{version=(await call('canvas','PUT',{version,doc})).version;return true}
  await flush()
  const refresh=async()=>{const current=await call('canvas');doc=current.doc;version=current.version;gens=current.generations}
  const selected=[]
  const scope={readOnly:false,registerGuide:()=>{},freshRoute:()=> 'shoot',resource:{id:'guided-tofu-shoot'},busyRef:{current:new Set()},setBusy(){},session:{doc:()=>doc,version:()=>version},change,flush,
    getCanvas:()=>call('canvas'),refresh,OPENING_VERSIONS,OPENING_IMAGES,genRequest,freshSourceFor,
    quoteNode:(_resource,nodeId,canvasVersion)=>call('gen','POST',{nodeId,canvasVersion,confirm:false}),
    startGen:(_resource,body)=>call('gen','POST',body),generationItems:gen=>[gen],setGens:next=>{gens=typeof next==='function'?next(gens):next},
    pollGen:async(_resource,id,onProgress)=>{time+=1600;const gen=await call(`gen/${id}`);onProgress?.(gen);return gen},abort:{current:new AbortController()},selectGeneration,
    selectionIO:()=>({current:()=>doc,change,flush,generations:gens,voices:[],importVoice:async()=>{throw Error('No voice expected')},onVoice(){}}),
    timeline:{useForShot:async source=>{selected.push(source);return true}},edit:{flush:async()=>true},ff:key=>key}
  const source=find(board,node=>ts.isVariableDeclaration(node)&&node.name.getText(board)==='performDemoAction').initializer
  const output={};const js=ts.transpileModule(`exports.action = ${source.getText(board)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText
  new Function('exports',...Object.keys(scope),js)(output,...Object.values(scope))
  doc={...doc,nodes:doc.nodes.map(node=>node.id==='n_six_image_s1'?{...node,data:{...node.data,prompt:OPENING_VERSIONS[1].prompt}}:node)};await flush()
  const quote=await scope.quoteNode(null,'n_six_image_s1',version)
  const readonlyOutput={};new Function('exports',...Object.keys(scope),js)(readonlyOutput,...Object.values({...scope,readOnly:true}));assert.equal(await readonlyOutput.action('image-1'),false)
  const pending=await scope.startGen(null,{nodeId:'n_six_image_s1',canvasVersion:version,confirm:true,inputStamp:quote.inputStamp,quoteStamp:quote.quoteStamp})
  assert.equal(pending.status,'queued')
  assert.equal(await output.action('image-1'),true)
  await refresh();let chosen=gens.find(gen=>gen.id===doc.nodes.find(node=>node.id==='n_six_image_s1').data.selected)
  assert.equal(chosen.inputs.prompt,OPENING_VERSIONS[0].prompt);assert.equal(chosen.url,OPENING_IMAGES[0]);assert.notEqual(chosen.id,pending.id)
  const count=gens.length;await output.action('image-1');await refresh();assert.equal(gens.length,count)
  await output.action('prompt-2');await refresh();assert.equal(gens.length,count)
  await output.action('image-2');await output.action('select');assert.equal(selected[0].id,'shoot-s1-v2')
})
