import { useLocation } from 'react-router-dom'
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { getAdminNavTitle } from '@/config/admin-nav'
import { logoutSession } from '@/features/auth/api/auth-api'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { notifySuccess } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function AdminTopbar({ onMenuClick, onToggleCollapse, sidebarCollapsed = false }) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const location = useLocation()
  const title = getAdminNavTitle(location.pathname)

  async function handleLogout() {
    await logoutSession()
    logout()
    notifySuccess('Signed out')
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 lg:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden />
      </Button>

      {onToggleCollapse ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex"
          onClick={onToggleCollapse}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="size-5" aria-hidden />
          ) : (
            <PanelLeftClose className="size-5" aria-hidden />
          )}
        </Button>
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      </div>

      {user ? (
        <p className="hidden max-w-[12rem] truncate text-sm text-muted-foreground sm:block">
          {user.email}
        </p>
      ) : null}

      <Button type="button" variant="outline" size="sm" onClick={handleLogout}>
        <LogOut className="size-4" aria-hidden />
        <span className={cn('hidden sm:inline')}>Sign out</span>
      </Button>
    </header>
  )
}
