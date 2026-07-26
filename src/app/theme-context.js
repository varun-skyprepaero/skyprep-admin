import { createContext } from 'react'

/**
 * @typedef {'light' | 'dark'} Theme
 */

/**
 * @typedef {Object} ThemeContextValue
 * @property {Theme} theme
 * @property {boolean} isDark
 * @property {() => void} toggleTheme
 * @property {(theme: Theme) => void} setTheme
 */

/** @type {import('react').Context<ThemeContextValue | null>} */
export const ThemeContext = createContext(null)
