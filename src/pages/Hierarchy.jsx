import OrgNode from '../components/OrgNode'
import { employees } from '../data/employees'
import { buildTree } from '../utils/org'

export default function Hierarchy() {
  const hasReportingLines = employees.some((e) => e.managerId != null)
  const unplaced = employees.filter((e) => e.managerId == null && !e.title)
  const chartEmployees = employees.filter((e) => !unplaced.includes(e))
  const roots = buildTree(chartEmployees)

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

      {hasReportingLines && unplaced.length > 0 && (
        <p className="notice">
          Not yet placed on this chart: {unplaced.map((e) => e.name).join(', ')}.
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
