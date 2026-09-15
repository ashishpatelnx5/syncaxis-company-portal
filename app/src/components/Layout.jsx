import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'
import { applyTheme, getStoredTheme, nextTheme } from '../utils/theme'

const THEME_META = {
  auto: { icon: 'monitor', label: 'Theme: matching your browser' },
  light: { icon: 'sun', label: 'Theme: light' },
  dark: { icon: 'moon', label: 'Theme: dark' },
}

function formatLastLogin(iso) {
  if (!iso) return 'first login'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

// `pageKeys` lists which permission key(s) (from src/data/permissions.js)
// unlock this item — a plain nav link needs at least one to be granted, and
// an admin group needs at least one visible child. `adminOnly` items (Users
// management) ignore permissions entirely and just check the role. An item
// with neither is always visible (Home).
const navItems = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  {
    to: '/organisation',
    end: true,
    label: 'Organisation',
    icon: 'sitemap',
    children: [
      { to: '/organisation/directory', label: 'Directory', icon: 'users', pageKeys: ['directory'] },
      { to: '/organisation/hierarchy', label: 'Org Chart', icon: 'sitemap', pageKeys: ['hierarchy'] },
      { to: '/organisation/holidays', label: 'Holidays', icon: 'calendar', pageKeys: ['holidays'] },
    ],
  },
  { to: '/applications', label: 'Applications', icon: 'grid', pageKeys: ['applications'] },
  { to: '/job-descriptions', label: 'Job Descriptions', icon: 'briefcase', pageKeys: ['job-descriptions'] },
  { to: '/daily-plan', label: 'Daily Plan', icon: 'clipboard', pageKeys: ['daily-plan'] },
  { to: '/complaints', label: 'Complaints & Feedback', icon: 'flag', pageKeys: ['complaints', 'admin-complaints'] },
  {
    label: 'Admin',
    icon: 'settings',
    match: '/admin',
    children: [
      { to: '/admin/employees', label: 'Employees', icon: 'users', pageKeys: ['admin-employees'] },
      { to: '/admin/departments', label: 'Departments', icon: 'building', pageKeys: ['admin-departments'] },
      { to: '/admin/job-descriptions', label: 'Job Descriptions', icon: 'briefcase', pageKeys: ['admin-job-descriptions'] },
      { to: '/admin/holidays', label: 'Holidays', icon: 'calendar', pageKeys: ['admin-holidays'] },
      { to: '/admin/daily-plans', label: 'Team Daily Plans', icon: 'clipboard', pageKeys: ['admin-daily-plans'] },
      { to: '/admin/complaints', label: 'Complaints & Feedback', icon: 'flag', pageKeys: ['admin-complaints'] },
      {
        label: 'Access Control',
        icon: 'shield',
        children: [
          { to: '/admin/users', label: 'Users', icon: 'key', adminOnly: true },
          { to: '/admin/roles', label: 'Roles', icon: 'shield', adminOnly: true },
          { to: '/admin/user-groups', label: 'User Groups', icon: 'users', adminOnly: true },
        ],
      },
    ],
  },
]

// Recursively drops a leaf the user isn't allowed to see, and drops a group
// once every one of its children has been dropped — so e.g. the whole
// "Access Control" sub-group (and Admin itself, if it were the only thing
// left in it) disappears for a non-admin instead of showing an empty toggle.
function filterVisible(item, isVisible) {
  if (item.children) {
    const children = item.children.map((child) => filterVisible(child, isVisible)).filter(Boolean)
    return children.length > 0 ? { ...item, children } : null
  }
  return isVisible(item) ? item : null
}

function useVisibleNavItems() {
  const { user, hasPage } = useAuth()

  function isVisible(item) {
    if (item.adminOnly) return user?.isAdmin
    if (!item.pageKeys) return true
    return item.pageKeys.some((key) => hasPage(key))
  }

  return navItems.map((item) => filterVisible(item, isVisible)).filter(Boolean)
}

// Every leaf `to` under this item (including the item's own, for a group
// that's also directly clickable — e.g. Organisation), so it knows whether
// the current route is inside it without a hand-maintained path prefix.
function leafPaths(item) {
  const own = item.to ? [item.to] : []
  const childPaths = item.children ? item.children.flatMap(leafPaths) : []
  return [...own, ...childPaths]
}

function NavGroup({ item, onNavigate, depth = 1 }) {
  const location = useLocation()
  const isActiveGroup = leafPaths(item).some((to) => location.pathname.startsWith(to))
  const [manuallyExpanded, setManuallyExpanded] = useState(false)
  // Always expanded while on one of this group's own routes — no point
  // letting a click hide the very sub-item you're currently on — otherwise
  // follows the manual toggle.
  const expanded = isActiveGroup || manuallyExpanded
  const linkClass = depth > 1 ? 'nav-link nav-sublink' : 'nav-link'

  function toggle(e) {
    e.preventDefault() // matters when this button sits next to/inside a Link sibling
    setManuallyExpanded((v) => !v)
  }

  return (
    <div className="nav-group">
      <div className="nav-group-header">
        {item.to ? (
          // Clickable label (navigates) plus a separate chevron button
          // (only toggles the submenu) — e.g. Organisation, which is both
          // a page of its own and a container for Directory/Org Chart/Holidays.
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${linkClass} nav-group-link ${isActive ? 'active' : ''}`}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={depth > 1 ? 16 : 20} />
            <span>{item.label}</span>
          </NavLink>
        ) : (
          // No page of its own (e.g. Admin) — the whole row is just a toggle.
          <button
            type="button"
            className={`${linkClass} nav-group-link ${isActiveGroup ? 'active' : ''}`}
            onClick={toggle}
          >
            <Icon name={item.icon} size={depth > 1 ? 16 : 20} />
            <span>{item.label}</span>
          </button>
        )}
        <button
          type="button"
          className="nav-group-chevron-btn"
          onClick={toggle}
          aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
          aria-expanded={expanded}
        >
          <Icon name="chevron" size={14} className={`nav-group-chevron ${expanded ? 'expanded' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="nav-subnav">
          {item.children.map((child) =>
            child.children ? (
              <NavGroup key={child.label} item={child} onNavigate={onNavigate} depth={depth + 1} />
            ) : (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.end}
                className={({ isActive }) => `nav-link nav-sublink ${isActive ? 'active' : ''}`}
                onClick={onNavigate}
              >
                <Icon name={child.icon} size={16} />
                <span>{child.label}</span>
              </NavLink>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getStoredTheme)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const visibleNavItems = useVisibleNavItems()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function cycleTheme() {
    const next = nextTheme(theme)
    applyTheme(next)
    setTheme(next)
  }

  return (
    <div className="shell">
      <button
        type="button"
        className="menu-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        <Icon name={open ? 'close' : 'menu'} />
      </button>

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link to="/organisation" className="brand" onClick={() => setOpen(false)}>
          <img src={logo} alt="Syncaxis" className="brand-logo" />
        </Link>
        <div className="sidebar-user-row-top">
          <div className="sidebar-user-row">
            <NavLink to="/account" className="sidebar-user" onClick={() => setOpen(false)}>
              <Icon name="user" size={14} />
              {user?.displayName || user?.username}
            </NavLink>
            <span className="sidebar-user-actions">
              <button
                type="button"
                className="icon-btn"
                onClick={cycleTheme}
                aria-label={THEME_META[theme].label}
                title={THEME_META[theme].label}
              >
                <Icon name={THEME_META[theme].icon} size={15} />
              </button>
              <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out">
                <Icon name="logout" size={15} />
              </button>
            </span>
          </div>
          <div className="sidebar-last-login">Last login: {formatLastLogin(user?.lastLoginAt)}</div>
        </div>
        <nav className="nav">
          {visibleNavItems.map((item) =>
            item.children ? (
              <NavGroup key={item.label} item={item} onNavigate={() => setOpen(false)} />
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-tagline">Syncaxis Company Portal</div>
        </div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
