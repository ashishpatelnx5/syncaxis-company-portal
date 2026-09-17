import Icon from './Icon'
import RowDocumentUpload from './RowDocumentUpload'

const emptyEntry = { companyName: '', designation: '', startDate: '', endDate: '' }

// Unbounded add-a-row list (unlike Emergency Contact/Family Details) - no
// max here, per how this was scoped. basePath is the admin/self experience
// collection URL (e.g. '/api/me/employee/experience' or
// '/api/employees/:id/experience'), undefined for a not-yet-saved employee -
// each row's own '${basePath}/${row.id}' is what RowDocumentUpload attaches
// its upload/download calls to, so a row needs a saved id before it applies.
export default function ExperienceFields({ entries, onChange, basePath }) {
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
          Professional experience
        </h3>
        <button type="button" className="btn-secondary" onClick={addRow}>
          <Icon name="plus" size={14} /> Add experience
        </button>
      </div>
      {list.map((entry, index) => (
        <div key={index} className="form-row form-row-3 repeatable-row">
          <label className="form-field">
            <span>Company name</span>
            <input value={entry.companyName} onChange={(e) => updateAt(index, { companyName: e.target.value })} />
          </label>
          <label className="form-field">
            <span>Designation</span>
            <input value={entry.designation} onChange={(e) => updateAt(index, { designation: e.target.value })} />
          </label>
          <label className="form-field" style={{ flex: '0 0 auto', width: 160 }}>
            <span>Start date</span>
            <input type="date" value={entry.startDate} onChange={(e) => updateAt(index, { startDate: e.target.value })} />
          </label>
          <label className="form-field" style={{ flex: '0 0 auto', width: 160 }}>
            <span>End date</span>
            <input type="date" value={entry.endDate} onChange={(e) => updateAt(index, { endDate: e.target.value })} />
          </label>
          <RowDocumentUpload
            basePath={entry.id && basePath ? `${basePath}/${entry.id}` : undefined}
            doc={entry.document}
            onUploaded={(document) => updateAt(index, { document })}
          />
          {list.length > 1 && (
            <button type="button" className="btn-secondary repeatable-row-remove" onClick={() => removeRow(index)} aria-label="Remove this experience entry">
              <Icon name="trash" size={14} />
            </button>
          )}
        </div>
      ))}
    </>
  )
}
