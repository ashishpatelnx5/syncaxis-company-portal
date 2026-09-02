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
