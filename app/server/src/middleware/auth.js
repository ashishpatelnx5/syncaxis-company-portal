import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

// Portal no longer authenticates passwords itself — syncaxis-iam does, and
// returns a flat `perms: string[]` (e.g. 'portal.directory.view') plus
// `isFullAccess`. This in-memory session map is what lets Portal keep
// issuing its own short-lived JWT to its own frontend (unchanged contract)
// while remembering, per session, the syncaxis-iam token needed to
// re-verify and the last access syncaxis-iam reported. In-memory only, same
// tradeoff as everything else here: a server restart just means everyone
// signs back in — a few seconds, since syncaxis-iam does the real work.
const sessions = new Map() // sid -> SessionRecord
const REVERIFY_INTERVAL_MS = 5 * 60 * 1000

// SessionRecord: { iamUserId, username, displayName, roles, lastLoginAt,
// passwordChangedAt, mustChangePassword, iamToken, perms, isFullAccess,
// lastVerifiedAt }
export function createSession(iamUser, iamToken) {
  const sid = crypto.randomBytes(24).toString('hex')
  sessions.set(sid, {
    iamUserId: iamUser.id,
    username: iamUser.username,
    displayName: iamUser.displayName || iamUser.username,
    roles: iamUser.roles || [],
    lastLoginAt: iamUser.lastLoginAt || null,
    passwordChangedAt: iamUser.passwordChangedAt || null,
    mustChangePassword: Boolean(iamUser.mustChangePassword),
    iamToken,
    perms: iamUser.perms || [],
    isFullAccess: Boolean(iamUser.isFullAccess),
    lastVerifiedAt: Date.now(),
  })
  return sid
}

export function getSession(sid) {
  return sessions.get(sid)
}

// passwordChangedAt/mustChangePassword are optional - only /change-password's
// own re-login passes them (the periodic reverifyWithIam below refreshes
// them from every other syncaxis-iam response already).
export function updateSessionIamToken(sid, iamToken, passwordChangedAt, mustChangePassword) {
  const session = sessions.get(sid)
  if (!session) return
  session.iamToken = iamToken
  if (passwordChangedAt !== undefined) session.passwordChangedAt = passwordChangedAt
  if (mustChangePassword !== undefined) session.mustChangePassword = mustChangePassword
}

export function destroySession(sid) {
  sessions.delete(sid)
}

export function signPortalToken({ sid, iamUserId, username }) {
  return jwt.sign({ sub: iamUserId, sid, username }, env.jwtSecret, { expiresIn: env.jwtExpiresIn })
}

const PORTAL_PERM = /^portal\.([a-z0-9-]+)\.(view|manage|access)$/

// Exact inverse of how the AuthCenter migration built these keys — round-
// trips correctly against every migrated permission. Ignores keys belonging
// to other apps registered in syncaxis-iam, if any ever appear here.
export function accessFromIamUser({ perms, isFullAccess }) {
  const pages = []
  const applications = []
  for (const key of perms || []) {
    const match = key.match(PORTAL_PERM)
    if (!match) continue
    const [, resourceKey, action] = match
    if (action === 'access') applications.push(resourceKey)
    else pages.push(resourceKey) // 'view' or 'manage'
  }
  return { pages, applications, isAdmin: Boolean(isFullAccess) }
}

// Same shape Portal's frontend and Leads/ERP's backends have always
// consumed from /login, /sso/exchange, and /me — building it from the
// cached session keeps all three call sites in sync automatically.
// `employeeId` isn't on the session; syncaxis-iam doesn't know about it, so
// callers resolve it from portal.Employees.AuthUserId and pass it in.
export function toUserSummary(session, employeeId) {
  const access = accessFromIamUser(session)
  return {
    id: session.iamUserId,
    username: session.username,
    displayName: session.displayName,
    employeeId: employeeId ?? null,
    isAdmin: access.isAdmin,
    roles: session.roles,
    lastLoginAt: session.lastLoginAt,
    passwordChangedAt: session.passwordChangedAt,
    mustChangePassword: session.mustChangePassword,
    permissions: { pages: access.pages, applications: access.applications },
  }
}

// Re-checks a session against syncaxis-iam, no more often than
// REVERIFY_INTERVAL_MS — so a permission/role change or deactivation made
// there takes effect within a few minutes, not just at next login, without
// hitting syncaxis-iam on every request. If it's unreachable (network blip,
// restart), the cached session is trusted until its JWT expires rather than
// logging everyone out over it; an explicit 401 (deactivated, revoked,
// password changed elsewhere) ends the session immediately.
async function reverifyWithIam(session) {
  try {
    const res = await fetch(`${env.iamApiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${session.iamToken}` },
    })
    if (res.status === 401) return 'revoked'
    if (!res.ok) return 'ok' // syncaxis-iam hiccup (5xx) — keep the cached session

    const body = await res.json()
    session.displayName = body.user?.displayName || session.displayName
    session.roles = body.user?.roles || session.roles
    session.lastLoginAt = body.user?.lastLoginAt || session.lastLoginAt
    session.passwordChangedAt = body.user?.passwordChangedAt ?? session.passwordChangedAt
    session.mustChangePassword = Boolean(body.user?.mustChangePassword)
    session.perms = body.user?.perms || []
    session.isFullAccess = Boolean(body.user?.isFullAccess)
    session.lastVerifiedAt = Date.now()
    return 'ok'
  } catch (err) {
    console.error('syncaxis-iam re-verification failed — keeping cached session until it expires:', err)
    return 'ok'
  }
}

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not authenticated.' })

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid — please sign in again.' })
  }

  const session = sessions.get(payload.sid)
  if (!session) return res.status(401).json({ error: 'Session expired or invalid — please sign in again.' })

  if (Date.now() - session.lastVerifiedAt > REVERIFY_INTERVAL_MS) {
    const outcome = await reverifyWithIam(session)
    if (outcome === 'revoked') {
      destroySession(payload.sid)
      return res.status(401).json({ error: 'Session no longer valid.' })
    }
  }

  req.user = { sub: payload.sub, sid: payload.sid, username: payload.username }
  req.session = session
  next()
}

export function requireAdmin(req, res, next) {
  const access = accessFromIamUser(req.session)
  if (!access.isAdmin) return res.status(403).json({ error: 'Admin access required.' })
  next()
}

function requirePermissions(checks) {
  return (req, res, next) => {
    const access = accessFromIamUser(req.session)
    if (access.isAdmin) return next()

    const allowed = checks.some(([type, key]) => (type === 'page' ? access.pages : access.applications).includes(key))
    if (!allowed) return res.status(403).json({ error: 'You do not have access to this.' })
    next()
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
