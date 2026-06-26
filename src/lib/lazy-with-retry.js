import { lazy } from 'react'

const CHUNK_RELOAD_KEY = 'skyprep-admin:chunk-reload'

/** @param {unknown} error */
export function isChunkLoadError(error) {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error ?? '')
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message)
  )
}

/**
 * Lazy-load a route chunk; on stale-deploy 404, reload once so the browser picks up new asset hashes.
 * @param {() => Promise<{ default: React.ComponentType }>} importFn
 */
export function lazyWithRetry(importFn) {
  return lazy(() =>
    importFn().catch((error) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
        sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      sessionStorage.removeItem(CHUNK_RELOAD_KEY)
      throw error
    }),
  )
}

export function clearChunkReloadFlag() {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)
}
