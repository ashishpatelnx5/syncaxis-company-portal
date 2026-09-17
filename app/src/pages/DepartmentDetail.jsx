import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'

// Mounted at /admin/departments/:id (reached by clicking a row in
// Admin > Departments) - Departments has no org-wide public page the way
// Employees/Job Descriptions do, so this is admin-only from the start.
export default function DepartmentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { departments, isLoading, deleteDepartment } = useDepartments()
  const { employees, isLoading: employeesLoading, refresh: refreshEmployees } = useEmployees()

  const department = departments.find((d) => String(d.id) === id)

  // Wait for the fetch to finish before deciding this id doesn't exist — on
  // a fresh page load (a bookmarked link, a refresh) the list starts empty.
  if (isLoading) return null
  if (!department) return <Navigate to="/admin/departments" replace />

  const members = employees.filter((e) => e.departmentIds?.includes(department.id))

  async function handleDelete() {
    const warning =
      members.length > 0
        ? `${members.length} ${members.length === 1 ? 'person is' : 'people are'} assigned to "${department.name}". They'll become unassigned. Delete this department anyway?`
        : `Delete "${department.name}"? This can't be undone.`
    if (window.confirm(warning)) {
      await deleteDepartment(department.id)
      // The server strips this department out of every employee's
      // assignment set as part of the delete — refetch so the UI matches.
      refreshEmployees()
      navigate('/admin/departments')
    }
  }

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to="/admin/departments" className="back-link">
          <Icon name="chevron" size={14} className="back-icon" />
          Back to Departments
        </Link>
        <div className="detail-toolbar-actions">
          <Link to={`/admin/departments/${department.id}/edit`} className="btn-primary">
            <Icon name="edit" size={14} />
            Edit
          </Link>
          <button type="button" className="btn-danger" onClick={handleDelete}>
            <Icon name="trash" size={14} />
            Delete
          </button>
        </div>
      </div>

      <header className="page-header">
        <h1>{department.name}</h1>
        <p className="page-subtitle">
          {members.length} {members.length === 1 ? 'person' : 'people'}
        </p>
      </header>

      {!employeesLoading && members.length > 0 && (
        <section className="jd-section">
          <h2>People</h2>
          <div className="jd-holder-list">
            {members.map((e) => (
              <Link key={e.id} to={`/admin/employees/${e.id}`} className="jd-holder-chip">
                <Avatar name={e.name} photo={e.photo} className="employee-avatar small" />
                {e.name}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
