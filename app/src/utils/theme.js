// Three-way theme preference: 'auto' (follow the browser/OS setting via
// prefers-color-scheme — the default for everyone), 'light', or 'dark'.
// A manual choice is stored per-browser and wins over the OS setting until
// the user cycles back to Auto.
const STORAGE_KEY = 'syncaxis-theme'
const THEMES = ['auto', 'light', 'dark']

export function getStoredTheme() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return THEMES.includes(value) ? value : 'auto'
  } catch {
    return 'auto'
  }
}

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Private browsing / storage disabled — theme just won't persist.
  }
}

export function nextTheme(theme) {
  return THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]
}
