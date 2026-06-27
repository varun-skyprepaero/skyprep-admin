export const PERMISSIONS_ENDPOINTS = {
  catalog: '/permissions/catalog',
  me: '/permissions/me',
  list: '/permissions',
  invitableRoles: '/permissions/invitable-roles',
  createRole: '/permissions/roles',
  updateRole: (roleUuid) => `/permissions/roles/${roleUuid}`,
  deleteRole: (roleUuid) => `/permissions/roles/${roleUuid}`,
}
