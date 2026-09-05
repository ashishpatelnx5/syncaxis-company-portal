import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function toHoliday(row) {
  return {
    id: row.HolidayId,
    date: row.HolidayDate.toISOString().slice(0, 10),
    name: row.Name,
    type: row.Type,
  }
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query('SELECT * FROM portal.Holidays ORDER BY HolidayDate')
    res.json(result.recordset.map(toHoliday))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const body = req.body || {}
    const name = (body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })
    if (!body.date) return res.status(400).json({ error: 'Date is required.' })
    if (!['National', 'Festival'].includes(body.type)) return res.status(400).json({ error: 'Type must be National or Festival.' })

    const pool = await getPool()
    // No OUTPUT clause — portal.Holidays has an UpdatedAt trigger, and SQL
    // Server disallows OUTPUT INSERTED/DELETED without INTO on a table
    // with any enabled trigger. Fetch the row separately instead.
    const insertResult = await pool
      .request()
      .input('date', sql.Date, body.date)
      .input('name', sql.NVarChar(200), name)
      .input('type', sql.NVarChar(20), body.type)
      .query(`
        INSERT INTO portal.Holidays (HolidayDate, Name, Type)
        VALUES (@date, @name, @type);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS HolidayId;
      `)

    const result = await pool
      .request()
      .input('id', sql.Int, insertResult.recordset[0].HolidayId)
      .query('SELECT * FROM portal.Holidays WHERE HolidayId = @id')

    res.status(201).json(toHoliday(result.recordset[0]))
  } catch (err) {
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const body = req.body || {}
    const name = (body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })
    if (!body.date) return res.status(400).json({ error: 'Date is required.' })
    if (!['National', 'Festival'].includes(body.type)) return res.status(400).json({ error: 'Type must be National or Festival.' })

    const pool = await getPool()
    // Same OUTPUT-vs-trigger restriction as the insert above — plain
    // update, then a separate select.
    const updateResult = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .input('date', sql.Date, body.date)
      .input('name', sql.NVarChar(200), name)
      .input('type', sql.NVarChar(20), body.type)
      .query('UPDATE portal.Holidays SET HolidayDate = @date, Name = @name, Type = @type WHERE HolidayId = @id')

    if (updateResult.rowsAffected[0] === 0) return res.status(404).json({ error: 'Holiday not found.' })

    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM portal.Holidays WHERE HolidayId = @id')

    res.json(toHoliday(result.recordset[0]))
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, req.params.id)
      .query('DELETE FROM portal.Holidays WHERE HolidayId = @id')

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Holiday not found.' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
