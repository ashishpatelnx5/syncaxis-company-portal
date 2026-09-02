import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import { employees } from '../data/employees'
import { initials, managerName } from '../utils/org'

export default function Directory() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All')

  const departments = useMemo(
    () => ['All', ...new Set(employees.map((e) => e.department).filter(Boolean))].sort((a, b) => (a === 'All' ? -1 : a.localeCompare(b))),
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return employees
      .filter((e) => department === 'All' || e.department === department)
      .filter(
        (e) =>
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.employeeId?.toLowerCase().includes(q) ||
          e.title.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [query, department])

  return (
    <div className="page">
      <header className="page-header">
        <h1>Employee Directory</h1>
        <p className="page-subtitle">
          {employees.length} people
          {departments.length > 1 ? ` across ${departments.length - 1} departments.` : '.'}
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
        {departments.length > 1 && (
          <select value={department} onChange={(e) => setDepartment(e.target.value)}>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="employee-grid">
        {filtered.map((emp) => (
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
              {emp.department && <span className="employee-dept">{emp.department}</span>}
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
                    <span className="employee-manager">
                      Reports to {managerName(employees, emp.managerId)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="empty-state">No employees match your search.</p>}
      </div>
    </div>
  )
}
