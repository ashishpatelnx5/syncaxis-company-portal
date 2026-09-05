import { useMemo, useState } from 'react'
import DepartmentForm from '../components/DepartmentForm'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { downloadDepartmentsModule } from '../utils/exportDepartments'

export default function Departments() {
  const { departments, deleteDepartment } = useDepartments()
  const { employees, refresh: refreshEmployees } = useEmployees()
  // undefined = closed, null = add-new form, number = editing that id
  const [editingId, setEditingId] = useState(undefined)

  const sorted = useMemo(() => departments.slice().sort((a, b) => a.name.localeCompare(b.name)), [departments])

  function memberCount(deptId) {
    return employees.filter((e) => e.departmentIds?.includes(deptId)).length
  }

  async function handleDelete(dept) {
    const count = memberCount(dept.id)
    const warning =
      count > 0
        ? `${count} ${count === 1 ? 'person is' : 'people are'} assigned to "${dept.name}". They'll become unassigned. Delete this department anyway?`
        : `Delete "${dept.name}"? This can't be undone.`
    if (window.confirm(warning)) {
      await deleteDepartment(dept.id)
      // The server strips this department out of every employee's
      // assignment set as part of the delete — refetch so the UI matches.
      refreshEmployees()
    }
  }

  const editingDepartment = typeof editingId === 'number' ? departments.find((d) => d.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Departments</h1>
            <p className="page-subtitle">Create, rename, and remove the departments employees can be assigned to.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-secondary" onClick={() => downloadDepartmentsModule(departments)}>
              Export departments.js
            </button>
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add department
            </button>
          </div>
        </div>
      </header>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>People</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((dept) => (
              <tr key={dept.id}>
                <td className="admin-name-cell">{dept.name}</td>
                <td>{memberCount(dept.id)}</td>
                <td className="admin-row-actions">
                  <button type="button" className="icon-btn" onClick={() => setEditingId(dept.id)} aria-label={`Edit ${dept.name}`}>
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => handleDelete(dept)}
                    aria-label={`Delete ${dept.name}`}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={3} className="empty-state">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId !== undefined && (
        <DepartmentForm department={editingId === null ? null : editingDepartment} onClose={() => setEditingId(undefined)} />
      )}
    </div>
  )
}
