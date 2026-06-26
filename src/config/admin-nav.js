import {
  BookOpen,
  Calendar,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  UserCog,
  Users,
} from 'lucide-react'

import {
  TESTS_SECTION_ROLE_NAMES,
  USERS_SECTION_ROLE_NAMES,
} from '@/features/invitations/constants'

export const adminNav = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  {
    name: 'Users',
    href: '/users',
    icon: Users,
    roles: USERS_SECTION_ROLE_NAMES,
  },
  {
    name: 'Tests',
    href: '/tests',
    icon: ClipboardList,
    roles: TESTS_SECTION_ROLE_NAMES,
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
  const item = adminNav.find(
    (nav) => !nav.disabled && nav.href !== '/' && pathname.startsWith(nav.href),
  )
  return item?.name ?? 'Admin'
}
