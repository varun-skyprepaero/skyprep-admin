import axios from 'axios'
import { env } from '@/config/env'

/** Axios instance for SkyPrep test-bank API (separate from classroom auth API). */
export const testApi = axios.create({
  baseURL: env.testApiBaseUrl ? env.testApiBaseUrl.replace(/\/$/, '') : '',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

testApi.interceptors.request.use((config) => {
  if (env.testBankApiKey) {
    config.headers['x-test-bank-api-key'] = env.testBankApiKey
  }
  return config
})
