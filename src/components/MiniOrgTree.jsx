import { Link } from 'react-router-dom'
import { avatarColor, initials } from '../utils/org'

const INDENT = 24
const ICON_CENTER = 11

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

// Elbow connector: drops from the parent row's icon, then turns into this
// row's icon (stopping at the icon's edge, not its center, so the line
// touches the circle instead of running behind it). `continues` extends the
// drop to the row's full height so it keeps feeding a sibling below (like a
// file-tree's "├──" vs "└──").
function Connector({ parentX, iconLeft, continues }) {
  return (
    <>
      <span className="mini-connector-v" style={{ left: parentX, height: continues ? '100%' : '50%' }} />
      <span className="mini-connector-h" style={{ left: parentX, width: Math.max(iconLeft - parentX, 0) }} />
    </>
  )
}

// Compact tree: full chain from the top of the org down to this person, one
// row per level with connecting lines, plus one extra row per direct report
// (no grandchildren) — icons and names only, no title/department cards.
export default function MiniOrgTree({ chain, reports }) {
  const selfLevel = chain.length - 1

  return (
    <div className="mini-tree">
      {chain.map((person, i) => (
        <div key={person.id} className="mini-tree-row" style={{ paddingLeft: `${i * INDENT}px` }}>
          {i > 0 && (
            <Connector parentX={(i - 1) * INDENT + ICON_CENTER} iconLeft={i * INDENT} continues={false} />
          )}
          <MiniPerson person={person} isSelf={i === selfLevel} />
        </div>
      ))}
      {reports.map((report, i) => (
        <div key={report.id} className="mini-tree-row" style={{ paddingLeft: `${chain.length * INDENT}px` }}>
          <Connector
            parentX={selfLevel * INDENT + ICON_CENTER}
            iconLeft={chain.length * INDENT}
            continues={i < reports.length - 1}
          />
          <MiniPerson person={report} />
        </div>
      ))}
    </div>
  )
}
