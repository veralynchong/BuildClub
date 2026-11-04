import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, MiniMap, ReactFlow, ReactFlowProvider, applyNodeChanges, useReactFlow, type Connection, type Edge, type FinalConnectionState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { CanvasContext as CanvasResource } from '../../lib/canvas/resource'
import type { CanvasDoc, CanvasNode, CanvasState, GenModel, Generation, NodeData, NodeKind, Budget } from '../../lib/canvas/types'
import { getCanvas, getKit, getModels, getBudget, putCanvas, StaleCanvas, quoteNode, startGen, pollGen, uploadMedia } from '../../lib/canvas/api'
import type { Kit, Shot } from '../../types'
import { syncKit, kitTargets } from '../../lib/canvas/kit'
import { legacyGenerationRequest, legacyInputsMatch, applyLegacyFrames } from '../../lib/canvas/legacy'
import { replaceUploadedMedia } from '../../lib/canvas/mediaReplacement'
import { KitPanel } from './KitPanel'
import { createCanvasSession, draftStore, reconcileGenerations, selectGeneration, rememberGeneration } from '../../lib/canvas/session'
import { genRequest, markStale, priceOf, selectedGen } from '../../lib/canvas/graph'
import { canConnect, compatibleKinds } from '../../lib/canvas/ports'
import { apiBase } from '../../lib/canvas/resource'
import { applyPromptPlan, connectedPrompt, generationOrder, createNode, duplicateNode, editorEdges, removeEditorSource, type PromptPlan } from '../../lib/canvas/freeform'
import { ff, usd, seconds } from '../../lib/strings/freeform'
import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import { useEditProject } from '../../lib/editor/useEditProject'
import { useSources } from '../../lib/editor/useSources'
import { useTimelineActions } from '../../lib/editor/useTimelineActions'
import { addVoice } from '../../lib/editor/timeline'
import { putVoice, quoteTts, startTts, importTts, getVoices, type VoiceInfo } from '../../lib/editor/api'
import { EditorPanel } from '../editor/EditorPanel'
import { FreeformNode, NodeSettings } from './FreeformNode'
import { FreeformContext, type FreeNode, type FreeformActions } from './freeformContext'
import { ZoomBar } from './ZoomBar'
import { chooseTake, listTakes, uploadTake, type Take } from '../../lib/takes'
import { createShareLink } from '../../lib/share'

interface Props {
  onShotsChange?: (shots: Shot[]) => void
  context: CanvasResource
  clientName: string
  onBack: () => void
  openEditor?: boolean
  fullscreen: boolean
  onFullscreen: (on: boolean) => void
}
export default function CanvasScreen(props: Props) {
  const [state, setState] = useState<CanvasState | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const resource = props.context.resource
  useEffect(() => {
    let cancelled = false
    setState(null)
    getCanvas(resource).then((s) => { if (!cancelled) { setState(s); setError('') } }, (e) => !cancelled && setError(String(e.message)))
    return () => { cancelled = true }
  }, [resource, attempt])
  if (!state) return <section className="fc-loading"><button onClick={props.onBack}>← {ff('back')}</button>{error ? <div role="alert">{error}<button onClick={() => setAttempt((a) => a + 1)}>{ff('reload')}</button></div> : t('canvas.loading')}</section>
  return <ReactFlowProvider><Board key={`${resource.kind}:${resource.id}:${attempt}`} {...props} initial={state} reload={() => setAttempt((a) => a + 1)} /></ReactFlowProvider>
}
const freeformNodeTypes = { freeform: FreeformNode }
const kinds: NodeKind[] = ['prompt', 'upload', 'storyboard', 'video', 'voice', 'editor']
const glyphs = ['T', '↑', '▧', '▷', '♫', '▤']
type Dock = 'inspect' | 'history' | 'assistant' | null
function Board({ context, onShotsChange, initial, clientName, onBack, openEditor = false, fullscreen, onFullscreen, reload }: Props & { initial: CanvasState; reload: () => void }) {
  const { resource, shots, readOnly, clientId, title } = context
  const [doc, setDoc] = useState(initial.doc)
  const [takes, setTakes] = useState<Take[]>(initial.takes)
  const [gens, setGens] = useState(initial.generations)
  const [models, setModels] = useState<GenModel[]>([])
  const [budget, setBudget] = useState<Budget | null>(null)
  const [kit, setKit] = useState<Kit | null>(null)
  const [kitFailed, setKitFailed] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [selectedEdges, setSelectedEdges] = useState<string[]>([])
  const runQueue = useRef<string[]>([])
  const [runAll, setRunAll] = useState(false)
  const nextRun = useRef<() => void>(() => {})
  const [selected, setSelected] = useState<string[]>([])
  const [dock, setDock] = useState<Dock>(null)
  const [menu, setMenu] = useState<{ x: number; y: number; from?: string; at: { x: number; y: number } } | null>(null)
  const [search, setSearch] = useState('')
  const [pan, setPan] = useState(false)
  const [editing, setEditing] = useState(openEditor && initial.doc.nodes.some((n) => n.type === 'editor'))
  const [note, setNote] = useState('')
  const [save, setSave] = useState<'saved' | 'saving' | 'failed'>('saved')
  const [stale, setStale] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const busyRef = useRef(new Set<string>())
  const [plan, setPlan] = useState<PromptPlan | null>(null)
  const [quote, setQuote] = useState<{ id: string; usd: number; remaining: number | null; signature: string; inputStamp?: string } | null>(null)
  const [link, setLink] = useState('')
  const [copied, setCopied] = useState(false)
  const mounted = useRef(true)
  const sessionRef = useRef<ReturnType<typeof createCanvasSession> | null>(null)
  if (!sessionRef.current) sessionRef.current = createCanvasSession(initial, {
    ...draftStore(`remake.canvas.draft:${resource.kind}:${resource.id}`),
    save: (version, doc) => putCanvas(resource, version, doc),
    changed: (s) => { setDoc(s.doc); setSave(s.save); setStale(s.conflict) },
    isConflict: (e) => e instanceof StaleCanvas,
    error: (e) => setNote(e instanceof Error ? e.message : String(e)),
  })
  const session = sessionRef.current
  const [recoveryOpen, setRecoveryOpen] = useState(!!session.recovery())
  const [reloadAsk, setReloadAsk] = useState(false)
  const abort = useRef(new AbortController())
  const drag = useRef<string | null>(null)
  const flowBox = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()
  const edit = useEditProject(resource, readOnly)
  const sources = useSources(resource, JSON.stringify(gens.map((g) => [g.id, g.status])))
  const timeline = useTimelineActions({ freeform: resource.kind === 'workspace', edit, sources, shots, doc, gens, takes, readOnly: readOnly || stale, onPlaced: () => {}, notify: (key) => setNote(t(key)) })
  const change = useCallback((next: CanvasDoc) => {
    if (!readOnly && !recoveryOpen) session.change(next)
  }, [readOnly, session, recoveryOpen])
  const flush = useCallback(() => readOnly || !mounted.current ? Promise.resolve(false) : session.flush(), [session, readOnly])
  useEffect(() => { if (doc === session.saved() || readOnly || recoveryOpen) return; const timer = setTimeout(() => void flush(), 650); return () => clearTimeout(timer) }, [doc, flush, readOnly, session, recoveryOpen])
  useEffect(() => { mounted.current = true; abort.current = new AbortController(); return () => { mounted.current = false; abort.current.abort(); session.keepDraft() } }, [session])
  useEffect(() => {
    let cancelled = false
    Promise.all([getModels(), getBudget(), getVoices(resource)]).then(([m, b, v]) => { if (!cancelled) { setModels(m); setBudget(b); setVoices(v) } }, (e) => !cancelled && setNote(e.message))
    return () => { cancelled = true }
  }, [resource])
  const applyKit = (next: Kit) => {
    setKit(next); setKitFailed(false)
    if (resource.kind === 'legacy-plan') change(syncKit(session.doc(), next, gens).doc)
  }
  const syncKitRef = useRef(() => {})
  syncKitRef.current = () => { if (kit && resource.kind === 'legacy-plan' && !recoveryOpen) change(syncKit(session.doc(), kit, gens).doc) }
  useEffect(() => { syncKitRef.current() }, [kit, recoveryOpen])
  const applyKitRef = useRef(applyKit)
  applyKitRef.current = applyKit
  useEffect(() => {
    let cancelled = false
    getKit(clientId).then((next) => { if (!cancelled) applyKitRef.current(next) }, (e) => { if (!cancelled) { setKitFailed(true); setNote(e.message) } })
    return () => { cancelled = true }
  }, [clientId])
  const writeLegacyFrames = (nextDoc: CanvasDoc, nextGens: Generation[]) => {
    if (resource.kind !== 'legacy-plan' || readOnly) return
    const next = applyLegacyFrames(nextDoc, shots, nextGens)
    if (next !== shots) onShotsChange?.(next)
  }
  const frameSync = useRef(() => {})
  frameSync.current = () => writeLegacyFrames(session.saved(), gens)
  useEffect(() => { frameSync.current() }, [doc, gens, shots, save])
  const refresh = async () => {
    if (!await flush()) return
    const snapshot = session.doc()
    const s = await getCanvas(resource)
    setGens(s.generations)
    writeLegacyFrames(s.doc, s.generations)
    // A concurrent local edit must survive an arriving generation. The next server read derives its stale flag.
    if (snapshot === session.doc()) session.acceptServer(s)
    setBudget(await getBudget())
    setVoices(await getVoices(resource))
  }
  const selectionIO = (knownVoices = voices) => ({
    current: session.doc, change, flush, voices: knownVoices, generations: gens,
    matchesInputs: (gen: Generation) => { const model = models.find((m) => m.id === gen.model); return resource.kind === 'legacy-plan' && !!model && legacyInputsMatch(session.doc(), gen, shots, gens, kit, model) },
    importVoice: (genId: string, nodeId: string) => importTts(resource, genId, nodeId),
    onVoice: (v: VoiceInfo) => setVoices((vs) => [...vs.filter((old) => old.id !== v.id), v]),
  })
  const follow = async (gen: Generation) => {
    setGens((gs) => [...gs.filter((g) => g.id !== gen.id), gen])
    const end = await pollGen(resource, gen.id, (g) => setGens((gs) => [...gs.filter((x) => x.id !== g.id), g]), { signal: abort.current.signal })
    if (!end) return
    if (end.status !== 'done') {
      await reconcileGenerations([end], selectionIO())
      throw new Error(serverText(end.error) || t('canvas.err.start'))
    }
    if (!await selectGeneration(end, selectionIO())) throw new Error(ff('saveFirst'))
    await refresh()
  }
  const resumeRef = useRef<() => Promise<void>>(async () => {})
  resumeRef.current = async () => {
    if (readOnly || recoveryOpen) return
    const knownVoices = await getVoices(resource)
    if (!mounted.current) return
    setVoices(knownVoices)
    await reconcileGenerations(initial.generations, selectionIO(knownVoices))
    for (const g of initial.generations.filter((g) => ['queued', 'running', 'waiting'].includes(g.status))) {
      const n = session.doc().nodes.find((n) => n.id === g.nodeId)
      if (!n) continue
      if (!n.data.awaiting) { change({ ...session.doc(), nodes: session.doc().nodes.map((node) => node.id === n.id ? { ...node, data: { ...node.data, awaiting: g.id } } : node) }); if (!await flush()) return }
      void follow(g).catch((e) => setNote(e.message))
    }
  }
  useEffect(() => { void resumeRef.current().catch((e) => setNote(e.message)) }, [initial, recoveryOpen])
  const withBusy = async (id: string, run: () => Promise<void>) => {
    if (readOnly || stale || busyRef.current.has(id)) return
    busyRef.current.add(id); setBusy(new Set(busyRef.current)); setNote('')
    try { await run() } catch (e) { setNote(e instanceof Error ? e.message : String(e)); runQueue.current = []; setRunAll(false); if (e instanceof StaleCanvas) setStale(true) }
    finally { busyRef.current.delete(id); setBusy(new Set(busyRef.current)) }
  }
  const update = (id: string, patch: Partial<NodeData>) => {
    if (quote) return
    const next = { ...session.doc(), nodes: session.doc().nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, ...patch, ...(['storyboard', 'video', 'voice'].includes(n.type) && selectedGen(n, gens) ? { stale: true } : {}) } } : n) }
    change(markStale(next, id, gens))
  }
  const begin = async (id: string, confirmed = false) => withBusy(id, async () => {
    if (!await flush()) throw new Error(ff('saveFirst'))
    const n = session.doc().nodes.find((n) => n.id === id)!
    const model = models.find((m) => m.id === n.data.model)
    if (!model?.available) throw new Error(t('canvas.err.models'))
    const needsKit = resource.kind === 'legacy-plan' && session.doc().edges.some((e) => e.target === id && e.targetHandle === 'in:kit')
    if (needsKit && (!kit || kitFailed)) throw new Error(ff('kitUnavailable'))
    const request = resource.kind === 'legacy-plan' ? legacyGenerationRequest(session.doc(), id, shots, gens, kit, model).request : genRequest(session.doc(), id, shots, gens, kit, model)
    if (resource.kind === 'workspace') request.prompt = connectedPrompt(session.doc(), id)
    const signature = JSON.stringify({ version: session.version(), model: n.data.model, request })
    let usd = priceOf(model, n.data.duration)
    let remaining: number | null = budget?.[model.kind] ? budget[model.kind].cap - budget[model.kind].spent : null
    let inputStamp: string | undefined
    if (n.type === 'voice') {
      const q = await quoteTts(resource, request.prompt, model.id, id, session.version())
      usd = q.usd; remaining = q.remaining; inputStamp = q.inputStamp
    } else if (resource.kind === 'workspace') {
      const q = await quoteNode(resource, id, session.version())
      usd = q.total; remaining = q.remaining[model.kind] ?? null; inputStamp = q.inputStamp
    }
    if (usd > 0 && (!confirmed || quote?.signature !== signature || quote.usd !== usd || quote.inputStamp !== inputStamp)) {
      setQuote({ id, usd, remaining, signature, inputStamp })
      if (confirmed) setNote(ff('changed'))
      return
    }
    setQuote(null)
    const g = n.type === 'voice' ? await startTts(resource, request.prompt, model.id, id, session.version(), inputStamp) : await startGen(resource, { nodeId: id, model: model.id, ...request, canvasVersion: session.version(), inputStamp, confirm: confirmed || usd === 0 })
    if (!await rememberGeneration(g, selectionIO())) throw new Error(ff('saveFirst'))
    await follow(g)
    setTimeout(() => nextRun.current(), 0)
  })
  nextRun.current = () => {
    const id = runQueue.current.shift()
    if (id) void begin(id)
    else setRunAll(false)
  }
  const runGraph = () => {
    try { runQueue.current = generationOrder(session.doc()); setRunAll(true); nextRun.current() }
    catch (e) { setNote(serverText(String((e as Error).message))) }
  }
  const connect = async (c: Connection) => {
    if (readOnly || stale || quote) return
    const fullDoc = { ...session.doc(), edges: [...session.doc().edges, ...editorEdges(session.doc(), edit.committedProject ?? null, voices)] }
    const check = canConnect(fullDoc, { ...c, targetHandle: c.targetHandle ?? '' }, models)
    if (!check.ok) { setNote(t(check.reason, check.vars)); return }
    const target = session.doc().nodes.find((n) => n.id === c.target)
    if (target?.type === 'editor') {
      await withBusy('n_editor', async () => {
        if (!await flush()) throw new Error(ff('saveFirst'))
        const node = session.doc().nodes.find((n) => n.id === c.source)!
        if (c.targetHandle === 'in:audio') {
          if (!node.data.voiceId) throw new Error(ff('needOutput'))
          const p = edit.current()
          if (!p || !edit.persist || !await edit.persist(addVoice(p, { id: node.data.voiceId, source: node.type === 'voice' ? 'tts' : 'upload', start: 0, volume: 1, edits: {} }))) throw new Error(ff('saveFirst'))
        } else {
          const g = selectedGen(node, gens)
          const takeId = node.data.takeId ?? (node.type === 'footage' ? takes.find((t) => t.shotId === node.shotId && t.chosen)?.id : undefined)
          const src = takeId ? { kind: 'take' as const, id: takeId, nodeId: node.id, shotId: node.shotId } : g?.kind === 'video' ? { kind: 'generation' as const, id: g.id, nodeId: node.id, shotId: node.shotId } : null
          if (!src || !await timeline.useForShot(src)) throw new Error(ff('needOutput'))
        }
      })
      return
    }
    const edge = { id: `e_${c.source}_${c.target}_${c.targetHandle}`, source: c.source, sourceHandle: c.sourceHandle ?? 'out', target: c.target, targetHandle: c.targetHandle ?? '' }
    change(markStale({ ...session.doc(), edges: [...session.doc().edges, edge] }, c.source, gens))
  }
  const removeEdges = async (edges: Edge[]) => {
    if (readOnly || stale || quote) return
    await withBusy('edges', async () => {
      const derived = edges.filter((e) => e.id.startsWith('derived:'))
      if (derived.length) {
        const knownVoices = await getVoices(resource)
        setVoices(knownVoices)
        let p = edit.current()
        if (!p || !edit.persist) throw new Error(ff('saveFirst'))
        for (const e of derived) p = removeEditorSource(p, e.source, session.doc(), knownVoices)
        if (!await edit.persist(p)) throw new Error(ff('saveFirst'))
      }
      const ids = new Set(edges.map((e) => e.id))
      let next = session.doc()
      for (const e of edges) next = markStale(next, e.source, gens)
      change({ ...next, nodes: next.nodes.map((n) => edges.some((e) => e.target === n.id && e.targetHandle === 'in:kit') ? { ...n, data: { ...n.data, kitCut: true } } : n), edges: next.edges.filter((e) => !ids.has(e.id)) })
    })
  }
  const remove = (ids: string[]) => void withBusy('delete', async () => {
    const removable = new Set(ids.filter((id) => session.doc().nodes.find((n) => n.id === id)?.type !== 'shot'))
    const knownVoices = await getVoices(resource)
    setVoices(knownVoices)
    let p = edit.current()
    if (p && edit.persist) {
      for (const id of removable) p = id === 'n_editor' ? { ...p, clips: [], voiceover: [] } : removeEditorSource(p, id, session.doc(), knownVoices)
      if (!await edit.persist(p)) throw new Error(ff('saveFirst'))
    }
    let next = session.doc()
    for (const id of removable) next = markStale(next, id, gens)
    change({ ...next, nodes: next.nodes.filter((n) => !removable.has(n.id)), edges: next.edges.filter((e) => !removable.has(e.source) && !removable.has(e.target)) })
    setSelected([])
  })
  const add = (kind: NodeKind, at?: { x: number; y: number }, from?: string) => {
    if (readOnly || stale || quote) return
    const rect = flowBox.current?.getBoundingClientRect()
    const center = at ?? screenToFlowPosition({ x: (rect?.left ?? 0) + (rect?.width ?? 900) / 2 - 160, y: (rect?.top ?? 0) + 160 })
    const next = createNode(session.doc(), kind, center, from ? session.doc().nodes.find((n) => n.id === from)?.shotId : undefined)
    const n = kind === 'editor' ? next.nodes.find((n) => n.type === 'editor')! : next.nodes[next.nodes.length - 1]!
    change(next); setSelected([n.id]); setMenu(null)
    if (from) { const opt = compatibleKinds(next, from).find((o) => o.kind === kind); if (opt) void connect({ source: from, sourceHandle: 'out', target: n.id, targetHandle: opt.handle }) }
  }
  const upload = (id: string, file: File) => void withBusy(id, async () => {
    const node = session.doc().nodes.find((n) => n.id === id)!
    const audio = file.type.startsWith('audio/') || /\.(mp3|m4a|wav|ogg|webm)$/i.test(file.name) && !file.type.startsWith('video/')
    const media = audio ? 'audio' : file.type.startsWith('video/') || /\.(mp4|mov)$/i.test(file.name) ? 'video' : 'image'
    if (node.type === 'footage' && resource.kind === 'legacy-plan') {
      const index = shots.findIndex((s) => s.id === node.shotId)
      if (index < 0) throw new Error(t('canvas.footage.gone'))
      const take = await uploadTake(resource.id, index, file)
      setTakes(await listTakes(resource.id)); update(id, { takeId: take.id }); await flush(); return
    }
    if (replacing) return
    setReplacing(true)
    const previousProject = edit.current()
    try {
      if (!previousProject || !edit.persist) throw new Error(ff('saveFirst'))
      await replaceUploadedMedia(id, media, {
        current: session.doc, change, restore: session.retain, flush,
        upload: async () => {
          if (audio) {
            const voice = await putVoice(resource, file, 'upload', id)
            setVoices((vs) => [...vs, { ...voice, nodeId: id }])
            return { voiceId: voice.id, selected: null }
          }
          const gen = await uploadMedia(resource, id, file)
          setGens((gs) => [...gs, gen])
          return { selected: gen.id }
        },
        removeOldSources: async () => !!edit.persist && await edit.persist(removeEditorSource(previousProject, id, session.doc(), voices)),
        restoreOldSources: async () => !!edit.persist && await edit.persist(previousProject),
      })
      await refresh()
    } finally { setReplacing(false) }

  })
  const ask = async () => withBusy('assistant', async () => {
    const id = selected.find((id) => session.doc().nodes.find((n) => n.id === id)?.type === 'prompt')
    if (!id) throw new Error(ff('assistantHint'))
    if (!await flush()) throw new Error(ff('saveFirst'))
    const r = await fetch(`${apiBase(resource)}/agent/plan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ promptNodeId: id, canvasVersion: session.version() }) })
    const body = await r.json()
    if (!r.ok) throw new Error(serverText(body.error) || t('canvas.err.start'))
    setPlan(body)
  })
  const actions: FreeformActions = {
    doc, gens, models, shots, voices, takes, kit, pickTake: (id) => void withBusy('take', async () => { setTakes(await chooseTake(resource.id, id)) }), freeform: resource.kind === 'workspace', project: edit.committedProject ?? null, readonly: readOnly || stale || replacing || recoveryOpen || reloadAsk || !!quote || !!edit.writing, busy, update, run: (id) => void begin(id), upload, remove,
    duplicate: (id) => { const next = duplicateNode(session.doc(), id); change(next); setSelected([next.nodes[next.nodes.length - 1].id]) },
    inspect: (id) => { setSelected([id]); setDock('inspect') }, openEditor: () => setEditing(true),
    connect: (id) => { const rect = flowBox.current!.getBoundingClientRect(); setMenu({ x: rect.width / 2, y: 150, from: id, at: screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + 150 }) }) },
  }
  const nodes: FreeNode[] = useMemo(() => doc.nodes.map((node) => ({ id: node.id, type: 'freeform', position: node.position, data: { node }, selected: selected.includes(node.id), deletable: node.type !== 'shot' })), [doc.nodes, selected])
  const edges = [...doc.edges, ...editorEdges(doc, edit.committedProject ?? null, voices)].map((e) => ({ ...e, selected: selectedEdges.includes(e.id), className: `fc-edge media-${doc.nodes.find((n) => n.id === e.source)?.type === 'voice' ? 'audio' : 'image'}` }))
  const picked = doc.nodes.find((n) => selected.length === 1 && n.id === selected[0])
  const menuKinds = menu?.from ? compatibleKinds(doc, menu.from).map((o) => o.kind) : kinds
  const endConnect = (event: MouseEvent | TouchEvent, connection: FinalConnectionState) => {
    const source = drag.current; drag.current = null
    if (connection.isValid || !source) return
    const target = event.target as Element | null
    if (target?.closest('.react-flow__node')) { setNote(ff('incompatible')); return }
    if (target?.closest('.fc-dock,.fc-rail')) return
    const p = 'changedTouches' in event ? event.changedTouches[0] : event
    const rect = flowBox.current!.getBoundingClientRect()
    setSearch(''); setMenu({ x: p.clientX - rect.left, y: p.clientY - rect.top, from: source, at: screenToFlowPosition({ x: p.clientX, y: p.clientY }) })
  }
  const safeReload = async (keepDraft = false, discard = false) => {
    const editResult = await edit.flush()
    if (editResult === 'failed' || editResult === 'stale') { setNote(ff('saveFirst')); return }
    if (discard) session.discard()
    if (readOnly || await session.prepareReload(keepDraft)) reload()
    else setReloadAsk(true)
  }
  const back = async () => { const editResult = await edit.flush(); if ((!readOnly && !await flush()) || editResult === 'failed' || editResult === 'stale') { setNote(ff('saveFirst')); return }; onBack() }
  return <section className="fc-screen">
    {editing && !recoveryOpen && !reloadAsk ? <div className="fc-editor"><EditorPanel ideaId={resource} clientId={clientId} shots={shots} edit={edit} sources={sources} timeline={timeline} doc={doc} gens={gens} takes={takes} readOnly={readOnly || stale} onBack={() => setEditing(false)} onJumpToNode={(id) => { setSelected([id]); setEditing(false) }} /></div> : null}
    <div className="fc-board" hidden={editing && !recoveryOpen && !reloadAsk}>
      <header className="fc-top"><button className="fc-back" aria-label={ff('back')} onClick={() => void back()}>‹</button><div className="fc-crumb"><span className="fc-project-dot" />{clientName}<span>›</span><strong>{title}</strong></div><div className="fc-top-actions">
        <button aria-label={ff('reload')} onClick={() => void safeReload()}>↻</button>
        <button className={save === 'failed' ? 'fc-error-button' : 'fc-save'} onClick={() => void flush()}>{ff(save === 'saving' ? 'saving' : save === 'failed' ? 'failedSave' : 'saved')}</button>
        {!readOnly && <button disabled={stale || (!!busy.size && !runAll) || !!quote} onClick={runAll ? () => { runQueue.current = []; setRunAll(false) } : runGraph}>{ff(runAll ? 'stop' : 'runAll')}</button>}
        <button className={dock === 'assistant' ? 'is-active' : ''} onClick={() => setDock(dock === 'assistant' ? null : 'assistant')}>✧ {ff('assistant')}</button>
        <button className={dock === 'history' ? 'is-active' : ''} onClick={() => setDock(dock === 'history' ? null : 'history')}>◷ {ff('history')}</button>
        <button onClick={() => void withBusy('link', async () => { setLink((await createShareLink(clientId)).url) })}>↗ {ff('share')}</button>
        <button aria-label={fullscreen ? t('canvas.toolbar.exitFull') : t('canvas.toolbar.full')} onClick={() => onFullscreen(!fullscreen)}>⛶</button>
      </div></header>
      <FreeformContext.Provider value={actions}>
      <div className="fc-scene">
        <div className="fc-flow" ref={flowBox}>
          <ReactFlow<FreeNode> nodes={nodes} edges={edges} nodeTypes={freeformNodeTypes}
            defaultViewport={doc.viewport ?? { x: 0, y: 0, zoom: 1 }} minZoom={0.15} maxZoom={2}
            nodesDraggable={!actions.readonly} nodesConnectable={!actions.readonly} deleteKeyCode={null}
            selectionOnDrag={!pan} panOnDrag={pan ? true : [1, 2]} colorMode="dark"
            onNodesChange={(changes) => {
              let next = session.doc()
              const moved = applyNodeChanges(changes.filter((c) => c.type === 'position'), nodes)
              if (changes.some((c) => c.type === 'position')) { const pos = new Map(moved.map((n) => [n.id, n.position])); next = { ...next, nodes: next.nodes.map((n) => ({ ...n, position: pos.get(n.id) ?? n.position })) }; change(next) }
              const selects = changes.filter((c) => c.type === 'select')
              if (selects.length) setSelected((before) => { const ids = new Set(before); for (const c of selects) { if (c.selected) ids.add(c.id); else ids.delete(c.id) }; return [...ids] })
            }}
            onEdgesChange={(changes) => { for (const c of changes) if (c.type === 'select') setSelectedEdges((ids) => c.selected ? [...ids.filter((id) => id !== c.id), c.id] : ids.filter((id) => id !== c.id)); const ids = changes.filter((c) => c.type === 'remove').map((c) => c.id); if (ids.length) void removeEdges(edges.filter((e) => ids.includes(e.id))) }}
            onEdgeClick={(_, e) => { if (!actions.readonly) setNote(`${ff('delete')}: ${e.source} → ${e.target}`) }}
            onEdgeDoubleClick={(_, e) => void removeEdges([e])}
            onConnect={(c) => void connect(c)} onConnectStart={(_, p) => { drag.current = p.handleType === 'source' ? p.nodeId : null }} onConnectEnd={endConnect}
            isValidConnection={(c) => canConnect({ ...doc, edges: [...doc.edges, ...editorEdges(doc, edit.committedProject ?? null, voices)] }, { ...c, targetHandle: c.targetHandle ?? '' }, models).ok}
            onMoveEnd={(e, viewport) => { if (e) change({ ...session.doc(), viewport }) }}
            onPaneClick={() => { setMenu(null); setSelected([]) }}
            onKeyDown={(e) => { const el = e.target as HTMLElement; if (el.closest('input,textarea,select,button')) return; if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); if (selected.length) remove(selected); if (selectedEdges.length) void removeEdges(edges.filter((e) => selectedEdges.includes(e.id))) } if (e.key === 'Escape') { setMenu(null); setDock(null) } }}
            aria-label={t('canvas.flow.label')}>
            <Background gap={24} size={1} color="#292929" /><MiniMap pannable zoomable /><ZoomBar />
          </ReactFlow>
          {doc.nodes.length === 0 && <div className="fc-empty"><div className="fc-empty-mark">✧</div><h1>{ff('emptyTitle')}</h1><p>{ff('emptyBody')}</p><button className="fc-primary" onClick={() => add('prompt')}>＋ {ff('prompt')}</button><span>{ff('navigation')}</span></div>}
          <nav className="fc-rail" aria-label={ff('add')}>
            <button title={ff('add')} aria-label={ff('add')} disabled={actions.readonly} onClick={() => { setSearch(''); setMenu(menu ? null : { x: 70, y: 100, at: screenToFlowPosition({ x: flowBox.current!.getBoundingClientRect().left + 320, y: flowBox.current!.getBoundingClientRect().top + 180 }) }) }}>＋</button><hr />
            <button title={ff('select')} aria-label={ff('select')} className={!pan ? 'is-active' : ''} onClick={() => setPan(false)}>↖</button><button title={ff('pan')} aria-label={ff('pan')} className={pan ? 'is-active' : ''} onClick={() => setPan(true)}>✥</button><hr />
            {kinds.map((k, i) => <button key={k} title={ff(k)} aria-label={ff(k)} disabled={actions.readonly || (k === 'editor' && doc.nodes.some((n) => n.type === 'editor'))} onClick={() => add(k)}>{glyphs[i]}</button>)}
          </nav>
          {selected.length > 1 && <div className="fc-multi"><span>{selected.length}</span><button disabled={actions.readonly} onClick={() => remove(selected)}>⌫ {ff('delete')}</button><button onClick={() => void fitView({ nodes: selected.map((id) => ({ id })), padding: 0.4 })}>⤢</button></div>}
          {menu && <div className="fc-create-menu" style={{ left: Math.min(menu.x, (flowBox.current?.clientWidth ?? 1000) - 250), top: Math.min(menu.y, (flowBox.current?.clientHeight ?? 700) - 350) }}><input autoFocus placeholder={ff('add')} value={search} onChange={(e) => setSearch(e.target.value)} />{menuKinds.filter((k) => ff(k).toLowerCase().includes(search.toLowerCase())).map((k) => <button key={k} onClick={() => add(k, menu.at, menu.from)}><span>{glyphs[kinds.indexOf(k)]}</span>{ff(k)}<small>↗</small></button>)}</div>}
          <div className="fc-page">▱ {ff('page')} <span>1</span></div>
        </div>
        {dock && <aside className="fc-dock" aria-label={ff(dock)}><header><h2>{ff(dock)}</h2><button aria-label={ff('close')} onClick={() => setDock(null)}>×</button></header>
          {dock === 'inspect' && (picked ? <><h3>{ff(picked.type)}</h3>{picked.type === 'kit' && (kit ? <fieldset disabled={actions.readonly} className="fc-kit-management"><KitPanel clientId={clientId} kit={kit} selected={picked.data.kitItems ?? []} onKit={applyKit} onSelected={(ids) => { update(picked.id, { kitItems: ids }); for (const id of kitTargets(session.doc(), picked.id)) change(markStale(session.doc(), id, gens)) }} onClose={() => setDock(null)} /></fieldset> : <p>{ff('kitUnavailable')}</p>)}{['prompt', 'storyboard', 'video', 'voice'].includes(picked.type) && <NodeSettings node={picked} actions={actions} />}{picked.type === 'storyboard' && kit && doc.edges.some((e) => e.target === picked.id && e.targetHandle === 'in:kit') && <div className="fc-kit-picks"><h4>{ff('kit')}</h4>{kit.items.filter((item) => { const source = doc.edges.find((e) => e.target === picked.id && e.targetHandle === 'in:kit')?.source; return doc.nodes.find((n) => n.id === source)?.data.kitItems?.includes(item.id) }).map((item) => <label key={item.id}><input type="checkbox" checked={!picked.data.kitOff?.includes(item.id)} disabled={actions.readonly} onChange={(e) => update(picked.id, { kitOff: e.target.checked ? (picked.data.kitOff ?? []).filter((id) => id !== item.id) : [...(picked.data.kitOff ?? []), item.id] })} />{item.name}</label>)}<p>{legacyGenerationRequest(doc, picked.id, shots, gens, kit, models.find((m) => m.id === picked.data.model) ?? models.find((m) => m.kind === 'image')!).kitPreview}</p></div>}<h4>{ff('ports')}</h4>{PORTS_LABEL(picked)}{edges.filter((e) => e.target === picked.id).map((e) => <div className="fc-input-wire" key={e.id}><span>{ff(doc.nodes.find((n) => n.id === e.source)!.type)}</span><button disabled={actions.readonly} aria-label={ff('delete')} onClick={() => void removeEdges([e])}>×</button></div>)}{['storyboard', 'video', 'voice'].includes(picked.type) && <button className="fc-primary" disabled={actions.readonly || busy.has(picked.id)} onClick={() => void begin(picked.id)}>▶ {ff('run')}</button>}</> : <p>{ff('noSelection')}</p>)}
          {dock === 'history' && <><div className="fc-wallet"><h3>{ff('budget')}</h3>{budget && Object.entries(budget).map(([k, b]) => <p key={k}><span>{ff(k as 'image' | 'video' | 'voice')}</span><b>{usd(Math.max(0, b.cap - b.spent))}</b></p>)}</div>{gens.length === 0 && <p>{ff('noHistory')}</p>}{[...gens].reverse().map((g) => <article className="fc-history" key={g.id}>{g.url && g.kind === 'image' && <img src={g.url} alt="" />}<strong>{g.model}</strong><span>{ff(g.status)} · {usd(g.actualUsd ?? g.estUsd)}</span>{g.status === 'done' && <button disabled={actions.readonly} onClick={() => void withBusy(g.nodeId, async () => { const knownVoices = await getVoices(resource); setVoices(knownVoices); if (!await selectGeneration(g, selectionIO(knownVoices))) throw new Error(ff('saveFirst')); setSelected([g.nodeId]); await refresh() })}>{ff('version')}</button>}{g.error && <p>{serverText(g.error)}</p>}</article>)}</>}
          {dock === 'assistant' && <><p>{ff('assistantHint')}</p><button className="fc-primary" disabled={actions.readonly || busy.has('assistant') || !picked || picked.type !== 'prompt'} onClick={() => void ask()}>{ff('preview')}</button>{plan && <div className="fc-agent-plan"><span className="fc-demo">{plan.source === 'demo' ? ff('demo') : `${ff('source')}: ${plan.source}`}</span><h3>{ff('storyboard')}</h3><p>{plan.storyboard.prompt}</p><small>{plan.storyboard.model}</small><h3>{ff('video')}</h3><p>{plan.video.prompt}</p><small>{plan.video.model} · {seconds(plan.video.duration)} · {usd(plan.planUsd)}</small><p>{ff('noAuto')}</p><button className="fc-primary" disabled={actions.readonly} onClick={() => { if (session.version() !== plan.canvasVersion || session.doc() !== session.saved()) { setNote(ff('changed')); return }; change(applyPromptPlan(session.doc(), plan)); setPlan(null); setDock(null) }}>{ff('apply')}</button></div>}</>}
        </aside>}
      </div>
      </FreeformContext.Provider>
      {(stale || readOnly) && <div className="fc-banner">{stale ? ff('conflict') : ff('readonly')}{stale && <button onClick={() => void safeReload()}>{ff('reload')}</button>}</div>}
      {note && <div className="fc-notice" role="alert"><span>{note}</span><button aria-label={ff('close')} onClick={() => setNote('')}>×</button></div>}
      {recoveryOpen && <div className="fc-modal-back"><div className="fc-modal" role="dialog" aria-modal="true" aria-label={ff('recoverTitle')}><h2>{ff('recoverTitle')}</h2><p>{ff('recoverBody')}</p><footer><button onClick={() => { session.discard(); setRecoveryOpen(false) }}>{ff('discardDraft')}</button><button className="fc-primary" onClick={() => { session.restore(); setRecoveryOpen(false) }}>{ff('restoreDraft')}</button></footer></div></div>}
      {reloadAsk && <div className="fc-modal-back"><div className="fc-modal" role="dialog" aria-modal="true" aria-label={ff('unsavedTitle')}><h2>{ff('unsavedTitle')}</h2><p>{ff('unsavedBody')}</p><footer><button onClick={() => setReloadAsk(false)}>{ff('cancel')}</button><button onClick={() => void safeReload(true, true)}>{ff('discardDraft')}</button><button className="fc-primary" onClick={() => void safeReload(true)}>{ff('keepReload')}</button></footer></div></div>}
      {quote && <div className="fc-modal-back"><div className="fc-modal" role="dialog" aria-modal="true" aria-label={ff('quote')}><h2>{ff('quote')}</h2><p>{models.find((m) => m.id === doc.nodes.find((n) => n.id === quote.id)?.data.model)?.label}</p><strong>{usd(quote.usd)}</strong><p>{ff('left')}: {quote.remaining === null ? '—' : usd(quote.remaining)}</p><footer><button onClick={() => { setQuote(null); runQueue.current = []; setRunAll(false) }}>{ff('cancel')}</button><button className="fc-primary" disabled={busy.has(quote.id)} onClick={() => void begin(quote.id, true)}>{ff('confirm')}</button></footer></div></div>}
      {link && <div className="fc-modal-back"><div className="fc-modal" role="dialog" aria-modal="true" aria-label={ff('share')}><h2>{ff('share')}</h2><input readOnly value={link} onFocus={(e) => e.target.select()} /><footer><button onClick={() => setLink('')}>{ff('close')}</button><button className="fc-primary" onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true), (e) => setNote(e.message))}>{ff(copied ? 'copied' : 'copy')}</button></footer></div></div>}
    </div>
  </section>
}
function PORTS_LABEL(node: CanvasNode) {
  const labels = node.type === 'editor' ? [ff('video'), ff('voice')] : node.type === 'video' ? [ff('textPort'), ff('startPort'), ff('referencePort')] : node.type === 'storyboard' ? [ff('textPort'), ff('referencePort')] : [ff('textPort')]
  return <p className="fc-port-help">{labels.join(' · ')}</p>
}
