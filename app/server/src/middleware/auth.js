import jwt from 'jsonwebtoken'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated.' })

  try {
    req.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    res.status(401).json({ error: 'Session expired or invalid — please sign in again.' })
  }
}

// A user's effective access is the union of every role assigned directly to
// them plus every role assigned to any group they belong to. Any one of
// those roles having IsFullAccess (only the seeded, protected 'Admin' role
// does) grants unconditional access — nothing else needs to be granted
// individually. Queried live (not baked into the JWT) so a role/group change
// an admin just made takes effect on the user's very next request, not just
// their next login.
export async function getEffectiveAccess(pool, userId) {
  const result = await pool.request().input('userId', sql.Int, userId).query(`
    ;WITH MyRoleIds AS (
      SELECT RoleId FROM portal.UserRoles WHERE UserId = @userId
      UNION
      SELECT gr.RoleId FROM portal.UserGroupMembers m
        JOIN portal.GroupRoles gr ON gr.GroupId = m.GroupId
        WHERE m.UserId = @userId
    )
    SELECT r.RoleId, r.Name, r.IsFullAccess, rp.ResourceType, rp.ResourceKey
    FROM MyRoleIds x
    JOIN portal.Roles r ON r.RoleId = x.RoleId
    LEFT JOIN portal.RolePermissions rp ON rp.RoleId = r.RoleId
  `)

  const roles = new Map()
  const pages = new Set()
  const applications = new Set()
  let isAdmin = false

  for (const row of result.recordset) {
    roles.set(row.RoleId, row.Name)
    if (row.IsFullAccess) isAdmin = true
    if (row.ResourceType === 'page') pages.add(row.ResourceKey)
    else if (row.ResourceType === 'application') applications.add(row.ResourceKey)
  }

  return { isAdmin, roles: [...roles].map(([id, name]) => ({ id, name })), pages, applications }
}

export async function requireAdmin(req, res, next) {
  try {
    const pool = await getPool()
    const access = await getEffectiveAccess(pool, req.user.sub)
    if (!access.isAdmin) return res.status(403).json({ error: 'Admin access required.' })
    next()
  } catch (err) {
    next(err)
  }
}

function requirePermissions(checks) {
  return async (req, res, next) => {
    try {
      const pool = await getPool()
      const access = await getEffectiveAccess(pool, req.user.sub)
      if (access.isAdmin) return next()

      const allowed = checks.some(([type, key]) => (type === 'page' ? access.pages : access.applications).has(key))
      if (!allowed) return res.status(403).json({ error: 'You do not have access to this.' })
      next()
    } catch (err) {
      next(err)
    }
  }
}

// requirePermission('page', 'admin-employees')
export function requirePermission(type, key) {
  return requirePermissions([[type, key]])
}

// requireAnyPermission(['page', 'complaints'], ['page', 'admin-complaints'])
export function requireAnyPermission(...typeKeyPairs) {
  return requirePermissions(typeKeyPairs)
}
