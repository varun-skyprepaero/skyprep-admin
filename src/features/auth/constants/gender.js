/** @typedef {'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'} UserGender */

export const USER_GENDER = /** @type {const} */ ({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
  PREFER_NOT_TO_SAY: 'PREFER_NOT_TO_SAY',
})

export const GENDER_OPTIONS = [
  { value: USER_GENDER.MALE, label: 'Male' },
  { value: USER_GENDER.FEMALE, label: 'Female' },
  { value: USER_GENDER.OTHER, label: 'Other' },
  { value: USER_GENDER.PREFER_NOT_TO_SAY, label: 'Prefer not to say' },
]

/**
 * @param {unknown} value
 * @returns {UserGender | ''}
 */
export function normalizeGenderValue(value) {
  if (value == null) return ''
  const normalized = String(value).trim().toUpperCase()
  return GENDER_OPTIONS.some((option) => option.value === normalized)
    ? /** @type {UserGender} */ (normalized)
    : ''
}
