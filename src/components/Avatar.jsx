import { avatarColor, initials } from '../utils/org'

// Renders a photo if one's set, otherwise the colored-initials fallback —
// both sized/shaped by whatever avatar class is passed in (employee-avatar,
// detail-avatar, org-avatar, mini-avatar, ...), so this drops into any of
// those existing spots unchanged.
export default function Avatar({ name, photo, className = '', style }) {
  if (photo) {
    return <img src={photo} alt={name} className={`avatar-photo ${className}`} style={style} />
  }
  return (
    <span className={className} style={{ background: avatarColor(name), ...style }}>
      {initials(name)}
    </span>
  )
}
