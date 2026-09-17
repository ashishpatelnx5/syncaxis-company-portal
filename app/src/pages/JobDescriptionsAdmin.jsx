import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import JobDescriptionForm from '../components/JobDescriptionForm'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'

export default function JobDescriptionsAdmin() {
  const { jobDescriptions } = useJobDescriptions()
  const { departments } = useDepartments()
  const { employees } = useEmployees()
  const navigate = useNavigate()
  // Editing an existing job description is its own full page now (see
  // JobDescriptionEdit.jsx at /admin/job-descriptions/:id/edit) - this modal
  // is only for adding a new one, which doesn't have an id yet for its own URL.
  const [addOpen, setAddOpen] = useState(false)

  const sorted = useMemo(() => jobDescriptions.slice().sort((a, b) => a.title.localeCompare(b.title)), [jobDescriptions])

  function departmentName(id) {
    return departments.find((d) => d.id === id)?.name || '—'
  }

  function holderCount(id) {
    return employees.filter((e) => e.jobDescriptionId === id).length
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Job Descriptions</h1>
            <p className="page-subtitle">Add, edit, and remove job descriptions employees can be assigned to.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
              <Icon name="plus" size={16} /> Add job description
            </button>
          </div>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((jd) => (
              <tr
                key={jd.id}
                className="admin-row-clickable"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/admin/job-descriptions/${jd.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/job-descriptions/${jd.id}`)}
              >
                <td className="admin-name-cell">{jd.title}</td>
                <td>{departmentName(jd.departmentId)}</td>
                <td>{holderCount(jd.id)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">
                  No job descriptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && <JobDescriptionForm jobDescription={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
