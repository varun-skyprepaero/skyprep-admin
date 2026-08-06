import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  HardDrive,
  Loader2,
  LogIn,
  Mail,
  Pencil,
  Phone,
  Shield,
  Trash2,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { GrantAccessDialog } from '@/features/subscription/components/GrantAccessDialog'
import { CLASSROOM_APP_ROLE_NAMES, DATA_ENTRY_ROLE_NAME, SUPER_ADMIN_ROLE_NAME } from '@/features/invitations/constants'
import {
  canAccessUsersSection,
  canEditDataEntryAuditors,
  canImpersonateClassroomUser,
  hasPermission,
} from '@/features/auth/lib/admin-section-access'
import { ClassroomImpersonateDialog } from '@/features/users/components/ClassroomImpersonateDialog'
import { AuditorMultiSelect } from '@/features/users/components/AuditorMultiSelect'
import { SignupSourceBadge } from '@/features/users/components/SignupSourceBadge'
import { UserEditDialog } from '@/features/users/components/UserEditDialog'
import { UserProgramsAccessCard } from '@/features/users/components/UserProgramsAccessCard'
import {
  adminDeleteUser,
  adminUpdateUser,
  fetchAdminUserInsights,
  fetchAuditors,
  setUserAuditor,
} from '@/features/users/api/users-api'
import { auditorsQueryKey, userInsightsQueryKey, usersQueryKey } from '@/features/users/constants/query-keys'
import { useAdminUser } from '@/features/users/hooks/use-admin-user'
import {
  DEFAULT_STORAGE_QUOTA_MB,
  formatStorageLabel,
  formatStoragePercent,
  storageMbToBytes,
} from '@/features/users/lib/user-storage'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'

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

/** @param {boolean | undefined} verified */
function verificationLabel(verified) {
  return verified ? 'Verified' : 'Not verified'
}

/**
 * @param {{
 *   countryCode?: string | null
 *   phoneNumber?: string | null
 *   city?: string | null
 *   state?: string | null
 *   country?: string | null
 *   zipCode?: string | null
 * }} user
 */
function formatPhone(user) {
  const code = String(user.countryCode || '').trim()
  const number = String(user.phoneNumber || '').trim()
  if (!number) return null
  return code ? `${code} ${number}` : number
}

/**
 * @param {{
 *   city?: string | null
 *   state?: string | null
 *   country?: string | null
 *   zipCode?: string | null
 * }} user
 */
function formatLocation(user) {
  const parts = [user.city, user.state, user.country].filter(Boolean)
  const line = parts.join(', ')
  if (!line && !user.zipCode) return null
  return user.zipCode ? `${line}${line ? ' · ' : ''}${user.zipCode}` : line
}

/** @param {Record<string, number> & { total?: number } | undefined} counts */
function formatCountSummary(counts) {
  const total = Number(counts?.total) || 0
  if (total === 0) return 'None'
  const parts = Object.entries(counts ?? {})
    .filter(([key, value]) => key !== 'total' && Number(value) > 0)
    .map(([key, value]) => `${key.replace(/_/g, ' ').toLowerCase()}: ${value}`)
  return parts.length > 0 ? `${total} total (${parts.join(', ')})` : String(total)
}

/**
 * @param {{ userUuid: string }} props
 */
export default function UserDetailPage({ userUuid }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const actor = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const { user, roleName, canView, isLoading, isError, error } = useAdminUser(userUuid)

  const [editOpen, setEditOpen] = useState(false)
  const [editErrors, setEditErrors] = useState({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [grantAccessOpen, setGrantAccessOpen] = useState(false)
  const [impersonateTarget, setImpersonateTarget] = useState(
    /** @type {null | { uuid: string, email: string, name: string }} */ (null),
  )
  const [auditorUuids, setAuditorUuids] = useState(/** @type {string[]} */ ([]))
  const [auditorModalOpen, setAuditorModalOpen] = useState(false)

  const canEdit = hasPermission(matrix, 'users.directory', 'edit', actor)
  const canDeleteUsers = hasPermission(matrix, 'users.directory', 'delete', actor)
  const canImpersonate = canImpersonateClassroomUser(actor, matrix)
  const canGrantAccess = hasPermission(matrix, 'tests.subscribers', 'edit', actor)
  const canEditAuditors = canEditDataEntryAuditors(actor, matrix)

  const auditorsQuery = useQuery({
    queryKey: auditorsQueryKey,
    queryFn: fetchAuditors,
    enabled: canAccessUsersSection(actor, matrix) && canEditAuditors && roleName === DATA_ENTRY_ROLE_NAME,
  })

  const insightsQuery = useQuery({
    queryKey: userInsightsQueryKey(userUuid),
    queryFn: () => fetchAdminUserInsights(userUuid),
    enabled: canAccessUsersSection(actor, matrix) && Boolean(userUuid) && canView,
  })

  const auditorOptions = (auditorsQuery.data ?? []).map((entry) => {
    const name = [entry.firstName, entry.lastName].filter(Boolean).join(' ').trim()
    const label = name && entry.email ? `${name} (${entry.email})` : name || entry.email || entry.uuid
    return { uuid: entry.uuid, label }
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => adminUpdateUser(userUuid, payload),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'User updated')
      setEditErrors({})
      setEditOpen(false)
      queryClient.invalidateQueries({ queryKey: usersQueryKey })
      queryClient.invalidateQueries({ queryKey: userInsightsQueryKey(userUuid) })
    },
    onError: (err) => {
      const { message, fieldErrors } = handleApiError(err, 'Unable to update user')
      setEditErrors({ ...fieldErrors, ...(message ? { root: message } : {}) })
      notifyError(message || 'Unable to update user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => adminDeleteUser(userUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'User deleted')
      queryClient.invalidateQueries({ queryKey: usersQueryKey })
      navigate('/users')
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete user')
      notifyError(message || 'Unable to delete user')
    },
  })

  const auditorMutation = useMutation({
    mutationFn: (nextAuditorUuids) => setUserAuditor(userUuid, nextAuditorUuids),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Auditors updated')
      setAuditorModalOpen(false)
      queryClient.invalidateQueries({ queryKey: usersQueryKey })
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update auditor')
      notifyError(message || 'Unable to update auditor')
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
        Loading user…
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
          {error?.message ?? 'Unable to load user.'}
        </p>
      </div>
    )
  }

  if (!user || !canView) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" size="sm" asChild className="gap-2">
          <Link to="/users">
            <ArrowLeft className="size-4" aria-hidden />
            Back to users
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">User not found or you do not have access.</p>
      </div>
    )
  }

  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'User'
  const isSuperAdmin = roleName === SUPER_ADMIN_ROLE_NAME
  const canDelete =
    canDeleteUsers && user.uuid !== actor?.uuid && !isSuperAdmin
  const canGrant =
    canGrantAccess &&
    user.isActive &&
    user.email &&
    CLASSROOM_APP_ROLE_NAMES.includes(roleName ?? '')
  const canOpenAs =
    canImpersonate && user.isActive && !isSuperAdmin && user.uuid !== actor?.uuid
  const storageQuotaBytes =
    Number(user.storageQuotaBytes) > 0
      ? Number(user.storageQuotaBytes)
      : storageMbToBytes(DEFAULT_STORAGE_QUOTA_MB)
  const storage = insightsQuery.data?.storage ?? null
  const usedBytes = Number(storage?.usedBytes) || 0
  const quotaBytes = Number(storage?.quotaBytes) || storageQuotaBytes
  const remainingBytes = Number(storage?.remainingBytes) ?? Math.max(quotaBytes - usedBytes, 0)
  const storagePercent = Number(storage?.percentUsed) || formatStoragePercent(usedBytes, quotaBytes)
  const storageNearLimit = storagePercent >= 90
  const phone = formatPhone(user)
  const location = formatLocation(user)
  const enrollmentSummary = formatCountSummary(insightsQuery.data?.counts?.trainingEnrollments)
  const purchaseSummary = formatCountSummary(insightsQuery.data?.counts?.purchaseOrders)

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
              <User className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-1">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{displayName}</h1>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="size-4 shrink-0" aria-hidden />
                {user.email}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                  <Shield className="size-3" aria-hidden />
                  {roleName ?? '—'}
                </span>
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    user.isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
                <SignupSourceBadge registrationSource={user.registrationSource} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setEditErrors({})
                setEditOpen(true)
              }}
            >
              <Pencil className="size-4" aria-hidden />
              Edit
            </Button>
          ) : null}
          {canOpenAs ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                setImpersonateTarget({
                  uuid: user.uuid,
                  email: user.email ?? '',
                  name: displayName,
                })
              }
            >
              <LogIn className="size-4" aria-hidden />
              Open as user
            </Button>
          ) : null}
          {canGrant ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setGrantAccessOpen(true)}>
              Grant access
            </Button>
          ) : null}
          {canEditAuditors && roleName === DATA_ENTRY_ROLE_NAME ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const assigned = user.auditors ?? (user.auditor ? [user.auditor] : [])
                setAuditorUuids(assigned.map((a) => a.uuid))
                setAuditorModalOpen(true)
              }}
            >
              {(user.auditors?.length ?? (user.auditor ? 1 : 0)) ? 'Change auditors' : 'Assign auditors'}
            </Button>
          ) : null}
          {canDelete ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden />
              Delete user
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="md:col-span-2 xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Account overview</CardTitle>
            <CardDescription>Registration and membership details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
            <DetailRow label="User ID" value={user.uuid} mono className="sm:col-span-2" />
            <DetailRow
              label="Email"
              value={user.email ?? '—'}
              className="sm:col-span-2"
              title={user.email ?? undefined}
            />
            <DetailRow label="Role" value={roleName ?? '—'} />
            <DetailRow label="Member since" value={formatDateTime(user.createdAt)} />
            <DetailRow label="Last login" value={formatDateTime(user.lastLoginAt)} />
            <DetailRow label="Profile updated" value={formatDateTime(user.updatedAt)} />
            <DetailRow label="Timezone" value={user.timezone ?? '—'} />
            {user.language ? <DetailRow label="Language" value={user.language} /> : null}
            {phone ? (
              <DetailRow
                label="Phone"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    {phone}
                  </span>
                }
              />
            ) : null}
            {location ? <DetailRow label="Location" value={location} /> : null}
            <DetailRow label="Email verified" value={verificationLabel(user.isEmailVerified)} />
            <DetailRow label="Phone verified" value={verificationLabel(user.isPhoneVerified)} />
            {roleName === DATA_ENTRY_ROLE_NAME ? (
              <DetailRow
                label="Auditors"
                value={
                  (user.auditors?.length ?? (user.auditor ? 1 : 0)) ? (
                    <ul className="space-y-1">
                      {(user.auditors ?? (user.auditor ? [user.auditor] : [])).map((auditor) => (
                        <li key={auditor.uuid}>
                          {auditor.name}
                          {auditor.email ? (
                            <span className="block text-xs text-muted-foreground">{auditor.email}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'Unassigned'
                  )
                }
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="size-4" aria-hidden />
              Cloud storage
            </CardTitle>
            <CardDescription>Drive uploads, whiteboards, and session files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {insightsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading storage usage…
              </div>
            ) : insightsQuery.isError ? (
              <p className="text-muted-foreground">Storage usage unavailable.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Used</span>
                    <span className={cn('font-medium', storageNearLimit && 'text-amber-700 dark:text-amber-400')}>
                      {formatStorageLabel(usedBytes)} of {formatStorageLabel(quotaBytes)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        storageNearLimit ? 'bg-amber-500' : 'bg-primary',
                      )}
                      style={{ width: `${storagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{storagePercent}% used</p>
                </div>
                <DetailRow label="Storage used" value={formatStorageLabel(usedBytes)} />
                <DetailRow label="Storage limit" value={formatStorageLabel(quotaBytes)} />
                <DetailRow label="Remaining" value={formatStorageLabel(remainingBytes)} />
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Cloud drive uploads, whiteboards, and session files count toward this limit.
            </p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Activity summary</CardTitle>
            <CardDescription>Enrollments and purchases at a glance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {insightsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading activity…
              </div>
            ) : (
              <>
                <DetailRow label="Training enrollments" value={enrollmentSummary} />
                <DetailRow label="Purchase orders" value={purchaseSummary} />
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Purchase and enrollment counts from the platform database.
            </p>
          </CardContent>
        </Card>

        <UserProgramsAccessCard
          email={user.email}
          actor={actor}
          matrix={matrix}
          className="md:col-span-2 xl:col-span-2"
        />
      </div>

      <UserEditDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditErrors({})
        }}
        user={user}
        errors={editErrors}
        isPending={updateMutation.isPending}
        onSave={(payload) => updateMutation.mutateAsync(payload)}
      />

      <ClassroomImpersonateDialog
        target={impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
      />

      <GrantAccessDialog
        open={grantAccessOpen}
        onOpenChange={setGrantAccessOpen}
        initialEmail={user.email ?? ''}
        lockEmail={Boolean(user.email)}
      />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete user"
        description={`Delete ${displayName}? This soft-deletes the account and blocks signup with the same email until permanently removed.`}
        confirmLabel="Delete user"
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
      />

      <Modal
        open={auditorModalOpen}
        onClose={() => setAuditorModalOpen(false)}
        size="sm"
        closeDisabled={auditorMutation.isPending}
        aria-labelledby="detail-auditor-title"
      >
        <ModalHeader
          title="Assign auditors"
          description={`Choose the admin(s) who audit ${displayName}'s data-entry work.`}
          titleId="detail-auditor-title"
          onClose={() => setAuditorModalOpen(false)}
          closeDisabled={auditorMutation.isPending}
        />
        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            auditorMutation.mutate(auditorUuids)
          }}
        >
          <ModalBody className="space-y-4">
            <AuditorMultiSelect
              options={auditorOptions}
              selected={auditorUuids}
              disabled={auditorMutation.isPending || auditorsQuery.isLoading}
              onChange={setAuditorUuids}
            />
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setAuditorModalOpen(false)}
              disabled={auditorMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={auditorMutation.isPending}>
              {auditorMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}

/**
 * @param {{
 *   label: string
 *   value: React.ReactNode
 *   mono?: boolean
 *   className?: string
 *   title?: string
 * }} props
 */
function DetailRow({ label, value, mono = false, className, title }) {
  return (
    <div className={cn('min-w-0 space-y-1', className)}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          'block font-medium text-foreground break-words',
          mono && 'font-mono text-xs break-all',
        )}
        title={title}
      >
        {value}
      </span>
    </div>
  )
}
