import { NavLink } from 'react-router-dom'
import { Shield, X } from 'lucide-react'
import { adminNav } from '@/config/admin-nav'
import { env } from '@/config/env'
import { hasAdminPortalRole } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'

/**
 * @param {{ collapsed?: boolean, mobile?: boolean, onNavigate?: () => void }} props
 */
export function AdminSidebar({ collapsed = false, mobile = false, onNavigate }) {
  const user = useAuthStore((s) => s.user)

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.email ?? 'Admin'

  const visibleNav = adminNav.filter(
    (item) => !item.roles || hasAdminPortalRole(user, item.roles),
  )

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border/60 bg-card',
        collapsed && !mobile ? 'w-[4.5rem]' : 'w-64',
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-border/60',
          collapsed && !mobile ? 'justify-center px-2' : 'justify-between gap-2 px-4',
        )}
      >
        <NavLink
          to="/"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-2.5 font-semibold tracking-tight outline-none',
            collapsed && !mobile && 'justify-center',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Shield className="size-4" aria-hidden />
          </span>
          {(!collapsed || mobile) && (
            <span className="truncate">
              {env.appName.split(' ')[0]}{' '}
              <span className="text-primary">{env.appName.split(' ').slice(1).join(' ') || 'Admin'}</span>
            </span>
          )}
        </NavLink>
        {mobile ? (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleNav.map((item) => {
          const Icon = item.icon

          if (item.disabled) {
            return (
              <span
                key={item.name}
                className={cn(
                  'flex cursor-not-allowed items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground/60',
                  collapsed && !mobile && 'justify-center px-2',
                )}
                title="Coming soon"
              >
                <Icon className={cn('size-5 shrink-0', !collapsed || mobile ? 'mr-3' : '')} aria-hidden />
                {(!collapsed || mobile) && (
                  <>
                    {item.name}
                    <span className="ml-auto text-[10px] uppercase tracking-wide">Soon</span>
                  </>
                )}
              </span>
            )
          }

          return (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              onClick={onNavigate}
              title={collapsed && !mobile ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && !mobile && 'justify-center px-2',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )
              }
            >
              <Icon className={cn('size-5 shrink-0', !collapsed || mobile ? 'mr-3' : '')} aria-hidden />
              {(!collapsed || mobile) && item.name}
            </NavLink>
          )
        })}
      </nav>

      {(!collapsed || mobile) && user ? (
        <div className="border-t border-border/60 p-4">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role?.name ?? 'Admin'}</p>
        </div>
      ) : null}
    </aside>
  )
}
