import { useContext } from 'react'
import { JobDescriptionsContext } from './jobDescriptionsContext'

export function useJobDescriptions() {
  const ctx = useContext(JobDescriptionsContext)
  if (!ctx) throw new Error('useJobDescriptions must be used within a JobDescriptionsProvider')
  return ctx
}
