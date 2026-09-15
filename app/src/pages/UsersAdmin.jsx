import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import UserForm from '../components/UserForm'
import { useAuth } from '../context/useAuth'
import { apiFetch } from '../utils/api'

function formatLastLogin(iso) {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function UsersAdmin() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // undefined = closed, null = add-new form, id = editing that user
  const [editingId, setEditingId] = useState(undefined)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usersData, rolesData] = await Promise.all([apiFetch('/api/users'), apiFetch('/api/roles')])
      setUsers(usersData)
      setRoles(rolesData)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load users.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSave(payload) {
    if (editingId === null) {
      await apiFetch('/api/users', { method: 'POST', body: payload })
    } else {
      await apiFetch(`/api/users/${editingId}`, { method: 'PUT', body: payload })
    }
    await refresh()
  }

  async function handleDelete(u) {
    if (!window.confirm(`Delete user "${u.username}"? This can't be undone.`)) return
    try {
      await apiFetch(`/api/users/${u.id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not delete this user.')
    }
  }

  async function handleUnlock(u) {
    try {
      await apiFetch(`/api/users/${u.id}/unlock`, { method: 'POST' })
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not unlock this user.')
    }
  }

  const editingUser = typeof editingId === 'number' ? users.find((u) => u.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Users</h1>
            <p className="page-subtitle">Create logins and assign the roles that grant each user's page/application access.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add user
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <p className="empty-state">Loading…</p>
      ) : error ? (
        <p className="empty-state">{error}</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="admin-name-cell">
                      <Icon name="user" size={16} />
                      <div>
                        <div>{u.displayName}</div>
                        {u.displayName !== u.username && <div className="form-hint" style={{ margin: 0 }}>{u.username}</div>}
                      </div>
                    </div>
                  </td>
                  <td>
                    {u.roles.length > 0 ? (
                      <span className={`badge ${u.roles.some((r) => r.name === 'Admin') ? 'badge-category-feedback' : 'holiday-badge holiday-badge-festival'}`}>
                        {u.roles.map((r) => r.name).join(', ')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {u.isLocked ? (
                      <span className="badge badge-status-open">Locked</span>
                    ) : u.isActive ? (
                      <span className="badge badge-status-resolved">Active</span>
                    ) : (
                      <span className="badge badge-status-in-progress">Inactive</span>
                    )}
                  </td>
                  <td>{formatLastLogin(u.lastLoginAt)}</td>
                  <td className="admin-row-actions">
                    {u.isLocked && (
                      <button type="button" className="icon-btn" onClick={() => handleUnlock(u)} aria-label={`Unlock ${u.username}`} title="Unlock">
                        <Icon name="unlock" size={15} />
                      </button>
                    )}
                    <button type="button" className="icon-btn" onClick={() => setEditingId(u.id)} aria-label={`Edit ${u.username}`}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === currentUser?.id}
                      aria-label={`Delete ${u.username}`}
                      title={u.id === currentUser?.id ? "You can't delete your own account" : undefined}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId !== undefined && (
        <UserForm
          user={editingId === null ? null : editingUser}
          roles={roles}
          onSave={handleSave}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </div>
  )
}
