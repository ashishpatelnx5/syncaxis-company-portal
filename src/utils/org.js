export function buildTree(employees) {
  const byId = new Map(employees.map((e) => [e.id, { ...e, children: [] }]))
  const roots = []
  for (const emp of byId.values()) {
    if (emp.managerId != null && byId.has(emp.managerId)) {
      byId.get(emp.managerId).children.push(emp)
    } else {
      roots.push(emp)
    }
  }
  return roots
}

export function managerName(employees, managerId) {
  return employees.find((e) => e.id === managerId)?.name ?? null
}

export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

const avatarPalette = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#8b5cf6', '#ef4444', '#14b8a6']

// Deterministic color per name so each person's avatar reads as distinct,
// like the photo tiles in a typical org chart, without needing real photos.
export function avatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return avatarPalette[Math.abs(hash) % avatarPalette.length]
}
