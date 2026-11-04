type Position = { x: number; y: number }
interface PlacedNode {
  position: Position
  measured?: { width?: number; height?: number }
}

// Cards are 350px wide; reserve room for controls before React Flow measures them.
export function toolbarPosition(nodes: PlacedNode[], preferred: Position, explicit?: Position): Position {
  if (explicit) return explicit
  const gap = 48
  const width = 350
  const height = 600
  let x = preferred.x
  const y = preferred.y
  for (;;) {
    const collisions = nodes.filter((node) =>
      x < node.position.x + (node.measured?.width ?? width) + gap &&
      x + width + gap > node.position.x &&
      y < node.position.y + (node.measured?.height ?? height) + gap &&
      y + height + gap > node.position.y)
    if (!collisions.length) return { x, y }
    x = Math.max(...collisions.map((node) => node.position.x + (node.measured?.width ?? width) + gap))
  }
}
