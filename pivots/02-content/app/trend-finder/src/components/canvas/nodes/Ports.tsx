import { Handle, Position } from '@xyflow/react'
import { t } from '../../../lib/i18n'
import { outMedia, PORTS } from '../../../lib/canvas/ports'
import type { CanvasNode } from '../../../lib/canvas/types'
import { useCanvas } from './ctx'

const PORT_LABEL = { 'in:clips': 'canvas.port.clips', 'in:audio': 'canvas.port.audio', 'in:text': 'canvas.port.text', 'in:start': 'canvas.edge.start', 'in:ref': 'canvas.edge.ref', 'in:kit': 'canvas.port.kit' } as const

// Inputs down the left edge, the one output on the right: small dots whose border colour says what they carry. The
// name shows on hover (CSS, from data-label). While a line is dragged, the inputs it could end on light up.
export function Ports({ node }: { node: CanvasNode }) {
  const { acceptsDrop, dragging } = useCanvas()
  const inputs = PORTS[node.type].inputs
  const out = outMedia(node)
  return (
    <>
      {inputs.map((p, i) => {
        const fits = acceptsDrop(node.id, p.id)
        return (
          <Handle
            key={p.id}
            id={p.id}
            type="target"
            position={Position.Left}
            style={{ top: `${((i + 1) / (inputs.length + 1)) * 100}%` }}
            className={`cv-handle cv-media-${p.media}${fits ? (dragging ? ' is-fit' : '') : ' is-blocked'}`}
            aria-label={t(PORT_LABEL[p.id])}
            data-label={t(PORT_LABEL[p.id])}
          />
        )
      })}
      <Handle id="out" type="source" position={Position.Right} className={`cv-handle ${out ? `cv-media-${out}` : 'cv-media-none'}`} aria-label={t('canvas.port.out')} data-label={t('canvas.port.out')} />
    </>
  )
}
