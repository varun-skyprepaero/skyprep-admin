import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
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
} from '@/components/ui/data-table'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { useOpenEditFromSearchParam } from '@/hooks/use-open-edit-from-search-param'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestSubject,
  deleteTestSubject,
  fetchTestSubjects,
  updateTestSubject,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const qk = ['tests', 'subjects']

export default function TestsSubjectsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qk,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestSubject({
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Subject created')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create subject')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestSubject(dialog.uuid, {
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Subject updated')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update subject')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestSubject(uuid),
    onSuccess: () => {
      notifySuccess('Subject deleted')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete subject')
      notifyError(message)
    },
  })

  function openCreate() {
    setForm({
      name: '',
      description: '',
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      name: row.name,
      description: row.description ?? '',
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  useOpenEditFromSearchParam(data, openEdit)

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            Curriculum subjects for the test bank. Each subject has lessons, books, and questions.
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
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Add subject
            </Button>
          </DataTableToolbar>
          <DataTableContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : isError ? (
              <p className="p-6 text-sm text-destructive">
                {error?.message ?? 'Unable to load subjects'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <th className="px-4 py-3 font-medium">Lessons</th>
                      <th className="px-4 py-3 font-medium">Books</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No subjects yet.'
                            : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">{row.questionCount ?? '—'}</td>
                          <td className="px-4 py-3">{row.lessonCount ?? '—'}</td>
                          <td className="px-4 py-3">{row.bookCount ?? '—'}</td>
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
        <Modal
          open
          onClose={() => setDialog(null)}
          size="md"
          closeDisabled={createMu.isPending || updateMu.isPending}
          aria-labelledby="subject-dialog-title"
        >
          <ModalHeader
            title={dialog.mode === 'create' ? 'New subject' : 'Edit subject'}
            description="Display name and optional description."
            titleId="subject-dialog-title"
            onClose={() => setDialog(null)}
            closeDisabled={createMu.isPending || updateMu.isPending}
          />
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <ModalBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sub-name">Name</Label>
                <Input
                  id="sub-name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  disabled={createMu.isPending || updateMu.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sub-desc">Description</Label>
                <Input
                  id="sub-desc"
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

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete subject?"
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
