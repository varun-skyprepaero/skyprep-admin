export const PROGRAM_TYPE_LABELS = {
  FOCUS_ONE: 'Focus One',
  COHORT: 'Cohort',
  CRASH_COURSE: 'Crash Course',
}

export const TRAINING_TRACK_LABELS = {
  NIOS: 'NIOS',
  PILOT_TRAINING: 'Pilot Training',
}

export const PROGRAM_TYPE_OPTIONS = [
  { value: 'FOCUS_ONE', label: 'Focus One' },
  { value: 'COHORT', label: 'Cohort' },
  { value: 'CRASH_COURSE', label: 'Crash Course' },
]

export const TRACK_OPTIONS = [
  { value: 'NIOS', label: 'NIOS' },
  { value: 'PILOT_TRAINING', label: 'Pilot Training' },
]

/**
 * @param {string | null | undefined} programType
 */
export function programTypeToSlug(programType) {
  return String(programType || '')
    .trim()
    .toLowerCase()
    .replace(/_/g, '-')
}

/**
 * @param {string | null | undefined} slug
 */
export function slugToProgramType(slug) {
  return String(slug || '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
}

/**
 * @param {string | null | undefined} programType
 */
export function isKnownProgramType(programType) {
  const value = String(programType || '').trim()
  return PROGRAM_TYPE_OPTIONS.some((option) => option.value === value)
}

/**
 * @param {string | null | undefined} value
 */
function humanizeEnumLabel(value) {
  if (!value) return '—'
  if (PROGRAM_TYPE_LABELS[value] || TRAINING_TRACK_LABELS[value]) {
    return PROGRAM_TYPE_LABELS[value] || TRAINING_TRACK_LABELS[value]
  }
  return String(value)
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * @param {string | null | undefined} programType
 */
export function formatProgramType(programType) {
  return PROGRAM_TYPE_LABELS[programType] ?? humanizeEnumLabel(programType)
}

/**
 * @param {string | null | undefined} track
 */
export function formatTrainingTrack(track) {
  return TRAINING_TRACK_LABELS[track] ?? humanizeEnumLabel(track)
}

/**
 * @param {{ subjectSelection?: { enabled?: boolean, minSubjects?: number, instructorRequired?: boolean } } | null | undefined} config
 */
export function summarizeEnrollmentConfig(config) {
  const subjectSelection = config?.subjectSelection
  if (!subjectSelection?.enabled) {
    return 'Batch-driven (no per-student subject picker)'
  }

  const parts = []
  const min = subjectSelection.minSubjects ?? 1
  parts.push(min === 1 ? 'Subjects required' : `Min ${min} subjects`)
  if (subjectSelection.instructorRequired) {
    parts.push('instructors required')
  }
  return parts.join(' · ')
}
