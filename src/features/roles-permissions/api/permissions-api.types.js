/** @typedef {import('@/features/roles-permissions/constants').PermissionAction} PermissionAction */

/**
 * @typedef {Record<string, Partial<Record<PermissionAction, boolean>>>} PermissionMatrix
 */

/**
 * @typedef {{
 *   roleName: string,
 *   permissions: PermissionMatrix,
 * }} MyPermissionsResponse
 */

/**
 * @typedef {{
 *   uuid: string,
 *   name: string,
 *   configurable: boolean,
 *   permissions: PermissionMatrix,
 * }} ConfigurableRolePermissions
 */

/**
 * @typedef {{
 *   roles: ConfigurableRolePermissions[],
 *   classroomRoles?: Array<{ uuid: string, name: string, isSystem: boolean }>,
 *   superAdmin: {
 *     name: string,
 *     configurable: boolean,
 *     permissions: PermissionMatrix,
 *   },
 * }} RolePermissionsListResponse
 */

/**
 * @typedef {{
 *   roles: Array<{ uuid: string, name: string, portalType: string, isSystem: boolean }>,
 * }} InvitableRolesResponse
 */

export {}
