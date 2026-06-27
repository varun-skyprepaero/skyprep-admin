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
} from '@/components/ui/data-table'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestSuite,
  deleteTestSuite,
  fetchTestSuites,
  updateTestSuite,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { slugifyFromName } from '@/lib/slug'

const qk = ['tests', 'suites']

export default function TestsSuitesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  const slugPreview = slugifyFromName(form.name)

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qk,
    queryFn: fetchTestSuites,
    enabled: true,
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestSuite({
        slug: slugifyFromName(form.name),
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Suite created')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create suite')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestSuite(dialog.uuid, {
        name: form.name.trim(),
        description: form.description.trim() || null,
      }),
    onSuccess: () => {
      notifySuccess('Suite updated')
      void queryClient.invalidateQueries({ queryKey: qk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update suite')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestSuite(uuid),
    onSuccess: () => {
      notifySuccess('Suite deleted')
      void queryClient.invalidateQueries({ queryKey: qk })
      void queryClient.invalidateQueries({ queryKey: ['tests', 'packages'] })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete suite')
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
    setDialog({ mode: 'edit', uuid: row.uuid, slug: row.slug })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create' && !slugifyFromName(form.name)) {
      notifyError('Enter a name that produces a valid slug (letters or numbers).')
      return
    }
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Test suites</CardTitle>
          <CardDescription>
            License or program groupings (e.g. PPL, CPL, ATPL). Assign test series to a suite so the
            catalog can filter or display them by program.
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
              Add suite
            </Button>
          </DataTableToolbar>
          <DataTableContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : isError ? (
              <p className="p-6 text-sm text-destructive">
                {error?.message ?? 'Unable to load suites'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Series</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No suites yet.'
                            : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.slug}</td>
                          <td className="px-4 py-3">{row.packageCount ?? '—'}</td>
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
              <CardTitle>{dialog.mode === 'create' ? 'New suite' : 'Edit suite'}</CardTitle>
              <CardDescription>
                Display name and optional description. The slug is generated from the name and
                cannot be changed after creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="suite-name">Name</Label>
                  <Input
                    id="suite-name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                    required
                    placeholder="e.g. PPL, CPL, ATPL"
                  />
                  {dialog.mode === 'create' ? (
                    slugPreview ? (
                      <p className="text-xs text-muted-foreground">
                        Slug: <span className="font-mono text-foreground">{slugPreview}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        A slug is created automatically from the name.
                      </p>
                    )
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2">
                      <p className="text-xs text-muted-foreground">Slug (fixed after creation)</p>
                      <p className="font-mono text-sm">{dialog.slug}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suite-desc">Description</Label>
                  <textarea
                    id="suite-desc"
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
        title="Delete suite?"
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
