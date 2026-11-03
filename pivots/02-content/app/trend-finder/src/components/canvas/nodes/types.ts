import type { Node, NodeProps } from '@xyflow/react'
import type { CanvasNode } from '../../../lib/canvas/types'

export type CvNodeProps = NodeProps<Node<{ node: CanvasNode }>>
