import { useParams } from 'react-router-dom'
import UserDetailPage from '@/features/users/pages/UserDetailPage'

export default function UserDetailRoute() {
  const { uuid } = useParams()
  return <UserDetailPage userUuid={uuid} />
}
