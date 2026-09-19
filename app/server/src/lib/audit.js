import { getPool, sql } from '../config/db.js'

// Fire-and-forget by design (mirrors syncaxis-iam's own lib/audit.ts) — a
// failure to write an audit row should never fail the request that
// triggered it. Errors are logged, not thrown. See migration 24 for the
// table shape; UserId isn't a real foreign key here since identity now
// lives in syncaxis-iam's own database, so Username is a snapshot taken at
// write time rather than joined at read time.
export async function writeAuditLog({ userId, username, eventType, entityType, entityId, detail, ipAddress }) {
  try {
    const pool = await getPool()
    await pool
      .request()
      .input('userId', sql.Int, userId ?? null)
      .input('username', sql.NVarChar(100), username ?? null)
      .input('eventType', sql.NVarChar(50), eventType)
      .input('entityType', sql.NVarChar(50), entityType ?? null)
      .input('entityId', sql.NVarChar(50), entityId != null ? String(entityId) : null)
      .input('detail', sql.NVarChar(1000), detail ?? null)
      .input('ipAddress', sql.VarChar(45), ipAddress ?? null)
      .query(`
        INSERT INTO portal.AuditLog (UserId, Username, EventType, EntityType, EntityId, Detail, IpAddress)
        VALUES (@userId, @username, @eventType, @entityType, @entityId, @detail, @ipAddress)
      `)
  } catch (err) {
    console.error('Failed to write audit log entry:', eventType, err)
  }
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim()
  return req.socket?.remoteAddress ?? null
}

// Shared by every mutating route below requireAuth - req.user/req.session
// are always populated there (see middleware/auth.js), so this just picks
// the fields writeAuditLog wants off of them.
export function auditContext(req) {
  return {
    userId: req.user?.sub ?? null,
    username: req.session?.displayName || req.session?.username || req.user?.username || null,
    ipAddress: clientIp(req),
  }
}
