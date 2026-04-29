export const THEME_DARK_STORAGE_KEY = 'usco_dark_mode_enabled'

export const isDarkModeEnabled = () => {
  if (typeof window === 'undefined') {
    return false
  }
  return window.localStorage.getItem(THEME_DARK_STORAGE_KEY) === 'true'
}

export const applyDarkModeClass = (enabled: boolean) => {
  if (typeof document === 'undefined') {
    return
  }
  document.documentElement.classList.toggle('dark', enabled)
}

export const setDarkModeEnabled = (enabled: boolean) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_DARK_STORAGE_KEY, String(enabled))
  }
  applyDarkModeClass(enabled)
}

