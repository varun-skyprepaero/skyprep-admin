/** Review workflow states shared with the backend ReviewStatus enum. */
export const REVIEW_STATUS = {
  OK: 'OK',
  FLAGGED: 'FLAGGED',
  RESUBMITTED: 'RESUBMITTED',
  RESOLVED: 'RESOLVED',
  ACCEPTED: 'ACCEPTED',
}

/** @type {Record<string, { label: string, badgeClass: string }>} */
export const REVIEW_STATUS_META = {
  OK: {
    label: 'OK',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  FLAGGED: {
    label: 'Flagged',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
  },
  RESUBMITTED: {
    label: 'Needs recheck',
    badgeClass: 'bg-sky-500/15 text-sky-800 dark:text-sky-300',
  },
  RESOLVED: {
    label: 'Resolved',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  ACCEPTED: {
    label: 'Accepted',
    badgeClass: 'bg-emerald-600/15 text-emerald-700 dark:text-emerald-400',
  },
}

/** Statuses an item can be in while it still needs attention. */
export const OPEN_REVIEW_STATUSES = ['FLAGGED', 'RESUBMITTED']

/** Filter options for review-status selects on content pages. */
export const REVIEW_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Any review status' },
  { value: 'FLAGGED', label: 'Flagged' },
  { value: 'RESUBMITTED', label: 'Needs recheck' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'OK', label: 'OK' },
]

/** Payout state shared with the backend PaymentStatus enum. */
export const PAYMENT_STATUS = {
  UNPAID: 'UNPAID',
  PAID: 'PAID',
}

/** @type {Record<string, { label: string, badgeClass: string }>} */
export const PAYMENT_STATUS_META = {
  UNPAID: {
    label: 'Unpaid',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  PAID: {
    label: 'Paid',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
}

/** Human labels for the reviewable entity types returned by the backend. */
export const REVIEW_ENTITY_LABELS = {
  question: 'Question',
  exam: 'Exam',
  subject: 'Subject',
  book: 'Book',
  lesson: 'Lesson',
  board: 'Board',
  suite: 'License',
}

/** Admin routes that open the edit UI for a review entity (`?edit=<uuid>`). */
export const REVIEW_ENTITY_EDIT_PATHS = {
  question: '/tests/questions',
  exam: '/exams',
  subject: '/tests/subjects',
  book: '/tests/books',
  lesson: '/tests/lessons',
  board: '/tests/boards',
  suite: '/tests/suites',
}

/**
 * @param {string} entityType
 * @param {string} uuid
 * @returns {string | null}
 */
export function reviewEntityEditHref(entityType, uuid) {
  const base = REVIEW_ENTITY_EDIT_PATHS[entityType]
  if (!base || !uuid) return null
  return `${base}?edit=${encodeURIComponent(uuid)}`
}
