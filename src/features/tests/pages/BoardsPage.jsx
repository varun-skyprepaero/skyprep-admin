import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { useOpenEditFromSearchParam } from '@/hooks/use-open-edit-from-search-param'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestBoard,
  deleteTestBoard,
  fetchTestBoards,
  fetchTestSuites,
  updateTestBoard,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'

const boardsQk = ['tests', 'boards']
const suitesQk = ['tests', 'suites']

function normalizeBoardCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
}

function SuiteCheckbox({ id, checked, onChange, disabled, label, hint }) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-2 rounded-md border border-border/50 bg-background/80 px-3 py-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  )
}

/**
 * @param {{
 *   suites: Array<{ uuid: string, name: string, slug: string, boards?: Array<{ code?: string }> }>,
 *   selectedUuids: string[],
 *   disabled?: boolean,
 *   onToggle: (uuid: string) => void,
 * }} props
 */
function BoardSuitePicker({ suites, selectedUuids, disabled, onToggle }) {
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return suites
    return suites.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.boards ?? []).some((b) => (b.code ?? '').toLowerCase().includes(q)),
    )
  }, [suites, filter])

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/15 p-4">
      <div>
        <Label htmlFor="board-suite-filter">Licenses</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose from the licenses catalog. Selected licenses are linked to this board.
        </p>
      </div>
      {suites.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No licenses yet.{' '}
          <Link to="/tests/suites" className="font-medium text-primary underline-offset-4 hover:underline">
            Add licenses
          </Link>{' '}
          first, then assign them here.
        </p>
      ) : (
        <>
          <Input
            id="board-suite-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search licenses…"
            disabled={disabled}
          />
          <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No licenses match your search.</p>
            ) : (
              filtered.map((suite) => {
                const boardCodes = (suite.boards ?? []).map((b) => b.code).filter(Boolean)
                return (
                  <SuiteCheckbox
                    key={suite.uuid}
                    id={`board-suite-${suite.uuid}`}
                    checked={selectedUuids.includes(suite.uuid)}
                    onChange={() => onToggle(suite.uuid)}
                    disabled={disabled}
                    label={`${suite.name} (${suite.slug})`}
                    hint={
                      boardCodes.length
                        ? `Used by: ${boardCodes.join(', ')}`
                        : 'Not linked to any board yet'
                    }
                  />
                )
              })
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selectedUuids.length} license{selectedUuids.length === 1 ? '' : 's'} selected
          </p>
        </>
      )}
    </div>
  )
}

export default function TestsBoardsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    suiteUuids: /** @type {string[]} */ ([]),
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: boardsQk,
    queryFn: fetchTestBoards,
  })

  const { data: allSuites = [] } = useQuery({
    queryKey: [...suitesQk, 'all'],
    queryFn: () => fetchTestSuites(),
    enabled: Boolean(dialog),
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (row) =>
        row.code.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q) ||
        (row.suites ?? []).some((s) => s.name.toLowerCase().includes(q)),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestBoard({
        code: normalizeBoardCode(form.code),
        name: form.name.trim(),
        description: form.description.trim() || null,
        suiteUuids: form.suiteUuids,
      }),
    onSuccess: () => {
      notifySuccess('Board created')
      void queryClient.invalidateQueries({ queryKey: boardsQk })
      void queryClient.invalidateQueries({ queryKey: suitesQk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create board')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestBoard(dialog.uuid, {
        code: normalizeBoardCode(form.code),
        name: form.name.trim(),
        description: form.description.trim() || null,
        suiteUuids: form.suiteUuids,
      }),
    onSuccess: () => {
      notifySuccess('Board updated')
      void queryClient.invalidateQueries({ queryKey: boardsQk })
      void queryClient.invalidateQueries({ queryKey: suitesQk })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update board')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestBoard(uuid),
    onSuccess: () => {
      notifySuccess('Board deleted')
      void queryClient.invalidateQueries({ queryKey: boardsQk })
      void queryClient.invalidateQueries({ queryKey: suitesQk })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete board')
      notifyError(message)
    },
  })

  function openCreate() {
    setForm({
      code: '',
      name: '',
      description: '',
      suiteUuids: [],
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      suiteUuids: (row.suites ?? []).map((s) => s.uuid),
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  useOpenEditFromSearchParam(data, openEdit)

  function toggleSuite(uuid) {
    setForm((prev) => ({
      ...prev,
      suiteUuids: prev.suiteUuids.includes(uuid)
        ? prev.suiteUuids.filter((id) => id !== uuid)
        : [...prev.suiteUuids, uuid],
    }))
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  const busy = createMu.isPending || updateMu.isPending

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Boards</CardTitle>
          <CardDescription>
            Regulatory boards (DGCA, FAA, …). Create licenses in the{' '}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => navigate('/tests/suites')}
            >
              Licenses
            </button>{' '}
            table, then link them to a board when creating or editing.
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
              Add board
            </Button>
          </DataTableToolbar>
          <DataTableContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
              </div>
            ) : isError ? (
              <p className="p-6 text-sm text-destructive">
                {error?.message ?? 'Unable to load boards'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Licenses</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0 ? 'No boards yet.' : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3">
                            {row.suites?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {row.suites.map((suite) => (
                                  <span
                                    key={suite.uuid}
                                    className="rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium"
                                  >
                                    {suite.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.description || '—'}
                          </td>
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
                                  setDeleteTarget({ uuid: row.uuid, label: row.code }),
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
          onClick={() => !busy && setDialog(null)}
        >
          <Card
            className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="board-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle id="board-dialog-title">
                {dialog.mode === 'create' ? 'New board' : 'Edit board'}
              </CardTitle>
              <CardDescription>
                Board details plus which licenses from the catalog belong to this board.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={submit}>
                <div className="space-y-2">
                  <Label htmlFor="board-code">Code</Label>
                  <Input
                    id="board-code"
                    value={form.code}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, code: normalizeBoardCode(e.target.value) }))
                    }
                    disabled={busy}
                    placeholder="DGCA"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="board-name">Name</Label>
                  <Input
                    id="board-name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    disabled={busy}
                    placeholder="Directorate General of Civil Aviation"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="board-desc">Description</Label>
                  <Input
                    id="board-desc"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    disabled={busy}
                  />
                </div>

                <BoardSuitePicker
                  suites={allSuites}
                  selectedUuids={form.suiteUuids}
                  disabled={busy}
                  onToggle={toggleSuite}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={busy}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
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
        title="Delete board?"
        description={
          deleteTarget ? (
            <>
              Delete <span className="font-medium text-foreground">{deleteTarget.label}</span>?
              Board–license links are removed; license records are kept.
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
