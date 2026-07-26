import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { ThemeContext } from '@/app/theme-context'
import {
  applyTheme,
  getInitialTheme,
  getStoredTheme,
  persistTheme,
  runWithThemeTransition,
} from '@/lib/theme'

/**
 * @typedef {import('@/app/theme-context').Theme} Theme
 */

/**
 * @typedef {Object} ThemeProviderProps
 * @property {import('react').ReactNode} children
 */

/** @param {ThemeProviderProps} props */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => getInitialTheme())

  const commitTheme = useCallback(
    /** @param {Theme} next @param {{ animate?: boolean }} [options] */
    (next, { animate = true } = {}) => {
      const apply = () => {
        flushSync(() => {
          setThemeState(next)
          applyTheme(next)
        })
        persistTheme(next)
      }

      if (animate) {
        runWithThemeTransition(apply)
      } else {
        apply()
      }
    },
    [],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getStoredTheme() != null) return
      commitTheme(media.matches ? 'dark' : 'light', { animate: false })
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [commitTheme])

  const setTheme = useCallback(
    /** @param {Theme} next */ (next) => {
      commitTheme(next, { animate: true })
    },
    [commitTheme],
  )

  const toggleTheme = useCallback(() => {
    commitTheme(theme === 'dark' ? 'light' : 'dark', { animate: true })
  }, [theme, commitTheme])

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'dark',
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
