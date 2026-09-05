import { useContext } from 'react'
import { DepartmentsContext } from './departmentsContext'

export function useDepartments() {
  const ctx = useContext(DepartmentsContext)
  if (!ctx) throw new Error('useDepartments must be used within a DepartmentsProvider')
  return ctx
}
