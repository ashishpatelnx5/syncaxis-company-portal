import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { useAuth } from '../context/useAuth'
import { useDepartments } from '../context/useDepartments'
import { useEmployees } from '../context/useEmployees'
import { useJobDescriptions } from '../context/useJobDescriptions'

// adminContext: true when mounted at /admin/job-descriptions/:id (reached by
// clicking a row in Admin > Job Descriptions) rather than the general
// /job-descriptions/:id (reached from the org-wide Job Descriptions page) -
// same page either way, just a different "back" destination and Edit/Delete
// only show for accounts holding admin-job-descriptions.
export default function JobDescriptionDetail({ adminContext = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPage } = useAuth()
  const { jobDescriptions, isLoading, deleteJobDescription } = useJobDescriptions()
  const { departments } = useDepartments()
  const { employees, refresh: refreshEmployees } = useEmployees()
  const canManage = hasPage('admin-job-descriptions')
  const backTo = adminContext ? '/admin/job-descriptions' : '/job-descriptions'

  const jobDescription = jobDescriptions.find((jd) => String(jd.id) === id)
  // Wait for the fetch to finish before deciding this id doesn't exist — on
  // a fresh page load (a bookmarked link, a refresh) the list starts empty.
  if (isLoading) return null
  if (!jobDescription) return <Navigate to={backTo} replace />

  const department = departments.find((d) => d.id === jobDescription.departmentId)
  const holders = employees.filter((e) => e.jobDescriptionId === jobDescription.id)
  const c = jobDescription.content || {}

  async function handleDelete() {
    const warning =
      holders.length > 0
        ? `${holders.length} ${holders.length === 1 ? 'person is' : 'people are'} assigned "${jobDescription.title}". They'll become unassigned. Delete this job description anyway?`
        : `Delete "${jobDescription.title}"? This can't be undone.`
    if (window.confirm(warning)) {
      await deleteJobDescription(jobDescription.id)
      // The server clears JobDescriptionId on anyone who held it as part of
      // the same delete — refetch so the UI matches.
      refreshEmployees()
      navigate(backTo)
    }
  }

  return (
    <div className="page">
      <div className="detail-toolbar">
        <Link to={backTo} className="back-link">
          <Icon name="chevron" size={14} className="back-icon" />
          {adminContext ? 'Back to Job Descriptions' : 'Back to job descriptions'}
        </Link>
        {canManage && (
          <div className="detail-toolbar-actions">
            <Link to={`/admin/job-descriptions/${jobDescription.id}/edit`} className="btn-primary">
              <Icon name="edit" size={14} />
              Edit
            </Link>
            <button type="button" className="btn-danger" onClick={handleDelete}>
              <Icon name="trash" size={14} />
              Delete
            </button>
          </div>
        )}
      </div>

      <header className="page-header">
        <h1>{jobDescription.title}</h1>
        <p className="page-subtitle">
          {department?.name}
          {jobDescription.reportingTo && ` · Reports to ${jobDescription.reportingTo}`}
        </p>
      </header>

      {holders.length > 0 && (
        <section className="jd-section">
          <h2>Assigned to</h2>
          <div className="jd-holder-list">
            {holders.map((e) => (
              <Link key={e.id} to={adminContext ? `/admin/employees/${e.id}` : `/employee/${e.id}`} className="jd-holder-chip">
                {e.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {c.summary && (
        <section className="jd-section">
          <h2>Position Summary</h2>
          <p>{c.summary}</p>
        </section>
      )}

      {c.scopeOfResponsibility?.length > 0 && (
        <section className="jd-section">
          <h2>Scope of Responsibility</h2>
          <ul className="jd-list">
            {c.scopeOfResponsibility.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {c.responsibilityGroups?.length > 0 && (
        <section className="jd-section">
          <h2>Key Roles &amp; Responsibilities</h2>
          {c.responsibilityGroups.map((group, i) => (
            <div key={i} className="jd-subgroup">
              <h3>{group.title}</h3>
              <ul className="jd-list">
                {group.responsibilities.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
              {group.accountability?.length > 0 && (
                <>
                  <p className="jd-subgroup-accountability-label">Accountability</p>
                  <ul className="jd-list">
                    {group.accountability.map((item, j) => (
                      <li key={j}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {c.kpis?.length > 0 && (
        <section className="jd-section">
          <h2>Key Performance Indicators (KPIs)</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Target</th>
                </tr>
              </thead>
              <tbody>
                {c.kpis.map((kpi, i) => (
                  <tr key={i}>
                    <td>{kpi.name}</td>
                    <td>{kpi.target || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {c.authorityGroups?.length > 0 && (
        <section className="jd-section">
          <h2>Authority</h2>
          {c.authorityGroups.map((group, i) => (
            <div key={i} className="jd-subgroup">
              {group.label && <h3>{group.label}</h3>}
              <ul className="jd-list">
                {group.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {(c.competencies?.technical?.length > 0 || c.competencies?.behavioral?.length > 0) && (
        <section className="jd-section">
          <h2>Required Competencies</h2>
          {c.competencies.technical?.length > 0 && (
            <div className="jd-subgroup">
              <h3>Technical Competencies</h3>
              <ul className="jd-list">
                {c.competencies.technical.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {c.competencies.behavioral?.length > 0 && (
            <div className="jd-subgroup">
              <h3>Behavioral Competencies</h3>
              <ul className="jd-list">
                {c.competencies.behavioral.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {c.accountability?.length > 0 && (
        <section className="jd-section">
          <h2>Accountability</h2>
          <ul className="jd-list">
            {c.accountability.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
