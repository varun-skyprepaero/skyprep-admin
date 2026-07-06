import { INVITATION_ENDPOINTS } from '@/features/auth/constants'
import { apiClient } from '@/lib/http/api-client'
import { toApiClientError } from '@/lib/http/api-error'

/**
 * @param {{ email: string, roleName: string }} payload
 */
export async function createInvitation(payload) {
  try {
    const { data } = await apiClient.post(INVITATION_ENDPOINTS.create, {
      ...payload,
      email: payload.email.trim().toLowerCase(),
    })
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @returns {Promise<Array<{ uuid: string, email: string, roleName: string | null, expiresAt: string | null, createdAt: string | null, expired: boolean, status: string }>>}
 */
export async function fetchPendingInvitations() {
  try {
    const { data } = await apiClient.get(INVITATION_ENDPOINTS.list)
    return Array.isArray(data?.data) ? data.data : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} invitationUuid
 */
export async function resendInvitation(invitationUuid) {
  try {
    const { data } = await apiClient.post(INVITATION_ENDPOINTS.resend(invitationUuid))
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} invitationUuid
 */
export async function cancelInvitation(invitationUuid) {
  try {
    const { data } = await apiClient.delete(INVITATION_ENDPOINTS.cancel(invitationUuid))
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}
