// Generates a src/data/employees.js-compatible module from the current
// (possibly admin-edited) employee list, so local browser-storage changes
// can be committed back as the shared source of truth.
export function generateEmployeesModule(employees) {
  const lines = employees
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((e) => `  ${JSON.stringify(e)},`)

  return [
    `// Exported from the Admin page on ${new Date().toISOString().slice(0, 10)}.`,
    '// Replace src/data/employees.js with this file, then commit and push.',
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
