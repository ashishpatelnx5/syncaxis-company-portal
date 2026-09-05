import { Link } from 'react-router-dom'
import { useDepartments } from '../context/useDepartments'
import { useJobDescriptions } from '../context/useJobDescriptions'

export default function JobDescriptions() {
  const { departments } = useDepartments()
  const { jobDescriptions, isLoading } = useJobDescriptions()

  const sortedDepartments = departments.slice().sort((a, b) => a.name.localeCompare(b.name))
  const groups = sortedDepartments
    .map((dept) => ({
      department: dept,
      items: jobDescriptions.filter((jd) => jd.departmentId === dept.id).sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Job Descriptions</h1>
        <p className="page-subtitle">Roles and responsibilities, by department.</p>
      </header>

      {isLoading ? (
        <p className="empty-state">Loading…</p>
      ) : groups.length === 0 ? (
        <p className="empty-state">No job descriptions yet.</p>
      ) : (
        groups.map((group) => (
          <section key={group.department.id} className="jd-department-group">
            <h2 className="jd-department-label">{group.department.name}</h2>
            <div className="jd-card-grid">
              {group.items.map((jd) => (
                <Link key={jd.id} to={`/job-descriptions/${jd.id}`} className="jd-card">
                  <span className="jd-card-title">{jd.title}</span>
                  {jd.reportingTo && <span className="jd-card-subtitle">Reports to {jd.reportingTo}</span>}
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
