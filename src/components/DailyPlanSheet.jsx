import { useEffect, useMemo, useState } from 'react'
import Icon from './Icon'
import { dailyPlanSlots, dailyPlanTotalHrs } from '../data/dailyPlanSlots'
import { apiFetch } from '../utils/api'

function blankSlots() {
  return dailyPlanSlots.map((_, slotIndex) => ({
    slotIndex,
    planText: '',
    actualText: '',
    valueAddedHrs: '',
    nonValueAddedHrs: '',
    remarks: '',
  }))
}

function formatDateLong(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function DailyPlanSheet({ employeeId, employeeName, date, onClose, onSaved }) {
  const [slots, setSlots] = useState(blankSlots())
  const [selfAssessment, setSelfAssessment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    apiFetch(`/api/daily-plans/${employeeId}/${date}`)
      .then((data) => {
        if (cancelled) return
        const bySlotIndex = new Map(data.slots.map((s) => [s.slotIndex, s]))
        setSlots(
          dailyPlanSlots.map((_, i) => {
            const existing = bySlotIndex.get(i)
            return {
              slotIndex: i,
              planText: existing?.planText || '',
              actualText: existing?.actualText || '',
              valueAddedHrs: existing?.valueAddedHrs ?? '',
              nonValueAddedHrs: existing?.nonValueAddedHrs ?? '',
              remarks: existing?.remarks || '',
            }
          }),
        )
        setSelfAssessment(data.selfAssessment ?? '')
      })
      .catch((err) => setError(err.message || 'Could not load this day.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [employeeId, date])

  const actualHrs = useMemo(
    () =>
      slots.reduce((sum, s) => sum + (Number(s.valueAddedHrs) || 0) + (Number(s.nonValueAddedHrs) || 0), 0),
    [slots],
  )

  function setSlotField(index, field, value) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const saved = await apiFetch(`/api/daily-plans/${employeeId}/${date}`, {
        method: 'PUT',
        body: { selfAssessment: selfAssessment === '' ? null : Number(selfAssessment), slots },
      })
      onSaved?.(saved)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this day.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="daily-plan-panel">
      <div className="daily-plan-panel-header">
        <div>
          <h2>{employeeName}</h2>
          <p className="page-subtitle">{formatDateLong(date)}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
          <Icon name="close" size={16} />
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading…</p>
      ) : (
        <>
          <div className="daily-plan-summary">
            <span>
              Plan: <strong>{dailyPlanTotalHrs.toFixed(2)} hrs</strong>
            </span>
            <span>
              Actual: <strong>{actualHrs.toFixed(2)} hrs</strong>
            </span>
          </div>

          <table className="admin-table daily-plan-table">
            <colgroup>
              <col style={{ width: '11%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '23%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '25%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Time</th>
                <th>Plan</th>
                <th>Actual Workdone / Status</th>
                <th>Value Added (hrs)</th>
                <th>Non-Value Added (hrs)</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {dailyPlanSlots.map((slot, i) => (
                <tr key={i}>
                  <td className="daily-plan-time-cell">
                    {slot.start} – {slot.end}
                  </td>
                  <td>
                    <textarea
                      className="daily-plan-cell-input"
                      rows={2}
                      value={slots[i].planText}
                      onChange={(e) => setSlotField(i, 'planText', e.target.value)}
                    />
                  </td>
                  <td>
                    <textarea
                      className="daily-plan-cell-input"
                      rows={2}
                      value={slots[i].actualText}
                      onChange={(e) => setSlotField(i, 'actualText', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      className="daily-plan-cell-input"
                      value={slots[i].valueAddedHrs}
                      onChange={(e) => setSlotField(i, 'valueAddedHrs', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      className="daily-plan-cell-input"
                      value={slots[i].nonValueAddedHrs}
                      onChange={(e) => setSlotField(i, 'nonValueAddedHrs', e.target.value)}
                    />
                  </td>
                  <td>
                    <textarea
                      className="daily-plan-cell-input"
                      rows={2}
                      value={slots[i].remarks}
                      onChange={(e) => setSlotField(i, 'remarks', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <label className="form-field daily-plan-self-assessment">
            <span>How much percentage do you want to give yourself out of 100? (Self Assessment)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={selfAssessment}
              onChange={(e) => setSelfAssessment(e.target.value)}
            />
          </label>
        </>
      )}

      <div className="daily-plan-panel-footer">
        {error && <p className="form-error">{error}</p>}
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={loading || saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  )
}
