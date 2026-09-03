import { useState } from 'react'
import Icon from './Icon'
import { useDepartments } from '../context/useDepartments'

export default function DepartmentForm({ department, onClose }) {
  const { addDepartment, updateDepartment } = useDepartments()
  const isNew = department == null
  const [name, setName] = useState(department?.name ?? '')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (isNew) {
      addDepartment({ name: name.trim() })
    } else {
      updateDepartment(department.id, { name: name.trim() })
    }
    onClose()
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <form className="modal-panel modal-panel-narrow" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{isNew ? 'Add department' : `Edit ${department.name}`}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body">
          <label className="form-field">
            <span>Name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isNew ? 'Add department' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
