import { useState } from 'react'
import Icon from './Icon'

// Contact card with Email/Phone always visible, and Emergency Contact
// tucked behind a toggle — revealed as a second column (with a vertical
// divider) to the right rather than appended below Phone, and Email/Phone
// stay pinned to a fixed position regardless (see .detail-list's
// align-content: start) rather than shifting when the emergency column
// changes the card's height. Shared by Home (your own record) and
// EmployeeDetail (anyone's record) so both stay visually identical.
export default function ContactPanel({ employee }) {
  const [showEmergency, setShowEmergency] = useState(false)
  const emergency = employee.emergencyContact ?? {}

  return (
    <section className="detail-card">
      <div className="section-head">
        <h2>Contact</h2>
        <button type="button" className="section-link contact-emergency-toggle" onClick={() => setShowEmergency((v) => !v)}>
          Emergency Contact
          <Icon name="chevron" size={12} className={`nav-group-chevron ${showEmergency ? 'expanded' : ''}`} />
        </button>
      </div>
      {employee.email || employee.phone ? (
        <div className="contact-body">
          <dl className="detail-list">
            {employee.email && (
              <>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${employee.email}`}>{employee.email}</a>
                </dd>
              </>
            )}
            {employee.phone && (
              <>
                <dt>Phone</dt>
                <dd>
                  <a href={`tel:${employee.phone}`}>{employee.phone}</a>
                </dd>
              </>
            )}
          </dl>
          {showEmergency && (
            <>
              <div className="contact-divider" />
              <dl className="detail-list">
                <dt>Name</dt>
                <dd>{emergency.name || '—'}</dd>
                <dt>Relation</dt>
                <dd>{emergency.relation || '—'}</dd>
                <dt>Phone</dt>
                <dd>{emergency.phone ? <a href={`tel:${emergency.phone}`}>{emergency.phone}</a> : '—'}</dd>
              </dl>
            </>
          )}
        </div>
      ) : (
        <p className="empty-state">Not on file yet.</p>
      )}
    </section>
  )
}
