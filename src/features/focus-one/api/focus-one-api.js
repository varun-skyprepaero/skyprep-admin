import { apiClient } from '@/lib/http/api-client'
import { toApiClientError } from '@/lib/http/api-error'

/** @param {import('axios').AxiosResponse} res */
function unwrap(res) {
  const body = res.data
  if (!body?.success) {
    const err = new Error(typeof body?.message === 'string' ? body.message : 'Request failed')
    err.response = { data: body }
    throw err
  }
  return body.data
}

export async function fetchTrainingPrograms(params = {}) {
  try {
    const res = await apiClient.get('/admin/training/programs', { params })
    return unwrap(res).programs ?? []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{
 *   programKey?: string
 *   track: string
 *   programType: string
 *   name: string
 *   description?: string
 *   isActive?: boolean
 * }} payload
 */
export async function createTrainingProgram(payload) {
  try {
    const res = await apiClient.post('/admin/training/programs', payload)
    return unwrap(res).program
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} uuid
 * @param {{ name?: string, description?: string | null, isActive?: boolean }} payload
 */
export async function updateTrainingProgram(uuid, payload) {
  try {
    const res = await apiClient.patch(`/admin/training/programs/${uuid}`, payload)
    return unwrap(res).program
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} uuid
 * @param {{ confirmKey: string }} payload
 */
export async function deleteTrainingProgram(uuid, payload) {
  try {
    const res = await apiClient.delete(`/admin/training/programs/${uuid}`, {
      data: payload,
    })
    return unwrap(res)
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function fetchTrainingSubjects() {
  try {
    const res = await apiClient.get('/admin/training/subjects')
    return unwrap(res).subjects ?? []
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function fetchFocusOneEnrollments(params = {}) {
  try {
    const res = await apiClient.get('/admin/training/focus-one/enrollments', { params })
    return unwrap(res).enrollments ?? []
  } catch (error) {
    throw toApiClientError(error)
  }
}

export async function fetchTrainingEnrollments(params = {}) {
  try {
    const res = await apiClient.get('/admin/training/enrollments', { params })
    return unwrap(res).enrollments ?? []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string, programKey: string, subjectUuids: string[], instructorBySubject?: Record<string, string> }} payload
 */
export async function createFocusOneEnrollment(payload) {
  try {
    const res = await apiClient.post('/admin/training/focus-one/enrollments', payload)
    return unwrap(res).enrollment
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string, programKey: string, subjectUuids?: string[], instructorBySubject?: Record<string, string> }} payload
 */
export async function createTrainingEnrollment(payload) {
  try {
    const res = await apiClient.post('/admin/training/enrollments', payload)
    return unwrap(res).enrollment
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} uuid
 * @param {{ status?: string, subjectUuids?: string[], instructorBySubject?: Record<string, string> }} payload
 */
export async function updateFocusOneEnrollment(uuid, payload) {
  try {
    const res = await apiClient.patch(`/admin/training/focus-one/enrollments/${uuid}`, payload)
    return unwrap(res).enrollment
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {string} uuid
 * @param {{ status?: string, subjectUuids?: string[], instructorBySubject?: Record<string, string> }} payload
 */
export async function updateTrainingEnrollment(uuid, payload) {
  try {
    const res = await apiClient.patch(`/admin/training/enrollments/${uuid}`, payload)
    return unwrap(res).enrollment
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ email: string, roleName: string, trainingIntent?: { programKey: string, subjectUuids: string[], instructorBySubject?: Record<string, string> } }} payload
 */
export async function createFocusOneInvitation(payload) {
  try {
    const res = await apiClient.post('/invitations', {
      ...payload,
      email: payload.email.trim().toLowerCase(),
    })
    return res.data?.data ?? res.data
  } catch (error) {
    throw toApiClientError(error)
  }
}
