import type { Query } from '../state'
import type { PulseInfo } from './ClientChips'
import type { ChipGroup } from '../lib/clientChips'
import { ErrorText } from './ErrorText'
import { SearchBox } from './SearchBox'
// The Altitude hero holds the search box.
import { AltitudeHero } from './themes/AltitudeHero'
import { TopicResults } from './publish/TopicResults'
import { t } from '../lib/i18n'
import type { RecentRow, SavedRow, TypeAheadItem } from '../lib/findDesk'
import { RecentSearches } from './find/RecentSearches'

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
// box (and suggestions while typing). A first visit (no searches yet) shows only that. Once the client has
// searches, Recent searches follows at the bottom.
export function SearchScreen(props: Props) {
  const { query, setQuery, onSearch, clientName, live, error } = props
  const returning = props.recent.length > 0
  const recent = <RecentSearches clientName={clientName} rows={props.recent} onOpen={props.onOpenRecent} />
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

      {/* The monthly "1 of 12 videos approved" line was taken off this page (4 Nov 2026). */}
      {props.lastSearch && (
        <div className="find-status">
          <button type="button" className="link-btn" onClick={props.onBackToResults}>
            {t('find.search.back', { q: props.lastSearch })}
          </button>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          <ErrorText text={error} onSearch={props.onSearch} />
        </p>
      )}

      <TopicResults text={query.keyword} />

      {/* A first visit (no searches yet) shows only the search. Coming back, Recent searches sits at the bottom.
          Where to start and Saved to Research were taken off this page. */}
      {returning && recent}

      {/* The demo's "only has sample videos about tofu" line was taken off (4 Nov 2026); the live hint stays. */}
      {live && <p className="hint find-hint">{t('find.search.hintLive')}</p>}
    </section>
  )
}
