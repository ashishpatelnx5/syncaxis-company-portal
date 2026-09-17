import { useRef } from 'react'
import Icon from './Icon'
import usePersonalDocuments, { DOCUMENT_TYPES } from '../hooks/usePersonalDocuments'
import { INDIAN_STATES } from '../data/indianStates'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Maharashtra default - most employees are based there; still fully editable.
const emptyAddress = { line1: '', line2: '', city: '', state: 'Maharashtra', pincode: '', landmark: '' }

export const emptyPersonalDetails = {
  dateOfBirth: '',
  dateOfJoining: '',
  aadharNumber: '',
  panNumber: '',
  drivingLicenceNumber: '',
  bloodGroup: '',
  currentAddress: { ...emptyAddress },
  permanentAddress: { ...emptyAddress },
  permanentSameAsCurrent: false,
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function DocumentStatus({ doc, docsEnabled }) {
  if (!docsEnabled) return <p className="page-subtitle" style={{ margin: 0 }}>Save first to upload</p>
  if (!doc) return <p className="page-subtitle" style={{ margin: 0 }}>Not uploaded yet</p>
  return (
    <p className="page-subtitle" style={{ margin: 0 }}>
      <span style={{ color: 'var(--text)' }}>{doc.fileName}</span>
      <br />
      Uploaded {formatDate(doc.uploadedAt)}
    </p>
  )
}

// Same width for every identity field's number input regardless of its own
// content length, so the document status/buttons column that follows lines
// up in a straight column across Aadhar/PAN/Driving Licence rows instead of
// staggering with each field's individual width.
const IDENTITY_LABEL_WIDTH = 200

// One row of an identity number field (Aadhar/PAN/Driving Licence) plus its
// matching document upload — kept side by side per the requested layout,
// rather than in a separate documents list. docsEnabled is false for a
// not-yet-saved new employee (no id yet to attach an upload to).
function IdentityField({ label, value, onChange, inputProps, typeKey, docs, docsEnabled }) {
  const fileInputRef = useRef(null)
  const doc = docsEnabled ? docs.documentFor(typeKey) : null
  const uploading = docs.uploadingKey === typeKey

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) docs.upload(typeKey, file)
  }

  return (
    <div className="form-row identity-field-row">
      <label className="form-field" style={{ flex: '0 0 auto', width: IDENTITY_LABEL_WIDTH }}>
        <span>{label}</span>
        <input value={value} onChange={onChange} {...inputProps} />
      </label>
      <div className="form-field">
        <DocumentStatus doc={doc} docsEnabled={docsEnabled} />
        {docsEnabled && (
          <div className="identity-field-actions">
            {doc && (
              <button type="button" className="btn-secondary" onClick={() => docs.download(doc)}>
                <Icon name="external" size={14} /> View
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={handleFileChange} />
          </div>
        )}
      </div>
    </div>
  )
}

function AddressFields({ value, onChange, cityOptions, idPrefix }) {
  function set(field, fieldValue) {
    onChange({ ...value, [field]: fieldValue })
  }

  return (
    <>
      <label className="form-field" style={{ width: '100%' }}>
        <span>Address line 1 (Flat/House no., Building, Society)</span>
        <input value={value.line1} onChange={(e) => set('line1', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
      </label>
      <label className="form-field" style={{ width: '100%' }}>
        <span>Address line 2 (Area)</span>
        <input value={value.line2} onChange={(e) => set('line2', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
      </label>
      <div className="form-row form-row-3">
        <label className="form-field">
          <span>City</span>
          <input value={value.city} onChange={(e) => set('city', e.target.value)} list={idPrefix} />
          <datalist id={idPrefix}>
            {cityOptions.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </label>
        <label className="form-field" style={{ flex: '0 0 auto', width: 220, minWidth: 220 }}>
          <span>State</span>
          <select value={value.state} onChange={(e) => set('state', e.target.value)}>
            <option value="">— Select state —</option>
            {INDIAN_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
        <label className="form-field" style={{ flex: '0 0 auto', width: 140, minWidth: 140 }}>
          <span>Pin code</span>
          <input
            value={value.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
          />
        </label>
      </div>
      <label className="form-field" style={{ flex: '0 0 auto', width: 320, minWidth: 320 }}>
        <span>Landmark</span>
        <input value={value.landmark} onChange={(e) => set('landmark', e.target.value)} maxLength={100} />
      </label>
    </>
  )
}

// Shared by MyProfile.jsx (self-service) and EmployeeForm.jsx (admin) —
// renders the "Personal details" and "Address" panes. Date of Joining is
// deliberately NOT here - it's admin-set only (like Title/Manager), grouped
// with Photo/Mobile/Email in each form's own "Employee details" pane instead.
export default function PersonalDetailsFields({ value, onChange, cityOptions = [], basePath }) {
  const docs = usePersonalDocuments(basePath)
  const docsEnabled = Boolean(basePath)

  function set(field, fieldValue) {
    onChange({ ...value, [field]: fieldValue })
  }

  function toggleSameAsCurrent(checked) {
    onChange({ ...value, permanentSameAsCurrent: checked, permanentAddress: checked ? emptyAddress : value.permanentAddress })
  }

  return (
    <>
      <h3 className="form-section-title">Personal details</h3>
      {docs.error && <p className="form-error">{docs.error}</p>}
      <div className="form-row">
        <label className="form-field" style={{ flex: '0 0 auto', width: 160 }}>
          <span>Date of birth</span>
          <input type="date" value={value.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
        </label>
        <label className="form-field" style={{ flex: '0 0 auto', width: 110 }}>
          <span>Blood group</span>
          <select value={value.bloodGroup} onChange={(e) => set('bloodGroup', e.target.value)}>
            <option value="">— Select —</option>
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="form-hint" style={{ marginTop: 4, marginBottom: 16 }}>
        Documents: PDF, JPG, or PNG — up to 5MB each.
      </p>

      <IdentityField
        label="Aadhar card no."
        value={value.aadharNumber}
        onChange={(e) => set('aadharNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
        inputProps={{ inputMode: 'numeric', maxLength: 12 }}
        typeKey="aadhar"
        docs={docs}
        docsEnabled={docsEnabled}
      />
      <IdentityField
        label="PAN card no."
        value={value.panNumber}
        onChange={(e) => set('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
        inputProps={{ maxLength: 10 }}
        typeKey="pan"
        docs={docs}
        docsEnabled={docsEnabled}
      />
      <IdentityField
        label="Driving licence no."
        value={value.drivingLicenceNumber}
        onChange={(e) => set('drivingLicenceNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16))}
        inputProps={{ maxLength: 16 }}
        typeKey="driving-licence"
        docs={docs}
        docsEnabled={docsEnabled}
      />

      <h3 className="form-section-title">Current address</h3>
      <AddressFields value={value.currentAddress} onChange={(a) => set('currentAddress', a)} cityOptions={cityOptions} idPrefix="current-city-options" />

      <h3 className="form-section-title">Permanent address</h3>
      <label className="checkbox-item" style={{ marginBottom: 12 }}>
        <input type="checkbox" checked={value.permanentSameAsCurrent} onChange={(e) => toggleSameAsCurrent(e.target.checked)} />
        Same as current address
      </label>
      {!value.permanentSameAsCurrent && (
        <AddressFields
          value={value.permanentAddress}
          onChange={(a) => set('permanentAddress', a)}
          cityOptions={cityOptions}
          idPrefix="permanent-city-options"
        />
      )}
    </>
  )
}

export { DOCUMENT_TYPES }
