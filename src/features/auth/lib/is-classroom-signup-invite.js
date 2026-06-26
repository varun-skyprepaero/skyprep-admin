import { CLASSROOM_APP_ROLE_NAMES } from '@/features/invitations/constants'

/**
 * Invites for students/instructors must complete signup in the classroom app.
 * @param {{ signupApp?: string, roleName?: string | null } | null | undefined} meta
 */
export function isClassroomSignupInvite(meta) {
  if (!meta) return false
  if (meta.signupApp === 'classroom') return true
  return Boolean(meta.roleName && CLASSROOM_APP_ROLE_NAMES.includes(meta.roleName))
}

/**
 * @param {string} classroomAppUrl
 * @param {string} inviteToken
 */
export function classroomInviteSignupUrl(classroomAppUrl, inviteToken) {
  const base = classroomAppUrl.replace(/\/$/, '')
  return `${base}/register?invite=${encodeURIComponent(inviteToken)}`
}
