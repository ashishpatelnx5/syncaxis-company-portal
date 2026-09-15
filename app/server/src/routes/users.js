import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const ACTIVE_ADMIN_COUNT_QUERY = `
  SELECT COUNT(DISTINCT u.UserId) AS n
  FROM portal.Users u
  WHERE u.IsActive = 1
  AND (
    EXISTS (SELECT 1 FROM portal.UserRoles ur JOIN portal.Roles r ON r.RoleId = ur.RoleId WHERE ur.UserId = u.UserId AND r.IsFullAccess = 1)
    OR EXISTS (
      SELECT 1 FROM portal.UserGroupMembers m
      JOIN portal.GroupRoles gr ON gr.GroupId = m.GroupId
      JOIN portal.Roles r ON r.RoleId = gr.RoleId
      WHERE m.UserId = u.UserId AND r.IsFullAccess = 1
    )
  )
`

function toUser(row, roles) {
  return {
    id: row.UserId,
    username: row.Username,
    displayName: row.DisplayName || row.Username,
    isActive: row.IsActive,
    isLocked: row.IsLocked,
    failedLoginCount: row.FailedLoginCount,
    lastLoginAt: row.LastLoginAt ? row.LastLoginAt.toISOString() : null,
    passwordChangedAt: row.PasswordChangedAt ? row.PasswordChangedAt.toISOString() : null,
    roles: roles || [],
  }
}

async function fetchRolesByUser(pool) {
  const result = await pool
    .request()
    .query('SELECT ur.UserId, r.RoleId, r.Name FROM portal.UserRoles ur JOIN portal.Roles r ON r.RoleId = ur.RoleId')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.UserId)) map.set(row.UserId, [])
    map.get(row.UserId).push({ id: row.RoleId, name: row.Name })
  }
  return map
}

// Replacing wholesale on every save is simpler than diffing, and the sets
// involved are tiny — same pattern as every other many-to-many grant in
// this app (see replacePermissions in routes/roles.js, replaceMembers in
// routes/userGroups.js).
async function replaceUserRoles(transaction, userId, roleIds) {
  await new sql.Request(transaction).input('userId', sql.Int, userId).query('DELETE FROM portal.UserRoles WHERE UserId = @userId')
  for (const roleId of Array.isArray(roleIds) ? roleIds : []) {
    await new sql.Request(transaction)
      .input('userId', sql.Int, userId)
      .input('roleId', sql.Int, roleId)
      .query('INSERT INTO portal.UserRoles (UserId, RoleId) VALUES (@userId, @roleId)')
  }
}

// Run inside the same transaction as the change being made, *after* it's
// applied but before commit — if it comes back zero, the caller rolls back.
// Catches every way a change could zero out admin access (deactivating the
// last admin, unassigning their last admin-granting role, deleting them...)
// without having to special-case each one.
async function activeAdminCount(transaction) {
  const result = await new sql.Request(transaction).query(ACTIVE_ADMIN_COUNT_QUERY)
  return result.recordset[0].n
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [usersResult, rolesByUser] = await Promise.all([
      pool.request().query('SELECT * FROM portal.Users ORDER BY Username'),
      fetchRolesByUser(pool),
    ])
    res.json(usersResult.recordset.map((row) => toUser(row, rolesByUser.get(row.UserId))))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    const username = (body.username || '').trim()
    const password = body.password || ''
    if (!username) return res.status(400).json({ error: 'Username is required.' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' })

    const passwordHash = await bcrypt.hash(password, 12)

    await transaction.begin()
    const insertResult = await new sql.Request(transaction)
      .input('username', sql.NVarChar(100), username)
      .input('displayName', sql.NVarChar(200), (body.displayName || '').trim() || null)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .input('isActive', sql.Bit, body.isActive !== false)
      // No OUTPUT clause — portal.Users has an UpdatedAt trigger, and SQL
      // Server disallows OUTPUT INSERTED/DELETED without INTO on a table
      // with any enabled trigger. Fetch the row separately instead.
      .query(`
        INSERT INTO portal.Users (Username, DisplayName, PasswordHash, IsActive, PasswordChangedAt)
        VALUES (@username, @displayName, @passwordHash, @isActive, SYSUTCDATETIME());
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS UserId;
      `)
    const userId = insertResult.recordset[0].UserId

    await replaceUserRoles(transaction, userId, body.roleIds)

    const selectResult = await new sql.Request(transaction)
      .input('id', sql.Int, userId)
      .query('SELECT * FROM portal.Users WHERE UserId = @id')

    await transaction.commit()
    res.status(201).json(toUser(selectResult.recordset[0]))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That username is already in use.' })
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    const username = (body.username || '').trim()
    const isActive = body.isActive !== false
    if (!username) return res.status(400).json({ error: 'Username is required.' })
    if (body.password && body.password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' })
    }

    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : null

    await transaction.begin()

    const updateResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('username', sql.NVarChar(100), username)
      .input('displayName', sql.NVarChar(200), (body.displayName || '').trim() || null)
      .input('isActive', sql.Bit, isActive)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query(`
        UPDATE portal.Users SET
          Username = @username, DisplayName = @displayName, IsActive = @isActive,
          PasswordHash = COALESCE(@passwordHash, PasswordHash),
          PasswordChangedAt = CASE WHEN @passwordHash IS NOT NULL THEN SYSUTCDATETIME() ELSE PasswordChangedAt END
        WHERE UserId = @id
      `)

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'User not found.' })
    }

    await replaceUserRoles(transaction, id, body.roleIds)

    if ((await activeAdminCount(transaction)) === 0) {
      await transaction.rollback()
      return res.status(400).json({ error: 'At least one active admin must remain.' })
    }

    const selectResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .query('SELECT * FROM portal.Users WHERE UserId = @id')

    await transaction.commit()
    res.json(toUser(selectResult.recordset[0]))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'That username is already in use.' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    await transaction.begin()

    // ON DELETE CASCADE clears UserRoles/UserGroupMembers that reference
    // them as part of the same statement.
    const deleteResult = await new sql.Request(transaction).input('id', sql.Int, id).query('DELETE FROM portal.Users WHERE UserId = @id')
    if (deleteResult.rowsAffected[0] === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'User not found.' })
    }

    if ((await activeAdminCount(transaction)) === 0) {
      await transaction.rollback()
      return res.status(400).json({ error: 'At least one active admin must remain.' })
    }

    await transaction.commit()
    res.status(204).end()
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

router.post('/:id/unlock', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('UPDATE portal.Users SET IsLocked = 0, FailedLoginCount = 0 WHERE UserId = @id')

    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'User not found.' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
