export function validateLoginForm({ email, password }) {
  const errors = {}
  const trimmedEmail = email?.trim() ?? ''

  if (!trimmedEmail) {
    errors.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = 'Enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  }

  return errors
}
