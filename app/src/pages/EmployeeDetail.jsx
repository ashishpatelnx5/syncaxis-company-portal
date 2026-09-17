import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import ContactPanel from '../components/ContactPanel'
import Icon from '../components/Icon'
import MiniOrgTree from '../components/MiniOrgTree'
import PhotoLightbox from '../components/PhotoLightbox'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'
import { getAncestorChain, getDirectReports } from '../utils/org'

// adminContext: true when mounted at /admin/employees/:id (reached by
// clicking a row in Admin > Employees) rather than the general /employee/:id
// (reached from the Directory) - same page either way, just a different
// "back" destination and an Edit link that stays inside the Admin section.
export default function EmployeeDetail({ adminContext = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPage } = useAuth()
  const { employees, isLoading, deleteEmployee } = useEmployees()
  const { departments } = useDepartments()
  const { jobDescriptions } = useJobDescriptions()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const employee = employees.find((e) => String(e.id) === id)
  const canManage = hasPage('admin-employees')
  const backTo = adminContext ? '/admin/employees' : '/organisation/directory'

  // Wait for the fetch to finish before deciding this id doesn't exist — on
  // a fresh page load (a bookmarked link, a refresh) the list starts empty.
  if (isLoading) return null
  if (!employee) return <Navigate to={backTo} replace />

  const jobDescription = jobDescriptions.find((jd) => jd.id === employee.jobDescriptionId)

  const chain = getAncestorChain(employees, employee.id)
  const reports = getDirectReports(employees, employee.id)
  const departmentNames = (employee.departmentIds || [])
    .map((deptId) => departments.find((d) => d.id === deptId)?.name)
    .filter(Boolean)

  function handleDelete() {
    const warning =
      reports.length > 0
        ? `${employee.name} has ${reports.length} direct report${reports.length > 1 ? 's' : ''} (${reports
            .map((r) => r.name)
            .join(', ')}), who will become unassigned. Delete ${employee.name} anyway?`
        : `Delete ${employee.name}? This can't be undone.`
    if (window.confirm(warning)) {
      deleteEmployee(employee.id)
      navigate(backTo)
    }
  }

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to={backTo} className="back-link">
          <Icon name="chevron" size={14} className="back-icon" />
          {adminContext ? 'Back to Employees' : 'Back to directory'}
        </Link>
        {canManage && (
          <div className="detail-toolbar-actions">
            <Link to={`/admin/employees/${employee.id}/edit`} className="btn-primary">
              <Icon name="edit" size={14} />
              Edit
            </Link>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              <Icon name="trash" size={14} />
              Delete
            </button>
          </div>
        )}
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
          <Link
            to={adminContext ? `/admin/job-descriptions/${jobDescription.id}` : `/job-descriptions/${jobDescription.id}`}
            className="jd-holder-chip"
          >
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
