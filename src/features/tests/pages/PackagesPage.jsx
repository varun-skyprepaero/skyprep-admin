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
} from '@/components/ui/data-table'
import { usePaginatedRows } from '@/hooks/use-paginated-rows'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { env } from '@/config/env'
import { DIFFICULTY_OPTIONS, QUESTION_TYPE_OPTIONS } from '@/features/tests/constants'
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

const qkPkgs = ['tests', 'packages']
const qkSubjects = ['tests', 'subjects']
const qkSuites = ['tests', 'suites']

export default function TestsPackagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    billingSku: '',
    priceAmount: '',
    currency: 'USD',
    isPublished: true,
    isOpenForPurchase: true,
    subjectUuids: [],
    difficultyFilter: [],
    questionTypeFilter: [],
    bookUuids: [],
    suiteUuid: '',
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: Boolean(env.testApiBaseUrl),
  })

  const { data: suites = [] } = useQuery({
    queryKey: qkSuites,
    queryFn: fetchTestSuites,
    enabled: Boolean(env.testApiBaseUrl),
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qkPkgs,
    queryFn: fetchTestPackages,
    enabled: Boolean(env.testApiBaseUrl),
  })

  const booksParams =
    form.subjectUuids.length > 0 ? { subjectUuids: form.subjectUuids.join(',') } : {}

  const { data: booksForPackage = [] } = useQuery({
    queryKey: ['tests', 'books', 'package', booksParams],
    queryFn: () => fetchTestBooks(booksParams),
    enabled: Boolean(env.testApiBaseUrl && dialog && form.subjectUuids.length > 0),
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
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceAmount: form.priceAmount,
        currency: form.currency.trim() || 'USD',
        isPublished: form.isPublished,
        isOpenForPurchase: form.isOpenForPurchase,
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        ...(form.suiteUuid.trim() ? { suiteUuid: form.suiteUuid.trim() } : {}),
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
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        description: form.description.trim() || null,
        priceAmount: form.priceAmount,
        currency: form.currency.trim() || 'USD',
        isPublished: form.isPublished,
        isOpenForPurchase: form.isOpenForPurchase,
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        suiteUuid: form.suiteUuid.trim() ? form.suiteUuid.trim() : null,
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
      currency: 'USD',
      isPublished: true,
      isOpenForPurchase: true,
      subjectUuids: [],
      difficultyFilter: [],
      questionTypeFilter: [],
      bookUuids: [],
      suiteUuid: '',
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
      currency: row.currency ?? 'USD',
      isPublished: Boolean(row.isPublished),
      isOpenForPurchase: row.isOpenForPurchase !== false,
      subjectUuids: (row.subjects ?? []).map((s) => s.uuid),
      difficultyFilter: row.difficultyFilter ?? [],
      questionTypeFilter: row.questionTypeFilter ?? [],
      bookUuids: (row.books ?? []).map((b) => b.uuid),
      suiteUuid: row.suite?.uuid ?? '',
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (dialog?.mode === 'create') createMu.mutate()
    else if (dialog?.mode === 'edit') updateMu.mutate()
  }

  if (!env.testApiBaseUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Configure test API</CardTitle>
          <CardDescription>
            Set <code className="text-xs">VITE_TEST_BANK_API_BASE_URL</code> in{' '}
            <code className="text-xs">.env</code> (e.g.{' '}
            <code className="text-xs">http://localhost:4010/api/v1</code>). If the test service uses{' '}
            <code className="text-xs">TEST_BANK_API_KEY</code>, set{' '}
            <code className="text-xs">VITE_TEST_BANK_API_KEY</code> to the same value, then restart the
            dev server.
          </CardDescription>
        </CardHeader>
      </Card>
    )
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
                      <th className="px-4 py-3 font-medium">Subjects</th>
                      <th className="px-4 py-3 font-medium">Purchases</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
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
                            {(row.subjects ?? []).map((s) => s.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.isOpenForPurchase !== false ? 'Open' : 'Closed'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="mr-1"
                              onClick={() => openEdit(row)}
                              aria-label="Edit test series"
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
                                if (window.confirm(`Delete test series “${row.name}”?`)) {
                                  deleteMu.mutate(row.uuid)
                                }
                              }}
                              aria-label="Delete test series"
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
              <CardTitle>{dialog.mode === 'create' ? 'New test series' : 'Edit test series'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={submit}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pkg-slug">Slug (URL)</Label>
                    <Input
                      id="pkg-slug"
                      value={form.slug}
                      onChange={(e) => setForm((s) => ({ ...s, slug: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-name">Name</Label>
                    <Input
                      id="pkg-name"
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pkg-desc">Description</Label>
                  <textarea
                    id="pkg-desc"
                    className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                    value={form.description}
                    onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pkg-price">Price</Label>
                    <Input
                      id="pkg-price"
                      type="number"
                      step="0.01"
                      value={form.priceAmount}
                      onChange={(e) => setForm((s) => ({ ...s, priceAmount: e.target.value }))}
                      disabled={createMu.isPending || updateMu.isPending}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-curr">Currency</Label>
                    <Input
                      id="pkg-curr"
                      value={form.currency}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, currency: e.target.value.toUpperCase() }))
                      }
                      disabled={createMu.isPending || updateMu.isPending}
                    />
                  </div>
                </div>
                {dialog.mode === 'edit' ? (
                  <div className="space-y-2">
                    <Label htmlFor="pkg-sku-ro">Internal billing SKU</Label>
                    <Input
                      id="pkg-sku-ro"
                      readOnly
                      value={form.billingSku}
                      className="font-mono text-xs"
                      disabled={createMu.isPending || updateMu.isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Assigned when this test series was created; used on classroom purchase lines.
                    </p>
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={form.isPublished}
                    onChange={(e) => setForm((s) => ({ ...s, isPublished: e.target.checked }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  />
                  Published (visible in public catalog)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-input"
                    checked={form.isOpenForPurchase}
                    onChange={(e) => setForm((s) => ({ ...s, isOpenForPurchase: e.target.checked }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  />
                  Open for new purchases (unchecked: existing buyers keep access; catalog hides from new buyers)
                </label>

                <div className="space-y-2">
                  <Label htmlFor="pkg-suite">Suite (optional)</Label>
                  <select
                    id="pkg-suite"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                    value={form.suiteUuid}
                    onChange={(e) => setForm((s) => ({ ...s, suiteUuid: e.target.value }))}
                    disabled={createMu.isPending || updateMu.isPending}
                  >
                    <option value="">None</option>
                    {suites.map((s) => (
                      <option key={s.uuid} value={s.uuid}>
                        {s.name} ({s.slug})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Assign a suite to group this series in the catalog (optional). Use None for legacy
                    packages until you are ready to group them.
                  </p>
                </div>

                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  <Label>Included subjects</Label>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {subjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Create a subject first.</p>
                    ) : (
                      subjects.map((s) => (
                        <label key={s.uuid} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input"
                            checked={form.subjectUuids.includes(s.uuid)}
                            onChange={() => toggleSubject(s.uuid)}
                            disabled={createMu.isPending || updateMu.isPending}
                          />
                          <span>
                            {s.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  <Label>Difficulty (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to include all difficulties. Select one or more to limit the bank.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {DIFFICULTY_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={form.difficultyFilter.includes(o.value)}
                          onChange={() => toggleDifficulty(o.value)}
                          disabled={createMu.isPending || updateMu.isPending}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  <Label>Question types (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to include all types. Select to limit (e.g. only multiple choice).
                  </p>
                  <div className="max-h-40 space-y-2 overflow-y-auto">
                    {QUESTION_TYPE_OPTIONS.map((o) => (
                      <label key={o.value} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input"
                          checked={form.questionTypeFilter.includes(o.value)}
                          onChange={() => toggleQuestionType(o.value)}
                          disabled={createMu.isPending || updateMu.isPending}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/80 p-3">
                  <Label>Books (optional)</Label>
                  <p className="text-xs text-muted-foreground">
                    Leave empty for the full question bank in each subject (including items with no
                    book). Select books to only include questions tied to those books.
                  </p>
                  {form.subjectUuids.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Select at least one subject first.</p>
                  ) : booksForPackage.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No books for the selected subjects.</p>
                  ) : (
                    <div className="max-h-48 space-y-2 overflow-y-auto">
                      {booksForPackage.map((b) => (
                        <label key={b.uuid} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="size-4 rounded border-input"
                            checked={form.bookUuids.includes(b.uuid)}
                            onChange={() => toggleBook(b.uuid)}
                            disabled={createMu.isPending || updateMu.isPending}
                          />
                          <span>
                            {b.title}
                            {b.subject?.name ? (
                              <span className="text-muted-foreground"> · {b.subject.name}</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
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
