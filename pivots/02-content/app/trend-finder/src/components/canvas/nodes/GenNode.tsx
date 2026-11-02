import { useRef } from 'react'
import { t } from '../../../lib/i18n'
import { budgetLeft, failedGen, isRetired, pendingGen, priceOf, selectedGen, versionsOf } from '../../../lib/canvas/graph'
import { PORTS } from '../../../lib/canvas/ports'
import type { GenModel } from '../../../lib/canvas/types'
import { VersionStrip } from '../VersionStrip'
import { ClipActions } from './ClipActions'
import { useCanvas } from './ctx'
import { PortLabels, Ports } from './Ports'
import type { CvNodeProps } from './types'

const price = (m: GenModel, seconds: number | undefined): string => {
  const est = priceOf(m, seconds)
  return est === 0 ? t('canvas.gen.free') : t('canvas.gen.cost', { usd: est.toFixed(2) })
}

// A storyboard or video node: model, optional prompt, the chosen version, the version strip and the Generate button.
export function GenNode({ id, data: { node } }: CvNodeProps) {
  const focused = useRef('')
  const { models, gens, readOnly, updateData, onGenerate, onSelectVersion, edited, incomingHandles, missing, budget, chainOf, onChain, chaining } = useCanvas()
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

  // Why a model can't be picked: it has no use for an input that already has a line.
  const refuses = (m: GenModel): string | null => {
    for (const h of handles) {
      const port = PORTS[node.type].inputs.find((p) => p.id === h)
      if (port?.modelInput && (m.inputs[port.modelInput] ?? 'none') === 'none') return t('canvas.conn.model', { model: m.label })
    }
    return null
  }

  const label = pending ? (pending.status === 'waiting' ? t('canvas.gen.waiting') : t('canvas.gen.running')) : failed ? t('canvas.gen.retry') : stale ? t('canvas.gen.again') : t('canvas.gen.go')

  return (
    <div className={`cv-node cv-gen cv-gen-${node.type}${stale ? ' is-stale' : ''}`}>
      <div className="cv-node-title">
        {t(`canvas.node.${node.type}`)}
        {stale && <span className="cv-badge small">{t('canvas.gen.stale')}</span>}
      </div>
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
      <div className="cv-preview small muted">
        {pending ? (
          <span role="status">
            <span className="cv-spin" aria-hidden="true" /> {pending.status === 'waiting' ? t('canvas.gen.waiting') : t('canvas.gen.running')}
          </span>
        ) : shown?.url ? (
          kind === 'video' ? (
            <video className="nodrag" src={shown.url} muted playsInline controls preload="metadata" />
          ) : (
            <img src={shown.url} alt={t('canvas.gen.image')} draggable={false} />
          )
        ) : (
          t('canvas.gen.empty')
        )}
      </div>
      {failed && !pending && (
        <p className={lost ? 'cv-gen-notice small' : 'cv-gen-error small'} role="alert">
          {lost ? t('canvas.gen.unknown') : t('canvas.gen.failed', { error: failed.error ?? '' })}
        </p>
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
          {label}
        </button>
        {model && (
          <span className="small muted">
            {left === null || usd === 0 ? price(model, seconds) : t('canvas.gen.budget', { usd: usd.toFixed(2), left: left.toFixed(2) })}
          </span>
        )}
      </div>
      {pair && !readOnly && (
        <button type="button" className="btn btn-ghost btn-sm nodrag cv-chain-btn" disabled={!!pendingGen(pair.imageNodeId, gens) || !!pendingGen(pair.videoNodeId, gens) || chaining || retired} onClick={() => onChain(id)}>
          {chaining ? t('canvas.chain.quoting') : t('canvas.chain.run')}
        </button>
      )}
      {model && !model.available && !pending && <p className="cv-gen-need small muted">{t('canvas.gen.needsKey')}</p>}
      {need && !pending && <p className="cv-gen-need small muted">{t(need)}</p>}
      <PortLabels node={node} />
      <Ports node={node} />
    </div>
  )
}
