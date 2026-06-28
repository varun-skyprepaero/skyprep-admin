import { getPasswordValidationError } from '@/features/auth/lib/password-policy'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CODE_LENGTH = 6

/**
 * @param {1 | 2 | 3} step
 * @param {{ email: string, code?: string, password?: string, confirmPassword?: string }} form
 */
export function validateForgotPasswordStep(step, form) {
  /** @type {Record<string, string>} */
  const errors = {}

  if (step === 1) {
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!EMAIL_RE.test(form.email.trim())) errors.email = 'Enter a valid email address'
    return errors
  }

  if (step === 2) {
    const code = form.code?.trim() ?? ''
    if (!code) errors.code = 'Reset code is required'
    else if (!new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code)) {
      errors.code = `Enter a ${CODE_LENGTH}-digit code`
    }
    return errors
  }

  if (!form.password) errors.password = 'Password is required'
  else {
    const passwordError = getPasswordValidationError(form.password)
    if (passwordError && passwordError !== 'Password is required') {
      errors.password = passwordError
    }
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  return errors
}
