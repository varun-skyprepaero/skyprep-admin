import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { TestBankDeleteDialog } from '@/features/tests/components/TestBankDeleteDialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/modal'
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
import { useOpenEditFromSearchParam } from '@/hooks/use-open-edit-from-search-param'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestLesson,
  deleteTestLesson,
  fetchTestBooks,
  fetchTestLessons,
  fetchTestSubjects,
  updateTestLesson,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qkLessons = ['tests', 'lessons']
const qkSubjects = ['tests', 'subjects']
const qkBooks = ['tests', 'books']

export default function TestsLessonsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [bookFilter, setBookFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    name: '',
    description: '',
    subjectUuid: '',
    bookUuid: '',
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const booksFilterParams = subjectFilter ? { subjectUuid: subjectFilter } : {}
  const { data: booksForFilter = [] } = useQuery({
    queryKey: [...qkBooks, 'filter', booksFilterParams],
    queryFn: () => fetchTestBooks(booksFilterParams),
    enabled: Boolean(subjectFilter),
  })

  const lessonsParams = useMemo(() => {
    const params = {}
    if (subjectFilter) params.subjectUuid = subjectFilter
    if (bookFilter) params.bookUuid = bookFilter
    return params
  }, [subjectFilter, bookFilter])

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: [...qkLessons, lessonsParams],
    queryFn: () => fetchTestLessons(lessonsParams),
    enabled: true,
  })

  const booksForFormParams = form.subjectUuid ? { subjectUuid: form.subjectUuid } : {}
  const { data: booksForForm = [] } = useQuery({
    queryKey: [...qkBooks, 'form', booksForFormParams],
    queryFn: () => fetchTestBooks(booksForFormParams),
    enabled: Boolean(dialog && form.subjectUuid),
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q) ||
        (row.subject?.name ?? '').toLowerCase().includes(q) ||
        (row.book?.title ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestLesson({
        subjectUuid: form.subjectUuid.trim(),
        bookUuid: form.bookUuid.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Lesson created')
      void queryClient.invalidateQueries({ queryKey: qkLessons })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create lesson')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestLesson(dialog.uuid, {
        subjectUuid: form.subjectUuid.trim(),
        bookUuid: form.bookUuid.trim(),
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Lesson updated')
      void queryClient.invalidateQueries({ queryKey: qkLessons })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update lesson')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestLesson(uuid),
    onSuccess: () => {
      notifySuccess('Lesson deleted')
      void queryClient.invalidateQueries({ queryKey: qkLessons })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete lesson')
      notifyError(message)
    },
  })

  function openCreate() {
    setForm({
      name: '',
      description: '',
      subjectUuid: subjectFilter || '',
      bookUuid: bookFilter || '',
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description ?? '',
      subjectUuid: row.subject?.uuid ?? '',
      bookUuid: row.book?.uuid ?? '',
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  useOpenEditFromSearchParam(data, openEdit)

  function submit(e) {
    e.preventDefault()
    if (!form.subjectUuid.trim()) {
      notifyError('Subject is required')
      return
    }
    if (!form.bookUuid.trim()) {
      notifyError('Book is required')
      return
    }
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Lessons</CardTitle>
          <CardDescription>
            Chapters belong to a book within a subject. Questions can be tagged with lessons from
            the selected book.
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
                setBookFilter('')
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
            <select
              className={dataTableSelectClass}
              aria-label="Filter by book"
              value={bookFilter}
              disabled={!subjectFilter}
              onChange={(e) => {
                setBookFilter(e.target.value)
                resetPage()
              }}
            >
              <option value="">
                {subjectFilter ? 'All books' : 'Select subject first'}
              </option>
              {booksForFilter.map((book) => (
                <option key={book.uuid} value={book.uuid}>
                  {book.title}
                </option>
              ))}
            </select>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Add lesson
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
                <table className="w-full min-w-[840px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Book</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0 ? 'No lessons yet.' : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">{row.book?.title ?? '—'}</td>
                          <td className="px-4 py-3">{row.subject?.name ?? '—'}</td>
                          <td className="px-4 py-3">{row.questionCount ?? '—'}</td>
                          <DataTableRowActions
                            rowId={row.uuid}
                            disabled={deleteMu.isPending}
                            items={[
                              { label: 'Edit', onClick: () => openEdit(row) },
                              {
                                label: 'Delete',
                                destructive: true,
                                disabled: deleteMu.isPending,
                                onClick: () =>
                                  setDeleteTarget({ uuid: row.uuid, label: row.name, row }),
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
        <Modal
          open
          onClose={() => setDialog(null)}
          size="md"
          closeDisabled={createMu.isPending || updateMu.isPending}
        >
          <ModalHeader
            title={dialog.mode === 'create' ? 'New lesson' : 'Edit lesson'}
            onClose={() => setDialog(null)}
            closeDisabled={createMu.isPending || updateMu.isPending}
          />
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <ModalBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lesson-subject">Subject</Label>
                <select
                  id="lesson-subject"
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
                <Label htmlFor="lesson-book">Book</Label>
                <select
                  id="lesson-book"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={form.bookUuid}
                  onChange={(e) => setForm((s) => ({ ...s, bookUuid: e.target.value }))}
                  disabled={createMu.isPending || updateMu.isPending || !form.subjectUuid}
                  required
                >
                  <option value="">
                    {form.subjectUuid ? 'Select…' : 'Select subject first'}
                  </option>
                  {booksForForm.map((book) => (
                    <option key={book.uuid} value={book.uuid}>
                      {book.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-name">Name</Label>
                <Input
                  id="lesson-name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  disabled={createMu.isPending || updateMu.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lesson-desc">Description (optional)</Label>
                <textarea
                  id="lesson-desc"
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  disabled={createMu.isPending || updateMu.isPending}
                />
              </div>
            </ModalBody>
            <ModalFooter>
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
            </ModalFooter>
          </form>
        </Modal>
      ) : null}

      <TestBankDeleteDialog
        entityType="lesson"
        title="Delete lesson?"
        deleteTarget={deleteTarget}
        deletePending={deleteMu.isPending}
        onClose={() => setDeleteTarget(null)}
        onEdit={() => {
          const row = deleteTarget?.row
          setDeleteTarget(null)
          if (row) openEdit(row)
        }}
        onConfirm={() => deleteTarget && deleteMu.mutate(deleteTarget.uuid)}
      />
    </div>
  )
}
