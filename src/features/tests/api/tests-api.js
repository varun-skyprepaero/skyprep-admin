import { testApi } from '@/lib/http/test-api-client'

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

export async function fetchTestSuites() {
  const res = await testApi.get('/bank/suites')
  return unwrap(res).suites
}

export async function createTestSuite(payload) {
  const res = await testApi.post('/bank/suites', payload)
  return unwrap(res).suite
}

export async function updateTestSuite(uuid, payload) {
  const res = await testApi.patch(`/bank/suites/${uuid}`, payload)
  return unwrap(res).suite
}

export async function deleteTestSuite(uuid) {
  const res = await testApi.delete(`/bank/suites/${uuid}`)
  return unwrap(res)
}

export async function fetchTestSubjects() {
  const res = await testApi.get('/bank/subjects')
  return unwrap(res).subjects
}

export async function createTestSubject(payload) {
  const res = await testApi.post('/bank/subjects', payload)
  return unwrap(res).subject
}

export async function updateTestSubject(uuid, payload) {
  const res = await testApi.patch(`/bank/subjects/${uuid}`, payload)
  return unwrap(res).subject
}

export async function deleteTestSubject(uuid) {
  const res = await testApi.delete(`/bank/subjects/${uuid}`)
  return unwrap(res)
}

export async function fetchTestBooks(params = {}) {
  const res = await testApi.get('/bank/books', { params })
  return unwrap(res).books
}

export async function createTestBook(payload) {
  const res = await testApi.post('/bank/books', payload)
  return unwrap(res).book
}

export async function updateTestBook(uuid, payload) {
  const res = await testApi.patch(`/bank/books/${uuid}`, payload)
  return unwrap(res).book
}

export async function deleteTestBook(uuid) {
  const res = await testApi.delete(`/bank/books/${uuid}`)
  return unwrap(res)
}

export async function fetchTestQuestions(params = {}) {
  const res = await testApi.get('/bank/questions', { params })
  return unwrap(res).questions
}

export async function createTestQuestion(payload) {
  const res = await testApi.post('/bank/questions', payload)
  return unwrap(res).question
}

export async function updateTestQuestion(uuid, payload) {
  const res = await testApi.patch(`/bank/questions/${uuid}`, payload)
  return unwrap(res).question
}

export async function deleteTestQuestion(uuid) {
  const res = await testApi.delete(`/bank/questions/${uuid}`)
  return unwrap(res)
}

export async function fetchTestPackages() {
  const res = await testApi.get('/bank/packages')
  return unwrap(res).packages
}

export async function createTestPackage(payload) {
  const res = await testApi.post('/bank/packages', payload)
  return unwrap(res).package
}

export async function updateTestPackage(uuid, payload) {
  const res = await testApi.patch(`/bank/packages/${uuid}`, payload)
  return unwrap(res).package
}

export async function deleteTestPackage(uuid) {
  const res = await testApi.delete(`/bank/packages/${uuid}`)
  return unwrap(res)
}
