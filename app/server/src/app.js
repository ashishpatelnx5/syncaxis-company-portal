import cors from 'cors'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { env } from './config/env.js'
import authRoutes from './routes/auth.js'
import dailyPlansRoutes from './routes/dailyPlans.js'
import departmentsRoutes from './routes/departments.js'
import employeesRoutes from './routes/employees.js'
import holidaysRoutes from './routes/holidays.js'
import jobDescriptionsRoutes from './routes/jobDescriptions.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// The frontend's build output — one level up from server/, in app/.
const distDir = path.resolve(__dirname, '../../dist')

const app = express()

app.use(cors({ origin: env.corsOrigins }))
app.use(express.json({ limit: '5mb' })) // employee photos are base64 data URLs

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/departments', departmentsRoutes)
app.use('/api/job-descriptions', jobDescriptionsRoutes)
app.use('/api/daily-plans', dailyPlansRoutes)
app.use('/api/holidays', holidaysRoutes)
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }))

// Serves the built React app on this same port/process — run `npm run
// build` in app/ first. Any route that isn't /api/* falls back to
// index.html so React Router can handle client-side navigation.
app.use(express.static(distDir))
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'That photo is too large — try a smaller image.' })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

export default app
