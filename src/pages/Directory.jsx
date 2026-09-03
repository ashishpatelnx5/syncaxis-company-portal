import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { initials, managerName } from '../utils/org'

export default function Directory() {
  const { employees } = useEmployees()
  const { departments } = useDepartments()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [departmentId, setDepartmentId] = useState('All')

  const departmentById = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments])
  const sortedDepartments = useMemo(
    () => departments.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [departments],
  )

  function departmentNames(emp) {
    return (emp.departmentIds || []).map((id) => departmentById.get(id)).filter(Boolean)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees
      .filter((e) => departmentId === 'All' || e.departmentIds?.includes(departmentId))
      .filter((e) => {
        if (!q) return true
        const deptText = (e.departmentIds || [])
          .map((id) => departmentById.get(id))
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return (
          e.name.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          deptText.includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [employees, query, departmentId, departmentById])

  return (
    <div className="page">
      <header className="page-header">
        <h1>Employee Directory</h1>
        <p className="page-subtitle">
          {employees.length} people
          {departments.length > 0 ? ` across ${departments.length} departments.` : '.'}
        </p>
      </header>

      <div className="directory-controls">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search by name, ID, title, or department"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {sortedDepartments.length > 0 && (
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
          >
            <option value="All">All</option>
            {sortedDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="employee-grid">
        {filtered.map((emp) => {
          const deptNames = departmentNames(emp)
          return (
            <div
              className="employee-card employee-card-clickable"
              key={emp.id}
              role="link"
              tabIndex={0}
              onClick={() => navigate(`/employee/${emp.id}`)}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/employee/${emp.id}`)}
            >
              <div className="employee-avatar">{initials(emp.name)}</div>
              <div className="employee-info">
                <div className="employee-name">
                  {emp.name}
                  {emp.employeeId && <span className="employee-id">#{emp.employeeId}</span>}
                </div>
                {emp.title && <div className="employee-title">{emp.title}</div>}
                {deptNames.length > 0 && (
                  <div className="employee-dept-list">
                    {deptNames.map((name) => (
                      <span className="employee-dept" key={name}>
                        {name}
                      </span>
                    ))}
                  </div>
                )}
                {(emp.email || emp.phone || emp.managerId != null) && (
                  <div className="employee-meta">
                    {emp.email && (
                      <a href={`mailto:${emp.email}`} onClick={(e) => e.stopPropagation()}>
                        <Icon name="mail" size={14} /> {emp.email}
                      </a>
                    )}
                    {emp.phone && (
                      <a href={`tel:${emp.phone}`} onClick={(e) => e.stopPropagation()}>
                        <Icon name="phone" size={14} /> {emp.phone}
                      </a>
                    )}
                    {emp.managerId != null && (
                      <span className="employee-manager">Reports to {managerName(employees, emp.managerId)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && <p className="empty-state">No employees match your search.</p>}
      </div>
    </div>
  )
}
