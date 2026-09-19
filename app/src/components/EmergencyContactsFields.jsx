import { useState } from 'react'
import Icon from './Icon'
import PhoneInput from './PhoneInput'

export const MAX_EMERGENCY_CONTACTS = 3
const emptyContact = { name: '', relation: '', phone: '' }

const FIXED_RELATIONS = ['Family member', 'Friend', 'Relative']

// Fixed options + "Others", which reveals a free-text field for whatever
// isn't covered by the three broad categories. relation itself stays a
// single string (the custom text when "Others" is picked) - "Others mode"
// is tracked locally per row rather than as its own stored value, seeded
// once from whether the current relation is one of the three fixed options.
function RelationField({ value, onChange }) {
  const [othersMode, setOthersMode] = useState(() => value !== '' && !FIXED_RELATIONS.includes(value))
  const selectValue = othersMode ? 'Others' : value

  function handleSelectChange(selected) {
    if (selected === 'Others') {
      setOthersMode(true)
      onChange('')
    } else {
      setOthersMode(false)
      onChange(selected)
    }
  }

  return (
    <>
      <label className="form-field">
        <span>Relation</span>
        <select value={selectValue} onChange={(e) => handleSelectChange(e.target.value)}>
          <option value="">— Select —</option>
          {FIXED_RELATIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
          <option value="Others">Others</option>
        </select>
      </label>
      {othersMode && (
        <label className="form-field">
          <span>Specify relation</span>
          <input value={value} onChange={(e) => onChange(e.target.value)} />
        </label>
      )}
    </>
  )
}

// Always shows at least one row (blank if there's no data yet) so the
// primary contact never needs an extra "Add" click - a row left blank is
// silently dropped server-side (see replaceEmergencyContacts), so there's
// no risk of saving an empty entry.
export default function EmergencyContactsFields({ contacts, onChange }) {
  const list = contacts.length ? contacts : [emptyContact]

  function updateAt(index, patch) {
    onChange(list.map((c, i) => (i === index ? { ...c, ...patch } : c)))
  }

  function addRow() {
    if (list.length >= MAX_EMERGENCY_CONTACTS) return
    onChange([...list, { ...emptyContact }])
  }

  function removeRow(index) {
    onChange(list.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="admin-header-row">
        <h3 className="form-section-title" style={{ margin: 0 }}>
          Emergency contact
        </h3>
        {list.length < MAX_EMERGENCY_CONTACTS && (
          <button type="button" className="btn-create" onClick={addRow}>
            <Icon name="plus" size={14} /> Add contact
          </button>
        )}
      </div>
      {list.map((contact, index) => (
        <div key={index} className="form-row form-row-3 repeatable-row">
          <label className="form-field">
            <span>Name</span>
            <input value={contact.name} onChange={(e) => updateAt(index, { name: e.target.value })} />
          </label>
          <RelationField value={contact.relation} onChange={(v) => updateAt(index, { relation: v })} />
          <PhoneInput label="Phone" value={contact.phone} onChange={(v) => updateAt(index, { phone: v })} />
          {list.length > 1 && (
            <button type="button" className="btn-secondary repeatable-row-remove" onClick={() => removeRow(index)} aria-label="Remove this contact">
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}
    </>
  )
}
