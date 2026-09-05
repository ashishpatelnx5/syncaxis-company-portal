import { holidays } from '../data/holidays'

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Holidays() {
  return (
    <div className="page">
      <header className="page-header">
        <h1>Holidays</h1>
        <p className="page-subtitle">Company holidays by Indian financial year (April–March).</p>
      </header>

      {holidays.map((year) => (
        <section key={year.financialYear} className="holiday-year">
          <h2 className="holiday-year-label">{year.label}</h2>
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
                {year.items.map((h) => (
                  <tr key={h.date}>
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
      ))}
    </div>
  )
}
