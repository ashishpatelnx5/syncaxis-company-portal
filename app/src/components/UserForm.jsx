import { useState } from 'react'
import Icon from './Icon'

export default function UserForm({ user, roles, onSave, onClose }) {
  const isNew = user == null
  const [username, setUsername] = useState(user?.username ?? '')
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [roleIds, setRoleIds] = useState(user?.roles?.map((r) => r.id) ?? [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  function toggleRole(id) {
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!username.trim()) return
    if (isNew && password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        username: username.trim(),
        displayName: displayName.trim(),
        isActive,
        roleIds,
      }
      if (password) payload.password = password
      await onSave(payload)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add user' : `Edit ${user.username}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label className="form-field">
              <span>Username *</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
            </label>
            <label className="form-field">
              <span>Display name</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
          </div>

          <label className="form-field">
            <span>{isNew ? 'Password *' : 'Reset password'}</span>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isNew ? undefined : 'Leave blank to keep the current password'}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={17} />
              </button>
            </div>
          </label>
          <p className="form-hint">At least 8 characters.</p>

          <label className="checkbox-item">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>

          <h3 className="form-section-title">Roles</h3>
          <p className="form-hint">
            Access comes from the roles assigned here, plus any roles granted by a User Group this person belongs to.
            Checking &quot;Admin&quot; gives unconditional full access.
          </p>
          <div className="checkbox-grid">
            {roles.map((r) => (
              <label key={r.id} className="checkbox-item" title={r.description || undefined}>
                <input type="checkbox" checked={roleIds.includes(r.id)} onChange={() => toggleRole(r.id)} />
                {r.name}
              </label>
            ))}
            {roles.length === 0 && <p className="empty-state">No roles yet — create one on the Roles page first.</p>}
          </div>
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add user' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
