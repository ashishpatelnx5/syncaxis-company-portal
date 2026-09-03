// Generates a src/data/departments.js-compatible module from the current
// (possibly admin-edited) department list, so local browser-storage changes
// can be committed back as the shared source of truth.
export function generateDepartmentsModule(departments) {
  const lines = departments
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((d) => `  ${JSON.stringify(d)},`)

  return [
    `// Exported from the Departments admin page on ${new Date().toISOString().slice(0, 10)}.`,
    '// Replace src/data/departments.js with this file, then commit and push.',
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
