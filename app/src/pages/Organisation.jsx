import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

const TABS = [
  { to: '/organisation/directory', label: 'Directory', pageKeys: ['directory'] },
  { to: '/organisation/hierarchy', label: 'Org Chart', pageKeys: ['hierarchy'] },
  { to: '/organisation/holidays', label: 'Holidays', pageKeys: ['holidays'] },
]

// Just the tab strip — each tab's own page already renders its own full
// `.page` wrapper and header, so this deliberately doesn't add another one
// around <Outlet />.
export default function Organisation() {
  const { hasPage } = useAuth()
  const visibleTabs = TABS.filter((t) => t.pageKeys.some(hasPage))

  return (
    <div>
      <nav className="tab-strip">
        {visibleTabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `tab-link ${isActive ? 'active' : ''}`}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
