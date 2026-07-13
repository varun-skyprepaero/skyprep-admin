import { formatTimezoneLabel } from '@/lib/datetime/timezone-utils'

export const ENROLLMENT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

/**
 * @param {string} status
 */
export function formatEnrollmentStatus(status) {
  return ENROLLMENT_STATUS_OPTIONS.find((opt) => opt.value === status)?.label ?? status
}

/**
 * @param {string | null | undefined} track
 */
export function formatTrainingTrack(track) {
  if (track === 'NIOS') return 'NIOS'
  if (track === 'PILOT_TRAINING') return 'Pilot Training'
  return track ?? '—'
}

/**
 * @param {string | null | undefined} timezone
 */
export function formatTimezoneDisplay(timezone) {
  if (!timezone) return 'Timezone not set'
  try {
    return formatTimezoneLabel(timezone)
  } catch {
    return timezone
  }
}

/**
 * @param {{ firstName?: string | null, lastName?: string | null, email?: string }} person
 */
export function formatPersonName(person) {
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ')
  return name || person.email || '—'
}
