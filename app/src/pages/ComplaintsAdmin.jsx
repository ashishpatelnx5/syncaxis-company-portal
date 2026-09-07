import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ComplaintForm from '../components/ComplaintForm'
import ComplaintsSummary from '../components/ComplaintsSummary'
import Icon from '../components/Icon'
import { useComplaints } from '../context/useComplaints'
import { useEmployees } from '../context/useEmployees'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-')
}

export default function ComplaintsAdmin() {
  const { complaints, deleteComplaint } = useComplaints()
  const { employees } = useEmployees()
  const [searchParams, setSearchParams] = useSearchParams()
  // undefined = closed, null = add-new form, number = editing that id
  const [editingId, setEditingId] = useState(() => {
    const editParam = searchParams.get('edit')
    return editParam ? Number(editParam) : undefined
  })
  // null = no filter (show all / "Total")
  const [statusFilter, setStatusFilter] = useState(null)

  function closeForm() {
    setEditingId(undefined)
    if (searchParams.get('edit')) setSearchParams({}, { replace: true })
  }

  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? 'Former employee'
  const editingComplaint = typeof editingId === 'number' ? complaints.find((c) => c.id === editingId) : null
  const visibleComplaints = statusFilter ? complaints.filter((c) => c.status === statusFilter) : complaints

  function handleDelete(c) {
    if (window.confirm(`Delete "${c.subject}"? This can't be undone.`)) deleteComplaint(c.id)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Complaints &amp; Feedback</h1>
            <p className="page-subtitle">Review, update status, or remove entries. Deleting is only available here.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add entry
            </button>
          </div>
        </div>
      </header>

      <ComplaintsSummary complaints={complaints} selectedStatus={statusFilter} onSelectStatus={setStatusFilter} />

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Raised by</th>
              <th>Category</th>
              <th>Subject</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {visibleComplaints.map((c) => (
              <tr key={c.id}>
                <td>{formatDate(c.createdAt)}</td>
                <td>{employeeName(c.employeeId)}</td>
                <td>
                  <span className={`badge badge-category-${slug(c.category)}`}>{c.category}</span>
                </td>
                <td className="admin-name-cell">{c.subject}</td>
                <td>
                  <span className={`badge badge-status-${slug(c.status)}`}>{c.status}</span>
                </td>
                <td className="admin-row-actions">
                  <button type="button" className="icon-btn" onClick={() => setEditingId(c.id)} aria-label={`Edit ${c.subject}`}>
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => handleDelete(c)}
                    aria-label={`Delete ${c.subject}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {visibleComplaints.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  {statusFilter ? `No ${statusFilter.toLowerCase()} entries.` : 'Nothing here yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId !== undefined && <ComplaintForm complaint={editingComplaint} showAdminFields onClose={closeForm} />}
    </div>
  )
}
