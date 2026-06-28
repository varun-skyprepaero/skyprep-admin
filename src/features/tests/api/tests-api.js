import { apiClient } from '@/lib/http/api-client'

/** @param {import('axios').AxiosResponse} res */
function unwrap(res) {
  const body = res.data
  if (!body?.success) {
    const err = new Error(typeof body?.message === 'string' ? body.message : 'Request failed')
    err.response = { data: body }
    throw err
  }
  return body.data
}

export async function fetchTestSuites(params = {}) {
  const res = await apiClient.get('/bank/suites', { params })
  return unwrap(res).suites
}

export async function createTestSuite(payload) {
  const res = await apiClient.post('/bank/suites', payload)
  return unwrap(res).suite
}

export async function updateTestSuite(uuid, payload) {
  const res = await apiClient.patch(`/bank/suites/${uuid}`, payload)
  return unwrap(res).suite
}

export async function deleteTestSuite(uuid) {
  const res = await apiClient.delete(`/bank/suites/${uuid}`)
  return unwrap(res)
}

export async function fetchTestBoards() {
  const res = await apiClient.get('/bank/boards')
  return unwrap(res).boards
}

export async function createTestBoard(payload) {
  const res = await apiClient.post('/bank/boards', payload)
  return unwrap(res).board
}

export async function updateTestBoard(uuid, payload) {
  const res = await apiClient.patch(`/bank/boards/${uuid}`, payload)
  return unwrap(res).board
}

export async function deleteTestBoard(uuid) {
  const res = await apiClient.delete(`/bank/boards/${uuid}`)
  return unwrap(res)
}

export async function fetchTestExams(params = {}) {
  const res = await apiClient.get('/bank/exams', { params })
  return unwrap(res).exams
}

export async function createTestExam(payload) {
  const res = await apiClient.post('/bank/exams', payload)
  return unwrap(res).exam
}

export async function updateTestExam(uuid, payload) {
  const res = await apiClient.patch(`/bank/exams/${uuid}`, payload)
  return unwrap(res).exam
}

export async function deleteTestExam(uuid) {
  const res = await apiClient.delete(`/bank/exams/${uuid}`)
  return unwrap(res)
}

export async function fetchExamSectionPoolCount(payload) {
  const res = await apiClient.post('/bank/exams/section-pool-count', payload)
  return unwrap(res)
}

export async function fetchTestSubjects() {
  const res = await apiClient.get('/bank/subjects')
  return unwrap(res).subjects
}

export async function createTestSubject(payload) {
  const res = await apiClient.post('/bank/subjects', payload)
  return unwrap(res).subject
}

export async function updateTestSubject(uuid, payload) {
  const res = await apiClient.patch(`/bank/subjects/${uuid}`, payload)
  return unwrap(res).subject
}

export async function deleteTestSubject(uuid) {
  const res = await apiClient.delete(`/bank/subjects/${uuid}`)
  return unwrap(res)
}

export async function fetchTestBooks(params = {}) {
  const res = await apiClient.get('/bank/books', { params })
  return unwrap(res).books
}

export async function createTestBook(payload) {
  const res = await apiClient.post('/bank/books', payload)
  return unwrap(res).book
}

export async function updateTestBook(uuid, payload) {
  const res = await apiClient.patch(`/bank/books/${uuid}`, payload)
  return unwrap(res).book
}

export async function deleteTestBook(uuid) {
  const res = await apiClient.delete(`/bank/books/${uuid}`)
  return unwrap(res)
}

export async function fetchTestLessons(params = {}) {
  const res = await apiClient.get('/bank/lessons', { params })
  return unwrap(res).lessons
}

export async function createTestLesson(payload) {
  const res = await apiClient.post('/bank/lessons', payload)
  return unwrap(res).lesson
}

export async function updateTestLesson(uuid, payload) {
  const res = await apiClient.patch(`/bank/lessons/${uuid}`, payload)
  return unwrap(res).lesson
}

export async function deleteTestLesson(uuid) {
  const res = await apiClient.delete(`/bank/lessons/${uuid}`)
  return unwrap(res)
}

export async function fetchTestQuestions(params = {}) {
  const res = await apiClient.get('/bank/questions', { params })
  return unwrap(res).questions
}

export async function createTestQuestion(payload) {
  const res = await apiClient.post('/bank/questions', payload)
  return unwrap(res).question
}

export async function updateTestQuestion(uuid, payload) {
  const res = await apiClient.patch(`/bank/questions/${uuid}`, payload)
  return unwrap(res).question
}

export async function deleteTestQuestion(uuid) {
  const res = await apiClient.delete(`/bank/questions/${uuid}`)
  return unwrap(res)
}

export async function fetchTestPackages() {
  const res = await apiClient.get('/bank/packages')
  return unwrap(res).packages
}

export async function fetchTestPackageQuestionPoolCount(payload) {
  const res = await apiClient.post('/bank/packages/question-pool-count', payload)
  return unwrap(res)
}

export async function createTestPackage(payload) {
  const res = await apiClient.post('/bank/packages', payload)
  return unwrap(res).package
}

export async function updateTestPackage(uuid, payload) {
  const res = await apiClient.patch(`/bank/packages/${uuid}`, payload)
  return unwrap(res).package
}

export async function deleteTestPackage(uuid) {
  const res = await apiClient.delete(`/bank/packages/${uuid}`)
  return unwrap(res)
}

export async function fetchSubscriptionPlans() {
  const res = await apiClient.get('/subscriptions/admin/subscription-plans')
  return unwrap(res).plans
}

export async function createSubscriptionPlan(payload) {
  const res = await apiClient.post('/subscriptions/admin/subscription-plans', payload)
  return unwrap(res).plan
}

export async function createSubscriptionPlanPair(payload) {
  const res = await apiClient.post('/subscriptions/admin/subscription-plans/pair', payload)
  return unwrap(res).plans
}

export async function updateSubscriptionPlan(uuid, payload) {
  const res = await apiClient.patch(`/subscriptions/admin/subscription-plans/${uuid}`, payload)
  return unwrap(res).plan
}

export async function resyncSubscriptionPlan(uuid) {
  const res = await apiClient.post(`/subscriptions/admin/subscription-plans/${uuid}/resync`)
  return unwrap(res).plan
}

export async function deleteSubscriptionPlan(uuid) {
  const res = await apiClient.delete(`/subscriptions/admin/subscription-plans/${uuid}`)
  return unwrap(res)
}

export async function fetchTestSeriesSubscribers(params = {}) {
  const res = await apiClient.get('/subscriptions/admin/test-series-subscribers', { params })
  return unwrap(res)
}

export async function cancelTestSeriesSubscriber(uuid, payload = {}) {
  const res = await apiClient.post(
    `/subscriptions/admin/test-series-subscribers/${uuid}/cancel`,
    payload,
  )
  return unwrap(res).subscription
}

export async function grantTestSeriesSubscription(payload) {
  const res = await apiClient.post('/subscriptions/admin/test-series-subscribers/grant', payload)
  return unwrap(res).subscription
}

export async function fetchOneTimePurchases(params = {}) {
  const res = await apiClient.get('/purchases/admin/orders', { params })
  return unwrap(res)
}
