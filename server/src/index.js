import app from './app.js'
import { env } from './config/env.js'

// Without these, an error thrown outside a request's try/catch (or a
// rejected promise nobody awaited) crashes the process with no trace in
// some cases — logging first makes that diagnosable instead of a silent
// disappearance.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err)
  process.exit(1)
})
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err)
  process.exit(1)
})

app.listen(env.port, () => {
  console.log(`Syncaxis Portal API listening on port ${env.port}`)
})
