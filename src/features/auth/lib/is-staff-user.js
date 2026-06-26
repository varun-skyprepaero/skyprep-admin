/** Must match skyprep-classroom-backend ADMIN_PORTAL_ROLE_NAMES. */
export const ADMIN_PORTAL_ROLE_NAMES = [
  'Super Admin',
  'Admin',
  'Data Entry',
  'Psychologist',
]

/**
 * @param {{ role?: { name?: string } | null, userRole?: { name?: string } | null } | null | undefined} user
 */
export function isAdminPortalUser(user) {
  const name = user?.role?.name ?? user?.userRole?.name
  return Boolean(name && ADMIN_PORTAL_ROLE_NAMES.includes(name))
}

/** @deprecated Use {@link isAdminPortalUser}. */
export function isStaffUser(user) {
  return isAdminPortalUser(user)
}
