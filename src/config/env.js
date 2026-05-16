export const env = {
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  /**
   * Test bank HTTP API (skyprep-test-backend). Vite only exposes `VITE_*` to the client.
   * Use `VITE_TEST_BANK_API_BASE_URL` (e.g. http://localhost:4010/api/v1). Legacy: `VITE_TEST_API_BASE_URL`.
   */
  testApiBaseUrl:
    import.meta.env.VITE_TEST_BANK_API_BASE_URL ??
    import.meta.env.VITE_TEST_API_BASE_URL ??
    '',
  /** Must match TEST_BANK_API_KEY when the test service enforces the client API key. */
  testBankApiKey: import.meta.env.VITE_TEST_BANK_API_KEY ?? '',
  appName: import.meta.env.VITE_APP_NAME ?? 'SkyPrep Admin',
  /** Classroom public URL — wrong-app hint for student invites */
  classroomAppUrl: import.meta.env.VITE_CLASSROOM_APP_URL ?? 'http://localhost:5173',
}
