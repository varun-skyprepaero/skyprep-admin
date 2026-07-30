export const AUTH_ENDPOINTS = {
  login: '/auth/login',
  registerInvite: '/auth/register/invite',
  forgotPassword: '/auth/forgot-password',
  forgotPasswordVerify: '/auth/forgot-password/verify',
  forgotPasswordReset: '/auth/forgot-password/reset',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  session: '/auth/session',
  impersonate: '/auth/impersonate',
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
  deleted: '/users/deleted',
  auditors: '/users/auditors',
  profile: (uuid) => `/users/${uuid}`,
  adminUpdate: (uuid) => `/users/${uuid}/admin`,
  adminInsights: (uuid) => `/users/${uuid}/admin/insights`,
  adminDelete: (uuid) => `/users/${uuid}/admin`,
  permanentDelete: (uuid) => `/users/${uuid}/permanent`,
  setAuditor: (uuid) => `/users/${uuid}/auditor`,
  classroomImpersonate: (uuid) => `/users/${uuid}/classroom-impersonate`,
}

export const REVIEW_ENDPOINTS = {
  queue: '/review/queue',
  mine: '/review/mine',
  stats: '/review/stats',
  myEntries: '/review/my-entries',
  entries: '/review/entries',
  paymentStats: '/review/payments/stats',
  payoutBatches: '/review/payments/batches',
  markPaid: '/review/payments/mark-paid',
  apply: (domain, entityType, uuid) => `/review/${domain}/${entityType}/${uuid}`,
}
