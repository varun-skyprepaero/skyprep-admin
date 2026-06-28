/** @typedef {{ id: string, code: string, name: string }} DemoBoard */
/** @typedef {{ id: string, boardId: string, slug: string, name: string }} DemoSuite */
/** @typedef {{ id: string, name: string }} DemoSubject */
/**
 * @typedef {Object} DemoExamSection
 * @property {string} id
 * @property {string} subjectId
 * @property {number} questionCount
 * @property {number} marksPerQuestion
 * @property {number} timeLimitMinutes
 * @property {number} passMinPercent
 */

/**
 * @typedef {Object} DemoExam
 * @property {string} id
 * @property {string} boardId
 * @property {string} suiteId
 * @property {string} name
 * @property {DemoExamSection[]} sections
 */

export const DEMO_BOARDS = /** @type {DemoBoard[]} */ ([
  { id: 'board-dgca', code: 'DGCA', name: 'Directorate General of Civil Aviation (India)' },
  { id: 'board-faa', code: 'FAA', name: 'Federal Aviation Administration (United States)' },
  { id: 'board-easa', code: 'EASA', name: 'European Union Aviation Safety Agency' },
])

export const DEMO_SUITES = /** @type {DemoSuite[]} */ ([
  { id: 'suite-dgca-ppl', boardId: 'board-dgca', slug: 'ppl', name: 'PPL' },
  { id: 'suite-dgca-cpl', boardId: 'board-dgca', slug: 'cpl', name: 'CPL' },
  { id: 'suite-dgca-atpl', boardId: 'board-dgca', slug: 'atpl', name: 'ATPL' },
  { id: 'suite-faa-ppl', boardId: 'board-faa', slug: 'ppl', name: 'PPL' },
  { id: 'suite-faa-cpl', boardId: 'board-faa', slug: 'cpl', name: 'CPL' },
  { id: 'suite-easa-atpl', boardId: 'board-easa', slug: 'atpl', name: 'ATPL' },
])

export const DEMO_SUBJECTS = /** @type {DemoSubject[]} */ ([
  { id: 'subj-air-nav', name: 'Air Navigation' },
  { id: 'subj-meteo', name: 'Meteorology' },
  { id: 'subj-air-reg', name: 'Air Regulation' },
  { id: 'subj-tech-gen', name: 'Technical General' },
  { id: 'subj-tech-specific', name: 'Technical Specific' },
  { id: 'subj-radio', name: 'Radio Telephony' },
  { id: 'subj-human-factors', name: 'Human Factors' },
])

/** @returns {DemoExam[]} */
export function createInitialDemoExams() {
  return [
    {
      id: 'exam-dgca-cpl',
      boardId: 'board-dgca',
      suiteId: 'suite-dgca-cpl',
      name: 'DGCA — CPL',
      sections: [
        {
          id: 'sec-1',
          subjectId: 'subj-air-nav',
          questionCount: 40,
          marksPerQuestion: 2,
          timeLimitMinutes: 60,
          passMinPercent: 50,
        },
        {
          id: 'sec-2',
          subjectId: 'subj-meteo',
          questionCount: 30,
          marksPerQuestion: 2,
          timeLimitMinutes: 45,
          passMinPercent: 55,
        },
        {
          id: 'sec-3',
          subjectId: 'subj-air-reg',
          questionCount: 25,
          marksPerQuestion: 2,
          timeLimitMinutes: 40,
          passMinPercent: 60,
        },
      ],
    },
    {
      id: 'exam-dgca-atpl',
      boardId: 'board-dgca',
      suiteId: 'suite-dgca-atpl',
      name: 'DGCA — ATPL',
      sections: [
        {
          id: 'sec-4',
          subjectId: 'subj-air-nav',
          questionCount: 50,
          marksPerQuestion: 2,
          timeLimitMinutes: 75,
          passMinPercent: 60,
        },
        {
          id: 'sec-5',
          subjectId: 'subj-tech-gen',
          questionCount: 45,
          marksPerQuestion: 2,
          timeLimitMinutes: 70,
          passMinPercent: 55,
        },
        {
          id: 'sec-6',
          subjectId: 'subj-human-factors',
          questionCount: 20,
          marksPerQuestion: 1,
          timeLimitMinutes: 30,
          passMinPercent: 50,
        },
      ],
    },
    {
      id: 'exam-faa-ppl',
      boardId: 'board-faa',
      suiteId: 'suite-faa-ppl',
      name: 'FAA — PPL',
      sections: [
        {
          id: 'sec-7',
          subjectId: 'subj-air-reg',
          questionCount: 35,
          marksPerQuestion: 1,
          timeLimitMinutes: 50,
          passMinPercent: 70,
        },
        {
          id: 'sec-8',
          subjectId: 'subj-meteo',
          questionCount: 25,
          marksPerQuestion: 1,
          timeLimitMinutes: 40,
          passMinPercent: 70,
        },
      ],
    },
  ]
}

export function formatExamName(boardCode, suiteName) {
  return `${boardCode} — ${suiteName}`
}

export function suitesForBoard(boardId) {
  return DEMO_SUITES.filter((s) => s.boardId === boardId)
}

export function findBoard(id) {
  return DEMO_BOARDS.find((b) => b.id === id) ?? null
}

export function findSuite(id) {
  return DEMO_SUITES.find((s) => s.id === id) ?? null
}

export function findSubject(id) {
  return DEMO_SUBJECTS.find((s) => s.id === id) ?? null
}
