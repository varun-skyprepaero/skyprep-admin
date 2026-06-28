/**
 * @param {{ questionCount: number, marksPerQuestion: number }} section
 */
export function sectionTotalMarks(section) {
  return section.questionCount * section.marksPerQuestion
}

/**
 * @param {{ questionCount: number, marksPerQuestion: number, passMinPercent: number }} section
 */
export function sectionPassMarks(section) {
  const total = sectionTotalMarks(section)
  return Math.ceil((total * section.passMinPercent) / 100)
}

/**
 * @param {Array<{ questionCount: number, marksPerQuestion: number, timeLimitMinutes: number }>} sections
 */
export function examTotals(sections) {
  return sections.reduce(
    (acc, section) => {
      const marks = sectionTotalMarks(section)
      return {
        questionCount: acc.questionCount + section.questionCount,
        totalMarks: acc.totalMarks + marks,
        timeLimitMinutes: acc.timeLimitMinutes + section.timeLimitMinutes,
      }
    },
    { questionCount: 0, totalMarks: 0, timeLimitMinutes: 0 },
  )
}

/**
 * @param {{ subject?: { name?: string }, questionCount: number, marksPerQuestion: number, passMinPercent: number }} section
 */
export function sectionSummary(section) {
  const totalMarks = sectionTotalMarks(section)
  const passMarks = sectionPassMarks(section)
  return {
    subjectName: section.subject?.name ?? 'Unknown subject',
    totalMarks,
    passMarks,
  }
}

export function formatExamName(boardCode, suiteName) {
  return `${boardCode} — ${suiteName}`
}

/** @param {{ displayName?: string | null, name?: string }} exam */
export function examDisplayTitle(exam) {
  const display = String(exam?.displayName ?? '').trim()
  if (display) return display
  return exam?.name ?? 'Exam'
}

export function formatExamCost(amount, currency) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${amount} ${currency}`
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`
}

export function costsFromExam(exam) {
  return {
    costInAmount: exam?.costs?.in?.amount ?? exam?.costInAmount ?? '',
    costIntlAmount: exam?.costs?.intl?.amount ?? exam?.costIntlAmount ?? '',
  }
}

function normalizeCost(value) {
  if (value === '' || value == null) return null
  return Number(value)
}

function normalizeAttemptLimit(value) {
  if (value === '' || value == null) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.floor(n)
}

export const PASS_POLICY_LABELS = {
  ALL_SECTIONS: 'Pass every subject section',
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExamSection} section
 */
export function sectionToPayload(section) {
  return {
    subjectUuid: section.subjectUuid ?? section.subject?.uuid,
    questionCount: Number(section.questionCount ?? 0),
    marksPerQuestion: Number(section.marksPerQuestion ?? 0),
    timeLimitMinutes: Number(section.timeLimitMinutes ?? 0),
    passMinPercent: Number(section.passMinPercent ?? 0),
    difficultyFilter: [...(section.difficultyFilter ?? [])].sort(),
  }
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExam} exam
 */
export function examToPayload(exam) {
  return {
    displayName: String(exam.displayName ?? '').trim() || null,
    description: String(exam.description ?? '').trim() || null,
    passPolicy: exam.passPolicy ?? 'ALL_SECTIONS',
    costInAmount: normalizeCost(exam.costInAmount ?? exam.costs?.in?.amount),
    costIntlAmount: normalizeCost(exam.costIntlAmount ?? exam.costs?.intl?.amount),
    sections: (exam.sections ?? []).map(sectionToPayload),
  }
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExam} exam
 */
export function examDetailsToPayload(exam) {
  const costs = costsFromExam(exam)
  return {
    displayName: String(exam.displayName ?? '').trim() || null,
    description: String(exam.description ?? '').trim() || null,
    passPolicy: exam.passPolicy ?? 'ALL_SECTIONS',
    isPublished: exam.isPublished !== false,
    attemptLimit: normalizeAttemptLimit(exam.attemptLimit),
    costInAmount: normalizeCost(costs.costInAmount),
    costIntlAmount: normalizeCost(costs.costIntlAmount),
  }
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExam} exam
 */
export function examSectionsToPayload(exam) {
  return (exam.sections ?? []).map(sectionToPayload)
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExam} draft
 * @param {{ includeDetails?: boolean, includeSections?: boolean }} [opts]
 */
export function buildExamSavePayload(
  draft,
  { includeDetails = true, includeSections = true } = {},
) {
  const payload = {}
  if (includeDetails) {
    Object.assign(payload, examDetailsToPayload(draft))
  }
  if (includeSections) {
    payload.sections = examSectionsToPayload(draft)
  }
  return payload
}

/**
 * @param {import('@/features/tests/api/tests-api').TestExamSection} section
 */
export function emptySection(subjectUuid) {
  return {
    subjectUuid,
    questionCount: 20,
    marksPerQuestion: 2,
    timeLimitMinutes: 30,
    passMinPercent: 50,
    difficultyFilter: [],
  }
}

export function toggleDifficultyFilter(current, value) {
  const set = new Set(current ?? [])
  if (set.has(value)) set.delete(value)
  else set.add(value)
  return [...set].sort()
}

export function formatDifficultyFilter(filter) {
  if (!filter?.length) return 'All difficulties'
  return filter
    .map((d) => d.charAt(0) + d.slice(1).toLowerCase())
    .join(', ')
}

/** @param {unknown} value @param {number} [fallback] */
export function clampNonNegativeInt(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.floor(n)
}

/** @param {unknown} value @param {number} [fallback] */
export function clampNonNegativeDecimal(value, fallback = 0) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return fallback
  return n
}

/** @param {unknown} value @param {number} [fallback] */
export function clampPercent(value, fallback = 0) {
  return Math.min(100, clampNonNegativeInt(value, fallback))
}
