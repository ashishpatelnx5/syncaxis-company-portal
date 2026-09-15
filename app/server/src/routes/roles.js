import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireAdmin)

function toRole(row, permissions, usage) {
  return {
    id: row.RoleId,
    name: row.Name,
    description: row.Description || '',
    isFullAccess: row.IsFullAccess,
    isProtected: row.IsProtected,
    permissions: permissions || { pages: [], applications: [] },
    userCount: usage?.userCount ?? 0,
    groupCount: usage?.groupCount ?? 0,
  }
}

async function fetchPermissionsByRole(pool) {
  const result = await pool.request().query('SELECT RoleId, ResourceType, ResourceKey FROM portal.RolePermissions')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.RoleId)) map.set(row.RoleId, { pages: [], applications: [] })
    const bucket = map.get(row.RoleId)
    if (row.ResourceType === 'page') bucket.pages.push(row.ResourceKey)
    else bucket.applications.push(row.ResourceKey)
  }
  return map
}

async function fetchUsageByRole(pool) {
  const [userRoleCounts, groupRoleCounts] = await Promise.all([
    pool.request().query('SELECT RoleId, COUNT(*) AS n FROM portal.UserRoles GROUP BY RoleId'),
    pool.request().query('SELECT RoleId, COUNT(*) AS n FROM portal.GroupRoles GROUP BY RoleId'),
  ])
  const map = new Map()
  for (const row of userRoleCounts.recordset) map.set(row.RoleId, { userCount: row.n, groupCount: 0 })
  for (const row of groupRoleCounts.recordset) {
    const existing = map.get(row.RoleId) || { userCount: 0, groupCount: 0 }
    existing.groupCount = row.n
    map.set(row.RoleId, existing)
  }
  return map
}

// Permissions are only meaningful for a non-protected role — the seeded
// Admin role bypasses checks via IsFullAccess and never has rows here.
async function replacePermissions(transaction, roleId, permissions) {
  await new sql.Request(transaction).input('roleId', sql.Int, roleId).query('DELETE FROM portal.RolePermissions WHERE RoleId = @roleId')

  const pages = Array.isArray(permissions?.pages) ? permissions.pages : []
  const applications = Array.isArray(permissions?.applications) ? permissions.applications : []
  for (const key of pages) {
    await new sql.Request(transaction)
      .input('roleId', sql.Int, roleId)
      .input('key', sql.NVarChar(50), key)
      .query("INSERT INTO portal.RolePermissions (RoleId, ResourceType, ResourceKey) VALUES (@roleId, 'page', @key)")
  }
  for (const key of applications) {
    await new sql.Request(transaction)
      .input('roleId', sql.Int, roleId)
      .input('key', sql.NVarChar(50), key)
      .query("INSERT INTO portal.RolePermissions (RoleId, ResourceType, ResourceKey) VALUES (@roleId, 'application', @key)")
  }
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [rolesResult, permissionsByRole, usageByRole] = await Promise.all([
      pool.request().query('SELECT * FROM portal.Roles ORDER BY IsProtected DESC, Name'),
      fetchPermissionsByRole(pool),
      fetchUsageByRole(pool),
    ])
    res.json(rolesResult.recordset.map((row) => toRole(row, permissionsByRole.get(row.RoleId), usageByRole.get(row.RoleId))))
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const body = req.body || {}
    const name = (body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })

    await transaction.begin()
    const insertResult = await new sql.Request(transaction)
      .input('name', sql.NVarChar(100), name)
      .input('description', sql.NVarChar(500), (body.description || '').trim() || null)
      // No OUTPUT clause — portal.Roles has an UpdatedAt trigger... actually
      // it doesn't yet, but keeping the same safe pattern as every other
      // insert in this codebase in case one is added later.
      .query(`
        INSERT INTO portal.Roles (Name, Description) VALUES (@name, @description);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS RoleId;
      `)
    const roleId = insertResult.recordset[0].RoleId

    await replacePermissions(transaction, roleId, body.permissions)

    const selectResult = await new sql.Request(transaction).input('id', sql.Int, roleId).query('SELECT * FROM portal.Roles WHERE RoleId = @id')
    await transaction.commit()
    res.status(201).json(toRole(selectResult.recordset[0], body.permissions))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A role with that name already exists.' })
    next(err)
  }
})

router.put('/:id', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const id = Number(req.params.id)
    const body = req.body || {}
    const name = (body.name || '').trim()
    if (!name) return res.status(400).json({ error: 'Name is required.' })

    await transaction.begin()

    const existingResult = await new sql.Request(transaction).input('id', sql.Int, id).query('SELECT IsProtected FROM portal.Roles WHERE RoleId = @id')
    const existing = existingResult.recordset[0]
    if (!existing) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Role not found.' })
    }
    if (existing.IsProtected) {
      await transaction.rollback()
      return res.status(400).json({ error: 'The Admin role cannot be edited.' })
    }

    await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(100), name)
      .input('description', sql.NVarChar(500), (body.description || '').trim() || null)
      .query('UPDATE portal.Roles SET Name = @name, Description = @description, UpdatedAt = SYSUTCDATETIME() WHERE RoleId = @id')

    await replacePermissions(transaction, id, body.permissions)

    const selectResult = await new sql.Request(transaction).input('id', sql.Int, id).query('SELECT * FROM portal.Roles WHERE RoleId = @id')
    await transaction.commit()
    res.json(toRole(selectResult.recordset[0], body.permissions))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A role with that name already exists.' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const pool = await getPool()

    const existingResult = await pool.request().input('id', sql.Int, id).query('SELECT IsProtected FROM portal.Roles WHERE RoleId = @id')
    const existing = existingResult.recordset[0]
    if (!existing) return res.status(404).json({ error: 'Role not found.' })
    if (existing.IsProtected) return res.status(400).json({ error: 'The Admin role cannot be deleted.' })

    // ON DELETE CASCADE clears out RolePermissions/UserRoles/GroupRoles that
    // reference it as part of the same statement.
    await pool.request().input('id', sql.Int, id).query('DELETE FROM portal.Roles WHERE RoleId = @id')
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
