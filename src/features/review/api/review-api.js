import { REVIEW_ENDPOINTS } from '@/features/auth/constants'
import { apiClient } from '@/lib/http/api-client'
import { toApiClientError } from '@/lib/http/api-error'

function toCsv(value) {
  if (Array.isArray(value)) return value.filter(Boolean).join(',')
  return value || undefined
}

/**
 * @param {{ reviewStatus?: string | string[], entityTypes?: string | string[] }} [params]
 * @returns {Promise<Array<import('./review-api.types').ReviewItem>>}
 */
export async function fetchReviewQueue(params = {}) {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.queue, {
      params: {
        reviewStatus: toCsv(params.reviewStatus),
        entityTypes: toCsv(params.entityTypes),
      },
    })
    return Array.isArray(data?.data?.items) ? data.data.items : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * @param {{ reviewStatus?: string | string[] }} [params]
 * @returns {Promise<Array<import('./review-api.types').ReviewItem>>}
 */
export async function fetchMyReviewItems(params = {}) {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.mine, {
      params: { reviewStatus: toCsv(params.reviewStatus) },
    })
    return Array.isArray(data?.data?.items) ? data.data.items : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Per-author summary counts for the reviewer's auditees.
 * @returns {Promise<Array<import('./review-api.types').ReviewAuthorStats>>}
 */
export async function fetchReviewStats() {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.stats)
    return Array.isArray(data?.data?.authors) ? data.data.authors : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Apply a review decision to one item.
 * @param {{ domain?: string, entityType: string, uuid: string, status: string, note?: string | null }} input
 */
export async function applyReviewDecision({ domain = 'test-content', entityType, uuid, status, note }) {
  try {
    const { data } = await apiClient.post(REVIEW_ENDPOINTS.apply(domain, entityType, uuid), {
      status,
      note: note ?? null,
    })
    return data?.data?.review ?? null
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * The acting user's own authored entries, totals, and payout history.
 * @returns {Promise<{ items: Array<import('./review-api.types').ReviewItem>, totals: import('./review-api.types').PaymentTotals, batches: Array<import('./review-api.types').PayoutBatch> }>}
 */
export async function fetchMyEntries(params = {}) {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.myEntries, {
      params: { entityTypes: toCsv(params.entityTypes) },
    })
    const payload = data?.data ?? {}
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      totals: payload.totals ?? { total: 0, accepted: 0, payable: 0, paid: 0, unpaid: 0 },
      batches: Array.isArray(payload.batches) ? payload.batches : [],
    }
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * One auditee's entries (admin payout drill-in).
 * @param {{ authorUuid: string, paymentStatus?: string, reviewStatus?: string | string[] }} params
 */
export async function fetchAuthorEntries(params = {}) {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.entries, {
      params: {
        authorUuid: params.authorUuid,
        paymentStatus: params.paymentStatus || undefined,
        reviewStatus: toCsv(params.reviewStatus),
      },
    })
    const payload = data?.data ?? {}
    return {
      items: Array.isArray(payload.items) ? payload.items : [],
      totals: payload.totals ?? { total: 0, accepted: 0, payable: 0, paid: 0, unpaid: 0 },
    }
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Per-author payout summary (accepted / payable / paid / unpaid).
 * @returns {Promise<Array<import('./review-api.types').PaymentAuthorStats>>}
 */
export async function fetchPaymentStats() {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.paymentStats)
    return Array.isArray(data?.data?.authors) ? data.data.authors : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Payout batch history (optionally for one author).
 * @param {{ authorUuid?: string }} [params]
 * @returns {Promise<Array<import('./review-api.types').PayoutBatch>>}
 */
export async function fetchPayoutBatches(params = {}) {
  try {
    const { data } = await apiClient.get(REVIEW_ENDPOINTS.payoutBatches, {
      params: { authorUuid: params.authorUuid || undefined },
    })
    return Array.isArray(data?.data?.batches) ? data.data.batches : []
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Settle an auditee's accepted work into a payout batch.
 * @param {{ authorUuid: string, items?: Array<{ domain?: string, entityType: string, uuid: string }>, all?: boolean, note?: string }} input
 * @returns {Promise<{ count: number, batch: import('./review-api.types').PayoutBatch | null }>}
 */
export async function markEntriesPaid({ authorUuid, items, all = false, note }) {
  try {
    const { data } = await apiClient.post(REVIEW_ENDPOINTS.markPaid, {
      authorUuid,
      items,
      all,
      note: note ?? null,
    })
    return data?.data ?? { count: 0, batch: null }
  } catch (error) {
    throw toApiClientError(error)
  }
}

/**
 * Undo a payout batch and mark its items unpaid again.
 * @param {{ batchUuid: string }} input
 * @returns {Promise<{ count: number }>}
 */
export async function revertPayout({ batchUuid }) {
  try {
    const { data } = await apiClient.post(REVIEW_ENDPOINTS.revertPayout, {
      batchUuid,
    })
    return data?.data ?? { count: 0 }
  } catch (error) {
    throw toApiClientError(error)
  }
}
