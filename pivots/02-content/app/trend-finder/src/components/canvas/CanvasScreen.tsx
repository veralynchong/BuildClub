import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
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
import type { SavedIdea, Shot } from '../../types'
import { t, type Key, type Vars } from '../../lib/i18n'
import { getCanvas, getModels, NoShots, pollGen, putCanvas, StaleCanvas, startGen, uploadImage } from '../../lib/canvas/api'
import { clampDrawerWidth, defaultDrawerWidth, readDrawer, writeDrawer } from '../../lib/canvas/drawer'
import { fromFlow, isDefaultViewport, toFlow, type FlowEdge, type FlowNode } from '../../lib/canvas/flow'
import { addNode, freeSpot, genFinished, genRequest, genStarted, missingInput, pendingGen, primaryFrames, staleIds, finishedWhileAway } from '../../lib/canvas/graph'
import { mergeFrame } from '../../lib/storyboard'
import { chooseTake, checkFile, listTakes, uploadTake, type Take } from '../../lib/takes'
import { uploadKind } from '../../lib/canvas/upload'
import { canConnect, edgeLabel, outMedia } from '../../lib/canvas/ports'
import type { CanvasDoc, CanvasState, GenModel, Generation, NodeData, NodeKind } from '../../lib/canvas/types'
import { ErrorText } from '../ErrorText'
import { AddNodeMenu } from './AddNodeMenu'
import { EditorDrawer } from './EditorDrawer'
import { CanvasContext, type CanvasCtx } from './nodes/ctx'
import { nodeTypes } from './nodes'

const SAVE_DELAY_MS = 800
const RETRY_MS = 2000
const MAX_RETRIES = 5
const NOTE_MS = 4000 // how long the reason for a blocked line stays up
const ADD_KINDS: NodeKind[] = ['prompt', 'storyboard', 'video', 'upload']
const MEDIA_COLOR = { text: 'var(--violet)', image: 'var(--blue)', video: 'var(--mustard)' } as const
const POLL_RETRY_MS = 2000 // wait after a poll request fails before asking again

interface Props {
  idea: SavedIdea
  shots: Shot[] // the plan's shot list; the shot nodes show its lines
  onChange: (patch: Partial<SavedIdea>) => void
  onBack: () => void
  backLabel: string
}

function useViewportWidth(): number {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

// Loads the canvas (waiting a little for a just-edited shot list to reach the server), then shows the board.
export default function CanvasScreen({ idea, shots, onChange, onBack, backLabel }: Props) {
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
      <CanvasBoard key={loadKey} ideaId={idea.id} shots={shots} onChange={onChange} readOnly={idea.status !== 'approved'} initial={state} back={back} onReload={reload} />
    </ReactFlowProvider>
  )
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

function CanvasBoard({
  ideaId,
  shots,
  onChange,
  readOnly,
  initial,
  back,
  onReload,
}: {
  ideaId: string
  shots: Shot[]
  onChange: (patch: Partial<SavedIdea>) => void
  readOnly: boolean
  initial: CanvasState
  back: React.ReactNode
  onReload: () => void
}) {
  const first = useMemo(() => toFlow(initial.doc), [initial])
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(first.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(first.edges)
  const { screenToFlowPosition } = useReactFlow()
  const flowBox = useRef<HTMLDivElement>(null)
  const [viewport, setViewport] = useState<Viewport | undefined>(initial.doc.viewport)
  const vw = useViewportWidth()
  const fit = isDefaultViewport(initial.doc.viewport)

  // ---- drawer ----
  const [drawer, setDrawer] = useState(() => readDrawer())
  const drawerWidth = clampDrawerWidth(drawer.width ?? defaultDrawerWidth(vw), vw)
  // `save` false while the edge is being dragged; the width is stored once it is let go.
  const setDrawerState = (open: boolean, width: number, save = true) => {
    setDrawer({ open, width })
    if (save) writeDrawer({ open, width })
  }

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
  const [note, setNote] = useState<{ key?: Key; vars?: Vars; text?: string } | null>(null)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(noteTimer.current), [])
  const showNote = useCallback((key: Key, vars?: Vars) => {
    setNote({ key, vars })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), NOTE_MS)
  }, [])

  const showText = useCallback((text: string) => {
    setNote({ text })
    clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(() => setNote(null), NOTE_MS)
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
    [ideaId, upsertGen, setNodes, markFrom],
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

  const onGenerate = async (nodeId: string) => {
    const d = latest.current.doc
    const node = d.nodes.find((n) => n.id === nodeId)
    const kind = node?.type === 'video' ? 'video' : 'image'
    const model = models.find((m) => m.id === node?.data.model && m.kind === kind) ?? models.find((m) => m.kind === kind)
    if (!node || !model || blocked || pendingGen(nodeId, gensRef.current) || starting.current.has(nodeId)) return
    if (missingInput(d, nodeId, model, shots, gensRef.current)) return
    const req = genRequest(d, nodeId, shots, gensRef.current)
    if (kind === 'video' && req.duration === undefined && model.durations) req.duration = model.durations[0]
    starting.current.add(nodeId)
    try {
      const g = await startGen(ideaId, { nodeId, model: model.id, ...req })
      if (!mounted.current) return
      // the chosen version stays until the new one is done, so a failed try leaves the plan's frame alone
      setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { node: { ...n.data.node, data: genStarted(n.data.node.data, model.id, g.id) } } } : n)))
      upsertGen(g)
      track(g)
    } catch (e) {
      if (mounted.current) showText(e instanceof Error ? e.message : t('canvas.err.start'))
    } finally {
      starting.current.delete(nodeId)
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
      if (mounted.current) showText(e instanceof Error ? e.message : t(fallback))
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
    markFrom(c.target, true)
  }

  // A line dropped on a port that refuses it never reaches onConnect, so say why here.
  const onConnectEnd = (_: unknown, cs: FinalConnectionState) => {
    setDragFrom(null)
    if (cs.isValid !== false || !cs.fromHandle || !cs.toHandle || !cs.fromNode || !cs.toNode) return
    const fromOut = cs.fromHandle.type === 'source'
    const [out, inp] = fromOut ? [cs.fromNode, cs.toNode] : [cs.toNode, cs.fromNode]
    const handle = fromOut ? cs.toHandle : cs.fromHandle
    if (handle.type !== 'target' || cs.toHandle.type === cs.fromHandle.type) return
    const r = check({ source: out.id, target: inp.id, targetHandle: handle.id ?? '' })
    if (!r.ok) showNote(r.reason, r.vars)
  }

  const place = (doc: CanvasDoc) => {
    const node = doc.nodes[doc.nodes.length - 1]
    const edge = doc.edges.length > latest.current.doc.edges.length ? doc.edges[doc.edges.length - 1] : undefined
    const f = toFlow({ nodes: [node], edges: edge ? [edge] : [] })
    setNodes((ns) => [...ns, ...f.nodes])
    setEdges((es) => [...es, ...f.edges])
  }

  const addAtCenter = (kind: NodeKind) => {
    const box = flowBox.current?.getBoundingClientRect()
    const mid = box ? screenToFlowPosition({ x: box.left + box.width / 2, y: box.top + box.height / 2 }) : { x: 0, y: 0 }
    place(addNode(latest.current.doc, kind, freeSpot(latest.current.doc, { x: mid.x - 90, y: mid.y - 50 })))
  }

  const updateData = (nodeId: string, patch: Partial<NodeData>) =>
    setNodes((ns) => ns.map((n) => (n.id === nodeId ? { ...n, data: { node: { ...n.data.node, data: { ...n.data.node.data, ...patch } } } } : n)))

  // Taking a line away from an input dates the node it fed.
  const onEdges: typeof onEdgesChange = (changes) => {
    for (const c of changes) {
      const gone = c.type === 'remove' ? edges.find((e) => e.id === c.id) : undefined
      if (gone) markFrom(gone.target, true)
    }
    onEdgesChange(changes)
  }

  const ctx: CanvasCtx = {
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
    onSelectVersion,
    edited: (id) => markFrom(id, latest.current.doc.nodes.find((n) => n.id === id)?.type !== 'prompt'),
    takes,
    shotIndex,
    uploading: (id) => busy.has(id),
    uploadToNode,
    addTake,
    pickTake: onUseTake,
    incomingHandles: (id) => edges.filter((e) => e.target === id).map((e) => e.targetHandle ?? ''),
    missing: (id) => {
      const node = doc.nodes.find((n) => n.id === id)
      const model = models.find((m) => m.id === node?.data.model) ?? models.find((m) => m.kind === (node?.type === 'video' ? 'video' : 'image'))
      return model ? missingInput(doc, id, model, shots, gens) : null
    },
    addAfterShot: (shotNodeId, kind) => {
      const shot = latest.current.doc.nodes.find((n) => n.id === shotNodeId)
      if (shot) place(addNode(latest.current.doc, kind, { x: shot.position.x + 360, y: shot.position.y }, shot.shotId))
    },
    acceptsDrop: (nodeId, handleId) => dragFrom === null || check({ source: dragFrom, target: nodeId, targetHandle: handleId }).ok,
  }

  const dragSource = dragFrom ? doc.nodes.find((n) => n.id === dragFrom) : undefined
  const dragMedia = dragSource ? outMedia(dragSource) : null
  const shownEdges = edges.map((e) => {
    const src = doc.nodes.find((n) => n.id === e.source)
    const media = src && outMedia(src)
    const label = edgeLabel({ targetHandle: e.targetHandle ?? '' })
    return { ...e, className: media ? `cv-media-${media}` : undefined, label: label ? t(label) : undefined }
  })

  return (
    <section className="cv-screen">
      {back}
      <header className="cv-head">
        <h1>{t('canvas.title')}</h1>
        <span className="cv-save small muted" role="status">
          {readOnly || stale
            ? ''
            : saveState === 'saving'
              ? t('canvas.save.saving')
              : saveState === 'saved'
                ? t('canvas.save.saved')
                : saveState === 'failed'
                  ? t('canvas.save.failed')
                  : ''}
        </span>
        <div className="cv-head-actions">
          <AddNodeMenu kinds={ADD_KINDS} label={t('canvas.add')} disabled={readOnly} onPick={addAtCenter} />
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={drawer.open} onClick={() => setDrawerState(!drawer.open, drawerWidth)}>
            {drawer.open ? t('canvas.editor.close') : t('canvas.editor.open')}
          </button>
        </div>
      </header>

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

      <div className="cv-layout">
        <div className="cv-flow" ref={flowBox}>
          <CanvasContext.Provider value={ctx}>
          <ReactFlow
            nodes={nodes}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdges}
            onConnect={onConnect}
            onConnectStart={(_, p) => setDragFrom(p.handleType === 'source' ? p.nodeId : null)}
            onConnectEnd={onConnectEnd}
            isValidConnection={(c) => !!c.targetHandle && check({ source: c.source, target: c.target, targetHandle: c.targetHandle }).ok}
            connectionLineStyle={{ stroke: dragMedia ? MEDIA_COLOR[dragMedia] : 'var(--muted)', strokeWidth: 2 }}
            onMoveEnd={(event, vp) => {
              if (event) setViewport(vp) // only the user's own pan or zoom, not the first fit
            }}
            defaultViewport={fit ? undefined : initial.doc.viewport}
            fitView={fit}
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.1}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            deleteKeyCode={readOnly ? null : ['Backspace', 'Delete']}
            aria-label={t('canvas.flow.label')}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
          </CanvasContext.Provider>
          <div className="cv-conn-note" role="status">
            {note && (note.text ?? (note.key && t(note.key, note.vars)))}
          </div>
        </div>
        <EditorDrawer
          open={drawer.open}
          width={drawerWidth}
          onWidth={(px, save) => setDrawerState(true, clampDrawerWidth(px, vw), save)}
        />
      </div>
    </section>
  )
}
