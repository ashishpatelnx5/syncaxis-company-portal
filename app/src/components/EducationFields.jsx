import Icon from './Icon'
import RowDocumentUpload from './RowDocumentUpload'

const emptyEntry = { education: '', institution: '', stream: '', yearOfPassing: '' }

// Unbounded add-a-row list (unlike Emergency Contact/Family Details) - no
// max here, per how this was scoped. basePath is the admin/self education
// collection URL (e.g. '/api/me/employee/education' or
// '/api/employees/:id/education'), undefined for a not-yet-saved employee -
// each row's own '${basePath}/${row.id}' is what RowDocumentUpload attaches
// its upload/download calls to, so a row needs a saved id before it applies.
export default function EducationFields({ entries, onChange, basePath }) {
  const list = entries.length ? entries : [emptyEntry]

  function updateAt(index, patch) {
    onChange(list.map((e, i) => (i === index ? { ...e, ...patch } : e)))
  }

  function addRow() {
    onChange([...list, { ...emptyEntry }])
  }

  function removeRow(index) {
    onChange(list.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="admin-header-row">
        <h3 className="form-section-title" style={{ margin: 0 }}>
          Education details
        </h3>
        <button type="button" className="btn-create" onClick={addRow}>
          <Icon name="plus" size={14} /> Add education
        </button>
      </div>
      {list.map((entry, index) => (
        <div key={index} className="form-row form-row-3 repeatable-row">
          <label className="form-field">
            <span>Education</span>
            <input value={entry.education} onChange={(e) => updateAt(index, { education: e.target.value })} placeholder="e.g. B.Tech, 12th" />
          </label>
          <label className="form-field">
            <span>Institution</span>
            <input value={entry.institution} onChange={(e) => updateAt(index, { institution: e.target.value })} />
          </label>
          <label className="form-field">
            <span>Stream</span>
            <input value={entry.stream} onChange={(e) => updateAt(index, { stream: e.target.value })} />
          </label>
          <label className="form-field" style={{ flex: '0 0 auto', width: 130 }}>
            <span>Year of passing</span>
            <input
              value={entry.yearOfPassing}
              onChange={(e) => updateAt(index, { yearOfPassing: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              inputMode="numeric"
              maxLength={4}
            />
          </label>
          <RowDocumentUpload
            basePath={entry.id && basePath ? `${basePath}/${entry.id}` : undefined}
            doc={entry.document}
            onUploaded={(document) => updateAt(index, { document })}
          />
          {list.length > 1 && (
            <button type="button" className="btn-secondary repeatable-row-remove" onClick={() => removeRow(index)} aria-label="Remove this education entry">
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}
    </>
  )
}
