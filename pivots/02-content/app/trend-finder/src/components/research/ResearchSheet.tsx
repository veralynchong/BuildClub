import { GUIDED_IDS } from '../../lib/guided/contracts'
import type { ReactNode } from 'react'
import type { ResearchEntry, ResearchSlot, ResearchStatus } from '../../lib/research'
import type { Video } from '../../types'
import { t, tp } from '../../lib/i18n'
import type { Key } from '../../lib/i18n'
import { compact, platformName } from '../../lib/metrics'
import { EditableText } from './EditableText'
import { titleOf } from '../../data/sampleResearch'
import { PlatformLogo } from '../PlatformToggles'
import { UNSORTED, rowRole } from './slots'
import type { Group, RowRole } from './slots'
import type { ResearchScreenProps, RowPick } from './ResearchScreen'

// The Research tab's Sheet view (founder-approved "Pure ledger", 4 Nov 2026): one ledger of every video. Each
// video is a row (chevron, number tile, topic, due date, bin) that drops down its references as hairline sub-rows
// numbered 1.1, 1.2…, and every column of a sub-row is edited in place. All state and handlers come from
// ResearchScreen, so the Cards view and this one always show the same data and pick the same way.

// What the pick control needs, worked out once in ResearchScreen (the same rules as the Cards view's button).
export interface PickInfo {
  status: ResearchStatus
  isPicked: boolean
  // The plan is past Still planning: it changes on Plans.
  locked: boolean
  // Another reference in this video is picked and locked.
  otherLocked: boolean
  // Asks first when the change deletes a plan.
  choose: (to: RowPick) => void
}

// Parts shared with the Cards view.
export interface SheetKit {
  accountCell: (e: ResearchEntry) => ReactNode
  pickInfo: (e: ResearchEntry, g: Group) => PickInfo
  askBox: (e: ResearchEntry) => ReactNode
  statusBadge: (e: ResearchEntry, role: RowRole) => ReactNode
  removeBtn: (e: ResearchEntry) => ReactNode
  removeAsk: (e: ResearchEntry) => ReactNode
  moveCell: (e: ResearchEntry) => ReactNode
  statusText: (s: ResearchStatus) => string
}

interface Props {
  uid: string
  // 'rows': the table (sub-rows with columns). 'shelf': the Video layout, a row of 9:16 covers per video.
  layout?: 'rows' | 'shelf'
  videoOf?: (videoId: string) => Video | undefined
  onOpenVideo: (videoId: string) => void
  caption: string
  // Videos in number order, then Unsorted; rows already searched and ordered (picked first, TikTok → Instagram → YouTube).
  groups: Group[]
  filtered: boolean
  isOpen: (groupId: string) => boolean
  onToggle: (groupId: string) => void
  flash: string | null
  onUpdate: ResearchScreenProps['onUpdate']
  onUpdateSlot: (id: string, patch: Partial<Pick<ResearchSlot, 'topic' | 'dueDate'>>) => void
  onAskRemoveSlot: (slotId: string) => void
  onFindIdeas: () => void
  onAddFromLink: (slotId: string) => void
  addingSlotId?: string
  addPanel: (slotId: string) => ReactNode
  kit: SheetKit
}


// The sub-rows' columns, in order (after the No. column).
const HEADS: Key[] = [
  'research.sheet.colVideo',
  'research.sheet.colTitle',
  'research.col.platform',
  'research.col.followers',
  'research.col.views',
  'research.col.keywords',
  'research.col.hook',
  'research.col.status',
]

// The crown on a picked reference.
const crown = (
  <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="currentColor">
    <path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7zm2 13h14v2H5v-2z" />
  </svg>
)

const count = (n: number) => (n > 0 ? compact(n) : '—')

const chevron = (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 6 6 6-6 6" />
  </svg>
)
const bin = (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
)

export function ResearchSheet(p: Props) {
  const { kit } = p
  const shelf = p.layout === 'shelf'
  // A cell's label: shown above the value when the sub-rows stack (narrow), read by screen readers otherwise.
  const k = (key: Key) => <span className="rs-s-k">{t(key)}</span>

  const statusCell = (e: ResearchEntry, g: Group) => {
    const pk = kit.pickInfo(e, g)
    return (
      <>
        {/* One button (founder, 4 Nov 2026): light blue "Pick this", mustard with a crown once picked. */}
        <button
          type="button"
          className={`btn btn-sm rs-s-pick${pk.isPicked ? ' is-picked' : ''}`}
          aria-pressed={pk.isPicked}
          aria-label={t(pk.isPicked ? 'research.pick.unpickAria' : 'research.pick.pickAria', { account: e.account })}
          disabled={pk.locked || (!pk.isPicked && pk.otherLocked)}
          onClick={() => pk.choose(pk.isPicked ? 'none' : 'picked')}
        >
          {pk.isPicked && crown}
          {t(pk.isPicked ? 'research.sheet.picked' : 'research.sheet.pickThis')}
        </button>
        <span className="rs-s-badges">{kit.statusBadge(e, rowRole(e, g))}</span>
        {pk.locked && <span className="rs-locked small muted">{t('research.sheet.lockedNote')}</span>}
      </>
    )
  }

  const subRow = (e: ResearchEntry, g: Group, i: number) => {
    const role = rowRole(e, g)
    const no = g.slot ? `${g.slot.number}.${i + 1}` : t('research.sheet.unsortedNo', { n: i + 1 })
    const ask = kit.removeAsk(e) ?? kit.askBox(e)
    const move = g.id === UNSORTED ? kit.moveCell(e) : null
    const cls = ['rs-s-row', role === 'picked' ? 'is-picked' : '', p.flash === e.id ? 'is-flash' : '']
    return (
      <li key={e.id} id={`${p.uid}-card-${e.id}`} className={cls.filter(Boolean).join(' ')}>
        <span className="rs-s-no">
          <span className="sr-only">{t('research.sheet.no')} </span>
          {no}
        </span>
        <div className="rs-s-cell rs-s-account">
          {k('research.sheet.colVideo')}
          {kit.accountCell(e)}
        </div>
        {/* Read-only columns (founder, 4 Nov 2026): edit on the Cards view. Status still picks. */}
        <div className="rs-s-fields">
          <div className="rs-s-cell rs-s-title">
            {k('research.sheet.colTitle')}
            <span className="rs-s-text rs-s-titletext">{titleOf(e) || '—'}</span>
          </div>
          <div className="rs-s-cell rs-s-platform">
            {k('research.col.platform')}
            {/* Round brand mark only (founder, 4 Nov 2026); the name is for hover and screen readers. */}
            <span className="rs-s-plat" title={platformName[e.platform]}>
              <PlatformLogo platform={e.platform} size={26} />
              <span className="sr-only">{platformName[e.platform]}</span>
            </span>
          </div>
          <div className="rs-s-cell rs-s-followers">
            {k('research.col.followers')}
            <span className="rs-s-num">{e.id === GUIDED_IDS.researchId ? '—' : count(e.followers)}</span>
          </div>
          <div className="rs-s-cell rs-s-views">
            {k('research.col.views')}
            <span className="rs-s-num is-views">{e.id === GUIDED_IDS.researchId ? '—' : count(e.views)}</span>
          </div>
          <div className="rs-s-cell rs-s-keywords">
            {k('research.col.keywords')}
            <span className="rs-chips">
              {e.keywords.map((kw) => (
                <span key={kw} className="rs-chip">
                  {kw}
                </span>
              ))}
            </span>
          </div>
          <div className="rs-s-cell rs-s-hook">
            {k('research.col.hook')}
            <span className="rs-s-text rs-s-hooktext">{e.hook || '—'}</span>
          </div>
          <div className="rs-s-cell rs-s-status">
            {k('research.col.status')}
            {statusCell(e, g)}
            {move}
          </div>
        </div>
        <span className="rs-s-x">{kit.removeBtn(e)}</span>
        {ask && <div className="rs-s-ask">{ask}</div>}
      </li>
    )
  }

  // Video layout (founder-approved Option A "Shelf", 4 Nov 2026): each reference as a tall cover with its title,
  // account, followers → views and the same pick button, so staff remember what each saved video was about.
  const lengthText = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
  const coverItem = (e: ResearchEntry, g: Group, i: number) => {
    const role = rowRole(e, g)
    const v = p.videoOf?.(e.videoId)
    const no = g.slot ? `${g.slot.number}.${i + 1}` : t('research.sheet.unsortedNo', { n: i + 1 })
    const title = titleOf(e)
    const ask = kit.removeAsk(e) ?? kit.askBox(e)
    const cls = ['rs-v-item', role === 'picked' ? 'is-picked' : '', p.flash === e.id ? 'is-flash' : '']
    return (
      <li key={e.id} id={`${p.uid}-card-${e.id}`} className={cls.filter(Boolean).join(' ')}>
        <div className="rs-v-cover">
          <button
            type="button"
            className="rs-v-open"
            aria-label={t('research.video.openAria', { account: e.account })}
            onClick={() => p.onOpenVideo(e.videoId)}
          >
            {v?.thumbnail ? (
              <img src={v.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <span className="rs-v-hook" aria-hidden="true">
                {e.hook}
              </span>
            )}
            <span className="rs-v-play" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
            <span className="rs-v-meta" aria-hidden="true">
              {no}
              {v?.lengthSec ? ` · ${lengthText(v.lengthSec)}` : ''}
            </span>
          </button>
          {role === 'picked' && (
            <span className="rs-v-badge">
              {crown}
              {t('research.sheet.picked')}
            </span>
          )}
          <span className="rs-v-plat" title={platformName[e.platform]}>
            <PlatformLogo platform={e.platform} size={26} />
            <span className="sr-only">{platformName[e.platform]}</span>
          </span>
          <span className="rs-v-x">{kit.removeBtn(e)}</span>
        </div>
        <div className="rs-v-text">
          <strong className="rs-v-title">{title || e.hook || '—'}</strong>
          <span className="rs-v-account">{kit.accountCell(e)}</span>
          <span className="rs-v-reach">
            {e.id === GUIDED_IDS.researchId ? '—' : count(e.followers)} <span aria-hidden="true">→</span>
            <span className="sr-only">{t('research.col.followers')},</span> <b>{e.id === GUIDED_IDS.researchId ? '—' : count(e.views)}</b> {t('research.video.views')}
          </span>
        </div>
        <div className="rs-v-status">{statusCell(e, g)}</div>
        {ask && <div className="rs-v-ask">{ask}</div>}
      </li>
    )
  }

  const subRows = (g: Group) => {
    if (g.slot && p.addingSlotId === g.slot.id) return <li className="rs-s-addrow">{p.addPanel(g.slot.id)}</li>
    if (g.total === 0)
      return (
        <li className="rs-s-empty">
          <span>{t('research.index.noRefs')}</span>
          <span className="rs-s-dot" aria-hidden="true">
            ·
          </span>
          <button type="button" className="link-btn" onClick={p.onFindIdeas}>
            {t('research.empty.find')}
          </button>
          {g.slot && (
            <>
              <span className="rs-s-dot" aria-hidden="true">
                ·
              </span>
              <button type="button" className="link-btn" onClick={() => p.onAddFromLink(g.slot!.id)}>
                {t('research.add')}
              </button>
            </>
          )}
        </li>
      )
    return shelf ? (
      <li className="rs-v-shelfrow">
        <ul className="rs-v-shelf">{g.rows.map((e, i) => coverItem(e, g, i))}</ul>
      </li>
    ) : (
      g.rows.map((e, i) => subRow(e, g, i))
    )
  }

  const columnHeads = (
    <div className="rs-s-head" aria-hidden="true">
      <span>{t('research.sheet.no')}</span>
      {HEADS.map((h) => (
        <span key={h}>{t(h)}</span>
      ))}
      <span />
    </div>
  )
  const videoRow = (g: Group) => {
    const open = p.isOpen(g.id)
    const subsId = `${p.uid}-subs-${g.id}`
    const slot = g.slot
    const name = slot ? t('research.slot.videoNo', { n: slot.number }) : t('research.unsorted')
    const refs = !g.total
      ? t('research.index.noRefs')
      : p.filtered
        ? t('research.index.matches', { shown: g.rows.length, n: g.total })
        : tp('research.index.refs', g.total)
    return (
      <li key={g.id} className={`rs-s-group${open ? ' is-open' : ''}`}>
        <div className="rs-s-vrow">
          <button
            type="button"
            className="rs-s-chev"
            aria-expanded={open}
            aria-controls={open ? subsId : undefined}
            aria-label={t(open ? 'research.sheet.close' : 'research.sheet.open', { group: name })}
            onClick={() => p.onToggle(g.id)}
          >
            {chevron}
          </button>
          <span className={`rs-tile${slot ? (g.total ? '' : ' is-empty') : ' is-unsorted'}`} aria-hidden="true">
            {slot ? slot.number : '?'}
          </span>
          <div className="rs-s-vtitle">
            {/* No small "VIDEO N" tag (founder, 4 Nov 2026): the number tile already says which video it is. */}
            <span className="sr-only">{name}</span>
            <div className="rs-s-topic" role="heading" aria-level={2}>
              {slot ? (
                <EditableText
                  value={slot.topic}
                  field={t('research.slot.topicField')}
                  label={t('research.slot.topicLabel', { n: slot.number })}
                  empty={t('research.slot.addTopic')}
                  editLabel={t('research.edit.topic')}
                  onSave={(topic) => {
                    if (topic) p.onUpdateSlot(slot.id, { topic })
                  }}
                />
              ) : (
                t('research.unsorted')
              )}
            </div>
            <span className="rs-s-vsub">{slot ? refs : t('research.unsorted.help')}</span>
          </div>
          {slot && (
            <label className="rs-s-due">
              <span className="rs-dlabel" aria-hidden="true">
                {t('research.slot.due')}
              </span>
              <input
                type="date"
                value={slot.dueDate ?? ''}
                aria-label={t('research.slot.dueLabel', { n: slot.number })}
                onChange={(ev) => p.onUpdateSlot(slot.id, { dueDate: ev.target.value || undefined })}
              />
            </label>
          )}
          {slot && (
            <button
              type="button"
              className="rs-slot-bin rs-s-bin"
              aria-label={t('research.slot.removeAria', { n: slot.number })}
              title={t('research.slot.remove')}
              onClick={() => p.onAskRemoveSlot(slot.id)}
            >
              {bin}
            </button>
          )}
        </div>
        {/* Column names show only inside an opened video that has references (founder, 4 Nov 2026). */}
        {open && !shelf && g.rows.length > 0 && columnHeads}
        {open && (
          <ul id={subsId} className="rs-s-subs" aria-label={t('research.sheet.refsFor', { group: name })}>
            {subRows(g)}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className={`rs-sheet${shelf ? ' is-shelf' : ''}`} aria-label={p.caption} role="region">
      <ul className="rs-s-groups">{p.groups.map(videoRow)}</ul>
    </div>
  )
}
