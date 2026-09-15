import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'
import { getEffectiveAccess, requireAuth } from '../middleware/auth.js'

const router = Router()

const MAX_FAILED_LOGINS = 3

// Short-lived, single-use handoff codes so clicking a "Leads Tracker"-style
// app tile can land the user already signed in there, without ever putting
// the real JWT in a URL (which browser history/referrers/logs could leak).
// In-memory only, same tradeoff as everything else here — an app restart
// just means anyone mid-handoff has to click the tile again.
const ssoCodes = new Map() // code -> { userId, expiresAt }
const SSO_CODE_TTL_MS = 60 * 1000

function sweepExpiredSsoCodes() {
  const now = Date.now()
  for (const [code, entry] of ssoCodes) {
    if (entry.expiresAt < now) ssoCodes.delete(code)
  }
}

function signToken(user) {
  return jwt.sign({ sub: user.UserId, username: user.Username }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

function toUserSummary(user, access) {
  return {
    id: user.UserId,
    username: user.Username,
    displayName: user.DisplayName || user.Username,
    employeeId: user.EmployeeId ?? null,
    isAdmin: access.isAdmin,
    roles: access.roles,
    lastLoginAt: user.LastLoginAt ? user.LastLoginAt.toISOString() : null,
    passwordChangedAt: user.PasswordChangedAt ? user.PasswordChangedAt.toISOString() : null,
    permissions: { pages: [...access.pages], applications: [...access.applications] },
  }
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })

    const pool = await getPool()
    const result = await pool
      .request()
      .input('username', sql.NVarChar(100), username.trim())
      .query(
        'SELECT UserId, Username, DisplayName, PasswordHash, IsActive, IsLocked, FailedLoginCount, LastLoginAt, PasswordChangedAt, EmployeeId FROM portal.Users WHERE Username = @username',
      )

    const user = result.recordset[0]
    const invalidMessage = { error: 'Incorrect username or password.' }
    if (!user || !user.IsActive) return res.status(401).json(invalidMessage)

    if (user.IsLocked) {
      return res.status(423).json({ error: 'This account is locked. Contact an administrator to unlock it.' })
    }

    const ok = await bcrypt.compare(password, user.PasswordHash)
    if (!ok) {
      const failedCount = user.FailedLoginCount + 1
      const locksNow = failedCount >= MAX_FAILED_LOGINS
      await pool
        .request()
        .input('id', sql.Int, user.UserId)
        .input('failedCount', sql.Int, failedCount)
        .input('isLocked', sql.Bit, locksNow)
        .query('UPDATE portal.Users SET FailedLoginCount = @failedCount, IsLocked = @isLocked WHERE UserId = @id')

      if (locksNow) {
        return res.status(423).json({
          error: `Too many failed attempts — this account is now locked. Contact an administrator to unlock it.`,
        })
      }
      return res.status(401).json(invalidMessage)
    }

    await pool
      .request()
      .input('id', sql.Int, user.UserId)
      .query('UPDATE portal.Users SET FailedLoginCount = 0, LastLoginAt = SYSUTCDATETIME() WHERE UserId = @id')

    const access = await getEffectiveAccess(pool, user.UserId)
    // LastLoginAt just got set server-side above — reflect that in the
    // response the freshly-signed-in user sees immediately, rather than the
    // pre-login value still sitting in `user`.
    res.json({ token: signToken(user), user: toUserSummary({ ...user, LastLoginAt: new Date() }, access) })
  } catch (err) {
    next(err)
  }
})

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {}
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required.' })
    }
    if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' })

    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.sub)
      .query('SELECT PasswordHash FROM portal.Users WHERE UserId = @id')

    const user = result.recordset[0]
    if (!user) return res.status(401).json({ error: 'Session no longer valid.' })

    const ok = await bcrypt.compare(currentPassword, user.PasswordHash)
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' })

    const passwordHash = await bcrypt.hash(newPassword, 12)
    await pool
      .request()
      .input('id', sql.Int, req.user.sub)
      .input('passwordHash', sql.NVarChar(255), passwordHash)
      .query('UPDATE portal.Users SET PasswordHash = @passwordHash, PasswordChangedAt = SYSUTCDATETIME() WHERE UserId = @id')

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, req.user.sub)
      .query('SELECT UserId, Username, DisplayName, IsActive, LastLoginAt, PasswordChangedAt, EmployeeId FROM portal.Users WHERE UserId = @id')

    const user = result.recordset[0]
    if (!user || !user.IsActive) return res.status(401).json({ error: 'Session no longer valid.' })

    const access = await getEffectiveAccess(pool, req.user.sub)
    res.json({ user: toUserSummary(user, access) })
  } catch (err) {
    next(err)
  }
})

// POST /api/auth/sso/issue - called by the Portal's own frontend (with the
// current user's normal Bearer token) right before redirecting to a
// satellite app's tile URL, so that app's own backend can exchange the code
// (server-to-server, see /sso/exchange) for a real login - the user never
// re-enters credentials or sees a second login screen.
router.post('/sso/issue', requireAuth, (req, res) => {
  sweepExpiredSsoCodes()
  const code = crypto.randomBytes(32).toString('hex')
  ssoCodes.set(code, { userId: req.user.sub, expiresAt: Date.now() + SSO_CODE_TTL_MS })
  res.json({ code })
})

// POST /api/auth/sso/exchange - called server-to-server by a satellite app's
// backend (never from a browser) to trade a handoff code for the same
// {token, user} shape /login returns. Single-use and short-lived: consumed
// immediately, and expires in SSO_CODE_TTL_MS even if unused.
router.post('/sso/exchange', async (req, res, next) => {
  try {
    const { code } = req.body || {}
    const entry = code ? ssoCodes.get(code) : null
    if (code) ssoCodes.delete(code)
    if (!entry || entry.expiresAt < Date.now()) {
      return res.status(401).json({ error: 'This sign-in link has expired - please try again from the Portal.' })
    }

    const pool = await getPool()
    const result = await pool
      .request()
      .input('id', sql.Int, entry.userId)
      .query(
        'SELECT UserId, Username, DisplayName, IsActive, LastLoginAt, PasswordChangedAt, EmployeeId FROM portal.Users WHERE UserId = @id',
      )

    const user = result.recordset[0]
    if (!user || !user.IsActive) return res.status(401).json({ error: 'Account is no longer active.' })

    const access = await getEffectiveAccess(pool, user.UserId)
    res.json({ token: signToken(user), user: toUserSummary(user, access) })
  } catch (err) {
    next(err)
  }
})

export default router
