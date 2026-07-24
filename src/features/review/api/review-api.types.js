/**
 * @typedef {{ uuid: string, name: string, email?: string } | null} ReviewParty
 */

/**
 * @typedef {{
 *   domain: string
 *   entityType: string
 *   entityLabel?: string
 *   uuid: string
 *   title?: string
 *   contextLabel?: string | null
 *   reviewStatus: 'OK' | 'FLAGGED' | 'RESUBMITTED' | 'RESOLVED'
 *   reviewNote?: string | null
 *   reviewedAt?: string | null
 *   createdAt?: string | null
 *   updatedAt?: string | null
 *   createdBy?: ReviewParty
 *   updatedBy?: ReviewParty
 *   reviewedBy?: ReviewParty
 * }} ReviewItem
 */

/**
 * @typedef {{
 *   authorUuid: string
 *   author: { uuid: string, name: string, email?: string | null }
 *   total: number
 *   byStatus: { OK: number, FLAGGED: number, RESUBMITTED: number, RESOLVED: number, ACCEPTED: number }
 *   byType: Record<string, number>
 * }} ReviewAuthorStats
 */

/**
 * @typedef {{ total: number, accepted: number, payable: number, paid: number, unpaid: number }} PaymentTotals
 */

/**
 * @typedef {{
 *   authorUuid: string
 *   author: { uuid: string, name: string, email?: string | null }
 *   total: number
 *   accepted: number
 *   payable: number
 *   paid: number
 *   unpaid: number
 * }} PaymentAuthorStats
 */

/**
 * @typedef {{
 *   uuid: string
 *   authorUuid: string
 *   author: ReviewParty
 *   createdBy: ReviewParty
 *   itemCount: number
 *   note?: string | null
 *   createdAt?: string | null
 * }} PayoutBatch
 */

export {}
