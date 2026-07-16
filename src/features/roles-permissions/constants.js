import { SUPER_ADMIN_ROLE_NAME } from '@/features/invitations/constants'

/** Admin portal roles whose access can be configured (Super Admin is read-only). */
export const CONFIGURABLE_ADMIN_ROLES = [
  { id: 'admin', name: 'Admin' },
  { id: 'data-entry', name: 'Data Entry' },
  { id: 'psychologist', name: 'Psychologist' },
]

export const SUPER_ADMIN_ROLE = {
  id: 'super-admin',
  name: SUPER_ADMIN_ROLE_NAME,
}

/** @typedef {'view' | 'create' | 'edit' | 'delete' | 'invite' | 'impersonate'} PermissionAction */

/** @typedef {{ id: string, label: string, description?: string, actions: PermissionAction[] }} PermissionScreen */

/** @typedef {{ id: string, label: string, description?: string, screens: PermissionScreen[] }} PermissionSection */

/** @type {PermissionSection[]} */
export const ADMIN_PERMISSION_SECTIONS = [
  {
    id: 'general',
    label: 'General',
    screens: [{ id: 'dashboard', label: 'Dashboard', actions: ['view'] }],
  },
  {
    id: 'users',
    label: 'Users',
    screens: [
      { id: 'users.directory', label: 'User directory', actions: ['view', 'edit', 'delete'] },
      { id: 'users.invitations', label: 'Invitations', actions: ['view', 'invite'] },
      {
        id: 'users.impersonation',
        label: 'Impersonate users',
        actions: ['view', 'impersonate'],
      },
      {
        id: 'users.data_entry_peers',
        label: 'Data Entry accounts',
        actions: ['view', 'edit'],
      },
    ],
  },
  {
    id: 'tests',
    label: 'Tests',
    screens: [
      { id: 'tests.boards', label: 'Boards', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.subjects', label: 'Subjects', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.books', label: 'Books', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.lessons', label: 'Lessons', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.questions', label: 'Questions', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.suites', label: 'Licenses', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.exams', label: 'Exams', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'tests.packages', label: 'Test series', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  {
    id: 'review',
    label: 'Data-entry review',
    screens: [
      {
        id: 'review.queue',
        label: 'Review queue',
        description: 'Audit data-entry work and flag items for correction.',
        actions: ['view', 'edit'],
      },
    ],
  },
  {
    id: 'subscription',
    label: 'Subscriptions',
    screens: [
      {
        id: 'tests.subscription_plans',
        label: 'Subscription plans',
        actions: ['view', 'create', 'edit', 'delete'],
      },
      { id: 'tests.subscribers', label: 'Subscribers', actions: ['view', 'edit'] },
      { id: 'tests.purchases', label: 'One-time purchases', actions: ['view'] },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    screens: [
      {
        id: 'training_programs',
        label: 'Programs catalog',
        actions: ['view', 'create', 'edit', 'delete'],
      },
      { id: 'focus_one', label: 'Focus One', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
  {
    id: 'access_control',
    label: 'Access control',
    screens: [
      {
        id: 'roles.permissions',
        label: 'Roles & permissions',
        actions: ['view', 'edit', 'create', 'delete'],
      },
    ],
  },
  {
    id: 'upcoming',
    label: 'Planned modules',
    screens: [
      { id: 'calendar', label: 'Calendar', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'teachers', label: 'Teachers', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'subjects_legacy', label: 'Subjects (legacy)', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'chapters', label: 'Chapters', actions: ['view', 'create', 'edit', 'delete'] },
      { id: 'questions_legacy', label: 'Questions (legacy)', actions: ['view', 'create', 'edit', 'delete'] },
    ],
  },
]

/** Sections shown in the permissions UI (excludes planned modules). */
export const UI_PERMISSION_SECTIONS = ADMIN_PERMISSION_SECTIONS.filter(
  (section) => section.id !== 'upcoming',
)

/** @type {Record<PermissionAction, string>} */
export const PERMISSION_ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  invite: 'Invite',
  impersonate: 'Impersonate',
}

/** Full access matrix for Super Admin preview. */
export function createFullAccessPermissions() {
  const allScreens = ADMIN_PERMISSION_SECTIONS.flatMap((s) => s.screens)
  return Object.fromEntries(
    allScreens.map((screen) => [
      screen.id,
      Object.fromEntries(screen.actions.map((action) => [action, true])),
    ]),
  )
}
