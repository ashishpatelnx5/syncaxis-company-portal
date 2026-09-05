import { useEffect, useState } from 'react'
import DailyPlanSheet from '../components/DailyPlanSheet'
import { useEmployees } from '../context/useEmployees'
import { apiFetch } from '../utils/api'

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(monthKey, delta) {
  const [year, month] = monthKey.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function scoreClass(score) {
  if (score == null) return 'cal-day-filled'
  if (score >= 80) return 'cal-day-score-high'
  if (score >= 50) return 'cal-day-score-mid'
  return 'cal-day-score-low'
}

export default function TeamDailyPlans() {
  const { employees } = useEmployees()
  const [monthKey, setMonthKey] = useState(currentMonthKey)
  const [summary, setSummary] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // { employeeId, employeeName, date }

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/daily-plans/team-summary?month=${monthKey}`)
      .then(setSummary)
      .finally(() => setLoading(false))
  }, [monthKey])

  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const byEmployeeAndDate = new Map()
  for (const row of summary) byEmployeeAndDate.set(`${row.employeeId}_${row.date}`, row)

  const sortedEmployees = employees.slice().sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="page">
      <header className="page-header">
        <h1>Team Daily Plans</h1>
        <p className="page-subtitle">Completion status and self-assessment score for everyone, at a glance.</p>
      </header>

      <div className="month-calendar-header team-daily-plans-header">
        <button type="button" className="icon-btn" onClick={() => setMonthKey((k) => shiftMonth(k, -1))} aria-label="Previous month">
          ‹
        </button>
        <span className="month-calendar-label">{monthLabel(monthKey)}</span>
        <button type="button" className="icon-btn" onClick={() => setMonthKey((k) => shiftMonth(k, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <div className="admin-table-wrap team-daily-plans-wrap">
          <table className="admin-table team-daily-plans-table">
            <thead>
              <tr>
                <th className="team-daily-plans-name-col">Employee</th>
                {dayNumbers.map((d) => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td className="admin-name-cell team-daily-plans-name-col">{emp.name}</td>
                  {dayNumbers.map((d) => {
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                    const row = byEmployeeAndDate.get(`${emp.id}_${dateStr}`)
                    return (
                      <td key={d} className="team-daily-plans-cell">
                        <button
                          type="button"
                          className={`cal-day team-daily-plans-dot ${row ? scoreClass(row.selfAssessment) : ''}`}
                          onClick={() => setSelected({ employeeId: emp.id, employeeName: emp.name, date: dateStr })}
                          aria-label={`${emp.name} — ${dateStr}`}
                        >
                          {row?.selfAssessment ?? ''}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
              {sortedEmployees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 1} className="empty-state">
                    No employees yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DailyPlanSheet
          employeeId={selected.employeeId}
          employeeName={selected.employeeName}
          date={selected.date}
          onClose={() => setSelected(null)}
          onSaved={(saved) =>
            setSummary((prev) => [
              ...prev.filter((r) => !(r.employeeId === saved.employeeId && r.date === saved.date)),
              saved,
            ])
          }
        />
      )}
    </div>
  )
}
