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
 * Soft-deleted accounts (still block signup / role deletion until permanently removed).
 * @returns {Promise<Array<import('./users-api.types').AdminUserRow>>}
 */
export async function fetchDeletedUsers() {
  try {
    const { data } = await apiClient.get(USER_ENDPOINTS.deleted)
    return Array.isArray(data?.data) ? data.data : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} userUuid
 * @param {{ firstName?: string, lastName?: string | null, isActive?: boolean, storageQuotaBytes?: number }} payload
 */
export async function adminUpdateUser(userUuid, payload) {
  try {
    const { data } = await apiClient.patch(USER_ENDPOINTS.adminUpdate(userUuid), payload)
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Soft-delete a user from the admin directory.
 * @param {string} userUuid
 */
export async function adminDeleteUser(userUuid) {
  try {
    const { data } = await apiClient.delete(USER_ENDPOINTS.adminDelete(userUuid))
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Permanently erase a soft-deleted user (frees email and role FK).
 * @param {string} userUuid
 */
export async function permanentlyDeleteUser(userUuid) {
  try {
    const { data } = await apiClient.delete(USER_ENDPOINTS.permanentDelete(userUuid))
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Staff eligible to audit data-entry work (Admins and Super Admins).
 * @returns {Promise<Array<import('./users-api.types').AdminUserRow>>}
 */
export async function fetchAuditors() {
  try {
    const { data } = await apiClient.get(USER_ENDPOINTS.auditors)
    return Array.isArray(data?.data) ? data.data : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Assign auditors for a data-entry user (empty array clears all).
 * @param {string} userUuid
 * @param {string[]} auditorUuids
 */
export async function setUserAuditor(userUuid, auditorUuids) {
  try {
    const uuids = Array.isArray(auditorUuids)
      ? auditorUuids
      : auditorUuids
        ? [auditorUuids]
        : []
    const { data } = await apiClient.patch(USER_ENDPOINTS.setAuditor(userUuid), {
      auditorUuids: uuids,
    })
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} userUuid
 * @returns {Promise<import('./users-api.types').AdminUserInsights>}
 */
export async function fetchAdminUserInsights(userUuid) {
  try {
    const { data } = await apiClient.get(USER_ENDPOINTS.adminInsights(userUuid))
    return data?.data ?? {
      storage: { usedBytes: 0, quotaBytes: 0, remainingBytes: 0, percentUsed: 0 },
      counts: {
        trainingEnrollments: { total: 0 },
        purchaseOrders: { total: 0 },
      },
    }
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} userUuid
 * @returns {Promise<{ signInUrl: string, classroomUrl: string, targetApp?: 'classroom' | 'admin', targetEmail?: string }>}
 */
export async function createClassroomImpersonateLink(userUuid) {
  try {
    const { data } = await apiClient.post(USER_ENDPOINTS.classroomImpersonate(userUuid))
    const payload = data?.data
    const signInUrl = payload?.signInUrl ?? payload?.classroomUrl
    if (!signInUrl) {
      throw new Error('Could not create sign-in link')
    }
    return { ...payload, signInUrl, classroomUrl: signInUrl }
  } catch (error) {
    throw toApiClientError(error)
  }
}
