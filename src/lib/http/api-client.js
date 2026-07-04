import axios from 'axios'
import { env } from '@/config/env'
import { refreshAccessToken } from '@/lib/auth/token-refresh'
import { toApiClientError } from '@/lib/http/api-error'
import {
  SKYPREP_CLIENT_ADMIN,
  SKYPREP_CLIENT_HEADER,
} from '@/lib/http/client-app-header'
import { authStore } from '@/stores/auth-store'

if (env.isDev && !env.apiBaseUrl) {
  console.error(
    '[api] VITE_API_BASE_URL is not set. Copy .env.example to .env and restart the dev server.',
  )
}

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    [SKYPREP_CLIENT_HEADER]: SKYPREP_CLIENT_ADMIN,
  },
})

function isPublicAuthRoute(url = '') {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/register/invite') ||
    url.includes('/auth/impersonate') ||
    url.includes('/auth/verify-email') ||
    url.includes('/auth/resend-verification') ||
    url.includes('/invitations/preview')
  )
}

function shouldSkipAuthHandling(config) {
  return Boolean(config.skipAuthRefresh || isPublicAuthRoute(config.url))
}

apiClient.interceptors.request.use(async (config) => {
  if (!shouldSkipAuthHandling(config)) {
    if (!authStore.canRefresh()) {
      authStore.clear()
      return Promise.reject(new Error('Session expired'))
    }

    if (authStore.shouldRefreshAccessToken()) {
      try {
        await refreshAccessToken()
      } catch {
        authStore.clear()
        return Promise.reject(new Error('Unable to refresh session'))
      }
    }

    const token = authStore.getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error.response?.status
    const url = originalRequest?.url || ''

    if (!originalRequest || shouldSkipAuthHandling(originalRequest)) {
      return Promise.reject(toApiClientError(error))
    }

    if (status === 401 && !originalRequest._retry) {
      if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
        authStore.clear()
        return Promise.reject(toApiClientError(error))
      }

      if (authStore.canRefresh()) {
        originalRequest._retry = true
        try {
          const accessToken = await refreshAccessToken()
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return apiClient(originalRequest)
        } catch {
          authStore.clear()
          return Promise.reject(toApiClientError(error))
        }
      }

      authStore.clear()
    }

    return Promise.reject(toApiClientError(error))
  },
)
