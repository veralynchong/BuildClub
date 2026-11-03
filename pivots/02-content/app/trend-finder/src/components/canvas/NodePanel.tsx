import { useRef } from 'react'
import { t } from '../../lib/i18n'
import { serverText } from '../../lib/serverText'
import { failedGen, genView, pendingGen, priceLabel, reuseSettings, selectedGen, shotTextSource, versionsOf } from '../../lib/canvas/graph'
import { PORTS } from '../../lib/canvas/ports'
import { aboutTime } from '../../lib/canvas/shell'
import { genButton } from '../../lib/canvas/status'
import type { GenModel } from '../../lib/canvas/types'
import { ModelPicker } from './ModelPicker'
import { useCanvas } from './nodes/ctx'
import { VersionStrip } from './VersionStrip'

interface Props {
  nodeId: string
  onClose: () => void
}

// The right panel for one selected storyboard or video node (spec §6.3): every setting of the node, its price and wait,
// what went wrong, its versions and the main button. The node card itself only shows the result and a summary.
export function NodePanel({ nodeId, onClose }: Props) {
  const focused = useRef('')
  const c = useCanvas()
  const { doc, models, gens, shots, readOnly, updateData, onGenerate, onSelectVersion, edited, incomingHandles, missing, budget, chainOf, onChain, chaining, kitView, kitSent, setKitOff, shotIndex } = c
  const node = doc.nodes.find((n) => n.id === nodeId)
  if (!node || (node.type !== 'storyboard' && node.type !== 'video')) return null
  const versions = versionsOf(nodeId, gens)
  const pending = pendingGen(nodeId, gens)
  const failed = failedGen(nodeId, gens)
  const shown = selectedGen(node, gens)
  const need = missing(nodeId)
  const { kind, options, retired, model, seconds, usd, left, canGenerate } = genView(node, models, budget, need)
  const handles = incomingHandles(nodeId)
  const pair = node.type === 'storyboard' ? chainOf(nodeId) : null
  const lost = failed?.status === 'unknown'
  const kitSeen = node.type === 'storyboard' ? kitView(nodeId) : null
  const sent = node.type === 'storyboard' ? kitSent(nodeId, model) : null
  const sentPrompt = shown?.inputs.sentPrompt
  const shotNo = shotIndex(node.shotId) + 1 // 0 when the node has no shot, or its shot left the plan
  const source = shotTextSource(doc, nodeId, shots)
  const locked = readOnly || !!pending

  // Why a model can't be picked: it has no use for an input that already has a line.
  const refuses = (m: GenModel): string | null => {
    for (const h of handles) {
      const port = PORTS[node.type].inputs.find((p) => p.id === h)
      if (port?.modelInput && (m.inputs[port.modelInput] ?? 'none') === 'none') return t('canvas.conn.model', { model: m.label })
    }
    return null
  }

  // The start frame's source node and the version it gives (video only).
  const startText = (() => {
    const e = doc.edges.find((x) => x.target === nodeId && x.targetHandle === 'in:start')
    const src = e && doc.nodes.find((n) => n.id === e.source)
    if (!src) return t('canvas.panel.startNone')
    const name = t(src.type === 'shot' ? 'canvas.node.shotGone' : `canvas.node.${src.type}`)
    const g = selectedGen(src, gens)
    if (!g) return t('canvas.panel.startEmpty', { node: name })
    const n = versionsOf(src.id, gens).filter((x) => x.status === 'done').findIndex((x) => x.id === g.id) + 1
    return t('canvas.panel.startFrom', { node: name, n })
  })()

  const priceText = !model ? '' : priceLabel(model, seconds)
  const wait = model?.typicalSeconds != null ? aboutTime(model.typicalSeconds) : null
  const costLine = wait ? t('canvas.panel.cost', { price: priceText, eta: t(wait.key, { n: wait.n }) }) : priceText
  const main = genButton(node, gens)
  const canReuse = !!shown && models.some((m) => m.id === shown.model && m.kind === kind)
  const typeName = t(`canvas.node.${node.type}`)

  return (
    <aside className="cv-panel nokey" aria-label={t('canvas.panel.label')}>
      <div className="cv-panel-head">
        <h2 className="cv-panel-title">{shotNo > 0 ? t('canvas.panel.title', { node: typeName, n: shotNo }) : typeName}</h2>
        <button type="button" className="cv-panel-x" aria-label={t('canvas.panel.close')} title={t('canvas.panel.close')} onClick={onClose}>
          ×
        </button>
      </div>

      <div className="cv-panel-field">
        <span className="cv-panel-label small muted">{t('canvas.gen.model')}</span>
        <ModelPicker
          models={models}
          kind={kind}
          value={retired ? undefined : model?.id}
          seconds={seconds}
          refuses={refuses}
          disabled={locked}
          onPick={(id) => {
            const next = options.find((m) => m.id === id)
            // a length the new model can't do is cleared, so it falls back to the model's first
            updateData(nodeId, { model: id, ...(node.data.duration !== undefined && !next?.durations?.includes(node.data.duration) ? { duration: undefined } : {}) })
          }}
        />
        {retired && (
          <p className="cv-gen-retired small" role="alert">
            {t('canvas.gen.retired')}
          </p>
        )}
        {model && !model.available && <p className="cv-gen-need small muted">{t('canvas.gen.needsKey')}</p>}
      </div>

      {kind === 'video' && model?.durations && (
        <label className="cv-panel-field">
          <span className="cv-panel-label small muted">{t('canvas.gen.duration')}</span>
          <select className="cv-select" value={seconds ?? ''} disabled={locked} onChange={(e) => updateData(nodeId, { duration: Number(e.target.value) })}>
            {model.durations.map((d) => (
              <option key={d} value={d}>
                {t('canvas.gen.seconds', { n: d })}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === 'video' && (
        <div className="cv-panel-field">
          <span className="cv-panel-label small muted">{t('canvas.edge.start')}</span>
          <span className="cv-panel-value">{startText}</span>
        </div>
      )}

      <label className="cv-panel-field">
        <span className="cv-panel-label small muted">{t('canvas.gen.prompt')}</span>
        <textarea
          className="cv-textarea nowheel"
          placeholder={source.from === 'shot' ? source.text : t('canvas.gen.promptPlaceholder')}
          value={node.data.prompt ?? ''}
          readOnly={readOnly}
          rows={4}
          onChange={(e) => updateData(nodeId, { prompt: e.target.value })}
          onFocus={() => (focused.current = node.data.prompt ?? '')}
          onBlur={() => (node.data.prompt ?? '') !== focused.current && edited(nodeId)}
        />
      </label>
      {shotNo > 0 && (
        <div className="cv-panel-shottext">
          <label className="cv-switch small">
            <input
              type="checkbox"
              role="switch"
              checked={!node.data.shotTextOff}
              disabled={readOnly}
              onChange={(e) => {
                updateData(nodeId, { shotTextOff: !e.target.checked })
                edited(nodeId)
              }}
            />
            {t('canvas.gen.shotText', { n: shotNo })}
          </label>
          {!node.data.shotTextOff && source.from !== 'shot' && source.from !== 'none' && <p className="small muted">{t('canvas.panel.shotTextOver')}</p>}
        </div>
      )}

      {kitSeen && kitSeen.items.length > 0 && (
        <fieldset className="cv-kit-pick" disabled={locked}>
          <legend className="small muted">{t('canvas.kit.pick')}</legend>
          {kitSeen.items.map((i) => (
            <label key={i.id} className="small">
              <input type="checkbox" checked={!kitSeen.off.includes(i.id)} onChange={(e) => setKitOff(nodeId, i.id, !e.target.checked)} /> {i.name}
            </label>
          ))}
        </fieldset>
      )}
      {kitSeen && sent?.unused && <p className="cv-gen-need small muted">{t('canvas.kit.unused')}</p>}
      {sent && sent.dropped.length + sent.droppedManual.length > 0 && (
        <p className="cv-gen-notice small">
          {t('canvas.kit.dropped', { max: model?.maxRefs ?? 1, names: [...sent.dropped, ...sent.droppedManual.map((n) => t('canvas.kit.droppedImage', { n }))].join(', ') })}
        </p>
      )}
      {kitSeen && kitSeen.removed.length > 0 && <p className="cv-gen-notice small">{t('canvas.kit.removed', { names: kitSeen.removed.join(', ') })}</p>}

      {model && (
        <p className="cv-panel-cost" title={left === null || usd === 0 ? undefined : t('canvas.gen.budget', { usd: usd.toFixed(2), left: left.toFixed(2) })}>
          {costLine}
        </p>
      )}
      {failed && !pending && (
        <p className={lost ? 'cv-gen-notice small' : 'cv-gen-error small'} role="alert">
          {lost ? t('canvas.gen.unknown') : t('canvas.gen.failed', { error: serverText(failed.error) })}
        </p>
      )}
      {need && !pending && <p className="cv-gen-need small muted">{t(need)}</p>}

      {versions.length > 0 && (
        <div className="cv-panel-field">
          <span className="cv-panel-label small muted">{t('canvas.gen.versions')}</span>
          <VersionStrip versions={versions} selectedId={shown?.id ?? null} disabled={readOnly} models={models} onSelect={(g) => onSelectVersion(nodeId, g)} />
          {sentPrompt && sentPrompt !== shown?.inputs.prompt && (
            <details className="cv-kit-sent small nowheel">
              <summary>{t('canvas.kit.sent')}</summary>
              <pre>{sentPrompt}</pre>
            </details>
          )}
          {canReuse && (
            <button
              type="button"
              className="btn btn-ghost btn-sm cv-panel-reuse"
              disabled={locked}
              onClick={() => {
                updateData(nodeId, reuseSettings(shown))
                edited(nodeId)
              }}
            >
              {t('canvas.panel.reuse')}
            </button>
          )}
        </div>
      )}

      <div className="cv-panel-foot">
        <button type="button" className="btn btn-primary" disabled={locked || !canGenerate} onClick={() => onGenerate(nodeId)}>
          {t(main.key, main.vars)}
        </button>
        {pair && !readOnly && (
          <button type="button" className="btn btn-ghost btn-sm cv-chain-btn" disabled={!!pendingGen(pair.imageNodeId, gens) || !!pendingGen(pair.videoNodeId, gens) || chaining || retired} onClick={() => onChain(nodeId)}>
            {chaining ? t('canvas.chain.quoting') : t('canvas.chain.run')}
          </button>
        )}
      </div>
    </aside>
  )
}
