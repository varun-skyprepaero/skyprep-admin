import { toast } from 'sonner'

/**
 * @param {unknown} value
 * @returns {string}
 */
function toMessage(value) {
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (value && typeof value === 'object' && typeof value.message === 'string' && value.message.trim()) {
    return value.message.trim()
  }
  return 'Something went wrong'
}

export function notifySuccess(message, title) {
  const text = toMessage(message)
  if (title) toast.success(title, { description: text })
  else toast.success(text)
}

export function notifyError(message, title) {
  const text = toMessage(message)
  if (title) toast.error(title, { description: text })
  else toast.error(text)
}
