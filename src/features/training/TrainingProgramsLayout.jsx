import { useEffect, useMemo, useState } from 'react'
import {
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useSearchParams,
} from 'react-router-dom'
import { Loader2, Plus, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EnrollFocusOneDialog } from '@/features/focus-one/components/EnrollFocusOneDialog'
import {
  canAccessTrainingProgramsSection,
  canViewTrainingProgramScreen,
  hasPermission,
} from '@/features/auth/lib/admin-section-access'
import {
  PROGRAM_TYPE_OPTIONS,
  formatProgramType,
  isKnownProgramType,
  programTypeToSlug,
  slugToProgramType,
} from '@/features/training/constants'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'

export default function TrainingProgramsLayout() {
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [inviteOpen, setInviteOpen] = useState(false)

  const canCreateEnrollment = hasPermission(matrix, 'focus_one', 'create', user)
  const canViewCatalog =
    canViewTrainingProgramScreen(user, matrix, 'training_programs') ||
    canViewTrainingProgramScreen(user, matrix, 'focus_one')
  const canViewEnrollments = canViewTrainingProgramScreen(user, matrix, 'focus_one')

  const activeProgramType = useMemo(() => {
    const segment = location.pathname.split('/').filter(Boolean).pop() || ''
    if (segment === 'catalog' || segment === 'programs') return null
    const programType = slugToProgramType(segment)
    return isKnownProgramType(programType) ? programType : null
  }, [location.pathname])

  const tabs = useMemo(() => {
    /** @type {{ to: string, label: string }[]} */
    const next = []
    if (canViewCatalog) {
      next.push({ to: 'catalog', label: 'Catalog' })
    }
    if (canViewEnrollments) {
      for (const option of PROGRAM_TYPE_OPTIONS) {
        next.push({
          to: programTypeToSlug(option.value),
          label: formatProgramType(option.value),
        })
      }
    }
    return next
  }, [canViewCatalog, canViewEnrollments])

  const showEnrollmentActions = Boolean(activeProgramType) && canCreateEnrollment

  useEffect(() => {
    if (searchParams.get('enroll') === '1') {
      setEnrollOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('enroll')
      setSearchParams(next, { replace: true })
    }
    if (searchParams.get('invite') === '1') {
      setInviteOpen(true)
      const next = new URLSearchParams(searchParams)
      next.delete('invite')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canAccessTrainingProgramsSection(user, matrix)) {
    return <Navigate to="/" replace />
  }

  if (tabs.length === 0) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/70 sm:flex-row sm:items-end sm:justify-between">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Programs sections">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  'relative shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        {showEnrollmentActions ? (
          <div className="flex flex-wrap gap-2 pb-2.5">
            <Button type="button" variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 size-3.5" />
              Invite student
            </Button>
            <Button type="button" size="sm" onClick={() => setEnrollOpen(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add enrollment
            </Button>
          </div>
        ) : null}
      </div>

      <Outlet
        context={{
          openEnroll: () => setEnrollOpen(true),
          openInvite: () => setInviteOpen(true),
          activeProgramType,
        }}
      />

      <EnrollFocusOneDialog
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
        mode="enroll"
        programType={activeProgramType ?? 'FOCUS_ONE'}
      />
      <EnrollFocusOneDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        mode="invite"
        programType={activeProgramType ?? 'FOCUS_ONE'}
      />
    </div>
  )
}
