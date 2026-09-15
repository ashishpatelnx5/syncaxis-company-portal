import { useState } from 'react'
import Icon from './Icon'
import { apps } from '../data/apps'
import { pagePermissions } from '../data/permissions'

export default function RoleForm({ role, onSave, onClose }) {
  const isNew = role == null
  const isProtected = role?.isProtected ?? false
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [pages, setPages] = useState(role?.permissions?.pages ?? [])
  const [applications, setApplications] = useState(role?.permissions?.applications ?? [])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const regularPages = pagePermissions.filter((p) => !p.key.startsWith('admin-'))
  const adminPages = pagePermissions.filter((p) => p.key.startsWith('admin-'))

  function togglePage(key) {
    setPages((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  function toggleApp(id) {
    setApplications((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    setError('')
    try {
      await onSave({ name: name.trim(), description: description.trim(), permissions: { pages, applications } })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save this role.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add role' : `Edit ${role.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          {isProtected ? (
            <p className="form-hint">
              The Admin role always has unconditional full access to every page and application — there's nothing to
              configure, and it can't be renamed or deleted.
            </p>
          ) : (
            <>
              <div className="form-row">
                <label className="form-field">
                  <span>Name *</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
                </label>
                <label className="form-field">
                  <span>Description</span>
                  <input value={description} onChange={(e) => setDescription(e.target.value)} />
                </label>
              </div>

              <h3 className="form-section-title">Pages</h3>
              <div className="checkbox-grid">
                {regularPages.map((p) => (
                  <label key={p.key} className="checkbox-item">
                    <input type="checkbox" checked={pages.includes(p.key)} onChange={() => togglePage(p.key)} />
                    {p.label}
                  </label>
                ))}
              </div>

              <h3 className="form-section-title">Admin pages</h3>
              <p className="form-hint">Each grants both the Admin sub-page and its underlying actions (create/edit/delete).</p>
              <div className="checkbox-grid">
                {adminPages.map((p) => (
                  <label key={p.key} className="checkbox-item">
                    <input type="checkbox" checked={pages.includes(p.key)} onChange={() => togglePage(p.key)} />
                    {p.label.replace(/^Admin:\s*/, '')}
                  </label>
                ))}
              </div>

              <h3 className="form-section-title">Applications</h3>
              <div className="checkbox-grid">
                {apps.map((a) => (
                  <label key={a.id} className="checkbox-item">
                    <input type="checkbox" checked={applications.includes(a.id)} onChange={() => toggleApp(a.id)} />
                    {a.name}
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {error && <p className="form-error">{error}</p>}
          <button type="button" className="btn-secondary" onClick={onClose}>
            {isProtected ? 'Close' : 'Cancel'}
          </button>
          {!isProtected && (
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : isNew ? 'Add role' : 'Save changes'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
