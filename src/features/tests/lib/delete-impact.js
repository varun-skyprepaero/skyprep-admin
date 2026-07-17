/** @param {number} count @param {string} singular @param {string} [plural] */
function countLabel(count, singular, plural = `${singular}s`) {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? singular : plural}`
}

/** @param {string[]} parts */
function joinList(parts) {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`
}

/**
 * Turn API delete-impact counts into short, user-friendly bullets.
 * @param {string} entityType
 * @param {Record<string, unknown> | null | undefined} impact
 * @returns {string[]}
 */
export function formatDeleteImpact(entityType, impact) {
  if (!impact) return []

  const type = entityType === 'license' ? 'suite' : entityType === 'quiz' ? 'package' : entityType

  switch (type) {
    case 'question': {
      const links = [
        impact.bookCount > 0 ? countLabel(impact.bookCount, 'book') : null,
        impact.lessonCount > 0 ? countLabel(impact.lessonCount, 'lesson') : null,
        impact.boardCount > 0 ? countLabel(impact.boardCount, 'board') : null,
        impact.suiteCount > 0 ? countLabel(impact.suiteCount, 'license') : null,
      ].filter(Boolean)

      const items = []
      if (links.length) {
        items.push(`It will be removed from ${joinList(links)}.`)
      } else {
        items.push('It is not linked to any books, lessons, boards, or licenses.')
      }

      if (impact.attemptCount > 0) {
        items.push(
          `Student answers from ${countLabel(impact.attemptCount, 'test attempt')} will be permanently removed.`,
        )
      } else {
        items.push('No students have answered this question yet.')
      }

      items.push('Any exam or package pools that include it will have one fewer question available.')
      return items
    }
    case 'book': {
      const items = []
      if (impact.questionCount > 0) {
        items.push(
          `${countLabel(impact.questionCount, 'question')} will lose this book link (the questions stay).`,
        )
      } else {
        items.push('No questions are linked to this book.')
      }
      if (impact.packageCount > 0) {
        items.push(
          `${countLabel(impact.packageCount, 'test series or quiz', 'test series or quizzes')} will stop filtering by this book.`,
        )
      } else {
        items.push('No test series or quizzes use this book as a filter.')
      }
      return items
    }
    case 'lesson': {
      if (impact.questionCount > 0) {
        return [
          `${countLabel(impact.questionCount, 'question')} will lose this lesson link (the questions stay).`,
        ]
      }
      return ['No questions are linked to this lesson.']
    }
    case 'subject': {
      const items = []
      if (impact.questionCount > 0 || impact.lessonCount > 0) {
        items.push(
          `This permanently deletes ${countLabel(impact.questionCount, 'question')} and ${countLabel(impact.lessonCount, 'lesson')}.`,
        )
      } else {
        items.push('There are no questions or lessons under this subject yet.')
      }
      if (impact.bookCount > 0) {
        items.push(
          `${countLabel(impact.bookCount, 'book')} will become unassigned (books are kept).`,
        )
      }
      if (impact.packageCount > 0) {
        items.push(
          `${countLabel(impact.packageCount, 'test series or quiz', 'test series or quizzes')} will stop filtering by this subject.`,
        )
      }
      if (impact.examSectionCount > 0) {
        items.push(
          `Delete may fail: ${countLabel(impact.examSectionCount, 'exam section')} still uses this subject — reassign those first.`,
        )
      }
      return items
    }
    case 'exam': {
      return [
        impact.sectionCount > 0
          ? `${countLabel(impact.sectionCount, 'section')} will be deleted.`
          : 'This exam has no sections.',
        impact.attemptCount > 0
          ? `${countLabel(impact.attemptCount, 'student attempt')} will be permanently erased.`
          : 'No students have taken this exam yet.',
        'The question bank itself is not deleted.',
      ]
    }
    case 'board': {
      return [
        impact.examCount > 0
          ? `${countLabel(impact.examCount, 'exam')} on this board (and all their student attempts) will be deleted.`
          : 'No exams are tied to this board.',
        impact.questionCount > 0
          ? `${countLabel(impact.questionCount, 'question')} will lose this board link.`
          : 'No questions are linked to this board.',
        impact.packageCount > 0
          ? `${countLabel(impact.packageCount, 'test series or quiz', 'test series or quizzes')} will stop filtering by this board.`
          : 'No test series or quizzes use this board as a filter.',
        impact.licenseCount > 0
          ? `${countLabel(impact.licenseCount, 'license pairing')} will be removed.`
          : 'No license pairings are set for this board.',
      ]
    }
    case 'suite': {
      return [
        impact.examCount > 0
          ? `${countLabel(impact.examCount, 'exam')} on this license (and all their student attempts) will be deleted.`
          : 'No exams are tied to this license.',
        impact.questionCount > 0
          ? `${countLabel(impact.questionCount, 'question')} will lose this license link.`
          : 'No questions are linked to this license.',
        impact.packageCount > 0
          ? `${countLabel(impact.packageCount, 'test series or quiz', 'test series or quizzes')} will stop filtering by this license.`
          : 'No test series or quizzes use this license as a filter.',
        impact.boardCount > 0
          ? `It will be removed from ${countLabel(impact.boardCount, 'board')}.`
          : 'It is not linked to any boards.',
      ]
    }
    case 'package': {
      const filterParts = [
        impact.subjectCount > 0 ? countLabel(impact.subjectCount, 'subject') : null,
        impact.bookCount > 0 ? countLabel(impact.bookCount, 'book') : null,
        impact.boardCount > 0 ? countLabel(impact.boardCount, 'board') : null,
        impact.suiteCount > 0 ? countLabel(impact.suiteCount, 'license') : null,
      ].filter(Boolean)
      return [
        filterParts.length
          ? `Its filters for ${joinList(filterParts)} will be removed.`
          : 'It has no subject, book, board, or license filters.',
        impact.attemptCount > 0
          ? `${countLabel(impact.attemptCount, 'student attempt')} will be permanently erased.`
          : 'No students have taken this yet.',
      ]
    }
    default:
      return ['Related links may be removed, and this cannot be undone.']
  }
}

/** Fallback copy when impact counts cannot be loaded. */
export function deleteImpactFallback() {
  return [
    'We could not load exact dependency counts. Related links and student data may still be removed.',
    'This cannot be undone — prefer editing if you only need to fix details.',
  ]
}
