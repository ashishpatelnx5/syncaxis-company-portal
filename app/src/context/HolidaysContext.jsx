import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../utils/api'
import { HolidaysContext } from './holidaysContext'

export function HolidaysProvider({ children }) {
  const [holidays, setHolidays] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    try {
      setHolidays(await apiFetch('/api/holidays'))
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
    async function addHoliday(data) {
      const created = await apiFetch('/api/holidays', { method: 'POST', body: data })
      setHolidays((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
      return created.id
    }

    async function updateHoliday(id, data) {
      const updated = await apiFetch(`/api/holidays/${id}`, { method: 'PUT', body: data })
      setHolidays((prev) => prev.map((h) => (h.id === id ? updated : h)).sort((a, b) => a.date.localeCompare(b.date)))
    }

    async function deleteHoliday(id) {
      await apiFetch(`/api/holidays/${id}`, { method: 'DELETE' })
      setHolidays((prev) => prev.filter((h) => h.id !== id))
    }

    return { holidays, isLoading, error, refresh, addHoliday, updateHoliday, deleteHoliday }
  }, [holidays, isLoading, error, refresh])

  return <HolidaysContext.Provider value={api}>{children}</HolidaysContext.Provider>
}
