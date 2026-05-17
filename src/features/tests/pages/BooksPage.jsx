import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
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
import {
  createTestBook,
  deleteTestBook,
  fetchTestBooks,
  fetchTestSubjects,
  updateTestBook,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qkBooks = ['tests', 'books']
const qkSubjects = ['tests', 'subjects']

export default function TestsBooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState({
    title: '',
    author: '',
    edition: '',
    isbn: '',
    subjectUuid: '',
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const booksParams = subjectFilter ? { subjectUuid: subjectFilter } : {}
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: [...qkBooks, booksParams],
    queryFn: () => fetchTestBooks(booksParams),
    enabled: true,
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        (b.author ?? '').toLowerCase().includes(q) ||
        (b.isbn ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestBook({
        title: form.title.trim(),
        author: form.author.trim() || null,
        edition: form.edition.trim() || null,
        isbn: form.isbn.trim() || null,
        subjectUuid: form.subjectUuid.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Book created')
      void queryClient.invalidateQueries({ queryKey: qkBooks })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create book')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestBook(dialog.uuid, {
        title: form.title.trim(),
        author: form.author.trim() || null,
        edition: form.edition.trim() || null,
        isbn: form.isbn.trim() || null,
        subjectUuid: form.subjectUuid.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Book updated')
      void queryClient.invalidateQueries({ queryKey: qkBooks })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update book')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestBook(uuid),
    onSuccess: () => {
      notifySuccess('Book deleted')
      void queryClient.invalidateQueries({ queryKey: qkBooks })
      void queryClient.invalidateQueries({ queryKey: qkSubjects })
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete book')
      notifyError(message)
    },
  })

  function openCreate() {
    setForm({
      title: '',
      author: '',
      edition: '',
      isbn: '',
      subjectUuid: subjectFilter || '',
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      title: row.title,
      author: row.author ?? '',
      edition: row.edition ?? '',
      isbn: row.isbn ?? '',
      subjectUuid: row.subject?.uuid ?? '',
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Books</CardTitle>
          <CardDescription>Optional resources linked to subjects; questions may reference a book.</CardDescription>
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
              Add book
            </Button>
          </DataTableToolbar>
          <DataTableContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : isError ? (
              <p className="p-6 text-sm text-destructive">{error?.message ?? 'Unable to load books'}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Author</th>
                      <th className="px-4 py-3 font-medium">Qs</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No books yet.'
                            : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.title}</td>
                          <td className="px-4 py-3">{row.subject ? row.subject.name : '—'}</td>
                          <td className="px-4 py-3">{row.author ?? '—'}</td>
                          <td className="px-4 py-3">{row.questionCount ?? '—'}</td>
                          <DataTableRowActions
                            rowId={row.uuid}
                            disabled={deleteMu.isPending}
                            items={[
                              {
                                label: 'Edit',
                                onClick: () => openEdit(row),
                              },
                              {
                                label: 'Delete',
                                destructive: true,
                                disabled: deleteMu.isPending,
                                onClick: () => {
                                  if (window.confirm(`Delete book “${row.title}”?`)) {
                                    deleteMu.mutate(row.uuid)
                                  }
                                },
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
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{dialog.mode === 'create' ? 'New book' : 'Edit book'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="book-title">Title</Label>
                  <Input
                    id="book-title"
                    value={form.title}
                    onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book-subject">Subject (optional)</Label>
                  <select
                    id="book-subject"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={form.subjectUuid}
                    onChange={(e) => setForm((s) => ({ ...s, subjectUuid: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  >
                    <option value="">None</option>
                    {subjects.map((s) => (
                      <option key={s.uuid} value={s.uuid}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="book-author">Author</Label>
                    <Input
                      id="book-author"
                      value={form.author}
                      onChange={(e) => setForm((s) => ({ ...s, author: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="book-edition">Edition</Label>
                    <Input
                      id="book-edition"
                      value={form.edition}
                      onChange={(e) => setForm((s) => ({ ...s, edition: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="book-isbn">ISBN</Label>
                  <Input
                    id="book-isbn"
                    value={form.isbn}
                    onChange={(e) => setForm((s) => ({ ...s, isbn: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  />
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
