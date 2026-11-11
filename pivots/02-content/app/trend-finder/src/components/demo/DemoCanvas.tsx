import { useMemo, useState } from 'react'
import { ReactFlow, Background, Controls, type ReactFlowInstance } from '@xyflow/react'
import { FreeformNode } from '../canvas/FreeformNode'
import { FreeformContext, type FreeformActions, type FreeNode } from '../canvas/freeformContext'
import { projectCanvas } from '../../lib/demo/canvasPresentation'
import { tofuCase } from '../../lib/demo/tofuCase'
import type { DemoAsset } from '../../lib/demo/tofuCase'
import type { DemoRoute } from '../../lib/demo/session'
import type { CanvasDoc, Generation } from '../../lib/canvas/types'
import '@xyflow/react/dist/style.css'
import '../../styles/canvas.css'
import './native-demo.css'

export type DemoCanvasProps = {
  route: DemoRoute
  lang: 'en' | 'zh-Hant'
  revealedAssetIds: string[]
  selectedAssetId: string
  revealing: boolean
  onReveal: (ids: string[]) => void
  onSelectAsset: (id: string) => void
  onOpenEditor: () => void
}
const nodeTypes = { freeform: FreeformNode }
const noop = () => {}

export default function DemoCanvas({ route, lang, revealedAssetIds, selectedAssetId, revealing, onReveal, onSelectAsset, onOpenEditor }: DemoCanvasProps) {
  const [full, setFull] = useState(false)
  const [flow, setFlow] = useState<ReactFlowInstance<FreeNode> | null>(null)
  const [mediaError, setMediaError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loadedVideos, setLoadedVideos] = useState<string[]>([])
  const zh = lang === 'zh-Hant'
  const text = (en: string, hant: string) => zh ? hant : en
  const assets = tofuCase.assets.filter(asset => asset.available && asset.routes.includes(route))
  const visible = new Set(revealedAssetIds)
  const groups = projectCanvas(tofuCase, route, revealedAssetIds)
  const projection = useMemo(() => {
    const doc: CanvasDoc = { nodes: [], edges: [] }
    const gens: Generation[] = []
    tofuCase.shots.forEach((shot, i) => {
      doc.nodes.push({ id: `demo_${shot.id}`, type: 'shot', shotId: shot.id, position: { x: i * 420, y: 0 }, data: {} })
    })
    const routeAssets = tofuCase.assets.filter(asset => asset.available && asset.routes.includes(route))
    routeAssets.forEach((asset, i) => {
      const shotIndex = tofuCase.shots.findIndex(shot => shot.id === asset.shotId)
      const row = routeAssets.slice(0, i).filter(other => other.shotId === asset.shotId).length
      const nodeId = `demo_${asset.id}`
      doc.nodes.push({ id: nodeId, type: 'upload', shotId: asset.shotId,
        position: { x: (shotIndex < 0 ? 21 : shotIndex) * 420, y: 220 + row * 340 },
        data: { media: asset.kind, selected: asset.id } })
      if (revealedAssetIds.includes(asset.id)) gens.push({ id: asset.id, nodeId, ideaId: 'demo-only',
        kind: asset.kind, model: 'imported', inputs: {}, status: 'done', estUsd: 0, actualUsd: null,
        url: asset.relativePath, error: null, createdAt: i, finishedAt: i })
    })
    const nodes: FreeNode[] = doc.nodes.map(node => ({ id: node.id, type: 'freeform', data: { node },
      position: { ...node.position }, width: 350, height: node.type === 'shot' ? 150 : 280,
      draggable: false, connectable: false }))
    return { doc, gens, nodes }
  }, [route, revealedAssetIds])
  const actions: FreeformActions = { ...projection, models: [],
    shots: tofuCase.shots.map(shot => ({ id: shot.id, shot: `${shot.id.toUpperCase()} · ${shot.action}`, time: '', line: '' })),
    kit: null, freeform: true, project: null, takes: [], voices: [], readonly: true, busy: new Set(),
    selectVersion: noop, addReference: noop, removeReference: noop, uploadReference: noop, pickTake: noop,
    update: noop, run: noop, upload: noop, remove: noop, duplicate: noop, inspect: noop,
    openEditor: onOpenEditor, connect: noop }

  function media(asset: DemoAsset) {
    return <figure key={asset.id} className="demo-native__asset">
      {asset.kind === 'image' ? <img src={asset.relativePath} alt={asset.label} loading="lazy" /> : <video src={asset.relativePath} controls playsInline preload="metadata" onLoadedMetadata={event => { if (Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0) setLoadedVideos(current => current.includes(asset.id) ? current : [...current, asset.id]) }} onError={() => setLoadedVideos(current => current.filter(id => id !== asset.id))} />}
      <figcaption>{asset.label}</figcaption>
      {asset.kind === 'video' && <button type="button" aria-pressed={selectedAssetId === asset.id} disabled={!loadedVideos.includes(asset.id)} onClick={() => onSelectAsset(asset.id)}>{selectedAssetId === asset.id ? text('Selected for edit', '已選用於剪輯') : text('Use this video', '選用此影片')}</button>}
    </figure>
  }
  const selected = assets.find(asset => asset.id === selectedAssetId && asset.kind === 'video' && visible.has(asset.id) && loadedVideos.includes(asset.id))
  return <section className="demo-native" data-testid="demo-canvas" key={`${route}:${retry}`} onErrorCapture={() => setMediaError(true)}>
    <p>{text('Prepared demo · source-derived images and cut; AI alternative angles are concepts, not filmed footage.', '預先準備的示範 · 圖片與成片衍生自原片；AI 替代角度為概念，並非實拍。')}</p>
    {route === 'shoot' && <p><strong>S19</strong> · {tofuCase.shots.find(shot => shot.id === 's19')?.action} {text('Compare a high angle with a low macro before briefing your photographer.', '拍攝前先比較高角度與低角度微距，再交付攝影師。')}</p>}
    <div className="demo-native__toolbar">
      <button type="button" disabled={revealing} onClick={() => onReveal(assets.filter(asset => asset.kind === 'image').map(asset => asset.id))}>{text('Show prepared frames', '呈現預備圖片')}</button>
      <button type="button" disabled={revealing} onClick={() => onReveal(assets.filter(asset => asset.kind === 'video').map(asset => asset.id))}>{text('Show prepared motion', '呈現預備影片')}</button>
      <button type="button" aria-pressed={full} onClick={() => setFull(value => !value)}>{full ? text('Layout preview', '版面預覽') : 'Full Canvas'}</button>
      <button type="button" disabled={!selected || revealing} onClick={onOpenEditor}>{text('Open Editor', '開啟 Editor')}</button>
    </div>
    {revealing && <p role="status">{text('Revealing prepared assets…', '正在呈現預備素材…')}</p>}
    {mediaError && <p role="alert">{text('A prepared asset could not load.', '無法載入預備素材。')} <button type="button" onClick={() => { setMediaError(false); setRetry(value => value + 1) }}>{text('Retry media', '重試媒體')}</button></p>}
    {full ? <>
      <label>{text('Go to shot', '跳至鏡頭')} <select defaultValue="" onChange={event => { if (event.target.value) void flow?.fitView({ nodes: [{ id: event.target.value }], maxZoom: 1, padding: .4 }) }}><option value="">—</option>{tofuCase.shots.map(shot => <option key={shot.id} value={`demo_${shot.id}`}>{shot.id.toUpperCase()} · {shot.action}</option>)}</select></label>
      <div className="demo-native__flow" aria-label={text('Read-only Full Canvas, 21 shots', '唯讀 Full Canvas，21 個鏡頭')}>
        <FreeformContext.Provider value={actions}>
          <ReactFlow<FreeNode> nodes={projection.nodes} edges={[]} nodeTypes={nodeTypes} onInit={setFlow}
            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false} minZoom={.05} maxZoom={1.5}
            defaultViewport={{ x: 40, y: 50, zoom: .75 }}>
            <Background /><Controls showInteractive={false} />
          </ReactFlow>
        </FreeformContext.Provider>
      </div>
      <div className="demo-native__assets">{assets.filter(asset => asset.kind === 'video' && visible.has(asset.id)).map(media)}</div>
    </> : <>
      <h2>{text('Layout preview · five story sections', '版面預覽 · 五段故事')}</h2>
      {groups.map((group, i) => <details className="demo-native__group" key={`${route}:${group.id}`} open={i === 0 || (route === 'shoot' && group.id === 'finished')}>
        <summary>{group.title} · {group.shots.length} {text('shots', '鏡頭')}</summary>
        <div className="demo-native__shots">{group.shots.map(({ shot, assets: shotAssets }) => <article key={shot.id}><h3>{shot.id.toUpperCase()}</h3><p>{shot.action}</p>{shotAssets.length ? shotAssets.map(media) : <p className="muted">{text('No prepared asset revealed for this shot.', '此鏡頭尚無已呈現的預備素材。')}</p>}</article>)}</div>
      </details>)}
      <div className="demo-native__assets">{assets.filter(asset => !asset.shotId && visible.has(asset.id)).map(media)}</div>
    </>}
  </section>
}
