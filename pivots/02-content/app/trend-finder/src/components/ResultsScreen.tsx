import { useEffect, useRef, useState } from 'react'
import { TopicResults } from './publish/TopicResults'
import { useCountUp } from '../lib/motion'
import { resultsShortcuts, useResultsShortcuts } from '../lib/useShortcuts'
import type { Format, IdeaStatus, Platform, Video } from '../types'
import type { Query, Sort } from '../state'
import type { FormatTrend } from '../lib/metrics'
import type { Interpretation } from '../lib/parseQuery'
import type { Answer } from '../lib/answer'
import { byFollowers, compact, scoreBase, groupFailures, hasScore, outlierScore, platformName, tierOf } from '../lib/metrics'
import { beatUsual, platformsText } from './find/words'
import { t, tp } from '../lib/i18n'
import { VideoTile } from './VideoTile'
import { BestVideo } from './BestVideo'
import { EvidenceChip } from './EvidenceChip'
import { cachedLabel, type Cohort } from '../lib/evidence'
import { PlatformLogo } from './PlatformToggles'
import { ErrorText } from './ErrorText'
import { SearchBox } from './SearchBox'
import type { PulseInfo } from './ClientChips'
import type { ChipGroup } from '../lib/clientChips'
import { useManagerName } from '../lib/appContext'
import { DEFAULT_FILTERS, applyFilters, followersPending, type ResultFilters } from '../lib/resultFilters'
import type { SavedRow, TypeAheadItem } from '../lib/findDesk'
import { DeskBlock } from './find/DeskBlock'
import { dayWord } from './find/words'

export type Chip =
  | { kind: 'keyword'; value: string }
  | { kind: 'topic'; formatId: string }
  | { kind: 'audience' }
  | { kind: 'days' }
  | { kind: 'platforms' }
  | { kind: 'length' }
  | { kind: 'source' }

interface Props {
  query: Query
  setQuery: (q: Query) => void
  interp: Interpretation
  answer: Answer | null
  formats: Format[]
  allVideos: Video[]
  onSearch: (text: string) => void
  onImage?: (file: File) => void
  onRemoveChip: (chip: Chip) => void
  likeThis: React.ReactNode
  // Live mode: real TikTok results, with a sounds-and-hashtags strip instead of hand-written formats.
  live: boolean
  // Platforms whose search failed in this live search; the rest still show.
  failed: { platform: Platform; message: string }[]
  // Platforms that answered with no videos.
  empty: Platform[]
  // Live mode: account medians are still being fetched, so scores will update in place.
  scoring: boolean
  patterns: React.ReactNode
  // Same-pattern accounts for each video id (live TikTok only); drives the evidence label.
  cohorts: Map<string, Cohort>
  results: Video[]
  trends: FormatTrend[]
  sort: Sort
  setSort: (s: Sort) => void
  formatFilter: string | null
  setFormatFilter: (id: string | null) => void
  // Status of each video's plan for this client (still planning, sent, approved…).
  ideaStatus: Map<string, IdeaStatus>
  // Videos in this client's Research sheet.
  inResearch: Set<string>
  onOpen: (id: string) => void
  // Save to the client's Research, or take it off again (only while it has no plan).
  onToggleSave: (id: string) => void
  onGoResearch: () => void
  // Which of the client's videos a saved video was filed under ("Video 3 · Street taste test", or Unsorted).
  savedIn: (id: string) => { short: string; full: string } | null
  // Formats this client can't film (e.g. needs a kitchen), so they never lead the page.
  blockedFormatIds: Set<string>
  clientName: string
  onPlan: (id: string) => void
  // Same search box as the search page, so a new search can start right here.
  clientExamples: string[]
  chipGroups: ChipGroup[]
  pulse: PulseInfo
  onRefreshPulse: () => void
  // Videos this search found that its previous run didn't, and when that run was (from this browser's history).
  newIds: Set<string>
  newSince?: number
  // What is saved to Research for this client, by video (the strip at the bottom).
  saved: SavedRow[]
  // The Research video (slot id, or 'unsorted') something was just saved to, lit in the strip.
  justSaved?: string | null
  suggestFor: (text: string, past: string[]) => TypeAheadItem[]
}

export function ResultsScreen(p: Props) {
  const manager = useManagerName()
  // The default filters still apply; their tags were taken off this page.
  const [filters] = useState<ResultFilters>(DEFAULT_FILTERS)
  const byFormat = p.formatFilter ? p.results.filter((v) => v.formatId === p.formatFilter) : p.results
  const filtered = applyFilters(byFormat, filters)
  // New since the last run first (keeping the chosen order within each part).
  const isNew = (v: Video) => p.newIds.has(v.id)
  const shown = p.newIds.size ? [...filtered.filter(isNew), ...filtered.filter((v) => !isNew(v))] : filtered
  const newCount = p.results.filter(isNew).length
  const activeTrend = p.trends.find((tr) => tr.format.id === p.formatFilter)
  const [draft, setDraft] = useState(p.interp.text)
  const [helpOpen, setHelpOpen] = useState(false)
  // Only show "Saved. You'll find it in Research." right after the Save button is pressed here, not for ideas saved earlier.
  // The best card's Save pill pops when clicked, like the tiles'.
  const [bestPop, setBestPop] = useState(false)
  useResultsShortcuts({
    onToggleSave: p.onToggleSave,
    onPlan: p.onPlan,
    onToggleHelp: () => setHelpOpen((o) => !o),
    onCloseHelp: () => setHelpOpen(false),
    searchInputId: 'toolbar-keyword',
  })
  // Best to copy: the top-scoring video whose format several accounts are using (early or rising),
  // that isn't already sent or approved and that this client can film. Falls back to the top score.
  const trendOf = (v: Video) => p.trends.find((tr) => tr.format.id === v.formatId)
  const ranked = [...shown].sort((a, b) => outlierScore(b) - outlierScore(a) || b.views - a.views)
  const open = ranked.filter((v) => {
    const s = p.ideaStatus.get(v.id)
    return s !== 'waiting' && s !== 'approved' && !p.blockedFormatIds.has(v.formatId)
  })
  const proven = open.filter((v) => ['early', 'rising'].includes(trendOf(v)?.stage ?? ''))
  const best = proven[0] ?? open[0] ?? ranked[0]
  const bestStatus = best ? p.ideaStatus.get(best.id) : undefined
  const platformCounts = (['tiktok', 'instagram', 'youtube', 'reddit', 'x'] as Platform[])
    .map((pl) => {
      const vs = shown.filter((v) => v.platform === pl)
      // Each platform has its own search, so its cache state comes from its own videos.
      const cached = p.live ? vs.filter((v) => v.fromCache) : []
      const fetchedAt = cached.length ? Math.max(...cached.map((v) => v.fetchedAt ?? 0)) : 0
      return { pl, n: vs.length, cache: cached.length ? cachedLabel(fetchedAt, Date.now()) : null }
    })
    .filter((x) => x.n > 0)
  const platformNames = platformsText(platformCounts.map((x) => x.pl))
  const bestSaved = best ? p.inResearch.has(best.id) : false
  const i = p.interp
  const queryLabel = i.source ? '' : i.text.trim()

  const filterControls = (
    <>
      <select
        id="toolbar-days"
        aria-label={t('find.res.postedIn')}
        value={p.query.days}
        onChange={(e) => p.setQuery({ ...p.query, days: Number(e.target.value) })}
      >
        <option value={7}>{t('find.res.last7')}</option>
        <option value={30}>{t('find.res.last30')}</option>
        <option value={90}>{t('find.res.last90')}</option>
        <option value={3650}>{t('find.res.anyTime')}</option>
      </select>
    </>
  )

  return (
    <section className="results fd-results">
      <SearchBox
        inputId="toolbar-keyword"
        value={draft}
        onValueChange={setDraft}
        onSearch={p.onSearch}
        onImage={p.onImage}
        platforms={p.query.platforms}
        onPlatformsChange={(platforms) => p.setQuery({ ...p.query, platforms })}
        live={p.live}
        clientName={p.clientName}
        clientExamples={p.clientExamples}
        chipGroups={p.chipGroups}
        pulse={p.pulse}
        onRefreshPulse={p.onRefreshPulse}
        hideChips
        suggestFor={p.suggestFor}
      />

      {groupFailures(p.failed).map((g) => (
        <p key={g.platforms.join()} className="error" role="alert">
          {platformsText(g.platforms)}: <ErrorText text={g.message} onSearch={p.onSearch} />
        </p>
      ))}

      {p.scoring && (
        <p className="small muted" role="status">
          {t('find.res.scoring')}
        </p>
      )}

      {p.empty.map((pl) => (
        <p key={pl} className="error" role="alert">
          {t('find.res.noVideos', { platform: platformName[pl] })}
        </p>
      ))}

      {p.likeThis}

      {p.answer && (
        <div className="answer" role="note">
          <div className="answer-head">
            <strong>{i.text.trim()}</strong>
          </div>
          {p.answer.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <span className="small muted">
            {t('find.res.sampleAnswer', { basis: p.answer.basis })}
          </span>
        </div>
      )}

      {p.results.length === 0 ? (
        <>
          <div className="filters">{filterControls}</div>
          <div className="empty">
            <h2>{t('find.res.emptyTitle')}</h2>
            <p>
              {p.live
                ? t('find.res.emptyLive')
                : t('find.res.emptyDemo')}
            </p>
          </div>
        </>
      ) : (
        <>
          <p className="summary">
            {t('find.res.foundPre')}
            <strong>{byFormat.length}</strong>
            {tp('find.res.foundPost', byFormat.length, { platforms: platformNames })}
            {queryLabel && <>{t('find.res.forQuery', { q: queryLabel })}</>}
            {t('find.res.endStop')}
            {shown.length < byFormat.length && (
              <span className="fd-showing">{t('find.desk.showing', { shown: shown.length, total: byFormat.length })}</span>
            )}
            {newCount > 0 && p.newSince !== undefined && (
              <span className="fd-newtag">{t('find.desk.recent.newSince', { n: newCount, day: dayWord(p.newSince) })}</span>
            )}
            {platformCounts.length > 1 &&
              platformCounts.map(({ pl, n }) => (
                <span key={pl} className="summary-platform" title={platformName[pl]}>
                  <PlatformLogo platform={pl} size={16} />
                  {n}
                </span>
              ))}
            {platformCounts.map(({ pl, cache }) =>
              cache ? (
                <span key={`cache-${pl}`} className="summary-cached">
                  {platformName[pl]} · {cache}
                </span>
              ) : null,
            )}
          </p>
          <TopicResults text={queryLabel ?? ''} />

          {best && (
            <DeskBlock tab={t('find.desk.best.tab')} id="fd-best" className="fd-best" hideTab>
            <div className="best-head">
              <h1 className="best-title">{t('find.res.bestTitle', { client: p.clientName })}</h1>
            </div>
            <div className="best">
              {/* The same Save pill as the video tiles below: "+ Save", then "✓ Video 2", planned or not. */}
              <div className="best-cover">
                <BestVideo key={best.id} video={best} onOpen={() => p.onOpen(best.id)} />
                <button
                    className={`tile-save ${bestSaved ? 'tile-save-on' : ''} ${bestPop ? 'tile-save-pop' : ''}`}
                    aria-pressed={bestSaved}
                    aria-label={bestSaved ? t('find.tile.unsaveAria') : t('find.tile.saveIdea')}
                    title={bestSaved ? t('find.tile.savedTitle') : t('find.tile.saveIdea')}
                    onClick={() => {
                      setBestPop(true)
                      p.onToggleSave(best.id)
                    }}
                    onAnimationEnd={() => setBestPop(false)}
                  >
                    {bestSaved ? `✓ ${p.savedIn(best.id)?.short ?? ''}`.trim() || t('find.tile.savedShort') : t('find.tile.plusSave')}
                </button>
              </div>
              <div className="best-body">
                <strong className="best-hook">"{best.hook}"</strong>
                <span className="best-handle">{best.handle}</span>
                <EvidenceChip video={best} cohort={p.cohorts.get(best.id)} />
                {/* Usual → this video, so the jump reads without decoding the × score. Keyed so it animates once per pick. */}
                {hasScore(best) && <BestCompare key={best.id} video={best} />}
                <div className="best-actions">
                  {bestStatus ? (
                    <button className="btn btn-primary" onClick={() => p.onPlan(best.id)}>
                      {bestStatus === 'waiting'
                        ? t('find.planWaiting', { manager })
                        : bestStatus === 'approved'
                          ? t('find.planApproved')
                          : bestStatus === 'saved'
                            ? t('find.planPlanning')
                            : t('find.planSentBack')}
                    </button>
                  ) : null}
                  <button className="btn btn-ghost" onClick={() => p.onOpen(best.id)}>
                    {t('find.seeWhy')}
                  </button>
                </div>
              </div>
            </div>
            </DeskBlock>
          )}

          <DeskBlock tab={newCount > 0 ? t('find.desk.all.tabNew') : t('find.desk.all.tab')} id="fd-all" className="fd-all">
            <div className="grid-head">
              <div className="grid-title">
                <h3 className="fd-grid-title">
                  {p.live ? t('find.res.allVideos') : activeTrend ? activeTrend.format.name : t('find.res.allVideos')}{' '}
                  <span className="muted">· {shown.length}</span>
                </h3>
              </div>
              <div className="filters">
                {filterControls}
                <ShortcutsHint open={helpOpen} setOpen={setHelpOpen} />
              </div>
            </div>
            <div className="grid">
              {shown.map((v) => (
                <VideoTile
                  key={v.id}
                  video={v}
                  onOpen={() => p.onOpen(v.id)}
                  onToggleSave={() => p.onToggleSave(v.id)}
                  inResearch={p.inResearch.has(v.id)}
                  where={p.savedIn(v.id)}
                  followersLoading={followersPending(v, filters)}
                  isNew={isNew(v)}
                />
              ))}
            </div>
          </DeskBlock>
        </>
      )}

    </section>
  )
}

// Small "?" button by the toolbar with a popover listing the keyboard shortcuts (also opens with ?).
function ShortcutsHint({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open, setOpen])
  return (
    <div className="kbd-hint" ref={wrap}>
      <button
        type="button"
        className="kbd-hint-btn"
        aria-label={t('find.res.kbdLabel')}
        title={t('find.res.kbdTitle')}
        aria-expanded={open}
        aria-controls="kbd-hint-pop"
        onClick={() => setOpen(!open)}
      >
        ?
      </button>
      {open && (
        <div className="kbd-hint-pop" id="kbd-hint-pop" role="note" aria-label={t('find.res.kbdLabel')}>
          <strong className="kbd-hint-title">{t('find.res.kbdLabel')}</strong>
          <dl>
            {resultsShortcuts().map((s) => (
              <div key={s.keys}>
                <dt>
                  {s.keys.split(' / ').map((k, i) => (
                    <span key={k}>
                      {i > 0 && ' / '}
                      <kbd>{k}</kbd>
                    </span>
                  ))}
                </dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

// Usual → this video for the Best to copy card. The big number counts up and the bar grows in
// when the card first appears (or a new video takes the spot), not on every render.
function BestCompare({ video }: { video: Video }) {
  const usual = scoreBase(video)
  const tier = tierOf(outlierScore(video))
  const followers = byFollowers(video)
  const shownViews = useCountUp(video.views)
  // How big the usual is next to this video, as a share of the bar (kept visible even when tiny).
  const usualShare = Math.min(Math.max(usual / Math.max(video.views, 1), 0.02), 1)
  return (
    <div className="best-compare" aria-label={beatUsual(video)}>
      <span className="cmp-num cmp-from">{compact(usual)}</span>
      <span className="cmp-arrow" aria-hidden="true">→</span>
      <span className="cmp-num cmp-to">{compact(shownViews)}</span>
      <span className="cmp-cap">{followers ? t('find.res.cmpFollowers') : t('find.res.cmpUsual')}</span>
      <span />
      <span className="cmp-cap">{t('find.res.cmpThis')}</span>
      <span className="cmp-bar" aria-hidden="true" style={{ '--usual': usualShare } as React.CSSProperties}>
        <span className={`cmp-bar-this score-${tier}`} />
        <span className="cmp-bar-usual" />
      </span>
    </div>
  )
}
