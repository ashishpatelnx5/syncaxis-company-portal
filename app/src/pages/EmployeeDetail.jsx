import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import MiniOrgTree from '../components/MiniOrgTree'
import PhotoLightbox from '../components/PhotoLightbox'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'
import { getAncestorChain, getDirectReports } from '../utils/org'

export default function EmployeeDetail() {
  const { id } = useParams()
  const { employees, isLoading } = useEmployees()
  const { departments } = useDepartments()
  const { jobDescriptions } = useJobDescriptions()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const employee = employees.find((e) => String(e.id) === id)

  // Wait for the fetch to finish before deciding this id doesn't exist — on
  // a fresh page load (a bookmarked link, a refresh) the list starts empty.
  if (isLoading) return null
  if (!employee) return <Navigate to="/directory" replace />

  const jobDescription = jobDescriptions.find((jd) => jd.id === employee.jobDescriptionId)

  const chain = getAncestorChain(employees, employee.id)
  const reports = getDirectReports(employees, employee.id)
  const emergency = employee.emergencyContact ?? {}
  const hasEmergencyContact = emergency.name || emergency.relation || emergency.phone
  const departmentNames = (employee.departmentIds || [])
    .map((deptId) => departments.find((d) => d.id === deptId)?.name)
    .filter(Boolean)

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to="/directory" className="back-link">
          <Icon name="chevron" size={14} className="back-icon" />
          Back to directory
        </Link>
        <Link to={`/admin/employees?edit=${employee.id}`} className="back-link">
          <Icon name="edit" size={14} />
          Edit
        </Link>
      </div>

      <div className="detail-header">
        {employee.photo ? (
          <button
            type="button"
            className="avatar-button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`View ${employee.name}'s full photo`}
          >
            <Avatar name={employee.name} photo={employee.photo} className="detail-avatar" />
          </button>
        ) : (
          <Avatar name={employee.name} photo={employee.photo} className="detail-avatar" />
        )}
        <div>
          <h1>{employee.name}</h1>
          <p className="page-subtitle">
            {employee.title || 'Title not set'}
            {departmentNames.length > 0 && ` · ${departmentNames.join(', ')}`}
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

      {jobDescription && (
        <section className="section">
          <h2>Job description</h2>
          <Link to={`/job-descriptions/${jobDescription.id}`} className="jd-holder-chip">
            {jobDescription.title}
          </Link>
        </section>
      )}

      <section className="section">
        <h2>Where {employee.name.split(' ')[0]} fits</h2>
        <MiniOrgTree chain={chain} reports={reports} />
      </section>

      {lightboxOpen && (
        <PhotoLightbox src={employee.photo} alt={employee.name} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
