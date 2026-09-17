import Icon from './Icon'
import { FAMILY_RELATIONS } from '../data/familyRelations'

export const MAX_FAMILY_MEMBERS = 6
const emptyMember = { name: '', relation: '', contactNo: '' }

export default function FamilyDetailsFields({ members, onChange }) {
  const list = members.length ? members : [emptyMember]

  function updateAt(index, patch) {
    onChange(list.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function addRow() {
    if (list.length >= MAX_FAMILY_MEMBERS) return
    onChange([...list, { ...emptyMember }])
  }

  function removeRow(index) {
    onChange(list.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="admin-header-row">
        <h3 className="form-section-title" style={{ margin: 0 }}>
          Family details
        </h3>
        {list.length < MAX_FAMILY_MEMBERS && (
          <button type="button" className="btn-secondary" onClick={addRow}>
            <Icon name="plus" size={14} /> Add family member
          </button>
        )}
      </div>
      {list.map((member, index) => (
        <div key={index} className="form-row form-row-3 repeatable-row">
          <label className="form-field">
            <span>Name</span>
            <input value={member.name} onChange={(e) => updateAt(index, { name: e.target.value })} />
          </label>
          <label className="form-field">
            <span>Relation</span>
            <select value={member.relation} onChange={(e) => updateAt(index, { relation: e.target.value })}>
              <option value="">— Select —</option>
              {FAMILY_RELATIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Contact no.</span>
            <input
              value={member.contactNo}
              onChange={(e) => updateAt(index, { contactNo: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              inputMode="numeric"
              maxLength={10}
            />
          </label>
          {list.length > 1 && (
            <button type="button" className="btn-secondary repeatable-row-remove" onClick={() => removeRow(index)} aria-label="Remove this family member">
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}
    </>
  )
}
