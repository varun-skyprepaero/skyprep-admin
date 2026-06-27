import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  UserCog,
  Users,
} from 'lucide-react'

import {
  canAccessRolesPermissionsSection,
  canAccessTestsSection,
  canAccessUsersSection,
} from '@/features/auth/lib/admin-section-access'

export const adminNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    canAccess: canAccessUsersSection,
  },
  {
    name: 'Tests',
    href: '/tests',
    icon: ClipboardList,
    canAccess: canAccessTestsSection,
  },
  {
    name: 'Roles & permissions',
    href: '/roles-permissions',
    icon: KeyRound,
    canAccess: canAccessRolesPermissionsSection,
  },
  { name: 'Calendar', href: '/calendar', icon: Calendar, disabled: true },
  { name: 'Focus One', href: '/focus-one', icon: Users, disabled: true },
  { name: 'Teachers', href: '/teachers', icon: UserCog, disabled: true },
  { name: 'Subjects', href: '/subjects', icon: BookOpen, disabled: true },
  { name: 'Chapters', href: '/chapters', icon: FileText, disabled: true },
  { name: 'Questions', href: '/questions', icon: HelpCircle, disabled: true },
]

export function getAdminNavTitle(pathname) {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/users')) return 'Users'
  if (pathname.startsWith('/tests')) return 'Tests'
  if (pathname.startsWith('/roles-permissions')) return 'Roles & permissions'
  const item = adminNav.find(
    (nav) => !nav.disabled && nav.href !== '/' && pathname.startsWith(nav.href),
  )
  return item?.name ?? 'Admin'
}
