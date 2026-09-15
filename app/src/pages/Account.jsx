import { useState } from 'react'
import ChangePasswordForm from '../components/ChangePasswordForm'
import Icon from '../components/Icon'
import { useAuth } from '../context/useAuth'

function formatDateTime(iso, fallback) {
  if (!iso) return fallback
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Account() {
  const { user, refreshUser } = useAuth()
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [justChanged, setJustChanged] = useState(false)

  async function handlePasswordChanged() {
    await refreshUser()
    setJustChanged(true)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Account</h1>
        <p className="page-subtitle">Your login details and access.</p>
      </header>

      <div className="admin-table-wrap" style={{ maxWidth: 480 }}>
        <table className="admin-table">
          <tbody>
            <tr>
              <td>
                <Icon name="user" size={15} /> Username
              </td>
              <td>{user?.username}</td>
            </tr>
            <tr>
              <td>
                <Icon name="user" size={15} /> Display name
              </td>
              <td>{user?.displayName}</td>
            </tr>
            <tr>
              <td>
                <Icon name="key" size={15} /> Roles
              </td>
              <td>{user?.roles?.length ? user.roles.map((r) => r.name).join(', ') : '—'}</td>
            </tr>
            <tr>
              <td>
                <Icon name="calendar" size={15} /> Last login
              </td>
              <td>{formatDateTime(user?.lastLoginAt, 'This is your first login.')}</td>
            </tr>
            <tr>
              <td>
                <Icon name="lock" size={15} /> Password last changed
              </td>
              <td>{formatDateTime(user?.passwordChangedAt, 'Never')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="admin-header-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => {
            setJustChanged(false)
            setShowChangePassword(true)
          }}
        >
          <Icon name="lock" size={16} /> Change password
        </button>
        {justChanged && <p className="form-hint" style={{ margin: 0 }}>Password changed.</p>}
      </div>

      {showChangePassword && (
        <ChangePasswordForm onClose={() => setShowChangePassword(false)} onChanged={handlePasswordChanged} />
      )}
    </div>
  )
}
