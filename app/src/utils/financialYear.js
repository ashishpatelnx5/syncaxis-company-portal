// India's financial year runs April-March. Given a date, returns the FY key
// it falls in (e.g. '2026-27' for anything from Apr 2026 through Mar 2027).
export function financialYearOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-12
  const startYear = month >= 4 ? year : year - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

// 'FY 2026-27 (Apr 2026 – Mar 2027)'
export function financialYearLabel(fyKey) {
  const startYear = Number(fyKey.split('-')[0])
  return `FY ${fyKey} (Apr ${startYear} – Mar ${startYear + 1})`
}
