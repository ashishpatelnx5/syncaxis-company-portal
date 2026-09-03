import { Link } from 'react-router-dom'
import AppCard from '../components/AppCard'
import Icon from '../components/Icon'
import { useEmployees } from '../context/useEmployees'
import { apps } from '../data/apps'

export default function Home() {
  const { employees } = useEmployees()
  const departments = new Set(employees.map((e) => e.department).filter(Boolean))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Welcome to the Syncaxis Portal</h1>
        <p className="page-subtitle">
          Your hub for company applications, the employee directory, and the org chart.
        </p>
      </header>

      <section className="stats-row">
        <Link to="/directory" className="stat-card">
          <Icon name="users" size={22} />
          <div>
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Employees</div>
          </div>
        </Link>
        <Link to="/hierarchy" className="stat-card">
          <Icon name="building" size={22} />
          <div>
            <div className="stat-value">{departments.size}</div>
            <div className="stat-label">Departments</div>
          </div>
        </Link>
        <Link to="/applications" className="stat-card">
          <Icon name="grid" size={22} />
          <div>
            <div className="stat-value">{apps.length}</div>
            <div className="stat-label">Applications</div>
          </div>
        </Link>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Quick links</h2>
          <Link to="/applications" className="section-link">
            View all
          </Link>
        </div>
        <div className="app-grid">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      </section>
    </div>
  )
}
