import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function toEmployee(row, departmentIdsByEmployee) {
  return {
    id: row.EmployeeId,
    employeeId: row.EmployeeCode || '',
    name: row.Name,
    photo: row.PhotoUrl || '',
    title: row.Title || '',
    departmentIds: departmentIdsByEmployee.get(row.EmployeeId) || [],
    email: row.Email || '',
    phone: row.Phone || '',
    emergencyContact: {
      name: row.EmergencyContactName || '',
      relation: row.EmergencyContactRelation || '',
      phone: row.EmergencyContactPhone || '',
    },
    managerId: row.ManagerId,
  }
}

// Empty-string codes would collide under the UNIQUE constraint (unlike NULL,
// which SQL Server allows to repeat), so normalize "no code" to NULL.
function normalizeCode(employeeId) {
  const trimmed = (employeeId || '').trim()
  return trimmed || null
}

async function fetchDepartmentIdsByEmployee(pool) {
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

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [employeesResult, departmentIdsByEmployee] = await Promise.all([
      pool.request().query('SELECT * FROM portal.Employees'),
      fetchDepartmentIdsByEmployee(pool),
    ])
    res.json(employeesResult.recordset.map((row) => toEmployee(row, departmentIdsByEmployee)))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    if (!body.name?.trim()) return res.status(400).json({ error: 'Name is required.' })

    await transaction.begin()
    const insertResult = await new sql.Request(transaction)
      .input('employeeCode', sql.NVarChar(20), normalizeCode(body.employeeId))
      .input('name', sql.NVarChar(200), body.name.trim())
      .input('title', sql.NVarChar(200), body.title || null)
      .input('email', sql.NVarChar(256), body.email || null)
      .input('phone', sql.NVarChar(50), body.phone || null)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
      .input('managerId', sql.Int, body.managerId ?? null)
      .input('emergencyName', sql.NVarChar(200), body.emergencyContact?.name || null)
      .input('emergencyRelation', sql.NVarChar(100), body.emergencyContact?.relation || null)
      .input('emergencyPhone', sql.NVarChar(50), body.emergencyContact?.phone || null).query(`
        INSERT INTO portal.Employees
          (EmployeeCode, Name, Title, Email, Phone, PhotoUrl, ManagerId, EmergencyContactName, EmergencyContactRelation, EmergencyContactPhone)
        OUTPUT INSERTED.*
        VALUES
          (@employeeCode, @name, @title, @email, @phone, @photoUrl, @managerId, @emergencyName, @emergencyRelation, @emergencyPhone)
      `)

    const row = insertResult.recordset[0]
    await replaceDepartments(transaction, row.EmployeeId, body.departmentIds)
    await transaction.commit()

    res.status(201).json(toEmployee(row, new Map([[row.EmployeeId, body.departmentIds || []]])))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That employee ID is already in use.' })
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    if (!body.name?.trim()) return res.status(400).json({ error: 'Name is required.' })

    await transaction.begin()
    const updateResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('employeeCode', sql.NVarChar(20), normalizeCode(body.employeeId))
      .input('name', sql.NVarChar(200), body.name.trim())
      .input('title', sql.NVarChar(200), body.title || null)
      .input('email', sql.NVarChar(256), body.email || null)
      .input('phone', sql.NVarChar(50), body.phone || null)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
      .input('managerId', sql.Int, body.managerId ?? null)
      .input('emergencyName', sql.NVarChar(200), body.emergencyContact?.name || null)
      .input('emergencyRelation', sql.NVarChar(100), body.emergencyContact?.relation || null)
      .input('emergencyPhone', sql.NVarChar(50), body.emergencyContact?.phone || null).query(`
        UPDATE portal.Employees SET
          EmployeeCode = @employeeCode, Name = @name, Title = @title, Email = @email, Phone = @phone,
          PhotoUrl = @photoUrl, ManagerId = @managerId, EmergencyContactName = @emergencyName,
          EmergencyContactRelation = @emergencyRelation, EmergencyContactPhone = @emergencyPhone
        OUTPUT INSERTED.*
        WHERE EmployeeId = @id
      `)

    const row = updateResult.recordset[0]
    if (!row) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Employee not found.' })
    }

    await replaceDepartments(transaction, id, body.departmentIds)
    await transaction.commit()

    res.json(toEmployee(row, new Map([[id, body.departmentIds || []]])))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That employee ID is already in use.' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
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
router.put('/:id/reports', async (req, res, next) => {
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

export default router
