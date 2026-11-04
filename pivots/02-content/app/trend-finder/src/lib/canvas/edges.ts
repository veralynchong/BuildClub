import type { Take } from '../takes.ts'
import { downstream, pendingGen, selectedGen } from './graph.ts'
import type { CanvasDoc, CanvasEdge, CanvasNode, Generation } from './types.ts'

// The one "has a result" rule. Node status, Run all and the Timeline lines use this and never re-derive it.
export function hasResult(node: CanvasNode, gens: Generation[], takes: Take[] = []): boolean {
  switch (node.type) {
    case 'storyboard':
    case 'video':
      return selectedGen(node, gens) !== null
    case 'upload':
      return !!node.data.takeId || selectedGen(node, gens) !== null
    case 'footage':
      return takes.some((k) => k.shotId === node.shotId)
    case 'prompt':
      return (node.data.text ?? '').trim() !== ''
    case 'kit':
      return true
    default:
      return false
  }
}

// The selected nodes plus everything upstream and downstream of them.
export function focusSet(doc: CanvasDoc, selected: string[]): Set<string> {
  const out = new Set<string>()
  for (const id of selected) {
    out.add(id)
    for (const d of downstream(doc, id)) out.add(d)
    const todo = [id]
    while (todo.length) {
      const cur = todo.pop()!
      for (const e of doc.edges) {
        if (e.target === cur && !out.has(e.source)) {
          out.add(e.source)
          todo.push(e.source)
        }
      }
    }
  }
  return out
}

export function edgeLook(
  edge: CanvasEdge,
  doc: CanvasDoc,
  gens: Generation[],
  takes: Take[],
  focus: ReadonlySet<string>,
  kitSelected: boolean,
  opts?: { targetKind?: 'timeline' },
): { className: string; animated: boolean } {
  const source = doc.nodes.find((n) => n.id === edge.source)
  const virtual = opts?.targetKind === 'timeline'
  const running = !virtual && pendingGen(edge.target, gens) !== null
  const classes = ['cv-edge']
  if (source?.type === 'kit') {
    classes.push('is-kit')
    if (kitSelected) classes.push('is-kit-on')
  }
  if (running) classes.push('is-running')
  if (source && !hasResult(source, gens, takes)) classes.push('is-idle')
  if (focus.has(edge.source) && (virtual || focus.has(edge.target))) classes.push('is-focus')
  return { className: classes.join(' '), animated: running }
}
