import { useMemo, useState } from 'react'
import { Navigate, useOutletContext, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  fetchTrainingEnrollments,
  updateFocusOneEnrollment,
  updateTrainingEnrollment,
} from '@/features/focus-one/api/focus-one-api'
import { EditFocusOneEnrollmentDialog } from '@/features/focus-one/components/EditFocusOneEnrollmentDialog'
import {
  ENROLLMENT_STATUS_OPTIONS,
  formatEnrollmentStatus,
  formatPersonName,
  formatTimezoneDisplay,
  formatTrainingTrack,
} from '@/features/focus-one/constants'
import {
  formatProgramType,
  isKnownProgramType,
  slugToProgramType,
} from '@/features/training/constants'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { cn } from '@/lib/utils'

function formatShortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
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
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', tone)}>
      {formatEnrollmentStatus(status)}
    </span>
  )
}

export default function ProgramTypeEnrollmentsPage() {
  const { programTypeSlug } = useParams()
  const programType = slugToProgramType(programTypeSlug)
  const queryClient = useQueryClient()
  const outletContext = useOutletContext(
    /** @type {{ openEnroll?: () => void, activeProgramType?: string } | undefined} */ (
      undefined
    ),
  )

  const [emailFilter, setEmailFilter] = useState('')
  const [editingEnrollment, setEditingEnrollment] = useState(
    /** @type {Record<string, any> | null} */ (null),
  )

  const enrollmentsQueryKey = ['training', 'enrollments', programType]

  const { data: enrollments = [], isLoading } = useQuery({
    queryKey: [...enrollmentsQueryKey, emailFilter],
    queryFn: () =>
      fetchTrainingEnrollments({
        programType,
        email: emailFilter.trim() || undefined,
      }),
    enabled: isKnownProgramType(programType),
  })

  const statusMutation = useMutation({
    mutationFn: ({ uuid, status }) =>
      programType === 'FOCUS_ONE'
        ? updateFocusOneEnrollment(uuid, { status })
        : updateTrainingEnrollment(uuid, { status }),
    onSuccess: () => {
      notifySuccess('Enrollment updated')
      queryClient.invalidateQueries({ queryKey: enrollmentsQueryKey })
    },
    onError: (error) => notifyError(handleApiError(error)),
  })

  const rows = useMemo(() => enrollments, [enrollments])
  const typeLabel = formatProgramType(programType)

  if (!isKnownProgramType(programType)) {
    return <Navigate to="/programs/catalog" replace />
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={emailFilter}
            onChange={(event) => setEmailFilter(event.target.value)}
            placeholder="Filter by student email…"
            className="h-9 pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? 'Loading…'
            : `${rows.length} ${typeLabel} enrollment${rows.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[24vh] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading enrollments…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed bg-muted/20 px-5 py-10">
          <div>
            <p className="text-sm font-medium">No {typeLabel} enrollments</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Enroll an existing student or invite someone new.
            </p>
          </div>
          {outletContext?.openEnroll ? (
            <Button type="button" size="sm" onClick={outletContext.openEnroll}>
              <Plus className="mr-1.5 size-3.5" />
              Add enrollment
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Program</th>
                  <th className="px-4 py-3 font-medium">Subjects</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Enrolled</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.uuid} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium">
                        {formatPersonName(row.student ?? {})}
                      </div>
                      <div className="text-muted-foreground">{row.student?.email}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {formatTimezoneDisplay(row.student?.timezone)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium">
                        {formatTrainingTrack(row.program?.track)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.program?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      {(row.subjects ?? []).length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <div className="space-y-2">
                          {(row.subjects ?? []).map((subject) => (
                            <div key={subject.uuid}>
                              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                {subject.name ?? subject.uuid}
                              </span>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {subject.instructor
                                  ? `${formatPersonName(subject.instructor)} · ${formatTimezoneDisplay(subject.instructor.timezone)}`
                                  : 'No teacher assigned'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="space-y-2">
                        <StatusPill status={row.status} />
                        <select
                          className="h-8 w-full max-w-[9.5rem] rounded-md border border-input bg-background px-2 text-xs"
                          value={row.status}
                          onChange={(event) =>
                            statusMutation.mutate({
                              uuid: row.uuid,
                              status: event.target.value,
                            })
                          }
                          disabled={statusMutation.isPending}
                          aria-label={`Status for ${formatPersonName(row.student ?? {})}`}
                        >
                          {ENROLLMENT_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top text-muted-foreground">
                      {formatShortDate(row.enrolledAt)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8"
                        onClick={() => setEditingEnrollment(row)}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <EditFocusOneEnrollmentDialog
        open={Boolean(editingEnrollment)}
        onOpenChange={(open) => {
          if (!open) setEditingEnrollment(null)
        }}
        enrollment={editingEnrollment}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: enrollmentsQueryKey })
        }}
      />
    </div>
  )
}
