import sql from 'mssql'
import { env } from './env.js'

// `DB_SERVER` may be `HOST` or `HOST\INSTANCE` (a named instance, e.g. the
// default SQL Server Express setup). tedious wants the instance name split
// out into options.instanceName rather than embedded in the server string.
const [host, instanceName] = env.db.server.split('\\')

const config = {
  server: host,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  options: {
    encrypt: env.db.encrypt,
    trustServerCertificate: env.db.trustServerCertificate,
    ...(instanceName ? { instanceName } : {}),
  },
}

let poolPromise

export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect().catch((err) => {
      poolPromise = undefined // allow the next request to retry rather than staying stuck on a dead promise
      throw err
    })
  }
  return poolPromise
}

export { sql }
