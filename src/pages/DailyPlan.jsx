import { useEffect, useState } from 'react'
import DailyPlanSheet from '../components/DailyPlanSheet'
import MonthCalendar from '../components/MonthCalendar'
import { useEmployees } from '../context/useEmployees'
import { apiFetch } from '../utils/api'

const WHOAMI_KEY = 'syncaxis-daily-plan-employee-id'

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function DailyPlan() {
  const { employees } = useEmployees()
  const [employeeId, setEmployeeId] = useState(() => {
    try {
      return localStorage.getItem(WHOAMI_KEY) || ''
    } catch {
      return ''
    }
  })
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [statusByDate, setStatusByDate] = useState({})
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  function chooseEmployee(id) {
    setEmployeeId(id)
    try {
      localStorage.setItem(WHOAMI_KEY, id)
    } catch {
      // Storage unavailable — the picker just won't remember next time.
    }
  }

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

  const sortedEmployees = employees.slice().sort((a, b) => a.name.localeCompare(b.name))
  const selectedEmployee = employees.find((e) => String(e.id) === String(employeeId))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Daily Plan</h1>
        <p className="page-subtitle">Fill in your daily plan sheet and track your self-assessment over time.</p>
      </header>

      <label className="form-field daily-plan-whoami">
        <span>Who are you?</span>
        <select value={employeeId} onChange={(e) => chooseEmployee(e.target.value)}>
          <option value="">— Select your name —</option>
          {sortedEmployees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>

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
        <p className="empty-state">Pick your name above to view or fill in your daily plan.</p>
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
