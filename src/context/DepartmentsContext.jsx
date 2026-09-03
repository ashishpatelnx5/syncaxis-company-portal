import { useEffect, useMemo, useState } from 'react'
import { departments as seedDepartments } from '../data/departments'
import { DepartmentsContext } from './departmentsContext'

const STORAGE_KEY = 'syncaxis-departments'

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Corrupt/unavailable storage — fall back to the bundled seed data below.
  }
  return seedDepartments
}

export function DepartmentsProvider({ children }) {
  const [departments, setDepartments] = useState(loadInitial)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(departments))
    } catch {
      // Storage full/unavailable — edits still work for the rest of this session.
    }
  }, [departments])

  const api = useMemo(() => {
    function addDepartment(data) {
      const nextId = departments.reduce((max, d) => Math.max(max, d.id), 0) + 1
      setDepartments((prev) => [...prev, { ...data, id: nextId }])
      return nextId
    }

    function updateDepartment(id, data) {
      setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...data } : d)))
    }

    function deleteDepartment(id) {
      setDepartments((prev) => prev.filter((d) => d.id !== id))
    }

    function resetToDefaults() {
      setDepartments(seedDepartments)
    }

    return {
      departments,
      isModified: JSON.stringify(departments) !== JSON.stringify(seedDepartments),
      addDepartment,
      updateDepartment,
      deleteDepartment,
      resetToDefaults,
    }
  }, [departments])

  return <DepartmentsContext.Provider value={api}>{children}</DepartmentsContext.Provider>
}
