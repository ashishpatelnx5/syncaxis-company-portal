import { useHolidays } from '../context/useHolidays'
import { financialYearLabel, financialYearOf } from '../utils/financialYear'

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Holidays() {
  const { holidays, isLoading } = useHolidays()

  const groups = new Map()
  for (const h of holidays) {
    const fy = financialYearOf(h.date)
    if (!groups.has(fy)) groups.set(fy, [])
    groups.get(fy).push(h)
  }
  const sortedFys = [...groups.keys()].sort()

  return (
    <div className="page">
      <header className="page-header">
        <h1>Holidays</h1>
        <p className="page-subtitle">Company holidays by Indian financial year (April–March).</p>
      </header>

      {isLoading ? (
        <p className="empty-state">Loading…</p>
      ) : sortedFys.length === 0 ? (
        <p className="empty-state">No holidays added yet.</p>
      ) : (
        sortedFys.map((fy) => (
          <section key={fy} className="holiday-year">
            <h2 className="holiday-year-label">{financialYearLabel(fy)}</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Holiday</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.get(fy).map((h) => (
                    <tr key={h.id}>
                      <td>{formatDate(h.date)}</td>
                      <td className="admin-name-cell">{h.name}</td>
                      <td>
                        <span className={`holiday-badge holiday-badge-${h.type.toLowerCase()}`}>{h.type}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  )
}
