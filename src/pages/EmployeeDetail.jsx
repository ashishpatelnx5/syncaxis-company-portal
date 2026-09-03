import { Link, Navigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import MiniOrgTree from '../components/MiniOrgTree'
import { useEmployees } from '../context/useEmployees'
import { avatarColor, getAncestorChain, getDirectReports, initials } from '../utils/org'

export default function EmployeeDetail() {
  const { id } = useParams()
  const { employees } = useEmployees()
  const employee = employees.find((e) => String(e.id) === id)

  if (!employee) return <Navigate to="/directory" replace />

  const chain = getAncestorChain(employees, employee.id)
  const reports = getDirectReports(employees, employee.id)
  const emergency = employee.emergencyContact ?? {}
  const hasEmergencyContact = emergency.name || emergency.relation || emergency.phone

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to="/directory" className="back-link">
          <Icon name="chevron" size={14} className="back-icon" />
          Back to directory
        </Link>
        <Link to={`/admin?edit=${employee.id}`} className="back-link">
          <Icon name="edit" size={14} />
          Edit
        </Link>
      </div>

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
        <h2>Where {employee.name.split(' ')[0]} fits</h2>
        <MiniOrgTree chain={chain} reports={reports} />
      </section>
    </div>
  )
}
