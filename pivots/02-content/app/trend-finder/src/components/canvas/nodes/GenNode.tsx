import { t } from '../../../lib/i18n'
import { budgetLeft, isRetired, pendingGen, priceOf, selectedGen } from '../../../lib/canvas/graph'
import { genButton } from '../../../lib/canvas/status'
import type { GenModel } from '../../../lib/canvas/types'
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
// Every setting, the failure message and the versions live in the right panel (NodePanel) once the node is selected.
export function GenNode({ id, data: { node } }: CvNodeProps) {
  const { models, gens, readOnly, onGenerate, missing, budget, status } = useCanvas()
  const kind = node.type === 'video' ? 'video' : 'image'
  const options = models.filter((m) => m.kind === kind)
  const retired = isRetired(models, kind, node.data.model)
  const model = retired ? undefined : (options.find((m) => m.id === node.data.model) ?? options[0])
  const pending = pendingGen(id, gens)
  const shown = selectedGen(node, gens)
  const need = missing(id)
  const seconds = model?.durations?.includes(node.data.duration ?? -1) ? node.data.duration : model?.durations?.[0]
  const left = budgetLeft(budget, kind)
  const usd = model ? priceOf(model, seconds) : 0

  const main = genButton(node, gens)
  const usdText = model ? price(model, seconds) : ''

  return (
    <div className={`cv-node cv-card cv-gen cv-gen-${node.type}`}>
      <CardHead title={t(`canvas.node.${node.type}`)} status={status(id)} />
      <CardMedia kind={kind} url={shown?.url} running={!!pending} label={t(kind === 'video' ? 'canvas.gen.video' : 'canvas.gen.image')} />
      {model && (
        <CardFoot
          model={kind === 'video' && seconds ? `${shortLabel(model)} · ${t('canvas.gen.seconds', { n: seconds })}` : shortLabel(model)}
          price={usd === 0 ? usdText : t('canvas.card.price', { usd: usd.toFixed(2) })}
          title={left === null || usd === 0 ? usdText : t('canvas.gen.budget', { usd: usd.toFixed(2), left: left.toFixed(2) })}
        />
      )}
      {kind === 'video' && shown?.url && <ClipActions src={{ kind: 'generation', id: shown.id, nodeId: id, shotId: node.shotId }} />}
      <div className="cv-gen-foot">
        <button type="button" className="btn btn-primary btn-sm nodrag" disabled={readOnly || !!pending || !model || !model.available || retired || need !== null} onClick={() => onGenerate(id)}>
          {t(main.key, main.vars)}
        </button>
      </div>
      <Ports node={node} />
    </div>
  )
}
