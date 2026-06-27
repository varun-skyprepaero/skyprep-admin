import { Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'

export function ImpersonationBanner() {
  const impersonation = useAuthStore((s) => s.impersonation)
  const user = useAuthStore((s) => s.user)

  if (!impersonation) return null

  const userLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'user'

  return (
    <div
      className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100"
      role="status"
    >
      <Shield className="size-4 shrink-0" aria-hidden />
      <span>
        Staff view — signed in as <strong>{userLabel}</strong>
        {impersonation.actorName ? (
          <>
            {' '}
            (opened by {impersonation.actorName})
          </>
        ) : null}
        .
      </span>
    </div>
  )
}
