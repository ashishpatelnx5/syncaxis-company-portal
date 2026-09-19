import { useMemo, useRef, useState } from 'react'
import Avatar from './Avatar'
import EducationFields from './EducationFields'
import EmergencyContactsFields from './EmergencyContactsFields'
import ExperienceFields from './ExperienceFields'
import FamilyDetailsFields from './FamilyDetailsFields'
import Icon from './Icon'
import PersonalDetailsFields, { emptyPersonalDetails } from './PersonalDetailsFields'
import PhoneInput from './PhoneInput'
import ProfileTabsShell from './ProfileTabsShell'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'
import usePersonalDocuments from '../hooks/usePersonalDocuments'
import { fileToResizedDataUrl } from '../utils/image'
import { getAncestorChain, getDescendantIds, getDirectReports } from '../utils/org'

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  displayName: '',
  photo: '',
  employeeId: '',
  title: '',
  departmentIds: [],
  email: '',
  phone: '',
  managerId: '',
  jobDescriptionId: '',
}

// variant 'modal' (default, used for "Add employee") pops up over the admin
// table; 'page' (used for editing an existing employee) renders as a normal
// full page instead, since a long, 6-tab form works better as its own page
// than a popup - see EmployeeEdit.jsx, which mounts this with variant='page'
// at /admin/employees/:id/edit. onClose is reused for both Cancel and
// "saved successfully" in either variant; the caller decides where that
// navigates back to.
export default function EmployeeForm({ employee, onClose, variant = 'modal' }) {
  const { employees, addEmployee, updateEmployee, setDirectReports } = useEmployees()
  const { departments } = useDepartments()
  const { jobDescriptions } = useJobDescriptions()
  const isNew = employee == null

  const [form, setForm] = useState(() =>
    isNew
      ? emptyForm
      : {
          firstName: employee.firstName || '',
          middleName: employee.middleName || '',
          lastName: employee.lastName || '',
          displayName: employee.displayName || '',
          photo: employee.photo || '',
          employeeId: employee.employeeId || '',
          title: employee.title || '',
          departmentIds: employee.departmentIds || [],
          email: employee.email || '',
          phone: employee.phone || '',
          managerId: employee.managerId ?? '',
          jobDescriptionId: employee.jobDescriptionId ?? '',
        },
  )
  const [reportIds, setReportIds] = useState(() =>
    isNew ? [] : getDirectReports(employees, employee.id).map((e) => e.id),
  )
  const [emergencyContacts, setEmergencyContacts] = useState(() => (isNew ? [] : employee.emergencyContacts || []))
  const [familyMembers, setFamilyMembers] = useState(() => (isNew ? [] : employee.familyMembers || []))
  const [education, setEducation] = useState(() => (isNew ? [] : employee.education || []))
  const [experience, setExperience] = useState(() => (isNew ? [] : employee.experience || []))
  const [personalDetails, setPersonalDetails] = useState(() =>
    isNew
      ? emptyPersonalDetails
      : {
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
  )
  const cityOptions = useMemo(() => {
    const cities = employees.flatMap((e) => [e.currentAddress?.city, e.permanentAddress?.city]).filter(Boolean)
    return [...new Set(cities)].sort()
  }, [employees])
  // The server computes and stores the canonical Name from these parts on
  // save (see resolveNameFields in routes/employees.js) - this is just the
  // same computation done locally so the avatar preview and the "direct
  // reports" hint below have something to show while editing.
  const fullName = [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ')
  // undefined basePath for a not-yet-saved new employee - the hook no-ops
  // until there's an id to attach uploads to (see PersonalDetailsFields'
  // "Save first to upload" fallback).
  const docs = usePersonalDocuments(isNew ? undefined : `/api/employees/${employee.id}/documents`)
  const [photoError, setPhotoError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef(null)

  // Exclude self and descendants from "reports to" (can't report to your own
  // report — that's a cycle), and self and ancestors from "direct reports"
  // (can't have your own manager start reporting to you). Also cross-exclude
  // whatever's currently picked in the *other* field — without this, a new
  // employee (with no existing ancestors/descendants to exclude yet) could
  // be saved reporting to someone who's also checked as one of their direct
  // reports, a two-person cycle that freezes the org chart/detail pages.
  const managerExclusions = new Set([
    ...(isNew ? [] : [employee.id, ...getDescendantIds(employees, employee.id)]),
    ...reportIds,
  ])
  const managerOptions = employees
    .filter((e) => !managerExclusions.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const reportExclusions = new Set([
    ...(isNew ? [] : [employee.id, ...getAncestorChain(employees, employee.id).map((e) => e.id)]),
    ...(form.managerId !== '' ? [Number(form.managerId)] : []),
  ])
  const reportOptions = employees
    .filter((e) => !reportExclusions.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  const departmentOptions = departments.slice().sort((a, b) => a.name.localeCompare(b.name))

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function toggleDepartment(id) {
    setForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(id)
        ? f.departmentIds.filter((d) => d !== id)
        : [...f.departmentIds, id],
    }))
  }

  function toggleReport(id) {
    setReportIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // clear so choosing the same file again still fires onChange
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please choose an image file.')
      return
    }
    try {
      const dataUrl = await fileToResizedDataUrl(file)
      setPhotoError('')
      set('photo', dataUrl)
    } catch {
      setPhotoError('Could not read that image — try a different file.')
    }
  }

  async function handleSubmit() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSubmitError('First name and last name are required.')
      return
    }

    const payload = {
      ...form,
      ...personalDetails,
      emergencyContacts,
      familyMembers,
      education,
      experience,
      managerId: form.managerId === '' ? null : Number(form.managerId),
      jobDescriptionId: form.jobDescriptionId === '' ? null : Number(form.jobDescriptionId),
    }

    setSubmitting(true)
    setSubmitError('')
    try {
      if (isNew) {
        const newId = await addEmployee(payload)
        if (reportIds.length > 0) await setDirectReports(newId, reportIds)
      } else {
        await updateEmployee(employee.id, payload)
        await setDirectReports(employee.id, reportIds)
      }
      onClose()
    } catch (err) {
      setSubmitError(err.message || 'Could not save this employee.')
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    {
      key: 'company',
      label: 'Syncaxis company details',
      content: (
        <div>
          <div className="form-row form-row-3">
            <label className="form-field">
              <span>First name *</span>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} required autoFocus />
            </label>
            <label className="form-field">
              <span>Middle name</span>
              <input value={form.middleName} onChange={(e) => set('middleName', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Last name *</span>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} required />
            </label>
          </div>

          <label className="form-field" style={{ flex: '0 0 auto', width: 280 }}>
            <span>Display name</span>
            <input value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          </label>

          <div className="form-field">
            <span>Photo</span>
            <div className="avatar-upload">
              <Avatar name={fullName || '?'} photo={form.photo} className="detail-avatar avatar-upload-preview" />
              <div className="avatar-upload-actions">
                <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  {form.photo ? 'Change photo' : 'Upload photo'}
                </button>
                {form.photo && (
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
            <PhoneInput label="Mobile no." value={form.phone} onChange={(v) => set('phone', v)} />
            <label className="form-field">
              <span>Email</span>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Date of joining</span>
              <input
                type="date"
                value={personalDetails.dateOfJoining}
                onChange={(e) => setPersonalDetails((p) => ({ ...p, dateOfJoining: e.target.value }))}
              />
            </label>
          </div>

          <div className="form-row">
            <label className="form-field">
              <span>Employee ID</span>
              <input value={form.employeeId} onChange={(e) => set('employeeId', e.target.value)} />
            </label>
            <label className="form-field">
              <span>Title</span>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} />
            </label>
          </div>

          <label className="form-field" style={{ flex: '0 0 auto', width: 280 }}>
            <span>Job description</span>
            <select value={form.jobDescriptionId} onChange={(e) => set('jobDescriptionId', e.target.value)}>
              <option value="">— None —</option>
              {jobDescriptions
                .slice()
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((jd) => (
                  <option key={jd.id} value={jd.id}>
                    {jd.title}
                  </option>
                ))}
            </select>
          </label>

          <h3 className="form-section-title">Departments</h3>
          <div className="checkbox-grid">
            {departmentOptions.map((d) => (
              <label key={d.id} className="checkbox-item">
                <input
                  type="checkbox"
                  checked={form.departmentIds.includes(d.id)}
                  onChange={() => toggleDepartment(d.id)}
                />
                {d.name}
              </label>
            ))}
            {departmentOptions.length === 0 && (
              <p className="empty-state">
                No departments yet — add some on the Departments page first.
              </p>
            )}
          </div>

          <h3 className="form-section-title">Reports to</h3>
          <label className="form-field" style={{ flex: '0 0 auto', width: 280 }}>
            <select value={form.managerId} onChange={(e) => set('managerId', e.target.value)}>
              <option value="">— None (top of org) —</option>
              {managerOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.title ? ` — ${m.title}` : ''}
                </option>
              ))}
            </select>
          </label>

          <h3 className="form-section-title">Direct reports</h3>
          <p className="form-hint" style={{ marginTop: 8 }}>
            Check everyone who should report directly to {fullName || 'this person'}.
          </p>
          <div className="checkbox-grid">
            {reportOptions.map((r) => (
              <label key={r.id} className="checkbox-item">
                <input type="checkbox" checked={reportIds.includes(r.id)} onChange={() => toggleReport(r.id)} />
                {r.name}
              </label>
            ))}
            {reportOptions.length === 0 && <p className="empty-state">No eligible people.</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'emergency',
      label: 'Emergency contact',
      content: <EmergencyContactsFields contacts={emergencyContacts} onChange={setEmergencyContacts} />,
    },
    {
      key: 'personal',
      label: 'Personal & address',
      content: (
        <PersonalDetailsFields
          value={personalDetails}
          onChange={setPersonalDetails}
          cityOptions={cityOptions}
          docs={docs}
          docsEnabled={!isNew}
        />
      ),
    },
    {
      key: 'family',
      label: 'Family details',
      content: <FamilyDetailsFields members={familyMembers} onChange={setFamilyMembers} />,
    },
    {
      key: 'education',
      label: 'Education',
      content: <EducationFields entries={education} onChange={setEducation} basePath={isNew ? undefined : `/api/employees/${employee.id}/education`} />,
    },
    {
      key: 'experience',
      label: 'Professional experience',
      content: <ExperienceFields entries={experience} onChange={setExperience} basePath={isNew ? undefined : `/api/employees/${employee.id}/experience`} />,
    },
  ]

  if (variant === 'page') {
    return (
      <div className="page">
        <div className="detail-toolbar">
          <button type="button" className="back-link" onClick={onClose}>
            <Icon name="chevron" size={14} className="back-icon" />
            Cancel
          </button>
        </div>
        <header className="page-header">
          <h1>{isNew ? 'Add employee' : `Edit ${employee.name}`}</h1>
        </header>

        <ProfileTabsShell tabs={tabs} />

        <div className="modal-footer" style={{ marginTop: 24 }}>
          {submitError && <p className="form-error">{submitError}</p>}
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={isNew ? 'btn-create' : 'btn-primary'} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add employee' : 'Save changes'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isNew ? 'Add employee' : `Edit ${employee.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <ProfileTabsShell tabs={tabs} />
        </div>

        <div className="modal-footer">
          {submitError && <p className="form-error">{submitError}</p>}
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={isNew ? 'btn-create' : 'btn-primary'} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isNew ? 'Add employee' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
