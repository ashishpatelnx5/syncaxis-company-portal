import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'

function required(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT) || 8050,
  db: {
    server: required('DB_SERVER'),
    database: required('DB_NAME'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
  },
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  // syncaxis-iam is now the identity/permission authority — Portal proxies
  // auth to it and translates the response back into its own shape (see
  // middleware/auth.js). No trailing slash expected.
  iamApiUrl: required('IAM_API_URL'),
  // Base folder for employee personal documents — see config/docsStorage.js.
  docsMountPath: required('DOCS_MOUNT_PATH'),
  // Server log files — see config/logger.js. Optional; defaults to server/logs.
  log: {
    dir: process.env.LOG_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../logs'),
    level: (process.env.LOG_LEVEL || 'info').toLowerCase(),
    retentionDays: Number(process.env.LOG_RETENTION_DAYS) || 30,
  },
}
