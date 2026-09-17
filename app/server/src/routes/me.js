import { Router } from 'express'
import path from 'path'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'
import {
  SELF_SERVICE_PERSONAL_DETAIL_SET_CLAUSE,
  archivePhotoToFile,
  bindPersonalDetailInputs,
  downloadRowDocument,
  fetchDepartmentIdsByEmployee,
  listEmployeeDocuments,
  replaceEducation,
  replaceEmergencyContacts,
  replaceExperience,
  replaceFamilyMembers,
  saveEmployeeDocument,
  saveRowDocument,
  singleEmployeeLookups,
  toEmployee,
  upload,
} from './employees.js'

const router = Router()
router.use(requireAuth)

// req.user.sub is the syncaxis-iam user id (Portal's own JWT subject since
// the identity delegation) — resolve via Employees.AuthUserId, not
// portal.Users, which is no longer what identifies a signed-in user. Shared
// by every /employee* route below, all of which are inherently scoped to
// "your own record" rather than gated by a page permission.
async function resolveOwnEmployeeId(pool, req) {
  const result = await pool.request().input('id', sql.Int, req.user.sub).query('SELECT EmployeeId, Name, PhotoUrl FROM portal.Employees WHERE AuthUserId = @id')
  return result.recordset[0]
}

// Self-service edit of your own contact/emergency-contact/personal-details
// info — not gated by a page permission (unlike everything under
// Admin ▸ Employees).
router.put('/employee', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const body = req.body || {}
    await transaction.begin()
    // Email/Phone (like Title/ManagerId/DateOfJoining) are admin/HR-set only
    // now — silently ignored here even if the client still posts them, so a
    // stale form can't accidentally overwrite them.
    const request = new sql.Request(transaction)
      .input('id', sql.Int, own.EmployeeId)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
    bindPersonalDetailInputs(request, body, { includeDateOfJoining: false })
    await request.query(`
        UPDATE portal.Employees SET
          PhotoUrl = @photoUrl,
          ${SELF_SERVICE_PERSONAL_DETAIL_SET_CLAUSE}
        WHERE EmployeeId = @id
      `)

    const emergencyContacts = await replaceEmergencyContacts(transaction, own.EmployeeId, body.emergencyContacts)
    const familyMembers = await replaceFamilyMembers(transaction, own.EmployeeId, body.familyMembers)
    const education = await replaceEducation(transaction, own.EmployeeId, body.education)
    const experience = await replaceExperience(transaction, own.EmployeeId, body.experience)
    await transaction.commit()

    const [selectResult, departmentIdsByEmployee] = await Promise.all([
      pool.request().input('id', sql.Int, own.EmployeeId).query('SELECT * FROM portal.Employees WHERE EmployeeId = @id'),
      fetchDepartmentIdsByEmployee(pool),
    ])

    if (body.photo && body.photo !== own.PhotoUrl) {
      await archivePhotoToFile({ employeeId: own.EmployeeId, employeeName: own.Name, photoDataUrl: body.photo, uploadedByUserId: req.user.sub })
    }
    res.json(
      toEmployee(selectResult.recordset[0], {
        ...singleEmployeeLookups(own.EmployeeId, { emergencyContacts, familyMembers, education, experience }),
        departmentIdsByEmployee,
      }),
    )
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

router.get('/employee/documents', async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })
    res.json(await listEmployeeDocuments(pool, own.EmployeeId))
  } catch (err) {
    next(err)
  }
})

router.post('/employee/documents', upload.single('file'), async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const { error, document } = await saveEmployeeDocument({
      employeeId: own.EmployeeId,
      employeeName: own.Name,
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

router.get('/employee/documents/:documentId/file', async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const result = await pool
      .request()
      .input('id', sql.Int, Number(req.params.documentId))
      .input('employeeId', sql.Int, own.EmployeeId)
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

// --- Per-row documents on your own Education/Experience entries ------------

router.post('/employee/education/:educationId/document', upload.single('file'), async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const { error, document } = await saveRowDocument({
      table: 'EmployeeEducation',
      idColumn: 'EducationId',
      label: 'Certificate',
      employeeId: own.EmployeeId,
      rowId: Number(req.params.educationId),
      employeeName: own.Name,
      file: req.file,
    })
    if (error) return res.status(400).json({ error })
    res.status(201).json(document)
  } catch (err) {
    next(err)
  }
})

router.get('/employee/education/:educationId/document/file', async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const ok = await downloadRowDocument({
      table: 'EmployeeEducation',
      idColumn: 'EducationId',
      employeeId: own.EmployeeId,
      rowId: Number(req.params.educationId),
      res,
    })
    if (!ok) res.status(404).json({ error: 'Document not found.' })
  } catch (err) {
    next(err)
  }
})

router.post('/employee/experience/:experienceId/document', upload.single('file'), async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const { error, document } = await saveRowDocument({
      table: 'EmployeeExperience',
      idColumn: 'ExperienceId',
      label: 'Document',
      employeeId: own.EmployeeId,
      rowId: Number(req.params.experienceId),
      employeeName: own.Name,
      file: req.file,
    })
    if (error) return res.status(400).json({ error })
    res.status(201).json(document)
  } catch (err) {
    next(err)
  }
})

router.get('/employee/experience/:experienceId/document/file', async (req, res, next) => {
  try {
    const pool = await getPool()
    const own = await resolveOwnEmployeeId(pool, req)
    if (!own) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const ok = await downloadRowDocument({
      table: 'EmployeeExperience',
      idColumn: 'ExperienceId',
      employeeId: own.EmployeeId,
      rowId: Number(req.params.experienceId),
      res,
    })
    if (!ok) res.status(404).json({ error: 'Document not found.' })
  } catch (err) {
    next(err)
  }
})

export default router
