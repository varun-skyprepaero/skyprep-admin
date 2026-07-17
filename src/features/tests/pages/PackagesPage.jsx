import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { HelpCircle, Loader2, Plus } from 'lucide-react'
import { TestBankDeleteDialog } from '@/features/tests/components/TestBankDeleteDialog'
import { PackageSeriesFormDialog } from '@/features/tests/pages/PackageSeriesFormDialog'
import { TestSeriesStructureGuide } from '@/features/tests/pages/TestSeriesStructureGuide'
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
  fetchTestBoards,
  fetchTestBooks,
  fetchTestPackageQuestionPoolCount,
  fetchTestPackages,
  fetchTestSuites,
  fetchTestSubjects,
  updateTestPackage,
} from '@/features/tests/api/tests-api'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { slugifyFromName } from '@/lib/slug'

const qkPkgs = ['tests', 'packages', 'TEST_SERIES']
const qkSubjects = ['tests', 'subjects']
const qkBoards = ['tests', 'boards']
const qkSuites = ['tests', 'suites']

export default function TestsPackagesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(/** @type {{ uuid: string, label: string } | null} */ (null))
  const [form, setForm] = useState({
    slug: '',
    name: '',
    description: '',
    isPublished: true,
    isDemo: false,
    subjectUuids: [],
    difficultyFilter: [],
    questionTypeFilter: [],
    bookUuids: [],
    boardUuids: [],
    suiteUuids: [],
    timeLimitMinutes: '',
    questionCount: '',
    coverImageUrl: null,
    coverMediaUuid: null,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: qkSubjects,
    queryFn: fetchTestSubjects,
    enabled: true,
  })

  const { data: boards = [] } = useQuery({
    queryKey: qkBoards,
    queryFn: fetchTestBoards,
    enabled: true,
  })

  const { data: suites = [] } = useQuery({
    queryKey: qkSuites,
    queryFn: fetchTestSuites,
    enabled: true,
  })

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: qkPkgs,
    queryFn: () => fetchTestPackages('TEST_SERIES'),
    enabled: true,
  })

  const booksParams =
    form.subjectUuids.length > 0 ? { subjectUuids: form.subjectUuids.join(',') } : {}

  const { data: booksForPackage = [] } = useQuery({
    queryKey: ['tests', 'books', 'package', booksParams],
    queryFn: () => fetchTestBooks(booksParams),
    enabled: Boolean(dialog && form.subjectUuids.length > 0),
  })

  const poolScopeKey = [
    form.subjectUuids.join(','),
    form.bookUuids.join(','),
    form.boardUuids.join(','),
    form.suiteUuids.join(','),
    form.difficultyFilter.join(','),
    form.questionTypeFilter.join(','),
  ].join('|')

  const { data: poolData, isFetching: poolLoading } = useQuery({
    queryKey: ['tests', 'packages', 'pool-count', poolScopeKey],
    queryFn: () =>
      fetchTestPackageQuestionPoolCount({
        catalogKind: 'TEST_SERIES',
        subjectUuids: form.subjectUuids,
        bookUuids: form.bookUuids,
        boardUuids: form.boardUuids,
        suiteUuids: form.suiteUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
      }),
    enabled: Boolean(dialog && form.subjectUuids.length > 0),
  })

  const availableQuestionCount =
    typeof poolData?.availableCount === 'number' ? poolData.availableCount : null
  const requestedQuestionCount = form.questionCount.trim() ? Number(form.questionCount) : null
  const questionCountTooHigh =
    requestedQuestionCount != null &&
    Number.isInteger(requestedQuestionCount) &&
    requestedQuestionCount > 0 &&
    availableQuestionCount != null &&
    requestedQuestionCount > availableQuestionCount

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.boards ?? []).some((b) => (b.code ?? b.name ?? '').toLowerCase().includes(q)) ||
        (p.suites ?? []).some(
          (s) =>
            (s.name ?? '').toLowerCase().includes(q) ||
            (s.slug ?? '').toLowerCase().includes(q),
        ),
    )
  }, [data, search])

  const { paginatedRows, paginationProps, resetPage } = usePaginatedRows(filteredRows)

  const createMu = useMutation({
    mutationFn: () =>
      createTestPackage({
        slug: slugifyFromName(form.name),
        name: form.name.trim(),
        description: form.description.trim() || null,
        isPublished: form.isPublished,
        isDemo: form.isDemo,
        catalogKind: 'TEST_SERIES',
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        boardUuids: form.boardUuids,
        suiteUuids: form.suiteUuids,
        timeLimitMinutes: form.timeLimitMinutes.trim()
          ? Number(form.timeLimitMinutes)
          : null,
        questionCount: form.questionCount.trim() ? Number(form.questionCount) : null,
        coverImageUrl: form.coverImageUrl || null,
        coverMediaUuid: form.coverMediaUuid || null,
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
        isPublished: form.isPublished,
        isDemo: form.isDemo,
        catalogKind: 'TEST_SERIES',
        subjectUuids: form.subjectUuids,
        difficultyFilter: form.difficultyFilter,
        questionTypeFilter: form.questionTypeFilter,
        bookUuids: form.bookUuids,
        boardUuids: form.boardUuids,
        suiteUuids: form.suiteUuids,
        timeLimitMinutes: form.timeLimitMinutes.trim()
          ? Number(form.timeLimitMinutes)
          : null,
        questionCount: form.questionCount.trim() ? Number(form.questionCount) : null,
        coverImageUrl: form.coverImageUrl || null,
        coverMediaUuid: form.coverMediaUuid || null,
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

  function toggleBoard(uuid) {
    setForm((s) => {
      const set = new Set(s.boardUuids)
      if (set.has(uuid)) set.delete(uuid)
      else set.add(uuid)
      return { ...s, boardUuids: [...set] }
    })
  }

  function toggleSuite(uuid) {
    setForm((s) => {
      const set = new Set(s.suiteUuids)
      if (set.has(uuid)) set.delete(uuid)
      else set.add(uuid)
      return { ...s, suiteUuids: [...set] }
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
      isPublished: true,
      isDemo: false,
      allowStudentDifficultySelection: false,
    subjectUuids: [],
      difficultyFilter: [],
      questionTypeFilter: [],
      bookUuids: [],
      boardUuids: [],
      suiteUuids: [],
      timeLimitMinutes: '',
      questionCount: '',
      coverImageUrl: null,
      coverMediaUuid: null,
    })
    setDialog({ mode: 'create' })
  }

  function openEdit(row) {
    setForm({
      slug: row.slug,
      name: row.name,
      description: row.description ?? '',
      isPublished: Boolean(row.isPublished),
      isDemo: Boolean(row.isDemo),
      subjectUuids: (row.subjects ?? []).map((s) => s.uuid),
      difficultyFilter: row.difficultyFilter ?? [],
      questionTypeFilter: row.questionTypeFilter ?? [],
      bookUuids: (row.books ?? []).map((b) => b.uuid),
      boardUuids: (row.boards ?? []).map((b) => b.uuid),
      suiteUuids: (row.suites ?? []).map((s) => s.uuid),
      timeLimitMinutes:
        row.timeLimitMinutes != null && row.timeLimitMinutes > 0
          ? String(row.timeLimitMinutes)
          : '',
      questionCount:
        row.questionCount != null && row.questionCount > 0 ? String(row.questionCount) : '',
      coverImageUrl: row.coverImageUrl ?? null,
      coverMediaUuid: row.coverMediaUuid ?? null,
    })
    setDialog({ mode: 'edit', uuid: row.uuid })
  }

  function submit(e) {
    e.preventDefault()
    if (questionCountTooHigh) {
      notifyError(
        availableQuestionCount === 0
          ? 'No questions match the selected scope. Add questions or broaden filters before setting a limit.'
          : `Only ${availableQuestionCount} question${availableQuestionCount === 1 ? '' : 's'} match this scope. Lower the limit or add more questions.`,
      )
      return
    }
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Test series</CardTitle>
              <CardDescription>
                Configure test series in the student catalog. Mark series as free demos for students
                without a subscription, or leave them subscription-only. Scope questions by subjects,
                boards, licenses, difficulty, type, and books.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => setGuideOpen(true)}
            >
              <HelpCircle className="size-4" aria-hidden />
              How it works
            </Button>
          </div>
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
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Boards</th>
                      <th className="px-4 py-3 font-medium">Licenses</th>
                      <th className="px-4 py-3 font-medium">Slug</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <th className="px-4 py-3 font-medium">Time limit</th>
                      <th className="px-4 py-3 font-medium">Subjects</th>
                      <th className="px-4 py-3 font-medium">Published</th>
                      <th className="px-4 py-3 font-medium">Demo</th>
                      <DataTableActionsHeader />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
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
                            {(row.boards ?? []).map((b) => b.code || b.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {(row.suites ?? []).map((s) => s.name).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">{row.slug}</td>
                          <td className="px-4 py-3 text-xs tabular-nums">
                            {row.questionCount != null && row.questionCount > 0
                              ? row.questionCount
                              : 'All'}
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
                            {row.isPublished ? 'Yes' : 'No'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {row.isDemo ? 'Yes' : 'No'}
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
        <PackageSeriesFormDialog
          variant="series"
          dialog={dialog}
          form={form}
          setForm={setForm}
          busy={createMu.isPending || updateMu.isPending}
          availableQuestionCount={availableQuestionCount}
          poolLoading={poolLoading}
          questionCountTooHigh={questionCountTooHigh}
          onClose={() => setDialog(null)}
          onSubmit={submit}
          subjects={subjects}
          boards={boards}
          suites={suites}
          booksForPackage={booksForPackage}
          toggleSubject={toggleSubject}
          toggleDifficulty={toggleDifficulty}
          toggleQuestionType={toggleQuestionType}
          toggleBook={toggleBook}
          toggleBoard={toggleBoard}
          toggleSuite={toggleSuite}
        />
      ) : null}

      <TestBankDeleteDialog
        entityType="package"
        title="Delete test series?"
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

      <TestSeriesStructureGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
