import { useContext } from 'react'
import { Handle, NodeToolbar, Position, useViewport, type NodeProps } from '@xyflow/react'
import { FreeformContext, type FreeformActions, type FreeNode } from './freeformContext'
import { serverText } from '../../lib/serverText'
import { ff, usd, seconds } from '../../lib/strings/freeform'
import { PORTS, outMedia } from '../../lib/canvas/ports'
import { genRequest, pendingGen, priceOf, selectedGen } from '../../lib/canvas/graph'
import type { CanvasNode } from '../../lib/canvas/types'

const icons: Record<CanvasNode['type'], string> = { prompt: 'T', storyboard: '▧', video: '▷', upload: '↑', voice: '♫', editor: '▤', shot: '▦', footage: '▣', kit: '◈' }
export function NodeSettings({ node, actions }: { node: CanvasNode; actions: FreeformActions }) {
  const kind = node.type === 'storyboard' ? 'image' : node.type
  const options = actions.models.filter((m) => m.kind === kind)
  const model = options.find((m) => m.id === node.data.model)
  const value = node.type === 'prompt' ? node.data.text : node.data.prompt
  const incoming = genRequest(actions.doc, node.id, actions.shots, actions.gens).prompt
  return <div className="fc-settings nodrag nopan nowheel">
    <label><span>{ff('prompt')}</span><textarea rows={3} aria-label={ff('prompt')} placeholder={incoming || ff('hint')} value={value ?? ''} disabled={actions.readonly} onChange={(e) => actions.update(node.id, node.type === 'prompt' ? { text: e.target.value } : { prompt: e.target.value })} /></label>
    {options.length > 0 && <label><span>{ff('model')}</span><select aria-label={ff('model')} disabled={actions.readonly} value={node.data.model ?? ''} onChange={(e) => actions.update(node.id, { model: e.target.value, duration: actions.models.find((m) => m.id === e.target.value)?.durations?.[0] })}>
      {!model && <option value={node.data.model ?? ''}>{node.data.model ?? '—'}</option>}
      {options.map((m) => <option key={m.id} value={m.id} disabled={!m.available}>{m.label}{!m.available ? ` · ${ff('unavailable')}` : ''}</option>)}
    </select></label>}
    {!!model?.durations?.length && <label><span>{ff('duration')}</span><select aria-label={ff('duration')} value={node.data.duration ?? model.durations[0]} disabled={actions.readonly} onChange={(e) => actions.update(node.id, { duration: Number(e.target.value) })}>{model.durations.map((d) => <option value={d} key={d}>{seconds(d)}</option>)}</select></label>}
  </div>
}
export function FreeformNode({ id, data: { node }, selected }: NodeProps<FreeNode>) {
  const actions = useContext(FreeformContext)!
  const { zoom } = useViewport()
  const simple = zoom < 0.45
  const mine = actions.takes.filter((t) => t.shotId === node.shotId && node.type === 'footage')
  const take = actions.takes.find((t) => t.id === node.data.takeId) ?? mine.find((t) => t.chosen)
  const generated = ['storyboard', 'video', 'voice'].includes(node.type)
  const pending = pendingGen(id, actions.gens)
  const shown = selectedGen(node, actions.gens)
  const model = actions.models.find((m) => m.id === node.data.model)
  const busy = actions.busy.has(id) || !!pending
  const error = [...actions.gens].reverse().find((g) => g.nodeId === id)?.error
  const out = outMedia(node)
  const ports = PORTS[node.type].inputs
  const shot = actions.shots.find((s) => s.id === node.shotId)
  return <div className={`fc-node ${selected ? 'is-selected' : ''} ${simple ? 'is-simple' : ''}`} data-kind={node.type}>
    <NodeToolbar isVisible={selected && !actions.readonly} offset={34}>
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
      </div> : node.type === 'prompt' ? <textarea className="fc-prompt nodrag nopan nowheel" aria-label={ff('prompt')} placeholder={ff('hint')} value={node.data.text ?? ''} disabled={actions.readonly} onChange={(e) => actions.update(id, { text: e.target.value })} />
      : node.type === 'shot' ? <div className="fc-shot"><h3>{shot?.shot}</h3><p>{shot?.line}</p></div>
      : <>
        <div className={`fc-preview ${busy ? 'is-running' : ''}`}>
          {take ? <video className="nodrag nopan" src={take.url} controls playsInline preload="metadata" /> : shown?.url ? shown.kind === 'image' ? <img src={shown.url} alt={ff('storyboard')} draggable={false} /> : shown.kind === 'voice' ? <audio className="nodrag nopan" src={shown.url} controls /> : <video className="nodrag nopan" src={shown.url} controls playsInline preload="metadata" />
            : node.data.voiceId ? <audio className="nodrag nopan" controls src={actions.voices.find((v) => v.id === node.data.voiceId)?.url} />
            : <span className="fc-preview-icon">{busy ? '◌' : icons[node.type]}</span>}
          {!take && !shown?.url && !node.data.voiceId && !busy && <span className="fc-preview-note">{ff(node.type === 'upload' || node.type === 'footage' ? 'uploadHint' : 'noResult')}</span>}
        </div>
        {mine.length > 0 && <div className="fc-legacy-takes nodrag nopan">{mine.map((t) => <div key={t.id}><span>{t.name}</span><button disabled={actions.readonly || t.chosen} onClick={() => actions.pickTake(t.id)}>{t.chosen ? ff('ready') : ff('version')}</button></div>)}</div>}
        {generated && <NodeSettings node={node} actions={actions} />}
        {(node.type === 'upload' || node.type === 'footage') && <label className="fc-upload nodrag nopan">↑ {ff('choose')}<input type="file" accept={node.type === 'footage' ? 'video/mp4,video/quicktime,.mp4,.mov' : actions.freeform ? 'image/*,video/*,audio/*' : 'image/*,audio/*'} disabled={actions.readonly || busy} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) actions.upload(id, f) }} /></label>}
        {generated && <div className="fc-run-row"><span>{model ? priceOf(model, node.data.duration) === 0 ? ff('free') : usd(priceOf(model, node.data.duration)) : '—'}</span><button className="fc-run nodrag nopan" disabled={actions.readonly || busy || !model?.available} aria-label={ff('run')} onClick={() => actions.run(id)}>{busy ? '◌' : '▶'}</button></div>}
        {node.data.stale && <p className="fc-stale">◷ {ff('stale')}</p>}
        {error && <p className="fc-node-error" role="alert">{serverText(error)}</p>}
      </>}
    </div>
    {ports.map((p, i) => <Handle id={p.id} type="target" position={Position.Left} key={p.id} className={`fc-port media-${p.media}`} style={{ top: 62 + i * 38 }} title={`${ff('ports')}: ${p.media} (${p.id})`} aria-label={p.id}><span>{p.id.replace('in:', '')}</span></Handle>)}
    {out && <Handle id="out" type="source" position={Position.Right} className={`fc-port media-${out}`} title={`${ff('output')}: ${out}`} aria-label={ff('output')}><span>{out === 'text' ? 'T' : out === 'image' ? '▧' : out === 'audio' ? '♫' : '▷'}</span></Handle>}
  </div>
}
