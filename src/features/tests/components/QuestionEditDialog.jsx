import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
import { QuestionAnswerFields } from '@/features/tests/components/QuestionAnswerFields'
import { QuestionLinkMultiSelect } from '@/features/tests/components/QuestionLinkMultiSelect'
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS } from '@/features/tests/constants'
import {
  buildOptionsPayload,
  buildQuestionFormFromRow,
  optionsForQuestionType,
  validateQuestionAnswers,
} from '@/features/tests/lib/question-form-options'
import {
  fetchTestBoards,
  fetchTestBooks,
  fetchTestLessons,
  fetchTestQuestion,
  fetchTestSubjects,
  fetchTestSuites,
  updateTestQuestion,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qkQ = ['tests', 'questions']
const qkSubjects = ['tests', 'subjects']
const qkBooks = ['tests', 'books']
const qkLessons = ['tests', 'lessons']
const qkBoards = ['tests', 'boards']
const qkSuites = ['tests', 'suites']

/**
 * Edit an existing question in a modal (used from Review → My flagged items).
 * @param {{
 *   open: boolean,
 *   questionUuid: string | null,
 *   onClose: () => void,
 *   onSaved?: () => void,
 * }} props
 */
export function QuestionEditDialog({ open, questionUuid, onClose, onSaved }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(null)

  const questionQuery = useQuery({
    queryKey: ['tests', 'question', questionUuid],
    queryFn: () => fetchTestQuestion(questionUuid),
    enabled: open && Boolean(questionUuid),
  })

  useEffect(() => {
    if (!open) {
      setForm(null)
      return
    }
    if (questionQuery.data) {
      setForm(buildQuestionFormFromRow(questionQuery.data))
    }
  }, [open, questionQuery.data])

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: open,
  })

  const booksForFormParams = form?.subjectUuid ? { subjectUuid: form.subjectUuid } : {}
  const { data: booksForForm = [] } = useQuery({
    queryKey: [...qkBooks, 'form', booksForFormParams],
    queryFn: () => fetchTestBooks(booksForFormParams),
    enabled: open && Boolean(form?.subjectUuid),
  })

  const lessonsForFormParams = useMemo(() => {
    if (!form?.subjectUuid) return null
    const params = { subjectUuid: form.subjectUuid }
    if (form.bookUuids.length > 0) {
      params.bookUuids = form.bookUuids.join(',')
    }
    return params
  }, [form?.subjectUuid, form?.bookUuids])

  const { data: lessonsForForm = [] } = useQuery({
    queryKey: [...qkLessons, 'form', lessonsForFormParams],
    queryFn: () => fetchTestLessons(lessonsForFormParams),
    enabled: open && Boolean(form?.subjectUuid && form.bookUuids.length > 0),
  })

  const visibleLessonOptions = useMemo(
    () => lessonsForForm.map((l) => ({ uuid: l.uuid, label: l.name })),
    [lessonsForForm],
  )

  const { data: boardsForForm = [] } = useQuery({
    queryKey: [...qkBoards, 'form'],
    queryFn: fetchTestBoards,
    enabled: open,
  })

  const { data: suitesForForm = [] } = useQuery({
    queryKey: [...qkSuites, 'form'],
    queryFn: fetchTestSuites,
    enabled: open,
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestQuestion(questionUuid, {
        subjectUuid: form.subjectUuid.trim(),
        bookUuids: form.bookUuids,
        lessonUuids: form.lessonUuids,
        boardUuids: form.boardUuids,
        suiteUuids: form.suiteUuids,
        type: form.type,
        difficulty: form.difficulty,
        score: form.score,
        stem: form.stem.trim(),
        explanation: form.explanation.trim() || null,
        options: buildOptionsPayload(form.type, form),
      }),
    onSuccess: () => {
      notifySuccess('Question updated')
      void queryClient.invalidateQueries({ queryKey: qkQ })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      void queryClient.invalidateQueries({ queryKey: ['review'] })
      onSaved?.()
      onClose()
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update question')
      notifyError(message)
    },
  })

  function handleTypeChange(newType) {
    setForm((s) => ({
      ...s,
      type: newType,
      options: optionsForQuestionType(newType, s.options),
      score: newType === 'ESSAY' ? '0' : s.type === 'ESSAY' ? '1' : s.score,
    }))
  }

  function submit(e) {
    e.preventDefault()
    const validationError = validateQuestionAnswers(form.type, form)
    if (validationError) {
      notifyError(validationError)
      return
    }
    updateMu.mutate()
  }

  const loading = questionQuery.isLoading || !form
  const closeDisabled = updateMu.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      closeDisabled={closeDisabled}
      aria-labelledby="question-edit-dialog-title"
    >
      <ModalHeader
        title="Edit question"
        description="Question text, scoring, difficulty, and answer options."
        titleId="question-edit-dialog-title"
        onClose={onClose}
        closeDisabled={closeDisabled}
      />
      {questionQuery.isError ? (
        <>
          <ModalBody>
            <p className="text-sm text-destructive">
              {questionQuery.error?.message ?? 'Unable to load this question.'}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </ModalFooter>
        </>
      ) : loading ? (
        <ModalBody>
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          </div>
        </ModalBody>
      ) : (
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <ModalBody className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-q-subject">Subject</Label>
              <select
                id="review-q-subject"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={form.subjectUuid}
                onChange={(e) =>
                  setForm((s) => ({
                    ...s,
                    subjectUuid: e.target.value,
                    bookUuids: [],
                    lessonUuids: [],
                    boardUuids: [],
                    suiteUuids: [],
                  }))
                }
                disabled={updateMu.isPending}
                required
              >
                <option value="">Select…</option>
                {subjects.map((s) => (
                  <option key={s.uuid} value={s.uuid}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuestionLinkMultiSelect
                label="Books (optional)"
                emptyLabel="No books for this subject"
                options={booksForForm.map((b) => ({ uuid: b.uuid, label: b.title }))}
                selected={form.bookUuids}
                disabled={updateMu.isPending || !form.subjectUuid}
                onChange={(bookUuids) =>
                  setForm((s) => ({
                    ...s,
                    bookUuids,
                    lessonUuids: [],
                  }))
                }
              />
              <QuestionLinkMultiSelect
                label="Lessons (optional)"
                emptyLabel={
                  !form.subjectUuid
                    ? 'Select subject first'
                    : form.bookUuids.length === 0
                      ? 'Select a book first'
                      : 'No lessons for selected book(s)'
                }
                options={visibleLessonOptions}
                selected={form.lessonUuids}
                disabled={updateMu.isPending || !form.subjectUuid || form.bookUuids.length === 0}
                onChange={(lessonUuids) => setForm((s) => ({ ...s, lessonUuids }))}
              />
              <QuestionLinkMultiSelect
                label="Boards (optional)"
                emptyLabel="No boards yet"
                options={boardsForForm.map((b) => ({
                  uuid: b.uuid,
                  label: b.code ? `${b.code} — ${b.name}` : b.name,
                }))}
                selected={form.boardUuids}
                disabled={updateMu.isPending}
                onChange={(boardUuids) => setForm((s) => ({ ...s, boardUuids }))}
              />
              <QuestionLinkMultiSelect
                label="Licenses (optional)"
                emptyLabel="No licenses yet"
                options={suitesForForm.map((s) => ({
                  uuid: s.uuid,
                  label: `${s.name} (${s.slug})`,
                }))}
                selected={form.suiteUuids}
                disabled={updateMu.isPending}
                onChange={(suiteUuids) => setForm((s) => ({ ...s, suiteUuids }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="review-q-type">Type</Label>
                <select
                  id="review-q-type"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={form.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={updateMu.isPending}
                >
                  {QUESTION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-q-diff">Difficulty</Label>
                <select
                  id="review-q-diff"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={form.difficulty}
                  onChange={(e) => setForm((s) => ({ ...s, difficulty: e.target.value }))}
                  disabled={updateMu.isPending}
                >
                  {DIFFICULTY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-q-score">Score</Label>
                <Input
                  id="review-q-score"
                  value={form.score}
                  onChange={(e) => setForm((s) => ({ ...s, score: e.target.value }))}
                  disabled={updateMu.isPending}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-q-question-text">Question text</Label>
              <textarea
                id="review-q-question-text"
                className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={form.stem}
                onChange={(e) => setForm((s) => ({ ...s, stem: e.target.value }))}
                disabled={updateMu.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-q-expl">Explanation (optional)</Label>
              <textarea
                id="review-q-expl"
                className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                value={form.explanation}
                onChange={(e) => setForm((s) => ({ ...s, explanation: e.target.value }))}
                disabled={updateMu.isPending}
              />
            </div>
            <QuestionAnswerFields
              type={form.type}
              options={form.options}
              disabled={updateMu.isPending}
              onChange={(options) => setForm((s) => ({ ...s, options }))}
            />
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={updateMu.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMu.isPending}>
              {updateMu.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              Save
            </Button>
          </ModalFooter>
        </form>
      )}
    </Modal>
  )
}
