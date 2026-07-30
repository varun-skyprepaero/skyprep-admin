import { Link, Navigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { canAccessUsersSection } from '@/features/auth/lib/admin-section-access'
import {
  cancelInvitation,
  resendInvitation,
} from '@/features/invitations/api/invitations-api'
import { SignupSourceBadge } from '@/features/users/components/SignupSourceBadge'
import { invitationsQueryKey } from '@/features/users/constants/query-keys'
import { useAdminInvitation } from '@/features/users/hooks/use-admin-user'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'
import { useState } from 'react'

/** @param {string | null | undefined} value */
function formatDateTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

/**
 * @param {{ inviteUuid: string }} props
 */
export default function UserInviteDetailPage({ inviteUuid }) {
  const queryClient = useQueryClient()
  const actor = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const { invitation, isLoading, isError, error } = useAdminInvitation(inviteUuid)
  const [cancelOpen, setCancelOpen] = useState(false)

  const resendMutation = useMutation({
    mutationFn: () => resendInvitation(inviteUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Invitation resent')
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey })
      const url = response?.data?.signupUrl
      if (url && import.meta.env.DEV) console.info('[invite] resent URL', url)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to resend invitation')
      notifyError(message || 'Unable to resend invitation')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelInvitation(inviteUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Invitation cancelled')
      queryClient.invalidateQueries({ queryKey: invitationsQueryKey })
      setCancelOpen(false)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to cancel invitation')
      notifyError(message || 'Unable to cancel invitation')
    },
  })

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canAccessUsersSection(actor, matrix)) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Loading invitation…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/users">
            <ArrowLeft className="size-4" aria-hidden />
            Back to users
          </Link>
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {error?.message ?? 'Unable to load invitation.'}
        </p>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/users">
            <ArrowLeft className="size-4" aria-hidden />
            Back to users
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Invitation not found or already accepted.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <Button type="button" variant="ghost" size="sm" asChild className="-ml-2 gap-2">
            <Link to="/users">
              <ArrowLeft className="size-4" aria-hidden />
              Back to users
            </Link>
          </Button>
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Pending invitation</h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" aria-hidden />
                {invitation.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  {invitation.roleName ?? '—'}
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    invitation.expired
                      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
                      : 'bg-sky-500/15 text-sky-800 dark:text-sky-400',
                  )}
                >
                  {invitation.expired ? 'Invite expired' : 'Invite sent'}
                </span>
                <SignupSourceBadge pendingInvite />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={resendMutation.isPending}
            onClick={() => resendMutation.mutate()}
          >
            {resendMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Resend invitation
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setCancelOpen(true)}
            disabled={cancelMutation.isPending}
          >
            Cancel invitation
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invitation details</CardTitle>
          <CardDescription>Outstanding signup link for this email address</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <DetailRow label="Invitation ID" value={invitation.uuid} mono />
          <DetailRow label="Email" value={invitation.email ?? '—'} />
          <DetailRow label="Role" value={invitation.roleName ?? '—'} />
          <DetailRow label="Status" value={invitation.status ?? '—'} />
          <DetailRow label="Sent" value={formatDateTime(invitation.createdAt)} />
          <DetailRow label="Expires" value={formatDateTime(invitation.expiresAt)} />
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel invitation"
        description={`Cancel the invitation for ${invitation.email}? They will no longer be able to use the signup link.`}
        confirmLabel="Cancel invitation"
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

/**
 * @param {{ label: string, value: React.ReactNode, mono?: boolean }} props
 */
function DetailRow({ label, value, mono = false }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p className={cn('font-medium text-foreground', mono && 'font-mono text-xs break-all')}>{value}</p>
    </div>
  )
}
