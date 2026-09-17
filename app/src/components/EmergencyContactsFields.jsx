import Icon from './Icon'
import PhoneInput from './PhoneInput'

export const MAX_EMERGENCY_CONTACTS = 3
const emptyContact = { name: '', relation: '', phone: '' }

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
          <button type="button" className="btn-secondary" onClick={addRow}>
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
          <label className="form-field">
            <span>Relation</span>
            <input value={contact.relation} onChange={(e) => updateAt(index, { relation: e.target.value })} />
          </label>
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
