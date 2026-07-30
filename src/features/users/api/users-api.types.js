/**
 * @typedef {{
 *   uuid: string
 *   email: string
 *   firstName?: string | null
 *   lastName?: string | null
 *   role?: { uuid?: string, name?: string } | null
 *   isActive?: boolean
 *   isDeleted?: boolean
 *   deletedAt?: string | null
 *   timezone?: string | null
 *   createdAt?: string
 *   updatedAt?: string | null
 *   lastLoginAt?: string | null
 *   registrationSource?: 'SELF_REGISTERED' | 'INVITED' | 'ADMIN_CREATED' | null
 *   storageQuotaBytes?: number
 *   isVerified?: boolean
 *   isEmailVerified?: boolean
 *   isPhoneVerified?: boolean
 *   countryCode?: string | null
 *   phoneNumber?: string | null
 *   address?: string | null
 *   city?: string | null
 *   state?: string | null
 *   country?: string | null
 *   zipCode?: string | null
 *   language?: string | null
 *   currency?: string | null
 *   gender?: string | null
 *   auditor?: { uuid: string, name: string, email: string } | null
 * }} AdminUserRow
 */

/**
 * @typedef {{
 *   storage: {
 *     usedBytes: number
 *     quotaBytes: number
 *     remainingBytes: number
 *     percentUsed: number
 *   }
 *   counts: {
 *     trainingEnrollments: Record<string, number> & { total: number }
 *     purchaseOrders: Record<string, number> & { total: number }
 *   }
 * }} AdminUserInsights
 */

export {}
