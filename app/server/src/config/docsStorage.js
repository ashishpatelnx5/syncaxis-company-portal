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

export function sanitizeForFilename(value) {
  return String(value || '').replace(/[^a-zA-Z0-9]+/g, '') || 'x'
}

// <MountLoc>\CompanyPortal\EmployeePersonalDetails\<EmployeeId>\
export function employeeDocsDir(employeeId) {
  return path.join(env.docsMountPath, 'CompanyPortal', 'EmployeePersonalDetails', String(employeeId))
}

// <EmployeeId>_<EmployeeName>_<DocumentName>.<ext> — deliberately no
// timestamp: each employee+document-type is a single slot (Doc ID is unique
// per employee/type), not a history, so a re-upload replaces the file at
// this same name rather than accumulating one per upload (see
// saveEmployeeDocument, which deletes whatever was there first - covers an
// extension change too, e.g. replacing a .pdf with a .jpg).
export function buildDocumentFileName(employeeId, employeeName, documentTypeKey, extension) {
  const docLabel = DOCUMENT_TYPES[documentTypeKey]?.dbValue || documentTypeKey
  return `${employeeId}_${sanitizeForFilename(employeeName)}_${docLabel}${extension}`
}

// <EmployeeId>_<EmployeeName>_<Label>-<RowId>.<ext> — for the one-document-
// per-row attachments on Education/Experience entries (see saveRowDocument
// in routes/employees.js), where a fixed DocumentType key doesn't apply
// since there can be any number of rows. The row id keeps each entry's file
// distinct without a timestamp.
export function buildRowDocumentFileName(employeeId, employeeName, label, rowId, extension) {
  return `${employeeId}_${sanitizeForFilename(employeeName)}_${label}-${rowId}${extension}`
}
