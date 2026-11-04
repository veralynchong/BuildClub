export type Platform = 'instagram' | 'tiktok' | 'youtube' | 'reddit' | 'x'

// What kind of video a search result is. Same list as backend/models.py (CONTENT_TYPES).
export const CONTENT_TYPES = [
  'street_interview', 'recipe_cooking', 'skit_comedy', 'review_taste_test', 'unboxing_product',
  'day_in_life_vlog', 'challenge', 'tutorial_tips', 'other',
] as const
export type ContentType = (typeof CONTENT_TYPES)[number]

export type Denominator = 'median' | 'followers'

// How a video's multiple was measured. All null on data written before the details were kept.
export interface Baseline {
  medianN: number | null
  baselineFrom: string | null
  baselineTo: string | null
  medianFetchedAt: number | null
  denominator: Denominator | null
}

export interface Video {
  id: string
  platform: Platform
  handle: string
  hook: string
  views: number
  followers: number
  // The account's usual (median) views per video. Outlier score = views / medianViews.
  // Null when we haven't fetched it (live results); the score then falls back to followers.
  medianViews: number | null
  daysAgo: number
  lengthSec: number
  shares: number
  // Instagram doesn't show saves publicly, so this can be null.
  saves: number | null
  formatId: string
  keywords: string[]
  // Live results only (real TikTok videos).
  live?: boolean
  url?: string
  thumbnail?: string
  caption?: string
  music?: string
  hashtags?: string[]
  // Reddit only: it shows no views, so `views` holds the upvotes (and medianViews the subreddit's usual upvotes).
  comments?: number
  // Live results only: the like and comment counts the search returned (comments above is Reddit-only), for re-checking.
  likes?: number
  commentCount?: number
  baseline?: Baseline
  // When this search fetched the video, in ms.
  fetchedAt?: number
  // True when the search result came from the cache.
  fromCache?: boolean
  // Sorted by the API after the search; missing until then, or when sorting failed.
  contentType?: ContentType
}

export type Framing = 'wide' | 'medium' | 'close_up' | 'extreme_close_up' | 'overhead' | 'pov'
export type Angle = 'eye_level' | 'high' | 'low' | 'top_down'
export type Movement = 'static' | 'pan' | 'tilt' | 'push_in' | 'handheld' | 'tracking'

export interface Shot {
  id?: string
  time: string
  shot: string
  text?: string
  // Camera direction and a one-line filming tip. Optional: older plans and breakdowns have none.
  framing?: Framing
  angle?: Angle
  movement?: Movement
  tip?: string
  // Script and storyboard (set once the shot is written and drawn; old plans have neither).
  line?: string
  frameImage?: string
  purpose?: 'hook' | 'body' | 'cta'
  // Up to 3 other lines the writer offered for this shot.
  options?: string[]
  // The user changed (or picked) the line, so a rewrite asks first.
  edited?: boolean
  // Hex colours read from the frame in the browser.
  palette?: string[]
  // The team's own photo or clip, added on the planning board. Optional: only board uploads have it.
  footage?: Footage
}

// A file uploaded on the planning board. Small images are kept as a data URL in `src`; anything bigger is only on
// the device that uploaded it (deviceOnly), found again by `key` while that browser tab stays open.
export interface Footage {
  key: string
  kind: 'image' | 'video'
  name: string
  src?: string
  deviceOnly?: boolean
}

// Where a shot sits on the planning board, in the same order as the plan's shots.
export interface BoardPos {
  x: number
  y: number
}

export type HookType = 'visual' | 'question_or_text' | 'rage_bait' | 'informative' | 'challenge' | 'other'
export type Emotion = 'curious' | 'excited' | 'craving' | 'funny' | 'angry_comment' | 'relatable'

export interface Format {
  id: string
  name: string
  // How people would search for it ("tofu desserts"). Used in search suggestions.
  short: string
  // Words that point a search at this format ("dessert", "taste test").
  tags: string[]
  // Who this format tends to work for. Used by audience search ("for busy mums").
  audiences: string[]
  summary: string
  why: {
    hook: string
    first3s: string
    length: string
    format: string
    sound: string
    // Added later; breakdowns saved before them lack all five.
    concept?: string
    hookType?: HookType
    scrollStopper?: string
    emotion?: Emotion
    saveReason?: string
  }
  shotList: Shot[]
  props: string[]
  needs: string[]
  // True once the AI has judged `needs`; before that an empty list means "not checked", not "nothing needed".
  needsKnown?: boolean
  // The key lines of a real video and the job each does (from its AI breakdown).
  lines?: Line[]
  // How hard it is for a typical client to film.
  effort: 'easy' | 'medium' | 'hard'
  editorNotes: string
}

export interface Line {
  time: string
  text: string
  role: 'hook' | 'setup' | 'proof' | 'payoff' | 'cta'
}

// A client's logo, font and colour for exported videos. logo is a file name served by /api/clients/:id/brand/logo.
export interface Brand {
  logo?: string | null
  font: 'Noto Sans TC'
  color?: string | null
}

export type KitKind = 'character' | 'product' | 'place' | 'style'

// One thing a client wants to look the same in every video: a person, a product, a place or a look.
export interface KitItem {
  id: string
  kind: KitKind
  name: string
  note: string
  images: string[]
  updatedAt: number // epoch ms
}

export interface Kit {
  items: KitItem[]
}

export interface Client {
  id: string
  name: string
  niche: string
  audience: string
  monthlyTarget: number
  // Starter searches shown on the search page for this client.
  examples: string[]
  // What the daily trend check searches for (first one is used). Optional so older saved clients still load.
  topics?: string[]
  // Things this client can't do, used for the "Can they film this?" check.
  cannot: string[]
  // Every approval and rejection for this client, oldest first. Optional so older saved clients still load.
  memory?: ClientEvent[]
  brand?: Brand
  kit?: Kit
}

export type IdeaStatus = 'saved' | 'waiting' | 'approved' | 'rejected'

// Who is signed in. Staff are team members or the manager; only the manager can approve or send back plans.
// A client account sees its own plans, read-only. Demo only: picked at login, nothing is checked.
export type Role = 'member' | 'manager' | 'client'

export interface AgencySettings {
  agencyName: string
  // The person who approves plans, shown wherever the UI says who reviews ("Waiting for Annie").
  managerName: string
}

// One manager decision, kept on the client so Remake remembers what each client likes and dislikes.
export interface ClientEvent {
  ideaId: string
  kind: 'approved' | 'approved-with-changes' | 'sent-back'
  reason?: string
  at: number
  // The preset reasons the approver ticked when sending a plan back.
  tags?: string[]
}

// One answer from the approver on a plan, kept in SavedIdea.history (oldest first) so a resend still shows why it was sent back.
export interface Decision {
  decision: 'approved' | 'rejected'
  reason?: string
  tags?: string[]
  decidedAt: number
}

export type Stage = 'approved' | 'filming' | 'editing' | 'posted'

export interface SavedIdea {
  id: string
  videoId: string
  clientId: string
  status: IdeaStatus
  dueDate: string
  // Notes for the editor, used once the idea is approved.
  notes: string
  // The client's own version of the shot list. Starts as a copy of the reference format's shots.
  shots?: Shot[]
  // Short pitch shown to the approver with the plan.
  noteToApprover?: string
  sentAt?: number
  rejectReason?: string
  // The preset reasons ticked when the plan was sent back.
  rejectTags?: string[]
  // When the approver last answered. The API keeps the newer of this and sentAt.
  decidedAt?: number
  // Every answer so far, oldest first. Only grows; the API keeps the longer copy.
  history?: Decision[]
  // Production stage of an approved plan; none means ready to film. The API drops it on any other status.
  stage?: Stage
  // When it moved to "posted"; kept only while posted.
  postedAt?: number
  // Set when the manager decides.
  approvedAt?: number
  // "Approve with changes": what the manager wants changed.
  managerNote?: string
  // The manager's comment per shot, keyed by shot index.
  shotComments?: Record<number, string>
  // When the plan last changed. The API sets it on save; the board's "Stuck" flag reads it. Old plans have none.
  updatedAt?: number
  // Planning board: each shot's place on the canvas, in shot order. Missing or out of date means "lay them out".
  boardLayout?: BoardPos[]
}
