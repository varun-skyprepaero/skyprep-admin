/** @typedef {{ value: string, label: string, offsetMinutes: number }} TimezoneOption */

/** @type {string[] | null} */
let cachedTimezoneIds = null

/**
 * @returns {string}
 */
export function getBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * @returns {string[]}
 */
export function getSupportedTimezoneIds() {
  if (cachedTimezoneIds) return cachedTimezoneIds

  if (typeof Intl.supportedValuesOf === 'function') {
    cachedTimezoneIds = Intl.supportedValuesOf('timeZone')
    return cachedTimezoneIds
  }

  cachedTimezoneIds = [
    'UTC',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Los_Angeles',
    'Australia/Sydney',
  ]
  return cachedTimezoneIds
}

/**
 * @param {string} timezone
 * @param {Date} [at]
 */
export function getTimezoneOffsetMinutes(timezone, at = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).formatToParts(at)
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
    if (offset === 'GMT' || offset === 'UTC') return 0

    const match = offset.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/)
    if (!match) return 0

    const sign = match[1] === '-' ? -1 : 1
    const hours = Number(match[2])
    const minutes = Number(match[3] ?? 0)
    return sign * (hours * 60 + minutes)
  } catch {
    return 0
  }
}

/**
 * @param {string} timezone
 * @param {Date} [at]
 */
export function formatTimezoneLabel(timezone, at = new Date()) {
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, at)
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = String(Math.floor(abs / 60)).padStart(2, '0')
  const minutes = String(abs % 60).padStart(2, '0')
  const city = timezone.split('/').pop()?.replace(/_/g, ' ') ?? timezone
  return `(UTC${sign}${hours}:${minutes}) ${city}`
}

/**
 * @returns {TimezoneOption[]}
 */
export function getTimezoneOptions() {
  const at = new Date()
  return getSupportedTimezoneIds()
    .map((value) => ({
      value,
      label: formatTimezoneLabel(value, at),
      offsetMinutes: getTimezoneOffsetMinutes(value, at),
    }))
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.value.localeCompare(b.value))
}

/**
 * @param {string} query
 * @param {number} [limit]
 */
export function filterTimezoneOptions(query, limit = 40) {
  const q = query.trim().toLowerCase()
  const options = getTimezoneOptions()

  if (!q) return options.slice(0, limit)

  return options
    .filter(
      (opt) =>
        opt.value.toLowerCase().includes(q) || opt.label.toLowerCase().includes(q),
    )
    .slice(0, limit)
}

/**
 * @param {unknown} value
 */
export function isValidIANATimezone(value) {
  if (typeof value !== 'string') return false
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed })
    return true
  } catch {
    return false
  }
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function normalizeTimezone(value) {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
