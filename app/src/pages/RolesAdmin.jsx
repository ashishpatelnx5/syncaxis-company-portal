import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import RoleForm from '../components/RoleForm'
import { apiFetch } from '../utils/api'

export default function RolesAdmin() {
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // undefined = closed, null = add-new form, id = editing that role
  const [editingId, setEditingId] = useState(undefined)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setRoles(await apiFetch('/api/roles'))
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load roles.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSave(payload) {
    if (editingId === null) {
      await apiFetch('/api/roles', { method: 'POST', body: payload })
    } else {
      await apiFetch(`/api/roles/${editingId}`, { method: 'PUT', body: payload })
    }
    await refresh()
  }

  async function handleDelete(role) {
    if (!window.confirm(`Delete role "${role.name}"? Anyone holding it (directly or via a group) will lose the access it grants.`)) return
    try {
      await apiFetch(`/api/roles/${role.id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not delete this role.')
    }
  }

  const editingRole = typeof editingId === 'number' ? roles.find((r) => r.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Roles</h1>
            <p className="page-subtitle">Reusable bundles of page/application access — assign a role to users or user groups.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add role
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
                <th>Name</th>
                <th>Description</th>
                <th>In use</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="admin-name-cell">
                      <Icon name={r.isFullAccess ? 'shield' : 'key'} size={16} />
                      {r.name}
                    </div>
                  </td>
                  <td>{r.description || '—'}</td>
                  <td>
                    {r.isFullAccess
                      ? 'Everyone with this role'
                      : `${r.userCount} user${r.userCount === 1 ? '' : 's'}, ${r.groupCount} group${r.groupCount === 1 ? '' : 's'}`}
                  </td>
                  <td className="admin-row-actions">
                    <button type="button" className="icon-btn" onClick={() => setEditingId(r.id)} aria-label={`Edit ${r.name}`}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => handleDelete(r)}
                      disabled={r.isProtected}
                      aria-label={`Delete ${r.name}`}
                      title={r.isProtected ? "The Admin role can't be deleted" : undefined}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No roles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId !== undefined && (
        <RoleForm role={editingId === null ? null : editingRole} onSave={handleSave} onClose={() => setEditingId(undefined)} />
      )}
    </div>
  )
}
