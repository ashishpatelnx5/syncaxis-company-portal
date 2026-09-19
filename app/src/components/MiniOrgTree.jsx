import { Link } from 'react-router-dom'
import Avatar from './Avatar'

// Icon only, no name label — matches the main Org Chart's compact mode.
// The name (and title, if set) move into a native title attribute instead,
// shown on hover. `isSelf` still gets a visibly different avatar (a ring)
// so "you" stands out in the chain without needing text.
function MiniPerson({ person, isSelf }) {
  const title = [person.name, person.title].filter(Boolean).join(' — ')
  const avatar = <Avatar name={person.name} photo={person.photo} className={`mini-avatar ${isSelf ? 'mini-avatar-self' : ''}`} />

  return isSelf ? (
    <span className="mini-person mini-person-self" title={title}>
      {avatar}
    </span>
  ) : (
    <Link to={`/employee/${person.id}`} className="mini-person" title={title}>
      {avatar}
    </Link>
  )
}

// Recursed like the main OrgNode tree, so it reuses the same connector
// rules: a li with one child (every step of the ancestor chain) gets a
// plain vertical drop, while a li with several children (the reports row)
// gets a horizontal bus with a vertical drop into each one.
function ChainLevel({ chain, index, reports }) {
  const person = chain[index]
  const isSelf = index === chain.length - 1
  const hasNextAncestor = index < chain.length - 1

  return (
    <li>
      <MiniPerson person={person} isSelf={isSelf} />
      {hasNextAncestor && (
        <ul>
          <ChainLevel chain={chain} index={index + 1} reports={reports} />
        </ul>
      )}
      {isSelf && reports.length > 0 && (
        <ul>
          {reports.map((report) => (
            <li key={report.id}>
              <MiniPerson person={report} />
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

// Compact tree: full chain from the top of the org down to this person, plus
// one extra level for their direct reports (no grandchildren) — icons and
// names only, no title/department cards.
export default function MiniOrgTree({ chain, reports }) {
  return (
    <div className="mini-tree">
      <ul className="mini-org-tree">
        <ChainLevel chain={chain} index={0} reports={reports} />
      </ul>
    </div>
  )
}
