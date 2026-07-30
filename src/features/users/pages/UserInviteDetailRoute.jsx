import { useParams } from 'react-router-dom'
import UserInviteDetailPage from '@/features/users/pages/UserInviteDetailPage'

export default function UserInviteDetailRoute() {
  const { inviteUuid } = useParams()
  return <UserInviteDetailPage inviteUuid={inviteUuid} />
}
