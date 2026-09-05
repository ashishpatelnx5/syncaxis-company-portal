import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'
import { JobDescriptionsContext } from './jobDescriptionsContext'

export function JobDescriptionsProvider({ children }) {
  const [jobDescriptions, setJobDescriptions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setJobDescriptions(await apiFetch('/api/job-descriptions'))
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
    async function addJobDescription(data) {
      const created = await apiFetch('/api/job-descriptions', { method: 'POST', body: data })
      setJobDescriptions((prev) => [...prev, created])
      return created.id
    }

    async function updateJobDescription(id, data) {
      const updated = await apiFetch(`/api/job-descriptions/${id}`, { method: 'PUT', body: data })
      setJobDescriptions((prev) => prev.map((j) => (j.id === id ? updated : j)))
    }

    // The server clears JobDescriptionId on any employee who held this job
    // description — the caller is responsible for refreshing employees afterward.
    async function deleteJobDescription(id) {
      await apiFetch(`/api/job-descriptions/${id}`, { method: 'DELETE' })
      setJobDescriptions((prev) => prev.filter((j) => j.id !== id))
    }

    return { jobDescriptions, isLoading, error, refresh, addJobDescription, updateJobDescription, deleteJobDescription }
  }, [jobDescriptions, isLoading, error, refresh])

  return <JobDescriptionsContext.Provider value={api}>{children}</JobDescriptionsContext.Provider>
}
