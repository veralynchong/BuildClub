import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { t } from '../../lib/i18n'
import { useBoardActions, type SeqFlowEdge } from './boardContext'

// The link from one shot to the next, with a + in the middle that adds a shot between them.
export function SeqEdge({ id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data }: EdgeProps<SeqFlowEdge>) {
  const { editable, openInsert } = useBoardActions()
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })
  const label = t('board.insert.title', { a: data?.a ?? 0, b: data?.b ?? 0 })
  return (
    <>
      <BaseEdge id={id} path={path} className={data?.dropTarget ? 'board-edge is-drop' : 'board-edge'} />
      {editable && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="board-edge-add nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            aria-label={label}
            title={label}
            onClick={() => openInsert(source, target)}
          >
            +
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
