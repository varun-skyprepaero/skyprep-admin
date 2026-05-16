export const SESSION_REFRESH_BUFFER_MS = 60_000
export const DEFAULT_SESSION_REFRESH_INTERVAL_SECONDS = 24 * 60 * 60

export function parseExpiryMs(expiresAt) {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime()
  return Number.isNaN(ms) ? null : ms
}

export function isExpired(expiresAt, bufferMs = 0) {
  const expiresMs = parseExpiryMs(expiresAt)
  if (expiresMs === null) return false
  return Date.now() >= expiresMs - bufferMs
}

export function canRefreshSession(state) {
  if (!state.refreshToken) return false
  return !isExpired(state.refreshTokenExpiresAt)
}

export function getSessionRefreshIntervalMs(state) {
  const seconds = state.sessionRefreshIntervalSeconds ?? DEFAULT_SESSION_REFRESH_INTERVAL_SECONDS
  return seconds * 1000
}

export function getLastSessionRefreshMs(state) {
  return (
    parseExpiryMs(state.lastSessionRefreshAt) ?? parseExpiryMs(state.accessTokenExpiresAt)
  )
}

export function shouldRefreshAccessToken(state) {
  if (!state.refreshToken) return false
  if (!canRefreshSession(state)) return false

  if (!hasValidAccessToken(state)) {
    return true
  }

  const lastRefreshMs = getLastSessionRefreshMs(state)
  if (lastRefreshMs === null) return false

  const intervalMs = getSessionRefreshIntervalMs(state)
  return Date.now() >= lastRefreshMs + intervalMs - SESSION_REFRESH_BUFFER_MS
}

export function hasValidAccessToken(state) {
  if (!state.accessToken) return false
  return !isExpired(state.accessTokenExpiresAt)
}
