import { useEffect, useState } from 'react'
import DailyPlanSheet from '../components/DailyPlanSheet'
import MonthCalendar from '../components/MonthCalendar'
import { useAuth } from '../context/useAuth'
import { useEmployees } from '../context/useEmployees'
import { apiFetch } from '../utils/api'

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function DailyPlan() {
  const { employees } = useEmployees()
  const { user } = useAuth()
  const employeeId = user?.employeeId ?? ''
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [statusByDate, setStatusByDate] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!employeeId) return
    setLoading(true)
    apiFetch(`/api/daily-plans?employeeId=${employeeId}&month=${monthKey}`)
      .then((plans) => {
        const map = {}
        for (const p of plans) map[p.date] = { selfAssessment: p.selfAssessment }
        setStatusByDate(map)
      })
      .finally(() => setLoading(false))
  }, [employeeId, monthKey])

  const selectedEmployee = employees.find((e) => String(e.id) === String(employeeId))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Daily Plan</h1>
        <p className="page-subtitle">Fill in your daily plan sheet and track your self-assessment over time.</p>
      </header>

      {employeeId ? (
        loading && Object.keys(statusByDate).length === 0 ? (
          <p className="empty-state">Loading…</p>
        ) : (
          <MonthCalendar
            monthKey={monthKey}
            statusByDate={statusByDate}
            onMonthChange={setMonthKey}
            onSelectDate={setSelectedDate}
            selectedDate={selectedDate}
          />
        )
      ) : (
        <p className="empty-state">Your account isn't linked to an employee record, so a daily plan can't be shown.</p>
      )}

      {selectedDate && selectedEmployee && (
        <DailyPlanSheet
          employeeId={selectedEmployee.id}
          employeeName={selectedEmployee.name}
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSaved={(saved) =>
            setStatusByDate((prev) => ({ ...prev, [saved.date]: { selfAssessment: saved.selfAssessment } }))
          }
        />
      )}
    </div>
  )
}
