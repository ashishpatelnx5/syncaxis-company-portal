import { useState } from 'react'
import { apiFetch } from '../utils/api'
import Icon from './Icon'

export default function AppCard({ app }) {
  const [opening, setOpening] = useState(false)

  if (!app.ssoHandoff) {
    return (
      <a className="app-card" href={app.url} target="_blank" rel="noopener noreferrer">
        <span className={`app-icon app-icon-${app.icon}`}>
          <Icon name={app.icon} size={22} />
        </span>
        <span className="app-card-body">
          <span className="app-card-title">
            {app.name}
            <Icon name="external" size={14} className="app-card-external" />
          </span>
          <span className="app-card-desc">{app.description}</span>
        </span>
      </a>
    )
  }

  // Mints a short-lived, single-use code tied to this session and opens the
  // app with it - its backend exchanges the code for a real login
  // server-to-server, so the user lands there already signed in instead of
  // seeing a second login screen.
  async function handleClick(e) {
    e.preventDefault()
    if (opening) return
    setOpening(true)
    try {
      const { code } = await apiFetch('/api/auth/sso/issue', { method: 'POST' })
      const separator = app.url.includes('?') ? '&' : '?'
      window.open(`${app.url}${separator}ssoCode=${encodeURIComponent(code)}`, '_blank', 'noopener,noreferrer')
    } catch {
      // Fall back to a plain (logged-out) link rather than a dead click.
      window.open(app.url, '_blank', 'noopener,noreferrer')
    } finally {
      setOpening(false)
    }
  }

  return (
    <a className="app-card" href={app.url} onClick={handleClick} aria-busy={opening}>
      <span className={`app-icon app-icon-${app.icon}`}>
        <Icon name={app.icon} size={22} />
      </span>
      <span className="app-card-body">
        <span className="app-card-title">
          {app.name}
          <Icon name="external" size={14} className="app-card-external" />
        </span>
        <span className="app-card-desc">{app.description}</span>
      </span>
    </a>
  )
}
