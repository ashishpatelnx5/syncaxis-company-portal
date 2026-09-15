import { useLayoutEffect, useRef, useState } from 'react'
import OrgNode from '../components/OrgNode'
import { useEmployees } from '../context/useEmployees'
import { buildTree } from '../utils/org'

// Bottom breathing room to leave below the chart — roughly matches
// .content's own bottom padding, so the scaled chart's bottom edge doesn't
// sit flush against the viewport edge.
const BOTTOM_MARGIN = 40

// Below this, shrinking the full name/title cards to fit the screen would
// make the text too small to read — switch to compact (avatar circles only,
// name/title on hover) instead, which is far smaller to begin with and so
// usually doesn't need to shrink much at all.
const COMPACT_BELOW_SCALE = 0.6

export default function Hierarchy() {
  const { employees } = useEmployees()
  const hasReportingLines = employees.some((e) => e.managerId != null)
  const unplaced = employees.filter((e) => e.managerId == null && !e.title)
  const chartEmployees = employees.filter((e) => !unplaced.includes(e))
  const roots = buildTree(chartEmployees)

  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [fit, setFit] = useState({ scale: 1, height: 'auto' })
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    function recompute() {
      const availableWidth = container.clientWidth
      const availableHeight = window.innerHeight - container.getBoundingClientRect().top - BOTTOM_MARGIN
      const contentWidth = content.scrollWidth
      const contentHeight = content.scrollHeight
      if (!contentWidth || !contentHeight || availableWidth <= 0 || availableHeight <= 0) return

      // Never scale up — a small org chart should render at its natural
      // size, just centered, not stretched to fill the screen.
      const scale = Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight)

      // Switching modes changes `content`'s natural size, which the
      // ResizeObserver below picks up and re-measures on its own — no need
      // to compute the resulting scale here too.
      if (!compact && scale < COMPACT_BELOW_SCALE) {
        setCompact(true)
        return
      }

      setFit({ scale, height: Math.ceil(contentHeight * scale) })
    }

    recompute()
    // Re-measure whenever the tree's own natural size changes (collapsing a
    // team, employees finishing loading, switching compact mode) —
    // transform: scale doesn't affect layout size, so `content`'s
    // scrollWidth/Height stay the true, unscaled dimensions to measure against.
    const resizeObserver = new ResizeObserver(recompute)
    resizeObserver.observe(content)
    window.addEventListener('resize', recompute)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', recompute)
    }
  }, [employees, compact])

  return (
    <div className="page">
      <header className="page-header">
        <h1>Org Chart</h1>
        <p className="page-subtitle">
          Reporting structure across Syncaxis. Click a team's count to collapse it.
          {compact && ' Hover a photo to see who it is.'}
        </p>
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

      <div className="org-chart-fit" ref={containerRef} style={{ height: fit.height }}>
        <div className="org-chart-scale" ref={contentRef} style={{ transform: `scale(${fit.scale})` }}>
          <ul className="org-tree">
            {roots.map((root) => (
              <OrgNode key={root.id} person={root} compact={compact} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
