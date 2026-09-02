import AppCard from '../components/AppCard'
import { apps } from '../data/apps'

export default function Applications() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Applications</h1>
        <p className="page-subtitle">Company systems and tools, one click away.</p>
      </header>

      <div className="app-grid">
        {apps.map((app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  )
}
