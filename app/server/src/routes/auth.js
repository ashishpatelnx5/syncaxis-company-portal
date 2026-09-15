import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'
import {
  createSession,
  destroySession,
  getSession,
  requireAuth,
  signPortalToken,
  toUserSummary,
  updateSessionIamToken,
} from '../middleware/auth.js'

const router = Router()

async function resolveEmployeeId(pool, iamUserId) {
  const result = await pool.request().input('id', sql.Int, iamUserId).query('SELECT EmployeeId FROM portal.Employees WHERE AuthUserId = @id')
  return result.recordset[0]?.EmployeeId ?? null
}

// Shared by /login and /sso/exchange: both end up with the same
// {token, user} shape from syncaxis-iam — this is the one place that turns
// it into a Portal session and Portal's own {token, user} response.
async function establishSession(iamData) {
  const pool = await getPool()
  const employeeId = await resolveEmployeeId(pool, iamData.user.id)
  const sid = createSession(iamData.user, iamData.token)
  const token = signPortalToken({ sid, iamUserId: iamData.user.id, username: iamData.user.username })
  return { token, user: toUserSummary(getSession(sid), employeeId) }
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })

    let iamRes
    try {
      iamRes = await fetch(`${env.iamApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
    } catch (err) {
      console.error('syncaxis-iam unreachable during login:', err)
      return res.status(503).json({ error: 'Cannot reach the identity service right now. Please try again shortly.' })
    }

    const data = await iamRes.json().catch(() => ({}))
    if (!iamRes.ok) return res.status(iamRes.status).json({ error: data.error || 'Login failed.' })

    res.json(await establishSession(data))
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

    const iamRes = await fetch(`${env.iamApiUrl}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${req.session.iamToken}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (!iamRes.ok) {
      const data = await iamRes.json().catch(() => ({}))
      const fallback = iamRes.status === 401 ? 'Current password is incorrect.' : 'Could not change password.'
      return res.status(iamRes.status).json({ error: data.error || fallback })
    }

    // syncaxis-iam may revoke this session's token as part of a password
    // change — re-authenticate with the new password right away so this
    // browser tab doesn't get logged out on its next 5-minute re-verify.
    try {
      const reloginRes = await fetch(`${env.iamApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: req.user.username, password: newPassword }),
      })
      const reloginData = await reloginRes.json().catch(() => ({}))
      if (reloginRes.ok) updateSessionIamToken(req.user.sid, reloginData.token)
    } catch (err) {
      console.error('Re-authentication after password change failed — session keeps its old syncaxis-iam token:', err)
    }

    res.status(204).end()
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const pool = await getPool()
    const employeeId = await resolveEmployeeId(pool, req.session.iamUserId)
    res.json({ user: toUserSummary(req.session, employeeId) })
  } catch (err) {
    next(err)
  }
})

// POST /sso/issue - called by Portal's own frontend (with the current
// user's normal Bearer token) right before redirecting to a satellite app's
// tile URL. Proxies straight to syncaxis-iam's own handoff-code endpoint
// using this session's stored iam token; the code itself is opaque to
// Portal either way, so there's nothing left to do but relay it.
router.post('/sso/issue', requireAuth, async (req, res, next) => {
  try {
    const iamRes = await fetch(`${env.iamApiUrl}/auth/sso/issue`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${req.session.iamToken}` },
    })
    const data = await iamRes.json().catch(() => ({}))
    if (!iamRes.ok) return res.status(iamRes.status).json({ error: data.error || 'Could not start sign-in handoff.' })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

// POST /sso/exchange - called server-to-server by a satellite app's backend
// (Leads Tracker, ERP Dashboard — never a browser) to trade a handoff code
// for the same {token, user} shape /login returns. Portal exchanges the
// code with syncaxis-iam itself, then establishes its own local session
// exactly as /login does, so those apps never notice the identity provider
// behind Portal changed.
router.post('/sso/exchange', async (req, res, next) => {
  try {
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Missing sign-in code.' })

    const iamRes = await fetch(`${env.iamApiUrl}/auth/sso/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    const data = await iamRes.json().catch(() => ({}))
    if (!iamRes.ok) {
      return res.status(iamRes.status).json({ error: data.error || 'This sign-in link has expired — please try again from the Portal.' })
    }

    res.json(await establishSession(data))
  } catch (err) {
    next(err)
  }
})

router.post('/logout', requireAuth, async (req, res) => {
  destroySession(req.user.sid)
  // Best-effort, mainly for symmetry/audit on syncaxis-iam's side — Portal's
  // own session is already gone regardless of whether this succeeds.
  fetch(`${env.iamApiUrl}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${req.session.iamToken}` },
  }).catch(() => {})
  res.status(204).end()
})

export default router
