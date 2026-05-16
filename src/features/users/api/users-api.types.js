/**
 * @typedef {{
 *   uuid: string
 *   email: string
 *   firstName?: string | null
 *   lastName?: string | null
 *   role?: { uuid?: string, name?: string } | null
 *   isActive?: boolean
 *   createdAt?: string
 *   registrationSource?: 'SELF_REGISTERED' | 'INVITED' | 'ADMIN_CREATED' | null
 * }} AdminUserRow
 */

export {}
