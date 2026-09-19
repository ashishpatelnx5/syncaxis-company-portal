import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EmployeeForm from '../components/EmployeeForm'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { downloadEmployeesModule } from '../utils/exportEmployees'
import { managerName } from '../utils/org'

export default function Admin() {
  const { employees } = useEmployees()
  const { departments } = useDepartments()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  // Editing an existing employee is its own full page now (see
  // EmployeeEdit.jsx at /admin/employees/:id/edit) - this modal is only for
  // adding a new one, which doesn't have an id yet to give its own URL.
  const [addOpen, setAddOpen] = useState(false)

  const sorted = useMemo(
    () =>
      employees
        .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [employees, query],
  )

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
            <button type="button" className="btn-create" onClick={() => setAddOpen(true)}>
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
            </tr>
          </thead>
          <tbody>
            {sorted.map((emp) => (
              <tr
                key={emp.id}
                className="admin-row-clickable"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/admin/employees/${emp.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/employees/${emp.id}`)}
              >
                <td>
                  <div className="admin-name-cell">
                    <Avatar name={emp.name} photo={emp.photo} className="employee-avatar small" />
                    {emp.name}
                  </div>
                </td>
                <td>{emp.title || '—'}</td>
                <td>{departmentNames(emp) || '—'}</td>
                <td>{managerName(employees, emp.managerId) || '—'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="empty-state">
                  No employees match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && <EmployeeForm employee={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
