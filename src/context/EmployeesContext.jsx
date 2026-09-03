import { useEffect, useMemo, useState } from 'react'
import { employees as seedEmployees } from '../data/employees'
import { EmployeesContext } from './employeesContext'

const STORAGE_KEY = 'syncaxis-employees'

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Corrupt/unavailable storage — fall back to the bundled seed data below.
  }
  return seedEmployees
}

export function EmployeesProvider({ children }) {
  const [employees, setEmployees] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
    } catch {
      // Storage full/unavailable — edits still work for the rest of this session.
    }
  }, [employees])

  const api = useMemo(() => {
    function addEmployee(data) {
      const nextId = employees.reduce((max, e) => Math.max(max, e.id), 0) + 1
      setEmployees((prev) => [...prev, { ...data, id: nextId }])
      return nextId
    }

    function updateEmployee(id, data) {
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))
    }

    function deleteEmployee(id) {
      setEmployees((prev) =>
        prev.filter((e) => e.id !== id).map((e) => (e.managerId === id ? { ...e, managerId: null } : e)),
      )
    }

    // Reconciles this manager's direct-report set in one pass: anyone newly
    // checked gets managerId set to them, anyone unchecked who currently
    // reports to them gets managerId cleared. Everyone else is untouched.
    function setDirectReports(managerId, reportIds) {
      const wanted = new Set(reportIds)
      setEmployees((prev) =>
        prev.map((e) => {
          if (e.id === managerId) return e
          const shouldReport = wanted.has(e.id)
          const currentlyReports = e.managerId === managerId
          if (shouldReport && !currentlyReports) return { ...e, managerId }
          if (!shouldReport && currentlyReports) return { ...e, managerId: null }
          return e
        }),
      )
    }

    // Strips a deleted department out of everyone's departmentIds instead of
    // leaving a dangling reference behind.
    function removeDepartmentFromAll(departmentId) {
      setEmployees((prev) =>
        prev.map((e) =>
          e.departmentIds?.includes(departmentId)
            ? { ...e, departmentIds: e.departmentIds.filter((id) => id !== departmentId) }
            : e,
        ),
      )
    }

    function resetToDefaults() {
      setEmployees(seedEmployees)
    }

    return {
      employees,
      isModified: JSON.stringify(employees) !== JSON.stringify(seedEmployees),
      addEmployee,
      updateEmployee,
      deleteEmployee,
      setDirectReports,
      removeDepartmentFromAll,
      resetToDefaults,
    }
  }, [employees])

  return <EmployeesContext.Provider value={api}>{children}</EmployeesContext.Provider>
}
