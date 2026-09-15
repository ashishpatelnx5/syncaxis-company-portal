import Icon from './Icon'
import { useAuth } from '../context/useAuth'

// Wraps a route's element and checks the signed-in user is allowed to see
// it — either a page permission (pageKey, or any one of pageKeys, checked
// via hasPage) or admin-only (adminOnly, e.g. the Users admin screen). An
// admin always passes both checks. Backend routes enforce the same rules
// independently (see server/src/middleware/auth.js) — this only controls
// what renders.
export default function ProtectedPage({ pageKey, pageKeys, adminOnly, children }) {
  const { user, hasPage } = useAuth()
  const keys = pageKeys || (pageKey ? [pageKey] : [])
  const allowed = adminOnly ? user?.isAdmin : keys.some(hasPage)

  if (allowed) return children

  return (
    <div className="page">
      <div className="empty-state">
        <Icon name="lock" size={22} />
        <p>You don&apos;t have access to this page. Contact an administrator if you need it.</p>
      </div>
    </div>
  )
}
