import { useRef, useState } from 'react'
import Icon from './Icon'
import { apiFetch, downloadAuthedFile } from '../utils/api'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Per-row document upload for Education/Experience entries. Unlike
// usePersonalDocuments (a type-keyed map shared across the whole form),
// each row here owns at most one file already embedded in the row itself
// (see fetchEducationByEmployee/fetchExperienceByEmployee in employees.js),
// so this just talks to `${basePath}/document`. basePath is undefined for a
// not-yet-saved row (no id yet to attach an upload to) - same "save first"
// gating as the identity documents.
export default function RowDocumentUpload({ basePath, doc, onUploaded }) {
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !basePath) return
    setUploading(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const document = await apiFetch(`${basePath}/document`, { method: 'POST', body: formData })
      onUploaded(document)
    } catch (err) {
      setError(err.message || 'Could not upload that file.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDownload() {
    setError('')
    try {
      await downloadAuthedFile(`${basePath}/document/file`, doc.downloadFileName || doc.fileName)
    } catch (err) {
      setError(err.message || 'Could not download that file.')
    }
  }

  if (!basePath) {
    return (
      <div className="form-field">
        <span>Document</span>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Save first to upload
        </p>
      </div>
    )
  }

  return (
    <div className="form-field">
      <span>Document</span>
      {doc ? (
        <p className="page-subtitle" style={{ margin: 0 }}>Uploaded {formatDate(doc.uploadedAt)}</p>
      ) : (
        <p className="page-subtitle" style={{ margin: 0 }}>Not uploaded yet</p>
      )}
      <div className="identity-field-actions">
        {doc && (
          <button type="button" className="btn-secondary" onClick={handleDownload}>
            <Icon name="external" size={14} /> View
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : doc ? 'Replace' : 'Upload'}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={handleFileChange} />
      </div>
      {error && (
        <p className="form-error" style={{ margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}
