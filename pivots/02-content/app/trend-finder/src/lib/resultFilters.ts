import type { ContentType, Video } from '../types'
import { CONTENT_TYPES } from '../types.ts'
import { UNKNOWN_DAYS } from './metrics.ts'

// The filter panel on the results screen. Pure, so the rules can be tested without the screen.
export type ViewsMin = 0 | 100_000 | 500_000 | 1_000_000 | 5_000_000
export type FollowersMax = 0 | 5_000 | 50_000 | 1_000_000 // 0 = any
export type UploadWithin = 0 | 7 | 30 | 90 | 365 // days, 0 = any
export type LengthBand = 'any' | 'short' | 'mid' | 'long'

export interface ResultFilters {
  viewsMin: ViewsMin
  followersMax: FollowersMax
  smallBig: boolean // followers < 5K and views >= 1M
  brokeOut: boolean // views >= 10x followers
  within: UploadWithin
  length: LengthBand
  // Content types to keep; none picked means all of them.
  types: ContentType[]
}

export const VIEWS_OPTIONS: ViewsMin[] = [0, 100_000, 500_000, 1_000_000, 5_000_000]
export const FOLLOWERS_OPTIONS: FollowersMax[] = [0, 5_000, 50_000, 1_000_000]
export const WITHIN_OPTIONS: UploadWithin[] = [7, 30, 90, 365, 0]
export const LENGTH_OPTIONS: LengthBand[] = ['short', 'mid', 'long', 'any']

// On by default: 1M+ views from accounts under 50K followers (small accounts with big views: the agency's
// "1-to-10" rule). Both show as removable chips marked "default".
export const DEFAULT_FILTERS: ResultFilters = {
  viewsMin: 1_000_000,
  followersMax: 50_000,
  smallBig: false,
  brokeOut: false,
  within: 0,
  length: 'any',
  types: [],
}

const SMALL_ACCOUNT = 5_000
const SMALL_ACCOUNT_VIEWS = 1_000_000
const BROKE_OUT_TIMES = 10

// Reddit has no followers, and Instagram's arrive later (0 until then): followers-based filters can't judge these yet.
export const followersUnknown = (v: Video): boolean => v.platform === 'reddit' || !(v.followers > 0)

export const usesFollowers = (f: ResultFilters): boolean => f.followersMax > 0 || f.smallBig || f.brokeOut

// True when this video was kept only because a followers filter is on and its followers aren't known.
export const followersPending = (v: Video, f: ResultFilters): boolean => usesFollowers(f) && followersUnknown(v)

export const lengthBandOf = (sec: number): LengthBand => (sec < 15 ? 'short' : sec <= 60 ? 'mid' : 'long')

function passes(v: Video, f: ResultFilters): boolean {
  // A video the API hasn't sorted (yet, or the call failed) is not in any type that was picked.
  if (f.types.length > 0 && !(v.contentType && f.types.includes(v.contentType))) return false
  // Reddit's `views` are upvotes, which say nothing about reach, so the views floor leaves them alone.
  if (v.platform !== 'reddit' && v.views < f.viewsMin) return false
  // No posting date (YouTube search) or no length: can't be judged, so these stay.
  if (f.within > 0 && v.daysAgo < UNKNOWN_DAYS && v.daysAgo > f.within) return false
  if (f.length !== 'any' && v.lengthSec > 0 && lengthBandOf(v.lengthSec) !== f.length) return false
  if (usesFollowers(f) && !followersUnknown(v)) {
    if (f.followersMax > 0 && v.followers >= f.followersMax) return false
    // Either viral type is enough when both are ticked.
    if (f.smallBig || f.brokeOut) {
      const small = v.followers < SMALL_ACCOUNT && v.views >= SMALL_ACCOUNT_VIEWS
      const broke = v.views >= BROKE_OUT_TIMES * v.followers
      if (!((f.smallBig && small) || (f.brokeOut && broke))) return false
    }
  }
  return true
}

export function applyFilters(videos: Video[], f: ResultFilters): Video[] {
  return videos.filter((v) => passes(v, f))
}

// Picks or drops one type; the list keeps the fixed order of CONTENT_TYPES.
export function toggleType(f: ResultFilters, type: ContentType): ResultFilters {
  const on = f.types.includes(type)
  return { ...f, types: CONTENT_TYPES.filter((c) => (c === type ? !on : f.types.includes(c))) }
}

// How many videos each type has among those that pass every other filter (so the numbers show what picking it would give).
// Videos without a type are not counted.
export function typeCounts(videos: Video[], f: ResultFilters): Partial<Record<ContentType, number>> {
  const counts: Partial<Record<ContentType, number>> = {}
  for (const v of applyFilters(videos, { ...f, types: [] })) {
    if (v.contentType) counts[v.contentType] = (counts[v.contentType] ?? 0) + 1
  }
  return counts
}

// A filter that can be taken off with its own chip.
export type ActiveFilter = 'views' | 'followers' | 'smallBig' | 'brokeOut' | 'within' | 'length' | 'types'

export function activeFilters(f: ResultFilters): ActiveFilter[] {
  const out: ActiveFilter[] = []
  if (f.viewsMin > 0) out.push('views')
  if (f.followersMax > 0) out.push('followers')
  if (f.smallBig) out.push('smallBig')
  if (f.brokeOut) out.push('brokeOut')
  if (f.within > 0) out.push('within')
  if (f.length !== 'any') out.push('length')
  if (f.types.length > 0) out.push('types')
  return out
}

// True when this active filter is still at its default value (its chip says "default").
export function isDefaultFilter(which: ActiveFilter, f: ResultFilters): boolean {
  if (which === 'views') return f.viewsMin === DEFAULT_FILTERS.viewsMin
  if (which === 'followers') return f.followersMax === DEFAULT_FILTERS.followersMax
  return false
}

export function clearFilter(f: ResultFilters, which: ActiveFilter): ResultFilters {
  switch (which) {
    case 'views': return { ...f, viewsMin: 0 }
    case 'followers': return { ...f, followersMax: 0 }
    case 'smallBig': return { ...f, smallBig: false }
    case 'brokeOut': return { ...f, brokeOut: false }
    case 'within': return { ...f, within: 0 }
    case 'length': return { ...f, length: 'any' }
    case 'types': return { ...f, types: [] }
  }
}

// Fewer than this many matches and the screen offers to relax the views floor.
export const FEW_RESULTS = 3
export const RELAXED_VIEWS: ViewsMin = 500_000

export type Relax = { kind: 'views' } | { kind: 'clear' } | null

// What to suggest when the filters leave too little: drop to 500K+ views when the floor is above that,
// otherwise (or when it's already there) clear the rest. Nothing when no filter is on or enough remain.
export function relaxHint(kept: number, f: ResultFilters): Relax {
  if (kept >= FEW_RESULTS || activeFilters(f).length === 0) return null
  return f.viewsMin > RELAXED_VIEWS ? { kind: 'views' } : { kind: 'clear' }
}
