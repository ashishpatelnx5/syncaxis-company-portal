import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppCard from '../components/AppCard'
import Avatar from '../components/Avatar'
import ContactPanel from '../components/ContactPanel'
import Icon from '../components/Icon'
import MiniOrgTree from '../components/MiniOrgTree'
import PhotoLightbox from '../components/PhotoLightbox'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { apps } from '../data/apps'
import { getAncestorChain, getDirectReports } from '../utils/org'

export default function Home() {
  const { employees } = useEmployees()
  const { departments } = useDepartments()
  const { user, hasApp } = useAuth()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const visibleApps = apps.filter((app) => (app.adminOnly ? user?.isAdmin : hasApp(app.id)))
  const myEmployee = employees.find((e) => e.id === user?.employeeId)

  const departmentNames = myEmployee
    ? (myEmployee.departmentIds || []).map((id) => departments.find((d) => d.id === id)?.name).filter(Boolean)
    : []
  const managerName = myEmployee ? employees.find((e) => e.id === myEmployee.managerId)?.name : null
  const chain = myEmployee ? getAncestorChain(employees, myEmployee.id) : []
  const reports = myEmployee ? getDirectReports(employees, myEmployee.id) : []

  return (
    <div className="page">
      <header className="page-header">
        <h1>Welcome back, {user?.displayName || user?.username}</h1>
        <p className="page-subtitle">
          Your hub for company applications, the employee directory, and the org chart.
        </p>
      </header>

      {myEmployee && (
        <section className="section">
          <div className="detail-header">
            {myEmployee.photo ? (
              <button
                type="button"
                className="avatar-button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View ${myEmployee.name}'s full photo`}
              >
                <Avatar name={myEmployee.name} photo={myEmployee.photo} className="detail-avatar" />
              </button>
            ) : (
              <Avatar name={myEmployee.name} photo={myEmployee.photo} className="detail-avatar" />
            )}
            <div>
              <h2 style={{ margin: 0, fontSize: 22 }}>{myEmployee.name}</h2>
              <p className="page-subtitle">
                {myEmployee.title || 'Title not set'}
                {departmentNames.length > 0 && ` · ${departmentNames.join(', ')}`}
                {myEmployee.employeeId && ` · #${myEmployee.employeeId}`}
              </p>
              {managerName && <p className="page-subtitle">Reports to {managerName}</p>}
            </div>
            <Link to="/my-profile" className="back-link" style={{ marginLeft: 'auto', alignSelf: 'flex-start' }}>
              <Icon name="edit" size={14} />
              Edit
            </Link>
          </div>

          <div className="detail-grid">
            <ContactPanel employee={myEmployee} />

            {(chain.length > 0 || reports.length > 0) && (
              <div>
                <h2>Org Chart</h2>
                <MiniOrgTree chain={chain} reports={reports} />
              </div>
            )}
          </div>
        </section>
      )}

      {visibleApps.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Quick links</h2>
            <Link to="/applications" className="section-link">
              View all
            </Link>
          </div>
          <div className="app-grid">
            {visibleApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

      {lightboxOpen && myEmployee?.photo && (
        <PhotoLightbox src={myEmployee.photo} alt={myEmployee.name} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
