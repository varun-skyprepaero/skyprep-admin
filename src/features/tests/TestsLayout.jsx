import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { canAccessTestsSection } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

const tabs = [
  { to: 'subjects', label: 'Subjects' },
  { to: 'books', label: 'Books' },
  { to: 'questions', label: 'Questions' },
  { to: 'suites', label: 'Suites' },
  { to: 'packages', label: 'Test series' },
]

export default function TestsLayout() {
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canAccessTestsSection(user)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border/80 pb-3">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              cn(
                'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
