import Icon from './Icon'

export default function AppCard({ app }) {
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
