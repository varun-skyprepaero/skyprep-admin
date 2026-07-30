import { USER_ENDPOINTS } from '@/features/auth/constants'

export const usersQueryKey = ['admin', 'users', USER_ENDPOINTS.list]
export const deletedUsersQueryKey = ['admin', 'users', USER_ENDPOINTS.deleted]
export const invitationsQueryKey = ['admin', 'invitations', 'pending']
export const auditorsQueryKey = ['admin', 'auditors']
export const invitableRolesQueryKey = ['admin', 'invitable-roles']

/** @param {string} userUuid */
export function userInsightsQueryKey(userUuid) {
  return ['admin', 'user-insights', userUuid]
}
