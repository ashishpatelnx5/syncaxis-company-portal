import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { auditContext, writeAuditLog } from '../lib/audit.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)
const requireAdminJobDescriptions = requirePermission('page', 'admin-job-descriptions')

function toJobDescription(row) {
  return {
    id: row.JobDescriptionId,
    title: row.Title,
    departmentId: row.DepartmentId,
    reportingTo: row.ReportingTo || '',
    content: JSON.parse(row.ContentJson),
  }
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query('SELECT * FROM portal.JobDescriptions ORDER BY Title')
    res.json(result.recordset.map(toJobDescription))
  } catch (err) {
    next(err)
  }
})

router.post('/', requireAdminJobDescriptions, async (req, res, next) => {
  try {
    const body = req.body || {}
    const title = (body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Title is required.' })
    if (!body.departmentId) return res.status(400).json({ error: 'Department is required.' })

    const pool = await getPool()
    // No OUTPUT clause — portal.JobDescriptions has an UpdatedAt trigger, and
    // SQL Server disallows OUTPUT INSERTED/DELETED without INTO on a table
    // with any enabled trigger. Fetch the row separately instead.
    const insertResult = await pool
      .request()
      .input('title', sql.NVarChar(200), title)
      .input('departmentId', sql.Int, body.departmentId)
      .input('reportingTo', sql.NVarChar(200), body.reportingTo || null)
      .input('contentJson', sql.NVarChar(sql.MAX), JSON.stringify(body.content || {}))
      .query(`
        INSERT INTO portal.JobDescriptions (Title, DepartmentId, ReportingTo, ContentJson)
        VALUES (@title, @departmentId, @reportingTo, @contentJson);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS JobDescriptionId;
      `)

    const result = await pool
      .request()
      .input('id', sql.Int, insertResult.recordset[0].JobDescriptionId)
      .query('SELECT * FROM portal.JobDescriptions WHERE JobDescriptionId = @id')

    const jobDescription = toJobDescription(result.recordset[0])
    writeAuditLog({ ...auditContext(req), eventType: 'CREATE', entityType: 'JobDescription', entityId: jobDescription.id, detail: `Created "${jobDescription.title}"` })
    res.status(201).json(jobDescription)
  } catch (err) {
    if (err.number === 547) return res.status(400).json({ error: 'That department does not exist.' })
    next(err)
  }
})

router.put('/:id', requireAdminJobDescriptions, async (req, res, next) => {
  try {
    const body = req.body || {}
    const title = (body.title || '').trim()
    if (!title) return res.status(400).json({ error: 'Title is required.' })
    if (!body.departmentId) return res.status(400).json({ error: 'Department is required.' })

    const pool = await getPool()
    const previous = await pool.request().input('id', sql.Int, req.params.id).query('SELECT Title, ReportingTo FROM portal.JobDescriptions WHERE JobDescriptionId = @id')
    const before = previous.recordset[0]

    // Same OUTPUT-vs-trigger restriction as the insert above — plain update,
    // then a separate select.
    const updateResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('title', sql.NVarChar(200), title)
      .input('departmentId', sql.Int, body.departmentId)
      .input('reportingTo', sql.NVarChar(200), body.reportingTo || null)
      .input('contentJson', sql.NVarChar(sql.MAX), JSON.stringify(body.content || {}))
      .query(`
        UPDATE portal.JobDescriptions SET
          Title = @title, DepartmentId = @departmentId, ReportingTo = @reportingTo, ContentJson = @contentJson
        WHERE JobDescriptionId = @id
      `)

    if (updateResult.rowsAffected[0] === 0) return res.status(404).json({ error: 'Job description not found.' })

    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM portal.JobDescriptions WHERE JobDescriptionId = @id')

    const jobDescription = toJobDescription(result.recordset[0])
    const changes = []
    if (before?.Title && before.Title !== jobDescription.title) changes.push(`Title: "${before.Title}" → "${jobDescription.title}"`)
    if ((before?.ReportingTo || '') !== jobDescription.reportingTo) changes.push(`Reporting to: "${before?.ReportingTo || '—'}" → "${jobDescription.reportingTo || '—'}"`)
    const detail = changes.length > 0 ? `Updated "${jobDescription.title}" — ${changes.join(', ')}` : `Updated "${jobDescription.title}"`
    writeAuditLog({ ...auditContext(req), eventType: 'UPDATE', entityType: 'JobDescription', entityId: jobDescription.id, detail })
    res.json(jobDescription)
  } catch (err) {
    if (err.number === 547) return res.status(400).json({ error: 'That department does not exist.' })
    next(err)
  }
})

router.delete('/:id', requireAdminJobDescriptions, async (req, res, next) => {
  try {
    const pool = await getPool()
    const existing = await pool.request().input('id', sql.Int, req.params.id).query('SELECT Title FROM portal.JobDescriptions WHERE JobDescriptionId = @id')
    // ON DELETE SET NULL on Employees.JobDescriptionId unassigns anyone who
    // held this job description, as part of the same statement.
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM portal.JobDescriptions WHERE JobDescriptionId = @id')

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Job description not found.' })
    writeAuditLog({
      ...auditContext(req),
      eventType: 'DELETE',
      entityType: 'JobDescription',
      entityId: req.params.id,
      detail: existing.recordset[0]?.Title ? `Deleted "${existing.recordset[0].Title}"` : 'Deleted',
    })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
