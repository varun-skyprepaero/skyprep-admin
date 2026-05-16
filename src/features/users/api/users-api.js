import { USER_ENDPOINTS } from '@/features/auth/constants'
import { apiClient } from '@/lib/http/api-client'
import { toApiClientError } from '@/lib/http/api-error'

/**
 * @returns {Promise<Array<import('./users-api.types').AdminUserRow>>}
 */
export async function fetchUsers() {
  try {
    const { data } = await apiClient.get(USER_ENDPOINTS.list)
    return Array.isArray(data?.data) ? data.data : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} userUuid
 * @param {{ firstName?: string, lastName?: string | null, isActive?: boolean }} payload
 */
export async function adminUpdateUser(userUuid, payload) {
  try {
    const { data } = await apiClient.patch(USER_ENDPOINTS.adminUpdate(userUuid), payload)
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}
