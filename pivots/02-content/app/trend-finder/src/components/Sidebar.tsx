import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Logo } from './Logo'
import type { Client } from '../types'
import type { Workspace } from '../state'
import { useApp } from '../lib/appContext'
import { t } from '../lib/i18n'
import { useElapsed } from '../lib/useElapsed'
import { PlayMarkTicker } from './PlayMarkLoader'

export type View =
  | 'overview'
  | 'home'
  | 'search'
  | 'results'
  | 'research'
  | 'shortlist'
  | 'review'
  | 'plan'
  | 'canvas'
  | 'canvasPick'
  // Pick a plan's legacy planning board.
  | 'boardPick'
  // The planning board for the open plan (components/board/ShotBoard.tsx).
  | 'board'
  | 'settings'
  | 'preferences'
  | 'channel'
  | 'compare'
  | 'add-client'

const paths: Record<string, string> = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3',
  saved: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  approvals: 'M20 6 9 17l-5-5',
  canvas: 'M4 4h16v16H4zM8 9h4v4H8zM15 8h2M15 12h2M8 17h8',
  plans: 'M8 4h11v16H8zM5 4v16M11 8h5M11 12h5M11 16h3',
  research: 'M4 5h16v14H4zM4 10h16M4 14.5h16M10 10v9',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  compare: 'M4 5h7v14H4zM13 5h7v14h-7zM7 9h1M16 9h1',
  channel: 'M4 6h16M4 12h10M4 18h6M17 14l3 3-3 3',
  overview: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  brief: 'M5 4h14v16H5zM9 9a3 3 0 1 0 6 0 3 3 0 0 0-6 0M8 17c.8-1.8 2.2-2.7 4-2.7s3.2.9 4 2.7',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
}

function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  )
}

const initials = (name: string) =>
  name
    .replace(/\(.*\)/, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

interface Props {
  clients: Client[]
  workspace: Workspace
  setWorkspace: (w: Workspace) => void
  view: View
  setView: (v: View) => void
  // Plans that need action: waiting for approval plus sent back. Research: this client's rows.
  counts: { plans: number; research: number }
  onSignOut: () => void
  // The Remake logo opens the public landing page (still signed in).
  onLogo: () => void
  onAddClient: () => void
  open: boolean
  onClose: () => void
  live: boolean
  compact?: boolean // icons only (the canvas view): each item keeps its label as title and aria-label
}

function ClientSwitcher({ clients, workspace, setWorkspace, onAddClient, compact }: Pick<Props, 'clients' | 'workspace' | 'setWorkspace' | 'onAddClient' | 'compact'>) {
  const { agency } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = clients.find((c) => c.id === workspace)
  const name = current ? current.name : t('shell.side.allClients') // the compact button shows only the avatar

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (w: Workspace) => {
    setWorkspace(w)
    setOpen(false)
  }

  return (
    <div className="switcher" ref={ref}>
      <button className="switcher-btn" aria-haspopup="menu" aria-expanded={open} title={compact ? name : undefined} aria-label={compact ? name : undefined} onClick={() => setOpen((o) => !o)}>
        <span className={`avatar ${current ? '' : 'avatar-agency'}`}>{current ? initials(current.name) : '▦'}</span>
        <span className="switcher-text">
          <span className="switcher-label">{current ? t('shell.side.client') : agency.agencyName}</span>
          <strong>{name}</strong>
        </span>
        <span className="switcher-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="switcher-menu" role="menu">
          <button role="menuitem" className={`switcher-item ${workspace === 'all' ? 'on' : ''}`} onClick={() => choose('all')}>
            <span className="avatar avatar-agency">▦</span>
            <span>
              <strong>{t('shell.side.allClients')}</strong>
              <span className="small muted">{t('shell.side.allClientsHint')}</span>
            </span>
          </button>
          <div className="switcher-sep" />
          <span className="switcher-head">{t('shell.side.clients')}</span>
          {clients.map((c) => (
            <button
              key={c.id}
              role="menuitem"
              className={`switcher-item ${workspace === c.id ? 'on' : ''}`}
              onClick={() => choose(c.id)}
            >
              <span className="avatar">{initials(c.name)}</span>
              <span>
                <strong>{c.name}</strong>
                <span className="small muted">{t('shell.side.sells', { niche: c.niche })}</span>
              </span>
            </button>
          ))}
          <div className="switcher-sep" />
          <button
            role="menuitem"
            className="switcher-item switcher-add"
            onClick={() => {
              setOpen(false)
              onAddClient()
            }}
          >
            <span className="avatar avatar-add">+</span>
            <span>
              <strong>{t('shell.side.addClient')}</strong>
              <span className="small muted">{t('shell.side.addClientHint')}</span>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

// A background search's progress: a spinner and the seconds so far, with the full sentence for screen readers.
function SearchTicker({ q, startedAt }: { q: string; startedAt: number }) {
  const seconds = useElapsed(startedAt)
  return (
    <span className="side-search" role="status" aria-label={t('find.bg.status', { query: q })}>
      <PlayMarkTicker startedAt={startedAt} seconds={seconds} />
      <span aria-hidden="true">{t('find.bg.seconds', { seconds })}</span>
    </span>
  )
}

export function Sidebar(p: Props) {
  const { agency, role, account, searching } = useApp()
  const userName = account?.name || (role === 'manager' ? agency.managerName : t('shell.side.teamMember'))
  const inClient = p.workspace !== 'all'
  const item = (v: View, icon: keyof typeof paths, label: string, count?: number, active = p.view === v, extra?: ReactNode) => (
    <button
      className={`side-link ${active ? 'side-on' : ''}`}
      title={p.compact ? label : undefined}
      aria-label={p.compact ? label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={() => {
        p.setView(v)
        p.onClose()
      }}
    >
      <Icon name={icon} />
      <span>{label}</span>
      {extra}
      {count ? <span className="side-count">{count}</span> : null}
    </button>
  )

  return (
    <>
      {p.open && <div className="side-scrim" onClick={p.onClose} />}
      <aside className={`sidebar ${p.open ? 'sidebar-open' : ''}`} aria-label={t('shell.side.main')}>
        <div className="side-brand">
          <button
            type="button"
            className="rk-logo-btn"
            aria-label={t('shell.side.logo')}
            onClick={() => {
              p.onClose()
              p.onLogo()
            }}
          >
            <Logo height={p.compact ? 18 : 22} />
          </button>
        </div>

        {/* On phones the sidebar is a slide-out menu: close it after a pick so the new screen isn't hidden behind it. */}
        <ClientSwitcher
          clients={p.clients}
          compact={p.compact}
          workspace={p.workspace}
          setWorkspace={(w) => {
            p.setWorkspace(w)
            p.onClose()
          }}
          onAddClient={() => {
            p.onAddClient()
            p.onClose()
          }}
        />

        <nav className="side-nav">
          {inClient ? (
            <>
              {item('home', 'home', t('shell.side.home'))}
              {item(
                'search',
                'search',
                t('shell.side.findIdeas'),
                undefined,
                p.view === 'search' || p.view === 'results',
                searching && searching.clientId === p.workspace ? <SearchTicker q={searching.q} startedAt={searching.startedAt} /> : null,
              )}
              {/* Research = the sheet of saved reference videos; plans are made from it */}
              {item('research', 'research', t('shell.side.research'), p.counts.research)}
              {/* Plans = the board of plans + review (batch mode) + one plan */}
              {item('shortlist', 'plans', t('shell.side.plans'), p.counts.plans, ['shortlist', 'review', 'plan'].includes(p.view))}
              {/* "Video canvas" opens the freeform canvas again (12 Nov 2026), via the canvas chooser; the planning board stays on the Plan page. */}
              {item('canvas', 'canvas', t('shell.side.canvas'), undefined, ['board', 'boardPick', 'canvas', 'canvasPick'].includes(p.view))}
              <div className="side-sep" />
              {/* "Channel" was taken off the menu (12 Nov 2026); the 'channel' view and ChannelScreen stay in App.tsx. */}
              {item('settings', 'brief', t('shell.side.brief'))}
            </>
          ) : (
            <>
              {/* All clients Home (the view is still called 'overview' inside the app) */}
              {item('overview', 'home', t('shell.side.home'))}
              <p className="side-hint">{t('shell.side.pickClient')}</p>
            </>
          )}
        </nav>

        <div className="side-foot">
          {/* "How we calculate this" and the "Sample data" pill were taken off the menu (4 Nov 2026); live data still says so. */}
          {p.live && (
            <span className="live-pill" title={t('shell.side.liveTip')}>
              {t('shell.side.live')}
            </span>
          )}
          {item('preferences', 'settings', t('shell.side.settings'))}
          <div className="side-user">
            <span className="avatar avatar-user">{initials(userName) || '?'}</span>
            <span className="side-user-text">
              <strong>{role === 'manager' && !account ? t('shell.side.manager', { name: userName }) : userName}</strong>
              <span className="small muted">{agency.agencyName}</span>
            </span>
            <button
              className="icon-btn"
              onClick={() => {
                p.onClose()
                p.onSignOut()
              }}
              aria-label={t('shell.side.signOut')}
              title={t('shell.side.signOut')}
            >
              <Icon name="out" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
