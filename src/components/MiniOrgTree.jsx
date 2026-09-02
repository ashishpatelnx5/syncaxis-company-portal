import { Link } from 'react-router-dom'
import { avatarColor, initials } from '../utils/org'

function MiniPerson({ person, isSelf }) {
  return (
    <span className={`mini-person ${isSelf ? 'mini-person-self' : ''}`}>
      <span className="mini-avatar" style={{ background: avatarColor(person.name) }}>
        {initials(person.name)}
      </span>
      {isSelf ? person.name : <Link to={`/employee/${person.id}`}>{person.name}</Link>}
    </span>
  )
}

// Compact tree: full chain from the top of the org down to this person, one
// row per level, plus a single extra row for their direct reports (no
// grandchildren) — icons and names only, no title/department cards.
export default function MiniOrgTree({ chain, reports }) {
  return (
    <div className="mini-tree">
      {chain.map((person, i) => (
        <div key={person.id} className="mini-tree-row" style={{ paddingLeft: `${i * 22}px` }}>
          <MiniPerson person={person} isSelf={i === chain.length - 1} />
        </div>
      ))}
      {reports.length > 0 && (
        <div className="mini-tree-row mini-tree-reports" style={{ paddingLeft: `${chain.length * 22}px` }}>
          {reports.map((report) => (
            <MiniPerson key={report.id} person={report} />
          ))}
        </div>
      )}
    </div>
  )
}
