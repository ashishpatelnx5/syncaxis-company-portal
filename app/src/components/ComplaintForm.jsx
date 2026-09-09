import { useState } from 'react'
import ComplaintHistoryTimeline from './ComplaintHistoryTimeline'
import Icon from './Icon'
import { useComplaints } from '../context/useComplaints'
import { useEmployees } from '../context/useEmployees'

const CATEGORIES = ['Complaint', 'Issue', 'Feedback']
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

// showAdminFields: lets you reassign the employee ("Raised by") — only the
// Admin page passes this. Category/Subject/Description/Status are editable
// either way. On the public page, the Edit button is only ever shown on an
// employee's own entries (see Complaints.jsx), so a non-admin editing here
// is always editing their own submission, never someone else's. Only Admin
// can reassign Raised by or delete an entry.
export default function ComplaintForm({ complaint, employeeId, showAdminFields = false, onClose }) {
  const { addComplaint, updateComplaint } = useComplaints()
  const { employees } = useEmployees()
  const isNew = complaint == null
  const sortedEmployees = employees.slice().sort((a, b) => a.name.localeCompare(b.name))
  const showStatusField = showAdminFields || !isNew

  const [form, setForm] = useState(() => ({
    employeeId: complaint ? complaint.employeeId : Number(employeeId) || sortedEmployees[0]?.id || '',
    category: complaint?.category ?? 'Complaint',
    subject: complaint?.subject ?? '',
    description: complaint?.description ?? '',
    status: complaint?.status ?? 'Open',
    statusComment: '',
  }))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const raisedBy = employees.find((e) => e.id === form.employeeId)
  const isChangingStatus = !isNew && form.status !== complaint.status

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.subject.trim() || !form.description.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const payload = { ...form, employeeId: Number(form.employeeId) }
      if (isNew) {
        await addComplaint(payload)
      } else {
        await updateComplaint(complaint.id, payload)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this entry.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'New entry' : 'Edit entry'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          {showAdminFields ? (
            <label className="form-field">
              <span>Raised by</span>
              <select value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} required>
                {sortedEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            raisedBy && (
              <p className="form-hint">
                {isNew ? 'Submitting as' : 'Raised by'} <strong>{raisedBy.name}</strong>.
              </p>
            )
          )}

          <div className="form-row">
            <label className="form-field">
              <span>Category *</span>
              <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {showStatusField && (
              <label className="form-field">
                <span>Status *</span>
                <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {isChangingStatus && (
            <label className="form-field">
              <span>
                Comment on moving to <strong>{form.status}</strong> (optional)
              </span>
              <textarea
                value={form.statusComment}
                onChange={(e) => set('statusComment', e.target.value)}
                rows={2}
                placeholder="Why is the status changing?"
              />
            </label>
          )}

          <label className="form-field">
            <span>Subject *</span>
            <input value={form.subject} onChange={(e) => set('subject', e.target.value)} required autoFocus />
          </label>

          <label className="form-field">
            <span>Description *</span>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} required />
          </label>

          {!isNew && complaint.history?.length > 0 && (
            <div className="form-field">
              <span>History</span>
              <ComplaintHistoryTimeline history={complaint.history} />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Submit' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
