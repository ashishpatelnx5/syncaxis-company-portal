import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'
import { ComplaintsContext } from './complaintsContext'

export function ComplaintsProvider({ children }) {
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setComplaints(await apiFetch('/api/complaints'))
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
    async function addComplaint(data) {
      const created = await apiFetch('/api/complaints', { method: 'POST', body: data })
      setComplaints((prev) => [created, ...prev])
      return created.id
    }

    async function updateComplaint(id, data) {
      const updated = await apiFetch(`/api/complaints/${id}`, { method: 'PUT', body: data })
      setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)))
    }

    async function deleteComplaint(id) {
      await apiFetch(`/api/complaints/${id}`, { method: 'DELETE' })
      setComplaints((prev) => prev.filter((c) => c.id !== id))
    }

    return { complaints, isLoading, error, refresh, addComplaint, updateComplaint, deleteComplaint }
  }, [complaints, isLoading, error, refresh])

  return <ComplaintsContext.Provider value={api}>{children}</ComplaintsContext.Provider>
}
