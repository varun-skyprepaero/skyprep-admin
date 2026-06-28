import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import {
  canAccessSubscriptionSection,
  canViewSubscriptionScreen,
} from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'

const tabs = [
  { to: 'plans', label: 'Subscription plans', screen: 'tests.subscription_plans' },
  { to: 'subscribers', label: 'Subscribers', screen: 'tests.subscribers' },
]

export default function SubscriptionLayout() {
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canAccessSubscriptionSection(user, matrix)) {
    return <Navigate to="/" replace />
  }

  const visibleTabs = tabs.filter((t) => canViewSubscriptionScreen(user, matrix, t.screen))

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap gap-2 border-b border-border/80 pb-3">
        {visibleTabs.map((t) => (
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
      {visibleTabs.length === 0 ? <Navigate to="/" replace /> : <Outlet />}
    </div>
  )
}
