import { useState } from 'react'
import Icon from './Icon'
import { useDepartments } from '../context/useDepartments'

// variant 'modal' (default, used for "Add department") pops up over the
// admin table; 'page' (used for editing an existing one) renders as a full
// page instead, matching Employees/Job Descriptions. See DepartmentEdit.jsx,
// which mounts this with variant='page' at /admin/departments/:id/edit.
export default function DepartmentForm({ department, onClose, variant = 'modal' }) {
  const { addDepartment, updateDepartment } = useDepartments()
  const isNew = department == null
  const [name, setName] = useState(department?.name ?? '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      if (isNew) {
        await addDepartment({ name: name.trim() })
      } else {
        await updateDepartment(department.id, { name: name.trim() })
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this department.')
    } finally {
      setSubmitting(false)
    }
  }

  const nameField = (
    <label className="form-field">
      <span>Name *</span>
      <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
    </label>
  )

  const footer = (
    <div className="modal-footer">
      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn-secondary" onClick={onClose}>
        Cancel
      </button>
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? 'Saving…' : isNew ? 'Add department' : 'Save changes'}
      </button>
    </div>
  )

  if (variant === 'page') {
    return (
      <div className="page">
        <div className="detail-toolbar">
          <button type="button" className="back-link" onClick={onClose}>
            <Icon name="chevron" size={14} className="back-icon" />
            Cancel
          </button>
        </div>
        <header className="page-header">
          <h1>{isNew ? 'Add department' : `Edit ${department.name}`}</h1>
        </header>
        <form onSubmit={handleSubmit}>
          {nameField}
          {footer}
        </form>
      </div>
    )
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add department' : `Edit ${department.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">{nameField}</div>

        {footer}
      </form>
    </div>
  )
}
