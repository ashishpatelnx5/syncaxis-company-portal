import { useState } from 'react'
import Icon from './Icon'
import { initials } from '../utils/org'

export default function OrgNode({ person }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = person.children?.length > 0

  return (
    <li>
      <div className="org-card">
        <div className="employee-avatar small">{initials(person.name)}</div>
        <div className="org-card-body">
          <div className="employee-name">{person.name}</div>
          {person.title && <div className="employee-title">{person.title}</div>}
        </div>
        {hasChildren && (
          <button
            type="button"
            className="org-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand team' : 'Collapse team'}
          >
            <Icon name="chevron" size={14} className={collapsed ? '' : 'rotated'} />
            {person.children.length}
          </button>
        )}
      </div>
      {hasChildren && !collapsed && (
        <ul>
          {person.children.map((child) => (
            <OrgNode key={child.id} person={child} />
          ))}
        </ul>
      )}
    </li>
  )
}
