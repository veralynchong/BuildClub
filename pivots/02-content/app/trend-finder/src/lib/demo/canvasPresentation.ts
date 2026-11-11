import type { DemoCase, DemoRoute, DemoShot, DemoAsset } from './tofuCase.ts'

export type CanvasPresentationGroup = {
  id: string
  title: string
  shots: { shot: DemoShot; assets: DemoAsset[] }[]
}

// This detached view has no selection, layout, fold state or document writes.
export function projectCanvas(demoCase: DemoCase, route: DemoRoute, revealedAssetIds?: readonly string[]): CanvasPresentationGroup[] {
  const revealed = revealedAssetIds === undefined ? null : new Set(revealedAssetIds)
  const groups: CanvasPresentationGroup[] = demoCase.groups.map((group) => ({ ...group, shots: [] }))
  const byId = new Map(groups.map((group) => [group.id, group]))
  for (const shot of demoCase.shots) {
    let group = byId.get(shot.groupId)
    if (!group) {
      group = { id: shot.groupId, title: 'Other shots', shots: [] }
      groups.push(group)
      byId.set(shot.groupId, group)
    }
    const assets = demoCase.assets
      .filter((asset) => asset.shotId === shot.id && asset.available && asset.routes.includes(route)
        && (revealed === null || revealed.has(asset.id)))
      .map((asset) => ({ ...asset, routes: [...asset.routes] }))
    group.shots.push({ shot: { ...shot }, assets })
  }
  return groups
}
