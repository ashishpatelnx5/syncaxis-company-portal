import { useState } from 'react'
import ComplaintForm from '../components/ComplaintForm'
import ComplaintHistoryTimeline from '../components/ComplaintHistoryTimeline'
import ComplaintsSummary from '../components/ComplaintsSummary'
import Icon from '../components/Icon'
import { useComplaints } from '../context/useComplaints'
import { useEmployees } from '../context/useEmployees'
import { getWhoAmI, setWhoAmI } from '../utils/whoAmI'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-')
}

export default function Complaints() {
  const { complaints, isLoading } = useComplaints()
  const { employees } = useEmployees()
  const [employeeId, setEmployeeId] = useState(getWhoAmI)
  // undefined = closed, null = new entry, number = editing that id
  const [editingId, setEditingId] = useState(undefined)
  // null = no filter (show all / "Total")
  const [statusFilter, setStatusFilter] = useState(null)
  // Accordion: at most one card's history is expanded at a time
  const [expandedId, setExpandedId] = useState(null)

  function chooseEmployee(id) {
    setEmployeeId(id)
    setWhoAmI(id)
  }

  const sortedEmployees = employees.slice().sort((a, b) => a.name.localeCompare(b.name))
  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? 'Former employee'
  const editingComplaint = typeof editingId === 'number' ? complaints.find((c) => c.id === editingId) : null
  const visibleComplaints = statusFilter ? complaints.filter((c) => c.status === statusFilter) : complaints

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Complaints &amp; Feedback</h1>
            <p className="page-subtitle">Raise a complaint, report an issue, or share feedback — visible to everyone.</p>
          </div>
          <div className="admin-header-actions">
            <label className="form-field complaint-whoami">
              <span>Who are you?</span>
              <select value={employeeId} onChange={(e) => chooseEmployee(e.target.value)}>
                <option value="">— Select your name —</option>
                {sortedEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-primary" disabled={!employeeId} onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> New entry
            </button>
          </div>
        </div>
      </header>

      <ComplaintsSummary complaints={complaints} selectedStatus={statusFilter} onSelectStatus={setStatusFilter} />

      {isLoading ? (
        <p className="empty-state">Loading…</p>
      ) : visibleComplaints.length === 0 ? (
        <p className="empty-state">{statusFilter ? `No ${statusFilter.toLowerCase()} entries.` : 'Nothing here yet.'}</p>
      ) : (
        <div className="complaint-list">
          {visibleComplaints.map((c) => {
            const hasHistory = c.history?.length > 1
            const isExpanded = expandedId === c.id
            return (
              <article
                key={c.id}
                className={`complaint-card ${hasHistory ? 'complaint-card-expandable' : ''}`}
                onClick={hasHistory ? () => setExpandedId(isExpanded ? null : c.id) : undefined}
              >
                <div className="complaint-card-header">
                  <span className={`badge badge-category-${slug(c.category)}`}>{c.category}</span>
                  <span className={`badge badge-status-${slug(c.status)}`}>{c.status}</span>
                  <span className="complaint-card-date">{formatDate(c.createdAt)}</span>
                  {hasHistory && <Icon name="chevron" size={14} className={`complaint-card-chevron ${isExpanded ? 'expanded' : ''}`} />}
                </div>
                <h3 className="complaint-card-subject">{c.subject}</h3>
                <p className="complaint-card-description">{c.description}</p>
                {isExpanded && <ComplaintHistoryTimeline history={c.history} />}
                <div className="complaint-card-footer">
                  <span className="complaint-card-author">{employeeName(c.employeeId)}</span>
                  {c.employeeId === Number(employeeId) && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingId(c.id)
                      }}
                      aria-label="Edit"
                    >
                      <Icon name="edit" size={15} />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editingId !== undefined && (
        <ComplaintForm complaint={editingComplaint} employeeId={employeeId} onClose={() => setEditingId(undefined)} />
      )}
    </div>
  )
}
