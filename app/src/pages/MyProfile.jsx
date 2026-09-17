import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from '../components/Avatar'
import EducationFields from '../components/EducationFields'
import EmergencyContactsFields from '../components/EmergencyContactsFields'
import ExperienceFields from '../components/ExperienceFields'
import FamilyDetailsFields from '../components/FamilyDetailsFields'
import Icon from '../components/Icon'
import PersonalDetailsFields, { emptyPersonalDetails } from '../components/PersonalDetailsFields'
import PhoneInput from '../components/PhoneInput'
import PhotoLightbox from '../components/PhotoLightbox'
import ProfileTabsShell from '../components/ProfileTabsShell'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import usePersonalDocuments from '../hooks/usePersonalDocuments'
import { apiFetch, downloadAuthedFile } from '../utils/api'
import { fileToResizedDataUrl } from '../utils/image'

function useCityOptions(employees) {
  return useMemo(() => {
    const cities = employees.flatMap((e) => [e.currentAddress?.city, e.permanentAddress?.city]).filter(Boolean)
    return [...new Set(cities)].sort()
  }, [employees])
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// A plain "View" link next to the read-only Aadhar/PAN/DL number when a
// document is on file - downloads it (under its full on-disk name) on
// click. No file name shown here; nothing renders if there's no document.
function DocumentLink({ docs, typeKey }) {
  const doc = docs.documentFor(typeKey)
  if (!doc) return null
  return (
    <button type="button" className="link-button" style={{ marginLeft: 8 }} onClick={() => docs.download(doc)}>
      View
    </button>
  )
}

// Same idea as DocumentLink above, for a per-row Education/Experience
// document rather than one of the type-keyed identity documents - the row
// already carries its own `document` field (see fetchEducationByEmployee/
// fetchExperienceByEmployee in employees.js), so no docs hook is needed here.
function RowDocumentLink({ basePath, rowId, doc }) {
  if (!doc) return null
  return (
    <button
      type="button"
      className="link-button"
      style={{ marginLeft: 8 }}
      onClick={() => downloadAuthedFile(`${basePath}/${rowId}/document/file`, doc.downloadFileName || doc.fileName)}
    >
      View
    </button>
  )
}

// Line1 / Line2 / City, State, Pincode / Landmark — one line each, matching
// how the address is entered in the edit form.
function AddressDisplay({ address }) {
  if (!address) return <p className="empty-state">Not on file yet.</p>
  const cityStatePincode = [address.city, address.state, address.pincode].filter(Boolean).join(', ')
  const hasContent = address.line1 || address.line2 || cityStatePincode || address.landmark
  if (!hasContent) return <p className="empty-state">Not on file yet.</p>

  return (
    <div>
      {address.line1 && <p style={{ margin: 0 }}>{address.line1}</p>}
      {address.line2 && <p style={{ margin: 0 }}>{address.line2}</p>}
      {cityStatePincode && <p style={{ margin: 0 }}>{cityStatePincode}</p>}
      {address.landmark && <p style={{ margin: 0 }}>{address.landmark}</p>}
    </div>
  )
}

// Same Edit / Cancel+Save trio on every tab (per-tab "edit + save" controls)
// even though they all operate on the one shared `editing` flag below -
// clicking Edit on any tab unlocks every tab at once, and Save commits
// everything together in the same PUT (there's no per-tab API endpoint).
function TabActions({ editing, submitting, onEdit, onCancel, onSave }) {
  return (
    <div className="admin-header-actions" style={{ marginTop: 16 }}>
      {editing ? (
        <>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={onSave} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </>
      ) : (
        <button type="button" className="btn-secondary" onClick={onEdit}>
          <Icon name="edit" size={15} /> Edit
        </button>
      )}
    </div>
  )
}

function buildEditableState(employee) {
  return {
    photo: employee.photo || '',
    email: employee.email || '',
    phone: employee.phone || '',
    personalDetails: {
      ...emptyPersonalDetails,
      dateOfBirth: employee.dateOfBirth || '',
      dateOfJoining: employee.dateOfJoining || '',
      aadharNumber: employee.aadharNumber || '',
      panNumber: employee.panNumber || '',
      drivingLicenceNumber: employee.drivingLicenceNumber || '',
      bloodGroup: employee.bloodGroup || '',
      currentAddress: { ...emptyPersonalDetails.currentAddress, ...employee.currentAddress },
      permanentAddress: { ...emptyPersonalDetails.permanentAddress, ...employee.permanentAddress },
      permanentSameAsCurrent: Boolean(employee.permanentSameAsCurrent),
    },
    emergencyContacts: employee.emergencyContacts || [],
    familyMembers: employee.familyMembers || [],
    education: employee.education || [],
    experience: employee.experience || [],
  }
}

export default function MyProfile() {
  const { user } = useAuth()
  const { employees, isLoading, refresh } = useEmployees()
  const { departments } = useDepartments()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const cityOptions = useCityOptions(employees)

  const myEmployee = employees.find((e) => e.id === user?.employeeId)

  // Only blank the page on the very first load - refresh() (called after
  // every save, to pull the just-written record back down) also flips
  // isLoading true, and blanking the page here would unmount ProfileEditor
  // for that instant, resetting the tab selection back to the first tab.
  if (isLoading && employees.length === 0) return null

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
      <p className="page-subtitle">Personal Information — your details as they appear in the directory.</p>

      <div className="detail-header">
        {myEmployee.photo ? (
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
        )}
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

      <ProfileEditor employee={myEmployee} cityOptions={cityOptions} onSaved={refresh} />

      {lightboxOpen && (
        <PhotoLightbox src={myEmployee.photo} alt={myEmployee.name} onClose={() => setLightboxOpen(false)} />
      )}
    </div>
  )
}

function ProfileEditor({ employee, cityOptions, onSaved }) {
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState(() => buildEditableState(employee))
  const [photoError, setPhotoError] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)
  // One fetch shared by the edit-mode upload controls (PersonalDetailsFields)
  // and the read-only summary view below, instead of each fetching its own copy.
  const docs = usePersonalDocuments('/api/me/employee/documents')

  function set(field, value) {
    setState((s) => ({ ...s, [field]: value }))
  }

  function handleCancel() {
    setState(buildEditableState(employee))
    setError('')
    setPhotoError('')
    setEditing(false)
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    try {
      set('photo', await fileToResizedDataUrl(file))
      setPhotoError('')
    } catch {
      setPhotoError('Could not read that image — try a different file.')
    }
  }

  async function handleSave() {
    setSubmitting(true)
    setError('')
    try {
      await apiFetch('/api/me/employee', {
        method: 'PUT',
        body: {
          photo: state.photo,
          email: state.email,
          phone: state.phone,
          emergencyContacts: state.emergencyContacts,
          familyMembers: state.familyMembers,
          education: state.education,
          experience: state.experience,
          ...state.personalDetails,
        },
      })
      await onSaved()
      setEditing(false)
    } catch (err) {
      setError(err.message || 'Could not save your changes.')
    } finally {
      setSubmitting(false)
    }
  }

  const actionsProps = { editing, submitting, onEdit: () => setEditing(true), onCancel: handleCancel, onSave: handleSave }
  const hasPersonalDetails =
    employee.dateOfBirth || employee.dateOfJoining || employee.aadharNumber || employee.panNumber || employee.drivingLicenceNumber || employee.bloodGroup
  const permanentAddress = employee.permanentSameAsCurrent ? employee.currentAddress : employee.permanentAddress

  const tabs = [
    {
      key: 'company',
      label: 'Syncaxis company details',
      content: (
        <div>
          {error && <p className="form-error">{error}</p>}
          {editing ? (
            <>
              <div className="form-field">
                <span>Photo</span>
                <div className="avatar-upload">
                  <Avatar name={employee.name} photo={state.photo} className="detail-avatar avatar-upload-preview" />
                  <div className="avatar-upload-actions">
                    <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                      {state.photo ? 'Change photo' : 'Upload photo'}
                    </button>
                    {state.photo && (
                      <button type="button" className="btn-secondary" onClick={() => set('photo', '')}>
                        Remove
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} hidden />
                  </div>
                  {photoError && <p className="form-error">{photoError}</p>}
                </div>
              </div>
              <div className="form-row form-row-3">
                <PhoneInput label="Mobile no." value={state.phone} onChange={(v) => set('phone', v)} />
                <label className="form-field">
                  <span>Email</span>
                  <input type="email" value={state.email} onChange={(e) => set('email', e.target.value)} />
                </label>
                <label className="form-field">
                  <span>Date of joining</span>
                  <input type="date" value={state.personalDetails.dateOfJoining} disabled />
                </label>
              </div>
              <p className="form-hint">
                Name, title, department, manager, job description, and date of joining are set by an admin — see{' '}
                <Link to="/organisation/directory">the directory</Link> or contact an administrator to change those.
              </p>
            </>
          ) : (
            <dl className="detail-list">
              <dt>Email</dt>
              <dd>{employee.email ? <a href={`mailto:${employee.email}`}>{employee.email}</a> : '—'}</dd>
              <dt>Phone</dt>
              <dd>{employee.phone ? <a href={`tel:${employee.phone}`}>{employee.phone}</a> : '—'}</dd>
              <dt>Date of joining</dt>
              <dd>{formatDate(employee.dateOfJoining) || '—'}</dd>
            </dl>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
    {
      key: 'personal',
      label: 'Personal & address',
      content: (
        <div>
          {editing ? (
            <PersonalDetailsFields
              value={state.personalDetails}
              onChange={(v) => set('personalDetails', v)}
              cityOptions={cityOptions}
              docs={docs}
              docsEnabled
            />
          ) : (
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
              <section className="detail-card">
                <h2>Personal details</h2>
                {hasPersonalDetails ? (
                  <dl className="detail-list">
                    {employee.dateOfBirth && (
                      <>
                        <dt>Date of birth</dt>
                        <dd>{formatDate(employee.dateOfBirth)}</dd>
                      </>
                    )}
                    {employee.bloodGroup && (
                      <>
                        <dt>Blood group</dt>
                        <dd>{employee.bloodGroup}</dd>
                      </>
                    )}
                    {employee.aadharNumber && (
                      <>
                        <dt>Aadhar no.</dt>
                        <dd>
                          {employee.aadharNumber}
                          <DocumentLink docs={docs} typeKey="aadhar" />
                        </dd>
                      </>
                    )}
                    {employee.panNumber && (
                      <>
                        <dt>PAN no.</dt>
                        <dd>
                          {employee.panNumber}
                          <DocumentLink docs={docs} typeKey="pan" />
                        </dd>
                      </>
                    )}
                    {employee.drivingLicenceNumber && (
                      <>
                        <dt>Driving licence no.</dt>
                        <dd>
                          {employee.drivingLicenceNumber}
                          <DocumentLink docs={docs} typeKey="driving-licence" />
                        </dd>
                      </>
                    )}
                  </dl>
                ) : (
                  <p className="empty-state">Not on file yet.</p>
                )}
              </section>
              {employee.permanentSameAsCurrent ? (
                <section className="detail-card">
                  <h2>Current &amp; permanent address</h2>
                  <AddressDisplay address={employee.currentAddress} />
                </section>
              ) : (
                <>
                  <section className="detail-card">
                    <h2>Current address</h2>
                    <AddressDisplay address={employee.currentAddress} />
                  </section>
                  <section className="detail-card">
                    <h2>Permanent address</h2>
                    <AddressDisplay address={permanentAddress} />
                  </section>
                </>
              )}
            </div>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
    {
      key: 'family',
      label: 'Family details',
      content: (
        <div>
          {editing ? (
            <FamilyDetailsFields members={state.familyMembers} onChange={(v) => set('familyMembers', v)} />
          ) : (
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
              <section className="detail-card">
                <h2>Family details</h2>
                {(employee.familyMembers || []).length > 0 ? (
                  <div className="detail-card-list">
                    {employee.familyMembers.map((m, i) => (
                      <dl className="detail-list" key={i}>
                        <dt>Name</dt>
                        <dd>{m.name}</dd>
                        {m.relation && (
                          <>
                            <dt>Relation</dt>
                            <dd>{m.relation}</dd>
                          </>
                        )}
                        {m.contactNo && (
                          <>
                            <dt>Contact no.</dt>
                            <dd>
                              <a href={`tel:${m.contactNo}`}>{m.contactNo}</a>
                            </dd>
                          </>
                        )}
                      </dl>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">Not on file yet.</p>
                )}
              </section>
            </div>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
    {
      key: 'emergency',
      label: 'Emergency contact',
      content: (
        <div>
          {editing ? (
            <EmergencyContactsFields contacts={state.emergencyContacts} onChange={(v) => set('emergencyContacts', v)} />
          ) : (
            <div className="detail-grid" style={{ gridTemplateColumns: '1fr' }}>
              <section className="detail-card">
                <h2>Emergency contact{(employee.emergencyContacts || []).length > 1 ? 's' : ''}</h2>
                {(employee.emergencyContacts || []).length > 0 ? (
                  <div className="detail-card-list">
                    {employee.emergencyContacts.map((c, i) => (
                      <dl className="detail-list" key={i}>
                        <dt>Name</dt>
                        <dd>{c.name}</dd>
                        {c.relation && (
                          <>
                            <dt>Relation</dt>
                            <dd>{c.relation}</dd>
                          </>
                        )}
                        {c.phone && (
                          <>
                            <dt>Phone</dt>
                            <dd>
                              <a href={`tel:${c.phone}`}>{c.phone}</a>
                            </dd>
                          </>
                        )}
                      </dl>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">Not on file yet.</p>
                )}
              </section>
            </div>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
    {
      key: 'education',
      label: 'Education',
      content: (
        <div>
          {editing ? (
            <EducationFields entries={state.education} onChange={(v) => set('education', v)} basePath="/api/me/employee/education" />
          ) : (employee.education || []).length > 0 ? (
            <div className="detail-card-list">
              {employee.education.map((e, i) => (
                <dl className="detail-list" key={i}>
                  <dt>Education</dt>
                  <dd>{e.education}</dd>
                  {e.institution && (
                    <>
                      <dt>Institution</dt>
                      <dd>{e.institution}</dd>
                    </>
                  )}
                  {e.stream && (
                    <>
                      <dt>Stream</dt>
                      <dd>{e.stream}</dd>
                    </>
                  )}
                  {e.yearOfPassing && (
                    <>
                      <dt>Year of passing</dt>
                      <dd>{e.yearOfPassing}</dd>
                    </>
                  )}
                  {e.document && (
                    <>
                      <dt>Document</dt>
                      <dd>
                        <RowDocumentLink basePath="/api/me/employee/education" rowId={e.id} doc={e.document} />
                      </dd>
                    </>
                  )}
                </dl>
              ))}
            </div>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
    {
      key: 'experience',
      label: 'Professional experience',
      content: (
        <div>
          {editing ? (
            <ExperienceFields entries={state.experience} onChange={(v) => set('experience', v)} basePath="/api/me/employee/experience" />
          ) : (employee.experience || []).length > 0 ? (
            <div className="detail-card-list">
              {employee.experience.map((x, i) => (
                <dl className="detail-list" key={i}>
                  <dt>Company</dt>
                  <dd>{x.companyName}</dd>
                  {x.designation && (
                    <>
                      <dt>Designation</dt>
                      <dd>{x.designation}</dd>
                    </>
                  )}
                  {x.startDate && (
                    <>
                      <dt>Start date</dt>
                      <dd>{formatDate(x.startDate)}</dd>
                    </>
                  )}
                  {x.endDate && (
                    <>
                      <dt>End date</dt>
                      <dd>{formatDate(x.endDate)}</dd>
                    </>
                  )}
                  {x.document && (
                    <>
                      <dt>Document</dt>
                      <dd>
                        <RowDocumentLink basePath="/api/me/employee/experience" rowId={x.id} doc={x.document} />
                      </dd>
                    </>
                  )}
                </dl>
              ))}
            </div>
          ) : (
            <p className="empty-state">Not on file yet.</p>
          )}
          <TabActions {...actionsProps} />
        </div>
      ),
    },
  ]

  return <ProfileTabsShell tabs={tabs} />
}
