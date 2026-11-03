import type { RecentRow } from '../../lib/findDesk'
import { platformName } from '../../lib/metrics'
import { t, tp } from '../../lib/i18n'
import { DeskBlock } from './DeskBlock'
import { dayWord } from './words'

interface Props {
  clientName: string
  rows: RecentRow[]
  // Re-runs a search (same words, same platforms).
  onOpen: (row: RecentRow) => void
  // Side by side with the Saved block (new user): a small block with one sentence.
  compact?: boolean
}

const two = (n: number) => String(n).padStart(2, '0')
const isQuestion = (q: string) => /\?\s*$/.test(q)

// 01. Recent searches: the client's searches from this browser, read top to bottom like the shot list.
// Each row: number, the search (platforms, videos, who ran it), what is new since the run before, how many of its
// videos are saved, and Open (or Run again once it is over a week old).
export function RecentSearches({ clientName, rows, onOpen, compact }: Props) {
  if (rows.length === 0) {
    return (
      <DeskBlock tab={t('find.desk.recent.tab')} id="fd-recent" quiet className={compact ? 'fd-block-compact' : ''}>
        <div className="fd-empty">
          <span className="fd-ghost-row" aria-hidden="true">
            <span className="fd-n">01</span>
            <span className="fd-gl" style={{ width: '46%' }} />
            <span className="fd-gl" style={{ width: '18%' }} />
          </span>
          <p>
            <strong>{t('find.desk.recent.emptyTitle')}</strong> {t('find.desk.recent.emptyBody')}
          </p>
        </div>
      </DeskBlock>
    )
  }
  const totalNew = rows.reduce((n, r) => n + (r.stale ? 0 : (r.fresh ?? 0)), 0)
  return (
    <DeskBlock tab={t('find.desk.recent.tab')} id="fd-recent">
      <div className="fd-ledger">
        <div className="fd-cell">
          <h3>{t('find.desk.recent.title')}</h3>
          <p>{t('find.desk.recent.sub', { client: clientName })}</p>
          <span className="fd-count">
            {tp('find.desk.recent.count', rows.length)}
            {totalNew > 0 && <> · {t('find.desk.recent.newTotal', { n: totalNew })}</>}
          </span>
        </div>
        <div className="fd-rows" role="table" aria-label={t('find.desk.recent.title')}>
          <div className="fd-lhead" role="row">
            <span role="columnheader">{t('find.desk.col.no')}</span>
            <span role="columnheader">{t('find.desk.col.search')}</span>
            <span role="columnheader">{t('find.desk.col.since')}</span>
            <span role="columnheader">{t('find.desk.col.saved')}</span>
            <span role="columnheader" />
          </div>
          {rows.map((row, i) => {
            const { run } = row
            const hot = !row.stale && (row.fresh ?? 0) > 0
            const meta = [
              isQuestion(run.text) ? t('find.desk.recent.question') : run.platforms.map((p) => platformName[p]).join(', '),
              tp('find.desk.recent.videos', run.resultIds.length),
              run.by,
            ].filter(Boolean)
            return (
              <div key={run.id} className={`fd-lrow ${hot ? 'is-hot' : ''}`} role="row">
                <span className="fd-n" role="cell">
                  {two(i + 1)}
                </span>
                <span className="fd-q" role="cell">
                  {run.text}
                  <small>{meta.join(' · ')}</small>
                </span>
                <span className="fd-since" role="cell">
                  {row.stale ? (
                    <span className="fd-old">
                      {t('find.desk.recent.old')}
                      <small>{t('find.desk.recent.lastRun', { day: dayWord(run.at) })}</small>
                    </span>
                  ) : row.fresh === null ? (
                    <span className="fd-quiet">{t('find.desk.recent.firstRun', { day: dayWord(run.at) })}</span>
                  ) : row.fresh > 0 ? (
                    <span className="fd-newtag">{t('find.desk.recent.newSince', { n: row.fresh, day: dayWord(run.prevAt ?? run.at) })}</span>
                  ) : (
                    <span className="fd-quiet">{t('find.desk.recent.noneSince', { day: dayWord(run.prevAt ?? run.at) })}</span>
                  )}
                </span>
                <span className="fd-sv" role="cell">
                  {row.saved > 0 ? t('find.desk.recent.saved', { n: row.saved }) : <span className="fd-dash">–</span>}
                </span>
                <span className="fd-act" role="cell">
                  {row.stale ? (
                    <button
                      type="button"
                      className="btn btn-sm fd-btn-line"
                      aria-label={t('find.desk.recent.runAgainAria', { q: run.text })}
                      onClick={() => onOpen(row)}
                    >
                      {t('find.desk.recent.runAgain')}
                    </button>
                  ) : (
                    <button type="button" className="fd-go" aria-label={t('find.desk.recent.openAria', { q: run.text })} onClick={() => onOpen(row)}>
                      {t('find.desk.recent.open')} <span aria-hidden="true">→</span>
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </DeskBlock>
  )
}
