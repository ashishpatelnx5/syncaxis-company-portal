// Generates a downloadable JS module snapshot of the current department
// list. This is a manual backup only — changes are saved straight to SQL
// Server through the backend API, not through this file.
export function generateDepartmentsModule(departments) {
  const lines = departments
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((d) => `  ${JSON.stringify(d)},`)

  return [
    `// Backup snapshot from the Departments admin page on ${new Date().toISOString().slice(0, 10)}.`,
    '// For reference only — the live data lives in SQL Server, not this file.',
    'export const departments = [',
    ...lines,
    ']',
    '',
  ].join('\n')
}

export function downloadDepartmentsModule(departments) {
  const content = generateDepartmentsModule(departments)
  const blob = new Blob([content], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'departments.js'
  a.click()
  URL.revokeObjectURL(url)
}
