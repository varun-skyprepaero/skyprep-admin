import { apiClient } from '@/lib/http/api-client'
import { toApiClientError } from '@/lib/http/api-error'
import { AUTH_ENDPOINTS, INVITATION_ENDPOINTS, USER_ENDPOINTS } from '@/features/auth/constants'
import { authStore } from '@/stores/auth-store'

export { toAuthSession } from '@/features/auth/lib/to-auth-session'

/**
 * @param {{ email: string, password: string }} payload
 */
export async function login(payload) {
  try {
    const { data } = await apiClient.post(AUTH_ENDPOINTS.login, payload)
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} uuid
 * @param {string} [accessToken] — use during login before the store is hydrated
 */
export async function getUserProfile(uuid, accessToken) {
  try {
    const config = accessToken
      ? {
          headers: { Authorization: `Bearer ${accessToken}` },
          skipAuthRefresh: true,
        }
      : undefined
    const { data } = await apiClient.get(USER_ENDPOINTS.profile(uuid), config)
    return data?.data ?? data
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function refreshSession() {
  const refreshToken = authStore.getRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  try {
    const { data } = await apiClient.post(
      AUTH_ENDPOINTS.refresh,
      { refreshToken },
      { skipAuthRefresh: true },
    )
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function logoutSession() {
  const refreshToken = authStore.getRefreshToken()
  if (!refreshToken) return

  try {
    await apiClient.post(
      AUTH_ENDPOINTS.logout,
      { refreshToken },
      { skipAuthRefresh: true },
    )
  } catch {
    // Clear local session even if server logout fails
  }
}

/**
 * @param {string} token
 */
export async function getInvitePreview(token) {
  try {
    const { data } = await apiClient.get(INVITATION_ENDPOINTS.preview, {
      params: { token },
      skipAuthRefresh: true,
    })
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{
 *   inviteToken: string,
 *   password: string,
 *   firstName: string,
 *   lastName?: string,
 *   timezone: string,
 *   countryCode?: string,
 *   phoneNumber?: string,
 *   country?: string,
 * }} payload
 */
export async function registerFromInvite(payload) {
  try {
    const { data } = await apiClient.post(AUTH_ENDPOINTS.registerInvite, payload, {
      skipAuthRefresh: true,
    })
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} token
 */
export async function exchangeImpersonate(token) {
  try {
    const { data } = await apiClient.post(AUTH_ENDPOINTS.impersonate, { token })
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string }} payload
 */
export async function requestPasswordReset(payload) {
  try {
    const { data } = await apiClient.post(
      AUTH_ENDPOINTS.forgotPassword,
      { email: payload.email.trim().toLowerCase() },
      { skipAuthRefresh: true },
    )
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string, code: string }} payload
 */
export async function verifyPasswordResetCode(payload) {
  try {
    const { data } = await apiClient.post(
      AUTH_ENDPOINTS.forgotPasswordVerify,
      {
        email: payload.email.trim().toLowerCase(),
        code: payload.code.trim(),
      },
      { skipAuthRefresh: true },
    )
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string, code: string, password: string }} payload
 */
export async function resetPasswordWithCode(payload) {
  try {
    const { data } = await apiClient.post(
      AUTH_ENDPOINTS.forgotPasswordReset,
      {
        email: payload.email.trim().toLowerCase(),
        code: payload.code.trim(),
        password: payload.password,
      },
      { skipAuthRefresh: true },
    )
    return data
  } catch (error) {
    throw toApiClientError(error)
  }
}
