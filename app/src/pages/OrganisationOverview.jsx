import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'

export default function OrganisationOverview() {
  const { employees } = useEmployees()
  const { departments } = useDepartments()
  const { hasPage } = useAuth()

  return (
    <div className="page">
      <header className="page-header">
        <h1>Organisation</h1>
        <p className="page-subtitle">The company directory, org chart, and holidays — pick a tab above, or jump in below.</p>
      </header>

      <section className="stats-row">
        <Link to="/organisation/directory" className="stat-card">
          <Icon name="users" size={22} />
          <div>
            <div className="stat-value">{employees.length}</div>
            <div className="stat-label">Employees</div>
          </div>
        </Link>
        {hasPage('admin-departments') ? (
          <Link to="/admin/departments" className="stat-card">
            <Icon name="building" size={22} />
            <div>
              <div className="stat-value">{departments.length}</div>
              <div className="stat-label">Departments</div>
            </div>
          </Link>
        ) : (
          <div className="stat-card">
            <Icon name="building" size={22} />
            <div>
              <div className="stat-value">{departments.length}</div>
              <div className="stat-label">Departments</div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
