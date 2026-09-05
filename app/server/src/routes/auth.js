import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { getPool, sql } from '../config/db.js'
import { env } from '../config/env.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

function signToken(user) {
  return jwt.sign({ sub: user.UserId, username: user.Username, role: user.Role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  })
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' })

    const pool = await getPool()
    const result = await pool
      .request()
      .input('username', sql.NVarChar(100), username.trim())
      .query('SELECT UserId, Username, PasswordHash, Role, IsActive FROM portal.Users WHERE Username = @username')

    const user = result.recordset[0]
    const invalidMessage = { error: 'Incorrect username or password.' }
    if (!user || !user.IsActive) return res.status(401).json(invalidMessage)

    const ok = await bcrypt.compare(password, user.PasswordHash)
    if (!ok) return res.status(401).json(invalidMessage)

    await pool
      .request()
      .input('id', sql.Int, user.UserId)
      .query('UPDATE portal.Users SET LastLoginAt = SYSUTCDATETIME() WHERE UserId = @id')

    res.json({ token: signToken(user), user: { username: user.Username, role: user.Role } })
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
      .query('SELECT Username, Role, IsActive FROM portal.Users WHERE UserId = @id')

    const user = result.recordset[0]
    if (!user || !user.IsActive) return res.status(401).json({ error: 'Session no longer valid.' })

    res.json({ user: { username: user.Username, role: user.Role } })
  } catch (err) {
    next(err)
  }
})

export default router
