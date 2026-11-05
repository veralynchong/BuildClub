import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AgencySettings, ClientEvent, IdeaStatus, Role, SavedIdea } from './types'
import { approverNote } from './lib/approverNote'
import { clients as sampleClients, formats, sampleIdeas, videos } from './data/sample'
import { formatTrend, groupFailures, hasDate, outlierScore, platformList, platformName, stageOrder, viewsPerDay, viewsPerFollower } from './lib/metrics'
import { defaultAgency, defaultQuery, inTwoWeeks, useResearch, useResearchSlots, useSavedIdeas, useStored } from './state'
import type { Query, Sort, Workspace } from './state'
import { SearchScreen } from './components/SearchScreen'
import { ResultsScreen } from './components/ResultsScreen'
import { PatternStrip } from './components/PatternStrip'
import type { Chip } from './components/ResultsScreen'
import { interpretMedia, matchesKeyword, parseQuery } from './lib/parseQuery'
import type { Interpretation, MediaSource } from './lib/parseQuery'
import { LikeThisCard } from './components/LikeThisCard'
import { ReadingOverlay } from './components/ReadingOverlay'
import { buildAnswer } from './lib/answer'
import type { Answer } from './lib/answer'
import { BreakdownPanel } from './components/BreakdownPanel'
import { COHORT_PLATFORMS, cohortsByPattern, cohortsByVideo, fillBaseline } from './lib/evidence'
import { PlanScreen } from './components/PlanScreen'
import { fillShotIds } from './lib/storyboard'
import { Sidebar } from './components/Sidebar'
import type { View } from './components/Sidebar'
import { OverviewScreen } from './components/OverviewScreen'
import { ReviewScreen } from './components/ReviewScreen'
// stream C: decisions and client memory
import { applyDecision, type Decision } from './lib/memory'
import { SettingsScreen } from './components/SettingsScreen'
import { PreferencesScreen } from './components/PreferencesScreen'
import { ChannelScreen } from './components/ChannelScreen'
import { LoginScreen } from './components/LoginScreen'
import { LandingAltitude } from './components/landing/LandingAltitude'
import type { Client, ContentType, Format, Platform, Shot, Video } from './types'
import {
  analyzeVideo,
  applyBreakdown,
  askAnswer,
  checkDemo,
  checkLive,
  checkNeeds,
  findPatterns,
  likeImage,
  likeVideo,
  loadIdeas,
  loadLibrary,
  loadList,
  IdeasConflict,
  SaveError,
  saveIdeas,
  saveLibrary,
  saveList,
  searchAll,
  fetchContentTypes,
  searchLive,
} from './lib/live'
import { buildChipGroups, clientTopic, pulseFrom } from './lib/clientChips'
import type { Pulse } from './lib/clientChips'
import { isOnSearchPage } from './lib/searchStatus'
import { useSearchResolve } from './lib/useSearchResolve'
import { LiveLoading } from './components/LiveLoading'
import { SearchToast, type SearchNotice } from './components/SearchToast'
import { SavedToast } from './components/find/SavedStrip'
import { SEARCH_RUNS_KEY, cleanRuns, recentSearches, recordSearch, runFor, savedByVideo, typeAhead } from './lib/findDesk'
import type { RecentRow, SearchRun } from './lib/findDesk'
import { suggest } from './lib/suggest'
import { withScreenTransition } from './lib/motion'
import { htmlLang, readLang, setActiveLang, t, writeLang } from './lib/i18n'
import type { Key, Lang, Vars } from './lib/i18n'
import { AppContext } from './lib/appContext'
import type { AppContextValue } from './lib/appContext'
import { ShortlistBoard } from './components/ShortlistBoard'
import { CanvasPick } from './components/CanvasPick'
import { BoardPick } from './components/BoardPick'
import { boardPlans } from './lib/canvasPick'
import type { CanvasContext as CanvasResource, Workspace as CanvasWorkspace } from './lib/canvas/resource'
import { hasMissingLegacyPlan } from './lib/canvas/resource'
import { readFullscreen, writeFullscreen } from './lib/canvas/shell'
import { planName } from './components/plans/moves'
import { AddClientScreen } from './components/AddClientScreen'
import { logout, me, type Account } from './lib/auth'
import { nextView, onUnauthorized } from './lib/authGate'
import { markMigrated, pickInitialIdeas, wasMigrated } from './lib/migrateLocal'
import { applyDraft, keepUnsavedDraft, rebaseIdeas, sameIdeaList, withoutSamples } from './lib/ideasSync'

// Where the user was when the session ended, so signing back in returns there (also after a reload).
const RETURN_KEY = 'remake.return-to.v1'
// Edits not yet on the server when the session ended, kept so a reload before signing back in doesn't lose them.
const DRAFT_KEY = 'remake.draft-ideas.v1'
interface ReturnTo {
  view: View
  workspace: Workspace
  planIdeaId: string | null
}
import { ClientHome } from './components/ClientHome'
import { ResearchScreen } from './components/research/ResearchScreen'
import type { RowPick } from './components/research/ResearchScreen'
import { SaveToVideo } from './components/research/SaveToVideo'
import { entryFromVideo, newSlot, planDueDate, planHasWork, planOf, researchId, researchStatus, slotSummary, videoFromLink, withPlanRows } from './lib/research'
import type { LinkInput, ResearchEntry } from './lib/research'

// The platforms Find ideas can search, offered by Research's "Add from link".
const SEARCH_PLATFORMS: Platform[] = ['tiktok', 'instagram', 'youtube', 'reddit', 'x']

const sorters: Record<Sort, (a: (typeof videos)[number], b: (typeof videos)[number]) => number> = {
  outlier: (a, b) => outlierScore(b) - outlierScore(a),
  views: (a, b) => b.views - a.views,
  ratio: (a, b) => viewsPerFollower(b) - viewsPerFollower(a),
  newest: (a, b) => a.daysAgo - b.daysAgo,
  fastest: (a, b) => viewsPerDay(b) - viewsPerDay(a),
}

// Stands in for the selected client while there are none (a real-mode account that hasn't added one yet).
const NO_CLIENT: Client = { id: '', name: '', niche: '', audience: '', monthlyTarget: 0, examples: [], cannot: [] }
const VIEW_KEY = 'remake.view.v1'
// The planning board brings in React Flow, so it loads only when opened.
const ShotBoard = lazy(() => import('./components/board/ShotBoard').then((m) => ({ default: m.ShotBoard })))

// The tab to open on a refresh: the one saved for this browser tab, if it still makes sense.
// Results, a plan and Review need state that isn't saved, so they fall back to Find ideas or Plans.
function restoreTab(workspace: Workspace): View {
  let saved: string | null = null
  try {
    saved = sessionStorage.getItem(VIEW_KEY)
  } catch {
    // Storage blocked: use the default.
  }
  if (workspace === 'all') return 'overview'
  if (saved === 'results') return 'search'
  if (saved === 'plan' || saved === 'canvas' || saved === 'board' || saved === 'review') return 'shortlist'
  if (saved === 'home' || saved === 'search' || saved === 'research' || saved === 'shortlist' || saved === 'settings' || saved === 'boardPick') return saved
  return 'search'
}

const CanvasScreen = lazy(() => import('./components/canvas/CanvasScreen'))

export default function App() {
  const [signedIn, setSignedIn] = useStored('trend-finder.signed-in', false)
  const [clients, setClients] = useStored<Client[]>('trend-finder.clients.v3', sampleClients)
  const [agency, setAgencyRaw] = useStored<AgencySettings>('remake.agency.v1', defaultAgency)
  const [role, setRole] = useStored<Role>('remake.role.v2', 'manager')
  // Signed-in users can view the public landing page via the sidebar logo; its buttons lead back into the app.
  const [showLanding, setShowLanding] = useState(false)
  const [lang, setLangState] = useState<Lang>(() => readLang())
  const setLang = useCallback((l: Lang) => {
    writeLang(l)
    setLangState(l)
  }, [])
  const [workspace, setWorkspaceRaw] = useStored<Workspace>('trend-finder.workspace.v2', sampleClients[0].id)
  // The last client worked on. Log-in reopens it; empty means a first-ever log-in. Visiting All clients keeps it.
  const [lastClient, setLastClient] = useStored<string | null>('remake.last-client.v1', null)
  // A refresh keeps the same tab (this browser tab only). Screens that need state that isn't saved fall back.
  const [view, setViewRaw] = useState<View>(() => restoreTab(workspace))
  // Every screen change goes through here, so it cross-fades (View Transitions) where supported.
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  }, [view])
  const canvasLeaveGuard = useRef<(() => Promise<boolean>) | null>(null)
  const registerCanvasLeaveGuard = useCallback((guard: () => Promise<boolean>) => {
    canvasLeaveGuard.current = guard
    return () => { if (canvasLeaveGuard.current === guard) canvasLeaveGuard.current = null }
  }, [])
  const withCanvasLeave = useCallback((apply: () => void) => {
    const guard = viewRef.current === 'canvas' ? canvasLeaveGuard.current : null
    if (guard) void guard().then((ok) => { if (ok) apply() })
    else apply()
  }, [])
  const setView = useCallback((next: View) => {
    const apply = () => {
      if (next === viewRef.current) return setViewRaw(next)
      withScreenTransition(() => setViewRaw(next))
    }
    if (next !== 'canvas') withCanvasLeave(apply)
    else apply()
  }, [withCanvasLeave])
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState<Query>(defaultQuery)
  const [sort, setSort] = useState<Sort>('outlier')
  const [formatFilter, setFormatFilter] = useState<string | null>(null)
  const [openVideoId, setOpenVideoId] = useState<string | null>(null)
  // Save to Research waiting on "Which video is this for?". `onSaved` runs only once it's saved (not on Cancel).
  // Research opens with this row in view (from Find ideas' "Open in Research").
  const [researchFocus, setResearchFocus] = useState<string | null>(null)
  // `move`: the video is already saved; picking a video re-files it (the saved toast's Change).
  const [pendingSave, setPendingSave] = useState<{ videoId: string; onSaved?: () => void; move?: boolean } | null>(null)
  const [planIdeaId, setPlanIdeaId] = useState<string | null>(null)
  const [canvasFull, setCanvasFull] = useState(readFullscreen)
  const setFull = (on: boolean) => {
    setCanvasFull(on)
    writeFullscreen(on)
  }
  const [canvasContext, setCanvasContext] = useState<CanvasResource | null>(null)
  const openWorkspace = (workspace: CanvasWorkspace) => {
    setCanvasContext({ resource: { kind: 'workspace', id: workspace.id }, clientId: workspace.clientId, title: workspace.title, readOnly: false, shots: [] })
    setCanvasEditor(false)
    setView('canvas')
  }
  const [canvasEditor, setCanvasEditor] = useState(false) // the canvas opens with the editor showing
  // The screen a plan was opened from, so Back returns there.
  const [planFrom, setPlanFrom] = useState<View>('results')
  // The stage a Home pipeline chip asked Plans to scroll to.
  const [boardFocus, setBoardFocus] = useState<IdeaStatus | null>(null)
  const clearBoardFocus = useCallback(() => setBoardFocus(null), [])
  // The last search per client that produced results, so Find ideas can offer a way back to it.
  const [lastSearches, setLastSearches] = useState<Record<string, string>>({})
  // Where Review and Add client were opened from, so Back and Cancel return there.
  const [reviewFrom, setReviewFrom] = useState<View>('shortlist')
  const [addFrom, setAddFrom] = useState<View>('overview')
  // After signing out, the log-in form opens straight away instead of the landing page.
  const [signedOut, setSignedOut] = useState(false)
  // Which client and search the results screen currently shows, so "Back to results" knows if it must search again.
  const [shownSearch, setShownSearch] = useState<string | null>(null)
  const [ideas, setIdeas] = useSavedIdeas()
  // Find ideas' recent searches (this browser only): each search with the videos it found, to say what's new.
  const [searchRunsRaw, setSearchRuns] = useStored<SearchRun[]>(SEARCH_RUNS_KEY, [])
  const searchRuns = useMemo(() => cleanRuns(searchRunsRaw), [searchRunsRaw])
  // A search whose results just went on screen, recorded once the results are worked out (see the effect below).
  const [toRecord, setToRecord] = useState<{ clientId: string; text: string; platforms: Platform[] } | null>(null)
  // The last save from Find ideas, for the "Saved to Video 2" toast with Change and Undo.
  const [savedNote, setSavedNote] = useState<{ videoId: string } | null>(null)
  const dismissSaved = useCallback(() => setSavedNote(null), [])
  // The Research tab's rows (reference videos), every client's. Find ideas saves here; "Plan it" makes a plan.
  const [research, setResearch] = useResearch()
  const [researchSlots, setResearchSlots] = useResearchSlots()
  const researchNow = useRef(research)
  useEffect(() => {
    researchNow.current = research
  }, [research])

  // 'open' = the API has no accounts (demo sign-in above); otherwise the API's session decides.
  const [auth, setAuth] = useState<'checking' | 'open' | 'signed-out' | 'signed-in'>('checking')
  const [account, setAccount] = useState<Account | null>(null)
  const returnTo = useRef<ReturnTo | null>(null)
  const keepDraft = useRef<() => void>(() => {})
  const restoreView = useCallback(() => {
    let back = returnTo.current
    if (!back) {
      try {
        const raw = sessionStorage.getItem(RETURN_KEY)
        back = raw ? (JSON.parse(raw) as ReturnTo) : null
      } catch {
        back = null
      }
    }
    returnTo.current = null
    try {
      sessionStorage.removeItem(RETURN_KEY)
    } catch {
      // Nothing stored to clear.
    }
    if (!back) return false
    setWorkspaceRaw(back.workspace)
    setViewRaw(back.view)
    setPlanIdeaId(back.planIdeaId)
    return true
  }, [setWorkspaceRaw])
  useEffect(() => {
    me().then((a) => {
      setAuth(a.kind)
      setAccount(a.kind === 'signed-in' ? a.account : null)
      if (a.kind === 'signed-in') restoreView()
    })
  }, [restoreView])
  // Any API call answered 401 means the session ended: remember the screen and go to the sign-in page.
  const here = useRef({ view, workspace, planIdeaId })
  useEffect(() => {
    here.current = { view, workspace, planIdeaId }
  }, [view, workspace, planIdeaId])
  const authNow = useRef(auth)
  useEffect(() => {
    authNow.current = auth
  }, [auth])
  useEffect(() => {
    onUnauthorized(() => {
      // Only a signed-in session can end; a 401 on the sign-in page (e.g. the landing page's example search) is normal.
      if (authNow.current !== 'signed-in') return
      returnTo.current = here.current
      keepDraft.current()
      try {
        sessionStorage.setItem(RETURN_KEY, JSON.stringify(here.current))
      } catch {
        // Without storage the screen is still kept while this tab stays open.
      }
      setAuth((a) => (a === 'signed-in' ? 'signed-out' : a))
    })
  }, [])

  // Live mode: real TikTok, Instagram, YouTube, Reddit or X search through the local API (npm run api). Without it, the app uses sample data.
  const [live, setLive] = useState(false)
  const [liveStore, setLiveStore] = useStored<{ videos: Video[]; formats: Format[] }>('trend-finder.live-store.v1', {
    videos: [],
    formats: [],
  })
  const [liveResults, setLiveResults] = useState<Video[]>([])
  const [liveQuery, setLiveQuery] = useState('')
  // The written answer to the latest live search; null while it is being written or if that failed.
  const [liveAnswer, setLiveAnswer] = useState<Answer | null>(null)
  // The one search running in the background, and the client it belongs to.
  const [searching, setSearching] = useState<{ q: string; platforms: Platform[]; step?: string; clientId: string; startedAt: number } | null>(null)
  // What a search that finished while the person was elsewhere leaves behind (shown as a toast).
  const [notice, setNotice] = useState<SearchNotice | null>(null)
  const searchSeq = useRef(0)
  // A search whose account medians (each account's usual views) are still being fetched.
  const [scoring, setScoring] = useState<string | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  // Platforms that failed or returned nothing in the last search, shown above the results.
  const [searchEmpty, setSearchEmpty] = useState<Platform[]>([])
  const [searchFailed, setSearchFailed] = useState<{ platform: Platform; message: string }[]>([])
  const [patternFilter, setPatternFilter] = useState<string | null>(null)

  // Daily live trend check per client, which powers the "Trending now" chips on the search page.
  const [pulses, setPulses] = useStored<Record<string, Pulse>>('trend-finder.pulse.v1', {})
  const [pulseLoading, setPulseLoading] = useState<string | null>(null)
  const [pulseError, setPulseError] = useState<string | null>(null)
  const pulseTried = useRef(new Set<string>())

  useEffect(() => {
    checkLive().then((ok) => {
      setLive(ok)
      // TikTok's top results are often older, so live search starts with no date limit.
      if (ok) setQuery((q) => ({ ...q, days: 3650 }))
    })
  }, [])

  // The API keeps clients, saved ideas and the videos behind them. Its copy wins on load; after that every
  // change is saved back. Only the first load can move this browser's older ideas up (see migrateLocal).
  const access = auth === 'open' || auth === 'signed-in'
  const [synced, setSynced] = useState(false)
  const [syncProblem, setSyncProblem] = useState<{ key: Key; vars?: Vars } | null>(null)
  // Bumped by Retry and after signing back in, so every save effect looks again for changes the API doesn't hold.
  const [retryTick, setRetryTick] = useState(0)
  const saveFailed = useCallback((what: 'clients' | 'ideas' | 'videos', e: unknown) => {
    // A 401 sends the user to the sign-in page; the save is tried again after that.
    if (e instanceof SaveError && e.status === 401) return
    setSyncProblem({ key: `shell.sync.save.${what}` })
  }, [])
  const saved = useCallback(() => setSyncProblem(null), [])
  // The ideas list is saved one request at a time, each with the revision the last one returned.
  const ideasRev = useRef<string | null>(null)
  const ideasQueue = useRef<Promise<unknown>>(Promise.resolve())
  const ideasGen = useRef(0)
  // What the API already holds, so the copy just loaded from it isn't written straight back.
  const onServer = useRef<{ clients: Client[] | null; ideas: SavedIdea[] | null; library: string | null }>({
    clients: null,
    ideas: null,
    library: null,
  })
  const clientsNow = useRef(clients)
  useEffect(() => {
    clientsNow.current = clients
  }, [clients])
  const ideasNow = useRef(ideas)
  useEffect(() => {
    ideasNow.current = ideas
  }, [ideas])
  // The list the API last acknowledged. onServer.ideas is set before a save is sent, so it can't tell what a
  // 401 on that save leaves unsaved.
  const confirmedIdeas = useRef<SavedIdea[] | null>(null)
  useEffect(() => {
    keepDraft.current = () => keepUnsavedDraft(confirmedIdeas.current, ideasNow.current, DRAFT_KEY, sessionStorage)
  }, [])
  useEffect(() => {
    if (!live || !access || synced) return
    Promise.all([loadList<Client>('clients'), loadIdeas(), loadLibrary().catch(() => null), checkDemo()])
      .then(async ([savedClients, loadedIdeas, library, demo]) => {
        if (library) {
          // Add the saved videos this browser hasn't seen; its own copies stay as they are.
          setLiveStore((prev) => {
            const add = <T extends { id: string }>(mine: T[], theirs: T[]) => {
              const ids = new Set(mine.map((x) => x.id))
              return [...mine, ...theirs.filter((x) => !ids.has(x.id))]
            }
            return { videos: add(prev.videos, library.videos), formats: add(prev.formats, library.formats) }
          })
          onServer.current.library = libraryKey(library)
        }
        if (savedClients?.length) {
          setClients(savedClients)
          onServer.current.clients = savedClients
        } else if (!demo) {
          // Nothing saved yet: keep this browser's own clients, but never the built-in samples (they would be
          // saved to the API as if they were real). The effect below saves what is left.
          setClients((prev) => withoutSamples(prev, sampleClients))
          if (withoutSamples(clientsNow.current, sampleClients).length === 0) {
            setWorkspaceRaw('all')
            setViewRaw('overview')
          }
        }
        const sampleIds = new Set(sampleIdeas.map((i) => i.id))
        const local = ideasNow.current.filter((i) => i.savedInLive === true || !sampleIds.has(i.id))
        const pick = pickInitialIdeas(loadedIdeas.items, local, wasMigrated())
        let rev = loadedIdeas.rev
        let held = loadedIdeas.items ?? []
        if (pick.upload) {
          const res = await saveIdeas(pick.ideas, rev)
          rev = res.rev
          held = res.items
        }
        let draft: SavedIdea[] | null = null
        try {
          const raw = sessionStorage.getItem(DRAFT_KEY)
          draft = raw ? (JSON.parse(raw) as SavedIdea[]) : null
          sessionStorage.removeItem(DRAFT_KEY)
        } catch {
          draft = null
        }
        const shown = draft?.length ? applyDraft(held, draft) : held
        // When the shown list is the held one, keep the very same object so nothing is saved back.
        onServer.current.ideas = held
        confirmedIdeas.current = held
        setIdeas(shown)
        ideasRev.current = rev
        markMigrated()
        setSynced(true)
      })
      .catch((e) => {
        if (!(e instanceof SaveError && e.status === 401))
          setSyncProblem({ key: 'shell.sync.load' })
      })
  }, [live, access, synced, setClients, setIdeas, setLiveStore, setWorkspaceRaw])
  useEffect(() => {
    if (!synced || clients === onServer.current.clients) return
    const prev = onServer.current.clients
    onServer.current.clients = clients
    saveList('clients', clients)
      .then(saved)
      .catch((e) => {
        if (onServer.current.clients === clients) onServer.current.clients = prev // so Retry sends it again
        saveFailed('clients', e)
      })
  }, [synced, clients, retryTick, saved, saveFailed])
  useEffect(() => {
    if (!synced || ideas === onServer.current.ideas) return
    const prev = onServer.current.ideas
    onServer.current.ideas = ideas
    const gen = ideasGen.current
    ideasQueue.current = ideasQueue.current
      .then(async () => {
        if (gen !== ideasGen.current) return // a newer list arrived from the API since this edit
        let attempt = ideas
        let base = prev ?? []
        for (let tries = 0; ; tries++) {
          try {
            const res = await saveIdeas(attempt, ideasRev.current)
            ideasRev.current = res.rev
            confirmedIdeas.current = res.items
            // The API may have kept a newer answer from the approver than the one sent.
            if (!sameIdeaList(res.items, attempt)) {
              attempt = res.items
              onServer.current.ideas = res.items
            }
            break
          } catch (e) {
            if (!(e instanceof IdeasConflict) || tries >= 3) throw e
            // Another tab saved first: take its list, put this edit on top, and save again.
            ideasGen.current += 1
            ideasRev.current = e.rev
            confirmedIdeas.current = e.items
            const merged = rebaseIdeas(base, attempt, e.items)
            base = e.items
            attempt = merged
            onServer.current.ideas = merged
            setSyncProblem({ key: 'shell.sync.conflict' })
          }
        }
        if (attempt !== ideas) {
          // Show the merged list, keeping anything edited since; the effect saves that remainder.
          const final = attempt
          setIdeas((cur) => (cur === ideas ? final : rebaseIdeas(ideas, cur, final)))
        } else saved()
      })
      .catch((e) => {
        if (onServer.current.ideas === ideas) onServer.current.ideas = prev // so Retry sends it again
        saveFailed('ideas', e)
      })
  }, [synced, ideas, retryTick, setIdeas, saved, saveFailed])
  // The approver answers on their own page, so coming back to this tab picks up their decisions. Only when
  // everything here is already saved: an unsaved edit is never replaced.
  useEffect(() => {
    if (!synced) return
    const refresh = () => {
      if (document.visibilityState !== 'visible' || ideas !== onServer.current.ideas) return
      loadIdeas()
        .then((fresh) => {
          if (!fresh.items || fresh.rev === ideasRev.current || ideasNow.current !== onServer.current.ideas) return
          ideasGen.current += 1
          ideasRev.current = fresh.rev
          onServer.current.ideas = fresh.items
          confirmedIdeas.current = fresh.items
          setIdeas(fresh.items)
        })
        .catch(() => {
          // The next visit tries again.
        })
    }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [synced, ideas, setIdeas])
  // The videos and breakdowns behind saved ideas, kept on the API like the ideas themselves.
  const library = useMemo(() => {
    const ids = new Set(ideas.map((i) => i.videoId))
    const savedVideos = liveStore.videos.filter((v) => ids.has(v.id))
    const formatIds = new Set(savedVideos.map((v) => v.formatId))
    return { videos: savedVideos, formats: liveStore.formats.filter((f) => formatIds.has(f.id)) }
  }, [ideas, liveStore])
  useEffect(() => {
    if (!synced) return
    const key = libraryKey(library)
    if (key === onServer.current.library) return
    const prev = onServer.current.library
    onServer.current.library = key
    saveLibrary(library)
      .then(saved)
      .catch((e) => {
        if (onServer.current.library === key) onServer.current.library = prev
        saveFailed('videos', e)
      })
  }, [synced, library, retryTick, saved, saveFailed])

  // Each screen starts at the top, like a new page. The tab is remembered for a refresh.
  useEffect(() => {
    window.scrollTo(0, 0)
    try {
      sessionStorage.setItem(VIEW_KEY, view)
    } catch {
      // Storage blocked: a refresh just opens the default tab.
    }
  }, [view])

  // Inside a client, everything (saving, fit checks, plans) is for that client.
  const client = clients.find((c) => c.id === workspace) ?? clients[0] ?? NO_CLIENT

  const lastSearch = workspace === 'all' ? null : (lastSearches[workspace] ?? null)

  // Opens a client's workspace. Picking a client starts on Find ideas; Home is one click away.
  const enterClient = (id: string, to: View = 'search') => withCanvasLeave(() => {
    setWorkspaceRaw(id)
    setLastClient(id)
    setOpenVideoId(null)
    // The search box shows this client's own last search, not the previous client's.
    setQuery((q) => ({ ...q, keyword: lastSearches[id] ?? '' }))
    withScreenTransition(() => setViewRaw(to))
  })

  const setWorkspace = (w: Workspace) => {
    if (w !== 'all') return enterClient(w)
    withCanvasLeave(() => {
      setWorkspaceRaw('all')
      setOpenVideoId(null)
      withScreenTransition(() => setViewRaw('overview'))
    })
  }

  // A remembered client that no longer exists: go to All clients instead of showing a different client.
  const clientMissing = workspace !== 'all' && !clients.some((c) => c.id === workspace)
  useEffect(() => {
    if (!clientMissing) return
    setWorkspaceRaw('all')
    setViewRaw('overview')
  }, [clientMissing, setWorkspaceRaw])

  const updateClient = (patch: Partial<Client>) =>
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, ...patch } : c)))
  const videoById = useMemo(
    () => new Map([...videos, ...liveStore.videos].map((v) => [v.id, v])),
    [liveStore.videos],
  )

  // Every plan has a Research row, so the sheet always includes what the team is making. withPlanRows returns
  // the same array when nothing is missing, so this settles after one pass.
  useEffect(() => {
    setResearch((prev) => withPlanRows(prev, ideas, videoById))
  }, [ideas, videoById, setResearch])

  const [interp, setInterp] = useState<Interpretation>(() => parseQuery('tofu', formats))
  const formatById = useMemo(
    () => new Map([...formats, ...liveStore.formats].map((f) => [f.id, f])),
    [liveStore.formats],
  )

  // Turn the search box text into filters. Anything the text mentions (time, platform, length)
  // overrides the dropdowns; everything else keeps its current value.
  const [reading, setReading] = useState<MediaSource | null>(null)

  // A failed search says so where the person is: inline on that client's search page, otherwise as a toast.
  const failSearch = (clientId: string, message: string) => {
    const at = here.current
    if (isOnSearchPage(at, clientId)) setSearchError(message)
    else setNotice({ kind: 'error', message })
  }

  // A pasted link: read the real video, then search for its first keyword.
  const runLinkSearch = async (text: string) => {
    const url = text.match(/https?:\/\/\S+/)?.[0] ?? text
    const source = interpretMedia(url, null, formats)?.source ?? null
    const seq = ++searchSeq.current
    setSearchError(null)
    setSearching({ q: url, platforms: [], step: t('shell.search.readingVideo'), clientId: client.id, startedAt: Date.now() })
    let like
    try {
      like = await likeVideo(url, (step) => {
        if (seq === searchSeq.current) setSearching((s) => (s ? { ...s, step: step || s.step } : s))
      })
    } catch (e) {
      if (seq !== searchSeq.current) return
      setSearching(null)
      failSearch(client.id, e instanceof Error ? e.message : t('shell.search.linkFailed'))
      return
    }
    if (seq !== searchSeq.current) return
    const format = applyBreakdown(
      { id: `like-${url}`, name: like.formatName, short: like.formatName, tags: [], audiences: [], summary: '', why: like.breakdown.why,
        shotList: [], props: [], needs: [], effort: 'medium', editorNotes: '' },
      like.breakdown,
    )
    setLiveStore((prev) => ({ ...prev, formats: [format, ...prev.formats.filter((f) => f.id !== format.id)] }))
    setSearching(null)
    await runLiveSearch(like.keywords[0], source ? { source, formatId: format.id } : undefined)
  }

  // An uploaded screenshot: the AI says what it shows, then we search for its first keyword.
  const runImageSearch = async (file: File) => {
    const seq = ++searchSeq.current
    const previewUrl = URL.createObjectURL(file)
    setSearchError(null)
    setSearching({ q: file.name, platforms: [], step: t('shell.search.readingImage'), clientId: client.id, startedAt: Date.now() })
    let like
    try {
      like = await likeImage(file)
    } catch (e) {
      if (seq !== searchSeq.current) return
      setSearching(null)
      failSearch(client.id, e instanceof Error ? e.message : t('shell.search.imageFailed'))
      return
    }
    if (seq !== searchSeq.current) return
    const source = interpretMedia('', { name: file.name, url: previewUrl }, formats)?.source ?? null
    const format: Format = {
      id: `like-image-${file.name}`, name: like.formatName, short: like.formatName, tags: [], audiences: [],
      summary: like.description,
      why: { hook: '', first3s: '', length: '', format: like.formatName, sound: '' },
      shotList: [], props: [], needs: [], effort: 'medium', editorNotes: '',
    }
    setLiveStore((prev) => ({ ...prev, formats: [format, ...prev.formats.filter((f) => f.id !== format.id)] }))
    setSearching(null)
    await runLiveSearch(like.keywords[0], source ? { source, formatId: format.id } : undefined)
  }

  const runLiveSearch = async (text: string, like?: { source: MediaSource; formatId: string }, usePlatforms?: Platform[]) => {
    if (!like && /https?:\/\//.test(text)) {
      void runLinkSearch(text)
      return
    }
    const parsed = parseQuery(text, formats)
    // Send the platform the meaningful words; time, platform and length words become filters instead.
    const q = ([...parsed.keywords, ...parsed.topics.map((t) => t.word)].join(' ') || text).trim()
    // Platforms named in the text ("on instagram") win over the toggles.
    const platforms = parsed.platforms?.length ? parsed.platforms : (usePlatforms ?? query.platforms)
    if (!q) return
    const seq = ++searchSeq.current
    setSearchError(null)
    setNotice(null)
    setSearching({ q, platforms, clientId: client.id, startedAt: Date.now() })
    try {
      const res = await searchAll(q, platforms)
      // A newer search has started since; its results win.
      if (seq !== searchSeq.current) return
      // Every platform failed: nothing to show, so it is an error.
      if (res.failed.length === platforms.length) {
        throw new Error(groupFailures(res.failed).map((g) => `${platformList(g.platforms)}: ${g.message}`).join(' '))
      }
      setSearchFailed(res.failed)
      setSearchEmpty(res.empty)
      setLiveStore((prev) => {
        // Videos in a Research row (and their formats) are never trimmed, so a row can still be planned later.
        const pinnedVideos = new Set(researchNow.current.map((e) => e.videoId))
        const pinnedFormats = new Set(prev.videos.filter((v) => pinnedVideos.has(v.id)).map((v) => v.formatId))
        const keep = (list: { id: string }[], add: { id: string }[], pinned: Set<string>) => {
          const ids = new Set(add.map((x) => x.id))
          const all = [...add, ...list.filter((x) => !ids.has(x.id))]
          return [...all.slice(0, 600), ...all.slice(600).filter((x) => pinned.has(x.id))]
        }
        // A repeat search brings placeholder formats; keep the AI breakdown of any video already broken down.
        const broken = new Map(prev.formats.filter((f) => f.shotList.length).map((f) => [f.id, f]))
        const formats = res.formats.map((f) => broken.get(f.id) ?? f)
        return {
          videos: keep(prev.videos, res.videos, pinnedVideos) as Video[],
          formats: keep(prev.formats, formats, pinnedFormats) as Format[],
        }
      })
      // Sort the results by content type in the background; a failure leaves them without types.
      const typed = fetchContentTypes(q, platforms)
      const applyTypes = (types: Map<string, ContentType>) => {
        if (types.size === 0) return
        const tag = (v: Video) => (types.has(v.id) ? { ...v, contentType: types.get(v.id) } : v)
        setLiveStore((prev) => ({ ...prev, videos: prev.videos.map(tag) }))
        setLiveResults((prev) => prev.map(tag))
      }
      void typed.then(applyTypes)
      // The results screen takes over only if the person is on this client's search page; otherwise a toast offers them.
      const show = () => {
        setLiveResults(res.videos)
        setLiveQuery(q)
        void typed.then(applyTypes)
        // One answer per search, from the videos it found. A failure just means no answer block.
        setLiveAnswer(null)
        if (res.videos.length) {
          askAnswer(text, res.videos)
            .then((a) => {
              if (seq === searchSeq.current) setLiveAnswer(a)
            })
            .catch(() => {})
        }
        setInterp({
          ...parsed, text, keywords: [q], topics: like ? [{ formatId: like.formatId, word: 'this video' }] : [],
          audience: null, isQuestion: false, source: like?.source ?? null,
        })
        setQuery((qq) => ({ ...qq, keyword: text, platforms, days: parsed.days ?? qq.days, maxLength: parsed.maxLength ?? qq.maxLength }))
        setPatternFilter(null)
        setFormatFilter(null)
        setLastSearches((prev) => ({ ...prev, [client.id]: text }))
        setShownSearch(`${client.id}|${text}`)
        // Searches started from a link or screenshot can't be run again from words alone, so they aren't listed.
        if (!like) setToRecord({ clientId: client.id, text, platforms })
        if (res.pending.length) void fillScores(q, res.pending)
        setView('results')
      }
      const at = here.current
      if (isOnSearchPage(at, client.id)) show()
      else
        setNotice({
          kind: 'ready',
          q,
          onView: () => {
            setNotice(null)
            if (here.current.workspace !== client.id) enterClient(client.id, 'results')
            show()
          },
        })
    } catch (e) {
      if (seq !== searchSeq.current) return
      failSearch(client.id, e instanceof Error ? e.message : t('shell.search.failed'))
    } finally {
      if (seq === searchSeq.current) setSearching(null)
    }
  }

  // Poll each platform's saved (free) search until its account medians are in, then update the scores in place.
  const fillScores = async (q: string, platforms: Platform[]) => {
    setScoring(q)
    const poll = async (platform: Platform) => {
      for (let i = 0; i < 36; i++) {
        await new Promise((r) => setTimeout(r, 5000))
        const res = await searchLive(q, false, platform, true)
        if (res.mediansPending) continue
        const freshById = new Map(res.videos.map((v) => [v.id, v]))
        const fill = (v: Video) => {
          const fresh = freshById.get(v.id)
          return fresh ? fillBaseline(v, fresh) : v
        }
        setLiveStore((prev) => ({ ...prev, videos: prev.videos.map(fill) }))
        setLiveResults((prev) => prev.map(fill))
        return
      }
    }
    // The results are still usable if a poll fails; they just keep the views ÷ followers score.
    await Promise.allSettled(platforms.map(poll))
    setScoring((s) => (s === q ? null : s))
  }

  // `usePlatforms`: run on these platforms instead of the toggles (a recent search opened again).
  const runSearch = (text: string, usePlatforms?: Platform[], devNoDelay = false) => {
    // Dev only: ?slowSearch=30 makes a sample search wait that many seconds behind the loading card, as a live
    // search would (sample results are instant). Removed from production builds.
    if (import.meta.env.DEV && !live && !devNoDelay) {
      const slow = Number(new URLSearchParams(window.location.search).get('slowSearch'))
      if (slow > 0 && !interpretMedia(text, null, formats)) {
        if (searching) return
        const seq = ++searchSeq.current
        setSearching({ q: text, platforms: usePlatforms ?? query.platforms, clientId: client.id, startedAt: Date.now() })
        window.setTimeout(() => {
          if (seq !== searchSeq.current) return
          setSearching(null)
          runSearch(text, usePlatforms, true)
        }, slow * 1000)
        return
      }
    }
    if (usePlatforms) setQuery((q) => ({ ...q, platforms: usePlatforms }))
    if (live) {
      // One live search at a time (the search button is disabled meanwhile; this covers Enter, chips and voice).
      if (!searching) void runLiveSearch(text, undefined, usePlatforms)
      return
    }
    // Screenshot attachments are switched off for now; pasted video links still work in sample mode.
    const media = interpretMedia(text, null, formats)
    const next = media ?? parseQuery(text, formats)
    setInterp(next)
    if (media) {
      // Pretend to read the video first; the overlay switches to results when it's done.
      setQuery((q) => ({ ...q, keyword: next.text, platforms: defaultQuery.platforms, days: 90, maxLength: 0 }))
      setFormatFilter(null)
      setReading(media.source)
      return
    }
    const platforms = next.platforms ?? usePlatforms ?? query.platforms
    setQuery((q) => ({
      ...q,
      keyword: text,
      days: next.days ?? q.days,
      platforms,
      maxLength: next.maxLength ?? q.maxLength,
    }))
    setFormatFilter(null)
    setLastSearches((prev) => ({ ...prev, [client.id]: text }))
    setShownSearch(`${client.id}|${text}`)
    setToRecord({ clientId: client.id, text, platforms })
    setView('results')
  }

  // Start the next video from a clean search page (new idea), keeping the last results one click away.
  const planAnother = () => {
    setQuery((q) => ({ ...q, keyword: '' }))
    setView('search')
  }

  const refreshPulse = useCallback(
    async (c: Client, fresh: boolean) => {
      const topic = clientTopic(c)
      setPulseLoading(c.id)
      setPulseError(null)
      try {
        // The automatic check only reads the cache; only the refresh button may start a paid search.
        const res = await searchLive(topic, fresh, 'tiktok', !fresh)
        if (!fresh && !res.videos.length) return // nothing saved yet: show no pulse, no banner
        setPulses((prev) => ({ ...prev, [c.id]: pulseFrom(topic, res.videos, findPatterns(res.videos, topic)) }))
      } catch (e) {
        // A failed automatic check stays quiet; only the refresh button shows a banner.
        if (fresh) setPulseError(e instanceof Error ? e.message : t('shell.search.trendFailed'))
      } finally {
        setPulseLoading(null)
      }
    },
    [setPulses],
  )

  // Check once a day per client, when its Home or search page opens. Each attempt runs once per session, even if it fails.
  useEffect(() => {
    if (!live || workspace === 'all' || client === NO_CLIENT || (view !== 'search' && view !== 'home') || pulseLoading) return
    const topic = clientTopic(client)
    if (!topic) return // nothing to look up yet: the search would be refused
    const p = pulses[client.id]
    const stale = !p || p.topic !== topic || Date.now() - p.fetchedAt > 24 * 3_600_000
    const key = `${client.id}|${topic}`
    if (stale && !pulseTried.current.has(key)) {
      pulseTried.current.add(key)
      void refreshPulse(client, false)
    }
  }, [live, workspace, view, client, pulses, pulseLoading, refreshPulse])

  const finishReading = useCallback(() => {
    setReading(null)
    setView('results')
  }, [setView])

  const removeChip = (chip: Chip) => {
    if (chip.kind === 'source') {
      setInterp((x) => ({ ...x, source: null, topics: [], keywords: ['tofu'] }))
    }
    if (chip.kind === 'keyword') setInterp((x) => ({ ...x, keywords: x.keywords.filter((k) => k !== chip.value) }))
    if (chip.kind === 'topic') setInterp((x) => ({ ...x, topics: x.topics.filter((t) => t.formatId !== chip.formatId) }))
    if (chip.kind === 'audience') setInterp((x) => ({ ...x, audience: null }))
    if (chip.kind === 'days') {
      setInterp((x) => ({ ...x, days: null }))
      setQuery((q) => ({ ...q, days: defaultQuery.days }))
    }
    if (chip.kind === 'platforms') {
      setInterp((x) => ({ ...x, platforms: null }))
      setQuery((q) => ({ ...q, platforms: defaultQuery.platforms }))
    }
    if (chip.kind === 'length') {
      setInterp((x) => ({ ...x, maxLength: null }))
      setQuery((q) => ({ ...q, maxLength: 0 }))
    }
  }

  // Everything matching the words, before platform/date/length filters.
  // Format labels use this pool so a filter can't make a trend look "early".
  const keywordPool = useMemo(() => {
    if (live) return liveResults
    if (interp.keywords.length === 0) return interp.topics.length || interp.audience ? videos : []
    return videos.filter((v) => interp.keywords.some((k) => matchesKeyword(v, formatById.get(v.formatId), k)))
  }, [interp, formatById, live, liveResults])

  // Patterns count TikTok accounts only, matching the Accounts list (COHORT_PLATFORMS).
  const patterns = useMemo(
    () => (live ? findPatterns(liveResults.filter((v) => COHORT_PLATFORMS.includes(v.platform)), liveQuery) : []),
    [live, liveResults, liveQuery],
  )
  const cohorts = useMemo(() => cohortsByVideo(liveResults, patterns), [liveResults, patterns])
  const patternCohorts = useMemo(() => cohortsByPattern(liveResults, patterns), [liveResults, patterns])

  const results = useMemo(() => {
    const pattern = patterns.find((x) => x.label === patternFilter)
    return keywordPool
      .filter((v) => live || query.platforms.includes(v.platform))
      // Videos with no posting date (YouTube search) can't be judged by age, so the day filter keeps them.
      .filter((v) => !hasDate(v) || v.daysAgo <= query.days)
      .filter((v) => !query.maxLength || v.lengthSec <= query.maxLength)
      .filter((v) => live || !interp.topics.length || interp.topics.some((t) => t.formatId === v.formatId))
      .filter((v) => live || !interp.audience || formatById.get(v.formatId)!.audiences.includes(interp.audience))
      .filter((v) => !pattern || pattern.videoIds.includes(v.id))
      .sort(sorters[sort])
  }, [keywordPool, query, sort, interp, formatById, live, patterns, patternFilter])

  const trends = useMemo(
    () =>
      (live ? [] : formats)
        .filter((f) => results.some((v) => v.formatId === f.id))
        .map((f) => formatTrend(f, keywordPool))
        .sort((a, b) => stageOrder[a.stage] - stageOrder[b.stage]),
    [results, keywordPool, live],
  )

  const answer = useMemo(() => (live ? liveAnswer : buildAnswer(interp, results, trends)), [interp, results, trends, live, liveAnswer])

  // Record a search once its results are on screen: the videos it found, to say next time what's new.
  useEffect(() => {
    if (!toRecord) return
    setSearchRuns((prev) => recordSearch(cleanRuns(prev), { ...toRecord, resultIds: results.map((v) => v.id), by: account?.name }))
    setToRecord(null)
  }, [toRecord, results, account, setSearchRuns])

  // Explicitly saved sample plans, like videos added by link, can show in both modes.
  // The per-plan flag keeps other clients' built-in examples isolated even when the video is shared.
  const shownIdeas = ideas.filter((i) => Boolean(videoById.get(i.videoId)?.live) === live || i.videoId.startsWith('link-') || (live && synced && i.savedInLive === true))

  const chipGroups = buildChipGroups({
    client,
    live,
    pulse: pulses[client.id],
    ideas: shownIdeas,
    videoById,
    formatById,
    sampleFormats: formats,
    sampleVideos: videos,
  })

  const savedForClient = new Set(shownIdeas.filter((i) => i.clientId === client.id).map((i) => i.videoId))
  // This client's Research rows, and the videos they hold.
  const myResearch = research.filter((e) => e.clientId === client.id)
  const inResearch = new Set(myResearch.map((e) => e.videoId))
  // Which of the client's videos (1 to 12) each Research video is filed under, for the Plans cards.
  const videoNoById = new Map<string, number>()
  for (const e of myResearch) {
    const slot = e.slotId ? researchSlots.find((s) => s.id === e.slotId && s.clientId === client.id) : undefined
    if (slot) videoNoById.set(e.videoId, slot.number)
  }

  // Saving or planning a real video asks the API for its AI breakdown (about a minute the first time).
  // It replaces the placeholder shot list and "why it works".
  const analyzing = useRef(new Set<string>())
  const breakDown = (videoId: string) => {
    const v = videoById.get(videoId)
    const f = v && formatById.get(v.formatId)
    if (!v?.live || !v.url || !f || f.shotList.length || analyzing.current.has(videoId)) return
    analyzing.current.add(videoId)
    const patchFormat = (update: (x: Format) => Format) =>
      setLiveStore((prev) => ({ ...prev, formats: prev.formats.map((x) => (x.id === f.id ? update(x) : x)) }))
    const say = (text: string) => patchFormat((x) => ({ ...x, why: { ...x.why, first3s: text } }))
    analyzeVideo(v.url, (step) => say(t('shell.breakdown.progress', { step: step || t('shell.breakdown.waiting') })))
      .then((b) => {
        patchFormat((x) => applyBreakdown(x, b))
        // Ideas saved before the breakdown still carry the placeholder editor notes.
        setIdeas((prev) => prev.map((i) => (i.videoId === videoId && i.notes === f.editorNotes ? { ...i, notes: b.editorNotes } : i)))
      })
      .catch((e) => say(`${t('shell.breakdown.failed')} ${e instanceof Error ? e.message : ''}`.trim()))
      .finally(() => analyzing.current.delete(videoId))
  }

  // Re-run the AI breakdown of a video that already has an older one. The saved copy (live store, which
  // the library syncs) is replaced only when the new answer arrives; a failure leaves it as it was.
  const [reanalysis, setReanalysis] = useState<{ videoId: string; step: string; failed: boolean } | null>(null)
  const reanalyse = (videoId: string) => {
    const v = videoById.get(videoId)
    const f = v && formatById.get(v.formatId)
    if (!v?.live || !v.url || !f || analyzing.current.has(videoId)) return
    analyzing.current.add(videoId)
    setReanalysis({ videoId, step: '', failed: false })
    analyzeVideo(v.url, (step) => setReanalysis({ videoId, step, failed: false }), true)
      .then((b) => {
        setLiveStore((prev) => ({ ...prev, formats: prev.formats.map((x) => (x.id === f.id ? applyBreakdown(x, b) : x)) }))
        setReanalysis(null)
      })
      .catch(() => setReanalysis({ videoId, step: '', failed: true }))
      .finally(() => analyzing.current.delete(videoId))
  }

  // Makes the plan for a video (Still planning), or returns the one it already has. `format` is for a video
  // added in the same click (not in formatById yet). `dueDate` defaults to two weeks from today.
  const saveIdea = (videoId: string, format?: Format, dueDate?: string, clientId = client.id): SavedIdea => {
    breakDown(videoId)
    const existing = ideas.find((i) => i.videoId === videoId && i.clientId === clientId)
    const v = videoById.get(videoId)
    const f = format ?? formatById.get(v?.formatId ?? '')
    const savedInLive = live && !!v && !v.live
    if (savedInLive) {
      // Preserve the original reference and breakdown for reloads and other browsers.
      setLiveStore((prev) => ({
        videos: prev.videos.some((x) => x.id === v.id) ? prev.videos : [...prev.videos, v],
        formats: !f || prev.formats.some((x) => x.id === f.id) ? prev.formats : [...prev.formats, f],
      }))
    }
    if (existing) {
      if (!savedInLive || existing.savedInLive) return existing
      const picked = { ...existing, savedInLive: true }
      setIdeas((prev) => prev.map((i) => (i.id === existing.id ? { ...i, savedInLive: true } : i)))
      return picked
    }
    const idea: SavedIdea = {
      ...(savedInLive ? { savedInLive: true } : {}),
      id: `${clientId}-${videoId}`,
      videoId,
      clientId,
      status: 'saved',
      dueDate: dueDate ?? inTwoWeeks(),
      notes: f!.editorNotes,
    }
    setIdeas((prev) => [...prev, idea])
    return idea
  }

  const hasPlan = (videoId: string) => ideas.some((i) => i.videoId === videoId && i.clientId === client.id)

  // Save to Research: adds the video as a row in this client's Research sheet (not a plan), filed under one of
  // the client's videos (slotId) or Unsorted. Still asks for the AI breakdown, so the shots are ready when the row
  // is planned.
  const saveToResearch = (videoId: string, slotId?: string) => {
    const v = videoById.get(videoId)
    if (!v) return
    breakDown(videoId)
    const row = { ...entryFromVideo(client.id, v, 'search'), ...(slotId ? { slotId } : {}) }
    setResearch((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]))
    // On Find ideas, a toast says where it went (Change, Undo) and the strip at the bottom lights that video.
    const at = here.current.view
    if (at === 'results' || at === 'search') setSavedNote({ videoId })
  }

  // The toast's Change: file an already saved video under another of the client's videos (or Unsorted).
  const moveSaved = (videoId: string, slotId: string | null) =>
    setResearch((prev) =>
      prev.map((e) => {
        if (e.clientId !== client.id || e.videoId !== videoId) return e
        const next = { ...e }
        if (slotId) next.slotId = slotId
        else delete next.slotId
        return next
      }),
    )

  const myVideos = researchSlots.filter((s) => s.clientId === client.id).sort((a, b) => a.number - b.number)
  // Where a saved video sits in Research: short "Video 3" and full "Video 3 · Street taste test" (or Unsorted).
  // Null when it isn't saved.
  const savedIn = (videoId: string) => {
    const row = research.find((e) => e.clientId === client.id && e.videoId === videoId)
    if (!row) return null
    const slot = myVideos.find((s) => s.id === row.slotId)
    if (!slot) return { short: t('research.unsorted'), full: t('research.unsorted') }
    const short = t('research.slot.videoNo', { n: slot.number })
    return { short, full: slot.topic ? `${short} · ${slot.topic}` : short }
  }

  // Every Save to Research button: asks which video it's for first (when the client has any), then saves.
  const askSave = (videoId: string, onSaved?: () => void) => {
    if (!videoById.has(videoId)) return
    if (!myVideos.length) {
      saveToResearch(videoId)
      onSaved?.()
      return
    }
    setPendingSave({ videoId, onSaved })
  }

  // Takes a row off Research, but never one with a plan (the plan keeps its row).
  const removeResearch = (rowId: string) => {
    const row = research.find((e) => e.id === rowId)
    if (!row || planOf(row, ideas)) return
    setResearch((prev) => prev.filter((e) => e.id !== rowId))
  }

  // The Save button: on, it's a Research row; pressed again (and not planned yet), the row comes off.
  const toggleSave = (videoId: string) => {
    if (inResearch.has(videoId)) {
      removeResearch(researchId(client.id, videoId))
      setSavedNote((n) => (n?.videoId === videoId ? null : n))
    } else askSave(videoId)
  }

  // A saved video can lack its breakdown (saved before one existed); fetch it when opened.
  const openVideoDrawer = (videoId: string) => {
    setOpenVideoId(videoId)
    if (savedForClient.has(videoId) || inResearch.has(videoId)) breakDown(videoId)
    fillNeeds(videoId)
  }

  // A real video that has a breakdown but no judged needs (an older one) gets them from the API, once per session.
  const needsAsked = useRef(new Set<string>())
  const fillNeeds = (videoId: string) => {
    const v = videoById.get(videoId)
    const f = v && formatById.get(v.formatId)
    if (!v?.live || !v.url || !f || !f.shotList.length || f.needsKnown || needsAsked.current.has(videoId)) return
    needsAsked.current.add(videoId)
    checkNeeds(v.url, [...new Set(formats.flatMap((x) => x.needs))])
      .then((needs) =>
        setLiveStore((prev) => ({ ...prev, formats: prev.formats.map((x) => (x.id === f.id ? { ...x, needs, needsKnown: true } : x)) })),
      )
      .catch(() => needsAsked.current.delete(videoId))
  }

  const openPlan = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId)
    if (idea) saveIdea(idea.videoId, undefined, undefined, idea.clientId)
    setPlanFrom(view)
    setPlanIdeaId(ideaId)
    setView('plan')
  }

  // The canvas needs the plan's shots saved with ids on the server; a plan that never edited its shots has none yet.
  const openCanvas = (idea: SavedIdea, formatShots: Shot[], editor = false) => {
    if (!idea.shots) setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, shots: fillShotIds(formatShots) } : i)))
    const v = videoById.get(idea.videoId)
    setCanvasContext({ resource: { kind: 'legacy-plan', id: idea.id }, clientId: idea.clientId, title: v ? planName(v, formatById.get(v.formatId)) : idea.id, readOnly: idea.status !== 'approved', shots: idea.shots ?? fillShotIds(formatShots) })
    setCanvasEditor(editor)
    setView('canvas')
  }

  // The plan's canvas with the editor closed, as the sidebar's Canvas opens it.
  const openPlanCanvas = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId)
    const format = idea && formatById.get(videoById.get(idea.videoId)?.formatId ?? '')
    if (!idea) return
    setPlanFrom(view)
    setPlanIdeaId(ideaId)
    openCanvas(idea, idea.shots ?? format?.shotList ?? [], false)
  }

  // The Plans board's "Make the video": the plan's canvas, with the editor already open.
  const makeVideo = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId)
    const format = idea && formatById.get(videoById.get(idea.videoId)?.formatId ?? '')
    if (!idea) return
    setPlanFrom(view)
    setPlanIdeaId(ideaId)
    openCanvas(idea, idea.shots ?? format?.shotList ?? [], true)
  }

  // The planning board for the plan that is open; its Back returns to the plan.
  const openBoard = () => {
    if (planIdeaId) setView('board')
  }

  // Sidebar "Video canvas": one plan's planning board, opened straight from the sidebar or the plan chooser.
  const openPlanBoard = (ideaId: string) => {
    const idea = ideas.find((i) => i.id === ideaId)
    if (!idea) return
    breakDown(idea.videoId)
    // The plan's Back then returns to where she was, or to Plans when she came from a board or the chooser.
    setPlanFrom(view === 'board' || view === 'boardPick' || view === 'plan' ? 'shortlist' : view)
    setPlanIdeaId(ideaId)
    setView('board')
  }

  // Find ideas' plan button and P key: a video with a plan opens it; any other is saved to Research (plans are
  // made from Research).
  const planFromVideo = (videoId: string) => {
    const idea = ideas.find((i) => i.videoId === videoId && i.clientId === client.id)
    if (!idea) return askSave(videoId)
    setOpenVideoId(null)
    openPlan(idea.id)
  }

  // Makes the plan for a video (Still planning), keeping its Research row, and opens it unless `open` is false.
  const planNow = (videoId: string, format?: Format, open = true, dueDate?: string) => {
    const v = videoById.get(videoId)
    if (v && !inResearch.has(videoId)) {
      const row = entryFromVideo(client.id, v, 'search')
      setResearch((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row]))
    }
    const idea = saveIdea(videoId, format, dueDate)
    if (!open) return
    setOpenVideoId(null)
    openPlan(idea.id)
  }

  // Makes a Research row's plan. A row whose video has left this browser's store gets it back from the row's own copy.
  // The plan's due date is its video's (slot's) due date when set, else two weeks from today: picking never asks.
  const planRow = (rowId: string, open = true) => {
    const row = research.find((e) => e.id === rowId)
    if (!row) return
    const due = planDueDate(
      researchSlots.find((s) => s.id === row.slotId && s.clientId === row.clientId),
      inTwoWeeks(),
    )
    if (videoById.has(row.videoId) || hasPlan(row.videoId)) return planNow(row.videoId, undefined, open, due)
    const { video, format } = videoFromLink(rowLink(row))
    const restored = { ...video, id: row.videoId }
    setLiveStore((prev) => ({
      videos: [restored, ...prev.videos.filter((x) => x.id !== restored.id)],
      formats: prev.formats.some((x) => x.id === format.id) ? prev.formats : [format, ...prev.formats],
    }))
    planNow(row.videoId, format, open, due)
  }

  // Research's Status dropdown. Only plans still being planned are deleted here; one sent for approval or further
  // along is changed on Plans (the dropdown locks it too).
  const pickRow = (rowId: string, pick: RowPick) => {
    const row = research.find((e) => e.id === rowId)
    if (!row) return
    const stillPlanning = (i: SavedIdea) => i.status === 'saved' || i.status === 'rejected'
    const plan = planOf(row, ideas)
    if (pick === 'picked') {
      if (plan) return planRow(rowId, false)
      // The same video's earlier pick steps down to Backup, and its plan goes.
      const before = row.slotId
        ? research.filter((e) => e.clientId === row.clientId && e.slotId === row.slotId && e.id !== row.id && planOf(e, ideas))
        : []
      const theirPlans = before.map((e) => planOf(e, ideas)!)
      if (theirPlans.some((i) => !stillPlanning(i))) return
      const drop = new Set(theirPlans.map((i) => i.id))
      const demoted = new Set(before.map((e) => e.id))
      if (drop.size) setIdeas((prev) => prev.filter((i) => !drop.has(i.id)))
      setResearch((prev) =>
        prev.map((e) => (e.id === rowId ? { ...e, backup: undefined } : demoted.has(e.id) ? { ...e, backup: true } : e)),
      )
      planRow(rowId, false)
      return
    }
    if (plan) {
      if (!stillPlanning(plan)) return
      setIdeas((prev) => prev.filter((i) => i.id !== plan.id))
    }
    setResearch((prev) => prev.map((e) => (e.id === rowId ? { ...e, backup: pick === 'backup' ? true : undefined } : e)))
  }

  // Research's "Add from link": a video found outside the app. Adding the same link again updates its row.
  const addFromLink = (input: LinkInput, slotId?: string) => {
    const { video, format } = videoFromLink(input)
    setLiveStore((prev) => ({
      videos: [video, ...prev.videos.filter((x) => x.id !== video.id)],
      // Keep a breakdown the format already has.
      formats: prev.formats.some((x) => x.id === format.id) ? prev.formats : [format, ...prev.formats],
    }))
    const row: ResearchEntry = {
      ...entryFromVideo(client.id, video, 'link'),
      keywords: input.keywords,
      // A blank hook stays blank ("Add a hook") rather than showing the link.
      hook: input.hook.trim(),
      notes: input.notes,
      ...(slotId ? { slotId } : {}),
    }
    setResearch((prev) =>
      prev.some((e) => e.id === row.id)
        ? prev.map((e) => (e.id === row.id ? { ...row, source: e.source, slotId: slotId ?? e.slotId } : e))
        : [...prev, row],
    )
  }

  const likeFormat = interp.source ? formatById.get(interp.topics[0]?.formatId ?? '') : undefined

  const recordEvent = (clientId: string, event: ClientEvent) =>
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, memory: [...(c.memory ?? []), event] } : c)))

  // The manager's answer on a plan they were sent. Every decision is also remembered on the client.
  // stream C: three decision kinds, with the manager's comment and per-shot comments
  const decide = (ideaId: string, d: Decision) => {
    const idea = ideas.find((i) => i.id === ideaId)
    const at = Date.now()
    setIdeas((prev) => prev.map((i) => (i.id === ideaId ? applyDecision(i, d, at) : i)))
    if (idea) recordEvent(idea.clientId, { ideaId, kind: d.kind, reason: d.comment, at })
  }

  const appContext: AppContextValue = {
    // A signed-in account's agency name wins over the per-browser setting; without accounts the setting is used.
    agency: account?.agency ? { ...agency, agencyName: account.agency } : agency,
    account,
    setAgency: (patch) => setAgencyRaw((a) => ({ ...a, ...patch })),
    role,
    setRole,
    addClient: (c) => setClients((prev) => [...prev, c]),
    clients,
    setClientBrand: (clientId, brand) => setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, brand } : c))),
    lang,
    setLang,
    recordEvent,
    searching,
  }

  const openVideo = openVideoId ? videoById.get(openVideoId) : undefined
  const openFormat = openVideo && formatById.get(openVideo.formatId)
  const planIdea = ideas.find((i) => i.id === planIdeaId)
  const planVideo = planIdea && videoById.get(planIdea.videoId)
  const planFormat = planVideo && formatById.get(planVideo.formatId)
  const planClient = planIdea && clients.find((c) => c.id === planIdea.clientId)
  const mine = shownIdeas.filter((i) => i.clientId === client.id)

  // Find ideas' desk: recent searches, what's saved by video, and what the results screen marks as new.
  const recentRows: RecentRow[] = recentSearches(searchRuns, client.id, inResearch)
  const savedRows = savedByVideo(myVideos, myResearch, ideas)
  const shownRun = view === 'results' ? runFor(searchRuns, client.id, lastSearch) : undefined
  const savedRow = savedNote ? myResearch.find((e) => e.videoId === savedNote.videoId) : undefined
  const savedWhere = savedRow ? savedIn(savedRow.videoId)?.full : undefined
  const justSaved = savedRow ? (myVideos.some((v) => v.id === savedRow.slotId) ? savedRow.slotId! : 'unsorted') : null
  const topic = clientTopic(client)
  const askExample = topic ? t('find.desk.ways.askExample', { topic }) : undefined
  // The drop-down under the search box: this client's searches, common searches (the server's past searches
  // live; refinements of the sample data otherwise), searches from the brief, and the same words as a question.
  const suggestFor = (text: string, past: string[]) => {
    const offered = live ? [] : suggest(text, formats, videos)
    const typed = text.trim()
    // The same words as a question, once the last word looks finished (3+ letters), so "tofu d" isn't asked.
    const lastWord = typed.split(/\s+/).pop() ?? ''
    const asQuestion = lastWord.length >= 3 && !/\?$/.test(typed) && !offered.some((x) => x.kind === 'question')
    return typeAhead(text, {
      recent: searchRuns.filter((r) => r.clientId === client.id).map((r) => r.text),
      searches: [
        ...past.map((q) => ({ label: q, value: q })),
        ...offered.filter((x) => x.kind === 'refine').map((x) => ({ label: x.value, value: x.value })),
      ],
      brief: [
        ...chipGroups.flatMap((g) => g.chips.map((c) => ({ label: c.label, value: c.value, hint: c.hint }))),
        ...client.examples.map((e) => ({ label: e, value: e })),
      ],
      questions: [
        ...offered.filter((x) => x.kind === 'question').map((x) => x.value),
        ...(asQuestion ? [t('find.desk.ways.askExample', { topic: typed })] : []),
      ],
    })
  }
  const openRecent = (row: RecentRow) => {
    setQuery((q) => ({ ...q, keyword: row.run.text }))
    runSearch(row.run.text, row.run.platforms)
  }
  const blockedFormatIds = new Set(
    [...formatById.values()].filter((f) => f.needs.some((n) => client.cannot.includes(n))).map((f) => f.id),
  )
  const backLabel: Record<View, string> = {
    overview: t('shell.back.overview'),
    home: t('shell.back.home'),
    search: t('shell.back.search'),
    results: t('shell.back.results'),
    review: t('shell.back.review'),
    plan: t('shell.back.plan'),
    canvas: t('shell.back.canvas'),
    canvasPick: t('shell.back.canvas'),
    boardPick: t('shell.back.boardPick'),
    board: t('board.backLabel'),
    settings: t('shell.back.settings'),
    preferences: t('shell.back.preferences'),
    channel: t('shell.back.channel'),
    research: t('shell.back.research'),
    compare: t('shell.back.compare'),
    shortlist: t('shell.back.shortlist'),
    'add-client': t('shell.back.addClient'),
  }
  // Sidebar badge: what needs action (waiting for approval + sent back), not the whole shortlist.
  const counts = {
    plans: mine.filter((i) => i.status === 'waiting' || i.status === 'rejected').length,
    research: myResearch.length,
  }
  const openPlans = (stage?: IdeaStatus) => {
    setBoardFocus(stage ?? null)
    setView('shortlist')
  }

  const openReview = (from: View) => {
    setReviewFrom(from)
    setView('review')
  }
  // Review's Back: to where it was opened from. From All clients, that means leaving the client.
  const reviewBack = () => (reviewFrom === 'overview' ? setWorkspace('all') : setView(reviewFrom))
  const reviewBackLabel = reviewFrom === 'overview' ? t('shell.side.allClients') : reviewFrom === 'home' ? t('shell.side.home') : t('shell.side.plans')
  // The next client (in list order, after this one) with plans waiting, for clearing approvals across clients.
  const nextWaiting = (() => {
    const at = clients.findIndex((c) => c.id === client.id)
    const order = [...clients.slice(at + 1), ...clients.slice(0, Math.max(at, 0))]
    const next = order
      .map((c) => ({ c, n: shownIdeas.filter((i) => i.clientId === c.id && i.status === 'waiting').length }))
      .find((x) => x.n > 0)
    return next ? { id: next.c.id, name: next.c.name, waiting: next.n } : null
  })()

  const openAddClient = () => {
    setAddFrom(view)
    setView('add-client')
  }

  // Find ideas' "Back to results": rerun this client's last search if the results on screen are another one.
  const backToResults = () => {
    if (!lastSearch) return
    if (shownSearch === `${client.id}|${lastSearch}`) setView('results')
    else runSearch(lastSearch)
  }

  // Sidebar "Find ideas": come back to this client's last results if they're still on screen, not an empty search page.
  const navTo = (v: View) => {
    // "Video canvas" (5 Nov 2026): the planning board. One plan opens straight away; more than one, pick a plan.
    // The 'canvas' branch below (approved plans' CanvasScreen) is no longer on the sidebar but is kept.
    if (v === 'board') {
      const plans = boardPlans(shownIdeas, client.id)
      return plans.length === 1 ? openPlanBoard(plans[0].id) : setView('boardPick')
    }
    if (v === 'canvas') {
      // One approved plan opens its canvas straight away; otherwise pick one (or see why there is none).
      return setView('canvasPick')
    }
    if (v === 'search' && lastSearch && shownSearch === `${client.id}|${lastSearch}`) return setView('results')
    setView(v)
  }

  // Legacy plan views need their plan; standalone workspaces can open without one.
  const planMissing = hasMissingLegacyPlan(view, canvasContext?.resource, !!(planIdea && planVideo && planFormat && planClient))
  useEffect(() => {
    if (planMissing) setViewRaw('shortlist')
  }, [planMissing])

  // The background search's loading card shows only on its own client's Find ideas / results page. When the
  // results take over, the card stays ~2s more for the play mark's resolve (skipped for instant results).
  const onSearchPage = view === 'search' || view === 'results'
  const loadingCard =
    searching && workspace !== 'all' && client !== NO_CLIENT && searching.clientId === client.id && onSearchPage ? searching : null
  // The card ending while its page is still open, with no error, means the results are in: a failed search sets
  // its error in the same update, and the switch to the results screen may land a moment later (a view transition).
  const resolving = useSearchResolve(loadingCard, !searching && !searchError && onSearchPage)
  const cardSearch = loadingCard ?? (resolving && resolving.card.clientId === client.id && onSearchPage ? resolving.card : null)

  if (auth === 'checking') return null
  // Client accounts aren't live yet (see ClientPortal), so a saved client login goes back to the login screen.
  const gate = auth === 'signed-out' ? { kind: 'signed-out' as const } : { signedIn: auth === 'signed-in' || signedIn }
  if (nextView(gate, 'app') === 'login' || role === 'client') {
    // Landing and sign-in stay in English whatever the setting is.
    setActiveLang('en')
    document.documentElement.lang = 'en'
    return (
      <AppContext.Provider value={appContext}>
        {/* stream A: after login, staff land on the all-clients overview */}
        <LoginScreen
          real={auth === 'signed-out'}
          startAtLogin={auth === 'signed-out' && returnTo.current !== null}
          startOn={signedOut ? 'login' : 'landing'}
          onSignIn={() => {
            setSignedOut(false)
            if (auth === 'signed-out') {
              setAuth('signed-in')
              void me().then((m) => setAccount(m.kind === 'signed-in' ? m.account : null))
              setRetryTick((n) => n + 1)
              // Back from an ended session: return to where the user was, not the overview.
              if (restoreView()) return
            } else setSignedIn(true)
            // Returning: reopen the last client on Find ideas. First log-in, or that client is gone: All clients Home.
            if (lastClient && clients.some((c) => c.id === lastClient)) enterClient(lastClient)
            else setWorkspace('all')
          }}
        />
      </AppContext.Provider>
    )
  }
  if (showLanding) {
    // Same as the signed-out landing: English whatever the setting is. Returning re-applies the user's language.
    setActiveLang('en')
    document.documentElement.lang = 'en'
    const backToApp = () => setShowLanding(false)
    return (
      <AppContext.Provider value={appContext}>
        <LandingAltitude onLogIn={backToApp} onDemo={backToApp} />
      </AppContext.Provider>
    )
  }
  setActiveLang(lang)
  document.documentElement.lang = htmlLang(lang)

  const signOut = () => {
    if (auth !== 'signed-in') return setSignedIn(false)
    try {
      sessionStorage.removeItem(RETURN_KEY)
    } catch {
      // Nothing stored to clear.
    }
    returnTo.current = null
    void logout().then(() => {
      setSynced(false)
      setAccount(null)
      setAuth('signed-out')
    })
  }


  const inClient = workspace !== 'all' && client !== NO_CLIENT

  return (
    <AppContext.Provider value={appContext}>
    {/* Keyed by language so every screen redraws in the new one (the switch happens on Settings, which holds no work in progress). */}
    <div className={`shell${view === 'canvas' ? ' is-compact' : ''}${view === 'canvas' && canvasFull ? ' is-full' : ''}`} key={lang}>
      <Sidebar
        clients={clients}
        workspace={workspace}
        setWorkspace={setWorkspace}
        view={view}
        setView={navTo}
        counts={counts}
        onLogo={() => setShowLanding(true)}
        onSignOut={() => {
          setSignedOut(true)
          signOut()
        }}
        onAddClient={openAddClient}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        live={live}
        compact={view === 'canvas'}
      />

      <div className="shell-main">
        <header className="mobile-bar">
          <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label={t('shell.openMenu')}>
            ☰
          </button>
          <strong>{inClient ? client.name : t('shell.side.allClients')}</strong>
        </header>

        {syncProblem && (
          <div className="sync-note" role="status">
            <span>{t(syncProblem.key, syncProblem.vars)}</span>
            <button type="button" className="link-btn" onClick={() => { setSyncProblem(null); setRetryTick((n) => n + 1) }}>
              {t('shell.sync.retry')}
            </button>
          </div>
        )}
        <main className="main">
          {view === 'add-client' && (
            <AddClientScreen
              takenIds={clients.map((c) => c.id)} // stream A: keeps new client ids unique
              onCreated={(id) => enterClient(id)}
              onCancel={() => setView(addFrom)}
            />
          )}

          {((!inClient && view !== 'add-client' && view !== 'channel' && view !== 'compare' && view !== 'preferences') || view === 'overview') && (
            <OverviewScreen
              clients={clients}
              ideas={shownIdeas}
              videoById={videoById}
              formatById={formatById}
              onOpen={(id, v) => {
                // The client name opens Find ideas, the row button its Home, "N waiting" its Review.
                if (v === 'review') {
                  setReviewFrom('overview')
                  enterClient(id, 'review')
                } else enterClient(id, v)
              }}
              onAddClient={openAddClient}
            />
          )}

          {inClient && view === 'home' && (
            <ClientHome
              client={client}
              ideas={shownIdeas}
              allIdeas={ideas}
              videoById={videoById}
              formatById={formatById}
              live={live}
              pulse={pulses[client.id]}
              pulseLoading={pulseLoading === client.id}
              pulseError={pulseError}
              onRefreshPulse={() => void refreshPulse(client, true)}
              onFindIdeas={() => setView('search')}
              // Rows the team saved (not the made-up sample rows), so the demo's suggestions don't all disappear.
              researched={new Set(myResearch.filter((e) => e.source !== 'sample').map((e) => e.videoId))}
              onSave={askSave}
              onUndoSave={(videoId) => removeResearch(researchId(client.id, videoId))}
              onPlanShots={(videoId) => planNow(videoId)}
              onOpenPlan={openPlan}
              onOpenPlans={openPlans}
              // A signed-in manager approves right here, with the same handler as Review; team members don't.
              onApprove={role === 'manager' ? (id) => decide(id, { kind: 'approved' }) : undefined}
              onReview={() => openReview('home')}
              onEditBrief={() => setView('settings')}
            />
          )}

          {view === 'channel' && <ChannelScreen />}


          {view === 'preferences' && <PreferencesScreen />}

          {/* The search runs in the background: progress shows here only while its client's search page is open. */}
          {cardSearch && (
            <LiveLoading
              query={cardSearch.q}
              startedAt={cardSearch.startedAt}
              resolvedAt={loadingCard ? null : (resolving?.at ?? null)}
              title={
                cardSearch.step
                  ? `${cardSearch.step}…`
                  : t('shell.search.searching', { platforms: cardSearch.platforms.map((p) => platformName[p]).join(', '), q: cardSearch.q })
              }
            />
          )}

          {inClient && view === 'search' && (
            <SearchScreen
              query={query}
              setQuery={setQuery}
              onSearch={runSearch}
              onImage={live ? runImageSearch : undefined}
              clientName={client.name}
              live={live}
              clientExamples={client.examples}
              error={searchError}
              chipGroups={chipGroups}
              pulse={{
                live,
                loading: pulseLoading === client.id,
                fetchedAt: pulses[client.id]?.fetchedAt,
                topic: clientTopic(client),
                error: pulseError,
              }}
              onRefreshPulse={() => void refreshPulse(client, true)}
              planned={shownIdeas.filter((i) => i.clientId === client.id && i.status === 'approved').length}
              target={client.monthlyTarget}
              lastSearch={lastSearch}
              onBackToResults={backToResults}
              recent={recentRows}
              onOpenRecent={openRecent}
              saved={savedRows}
              coverOf={(id) => videoById.get(id)?.thumbnail}
              onOpenResearch={() => setView('research')}
              suggestFor={suggestFor}
              askExample={askExample}
            />
          )}

          {inClient && view === 'results' && (
            <ResultsScreen
              error={searchError}
              failed={live ? searchFailed : []}
              empty={live ? searchEmpty : []}
              scoring={live && scoring === liveQuery}
              query={query}
              setQuery={setQuery}
              interp={interp}
              answer={answer}
              formats={formats}
              allVideos={videos}
              onSearch={runSearch}
              onImage={live ? runImageSearch : undefined}
              onRemoveChip={removeChip}
              clientName={client.name}
              onPlan={planFromVideo}
              clientExamples={client.examples}
              chipGroups={chipGroups}
              pulse={{
                live,
                loading: pulseLoading === client.id,
                fetchedAt: pulses[client.id]?.fetchedAt,
                topic: clientTopic(client),
                error: pulseError,
              }}
              onRefreshPulse={() => void refreshPulse(client, true)}
              live={live}
              cohorts={cohorts}
              patterns={
                live ? (
                  <PatternStrip patterns={patterns} cohorts={patternCohorts} active={patternFilter} onPick={setPatternFilter} />
                ) : null
              }
              likeThis={
                interp.source && likeFormat ? (
                  <LikeThisCard
                    source={interp.source}
                    format={likeFormat}
                    trend={trends.find((t) => t.format.id === likeFormat.id)}
                    matches={results}
                    clientName={client.name}
                    real={live}
                    onPlan={planFromVideo}
                    savedIds={savedForClient}
                  />
                ) : null
              }
              results={results}
              trends={trends}
              sort={sort}
              setSort={setSort}
              formatFilter={formatFilter}
              setFormatFilter={setFormatFilter}
              ideaStatus={new Map(shownIdeas.filter((i) => i.clientId === client.id).map((i) => [i.videoId, i.status]))}
              inResearch={inResearch}
              onOpen={openVideoDrawer}
              onToggleSave={toggleSave}
              onGoResearch={() => setView('research')}
              savedIn={savedIn}
              blockedFormatIds={blockedFormatIds}
              newIds={new Set(shownRun?.newIds ?? [])}
              newSince={shownRun?.prevAt}
              saved={savedRows}
              justSaved={justSaved}
              suggestFor={suggestFor}
            />
          )}

          {inClient && view === 'research' && (
            <ResearchScreen
              client={client}
              entries={myResearch}
              statusOf={(e) => researchStatus(e, shownIdeas)}
              onUpdate={(id, patch) => setResearch((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))}
              onRemove={removeResearch}
              onPick={pickRow}
              planHasWork={(e) => {
                const plan = planOf(e, ideas)
                const v = plan && videoById.get(plan.videoId)
                return !!plan && planHasWork(plan, (v && formatById.get(v.formatId)?.editorNotes) ?? '')
              }}
              onOpenPlans={() => setView('shortlist')}
              focusRowId={researchFocus}
              onFocused={() => setResearchFocus(null)}
              onOpenPlan={(id) => {
                const row = research.find((e) => e.id === id)
                const plan = row && planOf(row, ideas)
                if (plan) openPlan(plan.id)
              }}
              onAddFromLink={addFromLink}
              onOpenVideo={(videoId) => {
                if (videoById.has(videoId)) openVideoDrawer(videoId)
              }}
              videoOf={(videoId) => videoById.get(videoId)}
              onFindIdeas={() => navTo('search')}
              platforms={SEARCH_PLATFORMS}
              slots={researchSlots.filter((s) => s.clientId === client.id).sort((a, b) => a.number - b.number)}
              summaryOf={(slot) => slotSummary(slot, research, shownIdeas)}
              onCreateSlot={({ number, topic, dueDate, refs }) => {
                const slot = newSlot(client.id, researchSlots, topic, dueDate, Date.now(), number)
                setResearchSlots((prev) => [...prev, slot])
                for (const ref of refs) addFromLink(ref, slot.id)
                return slot.id
              }}
              onUpdateSlot={(id, patch) => setResearchSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))}
              onRemoveSlot={(id) => {
                setResearchSlots((prev) => prev.filter((s) => s.id !== id))
                setResearch((prev) => prev.map((e) => (e.slotId === id ? { ...e, slotId: undefined } : e)))
              }}
              onMoveEntry={(entryId, slotId) =>
                setResearch((prev) => prev.map((e) => (e.id === entryId ? { ...e, slotId: slotId ?? undefined } : e)))
              }
            />
          )}

          {inClient && view === 'shortlist' && (
            <ShortlistBoard
              client={client}
              ideas={shownIdeas}
              videoById={videoById}
              formatById={formatById}
              onChangeIdeas={setIdeas}
              onDecide={decide}
              onOpenPlan={openPlan}
              onMakeVideo={makeVideo}
              onFindMore={() => setView('search')}
              onReview={() => openReview('shortlist')}
              inResearch={inResearch}
              videoNoById={videoNoById}
              onOpenResearch={() => setView('research')}
              focus={boardFocus}
              onFocusDone={clearBoardFocus}
            />
          )}

          {inClient && view === 'review' && (
            <ReviewScreen
              client={client}
              ideas={shownIdeas}
              formatById={formatById}
              videoById={videoById}
              onDecide={decide}
              readOnly={role !== 'manager'}
              onBack={reviewBack}
              backLabel={reviewBackLabel}
              onOpenPlans={() => setView('shortlist')}
              nextClient={nextWaiting}
              onNextClient={() => nextWaiting && enterClient(nextWaiting.id, 'review')}
            />
          )}

          {/* stream C: ideas and lookups so client memory can name each plan */}
          {inClient && view === 'settings' && (
            <SettingsScreen client={client} onChange={updateClient} ideas={ideas} videoById={videoById} formatById={formatById} />
          )}

          {inClient && view === 'canvasPick' && (
            <CanvasPick
              clientId={client.id}
              clientName={client.name}
              plans={shownIdeas.filter((i) => i.clientId === client.id)}
              videoById={videoById}
              formatById={formatById}
              onPick={openPlanCanvas}
              onWorkspace={openWorkspace}
            />
          )}

          {inClient && view === 'boardPick' && (
            <BoardPick
              clientName={client.name}
              plans={boardPlans(shownIdeas, client.id)}
              videoById={videoById}
              formatById={formatById}
              onPick={openPlanBoard}
              onGoPlans={() => setView('research')}
              copy={{ title: t('shell.boardPick.title'), intro: t('shell.boardPick.intro'), empty: t('shell.boardPick.empty'), go: t('shell.side.research') }}
            />
          )}

          {inClient && view === 'canvas' && canvasContext && (
            <Suspense fallback={<p className="muted">{t('canvas.loading')}</p>}>
              <CanvasScreen
                context={canvasContext}
                registerLeaveGuard={registerCanvasLeaveGuard}
                onShotsChange={(shots) => {
                  if (canvasContext.resource.kind !== 'legacy-plan') return
                  const id = canvasContext.resource.id
                  setIdeas((prev) => prev.map((idea) => idea.id === id ? { ...idea, shots } : idea))
                  setCanvasContext((ctx) => ctx?.resource.id === id ? { ...ctx, shots } : ctx)
                }}
                onBack={() => setView('canvasPick')}
                openEditor={canvasEditor}
                clientName={clients.find((c) => c.id === canvasContext.clientId)?.name ?? client.name}
                fullscreen={canvasFull}
                onFullscreen={setFull}
              />
            </Suspense>
          )}

          {inClient && view === 'plan' && planIdea && planVideo && planFormat && planClient && (
            <PlanScreen
              idea={planIdea}
              video={planVideo}
              format={planFormat}
              client={planClient}
              onChange={(patch) => setIdeas((prev) => prev.map((i) => (i.id === planIdea.id ? { ...i, ...patch } : i)))}
              onBack={() => setView(planFrom)}
              backLabel={backLabel[planFrom]}
              onOpenCanvas={(editor) => openCanvas(planIdea, planFormat.shotList, editor)}
              onFindMore={planAnother}
              onPlanAnother={planAnother}
              onGoApprovals={() => setView('shortlist')} // stream B: the board replaces Approvals
              onDecide={(d) => decide(planIdea.id, d)}
              onOpenBoard={openBoard}
            />
          )}

          {inClient && view === 'board' && planIdea && planVideo && planFormat && planClient && (
            <Suspense fallback={null}>
              <ShotBoard
                key={planIdea.id}
                idea={planIdea}
                format={planFormat}
                client={planClient}
                video={planVideo}
                live={live}
                onSave={(patch) => setIdeas((prev) => prev.map((i) => (i.id === planIdea.id ? { ...i, ...patch } : i)))}
                onBack={() => setView('plan')}
                // Send for approval lives on the board: the plan goes to the approver, then back to the (now locked) plan page.
                onSend={() => {
                  const note = planIdea.noteToApprover ?? approverNote(planClient, planFormat, 'en')
                  setIdeas((prev) =>
                    prev.map((i) =>
                      i.id === planIdea.id
                        ? { ...i, status: 'waiting', sentAt: Date.now(), noteToApprover: note, rejectReason: undefined, rejectTags: undefined }
                        : i,
                    ),
                  )
                  setView('plan')
                }}
              />
            </Suspense>
          )}
        </main>
      </div>

      {pendingSave && videoById.has(pendingSave.videoId) && (
        <SaveToVideo
          account={videoById.get(pendingSave.videoId)!.handle}
          slots={myVideos}
          onCancel={() => setPendingSave(null)}
          onPick={(slotId) => {
            if (pendingSave.move) {
              moveSaved(pendingSave.videoId, slotId)
              setSavedNote({ videoId: pendingSave.videoId })
            } else saveToResearch(pendingSave.videoId, slotId ?? undefined)
            pendingSave.onSaved?.()
            setPendingSave(null)
          }}
        />
      )}

      {openVideo && openFormat && (
        <BreakdownPanel
          video={openVideo}
          format={openFormat}
          cohort={cohorts.get(openVideo.id)}
          formatAccounts={keywordPool.filter((v) => v.formatId === openFormat.id).length}
          client={client}
          status={ideas.find((i) => i.clientId === client.id && i.videoId === openVideo.id)?.status} // stream B
          inResearch={inResearch.has(openVideo.id)}
          onClose={() => setOpenVideoId(null)}
          onSave={() => toggleSave(openVideo.id)}
          onPlan={() => planFromVideo(openVideo.id)}
          onGoResearch={
            view === 'research'
              ? undefined
              : () => {
                  setOpenVideoId(null)
                  setView('research')
                }
          }
          onReanalyse={() => reanalyse(openVideo.id)}
          reanalysis={reanalysis?.videoId === openVideo.id ? reanalysis : null}
        />
      )}

      {reading && <ReadingOverlay source={reading} onDone={finishReading} />}
      {notice && <SearchToast notice={notice} onDismiss={() => setNotice(null)} />}
      {savedNote && inClient && (view === 'results' || view === 'search') && savedWhere && (
        <SavedToast
          where={savedWhere}
          onChange={myVideos.length ? () => setPendingSave({ videoId: savedNote.videoId, move: true }) : undefined}
          onUndo={() => {
            removeResearch(researchId(client.id, savedNote.videoId))
            setSavedNote(null)
          }}
          onDismiss={dismissSaved}
        />
      )}
    </div>
    </AppContext.Provider>
  )
}

// Order doesn't matter when comparing what's saved, so compare by id.
function libraryKey(library: { videos: { id: string }[]; formats: { id: string }[] }) {
  const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
  return JSON.stringify([[...library.videos].sort(byId), [...library.formats].sort(byId)])
}

// What "Add from link" would have collected, rebuilt from a row, so a row whose video has gone can be planned.
function rowLink(row: ResearchEntry): LinkInput {
  return {
    url: row.url ?? '',
    platform: row.platform,
    account: row.account,
    followers: row.followers,
    views: row.views,
    hook: row.hook,
    keywords: row.keywords,
    notes: row.notes,
  }
}
