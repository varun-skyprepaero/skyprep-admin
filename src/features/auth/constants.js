export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  registerInvite: '/auth/register/invite',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  session: '/auth/session',
}

export const INVITATION_ENDPOINTS = {
  preview: '/invitations/preview',
  list: '/invitations',
  create: '/invitations',
  resend: (uuid) => `/invitations/${uuid}/resend`,
  cancel: (uuid) => `/invitations/${uuid}`,
}

export const USER_ENDPOINTS = {
  list: '/users',
  profile: (uuid) => `/users/${uuid}`,
  adminUpdate: (uuid) => `/users/${uuid}/admin`,
  classroomImpersonate: (uuid) => `/users/${uuid}/classroom-impersonate`,
}
