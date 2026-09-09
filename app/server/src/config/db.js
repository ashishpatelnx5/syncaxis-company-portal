import sql from 'mssql'
import { env } from './env.js'

// `DB_SERVER` may be `HOST`, `HOST\INSTANCE` (a named instance, e.g. the
// default SQL Server Express setup — needs SQL Server Browser running to
// resolve), or `HOST,PORT` (connect straight to a fixed TCP port, no
// Browser service needed). tedious wants the instance name and port split
// out into their own config fields rather than embedded in the server string.
const [hostAndPort, instanceName] = env.db.server.split('\\')
const [host, port] = hostAndPort.split(',')

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
  ...(port ? { port: Number(port) } : {}),
}

let poolPromise

export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config)
    // ConnectionPool is an EventEmitter — an 'error' event with no listener
    // (e.g. a dropped connection, a network blip) crashes the entire Node
    // process by design. Log it and drop the pool instead, so the next
    // request just reconnects.
    pool.on('error', (err) => {
      console.error('SQL Server connection pool error:', err)
      poolPromise = undefined
    })
    poolPromise = pool.connect().catch((err) => {
      poolPromise = undefined // allow the next request to retry rather than staying stuck on a dead promise
      throw err
    })
  }
  return poolPromise
}

export { sql }
