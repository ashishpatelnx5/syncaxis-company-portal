// Shared across every "pick your name" picker in the app (Daily Plan,
// Complaints, ...) — the shared portal login has no per-user identity, so
// each browser just remembers which employee last used it here.
const WHOAMI_KEY = 'syncaxis-whoami-employee-id'

export function getWhoAmI() {
  try {
    return localStorage.getItem(WHOAMI_KEY) || ''
  } catch {
    return ''
  }
}

export function setWhoAmI(id) {
  try {
    localStorage.setItem(WHOAMI_KEY, id)
  } catch {
    // Storage unavailable — the picker just won't remember next time.
  }
}
