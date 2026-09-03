import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'

// NOTE: this is a client-side-only login gate — there is no backend to
// verify against. It deters casual browsing but is not real security: these
// values (and this check) ship in plain text inside the public JS bundle,
// and the "logged in" state can be set directly via devtools/localStorage,
// bypassing the form entirely. Don't rely on this to protect sensitive data.
// The real credentials live only in the gitignored .env — never hardcode
// them here as a fallback, or they'd end up committed in plain text.
const VALID_USERNAME = import.meta.env.VITE_AUTH_USERNAME || 'changeme'
const VALID_PASSWORD = import.meta.env.VITE_AUTH_PASSWORD || 'changeme'

const STORAGE_KEY = 'syncaxis-auth'

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // Corrupt/unavailable storage — treat as logged out.
  }
  return null
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadInitial)

  useEffect(() => {
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Storage unavailable — session still works for the rest of this tab.
    }
  }, [session])

  const api = useMemo(
    () => ({
      user: session,
      isAuthenticated: session != null,
      login(username, password) {
        const ok = username.trim().toLowerCase() === VALID_USERNAME.toLowerCase() && password === VALID_PASSWORD
        if (ok) setSession({ username: VALID_USERNAME })
        return ok
      },
      logout() {
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>
}
