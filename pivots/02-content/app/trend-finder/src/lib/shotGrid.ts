import type { Shot } from '../types'
import type { CanvasDoc, CanvasNode, Generation } from './canvas/types.ts'
import { failedGen, pendingGen, selectedGen, versionsOf } from './canvas/graph.ts'
import { angleLabel, framingLabel, gearLabel, movementLabel } from './shots.ts'

// One card of the storyboard grid: a shot, its frame node (if any) and that frame's versions.
export interface GridCell {
  shot: Shot
  index: number
  nodeId: string | null
  versions: Generation[]
  shown: Generation | null
  pending: Generation | null
  failed: Generation | null
  prompt: string
  auto: boolean // the prompt is built from the shot, not written by the user
  changed: boolean // the shown version was made with another prompt
}

const words = (v: string): string => v.replace(/_/g, ' ').toLowerCase()

// Every prompt the grid writes starts with this, so a frame made elsewhere (the canvas) can be told apart.
const FRAME_MARK = 'Vertical 9:16 video frame'

export function framePrompt(shot: Shot): string {
  const camera = [shot.framing, shot.angle, shot.movement].filter((x): x is NonNullable<typeof x> => !!x).map(words)
  if (shot.lens) camera.push(`${shot.lens} lens`)
  return [
    `${FRAME_MARK}, photographic, natural light.`,
    `${shot.shot}.`,
    camera.length ? `Camera: ${camera.join(', ')}.` : '',
    'No text, no captions.',
  ].filter(Boolean).join(' ')
}

export function frameNodeOf(doc: CanvasDoc, shotId: string): CanvasNode | null {
  const frames = doc.nodes.filter((n) => n.type === 'storyboard' && n.shotId === shotId)
  return frames.find((n) => n.data.primary) ?? frames[0] ?? null
}

export function gridCells(doc: CanvasDoc, shots: Shot[], gens: Generation[]): GridCell[] {
  const cells: GridCell[] = []
  shots.forEach((shot, index) => {
    const shotNode = shot.id ? doc.nodes.find((n) => n.type === 'shot' && n.shotId === shot.id) : undefined
    if (shotNode?.data.removed) return
    const node = shot.id ? frameNodeOf(doc, shot.id) : null
    const own = node?.data.prompt
    const auto = !own?.trim()
    const prompt = auto ? framePrompt(shot) : own!
    const shown = node ? selectedGen(node, gens) : null
    cells.push({
      shot,
      index,
      nodeId: node?.id ?? null,
      versions: node ? versionsOf(node.id, gens) : [],
      shown,
      pending: node ? pendingGen(node.id, gens) : null,
      failed: node ? failedGen(node.id, gens) : null,
      prompt,
      auto,
      // Only a prompt the grid could have written is compared: the user's own text, or an automatic one it built.
      changed: shown !== null && (!auto || (shown.inputs.prompt ?? '').startsWith(FRAME_MARK)) && (shown.inputs.prompt ?? '') !== prompt,
    })
  })
  return cells
}

// The cell of one frame node as the given doc has it now (e.g. after a queued prompt save landed).
export function cellOfNode(doc: CanvasDoc, shots: Shot[], gens: Generation[], nodeId: string): GridCell | undefined {
  return gridCells(doc, shots, gens).find((c) => c.nodeId === nodeId)
}

export function patchNode(doc: CanvasDoc, nodeId: string, fn: (n: CanvasNode) => CanvasNode): CanvasDoc {
  return { ...doc, nodes: doc.nodes.map((n) => (n.id === nodeId ? fn(n) : n)) }
}

export function setPrompt(doc: CanvasDoc, nodeId: string, prompt: string | null): CanvasDoc {
  return patchNode(doc, nodeId, (n) => {
    const data = { ...n.data }
    if (prompt === null || !prompt.trim()) delete data.prompt
    else data.prompt = prompt
    return { ...n, data }
  })
}

export function chooseVersion(doc: CanvasDoc, nodeId: string, genId: string): CanvasDoc {
  return patchNode(doc, nodeId, (n) => ({ ...n, data: { ...n.data, selected: genId } }))
}

// The previous or next finished version relative to the one shown; null at the ends.
export function stepVersion(cell: GridCell, dir: -1 | 1): string | null {
  const done = cell.versions.filter((g) => g.status === 'done')
  const at = done.findIndex((g) => g.id === cell.shown?.id)
  if (at < 0) return null
  return done[at + dir]?.id ?? null
}

export function patchShot(shots: Shot[], index: number, patch: Partial<Pick<Shot, 'framing' | 'angle' | 'movement' | 'lens' | 'gear' | 'time'>>): Shot[] {
  return shots.map((s, i) => (i === index ? { ...s, ...patch } : s))
}

export function cameraTag(shot: Shot): string {
  return [
    shot.framing && framingLabel(shot.framing),
    shot.angle && angleLabel(shot.angle),
    shot.movement && movementLabel(shot.movement),
    shot.lens,
  ].filter(Boolean).join(' · ')
}

export interface ShotListRow {
  n: number
  thumb: string | null
  action: string
  line: string
  size: string
  angle: string
  movement: string
  lens: string
  gear: string
  time: string
}

const DASH = '—'

// One printable row per visible shot, numbered 1..n (removed shots are already left out of the cells).
export function shotListRows(cells: GridCell[]): ShotListRow[] {
  return cells.map(({ shot, shown }, i) => ({
    n: i + 1,
    thumb: shown?.url ?? null,
    action: shot.shot,
    line: shot.line || DASH,
    size: shot.framing ? framingLabel(shot.framing) : DASH,
    angle: shot.angle ? angleLabel(shot.angle) : DASH,
    movement: shot.movement ? movementLabel(shot.movement) : DASH,
    lens: shot.lens || DASH,
    gear: shot.gear ? gearLabel(shot.gear) : DASH,
    time: shot.time || DASH,
  }))
}
