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
 *   registrationSource?: 'SELF_REGISTERED' | 'INVITED' | 'ADMIN_CREATED' | null
 *   auditor?: { uuid: string, name: string, email: string } | null
 * }} AdminUserRow
 */

export {}
