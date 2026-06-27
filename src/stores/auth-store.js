import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AUTH_STORAGE_KEY } from '@/lib/storage-keys'
import { isStaffUser } from '@/features/auth/lib/is-staff-user'
import {
  canRefreshSession,
  hasValidAccessToken,
  shouldRefreshAccessToken,
} from '@/lib/auth/token-utils'
import { permissionsStore } from '@/stores/permissions-store'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      tokenType: 'Bearer',
      sessionRefreshIntervalSeconds: null,
      lastSessionRefreshAt: null,
      impersonation: null,
      isAuthenticated: false,
      _hasHydrated: false,
      isBootstrapping: true,

      setSession: (session) => {
        const user = session.user
        set({
          user,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken ?? null,
          accessTokenExpiresAt: session.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: session.refreshTokenExpiresAt ?? null,
          tokenType: session.tokenType ?? 'Bearer',
          sessionRefreshIntervalSeconds: session.sessionRefreshIntervalSeconds ?? null,
          lastSessionRefreshAt: session.lastSessionRefreshAt ?? new Date().toISOString(),
          impersonation: session.impersonation ?? null,
          isAuthenticated: Boolean(session.accessToken && user && isStaffUser(user)),
        })
      },

      setUser: (user) => {
        const { accessToken } = get()
        set({
          user,
          isAuthenticated: Boolean(accessToken && user && isStaffUser(user)),
        })
      },

      logout: () => {
        permissionsStore.clear()
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
          tokenType: 'Bearer',
          sessionRefreshIntervalSeconds: null,
          lastSessionRefreshAt: null,
          impersonation: null,
          isAuthenticated: false,
          isBootstrapping: false,
        })
      },

      hydrateAuth: () => {
        const state = get()

        if (!state.accessToken && !state.refreshToken) {
          if (state.isAuthenticated) get().logout()
          return
        }

        if (!canRefreshSession(state)) {
          get().logout()
          return
        }

        if (hasValidAccessToken(state) && isStaffUser(state.user)) {
          const patch = { isAuthenticated: true }
          if (!state.lastSessionRefreshAt) {
            patch.lastSessionRefreshAt = new Date().toISOString()
          }
          if (!state.isAuthenticated || patch.lastSessionRefreshAt) {
            set(patch)
          }
          return
        }

        if (state.isAuthenticated) {
          set({ isAuthenticated: false })
        }
      },

      setBootstrapping: (value) => set({ isBootstrapping: value }),

      setHasHydrated: (value) => set({ _hasHydrated: value }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshTokenExpiresAt: state.refreshTokenExpiresAt,
        tokenType: state.tokenType,
        sessionRefreshIntervalSeconds: state.sessionRefreshIntervalSeconds,
        lastSessionRefreshAt: state.lastSessionRefreshAt,
        impersonation: state.impersonation,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrateAuth()
        state?.setHasHydrated(true)
      },
    },
  ),
)

export const authStore = {
  getState: () => useAuthStore.getState(),
  getAccessToken: () => useAuthStore.getState().accessToken,
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  setSession: (session) => useAuthStore.getState().setSession(session),
  updateUser: (user) => useAuthStore.getState().setUser(user),
  clear: () => useAuthStore.getState().logout(),
  canRefresh: () => canRefreshSession(useAuthStore.getState()),
  shouldRefreshAccessToken: () => shouldRefreshAccessToken(useAuthStore.getState()),
  hasValidAccessToken: () => hasValidAccessToken(useAuthStore.getState()),
}
