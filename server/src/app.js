import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import authRoutes from './routes/auth.js'
import departmentsRoutes from './routes/departments.js'
import employeesRoutes from './routes/employees.js'

const app = express()

app.use(cors({ origin: env.corsOrigins }))
app.use(express.json({ limit: '5mb' })) // employee photos are base64 data URLs

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/employees', employeesRoutes)
app.use('/api/departments', departmentsRoutes)

app.use((req, res) => res.status(404).json({ error: 'Not found.' }))

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server.' })
})

export default app
