import { PERMISSIONS_ENDPOINTS } from '@/features/roles-permissions/api/permissions-api.constants'
import { apiClient } from '@/lib/http/api-client'

/** @param {import('axios').AxiosResponse} res */
function unwrap(res) {
  const body = res.data
  if (!body?.success) {
    const err = new Error(typeof body?.message === 'string' ? body.message : 'Request failed')
    err.response = { data: body }
    throw err
  }
  return body.data
}

/** @returns {Promise<import('./permissions-api.types').MyPermissionsResponse>} */
export async function fetchMyPermissions() {
  const res = await apiClient.get(PERMISSIONS_ENDPOINTS.me)
  return unwrap(res)
}

/** @returns {Promise<import('./permissions-api.types').RolePermissionsListResponse>} */
export async function fetchRolePermissions() {
  const res = await apiClient.get(PERMISSIONS_ENDPOINTS.list)
  return unwrap(res)
}

/**
 * @param {string} roleUuid
 * @param {Record<string, Record<string, boolean>>} permissions
 */
export async function updateRolePermissions(roleUuid, permissions) {
  const res = await apiClient.put(PERMISSIONS_ENDPOINTS.updateRole(roleUuid), { permissions })
  return unwrap(res)
}

/** @returns {Promise<import('./permissions-api.types').InvitableRolesResponse>} */
export async function fetchInvitableRoles() {
  const res = await apiClient.get(PERMISSIONS_ENDPOINTS.invitableRoles)
  return unwrap(res)
}

/**
 * @param {{ name: string, portalType: 'ADMIN_PORTAL' | 'CLASSROOM_APP' }} payload
 */
export async function createRole(payload) {
  const res = await apiClient.post(PERMISSIONS_ENDPOINTS.createRole, payload)
  return unwrap(res)
}

/** @param {string} roleUuid */
export async function deleteRole(roleUuid) {
  const res = await apiClient.delete(PERMISSIONS_ENDPOINTS.deleteRole(roleUuid))
  return unwrap(res)
}
