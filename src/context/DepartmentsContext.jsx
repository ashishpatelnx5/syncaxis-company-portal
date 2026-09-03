import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'
import { DepartmentsContext } from './departmentsContext'

export function DepartmentsProvider({ children }) {
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setDepartments(await apiFetch('/api/departments'))
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
    async function addDepartment(data) {
      const created = await apiFetch('/api/departments', { method: 'POST', body: data })
      setDepartments((prev) => [...prev, created])
      return created.id
    }

    async function updateDepartment(id, data) {
      const updated = await apiFetch(`/api/departments/${id}`, { method: 'PUT', body: data })
      setDepartments((prev) => prev.map((d) => (d.id === id ? updated : d)))
    }

    // The server cascades this into every employee's department assignments
    // — the caller is responsible for refreshing employees afterward.
    async function deleteDepartment(id) {
      await apiFetch(`/api/departments/${id}`, { method: 'DELETE' })
      setDepartments((prev) => prev.filter((d) => d.id !== id))
    }

    return { departments, isLoading, error, refresh, addDepartment, updateDepartment, deleteDepartment }
  }, [departments, isLoading, error, refresh])

  return <DepartmentsContext.Provider value={api}>{children}</DepartmentsContext.Provider>
}
