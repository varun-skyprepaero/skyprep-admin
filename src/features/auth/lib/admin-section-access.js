import {
  DATA_ENTRY_ROLE_NAME,
  INVITABLE_ROLE_OPTIONS,
  SUPER_ADMIN_ROLE_NAME,
  TESTS_SECTION_ROLE_NAMES,
  USERS_SECTION_ROLE_NAMES,
} from '@/features/invitations/constants'

/**
 * @param {{ role?: { name?: string } | null, userRole?: { name?: string } | null } | null | undefined} user
 */
function roleName(user) {
  return user?.role?.name ?? user?.userRole?.name ?? null
}

/**
 * @param {{ role?: { name?: string } | null, userRole?: { name?: string } | null } | null | undefined} user
 * @param {readonly string[]} allowedRoles
 */
export function hasAdminPortalRole(user, allowedRoles) {
  const name = roleName(user)
  return Boolean(name && allowedRoles.includes(name))
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function canAccessUsersSection(user) {
  return hasAdminPortalRole(user, USERS_SECTION_ROLE_NAMES)
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function canAccessTestsSection(user) {
  return hasAdminPortalRole(user, TESTS_SECTION_ROLE_NAMES)
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function isSuperAdmin(user) {
  return hasAdminPortalRole(user, [SUPER_ADMIN_ROLE_NAME])
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function isDataEntryUser(user) {
  return hasAdminPortalRole(user, [DATA_ENTRY_ROLE_NAME])
}

/**
 * Data Entry must not see or manage other Data Entry accounts in the Users directory.
 * @param {Parameters<typeof hasAdminPortalRole>[0]} viewer
 * @param {string | null | undefined} targetRoleName
 */
export function canViewUserInDirectory(viewer, targetRoleName) {
  if (isDataEntryUser(viewer) && targetRoleName === DATA_ENTRY_ROLE_NAME) {
    return false
  }
  return true
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function invitableRoleOptionsForUser(user) {
  if (isDataEntryUser(user)) {
    return INVITABLE_ROLE_OPTIONS.filter((opt) => opt.value !== DATA_ENTRY_ROLE_NAME)
  }
  return INVITABLE_ROLE_OPTIONS
}
