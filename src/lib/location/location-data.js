import { normalizeLocationPart } from '@/lib/phone/country-selection'

/** @typedef {{ value: string, label: string, isoCode?: string }} LocationOption */

const MAX_COUNTRY_CITY_OPTIONS = 400

/** @type {Promise<typeof import('country-state-city')> | null} */
let locationModulePromise = null

function getLocationModule() {
  if (!locationModulePromise) {
    locationModulePromise = import('country-state-city')
  }
  return locationModulePromise
}

/**
 * @param {string | null | undefined} countryIso
 * @returns {Promise<LocationOption[]>}
 */
export async function fetchStateOptions(countryIso) {
  const iso = String(countryIso || '')
    .trim()
    .toUpperCase()
  if (!iso) return []

  const { State } = await getLocationModule()
  return State.getStatesOfCountry(iso)
    .map((state) => ({
      value: state.name,
      label: state.name,
      isoCode: state.isoCode,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * @param {string | null | undefined} countryIso
 * @param {string | null | undefined} stateName
 * @returns {Promise<string>}
 */
async function findStateIsoCode(countryIso, stateName) {
  const iso = String(countryIso || '')
    .trim()
    .toUpperCase()
  const normalizedState = normalizeLocationPart(stateName)
  if (!iso || !normalizedState) return ''

  const { State } = await getLocationModule()
  const match = State.getStatesOfCountry(iso).find(
    (state) => normalizeLocationPart(state.name) === normalizedState,
  )
  return match?.isoCode ?? ''
}

/**
 * @param {string | null | undefined} countryIso
 * @param {string | null | undefined} stateName
 * @returns {Promise<LocationOption[]>}
 */
export async function fetchCityOptions(countryIso, stateName) {
  const iso = String(countryIso || '')
    .trim()
    .toUpperCase()
  if (!iso) return []

  const { City } = await getLocationModule()
  const stateIso = await findStateIsoCode(iso, stateName)
  if (stateIso) {
    return City.getCitiesOfState(iso, stateIso)
      .map((city) => ({ value: city.name, label: city.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const countryCities = City.getCitiesOfCountry(iso)
  if (countryCities.length === 0 || countryCities.length > MAX_COUNTRY_CITY_OPTIONS) {
    return []
  }

  return countryCities
    .map((city) => ({ value: city.name, label: city.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * @param {string | null | undefined} detected
 * @param {LocationOption[]} options
 * @returns {string}
 */
export function matchLocationName(detected, options) {
  const normalizedDetected = normalizeLocationPart(detected)
  if (!normalizedDetected || options.length === 0) {
    return String(detected || '').trim()
  }

  const exact = options.find(
    (option) => normalizeLocationPart(option.value) === normalizedDetected,
  )
  if (exact) return exact.value

  const partial = options.find((option) => {
    const normalizedOption = normalizeLocationPart(option.value)
    return (
      normalizedOption.includes(normalizedDetected) ||
      normalizedDetected.includes(normalizedOption)
    )
  })
  if (partial) return partial.value

  return String(detected || '').trim()
}

/**
 * @param {string | null | undefined} countryIso
 * @param {string | null | undefined} detectedState
 * @param {string | null | undefined} detectedCity
 */
export async function resolveDetectedLocation(countryIso, detectedState, detectedCity) {
  const stateOptions = await fetchStateOptions(countryIso)
  const state = stateOptions.length
    ? matchLocationName(detectedState, stateOptions)
    : String(detectedState || '').trim()
  const cityOptions = state ? await fetchCityOptions(countryIso, state) : []
  const city = cityOptions.length
    ? matchLocationName(detectedCity, cityOptions)
    : String(detectedCity || '').trim()

  return { state, city }
}
