import { useState } from 'react'
import ComplaintForm from '../components/ComplaintForm'
import ComplaintHistoryTimeline from '../components/ComplaintHistoryTimeline'
import ComplaintsSummary from '../components/ComplaintsSummary'
import Icon from '../components/Icon'
import { useAuth } from '../context/useAuth'
import { useComplaints } from '../context/useComplaints'
import { useEmployees } from '../context/useEmployees'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-')
}

export default function Complaints() {
  const { complaints, isLoading } = useComplaints()
  const { employees } = useEmployees()
  const { user, hasPage } = useAuth()
  const employeeId = user?.employeeId ?? ''
  // Admins (via the admin-complaints permission) see everyone's entries here
  // too, not just their own — deleting/reassigning still only lives on the
  // dedicated Admin: Complaints & Feedback page.
  const canSeeAll = hasPage('admin-complaints')
  // undefined = closed, null = new entry, number = editing that id
  const [editingId, setEditingId] = useState(undefined)
  // null = no filter (show all / "Total")
  const [statusFilter, setStatusFilter] = useState(null)
  // Accordion: at most one card's history is expanded at a time
  const [expandedId, setExpandedId] = useState(null)

  const employeeName = (id) => employees.find((e) => e.id === id)?.name ?? 'Former employee'
  const scopedComplaints = canSeeAll ? complaints : complaints.filter((c) => c.employeeId === Number(employeeId))
  const editingComplaint = typeof editingId === 'number' ? scopedComplaints.find((c) => c.id === editingId) : null
  const visibleComplaints = statusFilter ? scopedComplaints.filter((c) => c.status === statusFilter) : scopedComplaints

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Complaints &amp; Feedback</h1>
            <p className="page-subtitle">
              {canSeeAll
                ? 'Raise a complaint, report an issue, or share feedback — visible to everyone.'
                : 'Raise a complaint, report an issue, or share feedback. You can see your own entries here.'}
            </p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" disabled={!employeeId} onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> New entry
            </button>
          </div>
        </div>
      </header>

      <ComplaintsSummary complaints={scopedComplaints} selectedStatus={statusFilter} onSelectStatus={setStatusFilter} />

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
