/** Must match skyprep-classroom-backend `USER_ROLES.STUDENT`. */
const STUDENT_ROLE_NAME = 'Student'

/**
 * @param {{ role?: { name?: string } | null, userRole?: { name?: string } | null } | null | undefined} user
 */
export function isStaffUser(user) {
  const name = user?.role?.name ?? user?.userRole?.name
  return Boolean(name && name !== STUDENT_ROLE_NAME)
}
