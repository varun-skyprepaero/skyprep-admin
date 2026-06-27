import { create } from 'zustand'

/** @typedef {import('@/features/roles-permissions/api/permissions-api.types').PermissionMatrix} PermissionMatrix */

export const usePermissionsStore = create((set) => ({
  /** @type {PermissionMatrix | null} */
  matrix: null,
  roleName: null,

  /** @param {{ roleName: string, permissions: PermissionMatrix }} payload */
  setPermissions: (payload) =>
    set({
      matrix: payload.permissions ?? null,
      roleName: payload.roleName ?? null,
    }),

  clear: () => set({ matrix: null, roleName: null }),
}))

export const permissionsStore = {
  getMatrix: () => usePermissionsStore.getState().matrix,
  setPermissions: (payload) => usePermissionsStore.getState().setPermissions(payload),
  clear: () => usePermissionsStore.getState().clear(),
}
