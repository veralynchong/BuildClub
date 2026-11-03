import { useState } from 'react'
import type { SavedRow } from '../../lib/findDesk'
import { savedPreview } from '../../lib/findDesk'
import { compact as short } from '../../lib/metrics'
import { formatDay } from '../../lib/dates'
import { t } from '../../lib/i18n'
import { DeskBlock, MiniCover } from './DeskBlock'

interface Props {
  clientName: string
  rows: SavedRow[]
  // The picture of a saved video, when the app still has it.
  coverOf: (videoId: string) => string | undefined
  onOpenResearch: () => void
  // An empty video's topic, searched straight away.
  onSearch: (text: string) => void
  compact?: boolean
}

const MAX_COVERS = 3

// 02. Saved to Research: one row per video in Research (Video 1, Video 2, …, then Unsorted), so the team sees
// what each video already has before saving the same idea twice. An empty video says "Needs a reference" and
// offers its topic as a search.
export function SavedToResearch({ clientName, rows, coverOf, onOpenResearch, onSearch, compact }: Props) {
  const [all, setAll] = useState(false)
  const nothing = rows.every((r) => r.refs.length === 0)
  if (rows.length === 0 || (nothing && rows.every((r) => !r.slot))) {
    return (
      <DeskBlock tab={t('find.desk.saved.tab')} id="fd-saved" quiet className={compact ? 'fd-block-compact' : ''}>
        <div className="fd-empty">
          <span className="fd-ghost-row" aria-hidden="true">
            <span className="fd-n">{t('find.desk.saved.vNo', { n: 1 })}</span>
            <MiniCover ghost />
            <span className="fd-gl" style={{ width: '40%' }} />
          </span>
          <p>
            <strong>{t('find.desk.saved.emptyTitle')}</strong> {t('find.desk.saved.emptyBody')}
          </p>
        </div>
      </DeskBlock>
    )
  }
  const preview = savedPreview(rows)
  const shown = all ? rows : preview
  const videos = rows.filter((r) => r.slot).length
  return (
    <DeskBlock tab={t('find.desk.saved.tab')} id="fd-saved">
      <div className="fd-ledger">
        <div className="fd-cell">
          <h3>{t('find.desk.saved.title')}</h3>
          <p>{t('find.desk.saved.sub', { client: clientName })}</p>
          <button type="button" className="link-btn fd-cell-link" onClick={onOpenResearch}>
            {t('find.desk.saved.open')} <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="fd-rows" role="table" aria-label={t('find.desk.saved.title')}>
          <div className="fd-shead" role="row">
            <span role="columnheader">{t('find.desk.col.no')}</span>
            <span role="columnheader">{t('find.desk.col.video')}</span>
            <span role="columnheader">{t('find.desk.col.saved')}</span>
            <span role="columnheader">{t('find.desk.col.top')}</span>
            <span role="columnheader" />
          </div>
          {shown.map((row) => {
            const { slot, refs, top } = row
            return (
              <div key={slot?.id ?? 'unsorted'} className="fd-srow" role="row">
                <span className="fd-n" role="cell">
                  {slot ? t('find.desk.saved.vNo', { n: slot.number }) : '–'}
                </span>
                <span className="fd-q" role="cell">
                  {slot ? slot.topic || t('research.slot.videoNo', { n: slot.number }) : t('research.unsorted')}
                  <small>
                    {slot
                      ? slot.dueDate
                        ? t('find.desk.saved.due', { day: formatDay(slot.dueDate) })
                        : t('find.desk.saved.noDue')
                      : t('find.desk.saved.unsortedSub')}
                  </small>
                </span>
                <span className="fd-covers" role="cell">
                  {refs.length === 0 ? (
                    <span className="fd-needs">{t('find.desk.saved.needs')}</span>
                  ) : (
                    <>
                      {refs.slice(0, MAX_COVERS).map((e) => (
                        <MiniCover key={e.id} src={coverOf(e.videoId)} />
                      ))}
                      <span className="fd-cnt">{refs.length}</span>
                    </>
                  )}
                </span>
                <span className="fd-lead" role="cell">
                  {top ? (
                    <>
                      {/* Followers → views, laid out like the result tiles. */}
                      <span className="best-compare tile-cmp fd-cmp">
                        <span className="cmp-num cmp-from">{top.followers > 0 ? short(top.followers) : '–'}</span>
                        <span className="cmp-arrow" aria-hidden="true">→</span>
                        <span className="cmp-num cmp-to">{short(top.views)}</span>
                        <span className="cmp-cap">{t('find.res.cmpFollowers')}</span>
                        <span />
                        <span className="cmp-cap">{t('find.tile.cmpViews')}</span>
                      </span>
                      <small className="fd-acct">{top.account}</small>
                    </>
                  ) : slot?.topic ? (
                    <button type="button" className="link-btn fd-try" onClick={() => onSearch(slot.topic)}>
                      {t('find.desk.saved.try', { q: slot.topic })}
                    </button>
                  ) : null}
                </span>
                <span className="fd-st" role="cell">
                  {row.picked && <span className="fd-star">{t('find.desk.saved.picked')}</span>}
                </span>
              </div>
            )
          })}
          {preview.length < rows.length && (
            <div className="fd-more">
              <button type="button" className="link-btn" aria-expanded={all} onClick={() => setAll(!all)}>
                {all ? t('find.desk.saved.showLess') : t('find.desk.saved.showAll', { n: videos })}
              </button>
            </div>
          )}
        </div>
      </div>
    </DeskBlock>
  )
}
