/** Must match skyprep-classroom-backend INVITABLE_ROLE_NAMES (no Super Admin). */
export const INVITABLE_ROLE_OPTIONS = [
  { value: 'Admin', label: 'Admin' },
  { value: 'Instructor', label: 'Instructor' },
  { value: 'Psychologist', label: 'Psychologist' },
  { value: 'Student', label: 'Student' },
  { value: 'Data Entry', label: 'Data Entry' },
]

export const SUPER_ADMIN_ROLE_NAME = 'Super Admin'
