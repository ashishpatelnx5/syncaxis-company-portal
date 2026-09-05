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

// Root-to-self chain: [top of the org, ..., this person]. Guards against a
// cycle in managerId data (e.g. two people set as each other's manager) —
// without it, a cycle would spin this loop forever and freeze the page.
export function getAncestorChain(employees, id) {
  const byId = new Map(employees.map((e) => [e.id, e]))
  const chain = []
  const visited = new Set()
  let current = byId.get(id)
  while (current && !visited.has(current.id)) {
    visited.add(current.id)
    chain.unshift(current)
    current = current.managerId != null ? byId.get(current.managerId) : undefined
  }
  return chain
}

// This person's direct reports only (no grandchildren).
export function getDirectReports(employees, id) {
  return employees.filter((e) => e.managerId === id)
}

// Every id reporting to this person, at any depth — used to stop the admin
// form from letting someone report to their own descendant (a cycle).
// `seen` guards against a cycle already present in the data recursing forever.
export function getDescendantIds(employees, id, seen = new Set()) {
  if (seen.has(id)) return []
  seen.add(id)
  const direct = employees.filter((e) => e.managerId === id)
  return direct.flatMap((e) => [e.id, ...getDescendantIds(employees, e.id, seen)])
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
