import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import Icon from './Icon'

// `compact` drops the name/title card and shows just the avatar circle —
// used once the org chart has too many people to fit the screen at a
// readable text size (see pages/Hierarchy.jsx). The name/title move into a
// native title attribute instead, shown on hover.
export default function OrgNode({ person, compact }) {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = person.children?.length > 0

  return (
    <li>
      <div className={`org-node ${compact ? 'org-node-compact' : ''}`}>
        <Link
          to={`/employee/${person.id}`}
          className="org-node-link"
          title={compact ? [person.name, person.title].filter(Boolean).join(' — ') : undefined}
        >
          <Avatar name={person.name} photo={person.photo} className="org-avatar" />
          {!compact && (
            <div className="org-card">
              <div className="org-card-name">{person.name}</div>
              {person.title && <div className="org-card-title">{person.title}</div>}
            </div>
          )}
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
            <OrgNode key={child.id} person={child} compact={compact} />
          ))}
        </ul>
      )}
    </li>
  )
}
