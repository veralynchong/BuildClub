import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type FinalConnectionState,
  type Viewport,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Kit, SavedIdea, Shot } from '../../types'
import { t, type Key, type Vars } from '../../lib/i18n'
import { getBudget, getCanvas, getKit, getModels, NoShots, pollGen, putCanvas, quoteChain, StaleCanvas, startChain, startGen, uploadImage } from '../../lib/canvas/api'
import { fromFlow, reframe, toFlow, type FlowEdge, type FlowNode } from '../../lib/canvas/flow'
import { frameBoxes, frameOf, migrateDoc, slotInFrame } from '../../lib/canvas/frames'
import { edgeLook, focusSet } from '../../lib/canvas/edges'
import { TIMELINE_NODE_ID, timelineFlow } from '../../lib/canvas/timelineNode'
import type { Box } from '../../lib/canvas/frames'
import { useApp } from '../../lib/appContext'
import { reelBrand } from '../../lib/editor/preview'
import { addNode, budgetLeft, chainBusy, chainPair, freeSpot, genFinished, genRequest, genStarted, genView, missingInput, pendingGen, primaryFrames, staleIds, finishedWhileAway, wireStart } from '../../lib/canvas/graph'
import { chainBody, liveShotIds, paidConfirmNeeded, runBatches, runScopeInfo, scopeTotal, type RunBatch, type RunItem } from '../../lib/canvas/run'
import { kitRefs, kitStale, kitTargets, mergeKitData, syncKit, wireKit } from '../../lib/canvas/kit'
import { KitPanel } from './KitPanel'
import { NodePanel } from './NodePanel'
import { mergeFrame } from '../../lib/storyboard'
import { chooseTake, checkFile, cleanTake as cleanTakeRequest, cutSeconds, listTakes, NothingToCut, uploadTake, type Take } from '../../lib/takes'
import { uploadKind } from '../../lib/canvas/upload'
import { canConnect, compatibleKinds } from '../../lib/canvas/ports'
import type { Budget, CanvasDoc, CanvasState, GenModel, Generation, NodeData, NodeKind } from '../../lib/canvas/types'
import { ErrorText } from '../ErrorText'
import { CanvasToolbar } from './CanvasToolbar'
import { ToolRail } from './ToolRail'
import { DropMenu } from './DropMenu'
import { QueuePill } from './QueuePill'
import { ZoomBar } from './ZoomBar'
import { runningQueue, shellKey, writeFullscreen } from '../../lib/canvas/shell'
import { nodeStatus } from '../../lib/canvas/status'
import { EditorPanel } from '../editor/EditorPanel'
import { useSources } from '../../lib/editor/useSources'
import { useTimelineActions } from '../../lib/editor/useTimelineActions'
import { useEditProject } from '../../lib/editor/useEditProject'
import { oneClipPerShot, shotOnTimeline } from '../../lib/editor/timeline'
import { CanvasContext, type CanvasCtx } from './nodes/ctx'
import { nodeTypes } from './nodes'

const SAVE_DELAY_MS = 800
const RETRY_MS = 2000
const MAX_RETRIES = 5
const NOTE_MS = 8000 // how long an info note (e.g. clean-up done) stays up; errors stay until dismissed
const ADD_KINDS: NodeKind[] = ['prompt', 'storyboard', 'video', 'upload']
const ADD_KINDS_WITH_KIT: NodeKind[] = [...ADD_KINDS, 'kit']
const POLL_RETRY_MS = 2000 // wait after a poll request fails before asking again
// A single Generate with a paid model asks once; after a yes it doesn't ask again until the page reloads (spec §6.4).
let paidConfirmed = false

interface Props {
  idea: SavedIdea
  shots: Shot[] // the plan's shot list; the shot nodes show its lines
  onChange: (patch: Partial<SavedIdea>) => void
  onBack: () => void
  backLabel: string
  openEditor?: boolean // arrive with the editor already open
  title: string // the plan's name, shown in the canvas toolbar
  clientName: string
  fullscreen: boolean // the app frame is hidden
  onFullscreen: (on: boolean) => void
}

// Loads the canvas (waiting a little for a just-edited shot list to reach the server), then shows the board.
export default function CanvasScreen({ idea, shots, onChange, onBack, backLabel, openEditor = false, title, clientName, fullscreen, onFullscreen }: Props) {
  const [state, setState] = useState<CanvasState | null>(null)
  const [loadKey, setLoadKey] = useState(0) // bumps on Reload so the board starts over from the server's copy
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0) // bumps on "Try again"

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = (retries: number) => {
      getCanvas(idea.id).then(
        (s) => {
          if (cancelled) return
          setWaiting(false)
          setError(null)
          setState(s)
          setLoadKey((k) => k + 1)
        },
        (e) => {
          if (cancelled) return
          if (e instanceof NoShots && retries < MAX_RETRIES) {
            setWaiting(true)
            timer = setTimeout(() => run(retries + 1), RETRY_MS)
            return
          }
          setWaiting(false)
          setError(e instanceof Error ? e.message : t('canvas.err.load'))
        },
      )
    }
    setError(null)
    run(0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [idea.id, attempt])

  const reload = () => {
    setState(null)
    setAttempt((a) => a + 1)
  }

  const back = (
    <button className="link-btn" onClick={onBack}>
      {t('canvas.back', { label: backLabel })}
    </button>
  )

  if (!state) {
    return (
      <section className="cv-screen">
        {back}
        {error ? (
          <div className="cv-note cv-note-error" role="alert">
            <span>
              <ErrorText text={error} />
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAttempt((a) => a + 1)}>
              {t('canvas.retry')}
            </button>
          </div>
        ) : (
          <p className="muted" role="status">
            {waiting ? t('canvas.saving.shots') : t('canvas.loading')}
          </p>
        )}
      </section>
    )
  }

  return (
    <ReactFlowProvider>
      <CanvasBoard key={loadKey} ideaId={idea.id} clientId={idea.clientId} shots={shots} onChange={onChange} readOnly={idea.status !== 'approved'} initial={state} onReload={reload} openEditor={openEditor} onBack={onBack} backLabel={backLabel} title={title} clientName={clientName} fullscreen={fullscreen} onFullscreen={onFullscreen} />
    </ReactFlowProvider>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

function CanvasBoard({
  ideaId,
  clientId,
  shots,
  onChange,
  readOnly,
  initial,
  onReload,
  openEditor,
  onBack,
  backLabel,
  title,
  clientName,
  fullscreen,
  onFullscreen,
}: {
  ideaId: string
  clientId: string
  shots: Shot[]
  onChange: (patch: Partial<SavedIdea>) => void
  readOnly: boolean
  initial: CanvasState
  onReload: () => void
  openEditor: boolean
  onBack: () => void
  backLabel: string
  title: string
  clientName: string
  fullscreen: boolean
  onFullscreen: (on: boolean) => void
}) {
  // migrateDoc runs on every load: the backend still writes a shot text line for each new shot.
  const first = useMemo(() => toFlow(migrateDoc(initial.doc)), [initial])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(first.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(first.edges)
  const { screenToFlowPosition, getZoom, getViewport, setViewport: moveTo, fitView } = useReactFlow()
  const flowBox = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport | undefined>(initial.doc.viewport)

  // ---- edit project (the drawer's timeline; lives here so it outlasts the drawer) ----
  const edit = useEditProject(ideaId, readOnly)

  // ---- editor (full screen; the board stays mounted underneath, so its nodes and view are as they were) ----
  const [editing, setEditing] = useState(openEditor)
  // A board that first mounted hidden has no size to fit to, so it is fitted once it shows.
  const unfitted = useRef(openEditor)
  const beforeEditor = useRef<Viewport | null>(null) // the view the board had when the editor covered it
  const [kitOpen, setKitOpen] = useState(false) // the kit drawer; only one drawer is open at a time
  const [editorExport, setEditorExport] = useState(false) // the editor opens on its export panel (the Timeline node's Export)
  const showEditor = (exportPanel = false) => {
    beforeEditor.current = getViewport()
    setKitOpen(false)
    setEditorExport(exportPanel)
    setEditing(true)
  }
  // The hidden board may have been resized to nothing, so put its view back once it is shown and laid out.
  useEffect(() => {
    if (editing) return
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (unfitted.current) void fitView({ padding: 0.2 })
        else if (beforeEditor.current) void moveTo(beforeEditor.current)
        unfitted.current = false
      })
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [editing, fitView, moveTo])

  // ---- autosave ----
  const doc = useMemo(() => fromFlow(nodes, edges, viewport), [nodes, edges, viewport])
  const key = useMemo(() => JSON.stringify(doc), [doc])
  const version = useRef(initial.version)
  const savedKey = useRef(JSON.stringify(fromFlow(first.nodes, first.edges, initial.doc.viewport)))
  const inflight = useRef(false)
  const latest = useRef({ doc, key })
  const [stale, setStale] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const blocked = stale || readOnly
  const blockedRef = useRef(blocked)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    latest.current = { doc, key }
    blockedRef.current = blocked
  })

  const save = useCallback(async () => {
    if (inflight.current || blockedRef.current) return
    const { doc: d, key: k } = latest.current
    if (k === savedKey.current) return
    inflight.current = true
    setSaveState('saving')
    try {
      version.current = await putCanvas(ideaId, version.current, d)
      savedKey.current = k
      setSaveState('saved')
    } catch (e) {
      if (e instanceof StaleCanvas) {
        blockedRef.current = true
        setStale(true)
      } else setSaveState('failed')
      inflight.current = false
      return
    }
    inflight.current = false
    if (mounted.current && latest.current.key !== savedKey.current) void save() // changed while saving
  }, [ideaId])

  useEffect(() => {
    if (blocked || key === savedKey.current) return
    const timer = setTimeout(() => void save(), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [key, blocked, save])

  // Leaving the screen with an unsaved change: save it now.
  useEffect(
    () => () => {
      const { doc: d, key: k } = latest.current
      if (blockedRef.current || inflight.current || k === savedKey.current) return
      putCanvas(ideaId, version.current, d).catch(() => {})
    },
    [ideaId],
  )

  // ---- lines and new nodes ----
  const [dragFrom, setDragFrom] = useState<string | null>(null) // the node a line is being dragged from
  const [note, setNote] = useState<{ key?: Key; vars?: Vars; text?: string; info?: boolean; action?: { label: Key; run: () => void } } | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(noteTimer.current), [])
  const showNote = useCallback((key: Key, vars?: Vars, info?: boolean) => {
    setNote({ key, vars, info })
    clearTimeout(noteTimer.current)
    if (info) noteTimer.current = setTimeout(() => setNote(null), NOTE_MS)
  }, [])

  const showText = useCallback((text: string, info?: boolean) => {
    setNote({ text, info })
    clearTimeout(noteTimer.current)
    if (info) noteTimer.current = setTimeout(() => setNote(null), NOTE_MS)
  }, [])

  // ---- generation ----
  const [models, setModels] = useState<GenModel[]>([])
  const [gens, setGens] = useState<Generation[]>(initial.generations)
  const gensRef = useRef(gens)
  const polls = useRef(new Map<string, AbortController>())
  const starting = useRef(new Set<string>()) // nodes whose generation request is on its way
  useEffect(() => {
    let live = true
    getModels().then(
      (m) => live && setModels(m),
      (e) => live && showText(e instanceof Error ? e.message : t('canvas.err.models')),
    )
    return () => {
      live = false
    }
  }, [showText])

  const [budget, setBudget] = useState<Budget | null>(null)
  const refreshBudget = useCallback(() => {
    getBudget().then(
      (b) => mounted.current && setBudget(b),
      () => {}, // the price still shows; only "left today" is missing
    )
  }, [])
  useEffect(() => refreshBudget(), [refreshBudget])

  const upsertGen = useCallback((g: Generation) => {
    gensRef.current = [...gensRef.current.filter((x) => x.id !== g.id), g]
    setGens(gensRef.current)
  }, [])

  // Marks the generated nodes after nodeId (and nodeId itself when its own input changed) as out of date.
  const markFrom = useCallback(
    (nodeId: string, self: boolean) => {
      const ids = new Set(staleIds(latest.current.doc, nodeId, gensRef.current, self))
      setNodes((ns) =>
        ns.map((n) => (ids.has(n.id) && !n.data.node.data.stale ? { ...n, data: { node: { ...n.data.node, data: { ...n.data.node.data, stale: true } } } } : n)),
      )
    },
    [setNodes],
  )

  // ---- consistency kit ----
  // null while loading, when the load failed, or when the idea has no client; after a good load it is never null.
  const [kit, setKit] = useState<Kit | null>(null)
  const [kitFailed, setKitFailed] = useState(false)
  const kitRef = useRef(kit)
  useEffect(() => {
    kitRef.current = kit
  }, [kit])

  // Puts a changed doc on the board: changed node data, new nodes and new lines. The autosave picks it up.
  const adopt = useCallback(
    (next: CanvasDoc) => {
      const cur = latest.current.doc
      if (next === cur) return
      const nodeIds = new Set(cur.nodes.map((n) => n.id))
      const lineIds = new Set(cur.edges.map((e) => e.id))
      const added = toFlow({ nodes: next.nodes.filter((n) => !nodeIds.has(n.id)), edges: next.edges.filter((e) => !lineIds.has(e.id)) })
      setNodes((ns) => {
        const out = [
          ...ns.map((n) => {
            const m = next.nodes.find((x) => x.id === n.id)
            const base = cur.nodes.find((x) => x.id === n.id)
            if (!m || !base) return n
            const data = mergeKitData(base.data, m.data, n.data.node.data) // only what the sync changed; newer edits stay
            return data === n.data.node.data ? n : { ...n, data: { node: { ...n.data.node, data } } }
          }),
          ...added.nodes,
        ]
        return added.nodes.length ? reframe(out) : out // a new node joins its frame, a new kit goes left of the frames
      })
      if (added.edges.length) setEdges((es) => [...es, ...added.edges])
    },
    [setNodes, setEdges],
  )

  // A kit that loaded or changed: forget deleted items, wire the storyboards, date those whose items changed.
  const applyKit = useCallback(
    (k: Kit) => {
      kitRef.current = k
      setKit(k)
      if (!readOnly) adopt(syncKit(latest.current.doc, k, gensRef.current).doc)
    },
    [adopt, readOnly],
  )

  useEffect(() => {
    if (!clientId) return
    let live = true
    getKit(clientId).then(
      (k) => live && applyKit(k && Array.isArray(k.items) ? k : { items: [] }),
      () => live && setKitFailed(true), // the kit node says it couldn't load
    )
    return () => {
      live = false
    }
  }, [clientId, applyKit])

  const removedBy = useMemo(() => new Map(kitStale(doc, gens, kit).map((s) => [s.nodeId, s.removed])), [doc, gens, kit])

  // Follows one generation until it ends. A finished one becomes the node's chosen version and dates what comes after.
  const track = useCallback(
    (g: Generation) => {
      if (polls.current.has(g.id)) return
      const ac = new AbortController()
      polls.current.set(g.id, ac)
      void (async () => {
        while (!ac.signal.aborted) {
          try {
            const end = await pollGen(ideaId, g.id, upsertGen, { signal: ac.signal })
            if (end) {
              refreshBudget()
              setNodes((ns) => ns.map((n) => (n.id === end.nodeId ? { ...n, data: { node: { ...n.data.node, data: genFinished(n.data.node.data, end) } } } : n)))
              if (end.status === 'done') markFrom(end.nodeId, false)
            }
            return
          } catch {
            await new Promise((r) => setTimeout(r, POLL_RETRY_MS))
          }
        }
      })().finally(() => {
        if (polls.current.get(g.id) === ac) polls.current.delete(g.id)
      })
    },
    [ideaId, upsertGen, setNodes, markFrom, refreshBudget],
  )

  // Coming back to a canvas with jobs still running: keep following them. Leaving stops the polling (the server keeps working).
  useEffect(() => {
    const open = polls.current
    for (const n of initial.doc.nodes) {
      const g = pendingGen(n.id, gensRef.current)
      if (g) track(g)
    }
    return () => {
      open.forEach((ac) => ac.abort())
      open.clear()
    }
  }, [initial, track])

  // A job that finished while the canvas was closed: a finished one is shown and dates what comes after; a failed one
  // only ends the wait, so the version chosen before stays.
  useEffect(() => {
    for (const { nodeId, genId, select } of finishedWhileAway(initial.doc, gensRef.current)) {
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { node: { ...n.data.node, data: genFinished(n.data.node.data, { id: genId, status: select ? 'done' : 'failed' }) } } } : n)))
      if (select) markFrom(nodeId, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  // The node's model and whether it can generate now (genView is the one Generate rule), or null.
  const readyToGen = (nodeId: string) => {
    const d = latest.current.doc
    const node = d.nodes.find((n) => n.id === nodeId)
    if (!node || blocked || pendingGen(nodeId, gensRef.current) || starting.current.has(nodeId)) return null
    const model = genView(node, models, null, null).model
    if (!model) return null
    const v = genView(node, models, null, missingInput(d, nodeId, model, shots, gensRef.current))
    return v.canGenerate && v.model ? { model: v.model, usd: v.usd } : null
  }

  // Starts one node's generation; false when it could not start (the reason is shown when there is one).
  const startOne = async (nodeId: string): Promise<boolean> => {
    const ready = readyToGen(nodeId)
    if (!ready) return false
    const { model } = ready
    const d = latest.current.doc
    const kind = model.kind === 'video' ? 'video' : 'image'
    const req = genRequest(d, nodeId, shots, gensRef.current, kitRef.current, model)
    if (kind === 'video' && req.duration === undefined && model.durations) req.duration = model.durations[0]
    starting.current.add(nodeId)
    try {
      const g = await startGen(ideaId, { nodeId, model: model.id, ...req })
      if (!mounted.current) return false
      // the chosen version stays until the new one is done, so a failed try leaves the plan's frame alone
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { node: { ...n.data.node, data: genStarted(n.data.node.data, model.id, g.id) } } } : n)))
      upsertGen(g)
      track(g)
      refreshBudget()
      return true
    } catch (e) {
      if (mounted.current) showText(e instanceof Error ? e.message : t('canvas.err.start'))
      return false
    } finally {
      starting.current.delete(nodeId)
    }
  }

  // The first Generate with a paid model in this session asks first.
  const [paidAsk, setPaidAsk] = useState<{ nodeId: string; model: string; usd: number } | null>(null)
  const onGenerate = async (nodeId: string) => {
    const ready = readyToGen(nodeId)
    if (!ready) return
    if (paidConfirmNeeded(ready.usd, paidConfirmed)) return setPaidAsk({ nodeId, model: ready.model.label, usd: ready.usd })
    await startOne(nodeId)
  }
  const confirmPaid = () => {
    if (!paidAsk) return
    paidConfirmed = true
    setPaidAsk(null)
    void startOne(paidAsk.nodeId)
  }

  // ---- Run all and Run the whole shot: what would run, priced, asked once, then started batch by batch ----
  const [chaining, setChaining] = useState(false) // a save before the dialog or a confirmed run is on its way
  const [runAsk, setRunAsk] = useState<{ title: 'canvas.toolbar.runAll' | 'canvas.chain.title'; items: RunItem[]; batches: RunBatch[]; skippedNoKey: number } | null>(null)

  const chainStarting = useRef(false) // a ref, so a double click can't start the run twice before state updates
  const preparing = useRef(false) // a ref, so a double click can't prepare the dialog twice before state updates
  const onRunScope = async (opts: { shotId?: string; includeStale: boolean }) => {
    if (blocked || preparing.current || chainStarting.current) return
    preparing.current = true
    setChaining(true)
    try {
      // the server checks the saved canvas, so save what is on screen first
      while (inflight.current) await new Promise((r) => setTimeout(r, 50))
      if (latest.current.key !== savedKey.current) await save()
      if (blockedRef.current || latest.current.key !== savedKey.current) return showNote('canvas.save.failed')
      const d = latest.current.doc
      const info = runScopeInfo(d, shots, gensRef.current, models, opts)
      let items = info.items
      if (!items.length) return info.skippedNoKey > 0 ? showNote('canvas.chain.noKey') : showNote('canvas.run.nothing', undefined, true)
      if (info.deferred.length) showNote('canvas.run.deferred', { n: info.deferred.length })
      // A chain the server would refuse is left out with its reason (for one shot: no dialog), before anything is asked.
      for (const b of runBatches(d, items)) {
        if (!('chain' in b)) continue
        const made = chainBody(d, b.chain, models, shots, gensRef.current, kitRef.current)
        if ('error' in made) {
          showNote(made.error)
          if (opts.shotId) return
          items = items.filter((i) => i.nodeId !== b.chain.imageNodeId && i.nodeId !== b.chain.videoNodeId)
          continue
        }
        await quoteChain(ideaId, made.body) // nothing is spent; a refusal (e.g. the daily cap) stops here with its message
      }
      if (!items.length || !mounted.current) return
      setRunAsk({ title: opts.shotId ? 'canvas.chain.title' : 'canvas.toolbar.runAll', items, batches: runBatches(d, items), skippedNoKey: info.skippedNoKey })
    } catch (e) {
      if (mounted.current) showText(e instanceof Error ? e.message : t('canvas.err.start'))
    } finally {
      preparing.current = false
      if (mounted.current) setChaining(false)
    }
  }

  // Escape cancels a dialog, unless the start is on its way.
  useEffect(() => {
    if ((!runAsk && !paidAsk) || chaining) return
    const on = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setRunAsk(null)
      setPaidAsk(null)
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [runAsk, paidAsk, chaining])

  // One storyboard + video chain. A failure shows its message; the run goes on with the next batch.
  const runChain = async (pair: { imageNodeId: string; videoNodeId: string }) => {
    // a Generate may have begun since the dialog was shown
    if (chainBusy(latest.current.doc, pair.imageNodeId, gensRef.current) || starting.current.has(pair.imageNodeId) || starting.current.has(pair.videoNodeId)) {
      return showNote('canvas.chain.busy')
    }
    const made = chainBody(latest.current.doc, pair, models, shots, gensRef.current, kitRef.current)
    if ('error' in made) return showNote(made.error)
    try {
      const { image, video } = await startChain(ideaId, made.body)
      if (!mounted.current) return
      setNodes((ns) =>
        ns.map((n) => {
          const g = n.id === image.nodeId ? image : n.id === video.nodeId ? video : null
          return g ? { ...n, data: { node: { ...n.data.node, data: genStarted(n.data.node.data, g.model, g.id) } } } : n
        }),
      )
      upsertGen(image)
      upsertGen(video)
      track(image)
      track(video)
      refreshBudget()
    } catch (e) {
      if (mounted.current) showText(e instanceof Error ? e.message : t('canvas.err.start'))
    }
  }

  const confirmRun = async () => {
    if (!runAsk || chaining || chainStarting.current) return
    chainStarting.current = true
    setChaining(true)
    try {
      for (const b of runAsk.batches) {
        if (!mounted.current) return
        if ('chain' in b) await runChain(b.chain)
        else await startOne(b.single)
      }
    } finally {
      chainStarting.current = false
      if (mounted.current) {
        setRunAsk(null)
        setChaining(false)
      }
    }
  }

  // ---- uploads and takes ----
  const [takes, setTakes] = useState<Take[]>(initial.takes)
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const shotIndex = (shotId: string | undefined) => (shotId ? shots.findIndex((s) => s.id === shotId) : -1)
  const working = async (nodeId: string, run: () => Promise<void>, fallback: Key) => {
    if (blocked || busy.has(nodeId)) return
    setBusy((b) => new Set(b).add(nodeId))
    try {
      await run()
    } catch (e) {
      if (mounted.current) showText(e instanceof Error ? e.message : t(fallback), e instanceof NothingToCut)
    } finally {
      if (mounted.current) setBusy((b) => (b.has(nodeId) ? new Set([...b].filter((x) => x !== nodeId)) : b))
    }
  }
  const refreshTakes = async () => {
    const next = await listTakes(ideaId)
    if (mounted.current) setTakes(next)
  }

  const addTake = (nodeId: string, file: File) => {
    const node = latest.current.doc.nodes.find((n) => n.id === nodeId)
    const index = shotIndex(node?.shotId)
    const bad = checkFile(file)
    if (index < 0 || bad) return showText(bad ?? t('canvas.footage.gone'))
    void working(nodeId, async () => {
      await uploadTake(ideaId, index, file)
      await refreshTakes()
    }, 'canvas.err.uploadVideo')
  }

  const cleanTake = (nodeId: string, takeId: string) => {
    return working(nodeId, async () => {
      const res = await cleanTakeRequest(ideaId, takeId)
      if (!mounted.current) return
      setTakes(res.takes)
      showNote('canvas.footage.cleanDone', { sec: cutSeconds(res) }, true)
    }, 'canvas.footage.cleanFailed')
  }

  const uploadToNode = (nodeId: string, file: File) => {
    const node = latest.current.doc.nodes.find((n) => n.id === nodeId)
    const kind = uploadKind(file)
    if (!node || !kind) return showText(t('canvas.upload.unsupported'))
    if (kind === 'video') {
      const index = shotIndex(node.shotId)
      if (index < 0) return showText(t('canvas.upload.needsShot'))
      const bad = checkFile(file)
      if (bad) return showText(bad)
      void working(nodeId, async () => {
        const take = await uploadTake(ideaId, index, file)
        await refreshTakes()
        if (!mounted.current) return
        dropLinesFrom(nodeId, node.data.media === 'image')
        updateData(nodeId, { media: 'video', takeId: take.id })
      }, 'canvas.err.uploadVideo')
      return
    }
    void working(nodeId, async () => {
      const g = await uploadImage(ideaId, nodeId, file)
      if (!mounted.current) return
      upsertGen(g)
      dropLinesFrom(nodeId, node.data.media === 'video')
      updateData(nodeId, { media: 'image', takeId: undefined, selected: g.id })
      markFrom(nodeId, false)
    }, 'canvas.err.upload')
  }

  // An upload node that changes from an image to a video (or back) can't keep lines made for the other kind.
  const dropLinesFrom = (nodeId: string, changes: boolean) => {
    if (!changes) return
    markFrom(nodeId, false)
    setEdges((es) => es.filter((e) => e.source !== nodeId))
  }

  const onUseTake = (takeId: string) => {
    if (blocked) return
    chooseTake(ideaId, takeId).then(
      (next) => mounted.current && setTakes(next),
      (e) => showText(e instanceof Error ? e.message : t('canvas.err.take')),
    )
  }

  const onSelectVersion = (nodeId: string, genId: string) => {
    const node = latest.current.doc.nodes.find((n) => n.id === nodeId)
    if (!node || node.data.selected === genId) return
    updateData(nodeId, { selected: genId })
    markFrom(nodeId, false)
  }

  // The chosen storyboard image of each shot goes into the shot list, so the plan shows the same picture.
  const written = useRef('')
  useEffect(() => {
    if (blocked) return
    const diff = primaryFrames(doc, shots, gens)
    const sig = JSON.stringify(diff)
    if (!diff.length || sig === written.current) return
    written.current = sig
    onChange({ shots: diff.reduce((cur, d) => mergeFrame(cur, d.index, d.frameImage), shots) })
  }, [doc, shots, gens, blocked, onChange])

  const check = (c: { source: string; target: string; targetHandle: string }) => canConnect(latest.current.doc, c, models)

  const onConnect = (c: Connection) => {
    if (!c.sourceHandle || !c.targetHandle) return
    const r = check({ source: c.source, target: c.target, targetHandle: c.targetHandle })
    if (!r.ok) return showNote(r.reason, r.vars)
    const edge: FlowEdge = { id: `e_${c.source}_${c.target}_${c.targetHandle}`, source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle }
    setEdges((es) => [...es, edge])
    if (c.targetHandle === 'in:kit') updateData(c.target, { kitCut: undefined }) // put back by hand: wire it again from now on
    markFrom(c.target, true)
  }

  // A line let go on empty board (not on a node; a frame's empty space counts as board) offers the kinds of node it
  // could feed. A line dropped on a port that refuses it never reaches onConnect, so say why here.
  const [drop, setDrop] = useState<{ source: string; screen: { x: number; y: number }; at: { x: number; y: number }; options: { kind: NodeKind; handle: string }[] } | null>(null)
  const onConnectEnd = (event: MouseEvent | TouchEvent, cs: FinalConnectionState) => {
    setDragFrom(null)
    if (!cs.toNode && cs.fromNode && cs.fromHandle?.type === 'source' && !blocked) {
      const p = 'changedTouches' in event ? event.changedTouches[0] : event
      const onNode = event.target instanceof Element && event.target.closest('.react-flow__node:not(.react-flow__node-shot)')
      const d = latest.current.doc
      const options = compatibleKinds(d, cs.fromNode.id)
      const box = flowBox.current?.getBoundingClientRect()
      if (p && box && !onNode && options.length) {
        // nothing new goes into a frame whose shot left the plan (its "+" is gone too)
        const src = d.nodes.find((n) => n.id === cs.fromNode?.id)
        const frame = src && frameOf(d, src)
        if (frame && d.nodes.find((n) => n.id === frame)?.data.removed) return showNote('canvas.drop.removed')
        setDrop({ source: cs.fromNode.id, screen: { x: p.clientX - box.left, y: p.clientY - box.top }, at: screenToFlowPosition({ x: p.clientX, y: p.clientY }), options })
      }
      return
    }
    if (cs.isValid !== false || !cs.fromHandle || !cs.toHandle || !cs.fromNode || !cs.toNode) return
    const fromOut = cs.fromHandle.type === 'source'
    const [out, inp] = fromOut ? [cs.fromNode, cs.toNode] : [cs.toNode, cs.fromNode]
    const handle = fromOut ? cs.toHandle : cs.fromHandle
    if (handle.type !== 'target' || cs.toHandle.type === cs.fromHandle.type) return
    const r = check({ source: out.id, target: inp.id, targetHandle: handle.id ?? '' })
    if (!r.ok) showNote(r.reason, r.vars)
  }

  // Puts the doc's last node (just added) and its new lines on the board; reframe takes it into its shot's frame.
  const place = (doc: CanvasDoc) => {
    const node = doc.nodes[doc.nodes.length - 1]
    const have = new Set(latest.current.doc.edges.map((e) => e.id))
    const f = toFlow({ nodes: [node], edges: doc.edges.filter((e) => !have.has(e.id)) })
    setNodes((ns) => reframe([...ns, ...f.nodes]))
    setEdges((es) => [...es, ...f.edges])
  }

  // The nodes' sizes as drawn, so a new node lands clear of the ones already in its frame.
  const drawnSizes = () => new Map(nodes.filter((n) => n.measured?.width && n.measured?.height).map((n) => [n.id, { w: n.measured!.width!, h: n.measured!.height! }]))

  // A new node in a shot's frame: at `at` when that is inside the frame, else right of the frame's last node. A video
  // gets the frame's newest storyboard on its start frame; a storyboard joins the kit.
  const addInShot = (d: CanvasDoc, kind: NodeKind, shotNodeId: string, at?: { x: number; y: number }, line?: { source: string; handle: string }) => {
    const shotId = d.nodes.find((n) => n.id === shotNodeId)?.shotId
    if (!shotId) return null
    const sizes = drawnSizes()
    const box = frameBoxes(d, sizes).get(shotNodeId)
    const inside = at && box && at.x >= box.x && at.y >= box.y && at.x < box.x + box.w && at.y < box.y + box.h
    let next = addNode(d, kind, at ?? { x: 0, y: 0 }, shotId)
    const id = next.nodes[next.nodes.length - 1].id
    const spot = inside ? { x: Math.round(at.x), y: Math.round(at.y) } : slotInFrame(d, shotNodeId, sizes)
    next = { ...next, nodes: next.nodes.map((n) => (n.id === id ? { ...n, position: spot } : n)) }
    if (line) next = withLine(next, line.source, id, line.handle)
    if (kind === 'video') next = wireStart(next, id, models)
    return { doc: wireKit(next), id }
  }

  const withLine = (d: CanvasDoc, source: string, target: string, handle: string): CanvasDoc => ({
    ...d,
    edges: [...d.edges, { id: `e_${source}_${target}_${handle}`, source, sourceHandle: 'out', target, targetHandle: handle }],
  })

  const pickDrop = (o: { kind: NodeKind; handle: string }) => {
    if (!drop) return
    setDrop(null)
    const d = latest.current.doc
    const src = d.nodes.find((n) => n.id === drop.source)
    if (!src || blocked) return
    const frame = frameOf(d, src)
    if (frame) {
      const made = addInShot(d, o.kind, frame, drop.at, { source: src.id, handle: o.handle })
      if (made) place(made.doc)
      return
    }
    if (o.kind === 'footage') return // a footage node needs a shot
    const added = addNode(d, o.kind, drop.at)
    place(wireKit(withLine(added, src.id, added.nodes[added.nodes.length - 1].id, o.handle)))
  }

  // The kit node goes left of (or above) the shots; it starts with every kit item picked and is wired to every storyboard.
  const addKit = () => {
    const cur = latest.current.doc
    if (cur.nodes.some((n) => n.type === 'kit')) return
    const anchor = cur.nodes.filter((n) => n.type === 'shot')
    const x = Math.min(...anchor.map((n) => n.position.x), 0) - 280
    const y = Math.min(...anchor.map((n) => n.position.y), 0)
    const added = addNode(cur, 'kit', freeSpot(cur, { x, y }))
    const last = added.nodes[added.nodes.length - 1]
    last.data = { kitItems: (kitRef.current?.items ?? []).map((i) => i.id) }
    const fresh = { ...added, nodes: added.nodes.map((n) => (n.type === 'storyboard' && n.data.kitCut ? { ...n, data: { ...n.data, kitCut: undefined } } : n)) }
    const wired = wireKit(fresh)
    adopt(wired)
    for (const target of kitTargets(wired, last.id)) markFrom(target, true)
  }

  const addAtCenter = (kind: NodeKind) => {
    if (kind === 'kit') return addKit()
    const box = flowBox.current?.getBoundingClientRect()
    const mid = box ? screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 0, y: 0 }
    place(wireKit(addNode(latest.current.doc, kind, freeSpot(latest.current.doc, { x: mid.x - 90, y: mid.y - 50 }))))
  }

  const updateData = (nodeId: string, patch: Partial<NodeData>) =>
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { node: { ...n.data.node, data: { ...n.data.node.data, ...patch } } } } : n)))

  // Taking a line away from an input dates the node it fed.
  const onEdges: typeof onEdgesChange = (changes) => {
    for (const c of changes) {
      const gone = c.type === 'remove' ? edges.find((e) => e.id === c.id) : undefined
      if (gone) {
        markFrom(gone.target, true)
        if (gone.targetHandle === 'in:kit') updateData(gone.target, { kitCut: true }) // cut by hand: don't wire it again
      }
    }
    onEdgesChange(changes)
  }

  // ---- canvas -> timeline ----
  const footageSignature = useMemo(
    () => [...gens.filter((g) => g.kind === 'video' && g.status === 'done').map((g) => g.id), ...takes.map((x) => x.id)].join(','),
    [gens, takes],
  )
  const sources = useSources(ideaId, footageSignature)
  const editingRef = useRef(editing)
  useEffect(() => {
    editingRef.current = editing
  })
  const timeline = useTimelineActions({
    edit,
    sources,
    shots,
    doc,
    gens,
    takes,
    readOnly,
    // The canvas shows one toast and stays where it is (spec 7.1); inside the editor the timeline itself shows the change.
    onPlaced: () => {
      if (editingRef.current) return
      setNote({ key: 'canvas.timeline.placed', info: true, action: { label: 'canvas.timeline.open', run: () => showEditor() } })
      clearTimeout(noteTimer.current)
      noteTimer.current = setTimeout(() => setNote(null), NOTE_MS)
    },
    notify: showNote,
  })

  // An edit saved before one clip per shot may hold several clips of a shot: keep one each, once, and say so.
  const trimmed = useRef(false)
  useEffect(() => {
    if (trimmed.current || !edit.project || readOnly) return
    trimmed.current = true
    const r = oneClipPerShot(edit.project)
    if (r.removed > 0) {
      edit.update(r.project)
      showNote('canvas.timeline.trimmed', undefined, true)
    }
  }, [edit, readOnly, showNote])

  // The running queue and the node statuses; the clock ticks only while something is running.
  const [now, setNow] = useState(() => Date.now())
  const running = gens.some((g) => g.status === 'queued' || g.status === 'waiting' || g.status === 'running')
  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  // The Timeline node: virtual, right of the frames, kept out of the board's nodes (so never saved or autosaved).
  const { clients } = useApp()
  const clientKit = clients.find((c) => c.id === clientId)?.brand
  const brand = useMemo(() => reelBrand(clientKit, clientId), [clientKit, clientId])
  const clipUrls = useMemo(() => Object.fromEntries((sources.sources ?? []).map((s) => [s.key, s.url])), [sources.sources])
  const boxes = useMemo(
    () => new Map<string, Box>(nodes.filter((n) => n.type === 'shot').map((n) => [n.id, { x: n.position.x, y: n.position.y, w: n.style?.width ?? 0, h: n.style?.height ?? 0 }])),
    [nodes],
  )
  const tl = useMemo(() => timelineFlow(doc, edit.project, boxes), [doc, edit.project, boxes])
  const [tlSize, setTlSize] = useState<{ width: number; height: number } | undefined>(undefined)
  const shownNodes = useMemo(() => [...nodes, { ...tl.node, measured: tlSize }], [nodes, tl.node, tlSize])

  const ctx: CanvasCtx = {
    doc,
    putInTimeline: (src) => void timeline.useForShot(src),
    isInTimeline: timeline.isInTimeline,
    shotHasClip: (shotId) => shotOnTimeline(edit.project, shotId),
    editProject: edit.project,
    clipUrls,
    brand,
    openEditor: showEditor,
    shots,
    readOnly,
    shotNumbers: useMemo(() => {
      // a shot's number is its place in the plan's shot list; a removed row has none
      const out = new Map<string, number>()
      for (const n of nodes) {
        const i = n.data.node.type === 'shot' ? shots.findIndex((s) => s.id === n.data.node.shotId) : -1
        if (i >= 0) out.set(n.id, i + 1)
      }
      return out
    }, [nodes, shots]),
    updateData,
    models,
    gens,
    onGenerate: (id) => void onGenerate(id),
    budget,
    chainOf: (id) => chainPair(doc, id),
    onRunScope: (opts) => void onRunScope(opts),
    chaining,
    onSelectVersion,
    edited: (id) => markFrom(id, latest.current.doc.nodes.find((n) => n.id === id)?.type !== 'prompt'),
    takes,
    shotIndex,
    uploading: (id) => busy.has(id),
    uploadToNode,
    addTake,
    pickTake: onUseTake,
    cleanTake,
    blocked,
    incomingHandles: (id) => edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? ''),
    missing: (id) => {
      const node = doc.nodes.find((n) => n.id === id)
      const model = models.find((m) => m.id === node?.data.model) ?? models.find((m) => m.kind === (node?.type === 'video' ? 'video' : 'image'))
      return model ? missingInput(doc, id, model, shots, gens) : null
    },
    status: (id) => nodeStatus(doc, id, gens, models, shots, now),
    addAfterShot: (shotNodeId, kind) => {
      const made = addInShot(latest.current.doc, kind, shotNodeId)
      if (!made) return
      place(made.doc)
      // Once the new node is on screen and measured, bring it and its frame into view without zooming in.
      const ids = [{ id: shotNodeId }, { id: made.id }]
      requestAnimationFrame(() => requestAnimationFrame(() => void fitView({ nodes: ids, padding: 0.3, maxZoom: getZoom(), duration: 300 })))
    },
    acceptsDrop: (nodeId, handleId) => dragFrom === null || check({ source: dragFrom, target: nodeId, targetHandle: handleId }).ok,
    dragging: dragFrom !== null,
    clientId,
    kit,
    kitFailed,
    openKit: () => setKitOpen(true),
    kitView: (id) => {
      const src = doc.edges.find((e) => e.target === id && e.targetHandle === 'in:kit')
      const kitNode = src && doc.nodes.find((n) => n.id === src.source && n.type === 'kit')
      if (!kitNode || !kit) return null
      const used = new Set(kitNode.data.kitItems ?? [])
      return { items: kit.items.filter((i) => used.has(i.id)), off: doc.nodes.find((n) => n.id === id)?.data.kitOff ?? [], removed: removedBy.get(id) ?? [] }
    },
    kitSent: (id, model) => kitRefs(doc, id, kit, gens, model),
    setKitOff: (id, itemId, off) => {
      const cur = latest.current.doc.nodes.find((n) => n.id === id)?.data.kitOff ?? []
      updateData(id, { kitOff: off ? [...cur.filter((x) => x !== itemId), itemId] : cur.filter((x) => x !== itemId) })
      markFrom(id, true)
    },
  }

  const kitNode = doc.nodes.find((n) => n.type === 'kit')
  useEffect(() => {
    if (!kitNode) setKitOpen(false) // a kit node added later must not bring the drawer back
  }, [kitNode])
  const selectedKit = nodes.some((n) => n.selected && n.data.node.type === 'kit')

  const [tool, setTool] = useState<'select' | 'pan'>('select')
  const saveText = readOnly || stale ? '' : saveState === 'saving' ? t('canvas.save.saving') : saveState === 'saved' ? t('canvas.save.saved') : saveState === 'failed' ? t('canvas.save.failed') : ''

  const setFull = useCallback(
    (on: boolean) => {
      writeFullscreen(on)
      onFullscreen(on)
    },
    [onFullscreen],
  )
  // F enters and Esc leaves full screen, unless typing, a dialog or the editor has the key.
  const keyState = useRef({ fullscreen, dialogOpen: false, editorOpen: false })
  keyState.current = { fullscreen, dialogOpen: !!runAsk || !!paidAsk, editorOpen: editing }
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target instanceof HTMLElement ? e.target : null
      const typing = !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
      const { fullscreen: full, dialogOpen: dlg, editorOpen } = keyState.current
      // an open add-node menu, queue list or larger view takes Esc first (this listener runs in the capture phase, before they close)
      const dialogOpen = dlg || !!document.querySelector('.cv-add-list, .cv-queue-list, .cv-drop, .cv-lightbox, .cv-model-list')
      const act = shellKey({ key: e.key, typing, dialogOpen, editorOpen }, full)
      if (act) setFull(act === 'enter')
    }
    window.addEventListener('keydown', on, true)
    return () => window.removeEventListener('keydown', on, true)
  }, [setFull])

  const queue = useMemo(() => runningQueue(doc, gens, models, shots, now), [doc, gens, models, shots, now])

  // The toolbar total is what Run all would cost now: the same scope as its dialog (spec §6.4, ruling P7).
  const scope = useMemo(() => runScopeInfo(doc, shots, gens, models, { includeStale: true }), [doc, shots, gens, models])
  const scopeSum = scopeTotal(scope.items)
  const liveShots = liveShotIds(doc, shots).length
  const shotNo = (shotId: string) => shots.findIndex((s) => s.id === shotId) + 1
  const leftImage = budgetLeft(budget, 'image')
  const leftVideo = budgetLeft(budget, 'video')
  const leftText = leftImage === null || leftVideo === null ? null : t('canvas.chain.left', { image: leftImage.toFixed(2), video: leftVideo.toFixed(2) })
  const totalTitle = [
    t('canvas.toolbar.totalHint'),
    ...scopeSum.perShot.map((p) => t('canvas.run.shot', { n: shotNo(p.shotId), usd: p.usd.toFixed(2) })),
    ...(scope.skippedNoKey > 0 ? [t('canvas.run.noKeySkipped', { n: scope.skippedNoKey })] : []),
    ...(leftText ? [leftText] : []),
  ].join('\n')
  const jumpTo = (id: string) => {
    setNodes((ns) => ns.map((n) => (n.selected === (n.id === id) ? n : { ...n, selected: n.id === id })))
    void fitView({ nodes: [{ id }], padding: 0.6, maxZoom: 1, duration: 250 })
  }

  // Lines are thin and grey; selection, a running job and an upstream with no result yet change their look (spec §5.2).
  const selectedKey = nodes.filter((n) => n.selected).map((n) => n.id).join(',')
  const focus = useMemo(() => focusSet(doc, selectedKey ? selectedKey.split(',') : []), [doc, selectedKey])
  // The right panel shows while exactly one storyboard or video node is selected (spec §6.3).
  const picked = nodes.filter((n) => n.selected)
  const panelId = picked.length === 1 && (picked[0].data.node.type === 'storyboard' || picked[0].data.node.type === 'video') ? picked[0].id : null
  const shownEdges = edges.map((e) => {
    const look = edgeLook({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? '', targetHandle: e.targetHandle ?? '' }, doc, gens, takes, focus, selectedKit)
    return { ...e, className: look.className, animated: look.animated }
  })
  for (const e of tl.edges) {
    const look = edgeLook({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? '', targetHandle: e.targetHandle ?? '' }, doc, gens, takes, focus, selectedKit, { targetKind: 'timeline' })
    shownEdges.push({ ...e, className: look.className, animated: look.animated })
  }

  // A node that moved or got its drawn size: frames fit their nodes again and never overlap.
  const onNodes: typeof onNodesChange = (all) => {
    // The Timeline node is not one of the board's nodes: only its drawn size is kept.
    for (const c of all) if (c.type === 'dimensions' && c.id === TIMELINE_NODE_ID && c.dimensions) setTlSize(c.dimensions)
    const changes = all.filter((c) => !('id' in c && c.id === TIMELINE_NODE_ID))
    onNodesChange(changes)
    const frames = new Set(nodes.filter((n) => n.type === 'shot').map((n) => n.id))
    if (changes.some((c) => c.type === 'dimensions' && !frames.has(c.id))) setNodes((ns) => reframe(ns))
  }

  // The note is shown on the board, or over the editor while that covers the board (e.g. "the reel is full").
  const noteEl = (
    <div className={note?.info ? 'cv-conn-note is-info' : 'cv-conn-note'} role={note && !note.info ? 'alert' : 'status'}>
      {note && (note.text ?? (note.key && t(note.key, note.vars)))}
      {note?.action && (
        <button
          type="button"
          className="cv-conn-note-action"
          onClick={() => {
            note.action?.run()
            setNote(null)
          }}
        >
          {t(note.action.label)}
        </button>
      )}
      {note && !note.info && (
        <button type="button" className="cv-conn-note-x" aria-label={t('canvas.note.dismiss')} onClick={() => setNote(null)}>
          ×
        </button>
      )}
    </div>
  )

  return (
    <section className="cv-screen">
      {editing && (
        <section className="cv-editor-full" aria-label={t('canvas.editor.title')}>
          <EditorPanel ideaId={ideaId} clientId={clientId} shots={shots} edit={edit} sources={sources} timeline={timeline} readOnly={readOnly} onBack={() => setEditing(false)} startExport={editorExport} />
          {noteEl}
        </section>
      )}
      <div className="cv-board" hidden={editing}>
      <CanvasToolbar
        title={title}
        clientName={clientName}
        onBack={onBack}
        backLabel={backLabel}
        mode="canvas"
        onMode={(m) => m === 'timeline' && showEditor()}
        fullscreen={fullscreen}
        onFullscreen={setFull}
        saveText={saveText}
      >
        <span className="cv-bar-total small" title={totalTitle}>
          {t('canvas.toolbar.total', { n: liveShots, usd: scopeSum.total.toFixed(2) })}
        </span>
        {!readOnly && (
          <button type="button" className="btn btn-primary btn-sm cv-runall-btn" disabled={blocked || chaining} onClick={() => void onRunScope({ includeStale: true })}>
            {t('canvas.toolbar.runAll')}
          </button>
        )}
      </CanvasToolbar>

      {stale && (
        <div className="cv-note cv-note-error" role="alert">
          <span>{t('canvas.stale')}</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={onReload}>
            {t('canvas.reload')}
          </button>
        </div>
      )}
      {readOnly && !stale && (
        <div className="cv-note" role="status">
          {t('canvas.readonly')}
        </div>
      )}

      <CanvasContext.Provider value={ctx}>
      <div className="cv-layout">
        <div className="cv-flow" ref={flowBox}>
          <ReactFlow
            nodes={shownNodes}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodes}
            onNodeDragStop={() => setNodes((ns) => reframe(ns))}
            onEdgesChange={onEdges}
            onConnect={onConnect}
            onConnectStart={(_, p) => setDragFrom(p.handleType === 'source' ? p.nodeId : null)}
            onConnectEnd={onConnectEnd}
            isValidConnection={(c) => !!c.targetHandle && check({ source: c.source, target: c.target, targetHandle: c.targetHandle }).ok}
            connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 1.4 }}
            onMoveEnd={(event, vp) => {
              if (event) setViewport(vp) // only the user's own pan or zoom, not the first fit
            }}
            fitView
            panOnDrag={tool === 'pan' ? true : [1, 2]}
            selectionOnDrag={tool === 'select'}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
            aria-label={t('canvas.flow.label')}
          >
            <Background />
            <MiniMap pannable zoomable />
            <ZoomBar />
          </ReactFlow>
          <ToolRail mode={tool} onMode={setTool} addKinds={clientId ? ADD_KINDS_WITH_KIT : ADD_KINDS} disabledKinds={kitNode ? ['kit'] : undefined} onAdd={addAtCenter} readOnly={readOnly} />
          <QueuePill items={queue} onJump={jumpTo} />
          {drop && <DropMenu at={drop.screen} options={drop.options} onPick={pickDrop} onClose={() => setDrop(null)} />}
          {runAsk && (
            <div className="cv-modal-back">
              <div className="cv-modal cv-run-modal" role="dialog" aria-modal="true" aria-label={t(runAsk.title)}>
                <h2>{t(runAsk.title)}</h2>
                <ul>
                  {scopeTotal(runAsk.items).perShot.flatMap((p) => {
                    const paid = runAsk.items.filter((it) => it.shotId === p.shotId && it.usd > 0)
                    if (!paid.length) return []
                    return [
                      <li key={p.shotId} className="cv-run-shot">
                        <strong>{t('canvas.run.shot', { n: shotNo(p.shotId), usd: p.usd.toFixed(2) })}</strong>
                      </li>,
                      ...paid.map((it) => {
                        const m = models.find((x) => x.id === it.model)
                        const type = doc.nodes.find((n) => n.id === it.nodeId)?.type
                        return (
                          <li key={it.nodeId}>
                            <span>{t('canvas.chain.item', { node: type === 'storyboard' || type === 'video' ? t(`canvas.node.${type}`) : it.nodeId, model: m?.label ?? it.model })}</span>
                            <span>{t('canvas.gen.cost', { usd: it.usd.toFixed(2) })}</span>
                          </li>
                        )
                      }),
                    ]
                  })}
                </ul>
                <strong>{t('canvas.chain.total', { total: scopeTotal(runAsk.items).total.toFixed(2) })}</strong>
                {runAsk.skippedNoKey > 0 && <span className="small muted">{t('canvas.run.noKeySkipped', { n: runAsk.skippedNoKey })}</span>}
                {leftText && <span className="small muted">{leftText}</span>}
                <div className="cv-modal-actions">
                  <button type="button" className="btn btn-ghost btn-sm" autoFocus disabled={chaining} onClick={() => setRunAsk(null)}>
                    {t('canvas.chain.cancel')}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" disabled={chaining} onClick={() => void confirmRun()}>
                    {t('canvas.chain.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {paidAsk && (
            <div className="cv-modal-back">
              <div className="cv-modal cv-paid-modal" role="dialog" aria-modal="true" aria-label={t('canvas.paid.title')}>
                <h2>{t('canvas.paid.title')}</h2>
                <p>{t('canvas.paid.body', { model: paidAsk.model, usd: paidAsk.usd.toFixed(2) })}</p>
                {leftText && <span className="small muted">{leftText}</span>}
                <div className="cv-modal-actions">
                  <button type="button" className="btn btn-ghost btn-sm" autoFocus onClick={() => setPaidAsk(null)}>
                    {t('canvas.chain.cancel')}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={confirmPaid}>
                    {t('canvas.paid.confirm')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {!editing && noteEl}
        </div>
        {kitOpen && kit && kitNode && (
          <div className="cv-kit-drawer">
            <KitPanel
              clientId={clientId}
              kit={kit}
              selected={kitNode.data.kitItems ?? []}
              onKit={applyKit}
              onSelected={(ids) => {
                updateData(kitNode.id, { kitItems: ids })
                for (const target of kitTargets(latest.current.doc, kitNode.id)) markFrom(target, true)
              }}
              onClose={() => setKitOpen(false)}
            />
          </div>
        )}
        {panelId && <NodePanel key={panelId} nodeId={panelId} onClose={() => setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)))} />}
      </div>
      </CanvasContext.Provider>
      </div>
    </section>
  )
}
