import {
  Brain,
  BookOpen,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Coins,
  FileText,
  GraduationCap,
  HelpCircle,
  KeyRound,
  Layers,
  LayoutDashboard,
  Package,
  UserCog,
  Users,
} from 'lucide-react'

import {
  canAccessExamsSection,
  canAccessReviewSection,
  canAccessRolesPermissionsSection,
  canAccessSubscriptionSection,
  canAccessTestsSection,
  canAccessTrainingProgramsSection,
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
    name: 'Quizzes',
    href: '/quizzes',
    icon: Brain,
    canAccess: canAccessTestsSection,
  },
  {
    name: 'Exams',
    href: '/exams',
    icon: GraduationCap,
    canAccess: canAccessExamsSection,
  },
  {
    name: 'Review',
    href: '/review',
    icon: ClipboardCheck,
    canAccess: canAccessReviewSection,
  },
  {
    name: 'Subscriptions',
    href: '/subscription',
    icon: Package,
    canAccess: canAccessSubscriptionSection,
  },
  { name: 'Credits', href: '/credits', icon: Coins, disabled: true },
  {
    name: 'Roles & permissions',
    href: '/roles-permissions',
    icon: KeyRound,
    canAccess: canAccessRolesPermissionsSection,
  },
  { name: 'Calendar', href: '/calendar', icon: Calendar, disabled: true },
  {
    name: 'Programs',
    href: '/programs',
    icon: Layers,
    canAccess: canAccessTrainingProgramsSection,
  },
  { name: 'Teachers', href: '/teachers', icon: UserCog, disabled: true },
  { name: 'Subjects', href: '/subjects', icon: BookOpen, disabled: true },
  { name: 'Chapters', href: '/chapters', icon: FileText, disabled: true },
  { name: 'Questions', href: '/questions', icon: HelpCircle, disabled: true },
]

export function getAdminNavTitle(pathname) {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/users')) return 'Users'
  if (pathname.startsWith('/quizzes')) return 'Quizzes'
  if (pathname.startsWith('/exams')) return 'Exams'
  if (pathname.startsWith('/tests')) return 'Tests'
  if (pathname.startsWith('/review')) return 'Review'
  if (pathname.startsWith('/subscription')) return 'Subscriptions'
  if (pathname.startsWith('/credits')) return 'Credits'
  if (pathname.startsWith('/roles-permissions')) return 'Roles & permissions'
  if (pathname.startsWith('/programs')) return 'Programs'
  if (pathname.startsWith('/focus-one')) return 'Programs'
  const item = adminNav.find(
    (nav) => !nav.disabled && nav.href !== '/' && pathname.startsWith(nav.href),
  )
  return item?.name ?? 'Admin'
}
