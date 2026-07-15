import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DataTable,
  DataTableActionsHeader,
  DataTableContent,
  DataTablePagination,
  DataTableRowActions,
  DataTableToolbar,
  dataTableSelectClass,
} from '@/components/ui/data-table'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuestionAnswerFields } from '@/features/tests/components/QuestionAnswerFields'
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS } from '@/features/tests/constants'
import {
  buildOptionsPayload,
  defaultChoiceOptions,
  optionsForQuestionType,
  validateQuestionAnswers,
} from '@/features/tests/lib/question-form-options'
import { QuestionLinkMultiSelect } from '@/features/tests/components/QuestionLinkMultiSelect'
import { QuestionViewContent } from '@/features/tests/components/QuestionViewContent'
import {
  createTestQuestion,
  deleteTestQuestion,
  fetchTestBoards,
  fetchTestBooks,
  fetchTestLessons,
  fetchTestQuestions,
  fetchTestSubjects,
  fetchTestSuites,
  updateTestQuestion,
} from '@/features/tests/api/tests-api'
import { applyReviewDecision } from '@/features/review/api/review-api'
import { ReviewStatusBadge } from '@/features/review/components/review-status-badge'
import { ReviewActionDialog } from '@/features/review/components/review-action-dialog'
import { REVIEW_STATUS_FILTER_OPTIONS } from '@/features/review/constants'
import { hasPermission, isSuperAdmin } from '@/features/auth/lib/admin-section-access'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissionsStore } from '@/stores/permissions-store'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const FILTER_NO_LESSON = '__no_lesson__'

const qkQ = ['tests', 'questions']
const qkSubjects = ['tests', 'subjects']
const qkBooks = ['tests', 'books']
const qkLessons = ['tests', 'lessons']
const qkBoards = ['tests', 'boards']
const qkSuites = ['tests', 'suites']

export default function TestsQuestionsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const matrix = usePermissionsStore((s) => s.matrix)
  const canReviewEdit = isSuperAdmin(user) || hasPermission(matrix, 'review.queue', 'edit', user)
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [lessonFilter, setLessonFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [reviewFilter, setReviewFilter] = useState('')
  const [reviewAction, setReviewAction] = useState(
    /** @type {null | { mode: 'flag' | 'resolve', row: any }} */ (null),
  )
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    subjectUuid: '',
    bookUuids: [],
    lessonUuids: [],
    boardUuids: [],
    suiteUuids: [],
    type: 'SINGLE_CHOICE',
    difficulty: 'MEDIUM',
    score: '1',
    stem: '',
    explanation: '',
    options: defaultChoiceOptions(),
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const listParams = useMemo(() => {
    const params = {}
    if (subjectFilter === FILTER_NO_LESSON) {
      params.noLesson = true
    } else if (subjectFilter) {
      params.subjectUuid = subjectFilter
    }
    if (lessonFilter === FILTER_NO_LESSON) {
      params.noLesson = true
    } else if (lessonFilter) {
      params.lessonUuid = lessonFilter
    }
    if (difficultyFilter) params.difficulty = difficultyFilter
    if (reviewFilter) params.reviewStatus = reviewFilter
    return params
  }, [subjectFilter, lessonFilter, difficultyFilter, reviewFilter])

  const subjectSelected =
    Boolean(subjectFilter) && subjectFilter !== FILTER_NO_LESSON
  const lessonsFilterParams = subjectSelected ? { subjectUuid: subjectFilter } : {}
  const { data: lessonsForFilter = [] } = useQuery({
    queryKey: [...qkLessons, 'filter', lessonsFilterParams],
    queryFn: () => fetchTestLessons(lessonsFilterParams),
    enabled: subjectSelected,
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: [...qkQ, listParams],
    queryFn: () => fetchTestQuestions(listParams),
    enabled: true,
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.stem.toLowerCase().includes(q) ||
        (row.subject?.name ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const viewParam = searchParams.get('view')
  useEffect(() => {
    if (!viewParam || !data.length) return
    const match = data.find((q) => q.uuid === viewParam)
    if (!match) return
    openView(match)
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewParam, data])

  const createMu = useMutation({
    mutationFn: () =>
      createTestQuestion({
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
      notifySuccess('Question created')
      void queryClient.invalidateQueries({ queryKey: qkQ })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create question')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestQuestion(dialog.uuid, {
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
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update question')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestQuestion(uuid),
    onSuccess: () => {
      notifySuccess('Question deleted')
      void queryClient.invalidateQueries({ queryKey: qkQ })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete question')
      notifyError(message)
    },
  })

  const reviewMu = useMutation({
    mutationFn: ({ uuid, status, note }) =>
      applyReviewDecision({ entityType: 'question', uuid, status, note }),
    onSuccess: (_data, variables) => {
      notifySuccess(variables.status === 'FLAGGED' ? 'Marked for review' : 'Review resolved')
      void queryClient.invalidateQueries({ queryKey: qkQ })
      void queryClient.invalidateQueries({ queryKey: ['review'] })
      setReviewAction(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update review')
      notifyError(message)
    },
  })

  const booksForFormParams = form.subjectUuid
    ? { subjectUuid: form.subjectUuid }
    : {}
  const { data: booksForForm = [] } = useQuery({
    queryKey: [...qkBooks, 'form', booksForFormParams],
    queryFn: () => fetchTestBooks(booksForFormParams),
    enabled: Boolean(dialog && form.subjectUuid),
  })

  const lessonsForFormParams = form.subjectUuid
    ? { subjectUuid: form.subjectUuid }
    : {}
  const { data: lessonsForForm = [] } = useQuery({
    queryKey: [...qkLessons, 'form', lessonsForFormParams],
    queryFn: () => fetchTestLessons(lessonsForFormParams),
    enabled: Boolean(dialog && form.subjectUuid),
  })

  const { data: boardsForForm = [] } = useQuery({
    queryKey: [...qkBoards, 'form'],
    queryFn: fetchTestBoards,
    enabled: Boolean(dialog),
  })

  const { data: suitesForForm = [] } = useQuery({
    queryKey: [...qkSuites, 'form'],
    queryFn: fetchTestSuites,
    enabled: Boolean(dialog),
  })

  function openCreate() {
    setForm({
      subjectUuid: subjectFilter || '',
      bookUuids: [],
      lessonUuids: [],
      boardUuids: [],
      suiteUuids: [],
      type: 'SINGLE_CHOICE',
      difficulty: 'MEDIUM',
      score: '1',
      stem: '',
      explanation: '',
      options: defaultChoiceOptions(),
    })
    setDialog({ mode: 'create' })
  }

  function openView(row) {
    setDialog({ mode: 'view', row })
  }

  function openEdit(row) {
    const type = row.type
    const mapped =
      row.options?.length > 0
        ? row.options.map((o) => ({
            label: o.label,
            text: o.text,
            isCorrect: o.isCorrect,
          }))
        : []
    setForm({
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
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

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
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Question text, scoring, difficulty, and answer options.
          </CardDescription>
        </CardHeader>
        <DataTable>
          <DataTableToolbar
            searchValue={search}
            onSearchChange={(value) => {
              setSearch(value)
              resetPage()
            }}
          >
            <select
              className={dataTableSelectClass}
              aria-label="Filter by subject"
              value={subjectFilter}
              onChange={(e) => {
                setSubjectFilter(e.target.value)
                setLessonFilter('')
                resetPage()
              }}
            >
              <option value="">All subjects</option>
              <option value={FILTER_NO_LESSON}>No subject</option>
              {subjects.map((s) => (
                <option key={s.uuid} value={s.uuid}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className={dataTableSelectClass}
              aria-label="Filter by lesson"
              value={lessonFilter}
              disabled={!subjectSelected}
              onChange={(e) => {
                setLessonFilter(e.target.value)
                resetPage()
              }}
            >
              <option value="">
                {subjectSelected ? 'All lessons' : 'Select subject first'}
              </option>
              <option value={FILTER_NO_LESSON}>No lesson</option>
              {lessonsForFilter.map((lesson) => (
                <option key={lesson.uuid} value={lesson.uuid}>
                  {lesson.name}
                </option>
              ))}
            </select>
            <select
              className={dataTableSelectClass}
              aria-label="Filter by difficulty"
              value={difficultyFilter}
              onChange={(e) => {
                setDifficultyFilter(e.target.value)
                resetPage()
              }}
            >
              <option value="">All difficulties</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={dataTableSelectClass}
              aria-label="Filter by review status"
              value={reviewFilter}
              onChange={(e) => {
                setReviewFilter(e.target.value)
                resetPage()
              }}
            >
              {REVIEW_STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'any'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Add question
            </Button>
          </DataTableToolbar>
          <DataTableContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : isError ? (
              <p className="p-6 text-sm text-destructive">{error?.message ?? 'Unable to load'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Question text</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Books</th>
                      <th className="px-4 py-3 font-medium">Lessons</th>
                      <th className="px-4 py-3 font-medium">Boards</th>
                      <th className="px-4 py-3 font-medium">Licenses</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Difficulty</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Review</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No questions yet.'
                            : 'No results match your filters.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 align-top last:border-0">
                          <td className="max-w-md px-4 py-3">
                            <span className="line-clamp-2">{row.stem}</span>
                          </td>
                          <td className="px-4 py-3">{row.subject?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs">
                            {(row.books ?? (row.book ? [row.book] : []))
                              .map((b) => b.title)
                              .join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {(row.lessons ?? []).map((l) => l.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {(row.boards ?? []).map((b) => b.code || b.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {(row.suites ?? []).map((s) => s.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">{row.type}</td>
                          <td className="px-4 py-3 text-xs">{row.difficulty}</td>
                          <td className="px-4 py-3">{row.score}</td>
                          <td className="px-4 py-3">
                            <ReviewStatusBadge status={row.reviewStatus} />
                            {row.reviewNote && row.reviewStatus === 'FLAGGED' ? (
                              <span
                                className="mt-1 block max-w-[14rem] truncate text-[11px] text-muted-foreground"
                                title={row.reviewNote}
                              >
                                {row.reviewNote}
                              </span>
                            ) : null}
                          </td>
                          <DataTableRowActions
                            rowId={row.uuid}
                            disabled={deleteMu.isPending || reviewMu.isPending}
                            items={[
                              {
                                label: 'Edit',
                                onClick: () => openEdit(row),
                              },
                              ...(canReviewEdit
                                ? [
                                    {
                                      label:
                                        row.reviewStatus === 'FLAGGED'
                                          ? 'Update review note'
                                          : 'Mark for review',
                                      onClick: () => setReviewAction({ mode: 'flag', row }),
                                    },
                                    ...(row.reviewStatus !== 'OK' && row.reviewStatus !== 'RESOLVED'
                                      ? [
                                          {
                                            label: 'Resolve review',
                                            onClick: () =>
                                              setReviewAction({ mode: 'resolve', row }),
                                          },
                                        ]
                                      : []),
                                  ]
                                : []),
                              {
                                label: 'Delete',
                                destructive: true,
                                disabled: deleteMu.isPending,
                                onClick: () =>
                                  setDeleteTarget({
                                    uuid: row.uuid,
                                    label: row.stem.slice(0, 80) || 'this question',
                                  }),
                              },
                            ]}
                          />
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </DataTableContent>
          {!isLoading && !isError ? <DataTablePagination {...paginationProps} /> : null}
        </DataTable>
      </Card>

      {dialog ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => !createMu.isPending && !updateMu.isPending && setDialog(null)}
        >
          <Card
            className="relative z-10 max-h-[92vh] w-full max-w-2xl overflow-y-auto shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>
                {dialog.mode === 'create'
                  ? 'New question'
                  : dialog.mode === 'view'
                    ? 'Question'
                    : 'Edit question'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dialog.mode === 'view' ? (
                <div className="space-y-4">
                  <QuestionViewContent question={dialog.row} />
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => openEdit(dialog.row)}>
                      Edit
                    </Button>
                    <Button type="button" onClick={() => setDialog(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              ) : (
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="q-subject">Subject</Label>
                  <select
                    id="q-subject"
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
                    disabled={createMu.isPending || updateMu.isPending}
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
                    disabled={createMu.isPending || updateMu.isPending || !form.subjectUuid}
                    onChange={(bookUuids) => setForm((s) => ({ ...s, bookUuids }))}
                  />
                  <QuestionLinkMultiSelect
                    label="Lessons (optional)"
                    emptyLabel="No lessons for this subject"
                    options={lessonsForForm.map((l) => ({ uuid: l.uuid, label: l.name }))}
                    selected={form.lessonUuids}
                    disabled={createMu.isPending || updateMu.isPending || !form.subjectUuid}
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
                    disabled={createMu.isPending || updateMu.isPending}
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
                    disabled={createMu.isPending || updateMu.isPending}
                    onChange={(suiteUuids) => setForm((s) => ({ ...s, suiteUuids }))}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="q-type">Type</Label>
                    <select
                      id="q-type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={form.type}
                      onChange={(e) => handleTypeChange(e.target.value)}
                      disabled={createMu.isPending || updateMu.isPending}
                    >
                      {QUESTION_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="q-diff">Difficulty</Label>
                    <select
                      id="q-diff"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={form.difficulty}
                      onChange={(e) => setForm((s) => ({ ...s, difficulty: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                    >
                      {DIFFICULTY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="q-score">Score</Label>
                    <Input
                      id="q-score"
                      value={form.score}
                      onChange={(e) => setForm((s) => ({ ...s, score: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-question-text">Question text</Label>
                  <textarea
                    id="q-question-text"
                    className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={form.stem}
                    onChange={(e) => setForm((s) => ({ ...s, stem: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="q-expl">Explanation (optional)</Label>
                  <textarea
                    id="q-expl"
                    className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={form.explanation}
                    onChange={(e) => setForm((s) => ({ ...s, explanation: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  />
                </div>

                <QuestionAnswerFields
                  type={form.type}
                  options={form.options}
                  disabled={createMu.isPending || updateMu.isPending}
                  onChange={(options) => setForm((s) => ({ ...s, options }))}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialog(null)}
                    disabled={createMu.isPending || updateMu.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMu.isPending || updateMu.isPending}>
                    {(createMu.isPending || updateMu.isPending) && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    Save
                  </Button>
                </div>
              </form>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete question?"
        description={
          deleteTarget ? (
            <>
              Delete{' '}
              <span className="font-medium text-foreground">{deleteTarget.label}</span>? This cannot
              be undone.
            </>
          ) : null
        }
        loading={deleteMu.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMu.mutate(deleteTarget.uuid)}
      />

      <ReviewActionDialog
        open={Boolean(reviewAction)}
        mode={reviewAction?.mode ?? 'flag'}
        itemTitle={reviewAction?.row?.stem?.slice(0, 80)}
        currentNote={reviewAction?.row?.reviewNote}
        loading={reviewMu.isPending}
        onClose={() => !reviewMu.isPending && setReviewAction(null)}
        onConfirm={(note) =>
          reviewAction &&
          reviewMu.mutate({
            uuid: reviewAction.row.uuid,
            status: reviewAction.mode === 'flag' ? 'FLAGGED' : 'RESOLVED',
            note,
          })
        }
      />
    </div>
  )
}
