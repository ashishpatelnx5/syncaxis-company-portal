import AppCard from '../components/AppCard'
import { useAuth } from '../context/useAuth'
import { apps } from '../data/apps'

export default function Applications() {
  const { user, hasApp } = useAuth()
  const visibleApps = apps.filter((app) => (app.adminOnly ? user?.isAdmin : hasApp(app.id)))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Applications</h1>
        <p className="page-subtitle">Company systems and tools, one click away.</p>
      </header>

      <div className="app-grid">
        {visibleApps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
      {visibleApps.length === 0 && <p className="empty-state">No applications have been granted to your account yet.</p>}
    </div>
  )
}
