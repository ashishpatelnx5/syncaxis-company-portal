import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Icon from './Icon'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'

const navItems = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/directory', label: 'Directory', icon: 'users' },
  { to: '/hierarchy', label: 'Org Chart', icon: 'sitemap' },
  { to: '/applications', label: 'Applications', icon: 'grid' },
  { to: '/holidays', label: 'Holidays', icon: 'calendar' },
  { to: '/job-descriptions', label: 'Job Descriptions', icon: 'briefcase' },
  { to: '/daily-plan', label: 'Daily Plan', icon: 'clipboard' },
  {
    label: 'Admin',
    icon: 'settings',
    match: '/admin',
    children: [
      { to: '/admin/employees', label: 'Employees', icon: 'users' },
      { to: '/admin/departments', label: 'Departments', icon: 'building' },
      { to: '/admin/job-descriptions', label: 'Job Descriptions', icon: 'briefcase' },
      { to: '/admin/daily-plans', label: 'Team Daily Plans', icon: 'clipboard' },
    ],
  },
]

function NavGroup({ item, onNavigate }) {
  const location = useLocation()
  const isActiveGroup = location.pathname.startsWith(item.match)
  const [manuallyExpanded, setManuallyExpanded] = useState(false)
  // Always expanded while on one of this group's own routes — no point
  // letting a click hide the very sub-item you're currently on — otherwise
  // follows the manual toggle.
  const expanded = isActiveGroup || manuallyExpanded

  return (
    <div className="nav-group">
      <button
        type="button"
        className={`nav-link nav-group-toggle ${isActiveGroup ? 'active' : ''}`}
        onClick={() => setManuallyExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <Icon name={item.icon} />
        <span>{item.label}</span>
        <Icon name="chevron" size={14} className={`nav-group-chevron ${expanded ? 'expanded' : ''}`} />
      </button>
      {expanded && (
        <div className="nav-subnav">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              className={({ isActive }) => `nav-link nav-sublink ${isActive ? 'active' : ''}`}
              onClick={onNavigate}
            >
              <Icon name={child.icon} size={16} />
              <span>{child.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
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
        <div className="brand">
          <img src={logo} alt="Syncaxis" className="brand-logo" />
        </div>
        <div className="sidebar-user-row sidebar-user-row-top">
          <span className="sidebar-user">
            <Icon name="user" size={14} />
            {user?.username}
          </span>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out">
            <Icon name="logout" size={15} />
          </button>
        </div>
        <nav className="nav">
          {navItems.map((item) =>
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
