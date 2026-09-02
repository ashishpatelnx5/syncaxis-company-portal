import { useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from './Icon'
import { avatarColor, initials } from '../utils/org'

export default function OrgNode({ person }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = person.children?.length > 0

  return (
    <li>
      <div className="org-node">
        <Link to={`/employee/${person.id}`} className="org-node-link">
          <div className="org-avatar" style={{ background: avatarColor(person.name) }}>
            {initials(person.name)}
          </div>
          <div className="org-card">
            <div className="org-card-name">{person.name}</div>
            {person.title && <div className="org-card-title">{person.title}</div>}
          </div>
        </Link>
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
