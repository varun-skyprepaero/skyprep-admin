/** Must match skyprep-classroom-backend INVITABLE_ROLE_NAMES (no Super Admin). */
export const INVITABLE_ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Instructor', label: 'Instructor' },
  { value: 'Psychologist', label: 'Psychologist' },
  { value: 'Student', label: 'Student' },
  { value: 'Data Entry', label: 'Data Entry' },
]

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin'

export const DATA_ENTRY_ROLE_NAME = 'Data Entry'

/** Must match skyprep-classroom-backend CLASSROOM_APP_ROLE_NAMES. */
export const CLASSROOM_APP_ROLE_NAMES = ['Student', 'Instructor']

/** Must match skyprep-classroom-backend ADMIN_PORTAL_ROLE_NAMES (excl. Super Admin for invites). */
export const ADMIN_PORTAL_INVITE_ROLE_NAMES = ['Admin', 'Data Entry', 'Psychologist']

/** Must match skyprep-classroom-backend USERS_MANAGEMENT_ROLE_NAMES. */
export const USERS_SECTION_ROLE_NAMES = ['Super Admin', 'Admin', 'Data Entry']

/** Must match skyprep-classroom-backend TESTS_MANAGEMENT_ROLE_NAMES. */
export const TESTS_SECTION_ROLE_NAMES = ['Super Admin', 'Admin', 'Data Entry']
