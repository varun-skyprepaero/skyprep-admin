import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, GraduationCap, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { fetchTrainingEnrollments } from '@/features/focus-one/api/focus-one-api'
import { formatEnrollmentStatus, formatPersonName } from '@/features/focus-one/constants'
import { formatProgramType, formatTrainingTrack, programTypeToSlug } from '@/features/training/constants'
import { fetchTestSeriesSubscribers } from '@/features/tests/api/tests-api'
import { hasPermission } from '@/features/auth/lib/admin-section-access'
import { cn } from '@/lib/utils'

/** @param {string | null | undefined} value */
function formatDate(value) {
  if (!value) return null
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

/**
 * @param {{ status: string }} props
 */
function StatusPill({ status }) {
  const tone =
    status === 'ACTIVE'
      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
      : status === 'PENDING'
        ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
        : status === 'PAUSED'
          ? 'bg-sky-500/15 text-sky-800 dark:text-sky-300'
          : 'bg-muted text-muted-foreground'

  return (
    <span className={cn('inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', tone)}>
      {formatEnrollmentStatus(status) || status}
    </span>
  )
}

/**
 * @param {{
 *   email?: string | null
 *   actor: Record<string, unknown> | null | undefined
 *   matrix: import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined
 *   className?: string
 * }} props
 */
export function UserProgramsAccessCard({ email, actor, matrix, className }) {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const canViewTraining = hasPermission(matrix, 'focus_one', 'view', actor)
  const canViewSubscriptions = hasPermission(matrix, 'tests.subscribers', 'view', actor)

  const enrollmentsQuery = useQuery({
    queryKey: ['admin', 'user-enrollments', normalizedEmail],
    queryFn: () => fetchTrainingEnrollments({ email: normalizedEmail }),
    enabled: Boolean(normalizedEmail) && canViewTraining,
  })

  const subscriptionsQuery = useQuery({
    queryKey: ['admin', 'user-subscriptions', normalizedEmail],
    queryFn: () =>
      fetchTestSeriesSubscribers({ q: normalizedEmail, page: 1, pageSize: 50 }),
    enabled: Boolean(normalizedEmail) && canViewSubscriptions,
  })

  if (!normalizedEmail) {
    return null
  }

  if (!canViewTraining && !canViewSubscriptions) {
    return (
      <Card className={cn('min-w-0', className)}>
        <CardHeader>
          <CardTitle className="text-base">Programs & access</CardTitle>
          <CardDescription>Training and test series enrollment</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">You do not have permission to view enrollments.</p>
        </CardContent>
      </Card>
    )
  }

  const enrollments = enrollmentsQuery.data ?? []
  const subscriptions = subscriptionsQuery.data?.subscribers ?? []
  const isLoading =
    (canViewTraining && enrollmentsQuery.isLoading) ||
    (canViewSubscriptions && subscriptionsQuery.isLoading)

  return (
    <Card className={cn('min-w-0', className)}>
      <CardHeader>
        <CardTitle className="text-base">Programs & access</CardTitle>
        <CardDescription>Training programs and test series enrolled</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2 text-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading enrollments…
          </div>
        ) : (
          <>
            {canViewTraining ? (
              <div className="min-w-0 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <GraduationCap className="size-3.5" aria-hidden />
                  Training programs
                </p>
                {enrollments.length === 0 ? (
                  <p className="text-muted-foreground">Not enrolled in any program.</p>
                ) : (
                  <ul className="space-y-2">
                    {enrollments.map((enrollment) => {
                      const programType = enrollment.program?.programType
                      const programLink = programType
                        ? `/programs/${programTypeToSlug(programType)}`
                        : '/programs'
                      const enrolledDate = formatDate(enrollment.enrolledAt)

                      return (
                        <li
                          key={enrollment.uuid}
                          className="rounded-md border border-border/60 px-2.5 py-2 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 font-medium leading-snug text-foreground">
                              {enrollment.program?.name ?? 'Training program'}
                            </p>
                            <StatusPill status={String(enrollment.status || '')} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatProgramType(programType)}
                            {enrollment.program?.track
                              ? ` · ${formatTrainingTrack(enrollment.program.track)}`
                              : ''}
                            {enrolledDate ? ` · enrolled ${enrolledDate}` : ''}
                          </p>
                          {Array.isArray(enrollment.subjects) && enrollment.subjects.length > 0 ? (
                            <ul className="space-y-0.5 text-xs text-muted-foreground">
                              {enrollment.subjects.map((subject) => (
                                <li key={subject.uuid} className="flex justify-between gap-2">
                                  <span className="text-foreground">{subject.name ?? 'Subject'}</span>
                                  <span className="shrink-0">
                                    {subject.instructor
                                      ? formatPersonName(subject.instructor)
                                      : 'No instructor'}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">No subjects assigned.</p>
                          )}
                          <Link
                            to={programLink}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            View program →
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ) : null}

            {canViewSubscriptions ? (
              <div className="min-w-0 space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <BookOpen className="size-3.5" aria-hidden />
                  Test series
                </p>
                {subscriptions.length === 0 ? (
                  <p className="text-muted-foreground">No test series access.</p>
                ) : (
                  <ul className="space-y-2">
                    {subscriptions.map((row) => {
                      const expiry = formatDate(row.currentPeriodEnd)
                      return (
                        <li
                          key={row.uuid}
                          className="rounded-md border border-border/60 px-2.5 py-2 space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 font-medium leading-snug text-foreground">
                              {row.planLabel ?? row.planKey ?? 'Test series plan'}
                            </p>
                            <StatusPill status={String(row.status || '')} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {row.paymentProvider === 'internal' ? 'Admin grant' : 'Paid subscription'}
                            {expiry ? ` · until ${expiry}` : ''}
                          </p>
                          {Array.isArray(row.entitlements) && row.entitlements.length > 0 ? (
                            <p className="text-xs text-muted-foreground">
                              Access: {row.entitlements.join(', ')}
                            </p>
                          ) : null}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <Link
                  to="/subscription/subscribers"
                  className="inline-block text-xs font-medium text-primary hover:underline"
                >
                  All subscribers →
                </Link>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
