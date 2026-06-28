/**
 * @param {string} password
 */
export function getPasswordChecks(password) {
  return [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains at least 1 number', ok: /\d/.test(password) },
    {
      label: 'Contains at least 1 special character',
      ok: /[^A-Za-z0-9]/.test(password),
    },
  ]
}

/**
 * @param {string} password
 */
export function isPasswordValid(password) {
  return getPasswordChecks(password).every((check) => check.ok)
}

/**
 * @param {string} password
 * @returns {string | null}
 */
export function getPasswordValidationError(password) {
  if (!password) return 'Password is required'

  const checks = getPasswordChecks(password)
  if (!checks[0].ok) return 'Password must be at least 8 characters'
  if (!checks[1].ok) return 'Password must contain at least 1 number'
  if (!checks[2].ok) return 'Password must contain at least 1 special character'

  return null
}
