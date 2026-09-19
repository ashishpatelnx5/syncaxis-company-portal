import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../utils/api'

const LOGOUT_DELAY_SECONDS = 5

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

// onClose omitted = mandatory mode (e.g. first login, or after an admin
// reset) - no close button, no Cancel, no click-outside-to-dismiss. The only
// way out is submitting a new password.
export default function ChangePasswordForm({ onClose }) {
  const mandatory = !onClose
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(null) // null = not yet changed

  // Password changes invalidate every other session server-side (see
  // server/src/routes/auth.js) - force this one out too, on a visible
  // countdown, rather than leaving the user on a tab whose session is about
  // to start failing requests unpredictably.
  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft <= 0) {
      apiFetch('/api/auth/logout', { method: 'POST' })
        .catch(() => {})
        .finally(() => {
          logout()
          navigate('/login', { replace: true })
        })
      return
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft, logout, navigate])

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
    if (newPassword === currentPassword) {
      setError('New password must be different from your current password.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await apiFetch('/api/auth/change-password', { method: 'POST', body: { currentPassword, newPassword } })
      setSecondsLeft(LOGOUT_DELAY_SECONDS)
    } catch (err) {
      setError(err.message || 'Could not change your password.')
      setSubmitting(false)
    }
  }

  const changed = secondsLeft !== null

  return (
    <div className="modal-scrim" onClick={changed || mandatory ? undefined : onClose}>
      <form className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>Change password</h2>
          {!changed && !mandatory && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        {changed ? (
          <div className="modal-body">
            <p className="form-hint">
              Password changed. For security, you'll be logged out in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}…
            </p>
          </div>
        ) : (
          <>
            <div className="modal-body">
              {mandatory && <p className="form-hint">You must set a new password before continuing.</p>}
              {error && <p className="form-error">{error}</p>}
              <PasswordField label="Current password *" value={currentPassword} onChange={setCurrentPassword} autoFocus />
              <PasswordField label="New password *" value={newPassword} onChange={setNewPassword} />
              <PasswordField label="Confirm new password *" value={confirmPassword} onChange={setConfirmPassword} />
              <p className="form-hint">At least 8 characters.</p>
            </div>

            <div className="modal-footer">
              {!mandatory && (
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              )}
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Change password'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
