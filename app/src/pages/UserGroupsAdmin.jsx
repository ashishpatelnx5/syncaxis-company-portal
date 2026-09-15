import { useCallback, useEffect, useState } from 'react'
import Icon from '../components/Icon'
import UserGroupForm from '../components/UserGroupForm'
import { apiFetch } from '../utils/api'

export default function UserGroupsAdmin() {
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  // undefined = closed, null = add-new form, id = editing that group
  const [editingId, setEditingId] = useState(undefined)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      const [groupsData, usersData, rolesData] = await Promise.all([
        apiFetch('/api/user-groups'),
        apiFetch('/api/users'),
        apiFetch('/api/roles'),
      ])
      setGroups(groupsData)
      setUsers(usersData)
      setRoles(rolesData)
      setError('')
    } catch (err) {
      setError(err.message || 'Could not load user groups.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleSave(payload) {
    if (editingId === null) {
      await apiFetch('/api/user-groups', { method: 'POST', body: payload })
    } else {
      await apiFetch(`/api/user-groups/${editingId}`, { method: 'PUT', body: payload })
    }
    await refresh()
  }

  async function handleDelete(group) {
    if (!window.confirm(`Delete group "${group.name}"? Its members lose whatever access the group's roles granted.`)) return
    try {
      await apiFetch(`/api/user-groups/${group.id}`, { method: 'DELETE' })
      await refresh()
    } catch (err) {
      window.alert(err.message || 'Could not delete this group.')
    }
  }

  const editingGroup = typeof editingId === 'number' ? groups.find((g) => g.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>User Groups</h1>
            <p className="page-subtitle">Group users together and grant them roles all at once.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add group
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
                <th>Roles</th>
                <th>Members</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td className="admin-name-cell">{g.name}</td>
                  <td>{g.description || '—'}</td>
                  <td>{g.roles.map((r) => r.name).join(', ') || '—'}</td>
                  <td>{g.memberIds.length}</td>
                  <td className="admin-row-actions">
                    <button type="button" className="icon-btn" onClick={() => setEditingId(g.id)} aria-label={`Edit ${g.name}`}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => handleDelete(g)}
                      aria-label={`Delete ${g.name}`}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No user groups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId !== undefined && (
        <UserGroupForm
          group={editingId === null ? null : editingGroup}
          users={users}
          roles={roles}
          onSave={handleSave}
          onClose={() => setEditingId(undefined)}
        />
      )}
    </div>
  )
}
