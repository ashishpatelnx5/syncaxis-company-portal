import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DepartmentForm from '../components/DepartmentForm'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { downloadDepartmentsModule } from '../utils/exportDepartments'

export default function Departments() {
  const { departments } = useDepartments()
  const { employees } = useEmployees()
  const navigate = useNavigate()
  // Editing an existing department is its own full page now (see
  // DepartmentEdit.jsx at /admin/departments/:id/edit) - this modal is only
  // for adding a new one, which doesn't have an id yet to give its own URL.
  const [addOpen, setAddOpen] = useState(false)

  const sorted = useMemo(() => departments.slice().sort((a, b) => a.name.localeCompare(b.name)), [departments])

  function memberCount(deptId) {
    return employees.filter((e) => e.departmentIds?.includes(deptId)).length
  }

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
            <button type="button" className="btn-primary" onClick={() => setAddOpen(true)}>
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
            </tr>
          </thead>
          <tbody>
            {sorted.map((dept) => (
              <tr
                key={dept.id}
                className="admin-row-clickable"
                role="link"
                tabIndex={0}
                onClick={() => navigate(`/admin/departments/${dept.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/admin/departments/${dept.id}`)}
              >
                <td className="admin-name-cell">{dept.name}</td>
                <td>{memberCount(dept.id)}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={2} className="empty-state">
                  No departments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {addOpen && <DepartmentForm department={null} onClose={() => setAddOpen(false)} />}
    </div>
  )
}
