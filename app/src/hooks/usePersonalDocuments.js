import { useEffect, useState } from 'react'
import { apiFetch, downloadAuthedFile } from '../utils/api'

// Mirrors server/src/config/docsStorage.js's DOCUMENT_TYPES — key is what
// gets POSTed as `documentType`, dbValue is what the API returns it as.
export const DOCUMENT_TYPES = {
  aadhar: { dbValue: 'Aadhar', label: 'Aadhar Card' },
  pan: { dbValue: 'PAN', label: 'PAN Card' },
  'driving-licence': { dbValue: 'DrivingLicence', label: 'Driving Licence' },
}

// basePath: '/api/me/employee/documents' (self) or '/api/employees/:id/documents' (admin) —
// both expose the same {list, upload, download} shape (see me.js / employees.js).
// Shared by PersonalDetailsFields (inline Aadhar/PAN/DL/Experience Letter
// upload controls) so every form talks to the documents API the same way.
export default function usePersonalDocuments(basePath) {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadingKey, setUploadingKey] = useState(null)

  useEffect(() => {
    if (!basePath) return
    let cancelled = false
    setIsLoading(true)
    apiFetch(basePath)
      .then((data) => !cancelled && setDocuments(data))
      .catch((err) => !cancelled && setError(err.message || 'Could not load documents.'))
      .finally(() => !cancelled && setIsLoading(false))
    return () => {
      cancelled = true
    }
  }, [basePath])

  function documentFor(typeKey) {
    return documents.find((d) => d.documentType === DOCUMENT_TYPES[typeKey]?.dbValue)
  }

  async function upload(typeKey, file) {
    setUploadingKey(typeKey)
    setError('')
    try {
      const formData = new FormData()
      formData.append('documentType', typeKey)
      formData.append('file', file)
      const document = await apiFetch(basePath, { method: 'POST', body: formData })
      setDocuments((docs) => [...docs.filter((d) => d.documentType !== document.documentType), document])
    } catch (err) {
      setError(err.message || 'Could not upload that file.')
    } finally {
      setUploadingKey(null)
    }
  }

  async function download(doc) {
    setError('')
    try {
      // downloadFileName is the full on-disk name (empId_name_type_timestamp.ext) -
      // fileName is the simplified "<Type>.ext" shown on screen.
      await downloadAuthedFile(`${basePath}/${doc.id}/file`, doc.downloadFileName || doc.fileName)
    } catch (err) {
      setError(err.message || 'Could not download that file.')
    }
  }

  return { documentFor, upload, download, isLoading, uploadingKey, error }
}
