import app from './app.js'
import { env } from './config/env.js'

app.listen(env.port, () => {
  console.log(`Syncaxis Portal API listening on port ${env.port}`)
})
