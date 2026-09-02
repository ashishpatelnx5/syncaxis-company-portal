import { useState } from 'react'
import Icon from './Icon'
import { avatarColor, initials } from '../utils/org'

export default function OrgNode({ person }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = person.children?.length > 0

  return (
    <li>
      <div className="org-node">
        <div className="org-avatar" style={{ background: avatarColor(person.name) }}>
          {initials(person.name)}
        </div>
        <div className="org-card">
          {person.title && <div className="org-card-title">{person.title}</div>}
          <div className="org-card-name">{person.name}</div>
        </div>
        {hasChildren && (
          <button
            type="button"
            className="org-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? 'Expand team' : 'Collapse team'}
          >
            <Icon name="chevron" size={12} className={collapsed ? '' : 'rotated'} />
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
