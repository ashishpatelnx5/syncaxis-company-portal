import { useState } from 'react'
import Icon from './Icon'

export default function UserGroupForm({ group, users, roles, onSave, onClose }) {
  const isNew = group == null
  const [name, setName] = useState(group?.name ?? '')
  const [description, setDescription] = useState(group?.description ?? '')
  const [memberIds, setMemberIds] = useState(group?.memberIds ?? [])
  const [roleIds, setRoleIds] = useState(group?.roles?.map((r) => r.id) ?? [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function toggleMember(id) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))
  }

  function toggleRole(id) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onSave({ name: name.trim(), description: description.trim(), memberIds, roleIds })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this group.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add user group' : `Edit ${group.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label className="form-field">
              <span>Name *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
            <label className="form-field">
              <span>Description</span>
              <input value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>

          <h3 className="form-section-title">Roles</h3>
          <p className="form-hint">Every member of this group inherits the pages/applications these roles grant.</p>
          <div className="checkbox-grid">
            {roles.map((r) => (
              <label key={r.id} className="checkbox-item" title={r.description || undefined}>
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
            {roles.length === 0 && <p className="empty-state">No roles yet — create one on the Roles page first.</p>}
          </div>

          <h3 className="form-section-title">Members</h3>
          <div className="checkbox-grid">
            {users.map((u) => (
              <label key={u.id} className="checkbox-item">
                <input type="checkbox" checked={memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                {u.displayName}
              </label>
            ))}
            {users.length === 0 && <p className="empty-state">No users yet.</p>}
          </div>
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add group' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
