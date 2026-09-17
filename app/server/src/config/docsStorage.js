import path from 'path'
import { env } from './env.js'

// key (used in the API/URL) -> { dbValue (portal.EmployeeDocuments.DocumentType), label }
export const DOCUMENT_TYPES = {
  aadhar: { dbValue: 'Aadhar', label: 'Aadhar Card' },
  pan: { dbValue: 'PAN', label: 'PAN Card' },
  'driving-licence': { dbValue: 'DrivingLicence', label: 'Driving Licence' },
  // Not user-facing in the documents list - written automatically alongside
  // the existing PhotoUrl column whenever a profile photo is saved (see
  // archivePhotoToFile in routes/employees.js), so the photo also has a
  // file-system copy in the same place as the other personal documents.
  photo: { dbValue: 'Photo', label: 'Photo' },
}

export const ALLOWED_EXTENSIONS = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

function sanitizeForFilename(value) {
  return String(value || '').replace(/[^a-zA-Z0-9]+/g, '') || 'x'
}

function timestamp() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

// <MountLoc>\CompanyPortal\EmployeePersonalDetails\<EmployeeId>\
export function employeeDocsDir(employeeId) {
  return path.join(env.docsMountPath, 'CompanyPortal', 'EmployeePersonalDetails', String(employeeId))
}

// <EmployeeId>_<EmployeeName>_<DocumentName>_<YYYYMMDDHHMMSS>[_n].<ext> — the
// optional _n only appears if that exact filename (same employee/type/second)
// is already taken, so a rapid double-submit still can't silently overwrite
// an existing upload.
export function buildDocumentFileName(employeeId, employeeName, documentTypeKey, extension, disambiguator) {
  const docLabel = DOCUMENT_TYPES[documentTypeKey]?.dbValue || documentTypeKey
  const suffix = disambiguator ? `_${disambiguator}` : ''
  return `${employeeId}_${sanitizeForFilename(employeeName)}_${docLabel}_${timestamp()}${suffix}${extension}`
}
