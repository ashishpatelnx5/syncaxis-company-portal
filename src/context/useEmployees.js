import { useContext } from 'react'
import { EmployeesContext } from './employeesContext'

export function useEmployees() {
  const ctx = useContext(EmployeesContext)
  if (!ctx) throw new Error('useEmployees must be used within an EmployeesProvider')
  return ctx
}
