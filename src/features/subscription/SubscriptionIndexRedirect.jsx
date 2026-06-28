import { Navigate } from 'react-router-dom'
import { canViewSubscriptionScreen } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'

const ORDER = ['tests.subscription_plans', 'tests.subscribers', 'tests.purchases']

const ROUTES = {
  'tests.subscription_plans': 'plans',
  'tests.subscribers': 'subscribers',
  'tests.purchases': 'purchases',
}

export default function SubscriptionIndexRedirect() {
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const first = ORDER.find((screen) => canViewSubscriptionScreen(user, matrix, screen))
  const to = first ? ROUTES[first] : '/'
  return <Navigate to={to} replace />
}
