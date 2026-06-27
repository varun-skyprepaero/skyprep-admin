/** Must match skyprep-classroom-backend ADMIN_PORTAL_ROLE_NAMES (legacy fallback). */
export const ADMIN_PORTAL_ROLE_NAMES = [
  'Super Admin',
  'Admin',
  'Data Entry',
  'Psychologist',
]

/**
 * @param {{ role?: { name?: string, portalType?: string } | null, userRole?: { name?: string, portalType?: string } | null } | null | undefined} user
 */
export function isAdminPortalUser(user) {
  const role = user?.role ?? user?.userRole ?? null
  if (!role) return false
  if (role.portalType) {
    return role.portalType === 'ADMIN_PORTAL'
  }
  return Boolean(role.name && ADMIN_PORTAL_ROLE_NAMES.includes(role.name))
}

/** @deprecated Use {@link isAdminPortalUser}. */
export function isStaffUser(user) {
  return isAdminPortalUser(user)
}
