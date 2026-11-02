import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState, type Viewport } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { SavedIdea, Shot } from '../../types'
import { t } from '../../lib/i18n'
import { getCanvas, NoShots, putCanvas, StaleCanvas } from '../../lib/canvas/api'
import { clampDrawerWidth, defaultDrawerWidth, readDrawer, writeDrawer } from '../../lib/canvas/drawer'
import { fromFlow, isDefaultViewport, toFlow, type FlowEdge, type FlowNode } from '../../lib/canvas/flow'
import type { CanvasNode, CanvasState } from '../../lib/canvas/types'
import { ErrorText } from '../ErrorText'
import { EditorDrawer } from './EditorDrawer'

const SAVE_DELAY_MS = 800
const RETRY_MS = 2000
const MAX_RETRIES = 5
const NARROW = 500 // below this the minimap would cover the canvas

interface Props {
  idea: SavedIdea
  shots: Shot[] // the plan's shot list; the server's copy builds the canvas, this is what Task 6's nodes will read
  onChange: (patch: Partial<SavedIdea>) => void
  onBack: () => void
  backLabel: string
}

const nodeLabel = (n: CanvasNode, shotNumber: number): string =>
  n.type === 'shot' ? t('canvas.node.shot', { n: shotNumber }) : t(`canvas.node.${n.type}`)

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
export default function CanvasScreen({ idea, onBack, backLabel }: Props) {
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

  return <CanvasBoard key={loadKey} ideaId={idea.id} readOnly={idea.status !== 'approved'} initial={state} back={back} onReload={reload} />
}

type SaveState = 'idle' | 'saving' | 'saved' | 'failed'

function CanvasBoard({
  ideaId,
  readOnly,
  initial,
  back,
  onReload,
}: {
  ideaId: string
  readOnly: boolean
  initial: CanvasState
  back: React.ReactNode
  onReload: () => void
}) {
  const first = useMemo(() => toFlow(initial.doc, nodeLabel), [initial])
  const [nodes, , onNodesChange] = useNodesState<FlowNode>(first.nodes)
  const [edges, , onEdgesChange] = useEdgesState<FlowEdge>(first.edges)
  const [viewport, setViewport] = useState<Viewport | undefined>(initial.doc.viewport)
  const vw = useViewportWidth()
  const fit = isDefaultViewport(initial.doc.viewport)

  // ---- drawer ----
  const [drawer, setDrawer] = useState(() => readDrawer())
  const drawerWidth = clampDrawerWidth(drawer.width ?? defaultDrawerWidth(vw), vw)
  const setDrawerState = (open: boolean, width: number) => {
    setDrawer({ open, width })
    writeDrawer({ open, width })
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
    if (latest.current.key !== savedKey.current) void save() // changed while saving
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
        <button
          type="button"
          className="btn btn-ghost btn-sm cv-editor-btn"
          aria-expanded={drawer.open}
          onClick={() => setDrawerState(!drawer.open, drawerWidth)}
        >
          {drawer.open ? t('canvas.editor.close') : t('canvas.editor.open')}
        </button>
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
        <div className="cv-flow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
            deleteKeyCode={readOnly ? null : undefined}
            aria-label={t('canvas.flow.label')}
          >
            <Background />
            <Controls showInteractive={false} />
            {vw >= NARROW && <MiniMap pannable zoomable />}
          </ReactFlow>
        </div>
        <EditorDrawer
          open={drawer.open}
          width={drawerWidth}
          onWidth={(px) => setDrawerState(true, clampDrawerWidth(px, vw))}
          onClose={() => setDrawerState(false, drawerWidth)}
        />
      </div>
    </section>
  )
}
