import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminTopbar } from '@/components/layout/admin-topbar'
import { cn } from '@/lib/utils'

const SIDEBAR_COLLAPSED_KEY = 'skyprep-admin-sidebar-collapsed'

export function AdminShellLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
  })

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed))
  }, [sidebarCollapsed])

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="flex min-h-screen bg-muted/20">
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block',
          sidebarCollapsed ? 'w-[4.5rem]' : 'w-64',
        )}
      >
        <AdminSidebar collapsed={sidebarCollapsed} />
      </div>

      {mobileNavOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
            aria-hidden
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64 lg:hidden">
            <AdminSidebar mobile onNavigate={closeMobileNav} />
          </div>
        </>
      ) : null}

      <div
        className={cn(
          'flex min-h-screen flex-1 flex-col transition-[padding] duration-200',
          sidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64',
        )}
      >
        <AdminTopbar
          onMenuClick={() => setMobileNavOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[88rem]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
