/**
 * @param {{ user: object, tokens: object, impersonation?: object | null }} data
 */
export function toAuthSession(data) {
  return {
    user: data.user,
    accessToken: data.tokens.accessToken,
    refreshToken: data.tokens.refreshToken,
    accessTokenExpiresAt: data.tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: data.tokens.refreshTokenExpiresAt,
    tokenType: data.tokens.tokenType ?? 'Bearer',
    sessionRefreshIntervalSeconds: data.tokens.sessionRefreshIntervalSeconds,
    lastSessionRefreshAt: data.tokens.sessionRefreshedAt,
    impersonation: data.impersonation ?? null,
  }
}
