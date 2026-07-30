import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPendingInvitations } from '@/features/invitations/api/invitations-api'
import { fetchUsers } from '@/features/users/api/users-api'
import { invitationsQueryKey, usersQueryKey } from '@/features/users/constants/query-keys'
import {
  canAccessUsersSection,
  canViewUserInDirectory,
} from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'

/**
 * @param {string | undefined} uuid
 */
export function useAdminUser(uuid) {
  const actor = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const enabled = Boolean(uuid) && canAccessUsersSection(actor, matrix)

  const query = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers,
    enabled,
  })

  const user = useMemo(
    () => (query.data ?? []).find((entry) => entry.uuid === uuid) ?? null,
    [query.data, uuid],
  )

  const roleName = user?.role?.name ?? null
  const canView = user ? canViewUserInDirectory(actor, roleName, matrix) : false

  return {
    user: canView ? user : null,
    roleName,
    canView,
    ...query,
  }
}

/**
 * @param {string | undefined} uuid
 */
export function useAdminInvitation(uuid) {
  const actor = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const enabled = Boolean(uuid) && canAccessUsersSection(actor, matrix)

  const query = useQuery({
    queryKey: invitationsQueryKey,
    queryFn: fetchPendingInvitations,
    enabled,
  })

  const invitation = useMemo(
    () => (query.data ?? []).find((entry) => entry.uuid === uuid) ?? null,
    [query.data, uuid],
  )

  return { invitation, ...query }
}
