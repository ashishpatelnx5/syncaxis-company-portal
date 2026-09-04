// Generates a downloadable JS module snapshot of the current employee list.
// This is a manual backup only — changes are saved straight to SQL Server
// through the backend API, not through this file.
export function generateEmployeesModule(employees) {
  const lines = employees
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((e) => `  ${JSON.stringify(e)},`)

  return [
    `// Backup snapshot from the Admin page on ${new Date().toISOString().slice(0, 10)}.`,
    '// For reference only — the live data lives in SQL Server, not this file.',
    'export const employees = [',
    ...lines,
    ']',
    '',
  ].join('\n')
}

export function downloadEmployeesModule(employees) {
  const content = generateEmployeesModule(employees)
  const blob = new Blob([content], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'employees.js'
  a.click()
  URL.revokeObjectURL(url)
}
