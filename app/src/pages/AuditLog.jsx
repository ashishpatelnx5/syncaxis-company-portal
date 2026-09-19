import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { apiFetch } from '../utils/api'

const EVENT_TYPES = ['LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'PASSWORD_CHANGED', 'CREATE', 'UPDATE', 'DELETE']
const ENTITY_TYPES = [
  'Employee',
  'EmployeeDocument',
  'EmployeeEducationDocument',
  'EmployeeExperienceDocument',
  'Department',
  'JobDescription',
  'Holiday',
  'Complaint',
  'DailyPlan',
]

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Admin-only (see ProtectedPage adminOnly in App.jsx) — the record of who
// did what across the whole app: every login/logout/password-change plus
// every create/update/delete, written from server/src/lib/audit.js. Mirrors
// syncaxis-iam's own Audit Log screen (search + paginate, newest first).
export default function AuditLog() {
  const [entries, setEntries] = useState([])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('')
  const [entityType, setEntityType] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError('')
    const params = new URLSearchParams({ page: String(page) })
    if (search.trim()) params.set('search', search.trim())
    if (eventType) params.set('eventType', eventType)
    if (entityType) params.set('entityType', entityType)

    apiFetch(`/api/audit-log?${params.toString()}`)
      .then((data) => {
        if (cancelled) return
        setEntries(data.entries)
      })
      .catch((err) => !cancelled && setError(err.message || 'Could not load the audit log.'))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [page, search, eventType, entityType])

  function updateFilter(setter, value) {
    setPage(1)
    setter(value)
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Audit Log</h1>
        <p className="page-subtitle">Every login and every create, update, or delete across the app — admin only.</p>
      </header>

      <div className="directory-controls">
        <div className="search-box">
          <Icon name="search" size={18} />
          <input
            type="text"
            placeholder="Search by user, event, entity, detail, or IP"
            value={search}
            onChange={(e) => updateFilter(setSearch, e.target.value)}
          />
        </div>
        <select value={eventType} onChange={(e) => updateFilter(setEventType, e.target.value)}>
          <option value="">All events</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={entityType} onChange={(e) => updateFilter(setEntityType, e.target.value)}>
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Event</th>
              <th>Entity</th>
              <th>User</th>
              <th>IP</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="page-subtitle">{formatWhen(e.createdAt)}</td>
                <td>{e.eventType}</td>
                <td>{e.entityType ? `${e.entityType}${e.entityId ? ` #${e.entityId}` : ''}` : '—'}</td>
                <td>{e.username || '—'}</td>
                <td className="page-subtitle">{e.ipAddress || '—'}</td>
                <td className="page-subtitle">{e.detail || '—'}</td>
              </tr>
            ))}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-state">
                  No matching events.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-header-actions" style={{ justifyContent: 'center' }}>
        <button type="button" className="btn-secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
          <Icon name="chevron" size={14} className="back-icon" /> Newer
        </button>
        <span className="page-subtitle">Page {page}</span>
        <button type="button" className="btn-secondary" onClick={() => setPage((p) => p + 1)} disabled={entries.length < 50 || isLoading}>
          Older <Icon name="chevron" size={14} />
        </button>
      </div>
    </div>
  )
}
