export const BYTES_PER_MB = 1024 * 1024
export const BYTES_PER_KB = 1024
export const DEFAULT_STORAGE_QUOTA_MB = 512

/** @param {number | null | undefined} bytes */
export function bytesToStorageMb(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_STORAGE_QUOTA_MB
  return Math.round(value / BYTES_PER_MB)
}

/** @param {number | string} mb */
export function storageMbToBytes(mb) {
  const value = Number(mb)
  if (!Number.isFinite(value) || value < 1) return DEFAULT_STORAGE_QUOTA_MB * BYTES_PER_MB
  return Math.floor(value * BYTES_PER_MB)
}

/** @param {number | null | undefined} bytes */
export function formatStorageLabel(bytes) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value <= 0) return '0 KB'
  if (value < BYTES_PER_MB) {
    const kb = value / BYTES_PER_KB
    if (kb >= 100) return `${Math.round(kb)} KB`
    if (kb >= 10) return `${Math.round(kb)} KB`
    return `${kb.toFixed(1)} KB`
  }
  if (value < BYTES_PER_MB * 1024) return `${(value / BYTES_PER_MB).toFixed(value >= 10 * BYTES_PER_MB ? 0 : 1)} MB`
  return `${(value / (BYTES_PER_MB * 1024)).toFixed(2)} GB`
}

/** @param {number} usedBytes @param {number} quotaBytes */
export function formatStoragePercent(usedBytes, quotaBytes) {
  const used = Number(usedBytes) || 0
  const quota = Number(quotaBytes) || 0
  if (quota <= 0) return 0
  return Math.min(100, Math.round((used / quota) * 100))
}
