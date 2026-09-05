import Icon from './Icon'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

// statusByDate: { 'YYYY-MM-DD': { selfAssessment: number|null } } — any date
// present in the map is treated as filled in.
export default function MonthCalendar({ monthKey, statusByDate, onMonthChange, onSelectDate, selectedDate }) {
  const [year, month] = monthKey.split('-').map(Number)
  const firstOfMonth = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstOfMonth.getDay()
  const todayKey = new Date().toISOString().slice(0, 10)

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) cells.push(day)

  return (
    <div className="month-calendar">
      <div className="month-calendar-header">
        <button type="button" className="icon-btn" onClick={() => onMonthChange(shiftMonth(monthKey, -1))} aria-label="Previous month">
          <Icon name="chevron" size={16} className="cal-chevron-prev" />
        </button>
        <span className="month-calendar-label">{monthLabel(monthKey)}</span>
        <button type="button" className="icon-btn" onClick={() => onMonthChange(shiftMonth(monthKey, 1))} aria-label="Next month">
          <Icon name="chevron" size={16} />
        </button>
      </div>

      <div className="month-calendar-grid">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="cal-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`blank-${i}`} className="cal-day cal-day-empty" />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const status = statusByDate[dateStr]
          const isToday = dateStr === todayKey
          const isSelected = dateStr === selectedDate
          return (
            <button
              type="button"
              key={dateStr}
              className={`cal-day ${status ? scoreClass(status.selfAssessment) : ''} ${isToday ? 'cal-day-today' : ''} ${
                isSelected ? 'cal-day-selected' : ''
              }`}
              onClick={() => onSelectDate(dateStr)}
            >
              <span className="cal-day-number">{day}</span>
              {status?.selfAssessment != null && <span className="cal-day-score">{status.selfAssessment}</span>}
            </button>
          )
        })}
      </div>

      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-day-score-high" /> 80–100
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-day-score-mid" /> 50–79
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-day-score-low" /> Below 50
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-day-filled" /> Filled, no score
        </span>
      </div>
    </div>
  )
}
