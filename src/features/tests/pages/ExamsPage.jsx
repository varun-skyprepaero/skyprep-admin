import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Loader2,
  Plus,
  Save,
  Target,
  Trash2,
} from 'lucide-react'
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createTestExam,
  deleteTestExam,
  fetchExamSectionPoolCount,
  fetchTestBoards,
  fetchTestExams,
  fetchTestSubjects,
  updateTestExam,
} from '@/features/tests/api/tests-api'
import { DIFFICULTY_OPTIONS } from '@/features/tests/constants'
import {
  emptySection,
  costsFromExam,
  examToPayload,
  examDetailsToPayload,
  examSectionsToPayload,
  buildExamSavePayload,
  examTotals,
  formatDifficultyFilter,
  formatExamCost,
  formatExamName,
  examDisplayTitle,
  PASS_POLICY_LABELS,
  sectionPassMarks,
  sectionSummary,
  sectionTotalMarks,
  toggleDifficultyFilter,
  clampNonNegativeInt,
  clampNonNegativeDecimal,
  clampPercent,
} from '@/features/tests/lib/exam-utils'
import { handleApiError } from '@/lib/http/api-error'
import { notifyError, notifySuccess } from '@/lib/notifications'
import { cn } from '@/lib/utils'

const examsQk = ['tests', 'exams']

const selectClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'

function StatPill({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2">
      <Icon className="size-4 shrink-0 text-primary" aria-hidden />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

function CheckboxOption({ id, checked, onChange, disabled, label, hint }) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        checked
          ? 'border-primary/25 bg-background shadow-sm'
          : 'border-transparent hover:bg-background/70',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-snug">{label}</span>
        {hint ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </label>
  )
}

/**
 * @param {{
 *   exam: Record<string, unknown>,
 *   selected: boolean,
 *   onSelect: () => void,
 * }} props
 */
function ExamListItem({ exam, selected, onSelect }) {
  const totals = exam.totals ?? examTotals(exam.sections ?? [])
  const costs = costsFromExam(exam)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border px-3 py-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border/60 bg-card hover:border-primary/40 hover:bg-muted/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{examDisplayTitle(exam)}</p>
            {exam.isPublished === false ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Draft
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {exam.name}
            {exam.board?.code ? ` · ${exam.board.code}` : ''}
            {exam.suite?.name ? ` · ${exam.suite.name}` : ''}
          </p>
        </div>
        <ChevronRight
          className={cn('size-4 shrink-0 text-muted-foreground', selected && 'text-primary')}
          aria-hidden
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {exam.sectionCount ?? exam.sections?.length ?? 0} section
        {(exam.sectionCount ?? exam.sections?.length ?? 0) === 1 ? '' : 's'} ·{' '}
        {totals.questionCount} Q · {totals.totalMarks} marks · {totals.timeLimitMinutes} min
        {exam.attemptLimit != null && exam.attemptLimit > 0
          ? ` · ${exam.attemptLimit} attempt${exam.attemptLimit === 1 ? '' : 's'} max`
          : ''}
      </p>
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        India {formatExamCost(costs.costInAmount, 'INR')} · Intl{' '}
        {formatExamCost(costs.costIntlAmount, 'USD')}
      </p>
    </button>
  )
}

/**
 * @param {{
 *   section: Record<string, unknown>,
 *   index: number,
 *   subjects: Array<{ uuid: string, name: string }>,
 *   usedSubjectUuids: Set<string>,
 *   onChange: (patch: Record<string, unknown>) => void,
 *   onRemove: () => void,
 *   canRemove: boolean,
 *   disabled?: boolean,
 *   availableQuestionCount?: number | null,
 *   poolLoading?: boolean,
 *   questionCountTooHigh?: boolean,
 * }} props
 */
function SectionEditor({
  section,
  index,
  subjects,
  usedSubjectUuids,
  onChange,
  onRemove,
  canRemove,
  disabled,
  availableQuestionCount = null,
  poolLoading = false,
  questionCountTooHigh = false,
}) {
  const subjectUuid = section.subjectUuid ?? section.subject?.uuid
  const difficultyFilter = section.difficultyFilter ?? []
  const summary = sectionSummary({
    subject: subjects.find((s) => s.uuid === subjectUuid) ?? section.subject,
    questionCount: Number(section.questionCount),
    marksPerQuestion: Number(section.marksPerQuestion),
    passMinPercent: Number(section.passMinPercent),
  })
  const totalMarks = sectionTotalMarks({
    questionCount: Number(section.questionCount),
    marksPerQuestion: Number(section.marksPerQuestion),
  })
  const passMarks = sectionPassMarks({
    questionCount: Number(section.questionCount),
    marksPerQuestion: Number(section.marksPerQuestion),
    passMinPercent: Number(section.passMinPercent),
  })

  return (
    <Card className="border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle className="text-base">
            Section {index + 1}: {summary.subjectName}
          </CardTitle>
          <CardDescription>
            Subject-wise difficulty, time limit, marks per question, and passing threshold.
          </CardDescription>
        </div>
        {canRemove ? (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={disabled}>
            <Trash2 className="size-4 text-destructive" aria-hidden />
            <span className="sr-only">Remove section</span>
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor={`subject-${index}`}>Subject</Label>
            <select
              id={`subject-${index}`}
              className={selectClass}
              value={subjectUuid ?? ''}
              onChange={(e) => onChange({ subjectUuid: e.target.value })}
              disabled={disabled}
            >
              {subjects.map((s) => (
                <option
                  key={s.uuid}
                  value={s.uuid}
                  disabled={usedSubjectUuids.has(s.uuid) && s.uuid !== subjectUuid}
                >
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`qcount-${index}`}>Questions in section</Label>
            <Input
              id={`qcount-${index}`}
              type="number"
              min={0}
              value={section.questionCount}
              onChange={(e) =>
                onChange({ questionCount: clampNonNegativeInt(e.target.value) })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`marks-${index}`}>Marks per question</Label>
            <Input
              id={`marks-${index}`}
              type="number"
              min={0}
              step={0.01}
              value={section.marksPerQuestion}
              onChange={(e) =>
                onChange({ marksPerQuestion: clampNonNegativeDecimal(e.target.value) })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`time-${index}`}>Time limit (minutes)</Label>
            <Input
              id={`time-${index}`}
              type="number"
              min={0}
              value={section.timeLimitMinutes}
              onChange={(e) =>
                onChange({ timeLimitMinutes: clampNonNegativeInt(e.target.value) })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`pass-${index}`}>Passing (% of section marks)</Label>
            <Input
              id={`pass-${index}`}
              type="number"
              min={0}
              max={100}
              value={section.passMinPercent}
              onChange={(e) =>
                onChange({
                  passMinPercent: clampPercent(e.target.value),
                })
              }
              disabled={disabled}
            />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-border/50 bg-background/60 p-3">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Difficulty
          </Label>
          <p className="text-xs text-muted-foreground">
            Leave all unchecked to include every difficulty in this subject.
          </p>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((o) => (
              <label
                key={o.value}
                className={cn(
                  'inline-flex cursor-pointer items-center rounded-full border px-3 py-1.5 text-sm transition-colors',
                  difficultyFilter.includes(o.value)
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border bg-background hover:bg-muted/50',
                  disabled && 'cursor-not-allowed opacity-50',
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={difficultyFilter.includes(o.value)}
                  onChange={() =>
                    onChange({
                      difficultyFilter: toggleDifficultyFilter(difficultyFilter, o.value),
                    })
                  }
                  disabled={disabled}
                />
                {o.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Pool:{' '}
            {poolLoading ? (
              'Checking question bank…'
            ) : availableQuestionCount == null ? (
              '—'
            ) : (
              <>
                <span className="font-medium tabular-nums text-foreground">
                  {availableQuestionCount}
                </span>{' '}
                question{availableQuestionCount === 1 ? '' : 's'} match{' '}
                {formatDifficultyFilter(difficultyFilter).toLowerCase()}
              </>
            )}
          </p>
          {questionCountTooHigh ? (
            <p className="text-xs text-destructive">
              Section asks for {section.questionCount} questions but only {availableQuestionCount}{' '}
              are available for this subject and difficulty filter.
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 rounded-md border border-dashed border-border/80 bg-muted/20 p-3 text-sm sm:grid-cols-3">
          <p>
            <span className="text-muted-foreground">Section marks: </span>
            <span className="font-medium tabular-nums">
              {section.questionCount} × {section.marksPerQuestion} = {totalMarks}
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Pass marks: </span>
            <span className="font-medium tabular-nums">
              {passMarks} / {totalMarks} ({section.passMinPercent}%)
            </span>
          </p>
          <p>
            <span className="text-muted-foreground">Time: </span>
            <span className="font-medium tabular-nums">{section.timeLimitMinutes} min</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ExamBlueprint({ exam }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/15 p-4 font-mono text-xs leading-relaxed text-foreground sm:text-sm">
      <p className="font-semibold">
        {exam.board?.code} — {exam.suite?.name}
      </p>
      {(exam.sections ?? []).map((section, index) => {
        const { subjectName, totalMarks, passMarks } = sectionSummary(section)
        const isLast = index === (exam.sections?.length ?? 0) - 1
        const branch = isLast ? '└──' : '├──'
        return (
          <p key={section.uuid ?? index} className="mt-1 text-muted-foreground">
            <span className="text-foreground">{branch}</span> {subjectName}
            <span className="text-foreground/80">
              {' '}
              · {section.questionCount} Q × {section.marksPerQuestion} = {totalMarks} marks ·{' '}
              {formatDifficultyFilter(section.difficultyFilter)} · {section.timeLimitMinutes} min · pass{' '}
              {passMarks}/{totalMarks} ({section.passMinPercent}%)
            </span>
          </p>
        )
      })}
    </div>
  )
}

function draftFromExam(exam) {
  const costs = costsFromExam(exam)
  return {
    name: exam.name,
    displayName: exam.displayName ?? '',
    description: exam.description ?? '',
    passPolicy: exam.passPolicy ?? 'ALL_SECTIONS',
    isPublished: exam.isPublished !== false,
    attemptLimit: exam.attemptLimit ?? '',
    costInAmount: costs.costInAmount,
    costIntlAmount: costs.costIntlAmount,
    sections: (exam.sections ?? []).map((section) => ({
      subjectUuid: section.subject?.uuid,
      subject: section.subject,
      questionCount: section.questionCount,
      marksPerQuestion: section.marksPerQuestion,
      timeLimitMinutes: section.timeLimitMinutes,
      passMinPercent: section.passMinPercent,
      difficultyFilter: section.difficultyFilter ?? [],
    })),
  }
}

export default function ExamsPage() {
  const queryClient = useQueryClient()
  const [selectedUuid, setSelectedUuid] = useState(null)
  const [draft, setDraft] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [draftBoardUuid, setDraftBoardUuid] = useState('')
  const [draftSuiteUuid, setDraftSuiteUuid] = useState('')
  const [draftDisplayName, setDraftDisplayName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')

  const { data: exams = [], isLoading, isError, error } = useQuery({
    queryKey: examsQk,
    queryFn: () => fetchTestExams(),
  })

  const { data: boards = [] } = useQuery({
    queryKey: ['tests', 'boards'],
    queryFn: fetchTestBoards,
  })

  const { data: subjects = [] } = useQuery({
    queryKey: ['tests', 'subjects'],
    queryFn: fetchTestSubjects,
  })

  const selectedExam = useMemo(
    () => exams.find((e) => e.uuid === selectedUuid) ?? exams[0] ?? null,
    [exams, selectedUuid],
  )

  useEffect(() => {
    if (selectedExam && (!selectedUuid || selectedUuid !== selectedExam.uuid)) {
      setSelectedUuid(selectedExam.uuid)
    }
  }, [selectedExam, selectedUuid])

  useEffect(() => {
    if (selectedExam) {
      setDraft(draftFromExam(selectedExam))
    } else {
      setDraft(null)
    }
  }, [selectedExam?.uuid])

  const draftSuites = useMemo(() => {
    const board = boards.find((b) => b.uuid === draftBoardUuid)
    return board?.suites ?? []
  }, [boards, draftBoardUuid])

  const draftName = useMemo(() => {
    const board = boards.find((b) => b.uuid === draftBoardUuid)
    const suite = draftSuites.find((s) => s.uuid === draftSuiteUuid)
    if (!board || !suite) return ''
    return formatExamName(board.code, suite.name)
  }, [boards, draftBoardUuid, draftSuiteUuid, draftSuites])

  const totals = draft ? examTotals(draft.sections) : null

  const isDetailsDirty = useMemo(() => {
    if (!selectedExam || !draft) return false
    return (
      JSON.stringify(examDetailsToPayload(draft)) !== JSON.stringify(examDetailsToPayload(selectedExam))
    )
  }, [selectedExam, draft])

  const isSectionsDirty = useMemo(() => {
    if (!selectedExam || !draft) return false
    return (
      JSON.stringify(examSectionsToPayload(draft)) !==
      JSON.stringify(examSectionsToPayload(selectedExam))
    )
  }, [selectedExam, draft])

  const sectionPoolQueries = useQueries({
    queries: (draft?.sections ?? []).map((section) => {
      const subjectUuid = section.subjectUuid ?? section.subject?.uuid ?? ''
      const difficultyKey = [...(section.difficultyFilter ?? [])].sort().join(',')
      return {
        queryKey: ['tests', 'exams', 'section-pool', subjectUuid, difficultyKey],
        queryFn: () =>
          fetchExamSectionPoolCount({
            subjectUuid,
            difficultyFilter: section.difficultyFilter ?? [],
          }),
        enabled: Boolean(selectedExam && subjectUuid),
      }
    }),
  })

  const sectionPoolLoading = sectionPoolQueries.some((query) => query.isFetching)

  const sectionPoolInvalid = useMemo(() => {
    if (!draft) return false
    return draft.sections.some((section, index) => {
      const available = sectionPoolQueries[index]?.data?.availableCount
      if (typeof available !== 'number') return false
      return Number(section.questionCount) > available
    })
  }, [draft, sectionPoolQueries])

  const sectionsSaveBlocked =
    isSectionsDirty && (sectionPoolInvalid || sectionPoolLoading)

  const saveMu = useMutation({
    mutationFn: ({ includeDetails = true, includeSections = true } = {}) =>
      updateTestExam(
        selectedExam.uuid,
        buildExamSavePayload(draft, { includeDetails, includeSections }),
      ),
    onSuccess: (updated) => {
      notifySuccess('Exam saved')
      queryClient.setQueryData(examsQk, (old) =>
        Array.isArray(old) ? old.map((exam) => (exam.uuid === updated.uuid ? updated : exam)) : old,
      )
      setDraft(draftFromExam(updated))
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to save exam')
      notifyError(message)
    },
  })

  const createMu = useMutation({
    mutationFn: () =>
      createTestExam({
        boardUuid: draftBoardUuid,
        suiteUuid: draftSuiteUuid,
        name: draftName,
        displayName: draftDisplayName.trim() || null,
        description: draftDescription.trim() || null,
        passPolicy: 'ALL_SECTIONS',
        isPublished: true,
        sections: [emptySection(subjects[0]?.uuid ?? '')],
      }),
    onSuccess: (created) => {
      notifySuccess('Exam created')
      void queryClient.invalidateQueries({ queryKey: examsQk })
      setSelectedUuid(created.uuid)
      setCreateOpen(false)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to create exam')
      notifyError(message)
    },
  })

  const deleteMu = useMutation({
    mutationFn: (uuid) => deleteTestExam(uuid),
    onSuccess: () => {
      notifySuccess('Exam deleted')
      void queryClient.invalidateQueries({ queryKey: examsQk })
      setDeleteTarget(null)
      setSelectedUuid(null)
    },
    onError: (err) => {
      const { message } = handleApiError(err, 'Unable to delete exam')
      notifyError(message)
    },
  })

  function updateSection(index, patch) {
    setDraft((prev) => {
      if (!prev) return prev
      const sections = prev.sections.map((section, i) =>
        i === index ? { ...section, ...patch } : section,
      )
      return { ...prev, sections }
    })
  }

  function addSection() {
    const used = new Set((draft?.sections ?? []).map((s) => s.subjectUuid ?? s.subject?.uuid))
    const nextSubject = subjects.find((s) => !used.has(s.uuid)) ?? subjects[0]
    if (!nextSubject) {
      notifyError('Add subjects in the catalog before creating exam sections.')
      return
    }
    setDraft((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        sections: [...prev.sections, emptySection(nextSubject.uuid)],
      }
    })
  }

  function removeSection(index) {
    setDraft((prev) => {
      if (!prev || prev.sections.length <= 1) return prev
      return { ...prev, sections: prev.sections.filter((_, i) => i !== index) }
    })
  }

  function openCreate() {
    const firstBoard = boards[0]
    const firstSuite = firstBoard?.suites?.[0]
    setDraftBoardUuid(firstBoard?.uuid ?? '')
    setDraftSuiteUuid(firstSuite?.uuid ?? '')
    setDraftDisplayName('')
    setDraftDescription('')
    setCreateOpen(true)
  }

  const usedSubjectUuids = new Set(
    (draft?.sections ?? []).map((s) => s.subjectUuid ?? s.subject?.uuid).filter(Boolean),
  )

  const busy = saveMu.isPending || createMu.isPending || deleteMu.isPending

  function saveScopeState(scope) {
    if (scope === 'details') {
      return {
        label: 'Save details',
        disabled: busy || !isDetailsDirty,
        mutate: () => saveMu.mutate({ includeDetails: true, includeSections: false }),
      }
    }
    if (scope === 'sections') {
      return {
        label: 'Save sections',
        disabled: busy || !isSectionsDirty || sectionsSaveBlocked,
        mutate: () => saveMu.mutate({ includeDetails: false, includeSections: true }),
      }
    }
    const includeDetails = isDetailsDirty
    const includeSections = isSectionsDirty && !sectionsSaveBlocked
    return {
      label: 'Save all',
      disabled: busy || (!includeDetails && !includeSections),
      mutate: () => saveMu.mutate({ includeDetails, includeSections }),
    }
  }

  function renderSaveButton({ scope = 'all', className } = {}) {
    const { label, disabled, mutate } = saveScopeState(scope)
    return (
      <Button
        type="button"
        size="sm"
        className={className}
        onClick={mutate}
        disabled={disabled}
      >
        {saveMu.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Save className="size-4" aria-hidden />
        )}
        {label}
      </Button>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Exams</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Define board + suite exam blueprints with subject sections, each with its own timer,
            marks, and pass threshold. Overall pass requires every section to pass.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate} disabled={!boards.length || !subjects.length}>
          <Plus className="size-4" aria-hidden />
          New exam
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">{error?.message ?? 'Unable to load exams'}</p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(240px,300px)_1fr]">
          <Card className="h-fit shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Exam catalog</CardTitle>
              <CardDescription>Board × suite combinations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {exams.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No exams yet. Link suites to boards, then create an exam blueprint.
                </p>
              ) : (
                exams.map((exam) => (
                  <ExamListItem
                    key={exam.uuid}
                    exam={exam}
                    selected={exam.uuid === selectedExam?.uuid}
                    onSelect={() => setSelectedUuid(exam.uuid)}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {selectedExam && draft && totals ? (
            <div className="space-y-5">
              <Card className="shadow-none">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{examDisplayTitle(draft)}</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedExam.board?.name} · {selectedExam.suite?.name} ·{' '}
                        <span className="font-mono text-xs">{selectedExam.name}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        <Layers className="size-3.5" aria-hidden />
                        {draft.sections.length} sections
                      </div>
                      {renderSaveButton()}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            uuid: selectedExam.uuid,
                            label: examDisplayTitle(selectedExam),
                          })
                        }
                        disabled={busy}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <StatPill
                      icon={GraduationCap}
                      label="Total questions"
                      value={String(totals.questionCount)}
                    />
                    <StatPill icon={Target} label="Total marks" value={String(totals.totalMarks)} />
                    <StatPill
                      icon={Clock}
                      label="Total time"
                      value={`${totals.timeLimitMinutes} min`}
                    />
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div>
                      <p className="text-sm font-medium">Marketing</p>
                      <p className="text-xs text-muted-foreground">
                        Display name and description shown to students and on marketing pages.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam-display-name">Display name</Label>
                      <Input
                        id="exam-display-name"
                        value={draft.displayName}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, displayName: e.target.value } : prev,
                          )
                        }
                        disabled={busy}
                        placeholder={`e.g. ${selectedExam.name} Mock Exam`}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank to use the catalog name{' '}
                        <span className="font-mono">{selectedExam.name}</span>.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exam-description">Description</Label>
                      <textarea
                        id="exam-description"
                        className="min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                        value={draft.description}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, description: e.target.value } : prev,
                          )
                        }
                        disabled={busy}
                        placeholder="Short marketing blurb — what this exam covers, who it is for, etc."
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-border/70 bg-muted/15 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">Overall pass policy: </span>
                    <span className="font-medium">
                      {PASS_POLICY_LABELS[draft.passPolicy] ?? draft.passPolicy}
                    </span>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div>
                      <p className="text-sm font-medium">Catalog &amp; attempts</p>
                      <p className="text-xs text-muted-foreground">
                        Control classroom visibility and how many times a student can take this exam.
                      </p>
                    </div>
                    <CheckboxOption
                      id="exam-published"
                      checked={draft.isPublished}
                      onChange={() =>
                        setDraft((prev) =>
                          prev ? { ...prev, isPublished: !prev.isPublished } : prev,
                        )
                      }
                      disabled={busy}
                      label="Published"
                      hint="Visible in the classroom exams catalog. Unpublished exams stay in admin only."
                    />
                    <div className="space-y-2">
                      <Label htmlFor="exam-attempt-limit">Attempt limit (optional)</Label>
                      <Input
                        id="exam-attempt-limit"
                        type="number"
                        min={1}
                        step={1}
                        placeholder="No limit"
                        value={draft.attemptLimit}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, attemptLimit: e.target.value } : prev,
                          )
                        }
                        disabled={busy}
                      />
                      <p className="text-xs text-muted-foreground">
                        Leave blank for unlimited attempts. When set, students can only start that
                        many exam attempts.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 p-4">
                    <div>
                      <p className="text-sm font-medium">Exam cost</p>
                      <p className="text-xs text-muted-foreground">
                        Separate pricing for India (INR) and international (USD) markets.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="exam-cost-in">India cost (INR)</Label>
                        <Input
                          id="exam-cost-in"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="e.g. 999"
                          value={draft.costInAmount}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev ? { ...prev, costInAmount: e.target.value } : prev,
                            )
                          }
                          disabled={busy}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="exam-cost-intl">International cost (USD)</Label>
                        <Input
                          id="exam-cost-intl"
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="e.g. 19.99"
                          value={draft.costIntlAmount}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev ? { ...prev, costIntlAmount: e.target.value } : prev,
                            )
                          }
                          disabled={busy}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/10 px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {sectionsSaveBlocked
                        ? isDetailsDirty
                          ? 'Section counts exceed the question bank — use Save details for marketing and pricing.'
                          : 'Fix section question counts before using Save sections.'
                        : 'Save marketing and pricing here, or use Save all in the header.'}
                    </p>
                    {renderSaveButton({ scope: 'details' })}
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Blueprint preview
                    </p>
                    <ExamBlueprint exam={{ ...selectedExam, sections: draft.sections }} />
                  </div>
                </CardContent>
              </Card>

              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Subject sections</h3>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addSection} disabled={busy}>
                    <Plus className="size-4" aria-hidden />
                    Add section
                  </Button>
                  {renderSaveButton({ scope: 'sections' })}
                </div>
              </div>

              <div className="space-y-4">
                {draft.sections.map((section, index) => {
                  const availableQuestionCount =
                    typeof sectionPoolQueries[index]?.data?.availableCount === 'number'
                      ? sectionPoolQueries[index].data.availableCount
                      : null
                  const questionCountTooHigh =
                    availableQuestionCount != null &&
                    Number(section.questionCount) > availableQuestionCount

                  return (
                    <SectionEditor
                      key={`${section.subjectUuid ?? section.subject?.uuid}-${index}`}
                      section={section}
                      index={index}
                      subjects={subjects}
                      usedSubjectUuids={usedSubjectUuids}
                      canRemove={draft.sections.length > 1}
                      disabled={busy}
                      availableQuestionCount={availableQuestionCount}
                      poolLoading={sectionPoolQueries[index]?.isFetching}
                      questionCountTooHigh={questionCountTooHigh}
                      onChange={(patch) => updateSection(index, patch)}
                      onRemove={() => removeSection(index)}
                    />
                  )
                })}
              </div>
            </div>
          ) : exams.length > 0 ? null : (
            <Card className="shadow-none">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Create your first exam to configure subject sections and pass criteria.
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {createOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
          role="presentation"
          onClick={() => !createMu.isPending && setCreateOpen(false)}
        >
          <Card
            className="relative z-10 w-full max-w-md shadow-lg"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>New exam</CardTitle>
              <CardDescription>
                One exam blueprint per board + suite. The suite must be linked to the board.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exam-board">Board</Label>
                <select
                  id="exam-board"
                  className={selectClass}
                  value={draftBoardUuid}
                  onChange={(e) => {
                    const boardUuid = e.target.value
                    const board = boards.find((b) => b.uuid === boardUuid)
                    setDraftBoardUuid(boardUuid)
                    setDraftSuiteUuid(board?.suites?.[0]?.uuid ?? '')
                  }}
                  disabled={createMu.isPending}
                >
                  {boards.map((b) => (
                    <option key={b.uuid} value={b.uuid}>
                      {b.code} — {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-suite">Suite</Label>
                <select
                  id="exam-suite"
                  className={selectClass}
                  value={draftSuiteUuid}
                  onChange={(e) => setDraftSuiteUuid(e.target.value)}
                  disabled={createMu.isPending || draftSuites.length === 0}
                >
                  {draftSuites.map((s) => (
                    <option key={s.uuid} value={s.uuid}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {draftSuites.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Link suites to this board before creating an exam.
                  </p>
                ) : null}
              </div>
              <div className="rounded-md border border-dashed border-border/80 bg-muted/20 px-3 py-2 text-sm">
                <span className="text-muted-foreground">Catalog name: </span>
                <span className="font-semibold">{draftName || '—'}</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-display-name">Display name (optional)</Label>
                <Input
                  id="create-display-name"
                  value={draftDisplayName}
                  onChange={(e) => setDraftDisplayName(e.target.value)}
                  disabled={createMu.isPending}
                  placeholder="Marketing title for storefronts"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description (optional)</Label>
                <textarea
                  id="create-description"
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  disabled={createMu.isPending}
                  placeholder="Brief description for marketing and product pages"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={createMu.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => createMu.mutate()}
                  disabled={
                    createMu.isPending ||
                    !draftBoardUuid ||
                    !draftSuiteUuid ||
                    !subjects.length
                  }
                >
                  {createMu.isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  Create exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DeleteConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete exam?"
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
