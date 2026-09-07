const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

// selectedStatus: null means "Total" (no filter) is active. Clicking the
// already-selected tile clears the filter back to Total.
export default function ComplaintsSummary({ complaints, selectedStatus, onSelectStatus }) {
  const counts = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 }
  for (const c of complaints) counts[c.status] = (counts[c.status] || 0) + 1

  return (
    <section className="stats-row">
      <button
        type="button"
        className={`stat-card stat-card-button ${selectedStatus === null ? 'stat-card-active' : ''}`}
        onClick={() => onSelectStatus(null)}
      >
        <div>
          <div className="stat-value">{complaints.length}</div>
          <div className="stat-label">Total</div>
        </div>
      </button>
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          className={`stat-card stat-card-button ${selectedStatus === status ? 'stat-card-active' : ''}`}
          onClick={() => onSelectStatus(selectedStatus === status ? null : status)}
        >
          <div>
            <div className="stat-value">{counts[status]}</div>
            <div className="stat-label">{status}</div>
          </div>
        </button>
      ))}
    </section>
  )
}
