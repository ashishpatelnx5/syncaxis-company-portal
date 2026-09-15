import { useState } from 'react'
import Icon from './Icon'
import { apiFetch } from '../utils/api'

function PasswordField({ label, value, onChange, autoFocus }) {
  const [show, setShow] = useState(false)
  return (
    <label className="form-field">
      <span>{label}</span>
      <div className="password-field">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          autoFocus={autoFocus}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          <Icon name={show ? 'eye-off' : 'eye'} size={17} />
        </button>
      </div>
    </label>
  )
}

export default function ChangePasswordForm({ onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      onChanged()
      onClose()
    } catch (err) {
      setError(err.message || 'Could not change your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>Change password</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <PasswordField label="Current password *" value={currentPassword} onChange={setCurrentPassword} autoFocus />
          <PasswordField label="New password *" value={newPassword} onChange={setNewPassword} />
          <PasswordField label="Confirm new password *" value={confirmPassword} onChange={setConfirmPassword} />
          <p className="form-hint">At least 8 characters.</p>
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  )
}
