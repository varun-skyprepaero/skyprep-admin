import { toast } from 'sonner'

export function notifySuccess(message, title) {
  if (title) toast.success(title, { description: message })
  else toast.success(message)
}

export function notifyError(message, title) {
  if (title) toast.error(title, { description: message })
  else toast.error(message)
}
