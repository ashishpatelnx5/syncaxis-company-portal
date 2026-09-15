import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ContactPanel from '../components/ContactPanel'
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
  if (!employee) return <Navigate to="/organisation/directory" replace />

  const jobDescription = jobDescriptions.find((jd) => jd.id === employee.jobDescriptionId)

  const chain = getAncestorChain(employees, employee.id)
  const reports = getDirectReports(employees, employee.id)
  const departmentNames = (employee.departmentIds || [])
    .map((deptId) => departments.find((d) => d.id === deptId)?.name)
    .filter(Boolean)

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to="/organisation/directory" className="back-link">
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
        <ContactPanel employee={employee} />

        {(chain.length > 0 || reports.length > 0) && (
          <div>
            <h2>Org Chart</h2>
            <MiniOrgTree chain={chain} reports={reports} />
          </div>
        )}
      </div>

      {jobDescription && (
        <section className="section">
          <h2>Job description</h2>
          <Link to={`/job-descriptions/${jobDescription.id}`} className="jd-holder-chip">
            {jobDescription.title}
          </Link>
        </section>
      )}

      {lightboxOpen && (
        <PhotoLightbox src={employee.photo} alt={employee.name} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}
