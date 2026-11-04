import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Client, Platform } from '../../types'
import type { LinkInput, ResearchEntry, ResearchSlot, ResearchStatus, SlotSummary } from '../../lib/research'
import { getActiveLang, t } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'
import { compact, platformName } from '../../lib/metrics'
import { PlatformLogo } from '../PlatformToggles'
import { AddFromLink } from './AddFromLink'
import { EditableText } from './EditableText'
import { NewSlotForm } from './NewSlotForm'
import type { NewVideo } from './NewSlotForm'
import {
  DEFAULT_SORT,
  downloadCsv,
  fileSlug,
  firstDir,
  isoDate,
  matches,
  parseKeywords,
  sameList,
  sortRows,
  toCsv,
} from './sheet'
import type { Sort, SortKey } from './sheet'
import { UNSORTED, groupRows, readOpen, rowRole, writeOpen } from './slots'
import type { Group, OpenMap, RowRole } from './slots'

// The Research tab: one client's sheet of reference videos (what's out there), replacing the agency's Excel sheet.
// It is for deciding what to make; picking a row ("★ Picked") sends it to the Plans board at once, as a plan in
// Still planning, and the page says so without leaving Research.
export type RowPick = 'none' | 'backup' | 'picked'

export interface ResearchScreenProps {
  client: Client
  // This client's rows only.
  entries: ResearchEntry[]
  statusOf: (e: ResearchEntry) => ResearchStatus
  // Edits from the sheet: keywords, hook and other info only.
  onUpdate: (id: string, patch: Partial<Pick<ResearchEntry, 'keywords' | 'hook' | 'notes'>>) => void
  onRemove: (id: string) => void
  // The Status dropdown. 'picked' makes the row's plan (Still planning) without leaving the page; the video's
  // earlier pick steps down to Backup and its plan is deleted. 'none' / 'backup' on a picked row deletes its plan.
  onPick: (id: string, pick: RowPick) => void
  // Whether a picked row's plan has work in it (shots, notes, sent before). Picking another row in the same video
  // asks first only then; an untouched plan is replaced at once. Without it, every switch asks.
  planHasWork?: (e: ResearchEntry) => boolean
  // "Open Plans →" in the "Sent to Plans" message: the Plans board.
  onOpenPlans?: () => void
  // A row to bring into view on arrival (Find ideas' "Open in Research"): its video opens, the page scrolls to
  // it and it's highlighted for a moment. onFocused clears it.
  focusRowId?: string | null
  onFocused?: () => void
  // Opens the plan made from this row (the Status cell).
  onOpenPlan: (id: string) => void
  onAddFromLink: (input: LinkInput) => void
  // Opens the video's breakdown, when the app has it.
  onOpenVideo: (videoId: string) => void
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
  numeric?: boolean
}
const COLUMNS: Column[] = [
  { key: 'account', label: 'research.col.account' },
  { key: 'platform', label: 'research.col.platform' },
  { key: 'followers', label: 'research.col.followers', numeric: true },
  { key: 'views', label: 'research.col.views', numeric: true },
  { key: 'keywords', label: 'research.col.keywords' },
  { key: 'hook', label: 'research.col.hook' },
  { key: 'notes', label: 'research.col.notes' },
  { key: 'status', label: 'research.col.status' },
]
// The data columns plus the actions column.
const SPAN = COLUMNS.length + 1

const count = (n: number) => (n > 0 ? compact(n) : '—')

// The × on "Remove" buttons.
const cross = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)


export function ResearchScreen(p: ResearchScreenProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT)
  const [adding, setAdding] = useState(false)
  const [addingSlot, setAddingSlot] = useState(false)
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
  const addBtn = useRef<HTMLButtonElement>(null)
  const slotBtn = useRef<HTMLButtonElement>(null)
  const lang = getActiveLang()
  const clientId = p.client.id

  const { statusOf, summaryOf } = p
  const rows = useMemo(() => {
    const kept = p.entries.filter((e) => matches(e, query))
    return sortRows(kept, sort, statusOf, lang)
  }, [p.entries, query, sort, statusOf, lang])

  const groups = useMemo(() => groupRows(p.slots, p.entries, rows, summaryOf), [p.slots, p.entries, rows, summaryOf])

  const filtered = !!query.trim()
  const filterKey = query.trim()
  const clearFilters = () => {
    setQuery('')
  }

  // Open / closed groups. Without a search: what this person chose for this client (remembered in the browser),
  // else closed: every video starts collapsed and is opened by hand. While searching or filtering: every group with matches is open,
  // unless closed during this search.
  const [stored, setStored] = useState<{ client: string; map: OpenMap }>(() => ({ client: clientId, map: readOpen(clientId) }))
  const openMap = stored.client === clientId ? stored.map : readOpen(clientId)
  const [filterClosed, setFilterClosed] = useState<{ key: string; ids: string[] }>({ key: '', ids: [] })
  const isOpen = (g: Group) =>
    filtered
      ? !(filterClosed.key === filterKey && filterClosed.ids.includes(g.id))
      : (openMap[g.id] ?? false)
  const remember = (groupId: string, open: boolean) =>
    setStored((prev) => {
      const base = prev.client === clientId ? prev.map : readOpen(clientId)
      const map = { ...base, [groupId]: open }
      writeOpen(clientId, map)
      return { client: clientId, map }
    })
  const setOpen = (groupId: string, open: boolean) => {
    if (!filtered) return remember(groupId, open)
    setFilterClosed((fc) => {
      const ids = fc.key === filterKey ? fc.ids.filter((x) => x !== groupId) : []
      return { key: filterKey, ids: open ? ids : [...ids, groupId] }
    })
  }

  // "Open in Research": open the row's video, scroll to it, highlight it. Runs once per request.
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
    remember(focusGroup, true)
    setFlash(focusRowId)
    onFocused?.()
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = [`${id}-row-${focusRowId}`, `${id}-card-${focusRowId}`]
          .map((x) => document.getElementById(x))
          .find((x) => x && x.getClientRects().length > 0)
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

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: firstDir(key) }))

  const closeAdd = () => {
    setAdding(false)
    requestAnimationFrame(() => addBtn.current?.focus())
  }
  const closeSlotForm = () => {
    setAddingSlot(false)
    requestAnimationFrame(() => slotBtn.current?.focus())
  }


  const toggleId = (groupId: string, phone: boolean) => `${id}-${phone ? 'gc' : 'g'}-${groupId}`


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

  // Cells shared by the table and the phone cards.
  const field = (key: Key, e: ResearchEntry) => t('research.edit.field', { field: t(key), account: e.account })
  const accountCell = (e: ResearchEntry) => (
    <span className="rs-account">
      <button type="button" className="rs-account-btn" title={t('research.openVideo')} onClick={() => p.onOpenVideo(e.videoId)}>
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
  const platformCell = (e: ResearchEntry) => (
    <span className="rs-platform" title={platformName[e.platform]}>
      <PlatformLogo platform={e.platform} size={22} />
      <span className="sr-only">{platformName[e.platform]}</span>
    </span>
  )
  const keywordsCell = (e: ResearchEntry) => (
    <EditableText
      value={e.keywords.join(', ')}
      field={t('research.col.keywords')}
      label={field('research.col.keywords', e)}
      empty={t('research.edit.addKeywords')}
      hint={t('research.edit.keywordsHint')}
      onSave={(next) => {
        const keywords = parseKeywords(next)
        if (!sameList(keywords, e.keywords)) p.onUpdate(e.id, { keywords })
      }}
    >
      <span className="rs-chips">
        {e.keywords.map((k) => (
          <span key={k} className="rs-chip">
            {k}
          </span>
        ))}
      </span>
    </EditableText>
  )
  const hookCell = (e: ResearchEntry) => (
    <EditableText
      value={e.hook}
      field={t('research.col.hook')}
      label={field('research.col.hook', e)}
      empty={t('research.edit.addHook')}
      onSave={(hook) => p.onUpdate(e.id, { hook })}
    />
  )
  const notesCell = (e: ResearchEntry) => (
    <EditableText
      value={e.notes}
      multiline
      field={t('research.col.notes')}
      label={field('research.col.notes', e)}
      empty={t('research.edit.addNotes')}
      hint={t('research.edit.notesHint')}
      onSave={(notes) => p.onUpdate(e.id, { notes })}
    />
  )
  // Picked: "★ Picked" and the plan's status. Backup: another row in the slot is picked. Open: "Plan it".
  // Status: a dropdown (Not picked / Backup / ★ Picked). Picking sends the row to Plans at once (Still planning) and
  // moves it to the top of its video. A plan past Still planning is locked here: it changes on Plans, where the
  // manager approves. Un-picking deletes the plan and asks first; picking another row in the same video asks only
  // when the earlier pick's plan has work in it.
  const statusCell = (e: ResearchEntry, role: RowRole, group: Group) => {
    const s = statusOf(e)
    const value: RowPick = s !== 'none' ? 'picked' : e.backup ? 'backup' : 'none'
    const locked = s !== 'none' && s !== 'planning'
    const other = group.summary?.picked && group.summary.picked.id !== e.id ? group.summary.picked : undefined
    const otherLocked = !!other && group.summary!.status !== 'planning'
    const choose = (to: RowPick) => {
      if (to === value) return
      if (value === 'picked') return setAsking({ id: e.id, to, text: t('research.pick.askUnpick', { account: e.account }) })
      if (to === 'picked' && other && (p.planHasWork?.(other) ?? true))
        return setAsking({ id: e.id, to, text: t('research.pick.askSwitch', { account: other.account }) })
      if (to === 'picked') return pick(e)
      if (sent?.id === e.id) setSent(null)
      p.onPick(e.id, to)
    }
    const select = (
      <select
        className={`rs-pick rs-pick-${value}`}
        value={value}
        disabled={locked}
        aria-label={t('research.pick.aria', { account: e.account })}
        title={locked ? t('research.pick.locked', { status: statusText(s) }) : undefined}
        onChange={(ev) => choose(ev.target.value as RowPick)}
      >
        <option value="none">{t('research.pick.none')}</option>
        <option value="backup">{t('research.pick.backup')}</option>
        <option value="picked" disabled={otherLocked}>
          {t('research.pick.picked')}
        </option>
      </select>
    )
    const ask =
      asking?.id === e.id ? (
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
      ) : null
    return (
      <span className="rs-picked-cell">
        {select}
        {role === 'picked' && (
          <button
            type="button"
            className={`rs-status rs-status-${s}`}
            aria-label={t('research.openPlanAria', { account: e.account, status: statusText(s) })}
            onClick={() => p.onOpenPlan(e.id)}
          >
            {statusText(s)}
          </button>
        )}
        {role === 'picked' && sent?.id === e.id && (
          <span className="rs-sent small">
            <span aria-hidden="true">✓</span> {t('research.sent.row')}
          </span>
        )}
        {ask}
      </span>
    )
  }
  const removeCell = (e: ResearchEntry) => {
    if (statusOf(e) !== 'none') return null
    if (removing === e.id)
      return (
        <span className="rs-remove-ask" role="group" aria-label={t('research.removeAsk')}>
          <span className="small">{t('research.removeAsk')}</span>
          <button
            type="button"
            className="link-btn rs-remove-yes"
            autoFocus
            onClick={() => {
              setRemoving(null)
              p.onRemove(e.id)
              requestAnimationFrame(() => document.getElementById(`${id}-search`)?.focus())
            }}
          >
            {t('research.remove')}
          </button>
          <button type="button" className="link-btn" onClick={() => setRemoving(null)}>
            {t('research.removeKeep')}
          </button>
        </span>
      )
    return (
      <button
        type="button"
        className="rs-x"
        aria-label={t('research.removeAria', { account: e.account })}
        title={t('research.remove')}
        onClick={() => setRemoving(e.id)}
      >
        {cross}
      </button>
    )
  }
  // "Move to": only on Unsorted rows (e.g. saved as "Not sure yet"), to file them under one of the videos.
  const moveId = (entryId: string, phone: boolean) => `${id}-${phone ? 'mvc' : 'mv'}-${entryId}`
  const moveCell = (e: ResearchEntry, phone: boolean) => (
    <label className="rs-move">
      <span className="rs-move-label" aria-hidden="true">
        {t('research.move.label')}
      </span>
      <select
        id={moveId(e.id, phone)}
        value=""
        aria-label={t('research.move.aria', { account: e.account })}
        onChange={(ev) => {
          const slot = p.slots.find((s) => s.id === ev.target.value)
          if (!slot) return
          p.onMoveEntry(e.id, slot.id)
          setOpen(slot.id, true)
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
  const actionsCell = (e: ResearchEntry, group: Group, phone: boolean) => (
    <span className="rs-actions">
      {group.id === UNSORTED && p.slots.length > 0 && moveCell(e, phone)}
      {removeCell(e)}
    </span>
  )

  // A group's header, the same in the table and on phones.
  const groupHead = (g: Group, phone: boolean): ReactNode => {
    const open = isOpen(g)
    const toggle = (label: string, content: ReactNode) => (
      <button
        id={toggleId(g.id, phone)}
        type="button"
        className="rs-group-toggle"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(g.id, !open)}
      >
        <svg className="rs-group-chev" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
        {content}
      </button>
    )
    if (!g.slot) {
      return (
        <div className="rs-group-head is-unsorted">
          {toggle(t('research.unsorted'), <span className="rs-group-name">{t('research.unsorted')}</span>)}
          <span className="rs-group-count">{g.total}</span>
          <span className="rs-group-help small muted">{t('research.unsorted.help')}</span>
        </div>
      )
    }
    const slot = g.slot
    const n = slot.number
    const asking = removingSlot === slot.id
    return (
      <div className="rs-group-head">
        {toggle(t('research.slot.toggle', { n, topic: slot.topic || '—' }), <span className="rs-group-num">{t('research.slot.videoNo', { n })}</span>)}
        <span className="rs-group-topic">
          <EditableText
            value={slot.topic}
            field={t('research.slot.topicField')}
            label={t('research.slot.topicLabel', { n })}
            empty={t('research.slot.addTopic')}
            onSave={(topic) => {
              if (topic) p.onUpdateSlot(slot.id, { topic })
            }}
          />
        </span>
        <label className="rs-group-due">
          <span className="rs-group-due-label" aria-hidden="true">
            {t('research.slot.due')}
          </span>
          <input
            type="date"
            value={slot.dueDate ?? ''}
            aria-label={t('research.slot.dueLabel', { n })}
            onChange={(ev) => p.onUpdateSlot(slot.id, { dueDate: ev.target.value || undefined })}
          />
        </label>
        <span className="rs-group-remove">
          {asking ? (
            <span className="rs-remove-ask" role="group" aria-label={t('research.slot.removeAsk', { n })}>
              <span className="small">{t('research.slot.removeAsk', { n })}</span>
              <button
                type="button"
                className="link-btn rs-remove-yes"
                autoFocus
                onClick={() => {
                  setRemovingSlot(null)
                  p.onRemoveSlot(slot.id)
                  requestAnimationFrame(() => slotBtn.current?.focus())
                }}
              >
                {t('research.remove')}
              </button>
              <button type="button" className="link-btn" onClick={() => setRemovingSlot(null)}>
                {t('research.removeKeep')}
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="rs-x"
              aria-label={t('research.slot.removeAria', { n })}
              title={t('research.slot.remove')}
              onClick={() => setRemovingSlot(slot.id)}
            >
              {cross}
            </button>
          )}
        </span>
      </div>
    )
  }

  // Groups on show: every slot (and Unsorted when it has references); while searching, only groups with matches.
  const shown = groups.filter((g) => (filtered ? g.rows.length > 0 : g.slot || g.total > 0))
  const noEntries = p.entries.length === 0
  const empty = noEntries && p.slots.length === 0
  const emptyLine = (g: Group) => (g.slot && g.total === 0 ? t('research.slot.emptyLine') : null)

  return (
    <section className="client research">
      <header className="client-head rs-head">
        <div>
          <h1>{t('research.title')}</h1>
        </div>
        <div className="rs-head-actions">
          <button
            ref={slotBtn}
            type="button"
            className="btn btn-ghost"
            aria-expanded={addingSlot}
            aria-controls={addingSlot ? `${id}-slot` : undefined}
            onClick={() => (addingSlot ? closeSlotForm() : setAddingSlot(true))}
          >
            <span aria-hidden="true">+</span> {t('research.newSlot')}
          </button>
          <button
            ref={addBtn}
            type="button"
            className="btn btn-primary"
            aria-expanded={adding}
            aria-controls={adding ? `${id}-add` : undefined}
            onClick={() => (adding ? closeAdd() : setAdding(true))}
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
              // Open the new video so its references show.
              if (video.refs.length) remember(p.onCreateSlot(video), true)
              else p.onCreateSlot(video)
              closeSlotForm()
            }}
          />
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

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

      {adding && (
        <div id={`${id}-add`}>
          <AddFromLink
            platforms={p.platforms}
            onCancel={closeAdd}
            onAdd={(input) => {
              p.onAddFromLink(input)
              closeAdd()
            }}
          />
        </div>
      )}

      {empty ? (
        <div className="empty">
          <h2>{t('research.empty.title')}</h2>
          <p>{t('research.empty.body')}</p>
          <button type="button" className="btn btn-primary" onClick={p.onFindIdeas}>
            {t('research.empty.find')}
          </button>
        </div>
      ) : (
        <>
          {!noEntries && (
            <div className="rs-toolbar" role="search">
              <label className="field rs-search">
                <span className="field-label">{t('research.search.label')}</span>
                <input
                  id={`${id}-search`}
                  type="search"
                  placeholder={t('research.search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
            </div>
          )}

          {filtered && rows.length === 0 ? (
            <div className="empty">
              <h2>{t('research.none.title')}</h2>
              <p>{t('research.none.body')}</p>
              <button type="button" className="btn btn-ghost" onClick={clearFilters}>
                {t('research.filter.clear')}
              </button>
            </div>
          ) : (
            <>
              <div className="rs-table-wrap">
                <table className="rs-table">
                  <caption className="sr-only">{t('research.caption', { client: p.client.name })}</caption>
                  {shown.map((g) => {
                    const open = isOpen(g)
                    const line = emptyLine(g)
                    return (
                      <tbody key={g.id} className={`rs-group${open ? ' is-open' : ''}`}>
                        <tr className="rs-group-row">
                          <th scope="rowgroup" colSpan={SPAN}>
                            {groupHead(g, false)}
                          </th>
                        </tr>
                        {open && line && (
                          <tr className="rs-group-empty">
                            <td colSpan={SPAN} className="small muted">
                              {line}
                            </td>
                          </tr>
                        )}
                        {/* The column titles show only inside an open video that has references. */}
                        {open && g.rows.length > 0 && (
                          <tr className="rs-col-head">
                      {COLUMNS.map((c) => {
                        const on = sort.key === c.key
                        return (
                          <th
                            key={c.key}
                            scope="col"
                            className={`rs-col-${c.key}${c.numeric ? ' is-num' : ''}`}
                            aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                          >
                            <button
                              type="button"
                              className="rs-sort"
                              onClick={() => sortBy(c.key)}
                            >
                              {t(c.label)}
                              <span className={`rs-sort-icon${on ? ' is-on' : ''}`} aria-hidden="true">
                                {on && sort.dir === 'asc' ? '↑' : '↓'}
                              </span>
                            </button>
                          </th>
                        )
                      })}
                      <th scope="col" className="rs-col-actions">
                        <span className="sr-only">{t('research.col.actions')}</span>
                      </th>
                    </tr>
                        )}
                        {open &&
                          g.rows.map((e) => {
                            const role = rowRole(e, g)
                            return (
                              <tr
                                key={e.id}
                                id={`${id}-row-${e.id}`}
                                className={[role === 'picked' ? 'is-picked' : role === 'backup' ? 'is-backup' : '', flash === e.id ? 'is-flash' : ''].filter(Boolean).join(' ') || undefined}
                              >
                                <th scope="row" className="rs-col-account">
                                  {accountCell(e)}
                                </th>
                                <td className="rs-col-platform">{platformCell(e)}</td>
                                <td className="is-num">{count(e.followers)}</td>
                                <td className="is-num">{count(e.views)}</td>
                                <td className="rs-col-keywords">{keywordsCell(e)}</td>
                                <td className="rs-col-hook">{hookCell(e)}</td>
                                <td className="rs-col-notes">{notesCell(e)}</td>
                                <td className="rs-col-status">{statusCell(e, role, g)}</td>
                                <td className="rs-col-actions">{actionsCell(e, g, false)}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    )
                  })}
                </table>
              </div>

              <div className="rs-phone">
                {shown.map((g) => {
                  const open = isOpen(g)
                  const line = emptyLine(g)
                  return (
                    <section key={g.id} className={`rs-group-card${g.slot ? '' : ' is-unsorted'}`} aria-labelledby={toggleId(g.id, true)}>
                      {groupHead(g, true)}
                      {open && line && <p className="rs-group-empty small muted">{line}</p>}
                      {open && g.rows.length > 0 && (
                        <ul className="rs-cards">
                          {g.rows.map((e) => {
                            const role = rowRole(e, g)
                            return (
                              <li key={e.id} id={`${id}-card-${e.id}`} className={`rs-card${role === 'picked' ? ' is-picked' : ''}${flash === e.id ? ' is-flash' : ''}`}>
                                <div className="rs-card-head">
                                  {platformCell(e)}
                                  {accountCell(e)}
                                </div>
                                <dl className="rs-card-stats">
                                  <div>
                                    <dt>{t('research.col.followers')}</dt>
                                    <dd>{count(e.followers)}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('research.col.views')}</dt>
                                    <dd>{count(e.views)}</dd>
                                  </div>
                                </dl>
                                <div className="rs-card-field">
                                  <span className="field-label">{t('research.col.hook')}</span>
                                  {hookCell(e)}
                                </div>
                                <div className="rs-card-field">
                                  <span className="field-label">{t('research.col.keywords')}</span>
                                  {keywordsCell(e)}
                                </div>
                                <div className="rs-card-field">
                                  <span className="field-label">{t('research.col.notes')}</span>
                                  {notesCell(e)}
                                </div>
                                <div className="rs-card-actions">
                                  {statusCell(e, role, g)}
                                  {actionsCell(e, g, true)}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </section>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
