import { useEffect } from 'react'
import { getUserProfile } from '@/features/auth/api/auth-api'
import { fetchMyPermissions } from '@/features/roles-permissions/api/permissions-api'
import { isStaffUser } from '@/features/auth/lib/is-staff-user'
import { useAuthStore } from '@/stores/auth-store'
import { permissionsStore } from '@/stores/permissions-store'

export function AuthBootstrap() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const setBootstrapping = useAuthStore((s) => s.setBootstrapping)

  useEffect(() => {
    if (!hasHydrated) return

    const uuid = user?.uuid
    if (!accessToken || !uuid) {
      permissionsStore.clear()
      setBootstrapping(false)
      return
    }

    let cancelled = false

    async function bootstrap() {
      setBootstrapping(true)
      try {
        const profile = await getUserProfile(uuid)
        if (cancelled) return

        if (!isStaffUser(profile)) {
          permissionsStore.clear()
          logout()
          return
        }

        setUser(profile)

        const permissions = await fetchMyPermissions()
        if (cancelled) return
        permissionsStore.setPermissions(permissions)
      } catch {
        if (!cancelled) {
          permissionsStore.clear()
          logout()
        }
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
    }
  }, [hasHydrated, accessToken, user?.uuid, setUser, logout, setBootstrapping])

  return null
}
