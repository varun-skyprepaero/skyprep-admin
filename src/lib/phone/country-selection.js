import { COUNTRY_CALLING_CODES } from '@/lib/phone/country-calling-codes'
import { getBrowserTimezone } from '@/lib/datetime/timezone-utils'

/** @typedef {{ countryIso: string, country: string, countryCode: string }} CountrySelection */

/** @type {Record<string, string>} */
const TIMEZONE_TO_ISO = {
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dubai': 'AE',
  'Asia/Singapore': 'SG',
  'Europe/London': 'GB',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'Australia/Sydney': 'AU',
}

/**
 * @param {string | null | undefined} iso2
 * @returns {CountrySelection | null}
 */
export function countrySelectionFromIso(iso2) {
  const code = String(iso2 || '')
    .trim()
    .toUpperCase()
  if (!code) return null
  const match = COUNTRY_CALLING_CODES.find((c) => c.iso2 === code)
  if (!match) return null
  return {
    countryIso: match.iso2,
    country: match.country,
    countryCode: match.dialCode,
  }
}

/**
 * @param {{ countryIso?: string, phoneCountryIso?: string, country?: string, countryCode?: string, phoneNumber?: string }} form
 */
export function resolveRegistrationContact(form) {
  const countryMatch = countrySelectionFromIso(form.countryIso)
  const phoneMatch = countrySelectionFromIso(form.phoneCountryIso)
  return {
    country: countryMatch?.country ?? form.country?.trim() ?? '',
    countryCode: phoneMatch?.countryCode ?? form.countryCode?.trim() ?? '',
    phoneNumber: form.phoneNumber?.trim() ?? '',
  }
}

function detectCountryFromLocale() {
  try {
    const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
    for (const lang of languages) {
      if (!lang) continue
      const region = new Intl.Locale(lang).region
      const sel = countrySelectionFromIso(region)
      if (sel) return sel
    }
  } catch {
    // ignore
  }
  return null
}

/**
 * @param {string | null | undefined} timezone
 */
function detectCountryFromTimezone(timezone) {
  const tz = String(timezone || '').trim()
  if (!tz) return null
  const direct = TIMEZONE_TO_ISO[tz]
  if (direct) return countrySelectionFromIso(direct)
  return null
}

function detectCountryFromGeolocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation is not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const params = new URLSearchParams({
            format: 'json',
            lat: String(latitude),
            lon: String(longitude),
          })
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'SkyPrepAdmin/1.0 (registration)',
            },
          })
          if (!res.ok) {
            throw new Error('Could not look up your location')
          }
          const data = await res.json()
          const sel = countrySelectionFromIso(data?.address?.country_code)
          if (!sel) {
            throw new Error('Country could not be determined')
          }
          resolve(sel)
        } catch (err) {
          reject(err instanceof Error ? err : new Error('Could not look up your location'))
        }
      },
      (err) => {
        reject(err instanceof Error ? err : new Error('Location permission denied'))
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    )
  })
}

/**
 * @returns {Promise<CountrySelection>}
 */
export async function detectUserCountrySelection() {
  try {
    return await detectCountryFromGeolocation()
  } catch {
    const fromTimezone = detectCountryFromTimezone(getBrowserTimezone())
    if (fromTimezone) return fromTimezone

    const fromLocale = detectCountryFromLocale()
    if (fromLocale) return fromLocale

    throw new Error('Could not detect your country. Please choose it from the list.')
  }
}
