import { t } from '../../lib/i18n'
import { planCost, type AgentPlan } from '../../lib/canvas/agent'
import { ModelPicker } from './ModelPicker'
import { useCanvas } from './nodes/ctx'

interface Props {
  shotId: string // the plan Shot id
  plan: AgentPlan | null
  loading: boolean
  error: string | null
  onChange: (p: AgentPlan) => void
  onApprove: () => void
  onCreate: () => void
  onCancel: () => void
}

const usdText = (usd: number) => (usd === 0 ? t('canvas.gen.free') : t('canvas.gen.cost', { usd: usd.toFixed(2) }))
const noRefusal = () => null

// The right panel while the agent's plan is open (spec §9.2): one card per node with an editable prompt and model,
// the price of each, the total, and the three choices. Nothing runs until the user approves; the run still goes
// through the price dialog.
export function AgentPanel({ shotId, plan, loading, error, onChange, onApprove, onCreate, onCancel }: Props) {
  const { models, shots, blocked, chaining } = useCanvas()
  const shotNo = shots.findIndex((s) => s.id === shotId) + 1
  const usable = (id: string) => models.some((m) => m.id === id && m.available)
  const modelsOk = !!plan && usable(plan.storyboard.model) && usable(plan.video.model)
  const cost = plan ? planCost(plan, models) : null
  const videoModels = models.filter((m) => m.kind === 'video' && (m.inputs.startFrame ?? 'none') !== 'none')
  const videoModel = plan ? models.find((m) => m.id === plan.video.model) : undefined
  const canAct = !!plan && modelsOk && !blocked && !chaining

  return (
    <aside className="cv-panel cv-agent nokey" aria-label={t('canvas.agent.build')}>
      <div className="cv-panel-head">
        <h2 className="cv-panel-title">{shotNo > 0 ? t('canvas.agent.title', { n: shotNo }) : t('canvas.node.shotGone')}</h2>
        <button type="button" className="cv-panel-x" aria-label={t('canvas.panel.close')} title={t('canvas.panel.close')} onClick={onCancel}>
          ×
        </button>
      </div>

      {loading && (
        <p className="muted" role="status">
          {t('canvas.agent.loading')}
        </p>
      )}
      {error && (
        <p className="cv-gen-error small" role="alert">
          {error}
        </p>
      )}

      {plan && (
        <>
          {plan.source === 'demo' && <p className="small muted">{t('canvas.agent.demo')}</p>}

          <section className="cv-agent-card" aria-label={t('canvas.node.storyboard')}>
            <h3 className="cv-agent-card-title">{t('canvas.node.storyboard')}</h3>
            <label className="cv-panel-field">
              <span className="cv-panel-label small muted">{t('canvas.agent.prompt')}</span>
              <textarea
                className="cv-textarea nowheel"
                rows={4}
                disabled={blocked}
                value={plan.storyboard.prompt}
                onChange={(e) => onChange({ ...plan, storyboard: { ...plan.storyboard, prompt: e.target.value } })}
              />
            </label>
            <div className="cv-panel-field">
              <span className="cv-panel-label small muted">{t('canvas.gen.model')}</span>
              <ModelPicker
                models={models}
                kind="image"
                value={plan.storyboard.model}
                seconds={undefined}
                refuses={noRefusal}
                disabled={blocked}
                onPick={(id) => onChange({ ...plan, storyboard: { ...plan.storyboard, model: id } })}
              />
            </div>
            <p className="cv-panel-cost">{usdText(cost!.storyboard)}</p>
          </section>

          <section className="cv-agent-card" aria-label={t('canvas.node.video')}>
            <h3 className="cv-agent-card-title">{t('canvas.node.video')}</h3>
            <label className="cv-panel-field">
              <span className="cv-panel-label small muted">{t('canvas.agent.prompt')}</span>
              <textarea
                className="cv-textarea nowheel"
                rows={4}
                disabled={blocked}
                value={plan.video.prompt}
                onChange={(e) => onChange({ ...plan, video: { ...plan.video, prompt: e.target.value } })}
              />
            </label>
            <div className="cv-panel-field">
              <span className="cv-panel-label small muted">{t('canvas.gen.model')}</span>
              <ModelPicker
                models={videoModels}
                kind="video"
                value={plan.video.model}
                seconds={plan.video.duration}
                refuses={noRefusal}
                disabled={blocked}
                onPick={(id) => {
                  const next = videoModels.find((m) => m.id === id)
                  // a length the new model can't do falls back to its first
                  const duration = next?.durations && !next.durations.includes(plan.video.duration) ? next.durations[0] : plan.video.duration
                  onChange({ ...plan, video: { ...plan.video, model: id, duration } })
                }}
              />
            </div>
            {videoModel?.durations && (
              <label className="cv-panel-field">
                <span className="cv-panel-label small muted">{t('canvas.gen.duration')}</span>
                <select
                  className="cv-select"
                  value={plan.video.duration}
                  disabled={blocked}
                  onChange={(e) => onChange({ ...plan, video: { ...plan.video, duration: Number(e.target.value) } })}
                >
                  {videoModel.durations.map((d) => (
                    <option key={d} value={d}>
                      {t('canvas.gen.seconds', { n: d })}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="cv-panel-cost">{usdText(cost!.video)}</p>
          </section>

          <p className="cv-panel-cost">{t('canvas.chain.total', { total: cost!.total.toFixed(2) })}</p>
          <p className="small muted">{t('canvas.agent.planCost', { usd: plan.planUsd.toFixed(3) })}</p>
          {!modelsOk && (
            <p className="cv-gen-need small muted" role="alert">
              {t('canvas.agent.modelGone')}
            </p>
          )}
        </>
      )}

      <div className="cv-panel-foot">
        <button type="button" className="btn btn-primary" disabled={!canAct} onClick={onApprove}>
          {t('canvas.agent.approve')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={!canAct} onClick={onCreate}>
          {t('canvas.agent.create')}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
          {t('canvas.agent.cancel')}
        </button>
      </div>
    </aside>
  )
}
