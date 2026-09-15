import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import Icon from '../components/Icon'
import PhotoLightbox from '../components/PhotoLightbox'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { apiFetch } from '../utils/api'
import { fileToResizedDataUrl } from '../utils/image'

export default function MyProfile() {
  const { user } = useAuth()
  const { employees, isLoading, refresh } = useEmployees()
  const { departments } = useDepartments()
  const [editing, setEditing] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const myEmployee = employees.find((e) => e.id === user?.employeeId)

  if (isLoading) return null

  if (!myEmployee) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>Personal Information</h1>
        </header>
        <p className="empty-state">
          Your account isn&apos;t linked to an employee record yet — contact an administrator to get it linked.
        </p>
      </div>
    )
  }

  const managerName = employees.find((e) => e.id === myEmployee.managerId)?.name
  const departmentNames = (myEmployee.departmentIds || [])
    .map((deptId) => departments.find((d) => d.id === deptId)?.name)
    .filter(Boolean)

  return (
    <div className="page">
      <p className="page-subtitle">Personal Information — your details as they appear in the directory. Update your contact info below.</p>

      <div className="detail-header">
        {/* The edit form below has its own photo preview/upload — showing
            this one too while editing would mean two photos on screen for
            the same field. */}
        {!editing &&
          (myEmployee.photo ? (
            <button
              type="button"
              className="avatar-button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`View ${myEmployee.name}'s full photo`}
            >
              <Avatar name={myEmployee.name} photo={myEmployee.photo} className="detail-avatar" />
            </button>
          ) : (
            <Avatar name={myEmployee.name} photo={myEmployee.photo} className="detail-avatar" />
          ))}
        <div>
          <h1>{myEmployee.name}</h1>
          <p className="page-subtitle">
            {myEmployee.title || 'Title not set'}
            {departmentNames.length > 0 && ` · ${departmentNames.join(', ')}`}
            {myEmployee.employeeId && ` · #${myEmployee.employeeId}`}
          </p>
          {managerName && <p className="page-subtitle">Reports to {managerName}</p>}
        </div>
      </div>

      {editing ? (
        <ContactEditForm
          employee={myEmployee}
          onSaved={async () => {
            await refresh()
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <ContactReadOnly employee={myEmployee} onEdit={() => setEditing(true)} />
      )}

      <p className="form-hint" style={{ marginTop: 16 }}>
        Name, title, department, manager, and job description are set by an admin — see{' '}
        <Link to="/organisation/directory">the directory</Link> or contact an administrator to change those.
      </p>

      {lightboxOpen && (
        <PhotoLightbox src={myEmployee.photo} alt={myEmployee.name} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}

function ContactReadOnly({ employee, onEdit }) {
  const emergency = employee.emergencyContact ?? {}
  const hasEmergencyContact = emergency.name || emergency.relation || emergency.phone

  return (
    <>
      <div className="admin-header-row">
        <h2 style={{ margin: 0 }}>Contact &amp; emergency info</h2>
        <button type="button" className="btn-secondary" onClick={onEdit}>
          <Icon name="edit" size={15} /> Edit
        </button>
      </div>
      <div className="detail-grid">
        <section className="detail-card">
          <h2>Contact</h2>
          {employee.email || employee.phone ? (
            <dl className="detail-list">
              {employee.email && (
                <>
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${employee.email}`}>{employee.email}</a>
                  </dd>
                </>
              )}
              {employee.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${employee.phone}`}>{employee.phone}</a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
        </section>

        <section className="detail-card">
          <h2>Emergency contact</h2>
          {hasEmergencyContact ? (
            <dl className="detail-list">
              {emergency.name && (
                <>
                  <dt>Name</dt>
                  <dd>{emergency.name}</dd>
                </>
              )}
              {emergency.relation && (
                <>
                  <dt>Relation</dt>
                  <dd>{emergency.relation}</dd>
                </>
              )}
              {emergency.phone && (
                <>
                  <dt>Phone</dt>
                  <dd>
                    <a href={`tel:${emergency.phone}`}>{emergency.phone}</a>
                  </dd>
                </>
              )}
            </dl>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
        </section>
      </div>
    </>
  )
}

function ContactEditForm({ employee, onSaved, onCancel }) {
  const [photo, setPhoto] = useState(employee.photo || '')
  const [email, setEmail] = useState(employee.email || '')
  const [phone, setPhone] = useState(employee.phone || '')
  const [emergencyName, setEmergencyName] = useState(employee.emergencyContact?.name || '')
  const [emergencyRelation, setEmergencyRelation] = useState(employee.emergencyContact?.relation || '')
  const [emergencyPhone, setEmergencyPhone] = useState(employee.emergencyContact?.phone || '')
  const [photoError, setPhotoError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    try {
      setPhoto(await fileToResizedDataUrl(file))
      setPhotoError('')
    } catch {
      setPhotoError('Could not read that image — try a different file.')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await apiFetch('/api/me/employee', {
        method: 'PUT',
        body: {
          photo,
          email,
          phone,
          emergencyContact: { name: emergencyName, relation: emergencyRelation, phone: emergencyPhone },
        },
      })
      await onSaved()
    } catch (err) {
      setError(err.message || 'Could not save your changes.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-field">
        <span>Photo</span>
        <div className="avatar-upload">
          <Avatar name={employee.name} photo={photo} className="detail-avatar avatar-upload-preview" />
          <div className="avatar-upload-actions">
            <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
              {photo ? 'Change photo' : 'Upload photo'}
            </button>
            {photo && (
              <button type="button" className="btn-secondary" onClick={() => setPhoto('')}>
                Remove
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} hidden />
          </div>
          {photoError && <p className="form-error">{photoError}</p>}
        </div>
      </div>

      <div className="form-row">
        <label className="form-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
      </div>

      <h3 className="form-section-title">Emergency contact</h3>
      <div className="form-row form-row-3">
        <label className="form-field">
          <span>Name</span>
          <input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Relation</span>
          <input value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} />
        </label>
        <label className="form-field">
          <span>Phone</span>
          <input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
        </label>
      </div>

      {error && <p className="form-error">{error}</p>}
      <div className="admin-header-actions" style={{ marginTop: 8 }}>
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
