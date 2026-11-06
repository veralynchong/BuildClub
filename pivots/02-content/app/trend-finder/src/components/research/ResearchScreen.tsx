import { getGuidedRuntime } from '../../lib/guided/runtime'
import { GUIDED_IDS } from '../../lib/guided/contracts'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Client, Platform, Video } from '../../types'
import type { LinkInput, ResearchEntry, ResearchSlot, ResearchStatus, SlotSummary } from '../../lib/research'
import { getActiveLang, t, tp } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'
import { compact, platformName } from '../../lib/metrics'
import { AddFromLink } from './AddFromLink'
import { ConfirmRemoveSlot } from './ConfirmRemoveSlot'
import { ConfirmRemoveRow } from './ConfirmRemoveRow'
import { EditableText } from './EditableText'
import { NewSlotForm } from './NewSlotForm'
import { PlatformGlyph } from './PlatformGlyph'
import { ResearchSheet } from './ResearchSheet'
import type { PickInfo, SheetKit } from './ResearchSheet'
import type { NewVideo } from './NewSlotForm'
import {
  DEFAULT_SORT,
  downloadCsv,
  fileSlug,
  isoDate,
  matches,
  sortRows,
  toCsv,
} from './sheet'
import type { Sort, SortKey } from './sheet'
import { UNSORTED, groupRows, rowRole } from './slots'
import type { Group, RowRole } from './slots'

// The Research tab: one client's reference videos (what's out there), replacing the agency's Excel sheet.
// Laid out as an index + detail: the videos the client is paying for on the left (a strip of chips on phones),
// the chosen video's references as cards on the right. It is for deciding what to make; picking a reference
// ("★ Picked") sends it to the Plans board at once, as a plan in Still planning, and the page says so without
// leaving Research.
export type RowPick = 'none' | 'backup' | 'picked'

export interface ResearchScreenProps {
  client: Client
  // This client's rows only.
  entries: ResearchEntry[]
  statusOf: (e: ResearchEntry) => ResearchStatus
  // Edits from the cards (hook) and the Sheet view (every column: platform, followers, views, keywords, hook, other info).
  onUpdate: (
    id: string,
    patch: Partial<Pick<ResearchEntry, 'platform' | 'followers' | 'views' | 'keywords' | 'hook' | 'notes'>>,
  ) => void
  onRemove: (id: string) => void
  // The Status control. 'picked' makes the row's plan (Still planning) without leaving the page; the video's
  // earlier pick steps down to Backup and its plan is deleted. 'none' / 'backup' on a picked row deletes its plan.
  canPick?: (entry: ResearchEntry) => boolean
  onPick: (id: string, pick: RowPick) => void
  // Whether a picked row's plan has work in it (shots, notes, sent before). Picking another row in the same video
  // asks first only then; an untouched plan is replaced at once. Without it, every switch asks.
  planHasWork?: (e: ResearchEntry) => boolean
  // "Open Plans →" in the "Sent to Plans" message: the Plans board.
  onOpenPlans?: () => void
  // A row to bring into view on arrival (Find ideas' "Open in Research"): its video is shown, the page scrolls
  // to it and it's highlighted for a moment. onFocused clears it.
  focusRowId?: string | null
  onFocused?: () => void
  // Opens the plan made from this row (the status badge).
  onOpenPlan: (id: string) => void
  // slotId: file the new reference straight into that video (the empty video's "Add from link"); none = Unsorted.
  onAddFromLink: (input: LinkInput, slotId?: string) => void
  // Opens the video's breakdown, when the app has it.
  onOpenVideo: (videoId: string) => void
  // The saved video behind a row (for its cover and length in the Video layout), when the app still has it.
  videoOf?: (videoId: string) => Video | undefined
  onFindIdeas: () => void
  // Platforms "Add from link" offers.
  platforms: Platform[]
  // Content slots (the videos the client is paying for): this client's, in number order.
  slots: ResearchSlot[]
  summaryOf: (slot: ResearchSlot) => SlotSummary
  // "+ Add video": a new slot with its number, title, due date and any references (filed straight into it).
  // Returns the new slot's id.
  onCreateSlot: (video: NewVideo) => string
  onUpdateSlot: (id: string, patch: Partial<Pick<ResearchSlot, 'topic' | 'dueDate'>>) => void
  // Removes the slot; its references move to Unsorted (their plans are untouched).
  onRemoveSlot: (id: string) => void
  // slotId null = Unsorted. Offered only on Unsorted rows ("Move to").
  onMoveEntry: (entryId: string, slotId: string | null) => void
}

const statusKey: Record<ResearchStatus, Key> = {
  none: 'research.status.none',
  planning: 'research.status.planning',
  waiting: 'research.status.waiting',
  approved: 'research.status.approved',
  filming: 'research.status.filming',
  editing: 'research.status.editing',
  posted: 'research.status.posted',
}
const statusText = (s: ResearchStatus) => t(statusKey[s])

interface Column {
  key: SortKey
  label: Key
}
const PLATFORM_ORDER = ['tiktok', 'instagram', 'youtube']
const platformRank = (p: string) => {
  const i = PLATFORM_ORDER.indexOf(p)
  return i === -1 ? PLATFORM_ORDER.length : i
}

// The sheet's columns: the CSV's columns, and what the Sort dropdown offers.
const COLUMNS: Column[] = [
  { key: 'account', label: 'research.col.account' },
  { key: 'platform', label: 'research.col.platform' },
  { key: 'followers', label: 'research.col.followers' },
  { key: 'views', label: 'research.col.views' },
  { key: 'keywords', label: 'research.col.keywords' },
  { key: 'hook', label: 'research.col.hook' },
  { key: 'notes', label: 'research.col.notes' },
  { key: 'status', label: 'research.col.status' },
]

const count = (n: number) => (n > 0 ? compact(n) : '—')

// The × on "Remove" buttons.
const cross = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

const searchIcon = (
  <svg className="rs-search-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </svg>
)

// Cards (index + detail) or Sheet (one ledger of every video and its references), remembered in this browser.
// 'video': the Sheet's video layout (founder, 4 Nov 2026), a shelf of covers per video instead of table rows.
type View = 'cards' | 'sheet' | 'video'
const VIEW_KEY = 'remake.research.view'
function readView(): View {
  try {
    const v = globalThis.localStorage?.getItem(VIEW_KEY)
    return v === 'cards' || v === 'video' ? v : 'sheet'
  } catch {
    return 'sheet'
  }
}
function writeView(v: View): void {
  try {
    globalThis.localStorage?.setItem(VIEW_KEY, v)
  } catch {
    /* private window or blocked storage: the view just won't be remembered */
  }
}

export function ResearchScreen(p: ResearchScreenProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const sort: Sort = DEFAULT_SORT
  // "Add from link" open: from the header (files into Unsorted) or from an empty video (files into it).
  const [adding, setAdding] = useState<{ slotId?: string } | null>(null)
  const [addingSlot, setAddingSlot] = useState(false)
  // The video shown on the right, and the search it was chosen under (a new search may move to the first match).
  const [selected, setSelected] = useState<{ id: string; q: string } | null>(null)
  // The row asking "Remove this row?".
  const [removing, setRemoving] = useState<string | null>(null)
  // Said to screen readers after a move ("Moved @x to video 3.").
  const [announce, setAnnounce] = useState('')
  // The row just brought into view, highlighted for a moment.
  const [flash, setFlash] = useState<string | null>(null)
  // The row asking before its Status change deletes a plan.
  const [asking, setAsking] = useState<{ id: string; to: RowPick; text: string } | null>(null)
  // The row just sent to Plans by picking it: the row says so and a message offers "Open Plans →".
  const [sent, setSent] = useState<{ id: string; account: string } | null>(null)
  // The slot asking "Remove slot 3?".
  const [removingSlot, setRemovingSlot] = useState<string | null>(null)
  const [view, setViewState] = useState<View>(readView)
  const setView = (v: View) => {
    setViewState(v)
    writeView(v)
  }
  // Sheet view: which videos are dropped down. Untouched videos follow the default (Videos 1 and 2, and Unsorted).
  // While searching, every video with matches starts open; toggles then apply to that search only.
  const [sheetOpen, setSheetOpen] = useState<Record<string, boolean>>({})
  const [searchOpen, setSearchOpen] = useState<{ q: string; map: Record<string, boolean> }>({ q: '', map: {} })
  const addBtn = useRef<HTMLButtonElement>(null)
  const slotBtn = useRef<HTMLButtonElement>(null)
  const lang = getActiveLang()
  const clientId = p.client.id

  const { statusOf, summaryOf } = p
  const rows = useMemo(() => {
    const kept = p.entries.filter((e) => matches(e, query))
    // Platforms always in this order (founder, 4 Nov 2026): TikTok, Instagram, YouTube, then the rest.
    // The sort is stable, so inside one platform the default order (newest first) stays.
    return sortRows(kept, sort, statusOf, lang).sort((a, b) => platformRank(a.platform) - platformRank(b.platform))
  }, [p.entries, query, sort, statusOf, lang])

  const groups = useMemo(() => groupRows(p.slots, p.entries, rows, summaryOf), [p.slots, p.entries, rows, summaryOf])

  const filtered = !!query.trim()
  const filterKey = query.trim()
  const clearFilters = () => {
    setQuery('')
  }

  // A new client's page starts on its own first video.
  const [selClient, setSelClient] = useState(clientId)
  if (selClient !== clientId) {
    setSelClient(clientId)
    setSelected(null)
    setSheetOpen({})
  }
  const select = (groupId: string) => setSelected({ id: groupId, q: filterKey })

  // The index: every video, then Unsorted when it has references. While searching, every video stays listed
  // (with its match count); the one shown moves to the first with matches unless chosen during this search.
  const indexGroups = groups.filter((g) => g.slot || g.total > 0)
  let current = indexGroups.find((g) => g.id === selected?.id) ?? indexGroups[0]
  if (filtered && current && current.rows.length === 0 && selected?.q !== filterKey)
    current = indexGroups.find((g) => g.rows.length > 0) ?? current

  // "Open in Research": show the row's video, scroll to it, highlight it. Runs once per request.
  const focusRowId = p.focusRowId
  const onFocused = p.onFocused
  const focusEntry = focusRowId ? p.entries.find((e) => e.id === focusRowId) : undefined
  const focusGroup = focusEntry
    ? focusEntry.slotId && p.slots.some((s) => s.id === focusEntry.slotId)
      ? focusEntry.slotId
      : UNSORTED
    : null
  useEffect(() => {
    if (!focusRowId || !focusGroup) return
    setSelected({ id: focusGroup, q: '' })
    setSheetOpen((m) => ({ ...m, [focusGroup]: true }))
    setFlash(focusRowId)
    onFocused?.()
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(`${id}-card-${focusRowId}`)
        const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        el?.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' })
      }),
    )
    const done = window.setTimeout(() => setFlash(null), 2600)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(done)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRowId, focusGroup])

  // A new client's sheet starts without the last client's "Sent to Plans" message.
  const [sentClient, setSentClient] = useState(clientId)
  if (sentClient !== clientId) {
    setSentClient(clientId)
    setSent(null)
  }
  // The row just sent to Plans moves to the top of its video; highlight it for a moment so the eye can follow.
  const sentId = sent?.id
  useEffect(() => {
    if (!sentId) return
    setFlash(sentId)
    const done = window.setTimeout(() => setFlash((f) => (f === sentId ? null : f)), 2600)
    return () => window.clearTimeout(done)
  }, [sentId])
  // Picking: the plan is made at once (Still planning) and the page says so, without leaving Research.
  const pick = (e: ResearchEntry) => {
    p.onPick(e.id, 'picked')
    setSent({ id: e.id, account: e.account })
  }

  const closeAdd = () => {
    const fromTop = !adding?.slotId
    setAdding(null)
    if (fromTop) requestAnimationFrame(() => addBtn.current?.focus())
  }
  const closeSlotForm = () => {
    setAddingSlot(false)
    requestAnimationFrame(() => slotBtn.current?.focus())
  }
  const toggleSlotForm = () => (addingSlot ? closeSlotForm() : setAddingSlot(true))

  const exportCsv = () => {
    const head = [
      t('research.col.slot'),
      t('research.col.slotTopic'),
      ...COLUMNS.map((c) => t(c.label)),
      t('research.col.link'),
      t('research.col.logged'),
    ]
    // Slots in number order, then Unsorted (no slot number); inside each, the sheet's current sort.
    const body = groups.flatMap((g) =>
      g.rows.map((e) => {
        return [
          g.slot ? g.slot.number : '',
          g.slot ? g.slot.topic : '',
          e.account,
          platformName[e.platform],
          e.followers,
          e.views,
          e.keywords.join(', '),
          e.hook,
          e.notes,
          statusText(statusOf(e)),
          e.url ?? '',
          isoDate(e.loggedAt),
        ]
      }),
    )
    downloadCsv(`${fileSlug(p.client.name, p.client.id)}-research-${isoDate(Date.now())}.csv`, toCsv([head, ...body]))
  }

  // "11 Nov" from "2026-11-11", in the page's language.
  const shortDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    return new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
  }

  // Parts of a reference card.
  const field = (key: Key, e: ResearchEntry) => t('research.edit.field', { field: t(key), account: e.account })
  const accountCell = (e: ResearchEntry) => (
    <span className="rs-account">
      <button type="button" className="rs-account-btn" title={`${e.account} · ${t('research.openVideo')}`} onClick={() => p.onOpenVideo(e.videoId)}>
        {e.account}
      </button>
      {e.url && (
        <a
          className="rs-ext"
          href={e.url}
          target="_blank"
          rel="noreferrer"
          aria-label={t('research.openLink', { account: e.account, platform: platformName[e.platform] })}
          title={t('research.openLink', { account: e.account, platform: platformName[e.platform] })}
        >
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 4h6v6" />
            <path d="M20 4l-9 9" />
            <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
          </svg>
        </a>
      )}
    </span>
  )
  const hookCell = (e: ResearchEntry) => (
    <EditableText
      value={e.hook}
      field={t('research.col.hook')}
      label={field('research.col.hook', e)}
      empty={t('research.edit.addHook')}
      editLabel={t('research.edit.hook')}
      onSave={(hook) => p.onUpdate(e.id, { hook })}
    />
  )
  // Picked: the plan's status as a badge that opens the plan ("Waiting for approval" while the manager decides),
  // and "Sent to Plans" just after picking.
  const statusBadge = (e: ResearchEntry, role: RowRole) => {
    if (role !== 'picked') return null
    const s = statusOf(e)
    return (
      <>
        <button
          type="button"
          className={`rs-status rs-status-${s}`}
          aria-label={t('research.openPlanAria', { account: e.account, status: statusText(s) })}
          onClick={() => p.onOpenPlan(e.id)}
        >
          {statusText(s)}
        </button>
        {sent?.id === e.id && (
          <span className="rs-sent small">
            <span aria-hidden="true">✓</span> {t('research.sent.row')}
          </span>
        )}
      </>
    )
  }
  // Status: three buttons (Not picked / Backup / ★ Picked). Picking sends the row to Plans at once (Still planning)
  // and moves it to the top of its video. A plan past Still planning is locked here: it changes on Plans, where the
  // manager approves. Un-picking deletes the plan and asks first; picking another row in the same video asks only
  // when the earlier pick's plan has work in it.
  const pickInfo = (e: ResearchEntry, group: Group): PickInfo => {
    const s = statusOf(e)
    const value: RowPick = s !== 'none' ? 'picked' : e.backup ? 'backup' : 'none'
    const referenceOnly = p.canPick?.(e) === false
    const locked = referenceOnly || s !== 'none' && s !== 'planning'
    const other = group.summary?.picked && group.summary.picked.id !== e.id ? group.summary.picked : undefined
    const otherLocked = !!other && group.summary!.status !== 'planning'
    const choose = (to: RowPick) => {
      if (referenceOnly || to === value) return
      if (value === 'picked') return setAsking({ id: e.id, to, text: t('research.pick.askUnpick', { account: e.account }) })
      if (to === 'picked' && other && (p.planHasWork?.(other) ?? true))
        return setAsking({ id: e.id, to, text: t('research.pick.askSwitch', { account: other.account }) })
      if (to === 'picked') return pick(e)
      if (sent?.id === e.id) setSent(null)
      p.onPick(e.id, to)
    }
    return { referenceOnly, status: s, isPicked: value === 'picked', locked, otherLocked, choose }
  }
  // "This deletes the plan for …": Continue / Cancel, under the pick control.
  const askBox = (e: ResearchEntry) => {
    if (asking?.id !== e.id) return null
    return (
      <span className="rs-remove-ask" role="group" aria-label={asking.text}>
        <span className="small">{asking.text}</span>
        <button
          type="button"
          className="link-btn rs-remove-yes"
          autoFocus
          onClick={() => {
            setAsking(null)
            if (asking.to === 'picked') return pick(e)
            if (sent?.id === e.id) setSent(null)
            p.onPick(e.id, asking.to)
          }}
        >
          {t('research.pick.yes')}
        </button>
        <button type="button" className="link-btn" onClick={() => setAsking(null)}>
          {t('research.pick.no')}
        </button>
      </span>
    )
  }
  const pickControl = (e: ResearchEntry, group: Group) => {
    const { status: s, isPicked, locked, otherLocked, referenceOnly, choose } = pickInfo(e, group)
    // One button (founder, 4 Nov 2026): "Pick this", or "★ Picked" to take the pick back.
    return (
      <span className="rs-pick-wrap">
        <button
          type="button"
          className={`btn btn-sm rs-pick-btn${isPicked ? ' is-picked' : ''}`}
          aria-pressed={isPicked}
          aria-label={t(isPicked ? 'research.pick.unpickAria' : 'research.pick.pickAria', { account: e.account })}
          disabled={locked || (!isPicked && otherLocked)}
          onClick={() => choose(isPicked ? 'none' : 'picked')}
        >
          {t(isPicked ? 'research.pick.picked' : 'research.pick.pickThis')}
        </button>
        {locked && <span className="rs-locked small muted">{referenceOnly ? t('research.referenceOnly') : t('research.pick.locked', { status: statusText(s) })}</span>}
        {askBox(e)}
      </span>
    )
  }
  // Removing a row now asks in a pop-up (ConfirmRemoveRow), so nothing shows inline.
  const removeAsk = (): null => null
  // The ✕ (rows not planned only).
  const removeBtn = (e: ResearchEntry) => {
    if (statusOf(e) !== 'none') return null
    return (
      <button
        type="button"
        className="rs-x rs-x-round"
        aria-label={t('research.removeAria', { account: e.account })}
        title={t('research.remove')}
        onClick={() => setRemoving(e.id)}
      >
        {cross}
      </button>
    )
  }
  const removeCell = (e: ResearchEntry) => removeBtn(e)
  // "Move to": only on Unsorted rows (e.g. saved as "Not sure yet"), to file them under one of the videos.
  const moveCell = (e: ResearchEntry) => (
    <label className="rs-move">
      <span className="rs-move-label" aria-hidden="true">
        {t('research.move.label')}
      </span>
      <select
        id={`${id}-mv-${e.id}`}
        value=""
        aria-label={t('research.move.aria', { account: e.account })}
        onChange={(ev) => {
          const slot = p.slots.find((s) => s.id === ev.target.value)
          if (!slot) return
          p.onMoveEntry(e.id, slot.id)
          setAnnounce(t('research.moved', { account: e.account, group: t('research.slot.name', { n: slot.number }) }))
        }}
      >
        <option value="" disabled>
          {t('research.move.pick')}
        </option>
        {p.slots.map((s) => (
          <option key={s.id} value={s.id}>
            {t('research.move.option', { n: s.number, topic: s.topic || '—' })}
          </option>
        ))}
      </select>
    </label>
  )

  // One reference video as a card.
  const refCard = (e: ResearchEntry, g: Group) => {
    const role = rowRole(e, g)
    const cls = ['rs-rc', role === 'picked' ? 'is-picked' : role === 'backup' ? 'is-backup' : '', flash === e.id ? 'is-flash' : '']
    return (
      <li key={e.id} id={`${id}-card-${e.id}`} className={cls.filter(Boolean).join(' ')}>
        <span className="rs-rc-plat" title={platformName[e.platform]}>
          <PlatformGlyph platform={e.platform} />
        </span>
        <div className="rs-rc-body">
          {/* Same order as every video card: title (the hook), account, then followers → views. */}
          <div className="rs-rc-hook">{hookCell(e)}</div>
          <div className="rs-rc-top">
            {accountCell(e)}
            <span className="rs-rc-platname">{platformName[e.platform]}</span>
            {statusBadge(e, role)}
          </div>
          <p className="rs-rc-reach">
            <span className="sr-only">{t('research.card.reach', { followers: count(e.followers), views: count(e.views) })}</span>
            <span aria-hidden="true" className="rs-rc-reach-in">
              <span className="rs-rc-n">{count(e.followers)}</span>
              <span className="rs-rc-u">{t('research.card.followers')}</span>
              <span className="rs-rc-arrow">→</span>
              <span className="rs-rc-n is-big">{count(e.views)}</span>
              <span className="rs-rc-u">{t('research.card.views')}</span>
            </span>
          </p>
        </div>
        <div className="rs-rc-side">
          {/* ✕ first: it sits in the card's top-right corner, above the pick button. */}
          <span className="rs-actions">{removeCell(e)}</span>
          {pickControl(e, g)}
          {g.id === UNSORTED && p.slots.length > 0 && moveCell(e)}
        </div>
      </li>
    )
  }

  // The selected video's header: number, topic, due date, remove. (No summary line or sort controls: founder, 4 Nov 2026.)
  const detailHead = (g: Group) => {
    const headId = `${id}-dh`
    if (!g.slot)
      return (
        <div className="rs-dhead">
          <div className="rs-dhead-top">
            <span className="rs-vlabel">{t('research.unsorted')}</span>
          </div>
          <h2 id={headId} className="rs-topic">
            {t('research.unsorted')}
          </h2>
          <p className="rs-dhelp small muted">{t('research.unsorted.help')}</p>
        </div>
      )
    const slot = g.slot
    const n = slot.number
    return (
      <div className="rs-dhead">
        <div className="rs-dhead-top">
          <span className="rs-vlabel" id={headId}>
            {t('research.slot.videoNo', { n })}
          </span>
          <span className="rs-group-remove">
            <button
              type="button"
              className="rs-x rs-x-round"
              aria-label={t('research.slot.removeAria', { n })}
              title={t('research.slot.remove')}
              onClick={() => setRemovingSlot(slot.id)}
            >
              {cross}
            </button>
          </span>
        </div>
        <div className="rs-topic" role="heading" aria-level={2}>
          <EditableText
            value={slot.topic}
            field={t('research.slot.topicField')}
            label={t('research.slot.topicLabel', { n })}
            empty={t('research.slot.addTopic')}
            editLabel={t('research.edit.topic')}
            onSave={(topic) => {
              if (topic) p.onUpdateSlot(slot.id, { topic })
            }}
          />
        </div>
        <div className="rs-dmeta">
          <label className="rs-dfield">
            <span className="rs-dlabel" aria-hidden="true">
              {t('research.slot.due')}
            </span>
            <input
              type="date"
              value={slot.dueDate ?? ''}
              aria-label={t('research.slot.dueLabel', { n })}
              onChange={(ev) => p.onUpdateSlot(slot.id, { dueDate: ev.target.value || undefined })}
            />
          </label>
        </div>
      </div>
    )
  }

  const addPanel = (slotId?: string) => (
    <div id={`${id}-add`}>
      <AddFromLink
        platforms={p.platforms}
        onCancel={closeAdd}
        onAdd={(input) => {
          p.onAddFromLink(input, slotId)
          // Show where it went.
          select(slotId ?? UNSORTED)
          closeAdd()
        }}
      />
    </div>
  )

  const detailBody = (g: Group) => {
    if (g.slot && adding?.slotId === g.slot.id) return addPanel(g.slot.id)
    if (g.total === 0)
      return (
        <div className="rs-slot-empty">
          <span className="rs-slot-empty-ill" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M10 9.5v5l4-2.5z" />
            </svg>
          </span>
          <h3>{t('research.empty.title')}</h3>
          <p>{g.slot?.topic ? t('research.slot.emptyBody', { topic: g.slot.topic }) : t('research.slot.emptyBodyPlain')}</p>
          <div className="rs-slot-empty-actions">
            <button type="button" className="btn btn-primary" onClick={p.onFindIdeas}>
              {t('research.empty.find')}
            </button>
            {g.slot && (
              <button type="button" className="btn btn-ghost" onClick={() => setAdding({ slotId: g.slot!.id })}>
                {t('research.add')}
              </button>
            )}
          </div>
        </div>
      )
    if (g.rows.length === 0)
      return (
        <p className="rs-nomatch">
          {t('research.detail.noMatch', {
            group: g.slot ? t('research.slot.videoNo', { n: g.slot.number }) : t('research.unsorted.name'),
            q: filterKey,
          })}
        </p>
      )
    return <ul className="rs-rc-list">{g.rows.map((e) => refCard(e, g))}</ul>
  }

  // The Sheet view: every video (and Unsorted when it has references); while searching, only those with matches.
  const sheetGroups = indexGroups.filter((g) => !filtered || g.rows.length > 0)
  const isOpen = (groupId: string) => {
    if (filtered) return (searchOpen.q === filterKey ? searchOpen.map[groupId] : undefined) ?? true
    // Live workspaces start closed; the prepared case and search matches start open.
    return sheetOpen[groupId] ?? (!!getGuidedRuntime() && p.client.id === GUIDED_IDS.clientId)
  }
  const toggleOpen = (groupId: string) => {
    const next = !isOpen(groupId)
    if (filtered)
      setSearchOpen((o) => ({ q: filterKey, map: { ...(o.q === filterKey ? o.map : {}), [groupId]: next } }))
    else setSheetOpen((m) => ({ ...m, [groupId]: next }))
  }
  const kit: SheetKit = {
    accountCell,
    pickInfo,
    askBox,
    statusBadge,
    removeBtn,
    removeAsk,
    moveCell: (e) => (p.slots.length > 0 ? moveCell(e) : null),
    statusText,
  }

  const noEntries = p.entries.length === 0
  const empty = noEntries && p.slots.length === 0

  return (
    <section className={`client research${view !== 'cards' ? ' is-sheet' : ''}`}>
      {/* Sheet or Video (founder, 4 Nov 2026): the same videos as table rows or as a shelf of covers. */}
      {/* Always shown, so it's easy to find (founder, 4 Nov 2026); from Cards it jumps to that layout. */}
      {!empty && (
        <div className="rs-layout" role="group" aria-label={t('research.layout.aria')}>
          <span className="rs-viewswitch-k" aria-hidden="true">
            {t('research.view.label')}
          </span>
          <button type="button" aria-pressed={view === 'sheet'} onClick={() => setView('sheet')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 5h18M3 12h18M3 19h18" />
            </svg>
            {t('research.view.sheet')}
          </button>
          <button type="button" aria-pressed={view === 'video'} onClick={() => setView('video')}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
              <rect x="3" y="4" width="7" height="16" rx="2" />
              <rect x="14" y="4" width="7" height="16" rx="2" />
            </svg>
            {t('research.layout.video')}
          </button>
        </div>
      )}
      <header className="rs-hero">
        <h1>{t('research.title')}</h1>
        {!noEntries && (
          <div className="rs-toolbar" role="search">
            <label className="field rs-search">
              <span className="field-label">{t('research.search.label')}</span>
              <span className="rs-search-box">
                {searchIcon}
                <input
                  id={`${id}-search`}
                  type="search"
                  placeholder={t('research.search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </span>
            </label>
          </div>
        )}
        <div className="rs-head-actions">
          <button
            ref={slotBtn}
            type="button"
            className="btn btn-ghost"
            aria-expanded={addingSlot}
            aria-controls={addingSlot ? `${id}-slot` : undefined}
            onClick={toggleSlotForm}
          >
            <span aria-hidden="true">+</span> {t('research.newSlot')}
          </button>
          <button
            ref={addBtn}
            type="button"
            className="btn btn-primary"
            aria-expanded={!!adding && !adding.slotId}
            aria-controls={adding && !adding.slotId ? `${id}-add` : undefined}
            onClick={() => (adding && !adding.slotId ? closeAdd() : setAdding({}))}
          >
            {t('research.add')}
          </button>
          {!noEntries && (
            <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!rows.length}>
              {t('research.export')}
            </button>
          )}
        </div>
      </header>

      {addingSlot && (
        <div id={`${id}-slot`}>
          <NewSlotForm
            taken={p.slots.map((s) => s.number)}
            platforms={p.platforms}
            onCancel={closeSlotForm}
            onCreate={(video) => {
              // Show the new video (and drop it down in the Sheet view).
              const slotId = p.onCreateSlot(video)
              select(slotId)
              setSheetOpen((m) => ({ ...m, [slotId]: true }))
              closeSlotForm()
            }}
          />
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {removing &&
        (() => {
          const row = p.entries.find((x) => x.id === removing)
          if (!row) return null
          return (
            <ConfirmRemoveRow
              account={row.account}
              onCancel={() => setRemoving(null)}
              onConfirm={() => {
                setRemoving(null)
                p.onRemove(row.id)
                requestAnimationFrame(() => document.getElementById(`${id}-search`)?.focus())
              }}
            />
          )
        })()}

      {removingSlot &&
        (() => {
          const slot = p.slots.find((x) => x.id === removingSlot)
          if (!slot) return null
          return (
            <ConfirmRemoveSlot
              n={slot.number}
              topic={slot.topic}
              onCancel={() => setRemovingSlot(null)}
              onConfirm={() => {
                setRemovingSlot(null)
                p.onRemoveSlot(slot.id)
                requestAnimationFrame(() => slotBtn.current?.focus())
              }}
            />
          )
        })()}

      {/* "Sent to Plans": stays until closed or the next pick, so there's time to open Plans. */}
      <div className="rs-sent-live" role="status" aria-live="polite">
        {sent && (
          <div className="toast rs-sent-toast">
            <span className="toast-ok" aria-hidden="true">✓</span>
            <span className="toast-msg">{t('research.sent.toast', { account: sent.account })}</span>
            {p.onOpenPlans && (
              <button type="button" className="btn btn-primary btn-sm" onClick={p.onOpenPlans}>
                {t('research.sent.open')}
              </button>
            )}
            <button type="button" className="toast-x" onClick={() => setSent(null)} aria-label={t('research.sent.dismiss')}>
              ✕
            </button>
          </div>
        )}
      </div>

      {adding && !adding.slotId && addPanel()}

      {empty ? (
        <div className="empty">
          <h2>{t('research.empty.title')}</h2>
          <p>{t('research.empty.body')}</p>
          <button type="button" className="btn btn-primary" onClick={p.onFindIdeas}>
            {t('research.empty.find')}
          </button>
        </div>
      ) : filtered && rows.length === 0 ? (
        <div className="empty">
          <h2>{t('research.none.title')}</h2>
          <p>{t('research.none.body')}</p>
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            {t('research.filter.clear')}
          </button>
        </div>
      ) : view !== 'cards' ? (
        <ResearchSheet
          uid={id}
          layout={view === 'video' ? 'shelf' : 'rows'}
          videoOf={p.videoOf}
          onOpenVideo={p.onOpenVideo}
          caption={t('research.caption', { client: p.client.name })}
          groups={sheetGroups}
          filtered={filtered}
          isOpen={isOpen}
          onToggle={toggleOpen}
          flash={flash}
          onUpdate={p.onUpdate}
          onUpdateSlot={p.onUpdateSlot}
          onAskRemoveSlot={setRemovingSlot}
          onFindIdeas={p.onFindIdeas}
          onAddFromLink={(slotId) => setAdding({ slotId })}
          addingSlotId={adding?.slotId}
          addPanel={addPanel}
          kit={kit}
        />
      ) : (
        <div className="rs-body">
          <div className="rs-labelrow">
            <span className="rs-labelrow-k">{t('research.index.title', { n: p.slots.length })}</span>
          </div>
          <div className="rs-panes">
            <nav className="rs-index" aria-label={t('research.index.aria')}>
              <ol>
                {indexGroups.map((g) => {
                  const on = g.id === current?.id
                  const refs = !g.total
                    ? t('research.index.noRefs')
                    : filtered
                      ? t('research.index.matches', { shown: g.rows.length, n: g.total })
                      : tp('research.index.refs', g.total)
                  return (
                    <li key={g.id}>
                      <button
                        type="button"
                        className={`rs-slot-btn${filtered && g.rows.length === 0 ? ' is-dim' : ''}`}
                        aria-current={on ? 'true' : undefined}
                        aria-controls={`${id}-detail`}
                        onClick={() => select(g.id)}
                      >
                        <span className={`rs-tile${g.slot ? (g.total ? '' : ' is-empty') : ' is-unsorted'}`} aria-hidden="true">
                          {g.slot ? g.slot.number : '?'}
                        </span>
                        <span className="rs-slot-txt">
                          <span className="rs-slot-topic">
                            {g.slot && <span className="sr-only">{t('research.slot.videoNo', { n: g.slot.number })}: </span>}
                            {g.slot ? g.slot.topic || t('research.slot.addTopic') : t('research.unsorted')}
                          </span>
                          <span className="rs-slot-meta">
                            <span>{refs}</span>
                            {g.slot?.dueDate && (
                              <>
                                <span className="rs-slot-dot" aria-hidden="true">
                                  ·
                                </span>
                                <span>{t('research.index.due', { date: shortDate(g.slot.dueDate) })}</span>
                              </>
                            )}
                            {g.summary?.picked && <span className="rs-picked-tag">{t('research.pick.picked')}</span>}
                          </span>
                        </span>
                      </button>
                      {/* Bin: deletes this video, after the pop-up asks. */}
                      {g.slot && (
                        <button
                          type="button"
                          className="rs-slot-bin"
                          aria-label={t('research.slot.removeAria', { n: g.slot.number })}
                          title={t('research.slot.remove')}
                          onClick={() => setRemovingSlot(g.slot!.id)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                          </svg>
                        </button>
                      )}
                    </li>
                  )
                })}
              </ol>
              <button type="button" className="rs-index-add" aria-expanded={addingSlot} onClick={toggleSlotForm}>
                <span aria-hidden="true">+</span> {t('research.newSlot')}
              </button>
            </nav>
            <section id={`${id}-detail`} className="rs-detail" aria-labelledby={current ? `${id}-dh` : undefined}>
              {current && (
                <>
                  {detailHead(current)}
                  {detailBody(current)}
                </>
              )}
            </section>
          </div>
        </div>
      )}

      {!empty && (
        <div className="rs-viewswitch-wrap">
          <div className="rs-viewswitch" role="group" aria-label={t('research.view.aria')}>
            <span className="rs-viewswitch-k" aria-hidden="true">
              {t('research.view.label')}
            </span>
            <button type="button" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="18" rx="2" />
                <rect x="14" y="3" width="7" height="8" rx="2" />
                <rect x="14" y="14" width="7" height="7" rx="2" />
              </svg>
              {t('research.view.cards')}
            </button>
            <button type="button" aria-pressed={view !== 'cards'} onClick={() => view === 'cards' && setView('sheet')}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M3 5h18M3 12h18M3 19h18" />
              </svg>
              {t('research.view.sheet')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
