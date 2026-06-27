import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus } from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { PackageSeriesFormDialog } from '@/features/tests/pages/PackageSeriesFormDialog'
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
import {
  createTestPackage,
  deleteTestPackage,
  fetchTestBooks,
  fetchTestPackages,
  fetchTestSuites,
  fetchTestSubjects,
  updateTestPackage,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { slugifyFromName } from '@/lib/slug'

const qkPkgs = ['tests', 'packages']
const qkSubjects = ['tests', 'subjects']
const qkSuites = ['tests', 'suites']

export default function TestsPackagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    billingSku: '',
    priceAmount: '',
    currency: 'INR',
    isPublished: true,
    isOpenForPurchase: true,
    subjectUuids: [],
    difficultyFilter: [],
    questionTypeFilter: [],
    bookUuids: [],
    suiteUuid: '',
    timeLimitMinutes: '',
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const { data: suites = [] } = useQuery({
    queryKey: qkSuites,
    queryFn: fetchTestSuites,
    enabled: true,
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qkPkgs,
    queryFn: fetchTestPackages,
    enabled: true,
  })

  const booksParams =
    form.subjectUuids.length > 0 ? { subjectUuids: form.subjectUuids.join(',') } : {}

  const { data: booksForPackage = [] } = useQuery({
    queryKey: ['tests', 'books', 'package', booksParams],
    queryFn: () => fetchTestBooks(booksParams),
    enabled: Boolean(dialog && form.subjectUuids.length > 0),
  })

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.billingSku ?? '').toLowerCase().includes(q) ||
        (p.suite?.name ?? '').toLowerCase().includes(q) ||
        (p.suite?.slug ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestPackage({
        slug: slugifyFromName(form.name),
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceAmount: form.priceAmount,
        currency: form.currency.trim() || 'INR',
        isPublished: form.isPublished,
        isOpenForPurchase: form.isOpenForPurchase,
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        ...(form.suiteUuid.trim() ? { suiteUuid: form.suiteUuid.trim() } : {}),
        timeLimitMinutes: form.timeLimitMinutes.trim()
          ? Number(form.timeLimitMinutes)
          : null,
      }),
    onSuccess: () => {
      notifySuccess('Test series created')
      void queryClient.invalidateQueries({ queryKey: qkPkgs })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create test series')
      notifyError(message)
    },
  })

  const updateMu = useMutation({
    mutationFn: () =>
      updateTestPackage(dialog.uuid, {
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceAmount: form.priceAmount,
        currency: form.currency.trim() || 'INR',
        isPublished: form.isPublished,
        isOpenForPurchase: form.isOpenForPurchase,
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        suiteUuid: form.suiteUuid.trim() ? form.suiteUuid.trim() : null,
        timeLimitMinutes: form.timeLimitMinutes.trim()
          ? Number(form.timeLimitMinutes)
          : null,
      }),
    onSuccess: () => {
      notifySuccess('Test series updated')
      void queryClient.invalidateQueries({ queryKey: qkPkgs })
      setDialog(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to update test series')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestPackage(uuid),
    onSuccess: () => {
      notifySuccess('Test series deleted')
      void queryClient.invalidateQueries({ queryKey: qkPkgs })
      setDeleteTarget(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete test series')
      notifyError(message)
    },
  })

  function toggleDifficulty(value) {
    setForm((s) => {
      const set = new Set(s.difficultyFilter)
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return { ...s, difficultyFilter: [...set] }
    })
  }

  function toggleQuestionType(value) {
    setForm((s) => {
      const set = new Set(s.questionTypeFilter)
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return { ...s, questionTypeFilter: [...set] }
    })
  }

  function toggleBook(uuid) {
    setForm((s) => {
      const set = new Set(s.bookUuids)
      if (set.has(uuid)) set.delete(uuid)
      else set.add(uuid)
      return { ...s, bookUuids: [...set] }
    })
  }

  function toggleSubject(uuid) {
    setForm((s) => {
      const set = new Set(s.subjectUuids)
      if (set.has(uuid)) set.delete(uuid)
      else set.add(uuid)
      return { ...s, subjectUuids: [...set] }
    })
  }

  function openCreate() {
    setForm({
      slug: '',
      name: '',
      description: '',
      billingSku: '',
      priceAmount: '',
      currency: 'INR',
      isPublished: true,
      isOpenForPurchase: true,
      subjectUuids: [],
      difficultyFilter: [],
      questionTypeFilter: [],
      bookUuids: [],
      suiteUuid: '',
      timeLimitMinutes: '',
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      billingSku: row.billingSku,
      priceAmount: row.price ?? '',
      currency: row.currency === 'USD' ? 'USD' : 'INR',
      isPublished: Boolean(row.isPublished),
      isOpenForPurchase: row.isOpenForPurchase !== false,
      subjectUuids: (row.subjects ?? []).map((s) => s.uuid),
      difficultyFilter: row.difficultyFilter ?? [],
      questionTypeFilter: row.questionTypeFilter ?? [],
      bookUuids: (row.books ?? []).map((b) => b.uuid),
      suiteUuid: row.suite?.uuid ?? '',
      timeLimitMinutes:
        row.timeLimitMinutes != null && row.timeLimitMinutes > 0
          ? String(row.timeLimitMinutes)
          : '',
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') {
      if (!slugifyFromName(form.name)) {
        notifyError('Enter a name with at least one letter or number.')
        return
      }
      createMu.mutate()
    } else if (dialog?.mode === 'edit') {
      updateMu.mutate()
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Test series</CardTitle>
          <CardDescription>
            Pricing for the student catalog. Internal billing SKUs are generated when you create a
            test series. Optionally assign a suite (PPL, CPL, ATPL, …) for catalog grouping.
            Scope each series with subjects, optional difficulty / question type, and optional books.
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
              Add test series
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
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Suite</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">SKU</th>
                      <th className="px-4 py-3 font-medium">Price</th>
                      <th className="px-4 py-3 font-medium">Time limit</th>
                      <th className="px-4 py-3 font-medium">Subjects</th>
                      <th className="px-4 py-3 font-medium">Purchases</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                          {data.length === 0
                            ? 'No test series yet.'
                            : 'No results match your search.'}
                        </td>
                      </tr>
                    ) : (
                      paginatedRows.map((row) => (
                        <tr key={row.uuid} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3">{row.name}</td>
                          <td className="px-4 py-3 text-xs">
                            {row.suite ? `${row.suite.name} (${row.suite.slug})` : '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.slug}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.billingSku}</td>
                          <td className="px-4 py-3">
                            {row.price} {row.currency}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.timeLimitMinutes != null && row.timeLimitMinutes > 0
                              ? `${row.timeLimitMinutes} min`
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {(row.subjects ?? []).map((s) => s.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.isOpenForPurchase !== false ? 'Open' : 'Closed'}
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
        <PackageSeriesFormDialog
          dialog={dialog}
          form={form}
          setForm={setForm}
          busy={createMu.isPending || updateMu.isPending}
          onClose={() => setDialog(null)}
          onSubmit={submit}
          subjects={subjects}
          suites={suites}
          booksForPackage={booksForPackage}
          toggleSubject={toggleSubject}
          toggleDifficulty={toggleDifficulty}
          toggleQuestionType={toggleQuestionType}
          toggleBook={toggleBook}
        />
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete test series?"
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
