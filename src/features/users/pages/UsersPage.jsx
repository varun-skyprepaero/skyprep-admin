import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DataTable,
  DataTableContent,
  DataTablePagination,
  DataTableRowActions,
  DataTableToolbar,
  dataTableSelectClass,
} from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { USER_ENDPOINTS } from '@/features/auth/constants'
import {
  cancelInvitation,
  createInvitation,
  fetchPendingInvitations,
  resendInvitation,
} from '@/features/invitations/api/invitations-api'
import {
  DATA_ENTRY_ROLE_NAME,
  INVITABLE_ROLE_OPTIONS,
  SUPER_ADMIN_ROLE_NAME,
} from '@/features/invitations/constants'
import {
  canAccessUsersSection,
  canEditDataEntryAuditors,
  canImpersonateClassroomUser,
  canViewUserInDirectory,
  hasPermission,
  invitableRoleOptionsForUser,
} from '@/features/auth/lib/admin-section-access'
import { CLASSROOM_APP_ROLE_NAMES } from '@/features/invitations/constants'
import { GrantAccessDialog } from '@/features/subscription/components/GrantAccessDialog'
import { fetchInvitableRoles } from '@/features/roles-permissions/api/permissions-api'
import { ClassroomImpersonateDialog } from '@/features/users/components/ClassroomImpersonateDialog'
import { adminUpdateUser, fetchAuditors, fetchUsers, setUserAuditor } from '@/features/users/api/users-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { cn } from '@/lib/utils'
import { Loader2, LogIn, UserPlus, X } from 'lucide-react'

const usersQueryKey = ['admin', 'users', USER_ENDPOINTS.list]
const invitationsQueryKey = ['admin', 'invitations', 'pending']
const invitableRolesQueryKey = ['admin', 'invitable-roles']
const auditorsQueryKey = ['admin', 'auditors']

function formatShortDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return '—'
  }
}

/**
 * @param {import('@/features/users/api/users-api.types').AdminUserRow[]} users
 * @param {Awaited<ReturnType<typeof fetchPendingInvitations>>} invitations
 */
function buildTableRows(users, invitations) {
  const userByEmail = new Map(users.map((u) => [u.email?.toLowerCase?.() ?? '', u]))
  const inviteRows = invitations
    .filter((inv) => inv?.email && !userByEmail.has(inv.email.toLowerCase()))
    .map((inv) => ({
      key: `invite:${inv.uuid}`,
      kind: /** @type {const} */ ('invite'),
      uuid: inv.uuid,
      email: inv.email,
      roleName: inv.roleName,
      inviteStatus: inv.status,
      inviteExpired: inv.expired,
      inviteExpiresAt: inv.expiresAt,
      inviteSentAt: inv.createdAt,
      sortAt: inv.createdAt || inv.expiresAt || 0,
    }))

  const userRows = users.map((u) => ({
    key: `user:${u.uuid}`,
    kind: /** @type {const} */ ('user'),
    uuid: u.uuid,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    roleName: u.role?.name ?? null,
    registrationSource: u.registrationSource ?? null,
    isActive: u.isActive,
    createdAt: u.createdAt,
    auditor: u.auditor ?? null,
    auditorUuid: u.auditor?.uuid ?? null,
    sortAt: u.createdAt || 0,
  }))

  return [...userRows, ...inviteRows].sort(
    (a, b) => new Date(b.sortAt).getTime() - new Date(a.sortAt).getTime(),
  )
}

function signupSourceSearchBlob(row) {
  if (row.kind === 'invite') return 'pending invite invitation'
  switch (row.registrationSource) {
    case 'INVITED':
      return 'admin invite invited invitation'
    case 'SELF_REGISTERED':
      return 'classroom web self signup registered public'
    case 'ADMIN_CREATED':
      return 'admin created provisioned'
    default:
      return 'unknown legacy'
  }
}

function rowMatchesQuery(row, searchRaw) {
  const q = searchRaw.trim().toLowerCase()
  if (!q) return true
  const email = (row.email ?? '').toLowerCase()
  const role = (row.roleName ?? '').toLowerCase()
  const name =
    row.kind === 'user'
      ? [row.firstName, row.lastName].filter(Boolean).join(' ').toLowerCase()
      : 'pending signup invitation'.toLowerCase()
  const sourceBlob = signupSourceSearchBlob(row).toLowerCase()
  return (
    email.includes(q) || role.includes(q) || name.includes(q) || sourceBlob.includes(q)
  )
}

/**
 * @param {ReturnType<typeof buildTableRows>[number]} row
 * @param {{ typeFilter: string, roleFilter: string, statusFilter: string, signupSourceFilter: string }} f
 */
function rowMatchesFilters(row, f) {
  if (f.typeFilter === 'member' && row.kind !== 'user') return false
  if (f.typeFilter === 'invite' && row.kind !== 'invite') return false
  if (f.roleFilter !== 'all' && (row.roleName ?? '') !== f.roleFilter) return false

  if (f.signupSourceFilter !== 'all') {
    if (f.signupSourceFilter === 'pending_invite' && row.kind !== 'invite') return false
    if (f.signupSourceFilter !== 'pending_invite' && row.kind === 'invite') return false
    if (row.kind === 'user') {
      if (f.signupSourceFilter === 'invited' && row.registrationSource !== 'INVITED') {
        return false
      }
      if (
        f.signupSourceFilter === 'classroom' &&
        row.registrationSource !== 'SELF_REGISTERED'
      ) {
        return false
      }
      if (
        f.signupSourceFilter === 'admin_created' &&
        row.registrationSource !== 'ADMIN_CREATED'
      ) {
        return false
      }
      if (f.signupSourceFilter === 'unknown' && row.registrationSource != null) {
        return false
      }
    }
  }

  if (f.statusFilter !== 'all') {
    if (f.statusFilter === 'active' && !(row.kind === 'user' && row.isActive)) return false
    if (f.statusFilter === 'inactive' && !(row.kind === 'user' && !row.isActive)) return false
    if (
      f.statusFilter === 'invite_valid' &&
      !(row.kind === 'invite' && !row.inviteExpired)
    ) {
      return false
    }
    if (
      f.statusFilter === 'invite_expired' &&
      !(row.kind === 'invite' && row.inviteExpired)
    ) {
      return false
    }
  }
  return true
}


function roleFilterOptionsForUser(user, matrix, apiRoleNames) {
  const roleNames =
    apiRoleNames.length > 0
      ? apiRoleNames
      : INVITABLE_ROLE_OPTIONS.map((opt) => opt.value)

  return [
    { value: 'all', label: 'All roles' },
    { value: SUPER_ADMIN_ROLE_NAME, label: 'Super Admin' },
    ...roleNames
      .filter((name) => name !== SUPER_ADMIN_ROLE_NAME)
      .filter((name) => canViewUserInDirectory(user, name, matrix))
      .map((name) => ({ value: name, label: name })),
  ]
}

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'member', label: 'Members' },
  { value: 'invite', label: 'Invitations' },
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Any status' },
  { value: 'active', label: 'Active account' },
  { value: 'inactive', label: 'Inactive account' },
  { value: 'invite_valid', label: 'Invite · valid' },
  { value: 'invite_expired', label: 'Invite · expired' },
]

const SIGNUP_SOURCE_FILTER_OPTIONS = [
  { value: 'all', label: 'Any signup' },
  { value: 'pending_invite', label: 'Pending invite' },
  { value: 'invited', label: 'Joined via admin invite' },
  { value: 'classroom', label: 'Classroom (web signup)' },
  { value: 'admin_created', label: 'Admin-created account' },
  { value: 'unknown', label: 'Unknown / legacy' },
]

function SignupSourceCell({ row }) {
  if (row.kind === 'invite') {
    return (
      <span className="text-xs text-muted-foreground">Pending invite</span>
    )
  }
  switch (row.registrationSource) {
    case 'INVITED':
      return (
        <span className="inline-flex rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-800 dark:text-violet-300">
          Admin invite
        </span>
      )
    case 'SELF_REGISTERED':
      return (
        <span className="inline-flex rounded-full bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-800 dark:text-teal-300">
          Classroom (web)
        </span>
      )
    case 'ADMIN_CREATED':
      return (
        <span className="inline-flex rounded-full bg-slate-500/15 px-2 py-0.5 text-xs font-medium text-slate-800 dark:text-slate-300">
          Admin created
        </span>
      )
    default:
      return <span className="text-xs text-muted-foreground">Unknown</span>
  }
}

export default function UsersPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const hasHydrated = useAuthStore((s) => s._hasHydrated)
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState(INVITABLE_ROLE_OPTIONS[0].value)
  const [inviteErrors, setInviteErrors] = useState({})

  const [editUser, setEditUser] = useState(
    /** @type {null | { uuid: string, firstName: string, lastName: string, isActive: boolean, roleName: string | null }} */ (
      null
    ),
  )
  const [editErrors, setEditErrors] = useState({})
  const [cancelInviteTarget, setCancelInviteTarget] = useState(
    /** @type {null | { uuid: string, email: string }} */ (null),
  )
  const [classroomImpersonateTarget, setClassroomImpersonateTarget] = useState(
    /** @type {null | { uuid: string, email: string, name: string }} */ (null),
  )
  const [grantAccessTarget, setGrantAccessTarget] = useState(
    /** @type {null | { email: string, name: string }} */ (null),
  )
  const [auditorTarget, setAuditorTarget] = useState(
    /** @type {null | { uuid: string, name: string, auditorUuid: string | null }} */ (null),
  )

  const [tableSearch, setTableSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [signupSourceFilter, setSignupSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers,
    enabled: canAccessUsersSection(user, matrix),
  })

  const invitationsQuery = useQuery({
    queryKey: invitationsQueryKey,
    queryFn: fetchPendingInvitations,
    enabled: canAccessUsersSection(user, matrix),
  })

  const invitableRolesQuery = useQuery({
    queryKey: invitableRolesQueryKey,
    queryFn: async () => {
      const data = await fetchInvitableRoles()
      return data.roles ?? []
    },
    enabled: canAccessUsersSection(user, matrix),
  })

  const canEditAuditors = canEditDataEntryAuditors(user, matrix)

  const auditorsQuery = useQuery({
    queryKey: auditorsQueryKey,
    queryFn: fetchAuditors,
    enabled: canAccessUsersSection(user, matrix) && canEditAuditors,
  })

  const auditorOptions = useMemo(
    () =>
      (auditorsQuery.data ?? []).map((a) => {
        const name = [a.firstName, a.lastName].filter(Boolean).join(' ').trim()
        let label
        if (name && a.email) label = `${name} (${a.email})`
        else label = name || a.email || a.uuid
        return { uuid: a.uuid, label }
      }),
    [auditorsQuery.data],
  )

  const apiRoleNames = useMemo(
    () => (invitableRolesQuery.data ?? []).map((role) => role.name),
    [invitableRolesQuery.data],
  )

  const inviteRoleOptions = useMemo(() => {
    const fromApi =
      invitableRolesQuery.data?.map((role) => ({
        value: role.name,
        label: role.name,
      })) ?? []
    const options = fromApi.length > 0 ? fromApi : INVITABLE_ROLE_OPTIONS
    return invitableRoleOptionsForUser(user, matrix, options)
  }, [invitableRolesQuery.data, user, matrix])

  const roleFilterOptions = useMemo(
    () => roleFilterOptionsForUser(user, matrix, apiRoleNames),
    [user, matrix, apiRoleNames],
  )

  const rows = useMemo(
    () =>
      buildTableRows(usersQuery.data ?? [], invitationsQuery.data ?? []).filter((row) =>
        canViewUserInDirectory(user, row.roleName, matrix),
      ),
    [usersQuery.data, invitationsQuery.data, user, matrix],
  )

  const filterState = useMemo(
    () => ({ typeFilter, roleFilter, statusFilter, signupSourceFilter }),
    [typeFilter, roleFilter, statusFilter, signupSourceFilter],
  )

  const filteredRows = useMemo(() => {
    return rows.filter(
      (r) => rowMatchesFilters(r, filterState) && rowMatchesQuery(r, tableSearch),
    )
  }, [rows, filterState, tableSearch])

  const totalFiltered = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize) || 1)
  const effectivePage = Math.min(Math.max(1, page), totalPages)

  const paginatedRows = useMemo(() => {
    const start = (effectivePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, effectivePage, pageSize])

  function invalidatePeople() {
    queryClient.invalidateQueries({ queryKey: usersQueryKey })
    queryClient.invalidateQueries({ queryKey: invitationsQueryKey })
  }

  const inviteMutation = useMutation({
    mutationFn: () =>
      createInvitation({
        email: email.trim(),
        roleName,
      }),
    onSuccess: (response) => {
      setInviteErrors({})
      const data = response?.data
      notifySuccess(
        response?.message ||
          `Invitation sent to ${data?.email}. They will receive a signup link by email.`,
      )
      if (data?.signupUrl && import.meta.env.DEV) {
        console.info('[invite] signup URL', data.signupUrl)
      }
      setEmail('')
      setRoleName(inviteRoleOptions[0]?.value ?? INVITABLE_ROLE_OPTIONS[0].value)
      setInviteOpen(false)
      invalidatePeople()
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to send invitation')
      setInviteErrors({ ...fieldErrors, ...(message ? { root: message } : {}) })
    },
  })

  const resendMutation = useMutation({
    mutationFn: (/** @type {string} */ invitationUuid) => resendInvitation(invitationUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Invitation resent')
      invalidatePeople()
      const url = response?.data?.signupUrl
      if (url && import.meta.env.DEV) console.info('[invite] resent URL', url)
    },
    onError: (error) => {
      const { message } = handleApiError(error, 'Unable to resend invitation')
      notifyError(message || 'Unable to resend invitation')
    },
  })

  const cancelInviteMutation = useMutation({
    mutationFn: (/** @type {string} */ invitationUuid) => cancelInvitation(invitationUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Invitation cancelled')
    setCancelInviteTarget(null)
      invalidatePeople()
    },
    onError: (error) => {
      const { message } = handleApiError(error, 'Unable to cancel invitation')
      notifyError(message || 'Unable to cancel invitation')
    },
  })

  function openImpersonateUser(row) {
    if (row.kind !== 'user') return
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || 'User'
    setClassroomImpersonateTarget({
      uuid: row.uuid,
      email: row.email ?? '',
      name,
    })
  }

  const adminUpdateMutation = useMutation({
    mutationFn: (/** @type {{ uuid: string, payload: { firstName?: string, lastName?: string | null, isActive?: boolean } }} */ vars) =>
      adminUpdateUser(vars.uuid, vars.payload),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'User updated')
      setEditUser(null)
      setEditErrors({})
      invalidatePeople()
    },
    onError: (error) => {
      const { message, fieldErrors } = handleApiError(error, 'Unable to update user')
      setEditErrors({ ...fieldErrors, ...(message ? { root: message } : {}) })
      notifyError(message || 'Unable to update user')
    },
  })

  const auditorMutation = useMutation({
    mutationFn: (/** @type {{ uuid: string, auditorUuid: string | null }} */ vars) =>
      setUserAuditor(vars.uuid, vars.auditorUuid),
    onSuccess: (response) => {
      notifySuccess(response?.message ?? 'Auditor updated')
      setAuditorTarget(null)
      invalidatePeople()
    },
    onError: (error) => {
      const { message } = handleApiError(error, 'Unable to update auditor')
      notifyError(message || 'Unable to update auditor')
    },
  })

  function openAssignAuditor(row) {
    if (row.kind !== 'user' || row.roleName !== DATA_ENTRY_ROLE_NAME) return
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || 'User'
    setAuditorTarget({ uuid: row.uuid, name, auditorUuid: row.auditorUuid ?? null })
  }

  function handleInviteSubmit(e) {
    e.preventDefault()
    setInviteErrors({})
    if (!email.trim()) {
      setInviteErrors({ email: 'Email is required' })
      return
    }
    inviteMutation.mutate()
  }

  function closeInvite() {
    if (inviteMutation.isPending) return
    setInviteOpen(false)
    setInviteErrors({})
  }

  function openCancelInviteConfirm(row) {
    if (row.kind !== 'invite') return
    setCancelInviteTarget({ uuid: row.uuid, email: row.email ?? '' })
  }

  function closeCancelInviteConfirm() {
    if (cancelInviteMutation.isPending) return
    setCancelInviteTarget(null)
  }

  function openEditForUser(row) {
    if (row.kind !== 'user') return
    setEditErrors({})
    setEditUser({
      uuid: row.uuid,
      firstName: row.firstName ?? '',
      lastName: row.lastName ?? '',
      isActive: Boolean(row.isActive),
      roleName: row.roleName,
    })
  }

  function submitEdit(e) {
    e.preventDefault()
    if (!editUser) return
    setEditErrors({})
    const payload = {
      firstName: editUser.firstName.trim(),
      lastName: editUser.lastName.trim() || null,
    }
    if (!payload.firstName) {
      setEditErrors({ firstName: 'First name is required' })
      return
    }
    if (editUser.roleName !== SUPER_ADMIN_ROLE_NAME) {
      payload.isActive = editUser.isActive
    }
    adminUpdateMutation.mutate({ uuid: editUser.uuid, payload })
  }

  const loadingPeople = usersQuery.isLoading || invitationsQuery.isLoading
  const peopleError = usersQuery.isError
    ? usersQuery.error
    : invitationsQuery.isError
      ? invitationsQuery.error
      : null

  if (!hasHydrated || isBootstrapping) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  if (!canAccessUsersSection(user, matrix)) {
    return <Navigate to="/" replace />
  }

  const canImpersonateUsers = canImpersonateClassroomUser(user, matrix)
  const canGrantAccess = hasPermission(matrix, 'tests.subscribers', 'edit', user)

  function canGrantAccessToRow(row) {
    return (
      canGrantAccess &&
      row.kind === 'user' &&
      row.isActive &&
      row.email &&
      CLASSROOM_APP_ROLE_NAMES.includes(row.roleName ?? '')
    )
  }

  function openGrantAccess(row) {
    if (!canGrantAccessToRow(row)) return
    const name = [row.firstName, row.lastName].filter(Boolean).join(' ') || row.email || 'Student'
    setGrantAccessTarget({ email: row.email ?? '', name })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Users</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Manage members and pending invitations. Invite people by email; they complete signup via
            their link. Grant complimentary test series or question bank access to signed-up students
            from the row menu.
          </p>
        </div>
        <Button type="button" onClick={() => setInviteOpen(true)} className="shrink-0 gap-2">
          <UserPlus className="size-4" aria-hidden />
          Invite user
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">People</h2>
          <p className="text-sm text-muted-foreground">
            Registered accounts and outstanding invitations (same email only appears once).
          </p>
        </div>

        {loadingPeople ? (
          <div className="flex justify-center rounded-lg border border-border/80 py-16">
            <Loader2 className="size-8 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : peopleError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
            {peopleError?.message ?? 'Unable to load users.'}
          </p>
        ) : (
          <DataTable>
            <DataTableToolbar
              searchValue={tableSearch}
              onSearchChange={(value) => {
                setTableSearch(value)
                setPage(1)
              }}
              searchPlaceholder="Search name, email, role, or signup (e.g. classroom, invite)…"
            >
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Type</span>
                <select
                  className={dataTableSelectClass}
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by type"
                >
                  {TYPE_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Role</span>
                <select
                  className={cn(dataTableSelectClass, 'min-w-[8.5rem]')}
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by role"
                >
                  {roleFilterOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Status</span>
                <select
                  className={cn(dataTableSelectClass, 'min-w-[10.5rem]')}
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by status"
                >
                  {STATUS_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="whitespace-nowrap text-muted-foreground">Signup</span>
                <select
                  className={cn(dataTableSelectClass, 'min-w-[11rem] max-w-[14rem]')}
                  value={signupSourceFilter}
                  onChange={(e) => {
                    setSignupSourceFilter(e.target.value)
                    setPage(1)
                  }}
                  aria-label="Filter by signup source"
                >
                  {SIGNUP_SOURCE_FILTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </DataTableToolbar>
            <DataTableContent>
              <table className="w-full min-w-[1160px] caption-bottom text-left text-sm">
                <thead className="border-b border-border/80 bg-muted/40 [&_tr]:border-0">
                  <tr className="text-muted-foreground">
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Name</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Email</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Role</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Auditor</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Signup</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Account</th>
                    <th className="h-11 px-4 align-middle font-medium lg:px-6">Invitation</th>
                    <th className="h-11 w-24 px-2 align-middle text-right lg:px-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 [&_tr:last-child]:border-0">
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                        {rows.length === 0
                          ? 'No users or pending invitations yet.'
                          : 'No results match your search or filters.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedRows.map((row) => {
                      const displayName =
                        row.kind === 'user'
                          ? [row.firstName, row.lastName].filter(Boolean).join(' ')
                          : '—'
                      const resending =
                        resendMutation.isPending && resendMutation.variables === row.uuid
                      return (
                        <tr key={row.key} className="bg-background transition-colors hover:bg-muted/30">
                          <td className="px-4 py-3 align-middle font-medium text-foreground lg:px-6">
                            <div className="flex flex-col gap-0.5">
                              <span>{displayName || '—'}</span>
                              {row.kind === 'invite' ? (
                                <span className="text-xs font-normal text-muted-foreground">
                                  Pending signup
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground lg:px-6">
                            {row.email}
                          </td>
                          <td className="px-4 py-3 align-middle lg:px-6">{row.roleName ?? '—'}</td>
                          <td className="px-4 py-3 align-middle lg:px-6">
                            {row.kind === 'user' && row.roleName === DATA_ENTRY_ROLE_NAME ? (
                              row.auditor?.name ? (
                                <span className="text-sm">{row.auditor.name}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Unassigned</span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle lg:px-6">
                            <SignupSourceCell row={row} />
                          </td>
                          <td className="px-4 py-3 align-middle lg:px-6">
                            {row.kind === 'user' ? (
                              <span
                                className={cn(
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                                  row.isActive
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                {row.isActive ? 'Active' : 'Inactive'}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground lg:px-6">
                            {row.kind === 'user' ? (
                              <span className="text-xs">Registered</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={cn(
                                    'inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-medium',
                                    row.inviteExpired
                                      ? 'bg-amber-500/15 text-amber-800 dark:text-amber-400'
                                      : 'bg-sky-500/15 text-sky-800 dark:text-sky-400',
                                  )}
                                >
                                  {row.inviteExpired ? 'Invite expired' : 'Invite sent'}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {row.inviteExpired ? 'Expired on' : 'Valid until'}{' '}
                                  {formatShortDate(row.inviteExpiresAt)}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  Sent {formatShortDate(row.inviteSentAt)}
                                </span>
                              </div>
                            )}
                          </td>
                          <DataTableRowActions
                            rowId={row.key}
                            busy={resending}
                            disabled={
                              resending ||
                              cancelInviteMutation.isPending ||
                              adminUpdateMutation.isPending
                            }
                            leading={
                              canImpersonateUsers &&
                              row.kind === 'user' &&
                              row.isActive &&
                              row.roleName !== SUPER_ADMIN_ROLE_NAME &&
                              row.uuid !== user?.uuid ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="size-8 shrink-0"
                                  title="Open as this user"
                                  aria-label={`Open as ${displayName || row.email}`}
                                  onClick={() => openImpersonateUser(row)}
                                >
                                  <LogIn className="size-4" aria-hidden />
                                </Button>
                              ) : null
                            }
                            items={
                              row.kind === 'invite'
                                ? [
                                    {
                                      label: 'Resend invitation',
                                      onClick: () => resendMutation.mutate(row.uuid),
                                      disabled: resendMutation.isPending,
                                    },
                                    {
                                      label: 'Cancel invitation',
                                      destructive: true,
                                      onClick: () => openCancelInviteConfirm(row),
                                      disabled: cancelInviteMutation.isPending,
                                    },
                                  ]
                                : [
                                    ...(canGrantAccessToRow(row)
                                      ? [
                                          {
                                            label: 'Grant access',
                                            onClick: () => openGrantAccess(row),
                                          },
                                        ]
                                      : []),
                                    ...(canEditAuditors && row.roleName === DATA_ENTRY_ROLE_NAME
                                      ? [
                                          {
                                            label: row.auditorUuid
                                              ? 'Change auditor'
                                              : 'Assign auditor',
                                            onClick: () => openAssignAuditor(row),
                                          },
                                        ]
                                      : []),
                                    {
                                      label: 'Edit user',
                                      onClick: () => openEditForUser(row),
                                    },
                                  ]
                            }
                          />
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </DataTableContent>
            <DataTablePagination
              page={effectivePage}
              pageSize={pageSize}
              total={totalFiltered}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          </DataTable>
        )}
      </section>

      {inviteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={closeInvite}
        >
          <Card
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserPlus className="size-5" aria-hidden />
                  </div>
                  <CardTitle id="invite-user-title">Invite user</CardTitle>
                  <CardDescription>
                    Send an email with a secure link. The recipient&apos;s address is fixed and
                    pre-filled on the registration screen.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={closeInvite}
                  aria-label="Close"
                  disabled={inviteMutation.isPending}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteSubmit} className="space-y-4" noValidate>
                {inviteErrors.root ? (
                  <p
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {inviteErrors.root}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={Boolean(inviteErrors.email)}
                    disabled={inviteMutation.isPending}
                  />
                  {inviteErrors.email ? (
                    <p className="text-sm text-destructive">{inviteErrors.email}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    disabled={inviteMutation.isPending}
                  >
                    {inviteRoleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Students and instructors are directed to the Classroom app; admin staff use this
                    portal.
                  </p>
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeInvite}
                    disabled={inviteMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={inviteMutation.isPending}>
                    {inviteMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Send invitation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {editUser ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => !adminUpdateMutation.isPending && setEditUser(null)}
        >
          <Card
            className="relative z-10 max-h-[min(92vh,100dvh-2rem)] w-full max-w-lg overflow-y-auto overscroll-contain shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle id="edit-user-title">Edit user</CardTitle>
                  <CardDescription>Update name and account status for this member.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => !adminUpdateMutation.isPending && setEditUser(null)}
                  aria-label="Close"
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={submitEdit} className="space-y-4" noValidate>
                {editErrors.root ? (
                  <p
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                    role="alert"
                  >
                    {editErrors.root}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="edit-first">First name</Label>
                  <Input
                    id="edit-first"
                    value={editUser.firstName}
                    onChange={(e) => setEditUser((s) => (s ? { ...s, firstName: e.target.value } : s))}
                    aria-invalid={Boolean(editErrors.firstName)}
                    disabled={adminUpdateMutation.isPending}
                  />
                  {editErrors.firstName ? (
                    <p className="text-sm text-destructive">{editErrors.firstName}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-last">Last name</Label>
                  <Input
                    id="edit-last"
                    value={editUser.lastName}
                    onChange={(e) => setEditUser((s) => (s ? { ...s, lastName: e.target.value } : s))}
                    disabled={adminUpdateMutation.isPending}
                  />
                </div>
                {editUser.roleName === SUPER_ADMIN_ROLE_NAME ? (
                  <p className="text-xs text-muted-foreground">
                    Super Admin accounts cannot be deactivated from this screen.
                  </p>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-input"
                      checked={editUser.isActive}
                      onChange={(e) =>
                        setEditUser((s) => (s ? { ...s, isActive: e.target.checked } : s))
                      }
                      disabled={adminUpdateMutation.isPending}
                    />
                    Account active
                  </label>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditUser(null)}
                    disabled={adminUpdateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={adminUpdateMutation.isPending}>
                    {adminUpdateMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    Save
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <ClassroomImpersonateDialog
        target={classroomImpersonateTarget}
        onClose={() => setClassroomImpersonateTarget(null)}
      />

      <GrantAccessDialog
        open={Boolean(grantAccessTarget)}
        onOpenChange={(open) => {
          if (!open) setGrantAccessTarget(null)
        }}
        initialEmail={grantAccessTarget?.email ?? ''}
        lockEmail={Boolean(grantAccessTarget?.email)}
      />

      {auditorTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => !auditorMutation.isPending && setAuditorTarget(null)}
        >
          <Card
            className="relative z-10 w-full max-w-md overflow-y-auto shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-auditor-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle id="assign-auditor-title">Assign auditor</CardTitle>
                  <CardDescription>
                    Choose the admin who audits{' '}
                    <span className="font-medium text-foreground">{auditorTarget.name}</span>&apos;s
                    data-entry work.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setAuditorTarget(null)}
                  aria-label="Close"
                  disabled={auditorMutation.isPending}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  auditorMutation.mutate({
                    uuid: auditorTarget.uuid,
                    auditorUuid: auditorTarget.auditorUuid || null,
                  })
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="assign-auditor-select">Auditor</Label>
                  <select
                    id="assign-auditor-select"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={auditorTarget.auditorUuid ?? ''}
                    onChange={(e) =>
                      setAuditorTarget((s) =>
                        s ? { ...s, auditorUuid: e.target.value || null } : s,
                      )
                    }
                    disabled={auditorMutation.isPending || auditorsQuery.isLoading}
                  >
                    <option value="">Unassigned</option>
                    {auditorOptions.map((opt) => (
                      <option key={opt.uuid} value={opt.uuid}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {auditorsQuery.isLoading ? (
                    <p className="text-xs text-muted-foreground">Loading auditors…</p>
                  ) : null}
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setAuditorTarget(null)}
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
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {cancelInviteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={closeCancelInviteConfirm}
        >
          <Card
            className="relative z-10 max-h-[min(92vh,100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-invite-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle id="cancel-invite-title">Cancel invitation?</CardTitle>
                  <CardDescription>
                    The signup link for{' '}
                    <span className="font-medium text-foreground">{cancelInviteTarget.email}</span>{' '}
                    will stop working.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={closeCancelInviteConfirm}
                  aria-label="Close"
                  disabled={cancelInviteMutation.isPending}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCancelInviteConfirm}
                  disabled={cancelInviteMutation.isPending}
                >
                  Keep invitation
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => cancelInviteMutation.mutate(cancelInviteTarget.uuid)}
                  disabled={cancelInviteMutation.isPending}
                >
                  {cancelInviteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  Cancel invitation
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
