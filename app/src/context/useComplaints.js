import { useContext } from 'react'
import { ComplaintsContext } from './complaintsContext'

export function useComplaints() {
  const ctx = useContext(ComplaintsContext)
  if (!ctx) throw new Error('useComplaints must be used within a ComplaintsProvider')
  return ctx
}
