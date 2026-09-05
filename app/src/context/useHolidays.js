import { useContext } from 'react'
import { HolidaysContext } from './holidaysContext'

export function useHolidays() {
  const ctx = useContext(HolidaysContext)
  if (!ctx) throw new Error('useHolidays must be used within a HolidaysProvider')
  return ctx
}
