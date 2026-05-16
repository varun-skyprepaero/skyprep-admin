export const env = {
  mode: import.meta.env.MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '',
  appName: import.meta.env.VITE_APP_NAME ?? 'SkyPrep Admin',
  /** Classroom public URL — wrong-app hint for student invites */
  classroomAppUrl: import.meta.env.VITE_CLASSROOM_APP_URL ?? 'http://localhost:5173',
}
