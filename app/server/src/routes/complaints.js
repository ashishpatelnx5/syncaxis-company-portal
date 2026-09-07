import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

const CATEGORIES = ['Complaint', 'Issue', 'Feedback']
const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']

function toComplaint(row) {
  return {
    id: row.ComplaintId,
    employeeId: row.EmployeeId,
    category: row.Category,
    subject: row.Subject,
    description: row.Description,
    status: row.Status,
    createdAt: row.CreatedAt.toISOString(),
    updatedAt: row.UpdatedAt.toISOString(),
  }
}

function toHistoryEntry(row) {
  return {
    status: row.Status,
    comment: row.Comment,
    createdAt: row.CreatedAt.toISOString(),
  }
}

async function fetchHistoryByComplaint(pool) {
  const result = await pool.request().query('SELECT * FROM portal.ComplaintHistory ORDER BY CreatedAt ASC')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.ComplaintId)) map.set(row.ComplaintId, [])
    map.get(row.ComplaintId).push(toHistoryEntry(row))
  }
  return map
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [complaintsResult, historyByComplaint] = await Promise.all([
      pool.request().query('SELECT * FROM portal.Complaints ORDER BY CreatedAt DESC'),
      fetchHistoryByComplaint(pool),
    ])
    res.json(
      complaintsResult.recordset.map((row) => ({
        ...toComplaint(row),
        history: historyByComplaint.get(row.ComplaintId) || [],
      })),
    )
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    const subject = (body.subject || '').trim()
    const description = (body.description || '').trim()
    if (!body.employeeId) return res.status(400).json({ error: 'Employee is required.' })
    if (!CATEGORIES.includes(body.category)) return res.status(400).json({ error: 'Category must be Complaint, Issue, or Feedback.' })
    if (!subject) return res.status(400).json({ error: 'Subject is required.' })
    if (!description) return res.status(400).json({ error: 'Description is required.' })
    const status = STATUSES.includes(body.status) ? body.status : 'Open'

    await transaction.begin()

    // No OUTPUT clause — portal.Complaints has an UpdatedAt trigger, and
    // SQL Server disallows OUTPUT INSERTED/DELETED without INTO on a table
    // with any enabled trigger. Fetch the row separately instead.
    const insertResult = await new sql.Request(transaction)
      .input('employeeId', sql.Int, body.employeeId)
      .input('category', sql.NVarChar(20), body.category)
      .input('subject', sql.NVarChar(200), subject)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('status', sql.NVarChar(20), status)
      .query(`
        INSERT INTO portal.Complaints (EmployeeId, Category, Subject, Description, Status)
        VALUES (@employeeId, @category, @subject, @description, @status);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS ComplaintId;
      `)
    const complaintId = insertResult.recordset[0].ComplaintId

    // Every complaint starts its history timeline at creation — CreatedAt
    // is server-generated (SYSUTCDATETIME()), never supplied by the caller.
    await new sql.Request(transaction)
      .input('complaintId', sql.Int, complaintId)
      .input('status', sql.NVarChar(20), status)
      .query('INSERT INTO portal.ComplaintHistory (ComplaintId, Status) VALUES (@complaintId, @status)')

    const result = await new sql.Request(transaction)
      .input('id', sql.Int, complaintId)
      .query('SELECT * FROM portal.Complaints WHERE ComplaintId = @id')

    await transaction.commit()
    res.status(201).json({ ...toComplaint(result.recordset[0]), history: [{ status, comment: null, createdAt: result.recordset[0].CreatedAt.toISOString() }] })
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    const subject = (body.subject || '').trim()
    const description = (body.description || '').trim()
    if (!body.employeeId) return res.status(400).json({ error: 'Employee is required.' })
    if (!CATEGORIES.includes(body.category)) return res.status(400).json({ error: 'Category must be Complaint, Issue, or Feedback.' })
    if (!subject) return res.status(400).json({ error: 'Subject is required.' })
    if (!description) return res.status(400).json({ error: 'Description is required.' })
    if (!STATUSES.includes(body.status)) return res.status(400).json({ error: 'Invalid status.' })

    await transaction.begin()

    const existing = await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .query('SELECT Status FROM portal.Complaints WHERE ComplaintId = @id')
    if (existing.recordset.length === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Entry not found.' })
    }
    const statusChanged = existing.recordset[0].Status !== body.status

    // Same OUTPUT-vs-trigger restriction as the insert above — plain
    // update, then a separate select.
    await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .input('employeeId', sql.Int, body.employeeId)
      .input('category', sql.NVarChar(20), body.category)
      .input('subject', sql.NVarChar(200), subject)
      .input('description', sql.NVarChar(sql.MAX), description)
      .input('status', sql.NVarChar(20), body.status)
      .query(`
        UPDATE portal.Complaints SET
          EmployeeId = @employeeId, Category = @category, Subject = @subject,
          Description = @description, Status = @status
        WHERE ComplaintId = @id
      `)

    // Only a real status change gets a history row — editing the subject,
    // description, category, or re-saving the same status doesn't. The
    // comment (optional) rides along with the transition it explains, and
    // CreatedAt is server-generated, never supplied by the caller.
    if (statusChanged) {
      const comment = (body.statusComment || '').trim()
      await new sql.Request(transaction)
        .input('complaintId', sql.Int, req.params.id)
        .input('status', sql.NVarChar(20), body.status)
        .input('comment', sql.NVarChar(sql.MAX), comment || null)
        .query('INSERT INTO portal.ComplaintHistory (ComplaintId, Status, Comment) VALUES (@complaintId, @status, @comment)')
    }

    // A transaction is bound to a single connection — unlike pool.request(),
    // its requests can't run concurrently (Promise.all here previously hung
    // the whole pool with an EREQINPROG error). Sequential awaits instead.
    const complaintResult = await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM portal.Complaints WHERE ComplaintId = @id')
    const historyResult = await new sql.Request(transaction)
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM portal.ComplaintHistory WHERE ComplaintId = @id ORDER BY CreatedAt ASC')

    await transaction.commit()
    res.json({ ...toComplaint(complaintResult.recordset[0]), history: historyResult.recordset.map(toHistoryEntry) })
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const pool = await getPool()
    // ON DELETE CASCADE on ComplaintHistory removes its timeline as part of
    // the same statement.
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM portal.Complaints WHERE ComplaintId = @id')

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Entry not found.' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
