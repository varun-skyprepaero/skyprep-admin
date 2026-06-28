import { findSubject } from '@/features/tests/demo/exams-demo-data'

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
 * @param {import('@/features/tests/demo/exams-demo-data').DemoExamSection[]} sections
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
 * @param {import('@/features/tests/demo/exams-demo-data').DemoExamSection} section
 */
export function sectionSummary(section) {
  const subject = findSubject(section.subjectId)
  const totalMarks = sectionTotalMarks(section)
  const passMarks = sectionPassMarks(section)
  return {
    subjectName: subject?.name ?? 'Unknown subject',
    totalMarks,
    passMarks,
  }
}
