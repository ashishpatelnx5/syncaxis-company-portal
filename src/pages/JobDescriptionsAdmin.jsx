import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import JobDescriptionForm from '../components/JobDescriptionForm'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'

export default function JobDescriptionsAdmin() {
  const { jobDescriptions, deleteJobDescription } = useJobDescriptions()
  const { departments } = useDepartments()
  const { employees, refresh: refreshEmployees } = useEmployees()
  const [searchParams, setSearchParams] = useSearchParams()
  // undefined = closed, null = add-new form, number = editing that id
  const [editingId, setEditingId] = useState(() => {
    const editParam = searchParams.get('edit')
    return editParam ? Number(editParam) : undefined
  })

  function closeForm() {
    setEditingId(undefined)
    if (searchParams.get('edit')) setSearchParams({}, { replace: true })
  }

  const sorted = useMemo(() => jobDescriptions.slice().sort((a, b) => a.title.localeCompare(b.title)), [jobDescriptions])

  function departmentName(id) {
    return departments.find((d) => d.id === id)?.name || '—'
  }

  function holderCount(id) {
    return employees.filter((e) => e.jobDescriptionId === id).length
  }

  async function handleDelete(jd) {
    const count = holderCount(jd.id)
    const warning =
      count > 0
        ? `${count} ${count === 1 ? 'person is' : 'people are'} assigned "${jd.title}". They'll become unassigned. Delete this job description anyway?`
        : `Delete "${jd.title}"? This can't be undone.`
    if (window.confirm(warning)) {
      await deleteJobDescription(jd.id)
      // The server clears JobDescriptionId on anyone who held it as part of
      // the same delete — refetch so the UI matches.
      refreshEmployees()
    }
  }

  const editingJobDescription = typeof editingId === 'number' ? jobDescriptions.find((j) => j.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Job Descriptions</h1>
            <p className="page-subtitle">Add, edit, and remove job descriptions employees can be assigned to.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
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
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((jd) => (
              <tr key={jd.id}>
                <td className="admin-name-cell">{jd.title}</td>
                <td>{departmentName(jd.departmentId)}</td>
                <td>{holderCount(jd.id)}</td>
                <td className="admin-row-actions">
                  <button type="button" className="icon-btn" onClick={() => setEditingId(jd.id)} aria-label={`Edit ${jd.title}`}>
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => handleDelete(jd)}
                    aria-label={`Delete ${jd.title}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No job descriptions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId !== undefined && (
        <JobDescriptionForm jobDescription={editingId === null ? null : editingJobDescription} onClose={closeForm} />
      )}
    </div>
  )
}
