import type { CanvasDoc } from './types.ts'

// One priced node as a price dialog showed it. The length is part of it because it changes a video's price.
export interface QuoteLine {
  nodeId: string
  model: string
  seconds: number | null
  usd: number
}

// Adds each item's current length (from the doc) to a list of priced items.
export function quoteLines(doc: CanvasDoc, items: { nodeId: string; model: string; usd: number }[]): QuoteLine[] {
  return items.map((i) => {
    const d = doc.nodes.find((n) => n.id === i.nodeId)?.data.duration
    return { nodeId: i.nodeId, model: i.model, seconds: typeof d === 'number' ? d : null, usd: i.usd }
  })
}

// True when what would start now is not what the dialog showed: another node set, model, length or price.
export function quoteChanged(shown: QuoteLine[], now: QuoteLine[]): boolean {
  if (shown.length !== now.length) return true
  const byNode = new Map(now.map((l) => [l.nodeId, l]))
  const total = (ls: QuoteLine[]) => Math.round(ls.reduce((s, l) => s + l.usd, 0) * 1e4)
  if (total(shown) !== total(now)) return true
  return shown.some((l) => {
    const c = byNode.get(l.nodeId)
    return !c || c.model !== l.model || c.seconds !== l.seconds || Math.round(c.usd * 1e4) !== Math.round(l.usd * 1e4)
  })
}
