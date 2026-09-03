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
    const result = await pool
      .request()
      .input('name', sql.NVarChar(100), name)
      .query('INSERT INTO portal.Departments (Name) OUTPUT INSERTED.DepartmentId, INSERTED.Name VALUES (@name)')

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
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('name', sql.NVarChar(100), name)
      .query(
        'UPDATE portal.Departments SET Name = @name OUTPUT INSERTED.DepartmentId, INSERTED.Name WHERE DepartmentId = @id',
      )

    const row = result.recordset[0]
    if (!row) return res.status(404).json({ error: 'Department not found.' })
    res.json(toDepartment(row))
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
