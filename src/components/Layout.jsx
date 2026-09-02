import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import Icon from './Icon'
import logo from '../assets/logo.png'

const navItems = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/directory', label: 'Directory', icon: 'users' },
  { to: '/hierarchy', label: 'Org Chart', icon: 'sitemap' },
  { to: '/applications', label: 'Applications', icon: 'grid' },
]

export default function Layout() {
  const [open, setOpen] = useState(false)

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
        <nav className="nav">
          {navItems.map((item) => (
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
          ))}
        </nav>
        <div className="sidebar-footer">Syncaxis Company Portal</div>
      </aside>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
