/** Classroom UserRole.name values with admin access */
const ADMIN_ROLE_NAMES = new Set(['Super Admin', 'Admin'])

/**
 * @param {{ role?: { name?: string } | null } | null | undefined} user
 */
export function isAdminUser(user) {
  const roleName = user?.role?.name
  return Boolean(roleName && ADMIN_ROLE_NAMES.has(roleName))
}
