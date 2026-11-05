import type { Format, SavedIdea, Video } from '../types'
import { t } from '../lib/i18n'
import { Thumb } from './Thumb'
import { dueLabel, planName } from './plans/moves'

interface Props {
  clientName: string
  plans: SavedIdea[] // approved plans, in the order to show
  videoById: Map<string, Video>
  formatById: Map<string, Format>
  onPick: (ideaId: string) => void
  onGoPlans: () => void
  // Other words for the same chooser (the sidebar's "Video canvas" lists every plan, not only approved ones).
  copy?: { title: string; intro: string; empty: string; go: string }
}

// Sidebar "Canvas" with more than one approved plan: pick the plan whose canvas to open.
export function CanvasPick(p: Props) {
  return (
    <section className="client board">
      <header className="client-head">
        <div>
          {/* The "Video canvas" chooser has no eyebrow (no decorative labels on new screens). */}
          {!p.copy && <span className="eyebrow">{p.clientName}</span>}
          <h1>{p.copy?.title ?? t('shell.canvasPick.title')}</h1>
          <p className="muted">
            {p.plans.length ? (p.copy?.intro ?? t('shell.canvasPick.intro')) : (p.copy?.empty ?? t('shell.canvasPick.empty'))}
          </p>
        </div>
      </header>
      {p.plans.length === 0 ? (
        <div className="empty">
          <button type="button" className="btn btn-primary" onClick={p.onGoPlans}>
            {p.copy?.go ?? t('shell.canvasPick.goPlans')}
          </button>
        </div>
      ) : (
        <ul className="board-list">
          {p.plans.map((idea) => {
            const v = p.videoById.get(idea.videoId)
            if (!v) return null
            return (
              <li key={idea.id}>
                <button type="button" className="board-card" style={{ width: '100%', textAlign: 'left' }} onClick={() => p.onPick(idea.id)}>
                  <Thumb video={v} />
                  <div className="board-card-body">
                    <strong>{planName(v, p.formatById.get(v.formatId))}</strong>
                    <span className="small">{t('shell.canvasPick.due', { date: dueLabel(idea.dueDate) })}</span>
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
