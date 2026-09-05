import { useState } from 'react'
import Icon from './Icon'
import { useDepartments } from '../context/useDepartments'
import { useJobDescriptions } from '../context/useJobDescriptions'

function linesToArray(text) {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function arrayToLines(arr) {
  return (arr || []).join('\n')
}

function formFromJobDescription(jd) {
  const c = jd?.content || {}
  return {
    title: jd?.title || '',
    departmentId: jd?.departmentId ?? '',
    reportingTo: jd?.reportingTo || '',
    summary: c.summary || '',
    scopeOfResponsibility: arrayToLines(c.scopeOfResponsibility),
    responsibilityGroups: c.responsibilityGroups?.length
      ? c.responsibilityGroups.map((g) => ({
          title: g.title || '',
          responsibilities: arrayToLines(g.responsibilities),
          accountability: arrayToLines(g.accountability),
        }))
      : [{ title: '', responsibilities: '', accountability: '' }],
    kpis: c.kpis?.length ? c.kpis.map((k) => ({ name: k.name || '', target: k.target || '' })) : [{ name: '', target: '' }],
    authorityGroups: c.authorityGroups?.length
      ? c.authorityGroups.map((g) => ({ label: g.label || '', items: arrayToLines(g.items) }))
      : [{ label: '', items: '' }],
    competenciesTechnical: arrayToLines(c.competencies?.technical),
    competenciesBehavioral: arrayToLines(c.competencies?.behavioral),
    accountability: arrayToLines(c.accountability),
  }
}

function formToPayload(form) {
  return {
    title: form.title.trim(),
    departmentId: form.departmentId === '' ? null : Number(form.departmentId),
    reportingTo: form.reportingTo.trim(),
    content: {
      summary: form.summary.trim(),
      scopeOfResponsibility: linesToArray(form.scopeOfResponsibility),
      responsibilityGroups: form.responsibilityGroups
        .filter((g) => g.title.trim() || g.responsibilities.trim())
        .map((g) => ({
          title: g.title.trim(),
          responsibilities: linesToArray(g.responsibilities),
          accountability: linesToArray(g.accountability),
        })),
      kpis: form.kpis.filter((k) => k.name.trim()).map((k) => ({ name: k.name.trim(), target: k.target.trim() })),
      authorityGroups: form.authorityGroups
        .filter((g) => g.label.trim() || g.items.trim())
        .map((g) => ({ label: g.label.trim(), items: linesToArray(g.items) })),
      competencies: {
        technical: linesToArray(form.competenciesTechnical),
        behavioral: linesToArray(form.competenciesBehavioral),
      },
      accountability: linesToArray(form.accountability),
    },
  }
}

export default function JobDescriptionForm({ jobDescription, onClose }) {
  const { addJobDescription, updateJobDescription } = useJobDescriptions()
  const { departments } = useDepartments()
  const isNew = jobDescription == null

  const [form, setForm] = useState(() => formFromJobDescription(jobDescription))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const departmentOptions = departments.slice().sort((a, b) => a.name.localeCompare(b.name))

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function setGroupField(listField, index, itemField, value) {
    setForm((f) => ({
      ...f,
      [listField]: f[listField].map((item, i) => (i === index ? { ...item, [itemField]: value } : item)),
    }))
  }

  function addGroup(listField, blank) {
    setForm((f) => ({ ...f, [listField]: [...f[listField], blank] }))
  }

  function removeGroup(listField, index) {
    setForm((f) => ({ ...f, [listField]: f[listField].filter((_, i) => i !== index) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim() || form.departmentId === '') return

    setSubmitting(true)
    setError('')
    try {
      const payload = formToPayload(form)
      if (isNew) {
        await addJobDescription(payload)
      } else {
        await updateJobDescription(jobDescription.id, payload)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this job description.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add job description' : `Edit ${jobDescription.title}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <label className="form-field">
              <span>Title *</span>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} required autoFocus />
            </label>
            <label className="form-field">
              <span>Department *</span>
              <select value={form.departmentId} onChange={(e) => set('departmentId', e.target.value)} required>
                <option value="">— Select —</option>
                {departmentOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="form-field">
            <span>Reporting to</span>
            <input value={form.reportingTo} onChange={(e) => set('reportingTo', e.target.value)} placeholder="e.g. Managing Director" />
          </label>

          <label className="form-field">
            <span>Position summary</span>
            <textarea value={form.summary} onChange={(e) => set('summary', e.target.value)} rows={3} />
          </label>

          <label className="form-field">
            <span>Scope of responsibility (one per line, optional)</span>
            <textarea
              value={form.scopeOfResponsibility}
              onChange={(e) => set('scopeOfResponsibility', e.target.value)}
              rows={3}
            />
          </label>

          <h3 className="form-section-title">Key roles &amp; responsibilities</h3>
          {form.responsibilityGroups.map((group, i) => (
            <div key={i} className="form-array-group">
              {form.responsibilityGroups.length > 1 && (
                <button
                  type="button"
                  className="icon-btn icon-btn-danger form-array-remove"
                  onClick={() => removeGroup('responsibilityGroups', i)}
                  aria-label="Remove group"
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
              <label className="form-field">
                <span>Category title</span>
                <input
                  value={group.title}
                  onChange={(e) => setGroupField('responsibilityGroups', i, 'title', e.target.value)}
                  placeholder="e.g. Inventory Management"
                />
              </label>
              <label className="form-field">
                <span>Responsibilities (one per line)</span>
                <textarea
                  value={group.responsibilities}
                  onChange={(e) => setGroupField('responsibilityGroups', i, 'responsibilities', e.target.value)}
                  rows={3}
                />
              </label>
              <label className="form-field">
                <span>Accountability for this category (one per line, optional)</span>
                <textarea
                  value={group.accountability}
                  onChange={(e) => setGroupField('responsibilityGroups', i, 'accountability', e.target.value)}
                  rows={2}
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary form-array-add"
            onClick={() => addGroup('responsibilityGroups', { title: '', responsibilities: '', accountability: '' })}
          >
            <Icon name="plus" size={14} /> Add category
          </button>

          <h3 className="form-section-title">Key performance indicators</h3>
          {form.kpis.map((kpi, i) => (
            <div key={i} className="form-array-group-row">
              <label className="form-field">
                <span>KPI</span>
                <input value={kpi.name} onChange={(e) => setGroupField('kpis', i, 'name', e.target.value)} />
              </label>
              <label className="form-field">
                <span>Target (optional)</span>
                <input value={kpi.target} onChange={(e) => setGroupField('kpis', i, 'target', e.target.value)} placeholder="e.g. 100%" />
              </label>
              {form.kpis.length > 1 && (
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => removeGroup('kpis', i)}
                  aria-label="Remove KPI"
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" className="btn-secondary form-array-add" onClick={() => addGroup('kpis', { name: '', target: '' })}>
            <Icon name="plus" size={14} /> Add KPI
          </button>

          <h3 className="form-section-title">Authority</h3>
          {form.authorityGroups.map((group, i) => (
            <div key={i} className="form-array-group">
              {form.authorityGroups.length > 1 && (
                <button
                  type="button"
                  className="icon-btn icon-btn-danger form-array-remove"
                  onClick={() => removeGroup('authorityGroups', i)}
                  aria-label="Remove group"
                >
                  <Icon name="trash" size={14} />
                </button>
              )}
              <label className="form-field">
                <span>Group label (optional — leave blank for a single flat list)</span>
                <input
                  value={group.label}
                  onChange={(e) => setGroupField('authorityGroups', i, 'label', e.target.value)}
                  placeholder="e.g. Can Independently"
                />
              </label>
              <label className="form-field">
                <span>Items (one per line)</span>
                <textarea value={group.items} onChange={(e) => setGroupField('authorityGroups', i, 'items', e.target.value)} rows={3} />
              </label>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary form-array-add"
            onClick={() => addGroup('authorityGroups', { label: '', items: '' })}
          >
            <Icon name="plus" size={14} /> Add group
          </button>

          <h3 className="form-section-title">Required competencies (optional)</h3>
          <div className="form-row">
            <label className="form-field">
              <span>Technical (one per line)</span>
              <textarea value={form.competenciesTechnical} onChange={(e) => set('competenciesTechnical', e.target.value)} rows={4} />
            </label>
            <label className="form-field">
              <span>Behavioral (one per line)</span>
              <textarea value={form.competenciesBehavioral} onChange={(e) => set('competenciesBehavioral', e.target.value)} rows={4} />
            </label>
          </div>

          <label className="form-field">
            <span>Accountability — overall (one per line, optional)</span>
            <textarea value={form.accountability} onChange={(e) => set('accountability', e.target.value)} rows={3} />
          </label>
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add job description' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
