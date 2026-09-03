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
      async login(username, password) {
        const data = await apiFetch('/api/auth/login', { method: 'POST', body: { username, password }, auth: false })
        setToken(data.token)
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
