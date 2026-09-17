import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { ALLOWED_EXTENSIONS, DOCUMENT_TYPES, MAX_FILE_SIZE_BYTES, buildDocumentFileName, employeeDocsDir } from '../config/docsStorage.js'

const router = Router()
router.use(requireAuth)
const requireAdminEmployees = requirePermission('page', 'admin-employees')
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } })

function toAddress(row, prefix) {
  return {
    line1: row[`${prefix}AddressLine1`] || '',
    line2: row[`${prefix}AddressLine2`] || '',
    city: row[`${prefix}City`] || '',
    state: row[`${prefix}State`] || '',
    pincode: row[`${prefix}Pincode`] || '',
    landmark: row[`${prefix}Landmark`] || '',
  }
}

// Every *ByEmployee lookup defaults to an empty Map, so a caller that only
// has some of them (shouldn't happen, but keeps this from throwing) just
// gets empty lists for the rest rather than crashing.
export function toEmployee(
  row,
  {
    departmentIdsByEmployee = new Map(),
    emergencyContactsByEmployee = new Map(),
    familyMembersByEmployee = new Map(),
    educationByEmployee = new Map(),
    experienceByEmployee = new Map(),
  } = {},
) {
  const currentAddress = toAddress(row, 'Current')
  const permanentSameAsCurrent = Boolean(row.PermanentSameAsCurrent)
  return {
    id: row.EmployeeId,
    employeeId: row.EmployeeCode || '',
    name: row.Name,
    photo: row.PhotoUrl || '',
    title: row.Title || '',
    departmentIds: departmentIdsByEmployee.get(row.EmployeeId) || [],
    email: row.Email || '',
    phone: row.Phone || '',
    // Up to MAX_EMERGENCY_CONTACTS/MAX_FAMILY_MEMBERS entries each, unbounded
    // for education/experience - see portal.EmployeeEmergencyContacts /
    // EmployeeFamilyMembers (migration 20) / EmployeeEducation /
    // EmployeeExperience (migration 21). The old flat EmergencyContact*
    // columns on this row are no longer read.
    emergencyContacts: emergencyContactsByEmployee.get(row.EmployeeId) || [],
    familyMembers: familyMembersByEmployee.get(row.EmployeeId) || [],
    education: educationByEmployee.get(row.EmployeeId) || [],
    experience: experienceByEmployee.get(row.EmployeeId) || [],
    managerId: row.ManagerId,
    jobDescriptionId: row.JobDescriptionId,
    dateOfBirth: row.DateOfBirth ? row.DateOfBirth.toISOString().slice(0, 10) : '',
    dateOfJoining: row.DateOfJoining ? row.DateOfJoining.toISOString().slice(0, 10) : '',
    aadharNumber: row.AadharNumber || '',
    panNumber: row.PanNumber || '',
    drivingLicenceNumber: row.DrivingLicenceNumber || '',
    bloodGroup: row.BloodGroup || '',
    currentAddress,
    // Permanent* columns are left NULL when the flag is set (see
    // bindPersonalDetailInputs) - derive the displayed value from
    // currentAddress instead of a possibly-stale duplicate.
    permanentAddress: permanentSameAsCurrent ? currentAddress : toAddress(row, 'Permanent'),
    permanentSameAsCurrent,
  }
}

// Wraps a single employee's already-known child-list values as the
// {xByEmployee: Map} shape toEmployee() expects, for the POST/PUT/me.js
// routes that just saved one employee and already have the fresh lists in
// hand (no need to re-query everyone like GET '/' does).
export function singleEmployeeLookups(employeeId, { departmentIds, emergencyContacts, familyMembers, education, experience }) {
  return {
    departmentIdsByEmployee: new Map([[employeeId, departmentIds || []]]),
    emergencyContactsByEmployee: new Map([[employeeId, emergencyContacts || []]]),
    familyMembersByEmployee: new Map([[employeeId, familyMembers || []]]),
    educationByEmployee: new Map([[employeeId, education || []]]),
    experienceByEmployee: new Map([[employeeId, experience || []]]),
  }
}

export function toEmployeeDocument(row) {
  return {
    id: row.EmployeeDocumentId,
    documentType: row.DocumentType,
    fileName: row.OriginalFileName || row.FileName,
    contentType: row.ContentType || '',
    fileSizeBytes: row.FileSizeBytes,
    uploadedAt: row.UploadedAt,
  }
}

// Latest row per DocumentType for this employee — EmployeeDocuments is
// insert-only (see database/18_add_employee_personal_details.sql), so
// "current" just means most recent.
export async function listEmployeeDocuments(pool, employeeId) {
  const result = await pool.request().input('employeeId', sql.Int, employeeId).query(`
    ;WITH Ranked AS (
      SELECT *, ROW_NUMBER() OVER (PARTITION BY DocumentType ORDER BY UploadedAt DESC, EmployeeDocumentId DESC) AS rn
      FROM portal.EmployeeDocuments WHERE EmployeeId = @employeeId
    )
    SELECT * FROM Ranked WHERE rn = 1 ORDER BY DocumentType
  `)
  return result.recordset.map(toEmployeeDocument)
}

async function fileExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

// Shared by the self-service (me.js) and admin (below) upload routes.
export async function saveEmployeeDocument({ employeeId, employeeName, documentTypeKey, file, uploadedByUserId }) {
  const typeDef = DOCUMENT_TYPES[documentTypeKey]
  if (!typeDef) return { error: 'Unknown document type.' }
  if (!file) return { error: 'No file was uploaded.' }
  const ext = path.extname(file.originalname).toLowerCase()
  if (!ALLOWED_EXTENSIONS[ext]) return { error: 'Only PDF, JPG, and PNG files are allowed.' }

  const dir = employeeDocsDir(employeeId)
  await fs.mkdir(dir, { recursive: true })

  let disambiguator = 0
  let fileName = buildDocumentFileName(employeeId, employeeName, documentTypeKey, ext)
  let fullPath = path.join(dir, fileName)
  while (await fileExists(fullPath)) {
    disambiguator += 1
    fileName = buildDocumentFileName(employeeId, employeeName, documentTypeKey, ext, disambiguator)
    fullPath = path.join(dir, fileName)
  }
  await fs.writeFile(fullPath, file.buffer)

  const relativePath = ['CompanyPortal', 'EmployeePersonalDetails', String(employeeId), fileName].join('/')
  const pool = await getPool()
  const result = await pool
    .request()
    .input('employeeId', sql.Int, employeeId)
    .input('documentType', sql.NVarChar(30), typeDef.dbValue)
    .input('fileName', sql.NVarChar(300), fileName)
    .input('filePath', sql.NVarChar(500), relativePath)
    .input('originalFileName', sql.NVarChar(300), file.originalname)
    .input('contentType', sql.NVarChar(100), file.mimetype)
    .input('fileSizeBytes', sql.Int, file.size)
    .input('uploadedByUserId', sql.Int, uploadedByUserId ?? null).query(`
      INSERT INTO portal.EmployeeDocuments
        (EmployeeId, DocumentType, FileName, FilePath, OriginalFileName, ContentType, FileSizeBytes, UploadedByUserId)
      VALUES
        (@employeeId, @documentType, @fileName, @filePath, @originalFileName, @contentType, @fileSizeBytes, @uploadedByUserId);
      SELECT CAST(SCOPE_IDENTITY() AS INT) AS EmployeeDocumentId;
    `)

  const selectResult = await pool
    .request()
    .input('id', sql.Int, result.recordset[0].EmployeeDocumentId)
    .query('SELECT * FROM portal.EmployeeDocuments WHERE EmployeeDocumentId = @id')
  return { document: toEmployeeDocument(selectResult.recordset[0]) }
}

// The photo itself still round-trips as a data URL in the API/DB (PhotoUrl) -
// changing that would mean every avatar everywhere in the app fetching its
// image via an authenticated request instead of a plain <img src>, a much
// bigger change than asked for. This just ALSO writes a same-convention copy
// to disk (via saveEmployeeDocument, DocumentType 'Photo') whenever a new
// photo is saved, so it's archived on the file system like the other
// personal documents. Best-effort: a disk hiccup here must never fail the
// employee save itself.
export async function archivePhotoToFile({ employeeId, employeeName, photoDataUrl, uploadedByUserId }) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(photoDataUrl || '')
  if (!match) return
  const [, mimetype, base64] = match
  const ext = mimetype === 'image/png' ? '.png' : '.jpg'
  const buffer = Buffer.from(base64, 'base64')
  try {
    await saveEmployeeDocument({
      employeeId,
      employeeName,
      documentTypeKey: 'photo',
      file: { buffer, size: buffer.length, mimetype, originalname: `photo${ext}` },
      uploadedByUserId,
    })
  } catch (err) {
    console.error(`Could not archive photo to disk for employee ${employeeId}:`, err)
  }
}

export { upload }

// Shared by every route that writes the personal-details block (admin
// POST/PUT below, and the self-service PUT in me.js). `includeDateOfJoining`
// is false for the self-service path — DateOfJoining is admin-set only, same
// as Title/ManagerId/JobDescriptionId (see MyProfile.jsx's own note on this).
// When permanentSameAsCurrent is true, the Permanent* columns are left NULL
// rather than duplicating the current address - toEmployee() derives the
// displayed permanent address from currentAddress in that case, so there's
// one source of truth instead of two copies that can drift apart.
export function bindPersonalDetailInputs(request, body, { includeDateOfJoining }) {
  const currentAddress = body.currentAddress || {}
  const sameAsCurrent = Boolean(body.permanentSameAsCurrent)
  const permanentAddress = sameAsCurrent ? {} : body.permanentAddress || {}

  request
    .input('dateOfBirth', sql.Date, body.dateOfBirth || null)
    .input('aadharNumber', sql.NVarChar(20), body.aadharNumber || null)
    .input('panNumber', sql.NVarChar(10), body.panNumber || null)
    .input('drivingLicenceNumber', sql.NVarChar(30), body.drivingLicenceNumber || null)
    .input('bloodGroup', sql.NVarChar(5), body.bloodGroup || null)
    .input('currentAddressLine1', sql.NVarChar(200), currentAddress.line1 || null)
    .input('currentAddressLine2', sql.NVarChar(200), currentAddress.line2 || null)
    .input('currentCity', sql.NVarChar(100), currentAddress.city || null)
    .input('currentState', sql.NVarChar(100), currentAddress.state || null)
    .input('currentPincode', sql.NVarChar(6), currentAddress.pincode || null)
    .input('currentLandmark', sql.NVarChar(200), currentAddress.landmark || null)
    .input('permanentAddressLine1', sql.NVarChar(200), permanentAddress.line1 || null)
    .input('permanentAddressLine2', sql.NVarChar(200), permanentAddress.line2 || null)
    .input('permanentCity', sql.NVarChar(100), permanentAddress.city || null)
    .input('permanentState', sql.NVarChar(100), permanentAddress.state || null)
    .input('permanentPincode', sql.NVarChar(6), permanentAddress.pincode || null)
    .input('permanentLandmark', sql.NVarChar(200), permanentAddress.landmark || null)
    .input('permanentSameAsCurrent', sql.Bit, sameAsCurrent)

  if (includeDateOfJoining) request.input('dateOfJoining', sql.Date, body.dateOfJoining || null)
  return request
}

const PERSONAL_DETAIL_SET_CLAUSE = `
  DateOfBirth = @dateOfBirth, AadharNumber = @aadharNumber, PanNumber = @panNumber, DrivingLicenceNumber = @drivingLicenceNumber, BloodGroup = @bloodGroup,
  CurrentAddressLine1 = @currentAddressLine1, CurrentAddressLine2 = @currentAddressLine2, CurrentCity = @currentCity,
  CurrentState = @currentState, CurrentPincode = @currentPincode, CurrentLandmark = @currentLandmark,
  PermanentAddressLine1 = @permanentAddressLine1, PermanentAddressLine2 = @permanentAddressLine2, PermanentCity = @permanentCity,
  PermanentState = @permanentState, PermanentPincode = @permanentPincode, PermanentLandmark = @permanentLandmark,
  PermanentSameAsCurrent = @permanentSameAsCurrent
`
export const SELF_SERVICE_PERSONAL_DETAIL_SET_CLAUSE = PERSONAL_DETAIL_SET_CLAUSE
const ADMIN_PERSONAL_DETAIL_SET_CLAUSE = `${PERSONAL_DETAIL_SET_CLAUSE}, DateOfJoining = @dateOfJoining`
const ADMIN_PERSONAL_DETAIL_INSERT_COLUMNS =
  'DateOfBirth, DateOfJoining, AadharNumber, PanNumber, DrivingLicenceNumber, BloodGroup, CurrentAddressLine1, CurrentAddressLine2, CurrentCity, CurrentState, CurrentPincode, CurrentLandmark, PermanentAddressLine1, PermanentAddressLine2, PermanentCity, PermanentState, PermanentPincode, PermanentLandmark, PermanentSameAsCurrent'
const ADMIN_PERSONAL_DETAIL_INSERT_VALUES =
  '@dateOfBirth, @dateOfJoining, @aadharNumber, @panNumber, @drivingLicenceNumber, @bloodGroup, @currentAddressLine1, @currentAddressLine2, @currentCity, @currentState, @currentPincode, @currentLandmark, @permanentAddressLine1, @permanentAddressLine2, @permanentCity, @permanentState, @permanentPincode, @permanentLandmark, @permanentSameAsCurrent'

// Empty-string codes would collide under the UNIQUE constraint (unlike NULL,
// which SQL Server allows to repeat), so normalize "no code" to NULL.
function normalizeCode(employeeId) {
  const trimmed = (employeeId || '').trim()
  return trimmed || null
}

export async function fetchDepartmentIdsByEmployee(pool) {
  const result = await pool.request().query('SELECT EmployeeId, DepartmentId FROM portal.EmployeeDepartments')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.EmployeeId)) map.set(row.EmployeeId, [])
    map.get(row.EmployeeId).push(row.DepartmentId)
  }
  return map
}

async function replaceDepartments(transaction, employeeId, departmentIds) {
  const request = new sql.Request(transaction)
  await request.input('employeeId', sql.Int, employeeId).query('DELETE FROM portal.EmployeeDepartments WHERE EmployeeId = @employeeId')
  for (const departmentId of departmentIds || []) {
    await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('departmentId', sql.Int, departmentId)
      .query('INSERT INTO portal.EmployeeDepartments (EmployeeId, DepartmentId) VALUES (@employeeId, @departmentId)')
  }
}

const MAX_EMERGENCY_CONTACTS = 3
const MAX_FAMILY_MEMBERS = 6

export async function fetchEmergencyContactsByEmployee(pool) {
  const result = await pool.request().query('SELECT EmployeeId, Name, Relation, Phone FROM portal.EmployeeEmergencyContacts ORDER BY EmployeeId, SortOrder')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.EmployeeId)) map.set(row.EmployeeId, [])
    map.get(row.EmployeeId).push({ name: row.Name, relation: row.Relation || '', phone: row.Phone || '' })
  }
  return map
}

export async function fetchFamilyMembersByEmployee(pool) {
  const result = await pool.request().query('SELECT EmployeeId, Name, Relation, ContactNo FROM portal.EmployeeFamilyMembers ORDER BY EmployeeId, SortOrder')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.EmployeeId)) map.set(row.EmployeeId, [])
    map.get(row.EmployeeId).push({ name: row.Name, relation: row.Relation || '', contactNo: row.ContactNo || '' })
  }
  return map
}

// Same delete-then-reinsert pattern as replaceDepartments - simplest way to
// keep SortOrder consistent with array order without diffing. Silently
// drops nameless rows and anything past the max, rather than erroring, so a
// client-side bug in the add/remove UI can't corrupt data beyond the cap.
export async function replaceEmergencyContacts(transaction, employeeId, contacts) {
  await new sql.Request(transaction).input('employeeId', sql.Int, employeeId).query('DELETE FROM portal.EmployeeEmergencyContacts WHERE EmployeeId = @employeeId')
  const list = (contacts || []).filter((c) => c?.name?.trim()).slice(0, MAX_EMERGENCY_CONTACTS)
  for (let i = 0; i < list.length; i++) {
    await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('name', sql.NVarChar(200), list[i].name.trim())
      .input('relation', sql.NVarChar(100), list[i].relation || null)
      .input('phone', sql.NVarChar(50), list[i].phone || null)
      .input('sortOrder', sql.Int, i)
      .query('INSERT INTO portal.EmployeeEmergencyContacts (EmployeeId, Name, Relation, Phone, SortOrder) VALUES (@employeeId, @name, @relation, @phone, @sortOrder)')
  }
  return list.map((c) => ({ name: c.name.trim(), relation: c.relation || '', phone: c.phone || '' }))
}

export async function replaceFamilyMembers(transaction, employeeId, members) {
  await new sql.Request(transaction).input('employeeId', sql.Int, employeeId).query('DELETE FROM portal.EmployeeFamilyMembers WHERE EmployeeId = @employeeId')
  const list = (members || []).filter((m) => m?.name?.trim()).slice(0, MAX_FAMILY_MEMBERS)
  for (let i = 0; i < list.length; i++) {
    await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('name', sql.NVarChar(200), list[i].name.trim())
      .input('relation', sql.NVarChar(50), list[i].relation || null)
      .input('contactNo', sql.NVarChar(50), list[i].contactNo || null)
      .input('sortOrder', sql.Int, i)
      .query('INSERT INTO portal.EmployeeFamilyMembers (EmployeeId, Name, Relation, ContactNo, SortOrder) VALUES (@employeeId, @name, @relation, @contactNo, @sortOrder)')
  }
  return list.map((m) => ({ name: m.name.trim(), relation: m.relation || '', contactNo: m.contactNo || '' }))
}

// Education/Experience are unbounded add-a-row lists (unlike Emergency
// Contact/Family Details, which cap at 3/6) - no slice() here.

export async function fetchEducationByEmployee(pool) {
  const result = await pool.request().query('SELECT EmployeeId, Education, Institution, Stream, YearOfPassing FROM portal.EmployeeEducation ORDER BY EmployeeId, SortOrder')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.EmployeeId)) map.set(row.EmployeeId, [])
    map.get(row.EmployeeId).push({
      education: row.Education,
      institution: row.Institution || '',
      stream: row.Stream || '',
      yearOfPassing: row.YearOfPassing || '',
    })
  }
  return map
}

export async function fetchExperienceByEmployee(pool) {
  const result = await pool.request().query('SELECT EmployeeId, CompanyName, Designation, StartDate, EndDate FROM portal.EmployeeExperience ORDER BY EmployeeId, SortOrder')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.EmployeeId)) map.set(row.EmployeeId, [])
    map.get(row.EmployeeId).push({
      companyName: row.CompanyName,
      designation: row.Designation || '',
      startDate: row.StartDate ? row.StartDate.toISOString().slice(0, 10) : '',
      endDate: row.EndDate ? row.EndDate.toISOString().slice(0, 10) : '',
    })
  }
  return map
}

export async function replaceEducation(transaction, employeeId, entries) {
  await new sql.Request(transaction).input('employeeId', sql.Int, employeeId).query('DELETE FROM portal.EmployeeEducation WHERE EmployeeId = @employeeId')
  const list = (entries || []).filter((e) => e?.education?.trim())
  for (let i = 0; i < list.length; i++) {
    await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('education', sql.NVarChar(200), list[i].education.trim())
      .input('institution', sql.NVarChar(200), list[i].institution || null)
      .input('stream', sql.NVarChar(200), list[i].stream || null)
      .input('yearOfPassing', sql.NVarChar(4), list[i].yearOfPassing || null)
      .input('sortOrder', sql.Int, i)
      .query(
        'INSERT INTO portal.EmployeeEducation (EmployeeId, Education, Institution, Stream, YearOfPassing, SortOrder) VALUES (@employeeId, @education, @institution, @stream, @yearOfPassing, @sortOrder)',
      )
  }
  return list.map((e) => ({ education: e.education.trim(), institution: e.institution || '', stream: e.stream || '', yearOfPassing: e.yearOfPassing || '' }))
}

export async function replaceExperience(transaction, employeeId, entries) {
  await new sql.Request(transaction).input('employeeId', sql.Int, employeeId).query('DELETE FROM portal.EmployeeExperience WHERE EmployeeId = @employeeId')
  const list = (entries || []).filter((e) => e?.companyName?.trim())
  for (let i = 0; i < list.length; i++) {
    await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('companyName', sql.NVarChar(200), list[i].companyName.trim())
      .input('designation', sql.NVarChar(200), list[i].designation || null)
      .input('startDate', sql.Date, list[i].startDate || null)
      .input('endDate', sql.Date, list[i].endDate || null)
      .input('sortOrder', sql.Int, i)
      .query(
        'INSERT INTO portal.EmployeeExperience (EmployeeId, CompanyName, Designation, StartDate, EndDate, SortOrder) VALUES (@employeeId, @companyName, @designation, @startDate, @endDate, @sortOrder)',
      )
  }
  return list.map((e) => ({ companyName: e.companyName.trim(), designation: e.designation || '', startDate: e.startDate || '', endDate: e.endDate || '' }))
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [employeesResult, departmentIdsByEmployee, emergencyContactsByEmployee, familyMembersByEmployee, educationByEmployee, experienceByEmployee] =
      await Promise.all([
        pool.request().query('SELECT * FROM portal.Employees'),
        fetchDepartmentIdsByEmployee(pool),
        fetchEmergencyContactsByEmployee(pool),
        fetchFamilyMembersByEmployee(pool),
        fetchEducationByEmployee(pool),
        fetchExperienceByEmployee(pool),
      ])
    res.json(
      employeesResult.recordset.map((row) =>
        toEmployee(row, { departmentIdsByEmployee, emergencyContactsByEmployee, familyMembersByEmployee, educationByEmployee, experienceByEmployee }),
      ),
    )
  } catch (err) {
    next(err)
  }
})

router.post('/', requireAdminEmployees, async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    if (!body.name?.trim()) return res.status(400).json({ error: 'Name is required.' })

    await transaction.begin()
    const insertRequest = new sql.Request(transaction)
      .input('employeeCode', sql.NVarChar(20), normalizeCode(body.employeeId))
      .input('name', sql.NVarChar(200), body.name.trim())
      .input('title', sql.NVarChar(200), body.title || null)
      .input('email', sql.NVarChar(256), body.email || null)
      .input('phone', sql.NVarChar(50), body.phone || null)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
      .input('managerId', sql.Int, body.managerId ?? null)
      .input('jobDescriptionId', sql.Int, body.jobDescriptionId ?? null)
    bindPersonalDetailInputs(insertRequest, body, { includeDateOfJoining: true })
    // No OUTPUT clause — portal.Employees has an UpdatedAt trigger, and SQL
    // Server disallows OUTPUT INSERTED/DELETED without INTO on a table with
    // any enabled trigger. Fetch the row separately instead.
    const insertResult = await insertRequest.query(`
        INSERT INTO portal.Employees
          (EmployeeCode, Name, Title, Email, Phone, PhotoUrl, ManagerId, JobDescriptionId, ${ADMIN_PERSONAL_DETAIL_INSERT_COLUMNS})
        VALUES
          (@employeeCode, @name, @title, @email, @phone, @photoUrl, @managerId, @jobDescriptionId, ${ADMIN_PERSONAL_DETAIL_INSERT_VALUES});
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS EmployeeId;
      `)

    const selectResult = await new sql.Request(transaction)
      .input('id', sql.Int, insertResult.recordset[0].EmployeeId)
      .query('SELECT * FROM portal.Employees WHERE EmployeeId = @id')
    const row = selectResult.recordset[0]
    await replaceDepartments(transaction, row.EmployeeId, body.departmentIds)
    const emergencyContacts = await replaceEmergencyContacts(transaction, row.EmployeeId, body.emergencyContacts)
    const familyMembers = await replaceFamilyMembers(transaction, row.EmployeeId, body.familyMembers)
    const education = await replaceEducation(transaction, row.EmployeeId, body.education)
    const experience = await replaceExperience(transaction, row.EmployeeId, body.experience)
    await transaction.commit()

    await archivePhotoToFile({ employeeId: row.EmployeeId, employeeName: row.Name, photoDataUrl: body.photo, uploadedByUserId: req.user.sub })
    res.status(201).json(
      toEmployee(row, singleEmployeeLookups(row.EmployeeId, { departmentIds: body.departmentIds, emergencyContacts, familyMembers, education, experience })),
    )
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That employee ID is already in use.' })
    next(err)
  }
})

router.put('/:id', requireAdminEmployees, async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    if (!body.name?.trim()) return res.status(400).json({ error: 'Name is required.' })

    const previousPhotoResult = await pool.request().input('id', sql.Int, id).query('SELECT PhotoUrl FROM portal.Employees WHERE EmployeeId = @id')
    const previousPhoto = previousPhotoResult.recordset[0]?.PhotoUrl

    await transaction.begin()
    const updateRequest = new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('employeeCode', sql.NVarChar(20), normalizeCode(body.employeeId))
      .input('name', sql.NVarChar(200), body.name.trim())
      .input('title', sql.NVarChar(200), body.title || null)
      .input('email', sql.NVarChar(256), body.email || null)
      .input('phone', sql.NVarChar(50), body.phone || null)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
      .input('managerId', sql.Int, body.managerId ?? null)
      .input('jobDescriptionId', sql.Int, body.jobDescriptionId ?? null)
    bindPersonalDetailInputs(updateRequest, body, { includeDateOfJoining: true })
    // No OUTPUT clause — same trigger restriction as the insert above.
    const updateResult = await updateRequest.query(`
        UPDATE portal.Employees SET
          EmployeeCode = @employeeCode, Name = @name, Title = @title, Email = @email, Phone = @phone,
          PhotoUrl = @photoUrl, ManagerId = @managerId, JobDescriptionId = @jobDescriptionId,
          ${ADMIN_PERSONAL_DETAIL_SET_CLAUSE}
        WHERE EmployeeId = @id
      `)

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Employee not found.' })
    }

    const selectResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query('SELECT * FROM portal.Employees WHERE EmployeeId = @id')
    const row = selectResult.recordset[0]

    await replaceDepartments(transaction, id, body.departmentIds)
    const emergencyContacts = await replaceEmergencyContacts(transaction, id, body.emergencyContacts)
    const familyMembers = await replaceFamilyMembers(transaction, id, body.familyMembers)
    const education = await replaceEducation(transaction, id, body.education)
    const experience = await replaceExperience(transaction, id, body.experience)
    await transaction.commit()

    if (body.photo && body.photo !== previousPhoto) {
      await archivePhotoToFile({ employeeId: id, employeeName: row.Name, photoDataUrl: body.photo, uploadedByUserId: req.user.sub })
    }
    res.json(toEmployee(row, singleEmployeeLookups(id, { departmentIds: body.departmentIds, emergencyContacts, familyMembers, education, experience })))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That employee ID is already in use.' })
    next(err)
  }
})

router.delete('/:id', requireAdminEmployees, async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    await transaction.begin()
    await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query('UPDATE portal.Employees SET ManagerId = NULL WHERE ManagerId = @id')

    // Cascades into EmployeeDepartments automatically.
    const deleteResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query('DELETE FROM portal.Employees WHERE EmployeeId = @id')

    if (deleteResult.rowsAffected[0] === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Employee not found.' })
    }

    await transaction.commit()
    res.status(204).end()
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

// Reconciles this manager's full direct-report set in one call: anyone in
// reportIds gets ManagerId set to this employee, anyone currently reporting
// to them but left out of reportIds gets cleared. Mirrors the old
// client-side setDirectReports() the Admin UI already expects.
router.put('/:id/reports', requireAdminEmployees, async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const managerId = Number(req.params.id)
    const wanted = new Set((req.body?.reportIds || []).map(Number))

    await transaction.begin()
    const currentResult = await new sql.Request(transaction)
      .input('managerId', sql.Int, managerId)
      .query('SELECT EmployeeId FROM portal.Employees WHERE ManagerId = @managerId')
    const current = new Set(currentResult.recordset.map((r) => r.EmployeeId))

    const toAssign = [...wanted].filter((id) => !current.has(id))
    const toClear = [...current].filter((id) => !wanted.has(id))

    for (const id of toAssign) {
      await new sql.Request(transaction)
        .input('id', sql.Int, id)
        .input('managerId', sql.Int, managerId)
        .query('UPDATE portal.Employees SET ManagerId = @managerId WHERE EmployeeId = @id')
    }
    for (const id of toClear) {
      await new sql.Request(transaction)
        .input('id', sql.Int, id)
        .query('UPDATE portal.Employees SET ManagerId = NULL WHERE EmployeeId = @id')
    }

    await transaction.commit()
    res.status(204).end()
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

// --- Personal documents (admin) --------------------------------------------
// Mirrors the self-service routes in me.js — same helpers, just scoped to
// any employee (admin-employees permission) instead of "your own record".

router.get('/:id/documents', requireAdminEmployees, async (req, res, next) => {
  try {
    const pool = await getPool()
    res.json(await listEmployeeDocuments(pool, Number(req.params.id)))
  } catch (err) {
    next(err)
  }
})

router.post('/:id/documents', requireAdminEmployees, upload.single('file'), async (req, res, next) => {
  try {
    const employeeId = Number(req.params.id)
    const pool = await getPool()
    const employeeResult = await pool.request().input('id', sql.Int, employeeId).query('SELECT Name FROM portal.Employees WHERE EmployeeId = @id')
    const employee = employeeResult.recordset[0]
    if (!employee) return res.status(404).json({ error: 'Employee not found.' })

    const { error, document } = await saveEmployeeDocument({
      employeeId,
      employeeName: employee.Name,
      documentTypeKey: req.body?.documentType,
      file: req.file,
      uploadedByUserId: req.user.sub,
    })
    if (error) return res.status(400).json({ error })
    res.status(201).json(document)
  } catch (err) {
    next(err)
  }
})

router.get('/:id/documents/:documentId/file', requireAdminEmployees, async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, Number(req.params.documentId))
      .input('employeeId', sql.Int, Number(req.params.id))
      .query('SELECT * FROM portal.EmployeeDocuments WHERE EmployeeDocumentId = @id AND EmployeeId = @employeeId')
    const doc = result.recordset[0]
    if (!doc) return res.status(404).json({ error: 'Document not found.' })

    const absolutePath = path.join(env.docsMountPath, ...doc.FilePath.split('/'))
    res.setHeader('Content-Type', doc.ContentType || 'application/octet-stream')
    res.download(absolutePath, doc.OriginalFileName || doc.FileName)
  } catch (err) {
    next(err)
  }
})

export default router
