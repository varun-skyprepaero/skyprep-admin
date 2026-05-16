import { Navigate, Outlet } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { useAuthStore } from '@/stores/auth-store'

export function GuestRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner label="Loading" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
