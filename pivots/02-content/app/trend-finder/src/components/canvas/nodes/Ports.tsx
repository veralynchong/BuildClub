import { Handle, Position } from '@xyflow/react'
import { t } from '../../../lib/i18n'
import { outMedia, PORTS } from '../../../lib/canvas/ports'
import type { CanvasNode } from '../../../lib/canvas/types'
import { useCanvas } from './ctx'

const PORT_LABEL = { 'in:text': 'canvas.port.text', 'in:start': 'canvas.edge.start', 'in:ref': 'canvas.edge.ref' } as const

// Inputs down the left edge, the one output on the right; each coloured by what it carries.
export function Ports({ node }: { node: CanvasNode }) {
  const { acceptsDrop } = useCanvas()
  const inputs = PORTS[node.type].inputs
  const out = outMedia(node)
  return (
    <>
      {inputs.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={Position.Left}
          style={{ top: `${((i + 1) / (inputs.length + 1)) * 100}%` }}
          className={`cv-handle cv-media-${p.media}${acceptsDrop(node.id, p.id) ? '' : ' is-blocked'}`}
          aria-label={t(PORT_LABEL[p.id])}
        />
      ))}
      <Handle id="out" type="source" position={Position.Right} className={`cv-handle ${out ? `cv-media-${out}` : 'cv-media-none'}`} aria-label={t('canvas.port.out')} />
    </>
  )
}

// Names the inputs beside their ports when a node has more than one.
export function PortLabels({ node }: { node: CanvasNode }) {
  const inputs = PORTS[node.type].inputs
  if (inputs.length < 2) return null
  return (
    <>
      {inputs.map((p, i) => (
        <span key={p.id} className={`cv-port-label cv-media-${p.media}`} style={{ top: `${((i + 1) / (inputs.length + 1)) * 100}%` }}>
          {t(PORT_LABEL[p.id])}
        </span>
      ))}
    </>
  )
}
