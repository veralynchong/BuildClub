import { FootageNode } from './FootageNode'
import { GenNode } from './GenNode'
import { KitNode } from './KitNode'
import { PromptNode } from './PromptNode'
import { ShotNode } from './ShotNode'
import { UploadNode } from './UploadNode'

// Declared once at module level so React Flow doesn't see a new table on every render.
export const nodeTypes = { shot: ShotNode, prompt: PromptNode, storyboard: GenNode, video: GenNode, upload: UploadNode, footage: FootageNode, kit: KitNode }
