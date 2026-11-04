import type { RecentRow } from '../../lib/findDesk'
import { platformName } from '../../lib/metrics'
import { t, tp } from '../../lib/i18n'
import { DeskBlock } from './DeskBlock'
import { tiktokPath, xPath } from '../PlatformToggles'
import type { Platform } from '../../types'
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

// One-colour platform marks for the search's tile (white on the navy-to-blue tile).
function Glyph({ p }: { p: Platform }) {
  const common = { 'aria-hidden': true, viewBox: '0 0 24 24' } as const
  switch (p) {
    case 'tiktok':
      return <svg {...common}><path d={tiktokPath} fill="currentColor" /></svg>
    case 'x':
      return <svg {...common}><path d={xPath} fill="currentColor" /></svg>
    case 'instagram':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <rect x="1.5" y="5" width="21" height="14" rx="4" fill="currentColor" />
          <path d="M10 9v6l5-3z" fill="var(--navy)" />
        </svg>
      )
    case 'reddit':
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth="2">
          <ellipse cx="12" cy="14" rx="8" ry="6" />
          <path d="M12 8l1.5-5 4 1" />
        </svg>
      )
  }
}

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
  // Open layout on the page's dots (founder pick, 4 Nov 2026, find-ui/find-ideas-directions.html C):
  // the intro on the left, ruled rows on the right, each search with a platform tile and its words in serif.
  return (
    <section className="rs-recent" aria-labelledby="fd-recent">
      <div className="rs-intro">
        <h2 id="fd-recent">{t('find.desk.recent.title')}</h2>
        <p>{t('find.desk.recent.sub', { client: clientName })}</p>
      </div>
      <div className="rs-table" role="table" aria-labelledby="fd-recent">
        <div className="rs-head" role="row">
          <span role="columnheader">{t('find.desk.col.no')}</span>
          <span role="columnheader">{t('find.desk.col.search')}</span>
          <span role="columnheader">{t('find.desk.col.since')}</span>
          <span role="columnheader">{t('find.desk.col.saved')}</span>
          <span role="columnheader" />
        </div>
        {rows.map((row, i) => {
          const { run } = row
          const question = isQuestion(run.text)
          const meta = [
            question ? t('find.desk.recent.question') : run.platforms.map((p) => platformName[p]).join(', '),
            tp('find.desk.recent.videos', run.resultIds.length),
            run.by,
          ].filter(Boolean)
          const plats = run.platforms.slice(0, 4)
          return (
            <div key={run.id} className="rs-row" role="row">
              <span className="rs-n" role="cell">
                {two(i + 1)}
              </span>
              <span className="rs-q" role="cell">
                <span className={`rs-tile${plats.length === 1 ? ' is-one' : ''}`} aria-hidden="true">
                  {plats.map((p) => (
                    <Glyph key={p} p={p} />
                  ))}
                </span>
                <span className="rs-words">
                  <b>{run.text}</b>
                  <small>{meta.join(' · ')}</small>
                </span>
              </span>
              <span className="rs-since" role="cell">
                {row.stale ? (
                  <>
                    {t('find.desk.recent.old')}
                    <small>{t('find.desk.recent.lastRun', { day: dayWord(run.at) })}</small>
                  </>
                ) : row.fresh === null ? (
                  t('find.desk.recent.firstRun', { day: dayWord(run.at) })
                ) : row.fresh > 0 ? (
                  <>
                    <span className="rs-new">{t('find.desk.recent.newPill')}</span>
                    {t('find.desk.recent.newSince', { n: row.fresh, day: dayWord(run.prevAt ?? run.at) })}
                  </>
                ) : (
                  t('find.desk.recent.noneSince', { day: dayWord(run.prevAt ?? run.at) })
                )}
              </span>
              <span className="rs-saved" role="cell">
                {t('find.desk.recent.saved', { n: row.saved })}
              </span>
              <span className="rs-act" role="cell">
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
                  <button type="button" className="rs-open" aria-label={t('find.desk.recent.openAria', { q: run.text })} onClick={() => onOpen(row)}>
                    {t('find.desk.recent.open')} <span aria-hidden="true">→</span>
                  </button>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
