import type { Format, SavedIdea, Video } from '../types'
import { t } from '../lib/i18n'
import { planProgress } from '../lib/canvasPick'
import { Thumb } from './Thumb'
import { dueLabel, planName } from './plans/moves'

interface Props {
  clientName: string
  plans: SavedIdea[] // approved plans, in the order to show
  videoById: Map<string, Video>
  formatById: Map<string, Format>
  onPick: (ideaId: string) => void
  onGoPlans: () => void
}

// Sidebar "Canvas" with more than one approved plan: pick the plan whose canvas to open.
export function CanvasPick(p: Props) {
  return (
    <section className="client board">
      <header className="client-head">
        <div>
          <span className="eyebrow">{p.clientName}</span>
          <h1>{t('shell.canvasPick.title')}</h1>
          <p className="muted">{p.plans.length ? t('shell.canvasPick.intro') : t('shell.canvasPick.empty')}</p>
        </div>
      </header>
      {p.plans.length === 0 ? (
        <div className="empty">
          <button type="button" className="btn btn-primary" onClick={p.onGoPlans}>
            {t('shell.canvasPick.goPlans')}
          </button>
        </div>
      ) : (
        <ul className="board-list">
          {p.plans.map((idea) => {
            const v = p.videoById.get(idea.videoId)
            if (!v) return null
            const prog = planProgress(idea, p.formatById.get(v.formatId)?.shotList ?? [])
            return (
              <li key={idea.id}>
                <button type="button" className="board-card" style={{ width: '100%', textAlign: 'left' }} onClick={() => p.onPick(idea.id)}>
                  <Thumb video={v} />
                  <div className="board-card-body">
                    <strong>{planName(v, p.formatById.get(v.formatId))}</strong>
                    <span className="small">{t('shell.canvasPick.due', { date: dueLabel(idea.dueDate) })}</span>
                    <span className="small muted">{t('shell.canvasPick.counts', { shots: prog.shots, ready: prog.ready })}</span>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
