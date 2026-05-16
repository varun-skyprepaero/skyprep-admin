import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
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
  DataTableContent,
  DataTablePagination,
  DataTableToolbar,
  dataTableSelectClass,
} from '@/components/ui/data-table'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS } from '@/features/tests/constants'
import {
  createTestQuestion,
  deleteTestQuestion,
  fetchTestBooks,
  fetchTestQuestions,
  fetchTestSubjects,
  updateTestQuestion,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qkQ = ['tests', 'questions']
const qkSubjects = ['tests', 'subjects']
const qkBooks = ['tests', 'books']

function defaultOptions() {
  return [
    { label: 'A', text: '', isCorrect: true },
    { label: 'B', text: '', isCorrect: false },
  ]
}

export default function TestsQuestionsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState({
    subjectUuid: '',
    bookUuid: '',
    type: 'SINGLE_CHOICE',
    difficulty: 'MEDIUM',
    score: '1',
    stem: '',
    explanation: '',
    options: defaultOptions(),
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const booksParams = subjectFilter ? { subjectUuid: subjectFilter } : {}
  const { data: booksForFilter = [] } = useQuery({
    queryKey: [...qkBooks, booksParams],
    queryFn: () => fetchTestBooks(booksParams),
    enabled: true,
  })

  const listParams = subjectFilter ? { subjectUuid: subjectFilter } : {}
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

  const createMu = useMutation({
    mutationFn: () =>
      createTestQuestion({
        subjectUuid: form.subjectUuid.trim(),
        bookUuid: form.bookUuid.trim() || null,
        type: form.type,
        difficulty: form.difficulty,
        score: form.score,
        stem: form.stem.trim(),
        explanation: form.explanation.trim() || null,
        options: form.options.map((o, idx) => ({
          label: o.label || String.fromCharCode(65 + idx),
          text: o.text,
          isCorrect: o.isCorrect,
        })),
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
        bookUuid: form.bookUuid.trim() || null,
        type: form.type,
        difficulty: form.difficulty,
        score: form.score,
        stem: form.stem.trim(),
        explanation: form.explanation.trim() || null,
        options: form.options.map((o, idx) => ({
          label: o.label || String.fromCharCode(65 + idx),
          text: o.text,
          isCorrect: o.isCorrect,
        })),
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
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete question')
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

  function openCreate() {
    setForm({
      subjectUuid: subjectFilter || '',
      bookUuid: '',
      type: 'SINGLE_CHOICE',
      difficulty: 'MEDIUM',
      score: '1',
      stem: '',
      explanation: '',
      options: defaultOptions(),
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      subjectUuid: row.subject?.uuid ?? '',
      bookUuid: row.book?.uuid ?? '',
      type: row.type,
      difficulty: row.difficulty,
      score: String(row.score ?? '1'),
      stem: row.stem,
      explanation: row.explanation ?? '',
      options:
        row.options?.length > 0
          ? row.options.map((o) => ({
              label: o.label,
              text: o.text,
              isCorrect: o.isCorrect,
            }))
          : defaultOptions(),
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  function addOption() {
    setForm((s) => {
      const idx = s.options.length
      return {
        ...s,
        options: [
          ...s.options,
          {
            label: String.fromCharCode(65 + idx),
            text: '',
            isCorrect: false,
          },
        ],
      }
    })
  }

  function removeOption(index) {
    setForm((s) => ({
      ...s,
      options: s.options.filter((_, i) => i !== index),
    }))
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
                resetPage()
              }}
            >
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s.uuid} value={s.uuid}>
                  {s.name}
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
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Difficulty</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No questions yet.'
                            : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 align-top last:border-0">
                          <td className="max-w-md px-4 py-3">
                            <span className="line-clamp-2">{row.stem}</span>
                          </td>
                          <td className="px-4 py-3">{row.subject?.name ?? '—'}</td>
                          <td className="px-4 py-3 text-xs">{row.type}</td>
                          <td className="px-4 py-3 text-xs">{row.difficulty}</td>
                          <td className="px-4 py-3">{row.score}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mr-1"
                              onClick={() => openEdit(row)}
                              aria-label="Edit question"
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={deleteMu.isPending}
                              onClick={() => {
                                if (window.confirm('Delete this question?')) {
                                  deleteMu.mutate(row.uuid)
                                }
                              }}
                              aria-label="Delete question"
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </td>
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
              <CardTitle>{dialog.mode === 'create' ? 'New question' : 'Edit question'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="grid gap-3 sm:grid-cols-2">
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
                          bookUuid: '',
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
                  <div className="space-y-2">
                    <Label htmlFor="q-book">Book (optional)</Label>
                    <select
                      id="q-book"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={form.bookUuid}
                      onChange={(e) => setForm((s) => ({ ...s, bookUuid: e.target.value }))}
                      disabled={
                        createMu.isPending || updateMu.isPending || !form.subjectUuid
                      }
                    >
                      <option value="">None</option>
                      {(form.subjectUuid ? booksForForm : booksForFilter).map((b) => (
                        <option key={b.uuid} value={b.uuid}>
                          {b.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="q-type">Type</Label>
                    <select
                      id="q-type"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                      value={form.type}
                      onChange={(e) => setForm((s) => ({ ...s, type: e.target.value }))}
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

                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Options</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addOption}>
                      Add option
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mark correct answer(s). For TRUE_FALSE, use two options (e.g. T / F).
                  </p>
                  <div className="space-y-2">
                    {form.options.map((opt, idx) => (
                      <div key={idx} className="flex flex-wrap items-start gap-2 border-t border-border/60 pt-2 first:border-0 first:pt-0">
                        <Input
                          className="w-14"
                          value={opt.label}
                          onChange={(e) =>
                            setForm((s) => {
                              const options = [...s.options]
                              options[idx] = { ...options[idx], label: e.target.value }
                              return { ...s, options }
                            })
                          }
                          aria-label={`Option ${idx + 1} label`}
                        />
                        <Input
                          className="min-w-[12rem] flex-1"
                          placeholder="Answer text"
                          value={opt.text}
                          onChange={(e) =>
                            setForm((s) => {
                              const options = [...s.options]
                              options[idx] = { ...options[idx], text: e.target.value }
                              return { ...s, options }
                            })
                          }
                        />
                        <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input"
                            checked={opt.isCorrect}
                            onChange={(e) =>
                              setForm((s) => {
                                const options = [...s.options]
                                options[idx] = { ...options[idx], isCorrect: e.target.checked }
                                return { ...s, options }
                              })
                            }
                          />
                          Correct
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeOption(idx)}
                          disabled={form.options.length <= 1}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

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
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
