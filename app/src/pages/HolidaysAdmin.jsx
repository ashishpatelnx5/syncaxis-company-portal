import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import HolidayForm from '../components/HolidayForm'
import Icon from '../components/Icon'
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

export default function HolidaysAdmin() {
  const { holidays, deleteHoliday } = useHolidays()
  const [searchParams, setSearchParams] = useSearchParams()
  // undefined = closed, null = add-new form, number = editing that id
  const [editingId, setEditingId] = useState(() => {
    const editParam = searchParams.get('edit')
    return editParam ? Number(editParam) : undefined
  })

  function closeForm() {
    setEditingId(undefined)
    if (searchParams.get('edit')) setSearchParams({}, { replace: true })
  }

  const groups = new Map()
  for (const h of holidays) {
    const fy = financialYearOf(h.date)
    if (!groups.has(fy)) groups.set(fy, [])
    groups.get(fy).push(h)
  }
  const sortedFys = [...groups.keys()].sort()

  function handleDelete(holiday) {
    if (window.confirm(`Delete "${holiday.name}"? This can't be undone.`)) deleteHoliday(holiday.id)
  }

  const editingHoliday = typeof editingId === 'number' ? holidays.find((h) => h.id === editingId) : null

  return (
    <div className="page">
      <header className="page-header">
        <div className="admin-header-row">
          <div>
            <h1>Holidays</h1>
            <p className="page-subtitle">Add, edit, and remove company holidays — grouped automatically by financial year.</p>
          </div>
          <div className="admin-header-actions">
            <button type="button" className="btn-primary" onClick={() => setEditingId(null)}>
              <Icon name="plus" size={16} /> Add holiday
            </button>
          </div>
        </div>
      </header>

      {sortedFys.length === 0 && <p className="empty-state">No holidays added yet.</p>}

      {sortedFys.map((fy) => (
        <section key={fy} className="holiday-year">
          <h2 className="holiday-year-label">{financialYearLabel(fy)}</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Holiday</th>
                  <th>Type</th>
                  <th />
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
                    <td className="admin-row-actions">
                      <button type="button" className="icon-btn" onClick={() => setEditingId(h.id)} aria-label={`Edit ${h.name}`}>
                        <Icon name="edit" size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn icon-btn-danger"
                        onClick={() => handleDelete(h)}
                        aria-label={`Delete ${h.name}`}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {editingId !== undefined && <HolidayForm holiday={editingId === null ? null : editingHoliday} onClose={closeForm} />}
    </div>
  )
}
