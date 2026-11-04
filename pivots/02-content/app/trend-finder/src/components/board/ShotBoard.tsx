import { useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { BoardPos, Client, Format, SavedIdea, Shot } from '../../types'
import { t, tp } from '../../lib/i18n'
import {
  NODE_H,
  NODE_W,
  addLoose,
  boardEditable,
  boardFromShots,
  boardShots,
  edgeAt,
  edgesOf,
  footageShot,
  idMaker,
  indexOf,
  insertAt,
  insertBetween,
  moveNode,
  placeLoose,
  removeNode,
  replaceShots,
  setPosition,
  tidy,
  toPlan,
  totalSeconds,
  updateShot,
  type Board,
} from '../../lib/shotBoard'
import { MAX_PROMPT, insertShot, rewriteShots, type Assisted } from '../../lib/boardAssist'
import { footageFromFile } from '../../lib/boardMedia'
import { ShotNode } from './ShotNode'
import { SeqEdge } from './SeqEdge'
import { BoardActionsContext, type BoardActions, type SeqFlowEdge, type ShotFlowNode } from './boardContext'

interface Props {
  idea: SavedIdea
  format: Format
  client: Client
  // Sample mode (no local API) skips the AI routes and edits from simple rules.
  live: boolean
  // Saves the ordered shots (and where each card sits) into the plan, the same way the plan page saves shots.
  onSave: (patch: { shots: Shot[]; boardLayout: BoardPos[] }) => void
  onBack: () => void
}

const nodeTypes = { shot: ShotNode }
const edgeTypes = { seq: SeqEdge }

// React Flow's cards from the board. What React Flow measured and selected is kept from the cards it had.
function buildNodes(board: Board, prev: ShotFlowNode[], editable: boolean): ShotFlowNode[] {
  const old = new Map(prev.map((n) => [n.id, n]))
  const total = board.order.length
  const make = (bn: Board['order'][number], index: number | null): ShotFlowNode => ({
    ...old.get(bn.id),
    id: bn.id,
    type: 'shot',
    position: { x: bn.x, y: bn.y },
    data: { node: bn, index, total },
    draggable: editable,
  })
  return [...board.order.map((bn, i) => make(bn, i)), ...board.loose.map((bn) => make(bn, null))]
}

const sampleNote = (r: Assisted<unknown>): string | undefined =>
  r.source === 'sample' ? (r.reason === 'failed' ? t('board.sample.failed') : t('board.sample.offline')) : undefined

const startsClosed = (): boolean => {
  try {
    return window.matchMedia('(max-width: 720px)').matches
  } catch {
    return false
  }
}

interface Message {
  text: string
  note?: string
  undo?: boolean
}

function BoardScreen({ idea, format, client, live, onSave, onBack }: Props) {
  const editable = boardEditable(idea)
  const [makeId] = useState(() => idMaker('n'))
  const [board, setBoard] = useState(() => boardFromShots(boardShots(idea, format.shotList), idea.boardLayout, makeId))
  // The latest board, for handlers that run after an await or during a drag.
  const boardRef = useRef(board)
  const [rfNodes, setRfNodes] = useState<ShotFlowNode[]>(() => buildNodes(board, [], editable))
  const [undo, setUndo] = useState<Board | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [dropEdge, setDropEdge] = useState<string | null>(null)
  const [toolsOpen, setToolsOpen] = useState(() => !startsClosed())
  // "Change the shot list"
  const [rewrite, setRewrite] = useState('')
  const [rewriteErr, setRewriteErr] = useState('')
  // "Add a shot between two cards": the link being filled in.
  const [inserting, setInserting] = useState<{ before: string; after: string } | null>(null)
  const [insertText, setInsertText] = useState('')
  const [insertErr, setInsertErr] = useState('')
  const [busy, setBusy] = useState<'rewrite' | 'insert' | 'upload' | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const { fitView } = useReactFlow()

  const commit = (next: Board, text?: string, opts: { undoable?: boolean; save?: boolean; note?: string; refit?: boolean } = {}) => {
    const prev = boardRef.current
    boardRef.current = next
    setBoard(next)
    setRfNodes((nds) => buildNodes(next, nds, editable))
    if (opts.undoable) setUndo(prev)
    else if (text !== undefined) setUndo(null)
    if (opts.save !== false && editable) onSave(toPlan(next))
    if (text !== undefined) setMessage({ text, note: opts.note, undo: opts.undoable })
    if (opts.refit) requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1 }))
  }

  const selectedId = rfNodes.find((n) => n.selected)?.id ?? null

  const edges: SeqFlowEdge[] = useMemo(
    () =>
      edgesOf(board).map((e, i) => ({
        ...e,
        type: 'seq',
        data: { a: i + 1, b: i + 2, dropTarget: e.id === dropEdge },
      })),
    [board, dropEdge],
  )

  const nameOf = (s: Shot) => s.footage?.name ?? s.shot

  const actions: BoardActions = {
    editable,
    total: board.order.length,
    openInsert: (before, after) => {
      setInserting({ before, after })
      setInsertText('')
      setInsertErr('')
    },
    saveShot: (id, patch) => {
      const n = indexOf(boardRef.current, id) + 1
      commit(updateShot(boardRef.current, id, patch), t('board.node.saved', { n }))
    },
    remove: (id) => {
      const b = boardRef.current
      const i = indexOf(b, id)
      if (i < 0) return commit(removeNode(b, id), undefined, { save: false })
      commit(removeNode(b, id), t('board.node.deleted', { n: i + 1 }), { undoable: true })
    },
    move: (id, delta) => {
      const b = boardRef.current
      const from = indexOf(b, id) + 1
      const next = moveNode(b, id, delta)
      commit(next, t('board.node.moved', { from, to: indexOf(next, id) + 1 }))
    },
    place: (looseId, afterIndex) => {
      const b = boardRef.current
      const node = b.loose.find((n) => n.id === looseId)
      if (!node) return
      const afterId = afterIndex < 0 ? null : (b.order[afterIndex]?.id ?? b.order[b.order.length - 1]?.id ?? null)
      const next = placeLoose(b, looseId, afterId)
      commit(next, t('board.loose.placed', { name: nameOf(node.shot), n: indexOf(next, looseId) + 1 }), { undoable: true })
    },
  }

  const onNodesChange = (changes: NodeChange<ShotFlowNode>[]) =>
    setRfNodes((nds) => applyNodeChanges(changes.filter((c) => c.type !== 'remove'), nds))

  const center = (n: ShotFlowNode) => ({
    x: n.position.x + (n.measured?.width ?? NODE_W) / 2,
    y: n.position.y + (n.measured?.height ?? NODE_H) / 2,
  })
  const isLoose = (id: string) => boardRef.current.loose.some((n) => n.id === id)

  // While an upload is dragged, light up the link it would land on.
  const onNodeDrag: OnNodeDrag<ShotFlowNode> = (_, node) => {
    if (!isLoose(node.id)) return
    const c = center(node)
    setDropEdge(edgeAt(boardRef.current, c.x, c.y)?.id ?? null)
  }

  const onNodeDragStop: OnNodeDrag<ShotFlowNode> = (_, node, moved) => {
    setDropEdge(null)
    let b = boardRef.current
    if (isLoose(node.id)) {
      const c = center(node)
      const hit = edgeAt(b, c.x, c.y)
      const shot = b.loose.find((n) => n.id === node.id)?.shot
      if (hit && shot) {
        const next = placeLoose(b, node.id, hit.source)
        return commit(next, t('board.loose.placed', { name: nameOf(shot), n: indexOf(next, node.id) + 1 }), { undoable: true })
      }
    }
    for (const n of moved.length ? moved : [node]) b = setPosition(b, n.id, n.position.x, n.position.y)
    // Only the plan's own cards have a saved place; a loose upload is not in the plan yet.
    commit(b, undefined, { save: moved.some((n) => !isLoose(n.id)) || !isLoose(node.id) })
  }

  const runRewrite = async (e: FormEvent) => {
    e.preventDefault()
    const p = rewrite.trim()
    if (!p) return setRewriteErr(t('board.err.empty'))
    if (p.length > MAX_PROMPT) return setRewriteErr(t('board.err.long', { max: MAX_PROMPT }))
    setRewriteErr('')
    setBusy('rewrite')
    try {
      const res = await rewriteShots(idea.id, toPlan(boardRef.current).shots, p, { live })
      const next = replaceShots(boardRef.current, res.result, makeId)
      commit(next, t('board.rewrite.done', { n: next.order.length }), { undoable: true, note: sampleNote(res), refit: true })
      setRewrite('')
    } finally {
      setBusy(null)
    }
  }

  const runInsert = async (e: FormEvent) => {
    e.preventDefault()
    if (!inserting) return
    const p = insertText.trim()
    if (!p) return setInsertErr(t('board.err.empty'))
    if (p.length > MAX_PROMPT) return setInsertErr(t('board.err.long', { max: MAX_PROMPT }))
    const b = boardRef.current
    const i = indexOf(b, inserting.before)
    setInsertErr('')
    setBusy('insert')
    try {
      const res = await insertShot(idea.id, b.order[i]?.shot ?? null, b.order[i + 1]?.shot ?? null, p, { live })
      const next = insertBetween(boardRef.current, inserting.before, inserting.after, res.result, makeId)
      if (!next) return setInsertErr(t('board.insert.stale'))
      commit(next, t('board.insert.done', { n: indexOf(boardRef.current, inserting.before) + 2 }), {
        undoable: true,
        note: sampleNote(res),
      })
      setInserting(null)
    } finally {
      setBusy(null)
    }
  }

  // Uploads go straight after the selected shot (in order), or sit loose under the board until placed.
  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy('upload')
    try {
      let b = boardRef.current
      let afterId = selectedId && indexOf(b, selectedId) >= 0 ? selectedId : null
      const skipped: string[] = []
      let looseCount = 0
      let placed: { name: string; n: number } | null = null
      for (const file of Array.from(files)) {
        const f = await footageFromFile(file)
        if (!f) {
          skipped.push(t('board.upload.skipped', { name: file.name }))
          continue
        }
        const shot = footageShot(f, t('board.upload.shotLabel', { name: f.name }))
        if (afterId) {
          const id = makeId()
          b = insertAt(b, indexOf(b, afterId) + 1, shot, makeId, id)
          afterId = id
          placed = { name: f.name, n: indexOf(b, id) + 1 }
        } else {
          b = addLoose(b, shot, makeId)
          looseCount += 1
        }
      }
      const text = placed ? t('board.upload.after', placed) : looseCount ? tp('board.upload.added', looseCount) : skipped.join(' ')
      const note = placed || looseCount ? skipped.join(' ') || undefined : undefined
      if (b === boardRef.current) setMessage({ text })
      else commit(b, text, { undoable: true, save: !!placed, note, refit: looseCount > 0 })
    } finally {
      setBusy(null)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const shots = board.order.map((n) => n.shot)
  const insertA = inserting ? indexOf(board, inserting.before) + 1 : 0

  return (
    <div className="board-screen">
      <button className="link-btn" onClick={onBack}>
        {t('board.back')}
      </button>
      <header className="board-head">
        <span className="eyebrow">{t('board.eyebrow', { client: client.name })}</span>
        <h1>{format.name}</h1>
        <p className="small muted">
          {tp('board.summary', shots.length, { secs: totalSeconds(shots) })}
          {' · '}
          {editable ? t('board.saves') : t('board.locked')}
        </p>
      </header>

      <div className="board-layout">
        <div className="board-canvas">
          <BoardActionsContext.Provider value={actions}>
            <ReactFlow<ShotFlowNode, SeqFlowEdge>
              nodes={rfNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onEdgeClick={(_, edge) => editable && actions.openInsert(edge.source, edge.target)}
              nodesDraggable={editable}
              nodesConnectable={false}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={1.5}
              aria-label={t('board.canvasLabel', { name: format.name })}
            >
              <Background gap={24} size={1} />
              <Controls showInteractive={false} />
              <MiniMap className="board-minimap" ariaLabel={t('board.minimap')} pannable zoomable />
              {board.order.length === 0 && board.loose.length === 0 && (
                <Panel position="top-center" className="board-empty">
                  {t('board.empty')}
                </Panel>
              )}
              {inserting && (
                <Panel position="top-center" className="board-insert">
                  <form
                    onSubmit={runInsert}
                    aria-labelledby="board-insert-title"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setInserting(null)
                    }}
                  >
                    <h2 id="board-insert-title">{t('board.insert.title', { a: insertA, b: insertA + 1 })}</h2>
                    <label htmlFor="board-insert-text">{t('board.insert.label')}</label>
                    <textarea
                      id="board-insert-text"
                      rows={2}
                      value={insertText}
                      maxLength={MAX_PROMPT}
                      placeholder={t('board.insert.placeholder')}
                      onChange={(e) => setInsertText(e.target.value)}
                      autoFocus
                    />
                    {insertErr && <p className="board-error">{insertErr}</p>}
                    <div className="board-row">
                      <button type="submit" className="btn btn-primary btn-sm" disabled={busy === 'insert'}>
                        {busy === 'insert' ? t('board.insert.busy') : t('board.insert.go')}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setInserting(null)}>
                        {t('board.insert.cancel')}
                      </button>
                    </div>
                  </form>
                </Panel>
              )}
            </ReactFlow>
          </BoardActionsContext.Provider>
        </div>

        <aside className="board-tools">
          <details open={toolsOpen} onToggle={(e) => setToolsOpen(e.currentTarget.open)}>
            <summary>{t('board.tools')}</summary>
            <p className="small muted">{t('board.help')}</p>

            <form className="board-tool" onSubmit={runRewrite}>
              <label htmlFor="board-rewrite">{t('board.rewrite.label')}</label>
              <span className="small muted" id="board-rewrite-hint">
                {t('board.rewrite.hint')}
              </span>
              <textarea
                id="board-rewrite"
                rows={3}
                value={rewrite}
                maxLength={MAX_PROMPT}
                aria-describedby="board-rewrite-hint"
                placeholder={t('board.rewrite.placeholder')}
                disabled={!editable}
                onChange={(e) => setRewrite(e.target.value)}
              />
              {rewriteErr && <p className="board-error">{rewriteErr}</p>}
              <button type="submit" className="btn btn-primary btn-sm" disabled={!editable || busy === 'rewrite'}>
                {busy === 'rewrite' ? t('board.rewrite.busy') : t('board.rewrite.go')}
              </button>
            </form>

            <div className="board-tool">
              <label htmlFor="board-upload">{t('board.upload.label')}</label>
              <span className="small muted" id="board-upload-hint">
                {t('board.upload.hint')}
              </span>
              <input
                ref={fileInput}
                id="board-upload"
                className="board-file"
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={!editable || busy === 'upload'}
                aria-describedby="board-upload-hint"
                onChange={(e) => void onFiles(e.target.files)}
              />
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={!editable}
              onClick={() => commit(tidy(boardRef.current), t('board.tidied'), { undoable: true, refit: true })}
            >
              {t('board.tidy')}
            </button>
          </details>
        </aside>
      </div>

      <p className="board-status" role="status" aria-live="polite">
        {message && (
          <>
            {message.text}
            {message.note && <span className="board-note"> {message.note}</span>}
            {message.undo && undo && (
              <>
                {' '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => {
                    commit(undo, t('board.undone'), { refit: true })
                  }}
                >
                  {t('board.undo')}
                </button>
              </>
            )}
          </>
        )}
      </p>
    </div>
  )
}

// The node-based planning board for one plan's shot list (opened from the plan page).
export function ShotBoard(props: Props) {
  return (
    <ReactFlowProvider>
      <BoardScreen {...props} />
    </ReactFlowProvider>
  )
}
