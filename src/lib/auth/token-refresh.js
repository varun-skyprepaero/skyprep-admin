import axios from 'axios'
import { env } from '@/config/env'
import { AUTH_ENDPOINTS } from '@/features/auth/constants'
import {
  SKYPREP_CLIENT_ADMIN,
  SKYPREP_CLIENT_HEADER,
} from '@/lib/http/client-app-header'
import { toAuthSession } from '@/features/auth/lib/to-auth-session'
import { authStore } from '@/stores/auth-store'

let refreshPromise = null

export async function refreshAccessToken() {
  const state = authStore.getState()

  if (!state.refreshToken) {
    throw new Error('No refresh token available')
  }

  if (!authStore.canRefresh()) {
    throw new Error('Refresh token expired')
  }

  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${env.apiBaseUrl}${AUTH_ENDPOINTS.refresh}`,
        { refreshToken: state.refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            [SKYPREP_CLIENT_HEADER]: SKYPREP_CLIENT_ADMIN,
          },
          timeout: 30_000,
        },
      )
      .then((response) => {
        const payload = response.data?.data
        if (!payload?.tokens?.accessToken) {
          throw new Error('Invalid refresh response')
        }

        const session = toAuthSession({
          user: payload.user ?? state.user,
          tokens: payload.tokens,
        })

        authStore.setSession(session)
        return session.accessToken
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}
