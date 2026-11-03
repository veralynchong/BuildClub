import { useRef } from 'react'
import { t } from '../../../lib/i18n'
import { serverText } from '../../../lib/serverText'
import { budgetLeft, failedGen, isRetired, pendingGen, priceOf, selectedGen, versionsOf } from '../../../lib/canvas/graph'
import { PORTS } from '../../../lib/canvas/ports'
import { genButton } from '../../../lib/canvas/status'
import type { GenModel } from '../../../lib/canvas/types'
import { VersionStrip } from '../VersionStrip'
import { CardFoot, CardHead, CardMedia } from './Card'
import { ClipActions } from './ClipActions'
import { useCanvas } from './ctx'
import { Ports } from './Ports'
import type { CvNodeProps } from './types'

const price = (m: GenModel, seconds: number | undefined): string => {
  const est = priceOf(m, seconds)
  return est === 0 ? t('canvas.gen.free') : t('canvas.gen.cost', { usd: est.toFixed(2) })
}

// "Nano Banana 2", without a trailing note such as "(free)".
const shortLabel = (m: GenModel): string => m.label.replace(/\s*\(.*\)\s*$/, '')

// A storyboard or video node card (spec §6.1): type and one status, the result, model and price, the main button.
// The model, length, prompt and kit controls stay here until the right panel takes them (B6).
export function GenNode({ id, data: { node } }: CvNodeProps) {
  const focused = useRef('')
  const { models, gens, readOnly, updateData, onGenerate, onSelectVersion, edited, incomingHandles, missing, budget, chainOf, onChain, chaining, kitView, kitSent, setKitOff, status } = useCanvas()
  const kind = node.type === 'video' ? 'video' : 'image'
  const options = models.filter((m) => m.kind === kind)
  const retired = isRetired(models, kind, node.data.model)
  const model = retired ? undefined : (options.find((m) => m.id === node.data.model) ?? options[0])
  const versions = versionsOf(id, gens)
  const pending = pendingGen(id, gens)
  const failed = failedGen(id, gens)
  const shown = selectedGen(node, gens)
  const need = missing(id)
  const handles = incomingHandles(id)
  const seconds = model?.durations?.includes(node.data.duration ?? -1) ? node.data.duration : model?.durations?.[0]
  const stale = node.data.stale === true
  const left = budgetLeft(budget, kind)
  const usd = model ? priceOf(model, seconds) : 0
  const pair = node.type === 'storyboard' ? chainOf(id) : null
  const lost = failed?.status === 'unknown'
  const kitSeen = node.type === 'storyboard' ? kitView(id) : null
  const sent = node.type === 'storyboard' ? kitSent(id, model) : null
  const sentPrompt = shown?.inputs.sentPrompt

  // Why a model can't be picked: it has no use for an input that already has a line.
  const refuses = (m: GenModel): string | null => {
    for (const h of handles) {
      const port = PORTS[node.type].inputs.find((p) => p.id === h)
      if (port?.modelInput && (m.inputs[port.modelInput] ?? 'none') === 'none') return t('canvas.conn.model', { model: m.label })
    }
    return null
  }

  const main = genButton(node, gens)
  const usdText = model ? price(model, seconds) : ''

  return (
    <div className={`cv-node cv-card cv-gen cv-gen-${node.type}${stale ? ' is-stale' : ''}`}>
      <CardHead title={t(`canvas.node.${node.type}`)} status={status(id)} />
      <CardMedia kind={kind} url={shown?.url} running={!!pending} label={t(kind === 'video' ? 'canvas.gen.video' : 'canvas.gen.image')} />
      {model && (
        <CardFoot
          model={kind === 'video' && seconds ? `${shortLabel(model)} · ${t('canvas.gen.seconds', { n: seconds })}` : shortLabel(model)}
          price={usd === 0 ? usdText : t('canvas.card.price', { usd: usd.toFixed(2) })}
          title={left === null || usd === 0 ? usdText : t('canvas.gen.budget', { usd: usd.toFixed(2), left: left.toFixed(2) })}
        />
      )}
      <select
        className="cv-select nodrag"
        aria-label={t('canvas.gen.model')}
        value={model?.id ?? ''}
        disabled={readOnly || !!pending}
        onChange={(e) => {
          const next = options.find((m) => m.id === e.target.value)
          updateData(id, { model: e.target.value, ...(node.data.duration !== undefined && !next?.durations?.includes(node.data.duration) ? { duration: undefined } : {}) })
        }}
      >
        {retired && (
          <option value="" disabled>
            {t('canvas.gen.retiredOption')}
          </option>
        )}
        {options.map((m) => (
          <option key={m.id} value={m.id} disabled={!m.available || refuses(m) !== null} title={!m.available ? t('canvas.gen.needsKey') : (refuses(m) ?? undefined)}>
            {m.label} · {m.tier} · {price(m, undefined)}
            {!m.available ? ` · ${t('canvas.gen.needsKey')}` : ''}
          </option>
        ))}
      </select>
      {kind === 'video' && model?.durations && (
        <select
          className="cv-select nodrag"
          aria-label={t('canvas.gen.duration')}
          value={seconds ?? ''}
          disabled={readOnly || !!pending}
          onChange={(e) => updateData(id, { duration: Number(e.target.value) })}
        >
          {model.durations.map((d) => (
            <option key={d} value={d}>
              {t('canvas.gen.seconds', { n: d })}
            </option>
          ))}
        </select>
      )}
      <textarea
        className="cv-textarea nodrag nowheel"
        aria-label={t('canvas.gen.prompt')}
        placeholder={t('canvas.gen.promptPlaceholder')}
        value={node.data.prompt ?? ''}
        readOnly={readOnly}
        rows={1}
        onChange={(e) => updateData(id, { prompt: e.target.value })}
        onFocus={() => (focused.current = node.data.prompt ?? '')}
        onBlur={() => (node.data.prompt ?? '') !== focused.current && edited(id)}
      />
      {failed && !pending && (
        <p className={lost ? 'cv-gen-notice small' : 'cv-gen-error small'} role="alert">
          {lost ? t('canvas.gen.unknown') : t('canvas.gen.failed', { error: serverText(failed.error) })}
        </p>
      )}
      {kitSeen && kitSeen.items.length > 0 && (
        <fieldset className="cv-kit-pick nodrag" disabled={readOnly || !!pending}>
          <legend className="small muted">{t('canvas.kit.pick')}</legend>
          {kitSeen.items.map((i) => (
            <label key={i.id} className="small">
              <input type="checkbox" checked={!kitSeen.off.includes(i.id)} onChange={(e) => setKitOff(id, i.id, !e.target.checked)} /> {i.name}
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
      {sentPrompt && sentPrompt !== shown?.inputs.prompt && (
        <details className="cv-kit-sent small nodrag nowheel">
          <summary>{t('canvas.kit.sent')}</summary>
          <pre>{sentPrompt}</pre>
        </details>
      )}
      {retired && (
        <p className="cv-gen-retired small" role="alert">
          {t('canvas.gen.retired')}
        </p>
      )}
      {kind === 'video' && shown?.url && <ClipActions src={{ kind: 'generation', id: shown.id, nodeId: id, shotId: node.shotId }} />}
      <VersionStrip versions={versions} selectedId={shown?.id ?? null} disabled={readOnly} onSelect={(g) => onSelectVersion(id, g)} />
      <div className="cv-gen-foot">
        <button type="button" className="btn btn-primary btn-sm nodrag" disabled={readOnly || !!pending || !model || !model.available || retired || need !== null} onClick={() => onGenerate(id)}>
          {t(main.key, main.vars)}
        </button>
      </div>
      {pair && !readOnly && (
        <button type="button" className="btn btn-ghost btn-sm nodrag cv-chain-btn" disabled={!!pendingGen(pair.imageNodeId, gens) || !!pendingGen(pair.videoNodeId, gens) || chaining || retired} onClick={() => onChain(id)}>
          {chaining ? t('canvas.chain.quoting') : t('canvas.chain.run')}
        </button>
      )}
      {model && !model.available && !pending && <p className="cv-gen-need small muted">{t('canvas.gen.needsKey')}</p>}
      {need && !pending && <p className="cv-gen-need small muted">{t(need)}</p>}
      <Ports node={node} />
    </div>
  )
}
