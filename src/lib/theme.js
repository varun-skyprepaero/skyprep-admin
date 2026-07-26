import { THEME_STORAGE_KEY } from '@/lib/storage-keys'

export { THEME_STORAGE_KEY }

/** @typedef {'light' | 'dark'} Theme */

/**
 * @returns {Theme}
 */
export function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * @returns {Theme | null}
 */
export function getStoredTheme() {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'dark' || stored === 'light' ? stored : null
}

/**
 * @returns {Theme}
 */
export function getInitialTheme() {
  return getStoredTheme() ?? getSystemTheme()
}

/**
 * @param {Theme} theme
 */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

/**
 * Runs DOM updates inside a crossfade when supported (theme toggle).
 * @param {() => void} updateDom
 */
export function runWithThemeTransition(updateDom) {
  if (typeof document === 'undefined') {
    updateDom()
    return
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    updateDom()
    return
  }

  document.startViewTransition(updateDom)
}

/**
 * @param {Theme} theme
 */
export function persistTheme(theme) {
  if (typeof window === 'undefined') return
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}
