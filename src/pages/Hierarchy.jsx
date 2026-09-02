import OrgNode from '../components/OrgNode'
import { employees } from '../data/employees'
import { buildTree } from '../utils/org'

export default function Hierarchy() {
  const roots = buildTree(employees)
  const hasReportingLines = employees.some((e) => e.managerId != null)

  return (
    <div className="page">
      <header className="page-header">
        <h1>Org Chart</h1>
        <p className="page-subtitle">Reporting structure across Syncaxis. Click a team's count to collapse it.</p>
      </header>

      {!hasReportingLines && (
        <p className="notice">
          Reporting lines haven't been added yet, so everyone is shown at the same level. Set each
          person's <code>managerId</code> in the employee data to build out the chart.
        </p>
      )}

      <div className="org-chart-scroll">
        <ul className="org-tree">
          {roots.map((root) => (
            <OrgNode key={root.id} person={root} />
          ))}
        </ul>
      </div>
    </div>
  )
}
