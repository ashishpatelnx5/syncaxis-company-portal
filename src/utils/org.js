function nodesById(employees) {
  const byId = new Map(employees.map((e) => [e.id, { ...e, children: [] }]))
  for (const emp of byId.values()) {
    if (emp.managerId != null && byId.has(emp.managerId)) {
      byId.get(emp.managerId).children.push(emp)
    }
  }
  return byId
}

export function buildTree(employees) {
  const byId = nodesById(employees)
  const roots = []
  for (const emp of employees) {
    if (emp.managerId == null || !byId.has(emp.managerId)) roots.push(byId.get(emp.id))
  }
  return roots
}

export function managerName(employees, managerId) {
  return employees.find((e) => e.id === managerId)?.name ?? null
}

// Root-to-self chain: [top of the org, ..., this person].
export function getAncestorChain(employees, id) {
  const byId = new Map(employees.map((e) => [e.id, e]))
  const chain = []
  let current = byId.get(id)
  while (current) {
    chain.unshift(current)
    current = current.managerId != null ? byId.get(current.managerId) : undefined
  }
  return chain
}

// This person's direct reports only (no grandchildren).
export function getDirectReports(employees, id) {
  return employees.filter((e) => e.managerId === id)
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
