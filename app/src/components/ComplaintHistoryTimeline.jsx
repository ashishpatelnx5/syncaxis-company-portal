function formatDateTime(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function slug(s) {
  return s.toLowerCase().replace(/\s+/g, '-')
}

export default function ComplaintHistoryTimeline({ history }) {
  if (!history || history.length === 0) return null

  return (
    <ol className="complaint-timeline">
      {history.map((h, i) => (
        <li key={i} className="complaint-timeline-item">
          <span className={`badge badge-status-${slug(h.status)}`}>{h.status}</span>
          <span className="complaint-timeline-date">{formatDateTime(h.createdAt)}</span>
          {h.comment && <p className="complaint-timeline-comment">{h.comment}</p>}
        </li>
      ))}
    </ol>
  )
}
