import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type Edge,
  type NodeChange,
  type OnNodeDrag,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { BoardPos, Client, Format, SavedIdea, Shot, Video } from '../../types'
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
  planCardsAt,
  removeNode,
  replaceShots,
  setPosition,
  tidy,
  toPlan,
  updateShot,
  type Board,
} from '../../lib/shotBoard'
import { MAX_PROMPT, insertShot, rewriteShots, type Assisted } from '../../lib/boardAssist'
import { footageFromFile } from '../../lib/boardMedia'
import { hookCards, type HookCard } from '../../lib/hooks'
import { savedScript, scriptOutOfDate } from '../../lib/script'
import { ShotNode } from './ShotNode'
import { HooksNode, ScriptNode } from './PlanNodes'
import { SeqEdge } from './SeqEdge'
import {
  BoardActionsContext,
  type BoardActions,
  type BoardFlowNode,
  type ExtraFlowNode,
  type SeqFlowEdge,
  type ShotFlowNode,
} from './boardContext'

interface Props {
  idea: SavedIdea
  format: Format
  client: Client
  // The reference video, for the suggested hooks' wording (same hooks as the plan page).
  video?: Pick<Video, 'hook'>
  // Sample mode (no local API) skips the AI routes and edits from simple rules.
  live: boolean
  // Saves the ordered shots (and where each card sits) into the plan, the same way the plan page saves shots.
  onSave: (patch: { shots: Shot[]; boardLayout: BoardPos[] }) => void
  onBack: () => void
  // Sends the plan to the approver. Only on a plan that can still be edited.
  onSend?: () => void
}

const nodeTypes = { shot: ShotNode, hooks: HooksNode, script: ScriptNode }
const HOOKS_ID = 'plan-hooks'
const SCRIPT_ID = 'plan-script'
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

// The suggested hooks and the script, as cards beside the shots. Fixed in place (they follow the shots) and
// shown only; they are changed on the plan page.
function buildExtras(board: Board, prev: ExtraFlowNode[], hooks: HookCard[], script: SavedIdea['script']): ExtraFlowNode[] {
  const old = new Map(prev.map((n) => [n.id, n]))
  const at = planCardsAt(board)
  const saved = savedScript(script)
  const shots = board.order.map((n) => n.shot)
  const base = { draggable: false, selectable: false, connectable: false } as const
  return [
    { ...old.get(HOOKS_ID), ...base, id: HOOKS_ID, type: 'hooks', position: at.hooks, data: { hooks } },
    { ...old.get(SCRIPT_ID), ...base, id: SCRIPT_ID, type: 'script', position: at.script, data: { script: saved, stale: !!saved && scriptOutOfDate(saved, shots) } },
  ]
}

const sampleNote = (r: Assisted<unknown>): string | undefined =>
  r.source === 'sample' ? (r.reason === 'failed' ? t('board.sample.failed') : t('board.sample.offline')) : undefined

interface Message {
  text: string
  note?: string
  undo?: boolean
}

function BoardScreen({ idea, format, client, video, live, onSave, onBack, onSend }: Props) {
  const editable = boardEditable(idea)
  const [makeId] = useState(() => idMaker('n'))
  const [board, setBoard] = useState(() => boardFromShots(boardShots(idea, format.shotList), idea.boardLayout, makeId))
  // The latest board, for handlers that run after an await or during a drag.
  const boardRef = useRef(board)
  const [rfNodes, setRfNodes] = useState<ShotFlowNode[]>(() => buildNodes(board, [], editable))
  const hooksFor = (b: Board) => hookCards(b.order.map((n) => n.shot), format, video ?? { hook: '' }, client)
  const [extraNodes, setExtraNodes] = useState<ExtraFlowNode[]>(() => buildExtras(board, [], hooksFor(board), idea.script))
  const [undo, setUndo] = useState<Board | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [dropEdge, setDropEdge] = useState<string | null>(null)
  const [toolsOpen, setToolsOpen] = useState(false)
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
  // The drawer: Esc closes it from anywhere on the page, and focus moves into it when it opens.
  const toolsClose = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!toolsOpen) return
    toolsClose.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setToolsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toolsOpen])

  const commit = (next: Board, text?: string, opts: { undoable?: boolean; save?: boolean; note?: string; refit?: boolean } = {}) => {
    const prev = boardRef.current
    boardRef.current = next
    setBoard(next)
    setRfNodes((nds) => buildNodes(next, nds, editable))
    setExtraNodes((nds) => buildExtras(next, nds, hooksFor(next), idea.script))
    if (opts.undoable) setUndo(prev)
    else if (text !== undefined) setUndo(null)
    if (opts.save !== false && editable) onSave(toPlan(next))
    if (text !== undefined) setMessage({ text, note: opts.note, undo: opts.undoable })
    if (opts.refit) requestAnimationFrame(() => fitView({ padding: 0.2, maxZoom: 1 }))
  }

  const selectedId = rfNodes.find((n) => n.selected)?.id ?? null

  const edges: (SeqFlowEdge | Edge)[] = useMemo(
    () => [
      ...edgesOf(board).map((e, i) => ({
        ...e,
        type: 'seq' as const,
        data: { a: i + 1, b: i + 2, dropTarget: e.id === dropEdge },
      })),
      // The hooks lead into shot 1.
      ...(board.order[0] ? [{ id: `e-${HOOKS_ID}`, source: HOOKS_ID, target: board.order[0].id, className: 'board-edge', selectable: false }] : []),
    ],
    [board, dropEdge],
  )
  const allNodes: BoardFlowNode[] = useMemo(() => [...extraNodes, ...rfNodes], [extraNodes, rfNodes])

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

  const onNodesChange = (changes: NodeChange<BoardFlowNode>[]) => {
    const kept = changes.filter((c) => c.type !== 'remove')
    setRfNodes((nds) => applyNodeChanges(kept as NodeChange<ShotFlowNode>[], nds))
    setExtraNodes((nds) => applyNodeChanges(kept as NodeChange<ExtraFlowNode>[], nds))
  }

  const center = (n: BoardFlowNode) => ({
    x: n.position.x + (n.measured?.width ?? NODE_W) / 2,
    y: n.position.y + (n.measured?.height ?? NODE_H) / 2,
  })
  const isLoose = (id: string) => boardRef.current.loose.some((n) => n.id === id)

  // While an upload is dragged, light up the link it would land on.
  const onNodeDrag: OnNodeDrag<BoardFlowNode> = (_, node) => {
    if (!isLoose(node.id)) return
    const c = center(node)
    setDropEdge(edgeAt(boardRef.current, c.x, c.y)?.id ?? null)
  }

  const onNodeDragStop: OnNodeDrag<BoardFlowNode> = (_, node, moved) => {
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
        <h1>{format.name}</h1>
        {/* Only an approved (view-only) board says why it can't be changed. */}
        {!editable && <p className="small">{t('board.locked')}</p>}
        <div className="board-head-actions">
          {editable && onSend && (
            <button type="button" className="btn btn-primary board-send" disabled={shots.length === 0} onClick={onSend}>
              {t('plan.common.sendForApproval')}
            </button>
          )}
          {/* The side tools are closed by default; this opens them as a drawer over the board. */}
          <button
            type="button"
            className="btn btn-ghost board-tools-toggle"
            aria-expanded={toolsOpen}
            aria-controls="board-tools"
            onClick={() => setToolsOpen((o) => !o)}
          >
            {t('board.toolsOpen')}
          </button>
        </div>
      </header>

      <div className="board-layout">
        <div className="board-canvas">
          <BoardActionsContext.Provider value={actions}>
            <ReactFlow<BoardFlowNode, SeqFlowEdge | Edge>
              nodes={allNodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeDrag={onNodeDrag}
              onNodeDragStop={onNodeDragStop}
              onEdgeClick={(_, edge) => editable && edge.type === 'seq' && actions.openInsert(edge.source, edge.target)}
              nodesDraggable={editable}
              nodesConnectable={false}
              deleteKeyCode={null}
              fitView
              fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
              minZoom={0.2}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              aria-label={t('board.canvasLabel', { name: format.name })}
            >
              {/* No board dots of its own: the page's navy dots show through (one layer). */}
              <Controls showInteractive={false} />
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

        <aside
          id="board-tools"
          className="board-tools"
          hidden={!toolsOpen}
          aria-labelledby="board-tools-title"
        >
          <div className="board-tools-head">
            <h2 id="board-tools-title">{t('board.tools')}</h2>
            <button ref={toolsClose} type="button" className="board-tools-close" aria-label={t('board.toolsClose')} onClick={() => setToolsOpen(false)}>
              ✕
            </button>
          </div>
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
