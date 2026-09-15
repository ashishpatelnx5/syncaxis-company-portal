import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'
import { fetchDepartmentIdsByEmployee, toEmployee } from './employees.js'

const router = Router()
router.use(requireAuth)

// Self-service edit of your own contact/emergency-contact info — not
// gated by a page permission (unlike everything under Admin ▸ Employees):
// access here is inherently scoped to "your own record" by Users.EmployeeId,
// the same way Account/My Profile are available to any signed-in user.
router.put('/employee', async (req, res, next) => {
  try {
    // req.user.sub is now the syncaxis-iam user id (Portal's own JWT subject
    // since the identity delegation) — resolve via Employees.AuthUserId, not
    // portal.Users, which is no longer what identifies a signed-in user.
    const userResult = await (await getPool())
      .request()
      .input('id', sql.Int, req.user.sub)
      .query('SELECT EmployeeId FROM portal.Employees WHERE AuthUserId = @id')

    const employeeId = userResult.recordset[0]?.EmployeeId
    if (!employeeId) return res.status(400).json({ error: "Your account isn't linked to an employee record." })

    const body = req.body || {}
    const pool = await getPool()
    await pool
      .request()
      .input('id', sql.Int, employeeId)
      .input('photoUrl', sql.NVarChar(sql.MAX), body.photo || null)
      .input('email', sql.NVarChar(256), body.email || null)
      .input('phone', sql.NVarChar(50), body.phone || null)
      .input('emergencyName', sql.NVarChar(200), body.emergencyContact?.name || null)
      .input('emergencyRelation', sql.NVarChar(100), body.emergencyContact?.relation || null)
      .input('emergencyPhone', sql.NVarChar(50), body.emergencyContact?.phone || null)
      .query(`
        UPDATE portal.Employees SET
          PhotoUrl = @photoUrl, Email = @email, Phone = @phone,
          EmergencyContactName = @emergencyName, EmergencyContactRelation = @emergencyRelation, EmergencyContactPhone = @emergencyPhone
        WHERE EmployeeId = @id
      `)

    const [selectResult, departmentIdsByEmployee] = await Promise.all([
      pool.request().input('id', sql.Int, employeeId).query('SELECT * FROM portal.Employees WHERE EmployeeId = @id'),
      fetchDepartmentIdsByEmployee(pool),
    ])

    res.json(toEmployee(selectResult.recordset[0], departmentIdsByEmployee))
  } catch (err) {
    next(err)
  }
})

export default router
