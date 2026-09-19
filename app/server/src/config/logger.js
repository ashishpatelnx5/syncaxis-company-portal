import fs from 'fs'
import path from 'path'
import util from 'util'
import { env } from './env.js'

// Writes server logs to <LOG_DIR>/portal-YYYY-MM-DD.log (one file per day,
// local time) and keeps console output as-is. Files older than
// LOG_RETENTION_DAYS are deleted on startup and whenever the day rolls over.
// If the folder can't be created or written to (e.g. an unreachable network
// share), logging falls back to console-only rather than taking the app down.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const threshold = LEVELS[env.log.level] ?? LEVELS.info
const FILE_RE = /^portal-(\d{4}-\d{2}-\d{2})\.log$/

let fileLoggingOk = false
let lastPurgeDay = ''

const pad = (n) => String(n).padStart(2, '0')
const dayStamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const timeStamp = (d) => `${dayStamp(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, '0')}`

function purgeOldLogs(now) {
  const today = dayStamp(now)
  if (today === lastPurgeDay) return
  lastPurgeDay = today
  const cutoff = dayStamp(new Date(now.getFullYear(), now.getMonth(), now.getDate() - env.log.retentionDays))
  try {
    for (const name of fs.readdirSync(env.log.dir)) {
      const m = FILE_RE.exec(name)
      if (m && m[1] < cutoff) fs.unlinkSync(path.join(env.log.dir, name))
    }
  } catch {
    // Best-effort cleanup; never let it break logging.
  }
}

try {
  fs.mkdirSync(env.log.dir, { recursive: true })
  fileLoggingOk = true
} catch (err) {
  process.stderr.write(`Log folder "${env.log.dir}" is not usable (${err.message}) - logging to console only.\n`)
}

function write(level, args) {
  if (LEVELS[level] > threshold) return
  const now = new Date()
  const line = `${timeStamp(now)} [${level.toUpperCase()}] ${util.format(...args)}\n`
  if (!fileLoggingOk) return
  try {
    purgeOldLogs(now)
    // Synchronous so the last lines (e.g. an uncaught exception right before
    // process.exit) are never lost. Volume here is low.
    fs.appendFileSync(path.join(env.log.dir, `portal-${dayStamp(now)}.log`), line)
  } catch {
    fileLoggingOk = false
    process.stderr.write(`Could not write to log folder "${env.log.dir}" - logging to console only.\n`)
  }
}

export const logger = {
  error: (...args) => write('error', args),
  warn: (...args) => write('warn', args),
  info: (...args) => write('info', args),
  debug: (...args) => write('debug', args),
}

// Mirror the existing console.log/warn/error calls across the codebase into
// the log file, so nothing needs to be rewritten.
export function captureConsole() {
  const original = { log: console.log, info: console.info, warn: console.warn, error: console.error }
  console.log = (...args) => { original.log(...args); write('info', args) }
  console.info = (...args) => { original.info(...args); write('info', args) }
  console.warn = (...args) => { original.warn(...args); write('warn', args) }
  console.error = (...args) => { original.error(...args); write('error', args) }
}

// One line per finished API request: method, url (no body, no headers),
// status, duration. /api/health is skipped so monitors don't flood the log.
export function requestLogger(req, res, next) {
  if (!req.originalUrl.startsWith('/api') || req.originalUrl === '/api/health') return next()
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    write(level, [`${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(0)}ms`])
  })
  next()
}
