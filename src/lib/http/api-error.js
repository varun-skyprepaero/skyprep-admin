export function toApiClientError(error) {
  if (error && typeof error === 'object' && 'isApiError' in error && error.isApiError) {
    return error
  }

  const axiosError = error
  const data = axiosError.response?.data

  if (data && typeof data === 'object' && 'success' in data && data.success === false) {
    const message =
      typeof data.message === 'string' ? data.message : 'Something went wrong'
    const statusCode =
      typeof data.statusCode === 'number' ? data.statusCode : axiosError.response?.status
    const fieldErrors = {}

    const details = data.error?.details
    if (details && typeof details === 'object' && typeof details.field === 'string') {
      fieldErrors[details.field] = message
    }

    return {
      message,
      statusCode,
      fieldErrors,
      isApiError: true,
    }
  }

  return {
    message: axiosError.message || 'Network error',
    statusCode: axiosError.response?.status,
    fieldErrors: {},
    isApiError: true,
  }
}

export function handleApiError(error, fallback) {
  const parsed = toApiClientError(error)
  return {
    message: parsed.message || fallback,
    fieldErrors: parsed.fieldErrors,
    statusCode: parsed.statusCode,
  }
}
