import { useTheme } from '@/hooks/use-theme'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Moon, Sun } from 'lucide-react'

/**
 * @typedef {Object} ThemeToggleProps
 * @property {string} [className]
 * @property {'sm' | 'default' | 'lg' | 'icon'} [size]
 */

/** @param {ThemeToggleProps} props */
export function ThemeToggle({ className, size = 'icon' }) {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn('relative overflow-hidden transition-transform hover:scale-105 active:scale-95', className)}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="relative flex size-4 items-center justify-center">
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            isDark ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
          )}
        >
          <Moon className="size-4" aria-hidden />
        </span>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center transition-all duration-200',
            isDark ? 'scale-75 opacity-0' : 'scale-100 opacity-100',
          )}
        >
          <Sun className="size-4" aria-hidden />
        </span>
      </span>
      <span className="sr-only">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  )
}
