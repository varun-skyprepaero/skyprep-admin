/** @typedef {{ label: string, text: string, isCorrect: boolean }} FormOption */

/** @param {number} idx */
export function choiceLabelAt(idx) {
  return String.fromCharCode(65 + idx)
}

/**
 * Re-letter choice options as A, B, C… by position.
 * @param {FormOption[]} options
 * @returns {FormOption[]}
 */
export function withSequentialChoiceLabels(options) {
  return options.map((o, idx) => ({ ...o, label: choiceLabelAt(idx) }))
}

export function defaultChoiceOptions() {
  return [
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
  ]
}

/**
 * Build options array when question type changes or dialog opens.
 * @param {string} type
 * @param {FormOption[] | undefined} existing
 * @returns {FormOption[]}
 */
export function optionsForQuestionType(type, existing) {
  const prev = Array.isArray(existing) ? existing : []

  switch (type) {
    case 'TRUE_FALSE': {
      const trueOpt = prev.find(
        (o) => o.label === 'T' || String(o.text).trim().toLowerCase() === 'true',
      )
      const correctIsTrue = trueOpt?.isCorrect ?? prev[0]?.isCorrect ?? true
      return [
        { label: 'T', text: 'True', isCorrect: correctIsTrue },
        { label: 'F', text: 'False', isCorrect: !correctIsTrue },
      ]
    }
    case 'SHORT_ANSWER': {
      const accepted =
        prev.find((o) => o.isCorrect)?.text ??
        prev.find((o) => o.text?.trim())?.text ??
        ''
      return [{ label: 'A', text: accepted, isCorrect: true }]
    }
    case 'ESSAY':
      return []
    case 'MULTIPLE_CHOICE':
      return withSequentialChoiceLabels(
        prev.length >= 2 ? prev.map((o) => ({ ...o })) : defaultChoiceOptions(),
      )
    case 'SINGLE_CHOICE':
    default: {
      const base = prev.length >= 2 ? prev.map((o) => ({ ...o })) : defaultChoiceOptions()
      let hasCorrect = false
      return withSequentialChoiceLabels(
        base.map((o) => {
          if (!o.isCorrect) return o
          if (!hasCorrect) {
            hasCorrect = true
            return o
          }
          return { ...o, isCorrect: false }
        }),
      )
    }
  }
}

/**
 * @param {string} type
 * @param {{ options: FormOption[], score?: string }} form
 * @returns {FormOption[]}
 */
export function buildOptionsPayload(type, form) {
  switch (type) {
    case 'TRUE_FALSE':
      return [
        { label: 'T', text: 'True', isCorrect: Boolean(form.options[0]?.isCorrect) },
        { label: 'F', text: 'False', isCorrect: !form.options[0]?.isCorrect },
      ]
    case 'SHORT_ANSWER': {
      const text = String(form.options[0]?.text ?? '').trim()
      return [{ label: 'A', text, isCorrect: true }]
    }
    case 'ESSAY':
      return []
    default:
      return form.options.map((o, idx) => ({
        label: choiceLabelAt(idx),
        text: String(o.text ?? '').trim(),
        isCorrect: Boolean(o.isCorrect),
      }))
  }
}

/**
 * @param {string} type
 * @param {{ options: FormOption[] }} form
 * @returns {string | null}
 */
export function validateQuestionAnswers(type, form) {
  if (type === 'ESSAY') return null

  if (type === 'SHORT_ANSWER') {
    if (!String(form.options[0]?.text ?? '').trim()) {
      return 'Enter the accepted answer for this short-answer question.'
    }
    return null
  }

  if (type === 'TRUE_FALSE') return null

  const options = form.options
  if (options.length < 2) {
    return 'Add at least two answer options.'
  }

  const withText = options.filter((o) => String(o.text ?? '').trim())
  if (withText.length < 2) {
    return 'Each option needs answer text.'
  }

  const correctCount = options.filter((o) => o.isCorrect).length

  if (type === 'SINGLE_CHOICE') {
    if (correctCount !== 1) return 'Select exactly one correct option.'
  } else if (type === 'MULTIPLE_CHOICE') {
    if (correctCount < 1) return 'Select at least one correct option.'
  }

  return null
}

export function usesChoiceOptionsList(type) {
  return type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE'
}

/**
 * Map a question API row into the admin edit form shape.
 * @param {Record<string, any>} row
 */
export function buildQuestionFormFromRow(row) {
  const type = row.type
  const mapped =
    row.options?.length > 0
      ? row.options.map((o) => ({
          label: o.label,
          text: o.text,
          isCorrect: o.isCorrect,
        }))
      : []

  return {
    subjectUuid: row.subject?.uuid ?? '',
    bookUuids: (row.books ?? (row.book ? [row.book] : [])).map((b) => b.uuid),
    lessonUuids: (row.lessons ?? []).map((l) => l.uuid),
    boardUuids: (row.boards ?? []).map((b) => b.uuid),
    suiteUuids: (row.suites ?? []).map((s) => s.uuid),
    type,
    difficulty: row.difficulty,
    score: String(row.score ?? '1'),
    stem: row.stem,
    explanation: row.explanation ?? '',
    options: optionsForQuestionType(type, mapped),
  }
}
