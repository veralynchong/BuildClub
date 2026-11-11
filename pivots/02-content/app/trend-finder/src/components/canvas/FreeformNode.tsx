import { OPENING_MODEL, OPENING_PREFIX, OPENING_VERSIONS, openingVersion } from '../../lib/guided/shootOpening'
import { useContext, useState } from 'react'
import { Handle, NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react'
import { FreeformContext, type FreeformActions, type FreeNode } from './freeformContext'
import { ModelPicker } from './ModelPicker'
import { t } from '../../lib/i18n'
import { canConnect, outMedia as sourceMedia } from '../../lib/canvas/ports'
import { serverText } from '../../lib/serverText'
import { ff, usd, seconds } from '../../lib/strings/freeform'
import { PORTS, outMedia } from '../../lib/canvas/ports'
import { genRequest, pendingGen, priceOf, selectedGen, normalizeImageSettings, imageEstimate, modelRefusal, referenceCount, referenceEdge, successfulVersions } from '../../lib/canvas/graph'
import type { CanvasNode } from '../../lib/canvas/types'

const portLabels = { 'in:text': 'textPort', 'in:start': 'startPort', 'in:ref': 'referencePort', 'in:kit': 'kitPort', 'in:clips': 'video', 'in:audio': 'audio' } as const
const icons: Record<CanvasNode['type'], string> = { prompt: 'T', storyboard: '▧', video: '▷', upload: '↑', voice: '♫', editor: '▤', shot: '▦', footage: '▣', kit: '◈' }
export function NodeSettings({ node, actions, hidePrompt = false }: { node: CanvasNode; actions: FreeformActions; hidePrompt?: boolean }) {
  const kind = node.type === 'storyboard' ? 'image' : node.type
  const options = actions.models.filter((m) => m.kind === kind)
  const model = options.find((m) => m.id === node.data.model)
  const countMax = actions.freeform ? model?.maxCount ?? 1 : 1
  const value = node.type === 'prompt' ? node.data.text : node.data.prompt
  const opening = node.data.model === OPENING_MODEL
  const draft = openingVersion(value)
  const incoming = genRequest(actions.doc, node.id, actions.shots, actions.gens).prompt
  return <div className="fc-settings nodrag nopan nowheel">
    {!hidePrompt && <label className={opening ? 'fc-demo-prompt' : undefined}><span>{ff(opening ? 'nextPrompt' : 'prompt')}</span><textarea rows={3} aria-label={ff('prompt')} placeholder={incoming || ff('hint')} value={value ?? ''} disabled={actions.readonly} onChange={(e) => actions.update(node.id, node.type === 'prompt' ? { text: e.target.value } : { prompt: e.target.value })} /></label>}
    {opening && <div className="fc-prompt-samples">
      <div role="group" aria-label={ff('demoPrompt')}>{OPENING_VERSIONS.map((version, i) => <button type="button" key={version.sourceId} aria-pressed={draft === version} disabled={actions.readonly || actions.busy.has(node.id)} onClick={() => actions.update(node.id, { prompt: version.prompt })}>{ff(i === 0 ? 'samplePrompt1' : 'samplePrompt2')}</button>)}</div>
      {draft && <p className="fc-prompt-change" aria-live="polite"><span>{ff('promptChanged')}: </span><mark>{draft.change}</mark></p>}
      <small>{ff('preparedFraming')}</small>
    </div>}
    {options.length > 0 && (kind === 'image' || kind === 'video' ? <label><span>{ff('model')}</span><ModelPicker models={actions.models} kind={kind} value={node.data.model} seconds={node.data.duration} imageSettings={node.data} refuses={(m) => modelRefusal(actions.doc, node.id, m, actions.gens, actions.kit)} disabled={actions.readonly || actions.busy.has(node.id)} onPick={(id) => {
      const picked = options.find((m) => m.id === id)!
      actions.update(node.id, { model: id, duration: picked.durations?.includes(node.data.duration ?? -1) ? node.data.duration : picked.durations?.[0], ...(kind === 'image' ? normalizeImageSettings(node.data, actions.freeform ? picked : { ...picked, maxCount: 1 }) : {}) })
    }} /></label> : <label><span>{ff('model')}</span><select aria-label={ff('model')} disabled={actions.readonly} value={node.data.model ?? ''} onChange={(e) => actions.update(node.id, { model: e.target.value })}>{!model && <option value={node.data.model ?? ''}>{node.data.model ?? '—'}</option>}{options.map((m) => <option key={m.id} value={m.id} disabled={!m.available}>{m.label}{!m.available ? ` · ${ff('unavailable')}` : ''}</option>)}</select></label>)}
    {kind === 'image' && model && <>
      <div className="fc-image-options">
        <label><span>{ff('ratio')}</span><select aria-label={ff('ratio')} disabled={actions.readonly || actions.busy.has(node.id) || !model.aspects?.length} value={normalizeImageSettings(node.data, model).aspectRatio ?? ''} onChange={(e) => actions.update(node.id, { aspectRatio: e.target.value })}>{!model.aspects?.length && <option value="">{ff('modelDefault')}</option>}{model.aspects?.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label><span>{ff('size')}</span><select aria-label={ff('size')} disabled={actions.readonly || actions.busy.has(node.id) || !model.resolutions?.length} value={normalizeImageSettings(node.data, model).resolution ?? ''} onChange={(e) => actions.update(node.id, { resolution: e.target.value })}>{!model.resolutions?.length && <option value="">{ff('modelDefault')}</option>}{model.resolutions?.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label><span>{ff('count')}</span><select aria-label={ff('count')} disabled={actions.readonly || actions.busy.has(node.id) || countMax === 1} value={Math.min(normalizeImageSettings(node.data, model).count ?? 1, countMax)} onChange={(e) => actions.update(node.id, { count: Number(e.target.value) })}>{Array.from({ length: countMax }, (_, i) => <option key={i + 1}>{i + 1}</option>)}</select></label>
      </div>
      <small>{ff('capabilities')}: {model.aspects?.join(' · ') || ff('modelDefault')} · {model.resolutions?.join(' / ') || ff('modelDefault')} · ×{model.maxCount ?? 1}</small>
      <InlineReferences node={node} actions={actions} />
    </>}
    {model && (!model.available || modelRefusal(actions.doc, node.id, model, actions.gens, actions.kit)) && <p className="fc-node-error">{!model.available ? ff('needsKey') : modelRefusal(actions.doc, node.id, model, actions.gens, actions.kit)}</p>}
    {!!model?.durations?.length && <label><span>{ff('duration')}</span><select aria-label={ff('duration')} value={node.data.duration ?? model.durations[0]} disabled={actions.readonly} onChange={(e) => actions.update(node.id, { duration: Number(e.target.value) })}>{model.durations.map((d) => <option value={d} key={d}>{seconds(d)}</option>)}</select></label>}
  </div>
}
function InlineReferences({ node, actions }: { node: CanvasNode; actions: FreeformActions }) {
  const [menu, setMenu] = useState<'' | 'sources' | 'images' | 'kits'>('')
  const model = actions.models.find((m) => m.id === node.data.model)
  const refs = actions.doc.edges.filter((e) => e.target === node.id && ['in:ref', 'in:kit'].includes(e.targetHandle))
  const count = referenceCount(actions.doc, node.id, actions.kit)
  const max = (model?.inputs.reference ?? 'none') === 'none' ? 0 : model?.maxRefs ?? 1
  const disabled = actions.readonly || actions.busy.has(node.id)
  const candidates = actions.doc.nodes.filter((n) => n.id !== node.id && (menu === 'kits' ? n.type === 'kit' : sourceMedia(n) === 'image' && selectedGen(n, actions.gens)?.status === 'done'))
  return <div className="fc-references">
    <div className="fc-reference-heading"><span>{ff('references')} {count}/{max}</span><button type="button" aria-label={ff('addReference')} disabled={disabled || max === 0 || count >= max} onClick={() => setMenu(menu ? '' : 'sources')}>＋</button></div>
    {refs.map((edge) => { const source = actions.doc.nodes.find((n) => n.id === edge.source); return <div className="fc-input-wire" key={edge.id}><span>{source ? ff(source.type) : edge.source} · {edge.source}</span><button type="button" aria-label={ff('removeReference')} disabled={disabled} onClick={() => actions.removeReference(edge.id)}>×</button></div> })}
    {menu && <div className="fc-reference-menu">
      <button type="button" aria-label={ff('close')} onClick={() => setMenu('')}>×</button>
      {menu === 'sources' ? <><label className="fc-upload">{ff('uploadImage')}<input type="file" accept="image/*" disabled={disabled} onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { actions.uploadReference(node.id, file); setMenu('') } }} /></label><button type="button" disabled={disabled} onClick={() => setMenu('images')}>{ff('existingImage')}</button><button type="button" disabled={disabled} onClick={() => setMenu('kits')}>{ff('kit')}</button></> : <>{candidates.length === 0 && <small>{ff('noImages')}</small>}{candidates.map((source) => {
        const edge = referenceEdge(source.id, node.id, source.type === 'kit')
        const check = canConnect(actions.doc, edge, actions.models)
        const next = { ...actions.doc, edges: [...actions.doc.edges, edge] }
        const why = !check.ok ? t(check.reason, check.vars) : model && modelRefusal(next, node.id, model, actions.gens, actions.kit)
        return <button type="button" key={source.id} disabled={disabled || !!why} title={why || undefined} onClick={() => { actions.addReference(source.id, node.id); setMenu('') }}>{ff(source.type)} · {source.id}{why && <small>{why}</small>}</button>
      })}</>}
    </div>}
  </div>
}
export function FreeformNode({ id, data: { node }, selected }: NodeProps<FreeNode>) {
  const actions = useContext(FreeformContext)!
  const { zoom } = useViewport()
  const clean = !!actions.guidedPresentation && ['n_shot_s1', 'n_six_prompt_s1', 'n_six_image_s1'].includes(id)
  const simple = zoom < 0.45
  const mine = actions.takes.filter((t) => t.shotId === node.shotId && node.type === 'footage')
  const take = actions.takes.find((t) => t.id === node.data.takeId) ?? mine.find((t) => t.chosen)
  const generated = ['storyboard', 'video', 'voice'].includes(node.type)
  const pending = pendingGen(id, actions.gens)
  const shown = selectedGen(node, actions.gens)
  const model = actions.models.find((m) => m.id === node.data.model)
  const busy = actions.busy.has(id) || !!pending
  const versions = successfulVersions(id, actions.gens)
  const versionIndex = versions.findIndex((g) => g.id === shown?.id)
  const batchId = [...actions.gens].reverse().find((g) => g.nodeId === id && g.inputs.batchId)?.inputs.batchId
  const batch = batchId ? actions.gens.filter((g) => g.nodeId === id && g.inputs.batchId === batchId) : []
  const error = [...actions.gens].reverse().find((g) => g.nodeId === id)?.error
  const out = outMedia(node)
  const ports = PORTS[node.type].inputs
  const shot = actions.shots.find((s) => s.id === node.shotId)
  return <div className={`fc-node ${selected ? 'is-selected' : ''} ${simple ? 'is-simple' : ''}`} data-kind={node.type}>
    <NodeToolbar isVisible={selected && !actions.readonly && !clean} offset={34}>
      <div className="fc-floating nodrag nopan">
        {generated && <button title={ff('run')} aria-label={ff('run')} disabled={busy} onClick={() => actions.run(id)}>▶</button>}
        {out && <button title={ff('connect')} aria-label={ff('connect')} onClick={() => actions.connect(id)}>⌁</button>}
        <button title={ff('settings')} aria-label={ff('settings')} onClick={() => actions.inspect(id)}>⚙</button>
        {node.type !== 'editor' && node.type !== 'shot' && <button title={ff('duplicate')} aria-label={ff('duplicate')} onClick={() => actions.duplicate(id)}>▣</button>}
        {node.type !== 'shot' && <button title={ff('delete')} aria-label={ff('delete')} onClick={() => actions.remove([id])}>⌫</button>}
      </div>
    </NodeToolbar>
    <div className="fc-node-title"><span>{icons[node.type]}</span>{ff(node.type)} <small>#{id.split('_').slice(-1)[0]?.slice(0, 4)}</small></div>
    <div className="fc-card">
      {node.type === 'editor' ? <div className="fc-composition">
        <span className="fc-composition-icon">▤</span><h3>{ff('editor')}</h3><p>{ff('composeHint')}</p>
        <div className="fc-composition-count">{actions.project?.clips.length ?? 0} {ff('clips')} · {actions.project?.voiceover.length ?? 0} {ff('voices')}</div>
        <button className="fc-primary nodrag" onClick={actions.openEditor}>{ff('openEditor')} ↗</button>
      </div> : node.type === 'prompt' && clean ? <div className="fc-demo-prompt-copy" key={node.data.text} aria-label={ff('prompt')}>{openingVersion(node.data.text) ? <>{OPENING_PREFIX}<mark>{openingVersion(node.data.text)!.change}</mark></> : node.data.text}</div> : node.type === 'prompt' ? <textarea className="fc-prompt nodrag nopan nowheel" aria-label={ff('prompt')} placeholder={ff('hint')} value={node.data.text ?? ''} disabled={actions.readonly} onChange={(e) => actions.update(id, { text: e.target.value })} />
      : node.type === 'kit' ? <div className="fc-kit-summary"><h3>{ff('kit')}</h3>{(actions.kit?.items ?? []).filter((item) => node.data.kitItems?.includes(item.id)).map((item) => <div key={item.id}><strong>{item.name}</strong><p>{item.note}</p></div>)}<button className="nodrag" onClick={() => actions.inspect(id)}>{ff('settings')}</button></div>
      : node.type === 'shot' ? <div className="fc-shot"><h3>{shot?.shot}</h3><p>{shot?.line}</p></div>
      : <>
        <div className={`fc-preview ${busy ? 'is-running' : ''}`} aria-busy={busy}>
          {take ? <video className="nodrag nopan" src={take.url} controls playsInline preload="metadata" /> : shown?.url ? shown.kind === 'image' ? <img src={shown.url} alt={ff('storyboard')} draggable={false} /> : shown.kind === 'voice' ? <audio className="nodrag nopan" src={shown.url} controls /> : <video key={shown.id} className="nodrag nopan" src={shown.url} controls playsInline preload="metadata" />
            : node.data.voiceId ? <audio className="nodrag nopan" controls src={actions.voices.find((v) => v.id === node.data.voiceId)?.url} />
            : <span className="fc-preview-icon">{busy ? '◌' : icons[node.type]}</span>}
          {!take && !shown?.url && !node.data.voiceId && !busy && <span className="fc-preview-note">{ff(node.type === 'upload' || node.type === 'footage' ? 'uploadHint' : 'noResult')}</span>}
        </div>
        {busy && <div className="fc-generation-status" role="status"><span className="fc-spinner" aria-hidden="true" /><span>{pending ? ff(pending.status === 'running' ? 'running' : pending.status === 'waiting' ? 'waiting' : 'queued') : ff('running')}{model?.provider === 'prepared' && <> · {ff('preparedReplay')}</>}</span><progress aria-label={ff('running')} /></div>}
        {versions.length > 0 && <div className="fc-history-controls nodrag nopan"><button aria-label={ff('previous')} disabled={actions.readonly || versionIndex <= 0} onClick={() => actions.selectVersion(versions[versionIndex - 1])}>‹</button><span>{versionIndex + 1}/{versions.length}</span><button aria-label={ff('next')} disabled={actions.readonly || versionIndex < 0 || versionIndex >= versions.length - 1} onClick={() => actions.selectVersion(versions[versionIndex + 1])}>›</button></div>}
        {(shown?.model === OPENING_MODEL || clean && shown && openingVersion(shown.inputs.prompt)) && <div className="fc-version-prompt nodrag nopan" aria-live="polite">
          <strong>{ff('promptUsed')} · {ff('versionLabel')} {versionIndex + 1}</strong>
          <p>{openingVersion(shown.inputs.prompt) ? <>{OPENING_PREFIX}<mark>{openingVersion(shown.inputs.prompt)!.change}</mark></> : shown.inputs.prompt}</p>
        </div>}
        {batch.length > 0 && <div className="fc-batch nodrag nopan" aria-live="polite"><strong>{ff('batch')} · {batch.filter((g) => g.status === 'done').length}/{batch.length} {ff('done')} · {batch.filter((g) => g.status === 'failed').length} {ff('failed')} · {batch.filter((g) => g.status === 'unknown').length} {ff('unknown')}</strong>{batch.map((g, i) => <span key={g.id}>#{(g.inputs.batchIndex ?? i) + 1} {ff(g.status)}</span>)}</div>}
        {mine.length > 0 && <div className="fc-legacy-takes nodrag nopan">{mine.map((t) => <div key={t.id}><span>{t.name}</span><button disabled={actions.readonly || t.chosen} onClick={() => actions.pickTake(t.id)}>{t.chosen ? ff('ready') : ff('version')}</button></div>)}</div>}
        {generated && <NodeSettings node={node} hidePrompt={clean} actions={clean ? { ...actions, models: actions.models.filter(model => model.id === node.data.model) } : actions} />}
        {(node.type === 'upload' || node.type === 'footage') && <label className="fc-upload nodrag nopan">↑ {ff('choose')}<input type="file" accept={node.type === 'footage' ? 'video/mp4,video/quicktime,.mp4,.mov' : actions.freeform ? 'image/*,video/*,audio/*' : 'image/*,audio/*'} disabled={actions.readonly || busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) actions.upload(id, f) }} /></label>}
        {generated && !clean && <div className="fc-run-row"><span>{ff('estimate')} · {model ? (model.kind === 'image' ? imageEstimate(model, node.data) : priceOf(model, node.data.duration)) === 0 ? ff('free') : usd((model.kind === 'image' ? imageEstimate(model, node.data) : priceOf(model, node.data.duration))) : '—'}</span><button className="fc-run nodrag nopan" disabled={actions.readonly || busy || !model?.available || !!modelRefusal(actions.doc, id, model, actions.gens, actions.kit)} aria-label={ff('run')} onClick={() => actions.run(id)}>{busy ? '◌' : '▶'}</button></div>}
        {!clean && shown && actions.useInEdit && actions.canUseInEdit?.(shown) && <button className="fc-primary nodrag nopan" disabled={actions.readonly || busy} onClick={() => actions.useInEdit?.(shown)}>{ff('useInEdit')}</button>}
        {!clean && node.data.stale && <p className="fc-stale">◷ {ff('stale')}</p>}
        {error && <p className="fc-node-error" role="alert">{serverText(error)}</p>}
      </>}
    </div>
    {ports.map((p, i) => <Handle id={p.id} type="target" position={Position.Left} key={p.id} className={`fc-port media-${p.media}`} style={{ top: 62 + i * 38 }} title={ff(portLabels[p.id])} aria-label={ff(portLabels[p.id])}><span>{ff(portLabels[p.id])}</span></Handle>)}
    {out && <Handle id="out" type="source" position={Position.Right} className={`fc-port media-${out}`} title={ff('output')} aria-label={ff('output')}><span>{out === 'text' ? 'T' : out === 'image' ? '▧' : out === 'audio' ? '♫' : '▷'}</span></Handle>}
  </div>
}
