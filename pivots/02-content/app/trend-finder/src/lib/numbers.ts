import type { Key } from './i18n.ts'
import { t, tp } from './i18n.ts'
import { byFollowers, compact, hasScore, outlierScore, scoreBase, viewsWord } from './metrics.ts'
import { times } from './evidence.ts'
import type { Platform, Video } from '../types.ts'

// The counts a re-check compares; null where the platform gave none.
export interface Counts {
  views: number | null
  likes: number | null
  comments: number | null
  followers: number | null
}

// What POST /api/recheck stores and returns (backend/recheck.py).
export interface Recheck {
  platform: Platform
  id: string
  checkedAt: number
  old: Counts
  new: Counts
  followersKept: boolean
}

export const SOURCE_KEY: Record<Platform, Key> = {
  tiktok: 'find.numbers.source.tiktok',
  instagram: 'find.numbers.source.instagram',
  youtube: 'find.numbers.source.youtube',
  x: 'find.numbers.source.x',
  reddit: 'find.numbers.source.reddit',
}

// Reddit upvotes can't be re-checked for free; every other platform goes through yt-dlp.
export const canRecheck = (v: Video) => v.live === true && Boolean(v.url) && v.platform !== 'reddit'

// "just now", "3 days ago": how long before `now` something happened.
export function agoWhen(ts: number, now: number): string {
  const mins = Math.round((now - ts) / 60_000)
  if (mins < 1) return t('find.checked.justNow')
  if (mins < 60) return tp('find.checked.minutes', mins)
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return tp('find.checked.hours', hrs)
  return tp('find.checked.days', Math.round(hrs / 24))
}

const pad = (n: number) => String(n).padStart(2, '0')
// "2026-11-02 14:05" in the viewer's own time zone.
export function stampOf(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// "3 days ago (2026-10-30 14:02)", or null when the search time wasn't recorded.
export function fetchedWhen(ts: number | undefined, now: number): string | null {
  return ts ? t('find.numbers.fetchedWhen', { when: agoWhen(ts, now), at: stampOf(ts) }) : null
}

// The score in plain words with the real numbers: "Views ÷ followers: 2.9M ÷ 3,109 = 933×".
export function scoreFormula(v: Video): string {
  const word = viewsWord(v).toLowerCase()
  if (!hasScore(v)) return t('find.numbers.scoreNone', { views: compact(v.views), word })
  const vars = { views: compact(v.views), base: scoreBase(v).toLocaleString('en-US'), score: times(outlierScore(v)) }
  if (byFollowers(v)) return t('find.numbers.scoreFollowers', vars)
  return t(v.platform === 'reddit' ? 'find.numbers.scoreUpvotes' : 'find.numbers.scoreUsual', vars)
}

export interface Row {
  key: 'views' | 'likes' | 'comments' | 'followers'
  old: number | null
  now: number | null
  changed: boolean
}

// One row per count that either side knows, so a missing count never shows up as 0.
export function recheckRows(r: Recheck): Row[] {
  return (['views', 'likes', 'comments', 'followers'] as const)
    .filter((key) => r.old[key] !== null || r.new[key] !== null)
    .map((key) => ({ key, old: r.old[key], now: r.new[key], changed: r.old[key] !== r.new[key] }))
}

// The same video's score with the freshly fetched views (followers as the re-check left them); null without a score.
export function rescored(v: Video, r: Recheck): string | null {
  const views = r.new.views
  if (views === null) return null
  const base = byFollowers(v) ? (r.new.followers ?? v.followers) : v.medianViews
  return base && base > 0 ? times(views / base) : null
}

export const countText = (n: number | null) => (n === null ? t('find.numbers.unknown') : n.toLocaleString('en-US'))
