import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmployeeForm from '../components/EmployeeForm'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { downloadEmployeesModule } from '../utils/exportEmployees'
import { getDirectReports, managerName } from '../utils/org'

export default function Admin() {
  const { employees, deleteEmployee } = useEmployees()
  const { departments } = useDepartments()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  // undefined = closed, null = add-new form, number = editing that id.
  // Lazily seeded from a ?edit= deep link (e.g. the detail page's Edit
  // button) so opening the form doesn't need a render-then-effect round trip.
  const [editingId, setEditingId] = useState(() => {
    const editParam = searchParams.get('edit')
    return editParam ? Number(editParam) : undefined
  })

  function closeForm() {
    setEditingId(undefined)
    if (searchParams.get('edit')) setSearchParams({}, { replace: true })
  }

  const sorted = useMemo(
    () =>
      employees
        .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees, query],
  )

  function handleDelete(emp) {
    const reports = getDirectReports(employees, emp.id)
    const warning =
      reports.length > 0
        ? `${emp.name} has ${reports.length} direct report${reports.length > 1 ? 's' : ''} (${reports
            .map((r) => r.name)
            .join(', ')}), who will become unassigned. Delete ${emp.name} anyway?`
        : `Delete ${emp.name}? This can't be undone.`
    if (window.confirm(warning)) deleteEmployee(emp.id)
  }

  const editingEmployee = typeof editingId === 'number' ? employees.find((e) => e.id === editingId) : null

  function departmentNames(emp) {
    return (emp.departmentIds || [])
      .map((id) => departments.find((d) => d.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Admin</h1>
            <p className="page-subtitle">Add, edit, and remove employees, and set who reports to whom.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-secondary" onClick={() => downloadEmployeesModule(employees)}>
              Export employees.js
            </button>
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add employee
            </button>
          </div>
        </div>
      </header>

      <div className="search-box admin-search">
        <Icon name="search" size={18} />
        <input
          type="text"
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Title</th>
              <th>Department</th>
              <th>Reports to</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp) => (
              <tr key={emp.id}>
                <td>
                  <div className="admin-name-cell">
                    <Avatar name={emp.name} photo={emp.photo} className="employee-avatar small" />
                    {emp.name}
                  </div>
                </td>
                <td>{emp.title || '—'}</td>
                <td>{departmentNames(emp) || '—'}</td>
                <td>{managerName(employees, emp.managerId) || '—'}</td>
                <td className="admin-row-actions">
                  <button type="button" className="icon-btn" onClick={() => setEditingId(emp.id)} aria-label={`Edit ${emp.name}`}>
                    <Icon name="edit" size={15} />
                  </button>
                  <button type="button" className="icon-btn icon-btn-danger" onClick={() => handleDelete(emp)} aria-label={`Delete ${emp.name}`}>
                    <Icon name="trash" size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="empty-state">
                  No employees match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingId !== undefined && (
        <EmployeeForm employee={editingId === null ? null : editingEmployee} onClose={closeForm} />
      )}
    </div>
  )
}
