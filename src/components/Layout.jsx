import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from './Icon'
import { Banner } from './ui/Primitives'
import { useAuth } from '../firebase/auth'
import { useData } from '../data/store'
import { buildEventView } from '../utils/calc'
import { initialsOf } from '../utils/format'

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
      { to: '/calendar', label: 'Calendar', icon: 'calendar' },
    ],
  },
  {
    title: 'Work',
    items: [
      { to: '/events', label: 'All Events', icon: 'camera' },
      { to: '/clients', label: 'Clients', icon: 'users' },
      { to: '/crew', label: 'Crew & Footage', icon: 'film', badge: 'footage' },
    ],
  },
  {
    title: 'Money',
    items: [{ to: '/payments', label: 'Payments', icon: 'wallet', badge: 'money' }],
  },
  {
    title: 'System',
    items: [
      { to: '/notifications', label: 'Reminders', icon: 'bell' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

const BOTTOM_NAV = [
  { to: '/', label: 'Home', icon: 'dashboard', end: true },
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/events', label: 'Events', icon: 'camera' },
  { to: '/payments', label: 'Payments', icon: 'wallet', badge: 'money' },
  { to: '/crew', label: 'Crew', icon: 'film', badge: 'footage' },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const { db, error, dismissError } = useData()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const alerts = countAlerts(db)

  const badgeFor = (key) => (key === 'money' ? alerts.money : key === 'footage' ? alerts.footage : 0)

  const navBody = (
    <nav className="sidebar-nav">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="nav-section">{section.title}</div>
          {section.items.map((item) => {
            const count = badgeFor(item.badge)
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className="nav-link">
                <Icon name={item.icon} size={18} />
                <span className="grow">{item.label}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )

  const userChip = (
    <button type="button" className="user-chip" onClick={signOut}>
      <Avatar user={user} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="user-chip-name">{user?.displayName ?? 'Signed in'}</span>
        <span className="user-chip-mail">{user?.email}</span>
      </span>
      <Icon name="logout" size={16} />
    </button>
  )

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          type="button"
          className="icon-button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Icon name="menu" size={21} />
        </button>

        <Link to="/" className="topbar-brand grow">
          <span className="brand-mark">
            <Icon name="camera" size={18} />
          </span>
          <span className="topbar-title">Event Manager</span>
        </Link>

        <Link to="/events/new" className="icon-button" aria-label="Add event">
          <Icon name="plus" size={21} />
        </Link>
      </header>

      {drawerOpen && (
        <>
          <div
            className="drawer-backdrop"
            onClick={() => setDrawerOpen(false)}
            role="presentation"
          />
          <aside className="drawer" role="dialog" aria-label="Menu">
            <div className="drawer-head">
              <span className="brand-mark">
                <Icon name="camera" size={18} />
              </span>
              <div className="grow">
                <div className="strong" style={{ fontSize: '0.9rem' }}>
                  Event Manager
                </div>
                <div className="text-xs text-muted">Photography &amp; Video</div>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <Icon name="x" size={19} />
              </button>
            </div>
            {/* Tapping any link inside the drawer also closes it. */}
            <div
              className="grow"
              style={{ display: 'flex', minHeight: 0 }}
              onClick={() => setDrawerOpen(false)}
              role="presentation"
            >
              {navBody}
            </div>
            <div className="sidebar-footer">{userChip}</div>
          </aside>
        </>
      )}

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-head">
            <span className="brand-mark">
              <Icon name="camera" size={19} />
            </span>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="strong" style={{ fontSize: '0.925rem' }}>
                Event Manager
              </div>
              <div className="text-xs text-muted">Photography &amp; Video</div>
            </div>
          </div>
          {navBody}
          <div className="sidebar-footer">{userChip}</div>
        </aside>

        <main className="app-main">
          {error && (
            <Banner kind="danger" onDismiss={dismissError}>
              {error}
            </Banner>
          )}

          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Main">
        {BOTTOM_NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="bottom-nav-link">
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
            {badgeFor(item.badge) > 0 && <span className="dot" />}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function Avatar({ user, size = 34 }) {
  if (user?.photoURL) {
    return (
      <img
        className="avatar"
        src={user.photoURL}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
      />
    )
  }
  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      {initialsOf(user?.displayName ?? user?.email ?? '?')}
    </span>
  )
}

/** Counts the things that need attention, for the little red nav badges. */
function countAlerts(db) {
  let money = 0
  let footage = 0
  for (const event of db.events) {
    const view = buildEventView(event, db)
    if (view.money.balance > 0 || view.crewSummary.pending > 0) money += 1
    if (view.footageSummary.pending > 0 && event.shootStatus === 'Ended') footage += 1
  }
  return { money, footage }
}
