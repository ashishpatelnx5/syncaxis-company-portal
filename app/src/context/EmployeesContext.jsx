import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'
import { EmployeesContext } from './employeesContext'

export function EmployeesProvider({ children }) {
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setEmployees(await apiFetch('/api/employees'))
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const api = useMemo(() => {
    async function addEmployee(data) {
      const created = await apiFetch('/api/employees', { method: 'POST', body: data })
      setEmployees((prev) => [...prev, created])
      return created.id
    }

    async function updateEmployee(id, data) {
      const updated = await apiFetch(`/api/employees/${id}`, { method: 'PUT', body: data })
      setEmployees((prev) => prev.map((e) => (e.id === id ? updated : e)))
    }

    async function deleteEmployee(id) {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' })
      setEmployees((prev) =>
        prev.filter((e) => e.id !== id).map((e) => (e.managerId === id ? { ...e, managerId: null } : e)),
      )
    }

    // Reconciles this manager's direct-report set in one call: anyone newly
    // checked gets managerId set to them, anyone unchecked who currently
    // reports to them gets managerId cleared. Everyone else is untouched.
    async function setDirectReports(managerId, reportIds) {
      await apiFetch(`/api/employees/${managerId}/reports`, { method: 'PUT', body: { reportIds } })
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

    return {
      employees,
      isLoading,
      error,
      refresh,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      setDirectReports,
    }
  }, [employees, isLoading, error, refresh])

  return <EmployeesContext.Provider value={api}>{children}</EmployeesContext.Provider>
}
