import type { Query } from '../state'
import type { PulseInfo } from './ClientChips'
import type { ChipGroup } from '../lib/clientChips'
import { ErrorText } from './ErrorText'
import { SearchBox } from './SearchBox'
// The Altitude hero holds the search box.
import { AltitudeHero } from './themes/AltitudeHero'
import { StartingPoints } from './find/StartingPoints'
import { TopicResults } from './publish/TopicResults'
import { t } from '../lib/i18n'
import type { RecentRow, SavedRow, TypeAheadItem } from '../lib/findDesk'
import { RecentSearches } from './find/RecentSearches'
import { SavedToResearch } from './find/SavedToResearch'

interface Props {
  query: Query
  setQuery: (q: Query) => void
  onSearch: (text: string) => void
  onImage?: (file: File) => void
  clientName: string
  // Live mode searches real TikTok videos; otherwise the sample tofu data.
  live: boolean
  clientExamples: string[]
  error: string | null
  // Client-specific starting points: catching on now, fits the audience, more like saved ideas.
  chipGroups: ChipGroup[]
  pulse: PulseInfo
  onRefreshPulse: () => void
  // Videos sent or approved for this client this month, and the monthly target.
  planned: number
  target: number
  // The last search that had results, to offer a way back.
  lastSearch: string | null
  onBackToResults: () => void
  // The desk: this client's recent searches and what is saved to Research, by video.
  recent: RecentRow[]
  onOpenRecent: (row: RecentRow) => void
  saved: SavedRow[]
  coverOf: (videoId: string) => string | undefined
  onOpenResearch: () => void
  // Suggestions while typing in the hero's search box.
  suggestFor: (text: string, past: string[]) => TypeAheadItem[]
  // A question written from the client's topic, for "Other ways in".
  askExample?: string
}

// Find ideas, before searching. The first thing staff see after picking a client: the navy hero with the search
// box (and suggestions while typing), then the desk as numbered blueprint blocks: 01 Recent searches and
// 02 Saved to Research. A first visit (no searches yet) leads with Where to start, written from the brief and
// what is catching on, and the two blocks show what will fill in.
export function SearchScreen(props: Props) {
  const { query, setQuery, onSearch, clientName, live, error } = props
  const returning = props.recent.length > 0
  const savedEmpty = props.saved.every((r) => r.refs.length === 0) && props.saved.every((r) => !r.slot)
  const pick = (value: string) => {
    setQuery({ ...query, keyword: value })
    onSearch(value)
  }
  const start = (
    <StartingPoints
      clientName={clientName}
      groups={props.chipGroups}
      clientExamples={props.clientExamples}
      pulse={props.pulse}
      onPick={pick}
      onRefresh={props.onRefreshPulse}
      askExample={props.askExample}
      onFocusSearch={() => document.getElementById('keyword')?.focus()}
      onUpload={props.onImage ? () => document.getElementById('keyword-file')?.click() : undefined}
    />
  )
  const recent = <RecentSearches clientName={clientName} rows={props.recent} onOpen={props.onOpenRecent} compact={!returning && savedEmpty} />
  const saved = (
    <SavedToResearch
      clientName={clientName}
      rows={props.saved}
      coverOf={props.coverOf}
      onOpenResearch={props.onOpenResearch}
      onSearch={pick}
      compact={!returning && savedEmpty}
    />
  )
  return (
    <section className="search-screen find-page fd-page">
      <AltitudeHero clientName={clientName}>
        <SearchBox
          inputId="keyword"
          value={query.keyword}
          onValueChange={(text) => setQuery({ ...query, keyword: text })}
          onSearch={onSearch}
          onImage={props.onImage}
          platforms={query.platforms}
          onPlatformsChange={(platforms) => setQuery({ ...query, platforms })}
          live={live}
          clientName={clientName}
          clientExamples={props.clientExamples}
          chipGroups={props.chipGroups}
          pulse={props.pulse}
          onRefreshPulse={props.onRefreshPulse}
          autoFocus
          hideChips
          suggestFor={props.suggestFor}
        />
      </AltitudeHero>

      {(props.planned > 0 || props.lastSearch) && (
        <div className="find-status">
          {props.planned > 0 && (
            <span className="progress-line">
              <span>
                <strong>{t('find.search.approvedCount', { planned: props.planned, target: props.target })}</strong>
                {t('find.search.approvedFor', { client: clientName })}
              </span>
              <span className="progress-mini" aria-hidden="true">
                <span style={{ width: `${Math.min(props.planned / props.target, 1) * 100}%` }} />
              </span>
            </span>
          )}
          {props.lastSearch && (
            <button type="button" className="link-btn" onClick={props.onBackToResults}>
              {t('find.search.back', { q: props.lastSearch })}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          <ErrorText text={error} onSearch={props.onSearch} />
        </p>
      )}

      <TopicResults text={query.keyword} />

      {returning ? (
        <>
          {recent}
          {saved}
          {start}
        </>
      ) : (
        <>
          {start}
          <div className={savedEmpty ? 'fd-pair' : 'fd-stack'}>
            {recent}
            {saved}
          </div>
        </>
      )}

      <p className="hint find-hint">
        {live
          ? t('find.search.hintLive')
          : t('find.search.hintDemo')}
      </p>
    </section>
  )
}
