import { Router } from 'express'
import { getPool, sql } from '../config/db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

function toSlot(row) {
  return {
    slotIndex: row.SlotIndex,
    planText: row.PlanText || '',
    actualText: row.ActualText || '',
    valueAddedHrs: row.ValueAddedHrs,
    nonValueAddedHrs: row.NonValueAddedHrs,
    remarks: row.Remarks || '',
  }
}

function dateOnly(date) {
  // mssql returns DATE columns as JS Date objects at UTC midnight — format
  // back to plain YYYY-MM-DD so the frontend never has to think about time zones.
  return date.toISOString().slice(0, 10)
}

// This employee's daily plans (with slots) for one calendar month — powers
// the personal month-grid calendar. Only days with a saved plan come back;
// the frontend treats every other day in the month as blank.
router.get('/', async (req, res, next) => {
  try {
    const employeeId = Number(req.query.employeeId)
    const month = req.query.month // 'YYYY-MM'
    if (!employeeId || !/^\d{4}-\d{2}$/.test(month || '')) {
      return res.status(400).json({ error: 'employeeId and month (YYYY-MM) are required.' })
    }

    const pool = await getPool()
    const plansResult = await pool
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('month', sql.NVarChar(7), month)
      .query(`
        SELECT * FROM portal.DailyPlans
        WHERE EmployeeId = @employeeId AND FORMAT(PlanDate, 'yyyy-MM') = @month
      `)

    const plans = plansResult.recordset
    if (plans.length === 0) return res.json([])

    const planIds = plans.map((p) => p.DailyPlanId)
    const slotsResult = await pool
      .request()
      .query(`SELECT * FROM portal.DailyPlanSlots WHERE DailyPlanId IN (${planIds.join(',')}) ORDER BY SlotIndex`)

    const slotsByPlan = new Map()
    for (const row of slotsResult.recordset) {
      if (!slotsByPlan.has(row.DailyPlanId)) slotsByPlan.set(row.DailyPlanId, [])
      slotsByPlan.get(row.DailyPlanId).push(toSlot(row))
    }

    res.json(
      plans.map((p) => ({
        employeeId: p.EmployeeId,
        date: dateOnly(p.PlanDate),
        selfAssessment: p.SelfAssessment,
        slots: slotsByPlan.get(p.DailyPlanId) || [],
      })),
    )
  } catch (err) {
    next(err)
  }
})

// Lightweight per-employee-per-day status for the whole team over one
// month — no slot detail — powers the admin oversight matrix.
router.get('/team-summary', async (req, res, next) => {
  try {
    const month = req.query.month
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      return res.status(400).json({ error: 'month (YYYY-MM) is required.' })
    }

    const pool = await getPool()
    const result = await pool
      .request()
      .input('month', sql.NVarChar(7), month)
      .query(`
        SELECT EmployeeId, PlanDate, SelfAssessment FROM portal.DailyPlans
        WHERE FORMAT(PlanDate, 'yyyy-MM') = @month
      `)

    res.json(
      result.recordset.map((r) => ({
        employeeId: r.EmployeeId,
        date: dateOnly(r.PlanDate),
        selfAssessment: r.SelfAssessment,
      })),
    )
  } catch (err) {
    next(err)
  }
})

// One employee's one day, in full (with slots). A day nobody has filled in
// yet is a normal, expected state here — not an error — so this returns a
// blank sheet (200, empty slots) rather than 404.
router.get('/:employeeId/:date', async (req, res, next) => {
  try {
    const employeeId = Number(req.params.employeeId)
    const { date } = req.params

    const pool = await getPool()
    const planResult = await pool
      .request()
      .input('employeeId', sql.Int, employeeId)
      .input('date', sql.Date, date)
      .query('SELECT * FROM portal.DailyPlans WHERE EmployeeId = @employeeId AND PlanDate = @date')

    if (planResult.recordset.length === 0) {
      return res.json({ employeeId, date, selfAssessment: null, slots: [] })
    }

    const plan = planResult.recordset[0]
    const slotsResult = await pool
      .request()
      .input('planId', sql.Int, plan.DailyPlanId)
      .query('SELECT * FROM portal.DailyPlanSlots WHERE DailyPlanId = @planId ORDER BY SlotIndex')

    res.json({
      employeeId: plan.EmployeeId,
      date: dateOnly(plan.PlanDate),
      selfAssessment: plan.SelfAssessment,
      slots: slotsResult.recordset.map(toSlot),
    })
  } catch (err) {
    next(err)
  }
})

// Upsert: replaces this employee's whole sheet for this day in one call —
// simpler than diffing individual slots, and the form always submits the
// complete set of 8 slots anyway.
router.put('/:employeeId/:date', async (req, res, next) => {
  const pool = await getPool()
  const transaction = new sql.Transaction(pool)
  try {
    const employeeId = Number(req.params.employeeId)
    const { date } = req.params
    const body = req.body || {}
    const selfAssessment = body.selfAssessment === '' || body.selfAssessment == null ? null : Number(body.selfAssessment)
    if (selfAssessment != null && (selfAssessment < 0 || selfAssessment > 100)) {
      return res.status(400).json({ error: 'Self-assessment must be between 0 and 100.' })
    }
    const slots = Array.isArray(body.slots) ? body.slots : []

    await transaction.begin()

    const existing = await new sql.Request(transaction)
      .input('employeeId', sql.Int, employeeId)
      .input('date', sql.Date, date)
      .query('SELECT DailyPlanId FROM portal.DailyPlans WHERE EmployeeId = @employeeId AND PlanDate = @date')

    let planId
    if (existing.recordset.length > 0) {
      planId = existing.recordset[0].DailyPlanId
      await new sql.Request(transaction)
        .input('id', sql.Int, planId)
        .input('selfAssessment', sql.Int, selfAssessment)
        .query('UPDATE portal.DailyPlans SET SelfAssessment = @selfAssessment WHERE DailyPlanId = @id')
      await new sql.Request(transaction)
        .input('id', sql.Int, planId)
        .query('DELETE FROM portal.DailyPlanSlots WHERE DailyPlanId = @id')
    } else {
      const insertResult = await new sql.Request(transaction)
        .input('employeeId', sql.Int, employeeId)
        .input('date', sql.Date, date)
        .input('selfAssessment', sql.Int, selfAssessment)
        .query(`
          INSERT INTO portal.DailyPlans (EmployeeId, PlanDate, SelfAssessment)
          VALUES (@employeeId, @date, @selfAssessment);
          SELECT CAST(SCOPE_IDENTITY() AS INT) AS DailyPlanId;
        `)
      planId = insertResult.recordset[0].DailyPlanId
    }

    for (const slot of slots) {
      await new sql.Request(transaction)
        .input('planId', sql.Int, planId)
        .input('slotIndex', sql.Int, slot.slotIndex)
        .input('planText', sql.NVarChar(500), slot.planText || null)
        .input('actualText', sql.NVarChar(500), slot.actualText || null)
        .input('valueAddedHrs', sql.Decimal(4, 2), slot.valueAddedHrs === '' || slot.valueAddedHrs == null ? null : Number(slot.valueAddedHrs))
        .input(
          'nonValueAddedHrs',
          sql.Decimal(4, 2),
          slot.nonValueAddedHrs === '' || slot.nonValueAddedHrs == null ? null : Number(slot.nonValueAddedHrs),
        )
        .input('remarks', sql.NVarChar(500), slot.remarks || null)
        .query(`
          INSERT INTO portal.DailyPlanSlots (DailyPlanId, SlotIndex, PlanText, ActualText, ValueAddedHrs, NonValueAddedHrs, Remarks)
          VALUES (@planId, @slotIndex, @planText, @actualText, @valueAddedHrs, @nonValueAddedHrs, @remarks)
        `)
    }

    await transaction.commit()
    res.json({ employeeId, date, selfAssessment, slots })
  } catch (err) {
    await transaction.rollback().catch(() => {})
    next(err)
  }
})

export default router
