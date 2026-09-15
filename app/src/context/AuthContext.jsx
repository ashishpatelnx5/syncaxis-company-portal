import { useEffect, useMemo, useState } from 'react'
import { apiFetch, getToken, setToken } from '../utils/api'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Starts true whenever a token is already stored, so RequireAuth doesn't
  // briefly bounce a still-valid session to /login while /auth/me resolves.
  const [isLoading, setIsLoading] = useState(() => Boolean(getToken()))

  useEffect(() => {
    const token = getToken()
    if (!token) return

    apiFetch('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false))
  }, [])

  const api = useMemo(
    () => ({
      user,
      isAuthenticated: user != null,
      isLoading,
      // isAdmin (any assigned role with IsFullAccess, see server) has
      // unconditional full access; otherwise access is whatever pages/
      // applications the user's role(s) — direct or via a group — grant.
      hasPage: (key) => user?.isAdmin || Boolean(user?.permissions?.pages?.includes(key)),
      hasApp: (key) => user?.isAdmin || Boolean(user?.permissions?.applications?.includes(key)),
      async login(username, password) {
        const data = await apiFetch('/api/auth/login', { method: 'POST', body: { username, password }, auth: false })
        setToken(data.token)
        setUser(data.user)
      },
      // Re-fetches the signed-in user's own record — e.g. after changing
      // your password, so a field like "last changed" reflects it right
      // away instead of waiting for the next login/page load.
      async refreshUser() {
        const data = await apiFetch('/api/auth/me')
        setUser(data.user)
      },
      logout() {
        setToken(null)
        setUser(null)
      },
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
