import { useMemo, useState } from 'react'
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
import { useOpenEditFromSearchParam } from '@/hooks/use-open-edit-from-search-param'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestLesson,
  deleteTestLesson,
  fetchTestLessons,
  fetchTestSubjects,
  updateTestLesson,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qkLessons = ['tests', 'lessons']
const qkSubjects = ['tests', 'subjects']

export default function TestsLessonsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    name: '',
    description: '',
    subjectUuid: '',
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const lessonsParams = subjectFilter ? { subjectUuid: subjectFilter } : {}
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: [...qkLessons, lessonsParams],
    queryFn: () => fetchTestLessons(lessonsParams),
    enabled: true,
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q) ||
        (row.subject?.name ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestLesson({
        subjectUuid: form.subjectUuid.trim(),
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
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description ?? '',
      subjectUuid: row.subject?.uuid ?? '',
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
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Lessons</CardTitle>
          <CardDescription>
            Lessons belong to a subject only. Questions can be tagged with one or more lessons.
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
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0 ? 'No lessons yet.' : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.name}</td>
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
                                  setDeleteTarget({ uuid: row.uuid, label: row.name }),
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
            className="relative z-10 max-h-[min(92vh,100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>{dialog.mode === 'create' ? 'New lesson' : 'Edit lesson'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="lesson-subject">Subject</Label>
                  <select
                    id="lesson-subject"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={form.subjectUuid}
                    onChange={(e) => setForm((s) => ({ ...s, subjectUuid: e.target.value }))}
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

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete lesson?"
        description={
          deleteTarget ? (
            <>
              Delete <span className="font-medium text-foreground">{deleteTarget.label}</span>? This
              cannot be undone.
            </>
          ) : null
        }
        loading={deleteMu.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMu.mutate(deleteTarget.uuid)}
      />
    </div>
  )
}
