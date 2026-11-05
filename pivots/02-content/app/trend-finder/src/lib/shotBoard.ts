import type { BoardPos, Footage, SavedIdea, Shot } from '../types'

// The planning board: one plan's shots as cards on a canvas, linked left to right (shot 1 → shot 2 → …).
// Pure logic only, so it can be unit tested; components/board/ShotBoard.tsx draws it with React Flow.
// The board's order is the plan's shot order. Uploads that are not placed yet sit loose on the canvas and
// are not part of the plan until they are dropped on a link or put after a shot.

export interface BoardNode {
  // Stable for this session only (React Flow needs one); never saved. Saved positions follow shot order.
  id: string
  shot: Shot
  x: number
  y: number
}

export interface Board {
  // In plan order. Edges always run order[i] → order[i + 1].
  order: BoardNode[]
  // Uploads on the canvas that are not in the sequence yet.
  loose: BoardNode[]
}

export interface BoardEdge {
  id: string
  source: string
  target: string
}

export type MakeId = () => string

// Card size and spacing on the canvas, in canvas units.
export const NODE_W = 240
export const NODE_H = 300
export const STEP_X = NODE_W + 80
export const LOOSE_Y = NODE_H + 120

// Small images are kept in the plan as a data URL; anything bigger only on this device for now.
export const DATA_URL_LIMIT = 300 * 1024

// A counter-based id maker. The board passes its own; tests pass this for predictable ids.
export function idMaker(prefix = 'n'): MakeId {
  let n = 0
  return () => `${prefix}${++n}`
}

// The same rule as the plan page: a plan's own shots, or the reference's list until it has its own.
export const boardShots = (idea: Pick<SavedIdea, 'shots'>, referenceShots: Shot[]): Shot[] => idea.shots ?? referenceShots

// Same rule as PlanScreen: approved plans are locked; a reopened one (waiting with approvedAt) stays editable.
export const boardEditable = (idea: Pick<SavedIdea, 'status' | 'approvedAt'>): boolean =>
  idea.status === 'saved' || idea.status === 'rejected' || (idea.status === 'waiting' && !!idea.approvedAt)

// Left to right on one row.
export function autoLayout(n: number, start: BoardPos = { x: 0, y: 0 }): BoardPos[] {
  return Array.from({ length: n }, (_, i) => ({ x: start.x + i * STEP_X, y: start.y }))
}

const okPos = (p: unknown): p is BoardPos =>
  !!p && typeof p === 'object' && Number.isFinite((p as BoardPos).x) && Number.isFinite((p as BoardPos).y)

// A board from the plan's shots. Saved positions are used only when there is one for every shot (otherwise the
// list changed somewhere else, e.g. on the plan page, and the old positions would put cards in the wrong place).
export function boardFromShots(shots: Shot[], layout: BoardPos[] | undefined, makeId: MakeId): Board {
  const usable = Array.isArray(layout) && layout.length === shots.length && layout.every(okPos)
  const pos = usable ? layout : autoLayout(shots.length)
  return { order: shots.map((shot, i) => ({ id: makeId(), shot, x: pos[i].x, y: pos[i].y })), loose: [] }
}

export function edgesOf(board: Pick<Board, 'order'>): BoardEdge[] {
  const out: BoardEdge[] = []
  for (let i = 0; i + 1 < board.order.length; i++) {
    const source = board.order[i].id
    const target = board.order[i + 1].id
    out.push({ id: `e-${source}-${target}`, source, target })
  }
  return out
}

// What is saved back into the plan: the shots in order and where each one sits.
export function toPlan(board: Board): { shots: Shot[]; boardLayout: BoardPos[] } {
  return {
    shots: board.order.map((n) => n.shot),
    boardLayout: board.order.map((n) => ({ x: Math.round(n.x), y: Math.round(n.y) })),
  }
}

export const indexOf = (board: Board, id: string): number => board.order.findIndex((n) => n.id === id)

// Put a new card into the sequence at `index` (0 = first). It takes the place of the card that was there, and
// that card and everything after it move one step right, so a tidy row stays tidy.
export function insertAt(board: Board, index: number, shot: Shot, makeId: MakeId, id = makeId()): Board {
  const at = Math.max(0, Math.min(index, board.order.length))
  const prev = board.order[at - 1]
  const here = board.order[at]
  const pos = here ? { x: here.x, y: here.y } : prev ? { x: prev.x + STEP_X, y: prev.y } : { x: 0, y: 0 }
  const node: BoardNode = { id, shot, ...pos }
  const order = [
    ...board.order.slice(0, at),
    node,
    ...board.order.slice(at).map((n) => ({ ...n, x: n.x + STEP_X })),
  ]
  return { ...board, order: retimeOrder(order) }
}

// A new shot between two linked cards. Null when they are not next to each other (the edge is out of date).
export function insertBetween(board: Board, beforeId: string, afterId: string, shot: Shot, makeId: MakeId): Board | null {
  const i = indexOf(board, beforeId)
  if (i < 0 || board.order[i + 1]?.id !== afterId) return null
  return insertAt(board, i + 1, shot, makeId)
}

// After a card (null = at the start).
export function insertAfter(board: Board, afterId: string | null, shot: Shot, makeId: MakeId): Board {
  if (afterId === null) return insertAt(board, 0, shot, makeId)
  const i = indexOf(board, afterId)
  return insertAt(board, i < 0 ? board.order.length : i + 1, shot, makeId)
}

// Take a card off the board. The cards either side link up again, since links follow the order.
export function removeNode(board: Board, id: string): Board {
  if (board.loose.some((n) => n.id === id)) return { ...board, loose: board.loose.filter((n) => n.id !== id) }
  const i = indexOf(board, id)
  if (i < 0) return board
  const order = [...board.order.slice(0, i), ...board.order.slice(i + 1).map((n) => ({ ...n, x: n.x - STEP_X }))]
  return { ...board, order: retimeOrder(order) }
}

// Swap a card with its neighbour (-1 earlier, +1 later). Positions swap too, so the row still reads in order.
export function moveNode(board: Board, id: string, delta: -1 | 1): Board {
  const i = indexOf(board, id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= board.order.length) return board
  const order = [...board.order]
  const a = order[i]
  const b = order[j]
  order[i] = { ...b, x: a.x, y: a.y }
  order[j] = { ...a, x: b.x, y: b.y }
  return { ...board, order: retimeOrder(order) }
}

export function updateShot(board: Board, id: string, patch: Partial<Shot>): Board {
  const edit = (n: BoardNode) => (n.id === id ? { ...n, shot: { ...n.shot, ...patch } } : n)
  return { order: board.order.map(edit), loose: board.loose.map(edit) }
}

export function setPosition(board: Board, id: string, x: number, y: number): Board {
  const move = (n: BoardNode) => (n.id === id ? { ...n, x, y } : n)
  return { order: board.order.map(move), loose: board.loose.map(move) }
}

// Put the sequence back on one tidy row, with loose uploads on a row underneath.
export function tidy(board: Board): Board {
  const row = autoLayout(board.order.length)
  const below = autoLayout(board.loose.length, { x: 0, y: LOOSE_Y })
  return {
    order: board.order.map((n, i) => ({ ...n, ...row[i] })),
    loose: board.loose.map((n, i) => ({ ...n, ...below[i] })),
  }
}

// A rewrite replaces the whole sequence (laid out again); loose uploads stay where they are.
export function replaceShots(board: Board, shots: Shot[], makeId: MakeId): Board {
  return { ...boardFromShots(shots, undefined, makeId), loose: board.loose }
}

// ---- uploads -------------------------------------------------------------------------------------

export function mediaKind(type: string): Footage['kind'] | null {
  return type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'video' : null
}

// Only small images are kept in the plan itself; the rest stay on this device until there is an upload route.
export const keepInPlan = (kind: Footage['kind'], size: number): boolean => kind === 'image' && size <= DATA_URL_LIMIT

// The shot an upload becomes. `label` is what the card says it is ("Your footage: beach.mp4").
export function footageShot(footage: Footage, label: string): Shot {
  return { time: '', shot: label, footage }
}

// A new upload, not in the sequence yet: on the row under the board, after any other loose ones.
export function addLoose(board: Board, shot: Shot, makeId: MakeId): Board {
  const last = board.loose[board.loose.length - 1]
  const pos = last ? { x: last.x + STEP_X, y: last.y } : { x: board.order[0]?.x ?? 0, y: (board.order[0]?.y ?? 0) + LOOSE_Y }
  return { ...board, loose: [...board.loose, { id: makeId(), shot, ...pos }] }
}

// Put a loose upload into the sequence after `afterId` (null = at the start). It keeps its id.
export function placeLoose(board: Board, looseId: string, afterId: string | null): Board {
  const node = board.loose.find((n) => n.id === looseId)
  if (!node) return board
  const rest = { ...board, loose: board.loose.filter((n) => n.id !== looseId) }
  const i = afterId === null ? 0 : indexOf(rest, afterId) + 1
  const at = afterId !== null && i === 0 ? rest.order.length : i
  return insertAt(rest, at, node.shot, () => node.id, node.id)
}

// The link a dropped card landed on: the edge whose line (between the two cards' centres) passes within `reach`
// of the dropped card's centre. Null when none is close enough.
export function edgeAt(board: Board, cx: number, cy: number, reach = NODE_H / 2): BoardEdge | null {
  let best: { e: BoardEdge; d: number } | null = null
  for (let i = 0; i + 1 < board.order.length; i++) {
    const a = board.order[i]
    const b = board.order[i + 1]
    const d = distToSegment(cx, cy, a.x + NODE_W / 2, a.y + NODE_H / 2, b.x + NODE_W / 2, b.y + NODE_H / 2)
    if (d <= reach && (!best || d < best.d)) best = { e: { id: `e-${a.id}-${b.id}`, source: a.id, target: b.id }, d }
  }
  return best?.e ?? null
}

export function distToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// ---- timing --------------------------------------------------------------------------------------

const RANGE = /^\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*s?\s*$/
// A shot with no time yet (a new or uploaded one) counts as this many seconds.
export const DEFAULT_SECONDS = 3

const num = (n: number) => String(Math.round(n * 10) / 10)

// How long a shot runs, from "3-8s". Null when the time doesn't read as a range (kept as the user wrote it).
export function secondsOf(time: string): number | null {
  if (!time.trim()) return DEFAULT_SECONDS
  const m = RANGE.exec(time)
  if (!m) return null
  return Math.max(0, Number(m[2]) - Number(m[1]))
}

// Times run on from one shot to the next ("0-3s", "3-8s", …), keeping each shot's length. A shot whose time
// isn't a range keeps it, and the clock carries on past it unchanged.
export function retime(shots: Shot[]): Shot[] {
  let at = 0
  return shots.map((s) => {
    const len = secondsOf(s.time ?? '')
    if (len === null) return s
    const time = `${num(at)}-${num(at + len)}s`
    at += len
    return time === s.time ? s : { ...s, time }
  })
}

function retimeOrder(order: BoardNode[]): BoardNode[] {
  const shots = retime(order.map((n) => n.shot))
  return order.map((n, i) => (shots[i] === n.shot ? n : { ...n, shot: shots[i] }))
}

// Total length of the sequence in seconds (shots with a range only).
export const totalSeconds = (shots: Shot[]): number => shots.reduce((sum, s) => sum + (secondsOf(s.time ?? '') ?? 0), 0)

// ---- hooks and script cards ------------------------------------------------------------------------

export const HOOKS_W = 260
export const GAP_Y = 80

// Where the suggested hooks and the script sit: the hooks just left of shot 1 (they lead into it), the script
// under everything else, lined up with the leftmost shot. They follow the shots when those move.
export function planCardsAt(board: Pick<Board, 'order' | 'loose'>): { hooks: BoardPos; script: BoardPos } {
  const first = board.order[0]
  const all = [...board.order, ...board.loose]
  const left = all.length ? Math.min(...all.map((n) => n.x)) : 0
  const bottom = all.length ? Math.max(...all.map((n) => n.y)) + NODE_H + GAP_Y : 0
  return {
    hooks: { x: (first?.x ?? 0) - HOOKS_W - (STEP_X - NODE_W), y: first?.y ?? 0 },
    script: { x: left, y: bottom },
  }
}
