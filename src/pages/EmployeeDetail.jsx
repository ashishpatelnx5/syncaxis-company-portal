import { Link, Navigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import OrgNode from '../components/OrgNode'
import { employees } from '../data/employees'
import { avatarColor, getWithReports, initials } from '../utils/org'

export default function EmployeeDetail() {
  const { id } = useParams()
  const employee = employees.find((e) => String(e.id) === id)

  if (!employee) return <Navigate to="/directory" replace />

  const manager = employee.managerId != null ? employees.find((e) => e.id === employee.managerId) : null
  const reports = getWithReports(employees, employee.id)?.children ?? []
  const emergency = employee.emergencyContact ?? {}
  const hasEmergencyContact = emergency.name || emergency.relation || emergency.phone

  return (
    <div className="page">
      <Link to="/directory" className="back-link">
        <Icon name="chevron" size={14} className="back-icon" />
        Back to directory
      </Link>

      <div className="detail-header">
        <div className="detail-avatar" style={{ background: avatarColor(employee.name) }}>
          {initials(employee.name)}
        </div>
        <div>
          <h1>{employee.name}</h1>
          <p className="page-subtitle">
            {employee.title || 'Title not set'}
            {employee.department && ` · ${employee.department}`}
            {employee.employeeId && ` · #${employee.employeeId}`}
          </p>
          {manager && (
            <p className="reports-to">
              Reports to <Link to={`/employee/${manager.id}`}>{manager.name}</Link>
            </p>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <section className="detail-card">
          <h2>Contact</h2>
          {employee.email || employee.phone ? (
            <dl className="detail-list">
              {employee.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${employee.email}`}>{employee.email}</a>
                  </dd>
                </>
              )}
              {employee.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${employee.phone}`}>{employee.phone}</a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
        </section>

        <section className="detail-card">
          <h2>Emergency contact</h2>
          {hasEmergencyContact ? (
            <dl className="detail-list">
              {emergency.name && (
                <>
                  <dt>Name</dt>
                  <dd>{emergency.name}</dd>
                </>
              )}
              {emergency.relation && (
                <>
                  <dt>Relation</dt>
                  <dd>{emergency.relation}</dd>
                </>
              )}
              {emergency.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${emergency.phone}`}>{emergency.phone}</a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
        </section>
      </div>

      <section className="section">
        <h2>Direct reports</h2>
        {reports.length > 0 ? (
          <div className="org-chart-scroll">
            <ul className="org-tree">
              {reports.map((report) => (
                <OrgNode key={report.id} person={report} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="empty-state">No one reports to {employee.name.split(' ')[0]} yet.</p>
        )}
      </section>
    </div>
  )
}
