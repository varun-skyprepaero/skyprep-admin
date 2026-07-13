import { Navigate } from 'react-router-dom'
import {
  canViewTrainingProgramScreen,
} from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'

export default function TrainingProgramsIndexRedirect() {
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)

  if (
    canViewTrainingProgramScreen(user, matrix, 'training_programs') ||
    canViewTrainingProgramScreen(user, matrix, 'focus_one')
  ) {
    return <Navigate to="catalog" replace />
  }
  if (canViewTrainingProgramScreen(user, matrix, 'focus_one')) {
    return <Navigate to="focus-one" replace />
  }
  return <Navigate to="/" replace />
}
