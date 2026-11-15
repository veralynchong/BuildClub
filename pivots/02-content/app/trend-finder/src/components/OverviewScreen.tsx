import type { Client, Format, SavedIdea, Video } from '../types'
import { useApp } from '../lib/appContext'
import {
  decisionStats,
  dueText,
  paceOf,
  planName,
  sampleFormatById,
  sampleVideoById,
} from '../lib/clientHome'
import type { Pace } from '../lib/clientHome'
import { t, tp } from '../lib/i18n'
import { ProgressRing } from './ProgressRing'
import { Card, Empty, MonthCard } from './home/HomeCards'

interface Props {
  clients: Client[]
  ideas: SavedIdea[]
  // Optional so App compiles without them; without them plan names come from the sample data only.
  videoById?: Map<string, Video>
  formatById?: Map<string, Format>
  onOpen: (clientId: string, view: 'home' | 'review' | 'search') => void
  onAddClient: () => void
}

// Agency name and manager name, edited here because they apply to every client. Saves as you type.
function AgencySection() {
  const { agency, setAgency, account } = useApp()
  return (
    <fieldset className="cannot agency-box">
      <legend>
        <h3>{t('home.agency.title')}</h3>
        <span className="small muted">{t('home.agency.desc')}</span>
      </legend>
      <div className="settings-grid">
        <label className="field">
          <span className="field-label">{t('home.agency.name')}</span>
          <input id="agency-name" value={agency.agencyName} readOnly={!!account?.agency} title={account?.agency ? t('home.agency.setByAccount') : undefined} onChange={(e) => setAgency({ agencyName: e.target.value })} />
        </label>
        <label className="field">
          <span className="field-label">{t('home.agency.manager')}</span>
          <input id="manager-name" value={agency.managerName} onChange={(e) => setAgency({ managerName: e.target.value })} />
        </label>
      </div>
    </fieldset>
  )
}

const paceOrder: Record<Pace, number> = { behind: 0, ontrack: 1, done: 2 }

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

interface Row {
  c: Client
  approved: number
  waiting: number
  planning: number
  sentBack: number
  next?: SavedIdea
  decided: number
  decidedApproved: number
  pace: Pace
}

// One client's month: a ring for approved against target, the three counts, a pace note in plain words,
// what's next to film, and the one action that moves this client forward.
function ClientCard({ row, videoById, formatById, onOpen }: { row: Row; videoById: Map<string, Video>; formatById: Map<string, Format>; onOpen: Props['onOpen'] }) {
  const { c, approved, waiting, planning, sentBack, next, decided, decidedApproved, pace } = row
  const target = Math.max(c.monthlyTarget, 0)
  const pct = (n: number) => (target > 0 ? Math.min(n / target, 1) * 100 : 0)

  const status = { behind: ['pill-bad', t('home.overview.statusBehind')], ontrack: ['pill-ok', t('home.overview.statusOnTrack')], done: ['pill-done', t('home.overview.statusDone')] }[pace]

  // The main action: review what's waiting, find ideas when behind, otherwise open the client's Home.
  type Action = { label: string; view: 'home' | 'review' | 'search'; primary?: boolean }
  const actions: Action[] =
    waiting > 0
      ? [{ label: t('home.overview.review', { n: waiting }), view: 'review', primary: true }, { label: t('home.overview.home'), view: 'home' }]
      : pace === 'behind'
        ? [{ label: t('home.overview.findIdeas'), view: 'search', primary: true }, { label: t('home.overview.home'), view: 'home' }]
        : [{ label: t('home.overview.home'), view: 'home' }, { label: t('home.overview.findIdeas'), view: 'search' }]

  return (
    <article className={`ovc ovc-${pace}`} aria-labelledby={`ovc-${c.id}-name`}>
      <div className="ovc-top">
        <span className="ovc-ini" aria-hidden="true">{initials(c.name)}</span>
        <div className="ovc-name">
          <button id={`ovc-${c.id}-name`} className="link-strong" onClick={() => onOpen(c.id, 'search')}>
            {c.name}
          </button>
          <span className="small muted">{t('home.overview.cardTarget', { niche: c.niche, n: target })}</span>
        </div>
        <span className={`pill ${status[0]}`}>{status[1]}</span>
      </div>

      <div className="ovc-mid">
        <div className="ovc-ring">
          <span className="ovc-ring-wait"><ProgressRing value={pct(approved + waiting)} size={132} stroke={10} /></span>
          <span className="ovc-ring-main"><ProgressRing value={pct(approved)} size={132} stroke={10} /></span>
          <div className="ovc-ring-text">
            <div>
              <b>{approved}<small>/{target}</small></b>
              <span>{t('home.overview.ringApproved')}</span>
            </div>
          </div>
        </div>
        <ul className="ovc-stats" aria-label={t('home.overview.colApproved')}>
          <li className="ovc-stat ovc-stat-plan"><span>{t('home.overview.rowPlanning')}</span><b className={planning ? undefined : 'muted'}>{planning}</b></li>
          <li className="ovc-stat ovc-stat-wait">
            <span>{t('home.overview.rowWaiting')}</span>
            {waiting ? (
              <button className="link-btn" onClick={() => onOpen(c.id, 'review')} aria-label={t('home.overview.waitingAria', { n: waiting, name: c.name })}>
                {waiting}
              </button>
            ) : (
              <b className="muted">0</b>
            )}
          </li>
          <li className="ovc-stat ovc-stat-ok"><span>{t('home.overview.rowApproved')}</span><b>{approved}</b></li>
        </ul>
      </div>


      <div className="ovc-next">
        <span className="label">{t('home.overview.colNext')}</span>
        {next ? (
          <>
            <b>{planName(next, videoById, formatById).name}</b>
            <span className="small muted">
              {dueText(next.dueDate)}
              {sentBack > 0 && ` · ${t('home.overview.sentBackNote', { plans: tp('home.count.plan', sentBack) })}`}
            </span>
          </>
        ) : (
          <>
            <b className="muted">{t('home.overview.nothingApproved')}</b>
            {sentBack > 0 && <span className="small muted">{t('home.overview.sentBackNote', { plans: tp('home.count.plan', sentBack) })}</span>}
          </>
        )}
        <span className="small muted">
          {t('home.overview.colDecisions')}: {decided ? t('home.overview.decisionsOf', { approved: decidedApproved, decided }) : t('home.overview.noneYet')}
        </span>
      </div>

      <div className="ovc-act">
        {actions.map((a) => (
          <button key={a.view} className={`btn ${a.primary ? 'btn-primary' : ''}`} onClick={() => onOpen(c.id, a.view)}>
            {a.label}
          </button>
        ))}
      </div>
    </article>
  )
}

// All clients Home: the same "before posting" numbers as one client's Home, added up across every client,
// then one card per client showing where it sits against its monthly target and what to do next.
export function OverviewScreen({ clients, ideas, videoById = sampleVideoById, formatById = sampleFormatById, onOpen, onAddClient }: Props) {
  const ids = new Set(clients.map((c) => c.id))
  const all = ideas.filter((i) => ids.has(i.clientId))
  const rows: Row[] = clients.map((c) => {
    const mine = all.filter((i) => i.clientId === c.id)
    const approved = mine.filter((i) => i.status === 'approved').sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    const stats = decisionStats([c], ideas)
    return {
      c,
      approved: approved.length,
      waiting: mine.filter((i) => i.status === 'waiting').length,
      planning: mine.filter((i) => i.status === 'saved').length,
      sentBack: mine.filter((i) => i.status === 'rejected').length,
      next: approved[0],
      decided: stats.decided,
      decidedApproved: stats.approved,
      pace: paceOf(approved.length, c.monthlyTarget),
    }
  })
  const totals = {
    approved: rows.reduce((s, r) => s + r.approved, 0),
    target: clients.reduce((s, c) => s + c.monthlyTarget, 0),
    waiting: rows.reduce((s, r) => s + r.waiting, 0),
  }
  const waitingRows = rows.filter((r) => r.waiting > 0)
  // Who needs you most first: behind, then on track, then done; more waiting plans first within each.
  const sorted = [...rows].sort((a, b) => paceOrder[a.pace] - paceOrder[b.pace] || b.waiting - a.waiting || a.c.name.localeCompare(b.c.name))

  return (
    <section className="overview ch ch-wide">
      <header className="page-head-row">
        <div className="page-head">
          <h1>{t('home.overview.title')}</h1>
          <p className="muted">{t('home.overview.sub', { clients: tp('home.count.client', clients.length) })}</p>
        </div>
        <button className="btn btn-primary" onClick={onAddClient}>
          {t('home.overview.add')}
        </button>
      </header>

      {clients.length === 0 ? (
        <div className="empty">
          <h3>{t('home.overview.noneTitle')}</h3>
          <p>{t('home.overview.noneBody')}</p>
          <button className="btn btn-primary" onClick={onAddClient}>
            {t('home.overview.add')}
          </button>
        </div>
      ) : (
        <>
          <div className="ch-grid">
            <MonthCard heading={t('home.overview.monthHeading')} approved={totals.approved} target={totals.target} waiting={totals.waiting} />

            <Card
              id="ov-waiting"
              className="ov-waiting"
              label="Needs your approval"
              title={t('home.overview.waitingTitle')}
            >
              {waitingRows.length === 0 ? (
                <Empty>{t('home.overview.waitingEmpty')}</Empty>
              ) : (
                <ul className="ch-rows">
                  {waitingRows.map((r) => (
                    <li key={r.c.id} className="ch-row">
                      <span className="ch-row-text">
                        <strong>{r.c.name}</strong>
                        <span className="small muted">{t('home.overview.toApprove', { plans: tp('home.count.plan', r.waiting) })}</span>
                      </span>
                      <button className="btn btn-ghost btn-sm" onClick={() => onOpen(r.c.id, 'review')} aria-label={t('home.overview.openAria', { name: r.c.name })}>
                        {t('home.overview.open')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="ovc-wrap">
            <div className="ovc-grid">
              {sorted.map((row) => (
                <ClientCard key={row.c.id} row={row} videoById={videoById} formatById={formatById} onOpen={onOpen} />
              ))}
            </div>
            <p className="ovc-foot">{t('home.overview.cardsSorted')}</p>
          </div>
        </>
      )}

      <AgencySection />
    </section>
  )
}
