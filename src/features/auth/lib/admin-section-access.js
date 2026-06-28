import {
  DATA_ENTRY_ROLE_NAME,
  INVITABLE_ROLE_OPTIONS,
  SUPER_ADMIN_ROLE_NAME,
} from '@/features/invitations/constants'

/**
 * @param {{ role?: { name?: string } | null, userRole?: { name?: string } | null } | null | undefined} user
 */
function roleName(user) {
  return user?.role?.name ?? user?.userRole?.name ?? null
}

/**
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 * @param {string} screenId
 * @param {import('@/features/roles-permissions/constants').PermissionAction} action
 */
export function hasPermission(matrix, screenId, action, user) {
  if (user && isSuperAdmin(user)) return true
  if (!matrix) return false
  return Boolean(matrix[screenId]?.[action])
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
export function isSuperAdmin(user) {
  return hasAdminPortalRole(user, [SUPER_ADMIN_ROLE_NAME])
}

/** @param {Parameters<typeof hasAdminPortalRole>[0]} user */
export function isDataEntryUser(user) {
  return hasAdminPortalRole(user, [DATA_ENTRY_ROLE_NAME])
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canAccessUsersSection(user, matrix) {
  if (isSuperAdmin(user)) return true
  return (
    hasPermission(matrix, 'users.directory', 'view', user) ||
    hasPermission(matrix, 'users.invitations', 'view', user)
  )
}

const TEST_SECTION_SCREENS = [
  'tests.boards',
  'tests.subjects',
  'tests.books',
  'tests.lessons',
  'tests.questions',
  'tests.suites',
  'tests.packages',
]

const EXAMS_SECTION_SCREENS = ['tests.exams']

const SUBSCRIPTION_SECTION_SCREENS = [
  'tests.subscription_plans',
  'tests.subscribers',
  'tests.purchases',
]

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canAccessTestsSection(user, matrix) {
  if (isSuperAdmin(user)) return true
  return TEST_SECTION_SCREENS.some((screenId) => hasPermission(matrix, screenId, 'view', user))
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canAccessExamsSection(user, matrix) {
  if (isSuperAdmin(user)) return true
  return EXAMS_SECTION_SCREENS.some((screenId) => hasPermission(matrix, screenId, 'view', user))
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canAccessSubscriptionSection(user, matrix) {
  if (isSuperAdmin(user)) return true
  return SUBSCRIPTION_SECTION_SCREENS.some((screenId) => hasPermission(matrix, screenId, 'view', user))
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canAccessRolesPermissionsSection(user, matrix) {
  return hasPermission(matrix, 'roles.permissions', 'view', user)
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} viewer
 * @param {string | null | undefined} targetRoleName
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canViewUserInDirectory(viewer, targetRoleName, matrix) {
  if (isSuperAdmin(viewer)) return true
  if (targetRoleName === DATA_ENTRY_ROLE_NAME) {
    return hasPermission(matrix, 'users.data_entry_peers', 'view', viewer)
  }
  return true
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function canImpersonateClassroomUser(user, matrix) {
  return hasPermission(matrix, 'users.impersonation', 'impersonate', user)
}

/**
 * @param {Parameters<typeof hasAdminPortalRole>[0]} user
 * @param {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix | null | undefined} matrix
 */
export function invitableRoleOptionsForUser(
  user,
  matrix,
  roleOptions = INVITABLE_ROLE_OPTIONS,
) {
  if (isSuperAdmin(user)) return roleOptions
  if (!hasPermission(matrix, 'users.data_entry_peers', 'view', user)) {
    return roleOptions.filter((opt) => opt.value !== DATA_ENTRY_ROLE_NAME)
  }
  return roleOptions
}

/** @param {string} screenId */
export function canViewExamScreen(user, matrix, screenId) {
  return hasPermission(matrix, screenId, 'view', user)
}

/** @param {string} screenId */
export function canViewTestScreen(user, matrix, screenId) {
  return hasPermission(matrix, screenId, 'view', user)
}

/** @param {string} screenId */
export function canViewSubscriptionScreen(user, matrix, screenId) {
  return hasPermission(matrix, screenId, 'view', user)
}
