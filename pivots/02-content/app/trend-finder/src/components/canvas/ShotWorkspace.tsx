import { useContext, useMemo, useState } from 'react'
import type { Shot } from '../../types'
import type { CanvasNode, NodeKind } from '../../lib/canvas/types'
import { failedGen, pendingGen } from '../../lib/canvas/graph'
import { shotAssets, shotCover, type ShotAsset } from '../../lib/canvas/shotWorkspace'
import { ff } from '../../lib/strings/freeform'
import { serverText } from '../../lib/serverText'
import { FreeformContext } from './freeformContext'

function AssetMedia({ asset, controls = false }: { asset: ShotAsset; controls?: boolean }) {
  if (!asset.url) return <p className="fc-shot-text">{asset.node.data.text || asset.node.data.prompt || ff(asset.media === 'kit' ? 'kit' : 'noResult')}</p>
  if (asset.media === 'image') return <img src={asset.url} alt={ff(asset.node.type)} draggable={false} />
  if (asset.media === 'audio') return controls ? <audio src={asset.url} controls /> : <span aria-hidden="true">♫</span>
  return <video src={asset.url} controls={controls} muted={!controls} playsInline preload="metadata" />
}

export function ShotWorkspace({ shots, activeId, onSelect, onAdd }: { shots: Shot[]; activeId: string; onSelect: (id: string) => void; onAdd: (kind: NodeKind, from: string) => void }) {
  const actions = useContext(FreeformContext)!
  const index = Math.max(0, shots.findIndex((s) => s.id === activeId))
  const shot = shots[index]
  const assets = useMemo(() => shotAssets(actions.doc, shot?.id ?? '', actions.gens, actions.takes, actions.project), [actions.doc, actions.gens, actions.takes, actions.project, shot?.id])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<ShotAsset | null>(null)
  if (!shot?.id) return <div className="fc-shot-workspace"><p>{ff('assistantChooseShot')}</p></div>
  const disabled = actions.readonly || actions.busy.size > 0
  const columns = [
    { key: 'references', title: ff('shotReferences'), items: assets.references, node: undefined, kind: undefined },
    { key: 'images', title: ff('shotImages'), items: assets.images, node: assets.imageNode, kind: 'storyboard' as const },
    { key: 'videos', title: ff('shotVideos'), items: assets.videos, node: assets.videoNode, kind: 'video' as const },
  ]
  const badge = (asset: ShotAsset) => asset.onTimeline ? ff('inEdit') : asset.primaryImage ? ff('storyboardChoice') : ''
  const modelName = (asset: ShotAsset) => asset.generation ? actions.models.find((m) => m.id === asset.generation!.model)?.label ?? ff(asset.node.type) : ff(asset.node.type)
  const use = (asset: ShotAsset) => asset.generation ? actions.selectVersion(asset.generation) : asset.take ? actions.pickTake(asset.take.id) : undefined
  const run = (node: CanvasNode) => actions.run(node.id)
  return <section className="fc-shot-workspace" aria-label={ff('shotView')}>
    <nav className="fc-shot-nav" aria-label={ff('shotNavigation')}>
      {shots.map((s, i) => { const cover = shotCover(actions.doc, s.id!, actions.gens); return <button type="button" key={s.id} aria-label={`${ff('shot')} ${i + 1}: ${s.shot}`} aria-pressed={s.id === shot.id} title={s.shot} onClick={() => onSelect(s.id!)}>
        <span className="fc-shot-thumb">{cover ? <AssetMedia asset={cover} /> : <span aria-hidden="true">▧</span>}</span><span>{String(i + 1).padStart(2, '0')}</span>
      </button> })}
    </nav>
    <header className="fc-shot-heading"><div><h2>{ff('shot')} {index + 1} <small>/ {shots.length}</small></h2><p>{shot.shot}</p></div><div className="fc-shot-step">
      <button type="button" aria-label={ff('previousShot')} disabled={index === 0} onClick={() => onSelect(shots[index - 1].id!)}>‹</button>
      <button type="button" aria-label={ff('nextShot')} disabled={index === shots.length - 1} onClick={() => onSelect(shots[index + 1].id!)}>›</button>
      <button type="button" onClick={actions.openEditor}>{ff('openEditor')}</button>
    </div></header>
    <div className="fc-shot-columns">
      {columns.map((column) => {
        const previewKey = `${shot.id}:${column.key}`
        const current = column.items.find((a) => a.key === previews[previewKey]) ?? column.items.find((a) => a.onTimeline) ?? column.items.find((a) => a.primaryImage) ?? column.items.find((a) => a.chosenOnNode) ?? column.items[0]
        const generator = column.key === 'references' ? undefined : current?.node ?? column.node
        const status = generator && (pendingGen(generator.id, actions.gens) ?? failedGen(generator.id, actions.gens))
        const model = generator && actions.models.find((m) => m.id === generator.data.model)
        return <section className="fc-shot-column" data-column={column.key} key={column.key} aria-label={column.title}>
          <header><h3>{column.title} <small>{column.items.length}</small></h3>{column.key === 'references' && <label className={`fc-shot-upload${disabled ? ' is-disabled' : ''}`}>{ff('uploadImage')}<input type="file" accept="image/*" disabled={disabled || !(assets.imageNode ?? assets.videoNode) || !!pendingGen((assets.imageNode ?? assets.videoNode)!.id, actions.gens)} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; const target = assets.imageNode ?? assets.videoNode; if (file && target) actions.uploadReference(target.id, file) }} /></label>}</header>
          <div className="fc-shot-hero" data-generation-id={current?.generation?.id}>
            {current ? <AssetMedia asset={current} controls /> : <p>{ff('noShotAssets')}</p>}
            {current?.url && <button type="button" className="fc-shot-expand" aria-label={ff('expandPreview')} onClick={() => setExpanded(current)}>⤢</button>}
          </div>
          <div className="fc-shot-tools"><span>{current ? badge(current) || modelName(current) : ''}</span><div>
            {column.key === 'references' && current?.node.type === 'upload' && <label className="fc-shot-upload">{ff('choose')}<input type="file" accept="image/*,audio/*" disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) actions.upload(current.node.id, file) }} /></label>}
            {(current?.node ?? generator) && <button type="button" onClick={() => actions.inspect((current?.node ?? generator)!.id)}>{ff('settings')}</button>}
            {generator && ['storyboard', 'video', 'voice'].includes(generator.type) && <button type="button" disabled={disabled || !!(generator && pendingGen(generator.id, actions.gens)) || !model?.available} title={!model?.available ? ff('needsKey') : undefined} onClick={() => run(generator)}>{ff('run')}</button>}
            {!generator && column.kind && assets.shotNode && <button type="button" disabled={disabled} onClick={() => onAdd(column.kind!, column.kind === 'video' ? assets.imageNode?.id ?? assets.shotNode!.id : assets.shotNode!.id)}>{ff(column.kind === 'video' ? 'addVideo' : 'addImage')}</button>}
          </div></div>
          {status && <p className="fc-shot-status" role="status">{ff(status.status)} {status.error && serverText(status.error)}</p>}
          <div className="fc-shot-versions" aria-label={`${column.title} ${ff('versions')}`}>
            {column.items.map((asset, i) => <article className={`fc-shot-version${current?.key === asset.key ? ' is-previewed' : ''}`} key={asset.key} data-generation-id={asset.generation?.id}>
              <button type="button" className="fc-shot-preview-button" aria-label={`${ff('previewVersion')} ${i + 1}`} aria-pressed={current?.key === asset.key} onClick={() => setPreviews((prev) => ({ ...prev, [previewKey]: asset.key }))}>
                <span className="fc-shot-version-thumb"><AssetMedia asset={asset} /></span><span><strong>{ff('versionLabel')} {i + 1}</strong><small>{modelName(asset)}</small>{badge(asset) && <small className="fc-shot-badge">{badge(asset)}</small>}</span>
              </button>
              {(asset.generation || asset.take) && column.key !== 'references' && <button type="button" className="fc-shot-use" aria-label={`${ff('version')} ${i + 1}`} disabled={disabled || !!pendingGen(asset.node.id, actions.gens) || asset.chosenOnNode} onClick={() => use(asset)}>{asset.chosenOnNode ? ff('nodeChoice') : ff('version')}</button>}
            </article>)}
          </div>
        </section>
      })}
    </div>
    {expanded && <dialog className="fc-shot-lightbox" aria-label={ff('expandPreview')} ref={(el) => { if (el && !el.open) el.showModal() }} onCancel={(e) => { e.preventDefault(); e.currentTarget.close() }} onClose={() => setExpanded(null)}>
      <button type="button" autoFocus aria-label={ff('close')} onClick={(e) => e.currentTarget.closest('dialog')?.close()}>×</button><div><AssetMedia asset={expanded} controls /></div>
    </dialog>}
  </section>
}
