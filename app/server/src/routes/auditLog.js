import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

// Admin-only, full stop — not a grantable page permission like every other
// admin-* route (see requirePermission elsewhere), since this is the record
// of who did what and shouldn't be extensible to HR the way employee
// management is.
const router = Router()
router.use(requireAuth, requireAdmin)

const PAGE_SIZE = 50

// GET /api/audit-log?page=&eventType=&entityType=&userId=&search=&from=&to=
router.get('/', async (req, res, next) => {
  try {
    const { page = '1', eventType, entityType, userId, search, from, to } = req.query
    const pageNum = Math.max(1, Number(page) || 1)

    const pool = await getPool()
    const request = pool.request()
    let where = '1=1'

    if (eventType) {
      request.input('eventType', sql.NVarChar(50), eventType)
      where += ' AND EventType = @eventType'
    }
    if (entityType) {
      request.input('entityType', sql.NVarChar(50), entityType)
      where += ' AND EntityType = @entityType'
    }
    if (userId) {
      request.input('userId', sql.Int, Number(userId))
      where += ' AND UserId = @userId'
    }
    if (search) {
      request.input('search', sql.NVarChar(200), `%${search}%`)
      where += ' AND (Username LIKE @search OR Detail LIKE @search OR EntityType LIKE @search OR EventType LIKE @search OR IpAddress LIKE @search)'
    }
    if (from) {
      request.input('from', sql.DateTime2, new Date(from))
      where += ' AND CreatedAt >= @from'
    }
    if (to) {
      request.input('to', sql.DateTime2, new Date(to))
      where += ' AND CreatedAt <= @to'
    }

    request.input('offset', sql.Int, (pageNum - 1) * PAGE_SIZE).input('pageSize', sql.Int, PAGE_SIZE)

    const result = await request.query(`
      SELECT AuditId, UserId, Username, EventType, EntityType, EntityId, Detail, IpAddress, CreatedAt
      FROM portal.AuditLog
      WHERE ${where}
      ORDER BY CreatedAt DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `)

    res.json({
      entries: result.recordset.map((r) => ({
        id: r.AuditId,
        userId: r.UserId,
        username: r.Username,
        eventType: r.EventType,
        entityType: r.EntityType,
        entityId: r.EntityId,
        detail: r.Detail,
        ipAddress: r.IpAddress,
        createdAt: r.CreatedAt.toISOString(),
      })),
      page: pageNum,
      pageSize: PAGE_SIZE,
    })
  } catch (err) {
    next(err)
  }
})

export default router
