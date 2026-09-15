import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireAdmin)

function toGroup(row, memberIds, roles) {
  return {
    id: row.GroupId,
    name: row.Name,
    description: row.Description || '',
    memberIds: memberIds || [],
    roles: roles || [],
  }
}

async function fetchMembersByGroup(pool) {
  const result = await pool.request().query('SELECT GroupId, UserId FROM portal.UserGroupMembers')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.GroupId)) map.set(row.GroupId, [])
    map.get(row.GroupId).push(row.UserId)
  }
  return map
}

async function fetchRolesByGroup(pool) {
  const result = await pool
    .request()
    .query('SELECT gr.GroupId, r.RoleId, r.Name FROM portal.GroupRoles gr JOIN portal.Roles r ON r.RoleId = gr.RoleId')
  const map = new Map()
  for (const row of result.recordset) {
    if (!map.has(row.GroupId)) map.set(row.GroupId, [])
    map.get(row.GroupId).push({ id: row.RoleId, name: row.Name })
  }
  return map
}

async function replaceMembers(transaction, groupId, memberIds) {
  await new sql.Request(transaction).input('groupId', sql.Int, groupId).query('DELETE FROM portal.UserGroupMembers WHERE GroupId = @groupId')
  for (const userId of Array.isArray(memberIds) ? memberIds : []) {
    await new sql.Request(transaction)
      .input('groupId', sql.Int, groupId)
      .input('userId', sql.Int, userId)
      .query('INSERT INTO portal.UserGroupMembers (GroupId, UserId) VALUES (@groupId, @userId)')
  }
}

async function replaceRoles(transaction, groupId, roleIds) {
  await new sql.Request(transaction).input('groupId', sql.Int, groupId).query('DELETE FROM portal.GroupRoles WHERE GroupId = @groupId')
  for (const roleId of Array.isArray(roleIds) ? roleIds : []) {
    await new sql.Request(transaction)
      .input('groupId', sql.Int, groupId)
      .input('roleId', sql.Int, roleId)
      .query('INSERT INTO portal.GroupRoles (GroupId, RoleId) VALUES (@groupId, @roleId)')
  }
}

router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool()
    const [groupsResult, membersByGroup, rolesByGroup] = await Promise.all([
      pool.request().query('SELECT * FROM portal.UserGroups ORDER BY Name'),
      fetchMembersByGroup(pool),
      fetchRolesByGroup(pool),
    ])
    res.json(groupsResult.recordset.map((row) => toGroup(row, membersByGroup.get(row.GroupId), rolesByGroup.get(row.GroupId))))
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
      .query(`
        INSERT INTO portal.UserGroups (Name, Description) VALUES (@name, @description);
        SELECT CAST(SCOPE_IDENTITY() AS INT) AS GroupId;
      `)
    const groupId = insertResult.recordset[0].GroupId

    await replaceMembers(transaction, groupId, body.memberIds)
    await replaceRoles(transaction, groupId, body.roleIds)

    const selectResult = await new sql.Request(transaction).input('id', sql.Int, groupId).query('SELECT * FROM portal.UserGroups WHERE GroupId = @id')
    await transaction.commit()
    res.status(201).json(toGroup(selectResult.recordset[0], body.memberIds, []))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A group with that name already exists.' })
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
    const updateResult = await new sql.Request(transaction)
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(100), name)
      .input('description', sql.NVarChar(500), (body.description || '').trim() || null)
      .query('UPDATE portal.UserGroups SET Name = @name, Description = @description, UpdatedAt = SYSUTCDATETIME() WHERE GroupId = @id')

    if (updateResult.rowsAffected[0] === 0) {
      await transaction.rollback()
      return res.status(404).json({ error: 'Group not found.' })
    }

    await replaceMembers(transaction, id, body.memberIds)
    await replaceRoles(transaction, id, body.roleIds)

    const selectResult = await new sql.Request(transaction).input('id', sql.Int, id).query('SELECT * FROM portal.UserGroups WHERE GroupId = @id')
    await transaction.commit()
    res.json(toGroup(selectResult.recordset[0], body.memberIds, []))
  } catch (err) {
    await transaction.rollback().catch(() => {})
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'A group with that name already exists.' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const pool = await getPool()
    // ON DELETE CASCADE clears UserGroupMembers/GroupRoles that reference it
    // as part of the same statement.
    const result = await pool.request().input('id', sql.Int, id).query('DELETE FROM portal.UserGroups WHERE GroupId = @id')
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: 'Group not found.' })
    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

export default router
