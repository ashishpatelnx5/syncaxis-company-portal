import { useState } from 'react'
import Icon from './Icon'
import { useHolidays } from '../context/useHolidays'

export default function HolidayForm({ holiday, onClose }) {
  const { addHoliday, updateHoliday } = useHolidays()
  const isNew = holiday == null
  const [date, setDate] = useState(holiday?.date ?? '')
  const [name, setName] = useState(holiday?.name ?? '')
  const [type, setType] = useState(holiday?.type ?? 'National')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!date || !name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const payload = { date, name: name.trim(), type }
      if (isNew) {
        await addHoliday(payload)
      } else {
        await updateHoliday(holiday.id, payload)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this holiday.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add holiday' : `Edit ${holiday.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <label className="form-field">
            <span>Date *</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required autoFocus />
          </label>
          <label className="form-field">
            <span>Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="form-field">
            <span>Type *</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="National">National</option>
              <option value="Festival">Festival</option>
            </select>
          </label>
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add holiday' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
