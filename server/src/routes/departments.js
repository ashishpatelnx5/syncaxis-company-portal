import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function toDepartment(row) {
  return { id: row.DepartmentId, name: row.Name }
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query('SELECT DepartmentId, Name FROM portal.Departments ORDER BY Name')
    res.json(result.recordset.map(toDepartment))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })

    const pool = await getPool()
    // No OUTPUT clause here — portal.Departments has an UpdatedAt trigger,
    // and SQL Server disallows OUTPUT INSERTED/DELETED without INTO on a
    // table with any enabled trigger. Fetch the row separately instead.
    const insertResult = await pool
      .request()
      .input('name', sql.NVarChar(100), name)
      .query('INSERT INTO portal.Departments (Name) VALUES (@name); SELECT CAST(SCOPE_IDENTITY() AS INT) AS DepartmentId;')

    const result = await pool
      .request()
      .input('id', sql.Int, insertResult.recordset[0].DepartmentId)
      .query('SELECT DepartmentId, Name FROM portal.Departments WHERE DepartmentId = @id')

    res.status(201).json(toDepartment(result.recordset[0]))
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A department with that name already exists.' })
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })

    const pool = await getPool()
    // Same OUTPUT-vs-trigger restriction as the insert above — plain update,
    // then a separate select.
    const updateResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar(100), name)
      .query('UPDATE portal.Departments SET Name = @name WHERE DepartmentId = @id')

    if (updateResult.rowsAffected[0] === 0) return res.status(404).json({ error: 'Department not found.' })

    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT DepartmentId, Name FROM portal.Departments WHERE DepartmentId = @id')

    res.json(toDepartment(result.recordset[0]))
  } catch (err) {
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A department with that name already exists.' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const pool = await getPool()
    // ON DELETE CASCADE on EmployeeDepartments strips this department out of
    // every employee's assignment set as part of the same statement.
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM portal.Departments WHERE DepartmentId = @id')

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Department not found.' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
